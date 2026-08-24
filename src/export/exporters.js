// 统一导出入口：JSON / CSV / DOCX，并绑定工具栏按钮。

import { store } from "../data/state.js";
import { download, stripTags } from "../utils/dom.js";
import { exportDocx } from "./docx.js";
import { exportTraditionalDocx } from "./traditional-docx.js";

const CSV_COLS = [
  "id", "name", "zi", "birth", "death", "deceased", "female", "order",
  "spouse", "spouseZi", "spouseBirth", "spouseDeath", "spouseNote",
  "note", "desc", "spouseDesc", "tomb", "tombAddr", "parent",
];

function exportJson() {
  const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" });
  download(blob, (store.title || "jiapu") + ".json");
}

function exportCsv() {
  const escCsv = (v) => {
    v = v == null ? "" : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  };
  const rows = [CSV_COLS.join(",")];
  store.data.forEach((p) => {
    rows.push(
      [
        p.id, p.name, p.zi || "", p.birth || "", p.death || "",
        p.deceased ? "1" : "", p.female ? "1" : "", p.order || "",
        p.spouse || "", p.spouseZi || "", p.spouseBirth || "", p.spouseDeath || "",
        p.spouseNote || "", p.note || "",
        (p.desc || "").replace(/<[^>]+>/g, ""),
        (p.spouseDesc || "").replace(/<[^>]+>/g, ""),
        p.tomb || "", p.tombAddr || "", p.parent || "",
      ]
        .map(escCsv)
        .join(",")
    );
  });
  const blob = new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
  download(blob, (store.title || "jiapu") + ".csv");
}

export function initExports() {
  document.getElementById("exportJson").addEventListener("click", exportJson);
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document.getElementById("exportDocx").addEventListener("click", exportDocx);
  document.getElementById("exportTraditionalDocx").addEventListener("click", exportTraditionalDocx);
}
