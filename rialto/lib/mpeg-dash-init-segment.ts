import {Resource, ResourceEvents, ParseableResource} from './resource'

import {MpegIsoBmffBox} from './mpeg-isobmff-box'

import {MpegDashSidx} from './mpeg-dash-sidx'

import {MpegDashMpd, MpegDashRepresentation} from './mpeg-dash-mpd'

import {getLogger} from './logger'

const {
  log
} = getLogger('mpeg-dash-init-segment')

export class MpegDashInitSegment extends Resource implements ParseableResource<MpegIsoBmffBox[]> {

  moov: MpegIsoBmffBox = null

  sidx: MpegDashSidx = null

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {

      const moovBox = MpegIsoBmffBox.fromPath(new Uint8Array(this.buffer), ['moov'])
      if (moovBox) {
        log('found moov box', this.uri)
        this.moov = moovBox
      }

      const sidxBox = MpegIsoBmffBox.fromPath(new Uint8Array(this.buffer), ['sidx'])
      if (sidxBox) {
        log('found sidx box in', this.uri)
        const sidxBoxParsed = new MpegDashSidx(sidxBox)
        this.sidx = sidxBoxParsed
      }

      return this;
    })
  }

  hasBeenParsed() { return !! (this.sidx || this.moov) }

  parse() {
    return Promise.resolve([this.sidx, this.moov])
  }
}
