import { Shape, type AttributeValue, type ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Line extends Shape {
  public readonly kind: ShapeKind = "line";

  public constructor(
    id: string,
    private x1Value: number,
    private y1Value: number,
    private x2Value: number,
    private y2Value: number,
    style: ShapeStyle = {},
  ) {
    super(id, style);
    this.x1Value = this.requireFiniteNumber("x1", x1Value);
    this.y1Value = this.requireFiniteNumber("y1", y1Value);
    this.x2Value = this.requireFiniteNumber("x2", x2Value);
    this.y2Value = this.requireFiniteNumber("y2", y2Value);
  }

  public get x1(): number {
    return this.x1Value;
  }

  public get y1(): number {
    return this.y1Value;
  }

  public get x2(): number {
    return this.x2Value;
  }

  public get y2(): number {
    return this.y2Value;
  }

  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitLine(this);
  }

  protected override moveBy(dx: number, dy: number): void {
    this.x1Value += dx;
    this.y1Value += dy;
    this.x2Value += dx;
    this.y2Value += dy;
  }

  protected override scaleBy(factor: number): void {
    this.x1Value *= factor;
    this.y1Value *= factor;
    this.x2Value *= factor;
    this.y2Value *= factor;
  }

  protected override setSpecificAttribute(attribute: string, value: AttributeValue): boolean {
    switch (attribute) {
      case "x1":
        this.x1Value = this.requireFiniteNumber(attribute, value);
        return true;
      case "y1":
        this.y1Value = this.requireFiniteNumber(attribute, value);
        return true;
      case "x2":
        this.x2Value = this.requireFiniteNumber(attribute, value);
        return true;
      case "y2":
        this.y2Value = this.requireFiniteNumber(attribute, value);
        return true;
      default:
        return false;
    }
  }
}
