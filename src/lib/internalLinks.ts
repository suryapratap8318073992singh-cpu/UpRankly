import "server-only";
import * as cheerio from "cheerio";
import { safeFetchHtml, safeFetchText, hostnameIsBlocked } from "@/lib/url";
import { extractTopTerms } from "@/lib/audit";

const MAX_PAGES = 35;
const FETCH_CONCURRENCY = 6;
const PAGE_TIMEOUT_MS = 8000;

export type PageAnalysis = {
  url: string;
  title: string | null;
  h1: string | null;
  topTerms: string[]; // just the term strings, top 6
  bodyText: string; // truncated, used for matching
  internalLinkTargets: Set<string>; // normalized URLs this page already links to
};

export type LinkOpportunity = {
  sourceUrl: string;
  targetUrl: string;
  anchorText: string;
  snippet: string;
};

function normalizeUrl(u: string): string {
  try {
    const parsed = new URL(u);
    parsed.hash = "";
    if (parsed.pathname !== "/" && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return u;
  }
}

/** Run a list of async tasks with limited concurrency. */
async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R | null>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;
  async function next(): Promise<void> {
    const i = index++;
    if (i >= items.length) return;
    const result = await worker(items[i]).catch(() => null);
    if (result) results.push(result);
    await next();
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

/** Discover up to MAX_PAGES same-origin URLs for a project, via sitemap.xml, falling back to homepage links. */
export async function discoverProjectPages(baseUrl: string): Promise<string[]> {
  const origin = new URL(baseUrl).origin;
  const found = new Set<string>();

  const sitemapXml = await safeFetchText(`${origin}/sitemap.xml`);
  if (sitemapXml) {
    const isIndex = /<sitemapindex/i.test(sitemapXml);
    const locs = [...sitemapXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);

    if (isIndex) {
      // Fetch up to 3 sub-sitemaps and gather their URLs.
      const subSitemaps = locs.slice(0, 3);
      for (const sub of subSitemaps) {
        if (found.size >= MAX_PAGES) break;
        const subXml = await safeFetchText(sub);
        if (!subXml) continue;
        const subLocs = [...subXml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
        for (const loc of subLocs) {
          if (found.size >= MAX_PAGES) break;
          try {
            const u = new URL(loc);
            if (u.origin === origin && !hostnameIsBlocked(u.hostname)) found.add(normalizeUrl(loc));
          } catch { /* skip invalid */ }
        }
      }
    } else {
      for (const loc of locs) {
        if (found.size >= MAX_PAGES) break;
        try {
          const u = new URL(loc);
          if (u.origin === origin && !hostnameIsBlocked(u.hostname)) found.add(normalizeUrl(loc));
        } catch { /* skip invalid */ }
      }
    }
  }

  // Fallback / supplement: crawl homepage links if sitemap gave us too few.
  if (found.size < 5) {
    try {
      const home = await safeFetchHtml(new URL(origin), PAGE_TIMEOUT_MS);
      const $ = cheerio.load(home.html);
      $("a[href]").each((_, el) => {
        if (found.size >= MAX_PAGES) return;
        const href = ($(el).attr("href") ?? "").trim();
        if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
        try {
          const u = new URL(href, origin);
          if (u.origin === origin && !hostnameIsBlocked(u.hostname)) found.add(normalizeUrl(u.toString()));
        } catch { /* skip */ }
      });
      found.add(normalizeUrl(origin));
    } catch { /* homepage fetch failed, return whatever we have */ }
  }

  return [...found].slice(0, MAX_PAGES);
}

/** Fetch + analyze a single page: title, h1, top keywords, existing internal links. */
async function analyzePage(url: string): Promise<PageAnalysis | null> {
  try {
    const parsed = new URL(url);
    const page = await safeFetchHtml(parsed, PAGE_TIMEOUT_MS);
    const $ = cheerio.load(page.html);
    const origin = parsed.origin;

    const title = $("head title").first().text().trim() || null;
    const h1 = $("h1").first().text().trim() || null;
    const bodyText = $("body").clone().find("script,style,noscript").remove().end().text();

    const internalLinkTargets = new Set<string>();
    $("a[href]").each((_, el) => {
      const href = ($(el).attr("href") ?? "").trim();
      if (!href) return;
      try {
        const u = new URL(href, url);
        if (u.origin === origin) internalLinkTargets.add(normalizeUrl(u.toString()));
      } catch { /* skip */ }
    });

    const topTerms = extractTopTerms(bodyText, 6).map((t) => t.term);

    return {
      url: normalizeUrl(url),
      title,
      h1,
      topTerms,
      bodyText: bodyText.slice(0, 20_000), // cap memory per page
      internalLinkTargets,
    };
  } catch {
    return null;
  }
}

/** Analyze all discovered pages of a project with limited concurrency. */
export async function analyzeProjectPages(urls: string[]): Promise<PageAnalysis[]> {
  return runWithConcurrency(urls, FETCH_CONCURRENCY, analyzePage);
}

/**
 * Compare every page against every other page: if page A's text contains
 * page B's keyword/topic but doesn't already link to B, suggest a link.
 */
export function findLinkOpportunities(pages: PageAnalysis[], maxSuggestions = 40): LinkOpportunity[] {
  const opportunities: LinkOpportunity[] = [];

  for (const source of pages) {
    for (const target of pages) {
      if (source.url === target.url) continue;
      if (source.internalLinkTargets.has(target.url)) continue; // already linked

      // Try target's H1/title-derived terms first, then its top keywords.
      const candidateTerms = [
        ...(target.h1 ? [target.h1] : []),
        ...target.topTerms,
      ];

      for (const term of candidateTerms) {
        if (!term || term.length < 4) continue;
        const idx = source.bodyText.toLowerCase().indexOf(term.toLowerCase());
        if (idx === -1) continue;

        const start = Math.max(0, idx - 40);
        const end = Math.min(source.bodyText.length, idx + term.length + 40);
        const snippet = source.bodyText.slice(start, end).replace(/\s+/g, " ").trim();

        opportunities.push({
          sourceUrl: source.url,
          targetUrl: target.url,
          anchorText: term,
          snippet: `…${snippet}…`,
        });
        break; // one suggestion per source→target pair is enough
      }

      if (opportunities.length >= maxSuggestions) return opportunities;
    }
  }

  return opportunities;
}