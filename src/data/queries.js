// 查询与计算层：排序规则、世代数、排行标签等纯函数。
// 依赖 state.js 的数据源，但不直接操作 DOM。

import { store, find, childrenOf } from "./state.js";
import { RANK_NUMS } from "./constants.js";

/** 兄弟排序：女(0)在左、男(1)在右；同性别内按排行降序（长女居右） */
export function sortSiblings(list) {
  return list.slice().sort((a, b) => {
    const ga = a.female ? 0 : 1;
    const gb = b.female ? 0 : 1;
    if (ga !== gb) return ga - gb;
    const oa = a.order ? +a.order : 999;
    const ob = b.order ? +b.order : 999;
    return ob - oa;
  });
}

/** 某成员的所有子节点（已排序） */
export function sortedChildren(id) {
  return sortSiblings(childrenOf(id));
}

/** 计算世代序号（1 起，叠加起始世设置） */
export function genOf(p) {
  let d = 1;
  let c = p;
  while (c.parent && find(c.parent)) {
    d++;
    c = find(c.parent);
  }
  return d - 1 + (store.rootGen || 1);
}

/** 排行文字，如 长子 / 三女 */
export function rankLabel(order, female) {
  const n = +order;
  if (!n || n < 1 || n > 10) return "";
  return RANK_NUMS[n] + (female ? "女" : "子");
}
