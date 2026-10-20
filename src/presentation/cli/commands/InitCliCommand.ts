import { SvgDocument } from "../../../domain/document/SvgDocument.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { EditorError } from "../../../application/errors/EditorError.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class InitCliCommand implements CliCommand {
  public readonly name = "init";
  public readonly usage = "init [w] [h]";
  public readonly description = "create a new SVG document";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    if (arguments_.length !== 0 && arguments_.length !== 2) {
      throw new EditorError(`usage: ${this.usage}`);
    }
    const argumentsParser = new CliArguments(arguments_, this.usage);
    const width = arguments_.length === 0 ? 800 : argumentsParser.numberAt(0, "width");
    const height = arguments_.length === 0 ? 600 : argumentsParser.numberAt(1, "height");
    this.session.replaceDocument(new SvgDocument(width, height));
    this.output.success(`canvas ${width}x${height} created`);
  }
}
