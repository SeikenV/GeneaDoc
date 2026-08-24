// 验证 OOXML 生成 + ZIP 打包逻辑（仅 Node，不依赖浏览器）。
// 运行：node scripts/test-ooxml.mjs
// 产物：test-out.docx，可用 Word/WPS 打开。

import { run, para, cell, row, table, buildDocx, x } from "../src/export/ooxml.js";
import { writeFileSync } from "node:fs";

const body = [];
body.push(para(run("某氏家谱", { size: 72, bold: true, color: "8C5A2B" }), { align: "center" }));
body.push(para(run("— 世代源流图 —", { size: 28 }), { align: "center" }));
body.push(para("", { pageBreak: true }));

// 模拟第11世：9人分两行，每格夫妻双列竖排
body.push(para(run("第11世", { size: 36, bold: true, color: "8C5A2B" }), { align: "center" }));

function couple(name, wife) {
  let inner = para(run("考", { size: 22, color: "8C5A2B", bold: true }), { vertical: true, align: "center" });
  inner += para(run("讳" + name, { size: 32, bold: true }), { vertical: true, align: "center" });
  inner += para(run("1880 – 1945", { size: 18, color: "7A6A52" }), { vertical: true, align: "center" });
  inner += para(run("生平：务农为本", { size: 18, color: "7A6A52" }), { vertical: true, align: "center" });
  inner += para(run("妣", { size: 22, color: "8C5A2B", bold: true }), { vertical: true, align: "center" });
  inner += para(run("讳" + wife, { size: 30, bold: true }), { vertical: true, align: "center" });
  inner += para(run("1885 – 1950", { size: 18, color: "7A6A52" }), { vertical: true, align: "center" });
  return cell(inner, { vertical: true, widthPct: 100 / 7 });
}

const row1 = [couple("陆文诚", "张氏"), couple("陆文达", "李氏"), couple("陆文盛", "王氏"), couple("陆文兴", "陈氏"), couple("陆文隆", "刘氏"), couple("陆文安", "黄氏"), couple("陆文富", "赵氏")];
const row2 = [couple("陆文贵", "周氏"), couple("陆文保", "吴氏")];
body.push(table(row(row1, { height: 5800 }) + row(row2, { height: 5800 }), { fixed: true }));

const blob = await buildDocx(body, { top: 567, right: 567, bottom: 567, left: 567 }, { landscape: true });
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("test-out.docx", buf);

const head = buf.slice(0, 4).toString("latin1");
console.log("magic:", head === "PK\u0003\u0004" ? "OK (PK)" : "BAD -> " + head);
console.log("size:", buf.length, "bytes");
console.info("XML escape test:", x('&<>"'));
console.log("written: test-out.docx");
