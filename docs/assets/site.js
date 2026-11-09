// Retractable contents drawer. The page works fully without this script.
(function () {
  var drawer = document.getElementById("drawer");
  var toggle = document.getElementById("drawer-toggle");
  if (!drawer || !toggle) return;
  var label = toggle.querySelector(".app-switch__label");
  function set(open) {
    toggle.setAttribute("aria-checked", open ? "true" : "false");
    drawer.classList.toggle("is-collapsed", !open);
    if (label) label.textContent = open ? "Hide contents" : "Show contents";
    try { window.localStorage.setItem("ndl-drawer", open ? "open" : "closed"); } catch (e) { /* storage unavailable: keep in memory */ }
  }
  var saved = null;
  try { saved = window.localStorage.getItem("ndl-drawer"); } catch (e) { saved = null; }
  set(saved !== "closed");
  toggle.addEventListener("click", function () { set(toggle.getAttribute("aria-checked") !== "true"); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && toggle.getAttribute("aria-checked") === "true" && drawer.contains(document.activeElement)) { set(false); toggle.focus(); }
  });
})();
