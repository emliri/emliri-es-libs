export type MediaClockTime = number

export class ByteRange {

    from: number;
    to: number;

    constructor(from, to) {
      this.from = from
      this.to = to
    }
}

export class MediaLocator {

    uri: string;
    startTime: MediaClockTime;
    endTime: MediaClockTime;
    byteRange: ByteRange;

    static get ByteRange() {
      return ByteRange
    }

    constructor(uri, startTime, endTime, byteRange) {
      this.uri = uri
      this.startTime = startTime
      this.endTime = endTime
      this.byteRange = byteRange
    }
}
