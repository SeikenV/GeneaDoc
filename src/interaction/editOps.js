// 成员操作：删除（级联）、上溯一代、下延一代。
// 这些操作会修改 store 并触发刷新回调。

import { store, find, removeMember, prependAncestor, appendGeneration, childrenOf } from "../data/state.js";
import { editExisting } from "./modal.js";

let onChange = () => {};

export function deleteMember(id) {
  const kids = childrenOf(id).length;
  const nm = find(id).name;
  let msg = `确定删除「${nm}」吗？`;
  if (kids) msg += `其下 ${kids} 名子孙也会一并删除。`;
  if (!confirm(msg)) return;
  removeMember(id);
  onChange();
}

export function goUpOneGeneration() {
  const id =   prependAncestor();
  onChange();
  // 编辑新创建的祖先
  editExisting(id);
}

export function goDownOneGeneration() {
  const leaves = store.data.filter((p) => !childrenOf(p.id).length);
  if (!leaves.length) return;
  if (!confirm(`将为 ${leaves.length} 位末代成员各添加一名子女，确定？`)) return;
  appendGeneration();
  onChange();
}

export function initEditOps(changeCallback) {
  onChange = changeCallback || (() => {});
}
