// 自动给本次提交（staged）的博客文章补 updated: 今天
// 用法：git commit 前由 pre-commit 钩子调用；也可手动 node scripts/auto-updated.mjs
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// 1. 获取 staged 的博客文章（-z 处理中文/空格文件名）
let files = [];
try {
  const out = execSync(
    'git -c core.quotepath=false diff --cached --name-only -z -- "src/content/posts"',
    { cwd: root, encoding: "utf8" },
  );
  files = out.split("\0").filter((f) => f.endsWith(".md") && existsSync(join(root, f)));
} catch {
  process.exit(0); // 无 staged 变更
}

if (!files.length) process.exit(0);

// 2. 本地日期（Asia/Shanghai）
const now = new Date();
const pad = (n) => String(n).padStart(2, "0");
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// 3. 逐篇补/更新 updated
const changed = [];
for (const f of files) {
  const p = join(root, f);
  let s = readFileSync(p, "utf8");
  if (new RegExp(`^updated:\\s*${today}\\s*$`, "m").test(s)) continue; // 已是今天
  if (/^updated:/m.test(s)) {
    s = s.replace(/^updated:.*$/m, `updated: ${today}`);
  } else if (/^published:.*$/m.test(s)) {
    s = s.replace(/^(published:.*)$/m, `$1\nupdated: ${today}`);
  } else {
    continue; // frontmatter 异常，跳过
  }
  writeFileSync(p, s);
  changed.push(f);
}

// 4. 重新暂存改过的文件
if (changed.length) {
  try {
    execSync(`git add -- ${changed.map((f) => `"${f}"`).join(" ")}`, { cwd: root });
  } catch {}
}

console.log(`[auto-updated] 已更新 ${changed.length} 篇文章的 updated 为 ${today}`);
