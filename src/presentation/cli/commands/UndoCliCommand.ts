import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class UndoCliCommand implements CliCommand {
  public readonly name = "undo";
  public readonly usage = "undo";
  public readonly description = "undo the last edit";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(0);
    this.session.history.undo();
    this.output.success("undo complete");
  }
}
