import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { Group } from "../../domain/shapes/Group.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { ShapeFormatter } from "./ShapeFormatter.js";

export class TreeFormatter {
  public constructor(private readonly shapeFormatter: ShapeFormatter = new ShapeFormatter()) {}

  public formatDocument(document: SvgDocument): string {
    const lines = [`svg (${this.number(document.width)}x${this.number(document.height)})`];
    document.rootShapes.forEach((shape, index) => {
      lines.push(...this.formatBranch(shape, "", index === document.rootShapes.length - 1));
    });
    return lines.join("\n");
  }

  public formatSubtree(shape: Shape): string {
    const lines = [this.shapeFormatter.format(shape).summary];
    if (shape instanceof Group) {
      shape.children.forEach((child, index) => {
        lines.push(...this.formatBranch(child, "", index === shape.children.length - 1));
      });
    }
    return lines.join("\n");
  }

  private formatBranch(shape: Shape, prefix: string, isLast: boolean): string[] {
    const connector = isLast ? "└── " : "├── ";
    const lines = [`${prefix}${connector}${this.shapeFormatter.format(shape).summary}`];
    if (shape instanceof Group) {
      const childPrefix = `${prefix}${isLast ? "    " : "│   "}`;
      shape.children.forEach((child, index) => {
        lines.push(...this.formatBranch(child, childPrefix, index === shape.children.length - 1));
      });
    }
    return lines;
  }

  private number(value: number): string {
    return Object.is(value, -0) ? "0" : String(value);
  }
}
