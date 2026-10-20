import type { ShapePlacement } from "../../domain/document/ShapePlacement.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import { Group } from "../../domain/shapes/Group.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class GroupCommand implements EditCommand {
  private readonly group: Group;
  private placements: readonly ShapePlacement[] | null = null;

  public constructor(
    private readonly document: SvgDocument,
    newGroupId: string,
    private readonly shapeIds: readonly string[],
  ) {
    this.group = new Group(newGroupId);
  }

  public execute(): void {
    const shapes = this.validateAndOrderShapes();
    this.placements = shapes.map((shape) => this.document.placementOf(shape.id));

    for (const shape of shapes) {
      this.document.removeShape(shape.id);
    }
    this.document.addShape(this.group);
    for (const shape of shapes) {
      this.document.addShape(shape, this.group);
    }
  }

  public undo(): void {
    const placements = this.requirePlacements();
    this.document.removeShape(this.group.id);
    for (const child of [...this.group.children]) {
      this.group.removeChild(child);
    }
    for (const placement of placements) {
      this.document.addShape(placement.shape, placement.parent, placement.index);
    }
  }

  private validateAndOrderShapes(): Shape[] {
    if (this.shapeIds.length === 0) {
      throw new DomainError("group requires at least one shape");
    }
    if (this.document.hasShape(this.group.id)) {
      throw new DomainError(`id already exists: ${this.group.id}`);
    }

    const uniqueIds = new Set(this.shapeIds);
    if (uniqueIds.size !== this.shapeIds.length) {
      throw new DomainError("cannot group the same shape more than once");
    }
    const selected = this.shapeIds.map((id) => this.document.requireShape(id));
    for (const shape of selected) {
      if (
        shape instanceof Group &&
        selected.some((candidate) => candidate !== shape && shape.contains(candidate))
      ) {
        throw new DomainError(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }

    const order = new Map(this.document.shapesInTreeOrder.map((shape, index) => [shape, index]));
    return [...selected].sort(
      (left, right) => (order.get(left) as number) - (order.get(right) as number),
    );
  }

  private requirePlacements(): readonly ShapePlacement[] {
    if (this.placements === null) {
      throw new EditorError("group command has not been executed");
    }
    return this.placements;
  }
}
