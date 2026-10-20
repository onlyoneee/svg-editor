import type { SvgDocument } from "../../domain/document/SvgDocument.js";
import { EditorError } from "../errors/EditorError.js";
import { CommandHistory } from "../history/CommandHistory.js";
import type { DocumentStore } from "./DocumentStore.js";

export class DocumentSession {
  private documentValue: SvgDocument | null;
  private filePathValue: string | null = null;

  public constructor(
    private readonly store: DocumentStore,
    initialDocument: SvgDocument | null = null,
    public readonly history: CommandHistory = new CommandHistory(),
  ) {
    this.documentValue = initialDocument;
  }

  public get document(): SvgDocument | null {
    return this.documentValue;
  }

  public get filePath(): string | null {
    return this.filePathValue;
  }

  public replaceDocument(document: SvgDocument, filePath: string | null = null): void {
    this.documentValue = document;
    this.filePathValue = filePath;
    this.history.recordDocumentOperation();
  }

  public read(filePath: string): readonly string[] {
    const result = this.store.read(filePath);
    this.documentValue = result.document;
    this.filePathValue = filePath;
    this.history.recordDocumentOperation();
    return result.warnings;
  }

  public save(filePath?: string): string {
    const document = this.requireDocument();
    const destination = filePath ?? this.filePathValue;
    if (destination === null) {
      throw new EditorError("no file path. use 'save <file.svg>' first");
    }

    this.store.write(destination, document);
    this.filePathValue = destination;
    this.history.recordDocumentOperation();
    return destination;
  }

  public setCanvasSize(width: number, height: number): void {
    this.requireDocument().setCanvasSize(width, height);
    this.history.recordDocumentOperation();
  }

  public requireDocument(): SvgDocument {
    if (this.documentValue === null) {
      throw new EditorError("no document. use 'init' or 'read' first");
    }
    return this.documentValue;
  }
}
