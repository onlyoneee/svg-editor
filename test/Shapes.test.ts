import assert from "node:assert/strict";
import { test } from "node:test";

import { DomainError } from "../src/domain/errors/DomainError.js";
import { Circle } from "../src/domain/shapes/Circle.js";
import { Ellipse } from "../src/domain/shapes/Ellipse.js";
import { Group } from "../src/domain/shapes/Group.js";
import { Line } from "../src/domain/shapes/Line.js";
import { Rect } from "../src/domain/shapes/Rect.js";
import { Text as TextShape } from "../src/domain/shapes/Text.js";

test("each leaf shape moves and scales its own geometry", () => {
  const rect = new Rect("rect", 10, 20, 30, 40);
  const circle = new Circle("circle", 10, 20, 5);
  const ellipse = new Ellipse("ellipse", 10, 20, 5, 8);
  const line = new Line("line", 0, 10, 20, 30);
  const text = new TextShape("text", 10, 20, "hello");

  for (const shape of [rect, circle, ellipse, line, text]) {
    shape.move(5, -10);
    shape.scale(2);
  }

  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 30, y: 20, width: 60, height: 80 },
  );
  assert.deepEqual({ cx: circle.cx, cy: circle.cy, r: circle.radius }, { cx: 30, cy: 20, r: 10 });
  assert.deepEqual(
    { cx: ellipse.cx, cy: ellipse.cy, rx: ellipse.radiusX, ry: ellipse.radiusY },
    { cx: 30, cy: 20, rx: 10, ry: 16 },
  );
  assert.deepEqual(
    { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 },
    { x1: 10, y1: 0, x2: 50, y2: 40 },
  );
  assert.deepEqual({ x: text.x, y: text.y }, { x: 30, y: 20 });
});

test("shape-specific and common attributes use the declared whitelist", () => {
  const rect = new Rect("rect", 1, 2, 3, 4);
  const circle = new Circle("circle", 1, 2, 3);
  const ellipse = new Ellipse("ellipse", 1, 2, 3, 4);
  const line = new Line("line", 1, 2, 3, 4);
  const text = new TextShape("text", 1, 2, "old");
  const group = new Group("group");

  rect.set("x", "11");
  rect.set("y", 12);
  rect.set("width", 13);
  rect.set("height", 14);
  circle.set("cx", 21);
  circle.set("cy", 22);
  circle.set("r", 23);
  ellipse.set("cx", 31);
  ellipse.set("cy", 32);
  ellipse.set("rx", 33);
  ellipse.set("ry", 34);
  line.set("x1", 41);
  line.set("y1", 42);
  line.set("x2", 43);
  line.set("y2", 44);
  text.set("x", 51);
  text.set("y", 52);
  text.set("text", "new");
  group.set("fill", "red");
  group.set("stroke", "black");
  group.set("stroke-width", "2.5");

  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 11, y: 12, width: 13, height: 14 },
  );
  assert.deepEqual({ cx: circle.cx, cy: circle.cy, r: circle.radius }, { cx: 21, cy: 22, r: 23 });
  assert.deepEqual(
    { cx: ellipse.cx, cy: ellipse.cy, rx: ellipse.radiusX, ry: ellipse.radiusY },
    { cx: 31, cy: 32, rx: 33, ry: 34 },
  );
  assert.deepEqual(
    { x1: line.x1, y1: line.y1, x2: line.x2, y2: line.y2 },
    { x1: 41, y1: 42, x2: 43, y2: 44 },
  );
  assert.deepEqual({ x: text.x, y: text.y, text: text.content }, { x: 51, y: 52, text: "new" });
  assert.deepEqual(
    { fill: group.fill, stroke: group.stroke, strokeWidth: group.strokeWidth },
    { fill: "red", stroke: "black", strokeWidth: 2.5 },
  );
});

test("an unknown or invalid attribute leaves the shape unchanged", () => {
  const rect = new Rect("rect", 1, 2, 3, 4, { fill: "blue" });

  assert.throws(() => rect.set("opacity", "0.5"), {
    name: "DomainError",
    message: "unknown attribute: opacity",
  });
  assert.throws(() => rect.set("width", -1), DomainError);
  assert.throws(() => rect.set("stroke-width", Number.NaN), DomainError);

  assert.deepEqual(
    {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      fill: rect.fill,
      strokeWidth: rect.strokeWidth,
    },
    { x: 1, y: 2, width: 3, height: 4, fill: "blue", strokeWidth: undefined },
  );
});

test("scale rejects non-positive factors before changing geometry", () => {
  const rect = new Rect("rect", 1, 2, 3, 4);

  assert.throws(() => rect.scale(0), {
    name: "DomainError",
    message: "scale factor must be positive",
  });
  assert.throws(() => rect.scale(-2), DomainError);

  assert.deepEqual(
    { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    { x: 1, y: 2, width: 3, height: 4 },
  );
});
