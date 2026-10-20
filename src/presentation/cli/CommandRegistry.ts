import { EditorError } from "../../application/errors/EditorError.js";
import type { CliCommand } from "./CliCommand.js";

export class CommandRegistry {
  private readonly commandsByName = new Map<string, CliCommand>();

  public get commands(): readonly CliCommand[] {
    return [...this.commandsByName.values()];
  }

  public register(command: CliCommand): void {
    if (this.commandsByName.has(command.name)) {
      throw new EditorError(`command already registered: ${command.name}`);
    }
    this.commandsByName.set(command.name, command);
  }

  public execute(name: string, arguments_: readonly string[]): void {
    const command = this.commandsByName.get(name);
    if (command === undefined) {
      throw new EditorError(`unknown command: ${name}`);
    }
    command.execute(arguments_);
  }
}
