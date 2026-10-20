import assert from "node:assert/strict";
import { test } from "node:test";

import { CommandTokenizer } from "../src/presentation/cli/CommandTokenizer.js";

test("tokenizer preserves quoted whitespace, empty strings, and SVG colors", () => {
  const tokenizer = new CommandTokenizer();

  assert.deepEqual(tokenizer.tokenize('create text title 20 40 "My Diagram" in labels'), [
    "create",
    "text",
    "title",
    "20",
    "40",
    "My Diagram",
    "in",
    "labels",
  ]);
  assert.deepEqual(tokenizer.tokenize('set title text ""'), ["set", "title", "text", ""]);
  assert.deepEqual(tokenizer.tokenize("create rect bg 0 0 10 10 #ffffff"), [
    "create",
    "rect",
    "bg",
    "0",
    "0",
    "10",
    "10",
    "#ffffff",
  ]);
});

test("tokenizer supports escaped quotes and backslashes inside quotes", () => {
  const tokenizer = new CommandTokenizer();

  assert.deepEqual(tokenizer.tokenize('set title text "say \\"hello\\" at C:\\\\tmp"'), [
    "set",
    "title",
    "text",
    'say "hello" at C:\\tmp',
  ]);
});

test("tokenizer rejects an unterminated quoted argument", () => {
  assert.throws(() => new CommandTokenizer().tokenize('set title text "unfinished'), {
    name: "EditorError",
    message: "unterminated quoted argument",
  });
});
