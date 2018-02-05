import {Resource, ResourceEvents, ParseableResource} from './resource'

import {ByteRange} from './xhr'

import {getLogger} from './logger'

import {AdaptiveMediaPeriod, AdaptiveMediaSet, AdaptiveMedia, MediaTypeFlag} from './adaptive-media'

import {XMLElement, XMLRootObject, parseXmlData} from './xml-parser'

import {MpegDashInitSegment} from './mpeg-dash-init-segment'

const {
  log
} = getLogger('mpeg-dash-mpd')

export type MpegDashPeriod = {
  id: string
  adaptationSets: MpegDashAdaptationSet[]
}

export type MpegDashSegment = {

}

export type MpegDashAdaptationSet = {
  id: string
  par: string
  contentType: string
  lang: string
  subsegmentAlignment: true
  frameRate: string
  audioSamplingRate: string
  maxWidth: number
  maxHeight: number
  representations: MpegDashRepresentation[]
}

export type MpegDashRepresentation = {
  id: string;
  height: number;
  width: number;
  sar: string;
  codecs: string
  bandwidth: number;
  mimeType: string;
  baseURL: string;
  indexRange: ByteRange;
  initializationRange: ByteRange;
  indexSegment: MpegDashInitSegment;
  initializationSegment: MpegDashInitSegment;
  segments: MpegDashSegment[];
}

export const parseMpdRootElement = (mpdObj: XMLRootObject): XMLElement => {
  let res = null;
  if (mpdObj.elements) {
    mpdObj.elements.forEach((element) => {
      if (element.name === 'MPD') {
        res = element
      }
    })
  }
  return res
}

export const parsePeriods = (xmlParentElement: XMLElement, parentUrl: string): MpegDashPeriod[] => {
  let periods: MpegDashPeriod[] = [];

  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'Period') {
      periods.push({
        id: element.attributes.id,
        adaptationSets: parseAdaptationSets(element, parentUrl)
      })
    }
  })

  return periods
}

export const parseAdaptationSets = (xmlParentElement: XMLElement, parentUrl: string): MpegDashAdaptationSet[] => {
  let adaptationSets: MpegDashAdaptationSet[] = [];

  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'AdaptationSet') {
      adaptationSets.push({
        id: element.attributes.id,
        contentType: element.attributes.contentType,
        subsegmentAlignment: element.attributes.subsegmentAlignment,
        lang: element.attributes.lang,
        maxHeight: Number(element.attributes.maxHeight),
        maxWidth: Number(element.attributes.maxWidth),
        audioSamplingRate: element.attributes.audioSamplingRate,
        frameRate: element.attributes.frameRate,
        par: element.attributes.par,
        representations: parseRepresentations(element, parentUrl)
      })
    }
  })

  return adaptationSets
}

export const parseRepresentations = (xmlParentElement: XMLElement, parentUrl: string): MpegDashRepresentation[] => {
  let representations: MpegDashRepresentation[] = [];

  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'Representation') {
      const rep: MpegDashRepresentation = {
        id: element.attributes.id,
        bandwidth: Number(element.attributes.bandwidth),
        mimeType: element.attributes.mimeType,
        codecs: element.attributes.codecs,
        sar: element.attributes.sar,
        height: Number(element.attributes.height),
        width: Number(element.attributes.width),
        baseURL: null,
        initializationRange: null,
        indexRange: null,
        initializationSegment: null,
        indexSegment: null,
        segments: []
      }

      parseSegments(element, rep, parentUrl)

      representations.push(rep)
    }
  })

  return representations
}

export const parseSegments = (xmlParentElement: XMLElement, representation: MpegDashRepresentation, parentUrl: string) => {
  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'BaseURL') {
      representation.baseURL = element.elements[0].text
    }
    else if (element.name === 'SegmentBase') {

      representation.indexRange = ByteRange.fromString(element.attributes.indexRange)

      if (element.elements[0].name === 'Initialization') {
        representation.initializationRange = ByteRange.fromString(element.elements[0].attributes.range)
      }
    }

    if (representation.baseURL && representation.indexRange) {
      log('creating index segment')
      representation.indexSegment =
        new MpegDashInitSegment(representation.baseURL, representation.indexRange, parentUrl)
    }

    if (representation.baseURL && representation.initializationRange) {

      log('creating init segment')

      representation.initializationSegment =
        new MpegDashInitSegment(representation.baseURL, representation.initializationRange, parentUrl)
    }
  })
}

export const fetchInitializationSegments = (rep: MpegDashRepresentation): Promise<Resource[]> => {

  log('fetching all the init data')

  return Promise.all([
    rep.initializationSegment && rep.initializationSegment.fetch(),
    rep.indexSegment && rep.indexSegment.fetch()
  ])
}

export class MpegDashMpd extends Resource implements ParseableResource<AdaptiveMediaPeriod[]> {

  private _mpdObj: XMLRootObject = null
  private _mpdRootEl: XMLElement = null
  private _parsed: boolean = false
  private _periods: AdaptiveMediaPeriod[] = null

  mediaPresentationDuration: string
  minBufferTime: string
  profiles: string
  type: string
  periods: MpegDashPeriod[] = null

  constructor(uri) {
    super(uri)
  }

  hasBeenParsed() {
    return this._parsed
  }

  getSegments() {
    if (!this.hasBeenParsed()) {
      return null
    }
  }

  parse() {
    const buf = this.buffer
    if (!buf) {
      throw new Error('No data to parse')
    }

    const text = String.fromCharCode.apply(null, new Uint8Array(buf));

    // parse XML
    const mpdObj: XMLRootObject = parseXmlData(text)

    log('data parsed to raw object:', mpdObj)

    this._mpdObj = mpdObj

    const mpdRootEl: XMLElement = parseMpdRootElement(mpdObj)
    if (!mpdRootEl) {
      throw new Error('Could not find MPD XML element in raw data, bad URL or response?')
    }
    this._mpdRootEl = mpdRootEl

    this.mediaPresentationDuration = mpdRootEl.attributes.mediaPresentationDuration
    this.minBufferTime = mpdRootEl.attributes.minBufferTime
    this.profiles = mpdRootEl.attributes.profiles
    this.type = mpdRootEl.attributes.type

    const periods = parsePeriods(mpdRootEl, this.getUrl())

    this.periods = periods

    this._createPeriods()
    this._parsed = true

    log(this)

    return Promise.resolve(this._periods)
  }

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {
      log('data loaded, parsing XML as UTF-8')
      return this.parse()
    }).then(() => {
      log('loading index/init segments')
      return this._fetchAllIndexAndInitData()
    }).then(() => {
      log('parsing all init data')
      return this._parseAllInitData()
    }).then(() => {
      return this
    })
  }

  private _forEachRepresentation(func: (rep: MpegDashRepresentation) => void) {
    this.periods.forEach((period) => {
      period.adaptationSets.forEach((set) => {
        set.representations.forEach(func)
      })
    })
  }

  private _fetchAllIndexAndInitData(): Promise<Resource[]>[] {

    const representationInitPromises: Promise<Resource[]>[] = []

    this._forEachRepresentation((rep) => {
      representationInitPromises.push(
        fetchInitializationSegments(rep)
      )
    })

    return representationInitPromises
  }

  private _parseAllInitData() {
    this._forEachRepresentation((rep) => {
      if (rep.initializationSegment) {
        rep.initializationSegment.parse()
      }
      if (rep.indexSegment) {
        rep.indexSegment.parse()
      }
    })
  }

  /**
   * Convert MPEG-DASH periods to generic data model
   */
  private _createPeriods() {
    const periods: AdaptiveMediaPeriod[] = []

    this.periods.forEach((mpdPeriod) => {

      const period = new AdaptiveMediaPeriod()

      period.sets = []
      periods.push(period)

      mpdPeriod.adaptationSets.forEach((mpegSet) => {

        const set = new AdaptiveMediaSet()
        set.parent = period

        switch(mpegSet.contentType) {
        case 'audio':
          set.containedTypes.add(MediaTypeFlag.AUDIO)
          break;
        case 'video':
          set.containedTypes.add(MediaTypeFlag.VIDEO)
          break;
        case 'text':
          set.containedTypes.add(MediaTypeFlag.TEXT)
          break;
        }

        period.sets.push(set)

        mpegSet.representations.forEach((rep) => {
          const stream = new AdaptiveMedia()
          stream.parent = set
          stream.bandwidth = rep.bandwidth
          stream.mimeType = rep.mimeType
          stream.codecs = rep.codecs
          stream.audioInfo = {
            channels: 2,
            language: set.containsMediaType(MediaTypeFlag.AUDIO) ? mpegSet.lang : null
          }
          stream.videoInfo = {
            width: rep.width,
            height: rep.height
          }
          stream.textInfo = {
            language: set.containsMediaType(MediaTypeFlag.TEXT) ? mpegSet.lang : null
          }
          stream.segments = []

          set.add(stream)
        })
      })
    })

    this._periods = periods

  }
}
