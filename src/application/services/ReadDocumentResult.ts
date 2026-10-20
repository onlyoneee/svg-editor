import type { SvgDocument } from "../../domain/document/SvgDocument.js";

export interface ReadDocumentResult {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}
