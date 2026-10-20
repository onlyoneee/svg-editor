import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import type { ReadDocumentResult } from "./ReadDocumentResult.js";

export interface DocumentStore {
  read(filePath: string): ReadDocumentResult;
  write(filePath: string, document: SvgDocument): void;
}
