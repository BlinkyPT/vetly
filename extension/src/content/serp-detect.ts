/**
 * SERP result-block detection. Google's DOM is a moving target — we try
 * multiple selectors ordered by preference. Any match that yields a
 * reachable anchor with a valid http(s) href and a containing title block
 * counts as a result we want to annotate.
 *
 * We explicitly skip:
 * - Google knowledge cards ("People also ask", "Top stories")
 * - Ad slots (Google tags these with `data-text-ad` / aria labels)
 * - Internal google.com/support links
 * - AI overview block anchors (handled separately by another detector)
 */

const ORGANIC_SELECTORS = [
  "div.g:has(a h3)",           // classic organic blue-link
  "div[data-hveid]:has(a h3)", // modern variant with hveid
  "div.MjjYud:has(a h3)",      // 2024+ layout
];

const SKIP_HOST_PATTERNS = [
  /^www\.google\./,
  /^translate\.google\./,
  /^accounts\.google\./,
  /^policies\.google\./,
  /^support\.google\./,
];

export type DetectedResult = {
  container: HTMLElement;
  anchor: HTMLAnchorElement;
  titleEl: HTMLElement;
  url: string;
  domain: string;
};

export function detectResults(root: ParentNode = document): DetectedResult[] {
  const containers = new Set<Element>();
  for (const sel of ORGANIC_SELECTORS) {
    try {
      for (const el of root.querySelectorAll(sel)) containers.add(el);
    } catch {
      // :has() may not match in some very old chromiums — selector is optional.
    }
  }

  const out: DetectedResult[] = [];
  for (const c of containers) {
    // Skip ad slots.
    if (c.hasAttribute("data-text-ad") || c.closest("[data-text-ad]")) continue;
    if (c.getAttribute("aria-label")?.toLowerCase() === "ad") continue;

    const anchor = c.querySelector<HTMLAnchorElement>("a:has(h3)") ?? c.querySelector<HTMLAnchorElement>("a[href^='http']");
    const titleEl = c.querySelector<HTMLElement>("h3");
    if (!anchor || !titleEl) continue;

    const href = anchor.href;
    let url: URL;
    try {
      url = new URL(href);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol)) continue;
    if (SKIP_HOST_PATTERNS.some((re) => re.test(url.hostname))) continue;

    out.push({
      container: c as HTMLElement,
      anchor,
      titleEl,
      url: url.toString(),
      domain: url.hostname.toLowerCase().replace(/^www\./, ""),
    });
  }
  return out;
}
