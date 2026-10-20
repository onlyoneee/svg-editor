import type { Shape } from "./Shape.js";

export interface ShapeOwner {
  registerSubtree(shape: Shape): void;
  unregisterSubtree(shape: Shape): void;
}
