import {Resource, ResourceEvents} from './resource'

import {MpegIsoBmffBox} from './mpeg-isobmff-box'

import {MpegDashSidx} from './mpeg-dash-sidx'

import {MpegDashMpd} from './mpeg-dash-mpd'

export class MpegDashInitSegment extends Resource {

  sidx: MpegDashSidx

  fromMpd(mpd: MpegDashMpd) {
    return new MpegDashInitSegment(mpd.initSegment.getUrl(), mpd.initSegment.byteRange)
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
