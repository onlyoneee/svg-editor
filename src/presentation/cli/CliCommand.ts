export interface CliCommand {
  readonly name: string;
  readonly usage: string;
  readonly description: string;
  execute(arguments_: readonly string[]): void;
}
