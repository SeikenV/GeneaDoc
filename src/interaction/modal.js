// 编辑弹窗交互：打开（填充）、保存、关闭。
// 不直接渲染树，保存/删除后通过 onChange 回调通知外部刷新。

import { store, find, addMember, updateMember } from "../data/state.js";
import { parseDate, joinDate } from "../utils/date.js";
import { RANK_NUMS } from "../data/constants.js";

let editing = null; // 当前编辑的成员对象，null 表示新增
let pendingParent = null;
let onChange = () => {};

const $ = (id) => document.getElementById(id);

/** 排行下拉标签随性别切换 子/女 */
function rankLabel(order, female) {
  const n = +order;
  if (!n || n < 1 || n > 10) return "";
  return RANK_NUMS[n] + (female ? "女" : "子");
}
function syncOrderLabels() {
  const female = $("f_female").checked;
  const sel = $("f_order");
  Array.from(sel.options).forEach((o) => {
    const v = o.value;
    o.textContent = v === "" ? "（空）" : rankLabel(v, female);
  });
}

function fillDate(prefix, value) {
  const p = value ? parseDate(value) : null;
  $(prefix + "_y").value = p ? p.y : "";
  $(prefix + "_m").value = p && p.m != null ? p.m : "";
  $(prefix + "_d").value = p && p.d != null ? p.d : "";
}

export function openModal(p, parentId) {
  editing = p || null;
  pendingParent = parentId || null;
  $("modalTitle").textContent = p ? "编辑成员" : "新增成员";
  $("f_name").value = p ? p.name || "" : "";
  $("f_zi").value = p ? p.zi || "" : "";
  fillDate("f_birth", p ? p.birth : "");
  fillDate("f_death", p ? p.death : "");
  $("f_spouse").value = p ? p.spouse || "" : "";
  fillDate("f_sb", p ? p.spouseBirth : "");
  fillDate("f_sd", p ? p.spouseDeath : "");
  $("f_szi").value = p ? p.spouseZi || "" : "";
  $("f_note").value = p ? p.note || "" : "";
  $("f_snote").value = p ? p.spouseNote || "" : "";
  $("f_order").value = p ? p.order || "" : "";
  $("f_tomb").value = p ? p.tomb || "" : "";
  $("f_deceased").checked = !!(p && p.deceased);
  $("f_female").checked = !!(p && p.female);
  syncOrderLabels();
  $("overlay").classList.add("show");
  $("f_name").focus();
}

export function closeModal() {
  $("overlay").classList.remove("show");
  editing = null;
}

export function saveModal() {
  const name = $("f_name").value.trim();
  if (!name) {
    alert("姓名不能为空"); // 姓名，必填，否则报错
    return;
  }
  const obj = {
    name,
    zi: $("f_zi").value.trim(),
    birth: joinDate($("f_birth_y").value, $("f_birth_m").value, $("f_birth_d").value),
    death: joinDate($("f_death_y").value, $("f_death_m").value, $("f_death_d").value),
    spouse: $("f_spouse").value.trim(),
    spouseBirth: joinDate($("f_sb_y").value, $("f_sb_m").value, $("f_sb_d").value),
    spouseDeath: joinDate($("f_sd_y").value, $("f_sd_m").value, $("f_sd_d").value),
    spouseZi: $("f_szi").value.trim(),
    note: $("f_note").value.trim(),
    spouseNote: $("f_snote").value.trim(),
    tomb: $("f_tomb").value.trim(),
    deceased: $("f_deceased").checked,
    female: $("f_female").checked,
    order: $("f_order").value || "",
  };
  if (editing) {
    updateMember(editing.id, obj);
  } else {
    const created = addMember({ ...obj, parent: pendingParent });
    editing = created;
  }
  closeModal();
  onChange();
}

export function initModal(changeCallback) {
  onChange = changeCallback || (() => {});
  $("saveBtn").addEventListener("click", saveModal);
  $("cancelBtn").addEventListener("click", closeModal);
  $("overlay").addEventListener("click", (e) => {
    if (e.target.id === "overlay") closeModal();
  });
  $("f_female").addEventListener("change", syncOrderLabels);
}

/** 供外部（编辑按钮等）复用的便捷方法 */
export function editExisting(id) {
  openModal(find(id), null);
}
export function addChild(parentId) {
  openModal(null, parentId);
}
export function addRoot() {
  openModal(null, null);
}
