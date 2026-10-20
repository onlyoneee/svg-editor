import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { Group } from "../../domain/shapes/Group.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import type { EditCommand } from "./EditCommand.js";

export class CreateCommand implements EditCommand {
  public constructor(
    private readonly document: SvgDocument,
    private readonly shape: Shape,
    private readonly parentId: string | null = null,
  ) {}

  public execute(): void {
    const parent = this.resolveParent();
    this.document.addShape(this.shape, parent);
  }

  public undo(): void {
    this.document.removeShape(this.shape.id);
  }

  private resolveParent(): Group | null {
    return this.parentId === null ? null : this.document.requireGroup(this.parentId);
  }
}
