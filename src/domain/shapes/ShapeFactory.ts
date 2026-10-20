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
  public createFromParameters(type: string, id: string, parameters: readonly string[]): Shape {
    switch (type as ShapeKind) {
      case "rect":
        this.requireParameterCount(type, parameters, 4, 5);
        return this.create(type, id, {
          x: this.parameter(parameters, 0),
          y: this.parameter(parameters, 1),
          width: this.parameter(parameters, 2),
          height: this.parameter(parameters, 3),
          ...this.optionalAttribute("fill", parameters[4]),
        });
      case "circle":
        this.requireParameterCount(type, parameters, 3, 4);
        return this.create(type, id, {
          cx: this.parameter(parameters, 0),
          cy: this.parameter(parameters, 1),
          r: this.parameter(parameters, 2),
          ...this.optionalAttribute("fill", parameters[3]),
        });
      case "ellipse":
        this.requireParameterCount(type, parameters, 4, 5);
        return this.create(type, id, {
          cx: this.parameter(parameters, 0),
          cy: this.parameter(parameters, 1),
          rx: this.parameter(parameters, 2),
          ry: this.parameter(parameters, 3),
          ...this.optionalAttribute("fill", parameters[4]),
        });
      case "line":
        this.requireParameterCount(type, parameters, 4, 5);
        return this.create(type, id, {
          x1: this.parameter(parameters, 0),
          y1: this.parameter(parameters, 1),
          x2: this.parameter(parameters, 2),
          y2: this.parameter(parameters, 3),
          ...this.optionalAttribute("stroke", parameters[4]),
        });
      case "text":
        this.requireParameterCount(type, parameters, 3);
        return this.create(
          type,
          id,
          {
            x: this.parameter(parameters, 0),
            y: this.parameter(parameters, 1),
          },
          this.parameter(parameters, 2),
        );
      case "g":
        this.requireParameterCount(type, parameters, 0);
        return this.create(type, id, {});
      default:
        return this.create(type, id, {});
    }
  }

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

  private requireParameterCount(
    type: string,
    parameters: readonly string[],
    minimum: number,
    maximum = minimum,
  ): void {
    if (parameters.length < minimum || parameters.length > maximum) {
      throw new DomainError(`invalid parameter count for ${type}`);
    }
  }

  private parameter(parameters: readonly string[], index: number): string {
    const parameter = parameters[index];
    if (parameter === undefined) {
      throw new DomainError("missing shape parameter");
    }
    return parameter;
  }

  private optionalAttribute(name: string, value: string | undefined): ShapeAttributes {
    return value === undefined ? {} : { [name]: value };
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
