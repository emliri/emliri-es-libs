import {Resource, ResourceEvents} from './resource'

import {MpegIsoBmffBox} from './mpeg-isobmff-box'

import {MpegDashSidx} from './mpeg-dash-sidx'

import {MpegDashMpd, MpegDashRepresentation} from './mpeg-dash-mpd'

export class MpegDashInitSegment extends Resource {

  sidx: MpegDashSidx

  fromMpd(dashRepresentation: MpegDashRepresentation) {
    return new MpegDashInitSegment(dashRepresentation.baseURL, dashRepresentation.indexRange)
  }

  fetch(): Promise<Resource> {
    return super.fetch().then((r: Resource) => {

      const sidxBox = MpegIsoBmffBox.fromPath( new Uint8Array(this.buffer), ['sidx'])
      if (sidxBox) {
        const sidxBoxParsed = new MpegDashSidx(sidxBox)
        this.sidx = sidxBoxParsed
      }

      return this;
    })
  }
}
