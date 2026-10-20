import { EditorError } from "../../application/errors/EditorError.js";

export class CommandTokenizer {
  public tokenize(line: string): string[] {
    const tokens: string[] = [];
    let token = "";
    let inQuotes = false;
    let escaping = false;
    let tokenStarted = false;

    for (const character of line) {
      if (escaping) {
        if (character !== '"' && character !== "\\") {
          token += "\\";
        }
        token += character;
        escaping = false;
        tokenStarted = true;
        continue;
      }
      if (inQuotes && character === "\\") {
        escaping = true;
        continue;
      }
      if (character === '"') {
        inQuotes = !inQuotes;
        tokenStarted = true;
        continue;
      }
      if (!inQuotes && /\s/u.test(character)) {
        if (tokenStarted) {
          tokens.push(token);
          token = "";
          tokenStarted = false;
        }
        continue;
      }
      token += character;
      tokenStarted = true;
    }

    if (escaping) {
      token += "\\";
    }
    if (inQuotes) {
      throw new EditorError("unterminated quoted argument");
    }
    if (tokenStarted) {
      tokens.push(token);
    }
    return tokens;
  }
}
