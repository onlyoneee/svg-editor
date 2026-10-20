import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { XMLValidator } from "fast-xml-parser";

import { DocumentSession } from "../src/application/services/DocumentSession.js";
import { SvgDocument } from "../src/domain/document/SvgDocument.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { Text as TextShape } from "../src/domain/shapes/Text.js";
import { SvgFileStore } from "../src/infrastructure/filesystem/SvgFileStore.js";
import { SvgParser } from "../src/infrastructure/svg/SvgParser.js";
import { SvgSerializer } from "../src/infrastructure/svg/SvgSerializer.js";

test("serialized output is valid standalone SVG and escapes XML content", () => {
  const document = new SvgDocument(400, 200);
  document.addShape(new Rect('r&"1', 10, 20, 100, 50, { fill: 'url("a&b")' }));
  document.addShape(new TextShape("title", 20, 40, '<Start & "Review">'));

  const svg = new SvgSerializer().serialize(document);

  assert.equal(XMLValidator.validate(svg), true);
  assert.match(svg, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u);
  assert.match(svg, /id="r&amp;&quot;1"/u);
  assert.match(svg, /fill="url\(&quot;a&amp;b&quot;\)"/u);
  assert.match(svg, /&lt;Start &amp; "Review"&gt;/u);
});

test("parser assigns collision-free ids and reports warnings in document order", () => {
  const source = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="80" viewBox="0 0 100 80">
  <rect x="0" y="0" width="10" height="20"/>
  <circle id="rect1" cx="20" cy="20" r="5"/>
  <g>
    <text x="5" y="6">unnamed</text>
  </g>
</svg>`;

  const result = new SvgParser().parse(source);

  assert.deepEqual(result.warnings, [
    "warning: assigned id rect2 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id text1 to unnamed <text>",
  ]);
  assert.deepEqual(
    result.document.rootShapes.map((shape) => shape.id),
    ["rect2", "rect1", "g1"],
  );
  assert.equal(result.document.requireShape("text1").parent?.id, "g1");
});

test("nested structure, order, geometry, styles, and text survive a parse-save-parse round trip", () => {
  const source = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect id="background" x="0" y="0" width="400" height="300" fill="#fff"/>
  <g id="outer" stroke="black" stroke-width="2">
    <text id="label" x="10.5" y="20">A &amp; B</text>
    <g id="inner">
      <circle id="dot" cx="30" cy="40" r="5" fill="red"/>
      <ellipse id="oval" cx="35" cy="45" rx="6" ry="8"/>
      <line id="edge" x1="1" y1="2" x2="3" y2="4" stroke="#333"/>
      <rect id="box" x="50" y="60" width="70" height="80"/>
    </g>
  </g>
</svg>`;
  const parser = new SvgParser();
  const serializer = new SvgSerializer();

  const first = parser.parse(source);
  const saved = serializer.serialize(first.document);
  const second = parser.parse(saved);

  assert.deepEqual(first.warnings, []);
  assert.deepEqual(second.warnings, []);
  assert.equal(serializer.serialize(second.document), saved);
  assert.deepEqual(
    second.document.rootShapes.map((shape) => shape.id),
    ["background", "outer"],
  );

  const outer = second.document.requireGroup("outer");
  const inner = second.document.requireGroup("inner");
  const label = second.document.requireShape("label");
  const dot = second.document.requireShape("dot");
  assert.deepEqual(
    outer.children.map((shape) => shape.id),
    ["label", "inner"],
  );
  assert.deepEqual(
    inner.children.map((shape) => shape.id),
    ["dot", "oval", "edge", "box"],
  );
  assert.equal(outer.stroke, "black");
  assert.equal(outer.strokeWidth, 2);
  assert.ok(label instanceof TextShape);
  assert.equal(label.content, "A & B");
  assert.ok(dot instanceof Circle);
  assert.deepEqual(
    { cx: dot.cx, cy: dot.cy, r: dot.radius, fill: dot.fill },
    { cx: 30, cy: 40, r: 5, fill: "red" },
  );
});

test("file store completes a real read-save-read cycle", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const inputPath = join(directory, "input.svg");
  const outputPath = join(directory, "output.svg");
  writeFileSync(
    inputPath,
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect id="r" x="1" y="2" width="3" height="4"/></svg>',
    "utf8",
  );
  const store = new SvgFileStore();
  const session = new DocumentSession(store);

  session.read(inputPath);
  session.save(outputPath);
  const firstSavedText = readFileSync(outputPath, "utf8");
  session.read(outputPath);
  session.save(outputPath);

  assert.equal(XMLValidator.validate(firstSavedText), true);
  assert.equal(readFileSync(outputPath, "utf8"), firstSavedText);
  assert.equal(session.document?.requireShape("r").id, "r");
});

test("a failed read keeps the current document and path unchanged", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const currentPath = join(directory, "current.svg");
  const invalidPath = join(directory, "invalid.svg");
  writeFileSync(invalidPath, '<svg width="100" height="100"><g></svg>', "utf8");
  const currentDocument = new SvgDocument(320, 240);
  currentDocument.addShape(new Rect("safe", 1, 2, 3, 4));
  const session = new DocumentSession(new SvgFileStore());
  session.replaceDocument(currentDocument, currentPath);

  assert.throws(() => session.read(invalidPath), {
    name: "EditorError",
    message: `cannot read file: ${invalidPath}`,
  });

  assert.equal(session.document, currentDocument);
  assert.equal(session.filePath, currentPath);
  assert.equal(session.document?.requireShape("safe").id, "safe");
});

test("unsupported SVG content fails instead of being silently discarded", () => {
  const parser = new SvgParser();

  assert.throws(
    () => parser.parse('<svg width="10" height="10"><path id="p" d="M0 0L1 1"/></svg>'),
    {
      name: "SvgParseError",
      message: "unsupported SVG element: <path>",
    },
  );
  assert.throws(
    () =>
      parser.parse(
        '<svg width="10" height="10"><rect id="r" x="0" y="0" width="1" height="1" opacity="0.5"/></svg>',
      ),
    /unsupported attribute on <rect>: opacity/u,
  );
});
