// Himpunan konsep surat BHP Medan — mengikuti format surat CV Hitado (28 Sept 2026)
const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType,
  BorderStyle, ShadingType, PageBreak, ImageRun, HorizontalPositionRelativeFrom,
  VerticalPositionRelativeFrom, TextWrappingType, LevelFormat, VerticalAlign,
} = require("docx");

const FONT = "Arial";
const SZ = 22;           // 11 pt, seperti isi surat CV Hitado
const LOGO = fs.readFileSync("logo.png");
const PERKARA = "Putusan Pengadilan Niaga pada Pengadilan Negeri Medan Nomor 33/Pdt.Sus-PKPU/2022/PN Niaga Mdn tanggal 10 April 2023";
const HGU = "eks Hak Guna Usaha Nomor 2/Sei Tampa, Kecamatan Selesai, Kabupaten Langkat";

function runs(text, base = {}) {
  const out = []; const re = /(\*\*[^*]+\*\*|_[^_]+_)/g; let last = 0, m;
  const mk = (t, o) => new TextRun({ text: t, font: FONT, size: SZ, ...base, ...o });
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(mk(text.slice(last, m.index), {}));
    const t = m[0];
    out.push(t.startsWith("**") ? mk(t.slice(2, -2), { bold: true }) : mk(t.slice(1, -1), { italics: true }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(mk(text.slice(last), {}));
  return out;
}
const LS = { line: 276 };
// paragraf pembuka / penutup: menjorok baris pertama 709
const par = (t, after = 120, keepNext = false) => new Paragraph({ children: runs(t), alignment: AlignmentType.JUSTIFIED, spacing: { ...LS, after }, indent: { firstLine: 709 }, keepNext, keepLines: true });
const plain = (t, o = {}) => new Paragraph({ children: runs(t, o.run || {}), alignment: o.align || AlignmentType.LEFT, spacing: { ...LS, after: o.after ?? 0, before: o.before ?? 0 }, indent: o.indent });
const kutip = (t) => new Paragraph({ children: runs(t, { italics: false }), alignment: AlignmentType.JUSTIFIED, spacing: { after: 160 }, indent: { left: 1077, right: 849 } });
const blank = () => new Paragraph({ children: [], spacing: { after: 0 } });

// Penomoran: tiap surat memakai instance sendiri agar mulai dari 1
let inst = 0;
const numbering = { config: [
  { reference: "butir", levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 453, hanging: 340 } }, run: { font: FONT, size: SZ } } },
    { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 850, hanging: 340 } }, run: { font: FONT, size: SZ } } },
  ] },
  { reference: "tembusan", levels: [
    { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 453, hanging: 283 } }, run: { size: 16 } } },
  ] },
] };
// cont: lanjutkan nomor dari daftar sebelumnya (setelah kutipan pasal); keepLast: butir terakhir ikut ke halaman penutup
function butirList(items, { cont = false, keepLast = false } = {}) {
  const n = cont ? inst : ++inst;
  return items.map((it, i) => {
    const [lvl, t] = Array.isArray(it) ? it : [0, it];
    return new Paragraph({ children: runs(t), numbering: { reference: "butir", level: lvl, instance: n }, alignment: AlignmentType.JUSTIFIED,
      spacing: { ...LS, after: 120 }, keepLines: true, keepNext: keepLast && i === items.length - 1 });
  });
}

const NONE = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NOB = { top: NONE, bottom: NONE, left: NONE, right: NONE, insideHorizontal: NONE, insideVertical: NONE };
const LINE = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const B = { top: LINE, bottom: LINE, left: LINE, right: LINE };

// brk: kop dimulai di halaman baru (pengganti paragraf page break, agar tidak ada halaman kosong)
function kop(brk = true) {
  let first = brk;
  const k = (t) => { const p = new Paragraph({ children: t, alignment: AlignmentType.CENTER, indent: { left: 1418 }, pageBreakBefore: first }); first = false; return p; };
  return [
    k([
      new TextRun({ text: "KEMENTERIAN HUKUM REPUBLIK INDONESIA", font: FONT, size: 24 }),
      new ImageRun({ type: "png", data: LOGO, transformation: { width: 77, height: 87 },
        floating: { horizontalPosition: { relative: HorizontalPositionRelativeFrom.COLUMN, offset: -5997 },
          verticalPosition: { relative: VerticalPositionRelativeFrom.PARAGRAPH, offset: 87999 },
          wrap: { type: TextWrappingType.NONE }, allowOverlap: true } }),
    ]),
    k([new TextRun({ text: "KANTOR WILAYAH SUMATERA UTARA", font: FONT, size: 24 })]),
    k([new TextRun({ text: "BALAI HARTA PENINGGALAN MEDAN", font: FONT, size: 24, bold: true })]),
    k([new TextRun({ text: "Jalan Listrik No. 10 Medan", font: FONT, size: 20 })]),
    k([new TextRun({ text: "Telepon: (061) 451 7830, Faksimile: (061) 451 4328", font: FONT, size: 20 })]),
    new Paragraph({ children: [new TextRun({ text: "Laman: www.bhpmedan.kemenkum.go.id, Pos-el: bhp.medan@kemenkum.go.id", font: FONT, size: 20 })],
      alignment: AlignmentType.CENTER, indent: { left: 1418 } }),
    // garis kop selebar margin (seperti garis horizontal surat CV Hitado), bukan mulai dari indentasi teks kop
    new Paragraph({ children: [], spacing: { before: 40, after: 160, line: 120, lineRule: "exact" },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "A0A0A0", space: 1 } } }),
  ];
}

function kepala(sifat, lampiran, hal) {
  const W = [1304, 236, 4139, 3402];
  const c = (t, i, right) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA },
    children: [new Paragraph({ children: runs(t), alignment: right ? AlignmentType.RIGHT : AlignmentType.LEFT, spacing: { after: 40 } })] });
  const row = (a, b, d = "") => new TableRow({ children: [c(a, 0), c(":", 1), c(b, 2), c(d, 3, true)] });
  return new Table({ width: { size: 9081, type: WidthType.DXA }, columnWidths: W, borders: NOB, rows: [
    row("Nomor", "W.2.AHU.AHU.1-AH.06.06-……", "Medan, ……………… 2026"),
    row("Sifat", sifat), row("Lampiran", lampiran), row("Hal", hal),
  ] });
}

function tujuan(lines) {
  return [blank(), ...lines.map(t => plain(t)), blank()];
}

function ttd(jabatan = "Kepala,", nama = "Syafriadi Lubis", tanggal) {
  const W = [5896, 3061];
  const cell = (ps, i) => new TableCell({ borders: NOB, width: { size: W[i], type: WidthType.DXA }, children: ps });
  return new Table({ width: { size: 8957, type: WidthType.DXA }, columnWidths: W, borders: NOB, rows: [new TableRow({ cantSplit: true, children: [
    cell([blank()], 0),
    cell([...(tanggal ? [plain(tanggal)] : []), plain(jabatan), blank(), blank(), blank(), plain(nama)], 1),
  ] })] });
}

function tembusan(list) {
  if (!list || !list.length) return [];
  const n = ++inst;
  return [
    blank(),
    new Paragraph({ children: [new TextRun({ text: "Tembusan:", font: FONT, size: 16 })], spacing: { ...LS, after: 40 } }),
    ...list.map(t => new Paragraph({ children: [new TextRun({ text: t, font: FONT, size: 16 })], numbering: { reference: "tembusan", level: 0, instance: n }, alignment: AlignmentType.JUSTIFIED, spacing: LS })),
  ];
}

function grid(header, rows, widths, aligns) {
  const A = { L: AlignmentType.LEFT, C: AlignmentType.CENTER, R: AlignmentType.RIGHT, J: AlignmentType.JUSTIFIED };
  const cell = (t, i, head) => new TableCell({ borders: B, width: { size: widths[i], type: WidthType.DXA },
    margins: { left: 80, right: 80 }, verticalAlign: VerticalAlign.CENTER,
    shading: head ? { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F2" } : undefined,
    children: [new Paragraph({ children: runs(t, { size: 20, bold: head }), alignment: head ? AlignmentType.CENTER : A[aligns[i]], spacing: { before: 60, after: 60 } })] });
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths, rows: [
    new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, i, true)) }),
    ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false)) })),
  ] });
}

// Satu surat lengkap
function surat({ label, sifat = "Segera", lampiran = "-", hal, kepada, pembuka, butir = [], sisip = [], setelah = [], penutup, tembus, jabatan, nama }) {
  return [
    ...kop(), kepala(sifat, lampiran, hal), ...tujuan(kepada),
    par(pembuka), ...butirList(butir), ...sisip, ...(typeof setelah === "function" ? setelah() : setelah),
    par(penutup, 200, true), ttd(jabatan, nama), ...tembusan(tembus),
  ];
}
const pb = () => new Paragraph({ children: [new PageBreak()] });
const HP = ["Yth. Hakim Pengawas Kepailitan", "PT Rata Makmur (Dalam Pailit)", "pada Pengadilan Niaga pada Pengadilan Negeri Medan", "di Tempat"];
const TEMBUS_HP = ["Direktur Jenderal Administrasi Hukum Umum", "Direktur Perdata Direktorat Jenderal Administrasi Hukum Umum", "Kepala Kantor Wilayah Kementerian Hukum Sumatera Utara"];

