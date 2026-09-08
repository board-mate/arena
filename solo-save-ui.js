(function(){
  function css(){
    if(document.getElementById('boardmate-solo-save-style')) return;
    const s=document.createElement('style'); s.id='boardmate-solo-save-style';
    s.textContent=`#boardmate-solo-savebar{position:fixed;right:12px;bottom:12px;z-index:2147483000;display:flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end;padding:7px;border-radius:14px;background:rgba(15,23,42,.92);border:1px solid rgba(148,163,184,.35);box-shadow:0 8px 28px #0005;backdrop-filter:blur(8px);font:800 12px system-ui,-apple-system,"Noto Sans KR",sans-serif}#boardmate-solo-savebar button{border:1px solid #475569;border-radius:9px;padding:7px 10px;background:#1e293b;color:#fff;font:inherit;cursor:pointer}#boardmate-solo-savebar button:hover{filter:brightness(1.12)}#boardmate-solo-savebar .bm-save{background:#166534;border-color:#22c55e}#boardmate-solo-savebar .bm-resume{background:#1d4ed8;border-color:#60a5fa}#boardmate-solo-savebar .bm-abandon{background:#7f1d1d;border-color:#f87171}#boardmate-solo-savebar .bm-status{color:#cbd5e1;padding:0 4px;max-width:170px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}@media(max-width:600px){#boardmate-solo-savebar{left:8px;right:8px;bottom:8px}#boardmate-solo-savebar .bm-status{display:none}#boardmate-solo-savebar button{flex:1}}`;
    document.head.appendChild(s);
  }
  function install(opts){
    css();
    let bar=document.getElementById('boardmate-solo-savebar'); if(bar) bar.remove();
    bar=document.createElement('div'); bar.id='boardmate-solo-savebar';
    const status=document.createElement('span'); status.className='bm-status'; status.textContent=opts.statusText||'자동 저장'; bar.appendChild(status);
    const mark=(msg)=>{status.textContent=msg||('저장됨 '+new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}));};
    if(typeof opts.save==='function'){
      const b=document.createElement('button'); b.className='bm-save'; b.textContent='💾 저장';
      b.onclick=async()=>{try{await opts.save();mark();}catch(e){alert('저장하지 못했습니다: '+(e?.message||e));}}; bar.appendChild(b);
    }
    if(typeof opts.resume==='function' && (!opts.hasSave || opts.hasSave())){
      const b=document.createElement('button'); b.className='bm-resume'; b.textContent='▶ 이어하기';
      b.onclick=async()=>{try{await opts.resume();mark('저장본 불러옴');b.remove();}catch(e){alert('저장된 게임을 불러오지 못했습니다: '+(e?.message||e));}}; bar.appendChild(b);
    }
    if(typeof opts.abandon==='function'){
      const b=document.createElement('button'); b.className='bm-abandon'; b.textContent='🏳 게임 포기';
      b.onclick=async()=>{if(!confirm(opts.abandonConfirm||'현재 게임을 포기할까요? 저장된 진행도 함께 삭제됩니다.'))return; try{await opts.abandon();mark('저장 삭제됨');}catch(e){alert('게임을 포기하지 못했습니다: '+(e?.message||e));}}; bar.appendChild(b);
    }
    document.body.appendChild(bar);
    return {mark};
  }
  window.BoardMateSoloUI={install};
})();
