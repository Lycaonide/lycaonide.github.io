// 知识库 AI 问答组件：右下角浮动按钮 + 弹窗（博客全文本地检索 + 片段送 AI）
(function () {
  if (window.__aiChatLoaded) return;
  // GitHub Pages 无 Functions 后端，仅 CF 域名启用
  if (location.hostname === "lycaonide.github.io") return;
  window.__aiChatLoaded = true;
  function init() {

  var CSS =
    "#ai-chat-btn{position:fixed;right:20px;bottom:20px;z-index:9999;width:52px;height:52px;border-radius:50%;border:none;cursor:pointer;background:var(--sl-color-accent,#2dd4bf);color:#fff;font-size:22px;box-shadow:0 4px 14px rgba(0,0,0,.25);transition:transform .15s}" +
    "#ai-chat-btn:hover{transform:scale(1.08)}" +
    "#ai-chat-box{position:fixed;right:20px;bottom:84px;z-index:9999;width:min(380px,calc(100vw - 40px));max-height:60vh;display:none;flex-direction:column;background:var(--sl-color-gray-6,#fff);border:1px solid var(--sl-color-gray-4,rgba(0,0,0,.12));border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.2);overflow:hidden;font-size:14px}" +
    "#ai-chat-box.open{display:flex}" +
    "#ai-chat-head{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--sl-color-accent,#2dd4bf);color:#fff;font-weight:600}" +
    "#ai-chat-close{background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px}" +
    "#ai-chat-msgs{flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px;min-height:120px}" +
    ".ai-msg{max-width:88%;padding:8px 12px;border-radius:10px;line-height:1.6;white-space:pre-wrap;word-break:break-word}" +
    ".ai-msg.user{align-self:flex-end;background:var(--sl-color-accent,#2dd4bf);color:#fff}" +
    ".ai-msg.bot{align-self:flex-start;background:var(--sl-color-gray-5,#f1f5f9);color:var(--sl-color-gray-2,#333)}" +
    ".ai-msg.err{align-self:flex-start;background:#fee2e2;color:#b91c1c}" +
    ".ai-msg.cost{align-self:flex-start;font-size:11px;color:#b45309;background:rgba(251,191,36,.12);padding:4px 10px}" +
    ".ai-msg.loading{color:var(--sl-color-gray-3,#888)}" +
    "#ai-chat-input-row{display:flex;gap:8px;padding:10px;border-top:1px solid var(--sl-color-gray-4,rgba(0,0,0,.1))}" +
    "#ai-chat-input{flex:1;border:1px solid var(--sl-color-gray-4,rgba(0,0,0,.15));border-radius:8px;padding:8px 10px;font-size:14px;background:var(--sl-color-gray-7,#fff);color:var(--sl-color-gray-1,#111);outline:none}" +
    "#ai-chat-send{background:var(--sl-color-accent,#2dd4bf);color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;font-size:14px}" +
    "#ai-chat-send:disabled{opacity:.5;cursor:not-allowed}" +
    "#ai-chat-cost{display:block;padding:6px 12px;font-size:11px;color:#b45309;background:rgba(251,191,36,.12);border-bottom:1px solid rgba(0,0,0,.06);line-height:1.5}";

  var style = document.createElement("style");
  style.textContent = CSS;
  document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.id = "ai-chat-btn";
  btn.textContent = "✦";
  btn.title = "AI 问答";
  btn.setAttribute("aria-label", "打开 AI 问答");

  var box = document.createElement("div");
  box.id = "ai-chat-box";
  // inline 兜底：即使外部样式表丢失，弹窗也固定在右下角、默认隐藏
  box.style.cssText =
    "position:fixed;right:20px;bottom:84px;z-index:9999;display:none;width:min(380px,calc(100vw - 40px));max-height:60vh;flex-direction:column;background:var(--sl-color-gray-6,#fff);border:1px solid var(--sl-color-gray-4,rgba(0,0,0,.12));border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.2);overflow:hidden;font-size:14px;";
  box.innerHTML =
    '<div id="ai-chat-head"><span>AI 学习助手</span><button id="ai-chat-close" aria-label="关闭">✕</button></div>' +
    '<div id="ai-chat-msgs"></div>' +
    '<div id="ai-chat-cost">免费额度内不花钱 · 额度用尽后按量计费，余额不足自动停用</div>' +
    '<div id="ai-chat-input-row"><input id="ai-chat-input" placeholder="输入问题，例如：什么是进程调度？" /><button id="ai-chat-send">发送</button></div>';

  document.body.appendChild(btn);
  document.body.appendChild(box);

  var msgs = document.getElementById("ai-chat-msgs");
  var input = document.getElementById("ai-chat-input");
  var sendBtn = document.getElementById("ai-chat-send");
  var closeBtn = document.getElementById("ai-chat-close");

  function addMsg(text, cls) {
    var d = document.createElement("div");
    d.className = "ai-msg " + cls;
    d.textContent = text;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function pageContext() {
    var el = document.querySelector(".sl-markdown-content") || document.querySelector("main");
    var t = el ? el.innerText : "";
    return t.slice(0, 6000);
  }

  // ---------- 博客全文本地检索（RAG，免费、只送命中片段给 AI） ----------
  var STOP = new Set(("的了吗是么什么怎么能可以用在与和或都也这那我你他它一个一下这个那个有没有想请帮我给把被让对从到就才只还又再很更最等因为所以但是然后").split(""));

  function extractWords(q) {
    var words = q.match(/[a-zA-Z0-9][a-zA-Z0-9\-_.]*/g) || [];
    var zh = q.replace(/[a-zA-Z0-9\-_. ]/g, "");
    var filtered = zh.split("").filter(function (c) { return !STOP.has(c); }).join("");
    var bigrams = [];
    for (var i = 0; i < filtered.length - 1; i++) bigrams.push(filtered.substr(i, 2));
    return { words: words, bigrams: bigrams };
  }

  // 缓存索引（一次加载，后续复用）
  var _indexPromise = null;
  function loadIndex() {
    if (!_indexPromise) {
      _indexPromise = fetch("/api/blog-index.json", { cache: "force-cache" }).then(function (r) { return r.json(); });
    }
    return _indexPromise;
  }

  function searchBlog(q) {
    var w = extractWords(q);
    return loadIndex().then(function (idx) {
      var results = [];
      idx.posts.forEach(function (post) {
        var tScore = 0;
        w.words.concat(w.bigrams).forEach(function (kw) {
          if (post.title.indexOf(kw) >= 0) tScore += kw.length * 4;
        });
        post.blocks.forEach(function (b) {
          var score = tScore;
          w.words.forEach(function (kw) { if (b.indexOf(kw) >= 0) score += kw.length * 8; });
          var bg = 0;
          w.bigrams.forEach(function (kw) { if (b.indexOf(kw) >= 0) bg += 1; });
          score += Math.min(bg, 5);
          if (score > 0) results.push({ title: post.title, score: score, text: b });
        });
      });
      results.sort(function (a, b) { return b.score - a.score; });
      var parts = [], total = 0, postCount = {}, titles = [];
      results.forEach(function (r) {
        if (parts.length >= 4 || total + r.text.length > 4500) return;
        if ((postCount[r.title] || 0) >= 2) return;
        postCount[r.title] = (postCount[r.title] || 0) + 1;
        if (titles.indexOf(r.title) < 0) titles.push(r.title);
        parts.push("【" + r.title + "】" + r.text);
        total += r.text.length;
      });
      return { text: parts.join("\n\n"), titles: titles };
    });
  }

  btn.addEventListener("click", function () {
    box.classList.add("open");
    box.style.display = "flex";
    input.focus();
  });
  closeBtn.addEventListener("click", function () {
    box.classList.remove("open");
    box.style.display = "none";
  });

  function ask() {
    var q = input.value.trim();
    if (!q || sendBtn.disabled) return;
    sendBtn.disabled = true;
    addMsg(q, "user");
    var loading = addMsg("思考中…", "loading");
    searchBlog(q)
      .then(function (res) {
        // 优先用博客全文检索片段；没命中时回退当前页内容
        var page = pageContext();
        var context, note, sources;
        if (res && res.text && res.text.trim()) {
          context = res.text;
          note = "以下是本站博客文章的检索片段（供参考）：\n\n";
          sources = res.titles || [];
        } else {
          context = page;
          var u = (location.pathname || "");
          note = (u.indexOf("/kb/") === 0 || u.indexOf("/docs/") === 0)
            ? "以下是本站知识库笔记的内容（供参考）：\n\n"
            : "以下是当前页面的内容（供参考）：\n\n";
          sources = [];
        }
        return fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: q, context: (note + context).slice(0, 6000), sources: sources }),
        });
      })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        loading.remove();
        if (d.answer) {
          addMsg(d.answer, "bot");
          if (d.usage && d.usage.total) {
            addMsg("本次消耗 " + d.usage.total + " tokens（免费额度内不扣费）", "cost");
          }
        } else {
          addMsg(d.error || "出错了，请稍后再试", "err");
        }
      })
      .catch(function (e) {
        loading.remove();
        addMsg("网络错误：" + e.message, "err");
      })
      .finally(function () {
        sendBtn.disabled = false;
        input.value = "";
        input.focus();
      });
  }

  sendBtn.addEventListener("click", ask);
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") ask();
  });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
