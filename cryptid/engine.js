// Cryptid alpha: flat-top, odd-column offset hexes. No live secrets are stored here.
export const TERRAIN={desert:'사막',forest:'숲',water:'물',mountain:'산',swamp:'늪'};
export const STRUCTURE={stone:'거석',shack:'폐가'};
export const COLOUR={white:'하얀',green:'초록',blue:'파란',black:'검은'};
export function distance(a,b){const ar=a.row-(a.col-(a.col&1))/2,br=b.row-(b.col-(b.col&1))/2,dq=a.col-b.col,dr=ar-br;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;}
export const cellName=id=>String.fromCharCode(65+id%12)+(Math.floor(id/12)+1);
export function shuffle(items,random=Math.random){const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
export function buildBoard(tiles,random=Math.random,advanced=false){
 const order=shuffle(tiles,random),cells=[];
 order.forEach((tile,slot)=>{const flip=random()<.5;for(const cell of tile.cells){const col=(slot%2)*6+(flip?5-cell.col:cell.col),row=Math.floor(slot/2)*3+(flip?2-cell.row:cell.row);cells.push({id:row*12+col,col,row,terrain:cell.terrain,animal:cell.animal||null,tile:tile.id});}});
 cells.sort((a,b)=>a.id-b.id);
 const spots=shuffle(cells,random);let next=0;
 for(const colour of advanced?Object.keys(COLOUR):['white','green','blue'])for(const kind of Object.keys(STRUCTURE)){const cell=spots[next++];cell.structure={kind,colour};}
 return {width:12,height:9,cells,tiles:order.map(t=>t.id),advanced};
}
export function clueMatches(board,clue,cell){
 let yes;
 if(clue.type==='terrain-pair')yes=clue.terrains.includes(cell.terrain);
 else{const sources=board.cells.filter(c=>clue.type==='terrain-near'?c.terrain===clue.terrain:clue.type==='animal-any'?Boolean(c.animal):clue.type==='animal-near'?c.animal===clue.animal:clue.type==='structure-kind'?c.structure?.kind===clue.kind:c.structure?.colour===clue.colour);yes=sources.some(c=>distance(c,cell)<=clue.range);}
 return clue.negative?!yes:yes;
}
export function cluePool(board){
 const out=[],terrains=Object.keys(TERRAIN),base=[];
 for(let i=0;i<terrains.length;i++)for(let j=i+1;j<terrains.length;j++)base.push({type:'terrain-pair',terrains:[terrains[i],terrains[j]],text:`${TERRAIN[terrains[i]]} 또는 ${TERRAIN[terrains[j]]}에 있습니다`});
 for(const terrain of terrains)base.push({type:'terrain-near',terrain,range:1,text:`${TERRAIN[terrain]} 1칸 이내에 있습니다`});
 base.push({type:'animal-any',range:1,text:'동물 영역 1칸 이내에 있습니다'});
 for(const animal of ['bear','cougar'])base.push({type:'animal-near',animal,range:2,text:`${animal==='bear'?'곰':'쿠거'} 영역 2칸 이내에 있습니다`});
 for(const kind of Object.keys(STRUCTURE))base.push({type:'structure-kind',kind,range:2,text:`${STRUCTURE[kind]} 2칸 이내에 있습니다`});
 for(const colour of board.advanced?Object.keys(COLOUR):['white','green','blue'])base.push({type:'structure-colour',colour,range:3,text:`${COLOUR[colour]} 구조물 3칸 이내에 있습니다`});
 // Leave at least twelve false cells so all five players can always share
 // their two initial cubes without exhausting another player's legal cells.
 for(const c of base)for(const negative of board.advanced?[false,true]:[false]){const clue={...c,negative};if(negative)clue.text=clue.text.replace('에 있습니다','에 없습니다');clue.id=`clue-${out.length}`;clue.allowed=board.cells.filter(cell=>clueMatches(board,clue,cell)).map(cell=>cell.id);if(clue.allowed.length>=8&&clue.allowed.length<=96)out.push(clue);}
 return out;
}
export function chooseClues(pool,count,random=Math.random,maxAttempts=10000){
 for(let attempt=0;attempt<maxAttempts;attempt++){const selected=shuffle(pool,random).slice(0,count);let intersection=selected[0].allowed;for(const clue of selected.slice(1))intersection=intersection.filter(id=>clue.allowed.includes(id));if(intersection.length!==1)continue;
  // Each player must contribute information; no duplicate or redundant clues.
  if(selected.some((_,i)=>{let ids=Array.from({length:108},(_,x)=>x);for(let j=0;j<selected.length;j++)if(j!==i)ids=ids.filter(x=>selected[j].allowed.includes(x));return ids.length===1;}))continue;
  return {clues:structuredClone(selected),solution:intersection[0]};
 }
 throw Error('단서 조합 생성 실패. 새 지도로 다시 시도하세요.');
}
export function initializeGame(board,clues,players,solution){
 if(players.length<3||players.length>5)throw Error('3~5인 게임입니다.');
 return {state:{kind:'cryptid-alpha-v1',board:structuredClone(board),players:players.map((p,seat)=>({seat,name:p.nickname||p.name||`플레이어 ${seat+1}`})),phase:'sharing',current:0,sharingCount:0,turn:1,marks:{},pending:null,log:[],over:false,winner:null},secrets:{clues:structuredClone(clues),solution}};
}
const markAt=(s,id)=>s.marks[id]||{cube:null,discs:[]};
export function legalPlacement(game,seat,id,disc){const s=game.state,m=markAt(s,id);return Number.isInteger(id)&&id>=0&&id<108&&m.cube==null&&!m.discs.includes(seat)&&game.secrets.clues[seat].allowed.includes(id)===disc;}
function put(game,seat,id,disc){if(!legalPlacement(game,seat,id,disc))throw Error('단서에 맞고 자신의 말이나 큐브가 없는 칸을 선택하세요.');const s=game.state,m=s.marks[id]??={cube:null,discs:[]};if(disc)m.discs.push(seat);else m.cube=seat;}
function nextTurn(s){s.phase='turn';s.pending=null;s.current=(s.current+1)%s.players.length;s.turn++;}
function penalty(game,cell){const s=game.state;s.phase='penalty';s.pending={cell};if(!s.board.cells.some(c=>legalPlacement(game,s.current,c.id,false))){s.log.unshift('놓을 수 있는 추가 큐브 칸이 없어 차례를 넘깁니다.');nextTurn(s);}}
function search(game,cell){const s=game.state,origin=s.current,n=s.players.length;for(let k=1;k<n;k++){const seat=(origin+k)%n,m=markAt(s,cell);if(m.discs.includes(seat))continue;const yes=game.secrets.clues[seat].allowed.includes(cell);put(game,seat,cell,yes);if(!yes){s.log.unshift(`${s.players[seat].name} · ${cellName(cell)} 탐색 거부`);penalty(game,cell);return;}}
 s.over=true;s.phase='finished';s.winner=origin;s.pending=null;s.log.unshift(`${s.players[origin].name} · ${cellName(cell)} 서식지 발견!`);
}
export function applyAction(original,seat,action){
 const game=structuredClone(original),s=game.state,id=Number(action.cell);
 if(s.over||seat!==s.current)throw Error('현재 행동 차례가 아닙니다.');
 if(!Number.isInteger(id)||id<0||id>=108)throw Error('지도 칸을 확인하세요.');
 if(s.phase==='sharing'&&action.type==='cube'){put(game,seat,id,false);s.log.unshift(`${s.players[seat].name} · ${cellName(id)} 초기 큐브`);s.sharingCount++;s.current=(seat+1)%s.players.length;if(s.sharingCount===s.players.length*2){s.phase='turn';s.current=0;}}
 else if(s.phase==='penalty'&&action.type==='cube'){put(game,seat,id,false);s.log.unshift(`${s.players[seat].name} · ${cellName(id)} 추가 큐브`);nextTurn(s);}
 else if(s.phase==='search-offer'&&action.type==='disc'){put(game,seat,id,true);search(game,s.pending.cell);}
 else if(s.phase==='turn'&&action.type==='question'){
  const target=Number(action.target),m=markAt(s,id);if(!Number.isInteger(target)||target<0||target>=s.players.length||target===seat||m.cube!=null||m.discs.includes(target))throw Error('질문할 상대와 칸을 다시 선택하세요.');
  const yes=game.secrets.clues[target].allowed.includes(id);put(game,target,id,yes);s.log.unshift(`${s.players[seat].name} → ${s.players[target].name} · ${cellName(id)} ${yes?'디스크':'큐브'}`);if(yes)nextTurn(s);else penalty(game,id);
 }
 else if(s.phase==='turn'&&action.type==='search'){
  const m=markAt(s,id);if(m.cube!=null||!game.secrets.clues[seat].allowed.includes(id))throw Error('자신의 단서에 맞고 큐브가 없는 칸만 탐색할 수 있습니다.');
  if(m.discs.includes(seat)){s.phase='search-offer';s.pending={cell:id};if(!s.board.cells.some(c=>legalPlacement(game,seat,c.id,true)))search(game,id);}
  else{put(game,seat,id,true);search(game,id);}
 }else throw Error('지금 할 수 없는 행동입니다.');
 s.log=s.log.slice(0,80);return game;
}
export function viewGame(game,seat){const s=structuredClone(game.state);if(s.over)s.revealedClues=game.secrets.clues.map(c=>c.text);return {state:s,clue:{id:game.secrets.clues[seat].id,text:game.secrets.clues[seat].text},revision:0};}
