// 知识库 AI 问答组件：右下角浮动按钮 + 弹窗
(function () {
  if (window.__aiChatLoaded) return;
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
    ".ai-msg.loading{color:var(--sl-color-gray-3,#888)}" +
    "#ai-chat-input-row{display:flex;gap:8px;padding:10px;border-top:1px solid var(--sl-color-gray-4,rgba(0,0,0,.1))}" +
    "#ai-chat-input{flex:1;border:1px solid var(--sl-color-gray-4,rgba(0,0,0,.15));border-radius:8px;padding:8px 10px;font-size:14px;background:var(--sl-color-gray-7,#fff);color:var(--sl-color-gray-1,#111);outline:none}" +
    "#ai-chat-send{background:var(--sl-color-accent,#2dd4bf);color:#fff;border:none;border-radius:8px;padding:0 14px;cursor:pointer;font-size:14px}" +
    "#ai-chat-send:disabled{opacity:.5;cursor:not-allowed}";

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
  box.innerHTML =
    '<div id="ai-chat-head"><span>AI 学习助手</span><button id="ai-chat-close" aria-label="关闭">✕</button></div>' +
    '<div id="ai-chat-msgs"></div>' +
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

  btn.addEventListener("click", function () {
    box.classList.add("open");
    input.focus();
  });
  closeBtn.addEventListener("click", function () {
    box.classList.remove("open");
  });

  function ask() {
    var q = input.value.trim();
    if (!q || sendBtn.disabled) return;
    sendBtn.disabled = true;
    addMsg(q, "user");
    var loading = addMsg("思考中…", "loading");
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q, context: pageContext() }),
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (d) {
        loading.remove();
        if (d.answer) {
          addMsg(d.answer, "bot");
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
