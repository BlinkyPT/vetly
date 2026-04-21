import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import type { AssessRequest } from "@vetly/shared";

/**
 * Server-side content extraction. Mirrors the extension's in-browser
 * Readability extract so the URL-assessment page works even for users
 * without the extension.
 */
export function extractFromHtml(url: string, html: string): AssessRequest | null {
  try {
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;
    const parsed = new Readability(doc).parse();
    if (!parsed?.textContent) return null;

    const published = doc.querySelector<HTMLMetaElement>("meta[property='article:published_time']")?.content
                  ?? doc.querySelector<HTMLMetaElement>("meta[name='pubdate']")?.content
                  ?? doc.querySelector<HTMLMetaElement>("meta[name='date']")?.content
                  ?? null;
    const author = doc.querySelector<HTMLMetaElement>("meta[name='author']")?.content
                ?? parsed.byline
                ?? null;

    const adCount = doc.querySelectorAll("[id^='google_ads'], ins.adsbygoogle, [data-ad-slot], iframe[src*='doubleclick']").length;

    const host = new URL(url).hostname;
    const outlinks: string[] = [];
    for (const a of doc.querySelectorAll<HTMLAnchorElement>("article a[href^='http'], main a[href^='http']")) {
      try {
        const u = new URL(a.getAttribute("href") ?? "");
        if (u.hostname !== host) outlinks.push(u.toString());
      } catch { /* ignore */ }
    }

    const text = parsed.textContent.trim().replace(/\s+/g, " ");
    const wordCount = text.split(" ").filter(Boolean).length;

    return {
      url,
      title: parsed.title ?? doc.title,
      content: text.slice(0, 50_000),
      published_at: published,
      author,
      outlinks: outlinks.slice(0, 40),
      ad_slot_count: adCount,
      word_count: wordCount,
    };
  } catch {
    return null;
  }
}
