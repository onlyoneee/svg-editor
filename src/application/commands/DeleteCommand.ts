import type { ShapePlacement } from "../../domain/document/ShapePlacement.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class DeleteCommand implements EditCommand {
  private placement: ShapePlacement | null = null;

  public constructor(
    private readonly document: SvgDocument,
    private readonly shapeId: string,
  ) {}

  public execute(): void {
    this.placement = this.document.removeShape(this.shapeId);
  }

  public undo(): void {
    const placement = this.requirePlacement();
    this.document.addShape(placement.shape, placement.parent, placement.index);
  }

  private requirePlacement(): ShapePlacement {
    if (this.placement === null) {
      throw new EditorError("delete command has not been executed");
    }
    return this.placement;
  }
}
