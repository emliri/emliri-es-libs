import {Resource, ResourceEvents, ParseableResource} from './resource'

import {ByteRange} from './xhr'

import {getLogger} from './logger'

import {AdaptiveMediaPeriod} from './adaptive-media'

import {XMLElement, XMLRootObject, parseXmlData} from './xml-parser'

const {
  log
} = getLogger('mpeg-dash-mpd')

export type MpegDashPeriod = {
  id: string
  adaptationSets: MpegDashAdaptationSet[]
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
  id: string
  height: number;
  width: number;
  sar: string;
  codecs: string
  bandwidth: number
  mimeType: string,
  baseURL: string,
  indexRange: ByteRange,
  initializationRange: ByteRange
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

export const parsePeriods = (xmlParentElement: XMLElement): MpegDashPeriod[] => {
  let periods: MpegDashPeriod[] = [];

  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'Period') {
      periods.push({
        id: element.attributes.id,
        adaptationSets: parseAdaptationSets(element)
      })
    }
  })

  return periods
}

export const parseAdaptationSets = (xmlParentElement: XMLElement): MpegDashAdaptationSet[] => {
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
        representations: parseRepresentations(element)
      })
    }
  })

  return adaptationSets
}

export const parseRepresentations = (xmlParentElement: XMLElement): MpegDashRepresentation[] => {
  let representations: MpegDashRepresentation[] = [];

  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'Representation') {
      const rep = {
        id: element.attributes.id,
        bandwidth: Number(element.attributes.bandwidth),
        mimeType: element.attributes.mimeType,
        codecs: element.attributes.codecs,
        sar: element.attributes.sar,
        height: Number(element.attributes.height),
        width: Number(element.attributes.width),
        baseURL: null,
        initializationRange: null,
        indexRange: null
      }

      parseSegments(element, rep)

      representations.push(rep)
    }
  })

  return representations
}

export const parseSegments = (xmlParentElement: XMLElement, representation: MpegDashRepresentation) => {
  xmlParentElement.elements.forEach((element) => {
    if (element.name === 'BaseURL') {
      representation.baseURL = element.elements[0].text
    }
    else if (element.name === 'SegmentBase') {
      representation.indexRange = element.attributes.indexRange
      if (element.elements[0].name === 'Initialization') {
        representation.initializationRange = element.elements[0].attributes.range
      }
    }
  })
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

    const periods = parsePeriods(mpdRootEl)

    this.periods = periods

    log(this)

    this._parsed = true

    return Promise.resolve(this._periods)
  }

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {
      log('data loaded, parsing XML as UTF-8')

      this.parse()

      return this
    })
  }

  private _createPeriods() {
    const periods: AdaptiveMediaPeriod[] = []

    this.periods.forEach((period) => {


      periods.push(new AdaptiveMediaPeriod())

      /*
      segments.push(new MediaSegment(
        new MediaLocator()
      ))
      */
    })

  }
}
