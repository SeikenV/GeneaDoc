// 传统竖排家谱 DOCX 导出。
// 完全由本程序从 JSON 数据自行生成 OOXML（Word）文档，
// 不依赖任何第三方库 / CDN，也不借助任何 HTML→DOCX 的转换软件。

import { store } from "../data/state.js";
import { sortedChildren, genOf } from "../data/queries.js";
import { fmtDate } from "../utils/date.js";
import { download } from "../utils/dom.js";
import { para, run, cell, row, table, buildDocx } from "./ooxml.js";

const MAX_COLS = 7; // 横向 A4 每行最多显示的夫妻列数

/** 竖排文字段落 */
function vPara(text, opts = {}) {
  if (!text) return "";
  const { size = 24, bold = false, color = "3A2E1F" } = opts;
  return para(run(text, { size, bold, color }), { vertical: true, align: "center" });
}

/** 一个人的竖排信息 */
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
  parts.push(vPara(isSpouse ? "妣" : "考", { size: 22, color: "8C5A2B", bold: true }));
  parts.push(vPara("讳" + (name || "佚名"), { size: 32, bold: true }));
  if (zi) parts.push(vPara("字" + zi, { size: 20, color: "7A6A52" }));
  if (bd) parts.push(vPara(bd, { size: 18, color: "7A6A52" }));
  if (note) parts.push(vPara("生平：" + note, { size: 18, color: "7A6A52" }));
  if (desc) parts.push(vPara(desc, { size: 18, color: "7A6A52" }));
  if (tomb) parts.push(vPara("葬" + tomb, { size: 18, color: "7A6A52" }));
  return parts.join("");
}

/** 一对夫妻的单元格 */
function coupleCell(p) {
  const hasSpouse = !!(p.spouse || p.spouseBirth || p.spouseDeath || p.spouseNote || p.spouseZi);
  let inner = personBlock(p, false); // 考（右侧列）
  if (hasSpouse) inner += personBlock(p, true); // 妣（左侧列）
  return cell(inner, { vertical: true, widthPct: 100 / MAX_COLS });
}

/** 把数组按 size 分块 */
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** 构建从某位祖先开始的世代列表 */
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

  const body = [];
  // 封面
  body.push(para(run(title, { size: 72, bold: true, color: "8C5A2B" }), { align: "center" }));
  body.push(para(run(sub, { size: 28, color: "7A6A52" }), { align: "center", spacing: { before: 400 } }));
  body.push(para("", { spacing: { before: 1200 } }));
  body.push(para(run("麟趾百年称祖德", { size: 28, color: "7A6A52" }), { align: "center" }));
  body.push(para(run("螽斯千载念宗功", { size: 28, color: "7A6A52" }), { align: "center" }));
  body.push(para("", { pageBreak: true }));

  // 各支系世系图
  roots.forEach((root) => {
    const gens = buildGenerations(root);
    gens.forEach((gen) => {
      const genLabel = `第${genOf(gen[0])}世`;
      body.push(para(run(genLabel, { size: 36, bold: true, color: "8C5A2B" }), { align: "center" }));
      body.push(para("", { spacing: { before: 200 } }));

      const batches = chunk(gen, MAX_COLS);
      batches.forEach((batch, i) => {
        const cells = batch.map(coupleCell);
        // 首行加跨列表头“第 N 世（第 x 页）”
        if (batches.length > 1) {
          const header = cell(
            para(run(`${genLabel}（第 ${i + 1} / ${batches.length} 行）`, { size: 20, color: "7A6A52" }), { align: "center" }),
            { gridSpan: batch.length, widthPct: 100 }
          );
          body.push(table(row([header], { height: 500 }) + row(cells, { height: 5800 }), { fixed: true }));
        } else {
          body.push(table(row(cells, { height: 5800 }), { fixed: true }));
        }
      });
      body.push(para("", { pageBreak: true }));
    });
  });

  const blob = await buildDocx(body, { top: 567, right: 567, bottom: 567, left: 567 }, { landscape: true });
  download(blob, (title || "jiapu") + "_传统.docx");
}
