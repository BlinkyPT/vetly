import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE_RANGES: Array<[string, number]> = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["0.0.0.0", 8],
  ["100.64.0.0", 10],
  ["fc00::", 7],
  ["::1", 128],
  ["fe80::", 10],
];

function ipToInt(ip: string): bigint | null {
  if (isIP(ip) === 4) {
    return ip.split(".").reduce((acc, part) => (acc << 8n) + BigInt(parseInt(part, 10)), 0n);
  }
  if (isIP(ip) === 6) {
    // Simplified: expand and convert.
    const expanded = ip.includes("::")
      ? (() => {
          const [head, tail] = ip.split("::");
          const h = (head ?? "").split(":").filter(Boolean);
          const t = (tail ?? "").split(":").filter(Boolean);
          const fill = Array(8 - h.length - t.length).fill("0");
          return [...h, ...fill, ...t].map((p) => p.padStart(4, "0")).join("");
        })()
      : ip.split(":").map((p) => p.padStart(4, "0")).join("");
    return BigInt("0x" + expanded);
  }
  return null;
}

function inRange(ip: string, network: string, prefix: number): boolean {
  const ipInt = ipToInt(ip);
  const netInt = ipToInt(network);
  if (ipInt === null || netInt === null) return false;
  const size = isIP(ip) === 4 ? 32 : 128;
  const mask = ((1n << BigInt(size)) - 1n) ^ ((1n << BigInt(size - prefix)) - 1n);
  return (ipInt & mask) === (netInt & mask);
}

/**
 * Fetch a user-supplied URL safely. Rejects non-http(s), blocks private /
 * link-local / loopback addresses, caps body size, sets a UA + timeout.
 */
export async function safeFetch(rawUrl: string, opts: { maxBytes?: number; timeoutMs?: number } = {}): Promise<{ url: string; html: string; status: number }> {
  const maxBytes = opts.maxBytes ?? 2_000_000; // 2 MB
  const timeoutMs = opts.timeoutMs ?? 15_000;

  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error("invalid_url"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("unsupported_protocol");

  // DNS resolution + private-range check
  const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
  for (const { address } of addresses) {
    for (const [net, prefix] of PRIVATE_RANGES) {
      if (inRange(address, net, prefix)) throw new Error("blocked_private_address");
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent": "Vetly/0.1 (+https://vetly.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const ct = res.headers.get("content-type") ?? "";
    if (!ct.includes("text/html") && !ct.includes("application/xhtml")) {
      throw new Error("not_html");
    }
    const reader = res.body?.getReader();
    if (!reader) throw new Error("no_body");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { controller.abort(); throw new Error("response_too_large"); }
      chunks.push(value);
    }
    const buf = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) { buf.set(c, offset); offset += c.byteLength; }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    return { url: res.url, html, status: res.status };
  } finally {
    clearTimeout(timer);
  }
}
