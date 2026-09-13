import { readFileSync } from "node:fs";
const s = readFileSync("E:/Project and blog/my-firefly-blog/public/lib/oml2d.js", "utf8");
const i = s.indexOf('title:"切换模型"');
console.log(s.slice(i - 420, i + 300));
