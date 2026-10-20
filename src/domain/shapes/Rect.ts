import { Shape, type AttributeValue, type ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Rect extends Shape {
  public readonly kind: ShapeKind = "rect";

  public constructor(
    id: string,
    private xValue: number,
    private yValue: number,
    private widthValue: number,
    private heightValue: number,
    style: ShapeStyle = {},
  ) {
    super(id, style);
    this.xValue = this.requireFiniteNumber("x", xValue);
    this.yValue = this.requireFiniteNumber("y", yValue);
    this.widthValue = this.requireNonNegativeNumber("width", widthValue);
    this.heightValue = this.requireNonNegativeNumber("height", heightValue);
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitRect(this);
  }

  protected override moveBy(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  protected override scaleBy(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
    this.widthValue *= factor;
    this.heightValue *= factor;
  }

  protected override setSpecificAttribute(attribute: string, value: AttributeValue): boolean {
    switch (attribute) {
      case "x":
        this.xValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "y":
        this.yValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "width":
        this.widthValue = this.requireNonNegativeNumber(attribute, value);
        return true;
      case "height":
        this.heightValue = this.requireNonNegativeNumber(attribute, value);
        return true;
      default:
        return false;
    }
  }
}
