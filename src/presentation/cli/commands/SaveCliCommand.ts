import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class SaveCliCommand implements CliCommand {
  public readonly name = "save";
  public readonly usage = "save [file.svg]";
  public readonly description = "save the current document";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(0, 1);
    const destination = this.session.save(arguments_[0]);
    this.output.success(
      `saved to ${destination} (${this.session.requireDocument().shapeCount} elements)`,
    );
  }
}
