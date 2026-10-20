import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { XMLValidator } from "fast-xml-parser";

test("the documented CLI session executes line by line", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-cli-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const importedPath = join(directory, "other.svg");
  const savedPath = join(directory, "saved diagram.svg");
  writeFileSync(
    importedPath,
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
  <rect x="0" y="0" width="400" height="300" fill="#ffffff"/>
  <text id="t1" x="10" y="290">imported</text>
  <circle id="c1" cx="50" cy="50" r="10"/>
  <g id="g1">
    <rect id="r2" x="0" y="0" width="10" height="10"/>
    <circle id="c2" cx="5" cy="5" r="2"/>
  </g>
  <ellipse id="e1" cx="1" cy="2" rx="3" ry="4"/>
</svg>`,
    "utf8",
  );

  const transcript = `
# full-line comments are ignored
init 800 600
create rect bg 0 0 800 600 #ffffff
create text title 20 40 "My Diagram"
create circle c1 100 100 20 red
create rect box 200 80 60 60 #3366ff
group markers c1 box
tree
move c1 30 0
undo
redo
set title text "My Diagram v2"
undo
group bad c1 markers
delete box
undo
show c1
save "${savedPath}"
undo
read "${importedPath}"
canvas
tree
help
exit
`;
  const result = spawnSync(process.execPath, [join(process.cwd(), ".test-dist/src/main.js")], {
    cwd: directory,
    input: transcript,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /svg-editor 0\.1 — type 'help' for commands/u);
  assert.match(result.stdout, /canvas 800x600 created/u);
  assert.match(result.stdout, /text#title \(20,40\) "My Diagram"/u);
  assert.match(result.stdout, /g#markers created with 2 children/u);
  assert.match(result.stdout, /circle#c1  parent=g#markers/u);
  assert.match(result.stdout, /saved to .*saved diagram\.svg \(5 elements\)/u);
  assert.match(result.stdout, /warning: assigned id rect1 to unnamed <rect>/u);
  assert.match(result.stdout, /read .*other\.svg \(7 elements\)/u);
  assert.match(result.stdout, /svg \(400x300\)/u);
  assert.match(result.stdout, /create <type> <id> \[params\.\.\.\] \[in <containerId>\]/u);
  assert.match(result.stderr, /error: cannot group a container into its own descendant: markers/u);
  assert.match(result.stderr, /error: undo not allowed after io command/u);
  assert.equal(existsSync(savedPath), true);
  assert.equal(XMLValidator.validate(readFileSync(savedPath, "utf8")), true);
});

test("all edit forms and a trailing in clause are wired through the registry", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-cli-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const transcript = `
init
canvas 640 480
create g outer
create rect r 1 2 3 4 blue in outer
create circle c 5 6 7
create ellipse e 10 11 12 13 green
create line l 0 0 20 20 black
create text t 2 3 "hello world"
scale outer 2
addto outer c
front r
back c
group nested e l
addto outer nested
ungroup nested
delete e
undo
redo
tree outer
quit
`;
  const result = spawnSync(process.execPath, [join(process.cwd(), ".test-dist/src/main.js")], {
    cwd: directory,
    input: transcript,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.match(result.stdout, /rect#r created in g#outer/u);
  assert.match(result.stdout, /g#outer scaled by 2/u);
  assert.match(result.stdout, /circle#c moved into g#outer/u);
  assert.match(result.stdout, /g#nested ungrouped \(2 children promoted\)/u);
  assert.match(result.stdout, /g#outer/u);
  assert.match(result.stdout, /text#t/u);
});

test("CLI parse errors use one error prefix and keep processing later lines", () => {
  const transcript = `
init 100 100
create rect bad x 0 10 10
create text title 1 2 "unterminated
unknown-command
create circle ok 5 5 2 red
tree
exit
`;
  const result = spawnSync(process.execPath, [join(process.cwd(), ".test-dist/src/main.js")], {
    input: transcript,
    encoding: "utf8",
  });

  assert.equal(result.status, 0);
  assert.match(result.stderr, /error: x must be a finite number/u);
  assert.match(result.stderr, /error: unterminated quoted argument/u);
  assert.match(result.stderr, /error: unknown command: unknown-command/u);
  assert.doesNotMatch(result.stderr, /error: error:/u);
  assert.match(result.stdout, /circle#ok cx=5 cy=5 r=2 fill=red/u);
  assert.doesNotMatch(result.stdout, /rect#bad/u);
});
