import { CreateCommand } from "../../../application/commands/CreateCommand.js";
import type { DocumentSession } from "../../../application/services/DocumentSession.js";
import type { ShapeFactory } from "../../../domain/shapes/ShapeFactory.js";
import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { Output } from "../Output.js";

export class CreateCliCommand implements CliCommand {
  public readonly name = "create";
  public readonly usage = "create <type> <id> [params...] [in <containerId>]";
  public readonly description = "create a shape";

  public constructor(
    private readonly session: DocumentSession,
    private readonly shapeFactory: ShapeFactory,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(2, Number.POSITIVE_INFINITY);
    const type = argumentsParser.at(0);
    const id = argumentsParser.at(1);
    const { parameters, parentId } = this.extractParentClause(arguments_.slice(2));
    const document = this.session.requireDocument();
    const shape = this.shapeFactory.createFromParameters(type, id, parameters);
    this.session.history.execute(new CreateCommand(document, shape, parentId));
    const location = parentId === null ? "" : ` in g#${parentId}`;
    this.output.success(`${shape.kind}#${shape.id} created${location}`);
  }

  private extractParentClause(parameters: readonly string[]): {
    readonly parameters: readonly string[];
    readonly parentId: string | null;
  } {
    const inIndex = parameters.length - 2;
    if (inIndex >= 0 && parameters[inIndex] === "in") {
      return {
        parameters: parameters.slice(0, inIndex),
        parentId: parameters.at(-1) ?? null,
      };
    }
    return { parameters, parentId: null };
  }
}
