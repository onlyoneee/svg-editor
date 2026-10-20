import { MoveCommand } from "../../../application/commands/MoveCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class MoveCliCommand implements CliCommand {
  public readonly name = "move";
  public readonly usage = "move <id> <dx> <dy>";
  public readonly description = "move a shape or container";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(3);
    const id = argumentsParser.at(0);
    const dx = argumentsParser.numberAt(1, "dx");
    const dy = argumentsParser.numberAt(2, "dy");
    const document = this.session.requireDocument();
    const shape = document.requireShape(id);
    this.session.history.execute(new MoveCommand(document, id, dx, dy));
    this.output.success(`${shape.kind}#${id} moved by (${dx},${dy})`);
  }
}
