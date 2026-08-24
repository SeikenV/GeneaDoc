// 展示模式下的「仿墓碑」渲染：本人（考/妣）+ 配偶。

import { store } from "../data/state.js";
import { rankLabel } from "../data/queries.js";
import { fmtDate, yearDetail } from "../utils/date.js";
import { esc, isEditMode } from "../utils/dom.js";

function col(lab, name, birth, death, descTxt, sp, rank, zi, note) {
  if (!name && !birth && !death && !note) return "";
  let h = `<div class="col"><div class="lab">${lab}</div>` + `<div class="nm">${esc(name || "（佚名）")}</div>`;
  if (rank) h += `<div class="rank">${esc(rank)}</div>`;
  if (zi) h += `<div class="zi">字 ${esc(zi)}</div>`;

  if (store.expanded && (birth || death))
    h += `<div class="life">公历 ${esc(fmtDate(birth))}${birth && death ? " – " : ""}${esc(fmtDate(death))}</div>`;
  if (store.expanded && note) h += `<div class="life2">生平：${esc(note)}</div>`;

  if (store.expanded) {
    const b = yearDetail(birth);
    const d = yearDetail(death);
    if (b) h += `<div class="life2">生·农历：${b.gz}${b.era ? "<br>生·封建历：" + b.era : ""}</div>`;
    if (d) h += `<div class="life2">卒·农历：${d.gz}${d.era ? "<br>卒·封建历：" + d.era : ""}</div>`;
    const ds = sp ? ' data-spouse="1"' : "";
    const dv = descTxt || "";
    if (isEditMode())
      h += `<div class="desc" contenteditable="true" data-id="${store._curId}"${ds}>${dv}</div>`;
    else if (dv) h += `<div class="desc">${dv}</div>`;
  }
  h += `</div>`;
  return h;
}

/**
 * 渲染墓碑内容。
 * @param {object} p 成员
 * @param {boolean} kaoBi 是否显示考妣（本人已故时为真）
 */
export function renderTomb(p, kaoBi) {
  store._curId = p.id; // 供 col 内 contenteditable 的 data-id 使用
  const female = !!p.female;
  const sN = p.spouse || "";
  const sB = p.spouseBirth || "";
  const sD = p.spouseDeath || "";
  const sDesc = p.spouseDesc || "";
  const sZi = p.spouseZi || "";
  const sNote = p.spouseNote || "";
  const rank = p.order ? rankLabel(p.order, female) : "";

  let html = "";
  if (female) {
    // 女方为锚点，配偶为上门女婿：本人(妣)居左，配偶(考)居右
    const labP = kaoBi ? "妣" : "";
    const labS = kaoBi ? "考" : "";
    html += col(labP, p.name, p.birth, p.death, p.desc, false, rank, p.zi, p.note);
    if (sN || sB || sD || sDesc || sNote) html += col(labS, sN, sB, sD, sDesc, true, "", sZi, sNote);
  } else {
    // 男方为锚点：配偶(妣)居左，本人(考)居右
    const labP = kaoBi ? "考" : "";
    const labS = kaoBi ? "妣" : "";
    if (sN || sB || sD || sDesc || sNote) html += col(labS, sN, sB, sD, sDesc, true, "", sZi, sNote);
    html += col(labP, p.name, p.birth, p.death, p.desc, false, rank, p.zi, p.note);
  }
  return html;
}
