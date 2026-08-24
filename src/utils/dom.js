// DOM 与通用工具：HTML 转义、文件下载、标签构建辅助。

const ESC_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };

/** 转义 HTML 特殊字符，避免 XSS 与结构破坏 */
export function esc(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) => ESC_MAP[c]);
}

/** 去除 HTML 标签（用于富文本导出前清洗） */
export function stripTags(s) {
  return (s || "").replace(/<[^>]+>/g, "");
}

/** 触发浏览器下载 */
export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** 当前是否处于编辑模式 */
export function isEditMode() {
  return document.body.classList.contains("edit");
}
