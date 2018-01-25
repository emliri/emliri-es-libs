import {ByteRange} from './xhr'

export type MediaClockTime = number

export class MediaLocator {

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
}
