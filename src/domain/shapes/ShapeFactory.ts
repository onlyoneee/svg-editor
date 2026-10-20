import { DomainError } from "../errors/DomainError.js";
import { Circle } from "./Circle.js";
import { Ellipse } from "./Ellipse.js";
import { Group } from "./Group.js";
import { Line } from "./Line.js";
import { Rect } from "./Rect.js";
import type { Shape, ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";
import { Text } from "./Text.js";

export type ShapeAttributes = Readonly<Record<string, string>>;

export class ShapeFactory {
  public create(type: string, id: string, attributes: ShapeAttributes, textContent = ""): Shape {
    const style = this.readStyle(attributes);

    switch (type as ShapeKind) {
      case "rect":
        this.assertAllowedAttributes(type, attributes, ["x", "y", "width", "height"]);
        return new Rect(
          id,
          this.requiredNumber(attributes, "x"),
          this.requiredNumber(attributes, "y"),
          this.requiredNumber(attributes, "width"),
          this.requiredNumber(attributes, "height"),
          style,
        );
      case "circle":
        this.assertAllowedAttributes(type, attributes, ["cx", "cy", "r"]);
        return new Circle(
          id,
          this.requiredNumber(attributes, "cx"),
          this.requiredNumber(attributes, "cy"),
          this.requiredNumber(attributes, "r"),
          style,
        );
      case "ellipse":
        this.assertAllowedAttributes(type, attributes, ["cx", "cy", "rx", "ry"]);
        return new Ellipse(
          id,
          this.requiredNumber(attributes, "cx"),
          this.requiredNumber(attributes, "cy"),
          this.requiredNumber(attributes, "rx"),
          this.requiredNumber(attributes, "ry"),
          style,
        );
      case "line":
        this.assertAllowedAttributes(type, attributes, ["x1", "y1", "x2", "y2"]);
        return new Line(
          id,
          this.requiredNumber(attributes, "x1"),
          this.requiredNumber(attributes, "y1"),
          this.requiredNumber(attributes, "x2"),
          this.requiredNumber(attributes, "y2"),
          style,
        );
      case "text":
        this.assertAllowedAttributes(type, attributes, ["x", "y"]);
        return new Text(
          id,
          this.requiredNumber(attributes, "x"),
          this.requiredNumber(attributes, "y"),
          textContent,
          style,
        );
      case "g":
        this.assertAllowedAttributes(type, attributes, []);
        return new Group(id, style);
      default:
        throw new DomainError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private readStyle(attributes: ShapeAttributes): ShapeStyle {
    const style: { fill?: string; stroke?: string; strokeWidth?: number } = {};
    if (attributes.fill !== undefined) {
      style.fill = attributes.fill;
    }
    if (attributes.stroke !== undefined) {
      style.stroke = attributes.stroke;
    }
    if (attributes["stroke-width"] !== undefined) {
      style.strokeWidth = this.numberValue("stroke-width", attributes["stroke-width"]);
    }
    return style;
  }

  private assertAllowedAttributes(
    type: string,
    attributes: ShapeAttributes,
    geometryAttributes: readonly string[],
  ): void {
    const allowed = new Set(["id", "fill", "stroke", "stroke-width", ...geometryAttributes]);
    for (const attribute of Object.keys(attributes)) {
      if (!allowed.has(attribute)) {
        throw new DomainError(`unsupported attribute on <${type}>: ${attribute}`);
      }
    }
  }

  private requiredNumber(attributes: ShapeAttributes, name: string): number {
    const value = attributes[name];
    if (value === undefined || value.trim().length === 0) {
      throw new DomainError(`missing attribute: ${name}`);
    }
    return this.numberValue(name, value);
  }

  private numberValue(name: string, value: string): number {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      throw new DomainError(`${name} must be a finite number`);
    }
    return numberValue;
  }
}
