import { buildPythonStarter } from "./codegen";
import type { JsonValue, PageNode, Project } from "./projectModel";
import {
    PAGE_CARD_HEIGHT,
    PAGE_CARD_WIDTH,
    formatLastModified,
    parseProjectCollection,
} from "./projectModel";

// test 
const DOCX_MIME =
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PX_TO_EMU = 9525;

interface ImageAsset {
    docPrId: number;
    fileName: string;
    name: string;
    relId: string;
    bytes: Uint8Array;
    widthPx: number;
    heightPx: number;
}

interface ZipEntry {
    path: string;
    bytes: Uint8Array;
}

export function downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}

export function downloadTextFile(
    fileName: string,
    content: string,
    mimeType: string,
): void {
    downloadBlob(new Blob([content], { type: mimeType }), fileName);
}

export function exportProjectJson(project: Project): void {
    downloadTextFile(
        `${sanitizeFileName(project.name)}.json`,
        JSON.stringify(project, null, 2),
        "application/json",
    );
}

export function exportPythonStarter(project: Project): void {
    downloadTextFile(
        `${sanitizeFileName(project.name)}.py`,
        buildPythonStarter(project),
        "text/x-python",
    );
}

export function parseImportedProjects(rawText: string): Project[] | null {
    try {
        const parsed = JSON.parse(rawText) as JsonValue;
        if (Array.isArray(parsed)) {
            return parseProjectCollection(parsed);
        }
        return parseProjectCollection([parsed]);
    } catch {
        return null;
    }
}

export async function exportProjectDocx(project: Project): Promise<void> {
    const blob = await buildDocxBlob(project);
    downloadBlob(blob, `${sanitizeFileName(project.name)}.docx`);
}

async function buildDocxBlob(project: Project): Promise<Blob> {
    const assets = await buildDocxImages(project);
    const files: ZipEntry[] = [
        {
            path: "[Content_Types].xml",
            bytes: encodeText(buildContentTypesXml(assets)),
        },
        {
            path: "_rels/.rels",
            bytes: encodeText(buildRootRelsXml()),
        },
        {
            path: "word/document.xml",
            bytes: encodeText(buildDocumentXml(project, assets)),
        },
        {
            path: "word/styles.xml",
            bytes: encodeText(buildStylesXml()),
        },
        {
            path: "word/_rels/document.xml.rels",
            bytes: encodeText(buildDocumentRelsXml(assets)),
        },
        ...assets.map((asset) => ({
            path: `word/media/${asset.fileName}`,
            bytes: asset.bytes,
        })),
    ];
    return new Blob([copyToArrayBuffer(createZip(files))], {
        type: DOCX_MIME,
    });
}

async function buildDocxImages(project: Project): Promise<ImageAsset[]> {
    const graphSvg = buildGraphSvg(project);
    const graphSize = getGraphSize(project);
    const graphImage: ImageAsset = {
        docPrId: 1,
        fileName: "graph.png",
        name: "Page Graph",
        relId: "rId2",
        bytes: await renderSvgToPng(graphSvg, graphSize.width, graphSize.height),
        widthPx: graphSize.width,
        heightPx: graphSize.height,
    };

    const pageAssets = await Promise.all(
        project.pages.map(async (page, index) => {
            const svg = buildPagePreviewSvg(page, project);
            const dimensions = getPagePreviewSize(page);
            return {
                docPrId: index + 2,
                fileName: `page-${index + 1}.png`,
                name: `${page.name} Preview`,
                relId: `rId${index + 3}`,
                bytes: await renderSvgToPng(
                    svg,
                    dimensions.width,
                    dimensions.height,
                ),
                widthPx: dimensions.width,
                heightPx: dimensions.height,
            } satisfies ImageAsset;
        }),
    );
    return [graphImage, ...pageAssets];
}

function getGraphSize(project: Project): { width: number; height: number } {
    const maxX =
        project.pages.reduce(
            (largest, page) => Math.max(largest, page.x + PAGE_CARD_WIDTH + 120),
            880,
        ) + 40;
    const maxY =
        project.pages.reduce(
            (largest, page) => Math.max(largest, page.y + PAGE_CARD_HEIGHT + 120),
            480,
        ) + 40;
    return {
        width: maxX,
        height: maxY,
    };
}

function getPagePreviewSize(page: PageNode): { width: number; height: number } {
    return {
        width: 760,
        height: Math.max(280, 170 + page.components.length * 78),
    };
}

function buildGraphSvg(project: Project): string {
    const { width, height } = getGraphSize(project);
    const nodes = project.pages
        .map((page) => {
            const previewText = escapeXml(page.purpose.slice(0, 80));
            return `<g transform="translate(${page.x}, ${page.y})">
    <rect x="0" y="0" width="${PAGE_CARD_WIDTH}" height="${PAGE_CARD_HEIGHT}" rx="22" fill="${page.style.backgroundColor}" stroke="${page.style.borderColor}" stroke-width="2" />
    <text x="18" y="34" font-size="20" font-weight="700" fill="#1f2933">${escapeXml(page.name)}</text>
    <text x="18" y="62" font-size="13" fill="#52606d">${previewText}</text>
    <text x="18" y="92" font-size="12" fill="#7b8794">${page.components.length} components</text>
    <text x="18" y="114" font-size="12" fill="#7b8794">${page.annotations.length} annotations</text>
  </g>`;
        })
        .join("\n");

    const routes = project.routes
        .map((route) => {
            const source = project.pages.find((page) => page.id === route.sourcePageId);
            const target = project.pages.find((page) => page.id === route.targetPageId);
            if (source === undefined || target === undefined) {
                return "";
            }
            const startX = source.x + PAGE_CARD_WIDTH;
            const startY = source.y + PAGE_CARD_HEIGHT / 2;
            const endX = target.x;
            const endY = target.y + PAGE_CARD_HEIGHT / 2;
            const controlX = (startX + endX) / 2;
            const textX = controlX;
            const textY = (startY + endY) / 2 - 8;
            return `<g>
    <path d="M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${endY}, ${endX} ${endY}" fill="none" stroke="#7c5a36" stroke-width="3" marker-end="url(#arrow)" />
    <rect x="${textX - route.label.length * 4.1 - 16}" y="${textY - 16}" width="${
                route.label.length * 8.2 + 30
            }" height="26" rx="12" fill="#fffdf7" stroke="#d1c4b2" />
    <text x="${textX}" y="${textY + 2}" text-anchor="middle" font-size="12" fill="#4b5563">${escapeXml(
                route.label,
            )}</text>
  </g>`;
        })
        .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="12" markerHeight="12" refX="10" refY="6" orient="auto">
      <path d="M 0 0 L 12 6 L 0 12 z" fill="#7c5a36" />
    </marker>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" rx="28" fill="#f5efe3" />
  ${routes || '<text x="60" y="60" font-size="18" fill="#7b8794">No routes yet</text>'}
  ${nodes || '<text x="60" y="110" font-size="22" fill="#52606d">Add pages to build the graph diagram.</text>'}
</svg>`;
}

function buildPagePreviewSvg(page: PageNode, project: Project): string {
    const { width, height } = getPagePreviewSize(page);
    const components = page.components
        .map((component, index) => {
            const top = 94 + index * 78;
            return `<g transform="translate(48, ${top})">
    <rect x="0" y="0" width="${width - 96}" height="58" rx="18" fill="${component.style.backgroundColor}" stroke="${component.style.borderColor}" stroke-width="${Math.max(
                component.style.borderWidth,
                1,
            )}" />
    <text x="18" y="23" font-size="13" fill="#7b8794">${component.type}</text>
    <text x="18" y="42" font-size="18" fill="${component.style.textColor}">${escapeXml(
                getComponentSummary(component, project),
            )}</text>
  </g>`;
        })
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" rx="28" fill="#f4f0e8" />
  <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="${page.style.backgroundColor}" stroke="${page.style.borderColor}" stroke-width="3" />
  <text x="48" y="58" font-size="28" font-weight="700" fill="#1f2933">${escapeXml(page.name)}</text>
  <text x="48" y="82" font-size="15" fill="#52606d">${escapeXml(page.purpose)}</text>
  ${components || '<text x="48" y="132" font-size="18" fill="#7b8794">No components added yet.</text>'}
</svg>`;
}

function getComponentSummary(
    component: PageNode["components"][number],
    project: Project,
): string {
    switch (component.type) {
        case "Text":
            return component.content;
        case "Header":
            return `H${component.level}: ${component.content}`;
        case "TextBox":
        case "TextArea":
            return `${component.name} = "${component.defaultValue}"`;
        case "CheckBox":
            return `${component.name} = ${
                component.defaultValue ? "checked" : "unchecked"
            }`;
        case "SelectBox":
            return `${component.name}: ${component.defaultValue} (${component.options.join(
                ", ",
            )})`;
        case "Button": {
            const route = project.routes.find((item) => item.id === component.routeId);
            return `${component.label} -> ${route?.label ?? "unassigned route"}`;
        }
    }
}

async function renderSvgToPng(
    svg: string,
    width: number,
    height: number,
): Promise<Uint8Array> {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) {
        URL.revokeObjectURL(url);
        throw new Error("Canvas support is required to export DOCX diagrams.");
    }
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () =>
            reject(new Error("Unable to render the generated SVG diagram."));
        image.src = url;
    });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    URL.revokeObjectURL(url);
    const pngBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((renderedBlob) => {
            if (renderedBlob === null) {
                reject(new Error("Failed to convert the canvas to a PNG image."));
                return;
            }
            resolve(renderedBlob);
        }, "image/png");
    });
    const buffer = await pngBlob.arrayBuffer();
    return new Uint8Array(buffer);
}

function buildContentTypesXml(images: ImageAsset[]): string {
    const imageOverrides = images
        .map(
            (asset) =>
                `  <Default Extension="${asset.fileName.split(".").pop() ?? "png"}" ContentType="image/png"/>`,
        )
        .slice(0, 1)
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
${imageOverrides}
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;
}

function buildRootRelsXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;
}

function buildDocumentRelsXml(images: ImageAsset[]): string {
    const imageRelationships = images
        .map(
            (asset) =>
                `  <Relationship Id="${asset.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${asset.fileName}"/>`,
        )
        .join("\n");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
${imageRelationships}
</Relationships>`;
}

function buildStylesXml(): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="34"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="28"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading3">
    <w:name w:val="heading 3"/>
    <w:basedOn w:val="Normal"/>
    <w:next w:val="Normal"/>
    <w:qFormat/>
    <w:rPr><w:b/><w:sz w:val="24"/></w:rPr>
  </w:style>
</w:styles>`;
}

function buildDocumentXml(project: Project, images: ImageAsset[]): string {
    const graphImage = images[0];
    const pageImages = images.slice(1);
    const annotationLines = [
        ...project.pages.flatMap((page) =>
            page.annotations.map(
                (annotation) =>
                    `${page.name} (${annotation.type}): ${annotation.explanation}`,
            ),
        ),
        ...project.routes.flatMap((route) =>
            route.annotations.map(
                (annotation) =>
                    `${route.label} (${annotation.type}): ${annotation.explanation}`,
            ),
        ),
    ];
    const pageSections = project.pages
        .map((page, index) => {
            const pageImage = pageImages[index];
            const componentSummaries = page.components
                .map((component) => `${component.type}: ${getComponentSummary(component, project)}`)
                .map((summary) => paragraph(summary))
                .join("");
            return [
                heading(page.name, "Heading3"),
                paragraph(page.purpose),
                imageParagraph(pageImage),
                componentSummaries,
            ].join("");
        })
        .join("");
    const stateLines = [
        paragraph(`Primary state dataclass: ${project.stateModel.primaryName}`),
        ...project.stateModel.primaryFields.map((field) =>
            paragraph(
                `${field.name} (${field.type}) - ${field.description}. Updated by pages: ${
                    field.updatedByPageIds.join(", ") || "none"
                }. Updated by routes: ${field.updatedByRouteIds.join(", ") || "none"}.`,
            ),
        ),
        ...project.stateModel.secondaryClasses.flatMap((secondary) => [
            paragraph(`${secondary.name}: ${secondary.description}`),
            ...secondary.fields.map((field) =>
                paragraph(
                    `${field.name} (${field.type}) - ${field.description}`,
                ),
            ),
        ]),
    ].join("");

    const logicSection =
        annotationLines.length > 0
            ? annotationLines.map((line) => paragraph(line)).join("")
            : paragraph("No logic annotations were added yet.");

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document
    xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
    xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:w10="urn:schemas-microsoft-com:office:word"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
    xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
    xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
    xmlns:wne="http://schemas.microsoft.com/office/2006/wordml"
    xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
    xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"
    mc:Ignorable="w14 wp14">
  <w:body>
    ${heading(project.name, "Heading1")}
    ${paragraph(project.description)}
    ${paragraph(`Last modified: ${formatLastModified(project.lastModified)}`)}
    ${heading("Page Graph Diagram", "Heading2")}
    ${paragraph("Directional routes are shown between page nodes in the exported diagram below.")}
    ${imageParagraph(graphImage)}
    ${heading("Page Descriptions", "Heading2")}
    ${pageSections || paragraph("No pages are available in this project yet.")}
    ${heading("State Model", "Heading2")}
    ${stateLines}
    ${heading("Logic Annotations", "Heading2")}
    ${logicSection}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1200" w:bottom="1440" w:left="1200" w:header="708" w:footer="708" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;
}

function heading(text: string, styleId: "Heading1" | "Heading2" | "Heading3"): string {
    return `<w:p><w:pPr><w:pStyle w:val="${styleId}"/></w:pPr><w:r><w:t>${escapeXml(
        text,
    )}</w:t></w:r></w:p>`;
}

function paragraph(text: string): string {
    return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(
        text,
    )}</w:t></w:r></w:p>`;
}

function imageParagraph(asset: ImageAsset | undefined): string {
    if (asset === undefined) {
        return paragraph("No diagram available.");
    }
    const width = asset.widthPx * PX_TO_EMU;
    const height = asset.heightPx * PX_TO_EMU;
    return `<w:p>
  <w:r>
    <w:drawing>
      <wp:inline distT="0" distB="0" distL="0" distR="0">
        <wp:extent cx="${width}" cy="${height}"/>
        <wp:docPr id="${asset.docPrId}" name="${escapeXml(asset.name)}"/>
        <wp:cNvGraphicFramePr>
          <a:graphicFrameLocks noChangeAspect="1"/>
        </wp:cNvGraphicFramePr>
        <a:graphic>
          <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
            <pic:pic>
              <pic:nvPicPr>
                <pic:cNvPr id="${asset.docPrId}" name="${escapeXml(asset.fileName)}"/>
                <pic:cNvPicPr/>
              </pic:nvPicPr>
              <pic:blipFill>
                <a:blip r:embed="${asset.relId}"/>
                <a:stretch><a:fillRect/></a:stretch>
              </pic:blipFill>
              <pic:spPr>
                <a:xfrm>
                  <a:off x="0" y="0"/>
                  <a:ext cx="${width}" cy="${height}"/>
                </a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              </pic:spPr>
            </pic:pic>
          </a:graphicData>
        </a:graphic>
      </wp:inline>
    </w:drawing>
  </w:r>
</w:p>`;
}

function sanitizeFileName(value: string): string {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return normalized.length > 0 ? normalized : "project";
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function encodeText(value: string): Uint8Array {
    return new TextEncoder().encode(value);
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}

function createZip(entries: ZipEntry[]): Uint8Array {
    const localFiles: Uint8Array[] = [];
    const centralDirectory: Uint8Array[] = [];
    let offset = 0;

    entries.forEach((entry) => {
        const nameBytes = encodeText(entry.path);
        const crc = crc32(entry.bytes);
        const localHeader = joinArrays([
            numberToBytes(0x04034b50, 4),
            numberToBytes(20, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(crc, 4),
            numberToBytes(entry.bytes.length, 4),
            numberToBytes(entry.bytes.length, 4),
            numberToBytes(nameBytes.length, 2),
            numberToBytes(0, 2),
            nameBytes,
            entry.bytes,
        ]);
        localFiles.push(localHeader);

        const directoryHeader = joinArrays([
            numberToBytes(0x02014b50, 4),
            numberToBytes(20, 2),
            numberToBytes(20, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(crc, 4),
            numberToBytes(entry.bytes.length, 4),
            numberToBytes(entry.bytes.length, 4),
            numberToBytes(nameBytes.length, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 2),
            numberToBytes(0, 4),
            numberToBytes(offset, 4),
            nameBytes,
        ]);
        centralDirectory.push(directoryHeader);
        offset += localHeader.length;
    });

    const centralDirectoryBytes = joinArrays(centralDirectory);
    const localFileBytes = joinArrays(localFiles);
    const endOfCentralDirectory = joinArrays([
        numberToBytes(0x06054b50, 4),
        numberToBytes(0, 2),
        numberToBytes(0, 2),
        numberToBytes(entries.length, 2),
        numberToBytes(entries.length, 2),
        numberToBytes(centralDirectoryBytes.length, 4),
        numberToBytes(localFileBytes.length, 4),
        numberToBytes(0, 2),
    ]);

    return joinArrays([
        localFileBytes,
        centralDirectoryBytes,
        endOfCentralDirectory,
    ]);
}

function joinArrays(parts: Uint8Array[]): Uint8Array {
    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    parts.forEach((part) => {
        result.set(part, offset);
        offset += part.length;
    });
    return result;
}

function numberToBytes(value: number, byteLength: 2 | 4): Uint8Array {
    const bytes = new Uint8Array(byteLength);
    const view = new DataView(bytes.buffer);
    if (byteLength === 2) {
        view.setUint16(0, value, true);
    } else {
        view.setUint32(0, value, true);
    }
    return bytes;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(bytes: Uint8Array): number {
    let crc = 0xffffffff;
    bytes.forEach((entry) => {
        crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ entry) & 0xff];
    });
    return (crc ^ 0xffffffff) >>> 0;
}

function buildCrc32Table(): Uint32Array {
    const table = new Uint32Array(256);
    for (let index = 0; index < 256; index += 1) {
        let value = index;
        for (let bit = 0; bit < 8; bit += 1) {
            value =
                (value & 1) === 1
                    ? 0xedb88320 ^ (value >>> 1)
                    : value >>> 1;
        }
        table[index] = value >>> 0;
    }
    return table;
}
