export class SvgParseError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "SvgParseError";
  }
}
