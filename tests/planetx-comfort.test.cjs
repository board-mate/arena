const {test}=require('node:test');
const assert=require('node:assert/strict');
const {game}=require('./multiplayer-fixture.cjs');
function fixture(){const g=game('planetx');g.context.esc=x=>String(x??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');g.run("me={user_id:'u0'};state=makeInitial('standard','TEST');state.phase='turn';researchTopics={A:'Asteroids & Comets',B:'Gas Clouds',C:'Dwarf Planets'};priv={hints:[],marks:{1:{x:'yes'}},observations:[],research:{A:{topic:'Asteroids & Comets',rule:'No asteroid is adjacent to a comet.'}}}");return g;}
test('private research joins its title and result without revealing unresearched clues',()=>{const g=fixture();const html=g.run('researchTopicRows()');assert.match(html,/소행성 · 혜성/);assert.match(html,/어떤 소행성도 혜성과 인접하지 않습니다/);assert.match(html,/조사 완료/);assert.equal((html.match(/아직 조사하지 않음/g)||[]).length,5);g.run("priv.research.A.rule='<img src=x onerror=alert(1)>'");assert.doesNotMatch(g.run('researchTopicRows()'),/<img/);});
test('topic results stay local and switching record layouts retains all saved marks',()=>{const g=fixture();const before=g.run('JSON.stringify(state)');g.run("uiRecordLayout='square'");assert.match(g.run('privatePanel()'),/class="mark yes"/);g.run("uiRecordLayout='circle'");assert.match(g.run('privatePanel()'),/class="record-mark yes"/);assert.equal(g.run('JSON.stringify(state)'),before);assert.doesNotMatch(before,/No asteroid/);});
test('observation filters select results and preserve newest-first saved order',()=>{const g=fixture();g.run("priv.observations=[{at:'12:02',type:'주제 조사 A',text:'연구결과'},{at:'12:01',type:'섹터 지정',text:'섹터결과'}];uiObservationFilter='research'");const html=g.run('privateObservationPanel()');assert.match(html,/연구결과/);assert.doesNotMatch(html,/섹터결과/);assert.match(html,/1 \/ 2건/);g.run("uiObservationFilter='all'");assert.ok(g.run('privateObservationPanel()').indexOf('연구결과')<g.run('privateObservationPanel()').indexOf('섹터결과'));});
test('record sheet starts above the public board and private logs occupy the sidebar',()=>{const g=fixture();let app={};const old=g.context.document.querySelector;g.context.document.querySelector=s=>s==='#app'?app:old(s);g.run('renderGame()');assert.ok(app.innerHTML.indexOf('record-main')<app.innerHTML.indexOf('board-overview'));assert.ok(app.innerHTML.indexOf('record-main')<app.innerHTML.indexOf('<aside'));assert.ok(app.innerHTML.indexOf('내 비공개 조사 기록')>app.innerHTML.indexOf('<aside'));assert.ok(app.innerHTML.indexOf('내 비공개 조사 기록')<app.innerHTML.indexOf('공개 회의 정보'));assert.match(app.innerHTML,/record-main" open/);g.run("uiRecordFocus=true;state.mode='expert';renderGame()");assert.match(app.innerHTML,/record-focused/);assert.match(app.innerHTML,/18섹터/);});
test('research dialog selects an unread topic and never spends a turn on a completed topic',async()=>{const g=fixture();const elements={};for(const k of ['#rsTopic','#doResearch','#rsKnownResult','[data-close]'])elements[k]={value:'A',addEventListener(type,handler){this[type]=handler;}};g.context.modal=(_,bind)=>bind({querySelector:k=>elements[k]});g.run("researchTopicsCode='TEST';researchTopics={A:'Asteroids',B:'Comets',C:'Gas Clouds',D:'Asteroids',E:'Comets',F:'Dwarf Planets',X1:'Planet X'};var calls=0;sb={rpc:async()=>{calls++;return {data:null}}}");await g.run('openResearch()');assert.equal(elements['#rsTopic'].value,'B');assert.equal(elements['#doResearch'].disabled,false);elements['#rsTopic'].value='A';elements['#rsTopic'].change();assert.equal(elements['#doResearch'].disabled,true);assert.match(elements['#rsKnownResult'].textContent,/이미 조사한 A/);await elements['#doResearch'].onclick();assert.equal(g.run('calls'),0);});

test('undo restores only the most recent private mark across layout changes',async()=>{
 const g=fixture(),before=g.run('JSON.stringify(state)'),saves=[];
 g.context.sb={rpc:async(name,args)=>{saves.push(args.p_data);return {data:true}}};
 assert.equal(g.run("cycleRecordMark('1','x')"),'');
 assert.equal(g.run("cycleRecordMark('2','gas')"),'no');
 g.run("uiRecordLayout='square'");assert.equal(g.run('undoRecordMark()'),true);
 assert.equal(g.run("priv.marks[1].x"),'');assert.equal(g.run("priv.marks[2].gas"),'');
 g.run("uiRecordLayout='circle'");assert.equal(g.run('undoRecordMark()'),true);
 assert.equal(g.run("priv.marks[1].x"),'yes');assert.equal(g.run('undoRecordMark()'),false);
 await g.run('privateSaveChain');assert.equal(saves.at(-1).marks[1].x,'yes');
 assert.equal(g.run('JSON.stringify(state)'),before);
});

test('rerenders keep open disclosures and pane scroll while explicit record navigation wins',()=>{
 const g=fixture();let details=[{dataset:{detailsKey:'board-overview'},open:true}],panes=[{dataset:{scrollKey:'private-observations'},scrollTop:80,scrollLeft:3}];
 g.context.window.scrollX=0;g.context.window.scrollY=240;const calls=[];
 g.context.window.scrollTo=(...args)=>calls.push(['scroll',...args]);
 g.context.requestAnimationFrame=fn=>fn();
 g.context.document.querySelectorAll=s=>s==='[data-details-key]'?details:s==='[data-scroll-key]'?panes:[];
 g.context.document.querySelector=()=>({scrollIntoView:()=>calls.push(['record'])});
 g.run('var snapshot=captureScroll()');details=[{dataset:{detailsKey:'board-overview'},open:false}];panes[0].scrollTop=0;
 g.run('restoreScroll(snapshot)');assert.equal(details[0].open,true);assert.equal(panes[0].scrollTop,80);assert.deepEqual(calls,[['scroll',0,240]]);
 calls.length=0;g.run("restoreScroll(snapshot,'.record-main')");assert.deepEqual(calls,[['record']]);
});

test('rapid research clicks submit once and leave the result beside its topic',async()=>{
 const g=fixture(),elements={};for(const k of ['#rsTopic','#doResearch','#rsKnownResult','[data-close]'])elements[k]={value:'A',addEventListener(type,handler){this[type]=handler;}};
 g.context.modal=(_,bind)=>bind({querySelector:k=>elements[k]});
 g.run("researchTopicsCode='TEST';researchTopics={A:'Asteroids',B:'Comets',C:'Gas Clouds',D:'Asteroids',E:'Comets',F:'Dwarf Planets',X1:'Planet X'};var calls=0,release;sb={rpc:async()=>{calls++;return await new Promise(resolve=>{release=resolve})}};savePrivate=()=>Promise.resolve();finishAction=async()=>{};closeModal=()=>{};toast=()=>{}");
 await g.run('openResearch()');const pending=elements['#doResearch'].onclick();await elements['#doResearch'].onclick();
 assert.equal(g.run('calls'),1);assert.equal(elements['#doResearch'].disabled,true);assert.equal(elements['#rsTopic'].disabled,true);
 g.run("release({data:{topic:'Comets',rule:'No asteroid is adjacent to a comet.'}})");await pending;
 assert.match(g.run('researchTopicRows()'),/어떤 소행성도 혜성과 인접하지 않습니다/);assert.equal(g.run('Boolean(priv.research.B)'),true);
});
