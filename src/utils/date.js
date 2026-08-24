// 历法与日期工具：生卒年月解析、格式化、干支/农历换算。
// 生卒字符串格式："年" / "年-月" / "年-月-日"，精度由是否有月、日决定。

import { GAN, ZHI, ANIMALS, REIGNS } from "../data/constants.js";

const YEAR_RE = /(\d{1,4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?/;

/** 仅取年份（兼容旧数据只存年份的情况） */
export function parseYear(s) {
  if (s == null) return null;
  const m = String(s).match(/\d{1,4}/);
  if (!m) return null;
  const y = parseInt(m[0], 10);
  return y >= 1 && y <= 3000 ? y : null;
}

/** 解析为 {y, m, d}，m/d 可能为 null（精度不足） */
export function parseDate(s) {
  if (s == null) return null;
  const m = String(s).match(YEAR_RE);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  if (!(y >= 1 && y <= 3000)) return null;
  const mo = m[2] != null ? parseInt(m[2], 10) : null;
  const d = m[3] != null ? parseInt(m[3], 10) : null;
  return { y, m: mo, d };
}

/** 格式化为「1925年3月15日」这类中文，按精度省略月/日 */
export function fmtDate(s) {
  const p = parseDate(s);
  if (!p) return "";
  let t = String(p.y);
  if (p.m != null) {
    t += "年" + String(p.m) + "月";
    if (p.d != null) t += String(p.d) + "日";
  }
  return t;
}

/** 由 年/月/日 输入框值拼回存储字符串 */
export function joinDate(y, m, d) {
  y = y != null && y !== "" ? String(y).trim() : "";
  if (!y) return "";
  let t = y;
  if (m != null && m !== "") {
    t += "-" + String(m).padStart(2, "0");
    if (d != null && d !== "") t += "-" + String(d).padStart(2, "0");
  }
  return t;
}

/** 干支 + 生肖，如「甲子年（鼠）」 */
export function ganzhi(y) {
  const g = ((y - 4) % 10 + 10) % 10;
  const z = ((y - 4) % 12 + 12) % 12;
  return GAN[g] + ZHI[z] + "年（" + ANIMALS[z] + "）";
}

/** 年份详细：{gz, era}，era 为封建纪年（民国及以后为空） */
export function yearDetail(s) {
  const y = parseYear(s);
  if (y == null) return null;
  const gz = ganzhi(y);
  let era = "";
  if (y <= 1911) {
    for (const [n, s, e] of REIGNS) {
      if (y >= s && y <= e) {
        era = n + " " + (y - s + 1) + "年";
        break;
      }
    }
  }
  return { gz, era };
}
