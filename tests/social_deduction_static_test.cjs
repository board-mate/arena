const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
function read(p){return fs.readFileSync(path.join(root,p),'utf8');}
function ok(cond,msg){if(!cond){console.error('FAIL:',msg);process.exitCode=1;}else console.log('PASS:',msg);}
const app=read('app.js');
const sql=read('SUPABASE_SOCIAL_DEDUCTION_V1.sql');
const av=read('online-avalon.html');
const sh=read('online-secret-hitler.html');
const ow=read('online-one-night-werewolf.html');
const common=read('social/social-common.js');

for(const g of ['avalon','secrethitler','onenightwerewolf']){
  ok(app.includes(`${g}:`) || app.includes(`${g}'`) || app.includes(`'${g}'`),`app.js registers ${g}`);
  ok(sql.includes(`'${g}'`),`SQL registers ${g}`);
}
ok(app.includes('create_boardmate_room_v10'),'app.js uses room creator v10');
ok(/mode:=case\s+when p_game in \('avalon','secrethitler','onenightwerewolf'\) then 'realtime'/.test(sql),'social rooms are realtime');
ok(sql.includes('revoke all on table public.boardmate_social_games from public, anon, authenticated'),'raw secret table is revoked from clients');
ok(sql.includes('boardmate_social_view')&&sql.includes('boardmate_social_action'),'filtered view and server action RPCs exist');

for(const r of ['merlin','percival','assassin','morgana','mordred','oberon','loyal','minion_of_mordred']) ok(sql.includes(`'${r}'`)||common.includes(`${r}:`),`Avalon role ${r} exists`);
ok(!/랜슬롯|엑스칼리버|호수의 여신/.test(av.replace('랜슬롯·엑스칼리버·호수의 여신은 사용하지 않습니다.','')),'Avalon has no excluded-role controls');
ok(av.includes('🎭 이번 판 역할'),'Avalon has always-available role composition button');
ok(sql.includes("n>=7 and (st->>'quest')::integer=3 then 2"),'Avalon quest 4 requires two fails at 7+');
ok(sql.includes('cnt>=5'),'Avalon five rejected teams ends game');
ok(sql.includes("'quest_results','[]'::jsonb")&&sql.includes("'{quest_results}'"),'Avalon stores chronological quest results');
ok(av.includes('function lastVote(st)')&&av.includes('직전 팀 투표 공개'),'Avalon publicly shows the completed team vote');
ok(av.includes('function lastQuest(st)')&&av.includes('실패 ${Number(q.fail_cards||0)}장'),'Avalon publicly shows quest success/fail card counts');
ok(sql.includes("n=5 and opt_percival and not (opt_morgana or opt_mordred)")&&av.includes('5인 게임에서 퍼시벌을 사용하면 모르가나 또는 모드레드'),'Avalon enforces the 5-player Percival companion-role note');

ok(sh.includes('기본판 · 확장 없음'),'Secret Hitler page explicitly uses base game only');
ok(sql.includes("array['L','L','L','L','L','L','F','F','F','F','F','F','F','F','F','F','F']"),'Secret Hitler policy deck is 6 Liberal / 11 Fascist');
ok(sql.includes("'policy_peek'")&&sql.includes("'investigate'")&&sql.includes("'special_election'")&&sql.includes("'execute'"),'Secret Hitler base presidential powers exist');
ok(sql.includes("typ='veto_request'")&&sql.includes("typ='veto_decide'"),'Secret Hitler veto flow exists');
ok(sh.includes('CC BY-NC-SA 4.0'),'Secret Hitler license attribution shown');
ok(sh.includes('function lastVote(st)')&&sh.includes('직전 정부 투표 공개'),'Secret Hitler publicly shows completed Ja/Nein votes');
ok(sql.includes("st:=jsonb_set(st,'{election_tracker}','0'::jsonb,true);")&&sql.includes("elsif typ='chancellor_policy'"),'Secret Hitler resets election tracker when a policy is enacted');
const secretYesStart=sql.indexOf("if yesn>non then",sql.indexOf("g.game='secrethitler'"));
const electedBlock=sql.slice(secretYesStart,sql.indexOf("tracker:=(st->>'election_tracker')::integer+1",secretYesStart));
ok(!electedBlock.includes("'{election_tracker}'"),'Secret Hitler does not reset election tracker merely because a government is elected');
ok(sql.includes('새로 선출된 수상은 히틀러가 아님이 공개적으로 확인되었습니다.'),'Secret Hitler confirms a non-Hitler Chancellor after 3+ Fascist policies');

const onuwRoles=['doppelganger','werewolf','minion','mason','seer','robber','troublemaker','drunk','insomniac','villager','tanner','hunter'];
for(const r of onuwRoles) ok(ow.includes(r)&&sql.includes(`'${r}'`),`ONUW role ${r} exists in UI + server`);
ok(ow.includes("werewolf:2")&&ow.includes("mason:2")&&ow.includes("villager:3"),'ONUW base card maxima are present');
ok(sql.includes("coalesce((counts->>'mason')::integer,0) not in (0,2)")&&ow.includes("r==='mason'){counts[r]=2")&&ow.includes("r==='mason'){counts[r]=0"),'ONUW Masons are enforced as a 0-or-2 pair');
ok(sql.includes("total<>n+3"),'ONUW enforces players + 3 cards');
ok(ow.includes('🎭 이번 판 역할'),'ONUW has always-available role composition button');
ok(sql.includes("steps:=steps||array['doppel1','doppel2']")&&sql.includes("steps:=steps||array['werewolf']")&&sql.includes("steps:=steps||array['insomniac']"),'ONUW automatic night-order state machine exists');
ok(sql.includes("eff:=case when tmp='doppelganger' then coalesce(doppelrole,'villager') else tmp end"),'ONUW resolves moved Doppelganger card safely');

const pg=read('SUPABASE_POWERGRID_UNIFIED.sql');
ok(pg.includes("'avalon','secrethitler','onenightwerewolf'"),'Power Grid SQL preserves social game registrations if rerun');
ok(sql.includes("'copied_role',case when original='doppelganger' then doppel else null end"),'ONUW Doppelganger copied role is not returned to unrelated players');
ok(!sql.includes("'copied_role',doppel"),'ONUW has no raw copied-role leak in filtered views');
ok(ow.includes("if(!el?.value)return alert"),'ONUW blank player/center selections are rejected client-side');
ok(av.includes("if(!el?.value)return alert('암살 대상을 선택하세요.')"),'Avalon blank assassination target is rejected client-side');
ok(sh.includes("if(!el?.value)return alert('수상 후보를 선택하세요.')"),'Secret Hitler blank Chancellor nomination is rejected client-side');

if(process.exitCode) process.exit(process.exitCode);
console.log('\nAll social deduction static checks passed.');
