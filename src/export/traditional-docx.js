// 传统竖排家谱 DOCX 导出。
// 采用 docx.js 原生生成 Word 文档，支持中文竖排文字（TextDirection）。
// 版式参考：标题页 + 每对夫妻一个竖排单元格，按世代水平展开。

import { store } from "../data/state.js";
import { sortedChildren, genOf } from "../data/queries.js";
import { fmtDate } from "../utils/date.js";
import { esc, download } from "../utils/dom.js";

const DOCX_CDN = "https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js";

function loadDocx(cb) {
  if (window.docx) {
    cb(window.docx);
    return;
  }
  const s = document.createElement("script");
  s.src = DOCX_CDN;
  s.onload = () => cb(window.docx);
  s.onerror = () => alert("无法加载 docx.js，请检查网络后重试");
  document.head.appendChild(s);
}

/** 递归计算一个节点下方有多少末代（用于列宽分配） */
function leafCount(node, dataMap) {
  const kids = sortedChildren(node.id);
  if (!kids.length) return 1;
  return kids.reduce((sum, c) => sum + leafCount(c, dataMap), 0);
}

function buildCoupletParagraphs(text, docx) {
  const { Paragraph, TextRun, AlignmentType } = docx;
  return text.split("\n").map((line) =>
    new Paragraph({
      children: [new TextRun({ text: line.trim(), size: 28, font: "SimSun" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
    })
  );
}

function buildDocument(docx) {
  const {
    Document, Paragraph, TextRun, Table, TableCell, TableRow,
    AlignmentType, TextDirection, BorderStyle, WidthType, HeadingLevel,
  } = docx;

  const title = store.title || "家谱";
  const roots = store.data.filter((p) => !p.parent);

  // 单元格竖排文字方向：从上到下、从右到左
  const VD = TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT;

  // 无可见边框（传统版面主要靠文字对齐，连线用极细边框暗示）
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const thinTop = { style: BorderStyle.SINGLE, size: 6, color: "8c5a2b", space: 1 };
  const thinBottom = { style: BorderStyle.SINGLE, size: 6, color: "8c5a2b", space: 1 };

  function cellBorders(top = false, bottom = false) {
    return {
      top: top ? thinTop : noBorder,
      bottom: bottom ? thinBottom : noBorder,
      left: noBorder,
      right: noBorder,
    };
  }

  function vText(text, opts = {}) {
    const { size = 24, bold = false, color = "3a2e1f", font = "SimSun" } = opts;
    return new Paragraph({
      children: [new TextRun({ text: esc(text || ""), size, bold, color, font })],
      alignment: AlignmentType.CENTER,
    });
  }

  /** 渲染一个人（考/妣）的竖排文字块 */
  function personBlock(p, isSpouse) {
    const name = isSpouse ? p.spouse : p.name;
    const note = isSpouse ? p.spouseNote : p.note;
    const tomb = isSpouse ? "" : p.tomb;
    const birthDeath = isSpouse
      ? fmtDate(p.spouseBirth) + (p.spouseDeath ? " – " + fmtDate(p.spouseDeath) : "")
      : fmtDate(p.birth) + (p.death ? " – " + fmtDate(p.death) : "");

    const parts = [];
    parts.push(vText(isSpouse ? "妣" : "考", { size: 22, color: "8c5a2b" }));
    parts.push(vText("讳" + (name || "佚名"), { size: 32, bold: true }));
    if (birthDeath) parts.push(vText(birthDeath, { size: 18, color: "7a6a52" }));
    if (note) parts.push(vText(note, { size: 18, color: "7a6a52" }));
    if (tomb) parts.push(vText("葬 " + tomb, { size: 18, color: "7a6a52" }));
    return parts;
  }

  /** 渲染一对夫妻：右侧为本人（考），左侧为配偶（妣） */
  function coupleCell(p, genLabel) {
    const hasSpouse = !!(p.spouse || p.spouseBirth || p.spouseDeath);
    const children = [];
    // 世数标签（居中，放在最上方）
    children.push(vText(genLabel, { size: 20, color: "8c5a2b", bold: true }));

    if (!hasSpouse) {
      children.push(...personBlock(p, false));
    } else {
      // 考在右、妣在左：竖排下，段落从右向左排，所以先 push 考，再 push 妣
      children.push(...personBlock(p, false)); // 考（右侧列）
      children.push(...personBlock(p, true));  // 妣（左侧列）
    }

    return new TableCell({
      width: { size: 100, type: WidthType.PERCENTAGE },
      textDirection: VD,
      children,
      verticalAlign: "center",
      borders: cellBorders(true, true),
      margins: { top: 80, bottom: 80, left: 60, right: 60 },
    });
  }

  /** 为某节点及其所有后代构建一个世系表格 */
  function buildPedigree(root) {
    const generations = [];
    function collect(p, depth) {
      if (!generations[depth]) generations[depth] = [];
      generations[depth].push(p);
      sortedChildren(p.id).forEach((c) => collect(c, depth + 1));
    }
    collect(root, 0);

    // 每行：用 equal 列宽，每个人占 1 列（同代按原始顺序）
    const rows = generations.map((gen, idx) => {
      const genLabel = `第${genOf(gen[0])}世`;
      const cells = gen.map((p) => coupleCell(p, genLabel));
      return new TableRow({
        children: cells,
        height: { value: 4500, rule: "atLeast" }, // 保证竖排文字有足够高度
      });
    });

    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
      layout: "fixed",
    });
  }

  // 标题页
  const titlePage = [
    new Paragraph({ spacing: { before: 2000 } }),
    new Paragraph({
      children: [new TextRun({ text: esc(title), bold: true, size: 72, font: "SimSun", color: "8c5a2b" })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [new TextRun({ text: esc(store.sub || "— 世代源流图 —"), size: 28, font: "SimSun", color: "7a6a52" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    }),
  ];

  // 左右对联（可选，放在正文两侧；这里作为首页末尾小字）
  const couplet = [
    new Paragraph({ spacing: { before: 1200 } }),
    ...buildCoupletParagraphs("麟趾百年称祖德\n螽斯千载念宗功", docx),
  ];

  const sections = [{ children: [...titlePage, ...couplet, new Paragraph({ pageBreakBefore: true })] }];

  roots.forEach((root) => {
    sections.push({
      properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } },
      children: [buildPedigree(root)],
    });
  });

  return new Document({
    sections,
    styles: {
      default: {
        document: {
          run: { font: "SimSun", size: 24 },
        },
      },
    },
  });
}

export function exportTraditionalDocx() {
  loadDocx((docx) => {
    const doc = buildDocument(docx);
    docx.Packer.toBlob(doc).then((blob) => {
      download(blob, (store.title || "jiapu") + "_传统.docx");
    });
  });
}
