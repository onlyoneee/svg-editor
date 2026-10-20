import assert from "node:assert/strict";
import { test } from "node:test";

import { SvgDocument } from "../src/domain/document/SvgDocument.js";
import { DomainError } from "../src/domain/errors/DomainError.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Ellipse } from "../src/domain/shapes/Ellipse.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Line } from "../src/domain/shapes/Line.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { Text as TextShape } from "../src/domain/shapes/Text.js";

test("a document indexes all six supported shape types", () => {
  const document = new SvgDocument(400, 300);
  const shapes = [
    new Rect("r1", 0, 0, 10, 20),
    new Circle("c1", 10, 10, 5),
    new Ellipse("e1", 10, 10, 5, 8),
    new Line("l1", 0, 0, 10, 10),
    new TextShape("t1", 10, 10, "label"),
    new Group("g1"),
  ];

  for (const shape of shapes) {
    document.addShape(shape);
  }

  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  assert.equal(document.shapeCount, 6);
  assert.deepEqual(
    document.rootShapes.map((shape) => shape.kind),
    ["rect", "circle", "ellipse", "line", "text", "g"],
  );
  for (const shape of shapes) {
    assert.equal(document.requireShape(shape.id), shape);
  }
});

test("groups can nest and recursively move and scale descendants", () => {
  const document = new SvgDocument();
  const outer = new Group("outer");
  const inner = new Group("inner");
  const rect = new Rect("rect", 10, 20, 30, 40);
  const text = new TextShape("text", 15, 25, "nested");

  document.addShape(outer);
  document.addShape(inner, outer);
  document.addShape(rect, inner);
  document.addShape(text, inner);

  outer.move(5, -10);
  outer.scale(2);

  assert.equal(inner.parent, outer);
  assert.equal(rect.parent, inner);
  assert.equal(text.parent, inner);
  assert.equal(document.shapeCount, 4);
  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 30, y: 20, width: 60, height: 80 },
  );
  assert.deepEqual({ x: text.x, y: text.y }, { x: 40, y: 30 });
});

test("duplicate ids are rejected before the document changes", () => {
  const document = new SvgDocument();
  const original = new Rect("same", 1, 2, 3, 4);
  const incomingGroup = new Group("incoming");
  const duplicate = new Circle("same", 5, 6, 7);
  incomingGroup.appendChild(duplicate);
  document.addShape(original);

  assert.throws(() => document.addShape(incomingGroup), {
    name: "DomainError",
    message: "id already exists: same",
  });

  assert.deepEqual(document.rootShapes, [original]);
  assert.equal(document.shapeCount, 1);
  assert.equal(document.findShape("incoming"), undefined);
  assert.equal(incomingGroup.parent, null);
  assert.equal(duplicate.parent, incomingGroup);
});

test("mutating an attached group keeps the document index synchronized", () => {
  const document = new SvgDocument();
  const group = new Group("group");
  const child = new Rect("child", 0, 0, 1, 1);
  document.addShape(group);

  group.appendChild(child);
  assert.equal(document.requireShape("child"), child);
  assert.equal(document.shapeCount, 2);

  const duplicate = new Circle("child", 0, 0, 1);
  assert.throws(() => group.appendChild(duplicate), {
    name: "DomainError",
    message: "id already exists: child",
  });
  assert.deepEqual(group.children, [child]);
  assert.equal(duplicate.parent, null);

  group.removeChild(child);
  assert.equal(document.hasShape("child"), false);
  assert.equal(document.shapeCount, 1);
});

test("a subtree containing duplicate ids is rejected atomically", () => {
  const document = new SvgDocument();
  const group = new Group("group");
  group.appendChild(new Rect("duplicate", 0, 0, 1, 1));
  group.appendChild(new Circle("duplicate", 0, 0, 1));

  assert.throws(() => document.addShape(group), DomainError);
  assert.equal(document.shapeCount, 0);
  assert.deepEqual(document.rootShapes, []);
});

test("moving a container into its descendant is rejected without reparenting", () => {
  const document = new SvgDocument();
  const outer = new Group("outer");
  const inner = new Group("inner");
  const rect = new Rect("rect", 0, 0, 1, 1);
  document.addShape(outer);
  document.addShape(inner, outer);
  document.addShape(rect, inner);

  assert.throws(() => document.moveShapeToContainer("outer", "inner"), {
    name: "DomainError",
    message: "cannot move a container into its own descendant: outer",
  });

  assert.deepEqual(document.rootShapes, [outer]);
  assert.deepEqual(outer.children, [inner]);
  assert.deepEqual(inner.children, [rect]);
  assert.equal(outer.parent, null);
  assert.equal(inner.parent, outer);
});

test("reparenting and z-order operations preserve the global index", () => {
  const document = new SvgDocument();
  const first = new Rect("first", 0, 0, 1, 1);
  const second = new Rect("second", 0, 0, 1, 1);
  const third = new Rect("third", 0, 0, 1, 1);
  const group = new Group("group");
  document.addShape(first);
  document.addShape(second);
  document.addShape(third);
  document.addShape(group);

  document.sendToBack("third");
  assert.deepEqual(
    document.rootShapes.map((shape) => shape.id),
    ["third", "first", "second", "group"],
  );

  document.bringToFront("third");
  assert.deepEqual(
    document.rootShapes.map((shape) => shape.id),
    ["first", "second", "group", "third"],
  );

  document.moveShapeToContainer("first", "group");
  document.moveShapeToContainer("second", "group");
  assert.deepEqual(
    group.children.map((shape) => shape.id),
    ["first", "second"],
  );
  document.sendToBack("second");
  assert.deepEqual(
    group.children.map((shape) => shape.id),
    ["second", "first"],
  );
  assert.equal(document.shapeCount, 4);
  assert.equal(document.requireShape("first"), first);
});

test("removing a group unregisters its subtree and records its placement", () => {
  const document = new SvgDocument();
  const before = new Rect("before", 0, 0, 1, 1);
  const group = new Group("group");
  const child = new Circle("child", 0, 0, 1);
  document.addShape(before);
  document.addShape(group);
  document.addShape(child, group);

  const placement = document.removeShape("group");

  assert.equal(placement.shape, group);
  assert.equal(placement.parent, null);
  assert.equal(placement.index, 1);
  assert.equal(document.shapeCount, 1);
  assert.equal(document.hasShape("group"), false);
  assert.equal(document.hasShape("child"), false);
  assert.equal(child.parent, group);
  assert.deepEqual(document.rootShapes, [before]);
});

test("canvas dimensions validate both values before mutation", () => {
  const document = new SvgDocument(800, 600);

  assert.throws(() => document.setCanvasSize(1024, 0), DomainError);
  assert.deepEqual({ width: document.width, height: document.height }, { width: 800, height: 600 });

  document.setCanvasSize(1024, 768);
  assert.deepEqual(
    { width: document.width, height: document.height },
    { width: 1024, height: 768 },
  );
});
