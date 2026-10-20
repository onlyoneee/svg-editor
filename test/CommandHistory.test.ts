import assert from "node:assert/strict";
import { test } from "node:test";

import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { MoveCommand } from "../src/application/commands/MoveCommand.js";
import { SetCommand } from "../src/application/commands/SetCommand.js";
import { CommandHistory } from "../src/application/history/CommandHistory.js";
import { DocumentSession } from "../src/application/services/DocumentSession.js";
import type { DocumentStore } from "../src/application/services/DocumentStore.js";
import type { ReadDocumentResult } from "../src/application/services/ReadDocumentResult.js";
import { SvgDocument } from "../src/domain/document/SvgDocument.js";
import { Rect } from "../src/domain/shapes/Rect.js";

test("a new edit after undo clears the redo stack", () => {
  const document = new SvgDocument();
  const rect = new Rect("rect", 10, 20, 30, 40);
  const history = new CommandHistory();
  document.addShape(rect);

  history.execute(new MoveCommand(document, "rect", 5, 0));
  history.undo();
  assert.equal(history.redoCount, 1);

  history.execute(new SetCommand(document, "rect", "fill", "red"));
  assert.equal(history.redoCount, 0);
  assert.throws(() => history.redo(), {
    name: "EditorError",
    message: "nothing to redo",
  });
  assert.equal(rect.x, 10);
  assert.equal(rect.fill, "red");
});

test("a failed new edit preserves existing redo history", () => {
  const document = new SvgDocument();
  const rect = new Rect("rect", 10, 20, 30, 40);
  const history = new CommandHistory();
  document.addShape(rect);
  history.execute(new MoveCommand(document, "rect", 5, 0));
  history.undo();

  assert.throws(
    () => history.execute(new CreateCommand(document, new Rect("rect", 0, 0, 1, 1))),
    /id already exists/u,
  );
  assert.equal(history.redoCount, 1);
  history.redo();
  assert.equal(rect.x, 15);
});

test("successful document operations create a history barrier until the next edit", () => {
  const document = new SvgDocument(800, 600);
  const rect = new Rect("rect", 10, 20, 30, 40);
  document.addShape(rect);
  const history = new CommandHistory();
  const session = new DocumentSession(new MemoryDocumentStore(document), document, history);
  history.execute(new MoveCommand(document, "rect", 5, 0));

  session.setCanvasSize(1024, 768);
  assert.equal(history.undoCount, 0);
  assert.throws(() => history.undo(), {
    name: "EditorError",
    message: "undo not allowed after io command",
  });
  assert.throws(() => history.redo(), {
    name: "EditorError",
    message: "redo not allowed after io command",
  });

  history.execute(new MoveCommand(document, "rect", 2, 0));
  history.undo();
  assert.equal(rect.x, 15);
  assert.equal(document.width, 1024);
  assert.equal(document.height, 768);
});

test("read and save establish barriers only after they succeed", () => {
  const original = new SvgDocument();
  const rect = new Rect("rect", 0, 0, 1, 1);
  original.addShape(rect);
  const replacement = new SvgDocument(100, 50);
  const store = new MemoryDocumentStore(replacement);
  const history = new CommandHistory();
  const session = new DocumentSession(store, original, history);

  history.execute(new MoveCommand(original, "rect", 1, 0));
  store.failRead = true;
  assert.throws(() => session.read("broken.svg"), /read failed/u);
  history.undo();
  assert.equal(rect.x, 0);

  history.execute(new MoveCommand(original, "rect", 1, 0));
  store.failRead = false;
  session.read("replacement.svg");
  assert.equal(session.document, replacement);
  assert.throws(() => history.undo(), /undo not allowed after io command/u);

  history.execute(new CreateCommand(replacement, new Rect("new", 0, 0, 1, 1)));
  session.save("saved.svg");
  assert.throws(() => history.undo(), /undo not allowed after io command/u);
});

class MemoryDocumentStore implements DocumentStore {
  public failRead = false;

  public constructor(private readonly document: SvgDocument) {}

  public read(_filePath: string): ReadDocumentResult {
    if (this.failRead) {
      throw new Error("read failed");
    }
    return { document: this.document, warnings: [] };
  }

  public write(_filePath: string, _document: SvgDocument): void {}
}
