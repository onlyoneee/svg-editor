import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { XMLValidator } from "fast-xml-parser";

interface CliRun {
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number | null;
}

interface EditScenario {
  readonly name: string;
  readonly setup: readonly string[];
  readonly command: string;
  verifyAfter(tree: string): void;
}

const editScenarios: readonly EditScenario[] = [
  {
    name: "create",
    setup: ["init 100 100"],
    command: "create rect item 1 2 3 4 blue",
    verifyAfter: (tree) => assert.match(tree, /rect#item x=1 y=2 w=3 h=4 fill=blue/u),
  },
  {
    name: "delete",
    setup: [
      "init 100 100",
      "create g branch",
      "create g nested in branch",
      "create rect leaf 1 2 3 4 in nested",
    ],
    command: "delete branch",
    verifyAfter: (tree) => assert.doesNotMatch(tree, /branch|nested|leaf/u),
  },
  {
    name: "move",
    setup: ["init 100 100", "create rect item 1 2 3 4"],
    command: "move item 5 -2",
    verifyAfter: (tree) => assert.match(tree, /rect#item x=6 y=0 w=3 h=4/u),
  },
  {
    name: "scale",
    setup: ["init 100 100", "create rect item 1 2 3 4"],
    command: "scale item 2",
    verifyAfter: (tree) => assert.match(tree, /rect#item x=2 y=4 w=6 h=8/u),
  },
  {
    name: "set",
    setup: ["init 100 100", "create rect item 1 2 3 4"],
    command: "set item fill red",
    verifyAfter: (tree) => assert.match(tree, /rect#item .* fill=red/u),
  },
  {
    name: "front",
    setup: [
      "init 100 100",
      "create rect a 0 0 1 1",
      "create rect b 0 0 1 1",
      "create rect c 0 0 1 1",
    ],
    command: "front a",
    verifyAfter: (tree) => assertOrder(tree, ["rect#b", "rect#c", "rect#a"]),
  },
  {
    name: "back",
    setup: [
      "init 100 100",
      "create rect a 0 0 1 1",
      "create rect b 0 0 1 1",
      "create rect c 0 0 1 1",
    ],
    command: "back c",
    verifyAfter: (tree) => assertOrder(tree, ["rect#c", "rect#a", "rect#b"]),
  },
  {
    name: "addto",
    setup: [
      "init 100 100",
      "create rect before 0 0 1 1",
      "create rect item 0 0 1 1",
      "create g target",
      "create rect existing 0 0 1 1 in target",
      "create rect after 0 0 1 1",
    ],
    command: "addto target item",
    verifyAfter: (tree) => assertOrder(tree, ["rect#existing", "rect#item"]),
  },
  {
    name: "group",
    setup: [
      "init 100 100",
      "create rect a 0 0 1 1",
      "create rect b 0 0 1 1",
      "create rect c 0 0 1 1",
      "create rect d 0 0 1 1",
    ],
    command: "group selected c a",
    verifyAfter: (tree) => {
      assertOrder(tree, ["rect#b", "rect#d", "g#selected"]);
      assertOrder(tree, ["rect#a", "rect#c"]);
    },
  },
  {
    name: "ungroup",
    setup: [
      "init 100 100",
      "create g outer",
      "create rect before 0 0 1 1 in outer",
      "create g nested in outer",
      "create rect first 0 0 1 1 in nested",
      "create rect second 0 0 1 1 in nested",
      "create rect after 0 0 1 1 in outer",
    ],
    command: "ungroup nested",
    verifyAfter: (tree) => {
      assert.doesNotMatch(tree, /g#nested/u);
      assertOrder(tree, ["rect#before", "rect#first", "rect#second", "rect#after"]);
    },
  },
];

test("six shape types can be created, displayed, and saved with Unicode and XML text", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-integration-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const outputPath = join(directory, "六种图形 output.svg");
  const result = runCli(
    [
      "init 320 200",
      "create rect r 1 2 30 40 #abcdef",
      "create circle c 50 60 7 red",
      "create ellipse e 70 80 9 10 green",
      "create line l 0 1 100 101 black",
      'create text t 7 8 "中文 文本 & <标签> \\"引号\\""',
      "create g container",
      "tree",
      "show r",
      "show c",
      "show e",
      "show l",
      "show t",
      "show container",
      `save "${outputPath}"`,
      "exit",
    ],
    directory,
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  for (const label of ["rect#r", "circle#c", "ellipse#e", "line#l", "text#t", "g#container"]) {
    assert.match(result.stdout, new RegExp(label, "u"));
    assert.match(result.stdout, new RegExp(`${label}  parent=svg`, "u"));
  }
  assert.match(result.stdout, /中文 文本 & <标签> \\"引号\\"/u);

  const saved = readFileSync(outputPath, "utf8");
  assert.equal(XMLValidator.validate(saved), true);
  assert.match(saved, /中文 文本 &amp; &lt;标签&gt; "引号"/u);
  assert.match(saved, /<rect id="r"/u);
  assert.match(saved, /<circle id="c"/u);
  assert.match(saved, /<ellipse id="e"/u);
  assert.match(saved, /<line id="l"/u);
  assert.match(saved, /<text id="t"/u);
  assert.match(saved, /<g id="container"/u);
});

test("create in builds multiple levels and group transforms reach descendants", () => {
  const result = runCli([
    "init 200 200",
    "create g outer",
    "create g middle in outer",
    "create g inner in middle",
    "create rect leaf 1 2 3 4 blue in inner",
    "tree",
    "move outer 5 10",
    "scale middle 2",
    "tree",
    "undo",
    "tree",
    "redo",
    "tree",
    "exit",
  ]);

  assert.equal(result.stderr, "");
  const treeSnapshots = trees(result.stdout);
  assert.equal(treeSnapshots.length, 4);
  assert.match(treeSnapshots[0] ?? "", /g#outer[\s\S]*g#middle[\s\S]*g#inner[\s\S]*rect#leaf/u);
  assert.match(treeSnapshots[0] ?? "", /rect#leaf x=1 y=2 w=3 h=4 fill=blue/u);
  assert.match(treeSnapshots[1] ?? "", /rect#leaf x=12 y=24 w=6 h=8 fill=blue/u);
  assert.match(treeSnapshots[2] ?? "", /rect#leaf x=6 y=12 w=3 h=4 fill=blue/u);
  assert.equal(treeSnapshots[3], treeSnapshots[1]);
});

for (const scenario of editScenarios) {
  test(`${scenario.name} has user-visible undo and redo symmetry`, () => {
    const result = runCli([
      ...scenario.setup,
      "tree",
      scenario.command,
      "tree",
      "undo",
      "tree",
      "redo",
      "tree",
      "exit",
    ]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, "");
    const treeSnapshots = trees(result.stdout);
    assert.equal(treeSnapshots.length, 4);
    const [before, after, undone, redone] = treeSnapshots;
    assert.notEqual(after, before);
    assert.equal(undone, before);
    assert.equal(redone, after);
    scenario.verifyAfter(after ?? "");
  });
}

test("front and back only reorder siblings in their current container", () => {
  const result = runCli([
    "init 100 100",
    "create rect root1 0 0 1 1",
    "create g container",
    "create rect a 0 0 1 1 in container",
    "create rect b 0 0 1 1 in container",
    "create rect c 0 0 1 1 in container",
    "create rect root2 0 0 1 1",
    "front a",
    "back c",
    "front root1",
    "tree",
    "exit",
  ]);

  assert.equal(result.stderr, "");
  const tree = trees(result.stdout)[0] ?? "";
  assertOrder(tree, ["g#container", "rect#root2", "rect#root1"]);
  assertOrder(tree, ["rect#c", "rect#b", "rect#a"]);
});

test("a new edit after undo clears redo in the CLI", () => {
  const result = runCli([
    "init 100 100",
    "create rect a 1 2 3 4",
    "move a 10 0",
    "undo",
    "set a fill red",
    "redo",
    "tree",
    "exit",
  ]);

  assert.match(result.stderr, /error: nothing to redo/u);
  const tree = trees(result.stdout)[0] ?? "";
  assert.match(tree, /rect#a x=1 y=2 w=3 h=4 fill=red/u);
});

test("successful document operations block undo until a new edit", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-integration-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const savedPath = join(directory, "saved.svg");
  const importedPath = join(directory, "imported.svg");
  writeFileSync(
    importedPath,
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect id="loaded" x="1" y="2" width="3" height="4"/></svg>',
    "utf8",
  );
  const result = runCli(
    [
      "init 100 100",
      "create rect item 0 0 1 1",
      `save "${savedPath}"`,
      "undo",
      "move item 1 0",
      "undo",
      "canvas 200 150",
      "undo",
      `read "${importedPath}"`,
      "undo",
      "init 10 10",
      "undo",
      "exit",
    ],
    directory,
  );

  assert.equal((result.stderr.match(/error: undo not allowed after io command/gu) ?? []).length, 4);
  assert.match(result.stdout, /undo complete/u);
});

test("invalid commands preserve the exact tree", () => {
  const result = runCli([
    "init 100 100",
    "create rect safe 1 2 3 4 blue",
    "tree",
    "create circle safe 10 10 2",
    "tree",
    "move missing 1 1",
    "tree",
    "set safe width invalid",
    "tree",
    "scale safe 0",
    "tree",
    "create rect bad not-a-number 0 1 1",
    "tree",
    "exit",
  ]);

  const treeSnapshots = trees(result.stdout);
  assert.equal(treeSnapshots.length, 6);
  for (const snapshot of treeSnapshots.slice(1)) {
    assert.equal(snapshot, treeSnapshots[0]);
  }
  assert.match(result.stderr, /error: id already exists: safe/u);
  assert.match(result.stderr, /error: no such shape: missing/u);
  assert.match(result.stderr, /error: width must be a finite number/u);
  assert.match(result.stderr, /error: scale factor must be positive/u);
  assert.match(result.stderr, /error: x must be a finite number/u);
});

test("missing SVG ids warn while missing and unwritable files keep the document usable", (context) => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-integration-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  const importedPath = join(directory, "unnamed.svg");
  const missingPath = join(directory, "does-not-exist.svg");
  writeFileSync(
    importedPath,
    '<svg xmlns="http://www.w3.org/2000/svg" width="50" height="40"><rect x="1" y="2" width="3" height="4"/></svg>',
    "utf8",
  );
  const result = runCli(
    [
      "init 100 100",
      "create rect safe 1 2 3 4",
      "tree",
      `read "${missingPath}"`,
      "tree",
      "move safe 5 0",
      "tree",
      `save "${directory}"`,
      "tree",
      "undo",
      "tree",
      `read "${importedPath}"`,
      "tree",
      "exit",
    ],
    directory,
  );

  const treeSnapshots = trees(result.stdout);
  assert.equal(treeSnapshots.length, 6);
  assert.equal(treeSnapshots[1], treeSnapshots[0]);
  assert.equal(treeSnapshots[3], treeSnapshots[2]);
  assert.equal(treeSnapshots[4], treeSnapshots[0]);
  assert.match(treeSnapshots[5] ?? "", /rect#rect1 x=1 y=2 w=3 h=4/u);
  assert.match(result.stderr, /error: cannot read file: .*does-not-exist\.svg/u);
  assert.match(result.stderr, /error: cannot write file:/u);
  assert.match(result.stdout, /warning: assigned id rect1 to unnamed <rect>/u);
});

function runCli(commands: readonly string[], cwd = process.cwd()): CliRun {
  const result = spawnSync(process.execPath, [join(process.cwd(), ".test-dist/src/main.js")], {
    cwd,
    input: `${commands.join("\n")}\n`,
    encoding: "utf8",
  });
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

function responses(stdout: string): string[] {
  return stdout
    .split("svg> ")
    .slice(1)
    .map((response) => response.trim())
    .filter((response) => response.length > 0);
}

function trees(stdout: string): string[] {
  return responses(stdout).filter((response) => response.startsWith("svg ("));
}

function assertOrder(text: string, labels: readonly string[]): void {
  let previousIndex = -1;
  for (const label of labels) {
    const index = text.indexOf(label);
    assert.ok(
      index > previousIndex,
      `${label} should appear after the previous sibling in:\n${text}`,
    );
    previousIndex = index;
  }
}
