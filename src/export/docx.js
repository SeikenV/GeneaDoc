// DOCX 导出（现代横排版）：使用 docx 库（vendor/docx/index.mjs，离线、无 CDN、无转换软件）直接生成 OOXML。
// 标题单独一页，每页两代人，子女过多自动分页。

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle } from "../../vendor/docx/index.mjs";
import { store } from "../data/state.js";
import { sortedChildren, genOf, rankLabel } from "../data/queries.js";
import { fmtDate, yearDetail } from "../utils/date.js";
import { stripTags, download } from "../utils/dom.js";

const FONT = "SimSun";
const MAX_PER_PAGE = 5;

function p(text, opts = {}) {
  const { size = 20, bold = false, color = "3A2E1F", align = "left" } = opts;
  return new Paragraph({ alignment: align, children: [new TextRun({ text: text || " ", size, bold, color, font: FONT })] });
}

function personCell(p, isSpouse) {
  const r = isSpouse
    ? { name: p.spouse, birth: p.spouseBirth, death: p.spouseDeath, desc: p.spouseDesc }
    : { name: p.name, birth: p.birth, death: p.death, desc: p.desc };
  const runs = [];
  if (!isSpouse && p.order) runs.push(p(rankLabel(p.order, !!p.female), { size: 18, color: "7A6A52" }));
  runs.push(p(r.name || "（佚名）", { size: 22, bold: true }));
  if (!isSpouse && p.zi) runs.push(p("字 " + p.zi, { size: 18, color: "7A6A52" }));
  if (isSpouse && p.spouseZi) runs.push(p("字 " + p.spouseZi, { size: 18, color: "7A6A52" }));
  if (r.birth || r.death)
    runs.push(p("公历 " + fmtDate(r.birth) + (r.birth && r.death ? " – " : "") + fmtDate(r.death), { size: 18, color: "7A6A52" }));
  const b = yearDetail(r.birth);
  const d = yearDetail(r.death);
  if (b) runs.push(p("农历 " + b.gz + (b.era ? " / " + b.era : ""), { size: 18, color: "7A6A52" }));
  if (d) runs.push(p("农历 " + d.gz + (d.era ? " / " + d.era : ""), { size: 18, color: "7A6A52" }));
  if (!isSpouse && p.note) runs.push(p(p.note, { size: 18, color: "7A6A52" }));
  if (isSpouse && p.spouseNote) runs.push(p(p.spouseNote, { size: 18, color: "7A6A52" }));
  if (!isSpouse && p.tomb) runs.push(p("墓：" + p.tomb, { size: 18, color: "7A6A52" }));
  if (!isSpouse && p.tombAddr) runs.push(p("葬于 " + stripTags(p.tombAddr), { size: 18, color: "7A6A52" }));
  const desc = stripTags(r.desc);
  if (desc) runs.push(p(desc, { size: 18, color: "7A6A52" }));
  return new TableCell({ width: { size: 50, type: WidthType.PERCENTAGE }, margins: { top: 60, bottom: 60, left: 80, right: 80 }, children: runs });
}

function buildDoc() {
  const children = [];
  children.push(p(store.title || "家谱", { size: 72, bold: true, color: "8C5A2B", align: "center" }));
  children.push(p(store.sub || "", { size: 28, color: "7A6A52", align: "center" }));

  function walk(person) {
    const kids = sortedChildren(person.id);
    if (!kids.length) return;
    const gen = genOf(person);
    const batches = [];
    for (let i = 0; i < kids.length; i += MAX_PER_PAGE) batches.push(kids.slice(i, i + MAX_PER_PAGE));
    batches.forEach((batch, bi) => {
      children.push(p(`第${gen}世 → 第${gen + 1}世${batches.length > 1 ? `（${bi + 1}/${batches.length}）` : ""}`, { size: 28, bold: true, color: "8C5A2B", align: "center" }));
      const parentRow = new TableRow({
        children: [personCell(person, false), person.spouse ? personCell(person, true) : new TableCell({ children: [p(" ")] })],
      });
      const kidCells = batch.map((kid) => personCell(kid, false));
      const kidRow = new TableRow({ children: kidCells });
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [parentRow, kidRow] }));
    });
    kids.forEach(walk);
  }

  store.data.filter((pp) => !pp.parent).forEach(walk);
  return children;
}

export async function exportDocx() {
  const doc = new Document({
    sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: buildDoc() }],
  });
  const blob = await Packer.toBlob(doc);
  download(blob, (store.title || "jiapu") + ".docx");
}
