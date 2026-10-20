import type { ShapePlacement } from "../../domain/document/ShapePlacement.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class AddToCommand implements EditCommand {
  private placement: ShapePlacement | null = null;

  public constructor(
    private readonly document: SvgDocument,
    private readonly containerId: string,
    private readonly shapeId: string,
  ) {}

  public execute(): void {
    this.placement = this.document.placementOf(this.shapeId);
    this.document.moveShapeToContainer(this.shapeId, this.containerId);
  }

  public undo(): void {
    const placement = this.requirePlacement();
    this.document.moveShapeToPlacement(this.shapeId, placement.parent, placement.index);
  }

  private requirePlacement(): ShapePlacement {
    if (this.placement === null) {
      throw new EditorError("addto command has not been executed");
    }
    return this.placement;
  }
}
