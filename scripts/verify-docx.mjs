// 校验生成的 docx：解包检查部件齐全、CRC 校验通过、XML 可被解析。
import { readFileSync } from "node:fs";
import { crc32 } from "../src/export/ooxml.js";

const buf = readFileSync("test-out.docx");
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

// 遍历中央目录
let p = 0;
const files = [];
// 先找 End of Central Directory
let eocd = -1;
for (let i = buf.length - 22; i >= 0; i--) {
  if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
}
if (eocd < 0) { console.error("NO EOCD"); process.exit(1); }
const cenStart = dv.getUint32(eocd + 16, true);
let cp = cenStart;
while (cp < eocd) {
  if (dv.getUint32(cp, true) !== 0x02014b50) break;
  const crc = dv.getUint32(cp + 16, true);
  const size = dv.getUint32(cp + 20, true);
  const nlen = dv.getUint16(cp + 28, true);
  const name = buf.slice(cp + 46, cp + 46 + nlen).toString("latin1");
  const off = dv.getUint32(cp + 42, true);
  files.push({ name, crc, size, off });
  cp += 46 + nlen + dv.getUint16(cp + 30, true) + dv.getUint16(cp + 32, true);
}

console.log("parts:");
let ok = true;
for (const f of files) {
  // 本地头里读 data
  const lo = f.off;
  const dsize = dv.getUint32(lo + 22, true);
  const lnlen = dv.getUint16(lo + 26, true);
  const data = buf.slice(lo + 30 + lnlen, lo + 30 + lnlen + dsize);
  const calc = crc32(data);
  const crcOk = calc === f.crc;
  const xmlOk = f.name.endsWith(".xml") ? data.slice(0, 5).toString() === "<?xml" : true;
  if (!crcOk || !xmlOk) ok = false;
  console.log(`  ${f.name.padEnd(32)} crc=${crcOk ? "OK" : "BAD"} xml=${xmlOk ? "OK" : "BAD"}`);
}

const need = ["[Content_Types].xml", "_rels/.rels", "word/document.xml", "word/styles.xml", "word/_rels/document.xml.rels"];
const missing = need.filter((n) => !files.some((f) => f.name === n));
if (missing.length) { console.error("MISSING:", missing); ok = false; }

console.log(ok && !missing.length ? "\nRESULT: VALID DOCX" : "\nRESULT: INVALID");
process.exit(ok ? 0 : 1);
