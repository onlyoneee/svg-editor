import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { GeometryMemento } from "../../domain/shapes/GeometryMemento.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class MoveCommand implements EditCommand {
  private memento: GeometryMemento | null = null;

  public constructor(
    private readonly document: SvgDocument,
    private readonly shapeId: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  public execute(): void {
    const shape = this.document.requireShape(this.shapeId);
    const memento = shape.createGeometryMemento();
    shape.move(this.dx, this.dy);
    this.memento = memento;
  }

  public undo(): void {
    if (this.memento === null) {
      throw new EditorError("move command has not been executed");
    }
    this.memento.restore();
  }
}
