import { EditorError } from "../../application/errors/EditorError.js";

export class CliArguments {
  public constructor(
    public readonly values: readonly string[],
    private readonly usage: string,
  ) {}

  public expectCount(minimum: number, maximum = minimum): void {
    if (this.values.length < minimum || this.values.length > maximum) {
      throw new EditorError(`usage: ${this.usage}`);
    }
  }

  public at(index: number): string {
    const value = this.values[index];
    if (value === undefined) {
      throw new EditorError(`usage: ${this.usage}`);
    }
    return value;
  }

  public numberAt(index: number, name: string): number {
    const rawValue = this.at(index);
    if (rawValue.trim().length === 0) {
      throw new EditorError(`${name} must be a finite number`);
    }
    const value = Number(rawValue);
    if (!Number.isFinite(value)) {
      throw new EditorError(`${name} must be a finite number`);
    }
    return value;
  }
}
