import { UngroupCommand } from "../../../application/commands/UngroupCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class UngroupCliCommand implements CliCommand {
  public readonly name = "ungroup";
  public readonly usage = "ungroup <gid>";
  public readonly description = "dissolve a nested container";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(1);
    const groupId = argumentsParser.at(0);
    const document = this.session.requireDocument();
    const childCount = document.requireGroup(groupId).children.length;
    this.session.history.execute(new UngroupCommand(document, groupId));
    this.output.success(`g#${groupId} ungrouped (${childCount} children promoted)`);
  }
}
