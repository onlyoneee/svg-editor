import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryMemento } from "../../domain/shapes/GeometryMemento.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class ScaleCommand implements EditCommand {
  private memento: GeometryMemento | null = null;

  public constructor(
    private readonly document: SvgDocument,
    private readonly shapeId: string,
    private readonly factor: number,
  ) {}

  public execute(): void {
    const shape = this.document.requireShape(this.shapeId);
    const memento = shape.createGeometryMemento();
    shape.scale(this.factor);
    this.memento = memento;
  }

  public undo(): void {
    if (this.memento === null) {
      throw new EditorError("scale command has not been executed");
    }
    this.memento.restore();
  }
}
