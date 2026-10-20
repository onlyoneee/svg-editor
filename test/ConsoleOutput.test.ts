import assert from "node:assert/strict";
import { test } from "node:test";
import { PassThrough } from "node:stream";

import { ConsoleOutput } from "../src/presentation/cli/ConsoleOutput.js";

test("formats success, warning, and error output consistently", () => {
  const standardOutput = new PassThrough();
  const errorOutput = new PassThrough();
  let standardText = "";
  let errorText = "";

  standardOutput.on("data", (chunk: Buffer) => {
    standardText += chunk.toString();
  });
  errorOutput.on("data", (chunk: Buffer) => {
    errorText += chunk.toString();
  });

  const output = new ConsoleOutput(standardOutput, errorOutput);
  output.success("canvas created");
  output.warning("assigned id rect1");
  output.error("no document");

  assert.equal(standardText, "canvas created\nwarning: assigned id rect1\n");
  assert.equal(errorText, "error: no document\n");
});

test("does not duplicate an existing output prefix", () => {
  const standardOutput = new PassThrough();
  const errorOutput = new PassThrough();
  let standardText = "";
  let errorText = "";

  standardOutput.on("data", (chunk: Buffer) => {
    standardText += chunk.toString();
  });
  errorOutput.on("data", (chunk: Buffer) => {
    errorText += chunk.toString();
  });

  const output = new ConsoleOutput(standardOutput, errorOutput);
  output.warning("warning: assigned id rect1");
  output.error("error: no document");

  assert.equal(standardText, "warning: assigned id rect1\n");
  assert.equal(errorText, "error: no document\n");
});
