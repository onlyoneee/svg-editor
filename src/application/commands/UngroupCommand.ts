import type { ShapePlacement } from "../../domain/document/ShapePlacement.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { DomainError } from "../../domain/errors/DomainError.js";
import type { Group } from "../../domain/shapes/Group.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class UngroupCommand implements EditCommand {
  private group: Group | null = null;
  private placement: ShapePlacement | null = null;
  private children: readonly Shape[] | null = null;

  public constructor(
    private readonly document: SvgDocument,
    private readonly groupId: string,
  ) {}

  public execute(): void {
    const group = this.document.requireGroup(this.groupId);
    const placement = this.document.placementOf(this.groupId);
    if (placement.parent === null) {
      throw new DomainError(`cannot ungroup top-level container: ${this.groupId}`);
    }
    const children = [...group.children];

    this.document.removeShape(this.groupId);
    for (const child of children) {
      group.removeChild(child);
    }
    children.forEach((child, offset) => {
      this.document.addShape(child, placement.parent, placement.index + offset);
    });

    this.group = group;
    this.placement = placement;
    this.children = children;
  }

  public undo(): void {
    const group = this.requireGroup();
    const placement = this.requirePlacement();
    const children = this.requireChildren();

    for (const child of children) {
      this.document.removeShape(child.id);
    }
    this.document.addShape(group, placement.parent, placement.index);
    for (const child of children) {
      this.document.addShape(child, group);
    }
  }

  private requireGroup(): Group {
    if (this.group === null) {
      throw new EditorError("ungroup command has not been executed");
    }
    return this.group;
  }

  private requirePlacement(): ShapePlacement {
    if (this.placement === null) {
      throw new EditorError("ungroup command has not been executed");
    }
    return this.placement;
  }

  private requireChildren(): readonly Shape[] {
    if (this.children === null) {
      throw new EditorError("ungroup command has not been executed");
    }
    return this.children;
  }
}
