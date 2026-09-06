#!/usr/bin/env python3
"""Apply the conservative Forknova/Pocket Nova v11.7 core fixes.

The image patch intentionally does not ship full copies of upstream core files.
Run this against a checkout of https://github.com/board-mate/arena so only the
three reviewed snippets below are changed. The patcher is idempotent and aborts
if upstream text differs from both the known-old and known-new snippets.
"""
from __future__ import annotations
import argparse
import shutil
from pathlib import Path

STATE_OLD = """export function rebuildIconCounts(player) {
  const counts = {
    water:0, fire:0, grass:0, fighting:0, psychic:0, fossil:0,
    '관동':0, '성도':0, '호연':0, '신오':0, '하나':0,
  };
  const addCard = card => {
    if (card.types)   card.types.forEach(t => { if (t in counts) counts[t]++; });
    if (card.regions) card.regions.forEach(r => { if (r in counts) counts[r]++; });
    // 물/바위 요구조건도 아이콘으로 집계 (룰북 p.15)
    if (card.requiresWater) counts.water += card.requiresWater;
    if (card.requiresRock)  ; // 바위 아이콘은 별도 집계 없음
  };
  player.playedAnimals.forEach(addCard);
  player.playedSponsors.forEach(addCard);
  player.partnerZoos.forEach(r => { if (r in counts) counts[r]++; });
  player.universities.forEach(u => {
    if (u.icons) u.icons.forEach(ic => { if (ic in counts) counts[ic]++; });
  });
  player.iconCounts = counts;
}"""

STATE_NEW = """export function rebuildIconCounts(player) {
  const counts = {
    water:0, fire:0, grass:0, fighting:0, psychic:0, fossil:0,
    '관동':0, '성도':0, '호연':0, '신오':0, '하나':0,
  };
  const addIcon = icon => { if (icon in counts) counts[icon]++; };
  const addCard = card => {
    // Current animal data uses singular `type`; keep `types` compatibility for
    // older/imported states. Water/rock adjacency requirements are not icons.
    const types = Array.isArray(card.types) ? card.types : (card.type ? [card.type] : []);
    types.forEach(addIcon);
    (card.regions || []).forEach(addIcon);
    // Sponsor/imported cards may expose one or more printed icons separately.
    const extraIcons = Array.isArray(card.icons) ? card.icons : (card.icon ? [card.icon] : []);
    extraIcons.forEach(addIcon);
  };
  player.playedAnimals.forEach(addCard);
  player.playedSponsors.forEach(addCard);
  player.partnerZoos.forEach(addIcon);
  player.universities.forEach(u => {
    const icons = Array.isArray(u?.icons) ? u.icons : (u?.icon ? [u.icon] : []);
    icons.forEach(addIcon);
  });
  player.iconCounts = counts;
}"""

ENGINE_OLD = """  // ── 다우징 머신: 지식 트랙 (미구현, 0점) ───────────────────
  } else if (fc.id === 'fs_dowsing') {
    val = 0; // 지식 트랙 미구현 → 항상 0
  }"""

ENGINE_NEW = """  // ── 다우징 머신: 명성 트랙 ───────────────────────────────
  } else if (fc.id === 'fs_dowsing') {
    val = Number(player.reputation || 0);
  }"""

FINAL_OLD = """  { id: 'fs_dowsing', name: '다우징 머신', metric: '지식 트랙 칸 수',
    thresholds: [6, 9, 12, 15], rewards: [1, 2, 3, 4] },"""

FINAL_NEW = """  { id: 'fs_dowsing', name: '다우징 머신', metric: '명성 트랙 칸 수',
    thresholds: [6, 9, 12, 15], rewards: [1, 2, 3, 4] },"""


CORE_STATUS_REL = 'pocketnova/assets/core-fix-status.js'
CORE_STATUS_APPLIED = "window.PORKNOVA_CORE_FIX_STATUS = { version: '11.7', applied: true };\n"

PATCHES = (
    ('pocketnova/js/state.js', STATE_OLD, STATE_NEW, 'icon count schema fix'),
    ('pocketnova/js/engine.js', ENGINE_OLD, ENGINE_NEW, 'dowsing final-score implementation'),
    ('pocketnova/data/cards-finalscoring.js', FINAL_OLD, FINAL_NEW, 'dowsing metric label'),
)


def resolve_repo_root(value: str) -> Path:
    p = Path(value).expanduser().resolve()
    if p.name == 'pocketnova' and (p / 'js').is_dir():
        p = p.parent
    return p


def inspect(text: str, old: str, new: str) -> str:
    if new in text:
        return 'already'
    if old in text:
        return 'patchable'
    return 'unknown'


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('repo', nargs='?', default='.', help='arena repository root (or its pocketnova directory)')
    ap.add_argument('--check', action='store_true', help='validate applicability without writing')
    ap.add_argument('--no-backup', action='store_true', help='do not create *.bak.v11_7 files')
    args = ap.parse_args()
    repo = resolve_repo_root(args.repo)

    rows = []
    for rel, old, new, label in PATCHES:
        path = repo / rel
        if not path.is_file():
            print(f'FAIL missing: {path}')
            return 2
        text = path.read_text(encoding='utf-8')
        status = inspect(text, old, new)
        rows.append((path, old, new, label, status))
        if status == 'unknown':
            print(f'FAIL {rel}: upstream text differs from reviewed v11.7 snippet ({label})')
            print('Refusing to guess. Rebase/review this fix against the current upstream file.')
            return 3

    if args.check:
        for path, _, _, label, status in rows:
            print(f'{status.upper():9} {path.relative_to(repo)} — {label}')
        return 0

    changed = 0
    for path, old, new, label, status in rows:
        rel = path.relative_to(repo)
        if status == 'already':
            print(f'ALREADY   {rel} — {label}')
            continue
        text = path.read_text(encoding='utf-8')
        if not args.no_backup:
            backup = path.with_name(path.name + '.bak.v11_7')
            if not backup.exists():
                shutil.copy2(path, backup)
        path.write_text(text.replace(old, new, 1), encoding='utf-8')
        print(f'PATCHED   {rel} — {label}')
        changed += 1

    status_path = repo / CORE_STATUS_REL
    status_path.parent.mkdir(parents=True, exist_ok=True)
    status_path.write_text(
        '// Generated/confirmed by tools/apply_v11_7_core_fixes.py after all reviewed core snippets passed.\n'
        + CORE_STATUS_APPLIED,
        encoding='utf-8',
    )
    print(f'CORE-ART  {status_path.relative_to(repo)} — applied=true')
    print(f'OK v11.7 core fixes: changed={changed}, already={len(rows)-changed}')
    if not args.no_backup and changed:
        print('Backups created as *.bak.v11_7 (do not commit them).')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
