// 极简 OOXML（Word .docx）生成器：纯 JS，无外部依赖，不借助任何转换软件。
// docx 本质是一个 ZIP 包（[Content_Types].xml + _rels + word/ 下的 XML）。
// 这里用浏览器内置 API 生成 ZIP（store 压缩，无需第三方 zip 库）。

/** XML 转义 */
export function x(s) {
  return (s == null ? "" : String(s)).replace(/[&<>"]/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[c]));
}

// ===== 基础构建块 =====

/** 一段文字（run） */
export function run(text, opts = {}) {
  const {
    size = 24, // 半磅（half-point），24 = 12pt
    bold = false,
    color = "3A2E1F",
    font = "SimSun",
  } = opts;
  return `<w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:rFonts w:ascii="${font}" w:eastAsia="${font}" w:hAnsi="${font}"/></w:rPr><w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}

/**
 * 段落（paragraph）。
 * opts.vertical=true 时使用竖排文字方向（从上到下、从右到左）。
 * opts.align: "center" | "left" | "right" | "both"
 */
export function para(children, opts = {}) {
  const { vertical = false, align = "left", spacing = {}, pageBreak = false } = opts;
  const AL = { left: "left", center: "center", right: "right", both: "both" };
  const sp = Object.entries(spacing)
    .map(([k, v]) => `<w:${k} w:val="${v}"/>`)
    .join("");
  return `<w:p><w:pPr>${
    vertical ? '<w:textDirection w:val="tbRl"/>' : ""
  }<w:jc w:val="${AL[align] || "left"}"/>${
    pageBreak ? "<w:pageBreakBefore/>" : ""
  }${sp ? `<w:spacing ${sp}/>` : ""}</w:pPr>${children}</w:p>`;
}

/** 空段落（占位 / 撑高） */
export function spacer(before = 200, after = 0) {
  return para("", { spacing: { before, after } });
}

// ===== 表格（用于竖排世系图） =====

/** 单元格。children: OOXML 片段字符串 */
export function cell(children, opts = {}) {
  const {
    widthPct = null,
    gridSpan = null,
    vertical = false,
    valign = "center",
    borders = true,
    top = false,
    bottom = false,
    margin = 80,
  } = opts;
  // 边框：默认全部细边框；或仅上下
  let b;
  if (!borders) {
    b = `<w:tcBorders>
      <w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/>
      <w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tcBorders>`;
  } else if (top || bottom) {
    const t = top ? '<w:top w:val="single" w:sz="6" w:color="8C5A2B" w:space="1"/>' : '<w:top w:val="nil"/>';
    const bo = bottom ? '<w:bottom w:val="single" w:sz="6" w:color="8C5A2B" w:space="1"/>' : '<w:bottom w:val="nil"/>';
    b = `<w:tcBorders>${t}<w:left w:val="nil"/>${bo}<w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tcBorders>`;
  } else {
    b = `<w:tcBorders>
      <w:top w:val="single" w:sz="4" w:color="B0A080" w:space="1"/>
      <w:left w:val="single" w:sz="4" w:color="B0A080" w:space="1"/>
      <w:bottom w:val="single" w:sz="4" w:color="B0A080" w:space="1"/>
      <w:right w:val="single" w:sz="4" w:color="B0A080" w:space="1"/>
      <w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tcBorders>`;
  }
  const w = widthPct != null ? `<w:tcW w:w="${Math.round(widthPct * 50)}" w:type="pct"/>` : "";
  const gs = gridSpan != null ? `<w:gridSpan w:val="${gridSpan}"/>` : "";
  const vd = vertical ? '<w:textDirection w:val="tbRl"/>' : "";
  return `<w:tc><w:tcPr>${w}${gs}${vd}<w:vAlign w:val="${valign}"/>${b}<w:tcMar><w:top w:w="${margin}" w:type="dxa"/><w:left w:w="${margin}" w:type="dxa"/><w:bottom w:w="${margin}" w:type="dxa"/><w:right w:w="${margin}" w:type="dxa"/></w:tcMar></w:tcPr>${children}</w:tc>`;
}

/** 一行 */
export function row(cells, opts = {}) {
  const { height = 4500 } = opts;
  return `<w:tr><w:trPr><w:trHeight w:val="${height}" w:hRule="atLeast"/></w:trPr>${cells}</w:tr>`;
}

/** 表格 */
export function table(rows, opts = {}) {
  const { fixed = true } = opts;
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${
    fixed ? '<w:tblLayout w:type="fixed"/>' : ""
  }<w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="40" w:type="dxa"/><w:bottom w:w="20" w:type="dxa"/><w:right w:w="40" w:type="dxa"/></w:tblCellMar></w:tblPr>${rows}</w:tbl>`;
}

// ===== ZIP 打包（store 压缩） =====

export function crc32(buf) {
  const POLY = 0xedb88320 >>> 0;
  let c = 0xffffffff >>> 0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (POLY & -(c & 1));
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

/** 把文件名->UTF8 字符串的 map 打包成 .docx（Blob）。 */
export async function packageDocx(files) {
  const enc = new TextEncoder();
  const entries = Object.entries(files).map(([name, content]) => ({
    name,
    data: enc.encode(content),
  }));

  // 估算总大小，构建本地文件头 + 中央目录
  const chunks = [];
  const central = [];
  let offset = 0;

  function pushChunk(u8) {
    chunks.push(u8);
    offset += u8.length;
  }

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const local = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(local.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true); // version needed
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // method = store
    dv.setUint16(10, 0, true); // time
    dv.setUint16(12, 0, true); // date
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);
    dv.setUint32(22, size, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    const startOffset = offset;
    pushChunk(local);
    pushChunk(e.data);

    const cen = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cen.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true); // version made by
    cdv.setUint16(6, 20, true); // version needed
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true); // method
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(42, startOffset, true);
    cen.set(nameBytes, 46);
    central.push(cen);
  }

  const cenStart = offset;
  let cenSize = 0;
  central.forEach((c) => {
    chunks.push(c);
    cenSize += c.length;
  });

  const end = new Uint8Array(22);
  const edv = new DataView(end.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, entries.length, true);
  edv.setUint16(10, entries.length, true);
  edv.setUint32(12, cenSize, true);
  edv.setUint32(16, cenStart, true);
  edv.setUint16(20, 0, true);
  chunks.push(end);

  return new Blob(chunks, { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

// ===== 文档骨架 =====

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="SimSun" w:eastAsia="SimSun" w:hAnsi="SimSun"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>`;

function docRels() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

/**
 * 组装最终文档。
 * @param {string[]} bodyParts OOXML 正文片段（段落 / 表格）
 * @param {{top?:number,right?:number,bottom?:number,left?:number}} pageMargin 页边距（dxa, 1/1440 英寸）
 * @param {{landscape?:boolean}} page 页面方向
 */
export async function buildDocx(bodyParts, pageMargin = { top: 1440, right: 1440, bottom: 1440, left: 1440 }, page = {}) {
  const m = pageMargin;
  const mAttrs = `w:top="${m.top ?? 1440}" w:right="${m.right ?? 1440}" w:bottom="${m.bottom ?? 1440}" w:left="${m.left ?? 1440}" w:header="720" w:footer="720" w:gutter="0"`;
  const pgSz = page.landscape
    ? '<w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/>'
    : '<w:pgSz w:w="11906" w:h="16838"/>';
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${bodyParts.join("")}<w:sectPr>${pgSz}<w:pgMar ${mAttrs}/></w:sectPr></w:body>
</w:document>`;

  const files = {
    "[Content_Types].xml": CONTENT_TYPES,
    "_rels/.rels": ROOT_RELS,
    "word/document.xml": document,
    "word/styles.xml": STYLES,
    "word/_rels/document.xml.rels": docRels(),
  };
  return packageDocx(files);
}
