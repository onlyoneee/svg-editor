import { ScaleCommand } from "../../../application/commands/ScaleCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class ScaleCliCommand implements CliCommand {
  public readonly name = "scale";
  public readonly usage = "scale <id> <factor>";
  public readonly description = "scale a shape or container";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(2);
    const id = argumentsParser.at(0);
    const factor = argumentsParser.numberAt(1, "scale factor");
    const document = this.session.requireDocument();
    const shape = document.requireShape(id);
    this.session.history.execute(new ScaleCommand(document, id, factor));
    this.output.success(`${shape.kind}#${id} scaled by ${factor}`);
  }
}
