import type { Circle } from "../../domain/shapes/Circle.js";
import type { Ellipse } from "../../domain/shapes/Ellipse.js";
import type { Group } from "../../domain/shapes/Group.js";
import type { Line } from "../../domain/shapes/Line.js";
import type { Rect } from "../../domain/shapes/Rect.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import type { ShapeVisitor } from "../../domain/shapes/ShapeVisitor.js";
import type { Text } from "../../domain/shapes/Text.js";
import type { ShapeView } from "./ShapeView.js";

export class ShapeFormatter implements ShapeVisitor<ShapeView> {
  public format(shape: Shape): ShapeView {
    return shape.accept(this);
  }

  public visitRect(shape: Rect): ShapeView {
    const geometry = `x=${this.number(shape.x)} y=${this.number(shape.y)} w=${this.number(shape.width)} h=${this.number(shape.height)}`;
    return this.view(`rect#${shape.id}`, geometry, shape);
  }

  public visitCircle(shape: Circle): ShapeView {
    const geometry = `cx=${this.number(shape.cx)} cy=${this.number(shape.cy)} r=${this.number(shape.radius)}`;
    return this.view(`circle#${shape.id}`, geometry, shape);
  }

  public visitEllipse(shape: Ellipse): ShapeView {
    const geometry = `cx=${this.number(shape.cx)} cy=${this.number(shape.cy)} rx=${this.number(shape.radiusX)} ry=${this.number(shape.radiusY)}`;
    return this.view(`ellipse#${shape.id}`, geometry, shape);
  }

  public visitLine(shape: Line): ShapeView {
    const geometry = `(${this.number(shape.x1)},${this.number(shape.y1)}) -> (${this.number(shape.x2)},${this.number(shape.y2)})`;
    return this.view(`line#${shape.id}`, geometry, shape);
  }

  public visitText(shape: Text): ShapeView {
    const geometry = `(${this.number(shape.x)},${this.number(shape.y)}) ${JSON.stringify(shape.content)}`;
    return this.view(`text#${shape.id}`, geometry, shape);
  }

  public visitGroup(shape: Group): ShapeView {
    const style = this.style(shape);
    const summary = [`g#${shape.id}`, ...style].join(" ");
    return { summary, details: [`children=${shape.children.length}`, ...style] };
  }

  private view(prefix: string, geometry: string, shape: Shape): ShapeView {
    const style = this.style(shape);
    return {
      summary: [prefix, geometry, ...style].join(" "),
      details: [geometry, ...style],
    };
  }

  private style(shape: Shape): string[] {
    const attributes: string[] = [];
    if (shape.fill !== undefined) {
      attributes.push(`fill=${shape.fill}`);
    }
    if (shape.stroke !== undefined) {
      attributes.push(`stroke=${shape.stroke}`);
    }
    if (shape.strokeWidth !== undefined) {
      attributes.push(`stroke-width=${this.number(shape.strokeWidth)}`);
    }
    return attributes;
  }

  private number(value: number): string {
    return Object.is(value, -0) ? "0" : String(value);
  }
}
