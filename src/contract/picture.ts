// A picture is accepted by what its first bytes say it is, checked against what the app says it is.

import { LIMITS } from "./limits.ts";
import type { Picture } from "./types.ts";

declare const checkedPicture: unique symbol;
/** A picture whose size is within the limit and whose first bytes match its media type. Not yet decoded. */
export type CheckedPicture = Picture & { readonly [checkedPicture]: true };

export type PictureProblem = "invalid-input" | "input-too-large" | "picture-unreadable";

const startsWith = (bytes: Uint8Array, signature: readonly number[], at = 0) =>
  signature.every((byte, index) => bytes[at + index] === byte);

// JPEG: https://www.w3.org/Graphics/JPEG/itu-t81.pdf (SOI marker FF D8, then a marker FF)
// PNG: https://www.w3.org/TR/png-3/#3PNGsignature
// WebP: https://developers.google.com/speed/webp/docs/riff_container#webp_file_header ("RIFF", size, "WEBP")
const SIGNATURES: Record<Picture["mediaType"], (bytes: Uint8Array) => boolean> = {
  "image/jpeg": (bytes) => startsWith(bytes, [0xff, 0xd8, 0xff]),
  "image/png": (bytes) => startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  "image/webp": (bytes) =>
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8),
};

export function checkPicture(value: unknown): CheckedPicture | PictureProblem {
  if (typeof value !== "object" || value === null) return "invalid-input";
  const { bytes, mediaType } = value as Partial<Picture>;
  if (!(bytes instanceof Uint8Array)) return "invalid-input";
  if (typeof mediaType !== "string" || !Object.hasOwn(SIGNATURES, mediaType)) return "invalid-input";
  if (bytes.byteLength > LIMITS.pictureBytes) return "input-too-large";
  if (!SIGNATURES[mediaType](bytes)) return "picture-unreadable";
  return { bytes, mediaType } as CheckedPicture;
}
