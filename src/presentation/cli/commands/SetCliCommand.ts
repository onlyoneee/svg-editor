import { SetCommand } from "../../../application/commands/SetCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class SetCliCommand implements CliCommand {
  public readonly name = "set";
  public readonly usage = "set <id> <attr> <value>";
  public readonly description = "set an allowed shape attribute";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(3);
    const id = argumentsParser.at(0);
    const attribute = argumentsParser.at(1);
    const value = argumentsParser.at(2);
    const document = this.session.requireDocument();
    const shape = document.requireShape(id);
    this.session.history.execute(new SetCommand(document, id, attribute, value));
    const updatedValue = shape.getAttribute(attribute);
    const formattedValue =
      typeof updatedValue === "string" ? JSON.stringify(updatedValue) : String(updatedValue);
    this.output.success(`${shape.kind}#${id} updated: ${attribute}=${formattedValue}`);
  }
}
