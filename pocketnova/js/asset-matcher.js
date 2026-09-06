// Pure matching helpers for BoardMate Forknova image assets.
// No DOM, localStorage, game-state or network dependencies.

export function normalizeName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\s·•・‧'"“”‘’()\[\]{}<>:：,，.。!！?？_\-–—]/g, '')
    .toLowerCase();
}

export function hangulCompact(value) {
  return normalizeName(value).replace(/[^가-힣a-z0-9]/g, '');
}

export function levenshtein(a, b) {
  a = String(a || '');
  b = String(b || '');
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        cur[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length);
  if (!maxLen) return 1;
  return 1 - (levenshtein(a, b) / maxLen);
}

export function bestWindowSimilarity(needle, haystack, { maxScan = 180 } = {}) {
  needle = hangulCompact(needle);
  haystack = hangulCompact(haystack).slice(0, maxScan);
  if (!needle || !haystack) return 0;
  if (haystack.includes(needle)) return 1;

  // OCR often inserts/deletes one syllable around the title. Compare windows
  // within ±1 char of the target length, but only near the top of the card.
  let best = 0;
  const minLen = Math.max(1, needle.length - 1);
  const maxLen = Math.min(haystack.length, needle.length + 1);
  for (let len = minLen; len <= maxLen; len++) {
    for (let i = 0; i + len <= haystack.length; i++) {
      const score = similarity(needle, haystack.slice(i, i + len));
      if (score > best) best = score;
      if (best >= 1) return 1;
    }
  }
  return best;
}

export function findBestOcrMatch(name, rows, aliases = {}) {
  const canonical = hangulCompact(name);
  if (!canonical) return null;
  const aliasList = Array.isArray(aliases?.[name]) ? aliases[name] : [];
  const probes = [name, ...aliasList].map(hangulCompact).filter(Boolean);
  const ranked = [];

  for (const row of rows || []) {
    const text = row?.text || '';
    let score = 0;
    let matchedProbe = null;
    for (const probe of probes) {
      const current = bestWindowSimilarity(probe, text);
      if (current > score) {
        score = current;
        matchedProbe = probe;
      }
      if (score === 1) break;
    }
    if (score > 0) ranked.push({ row, score, matchedProbe });
  }

  ranked.sort((a, b) => b.score - a.score);
  const best = ranked[0];
  const second = ranked[1];
  if (!best) return null;

  // Short Korean names are common inside rules/flavour text; only exact matches
  // are safe. Longer names allow one OCR error if the winning card is distinct.
  let threshold = 1;
  let minMargin = 1;
  if (canonical.length === 4) { threshold = 0.75; minMargin = 0.18; }
  else if (canonical.length >= 5) { threshold = 0.78; minMargin = 0.12; }

  const margin = best.score - (second?.score || 0);
  if (best.score < threshold) return null;
  if (best.score < 1 && margin < minMargin) return null;
  if (best.score === 1 && second?.score === 1) return null;

  return {
    id: best.row.id,
    img: best.row.img,
    score: Number(best.score.toFixed(3)),
    margin: Number(margin.toFixed(3)),
    exact: best.score === 1,
    probe: best.matchedProbe,
  };
}
