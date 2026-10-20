import type { EditCommand } from "../commands/EditCommand.js";
import { EditorError } from "../errors/EditorError.js";

export class CommandHistory {
  private readonly undoStack: EditCommand[] = [];
  private readonly redoStack: EditCommand[] = [];
  private blockedByDocumentOperation = false;

  public get undoCount(): number {
    return this.undoStack.length;
  }

  public get redoCount(): number {
    return this.redoStack.length;
  }

  public execute(command: EditCommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    this.blockedByDocumentOperation = false;
  }

  public undo(): void {
    if (this.blockedByDocumentOperation) {
      throw new EditorError("undo not allowed after io command");
    }
    const command = this.undoStack.at(-1);
    if (command === undefined) {
      throw new EditorError("nothing to undo");
    }

    command.undo();
    this.undoStack.pop();
    this.redoStack.push(command);
  }

  public redo(): void {
    if (this.blockedByDocumentOperation) {
      throw new EditorError("redo not allowed after io command");
    }
    const command = this.redoStack.at(-1);
    if (command === undefined) {
      throw new EditorError("nothing to redo");
    }

    command.execute();
    this.redoStack.pop();
    this.undoStack.push(command);
  }

  public recordDocumentOperation(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blockedByDocumentOperation = true;
  }
}
