import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { Circle } from "../../domain/shapes/Circle.js";
import type { Ellipse } from "../../domain/shapes/Ellipse.js";
import type { Group } from "../../domain/shapes/Group.js";
import type { Line } from "../../domain/shapes/Line.js";
import type { Rect } from "../../domain/shapes/Rect.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import type { ShapeVisitor } from "../../domain/shapes/ShapeVisitor.js";
import type { Text } from "../../domain/shapes/Text.js";

type ShapeRenderer = (depth: number) => string[];

export class SvgSerializer implements ShapeVisitor<ShapeRenderer> {
  public serialize(document: SvgDocument): string {
    const width = this.number(document.width);
    const height = this.number(document.height);
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    ];
    for (const shape of document.rootShapes) {
      lines.push(...this.render(shape, 1));
    }
    lines.push("</svg>");
    return `${lines.join("\n")}\n`;
  }

  public visitRect(shape: Rect): ShapeRenderer {
    return (depth) => [
      this.emptyElement(
        "rect",
        [
          ["id", shape.id],
          ["x", this.number(shape.x)],
          ["y", this.number(shape.y)],
          ["width", this.number(shape.width)],
          ["height", this.number(shape.height)],
          ...this.styleAttributes(shape),
        ],
        depth,
      ),
    ];
  }

  public visitCircle(shape: Circle): ShapeRenderer {
    return (depth) => [
      this.emptyElement(
        "circle",
        [
          ["id", shape.id],
          ["cx", this.number(shape.cx)],
          ["cy", this.number(shape.cy)],
          ["r", this.number(shape.radius)],
          ...this.styleAttributes(shape),
        ],
        depth,
      ),
    ];
  }

  public visitEllipse(shape: Ellipse): ShapeRenderer {
    return (depth) => [
      this.emptyElement(
        "ellipse",
        [
          ["id", shape.id],
          ["cx", this.number(shape.cx)],
          ["cy", this.number(shape.cy)],
          ["rx", this.number(shape.radiusX)],
          ["ry", this.number(shape.radiusY)],
          ...this.styleAttributes(shape),
        ],
        depth,
      ),
    ];
  }

  public visitLine(shape: Line): ShapeRenderer {
    return (depth) => [
      this.emptyElement(
        "line",
        [
          ["id", shape.id],
          ["x1", this.number(shape.x1)],
          ["y1", this.number(shape.y1)],
          ["x2", this.number(shape.x2)],
          ["y2", this.number(shape.y2)],
          ...this.styleAttributes(shape),
        ],
        depth,
      ),
    ];
  }

  public visitText(shape: Text): ShapeRenderer {
    return (depth) => {
      const attributes = this.attributes([
        ["id", shape.id],
        ["x", this.number(shape.x)],
        ["y", this.number(shape.y)],
        ...this.styleAttributes(shape),
      ]);
      return [`${this.indent(depth)}<text${attributes}>${this.escapeText(shape.content)}</text>`];
    };
  }

  public visitGroup(shape: Group): ShapeRenderer {
    return (depth) => {
      const attributes = this.attributes([["id", shape.id], ...this.styleAttributes(shape)]);
      if (shape.children.length === 0) {
        return [`${this.indent(depth)}<g${attributes}/>`];
      }
      const lines = [`${this.indent(depth)}<g${attributes}>`];
      for (const child of shape.children) {
        lines.push(...this.render(child, depth + 1));
      }
      lines.push(`${this.indent(depth)}</g>`);
      return lines;
    };
  }

  private render(shape: Shape, depth: number): string[] {
    return shape.accept(this)(depth);
  }

  private emptyElement(
    name: string,
    attributes: ReadonlyArray<readonly [string, string]>,
    depth: number,
  ): string {
    return `${this.indent(depth)}<${name}${this.attributes(attributes)}/>`;
  }

  private styleAttributes(shape: Shape): Array<readonly [string, string]> {
    const attributes: Array<readonly [string, string]> = [];
    if (shape.fill !== undefined) {
      attributes.push(["fill", shape.fill]);
    }
    if (shape.stroke !== undefined) {
      attributes.push(["stroke", shape.stroke]);
    }
    if (shape.strokeWidth !== undefined) {
      attributes.push(["stroke-width", this.number(shape.strokeWidth)]);
    }
    return attributes;
  }

  private attributes(attributes: ReadonlyArray<readonly [string, string]>): string {
    return attributes.map(([name, value]) => ` ${name}="${this.escapeAttribute(value)}"`).join("");
  }

  private escapeAttribute(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
  }

  private escapeText(value: string): string {
    return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  }

  private number(value: number): string {
    return Object.is(value, -0) ? "0" : String(value);
  }

  private indent(depth: number): string {
    return "  ".repeat(depth);
  }
}
