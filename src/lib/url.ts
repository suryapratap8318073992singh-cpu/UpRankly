import "server-only";
import dns from "node:dns/promises";

/**
 * URL safety engine.
 * - Only http/https allowed.
 * - Blocks localhost, loopback, private/reserved IP ranges and cloud metadata.
 * - Validates every redirect hop.
 * - Enforces timeout + maximum response size.
 */

const MAX_RESPONSE_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const FETCH_TIMEOUT_MS = 12_000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "instance-data",
  "metadata",
]);

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true; // benchmarking
  if (a >= 224) return true; // multicast/reserved/broadcast
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
  if (normalized.startsWith("::ffff:")) {
    return isPrivateIPv4(normalized.replace("::ffff:", ""));
  }
  return false;
}

const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

export function hostnameIsBlocked(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (IPV4_RE.test(h)) return isPrivateIPv4(h);
  if (h.includes(":")) return isPrivateIPv6(h);
  return false;
}

/** Parse + validate a user-supplied URL. Async because it performs DNS checks. */
export async function validatePublicUrl(
  raw: string,
): Promise<{ ok: true; url: URL } | { ok: false; error: string }> {
  let url: URL;
  const trimmed = raw.trim();
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "Please enter a valid website URL." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// URLs are allowed." };
  }
  if (url.username || url.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }
  if (!url.hostname.includes(".") && !IPV4_RE.test(url.hostname)) {
    return { ok: false, error: "Please enter a valid public domain." };
  }
  if (hostnameIsBlocked(url.hostname)) {
    return { ok: false, error: "This address is not allowed." };
  }
  // DNS rebinding guard: resolve hostname and block private destinations.
  if (!IPV4_RE.test(url.hostname) && !url.hostname.includes(":")) {
    try {
      const addresses = await dns.lookup(url.hostname, { all: true });
      if (addresses.length === 0) {
        return { ok: false, error: "Domain could not be resolved." };
      }
      for (const addr of addresses) {
        const privateIp =
          addr.family === 4 ? isPrivateIPv4(addr.address) : isPrivateIPv6(addr.address);
        if (privateIp) {
          return { ok: false, error: "This address is not allowed." };
        }
      }
    } catch {
      return { ok: false, error: "Domain could not be resolved." };
    }
  }
  return { ok: true, url };
}

/** Normalize a URL or bare domain to a canonical hostname (strips scheme + www). */
export function normalizeDomain(input: string): string {
  let url: URL;
  try {
    url = new URL(/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(input) ? input : `https://${input}`);
  } catch {
    return input.trim().toLowerCase();
  }
  let host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);
  return host;
}

export type FetchedPage = {
  finalUrl: string;
  status: number;
  html: string;
  contentType: string;
  responseMs: number;
  bytes: number;
};

async function readBodyLimited(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        chunks.push(value.slice(0, Math.max(0, value.byteLength - (total - MAX_RESPONSE_BYTES))));
        void reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(Math.min(total, MAX_RESPONSE_BYTES));
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return new TextDecoder("utf-8").decode(merged);
}

/** Safely fetch a public web page with redirect validation + size/time limits. */
export async function safeFetchHtml(
  startUrl: URL,
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<FetchedPage> {
  let current = startUrl;
  const started = Date.now();
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(current.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        "User-Agent": "UpRanklyAuditBot/1.0 (+https://uprankly.app/bot)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en",
      },
    });
    const status = res.status;
    if (status >= 300 && status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        return {
          finalUrl: current.toString(),
          status,
          html: "",
          contentType: res.headers.get("content-type") ?? "",
          responseMs: Date.now() - started,
          bytes: 0,
        };
      }
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new Error("Website returned an invalid redirect.");
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new Error("Website redirected to a disallowed protocol.");
      }
      if (hostnameIsBlocked(next.hostname)) {
        throw new Error("Website redirected to a disallowed address.");
      }
      current = next;
      continue;
    }
    if (!res.ok) {
      throw new Error(`Website responded with HTTP ${status}.`);
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
      throw new Error("The URL did not return an HTML page.");
    }
    const html = await readBodyLimited(res);
    return {
      finalUrl: current.toString(),
      status,
      html,
      contentType,
      responseMs: Date.now() - started,
      bytes: html.length,
    };
  }
  throw new Error("Too many redirects.");
}

/** Tiny same-origin helper for robots.txt / sitemap.xml checks. */
export async function safeFetchText(url: string, timeoutMs = 5000): Promise<string | null> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    if (hostnameIsBlocked(parsed.hostname)) return null;
    const res = await fetch(parsed.toString(), {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "User-Agent": "UpRanklyAuditBot/1.0" },
    });
    if (!res.ok) return null;
    const text = await readBodyLimited(res);
    return text.slice(0, 200_000);
  } catch {
    return null;
  }
}
