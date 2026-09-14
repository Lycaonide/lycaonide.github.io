// Cloudflare Pages Function：AI 问答代理（隐藏 API Key）
export async function onRequestPost(context) {
  const { question, context: ctx, sources } = await context.request.json().catch(() => ({}));
  if (!question || typeof question !== "string") {
    return json({ error: "缺少问题" }, 400);
  }
  const API_KEY = context.env.ARK_API_KEY;
  if (!API_KEY) {
    return json({ error: "服务未配置（缺少 ARK_API_KEY）" }, 500);
  }
  const MODEL = context.env.ARK_MODEL || "doubao-seed-2-0-code-preview-260215";
  const system =
    "你是本站的 AI 问答助手，根据提供的参考内容回答用户问题。" +
    "参考内容可能来自两类：本站博客文章或知识库笔记。回答时请先判断参考内容的来源，并明确告诉用户信息来自博客文章还是知识库。" +
    "回答时请明确指出结论依据来自哪篇具体文章或笔记（如有多个来源，逐一列出篇名）。" +
    "如果参考内容不足以回答，可以结合你的知识补充，并说明哪些来自参考内容。回答简洁、条理清晰，使用中文。";
  const srcList = Array.isArray(sources) ? sources.filter((s) => typeof s === "string" && s.trim()) : [];
  const user =
    (ctx && typeof ctx === "string" && ctx.trim()
      ? (srcList.length ? `参考内容来自以下文章/笔记：${srcList.join("、")}\n\n` : "") +
        `以下是参考内容（供参考）：\n\n${ctx.slice(0, 6000)}\n\n`
      : "") + `用户问题：${question}`;
  try {
    const resp = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 1500,
        temperature: 0.6,
      }),
    });
    if (!resp.ok) {
      const t = (await resp.text()).slice(0, 300);
      return json({ error: `上游接口错误 ${resp.status}: ${t}` }, 502);
    }
    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) {
      return json({ error: "AI 未返回内容" }, 502);
    }
    const usage = data?.usage
      ? { prompt: data.usage.prompt_tokens ?? 0, completion: data.usage.completion_tokens ?? 0, total: data.usage.total_tokens ?? 0 }
      : null;
    return json({ answer, usage });
  } catch (e) {
    return json({ error: `请求失败: ${String(e)}` }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
