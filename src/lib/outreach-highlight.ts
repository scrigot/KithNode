// Pure helpers for the in-app outreach popup: highlight the shared/mutual
// signals inside a generated draft, and build Outlook / Gmail web-compose deep
// links. No React, no I/O — fully unit-testable.

export interface HighlightSegment {
  text: string;
  signal: boolean;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Split `text` into ordered segments, marking the spans that match one of
 * `signals` (case-insensitive, whole-term via word boundaries). Longest signals
 * win, matches never overlap, and a non-matching whole returns a single
 * unsignalled segment. Terms shorter than 2 chars are ignored (too noisy).
 */
export function highlightSignals(
  text: string,
  signals: string[],
): HighlightSegment[] {
  if (!text) return [];
  const terms = [...new Set(signals.map((s) => (s || "").trim()))]
    .filter((s) => s.length > 1)
    .sort((a, b) => b.length - a.length); // longest first so "Goldman Sachs" beats "Goldman"
  if (terms.length === 0) return [{ text, signal: false }];

  const taken = new Array(text.length).fill(false);
  const matches: Array<{ start: number; end: number }> = [];

  for (const term of terms) {
    const re = new RegExp(escapeRegExp(term), "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = m.index;
      const end = start + m[0].length;
      if (m[0].length === 0) {
        re.lastIndex++;
        continue;
      }
      const before = start === 0 ? "" : text[start - 1];
      const after = end >= text.length ? "" : text[end];
      if (/\w/.test(before) || /\w/.test(after)) continue; // not a whole term
      let overlaps = false;
      for (let i = start; i < end; i++) {
        if (taken[i]) {
          overlaps = true;
          break;
        }
      }
      if (overlaps) continue;
      for (let i = start; i < end; i++) taken[i] = true;
      matches.push({ start, end });
    }
  }

  if (matches.length === 0) return [{ text, signal: false }];
  matches.sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let pos = 0;
  for (const mt of matches) {
    if (mt.start > pos) segments.push({ text: text.slice(pos, mt.start), signal: false });
    segments.push({ text: text.slice(mt.start, mt.end), signal: true });
    pos = mt.end;
  }
  if (pos < text.length) segments.push({ text: text.slice(pos), signal: false });
  return segments;
}

export interface ComposeFields {
  to: string;
  subject: string;
  body: string;
}

/** Outlook web compose deep link, pre-filled. Blank `to` is allowed. */
export function buildOutlookComposeUrl({ to, subject, body }: ComposeFields): string {
  const params = new URLSearchParams();
  if (to) params.set("to", to);
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

/** Gmail web compose deep link, pre-filled. Blank `to` is allowed. */
export function buildGmailComposeUrl({ to, subject, body }: ComposeFields): string {
  const params = new URLSearchParams({ view: "cm", fs: "1" });
  if (to) params.set("to", to);
  if (subject) params.set("su", subject);
  if (body) params.set("body", body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}
