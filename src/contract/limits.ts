// Hard limits. Text over a limit is refused, not cut: cutting for looks is the templates' job, and these exist so
// that no input can make a render slow or large.

export const WIDTH = 1200;
export const HEIGHT = 630;

export const LIMITS = {
  /** Longest text per field, in UTF-16 code units, before cleaning. */
  text: {
    name: 640,
    handle: 253,
    bio: 2560,
    eyebrow: 120,
    label: 120,
    postText: 3000,
    title: 600,
    excerpt: 2560,
  },
  /** Largest picture file. */
  pictureBytes: 4 * 1024 * 1024,
  /** Longest picture side in pixels, read from the file's header before it is decoded. */
  pictureSide: 4096,
  /** Longest time one render may take. */
  renderMs: 5000,
} as const;
