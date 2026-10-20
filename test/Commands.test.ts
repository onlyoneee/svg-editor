import assert from "node:assert/strict";
import { test } from "node:test";

import { AddToCommand } from "../src/application/commands/AddToCommand.js";
import { BackCommand } from "../src/application/commands/BackCommand.js";
import { CreateCommand } from "../src/application/commands/CreateCommand.js";
import { DeleteCommand } from "../src/application/commands/DeleteCommand.js";
import { FrontCommand } from "../src/application/commands/FrontCommand.js";
import { GroupCommand } from "../src/application/commands/GroupCommand.js";
import { MoveCommand } from "../src/application/commands/MoveCommand.js";
import { ScaleCommand } from "../src/application/commands/ScaleCommand.js";
import { SetCommand } from "../src/application/commands/SetCommand.js";
import { UngroupCommand } from "../src/application/commands/UngroupCommand.js";
import { CommandHistory } from "../src/application/history/CommandHistory.js";
import { SvgDocument } from "../src/domain/document/SvgDocument.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Rect } from "../src/domain/shapes/Rect.js";

test("create and delete restore complete subtrees at their original positions", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const container = new Group("container");
  const child = new Circle("child", 10, 20, 5);
  document.addShape(container);

  history.execute(new CreateCommand(document, child, "container"));
  assert.deepEqual(container.children, [child]);
  history.undo();
  assert.deepEqual(container.children, []);
  history.redo();
  assert.deepEqual(container.children, [child]);

  history.execute(new DeleteCommand(document, "container"));
  assert.equal(document.shapeCount, 0);
  history.undo();
  assert.deepEqual(document.rootShapes, [container]);
  assert.deepEqual(container.children, [child]);
  assert.equal(document.requireShape("child"), child);
});

test("move, scale, and set commands undo and redo through polymorphic shape operations", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const rect = new Rect("rect", 10, 20, 30, 40);
  document.addShape(rect);

  history.execute(new MoveCommand(document, "rect", 5, -10));
  history.execute(new ScaleCommand(document, "rect", 2));
  history.execute(new SetCommand(document, "rect", "fill", "red"));
  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fill: rect.fill },
    { x: 30, y: 20, width: 60, height: 80, fill: "red" },
  );

  history.undo();
  assert.equal(rect.fill, undefined);
  history.undo();
  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 15, y: 10, width: 30, height: 40 },
  );
  history.undo();
  assert.deepEqual({ x: rect.x, y: rect.y }, { x: 10, y: 20 });

  history.redo();
  history.redo();
  history.redo();
  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height, fill: rect.fill },
    { x: 30, y: 20, width: 60, height: 80, fill: "red" },
  );
});

test("geometry mementos restore decimal values exactly across a composite", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const group = new Group("group");
  const rect = new Rect("rect", 0.1, 0.2, 0.3, 0.4);
  document.addShape(group);
  document.addShape(rect, group);

  history.execute(new ScaleCommand(document, "group", 3));
  history.undo();

  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
  );
});

test("front and back commands restore exact sibling order", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  for (const id of ["a", "b", "c"]) {
    document.addShape(new Rect(id, 0, 0, 1, 1));
  }

  history.execute(new FrontCommand(document, "b"));
  assert.deepEqual(ids(document.rootShapes), ["a", "c", "b"]);
  history.undo();
  assert.deepEqual(ids(document.rootShapes), ["a", "b", "c"]);

  history.execute(new BackCommand(document, "c"));
  assert.deepEqual(ids(document.rootShapes), ["c", "a", "b"]);
  history.undo();
  assert.deepEqual(ids(document.rootShapes), ["a", "b", "c"]);
});

test("addto moves a shape to the end of a container and restores its old placement", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const first = new Rect("first", 0, 0, 1, 1);
  const second = new Rect("second", 0, 0, 1, 1);
  const group = new Group("group");
  document.addShape(first);
  document.addShape(second);
  document.addShape(group);

  history.execute(new AddToCommand(document, "group", "first"));
  assert.deepEqual(ids(document.rootShapes), ["second", "group"]);
  assert.deepEqual(ids(group.children), ["first"]);

  history.undo();
  assert.deepEqual(ids(document.rootShapes), ["first", "second", "group"]);
  assert.equal(first.parent, null);
  history.redo();
  assert.deepEqual(ids(group.children), ["first"]);
});

test("group is one history unit and preserves source tree order", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  for (const id of ["a", "b", "c"]) {
    document.addShape(new Rect(id, 0, 0, 1, 1));
  }

  history.execute(new GroupCommand(document, "selected", ["c", "a"]));
  const group = document.requireGroup("selected");
  assert.deepEqual(ids(document.rootShapes), ["b", "selected"]);
  assert.deepEqual(ids(group.children), ["a", "c"]);
  assert.equal(history.undoCount, 1);

  history.undo();
  assert.deepEqual(ids(document.rootShapes), ["a", "b", "c"]);
  assert.equal(document.hasShape("selected"), false);
  assert.equal(history.redoCount, 1);

  history.redo();
  assert.deepEqual(ids(document.requireGroup("selected").children), ["a", "c"]);
});

test("group rejects an ancestor and descendant selection before changing the tree", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const group = new Group("group");
  const child = new Rect("child", 0, 0, 1, 1);
  document.addShape(group);
  document.addShape(child, group);

  assert.throws(() => history.execute(new GroupCommand(document, "bad", ["child", "group"])), {
    name: "DomainError",
    message: "cannot group a container into its own descendant: group",
  });
  assert.deepEqual(document.rootShapes, [group]);
  assert.deepEqual(group.children, [child]);
  assert.equal(history.undoCount, 0);
});

test("ungroup promotes children in place as one undo unit", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const outer = new Group("outer");
  const before = new Rect("before", 0, 0, 1, 1);
  const inner = new Group("inner");
  const first = new Rect("first", 0, 0, 1, 1);
  const second = new Rect("second", 0, 0, 1, 1);
  const after = new Rect("after", 0, 0, 1, 1);
  document.addShape(outer);
  document.addShape(before, outer);
  document.addShape(inner, outer);
  document.addShape(first, inner);
  document.addShape(second, inner);
  document.addShape(after, outer);

  history.execute(new UngroupCommand(document, "inner"));
  assert.deepEqual(ids(outer.children), ["before", "first", "second", "after"]);
  assert.equal(document.hasShape("inner"), false);
  assert.equal(history.undoCount, 1);

  history.undo();
  assert.deepEqual(ids(outer.children), ["before", "inner", "after"]);
  assert.deepEqual(ids(inner.children), ["first", "second"]);
  history.redo();
  assert.deepEqual(ids(outer.children), ["before", "first", "second", "after"]);
});

test("ungroup rejects a top-level container without entering history", () => {
  const document = new SvgDocument();
  const history = new CommandHistory();
  const group = new Group("group");
  document.addShape(group);

  assert.throws(() => history.execute(new UngroupCommand(document, "group")), {
    name: "DomainError",
    message: "cannot ungroup top-level container: group",
  });
  assert.deepEqual(document.rootShapes, [group]);
  assert.equal(history.undoCount, 0);
});

function ids(shapes: readonly { readonly id: string }[]): string[] {
  return shapes.map((shape) => shape.id);
}
