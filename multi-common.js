const CFG=window.BOARDMATE_CONFIG||{};
export const configured=()=>Boolean(CFG.supabaseUrl&&CFG.supabaseAnonKey&&window.supabase?.createClient);
export const sb=configured()?window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}}):null;
export const roomId=new URLSearchParams(location.search).get('room')||'';
const SESSION_KEY='boardmate:member_session';
const token=()=>localStorage.getItem(SESSION_KEY)||'';
async function rpc(name,args={}){if(!sb)throw new Error('Supabase 설정이 필요합니다.');const {data,error}=await sb.rpc(name,args);if(error)throw error;return data;}
export const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
export function showFatal(message){const el=document.querySelector('#app')||document.body;el.innerHTML=`<div style="padding:24px;font-family:system-ui"><h2>게임을 열 수 없습니다.</h2><p>${esc(message)}</p><p><a href="./index.html#/multi">다인플 방 목록으로 돌아가기</a></p></div>`;throw new Error(message);}
let lastTouch=0,touchBusy=false;
export async function touchPresence(force=false){const now=Date.now();if(!roomId||!token()||touchBusy||(!force&&now-lastTouch<7000))return;touchBusy=true;try{await rpc('touch_boardmate_room',{p_token:token(),p_room_id:roomId});lastTouch=Date.now();}catch{}finally{touchBusy=false;}}
export async function getMe(){const t=token();if(!t)return null;return await rpc('boardmate_me',{p_token:t});}
export async function loadRoom(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');await touchPresence();const data=await rpc('boardmate_get_room',{p_token:t,p_room_id:roomId});if(!data?.room)throw new Error('방을 찾을 수 없습니다.');return data;}
export async function loadState(){const t=token();if(!t)throw new Error('로그인이 필요합니다.');await touchPresence();return await rpc('get_boardmate_room_state',{p_token:t,p_room_id:roomId});}
export async function saveState(expectedRevision,state){const t=token();if(!t)throw new Error('로그인이 필요합니다.');await touchPresence();return await rpc('put_boardmate_room_state',{p_token:t,p_room_id:roomId,p_expected_revision:expectedRevision,p_state:state});}
function tier(row){const wins=Number(row?.wins||0),losses=Number(row?.losses||0),rank=Number(row?.elo_rank||0);if(rank>=1&&rank<=5)return{text:`#${rank}`,cls:'rank',title:`전체 ${rank}위`};if(wins>=2&&wins/(wins+losses||1)>=.5)return{text:'🥇',cls:'gold',title:'골드'};if(wins>=1)return{text:'🥈',cls:'silver',title:'실버'};return{text:'🥉',cls:'bronze',title:'브론즈'};}
export async function ratingBadges(game,userIds){const rows=await rpc('boardmate_get_ratings',{p_token:token(),p_game:game,p_user_ids:userIds});return Object.fromEntries((rows||[]).map(r=>[r.user_id,tier(r)]));}
export async function submitMatch(order){return await rpc('submit_boardmate_match',{p_token:token(),p_room_id:roomId,p_order:order});}
export async function submitTeamMatch(winners,losers){return await rpc('submit_boardmate_team_match',{p_token:token(),p_room_id:roomId,p_winners:winners,p_losers:losers});}
export async function submitCoopMatch(win){return await rpc('submit_boardmate_coop_match',{p_token:token(),p_room_id:roomId,p_win:Boolean(win)});}
export function startStatePoll(onRow,options={}){let stopped=false,busy=false,last=-1;const interval=Number(options.interval||1200);const run=async()=>{if(stopped||busy)return;busy=true;try{const row=await loadState();if(row&&Number(row.revision)!==last){last=Number(row.revision);await onRow(row);}}catch(e){console.warn(e);}finally{busy=false;}};run();const id=setInterval(run,interval);return()=>{stopped=true;clearInterval(id);};}
window.addEventListener('focus',()=>touchPresence(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)touchPresence(true)});

export function endPanel(title='게임 종료',message=''){return `<section style="margin-top:14px;padding:18px;border-radius:18px;background:#fffdf3;border:2px solid #e7c45a;text-align:center;box-shadow:0 8px 24px #00000012"><h2 style="margin:0 0 6px">${esc(title)}</h2>${message?`<p style="margin:0 0 14px;color:#64748b">${esc(message)}</p>`:''}<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><a href="./index.html#/" style="text-decoration:none;background:#111827;color:#fff;padding:10px 14px;border-radius:11px;font-weight:900">← 홈으로</a><a href="./index.html#/multi" style="text-decoration:none;background:#f36f21;color:#fff;padding:10px 14px;border-radius:11px;font-weight:900">다인플 목록</a><a href="./index.html#/room/${encodeURIComponent(roomId)}" style="text-decoration:none;background:#fff;color:#334155;border:1px solid #cbd5e1;padding:10px 14px;border-radius:11px;font-weight:900">방으로 돌아가기</a></div></section>`;}


// ───────────────────── unanimous game-cancel vote ─────────────────────
let cancelUiMounted=false,cancelPollId=null,cancelOverlayShown=false;
async function cancelStatus(){return await rpc('boardmate_get_cancel_status',{p_token:token(),p_room_id:roomId});}
async function setCancelVote(vote){return await rpc('boardmate_set_cancel_vote',{p_token:token(),p_room_id:roomId,p_vote:Boolean(vote)});}
function showCancelledOverlay(){
  if(cancelOverlayShown)return;cancelOverlayShown=true;
  const ov=document.createElement('div');
  ov.id='boardmate-cancelled-overlay';
  ov.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#0f172ae8;display:grid;place-items:center;padding:18px;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif';
  ov.innerHTML=`<div style="width:min(500px,100%);background:white;border-radius:22px;padding:26px;text-align:center;box-shadow:0 30px 90px #0008"><div style="font-size:42px">🛑</div><h2 style="margin:8px 0">게임이 취소되었습니다</h2><p style="color:#64748b;line-height:1.6">참가자 전원이 취소에 동의했습니다.<br>이번 게임은 승패와 ELO에 반영되지 않습니다.</p><div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:18px"><a href="./index.html#/" style="text-decoration:none;background:#111827;color:white;padding:11px 15px;border-radius:11px;font-weight:900">← 홈으로</a><a href="./index.html#/multi" style="text-decoration:none;background:#f36f21;color:white;padding:11px 15px;border-radius:11px;font-weight:900">다인플 목록</a></div></div>`;
  document.body.appendChild(ov);
}
function mountCancelControl(){
  if(cancelUiMounted||!roomId||!token()||!configured())return;cancelUiMounted=true;
  const wrap=document.createElement('div');wrap.id='boardmate-cancel-control';wrap.style.cssText='position:fixed;right:14px;bottom:14px;z-index:2147483000;font-family:Pretendard,"Noto Sans KR",system-ui,sans-serif';
  wrap.innerHTML=`<button id="bmCancelOpen" type="button" style="border:1px solid #fecaca;background:#fff;color:#b91c1c;border-radius:999px;padding:9px 12px;font-weight:900;box-shadow:0 8px 24px #0002;cursor:pointer">게임 취소</button><div id="bmCancelPanel" hidden style="position:absolute;right:0;bottom:48px;width:min(330px,calc(100vw - 28px));background:white;color:#172033;border:1px solid #e5e7eb;border-radius:16px;padding:14px;box-shadow:0 18px 50px #0004"><b style="display:block;margin-bottom:5px">🛑 게임 취소 투표</b><div id="bmCancelText" style="font-size:12px;color:#64748b;line-height:1.55">투표 상태를 불러오는 중…</div><div id="bmCancelVoters" style="font-size:11px;color:#94a3b8;margin-top:6px"></div><button id="bmCancelVote" type="button" style="width:100%;margin-top:10px;border:0;border-radius:10px;padding:9px;font-weight:900;cursor:pointer;background:#fee2e2;color:#b91c1c">취소에 동의</button><button id="bmCancelClose" type="button" style="width:100%;margin-top:6px;border:1px solid #e5e7eb;border-radius:10px;padding:8px;font-weight:800;cursor:pointer;background:white;color:#475569">닫기</button></div>`;
  document.body.appendChild(wrap);
  const open=wrap.querySelector('#bmCancelOpen'),panel=wrap.querySelector('#bmCancelPanel'),text=wrap.querySelector('#bmCancelText'),voters=wrap.querySelector('#bmCancelVoters'),voteBtn=wrap.querySelector('#bmCancelVote');
  let latest=null,busy=false;
  const draw=st=>{latest=st;if(!st)return;if(st.room_status==='cancelled'){wrap.style.display='none';showCancelledOverlay();return;}if(st.room_status!=='playing'){wrap.style.display='none';return;}wrap.style.display='block';text.textContent=`${Number(st.votes||0)} / ${Number(st.members||0)}명 동의 · 전원이 동의하면 즉시 취소됩니다.`;const ns=Array.isArray(st.voters)?st.voters:[];voters.textContent=ns.length?`동의: ${ns.join(', ')}`:'아직 동의한 사람이 없습니다.';voteBtn.textContent=st.mine?'동의 철회':'취소에 동의';voteBtn.style.background=st.mine?'#f1f5f9':'#fee2e2';voteBtn.style.color=st.mine?'#475569':'#b91c1c';};
  const refresh=async()=>{if(busy)return;busy=true;try{draw(await cancelStatus());}catch(e){const msg=String(e.message||'');if(msg.includes('참가자'))wrap.style.display='none';else if(msg.includes('schema cache')||msg.includes('boardmate_get_cancel_status')){wrap.style.display='block';text.textContent='Supabase 취소 RPC가 아직 적용되지 않았습니다. v11의 SUPABASE_CANCEL_FIX.sql을 SQL Editor에서 실행해 주세요.';voteBtn.disabled=true;}}finally{busy=false;}};
  open.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden)refresh();};
  wrap.querySelector('#bmCancelClose').onclick=()=>panel.hidden=true;
  voteBtn.onclick=async()=>{if(busy)return;if(!latest?.mine&&!confirm('게임 취소에 동의할까요? 참가자 전원이 동의하면 이 게임은 승패/ELO 반영 없이 종료됩니다.'))return;busy=true;voteBtn.disabled=true;try{draw(await setCancelVote(!latest?.mine));}catch(e){const msg=String(e.message||'');alert((msg.includes('schema cache')||msg.includes('boardmate_set_cancel_vote'))?'Supabase에 게임 취소 RPC가 아직 적용되지 않았습니다. v11의 SUPABASE_CANCEL_FIX.sql을 SQL Editor에서 실행해 주세요.':(e.message||'취소 투표에 실패했습니다.'));}finally{busy=false;if(!String(text.textContent||'').includes('SUPABASE_CANCEL_FIX.sql'))voteBtn.disabled=false;}};
  refresh();cancelPollId=setInterval(refresh,2200);
  window.addEventListener('beforeunload',()=>{if(cancelPollId)clearInterval(cancelPollId);},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mountCancelControl,0),{once:true});else setTimeout(mountCancelControl,0);
