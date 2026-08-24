#!/usr/bin/env node
/**
 * GeneaDoc 远端同步脚本（仅走 gh CLI，不依赖 git 传输端口）
 *
 * 用途：把本地纳入版本控制的文件同步到 GitHub 仓库 main 分支。
 *    - 新增/修改：PUT contents API
 *    - 远端存在、本地已删：DELETE contents API
 *    - 不上传 .gitignore 忽略的文件（如 蓝氏家谱.json、.workbuddy/）
 *
 * 用法：node scripts/sync-gh.mjs
 * 前提：已 gh auth login，且本机无 git 远端连通性（端口被墙）。
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const REPO = "SeikenV/GeneaDoc";
const BRANCH = "main";
const ROOT = process.cwd();

// ---------------------------------------------------------------------------
// 1. 收集本地应纳入版本控制的文件（排除 .gitignore 忽略项）
// ---------------------------------------------------------------------------
function loadGitignore() {
  const f = path.join(ROOT, ".gitignore");
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
}
const IGNORE = loadGitignore();

function isIgnored(rel) {
  return IGNORE.some((pat) => {
    if (pat.endsWith("/")) pat = pat.slice(0, -1);
    // 简单匹配：后缀或整段目录
    if (rel === pat || rel.startsWith(pat + "/")) return true;
    if (pat.includes("*")) {
      const re = new RegExp("^" + pat.replace(/\*/g, ".*") + "$");
      if (re.test(rel)) return true;
    }
    return false;
  });
}

function walk(dir, base = "") {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === ".git") continue; // 永远排除 git 内部目录
    const rel = base ? base + "/" + e.name : e.name;
    if (isIgnored(rel)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(full, rel));
    else if (e.isFile()) out.push(rel);
  }
  return out;
}

const localFiles = walk(ROOT).sort();

// ---------------------------------------------------------------------------
// 2. 递归列举远端当前文件清单
// ---------------------------------------------------------------------------
function enc(p) {
  return p.split("/").map((s) => encodeURIComponent(s)).join("/");
}
function remoteList(dir = "") {
  let out = [];
  let items;
  const apiPath = dir ? `contents/${enc(dir)}` : "contents";
  try {
    items = JSON.parse(
      execSync(`gh api repos/${REPO}/${apiPath}`, { encoding: "utf-8" })
    );
  } catch {
    return out; // 目录不存在
  }
  for (const it of items) {
    if (it.type === "dir") out = out.concat(remoteList(it.path));
    else out.push(it.path);
  }
  return out;
}
const remoteFiles = remoteList();

// ---------------------------------------------------------------------------
// 3. 同步
// ---------------------------------------------------------------------------
function remoteSha(p) {
  try {
    return execSync(`gh api repos/${REPO}/contents/${enc(p)} --jq .sha`).toString().trim() || null;
  } catch {
    return null;
  }
}

let put = 0,
  del = 0,
  skip = 0;

// 新增 / 修改
for (const p of localFiles) {
  const b64 = fs.readFileSync(path.join(ROOT, p)).toString("base64");
  const sha = remoteSha(p);
  const body = { message: `sync: ${p}`, content: b64, branch: BRANCH };
  if (sha) body.sha = sha;
  execSync(`gh api -X PUT repos/${REPO}/contents/${enc(p)} --input -`, {
    input: JSON.stringify(body),
    encoding: "utf-8",
    maxBuffer: 100 * 1024 * 1024,
  });
  console.log(sha ? "UPDATE" : "NEW   ", p);
  sha ? del++ : put++;
}

// 远端有、本地已删
for (const p of remoteFiles) {
  if (!localFiles.includes(p)) {
    const sha = remoteSha(p);
    if (sha) {
      execSync(`gh api -X DELETE repos/${REPO}/contents/${enc(p)} --input -`, {
        input: JSON.stringify({ message: `sync: remove ${p}`, branch: BRANCH, sha }),
        encoding: "utf-8",
      });
      console.log("DELETE", p);
      del++;
    }
  }
}

console.log(`\nDONE. 本地文件 ${localFiles.length} 个，远端 ${remoteFiles.length} 个。新增/更新 ${put}，删除 ${del}。`);
