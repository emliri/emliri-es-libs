import {
  readUint32,
  utf8BytesToString
} from './bytes-read-write'

import {getLogger} from './logger'

const {
  log
} = getLogger('mpeg-isobmff-box')

/**
 *
 * Finds boxes in a data buffer given the hierarchical path.
 * Returns all boxes that match the path endpoint as an array.
 *
 * Example: `let allTrakBoxes = findIsoBmffBoxes(initSegment, ['moov', 'trak']);`
 *
 * @param {Uint8Array} data
 * @param {string[]} path
 * @param {number} start
 * @returns {MpegIsoBmffBox[]}
 */
export const findIsoBmffBoxes = function(
  data: Uint8Array,
  path: string[],
  start: number = 0): MpegIsoBmffBox[] {

  const boxes: MpegIsoBmffBox[] = [];

  let size,
      type,
      subBoxes,
      end;

  if (!path.length) {
    return null;
  }

  for (let i = start; i < data.byteLength;) {

    size = readUint32(data, i);

    type = utf8BytesToString(data.subarray(i + 0b0100, i + 0b1000))

    end = size > 1 ? (i + size) : data.byteLength;

    if (type === path[0]) {

      const box = new MpegIsoBmffBox(data, start, data.byteLength, type)

      // we have reached the end of the search path
      if (path.length === 1) {
        // append box to results
        boxes.push(box);
      } else {
        // continue recursion
        subBoxes = findIsoBmffBoxes(box.data, path.slice(1), end);
        // append all the results
        if (subBoxes.length) {
          Array.prototype.push.apply(boxes, subBoxes)
        }
      }
    }

    // skip to end of box and try to continue
    i = end
  }

  // log('result:', boxes)

  return boxes;
}

/**
 * Container object for one ISO FF box
 *
 * @constructor
 */
export class MpegIsoBmffBox {
  static fromPath(data: Uint8Array, path: string[]): MpegIsoBmffBox {
    const boxes = findIsoBmffBoxes(data, path)
    return boxes ? boxes[0] : null
  }

  data: Uint8Array = null;
  start: number = NaN;
  end: number = NaN;
  type: string = null;

  constructor(data: Uint8Array, start: number, end: number, type: string = null) {
    this.data = data
    this.start = start
    this.end = end
    this.type = type;
  }
}
