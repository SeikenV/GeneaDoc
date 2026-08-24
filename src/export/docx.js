// DOCX 导出：把家谱拼成一份 HTML，再由 html-docx-js 转 blob。
// 标题单独一页，每页两代人，子女过多自动分页。

import { store } from "../data/state.js";
import { sortedChildren, genOf, rankLabel } from "../data/queries.js";
import { fmtDate, yearDetail } from "../utils/date.js";
import { esc, stripTags, download } from "../utils/dom.js";

const MAX_PER_PAGE = 5;

function personHtml(p, isSpouse) {
  const r = isSpouse
    ? { name: p.spouse, birth: p.spouseBirth, death: p.spouseDeath, desc: p.spouseDesc }
    : { name: p.name, birth: p.birth, death: p.death, desc: p.desc };
  let h = "";
  if (!isSpouse && p.order) h += `<div class="sub">${esc(rankLabel(p.order, !!p.female))}</div>`;
  h += `<div class="nm">${esc(r.name || "（佚名）")}</div>`;
  if (!isSpouse && p.zi) h += `<div class="sub">字 ${esc(p.zi)}</div>`;
  if (isSpouse && p.spouseZi) h += `<div class="sub">字 ${esc(p.spouseZi)}</div>`;
  if (r.birth || r.death)
    h += `<div class="sub">公历 ${esc(fmtDate(r.birth))}${r.birth && r.death ? " – " : ""}${esc(fmtDate(r.death))}</div>`;
  const b = yearDetail(r.birth);
  const d = yearDetail(r.death);
  if (b) h += `<div class="sub">农历 ${b.gz}${b.era ? " / " + b.era : ""}</div>`;
  if (d) h += `<div class="sub">农历 ${d.gz}${d.era ? " / " + d.era : ""}</div>`;
  if (!isSpouse && p.note) h += `<div class="sub">${esc(p.note)}</div>`;
  if (isSpouse && p.spouseNote) h += `<div class="sub">${esc(p.spouseNote)}</div>`;
  if (!isSpouse && p.tomb) h += `<div class="sub">墓：${esc(p.tomb)}</div>`;
  if (!isSpouse && p.tombAddr) h += `<div class="sub">葬于 ${esc(stripTags(p.tombAddr))}</div>`;
  const desc = stripTags(r.desc);
  if (desc) h += `<div class="sub">${esc(desc)}</div>`;
  return h;
}

function buildDocxHtml() {
  let html =
    `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@page{size:A4;margin:2cm;}
body{font-family:"SimSun","Songti SC",serif;font-size:12pt;color:#3a2e1f;}
.tp{text-align:center;page-break-after:always;}
.tp h1{font-size:36pt;margin-top:25%;letter-spacing:8pt;color:#8c5a2b;}
.tp p{font-size:14pt;color:#7a6a52;}
.family{page-break-before:always;}
.gh{font-size:14pt;font-weight:bold;text-align:center;border-bottom:1.5pt solid #8c5a2b;padding-bottom:4pt;margin-bottom:8pt;}
table{width:100%;border-collapse:collapse;margin-bottom:8pt;}
td{border:1px solid #b0a080;padding:5pt;font-size:10pt;vertical-align:top;}
.pc{background:#f5f0e0;}
.cc{text-align:center;}
.nm{font-size:13pt;font-weight:bold;margin-bottom:2pt;}
.sub{font-size:9pt;color:#7a6a52;margin-bottom:1pt;}
</style></head><body>`;

  html += `<div class="tp"><h1>${esc(store.title)}</h1><p>${esc(store.sub)}</p></div>`;

  function walk(person) {
    const kids = sortedChildren(person.id);
    if (!kids.length) return;
    const gen = genOf(person);
    const batches = [];
    for (let i = 0; i < kids.length; i += MAX_PER_PAGE) batches.push(kids.slice(i, i + MAX_PER_PAGE));
    batches.forEach((batch, bi) => {
      html += `<div class="family">`;
      html += `<div class="gh">第${gen}世 → 第${gen + 1}世${batches.length > 1 ? `（${bi + 1}/${batches.length}）` : ""}</div>`;
      html += `<table><tr>`;
      html += `<td class="pc" style="width:50%">${personHtml(person, false)}</td>`;
      html += `<td style="width:50%">${person.spouse ? personHtml(person, true) : "&nbsp;"}</td>`;
      html += `</tr></table>`;
      html += `<table><tr>`;
      batch.forEach((kid) => {
        html += `<td class="cc">${personHtml(kid, false)}</td>`;
      });
      html += `</tr></table>`;
      html += `</div>`;
    });
    kids.forEach(walk);
  }

  store.data.filter((p) => !p.parent).forEach(walk);
  html += `</body></html>`;
  return html;
}

/** 加载 html-docx-js（CDN），完成后回调 */
function loadHtmlDocx(cb) {
  if (window.htmlDocx) {
    cb();
    return;
  }
  const s = document.createElement("script");
  s.src = "https://cdn.jsdelivr.net/npm/html-docx-js@0.3.1/dist/html-docx.js";
  s.onload = cb;
  s.onerror = () => alert("无法加载 DOCX 库，请检查网络后重试");
  document.head.appendChild(s);
}

export function exportDocx() {
  loadHtmlDocx(() => {
    const html = buildDocxHtml();
    const blob = window.htmlDocx.asBlob(html, {
      orientation: "portrait",
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
    });
    download(blob, (store.title || "jiapu") + ".docx");
  });
}
