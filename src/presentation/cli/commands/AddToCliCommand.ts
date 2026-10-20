import { AddToCommand } from "../../../application/commands/AddToCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class AddToCliCommand implements CliCommand {
  public readonly name = "addto";
  public readonly usage = "addto <gid> <id>";
  public readonly description = "move a shape into a container";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(2);
    const groupId = argumentsParser.at(0);
    const id = argumentsParser.at(1);
    const document = this.session.requireDocument();
    const shape = document.requireShape(id);
    this.session.history.execute(new AddToCommand(document, groupId, id));
    this.output.success(`${shape.kind}#${id} moved into g#${groupId}`);
  }
}
