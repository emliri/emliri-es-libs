/**
 * @module
 *
 * Functions to read & write coded types from bytes
 *
 */

export const MAX_UINT_32 = 4294967296;
export const MAX_UINT_16 = 65536;

export const readUint16 = (buffer: Uint8Array, offset: number): number => {
  const val = buffer[offset] << 8 |
              buffer[offset + 1];

  return val < 0 ? MAX_UINT_16 + val : val;
}

export const readUint32 = (buffer: Uint8Array, offset: number): number => {
  const val = buffer[offset] << 24 |
              buffer[offset + 1] << 16 |
              buffer[offset + 2] << 8 |
              buffer[offset + 3];
  return val < 0 ? MAX_UINT_32 + val : val;
}

export const writeUint32 = (buffer: Uint8Array, offset: number, value: number) => {
  buffer[offset] = value >> 24;
  buffer[offset+1] = (value >> 16) & 0xff;
  buffer[offset+2] = (value >> 8) & 0xff;
  buffer[offset+3] = value & 0xff;
}

export const utf8BytesToString = (bytes: Uint8Array): string => {
  return String.fromCharCode.apply(null, bytes)
}

export const unicodeBytesToString = (bytes: Uint16Array): string => {
  return String.fromCharCode.apply(null, bytes)
}
