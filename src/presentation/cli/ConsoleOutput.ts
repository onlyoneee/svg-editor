import type { Writable } from "node:stream";

import type { Output } from "./Output.js";

export class ConsoleOutput implements Output {
  public constructor(
    private readonly standardOutput: Writable = process.stdout,
    private readonly errorOutput: Writable = process.stderr,
  ) {}

  public display(message: string): void {
    this.writeLine(this.standardOutput, message);
  }

  public success(message: string): void {
    this.writeLine(this.standardOutput, message);
  }

  public warning(message: string): void {
    this.writeLine(this.standardOutput, this.withPrefix("warning:", message));
  }

  public error(message: string): void {
    this.writeLine(this.errorOutput, this.withPrefix("error:", message));
  }

  private withPrefix(prefix: string, message: string): string {
    const normalizedMessage = message.trim();
    return normalizedMessage.startsWith(prefix)
      ? normalizedMessage
      : `${prefix} ${normalizedMessage}`;
  }

  private writeLine(stream: Writable, message: string): void {
    stream.write(`${message}\n`);
  }
}
