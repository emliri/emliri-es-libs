export class BufferedTimeRange {
  constructor(
    public readonly start: number,
    public readonly end: number
  ) {
    if (end > start) {
      throw new Error('Time-range must have end strictly larger than start');
    }
  }

  /**
   * @returns must be > 0
   */
  get duration(): number {
    return this.end - this.start;
  }

  /**
   *
   * @param range
   * @returns positive if `range` starts after this
   */
  compareStart(range: BufferedTimeRange): number {
    return range.start - this.start;
  }

  /**
   *
   * @param range
   * @returns positive if `range` ends after this
   */
  compareEnd(range: BufferedTimeRange): number {
    return range.end - this.end;
  }

  /**
   *
   * @param time a value within a time-range
   * @param strict when true, uses strict comparison (boundaries not part of interval)
   * @returns true when time values lies within interval
   */
  compareInterval(time: number, strict: boolean = false): boolean {
    if (strict) {
      return time > this.start && time < this.end;
    } else {
      return time >= this.start && time <= this.end;
    }
  }

  /**
   *
   * @param range
   * @returns true when `range` is fully inside this
   */
  contains(range: BufferedTimeRange): boolean {
    return this.compareStart(range) >= 0 && this.compareEnd(range) <= 0;
  }

  /**
   *
   * @param range
   * @returns true when `range` interval is equal to this
   */
  equals(range: BufferedTimeRange): boolean {
    return this.compareStart(range) === 0 && this.compareEnd(range) === 0;
  }

  /**
   *
   * @param range
   * @returns true when ranges overlap somehow
   */
  overlapsWith(range: BufferedTimeRange): boolean {
    const [start, end] = this._getOverlapRangeBoundaries(range);
    return start < end;
  }

  /**
   *
   * @param range
   * @returns true when `range` and this are continuous in their interval values
   */
  touchesWith(range: BufferedTimeRange): boolean {
    return (range.end === this.start || this.end === range.start);
  }

  /**
   *
   * @param range
   * @returns true when this is continued by `range`
   * See `touchesWith` but implies order, when this comes after `range`.
   */
  continues(range: BufferedTimeRange): boolean {
    return range.compareStart(this) === range.duration;
  }

  /**
   *
   * @param range
   * @returns a new range object that represents the overlapping range region (if any) or `null`
   */
  getOverlappingRange(range: BufferedTimeRange): BufferedTimeRange | null {
    const [start, end] = this._getOverlapRangeBoundaries(range);

    // if both ranges don't overlap at all
    // we will obtain end <= start here
    // this is a shorthand to do this check built in our constructor
    let overlapRange;
    try {
      overlapRange = new BufferedTimeRange(
        start, end
      );
    } catch(err) {
      overlapRange = null;
    }

    return overlapRange;
  }

  /**
   *
   * @param range
   * @returns a new range object that represents the merge of two ranges (that must overlap)
   */
  getMergedRange(range: BufferedTimeRange): BufferedTimeRange | null {
    if (!range.overlapsWith(this) && !range.touchesWith(this)) {
      return null;
    }

    // If both ranges already overlap (or touch) then the merge is
    // simply the range over the min of both starts and the max of both ends
    return new BufferedTimeRange(
      Math.min(this.start, range.start),
      Math.max(this.end, range.end)
    )
  }

  getGapRange(range: BufferedTimeRange): BufferedTimeRange | null {
    if (range.overlapsWith(this)) {
      return null;
    }

    // If both ranges don't overlap at all
    // simply the range over the min of both starts and the max of both ends
    return new BufferedTimeRange(
      Math.min(this.end, range.end),
      Math.max(this.start, range.start)
    )
  }

  /**
   *
   * @param range
   * @returns candidates for start/end points of overlapping ranges (when start > end then they don't overlap)
   */
  private _getOverlapRangeBoundaries(range: BufferedTimeRange): [number, number] {
    const startDiff = this.compareStart(range);
    const endDiff = this.compareEnd(range);
    let start: number;
    let end: number;

    // compute candidates for overlapping range boundaries
    if (startDiff > 0) {
      start = range.start;
    } else {
      start = this.start;
    }

    if (endDiff > 0) {
      end = this.end;
    } else {
      end = range.end;
    }

    return [start, end];
  }
}

export class BufferedTimeRangeContainer {
  constructor(
    private _ranges: BufferedTimeRange[] = []
  ) {}

  insert(range: BufferedTimeRange) {
    this._ranges.push(range);
  }

  flatten(): BufferedTimeRangeContainer {
    const newRanges: BufferedTimeRange[] = [];

    let previousRange: BufferedTimeRange = null;

    this._ranges.forEach((range) => {
      if (previousRange) {
        const overlap = previousRange.getMergedRange(range);
        if (overlap) {
          newRanges.pop(); // pop of the previous range since it overlaps/touches with current
          newRanges.push(overlap); // push in the merge of both
          range = overlap; // the current range becomes the merged range
        }
        previousRange = range; // the previous range might also be merged one (as it may overlap/touch with future ranges)
      }
    })
    return new BufferedTimeRangeContainer(newRanges);
  }

  addTimeRanges(ranges: TimeRanges) {
    for (let i=0; i < ranges.length; i++) {
      this.insert(new BufferedTimeRange(
        ranges.start(i),
        ranges.end(i)
      ))
    }
  }
}
