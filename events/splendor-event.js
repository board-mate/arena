import {createAdminPanel} from './event-admins.js?v=11.4.85';
import E from './tournament-engine.js?v=11.4.85';

export const EVENT_ID = 'splendor-2026-10-30';
const TITLE = '메카배 스플렌더 대회';
const URL = `#/events/${EVENT_ID}`;
const labels = {setup:'추첨 대기',prelims:'예선 진행',final:'결승 진행',done:'대회 종료'};
const gem = '<svg viewBox="0 0 120 108" aria-hidden="true"><path d="M26 8h68l22 32-56 60L4 40Z"/><path d="M26 8 60 100 94 8M4 40h112M43 8l17 32L77 8"/></svg>';

export function validateEventTournament(tournament) {
  if (tournament === null) return null;
  if (!tournament?.players || tournament.players.length < 12 || tournament.players.length > 16)
    throw new Error('이번 대회는 12~16명으로 편성합니다.');
  if (tournament.drawMode !== 'random') throw new Error('이번 대회는 무작위 추첨으로 편성합니다.');
  return E.validateState({draft:{title:TITLE,names:'',drawMode:'random'},tournament}).tournament;
}

export function renderEvents({shell,esc,addCleanup,memberToken},route) {
  if (!document.querySelector('#event-styles')) {
    const link = document.createElement('link');
    link.id='event-styles';link.rel='stylesheet';link.href='./events/events.css?v=11.4.85';document.head.append(link);
  }
  if(route==='events') {
    shell(`<div class="page-head"><div><span class="ev-kicker">PLAY TOGETHER</span><h1>이벤트</h1><p>함께 모여 즐기는 보드메이트의 특별한 한 판.</p></div></div>
      <a class="ev-event-card" href="${URL}"><div class="ev-card-art">${gem}<span>SPLENDOR</span></div><div class="ev-card-copy"><span class="ev-tag">보드메이트 회원 대회</span><h2>${TITLE}</h2><p>2026년 10월 30일 (금) · 19:30</p><p>12~16명 · 무작위 조 추첨 · 확장 미포함</p><strong>대회 안내와 대진표 보기 <span aria-hidden="true">↗</span></strong></div></a>`);
    return;
  }
  if(route!==`events/${EVENT_ID}`) {shell('<div class="panel"><h1>이벤트를 찾을 수 없습니다.</h1><a class="primary link-btn" href="#/events">이벤트 목록</a></div>');return;}
  let stopped=false,busy=false,loading=false,dirty=false,record=null,canEdit=false,pendingRevision=null;
  let drafts={ranks:{},names:null,notes:null};
  const dirtyState=()=>{dirty=Object.keys(drafts.ranks).length>0||drafts.names!==null||drafts.notes!==null;};
  const clearDrafts=()=>{drafts={ranks:{},names:null,notes:null};dirty=false;};
  const cfg=window.BOARDMATE_CONFIG||{};
  const $=s=>document.querySelector(s);
  const rpc=async(name,args={})=>{
    if(!cfg.supabaseUrl||!cfg.supabaseAnonKey)throw new Error('대회 서버에 연결할 수 없습니다.');
    const res=await fetch(`${cfg.supabaseUrl}/rest/v1/rpc/${name}`,{method:'POST',cache:'no-store',headers:{apikey:cfg.supabaseAnonKey,Authorization:`Bearer ${cfg.supabaseAnonKey}`,'Content-Type':'application/json'},body:JSON.stringify(args),signal:AbortSignal.timeout(15000)});
    const data=await res.json();
    if(!res.ok)throw new Error(data.code==='PGRST202'?'대진표 공유 기능을 준비 중입니다. 잠시 후 다시 확인해 주세요.':data.message||'서버 요청에 실패했습니다.');
    return data;
  };
  shell(`<article class="ev-page"><a class="ev-back" href="#/events">← 이벤트 목록</a>
    <section class="ev-board-section" id="ev-bracket"><div class="ev-section-head"><div><span class="ev-kicker">TOURNAMENT BOARD</span><h2>대진표 & 경기 결과</h2></div><div class="ev-tools"><button type="button" class="ghost" id="ev-refresh">새로고침</button><button type="button" class="ghost" id="ev-export" disabled>결과 내려받기</button></div></div>
    <div class="ev-access" id="ev-access">누구나 조회 가능 · 운영진만 기록 가능</div><p id="ev-status" role="status" aria-live="polite">대진표를 불러오는 중…</p><div id="ev-updates" hidden><span>다른 관리자가 기록을 변경했습니다. 최신 내용을 불러와 주세요.</span> <button class="ghost" id="ev-reload" type="button">최신 기록 불러오기</button></div><div id="ev-board"></div><div id="ev-editor"></div><div id="ev-admin-permissions" hidden></div></section>
    <header class="ev-hero"><div><span class="ev-kicker">BOARDMATE · MECHA CUP</span><h1>보석처럼 빛나는<br>당신의 한 수.</h1><h2>${TITLE}</h2><p>평소 스플렌더를 좋아하셨다면,<br>이번 기회에 실력을 마음껏 뽐내보세요.</p><a class="ev-hero-link" href="${URL}" id="ev-jump">대진표 바로 보기 ↑</a></div><div class="ev-hero-art">${gem}<span>SPLENDOR<br><small>TOURNAMENT 2026</small></span></div></header>
    <section class="ev-facts" aria-label="대회 기본 안내"><div><span>WHEN</span><strong>10.30 <small>금요일</small></strong><p>2026년 · 오후 7시 30분</p></div><div><span>PLAYERS</span><strong>12–16 <small>명</small></strong><p>보드메이트 회원 누구나</p></div><div><span>FORMAT</span><strong>추첨 토너먼트</strong><p>최대 4개 조 · 기본판만 사용</p></div></section>
    <div class="ev-info-grid"><section class="ev-info"><span class="ev-kicker">HOW TO PLAY</span><h2>네 개의 조, 하나의 결승</h2><ol><li><b>무작위 추첨</b><span>12~16명을 A~D 네 개 조로 편성합니다.</span></li><li><b>조별 예선</b><span>각 조 1위가 결승에 진출합니다. 확장은 사용하지 않습니다.</span></li><li><b>4인 결승</b><span>결승 결과로 최종 순위를 결정합니다.</span></li></ol><p class="ev-muted">시작 플레이어와 동점 처리는 현장에서 운영진이 안내합니다.</p></section><section class="ev-prizes"><span class="ev-kicker">THE PRIZES</span><h2>우승의 즐거움을 더해줄 선물</h2><div><span>01</span><p><small>1등</small><strong>스트라이크</strong><span>보드게임</span></p><b aria-hidden="true">🏆</b></div><div><span>02</span><p><small>2등</small><strong>컬러레또</strong><span>보드게임</span></p><b aria-hidden="true">🎁</b></div><p class="ev-muted">※ 상품은 당일 사정에 따라 변경될 수 있습니다.</p></section></div>
</article>`);
  const adminPanel=createAdminPanel({root:$('#ev-admin-permissions'),rpc,eventId:EVENT_ID,memberToken,esc});
  const status=(message,error=false)=>{if(stopped)return;$('#ev-status').textContent=message;$('#ev-status').classList.toggle('ev-error',error);};
  const stamp=iso=>new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(iso));
  const permission=()=>{
    adminPanel.setAccess(canEdit);
    $('#ev-access').innerHTML=canEdit?'<span class="ev-admin-badge">대회 관리자</span> 추첨·순위·운영 안내를 기록할 수 있습니다.':'<span class="ev-public-badge">공개 대진표</span> 누구나 조회할 수 있습니다. '+(memberToken()?'현재 계정은 조회 권한입니다.':'<a href="#/login" id="ev-login">관리자 로그인 →</a>');
    $('#ev-login')?.addEventListener('click',()=>sessionStorage.setItem('boardmate:event_return',URL));
  };
  const gameCard=(game,t,final=false)=>{
    const names=Object.fromEntries(t.players.map(p=>[p.id,p.name]));
    const rows=game.playerIds.map((id,i)=>`<div class="ev-player${game.locked&&game.ranks[i]===1?' ev-winner':''}"><span class="ev-seat">${i+1}</span><strong>${esc(names[id])}</strong>${canEdit&&!game.locked?`<select aria-label="${final?'결승':game.id+'조'} ${esc(names[id])} 순위" data-rank="${id}"><option value="">순위</option>${game.playerIds.map((_,rank)=>`<option value="${rank+1}" ${game.ranks[i]===rank+1?'selected':''}>${rank+1}위</option>`).join('')}</select>`:`<span class="ev-rank">${game.ranks[i]?game.ranks[i]+'위':'—'}</span>`}</div>`).join('');
    return `<section class="ev-match${final?' ev-final':''}" data-game="${game.id}"><div class="ev-match-head"><h3>${final?'결승':game.id+'조'}</h3><span>${game.locked?'결과 확정':final?'우승을 향한 한 판':'1위 결승 진출'}</span></div>${rows}${canEdit?`<button type="button" class="${game.locked?'ghost':'primary'} ev-match-action" data-${game.locked?'unlock':'lock'}="${game.id}">${game.locked?'결과 수정':'순위 확정·저장'}</button>`:''}</section>`;
  };
  function render() {
    if(stopped||!record)return;
    const t=record.state;
    permission();
    $('#ev-export').disabled=!t;
    $('#ev-board').innerHTML=`<div class="ev-progress"><strong>${labels[E.phase(t)]}</strong><span>${t?t.players.length+'명 · 예선 '+t.prelims.filter(g=>g.locked).length+'/4조 확정':'운영진이 참가 명단을 확정하면 대진표가 공개됩니다.'}</span></div>${record.notes?`<div class="ev-notice"><b>운영 안내</b><p>${esc(record.notes)}</p></div>`:''}`+(t?`<div class="ev-groups">${t.prelims.map(g=>gameCard(g,t)).join('')}</div><div class="ev-connector">각 조 1위 <span aria-hidden="true">↓</span> 4인 결승</div><div class="ev-final-wrap">${t.final?gameCard(t.final,t,true):`<section class="ev-match ev-final"><div class="ev-match-head"><h3>결승</h3><span>진출자 대기</span></div>${t.prelims.map(g=>`<div class="ev-player"><span class="ev-seat">${g.id}</span><strong>${g.locked?esc(t.players.find(p=>p.id===g.playerIds[g.ranks.indexOf(1)]).name):g.id+'조 1위'}</strong><span class="ev-rank">${g.locked?'진출':'대기'}</span></div>`).join('')}</section>`}</div>${t.final?.locked?`<section class="ev-podium"><span class="ev-kicker">CONGRATULATIONS</span><h3>🏆 ${esc(t.players.find(p=>p.id===t.final.playerIds[t.final.ranks.indexOf(1)]).name)} 님, 우승을 축하합니다!</h3><p>${E.rankedPlayers(t.final).slice(0,3).map(p=>`${p.rank}위 ${esc(t.players.find(x=>x.id===p.id).name)}`).join(' · ')}</p></section>`:''}`:'<div class="ev-empty">'+gem+'<h3>아직 추첨 전입니다</h3><p>대진표가 등록되면 이곳에서 확인할 수 있어요.</p></div>');
    $('#ev-editor').innerHTML=canEdit?`<details class="ev-admin" ${t?'':'open'}><summary>대회 운영 · 참가자 및 안내 관리</summary><div class="ev-editor-grid"><form id="ev-draw-form"><label for="ev-names">참가자 명단 <small>12~16명 · 한 줄에 한 명</small></label><textarea id="ev-names" rows="8" maxlength="1000" placeholder="참가자 닉네임을 입력하세요" required>${esc(t?t.players.map(p=>p.name).join('\n'):'')}</textarea><p class="ev-muted">동명이인은 번호 등으로 구분해 주세요. ${t?'재추첨하면 기존 경기 결과가 초기화됩니다.':''}</p><button class="primary" type="submit">${t?'명단으로 다시 추첨':'무작위 추첨·공개'}</button></form><form id="ev-note-form"><label for="ev-notes">공개 운영 안내</label><textarea id="ev-notes" rows="5" maxlength="2000" placeholder="현장 안내나 진행 상황을 남겨 주세요">${esc(record.notes||'')}</textarea><p class="ev-muted">저장하면 모든 방문자에게 공개됩니다.</p><button class="ghost" type="submit">운영 안내 저장</button></form></div></details>`:'';
    if(canEdit){
      if(drafts.names!==null)$('#ev-names').value=drafts.names;
      if(drafts.notes!==null)$('#ev-notes').value=drafts.notes;
      if(drafts.names!==null||drafts.notes!==null)$('#ev-editor details').open=true;
      $('#ev-board').querySelectorAll('[data-game]').forEach(card=>card.querySelectorAll('[data-rank]').forEach(select=>{
        const value=drafts.ranks[card.dataset.game]?.[select.dataset.rank];if(value!==undefined)select.value=value;
      }));
    }
    $('#ev-board').querySelectorAll('[data-lock]').forEach(button=>button.onclick=()=>mutate(next=>{
      const game=button.dataset.lock==='final'?next.state.final:next.state.prelims.find(g=>g.id===button.dataset.lock);
      button.closest('[data-game]').querySelectorAll('[data-rank]').forEach(select=>E.setRank(game,select.dataset.rank,select.value?Number(select.value):null));
      E.lockGame(game);
      if(!next.state.final&&E.readyForFinal(next.state))E.buildFinal(next.state);
    },button.dataset.lock));
    $('#ev-board').querySelectorAll('[data-unlock]').forEach(button=>button.onclick=()=>{
      const isFinal=button.dataset.unlock==='final';
      if(!confirm(isFinal?'결승 결과를 다시 수정할까요?':t.final?'예선을 수정하면 결승 대진과 결승 결과가 초기화됩니다. 계속할까요?':'이 조의 확정 결과를 수정할까요?'))return;
      void mutate(next=>{if(isFinal)next.state.final.locked=false;else E.unlockPrelim(next.state,button.dataset.unlock);},'unlock:'+button.dataset.unlock);
    });
    $('#ev-draw-form')?.addEventListener('submit',event=>{event.preventDefault();const names=E.parseNames($('#ev-names').value);if(t&&!confirm('재추첨하면 현재 대진과 모든 순위가 초기화됩니다. 계속할까요?'))return;void mutate(next=>{next.state=validateEventTournament(E.createTournament(TITLE,names));});});
    $('#ev-note-form')?.addEventListener('submit',event=>{event.preventDefault();const notes=$('#ev-notes').value;void mutate(next=>{next.notes=notes;},'notes');});
    for(const node of [$('#ev-board'),$('#ev-editor')])node.oninput=event=>{
      const target=event.target;
      if(target.matches('[data-rank]')){const id=target.closest('[data-game]').dataset.game;drafts.ranks[id]||={};drafts.ranks[id][target.dataset.rank]=target.value;}
      else if(target.id==='ev-names')drafts.names=target.value;
      else if(target.id==='ev-notes')drafts.notes=target.value;
      dirtyState();status('저장하지 않은 입력이 있습니다. 해당 항목의 저장 버튼을 눌러 주세요.');
    };
  }
  async function load(force=false) {
    if(stopped||loading||busy)return;
    loading=true;
    try {
      const [data,access]=await Promise.all([rpc('boardmate_get_event',{p_event_id:EVENT_ID}),rpc('boardmate_event_access',{p_token:memberToken(),p_event_id:EVENT_ID}).catch(()=>false)]);
      if(stopped)return;
      if(!data)throw new Error('대회 기록을 준비 중입니다.');
      data.state=validateEventTournament(data.state);
      const accessChanged=canEdit!==(access===true);canEdit=access===true;
      permission();
      if(!canEdit){clearDrafts();$('#ev-editor').innerHTML='';}
      if(dirty&&!force){if(record&&data.revision!==record.revision){pendingRevision=data.revision;$('#ev-updates').hidden=false;}return;}
      const changed=!record||record.revision!==data.revision;
      record=data;pendingRevision=null;$('#ev-updates').hidden=true;
      if(changed||force||accessChanged)render();
      status(`서버 기록 · ${stamp(data.updated_at)} 갱신 · 15초마다 자동 확인`);
    }catch(error){status(record?`최신 기록 확인 실패 · 마지막으로 읽은 기록을 표시합니다. ${error.message}`:error.message,true);if(!record)$('#ev-board').innerHTML='<div class="ev-empty"><h3>공유 대진표를 불러오지 못했습니다</h3><p>잠시 후 새로고침해 주세요. 대회 안내는 위에서 확인할 수 있습니다.</p></div>';}
    finally{loading=false;}
  }
  async function mutate(change,scope='all') {
    if(stopped||busy||!canEdit||!record)return;
    if(loading){status('최신 기록을 확인 중입니다. 잠시 후 저장 버튼을 다시 눌러 주세요.');return;}
    if(pendingRevision!==null){status('다른 관리자가 변경한 최신 기록을 먼저 불러와 주세요.',true);return;}
    const next=structuredClone(record);
    try{change(next);next.state=validateEventTournament(next.state);}catch(error){status(error.message,true);return;}
    busy=true;status('서버에 저장 중…');
    document.querySelectorAll('#ev-board button,#ev-board select,#ev-editor button,#ev-editor input,#ev-editor textarea,#ev-refresh,#ev-reload,#ev-export').forEach(el=>el.disabled=true);
    try{
      const saved=await rpc('boardmate_save_event',{p_token:memberToken(),p_event_id:EVENT_ID,p_expected_revision:record.revision,p_state:next.state,p_notes:next.notes||''});
      if(stopped)return;
      saved.state=validateEventTournament(saved.state);record=saved;
      if(scope==='all')clearDrafts();
      else if(scope==='notes')drafts.notes=null;
      else if(scope.startsWith('unlock:')){delete drafts.ranks[scope.slice(7)];delete drafts.ranks.final;}
      else delete drafts.ranks[scope];
      dirtyState();render();status(`저장 완료 · ${stamp(saved.updated_at)} · 모든 방문자에게 공개되었습니다.${dirty?' 다른 항목에 저장하지 않은 입력이 있습니다.':''}`);
    }catch(error){status(`${error.message} 입력은 저장되지 않았습니다. 최신 기록을 확인한 후 다시 시도해 주세요.`,true);}
    finally{busy=false;if(!stopped){$('#ev-bracket').querySelectorAll('button,input,select,textarea').forEach(el=>el.disabled=false);$('#ev-export').disabled=!record?.state;}}
  }
  const refresh=()=>{if(busy)return;if(dirty&&!confirm('저장하지 않은 입력을 버리고 최신 기록을 불러올까요?'))return;clearDrafts();void load(true);};
  $('#ev-refresh').onclick=refresh;$('#ev-reload').onclick=refresh;
  $('#ev-jump').onclick=e=>{e.preventDefault();$('#ev-bracket').scrollIntoView({behavior:'smooth'});};
  $('#ev-export').onclick=()=>{
    if(!record?.state)return;
    const state={draft:{title:TITLE,names:record.state.players.map(p=>p.name).join('\n'),drawMode:'random'},tournament:record.state};
    const blob=new Blob([E.exportBackup(state)],{type:'application/json;charset=utf-8'}),url=window.URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`${EVENT_ID}-r${record.revision}.json`;a.click();setTimeout(()=>window.URL.revokeObjectURL(url),1000);
  };
  const wake=()=>{if(!document.hidden)void load();};
  const timer=setInterval(wake,15000);window.addEventListener('focus',wake);document.addEventListener('visibilitychange',wake);
  const warn=e=>{if(dirty){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',warn);
  addCleanup(()=>{stopped=true;adminPanel.dispose();clearInterval(timer);window.removeEventListener('focus',wake);document.removeEventListener('visibilitychange',wake);window.removeEventListener('beforeunload',warn);});
  permission();void load();
}
