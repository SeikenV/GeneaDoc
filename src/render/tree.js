// 树状图渲染：递归构建 DOM 树。
// 展示模式输出墓碑，编辑模式输出家庭卡片；
// 编辑按钮通过 data-action 暴露，由交互层统一委托处理。

import { store } from "../data/state.js";
import { sortedChildren, genOf } from "../data/queries.js";
import { esc, isEditMode } from "../utils/dom.js";
import { renderFamilyCard } from "./card.js";
import { renderTomb } from "./tomb.js";

function makeNode(p, gen) {
  const li = document.createElement("li");
  const node = document.createElement("div");
  node.className = "node";

  const editMode = isEditMode();
  let html;
  if (!editMode) {
    const kaoBi = !!(p.deceased || p.death); // 已故显示考妣，在世不显示
    const loc = p.tombAddr || p.tomb || "";
    html =
      `<div class="tomb"><span class="gen-tag">${genOf(p)}世</span>` +
      `<div class="cols">${renderTomb(p, kaoBi)}</div>` +
      (loc
        ? `<div class="tomb-addr-side"><span class="addr-lab">葬于</span>` +
          (editMode
            ? `<div class="addr-v" contenteditable="true" data-id="${p.id}" data-field="tombAddr">${loc}</div>`
            : `<div class="addr-v">${esc(loc)}</div>`) +
          `</div>`
        : "") +
      `</div>`;
  } else {
    html = renderFamilyCard(p);
  }

  if (editMode) {
    html +=
      `<div class="acts">` +
      `<button data-action="edit" data-id="${p.id}">编辑</button>` +
      `<button data-action="addChild" data-id="${p.id}">加子女</button>` +
      `<button class="del" data-action="delete" data-id="${p.id}">删除</button>` +
      `</div>`;
  }
  node.innerHTML = html;
  li.appendChild(node);

  const kids = sortedChildren(p.id);
  if (kids.length) {
    const ul = document.createElement("ul");
    kids.forEach((c) => ul.appendChild(makeNode(c, gen + 1)));
    li.appendChild(ul);
  }
  return li;
}

/** 渲染整棵树到 #tree，并更新统计文案 */
export function renderTree() {
  const tree = document.getElementById("tree");
  tree.innerHTML = "";
  const roots = store.data.filter((p) => !p.parent);
  const ul = document.createElement("ul");
  roots.forEach((r) => ul.appendChild(makeNode(r, 1)));
  tree.appendChild(ul);

  const gens = new Set();
  store.data.forEach((p) => gens.add(genOf(p)));
  const stat = document.getElementById("stat");
  if (stat)
    stat.textContent =
      `共 ${store.data.length} 人，分 ${gens.size} 世。在每个人下方「加子女」可开新枝；「删除」会连同其子孙一并移除。`;
}
