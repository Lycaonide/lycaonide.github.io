// 构建时生成博客全文索引 public/api/blog-index.json（AI 问答检索用）
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const dir = "src/content/posts";
const outDir = "public/api";
mkdirSync(outDir, { recursive: true });

const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
const posts = [];

for (const f of files) {
  const raw = readFileSync(join(dir, f), "utf8");
  // frontmatter
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = m ? m[1] : "";
  const get = (key) => {
    const r = fm.match(new RegExp("^" + key + ":\\s*(.+)$", "m"));
    return r ? r[1].trim().replace(/^["']|["']$/g, "") : "";
  };
  const title = get("title") || f.replace(/\.md$/, "");
  const published = get("published");
  const category = get("category");
  const tagsRaw = fm.match(/^tags:\s*\[(.*?)\]/m);
  const tags = tagsRaw
    ? tagsRaw[1].split(",").map((t) => t.trim().replace(/["']/g, ""))
    : [];
  // 正文（去掉 frontmatter），保留代码块（命令/注释常含答案）
  let body = m ? raw.slice(m[0].length) : raw;
  body = body
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ") // 图片
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // 链接保留文字
    .replace(/[#>*`_~|]/g, " ") // 标记符号
    .replace(/<[^>]+>/g, " ") // HTML 标签
    .replace(/\s+/g, " ");
  // 分块：按句末标点切，每块上限 600 字符
  const blocks = [];
  let cur = "";
  for (const seg of body.split(/(?<=[。！？；])/)) {
    if (!seg.trim()) continue;
    if ((cur + seg).length > 600 && cur) {
      blocks.push(cur.trim());
      cur = seg;
    } else {
      cur += seg;
    }
  }
  if (cur.trim()) blocks.push(cur.trim());
  // 去掉过短块
  const valid = blocks.filter((b) => b.length >= 20);
  posts.push({ slug: f.replace(/\.md$/, ""), title, published, category, tags, blocks: valid });
}

writeFileSync(join(outDir, "blog-index.json"), JSON.stringify({ updated: new Date().toISOString(), posts }));
const totalChars = posts.reduce((a, p) => a + p.blocks.reduce((x, b) => x + b.length, 0), 0);
console.log("OK 博客全文索引已生成:", posts.length, "篇,", totalChars, "字符,", new Date().toISOString());
