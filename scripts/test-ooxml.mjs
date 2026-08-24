// 验证 OOXML 生成 + ZIP 打包逻辑（仅 Node，不依赖浏览器）。
// 运行：node scripts/test-ooxml.mjs
// 产物：test-out.docx，可用 Word/WPS 打开。

import { run, para, cell, row, table, buildDocx, x } from "../src/export/ooxml.js";
import { writeFileSync } from "node:fs";

const body = [];
body.push(para(run("某氏家谱", { size: 72, bold: true, color: "8C5A2B" }), { align: "center" }));
body.push(para(run("— 世代源流图 —", { size: 28 }), { align: "center" }));
body.push(para("", { pageBreak: true }));

// 一张竖排世系表样例
let inner = para(run("第1世", { size: 20, color: "8C5A2B", bold: true }), { vertical: true, align: "center" });
inner += para(run("考", { size: 22, color: "8C5A2B", bold: true }), { vertical: true, align: "center" });
inner += para(run("讳张始祖", { size: 34, bold: true }), { vertical: true, align: "center" });
inner += para(run("字某某", { size: 20, color: "7A6A52" }), { vertical: true, align: "center" });
inner += para(run("1825 – 1890", { size: 18, color: "7A6A52" }), { vertical: true, align: "center" });
const c1 = cell(inner, { vertical: true, widthPct: 50, top: true, bottom: false });

let inner2 = para(run("第2世", { size: 20, color: "8C5A2B", bold: true }), { vertical: true, align: "center" });
inner2 += para(run("考", { size: 22, color: "8C5A2B", bold: true }), { vertical: true, align: "center" });
inner2 += para(run("讳张长房", { size: 34, bold: true }), { vertical: true, align: "center" });
inner2 += para(run("1855 – 1912", { size: 18, color: "7A6A52" }), { vertical: true, align: "center" });
const c2 = cell(inner2, { vertical: true, widthPct: 50, top: false, bottom: true });

body.push(table(row([c1, c2], { height: 5000 }), { fixed: true }));

const blob = await buildDocx(body, { top: 720, right: 720, bottom: 720, left: 720 });
const buf = Buffer.from(await blob.arrayBuffer());
writeFileSync("test-out.docx", buf);

const head = buf.slice(0, 4).toString("latin1");
console.log("magic:", head === "PK\u0003\u0004" ? "OK (PK)" : "BAD -> " + head);
console.log("size:", buf.length, "bytes");
console.info("XML escape test:", x('&<>"'));
console.log("written: test-out.docx");
