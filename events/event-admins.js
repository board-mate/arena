// Event-scoped roles only. The server resolves session tokens and enforces every change.
export function createAdminPanel({root,rpc,eventId,memberToken,esc}) {
  let allowed=false,stopped=false,busy=false,data=null,generation=0,proposed=null;
  root.innerHTML=`<details class="ev-admin"><summary>관리자 권한 관리</summary><p>대회 관리자는 기록 작성과 다른 회원의 관리자 권한 추가·해지를 할 수 있습니다. 상현·관리자는 해지할 수 없는 최상위 관리자입니다.</p><p class="ev-role-status" role="status" aria-live="polite"></p><div class="ev-role-list"></div><form class="ev-role-search"><label for="ev-member-query">관리자로 추가할 회원 검색</label><div><input id="ev-member-query" maxlength="20" required placeholder="회원 닉네임"><button class="ghost" type="submit">검색</button><button class="ghost" type="button" data-role-refresh>목록 새로고침</button></div></form><div class="ev-role-results"></div></details>`;
  const $=s=>root.querySelector(s);
  const confirmation=document.createElement('div');confirmation.className='ev-role-confirm';confirmation.hidden=true;confirmation.setAttribute('role','group');confirmation.setAttribute('aria-label','권한 변경 확인');root.querySelector('details').append(confirmation);
  function propose(person,grant){
    if(!person||busy)return;proposed={person,grant};confirmation.hidden=false;
    confirmation.innerHTML=`<p>${esc(person.nickname)} 님의 대회 관리자 권한을 ${grant?'추가할까요? 대회 기록과 다른 회원의 관리자 권한을 관리할 수 있습니다.':'해지할까요?'}</p><button type="button" class="primary" data-confirm-role>확인 · ${grant?'권한 추가':'권한 해지'}</button> <button type="button" class="ghost" data-cancel-role>취소</button>`;
    confirmation.querySelector('[data-confirm-role]').onclick=()=>{const next=proposed;proposed=null;confirmation.hidden=true;void change(next.person,next.grant);};
    confirmation.querySelector('[data-cancel-role]').onclick=()=>{proposed=null;confirmation.hidden=true;};
    confirmation.querySelector('[data-confirm-role]').focus();
  }
  const say=(text,error=false)=>{$('.ev-role-status').textContent=text;$('.ev-role-status').classList.toggle('ev-error',error);};
  const args=()=>({p_token:memberToken(),p_event_id:eventId});
  const active=n=>!stopped&&allowed&&generation===n;
  const disable=value=>root.querySelectorAll('button,input').forEach(el=>el.disabled=value);
  function render() {
    $('.ev-role-list').innerHTML=data.admins.map(a=>`<div class="ev-role-row"><strong>${esc(a.nickname)}</strong><span>${a.is_super_admin?'최상위 관리자 · 해지 불가':a.user_id===data.actor_id?'대회 관리자 · 나':'대회 관리자'}</span>${!a.is_super_admin&&a.user_id!==data.actor_id?`<button class="ghost" type="button" data-revoke="${esc(a.user_id)}">권한 해지</button>`:''}</div>`).join('');
    $('.ev-role-list').querySelectorAll('[data-revoke]').forEach(b=>b.onclick=()=>{
      const person=data.admins.find(a=>a.user_id===b.dataset.revoke);propose(person,false);
    });
  }
  async function refresh() {
    if(!allowed||stopped||busy)return;
    const n=++generation;busy=true;disable(true);say('관리자 목록을 불러오는 중…');
    try {const next=await rpc('boardmate_list_event_admins',args());if(!active(n))return;data=next;render();say(`대회 관리자 ${data.admins.length}명 · 최상위 관리자 2명은 보호됩니다.`);}
    catch(e){if(active(n)){data=null;$('.ev-role-list').textContent='';say(e.message,true);}}
    finally {if(active(n)){busy=false;disable(false);}}
  }
  async function change(person,grant) {
    if(!person||!data||busy||!allowed||stopped)return;
    const n=++generation;busy=true;disable(true);say('권한을 변경하는 중…');
    try {
      const next=await rpc('boardmate_change_event_admin',{...args(),p_user_id:person.user_id,p_grant:grant,p_expected_revision:data.revision});
      if(!active(n))return;data=next;render();$('.ev-role-results').textContent='';say(`${person.nickname} 님의 관리자 권한을 ${grant?'추가':'해지'}했습니다.`);
    }catch(e){if(active(n))say(`${e.message} 목록 새로고침 후 다시 확인해 주세요.`,true);}
    finally {if(active(n)){busy=false;disable(false);}}
  }
  $('.ev-role-search').onsubmit=async e=>{
    e.preventDefault();if(!allowed||stopped||busy)return;
    const query=$('#ev-member-query').value.trim();if(!query)return;
    const n=++generation;busy=true;disable(true);say('회원을 검색하는 중…');
    try {
      const people=await rpc('boardmate_search_event_members',{...args(),p_query:query});if(!active(n))return;
      $('.ev-role-results').innerHTML=people.map(p=>`<div class="ev-role-row"><strong>${esc(p.nickname)}</strong><span>${p.is_super_admin?'최상위 관리자':p.is_admin?'이미 관리자입니다':'일반 회원'}</span>${!p.is_admin?`<button class="primary" type="button" data-grant="${esc(p.user_id)}">관리자 추가</button>`:''}</div>`).join('');
      $('.ev-role-results').querySelectorAll('[data-grant]').forEach(b=>b.onclick=()=>propose(people.find(p=>p.user_id===b.dataset.grant),true));
      say(people.length?`${people.length}명 검색됨${people.length===20?' · 최대 20명, 닉네임을 더 정확히 입력하세요.':''}`:'검색된 회원이 없습니다.');
    }catch(e){if(active(n))say(e.message,true);}
    finally {if(active(n)){busy=false;disable(false);}}
  };
  $('[data-role-refresh]').onclick=()=>{ $('.ev-role-results').textContent='';void refresh(); };
  $('details').ontoggle=()=>{if($('details').open&&allowed&&!data)void refresh();};
  return {
    setAccess(value){
      if(stopped||allowed===value)return;allowed=value;root.hidden=!value;
      if(!value){generation++;busy=false;data=null;proposed=null;confirmation.hidden=true;$('.ev-role-list').textContent='';$('.ev-role-results').textContent='';$('#ev-member-query').value='';say('');}
      else if($('details').open)void refresh();
    },
    dispose(){stopped=true;generation++;root.innerHTML='';}
  };
}
