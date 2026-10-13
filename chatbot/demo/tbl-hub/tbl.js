// Wires the "Ask HeronsGuide" dashboard block and the placements toggle to the widget.
(function () {
  "use strict";

  function whenWidget(fn) {
    if (window.HeronsGuide) return fn(window.HeronsGuide);
    var tries = 0;
    var t = setInterval(function () {
      if (window.HeronsGuide || ++tries > 50) {
        clearInterval(t);
        if (window.HeronsGuide) fn(window.HeronsGuide);
      }
    }, 100);
  }

  var form = document.querySelector(".ask-form");
  var input = document.getElementById("ask-input");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return input.focus();
    input.value = "";
    whenWidget(function (hh) { hh.open(q); });
  });
  document.querySelectorAll(".ask-chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      whenWidget(function (hh) { hh.open(chip.textContent); });
    });
  });

  // Telegram link comes from the chatbot's /config (TELEGRAM_BOT_USERNAME).
  var tg = document.querySelector(".tg-link");
  fetch("/config").then(function (r) { return r.json(); }).then(function (cfg) {
    if (cfg.telegram_url) tg.href = cfg.telegram_url;
    else tg.closest(".ask-foot").hidden = true;
  }).catch(function () { tg.closest(".ask-foot").hidden = true; });

  var toggle = document.querySelector(".placements-toggle");
  toggle.addEventListener("click", function () {
    var on = document.body.classList.toggle("show-placements");
    toggle.setAttribute("aria-pressed", String(on));
    toggle.textContent = on ? "Hide HeronsGuide placements" : "Show HeronsGuide placements";
  });
})();
