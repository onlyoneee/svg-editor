import { CliArguments } from "../CliArguments.js";
import type { CliCommand } from "../CliCommand.js";
import type { CommandRegistry } from "../CommandRegistry.js";
import type { Output } from "../Output.js";

export class HelpCliCommand implements CliCommand {
  public readonly name = "help";
  public readonly usage = "help";
  public readonly description = "show all commands";

  public constructor(
    private readonly registry: CommandRegistry,
    private readonly output: Output,
  ) {}

  public execute(arguments_: readonly string[]): void {
    const argumentsParser = new CliArguments(arguments_, this.usage);
    argumentsParser.expectCount(0);
    const width = Math.max(...this.registry.commands.map((command) => command.usage.length));
    const lines = this.registry.commands.map(
      (command) => `${command.usage.padEnd(width)}  ${command.description}`,
    );
    lines.push(`${"exit | quit".padEnd(width)}  leave the editor`);
    this.output.display(lines.join("\n"));
  }
}
