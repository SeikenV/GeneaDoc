// 工具栏与全局交互绑定：展开、模式切换、导入导出、标题编辑、
// 富文本失焦保存、树内按钮（编辑/加子女/删除）事件委托。

import { store, save, resetToDemo, find } from "../data/state.js";
import { DEFAULT_TITLE, DEFAULT_SUB } from "../data/constants.js";
import { renderTree } from "../render/tree.js";
import { initExports } from "../export/exporters.js";
import * as modal from "./modal.js";
import * as editOps from "./editOps.js";

const $ = (id) => document.getElementById(id);

function refresh() {
  renderTree();
}

export function initToolbar() {
  // 展开 / 收起详情
  $("expandBtn").addEventListener("click", () => {
    store.expanded = !store.expanded;
    $("expandBtn").textContent = store.expanded ? "收起详情" : "展开详情";
    renderTree();
  });

  // 编辑模式切换
  $("modeBtn").addEventListener("click", () => {
    const isEditing = document.body.classList.toggle("edit");
    $("modeBtn").textContent = isEditing ? "退出编辑" : "进入编辑";
    renderTree();
  });

  // 起始世
  $("rootGen").addEventListener("change", (e) => {
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    store.rootGen = v;
    e.target.value = v;
    save();
    renderTree();
  });

  // 添加始祖 / 新支
  $("addRoot").addEventListener("click", () => modal.addRoot());

  // 恢复示例
  $("resetDemo").addEventListener("click", () => {
    if (!confirm("将清空当前数据并恢复示例，确定？")) return;
    resetToDemo();
    $("title").textContent = store.title;
    $("subtitle").textContent = store.sub;
    renderTree();
  });

  // 上溯 / 下延一代
  $("genUp").addEventListener("click", () => editOps.goUpOneGeneration());
  $("genDown").addEventListener("click", () => editOps.goDownOneGeneration());

  // 导出
  initExports();

  // 导入 JSON
  $("importJson").addEventListener("change", onImportJson);

  // 标题 / 副标题 可编辑
  $("title").addEventListener("blur", (e) => {
    store.title = e.target.textContent.trim() || DEFAULT_TITLE;
    e.target.textContent = store.title;
    save();
  });
  $("subtitle").addEventListener("blur", (e) => {
    store.sub = e.target.textContent.trim() || DEFAULT_SUB;
    e.target.textContent = store.sub;
    save();
  });

  // 富文本描述失焦保存（contenteditable）
  document.addEventListener("blur", onDescBlur);

  // 树内按钮事件委托（编辑 / 加子女 / 删除）
  $("tree").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "edit") modal.editExisting(id);
    else if (action === "addChild") modal.addChild(id);
    else if (action === "delete") editOps.deleteMember(id);
  });
}

function onDescBlur(e) {
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains("desc")) return;
  const p = find(t.getAttribute("data-id"));
  if (!p) return;
  const f = t.getAttribute("data-field");
  if (f === "tombAddr") p.tombAddr = t.innerHTML;
  else if (t.getAttribute("data-spouse")) p.spouseDesc = t.innerHTML;
  else p.desc = t.innerHTML;
  save();
}

function onImportJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const s = JSON.parse(r.result);
      if (!s.data || !Array.isArray(s.data)) throw 0;
      store.title = s.title || DEFAULT_TITLE;
      store.sub = s.sub || DEFAULT_SUB;
      store.data = s.data;
      store.rootGen = s.rootGen || 1;
      save();
      $("title").textContent = store.title;
      $("subtitle").textContent = store.sub;
      renderTree();
      alert("导入成功");
    } catch (_) {
      alert("文件格式不正确");
    }
  };
  r.readAsText(file);
  e.target.value = "";
}
