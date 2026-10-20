import { XMLParser, XMLValidator } from "fast-xml-parser";

import type { ReadDocumentResult } from "../../application/services/ReadDocumentResult.js";
import { SvgDocument } from "../../domain/document/SvgDocument.js";
import { Group } from "../../domain/shapes/Group.js";
import type { Shape } from "../../domain/shapes/Shape.js";
import { ShapeFactory, type ShapeAttributes } from "../../domain/shapes/ShapeFactory.js";
import { SvgParseError } from "./SvgParseError.js";

type OrderedXmlNode = Record<string, unknown>;
type XmlAttributes = Record<string, string>;

export class SvgParser {
  private readonly supportedElements = new Set(["rect", "circle", "ellipse", "line", "text", "g"]);
  private readonly xmlParser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "",
    textNodeName: "#text",
    commentPropName: "#comment",
    cdataPropName: "#cdata",
    trimValues: false,
    parseTagValue: false,
    parseAttributeValue: false,
  });

  public constructor(private readonly shapeFactory: ShapeFactory = new ShapeFactory()) {}

  public parse(source: string): ReadDocumentResult {
    this.validateXml(source);
    const nodes = this.asNodeArray(this.xmlParser.parse(source));
    const svgNode = this.findSvgRoot(nodes);
    const rootAttributes = this.attributesOf(svgNode);
    this.assertRootAttributes(rootAttributes);
    const { width, height } = this.readCanvasSize(rootAttributes);
    const document = new SvgDocument(width, height);
    const warnings: string[] = [];
    const reservedIds = this.collectExplicitIds(this.childrenOf(svgNode));
    const idCounters = new Map<string, number>();

    this.parseChildren(this.childrenOf(svgNode), null, document, warnings, reservedIds, idCounters);

    return { document, warnings };
  }

  private validateXml(source: string): void {
    if (/<!DOCTYPE|<!ENTITY/iu.test(source)) {
      throw new SvgParseError("DOCTYPE and custom entities are not supported");
    }
    const validation = XMLValidator.validate(source);
    if (validation !== true) {
      throw new SvgParseError(`invalid XML: ${validation.err.msg}`);
    }
  }

  private findSvgRoot(nodes: readonly OrderedXmlNode[]): OrderedXmlNode {
    const roots = nodes.filter((node) => this.elementNameOf(node) === "svg");
    if (roots.length !== 1) {
      throw new SvgParseError("document must contain exactly one <svg> root");
    }
    return roots[0] as OrderedXmlNode;
  }

  private parseChildren(
    nodes: readonly OrderedXmlNode[],
    parent: Group | null,
    document: SvgDocument,
    warnings: string[],
    reservedIds: Set<string>,
    idCounters: Map<string, number>,
  ): void {
    for (const node of nodes) {
      const elementName = this.elementNameOf(node);
      if (elementName === null) {
        this.assertIgnorableNode(node);
        continue;
      }
      if (!this.supportedElements.has(elementName)) {
        throw new SvgParseError(`unsupported SVG element: <${elementName}>`);
      }

      const attributes = this.attributesOf(node);
      const id = this.readOrAssignId(elementName, attributes, warnings, reservedIds, idCounters);
      attributes.id = id;
      const textContent = elementName === "text" ? this.readTextContent(node) : "";
      const shape = this.createShape(elementName, id, attributes, textContent);
      document.addShape(shape, parent);

      if (shape instanceof Group) {
        this.parseChildren(
          this.childrenOf(node),
          shape,
          document,
          warnings,
          reservedIds,
          idCounters,
        );
      } else if (elementName !== "text") {
        this.assertNoElementChildren(node);
      }
    }
  }

  private createShape(
    elementName: string,
    id: string,
    attributes: ShapeAttributes,
    textContent: string,
  ): Shape {
    try {
      return this.shapeFactory.create(elementName, id, attributes, textContent);
    } catch (error) {
      throw new SvgParseError(
        `invalid <${elementName}>#${id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private readOrAssignId(
    elementName: string,
    attributes: XmlAttributes,
    warnings: string[],
    reservedIds: Set<string>,
    idCounters: Map<string, number>,
  ): string {
    const explicitId = attributes.id;
    if (explicitId !== undefined && explicitId.length > 0) {
      return explicitId;
    }

    let counter = idCounters.get(elementName) ?? 0;
    let candidate: string;
    do {
      counter += 1;
      candidate = `${elementName}${counter}`;
    } while (reservedIds.has(candidate));
    idCounters.set(elementName, counter);
    reservedIds.add(candidate);
    warnings.push(`warning: assigned id ${candidate} to unnamed <${elementName}>`);
    return candidate;
  }

  private collectExplicitIds(nodes: readonly OrderedXmlNode[]): Set<string> {
    const ids = new Set<string>();
    for (const node of nodes) {
      const elementName = this.elementNameOf(node);
      if (elementName === null) {
        continue;
      }
      const id = this.attributesOf(node).id;
      if (id !== undefined && id.length > 0) {
        ids.add(id);
      }
      if (elementName === "g") {
        for (const childId of this.collectExplicitIds(this.childrenOf(node))) {
          ids.add(childId);
        }
      }
    }
    return ids;
  }

  private readTextContent(node: OrderedXmlNode): string {
    let content = "";
    for (const child of this.childrenOf(node)) {
      if (typeof child["#text"] === "string") {
        content += child["#text"];
      } else if (child["#cdata"] !== undefined) {
        content += this.readCdata(child["#cdata"]);
      } else if (child["#comment"] === undefined) {
        const childName = this.elementNameOf(child);
        if (childName !== null) {
          throw new SvgParseError(`unsupported element inside <text>: <${childName}>`);
        }
      }
    }
    return content;
  }

  private readCdata(value: unknown): string {
    const nodes = this.asNodeArray(value);
    return nodes.map((node) => (typeof node["#text"] === "string" ? node["#text"] : "")).join("");
  }

  private assertNoElementChildren(node: OrderedXmlNode): void {
    for (const child of this.childrenOf(node)) {
      const childName = this.elementNameOf(child);
      if (childName !== null) {
        throw new SvgParseError(`unsupported element inside leaf shape: <${childName}>`);
      }
      this.assertIgnorableNode(child);
    }
  }

  private assertIgnorableNode(node: OrderedXmlNode): void {
    const text = node["#text"];
    if (typeof text === "string" && text.trim().length > 0) {
      throw new SvgParseError("unexpected text outside a <text> element");
    }
  }

  private readCanvasSize(attributes: XmlAttributes): { width: number; height: number } {
    const viewBox = this.readViewBox(attributes.viewBox);
    const width = this.optionalPositiveNumber("width", attributes.width) ?? viewBox?.width;
    const height = this.optionalPositiveNumber("height", attributes.height) ?? viewBox?.height;
    if (width === undefined || height === undefined) {
      throw new SvgParseError("<svg> requires width and height or a 0 0 width height viewBox");
    }
    if (viewBox !== undefined && (viewBox.width !== width || viewBox.height !== height)) {
      throw new SvgParseError("viewBox dimensions must match the canvas dimensions");
    }
    return { width, height };
  }

  private readViewBox(value: string | undefined): { width: number; height: number } | undefined {
    if (value === undefined) {
      return undefined;
    }
    const values = value
      .trim()
      .split(/[\s,]+/u)
      .map(Number);
    if (
      values.length !== 4 ||
      values.some((item) => !Number.isFinite(item)) ||
      values[0] !== 0 ||
      values[1] !== 0 ||
      (values[2] as number) <= 0 ||
      (values[3] as number) <= 0
    ) {
      throw new SvgParseError("only a positive '0 0 width height' viewBox is supported");
    }
    return { width: values[2] as number, height: values[3] as number };
  }

  private optionalPositiveNumber(name: string, value: string | undefined): number | undefined {
    if (value === undefined) {
      return undefined;
    }
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      throw new SvgParseError(`${name} must be a positive number`);
    }
    return numberValue;
  }

  private assertRootAttributes(attributes: XmlAttributes): void {
    const allowed = new Set(["width", "height", "viewBox", "version", "xmlns"]);
    for (const attribute of Object.keys(attributes)) {
      if (!allowed.has(attribute) && !attribute.startsWith("xmlns:")) {
        throw new SvgParseError(`unsupported attribute on <svg>: ${attribute}`);
      }
    }
  }

  private elementNameOf(node: OrderedXmlNode): string | null {
    const name = Object.keys(node).find((key) => key !== ":@" && !key.startsWith("#"));
    return name?.startsWith("?") === true ? null : (name ?? null);
  }

  private childrenOf(node: OrderedXmlNode): OrderedXmlNode[] {
    const name = this.elementNameOf(node);
    return name === null ? [] : this.asNodeArray(node[name]);
  }

  private attributesOf(node: OrderedXmlNode): XmlAttributes {
    const rawAttributes = node[":@"];
    if (rawAttributes === undefined) {
      return {};
    }
    if (
      typeof rawAttributes !== "object" ||
      rawAttributes === null ||
      Array.isArray(rawAttributes)
    ) {
      throw new SvgParseError("invalid XML attributes");
    }
    const attributes: XmlAttributes = {};
    for (const [name, value] of Object.entries(rawAttributes)) {
      if (typeof value !== "string") {
        throw new SvgParseError(`invalid value for attribute: ${name}`);
      }
      attributes[name] = value;
    }
    return attributes;
  }

  private asNodeArray(value: unknown): OrderedXmlNode[] {
    if (!Array.isArray(value)) {
      throw new SvgParseError("invalid XML structure");
    }
    return value as OrderedXmlNode[];
  }
}
