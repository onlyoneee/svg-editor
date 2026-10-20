import { FrontCommand } from "../../../application/commands/FrontCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class FrontCliCommand implements CliCommand {
  public readonly name = "front";
  public readonly usage = "front <id>";
  public readonly description = "bring a shape to the front of its siblings";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(1);
    const id = argumentsParser.at(0);
    const document = this.session.requireDocument();
    const shape = document.requireShape(id);
    this.session.history.execute(new FrontCommand(document, id));
    this.output.success(`${shape.kind}#${id} moved to front`);
  }
}
