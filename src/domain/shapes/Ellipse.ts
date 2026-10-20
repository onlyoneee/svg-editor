import { Shape, type AttributeValue, type ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Ellipse extends Shape {
  public readonly kind: ShapeKind = "ellipse";

  public constructor(
    id: string,
    private cxValue: number,
    private cyValue: number,
    private radiusXValue: number,
    private radiusYValue: number,
    style: ShapeStyle = {},
  ) {
    super(id, style);
    this.cxValue = this.requireFiniteNumber("cx", cxValue);
    this.cyValue = this.requireFiniteNumber("cy", cyValue);
    this.radiusXValue = this.requireNonNegativeNumber("rx", radiusXValue);
    this.radiusYValue = this.requireNonNegativeNumber("ry", radiusYValue);
  }

  public get cx(): number {
    return this.cxValue;
  }

  public get cy(): number {
    return this.cyValue;
  }

  public get radiusX(): number {
    return this.radiusXValue;
  }

  public get radiusY(): number {
    return this.radiusYValue;
  }

  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitEllipse(this);
  }

  protected override moveBy(dx: number, dy: number): void {
    this.cxValue += dx;
    this.cyValue += dy;
  }

  protected override scaleBy(factor: number): void {
    this.cxValue *= factor;
    this.cyValue *= factor;
    this.radiusXValue *= factor;
    this.radiusYValue *= factor;
  }

  protected override setSpecificAttribute(attribute: string, value: AttributeValue): boolean {
    switch (attribute) {
      case "cx":
        this.cxValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "cy":
        this.cyValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "rx":
        this.radiusXValue = this.requireNonNegativeNumber(attribute, value);
        return true;
      case "ry":
        this.radiusYValue = this.requireNonNegativeNumber(attribute, value);
        return true;
      default:
        return false;
    }
  }
}
