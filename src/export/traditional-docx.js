// 传统竖排家谱 DOCX 导出。
// 使用 docx 库（vendor/docx/index.mjs，离线、无 CDN、无转换软件）直接生成 OOXML。
// 完全由本程序根据 JSON 数据写出，不依赖任何 HTML→DOCX 转换。

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, TextDirection, WidthType, PageOrientation } from "../../vendor/docx/index.mjs";
import { store } from "../data/state.js";
import { sortedChildren, genOf } from "../data/queries.js";
import { fmtDate } from "../utils/date.js";
import { download } from "../utils/dom.js";

const MAX_COLS = 7; // 横向 A4 每行最多显示的夫妻列数

const FONT = "SimSun"; // 宋体，保证竖排汉字在 Word 中正常显示

function vPara(text, opts = {}) {
  if (!text) return null;
  const { size = 24, bold = false, color = "3A2E1F" } = opts;
  return new Paragraph({
    textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    alignment: "center",
    children: [new TextRun({ text, size, bold, color, font: FONT })],
  });
}

function personBlock(p, isSpouse) {
  const name = isSpouse ? p.spouse : p.name;
  const zi = isSpouse ? p.spouseZi : p.zi;
  const note = isSpouse ? p.spouseNote : p.note;
  const tomb = isSpouse ? "" : p.tomb;
  const desc = isSpouse ? p.spouseDesc : p.desc;
  const bd = isSpouse
    ? fmtDate(p.spouseBirth) + (p.spouseDeath ? " – " + fmtDate(p.spouseDeath) : "")
    : fmtDate(p.birth) + (p.death ? " – " + fmtDate(p.death) : "");

  const r = [];
  r.push(vPara(isSpouse ? "妣" : "考", { size: 22, color: "8C5A2B", bold: true }));
  r.push(vPara("讳" + (name || "佚名"), { size: 32, bold: true }));
  if (zi) r.push(vPara("字" + zi, { size: 20, color: "7A6A52" }));
  if (bd) r.push(vPara(bd, { size: 18, color: "7A6A52" }));
  if (note) r.push(vPara("生平：" + note, { size: 18, color: "7A6A52" }));
  if (desc) r.push(vPara(desc, { size: 18, color: "7A6A52" }));
  if (tomb) r.push(vPara("葬" + tomb, { size: 18, color: "7A6A52" }));
  return r.filter(Boolean);
}

function coupleCell(p) {
  const hasSpouse = !!(p.spouse || p.spouseBirth || p.spouseDeath || p.spouseNote || p.spouseZi);
  let inner = personBlock(p, false);
  if (hasSpouse) inner = inner.concat(personBlock(p, true));
  return new TableCell({
    width: { size: 100 / MAX_COLS, type: WidthType.PERCENTAGE },
    textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    margins: { top: 80, bottom: 80, left: 30, right: 30 },
    children: inner,
  });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildGenerations(root) {
  const gens = [];
  function walk(p, depth) {
    if (!gens[depth]) gens[depth] = [];
    gens[depth].push(p);
    sortedChildren(p.id).forEach((c) => walk(c, depth + 1));
  }
  walk(root, 0);
  return gens.filter((g) => g && g.length);
}

export async function exportTraditionalDocx() {
  const title = store.title || "家谱";
  const sub = store.sub || "— 世代源流图 —";
  const roots = store.data.filter((p) => !p.parent);

  const children = [];

  // 封面
  children.push(
    new Paragraph({ alignment: "center", spacing: { before: 2400 }, children: [new TextRun({ text: title, size: 72, bold: true, color: "8C5A2B", font: FONT })] })
  );
  children.push(
    new Paragraph({ alignment: "center", spacing: { before: 400 }, children: [new TextRun({ text: sub, size: 28, color: "7A6A52", font: FONT })] })
  );
  children.push(
    new Paragraph({ alignment: "center", spacing: { before: 1200 }, children: [new TextRun({ text: "麟趾百年称祖德", size: 28, color: "7A6A52", font: FONT })] })
  );
  children.push(
    new Paragraph({ alignment: "center", children: [new TextRun({ text: "螽斯千载念宗功", size: 28, color: "7A6A52", font: FONT })] })
  );

  // 各支系
  roots.forEach((root) => {
    const gens = buildGenerations(root);
    gens.forEach((gen) => {
      const genLabel = `第${genOf(gen[0])}世`;
      children.push(
        new Paragraph({ alignment: "center", pageBreakBefore: children.length > 5, spacing: { before: 200 }, children: [new TextRun({ text: genLabel, size: 36, bold: true, color: "8C5A2B", font: FONT })] })
      );
      const batches = chunk(gen, MAX_COLS);
      batches.forEach((batch, i) => {
        const cells = batch.map(coupleCell);
        if (batches.length > 1) {
          // 续页表头
          const headerCell = new TableCell({
            columnSpan: batch.length,
            children: [new Paragraph({ alignment: "center", children: [new TextRun({ text: `${genLabel}（第 ${i + 1} / ${batches.length} 行）`, size: 20, color: "7A6A52", font: FONT })] })],
          });
          const headerRow = new TableRow({ children: [headerCell] });
          const dataRow = new TableRow({ children: cells });
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, dataRow] }));
        } else {
          children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: cells })] }));
        }
      });
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: { page: { margin: { top: 567, right: 567, bottom: 567, left: 567 }, size: { orientation: PageOrientation.LANDSCAPE } } },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  download(blob, (title || "jiapu") + "_传统.docx");
}
