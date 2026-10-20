import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class RedoCliCommand implements CliCommand {
  public readonly name = "redo";
  public readonly usage = "redo";
  public readonly description = "redo the last undone edit";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(0);
    this.session.history.redo();
    this.output.success("redo complete");
  }
}
