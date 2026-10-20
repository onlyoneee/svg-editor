import { EditorError } from "../../../application/errors/EditorError.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class CanvasCliCommand implements CliCommand {
  public readonly name = "canvas";
  public readonly usage = "canvas [w] [h]";
  public readonly description = "show or change the canvas size";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    if (arguments_.length === 0) {
      const document = this.session.requireDocument();
      this.output.display(`canvas ${document.width}x${document.height}`);
      return;
    }
    if (arguments_.length !== 2) {
      throw new EditorError(`usage: ${this.usage}`);
    }
    const argumentsParser = new CliArguments(arguments_, this.usage);
    const width = argumentsParser.numberAt(0, "width");
    const height = argumentsParser.numberAt(1, "height");
    this.session.setCanvasSize(width, height);
    this.output.success(`canvas resized to ${width}x${height}`);
  }
}
