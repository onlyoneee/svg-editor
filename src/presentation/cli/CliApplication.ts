import { createInterface, type Interface } from "node:readline";
import type { Readable, Writable } from "node:stream";

import type { Output } from "./Output.js";

export class CliApplication {
  private readonly prompt = "svg> ";

  public constructor(
    private readonly input: Readable & { readonly isTTY?: boolean },
    private readonly terminalOutput: Writable,
    private readonly output: Output,
  ) {}

  public run(): Interface {
    this.output.display("svg-editor 0.1 — type 'help' for commands");

    const lineReader = createInterface({
      input: this.input,
      output: this.terminalOutput,
      prompt: this.prompt,
      terminal: this.input.isTTY === true,
    });

    lineReader.on("line", (line) => {
      const input = line.trim();

      if (input === "exit" || input === "quit") {
        lineReader.close();
        return;
      }

      if (input.length > 0 && !input.startsWith("#")) {
        this.output.error(`unknown command: ${input.split(/\s+/, 1)[0] ?? input}`);
      }

      lineReader.prompt();
    });

    lineReader.prompt();
    return lineReader;
  }
}
