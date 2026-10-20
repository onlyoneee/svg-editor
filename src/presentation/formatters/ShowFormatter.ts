import type { Shape } from "../../domain/shapes/Shape.js";
import { ShapeFormatter } from "./ShapeFormatter.js";

export class ShowFormatter {
  public constructor(private readonly shapeFormatter: ShapeFormatter = new ShapeFormatter()) {}

  public format(shape: Shape): string {
    const view = this.shapeFormatter.format(shape);
    const parent = shape.parent === null ? "svg" : `g#${shape.parent.id}`;
    const heading = `${shape.kind}#${shape.id}  parent=${parent}`;
    return [heading, ...view.details.map((line) => `  ${line}`)].join("\n");
  }
}
