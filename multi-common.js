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
