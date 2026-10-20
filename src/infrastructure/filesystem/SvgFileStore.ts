import { readFileSync, writeFileSync } from "node:fs";

import { EditorError } from "../../application/errors/EditorError.js";
import type { DocumentStore } from "../../application/services/DocumentStore.js";
import type { ReadDocumentResult } from "../../application/services/ReadDocumentResult.js";
import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { SvgParser } from "../svg/SvgParser.js";
import { SvgSerializer } from "../svg/SvgSerializer.js";

export class SvgFileStore implements DocumentStore {
  public constructor(
    private readonly parser: SvgParser = new SvgParser(),
    private readonly serializer: SvgSerializer = new SvgSerializer(),
  ) {}

  public read(filePath: string): ReadDocumentResult {
    try {
      return this.parser.parse(readFileSync(filePath, "utf8"));
    } catch (error) {
      throw new EditorError(`cannot read file: ${filePath}`, { cause: error });
    }
  }

  public write(filePath: string, document: SvgDocument): void {
    try {
      writeFileSync(filePath, this.serializer.serialize(document), "utf8");
    } catch (error) {
      throw new EditorError(`cannot write file: ${filePath}`, { cause: error });
    }
  }
}
