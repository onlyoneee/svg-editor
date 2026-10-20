import { GroupCommand } from "../../../application/commands/GroupCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class GroupCliCommand implements CliCommand {
  public readonly name = "group";
  public readonly usage = "group <newGid> <id1> <id2>...";
  public readonly description = "group existing shapes";

  public constructor(
    private readonly session: DocumentSession,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(2, Number.POSITIVE_INFINITY);
    const groupId = argumentsParser.at(0);
    const shapeIds = arguments_.slice(1);
    const document = this.session.requireDocument();
    this.session.history.execute(new GroupCommand(document, groupId, shapeIds));
    this.output.success(`g#${groupId} created with ${shapeIds.length} children`);
  }
}
