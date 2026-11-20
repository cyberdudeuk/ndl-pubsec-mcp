// Renders tools/site/ecosystem.json as an interactive, linked SVG (every component is a link; hovering or
// focusing one highlights what it connects to and shows what it is) plus an accessible table of the same
// components. Used twice: inside the page (Estate map, Ecosystem tab) and as the standalone docs/ecosystem.html.
// Every reference is checked: an edge to an unknown node, or a node without an https link, stops the build.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

// Counts in labels come from the data as {placeholders}, never typed in (defect D-044, check C-37).
export function loadEcosystem(values = {}) {
  const raw = readFileSync(join(here, "ecosystem.json"), "utf8").replace(/\{(\w+)\}/g, (m, k) => {
    if (!(k in values)) throw new Error(`ecosystem.json: no value for {${k}}`);
    return String(values[k]);
  });
  const eco = JSON.parse(raw);
  const ids = new Set(eco.nodes.map((n) => n.id));
  for (const n of eco.nodes) {
    if (!/^https:\/\//.test(n.url)) throw new Error(`ecosystem.json: ${n.id} needs an https url`);
    if (!eco.groups[n.group]) throw new Error(`ecosystem.json: ${n.id} has unknown group ${n.group}`);
    if (!n.icon && !n.logo) throw new Error(`ecosystem.json: ${n.id} needs an icon or a logo`);
  }
  for (const e of eco.edges) if (!ids.has(e.from) || !ids.has(e.to)) throw new Error(`ecosystem.json: edge ${e.from} to ${e.to} names an unknown node`);
  return eco;
}

// The owner's own marks only (tools/site/logos/README.md). Their outer <svg> is replaced by a positioned one.
function logo(name, x, y, size) {
  const raw = readFileSync(join(here, "logos", `${name}.svg`), "utf8");
  const vb = raw.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 64 64";
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "").replace(/<title[\s\S]*?<\/title>|<desc[\s\S]*?<\/desc>/g, "").replace(/\s(id|aria-labelledby)="[^"]*"/g, "");
  return `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox="${vb}" aria-hidden="true">${inner}</svg>`;
}

export function renderEcosystem(eco, { esc, iconPaths, idPrefix = "eco" }) {
  const byId = Object.fromEntries(eco.nodes.map((n) => [n.id, n]));
  const glyph = (name, x, y) => `<svg x="${x}" y="${y}" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="eco__icon">${iconPaths[name] ?? ""}</svg>`;
  const nodes = eco.nodes.map((n) => {
    const first = n.lines.map((l, i) => `<text class="eco__line" x="${n.x + 40}" y="${n.y + 44 + 16 * i}">${esc(l)}</text>`).join("");
    const mark = n.logo ? logo(n.logo, n.x + 12, n.y + 11, 20) : glyph(n.icon, n.x + 13, n.y + 12);
    const links = [n.id, ...eco.edges.filter((e) => e.from === n.id || e.to === n.id).map((e) => (e.from === n.id ? e.to : e.from))];
    return `<a class="eco__node eco__node--${n.group}" href="${esc(n.url)}" data-node="${esc(n.id)}" data-links="${esc(links.join(" "))}" aria-label="${esc(`${n.name}: ${n.about}`)}" aria-describedby="${idPrefix}-about"><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="10"/>${mark}<text class="eco__name" x="${n.x + 40}" y="${n.y + 27}">${esc(n.name)}</text>${first}<title>${esc(n.about)}</title></a>`;
  }).join("");
  const edges = eco.edges.map((e) => `<g class="eco__edge${e.proposed ? " eco__edge--proposed" : ""}" data-from="${esc(e.from)}" data-to="${esc(e.to)}"><path d="${esc(e.path)}" marker-end="url(#${idPrefix}-arrow)"/>${e.label ? `<text x="${e.lx}" y="${e.ly}"${e.anchor ? ` text-anchor="${e.anchor}"` : ""}>${esc(e.label)}</text>` : ""}</g>`).join("");
  const svg = `<svg class="eco" viewBox="0 0 760 556" role="group" aria-labelledby="${idPrefix}-title ${idPrefix}-key">
<defs><marker id="${idPrefix}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="eco__head"/></marker></defs>
<text id="${idPrefix}-title" class="eco__title" x="24" y="30">${esc(eco.title)}</text>
<text id="${idPrefix}-key" class="eco__key" x="24" y="52">Solid lines exist today; dashed lines are proposed. Select a component to open it.</text>
<rect class="eco__estate" x="24" y="182" width="712" height="276" rx="12"/><text class="eco__group" x="720" y="200" text-anchor="end">${esc(eco.groups.estate)}</text>
${edges}${nodes}</svg>`;
  const rows = eco.nodes.map((n) => `<tr><th scope="row"><a href="${esc(n.url)}">${esc(n.name)}</a>${(n.links ?? []).map(([t, u]) => ` · <a href="${esc(u)}">${esc(t)}</a>`).join("")}</th><td>${esc(eco.groups[n.group])}</td><td>${esc(n.about)}</td><td>${eco.edges.filter((e) => e.from === n.id).map((e) => `${esc(byId[e.to].name)}${e.label ? ` (${esc(e.label)})` : ""}${e.proposed ? ", proposed" : ""}`).join("; ") || "–"}</td></tr>`).join("");
  return `<div class="eco-wrap" data-eco>
<div class="scroll-x" role="region" aria-label="Ecosystem diagram, scrolls sideways on small screens" tabindex="0">${svg}</div>
<p class="eco__about" id="${idPrefix}-about" aria-live="polite">Hover over or focus a component to see what it is and what it connects to.</p>
<div class="table-wrap" role="region" aria-labelledby="${idPrefix}-cap" tabindex="0"><table><caption id="${idPrefix}-cap">The components, what each is, and what it feeds (as of ${esc(eco.asOf)})</caption><thead><tr><th scope="col">Component</th><th scope="col">Kind</th><th scope="col">What it is</th><th scope="col">Feeds</th></tr></thead><tbody>${rows}</tbody></table></div>
</div>`;
}

// Styles and behaviour shared by the page and the standalone file. Colours come from the page's tokens.
export const ECO_CSS = `
.eco { width: 100%; min-width: 720px; height: auto; font-family: inherit; }
.eco__title { font-size: 16px; font-weight: 700; fill: var(--ink); }
.eco__key, .eco__group { font-size: 12px; fill: var(--ink-2); }
.eco__estate { fill: var(--surface-2); stroke: var(--line); }
.eco__node > rect { fill: var(--surface); stroke: var(--ink-3); stroke-width: 1.25; transition: stroke .15s, fill .15s; }
.eco__node--finder > rect { fill: color-mix(in srgb, var(--brand) 12%, var(--surface)); stroke: var(--brand); stroke-width: 2; }
.eco__name { font-size: 13.5px; font-weight: 700; fill: var(--ink); }
.eco__line { font-size: 12px; fill: var(--ink-2); }
.eco__icon { color: var(--brand); }
.eco__node { cursor: pointer; outline: none; }
.eco__node:hover > rect, .eco__node:focus-visible > rect, .eco__node.is-on > rect { stroke: var(--brand); stroke-width: 2.5; }
.eco__node:focus-visible > rect { stroke: var(--focus); stroke-width: 3; }
.eco__edge path { fill: none; stroke: var(--ink-3); stroke-width: 1.3; transition: stroke .15s, opacity .15s; }
.eco__edge--proposed path { stroke-dasharray: 5 4; }
.eco__edge text { font-size: 11px; fill: var(--ink-2); }
.eco__head { fill: var(--ink-3); }
[data-eco].is-focused .eco__edge, [data-eco].is-focused .eco__node { opacity: .3; }
[data-eco].is-focused .eco__edge.is-on, [data-eco].is-focused .eco__node.is-on { opacity: 1; }
.eco__edge.is-on path { stroke: var(--brand); stroke-width: 2; }
.eco__about { min-height: 3em; margin: 10px 0 14px; color: var(--ink-2); }
@media (prefers-reduced-motion: reduce) { .eco__node > rect, .eco__edge path { transition: none; } }
`;

// Plain script (no framework): highlight a component and its connections, and describe it in the live region.
export const ECO_JS = `(function () {
  document.querySelectorAll("[data-eco]").forEach(function (wrap) {
    var about = wrap.querySelector(".eco__about"), base = about ? about.textContent : "";
    function on(node) {
      var links = (node.getAttribute("data-links") || "").split(" "), id = node.getAttribute("data-node");
      wrap.classList.add("is-focused");
      wrap.querySelectorAll(".eco__node").forEach(function (n) { n.classList.toggle("is-on", links.indexOf(n.getAttribute("data-node")) !== -1); });
      wrap.querySelectorAll(".eco__edge").forEach(function (e) { e.classList.toggle("is-on", e.getAttribute("data-from") === id || e.getAttribute("data-to") === id); });
      if (about) about.textContent = node.getAttribute("aria-label") || base;
    }
    function off() {
      wrap.classList.remove("is-focused");
      wrap.querySelectorAll(".is-on").forEach(function (x) { x.classList.remove("is-on"); });
      if (about) about.textContent = base;
    }
    wrap.querySelectorAll(".eco__node").forEach(function (n) {
      n.addEventListener("mouseenter", function () { on(n); });
      n.addEventListener("focus", function () { on(n); });
      n.addEventListener("mouseleave", off);
      n.addEventListener("blur", off);
    });
    wrap.addEventListener("keydown", function (ev) { if (ev.key === "Escape") { off(); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); } });
  });
})();`;
