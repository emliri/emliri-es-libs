import * as XmlJs from 'xml-js'

import {Resource, ResourceEvents} from './resource'

import {getLogger} from './logger'

const {
  log
} = getLogger('mpeg-dash-mpd')

export class MpegDashMpd extends Resource {

  private _mpdObj: object = null

  constructor(uri) {
    super(uri)
  }

  parse() {
    const buf = this.buffer
    if (!buf) {
      throw new Error('No data to parse')
    }

    const text = String.fromCharCode.apply(null, new Uint8Array(buf));

    // parse XML
    const mpdObj = XmlJs.xml2js(text, {
      compact: false
    })

    log('data parsed:', mpdObj)

    this._mpdObj = mpdObj
  }

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {
      log('data loaded, parsing XML as UTF-8')

      this.parse()

      return this
    })
  }
}
