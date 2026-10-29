// Adapted from the tournament manager supplied by the organizer.
const TournamentEngine = (() => {
  const APP_ID = 'splendor-tournament-manager';
  const VERSION = 1;
  const RULES = Object.freeze({
    3: {sizes: [], advance: [], finalSize: 3},
    4: {sizes: [], advance: [], finalSize: 4},
    5: {sizes: [2, 3], advance: [1, 2], finalSize: 3},
    6: {sizes: [3, 3], advance: [2, 2], finalSize: 4},
    7: {sizes: [3, 4], advance: [2, 2], finalSize: 4},
    8: {sizes: [4, 4], advance: [2, 2], finalSize: 4},
    9: {sizes: [3, 3, 3], advance: [1, 1, 1], finalSize: 3},
    10: {sizes: [4, 3, 3], advance: [1, 1, 1], finalSize: 3},
    11: {sizes: [4, 4, 3], advance: [1, 1, 1], finalSize: 3},
    12: {sizes: [3, 3, 3, 3], advance: [2, 2, 2, 2], finalSize: 4},
    13: {sizes: [4, 3, 3, 3], advance: [2, 2, 2, 2], finalSize: 4},
    14: {sizes: [4, 4, 3, 3], advance: [2, 2, 2, 2], finalSize: 4},
    15: {sizes: [4, 4, 4, 3], advance: [2, 2, 2, 2], finalSize: 4},
    16: {sizes: [4, 4, 4, 4], advance: [2, 2, 2, 2], finalSize: 4}
  });
  for (const r of Object.values(RULES)) {
    Object.freeze(r.sizes); Object.freeze(r.advance); Object.freeze(r);
  }
  function assert(condition, message) { if (!condition) throw new Error(message); }
  function cleanName(value) {
    return String(value).normalize('NFC').trim().replace(/\s+/gu, ' ');
  }
  function parseNames(text) {
    return String(text).split(/[\r\n,，;；\t]+/u).map(cleanName).filter(Boolean);
  }
  function nameErrors(names) {
    const errors = [];
    if (names.length < 3 || names.length > 16) errors.push('참가자는 3명 이상, 16명 이하로 입력해 주세요.');
    const seen = new Set(); const duplicates = new Set();
    for (const name of names) {
      if (!name || name.length > 40) errors.push('각 참가자 이름은 1~40자로 입력해 주세요.');
      const key = cleanName(name).toLocaleLowerCase('ko-KR');
      if (seen.has(key)) duplicates.add(name);
      seen.add(key);
    }
    if (duplicates.size) errors.push(`같은 이름이 있습니다: ${[...duplicates].join(', ')}. 동명이인은 번호 등으로 구분해 주세요.`);
    return [...new Set(errors)];
  }
  function getRule(n) {
    assert(Number.isInteger(n) && RULES[n], '지원 인원은 3~16명입니다.');
    return RULES[n];
  }
  function secureInt(max) {
    assert(Number.isInteger(max) && max > 0, '잘못된 추첨 범위입니다.');
    assert(typeof globalThis.crypto?.getRandomValues === 'function', '이 브라우저는 무작위 추첨을 지원하지 않습니다. 입력 순서 편성을 이용해 주세요.');
    const word = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / max) * max;
    do { globalThis.crypto.getRandomValues(word); } while (word[0] >= limit);
    return word[0] % max;
  }
  function shuffle(items, randomInt = secureInt) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      assert(Number.isInteger(j) && j >= 0 && j <= i, '추첨 값이 유효하지 않습니다.');
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
  function makeGame(id, playerIds) {
    return {id, playerIds: [...playerIds], ranks: playerIds.map(() => null), locked: false};
  }
  function createTournament(title, rawNames, drawMode = 'random', randomInt = secureInt, rawSeedNames = []) {
    const seedNames = rawSeedNames.map(cleanName);
    rawNames = [...seedNames, ...rawNames];
    const names = rawNames.map(cleanName);
    const errors = nameErrors(names); assert(!errors.length, errors.join('\n'));
    const safeTitle = cleanName(title) || '스플랜더 대회';
    assert(safeTitle.length <= 60, '대회명은 60자 이하로 입력해 주세요.');
    assert(['random', 'ordered', 'manual'].includes(drawMode), '지원하지 않는 편성 방식입니다.');
    const rule = getRule(names.length);
    const players = names.map((name, i) => ({id: `p${i + 1}`, name, ...(i < seedNames.length ? {seed: true} : {})}));
    const order = drawMode === 'random' ? shuffle(players.map(p => p.id), randomInt) : players.map(p => p.id);
    let offset = 0;
    const prelims = rule.sizes.map((size, i) => {
      const game = makeGame(String.fromCharCode(65 + i), order.slice(offset, offset + size));
      offset += size; return game;
    });
    if (seedNames.length && prelims.length) {
      const groups = rule.sizes.map(() => []);
      const groupOrder = drawMode === 'random' ? shuffle(groups.map((_, i) => i), randomInt) : groups.map((_, i) => i);
      const seeds = order.filter(id => players.find(p => p.id === id).seed);
      for (const id of seeds) {
        const available = groupOrder.filter(i => groups[i].length < rule.sizes[i]);
        const min = Math.min(...available.map(i => groups[i].length));
        groups[available.find(i => groups[i].length === min)].push(id);
      }
      const regular = order.filter(id => !players.find(p => p.id === id).seed);
      for (let i = 0; i < groups.length; i++) {
        while (groups[i].length < rule.sizes[i]) groups[i].push(regular.shift());
        prelims[i] = makeGame(String.fromCharCode(65 + i), drawMode === 'random' ? shuffle(groups[i], randomInt) : groups[i]);
      }
    }
    return {title: safeTitle, createdAt: new Date().toISOString(), drawMode, players, prelims,
      ...(names.length >= 12 ? {semifinals: null} : {}),
      final: rule.sizes.length ? null : makeGame('final', order)};
  }
  function createManualTournament(title, groups) {
    assert(Array.isArray(groups) && groups.length === 4 && groups.every(g => Array.isArray(g) && g.length >= 3 && g.length <= 4), 'A~D 각 조에 3~4명을 입력해 주세요.');
    const t = createTournament(title, groups.flat(), 'ordered');
    let offset = 0;
    t.prelims = groups.map((names,i) => {
      const game = makeGame(String.fromCharCode(65+i), t.players.slice(offset,offset+names.length).map(p=>p.id));
      offset += names.length; return game;
    });
    t.drawMode = 'manual'; return t;
  }
  function gameStatus(game) {
    const assigned = game.ranks.filter(rank => rank !== null);
    const duplicates = [...new Set(assigned.filter((rank, i) => assigned.indexOf(rank) !== i))];
    return {complete: assigned.length === game.playerIds.length && duplicates.length === 0,
      assigned: assigned.length, duplicates};
  }
  function setRank(game, playerId, rank) {
    assert(!game.locked, '확정된 결과입니다. 먼저 결과 수정을 눌러 주세요.');
    const i = game.playerIds.indexOf(playerId); assert(i !== -1, '참가자를 찾을 수 없습니다.');
    assert(rank === null || (Number.isInteger(rank) && rank >= 1 && rank <= game.playerIds.length), '순위 범위가 올바르지 않습니다.');
    game.ranks[i] = rank;
  }
  function lockGame(game) {
    assert(gameStatus(game).complete, '모든 참가자의 순위를 중복 없이 입력해 주세요.');
    game.locked = true;
  }
  function rankedPlayers(game) {
    return game.playerIds.map((id, i) => ({id, rank: game.ranks[i]})).sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  }
  function qualifiers(tournament) {
    const rule = getRule(tournament.players.length);
    return tournament.prelims.flatMap((game, index) => game.locked
      ? rankedPlayers(game).filter(p => p.rank <= rule.advance[index]).map(p => ({...p, group: game.id})) : []);
  }
  function semifinalIds(tournament) {
    const q = qualifiers(tournament);
    const id = (group, rank) => q.find(p => p.group === group && p.rank === rank).id;
    return [[id('A',1),id('B',2),id('C',1),id('D',2)], [id('A',2),id('B',1),id('C',2),id('D',1)]];
  }
  function buildSemifinals(tournament) {
    assert(tournament.players.length >= 12 && tournament.prelims.every(g => g.locked), '모든 예선 조의 결과를 먼저 확정해 주세요.');
    assert(!tournament.semifinals && !tournament.final, '준결승 대진이 이미 생성되어 있습니다.');
    tournament.semifinals = semifinalIds(tournament).map((ids,i) => makeGame('semi'+(i+1),ids));
    return tournament.semifinals;
  }
  function finalQualifiers(tournament) {
    return tournament.players.length >= 12 ? (tournament.semifinals || []).flatMap(g => rankedPlayers(g).filter(p => p.rank <= 2)) : qualifiers(tournament);
  }
  function unlockSemifinal(tournament,id) {
    const game = tournament.semifinals?.find(g => g.id === id); assert(game, '준결승 조를 찾을 수 없습니다.');
    game.locked = false; tournament.final = null;
  }
  function readyForFinal(tournament) {
    if (tournament.players.length >= 12) return tournament.semifinals?.length === 2 && tournament.semifinals.every(g => g.locked);
    return tournament.prelims.length > 0 && tournament.prelims.every(game => game.locked);
  }
  function buildFinal(tournament) {
    assert(readyForFinal(tournament), '모든 예선 조의 결과를 먼저 확정해 주세요.');
    assert(!tournament.final, '결승 대진이 이미 생성되어 있습니다.');
    const ids = finalQualifiers(tournament).map(p => p.id);
    assert(ids.length === getRule(tournament.players.length).finalSize, '결승 진출 인원이 올바르지 않습니다.');
    tournament.final = makeGame('final', ids);
    return tournament.final;
  }
  function unlockPrelim(tournament, id) {
    const game = tournament.prelims.find(g => g.id === id); assert(game, '예선 조를 찾을 수 없습니다.');
    tournament.final = null; if (tournament.players.length >= 12) tournament.semifinals = null; game.locked = false;
  }
  function reshuffleFinal(tournament, randomInt = secureInt) {
    const game = tournament.final; assert(game, '결승 대진이 없습니다.');
    assert(!game.locked && game.ranks.every(r => r === null), '결승 순위를 입력하기 전까지만 좌석을 섞을 수 있습니다.');
    game.playerIds = shuffle(game.playerIds, randomInt);
  }
  function phase(tournament) {
    if (!tournament) return 'setup';
    if (tournament.final?.locked) return 'done';
    if (tournament.final) return 'final';
    if (tournament.semifinals) return 'semifinals';
    return 'prelims';
  }
  function defaultState() {
    return {draft: {title: '스플랜더 대회', names: '', drawMode: 'random'}, tournament: null};
  }
  // Reconstruct imported data from a strictly validated, known schema.
  function validateState(raw) {
    assert(raw && typeof raw === 'object' && !Array.isArray(raw), '백업 데이터 형식이 올바르지 않습니다.');
    assert(raw.draft && typeof raw.draft === 'object', '참가자 등록 정보가 없습니다.');
    assert(typeof raw.draft.title === 'string' && raw.draft.title.length <= 60, '백업의 대회명이 올바르지 않습니다.');
    assert(typeof raw.draft.names === 'string' && raw.draft.names.length <= 10000, '백업의 참가자 입력란이 올바르지 않습니다.');
    assert(['random', 'ordered', 'manual'].includes(raw.draft.drawMode), '백업의 편성 방식이 올바르지 않습니다.');
    const result = {draft: {title: raw.draft.title, names: raw.draft.names, drawMode: raw.draft.drawMode}, tournament: null};
    if (raw.tournament === null) return result;
    const t = raw.tournament;
    assert(t && typeof t === 'object' && Array.isArray(t.players), '대회 데이터가 올바르지 않습니다.');
    const rule = getRule(t.players.length);
    assert(typeof t.title === 'string' && cleanName(t.title).length > 0 && t.title.length <= 60, '대회명이 올바르지 않습니다.');
    assert(typeof t.createdAt === 'string' && t.createdAt.length <= 40 && Number.isFinite(Date.parse(t.createdAt)), '대회 생성 일시가 올바르지 않습니다.');
    assert(['random', 'ordered', 'manual'].includes(t.drawMode), '대회 편성 방식이 올바르지 않습니다.');
    const players = t.players.map((p, i) => {
      assert(p && p.id === `p${i + 1}` && typeof p.name === 'string', '참가자 식별자가 올바르지 않습니다.');
      assert(p.seed === undefined || typeof p.seed === 'boolean', '시드 참가자 정보가 올바르지 않습니다.');
      return {id: p.id, name: cleanName(p.name), ...(p.seed ? {seed: true} : {})};
    });
    assert(nameErrors(players.map(p => p.name)).length === 0, '참가자 이름 또는 인원이 올바르지 않습니다.');
    const allIds = new Set(players.map(p => p.id));
    const readGame = (game, id, size) => {
      assert(game && game.id === id && Array.isArray(game.playerIds) && game.playerIds.length === size, '조별 인원 또는 경기 식별자가 올바르지 않습니다.');
      assert(game.playerIds.every(pid => typeof pid === 'string' && allIds.has(pid)) && new Set(game.playerIds).size === size, '경기에 중복되거나 존재하지 않는 참가자가 있습니다.');
      assert(Array.isArray(game.ranks) && game.ranks.length === size && game.ranks.every(r => r === null || (Number.isInteger(r) && r >= 1 && r <= size)), '순위 데이터가 올바르지 않습니다.');
      assert(typeof game.locked === 'boolean', '결과 확정 상태가 올바르지 않습니다.');
      const output = {id, playerIds: [...game.playerIds], ranks: [...game.ranks], locked: game.locked};
      assert(!output.locked || gameStatus(output).complete, '확정된 경기에 누락 또는 중복 순위가 있습니다.');
      return output;
    };
    assert(Array.isArray(t.prelims) && t.prelims.length === rule.sizes.length, '예선 조 수가 대회 규칙과 다릅니다.');
    const prelims = t.prelims.map((g, i) => {
      const size = t.drawMode === 'manual' ? g?.playerIds?.length : rule.sizes[i];
      assert(t.drawMode !== 'manual' || (players.length >= 12 && size >= 3 && size <= 4), '수기 편성은 각 조 3~4명이어야 합니다.');
      return readGame(g, String.fromCharCode(65 + i), size);
    });
    if (prelims.length) {
      const ids = prelims.flatMap(g => g.playerIds);
      assert(ids.length === players.length && new Set(ids).size === players.length, '예선 참가자가 중복되거나 누락되었습니다.');
    }
    const tournament = {title: cleanName(t.title), createdAt: t.createdAt, drawMode: t.drawMode, players, prelims, final: null};
    if (players.length >= 12) {
      tournament.semifinals = null;
      if (t.semifinals != null) {
        assert(Array.isArray(t.semifinals) && t.semifinals.length === 2 && prelims.every(g => g.locked), '예선 확정 후 두 개의 준결승을 생성하세요.');
        const expected = semifinalIds(tournament);
        tournament.semifinals = t.semifinals.map((g,i) => {
          const game = readGame(g,'semi'+(i+1),4);
          assert(game.playerIds.every(id => expected[i].includes(id)), '준결승 진출자가 예선 결과와 일치하지 않습니다.');
          return game;
        });
      }
    }
    if (t.final !== null) {
      const final = readGame(t.final, 'final', rule.finalSize);
      if (prelims.length) {
        assert(readyForFinal(tournament), '예선 결과 확정 전에 결승 데이터가 생성되었습니다.');
        const expected = new Set(finalQualifiers(tournament).map(p => p.id));
        assert(final.playerIds.every(id => expected.has(id)), '결승 진출자가 예선 결과와 일치하지 않습니다.');
      } else {
        assert(final.playerIds.length === players.length && final.playerIds.every(id => allIds.has(id)), '단판 결승 참가자가 올바르지 않습니다.');
      }
      tournament.final = final;
    } else assert(prelims.length > 0, '3~4명 대회에는 단판 결승이 있어야 합니다.');
    result.tournament = tournament;
    return result;
  }
  function exportBackup(state) {
    return JSON.stringify({app: APP_ID, version: VERSION, exportedAt: new Date().toISOString(), state: validateState(state)}, null, 2);
  }
  function importBackup(text) {
    assert(typeof text === 'string' && text.length <= 1000000, '백업 파일이 너무 큽니다. 1MB 이하 파일을 사용해 주세요.');
    let data;
    try { data = JSON.parse(text.replace(/^\uFEFF/, '')); } catch { throw new Error('올바른 JSON 백업 파일이 아닙니다.'); }
    assert(data?.app === APP_ID && data?.version === VERSION, '이 프로그램에서 저장한 버전 1 백업 파일만 불러올 수 있습니다.');
    return validateState(data.state);
  }
  function ruleText(n) {
    const rule = getRule(n);
    if (!rule.sizes.length) return `${n}명 단판으로 1·2·3위를 결정합니다.`;
    const groups = rule.sizes.map((size, i) => `${String.fromCharCode(65 + i)}조 ${size}명`).join(' / ');
    const advances = rule.advance.every(x => x === rule.advance[0])
      ? `각 조 ${rule.advance[0] === 1 ? '1위' : '1·2위'} 진출`
      : rule.advance.map((x, i) => `${String.fromCharCode(65 + i)}조 ${x === 1 ? '1위' : '1·2위'}`).join(' + ') + ' 진출';
    return `${groups} → ${advances} → ${n >= 12 ? "4명씩 2개 조 준결승 → 각 조 1·2위 진출 → " : ""}${rule.finalSize}명 결승`;
  }
  return {APP_ID, VERSION, RULES, cleanName, parseNames, nameErrors, getRule, shuffle, createTournament, createManualTournament,
    gameStatus, setRank, lockGame, rankedPlayers, qualifiers, readyForFinal, buildFinal,
    buildSemifinals, semifinalIds, unlockSemifinal, unlockPrelim, reshuffleFinal, phase, defaultState, validateState, exportBackup, importBackup, ruleText};
})();

export default TournamentEngine;
