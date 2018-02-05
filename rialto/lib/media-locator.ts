import {ByteRange} from './byte-range'

import {URLObject, resolveUri} from './url'

export type MediaClockTime = number

export class MediaLocator {

  static fromRelativeURI(relativeUri: string, baseUri?: string) {
    return new MediaLocator(
      resolveUri(relativeUri, baseUri)
    )
  }

  uri: string;
  startTime: MediaClockTime;
  endTime: MediaClockTime;
  byteRange: ByteRange;

  constructor(
    uri: string,
    startTime: MediaClockTime = NaN,
    endTime: MediaClockTime = NaN,
    byteRange: ByteRange = null
  ) {
    this.uri = uri
    this.startTime = startTime
    this.endTime = endTime
    this.byteRange = byteRange
  }

  toURLObject(): URLObject {
    return new URLObject(this.uri)
  }
}
