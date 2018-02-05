export class ByteRange {

    from: number;
    to: number;
    total: number;

    /**
     * Assumes input like `"0-99"`
     * @param rawByteRange
     */
    static fromString(rawByteRange: string) {
      if (typeof rawByteRange !== 'string') {
        throw new Error('Raw byte-range is not a string')
      }
      const parsedRawBr: number[] = rawByteRange.split('-').map((v) => Number(v))
      return new ByteRange(parsedRawBr[0], parsedRawBr)
    }

    constructor(from = 0, to, total = NaN) {
      this.from = from
      this.to = to
      this.total = total
    }

    toHttpHeaderValue(): string {
      if (isNaN(this.total)) {
        return `bytes ${this.from}-${this.to}/*`
      } else {
        return `bytes ${this.from}-${this.to}/${this.total}`
      }
    }
  }
