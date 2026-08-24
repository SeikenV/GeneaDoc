// 全局状态与持久化层
// 负责：从 localStorage 读取/写入、维护 app 状态、提供成员 CRUD。
// 所有数据访问都应经过本模块，避免散落各处的直接操作。

import { LS_KEY, DEMO, DEFAULT_TITLE, DEFAULT_SUB } from "./constants.js";

const listeners = new Set();

export const store = {
  title: DEFAULT_TITLE,
  sub: DEFAULT_SUB,
  data: [],
  rootGen: 1,
  // UI 状态（非持久化）
  expanded: false,
  showSpouse: true,
};

function freshDemo() {
  return {
    title: DEFAULT_TITLE,
    sub: DEFAULT_SUB,
    data: JSON.parse(JSON.stringify(DEMO)),
    rootGen: 1,
  };
}

export function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY));
    if (saved && Array.isArray(saved.data)) {
      store.title = saved.title || DEFAULT_TITLE;
      store.sub = saved.sub || DEFAULT_SUB;
      store.data = saved.data;
      store.rootGen = saved.rootGen || 1;
      return;
    }
  } catch (_) {
    /* 解析失败则回退示例 */
  }
  const d = freshDemo();
  Object.assign(store, d);
}

export function save() {
  localStorage.setItem(
    LS_KEY,
    JSON.stringify({ title: store.title, sub: store.sub, data: store.data, rootGen: store.rootGen })
  );
  const el = document.getElementById("saveState");
  if (el) {
    el.textContent = "已保存 · " + new Date().toLocaleTimeString();
    el.classList.remove("warn");
  }
}

export function resetToDemo() {
  Object.assign(store, freshDemo());
  save();
}

/** 订阅状态变更（用于需要联动刷新的场景） */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  listeners.forEach((fn) => fn());
}

/* ===== 成员 CRUD ===== */

export function find(id) {
  return store.data.find((p) => p.id === id);
}

export function childrenOf(id) {
  return store.data.filter((p) => p.parent === id);
}

export function isLeaf(p) {
  return !childrenOf(p.id).length;
}

export function maxId() {
  let m = 0;
  store.data.forEach((p) => {
    const n = parseInt(p.id, 10);
    if (!isNaN(n) && n > m) m = n;
  });
  return m;
}

export function addMember(obj) {
  const id = String(maxId() + 1);
  const full = { id, ...obj };
  store.data.push(full);
  save();
  return full;
}

export function updateMember(id, patch) {
  const p = find(id);
  if (p) Object.assign(p, patch);
  save();
  return p;
}

export function removeMember(id) {
  // 递归删除子孙
  function kill(pid) {
    childrenOf(pid).forEach((c) => kill(c.id));
    store.data = store.data.filter((p) => p.id !== pid);
  }
  kill(id);
  save();
}

/** 为所有无父节点者指定共同祖先（上溯一代） */
export function prependAncestor() {
  const id = String(maxId() + 1);
  store.data.forEach((p) => {
    if (!p.parent) p.parent = id;
  });
  store.data.push({ id, name: "", parent: null });
  save();
  return id;
}

/** 为所有末代成员各添一名子女（下延一代） */
export function appendGeneration() {
  const leaves = store.data.filter(isLeaf);
  leaves.forEach((l) => {
    store.data.push({ id: String(maxId() + 1), name: "", parent: l.id });
  });
  save();
}
