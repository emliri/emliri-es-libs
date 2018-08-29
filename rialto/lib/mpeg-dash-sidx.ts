import {
  readUint16,
  readUint32,
  utf8BytesToString
} from './bytes-read-write'

import {
  MpegIsoBmffBox,
  findIsoBmffBoxes
} from './mpeg-isobmff-box'

import {getLogger} from './logger'

const {
  log
} = getLogger('mpeg-dash-sidx')

/**
 * @param data Iso-ff binary data
 * @param parsedSidx An existing box object instance to parse data into
 * @returns {MpegDashSidx} A new or the passed object
 */
export const parseSidxData = (data: Uint8Array, parsedSidx: MpegDashSidx): MpegDashSidx => {
  let index = 0;

  const sidxBoxes = findIsoBmffBoxes(data, ['sidx']);
  if (!sidxBoxes || !sidxBoxes[0]) {
    return null;
  }

  const sidx: MpegIsoBmffBox = sidxBoxes[0]

  index += 8

  const version = sidx.data[index];

  // set initial offset, we skip the reference ID (not needed)
  index += version === 0 ? 8 : 16;

  const timescale = readUint32(sidx.data, index);

  index += 4;

  // TODO: parse earliestPresentationTime and firstOffset
  // usually zero in our case
  let earliestPresentationTime = 0;
  let firstOffset = 0;

  if (version === 0) {
    index += 8;
  } else {
    index += 16;
  }

  // skip reserved
  index += 2;

  let startByte = sidx.end + firstOffset;

  const references: MpegDashSidxReference[] = [];
  const referencesCount = readUint16(sidx.data, index);

  index += 2;

  for (let i = 0; i < referencesCount; i++) {

    let referenceIndex = index;

    const referenceInfo = readUint32(sidx.data, referenceIndex);
    referenceIndex += 4;

    const referenceSize = referenceInfo & 0x7FFFFFFF;
    const referenceType = (referenceInfo & 0x80000000) >>> 31;

    if (referenceType === 1) {
      console.warn('SIDX has hierarchical references (not supported)');
      return null;
    }

    const subsegmentDuration = readUint32(sidx.data, referenceIndex);
    referenceIndex += 4;

    references.push({
      referenceSize,
      subsegmentDuration, // unscaled
      info: {
        duration: subsegmentDuration / timescale,
        start: startByte,
        end: startByte + referenceSize - 1
      }
    });

    startByte += referenceSize;

    // Skipping 1 bit for |startsWithSap|, 3 bits for |sapType|, and 28 bits
    // for |sapDelta|.
    referenceIndex += 4;

    // skip to next ref
    index = referenceIndex;
  }

  parsedSidx = parsedSidx
  parsedSidx.earliestPresentationTime = earliestPresentationTime
  parsedSidx.timescale = timescale
  parsedSidx.version = version
  parsedSidx.referencesCount = referencesCount
  parsedSidx.references = references

  log('parsed sidx data:', parsedSidx)

  return parsedSidx
}

export type MpegDashSidxReference = {
  referenceSize: number,
  subsegmentDuration: number, // unscaled
  info: {
    duration: number
    start: number
    end: number
  }
}

export class MpegDashSidx extends MpegIsoBmffBox {
  earliestPresentationTime: number;
  timescale: number;
  version: number;
  referencesCount: number = 0;
  references: MpegDashSidxReference[] = []

  constructor(box: MpegIsoBmffBox) {
    super(box.data, box.start, box.end)

    parseSidxData(box.data, this)
  }
}
