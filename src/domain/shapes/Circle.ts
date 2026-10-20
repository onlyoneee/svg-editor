import { Shape, type AttributeValue, type ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";

export class Circle extends Shape {
  public readonly kind: ShapeKind = "circle";

  public constructor(
    id: string,
    private cxValue: number,
    private cyValue: number,
    private radiusValue: number,
    style: ShapeStyle = {},
  ) {
    super(id, style);
    this.cxValue = this.requireFiniteNumber("cx", cxValue);
    this.cyValue = this.requireFiniteNumber("cy", cyValue);
    this.radiusValue = this.requireNonNegativeNumber("r", radiusValue);
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get radius(): number {
    return this.radiusValue;
  }

  protected override moveBy(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  protected override scaleBy(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.radiusValue *= factor;
  }

  protected override setSpecificAttribute(attribute: string, value: AttributeValue): boolean {
    switch (attribute) {
      case "cx":
        this.cxValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "cy":
        this.cyValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "r":
        this.radiusValue = this.requireNonNegativeNumber(attribute, value);
        return true;
      default:
        return false;
    }
  }
}
