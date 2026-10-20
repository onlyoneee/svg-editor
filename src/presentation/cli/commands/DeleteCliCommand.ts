import { DeleteCommand } from "../../../application/commands/DeleteCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class DeleteCliCommand implements CliCommand {
  public readonly name = "delete";
  public readonly usage = "delete <id>";
  public readonly description = "delete a shape or subtree";

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
    this.session.history.execute(new DeleteCommand(document, id));
    this.output.success(`${shape.kind}#${id} deleted`);
  }
}
