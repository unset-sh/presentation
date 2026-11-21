// What a template hands to the renderer: boxes, text and images with sizes in pixels on a 1200 x 630 canvas.
// Templates can only use what is listed here, and every property listed here was compared against a browser
// render in the renderer trial (docs/renderer-trial.md).

export type Placement = {
  position?: "absolute" | "relative";
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width?: number;
  height?: number;
  maxWidth?: number;
  marginTop?: number;
  flexShrink?: number;
};

export type BoxStyle = Placement & {
  flexDirection?: "row" | "column";
  alignItems?: "center";
  justifyContent?: "center" | "space-between";
  gap?: number;
  paddingTop?: number;
  backgroundColor?: string;
  borderTopColor?: string;
  borderRadius?: number;
  clip?: boolean;
};

export type TextStyle = Placement & {
  family: string;
  weight: 400 | 500;
  size: number;
  /** Line height as a multiple of the size. */
  lineHeight: number;
  /** Letter spacing in em. */
  tracking?: number;
  colour: string;
  /** The text is cut with an ellipsis after this many lines. Every text has a limit. */
  maxLines: number;
  uppercase?: boolean;
  /**
   * Smaller sizes to try, largest first, when the text does not fit `maxLines` at `size`. Needs `width`. If it
   * fits at none of them, it is drawn at the smallest on up to `wrapLines` lines and then cut.
   */
  shrinkTo?: number[];
  wrapLines?: number;
};

export type ImageStyle = Placement & {
  width: number;
  height: number;
  /** Clips the image to a circle and fills the circle, cropping what does not fit. */
  circle?: boolean;
};

export type Box = { type: "box"; style: BoxStyle; children: Node[] };
export type Text = { type: "text"; text: string; style: TextStyle };
export type Image = { type: "image"; bytes: Uint8Array; style: ImageStyle };
export type Node = Box | Text | Image;

export const box = (style: BoxStyle, children: Node[]): Box => ({ type: "box", style, children });
export const text = (value: string, style: TextStyle): Text => ({ type: "text", text: value, style });
export const image = (bytes: Uint8Array, style: ImageStyle): Image => ({ type: "image", bytes, style });
