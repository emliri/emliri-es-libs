/**
 * Copies source data into a previously allocated destination buffer (see memcpy)
 * @returns Destination buffer
 */
export function copyArrayBuffer(
  src: ArrayBuffer, dest: ArrayBuffer,
  length: number = src.byteLength,
  srcOffset: number = 0, destOffset: number = 0) {

  if (srcOffset + length >= src.byteLength) {
    throw new Error(`Source buffer is too small for copy target of ${length} bytes at offset ${srcOffset}`);
  }

  if (destOffset + length >= dest.byteLength) {
    throw new Error(`Destination buffer is too small for copy target of ${length} bytes to offset at ${destOffset}`);
  }

  const destView = new Uint8Array(dest);
  const srcView = new Uint8Array(src, srcOffset, length);
  destView.set(srcView, destOffset);

  return dest;
}

/**
 * Iterate over copyArrayBuffer with array of ArrayBuffer as input, offset on each pass is shifted so
 * that the buffers content are concatenated in the destination. If destination size is too low
 * `copyArrayBuffer` (i.e this function) will throw an error.
 * @param src
 * @param dest
 * @returns Destination buffer
 */
export function copyArrayBuffers(src: ArrayBuffer[], dest: ArrayBuffer) {
  for (let i = 0; i < src.length; i++) {
    copyArrayBuffer(src[i], dest, src[i].byteLength, 0, i === 0 ? 0 : src[i - 1].byteLength);
  }

  return dest;
}
