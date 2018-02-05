import {Resource, ParseableResource} from './resource'

import {MpegIsoBmffBox} from './mpeg-isobmff-box'

export class Mpeg4Fragment extends Resource implements ParseableResource<MpegIsoBmffBox[]> {
  hasBeenParsed() { return false }

  parse() {
    return null
  }
}
