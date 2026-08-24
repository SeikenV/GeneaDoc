// 用 docx 库（vendor/docx/index.mjs）验证能生成有内容的家谱 docx。
// 运行：node scripts/test-docx-lib.mjs -> 生成 test-docx-lib.docx 并校验内含文字。
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, TextDirection, WidthType, PageOrientation } from "../vendor/docx/index.mjs";
import { writeFileSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";

function vCell(children) {
  return new TableCell({
    width: { size: 14, type: WidthType.PERCENTAGE },
    textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
    margins: { top: 80, bottom: 80, left: 40, right: 40 },
    children: Array.isArray(children) ? children : [children],
  });
}
function vPara(text, opts = {}) {
  const { size = 24, bold = false, color = "3A2E1F" } = opts;
  return new Paragraph({ textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT, alignment: "center", children: [new TextRun({ text, size, bold, color, font: "SimSun" })] });
}
function personBlock(name, bd, isSpouse) {
  const r = [];
  r.push(vPara(isSpouse ? "妣" : "考", { size: 22, color: "8C5A2B", bold: true }));
  r.push(vPara("讳" + (name || "佚名"), { size: 32, bold: true }));
  if (bd) r.push(vPara(bd, { size: 18, color: "7A6A52" }));
  return r;
}
function coupleCell(p) {
  let inner = personBlock(p.name, "1880 – 1945", false);
  inner = inner.concat(personBlock(p.spouse || "某氏", "1885 – 1950", true));
  return vCell(inner);
}

const people = [
  { name: "陆文诚", spouse: "张氏" },
  { name: "陆文达", spouse: "李氏" },
  { name: "陆文盛", spouse: "王氏" },
  { name: "陆文兴", spouse: "陈氏" },
  { name: "陆文隆", spouse: "刘氏" },
  { name: "陆文安", spouse: "黄氏" },
];
const table = new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: people.map(coupleCell) })] });
const doc = new Document({
  sections: [{
    properties: { page: { size: { orientation: PageOrientation.LANDSCAPE } } },
    children: [
      new Paragraph({ alignment: "center", children: [new TextRun({ text: "陆氏家谱", size: 72, bold: true, color: "8C5A2B", font: "SimSun" })] }),
      new Paragraph({ alignment: "center", children: [new TextRun({ text: "第11世", size: 36, bold: true, color: "8C5A2B", font: "SimSun" })] }),
      table,
    ],
  }],
});
const buf = await Packer.toBuffer(doc);
writeFileSync("test-docx-lib.docx", buf);
console.log("written test-docx-lib.docx, bytes:", buf.length);

// 校验：把 docx 当 zip 解压，确认 document.xml 含示例文字
const tmp = "tmp_docx_extract";
import { mkdirSync, rmSync, copyFileSync } from "node:fs";
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
copyFileSync("test-docx-lib.docx", `${tmp}/a.zip`);
execSync(`powershell -NoProfile Expand-Archive -Force ${tmp}/a.zip ${tmp}/unz`);
const xml = readFileSync(`${tmp}/unz/word/document.xml`, "utf8");
const need = ["陆氏家谱", "第11世", "讳陆文诚", "讳张氏", "1880", "1885"];
const missing = need.filter((s) => !xml.includes(s));
console.log(missing.length ? "MISSING: " + missing.join(", ") : "CONTENT OK: 所有示例文字均写入 document.xml");
rmSync(tmp, { recursive: true, force: true });
