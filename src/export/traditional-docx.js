// 传统竖排家谱 DOCX 导出。
// 完全由本程序从 JSON 数据自行生成 OOXML（Word）文档，
// 不依赖任何第三方库 / CDN，也不借助任何 HTML→DOCX 的转换软件。
// 竖排文字通过 <w:textDirection w:val="tbRl"/> 实现。

import { store } from "../data/state.js";
import { sortedChildren, genOf, rankLabel } from "../data/queries.js";
import { fmtDate, yearDetail } from "../utils/date.js";
import { download } from "../utils/dom.js";
import { para, run, cell, row, table, buildDocx, spacer } from "./ooxml.js";

/** 竖排单元格内的一段文字 */
function vText(text, opts = {}) {
  if (!text) return "";
  const { size = 24, bold = false, color = "3A2E1F" } = opts;
  return para(run(text, { size, bold, color }), { vertical: true, align: "center" });
}

/** 一个人的竖排信息块：考（男）/ 妣（配偶） */
function personBlock(p, isSpouse) {
  const name = isSpouse ? p.spouse : p.name;
  const zi = isSpouse ? p.spouseZi : p.zi;
  const note = isSpouse ? p.spouseNote : p.note;
  const tomb = isSpouse ? "" : p.tomb;
  const desc = isSpouse ? p.spouseDesc : p.desc;

  const bd = isSpouse
    ? fmtDate(p.spouseBirth) + (p.spouseDeath ? " – " + fmtDate(p.spouseDeath) : "")
    : fmtDate(p.birth) + (p.death ? " – " + fmtDate(p.death) : "");

  const parts = [];
  parts.push(vText(isSpouse ? "妣" : "考", { size: 22, color: "8C5A2B", bold: true }));
  parts.push(vText("讳" + (name || "佚名"), { size: 34, bold: true }));
  if (zi) parts.push(vText("字 " + zi, { size: 20, color: "7A6A52" }));
  if (bd) parts.push(vText(bd, { size: 18, color: "7A6A52" }));
  if (note) parts.push(vText("生平：" + note, { size: 18, color: "7A6A52" }));
  if (desc) parts.push(vText(desc, { size: 18, color: "7A6A52" }));
  if (tomb) parts.push(vText("葬 " + tomb, { size: 18, color: "7A6A52" }));
  return parts.join("");
}

/** 一对夫妻的竖排单元格：右为考、左为妣 */
function coupleCell(p, genLabel) {
  const hasSpouse = !!(p.spouse || p.spouseBirth || p.spouseDeath);
  let inner = vText(genLabel, { size: 20, color: "8C5A2B", bold: true });
  inner += personBlock(p, false); // 考（右侧列，竖排下从右向左排）
  if (hasSpouse) inner += personBlock(p, true); // 妣（左侧列）
  return cell(inner, { vertical: true, widthPct: 100 / countLeaves(p), top: !p.parent, bottom: isLeaf(p) });
}

/** 一个节点下方的末代数量（用于列宽分配，使单元格宽度反映支系规模） */
function countLeaves(node) {
  const kids = sortedChildren(node.id);
  if (!kids.length) return 1;
  return kids.reduce((s, c) => s + countLeaves(c), 0);
}

/** 构建某祖先的完整世系表（每世一行） */
function buildPedigree(root) {
  const generations = [];
  function collect(p, depth) {
    if (!generations[depth]) generations[depth] = [];
    generations[depth].push(p);
    sortedChildren(p.id).forEach((c) => collect(c, depth + 1));
  }
  collect(root, 0);

  const rows = generations.map((gen) => {
    const genLabel = `第${genOf(gen[0])}世`;
    const cells = gen.map((p) => coupleCell(p, genLabel));
    return row(cells, { height: 5000 });
  });
  return table(rows, { fixed: true });
}

function isLeaf(p) {
  return !sortedChildren(p.id).length;
}

export async function exportTraditionalDocx() {
  const title = store.title || "家谱";
  const sub = store.sub || "— 世代源流图 —";
  const roots = store.data.filter((p) => !p.parent);

  const body = [];
  // 标题页
  body.push(spacer(2400, 0));
  body.push(para(run(title, { size: 72, bold: true, color: "8C5A2B" }), { align: "center" }));
  body.push(para(run(sub, { size: 28, color: "7A6A52" }), { align: "center", spacing: { before: 400 } }));
  body.push(spacer(1200, 0));
  body.push(para(run("麟趾百年称祖德", { size: 28, color: "7A6A52" }), { align: "center" }));
  body.push(para(run("螽斯千载念宗功", { size: 28, color: "7A6A52" }), { align: "center" }));
  body.push(para("", { pageBreak: true }));

  // 各支世系图
  roots.forEach((root) => {
    body.push(buildPedigree(root));
    body.push(para("", { pageBreak: true }));
  });

  const blob = await buildDocx(body, { top: 720, right: 720, bottom: 720, left: 720 });
  download(blob, (title || "jiapu") + "_传统.docx");
}
