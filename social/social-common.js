const CFG=window.BOARDMATE_CONFIG||{};
export const roomId=new URLSearchParams(location.search).get('room')||'';
export const token=()=>localStorage.getItem('boardmate:member_session')||sessionStorage.getItem('boardmate:member_session')||'';
export const configured=()=>Boolean(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase?.createClient);
export const sb=configured()?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function rpc(name,args={}){if(!sb)throw new Error('Supabase 설정이 필요합니다.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
export async function boot(expectedGame){
  if(!configured()||!roomId)throw new Error('BoardMate 다인플 방에서 게임을 열어주세요.');
  const me=await rpc('boardmate_me',{p_token:token()});
  if(!me)throw new Error('로그인이 필요합니다.');
  const data=await rpc('boardmate_get_room',{p_token:token(),p_room_id:roomId});
  if(!data?.room||data.room.game!==expectedGame)throw new Error('올바른 게임 방이 아닙니다.');
  const member=(data.members||[]).find(x=>x.user_id===me.user_id);
  if(!member)throw new Error('이 방의 참가자가 아닙니다.');
  return {me,room:data.room,members:(data.members||[]).slice().sort((a,b)=>Number(a.seat)-Number(b.seat)),mySeat:Number(member.seat),isHost:data.room.host_id===me.user_id};
}
export async function getView(){return await rpc('boardmate_social_view',{p_token:token(),p_room_id:roomId});}
export async function act(action){return await rpc('boardmate_social_action',{p_token:token(),p_room_id:roomId,p_action:action});}
export async function touch(){try{await rpc('touch_boardmate_room',{p_token:token(),p_room_id:roomId});}catch{}}
export function startPolling(onView,{interval=1200}={}){
  let stopped=false,busy=false,lastRevision=-1;
  const tick=async()=>{if(stopped||busy)return;busy=true;try{const v=await getView();const r=Number(v?.revision??0);if(r!==lastRevision){lastRevision=r;await onView(v);}}catch(e){console.warn('social poll',e);}finally{busy=false;}};
  tick();const id=setInterval(tick,interval);const presence=setInterval(()=>void touch(),15000);void touch();
  return ()=>{stopped=true;clearInterval(id);clearInterval(presence);};
}
export function fatal(message){document.body.innerHTML=`<main class="sd-fatal"><h1>게임을 열 수 없습니다</h1><p>${esc(message)}</p><a href="./index.html#/multi">다인플 목록으로</a></main>`;throw new Error(String(message));}
export const ROLE_KO={
  merlin:'멀린',percival:'퍼시벌',loyal:'아서의 충성스러운 신하',assassin:'암살자',morgana:'모르가나',mordred:'모드레드',oberon:'오베론',minion_of_mordred:'모드레드의 하수인',
  liberal:'자유당원',fascist:'파시스트',hitler:'히틀러',
  doppelganger:'도플갱어',werewolf:'늑대인간',minion:'하수인',mason:'프리메이슨',seer:'예언자',robber:'강도',troublemaker:'말썽쟁이',drunk:'주정뱅이',insomniac:'불면증환자',villager:'마을주민',tanner:'무두장이',hunter:'사냥꾼'
};
export const roleKo=r=>ROLE_KO[r]||r||'—';
export const POLICY_KO={L:'자유 정책',F:'파시스트 정책'};
export const policyKo=p=>POLICY_KO[p]||p;
export function roleListHtml(counts){
  const entries=Object.entries(counts||{}).filter(([,n])=>Number(n)>0);
  return entries.map(([r,n])=>`<span class="sd-role-pill">${esc(roleKo(r))} ×${Number(n)}</span>`).join('')||'<span class="sd-muted">역할 구성이 아직 없습니다.</span>';
}
export function openRoles(counts,title='이번 판 역할'){
  document.querySelector('#sdRoleModal')?.remove();
  const wrap=document.createElement('div');wrap.id='sdRoleModal';wrap.className='sd-modal-backdrop';
  wrap.innerHTML=`<section class="sd-modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="sd-modal-head"><h2>🎭 ${esc(title)}</h2><button type="button" class="sd-btn ghost" data-close>닫기</button></div><div class="sd-role-list">${roleListHtml(counts)}</div><p class="sd-muted">역할 종류와 수량만 공개합니다. 누가 어떤 역할인지는 공개하지 않습니다.</p></section>`;
  document.body.appendChild(wrap);wrap.querySelector('[data-close]').onclick=()=>wrap.remove();wrap.onclick=e=>{if(e.target===wrap)wrap.remove();};
}
export function namesBySeat(members){return Object.fromEntries((members||[]).map(m=>[Number(m.seat),m.nickname]));}
export function seatName(members,seat){return members.find(m=>Number(m.seat)===Number(seat))?.nickname||`#${Number(seat)+1}`;}

// Shared social-deduction end-state helpers.
export async function finalizeSeatWinners(ctx,winnerSeats=[]){
  const winners=new Set((winnerSeats||[]).map(Number));
  const winIds=(ctx?.members||[]).filter(m=>winners.has(Number(m.seat))).map(m=>m.user_id).filter(Boolean);
  const loseIds=(ctx?.members||[]).filter(m=>!winners.has(Number(m.seat))).map(m=>m.user_id).filter(Boolean);
  try{
    if(!winIds.length && !loseIds.length) return null;
    return await rpc('submit_boardmate_team_match',{p_token:token(),p_room_id:roomId,p_winners:winIds,p_losers:loseIds});
  }catch(e){
    // Preserve the playable game even if result/RR submission is unavailable.
    if(!String(e?.message||e).toLowerCase().includes('already')) console.warn('[BoardMate social] result submit failed',e);
    return null;
  }
}
export function socialEndScreen({win,title='게임 종료',reason='',summary='',body=''}){
  return `<section class="sd-end-screen ${win?'is-win':'is-loss'}"><div class="sd-end-icon">${win?'🏆':'🎭'}</div><h2>${esc(title)}</h2><div class="sd-end-result">${win?'승리':'패배'}</div>${reason?`<p class="sd-end-reason">${esc(reason)}</p>`:''}${summary?`<p class="sd-end-summary">${esc(summary)}</p>`:''}<div class="sd-end-body">${body}</div><div class="sd-end-actions"><a class="sd-btn primary" href="./index.html#/">홈으로</a><a class="sd-btn ghost" href="./index.html#/multi">다인플 목록</a><a class="sd-btn ghost" href="./index.html#/room/${encodeURIComponent(roomId)}">방으로</a></div></section>`;
}


// Universal unanimous cancellation for social-deduction games.
let socialCancelMounted=false,socialCancelTimer=null;
export async function mountSocialCancelControl(){
  if(socialCancelMounted||!roomId||!token()||!configured())return;
  socialCancelMounted=true;
  const wrap=document.createElement('div');
  wrap.id='boardmate-social-cancel';
  wrap.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif';
  wrap.innerHTML=`<button id="bmscOpen" type="button" style="border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:999px;padding:9px 12px;font-weight:900;box-shadow:0 8px 24px #0002;cursor:pointer">게임 취소</button><div id="bmscPanel" hidden style="position:absolute;right:0;bottom:48px;width:min(330px,calc(100vw - 28px));background:white;color:#172033;border:1px solid #e5e7eb;border-radius:16px;padding:14px;box-shadow:0 18px 50px #0004"><b style="display:block;margin-bottom:5px">🛑 게임 취소 투표</b><div id="bmscText" style="font-size:12px;color:#64748b;line-height:1.55">투표 상태를 불러오는 중…</div><div id="bmscVoters" style="font-size:11px;color:#94a3b8;margin-top:6px"></div><button id="bmscVote" type="button" style="width:100%;margin-top:10px;border:0;border-radius:10px;padding:9px;font-weight:900;cursor:pointer;background:#fee2e2;color:#b91c1c">취소에 동의</button><button id="bmscClose" type="button" style="width:100%;margin-top:6px;border:1px solid #e5e7eb;border-radius:10px;padding:8px;font-weight:800;cursor:pointer;background:white;color:#475569">닫기</button></div>`;
  document.body.appendChild(wrap);
  const panel=wrap.querySelector('#bmscPanel'),text=wrap.querySelector('#bmscText'),voters=wrap.querySelector('#bmscVoters'),vote=wrap.querySelector('#bmscVote');
  let latest=null,busy=false;
  const status=async()=>await rpc('boardmate_get_cancel_status',{p_token:token(),p_room_id:roomId});
  const setVote=async(v)=>await rpc('boardmate_set_cancel_vote',{p_token:token(),p_room_id:roomId,p_vote:Boolean(v)});
  const draw=st=>{latest=st;if(!st)return;const roomStatus=st.room_status||'';if(roomStatus!=='playing'){wrap.style.display='none';return;}wrap.style.display='block';text.textContent=`${Number(st.votes??st.yes??0)} / ${Number(st.members??st.total??0)}명 동의 · 전원이 동의하면 게임이 취소됩니다.`;voters.textContent=(st.voters||[]).length?`동의: ${(st.voters||[]).join(', ')}`:'';const mine=Boolean(st.mine);vote.textContent=mine?'동의 철회':'취소에 동의';vote.style.background=mine?'#f1f5f9':'#fee2e2';vote.style.color=mine?'#475569':'#b91c1c';};
  const refresh=async()=>{if(busy)return;busy=true;try{draw(await status());}catch(e){wrap.style.display='block';text.textContent=`취소 투표를 불러오지 못했습니다: ${e.message||e}`; }finally{busy=false;}};
  wrap.querySelector('#bmscOpen').onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)refresh();};
  wrap.querySelector('#bmscClose').onclick=()=>panel.hidden=true;
  vote.onclick=async()=>{if(busy)return;if(!latest?.mine&&!confirm('게임 취소에 동의할까요? 참가자 전원이 동의하면 이 게임은 승패 없이 종료됩니다.'))return;busy=true;vote.disabled=true;try{draw(await setVote(!latest?.mine));}catch(e){alert(e.message||e);}finally{busy=false;vote.disabled=false;}};
  await refresh(); socialCancelTimer=setInterval(refresh,2500);
  window.addEventListener('beforeunload',()=>socialCancelTimer&&clearInterval(socialCancelTimer),{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>void mountSocialCancelControl(),0),{once:true});else setTimeout(()=>void mountSocialCancelControl(),0);
