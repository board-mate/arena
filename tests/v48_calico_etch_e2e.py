#!/usr/bin/env python3
"""BoardMate v11.4.48 browser E2E + release regression tests.

This runs the production HTML/JS in headless Chromium using in-memory stubs only;
it never writes to Supabase or alters a live room.
"""
from __future__ import annotations
import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
CALICO=ROOT/'online-calico.html'
ETCH=ROOT/'solo-etchinstone.html'
APP=ROOT/'app.js'
INDEX=ROOT/'index.html'
COMMON=ROOT/'multi-common.js'


def need(cond,msg):
    if not cond:
        raise AssertionError(msg)
    print('PASS',msg)


def calico_html_with_test_hook():
    html=CALICO.read_text(encoding='utf-8')
    html=re.sub(r'<script src="https://cdn\.jsdelivr\.net/npm/@supabase/supabase-js@2"></script>','',html)
    html=re.sub(r'<script src="\.\/config\.js"></script>','',html)
    html=re.sub(r'<script type="module">.*?</script>','',html,flags=re.S)
    hook=r'''
  window.__calicoTest={
    phase:()=>state?.phase,
    pending:()=>pendingTokenChoices.map(x=>({type:x.type,id:x.id,label:x.label,keys:[...x.keys]})),
    seedRumi:()=>{
      const p=state.players[state.active], r=CATS.find(c=>c.id==='rumi');
      state.cats=[{...r,preferred:[5,2]}]; state.inventories.cats={rumi:8};
      for(const k of ['0,2','0,3','0,4']){p.board[k].cats=[];p.board[k].buttons=[];}
      p.board['0,2'].tile={color:'green',pattern:5};
      p.board['0,3'].tile={color:'pink',pattern:5};
      p.board['0,4'].tile=null;
      p.hand=[{color:'darkBlue',pattern:5},{color:'yellow',pattern:1}];
      state.phase='place';state.selectedHand=null;viewedPlayer=state.active;renderGame();
    },
    seedPrintedEdgeRumi:()=>{
      const p=state.players[state.active], r=CATS.find(c=>c.id==='rumi');
      // Blue board top-right printed edge 0,5 is pattern 1. Make 0,3/0,4 match it.
      p.boardColor='blue';p.edgeCatalog=CALICO_EDGE_CATALOG.blue;
      state.cats=[{...r,preferred:[1,2]}];state.inventories.cats={rumi:8};
      for(const k of ['0,3','0,4']){p.board[k].tile={color:'green',pattern:1};p.board[k].cats=[];p.board[k].buttons=[];}
      pendingTokenChoices=buildAllPendingTokenChoices(p,state);state._pendingTokenChoices=deepClone(pendingTokenChoices);
      return pendingTokenChoices.some(x=>x.type==='cat'&&x.id==='rumi'&&x.keys.includes('0,4'));
    },
    seedMissedRumi:()=>{
      const p=state.players[state.active], r=CATS.find(c=>c.id==='rumi');
      state.cats=[{...r,preferred:[5,2]}]; state.inventories.cats={rumi:8};
      for(const k of ['0,2','0,3','0,4']){p.board[k].cats=[];p.board[k].buttons=[];p.board[k].tile={color:'green',pattern:5};}
      pendingTokenChoices=[];tokenPlacementMode=null;state._pendingTokenChoices=[];state.phase='draft';viewedPlayer=state.active;renderGame();
    },
    catsAt:(k)=>[...(state.players[state.active].board[k].cats||[])],
    stateSnapshot:()=>JSON.parse(JSON.stringify(state)),
    receiveCompatibleOldState:()=>{
      const snap=JSON.parse(JSON.stringify(state));
      snap.version=11;snap.gameId='calico-pvp';snap._gameId='calico-pvp';snap._arenaRevision=37;
      const before={players:snap.players.length,active:snap.active,round:snap.round,board:JSON.stringify(snap.players[snap.active].board)};
      const ok=receiveArenaState(snap);
      return {ok,before,after:{players:state.players.length,active:state.active,round:state.round,board:JSON.stringify(state.players[state.active].board)}};
    }
  };
'''
    marker="  postToArena('BOARD_MATE_GAME_CONTEXT_REQUEST',{gameId:GAME_ID,manifest:GAME_MANIFEST});"
    need(marker in html,'Calico test injection marker exists')
    return html.replace(marker,marker+'\n'+hook,1)


def etch_html_with_test_hook():
    html=ETCH.read_text(encoding='utf-8').replace('<script src="./solo-save-ui.js"></script>','')
    # The production installer is not needed in the isolated harness.
    html=re.sub(r'<script>\s*window\.addEventListener\(\'DOMContentLoaded\'.*?</script>\s*</body>','</body>',html,flags=re.S)
    fake="""<script>const __store={};Object.defineProperty(window,'localStorage',{value:{getItem:k=>Object.prototype.hasOwnProperty.call(__store,k)?__store[k]:null,setItem:(k,v)=>{__store[k]=String(v)},removeItem:k=>{delete __store[k]},clear:()=>{for(const k in __store)delete __store[k]}}});</script>"""
    html=html.replace('<body>','<body>'+fake,1)
    hook="""<script>window.__etchTest={saveExists:()=>!!localStorage.getItem(SAVE_KEY),runtimeReset:()=>{s=null;render();}};</script>"""
    html=html.replace('</body>',hook+'</body>',1)
    return html


async def calico_flow(browser,viewport):
    page=await browser.new_page(viewport=viewport)
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.set_content(calico_html_with_test_hook(),wait_until='domcontentloaded')
    await page.check('#familyVariant')
    await page.click('#prepareGoalsBtn')
    await page.wait_for_selector('#gameScreen:not(.hidden)')
    need(await page.locator('#gameScreen').is_visible(),f"Calico starts at {viewport['width']}px")

    await page.evaluate('__calicoTest.seedRumi()')
    await page.locator('#handRow .tile-card').nth(0).click()
    target=page.locator('.hex.patch[data-key="0,4"]')
    need('playable' in (await target.get_attribute('class') or ''),f"upper-right Calico cell is clickable at {viewport['width']}px")
    await target.click()
    need(await page.evaluate('__calicoTest.phase()')=='token',f"upper-right placement reaches token phase at {viewport['width']}px")
    pending=await page.evaluate('__calicoTest.pending()')
    need(any(x['type']=='cat' and x['id']=='rumi' for x in pending),f"Rumi is detected after upper-right placement at {viewport['width']}px")
    rumi=page.locator('[data-token-index]').filter(has_text='루미')
    need(await rumi.count()==1,f"Rumi placement choice is shown at {viewport['width']}px")
    await rumi.click();await target.click()
    need(await page.evaluate("__calicoTest.catsAt('0,4')")==['rumi'],f"Rumi token can be placed on upper-right tile at {viewport['width']}px")

    need(await page.evaluate('__calicoTest.seedPrintedEdgeRumi()'),f"Rumi detects a top-right group using printed edge at {viewport['width']}px")

    await page.evaluate('__calicoTest.seedMissedRumi()')
    before=await page.evaluate('__calicoTest.stateSnapshot()')
    await page.click('#awardRescanBtn')
    need(await page.evaluate('__calicoTest.phase()')=='token',f"missed Rumi can be recovered from current game at {viewport['width']}px")
    rescanned=await page.evaluate('__calicoTest.pending()')
    need(any(x['id']=='rumi' for x in rescanned),f"rescan exposes missed Rumi at {viewport['width']}px")
    after=await page.evaluate('__calicoTest.stateSnapshot()')
    need((before['active'],before['round'],len(before['players']))==(after['active'],after['round'],len(after['players'])),f"rescan preserves active room turn metadata at {viewport['width']}px")

    compat=await page.evaluate('__calicoTest.receiveCompatibleOldState()')
    need(compat['ok'],f"v47/older Calico room state is accepted at {viewport['width']}px")
    need((compat['before']['players'],compat['before']['active'],compat['before']['round'],compat['before']['board'])==(compat['after']['players'],compat['after']['active'],compat['after']['round'],compat['after']['board']),f"compatible room load does not reset board at {viewport['width']}px")
    need(not errors,f"Calico has no browser page errors at {viewport['width']}px: {errors}")
    await page.close()


async def etch_flow(browser):
    page=await browser.new_page(viewport={'width':390,'height':844})
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    await page.set_content(etch_html_with_test_hook(),wait_until='domcontentloaded')
    need(await page.locator('h1',has_text='에친스톤의 용들').count()>0,'Etchinstone setup renders')
    await page.locator('button.primary',has_text='모험 시작').click()
    need(await page.locator('text=탐험 기록').count()>0,'Etchinstone starts a game')
    need(await page.evaluate('__etchTest.saveExists()'),'Etchinstone autosaves after start')
    await page.evaluate('__etchTest.runtimeReset()')
    need(await page.locator('button.gold',has_text='저장된 게임 이어하기').count()==1,'Etchinstone exposes resume from autosave')
    await page.locator('button.gold',has_text='저장된 게임 이어하기').click()
    need(await page.locator('text=탐험 기록').count()>0,'Etchinstone resumes saved game')
    need(not errors,f'Etchinstone has no browser page errors: {errors}')
    await page.close()


async def cancel_flow(browser):
    src=COMMON.read_text(encoding='utf-8')
    src=re.sub(r'\bexport\s+','',src)
    src=src.replace("const roomId=new URLSearchParams(location.search).get('room')||'';","const roomId='e2e-room';")
    src += "\nwindow.__cancelTest={open:openCancelVotePanel};"
    page=await browser.new_page()
    errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    stub="""
    <script>
    const __store={'boardmate:member_session':'e2e-token'};
    Object.defineProperty(window,'localStorage',{value:{getItem:k=>__store[k]||null,setItem:(k,v)=>__store[k]=String(v),removeItem:k=>delete __store[k]}});
    Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>null,setItem:()=>{},removeItem:()=>{}}});
    window.BOARDMATE_CONFIG={supabaseUrl:'stub',supabaseAnonKey:'stub'};
    window.supabase={createClient:()=>({
      rpc:async(name,args)=>({data:name==='boardmate_get_cancel_status'?{yes:1,total:2,mine:false,room_status:'playing',voters:['E2E']}:{yes:1,total:2,mine:true,room_status:'playing',voters:['E2E']},error:null}),
      channel:()=>({subscribe:(cb)=>{cb('SUBSCRIBED');return this},on:()=>{},send:async()=> 'ok'})
    })};
    </script>
    """
    await page.set_content('<!doctype html><html><body>'+stub+'<script type="module">'+src+'</script></body></html>',wait_until='domcontentloaded')
    await page.wait_for_timeout(50)
    need(await page.locator('#bmCancelOpen').count()==1,'common online cancel control mounts')
    need(await page.evaluate('__cancelTest.open()'),'header cancel action can open common cancel panel')
    need(await page.locator('#bmCancelPanel').evaluate('(e)=>!e.hidden'),'cancel vote panel becomes visible')
    need(not errors,f'cancel control has no browser page errors: {errors}')
    await page.close()


async def main():
    app=APP.read_text(encoding='utf-8');idx=INDEX.read_text(encoding='utf-8');cal=CALICO.read_text(encoding='utf-8');common=COMMON.read_text(encoding='utf-8')
    need('에친스톤' in app and './solo-etchinstone.html' in app,'Etchinstone is restored to 1P UI')
    need('포켓몬 미니마' not in app and 'pocketnova:{' not in app,'Pokemon Minima is absent from Arena UI')
    for rel in ['online-pokemon-minima.html','pokemon-minima.html','solo-pokemon-minima.html','online-pocketnova.html','solo-pocketnova.html']:
        need(not (ROOT/rel).exists(),f'legacy Pokemon Minima runtime absent: {rel}')
    need('id="cancelGameBtn"' in cal and 'openCancelVotePanel' in cal,'Calico has a visible game-cancel entry point')
    need("multi-common.js?v=11.4.48" in cal,'Calico common module is cache-busted for v48')
    need('function rescanEarnedTokensNow' in cal and 'awardRescanBtn' in cal,'Calico has current-board award rescan recovery')
    need('export function openCancelVotePanel' in common,'common cancel panel exposes an opener')
    need('app.js?v=48' in idx and 'styles.css?v=28' in idx,'hub asset cache versions are bumped')

    async with async_playwright() as p:
        browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu'])
        await calico_flow(browser,{'width':1400,'height':1100})
        await calico_flow(browser,{'width':390,'height':844})
        await etch_flow(browser)
        await cancel_flow(browser)
        await browser.close()
    print('ALL V11.4.48 E2E TESTS PASSED')

if __name__=='__main__':
    asyncio.run(main())
