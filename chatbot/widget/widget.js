/*
 * HeronsGuide chat widget: a chat inbox (conversations + threads + "My account") for TBL Hub.
 * Embed (Moodle: Site administration › Appearance › Additional HTML › "Before BODY is closed"):
 *   <script src="https://<chatbot-host>/widget.js" data-college="CCIS" defer></script>
 * Optional attributes:
 *   data-api            API origin (defaults to the script's origin)
 *   data-student-token  signed token for the logged-in student (TBL Hub fills this in);
 *                       enables "My account" and answers about the student's own records
 *   data-college        default college code
 *   data-telegram       Telegram link (defaults to the server's /config)
 *   data-title          assistant name (default "HeronsGuide")
 *   data-tagline        subtitle under the name
 *   data-greeting       first message in every conversation
 *   data-suggestions    starter questions, separated by |
 *   data-primary        header / user-bubble color (default #0b2560)
 *   data-accent         launcher / button color (default #f26a10)
 *   data-offset-bottom, data-offset-right   launcher position in px
 *   data-channel        reported channel (default "tbl")
 *   data-open           "inbox" opens the chat inbox on page load, except on phones (demo pages)
 * Page API: window.HeronsGuide.open(question?), .openInbox(), .openAccount(), .newChat(q?),
 *           .setCollege(code), .setWide(bool), .setFull(bool).
 * Answers stream from /chat/stream: each pipeline step shows live under "Thinking" and is
 * kept as a collapsible "Show thinking"; suggested replies appear under the latest answer.
 * Conversations are kept in this browser only (localStorage).
 * Loader: banter-loader by Nawsome (Uiverse.io, MIT), served as /widget/loader.css.
 */
(function () {
  "use strict";
  if (window.HeronsGuide) return;

  var script = document.currentScript;
  function attr(name, fallback) {
    var v = script && script.getAttribute("data-" + name);
    return v == null || v === "" ? fallback : v;
  }
  var API = attr("api", script && script.src ? new URL(script.src, location.href).origin : location.origin).replace(/\/$/, "");
  var TOKEN = attr("student-token", null);
  var CHANNEL = attr("channel", "tbl");
  var TITLE = attr("title", "HeronsGuide");
  var PRIMARY = attr("primary", "#0b2560");
  var ACCENT = attr("accent", "#f26a10");
  var OFFSET_BOTTOM = parseInt(attr("offset-bottom", "24"), 10);
  var OFFSET_RIGHT = parseInt(attr("offset-right", "24"), 10);
  var FALLBACK = "Information not in provided sources";
  var NOTICE = TITLE + " is a guide, not a second brain. Always confirm important details with your college or the office concerned.";
  var KEY_THREADS = "heronsguide.threads", KEY_COLLEGE = "heronsguide.college", KEY_WIDE = "heronsguide.wide";
  var MAX_THREADS = 30, MAX_MESSAGES = 60, HISTORY_TURNS = 10;

  var TAGLINE = attr("tagline", "Your UMak campus guide · official documents only");
  var GREETING = attr("greeting", "Hi! I'm " + TITLE + ". I answer questions about UMak scholarships, " +
    "CCIS admission requirements, offices and building locations" +
    (TOKEN ? ", plus your own classes, deadlines and grades from TBL Hub." : ", using only official documents."));
  var SUGGESTIONS = attr("suggestions", [
    "What GWA do I need to apply for BS Computer Science?",
    "Who endorses the Varsity Player token fee exemption?",
    "Where is the Office of the University Registrar?",
  ].join("|")).split("|").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 4);
  var ACCOUNT_SUGGESTIONS = [
    "What's due this week?",
    "What's the Google Meet link for ELEC4?",
    "How are my grades so far?",
    "Where is my THESIS1 class?",
  ];

  // ---------- storage (browser-only; falls back to memory) ----------
  var memory = {};
  function load(key, fallback) {
    try { var v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return key in memory ? memory[key] : fallback; }
  }
  function save(key, value) {
    memory[key] = value;
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }

  var threads = load(KEY_THREADS, []);
  var college = load(KEY_COLLEGE, null) || attr("college", null);
  var telegramUrl = attr("telegram", null);
  var wide = !!load(KEY_WIDE, false);
  var full = false;      // full-screen view (not remembered)
  var current = null;   // open thread id
  var view = "inbox";   // compact layout: "inbox" | "chat"
  var tab = "chats";    // inbox tabs: "chats" | "account"
  var busy = false;
  var account = null, accountState = TOKEN ? "idle" : "none"; // idle | loading | ready | error | none

  function persist() {
    threads.sort(function (a, b) { return b.updated - a.updated; });
    threads = threads.slice(0, MAX_THREADS);
    save(KEY_THREADS, threads);
  }
  function thread(id) { return threads.filter(function (t) { return t.id === id; })[0]; }
  function newThread() {
    var t = { id: "t" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: "New conversation", created: Date.now(), updated: Date.now(), messages: [] };
    threads.unshift(t);
    persist();
    return t;
  }
  function headers() {
    var h = { "Content-Type": "application/json" };
    if (TOKEN) h["X-Student-Token"] = TOKEN;
    return h;
  }

  // ---------- colors (same rules as the Studio customizer) ----------
  function lum(hex) {
    var c = [1, 3, 5].map(function (i) { var v = parseInt(hex.substr(i, 2), 16) / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }
  function contrast(a, b) { var x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function toHex(r, g, b) { return "#" + [r, g, b].map(function (v) { return ("0" + v.toString(16)).slice(-2); }).join(""); }
  function readableOnWhite(hex) {
    var r = parseInt(hex.substr(1, 2), 16), g = parseInt(hex.substr(3, 2), 16), b = parseInt(hex.substr(5, 2), 16);
    for (var i = 0; i < 12 && contrast(toHex(r, g, b), "#ffffff") < 4.5; i++) { r = Math.round(r * 0.88); g = Math.round(g * 0.88); b = Math.round(b * 0.88); }
    return toHex(r, g, b);
  }
  var HEX = /^#[0-9a-f]{6}$/i;
  var PRIMARY_TEXT = HEX.test(PRIMARY) && contrast(PRIMARY, "#ffffff") < 4.5 ? "#111827" : "#ffffff";
  var ACCENT_TEXT = HEX.test(ACCENT) ? readableOnWhite(ACCENT) : ACCENT;

  // ---------- styles (match the Studio artifact's chat) ----------
  var CSS = `
  :host { all: initial; --primary: ${PRIMARY}; --accent: ${ACCENT}; --primary-text: ${PRIMARY_TEXT}; --accent-text: ${ACCENT_TEXT}; }
  [hidden] { display: none !important; }
  * { box-sizing: border-box; font-family: "Century Gothic", "Didact Gothic", "Segoe UI", system-ui, sans-serif; }
  button { font: inherit; }
  button:focus-visible, textarea:focus-visible, a:focus-visible { outline: 3px solid #ffb36b; outline-offset: 2px; }
  .launcher {
    position: fixed; right: ${OFFSET_RIGHT}px; bottom: ${OFFSET_BOTTOM}px; z-index: 2147483000;
    width: 56px; height: 56px; border-radius: 50%; border: 0; cursor: pointer;
    background: var(--accent); color: #fff; display: grid; place-items: center;
    box-shadow: 0 6px 18px rgba(11, 37, 96, .35); transition: transform .15s ease;
  }
  .launcher:hover { transform: translateY(-2px); }
  .launcher svg { width: 28px; height: 28px; }
  .launcher .tip { position: absolute; right: 66px; white-space: nowrap; background: var(--primary); color: #fff; font-size: 13px; padding: 6px 10px; border-radius: 6px; opacity: 0; pointer-events: none; transition: opacity .15s; }
  .launcher:hover .tip, .launcher:focus-visible .tip { opacity: 1; }

  .panel {
    position: fixed; right: ${OFFSET_RIGHT}px; bottom: ${OFFSET_BOTTOM + 68}px; z-index: 2147483001;
    width: 400px; height: 620px; max-height: calc(100vh - ${OFFSET_BOTTOM + 92}px);
    background: #fff; color: #1d2433; border-radius: 16px; overflow: hidden;
    display: none; box-shadow: 0 18px 48px rgba(11, 37, 96, .35); border: 1px solid #dfe3ec;
  }
  .panel.open { display: flex; animation: rise .18s ease-out; }
  .panel.wide { width: min(1000px, calc(100vw - ${OFFSET_RIGHT + 24}px)); height: calc(100vh - ${OFFSET_BOTTOM + 92}px); max-height: 820px; }
  .panel.wide .inbox { flex: 0 0 340px; border-right: 1px solid #e3e7f0; }
  .panel.wide .back, .panel.wide .inbox header .icon-btn, .panel.wide .chat header .avatar { display: none; }
  .panel.full { right: 0; bottom: 0; width: 100vw; height: 100vh; height: 100dvh; max-height: none; border-radius: 0; border: 0; z-index: 2147483002; }
  .panel.full .inbox { flex: 0 0 340px; border-right: 1px solid #e3e7f0; }
  .panel.full .back, .panel.full .inbox header .icon-btn, .panel.full .chat header .avatar, .panel.full .expand { display: none; }
  .panel.full .log { padding: 24px max(28px, calc((100% - 860px) / 2)); }
  .panel.full .notice, .panel.full form { padding-left: max(14px, calc((100% - 860px) / 2)); padding-right: max(14px, calc((100% - 860px) / 2)); }
  .panel.full .stack { max-width: 76%; }
  @keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .view { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; }

  header { background: var(--primary); color: var(--primary-text); padding: 11px 8px 11px 12px; display: flex; gap: 8px; align-items: center; flex: none; min-height: 60px; }
  .avatar { width: 34px; height: 34px; border-radius: 50%; background: var(--accent); color: #fff; display: grid; place-items: center; flex: none; position: relative; }
  .avatar svg { width: 21px; height: 21px; }
  .avatar.sm { width: 26px; height: 26px; } .avatar.sm svg { width: 16px; height: 16px; }
  header .avatar::after { content: ""; position: absolute; right: -1px; bottom: -1px; width: 10px; height: 10px; border-radius: 50%; background: #3ccf6b; border: 2px solid var(--primary); }
  header .t { flex: 1; min-width: 0; }
  header h2 { margin: 0; font-size: 16px; line-height: 1.2; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  header p { margin: 0; font-size: 11.5px; color: inherit; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .icon-btn { background: transparent; border: 0; color: inherit; cursor: pointer; width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; flex: none; }
  .icon-btn:hover { background: rgba(255,255,255,.14); }

  /* inbox */
  .tabs { display: flex; gap: 4px; padding: 8px 12px 0; border-bottom: 1px solid #e8ebf2; flex: none; }
  .tabs button { flex: 1; background: none; border: 0; border-bottom: 3px solid transparent; padding: 7px 6px 8px; font-size: 13px; font-weight: 700; color: #6b7487; cursor: pointer; }
  .tabs button[aria-selected="true"] { color: var(--primary); border-bottom-color: var(--accent); }
  .pane { flex: 1; min-height: 0; display: flex; flex-direction: column; }
  .inbox-top { padding: 12px; flex: none; }
  .new-chat { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 10px; background: var(--accent); color: #fff; padding: 10px; font-size: 14px; font-weight: 700; cursor: pointer; }
  .new-chat:hover { filter: brightness(1.05); }
  .list { flex: 1; overflow-y: auto; margin: 0; padding: 0 0 6px; list-style: none; }
  .item { display: flex; align-items: center; gap: 10px; padding: 0 6px 0 12px; }
  .item:hover, .item:focus-within, .item.active { background: #f4f6fb; }
  .open-thread { flex: 1; min-width: 0; display: flex; gap: 10px; align-items: center; background: none; border: 0; text-align: left; padding: 10px 0; cursor: pointer; color: inherit; }
  .meta { flex: 1; min-width: 0; }
  .row1 { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
  .title { font-size: 13.5px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .time { font-size: 11px; color: #8a93a6; flex: none; }
  .preview { font-size: 12.5px; color: #5d6678; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .del { background: none; border: 0; color: #8a93a6; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; flex: none; }
  .del:hover { color: #b42318; background: #fde8e6; }
  .empty { padding: 22px 16px; text-align: center; color: #5d6678; font-size: 13.5px; }
  .empty strong { display: block; color: #1d2433; margin-bottom: 4px; }
  .empty .chips { margin: 12px 0 0; align-items: stretch; }
  .foot { padding: 7px 12px 9px; font-size: 11px; color: #6b7487; border-top: 1px solid #edf0f5; display: flex; justify-content: space-between; gap: 8px; flex: none; }
  .foot a { color: #229ed9; font-weight: 700; text-decoration: none; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }

  /* account */
  .acct { flex: 1; overflow-y: auto; padding: 12px 14px 16px; display: grid; gap: 14px; align-content: start; position: relative; min-height: 160px; }
  .who { display: flex; gap: 10px; align-items: center; }
  .who .initials { width: 40px; height: 40px; border-radius: 50%; background: #e8ecf6; color: var(--primary); display: grid; place-items: center; font-weight: 700; flex: none; }
  .who b { display: block; font-size: 15px; }
  .who span { font-size: 12.5px; color: #5d6678; }
  .sec h3 { margin: 0 0 6px; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #6b7487; }
  .rows { display: grid; gap: 6px; margin: 0; padding: 0; list-style: none; }
  .dl { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; padding: 8px 10px; border: 1px solid #e6e9f0; border-radius: 10px; }
  .dl b { font-size: 13px; min-width: 0; }
  .dl small { font-size: 12px; color: #5d6678; grid-column: 1 / -1; }
  .due { font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: #eef1f6; color: #4a5468; white-space: nowrap; align-self: start; }
  .due.soon { background: #fff1e6; color: #a6460a; }
  .due.over { background: #fde8e6; color: #b42318; }
  .due.done { background: #e3f5ea; color: #1d6b3f; }
  .kv { display: flex; justify-content: space-between; gap: 10px; font-size: 12.5px; padding: 5px 0; border-bottom: 1px dashed #e6e9f0; }
  .kv span:first-child { color: #4a5468; min-width: 0; }
  .kv span:last-child { font-variant-numeric: tabular-nums; font-weight: 700; white-space: nowrap; }
  .ask-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .acct-msg { font-size: 12.5px; color: #5d6678; text-align: center; padding: 14px 6px; }

  /* chat */
  .log { flex: 1; overflow-y: auto; padding: 10px 12px 14px; display: flex; flex-direction: column; gap: 2px; background: #fff; }
  .panel.wide .log { padding: 18px 28px; }
  .row { display: flex; gap: 7px; align-items: flex-end; margin-top: 8px; }
  .row.user { justify-content: flex-end; }
  .stack { display: flex; flex-direction: column; max-width: 84%; min-width: 0; }
  .panel.wide .stack { max-width: 70%; }
  .row.user .stack { align-items: flex-end; }
  .msg { padding: 9px 11px; border-radius: 14px; font-size: 13.5px; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; }
  .user .msg { background: var(--primary); color: var(--primary-text); border-bottom-right-radius: 4px; }
  .bot .msg { background: #f4f6fb; border: 1px solid #e3e7f0; border-bottom-left-radius: 4px; }
  .bot .msg.refusal { background: #f7f7f8; border-style: dashed; color: #4a5468; }
  .bot .msg.conflict { background: #fff8ec; border-color: #f5c27a; }
  .bot .msg.error { background: #fff1f0; border-color: #f3b4ad; color: #8a1f12; }
  .stamp { font-size: 10.5px; color: #9aa2b3; margin: 2px 4px 0; }
  .label { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; margin-bottom: 4px; white-space: normal; }
  .label.warn { color: #9a5200; } .label.muted { color: #5d6678; }
  .note { margin-top: 6px; font-size: 12px; color: #7a4a00; white-space: normal; }
  .hint { margin-top: 4px; font-size: 12px; color: #5d6678; white-space: normal; }
  .cites { margin-top: 7px; display: flex; flex-wrap: wrap; gap: 5px; white-space: normal; }
  .cite { font-size: 11px; line-height: 1.35; background: #fff; border: 1px solid #cfd6e4; color: var(--primary); border-radius: 9px; padding: 2px 8px; max-width: 100%; }
  .cite b { color: var(--accent-text); }
  .cite.mine { border-color: #b9e2c8; background: #f2fbf5; }
  .chips { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; margin: 8px 0 0 33px; }
  .chip { text-align: left; font-size: 12.5px; background: #fff; border: 1px solid var(--accent); color: var(--accent-text); border-radius: 10px; padding: 6px 9px; cursor: pointer; }
  .chip:hover { background: #fff3ea; }
  .chip.mine { border-color: #3a9a63; color: #1d6b3f; }
  .chip.mine:hover { background: #effaf3; }
  .live { background: #fff; border: 1px solid #e3e7f0; border-radius: 14px; border-bottom-left-radius: 4px; padding: 9px 11px; min-width: 220px; max-width: 84%; }
  .live-head { display: flex; align-items: center; gap: 10px; font-size: 12.5px; font-weight: 700; color: var(--primary); }
  .think { margin: 0 0 6px; font-size: 12.5px; color: #4a5468; }
  .think summary { cursor: pointer; display: inline-flex; align-items: center; gap: 6px; list-style: none; font-size: 11.5px; font-weight: 700; color: #5d6678; padding: 3px 10px; border-radius: 999px; background: #f1f3f8; }
  .think summary::-webkit-details-marker { display: none; }
  .think summary::after { content: ""; width: 6px; height: 6px; border-right: 1.6px solid currentColor; border-bottom: 1.6px solid currentColor; transform: rotate(45deg) translateY(-2px); transition: transform .15s; }
  .think[open] summary::after { transform: rotate(225deg) translateY(-1px); }
  .steps { margin: 8px 0 2px 4px; padding: 0 0 0 12px; list-style: none; display: grid; gap: 6px; border-left: 2px solid #e3e7f0; }
  .steps li { position: relative; }
  .steps li::before { content: ""; position: absolute; left: -17px; top: 5px; width: 8px; height: 8px; border-radius: 50%; background: #3ccf6b; }
  .steps li.now::before { background: var(--accent); }
  .steps b { display: block; font-size: 12px; color: #1d2433; }
  .steps span { display: block; color: #5d6678; font-size: 11.5px; overflow-wrap: anywhere; }
  .live .steps { margin-top: 10px; }
  .msg a { color: inherit; text-decoration: underline; overflow-wrap: anywhere; }
  .meet { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; margin-top: 8px; padding: 8px 10px; background: #fff; border: 1px solid #cfe3d6; border-radius: 10px; white-space: normal; }
  .meet-ic { width: 28px; height: 28px; border-radius: 8px; background: #e6f4ea; color: #137333; display: grid; place-items: center; flex: none; }
  .meet-t { flex: 1 1 140px; min-width: 0; font-size: 12px; }
  .meet-t b { display: block; color: #1d2433; font-size: 12.5px; }
  .meet-t span { color: #5d6678; font-family: ui-monospace, Consolas, monospace; font-size: 11px; overflow-wrap: anywhere; }
  .mbtn { flex: none; border: 1px solid #cfd6e4; background: #fff; color: #1d2433; border-radius: 8px; padding: 5px 10px; font-size: 12px; font-weight: 700; cursor: pointer; text-decoration: none !important; }
  .mbtn.join { background: #137333; border-color: #137333; color: #fff !important; }
  .follow { display: flex; flex-wrap: wrap; gap: 6px; margin: 10px 0 0 33px; }
  .follow-label { width: 100%; font-size: 10.5px; font-weight: 700; color: #8a93a6; text-transform: uppercase; letter-spacing: .05em; }
  .follow .chip { border-radius: 999px; padding: 5px 11px; }
  .notice { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 6px 12px; font-size: 11px; line-height: 1.4; color: #5d4a1f; background: #fff8e6; border-top: 1px solid #f4e3b5; flex: none; }
  .notice svg { flex: none; margin-top: 1px; }
  form { display: flex; gap: 8px; padding: 9px 10px; border-top: 1px solid #e3e7f0; background: #fff; flex: none; }
  textarea { flex: 1; min-width: 0; resize: none; height: 40px; font-size: 13.5px; padding: 9px 11px; border: 1px solid #cfd6e4; border-radius: 12px; color: #1d2433; }
  .send { flex: none; width: 40px; height: 40px; border: 0; border-radius: 12px; background: var(--accent); color: #fff; cursor: pointer; display: grid; place-items: center; }
  .send:disabled { opacity: .55; cursor: default; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

  /* banter loader (loader.css), recolored and scaled */
  .loader { position: relative; width: 26px; height: 26px; flex: none; }
  .loader .banter-loader { transform: scale(.36); }
  .loader.big { width: 72px; height: 72px; margin: 26px auto; }
  .loader.big .banter-loader { transform: none; }
  .banter-loader__box:before { background: var(--accent) !important; border-radius: 3px; }
  .banter-loader__box:nth-child(even):before { background: var(--primary) !important; }

  @media (max-width: 720px) { .expand, .maximize { display: none; } }
  @media (max-width: 480px) {
    .launcher { right: ${Math.min(OFFSET_RIGHT, 16)}px; }
    .launcher .tip { display: none; }
    .panel, .panel.wide { right: 0; bottom: 0; width: 100vw; height: 100dvh; max-height: none; border-radius: 0; border: 0; }
    .del { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .panel.open, .launcher, .think summary::after { animation: none; transition: none; }
    .banter-loader__box { animation: none !important; }
  }`;

  var ICON = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h.01M12 11h.01M15.5 11h.01"/></svg>',
    heron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4.5a2 2 0 1 1 2.6 1.9L21 8l-4.6.3"/><path d="M15 6.6c-1.4 2.5-1.3 4.6-3.6 6.3C9 14.6 6.6 14 4 15.5c2.7.8 5.6 1.4 8.2.3"/><path d="M10 16l-1 5M12.6 15.6l.4 5.4"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
    expand: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>',
    shrink: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14h6v6M20 10h-6V4M10 14l-7 7M14 10l7-7"/></svg>',
    maximize: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
    restore: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/></svg>',
    video: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="M15 10l6-3v10l-6-3"/></svg>',
    send: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    info: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>',
    tg: '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true"><path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.2 12.9l-4.9-1.5c-1-.3-1.1-1 .2-1.5L20.6 2.6c.9-.3 1.6.2 1.3 1.7z"/></svg>',
  };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var T = esc(TITLE);

  // ---------- DOM ----------
  var host = document.createElement("div");
  host.id = "heronsguide-widget";
  var root = host.attachShadow({ mode: "open" });
  root.innerHTML =
    '<link rel="stylesheet" href="' + esc(API) + '/widget/loader.css">' +
    "<style>" + CSS + "</style>" +
    '<button class="launcher" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="hg-panel">' +
      ICON.chat + '<span class="tip">Ask ' + T + '</span><span class="sr">Open ' + T + "</span></button>" +
    '<section class="panel" id="hg-panel" role="dialog" aria-label="' + T + '">' +
      '<div class="view inbox">' +
        '<header><div class="avatar">' + ICON.heron + '</div><div class="t"><h2>' + T + "</h2><p>" + esc(TAGLINE) + "</p></div>" +
          '<button class="icon-btn expand" type="button"></button>' +
          '<button class="icon-btn maximize" type="button"></button>' +
          '<button class="icon-btn close" type="button" aria-label="Close">' + ICON.close + "</button></header>" +
        '<div class="tabs" role="tablist"' + (TOKEN ? "" : " hidden") + ">" +
          '<button type="button" role="tab" id="tab-chats" aria-controls="pane-chats" aria-selected="true">Chats</button>' +
          '<button type="button" role="tab" id="tab-account" aria-controls="pane-account" aria-selected="false">My account</button></div>' +
        '<div class="pane" id="pane-chats" role="tabpanel" aria-labelledby="tab-chats">' +
          '<div class="inbox-top"><button class="new-chat" type="button">' + ICON.plus + "New conversation</button></div>" +
          '<ul class="list" aria-label="Conversations"></ul></div>' +
        '<div class="pane" id="pane-account" role="tabpanel" aria-labelledby="tab-account" hidden><div class="acct" aria-live="polite"></div></div>' +
        '<div class="foot"><span>A guide, not a second brain · chats stay in this browser</span><a class="tg" target="_blank" rel="noopener" hidden>' + ICON.tg + "Telegram</a></div>" +
      "</div>" +
      '<div class="view chat" hidden>' +
        '<header><button class="icon-btn back" type="button" aria-label="Back to conversations">' + ICON.back + "</button>" +
          '<div class="avatar">' + ICON.heron + '</div><div class="t"><h2 class="chat-title">' + T + "</h2>" +
          "<p>Online · official UMak documents" + (TOKEN ? " + your TBL Hub records" : "") + "</p></div>" +
          '<button class="icon-btn expand" type="button"></button>' +
          '<button class="icon-btn maximize" type="button"></button>' +
          '<button class="icon-btn close" type="button" aria-label="Close">' + ICON.close + "</button></header>" +
        '<div class="log" role="log" aria-live="polite"></div>' +
        '<p class="notice">' + ICON.info + "<span>" + esc(NOTICE) + "</span></p>" +
        '<form><label class="sr" for="hg-q">Message ' + T + "</label>" +
          '<textarea id="hg-q" maxlength="1000" placeholder="Ask about scholarships, requirements, offices' + (TOKEN ? ", your deadlines" : "") + '…"></textarea>' +
          '<button class="send" type="submit" aria-label="Send">' + ICON.send + "</button></form>" +
      "</div>" +
    "</section>";

  function $(sel) { return root.querySelector(sel); }
  function $$(sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); }
  var launcher = $(".launcher"), panel = $(".panel"), inboxView = $(".inbox"), chatView = $(".chat"),
      list = $(".list"), log = $(".log"), form = $("form"), input = $("textarea"), sendBtn = $(".send"),
      tg = $(".tg"), acct = $(".acct");

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function icon(html) { var s = el("span"); s.innerHTML = html; return s.firstChild; }
  function loader(big) {
    var w = el("div", "loader" + (big ? " big" : ""));
    var b = el("div", "banter-loader");
    for (var i = 0; i < 9; i++) b.appendChild(el("div", "banter-loader__box"));
    w.appendChild(b);
    return w;
  }
  function avatar() { var a = el("div", "avatar sm"); a.innerHTML = ICON.heron; return a; }

  function when(ts) {
    var d = new Date(ts), now = new Date(), diff = (now - d) / 1000;
    if (diff < 60) return "now";
    if (diff < 3600) return Math.floor(diff / 60) + "m";
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    if (diff < 6 * 86400) return d.toLocaleDateString([], { weekday: "short" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  function clock(ts) { return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }

  // ---------- layout ----------
  function layout() {
    var twoCol = wide || full;
    panel.classList.toggle("wide", wide && !full);
    panel.classList.toggle("full", full);
    launcher.hidden = full;
    $$(".maximize").forEach(function (b) {
      b.innerHTML = full ? ICON.restore : ICON.maximize;
      b.setAttribute("aria-label", full ? "Exit full screen" : "Full screen");
      b.setAttribute("aria-pressed", String(full));
    });
    $$(".expand").forEach(function (b) {
      b.innerHTML = wide ? ICON.shrink : ICON.expand;
      b.setAttribute("aria-label", wide ? "Use compact view" : "Expand to wide view");
      b.setAttribute("aria-pressed", String(wide));
    });
    var t = thread(current);
    $(".chat-title").textContent = twoCol && t && t.messages.length ? t.title : TITLE;
    if (twoCol) { inboxView.hidden = false; chatView.hidden = false; }
    else { inboxView.hidden = view !== "inbox"; chatView.hidden = view !== "chat"; }
    $$(".tabs button").forEach(function (b) { b.setAttribute("aria-selected", String(b.id === "tab-" + tab)); });
    $("#pane-chats").hidden = tab !== "chats";
    $("#pane-account").hidden = tab !== "account";
    if (tab === "account") renderAccount(); else renderInbox();
    if (!chatView.hidden) renderThread();
  }
  function setWide(v) { wide = !!v; save(KEY_WIDE, wide); layout(); }
  function setFull(v) { full = !!v; layout(); (full ? input : launcher).focus(); }

  // ---------- inbox ----------
  function suggestions(items, mine) {
    var chips = el("div", "chips");
    items.forEach(function (q) {
      var c = el("button", "chip" + (mine ? " mine" : ""), q);
      c.type = "button";
      c.addEventListener("click", function () { newChat(q); });
      chips.appendChild(c);
    });
    return chips;
  }

  function renderInbox() {
    list.textContent = "";
    var visible = threads.filter(function (t) { return t.messages.length; });
    if (!visible.length) {
      var empty = el("li", "empty");
      empty.appendChild(el("strong", null, "No conversations yet"));
      empty.appendChild(document.createTextNode("Ask about scholarships, admission requirements, offices or where to find them."));
      empty.appendChild(suggestions(TOKEN ? ACCOUNT_SUGGESTIONS.slice(0, 1).concat(SUGGESTIONS.slice(0, 2)) : SUGGESTIONS));
      list.appendChild(empty);
      return;
    }
    visible.forEach(function (t) {
      var li = el("li", "item" + ((wide || full) && t.id === current ? " active" : ""));
      var btn = el("button", "open-thread");
      btn.type = "button";
      var meta = el("div", "meta"), row1 = el("div", "row1");
      row1.appendChild(el("span", "title", t.title));
      row1.appendChild(el("span", "time", when(t.updated)));
      var last = t.messages[t.messages.length - 1];
      meta.appendChild(row1);
      meta.appendChild(el("div", "preview", (last.role === "user" ? "You: " : "") + last.text.replace(/\s+/g, " ")));
      btn.appendChild(avatar()); btn.appendChild(meta);
      btn.addEventListener("click", function () { openThread(t.id); });
      var del = el("button", "del");
      del.type = "button";
      del.setAttribute("aria-label", "Delete conversation: " + t.title);
      del.appendChild(icon(ICON.trash));
      del.addEventListener("click", function () {
        threads = threads.filter(function (x) { return x.id !== t.id; });
        if (current === t.id) current = null;
        persist();
        layout();
      });
      li.appendChild(btn); li.appendChild(del);
      list.appendChild(li);
    });
  }

  // ---------- my account ----------
  function fetchAccount() {
    if (!TOKEN || accountState === "loading" || accountState === "ready") return;
    accountState = "loading";
    if (tab === "account") renderAccount();
    fetch(API + "/account/me", { headers: headers() })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (a) {
        account = a; accountState = "ready";
        if (!load(KEY_COLLEGE, null) && a.college) setCollege(a.college);
      })
      .catch(function () { accountState = "error"; })
      .finally(function () { if (tab === "account") renderAccount(); });
  }

  function dueChip(d) {
    var done = /^submitted/i.test(d.status);
    var days = Math.ceil((new Date(d.due) - new Date()) / 86400000);
    if (done) return el("span", "due done", "Submitted");
    if (days < 0) return el("span", "due over", "Overdue");
    if (days === 0) return el("span", "due soon", "Due today");
    return el("span", "due" + (days <= 3 ? " soon" : ""), "In " + days + (days === 1 ? " day" : " days"));
  }

  function section(title) { var s = el("div", "sec"); s.appendChild(el("h3", null, title)); return s; }

  function renderAccount() {
    acct.textContent = "";
    if (accountState === "loading" || accountState === "idle") {
      acct.appendChild(loader(true));
      acct.appendChild(el("p", "acct-msg", "Loading your TBL Hub records…"));
      fetchAccount();
      return;
    }
    if (accountState !== "ready") {
      acct.appendChild(el("p", "acct-msg", "Your TBL Hub records couldn't load. Refresh the page while signed in to TBL Hub."));
      return;
    }
    var a = account;
    var who = el("div", "who");
    who.appendChild(el("div", "initials", a.name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2)));
    var wt = el("div");
    wt.appendChild(el("b", null, a.name));
    wt.appendChild(el("span", null, a.college + " · " + a.program.replace("Bachelor of Science in", "BS") + " · " + a.year_level + " · " + a.section));
    who.appendChild(wt);
    acct.appendChild(who);

    var ask = section("Ask about my records");
    var askRow = el("div", "ask-row");
    ACCOUNT_SUGGESTIONS.forEach(function (q) {
      var c = el("button", "chip mine", q); c.type = "button";
      c.addEventListener("click", function () { newChat(q); });
      askRow.appendChild(c);
    });
    ask.appendChild(askRow);
    acct.appendChild(ask);

    var dl = section("Deadlines · " + a.term);
    var rows = el("ul", "rows");
    a.deadlines.forEach(function (d) {
      var li = el("li", "dl");
      li.appendChild(el("b", null, d.course + " · " + d.title));
      li.appendChild(dueChip(d));
      li.appendChild(el("small", null, new Date(d.due).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " · " + d.status));
      rows.appendChild(li);
    });
    dl.appendChild(rows);
    acct.appendChild(dl);

    var gr = section("Grades so far");
    a.grades.forEach(function (g) {
      var kv = el("div", "kv");
      kv.appendChild(el("span", null, g.course + " · " + g.item));
      kv.appendChild(el("span", null, g.score + "/" + g.max));
      gr.appendChild(kv);
    });
    if (a.previous_term_gwa) {
      var gwa = el("div", "kv");
      gwa.appendChild(el("span", null, "Previous term GWA"));
      gwa.appendChild(el("span", null, a.previous_term_gwa));
      gr.appendChild(gwa);
    }
    acct.appendChild(gr);

    var cl = section("Classes (COR)");
    a.courses.forEach(function (c) {
      var kv = el("div", "kv");
      kv.appendChild(el("span", null, c.code + " · " + c.schedule.map(function (m) { return m.days + " " + m.time + ", " + m.room; }).join(" / ")));
      kv.appendChild(el("span", null, c.units + " u"));
      cl.appendChild(kv);
    });
    acct.appendChild(cl);

    var withLinks = a.courses.filter(function (c) { return c.meet_link; });
    if (withLinks.length) {
      var ml = section("Class links · Google Meet");
      withLinks.forEach(function (c) { ml.appendChild(meetCard(c.meet_link, c.code + " · " + c.title)); });
      acct.appendChild(ml);
    }

    acct.appendChild(el("p", "acct-msg", "From TBL Hub as of " + new Date(a.as_of + "T00:00").toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" }) + ". " + NOTICE));
  }

  // ---------- chat ----------
  function shortSection(section) {
    var parts = section.split(" › "), last = parts[parts.length - 1];
    if (/^(requirements|[A-Z]\.\s)/i.test(last) && parts.length > 1) last = parts[parts.length - 2] + " › " + last;
    return last.replace(/:$/, "");
  }

  var URL_RE = /https:\/\/[^\s<>()"']+[^\s<>()"'.,;:!?]/g;
  var MEET_RE = /^https:\/\/meet\.google\.com\/[a-z-]+$/;

  function appendLinkified(node, text) {
    var last = 0;
    text.replace(URL_RE, function (url, at) {
      node.appendChild(document.createTextNode(text.slice(last, at)));
      var a = el("a", null, url);
      a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer";
      node.appendChild(a);
      last = at + url.length;
      return url;
    });
    node.appendChild(document.createTextNode(text.slice(last)));
  }

  function copyText(text, btn) {
    var done = function (label) { btn.textContent = label; setTimeout(function () { btn.textContent = "Copy"; }, 1800); };
    try {
      navigator.clipboard.writeText(text).then(function () { done("Copied"); }, function () { done("Copy failed"); });
    } catch (e) { done("Copy failed"); }
  }

  function meetCard(url, title) {
    var card = el("div", "meet");
    var ic = el("div", "meet-ic"); ic.innerHTML = ICON.video;
    var t = el("div", "meet-t");
    t.appendChild(el("b", null, title || "Google Meet"));
    t.appendChild(el("span", null, url.replace("https://", "")));
    var join = el("a", "mbtn join", "Join");
    join.href = url; join.target = "_blank"; join.rel = "noopener noreferrer";
    join.setAttribute("aria-label", "Join " + (title || "Google Meet"));
    var copy = el("button", "mbtn", "Copy"); copy.type = "button";
    copy.setAttribute("aria-label", "Copy link for " + (title || "Google Meet"));
    copy.addEventListener("click", function () { copyText(url, copy); });
    card.appendChild(ic); card.appendChild(t); card.appendChild(join); card.appendChild(copy);
    return card;
  }

  var NEXT = {
    none: "Checking your message…",
    guard: "Understanding your question…",
    rewrite: "Searching official sources…",
    retrieve: "Drafting an answer…",
    answer: "Verifying citations…",
    verify: "Writing a friendly reply…",
    tone: "Finishing up…",
  };

  function stepList(steps) {
    var ol = el("ol", "steps");
    steps.forEach(function (st) {
      var li = el("li");
      li.appendChild(el("b", null, st.label));
      if (st.detail) li.appendChild(el("span", null, st.detail));
      ol.appendChild(li);
    });
    return ol;
  }

  function thinkDetails(steps) {
    var d = el("details", "think");
    d.appendChild(el("summary", null, "Show thinking"));
    d.appendChild(stepList(steps));
    return d;
  }

  function liveThinking(steps) {
    var row = el("div", "row bot"); row.appendChild(avatar());
    var box = el("div", "live");
    box.setAttribute("aria-label", TITLE + " is thinking");
    var head = el("div", "live-head");
    head.appendChild(loader(false));
    head.appendChild(el("span", null, NEXT[steps.length ? steps[steps.length - 1].key : "none"]));
    box.appendChild(head);
    if (steps.length) box.appendChild(stepList(steps));
    row.appendChild(box);
    return row;
  }

  function followUps(m) {
    var items = (m.follow_ups || []).slice(0, 3);
    if (!items.length && (m.status === "not_in_sources" || m.status === "invalid")) items = SUGGESTIONS.slice(0, 3);
    if (!items.length && m.status === "greeting") items = (TOKEN ? ACCOUNT_SUGGESTIONS : SUGGESTIONS).slice(0, 3);
    if (!items.length) return null;
    var box = el("div", "follow");
    box.appendChild(el("span", "follow-label", "Suggested replies"));
    items.forEach(function (q) {
      var c = el("button", "chip", q); c.type = "button";
      c.addEventListener("click", function () { send(q); });
      box.appendChild(c);
    });
    return box;
  }

  function bubble(m) {
    var row = el("div", "row " + (m.role === "user" ? "user" : "bot"));
    if (m.role !== "user") row.appendChild(avatar());
    var stack = el("div", "stack"), msg = el("div", "msg");
    if (m.role !== "user" && m.steps && m.steps.length) stack.appendChild(thinkDetails(m.steps));
    if (m.role === "user") {
      msg.textContent = m.text;
    } else if (m.status === "not_in_sources") {
      msg.className += " refusal";
      msg.appendChild(el("div", "label muted", "Not in the official sources"));
      msg.appendChild(document.createTextNode(FALLBACK + "."));
      msg.appendChild(el("div", "hint", "Try rephrasing, or ask the office concerned directly."));
    } else if (m.status === "error") {
      msg.className += " error";
      msg.textContent = m.text;
    } else {
      if (m.status === "conflict") { msg.className += " conflict"; msg.appendChild(el("div", "label warn", "⚠ The sources conflict")); }
      appendLinkified(msg, m.text);
      (m.text.match(URL_RE) || []).filter(function (u, i, a) { return MEET_RE.test(u) && a.indexOf(u) === i; })
        .forEach(function (u) { msg.appendChild(meetCard(u, "Google Meet")); });
      if (m.note) msg.appendChild(el("div", "note", m.note));
      if (m.citations && m.citations.length) {
        var cites = el("div", "cites");
        m.citations.forEach(function (c) {
          var mine = c.id.indexOf("Account-") === 0;
          var chip = el("span", "cite" + (mine ? " mine" : ""));
          chip.title = c.source + " · " + c.section;
          chip.appendChild(el("b", null, mine ? "My TBL Hub" : c.source));
          chip.appendChild(document.createTextNode(" · " + shortSection(c.section)));
          cites.appendChild(chip);
        });
        msg.appendChild(cites);
      }
    }
    stack.appendChild(msg);
    stack.appendChild(el("div", "stamp", clock(m.at)));
    row.appendChild(stack);
    return row;
  }

  function renderThread() {
    var t = thread(current);
    log.textContent = "";
    log.appendChild(bubble({ role: "bot", status: "greeting", at: t ? t.created : Date.now(), text: GREETING }));
    if (!t || !t.messages.length) {
      if (TOKEN) log.appendChild(suggestions(ACCOUNT_SUGGESTIONS, true));
      log.appendChild(suggestions(SUGGESTIONS));
    }
    if (t) t.messages.forEach(function (m) { log.appendChild(bubble(m)); });
    var last = t && t.messages[t.messages.length - 1];
    if (busy && t && t.pending) log.appendChild(liveThinking(t.pending.steps));
    else if (last && last.role !== "user" && last.status !== "error") {
      var f = followUps(last);
      if (f) log.appendChild(f);
    }
    log.scrollTop = log.scrollHeight;
  }

  function openThread(id) {
    current = id; view = "chat"; tab = "chats";
    layout();
    input.focus();
  }

  function newChat(question) {
    if (busy) return;
    var t = newThread();
    openThread(t.id);
    if (question) send(question);
  }

  function historyFor(t) {
    return t.messages
      .filter(function (m) { return m.status !== "error"; })
      .slice(-HISTORY_TURNS)
      .map(function (m) { return { role: m.role === "user" ? "user" : "assistant", content: m.text }; });
  }

  function send(question) {
    question = (question || "").trim();
    if (!question || busy) return;
    var t = thread(current) || newThread();
    current = t.id;
    var history = historyFor(t);
    if (!t.messages.length) t.title = question.length > 60 ? question.slice(0, 57) + "…" : question;
    t.messages.push({ role: "user", text: question, at: Date.now() });
    t.updated = Date.now();
    t.pending = { steps: [] };
    busy = true; sendBtn.disabled = true;
    persist();
    layout();

    fetch(API + "/chat/stream", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ question: question, college: college || null, channel: CHANNEL, history: history }),
    })
      .then(function (r) {
        if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
        var reader = r.body.getReader(), dec = new TextDecoder(), buf = "", result = null;
        function handle(line) {
          if (!line.trim()) return;
          var ev = JSON.parse(line);
          if (ev.type === "step") { t.pending.steps.push(ev); if (current === t.id) renderThread(); }
          else if (ev.type === "result") result = ev;
          else throw new Error(ev.message || "stream error");
        }
        function pump() {
          return reader.read().then(function (chunk) {
            if (chunk.done) { handle(buf); if (!result) throw new Error("incomplete"); return result; }
            buf += dec.decode(chunk.value, { stream: true });
            var lines = buf.split("\n"); buf = lines.pop();
            lines.forEach(handle);
            return pump();
          });
        }
        return pump();
      })
      .then(function (res) {
        t.messages.push({ role: "bot", status: res.status, text: res.answer, citations: res.citations, note: res.conflict_note,
          steps: res.steps || [], follow_ups: res.follow_ups || [], at: Date.now() });
      })
      .catch(function () {
        t.messages.push({ role: "bot", status: "error", text: "I can't reach the assistant right now. Please try again in a moment.", at: Date.now() });
      })
      .finally(function () {
        delete t.pending;
        t.messages = t.messages.slice(-MAX_MESSAGES);
        t.updated = Date.now();
        busy = false; sendBtn.disabled = false;
        persist();
        layout();
      });
  }

  // ---------- open / close ----------
  function open(question) {
    panel.classList.add("open");
    launcher.setAttribute("aria-expanded", "true");
    fetchAccount();
    if (question) return newChat(question);
    layout();
  }
  function close() {
    if (full) { full = false; layout(); }
    panel.classList.remove("open");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }
  function showInbox() { view = "inbox"; layout(); $(".new-chat").focus(); }
  function setCollege(code) {
    college = code || null;
    save(KEY_COLLEGE, college);
  }

  launcher.addEventListener("click", function () { panel.classList.contains("open") ? close() : open(); });
  $$(".close").forEach(function (b) { b.addEventListener("click", close); });
  $$(".expand").forEach(function (b) { b.addEventListener("click", function () { setWide(!wide); }); });
  $$(".maximize").forEach(function (b) { b.addEventListener("click", function () { setFull(!full); }); });
  $(".back").addEventListener("click", showInbox);
  $(".new-chat").addEventListener("click", function () { newChat(); });
  $("#tab-chats").addEventListener("click", function () { tab = "chats"; layout(); });
  $("#tab-account").addEventListener("click", function () { tab = "account"; view = "inbox"; layout(); });
  root.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" || !panel.classList.contains("open")) return;
    if (full) setFull(false); else close();
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); var q = input.value; input.value = ""; send(q); });
  input.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });

  fetch(API + "/config")
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (cfg) {
      if (!cfg) return;
      telegramUrl = telegramUrl || cfg.telegram_url;
      if (telegramUrl) { tg.href = telegramUrl; tg.hidden = false; }
    })
    .catch(function () { /* chat still works without config */ });

  (document.body || document.documentElement).appendChild(host);
  window.HeronsGuide = {
    open: open,
    close: close,
    openInbox: function () { open(); view = "inbox"; tab = "chats"; layout(); },
    openAccount: function () { open(); view = "inbox"; tab = "account"; layout(); },
    newChat: function (q) { open(); newChat(q); },
    setCollege: setCollege,
    setWide: setWide,
    setFull: setFull,
  };
  // phones get a full-screen panel, so only open on load where the page stays visible
  if (attr("open", null) === "inbox" && !matchMedia("(max-width: 480px)").matches) window.HeronsGuide.openInbox();
})();
