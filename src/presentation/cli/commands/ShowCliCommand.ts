import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import type { ShowFormatter } from "../../formatters/ShowFormatter.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class ShowCliCommand implements CliCommand {
  public readonly name = "show";
  public readonly usage = "show <id>";
  public readonly description = "show one shape in detail";

  public constructor(
    private readonly session: DocumentSession,
    private readonly formatter: ShowFormatter,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(1);
    const shape = this.session.requireDocument().requireShape(argumentsParser.at(0));
    this.output.display(this.formatter.format(shape));
  }
}
