import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import type { TreeFormatter } from "../../formatters/TreeFormatter.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class TreeCliCommand implements CliCommand {
  public readonly name = "tree";
  public readonly usage = "tree [id]";
  public readonly description = "show the document tree or a subtree";

  public constructor(
    private readonly session: DocumentSession,
    private readonly formatter: TreeFormatter,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(0, 1);
    const document = this.session.requireDocument();
    const id = arguments_[0];
    this.output.display(
      id === undefined
        ? this.formatter.formatDocument(document)
        : this.formatter.formatSubtree(document.requireShape(id)),
    );
  }
}
