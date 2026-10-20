import { GeometryMemento } from "./GeometryMemento.js";
import { Shape, type AttributeValue, type ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Text extends Shape {
  public readonly kind: ShapeKind = "text";

  public constructor(
    id: string,
    private xValue: number,
    private yValue: number,
    private contentValue: string,
    style: ShapeStyle = {},
  ) {
    super(id, style);
    this.xValue = this.requireFiniteNumber("x", xValue);
    this.yValue = this.requireFiniteNumber("y", yValue);
    this.contentValue = this.requireText("text", contentValue);
  }

  public get x(): number {
    return this.xValue;
  }

  public get y(): number {
    return this.yValue;
  }

  public get content(): string {
    return this.contentValue;
  }

  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitText(this);
  }

  public override createGeometryMemento(): GeometryMemento {
    const { xValue, yValue } = this;
    return new GeometryMemento(() => {
      this.xValue = xValue;
      this.yValue = yValue;
    });
  }

  protected override moveBy(dx: number, dy: number): void {
    this.xValue += dx;
    this.yValue += dy;
  }

  protected override scaleBy(factor: number): void {
    this.xValue *= factor;
    this.yValue *= factor;
  }

  protected override setSpecificAttribute(attribute: string, value: AttributeValue): boolean {
    switch (attribute) {
      case "x":
        this.xValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "y":
        this.yValue = this.requireFiniteNumber(attribute, value);
        return true;
      case "text":
        this.contentValue = this.requireText(attribute, value);
        return true;
      default:
        return false;
    }
  }

  protected override getSpecificAttribute(attribute: string): AttributeValue | undefined {
    switch (attribute) {
      case "x":
        return this.xValue;
      case "y":
        return this.yValue;
      case "text":
        return this.contentValue;
      default:
        return undefined;
    }
  }
}
