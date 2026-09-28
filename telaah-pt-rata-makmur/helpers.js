const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType,
  WidthType, BorderStyle, ShadingType, PageBreak, Footer, PageNumber, VerticalAlign,
} = require("docx");

const FONT = "Arial";
const SIZE = 22; // 11pt
const CONTENT_W = 9026; // A4 with 1" margins

// Inline markup: **bold**, _italic_
function runs(text, base = {}) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|_[^_]+_)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: FONT, size: SIZE, ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, font: FONT, size: SIZE, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), italics: true, font: FONT, size: SIZE, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: FONT, size: SIZE, ...base }));
  return out;
}

const SP = { after: 120, line: 300 };
function p(text, o = {}) {
  return new Paragraph({
    children: runs(text, o.run || {}),
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { ...SP, ...(o.spacing || {}) },
    indent: o.indent,
    keepNext: o.keepNext,
  });
}
// Numbered item with hanging indent: level 0 at 0.5", level 1 at 1.0", level 2 at 1.4"
const LV = [ { left: 567, hanging: 567 }, { left: 1134, hanging: 454 }, { left: 1588, hanging: 397 } ];
function item(label, text, level = 0) {
  return new Paragraph({
    children: [new TextRun({ text: label + "\t", font: FONT, size: SIZE }), ...runs(text)],
    alignment: AlignmentType.JUSTIFIED,
    spacing: SP,
    indent: LV[level],
    tabStops: [{ type: "left", position: LV[level].left }],
  });
}
function body(text, level = 0) { return p(text, { indent: { left: LV[level].left } }); }
function heading(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT, size: SIZE })],
    spacing: { before: 240, after: 120 }, keepNext: true,
    indent: { left: 567, hanging: 567 }, tabStops: [{ type: "left", position: 567 }],
  });
}
function sub(text) {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, font: FONT, size: SIZE })],
    spacing: { before: 160, after: 100 }, keepNext: true, indent: { left: 567 },
  });
}
function center(text, o = {}) {
  return new Paragraph({ children: runs(text, o.run || {}), alignment: AlignmentType.CENTER, spacing: { after: o.after ?? 0, line: 276 } });
}
const blank = () => new Paragraph({ children: [], spacing: { after: 0 } });
const pb = () => new Paragraph({ children: [new PageBreak()] });

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "808080" };
const B = { top: LINE, bottom: LINE, left: LINE, right: LINE };

// Key : value table without borders
function kv(rows, widths = [1900, 300, CONTENT_W - 2200]) {
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map(([k, v]) => new TableRow({ children: [
      new TableCell({ borders: NOB, width: { size: widths[0], type: WidthType.DXA }, children: [p(k, { align: AlignmentType.LEFT, spacing: { after: 40 } })] }),
      new TableCell({ borders: NOB, width: { size: widths[1], type: WidthType.DXA }, children: [p(":", { align: AlignmentType.LEFT, spacing: { after: 40 } })] }),
      new TableCell({ borders: NOB, width: { size: widths[2], type: WidthType.DXA }, children: [].concat(v).map(t => p(t, { align: AlignmentType.LEFT, spacing: { after: 40 } })) }),
    ] })),
  });
}

// Bordered data table. aligns: array of "L"|"C"|"R"
function grid(header, rows, widths, aligns, o = {}) {
  const A = { L: AlignmentType.LEFT, C: AlignmentType.CENTER, R: AlignmentType.RIGHT };
  const cell = (t, i, isHead, bold) => new TableCell({
    borders: B, width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    verticalAlign: VerticalAlign.CENTER,
    shading: isHead ? { type: ShadingType.CLEAR, color: "auto", fill: "D9E2F3" } : (bold ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" } : undefined),
    children: [new Paragraph({ children: runs(t, { size: 20, bold: isHead || bold }), alignment: isHead ? AlignmentType.CENTER : A[aligns[i]], spacing: { after: 0, line: 264 } })],
  });
  const total = widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: widths,
    indent: o.indent ? { size: o.indent, type: WidthType.DXA } : undefined,
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.cells.map((t, i) => cell(t, i, false, r.bold)) })),
    ],
  });
}
const R = (...cells) => ({ cells });
const RB = (...cells) => ({ cells, bold: true });

function kop() {
  return [
    center("**KEMENTERIAN HUKUM REPUBLIK INDONESIA**"),
    center("**KANTOR WILAYAH SUMATERA UTARA**"),
    center("**BALAI HARTA PENINGGALAN MEDAN**", { run: { size: 26 } }),
    center("Jalan Listrik No. 10 Medan", { run: { size: 18 } }),
    center("Telepon: (061) 451 7830, Faksimile: (061) 451 4328", { run: { size: 18 } }),
    new Paragraph({
      children: runs("Laman: www.bhpmedan.kemenkum.go.id, Pos-el: bhp.medan@kemenkum.go.id", { size: 18 }),
      alignment: AlignmentType.CENTER, spacing: { after: 240 },
      border: { bottom: { style: BorderStyle.DOUBLE, size: 6, color: "000000", space: 4 } },
    }),
  ];
}

function sign(left, right) {
  const w = CONTENT_W / 2;
  const col = (lines) => new TableCell({ borders: NOB, width: { size: w, type: WidthType.DXA },
    children: lines.map(t => new Paragraph({ children: runs(t), alignment: AlignmentType.CENTER, spacing: { after: 0, line: 276 } })) });
  return new Table({ width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: [w, w],
    rows: [new TableRow({ children: [col(left), col(right)] })] });
}

// ============================ TELAAHAN STAF ============================
