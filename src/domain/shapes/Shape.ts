import { DomainError } from "../errors/DomainError.js";
import type { Group } from "./Group.js";
import type { ShapeOwner } from "./ShapeOwner.js";
import type { ShapeStyle } from "./ShapeStyle.js";

export type ShapeKind = "rect" | "circle" | "ellipse" | "line" | "text" | "g";
export type AttributeValue = string | number;

export abstract class Shape {
  private parentValue: Group | null = null;
  private ownerValue: ShapeOwner | null = null;
  private fillValue: string | undefined;
  private strokeValue: string | undefined;
  private strokeWidthValue: number | undefined;

  protected constructor(
    public readonly id: string,
    style: ShapeStyle = {},
  ) {
    if (id.length === 0 || id.trim() !== id || /\s/u.test(id)) {
      throw new DomainError(`invalid id: ${id}`);
    }

    if (style.fill !== undefined) {
      this.fillValue = this.requirePaint("fill", style.fill);
    }
    if (style.stroke !== undefined) {
      this.strokeValue = this.requirePaint("stroke", style.stroke);
    }
    if (style.strokeWidth !== undefined) {
      this.strokeWidthValue = this.requireNonNegativeNumber("stroke-width", style.strokeWidth);
    }
  }

  public abstract readonly kind: ShapeKind;

  public get parent(): Group | null {
    return this.parentValue;
  }

  public get owner(): ShapeOwner | null {
    return this.ownerValue;
  }

  public get fill(): string | undefined {
    return this.fillValue;
  }

  public get stroke(): string | undefined {
    return this.strokeValue;
  }

  public get strokeWidth(): number | undefined {
    return this.strokeWidthValue;
  }

  public move(dx: number, dy: number): void {
    this.requireFiniteNumber("dx", dx);
    this.requireFiniteNumber("dy", dy);
    this.moveBy(dx, dy);
  }

  public scale(factor: number): void {
    const validFactor = this.requireFiniteNumber("scale factor", factor);
    if (validFactor <= 0) {
      throw new DomainError("scale factor must be positive");
    }
    this.scaleBy(validFactor);
  }

  public set(attribute: string, value: AttributeValue): void {
    switch (attribute) {
      case "fill":
        this.fillValue = this.requirePaint(attribute, value);
        return;
      case "stroke":
        this.strokeValue = this.requirePaint(attribute, value);
        return;
      case "stroke-width":
        this.strokeWidthValue = this.requireNonNegativeNumber(attribute, value);
        return;
      default:
        if (!this.setSpecificAttribute(attribute, value)) {
          throw new DomainError(`unknown attribute: ${attribute}`);
        }
    }
  }

  public *walk(): IterableIterator<Shape> {
    yield this;
  }

  public attachToOwner(owner: ShapeOwner): void {
    if (this.ownerValue !== null) {
      throw new DomainError(`shape is already attached to a document: ${this.id}`);
    }
    this.ownerValue = owner;
  }

  public detachFromOwner(owner: ShapeOwner): void {
    if (this.ownerValue !== owner) {
      throw new DomainError(`shape is not attached to this document: ${this.id}`);
    }
    this.ownerValue = null;
  }

  protected static assignParent(shape: Shape, parent: Group | null): void {
    shape.parentValue = parent;
  }

  protected abstract moveBy(dx: number, dy: number): void;

  protected abstract scaleBy(factor: number): void;

  protected abstract setSpecificAttribute(attribute: string, value: AttributeValue): boolean;

  protected requireFiniteNumber(attribute: string, value: AttributeValue): number {
    const numberValue = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(numberValue)) {
      throw new DomainError(`${attribute} must be a finite number`);
    }
    return numberValue;
  }

  protected requireNonNegativeNumber(attribute: string, value: AttributeValue): number {
    const numberValue = this.requireFiniteNumber(attribute, value);
    if (numberValue < 0) {
      throw new DomainError(`${attribute} must not be negative`);
    }
    return numberValue;
  }

  protected requireText(attribute: string, value: AttributeValue): string {
    if (typeof value !== "string") {
      throw new DomainError(`${attribute} must be text`);
    }
    return value;
  }

  private requirePaint(attribute: string, value: AttributeValue): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new DomainError(`${attribute} must be a non-empty string`);
    }
    return value;
  }
}
