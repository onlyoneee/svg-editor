import { DomainError } from "../errors/DomainError.js";
import { Group } from "../shapes/Group.js";
import type { Shape } from "../shapes/Shape.js";
import type { ShapeOwner } from "../shapes/ShapeOwner.js";
import type { ShapePlacement } from "./ShapePlacement.js";

export class SvgDocument implements ShapeOwner {
  private readonly rootShapeList: Shape[] = [];
  private readonly shapesById = new Map<string, Shape>();
  private widthValue: number;
  private heightValue: number;

  public constructor(width = 800, height = 600) {
    this.widthValue = this.requirePositiveDimension("width", width);
    this.heightValue = this.requirePositiveDimension("height", height);
  }

  public get width(): number {
    return this.widthValue;
  }

  public get height(): number {
    return this.heightValue;
  }

  public get rootShapes(): readonly Shape[] {
    return this.rootShapeList;
  }

  public get shapeCount(): number {
    return this.shapesById.size;
  }

  public setCanvasSize(width: number, height: number): void {
    const validWidth = this.requirePositiveDimension("width", width);
    const validHeight = this.requirePositiveDimension("height", height);
    this.widthValue = validWidth;
    this.heightValue = validHeight;
  }

  public hasShape(id: string): boolean {
    return this.shapesById.has(id);
  }

  public findShape(id: string): Shape | undefined {
    return this.shapesById.get(id);
  }

  public requireShape(id: string): Shape {
    const shape = this.findShape(id);
    if (shape === undefined) {
      throw new DomainError(`no such shape: ${id}`);
    }
    return shape;
  }

  public requireGroup(id: string): Group {
    const shape = this.requireShape(id);
    if (!(shape instanceof Group)) {
      throw new DomainError(`not a container: ${id}`);
    }
    return shape;
  }

  public addShape(shape: Shape, parent: Group | null = null, index?: number): void {
    this.assertDetachedRoot(shape);

    if (parent === null) {
      const insertionIndex = this.requireInsertionIndex(index, this.rootShapeList.length);
      this.registerSubtree(shape);
      this.rootShapeList.splice(insertionIndex, 0, shape);
    } else {
      this.assertRegisteredGroup(parent);
      const insertionIndex = this.requireInsertionIndex(index, parent.children.length);
      parent.insertChild(shape, insertionIndex);
    }
  }

  public removeShape(id: string): ShapePlacement {
    const shape = this.requireShape(id);
    const parent = shape.parent;
    const index = parent === null ? this.removeRootShape(shape) : parent.removeChild(shape);

    if (parent === null) {
      this.unregisterSubtree(shape);
    }

    return { shape, parent, index };
  }

  public registerSubtree(shape: Shape): void {
    const shapesToRegister = [...shape.walk()];
    this.assertSubtreeCanBeRegistered(shapesToRegister);
    for (const item of shapesToRegister) {
      item.attachToOwner(this);
      this.shapesById.set(item.id, item);
    }
  }

  public unregisterSubtree(shape: Shape): void {
    const shapesToUnregister = [...shape.walk()];
    for (const item of shapesToUnregister) {
      if (this.shapesById.get(item.id) !== item || item.owner !== this) {
        throw new DomainError(`shape is not attached to this document: ${item.id}`);
      }
    }
    for (const item of shapesToUnregister) {
      this.shapesById.delete(item.id);
      item.detachFromOwner(this);
    }
  }

  public moveShapeToContainer(shapeId: string, containerId: string): void {
    const shape = this.requireShape(shapeId);
    const container = this.requireGroup(containerId);

    if (shape === container || (shape instanceof Group && shape.contains(container))) {
      throw new DomainError(`cannot move a container into its own descendant: ${shape.id}`);
    }

    if (shape.parent === container) {
      container.moveChildToFront(shape);
      return;
    }

    this.detachShape(shape);
    container.appendChild(shape);
  }

  public moveShapeToRoot(shapeId: string): void {
    const shape = this.requireShape(shapeId);
    if (shape.parent === null) {
      this.moveRootShapeToFront(shape);
      return;
    }

    shape.parent.removeChild(shape);
    this.registerSubtree(shape);
    this.rootShapeList.push(shape);
  }

  public bringToFront(id: string): void {
    const shape = this.requireShape(id);
    if (shape.parent === null) {
      this.moveRootShapeToFront(shape);
    } else {
      shape.parent.moveChildToFront(shape);
    }
  }

  public sendToBack(id: string): void {
    const shape = this.requireShape(id);
    if (shape.parent === null) {
      const index = this.requireRootIndex(shape);
      this.rootShapeList.splice(index, 1);
      this.rootShapeList.unshift(shape);
    } else {
      shape.parent.moveChildToBack(shape);
    }
  }

  private assertSubtreeCanBeRegistered(shapes: readonly Shape[]): void {
    const incomingIds = new Set<string>();
    for (const shape of shapes) {
      if (shape.owner !== null) {
        throw new DomainError(`shape is already attached to a document: ${shape.id}`);
      }
      if (incomingIds.has(shape.id) || this.shapesById.has(shape.id)) {
        throw new DomainError(`id already exists: ${shape.id}`);
      }
      incomingIds.add(shape.id);
    }
  }

  private assertDetachedRoot(shape: Shape): void {
    if (shape.parent !== null) {
      throw new DomainError(`shape already has a parent: ${shape.id}`);
    }
  }

  private assertRegisteredGroup(group: Group): void {
    if (this.shapesById.get(group.id) !== group) {
      throw new DomainError(`no such container: ${group.id}`);
    }
  }

  private detachShape(shape: Shape): void {
    if (shape.parent === null) {
      this.removeRootShape(shape);
      this.unregisterSubtree(shape);
    } else {
      shape.parent.removeChild(shape);
    }
  }

  private removeRootShape(shape: Shape): number {
    const index = this.requireRootIndex(shape);
    this.rootShapeList.splice(index, 1);
    return index;
  }

  private moveRootShapeToFront(shape: Shape): void {
    const index = this.requireRootIndex(shape);
    this.rootShapeList.splice(index, 1);
    this.rootShapeList.push(shape);
  }

  private requireRootIndex(shape: Shape): number {
    const index = this.rootShapeList.indexOf(shape);
    if (index < 0) {
      throw new DomainError(`shape is not attached to this document: ${shape.id}`);
    }
    return index;
  }

  private requireInsertionIndex(index: number | undefined, length: number): number {
    const insertionIndex = index ?? length;
    if (!Number.isInteger(insertionIndex) || insertionIndex < 0 || insertionIndex > length) {
      throw new DomainError(`invalid child index: ${insertionIndex}`);
    }
    return insertionIndex;
  }

  private requirePositiveDimension(name: string, value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      throw new DomainError(`${name} must be positive`);
    }
    return value;
  }
}
