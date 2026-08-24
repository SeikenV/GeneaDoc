// 应用入口：加载数据、初始化各模块、首次渲染。
// 模块依赖关系在此清晰可见，便于维护与扩展。

import { load, store } from "./data/state.js";
import { renderTree } from "./render/tree.js";
import { initModal } from "./interaction/modal.js";
import { initEditOps } from "./interaction/editOps.js";
import { initToolbar } from "./interaction/toolbar.js";

function boot() {
  // 1. 读取持久化数据
  load();

  // 2. 初始化标题 / 副标题 / 起始世显示
  document.getElementById("title").textContent = store.title;
  document.getElementById("subtitle").textContent = store.sub;
  document.getElementById("rootGen").value = store.rootGen || 1;

  // 3. 初始化交互层（各模块统一通过 refresh 回调刷新视图）
  const refresh = () => renderTree();
  initModal(refresh);
  initEditOps(refresh);
  initToolbar(); // toolbar 内部会再初始化导出

  // 4. 首次渲染
  renderTree();
}

boot();
