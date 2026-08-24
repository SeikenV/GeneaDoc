// 编辑模式下的「家庭卡片」渲染：本人 +（可选）配偶。
// 输出单个 .person 的 HTML 片段。

import { store } from "../data/state.js";
import { rankLabel, genOf } from "../data/queries.js";
import { fmtDate, yearDetail } from "../utils/date.js";
import { esc, isEditMode } from "../utils/dom.js";

function personCard(p, isSpouse) {
  const rec = isSpouse
    ? { name: p.spouse, birth: p.spouseBirth, death: p.spouseDeath, desc: p.spouseDesc }
    : p;
  let html = "";
  if (!isSpouse) html += `<span class="gen-tag">${genOf(p)}世</span>`;
  html += `<div class="nm">${esc(rec.name || "（佚名）")}</div>`;
  if (!isSpouse && p.order) html += `<div class="rank">${esc(rankLabel(p.order, !!p.female))}</div>`;
  if (!isSpouse && p.zi) html += `<div class="zi">字 ${esc(p.zi)}</div>`;
  if (isSpouse && p.spouseZi) html += `<div class="zi">字 ${esc(p.spouseZi)}</div>`;

  if (store.expanded && (rec.birth || rec.death)) {
    const bs = fmtDate(rec.birth);
    const ds = fmtDate(rec.death);
    html += `<div class="life">公历 ${esc(bs)}${bs && ds ? " – " : ""}${esc(ds)}</div>`;
  }
  if (store.expanded && !isSpouse && p.note) html += `<div class="life2">生平：${esc(p.note)}</div>`;
  if (store.expanded && isSpouse && p.spouseNote) html += `<div class="life2">生平：${esc(p.spouseNote)}</div>`;

  if (store.expanded) {
    const b = yearDetail(rec.birth);
    const d = yearDetail(rec.death);
    if (b) html += `<div class="life2">生·农历：${b.gz}${b.era ? "<br>生·封建历：" + b.era : ""}</div>`;
    if (d) html += `<div class="life2">卒·农历：${d.gz}${d.era ? "<br>卒·封建历：" + d.era : ""}</div>`;
    const desc = rec.desc || "";
    const ds = isSpouse ? ' data-spouse="1"' : "";
    if (isEditMode())
      html += `<div class="desc" contenteditable="true" data-id="${p.id}"${ds}>${desc}</div>`;
    else if (desc) html += `<div class="desc">${desc}</div>`;
  }
  return `<div class="person">${html}</div>`;
}

/** 渲染一个家庭的完整卡片（本人 + 配偶） */
export function renderFamilyCard(p) {
  let inner = personCard(p, false);
  if (store.showSpouse && p.spouse) inner += personCard(p, true);
  return `<div class="family"><div class="pair">${inner}</div></div>`;
}
