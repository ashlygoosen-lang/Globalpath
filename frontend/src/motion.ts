/**
 * GlobalPath motion system.
 *
 * One small engine, no libraries:
 *  - scroll reveals (IntersectionObserver), auto-applied to known content blocks on every page
 *  - count-up numbers for figures
 *  - hero parallax and pointer light (desktop only)
 *  - magnetic primary buttons and gentle card tilt (fine pointers only)
 *  - route-change hook for page transitions
 *
 * Content is fully visible without JavaScript. Hidden start states only apply once
 * <html> carries the `motion` class, which is never added when the visitor prefers
 * reduced motion.
 */

const REVEAL = [
  // headings and intros
  ".head-split", ".intro-copy > *", ".corp-copy > *", ".fee-band-copy > *", ".two-col > *",
  ".prose > *", ".legal-section", ".booking-intro > *", ".asy-intro > *", ".contact-info > *",
  // grids, lists and cards (staggered by parent)
  ".proof > div", ".strengths > div", ".service-index > li", ".timeline > li", ".article-grid > a",
  ".fee-band-prices > a", ".mini-visas > a", ".faq details", ".values > *", ".price-grid > *",
  ".steps > li", ".phases > *", ".asy-cols > *", ".asy-fees > *", ".side-card", ".feature-article",
  ".facts > *", ".estimator", ".fee-table-wrap", ".directory-group", ".cta-inner > *",
  // imagery
  ".photo", ".feature-graphic",
].join(",");

const COUNT = ".proof strong, .fee-band-prices strong, .price-amount strong";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = () => matchMedia("(hover: hover) and (pointer: fine)").matches;

let io: IntersectionObserver | null = null;
let countIo: IntersectionObserver | null = null;

/* ---------------- reveals ---------------- */
function tag(root: ParentNode) {
  const els = root.querySelectorAll<HTMLElement>(REVEAL);
  els.forEach(el => {
    if (el.dataset.reveal || el.dataset.revealed) return;
    el.dataset.reveal = el.classList.contains("photo") ? "image" : "up";
    // stagger siblings that are revealed together
    const parent = el.parentElement;
    if (parent) {
      const sibs = Array.from(parent.children).filter(c => (c as HTMLElement).matches?.(REVEAL));
      const i = sibs.indexOf(el);
      if (sibs.length > 1 && i > 0) el.style.setProperty("--i", String(Math.min(i, 8)));
    }
    // anything already on screen at load reveals at once, without waiting for a scroll
    io?.observe(el);
  });
  root.querySelectorAll<HTMLElement>(COUNT).forEach(el => {
    if (el.dataset.count) return;
    if (!/\d/.test(el.textContent || "")) return;
    el.dataset.count = "1";
    countIo?.observe(el);
  });
}

/* ---------------- count-up ---------------- */
function countUp(el: HTMLElement) {
  const final = el.textContent || "";
  const m = final.match(/^(\D*)([\d,]+)(.*)$/);
  if (!m) return;
  const [, pre, digits, post] = m;
  const target = Number(digits.replace(/,/g, ""));
  if (!target) return;
  // lock the width so the layout never shifts while digits change
  el.style.minWidth = `${el.getBoundingClientRect().width}px`;
  el.classList.add("is-counting");
  const fmt = (n: number) => (digits.includes(",") ? n.toLocaleString("en-US") : String(n));
  const dur = target > 100 ? 1400 : 1000;
  const t0 = performance.now();
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur);
    const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = pre + fmt(Math.round(target * eased)) + post;
    if (p < 1) requestAnimationFrame(step);
    else { el.textContent = final; el.classList.remove("is-counting"); el.style.minWidth = ""; }
  };
  requestAnimationFrame(step);
}

/* ---------------- hero parallax + light ---------------- */
let raf = 0;
function onScroll() {
  if (raf) return;
  raf = requestAnimationFrame(() => {
    raf = 0;
    const y = scrollY;
    document.documentElement.style.setProperty("--scroll", String(Math.min(y, 1200)));
  });
}
function onHeroPointer(e: PointerEvent) {
  const hero = (e.target as HTMLElement).closest<HTMLElement>(".hero");
  if (!hero) return;
  const r = hero.getBoundingClientRect();
  hero.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  hero.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
}

/* ---------------- magnetic buttons + tilt ---------------- */
function onPointerMove(e: PointerEvent) {
  const t = e.target as HTMLElement;
  const mag = t.closest<HTMLElement>(".hero-actions .btn, .cta-actions .btn, .header-cta, .fee-band-copy .link");
  if (mag) {
    const r = mag.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
    const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    mag.style.setProperty("--tx", `${(dx * 5).toFixed(2)}px`);
    mag.style.setProperty("--ty", `${(dy * 4).toFixed(2)}px`);
    mag.classList.add("is-magnet");
  }
  const card = t.closest<HTMLElement>(".fee-band-prices > a, .article-card, .mini-visas > a");
  if (card) {
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    card.style.setProperty("--rx", `${(-py * 4).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${(px * 5).toFixed(2)}deg`);
    card.style.setProperty("--gx", `${(px + 0.5) * 100}%`);
    card.style.setProperty("--gy", `${(py + 0.5) * 100}%`);
  }
}
function onPointerOut(e: PointerEvent) {
  const t = e.target as HTMLElement;
  const rel = e.relatedTarget as HTMLElement | null;
  const mag = t.closest<HTMLElement>(".is-magnet");
  if (mag && !mag.contains(rel)) { mag.style.removeProperty("--tx"); mag.style.removeProperty("--ty"); mag.classList.remove("is-magnet"); }
  const card = t.closest<HTMLElement>(".fee-band-prices > a, .article-card, .mini-visas > a");
  if (card && !card.contains(rel)) { card.style.removeProperty("--rx"); card.style.removeProperty("--ry"); }
}

/* ---------------- public API ---------------- */
export function initMotion() {
  if (typeof window === "undefined" || reduced()) return;
  const html = document.documentElement;
  html.classList.add("motion");

  io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) {
      const el = en.target as HTMLElement;
      el.classList.add("is-in");
      io!.unobserve(el);
      // once revealed, hand the element back to its own hover transitions
      const delay = Number(el.style.getPropertyValue("--i") || 0) * 70;
      setTimeout(() => { el.dataset.revealed = "1"; delete el.dataset.reveal; el.style.removeProperty("--i"); }, 1700 + delay);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  countIo = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { countUp(en.target as HTMLElement); countIo!.unobserve(en.target); }
  }, { threshold: 0.6 });

  // keep up with content that React renders later (async data, tabs, route changes)
  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; tag(document); });
  }).observe(document.getElementById("root") || document.body, { childList: true, subtree: true });
  tag(document);

  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  if (finePointer()) {
    document.addEventListener("pointermove", onHeroPointer, { passive: true });
    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
  }

  // reveal anything still hidden if the observer somehow never fires (print, odd browsers)
  addEventListener("beforeprint", () => document.querySelectorAll("[data-reveal]").forEach(el => el.classList.add("is-in")));
}

/**
 * A short brand intro on the first visit of a session: the mark settles on navy, then the
 * curtain lifts and the page's own entrance plays. About 0.9 seconds, skipped for reduced motion.
 */
export function playIntro() {
  if (typeof window === "undefined" || reduced()) return;
  try { if (sessionStorage.getItem("gp-intro")) return; sessionStorage.setItem("gp-intro", "1"); } catch { return; }
  const html = document.documentElement;
  html.classList.add("has-intro");
  const el = document.createElement("div");
  el.className = "gp-intro";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="gp-intro-mark"><img src="/logo.png" alt="" width="72" height="72"><span>GlobalPath</span></div>';
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("is-leaving"), 750);
  setTimeout(() => el.remove(), 1500);
  setTimeout(() => html.classList.remove("has-intro"), 4000);
}

/** Called on every route change: restarts the page-enter transition and the top progress line. */
export function pageChanged() {
  if (!document.documentElement.classList.contains("motion")) return;
  const bar = document.querySelector<HTMLElement>(".route-progress");
  if (bar) { bar.classList.remove("is-running"); void bar.offsetWidth; bar.classList.add("is-running"); }
}

/** Splits a heading into word spans for the line-by-line reveal. Screen readers read the plain text. */
export function words(text: string) {
  return text.split(" ").map((w, i, a) => ({ w, i, last: i === a.length - 1 }));
}
