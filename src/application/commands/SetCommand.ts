import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { AttributeValue } from "../../domain/shapes/Shape.js";
import { EditorError } from "../errors/EditorError.js";
import type { EditCommand } from "./EditCommand.js";

export class SetCommand implements EditCommand {
  private previousValue: AttributeValue | undefined;
  private hasExecuted = false;

  public constructor(
    private readonly document: SvgDocument,
    private readonly shapeId: string,
    private readonly attribute: string,
    private readonly value: AttributeValue,
  ) {}

  public execute(): void {
    const shape = this.document.requireShape(this.shapeId);
    const previousValue = shape.getAttribute(this.attribute);
    shape.set(this.attribute, this.value);
    this.previousValue = previousValue;
    this.hasExecuted = true;
  }

  public undo(): void {
    if (!this.hasExecuted) {
      throw new EditorError("set command has not been executed");
    }
    this.document.requireShape(this.shapeId).restoreAttribute(this.attribute, this.previousValue);
  }
}
