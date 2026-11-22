// Small picture files made on the spot for the tests, so no picture of unknown origin sits in the repository.

import { crc32, deflateSync } from "node:zlib";

function chunk(type: string, data: Uint8Array): Buffer {
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.byteLength);
  const check = Buffer.alloc(4);
  check.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, check]);
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function header(width: number, height: number): Buffer {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8; // bit depth
  data[9] = 2; // colour type: RGB
  return chunk("IHDR", data);
}

/** A PNG of one flat colour. https://www.w3.org/TR/png-3/ */
export function flatPng(width: number, height: number, [red, green, blue]: [number, number, number]): Buffer {
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.alloc(width * 3).map((_, index) => [red, green, blue][index % 3] ?? 0),
  ]);
  const pixels = Buffer.concat(Array.from({ length: height }, () => row));
  return Buffer.concat([
    SIGNATURE,
    header(width, height),
    chunk("IDAT", deflateSync(pixels)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** A PNG whose header claims a size and whose pixel data is not there. */
export function hollowPng(width: number, height: number): Buffer {
  return Buffer.concat([
    SIGNATURE,
    header(width, height),
    chunk("IDAT", Buffer.from("not pixel data")),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/** Width and height from a PNG's header. */
export function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export const isPng = (bytes: Uint8Array) => SIGNATURE.equals(Buffer.from(bytes.subarray(0, 8)));
