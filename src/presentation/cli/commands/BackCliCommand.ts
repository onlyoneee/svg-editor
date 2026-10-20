import { BackCommand } from "../../../application/commands/BackCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class BackCliCommand implements CliCommand {
  public readonly name = "back";
  public readonly usage = "back <id>";
  public readonly description = "send a shape behind its siblings";

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
    this.session.history.execute(new BackCommand(document, id));
    this.output.success(`${shape.kind}#${id} moved to back`);
  }
}
