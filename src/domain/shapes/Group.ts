import { DomainError } from "../errors/DomainError.js";
import { GeometryMemento } from "./GeometryMemento.js";
import { Shape, type AttributeValue, type ShapeKind } from "./Shape.js";
import type { ShapeStyle } from "./ShapeStyle.js";
import type { ShapeVisitor } from "./ShapeVisitor.js";

export class Group extends Shape {
  public readonly kind: ShapeKind = "g";
  private readonly childList: Shape[] = [];

  public constructor(id: string, style: ShapeStyle = {}) {
    super(id, style);
  }

  public get children(): readonly Shape[] {
    return this.childList;
  }

  public override accept<Result>(visitor: ShapeVisitor<Result>): Result {
    return visitor.visitGroup(this);
  }

  public override createGeometryMemento(): GeometryMemento {
    const childMementos = this.childList.map((child) => child.createGeometryMemento());
    return new GeometryMemento(() => {
      for (const memento of childMementos) {
        memento.restore();
      }
    });
  }

  public appendChild(shape: Shape): void {
    this.insertChild(shape, this.childList.length);
  }

  public insertChild(shape: Shape, index: number): void {
    this.assertCanAccept(shape);
    if (!Number.isInteger(index) || index < 0 || index > this.childList.length) {
      throw new DomainError(`invalid child index: ${index}`);
    }

    this.owner?.registerSubtree(shape);
    this.childList.splice(index, 0, shape);
    Group.assignParent(shape, this);
  }

  public removeChild(shape: Shape): number {
    const index = this.childList.indexOf(shape);
    if (index < 0) {
      throw new DomainError(`shape is not a child of ${this.id}: ${shape.id}`);
    }

    this.owner?.unregisterSubtree(shape);
    this.childList.splice(index, 1);
    Group.assignParent(shape, null);
    return index;
  }

  public moveChildToFront(shape: Shape): void {
    const index = this.requireChildIndex(shape);
    this.childList.splice(index, 1);
    this.childList.push(shape);
  }

  public moveChildToBack(shape: Shape): void {
    const index = this.requireChildIndex(shape);
    this.childList.splice(index, 1);
    this.childList.unshift(shape);
  }

  public assertCanAccept(shape: Shape): void {
    if (shape.parent !== null) {
      throw new DomainError(`shape already has a parent: ${shape.id}`);
    }
    if (shape === this || (shape instanceof Group && shape.contains(this))) {
      throw new DomainError(`cannot move a container into its own descendant: ${shape.id}`);
    }
    if (shape.owner !== null) {
      throw new DomainError(`shape is already attached to a document: ${shape.id}`);
    }
  }

  public contains(candidate: Shape): boolean {
    for (const child of this.childList) {
      if (child === candidate || (child instanceof Group && child.contains(candidate))) {
        return true;
      }
    }
    return false;
  }

  public override *walk(): IterableIterator<Shape> {
    yield this;
    for (const child of this.childList) {
      yield* child.walk();
    }
  }

  protected override moveBy(dx: number, dy: number): void {
    for (const child of this.childList) {
      child.move(dx, dy);
    }
  }

  protected override scaleBy(factor: number): void {
    for (const child of this.childList) {
      child.scale(factor);
    }
  }

  protected override setSpecificAttribute(_attribute: string, _value: AttributeValue): boolean {
    return false;
  }

  protected override getSpecificAttribute(_attribute: string): AttributeValue | undefined {
    return undefined;
  }

  private requireChildIndex(shape: Shape): number {
    const index = this.childList.indexOf(shape);
    if (index < 0) {
      throw new DomainError(`shape is not a child of ${this.id}: ${shape.id}`);
    }
    return index;
  }
}
