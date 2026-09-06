#!/usr/bin/env python3
from __future__ import annotations
import subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
PATCHER = HERE / 'apply_v11_7_core_fixes.py'

STATE = """// fixture\nexport function rebuildIconCounts(player) {
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
}\n"""
ENGINE = """// fixture\n  // ── 다우징 머신: 지식 트랙 (미구현, 0점) ───────────────────
  } else if (fc.id === 'fs_dowsing') {
    val = 0; // 지식 트랙 미구현 → 항상 0
  }\n"""
FINAL = """// fixture\n  { id: 'fs_dowsing', name: '다우징 머신', metric: '지식 트랙 칸 수',
    thresholds: [6, 9, 12, 15], rewards: [1, 2, 3, 4] },\n"""

with tempfile.TemporaryDirectory() as td:
    root = Path(td)
    (root/'pocketnova/js').mkdir(parents=True)
    (root/'pocketnova/data').mkdir(parents=True)
    (root/'pocketnova/js/state.js').write_text(STATE, encoding='utf-8')
    (root/'pocketnova/js/engine.js').write_text(ENGINE, encoding='utf-8')
    (root/'pocketnova/data/cards-finalscoring.js').write_text(FINAL, encoding='utf-8')

    check = subprocess.run([sys.executable, str(PATCHER), str(root), '--check'], capture_output=True, text=True)
    assert check.returncode == 0, check.stdout + check.stderr
    assert check.stdout.count('PATCHABLE') == 3, check.stdout

    first = subprocess.run([sys.executable, str(PATCHER), str(root), '--no-backup'], capture_output=True, text=True)
    assert first.returncode == 0, first.stdout + first.stderr
    assert first.stdout.count('PATCHED') == 3, first.stdout

    state = (root/'pocketnova/js/state.js').read_text(encoding='utf-8')
    engine = (root/'pocketnova/js/engine.js').read_text(encoding='utf-8')
    final = (root/'pocketnova/data/cards-finalscoring.js').read_text(encoding='utf-8')
    assert "card.type ? [card.type]" in state
    assert 'card.requiresWater' not in state and 'card.requiresRock' not in state
    assert "(card.regions || []).forEach(addIcon)" in state
    assert "card.icon ? [card.icon]" in state
    assert 'Number(player.reputation || 0)' in engine
    assert "metric: '명성 트랙 칸 수'" in final

    # Execute the patched icon-count function with representative current-v3 data.
    smoke = root/'icon_count_smoke.mjs'
    smoke.write_text(state.replace('export function', 'function') + r'''
const player = {
  playedAnimals: [{ type:'water', regions:['관동','관동'], waterReq:3, rockReq:2 }],
  playedSponsors: [{ icon:'fire' }],
  partnerZoos: ['성도'],
  universities: [{ icons:['grass'] }],
};
rebuildIconCounts(player);
const c = player.iconCounts;
if (c.water !== 1 || c.fire !== 1 || c.grass !== 1 || c['관동'] !== 2 || c['성도'] !== 1) {
  throw new Error('unexpected iconCounts ' + JSON.stringify(c));
}
console.log('PASS icon count behavior');
''', encoding='utf-8')
    behavior = subprocess.run(['node', str(smoke)], capture_output=True, text=True)
    assert behavior.returncode == 0, behavior.stdout + behavior.stderr
    assert 'PASS icon count behavior' in behavior.stdout
    status = (root/'pocketnova/assets/core-fix-status.js').read_text(encoding='utf-8')
    assert "version: '11.7', applied: true" in status

    second = subprocess.run([sys.executable, str(PATCHER), str(root), '--no-backup'], capture_output=True, text=True)
    assert second.returncode == 0, second.stdout + second.stderr
    assert second.stdout.count('ALREADY') == 3, second.stdout

    # Unknown upstream text must fail closed instead of guessing.
    (root/'pocketnova/js/engine.js').write_text('// changed upstream\n', encoding='utf-8')
    bad = subprocess.run([sys.executable, str(PATCHER), str(root), '--check'], capture_output=True, text=True)
    assert bad.returncode != 0
    assert 'Refusing to guess' in bad.stdout

print('PASS: v11.7 core patch applies exactly once, is idempotent, and fails closed on unknown upstream text')
