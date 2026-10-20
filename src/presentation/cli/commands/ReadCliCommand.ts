import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class ReadCliCommand implements CliCommand {
  public readonly name = "read";
  public readonly usage = "read <file.svg>";
  public readonly description = "replace the document from an SVG file";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(1);
    const filePath = argumentsParser.at(0);
    const warnings = this.session.read(filePath);
    for (const warning of warnings) {
      this.output.warning(warning);
    }
    this.output.success(`read ${filePath} (${this.session.requireDocument().shapeCount} elements)`);
  }
}
