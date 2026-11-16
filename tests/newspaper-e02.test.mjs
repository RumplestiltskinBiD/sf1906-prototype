import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=s=>JSON.stringify(s);
function game({round=1,phase='development'}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase=phase;s.view='city';
 s.newsCurrentIds=['E02'];s.newsDeck=s.newsDeck.filter(x=>x!=='E02');
 s.newsLastResolvedRound=round-1;s.newsE02TradeWeek={round,events:[]};
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];
 s.players.forEach((p,i)=>{p.capital=20;p.influence=10+i*10;p.prestige=0;p.workersLeft=3;});
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';}));
 return s;
}
function site(s,id,projectId,ownerId=0,districtId='civic',status='complete'){
 const c={id,projectId,playerId:ownerId,districtId,status,startedRound:1,
   completedRound:status==='complete'?1:null,materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function activate(s,playerId,{districtId='civic'}={}){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=playerId;
 s.activationMainActionUsed=false;
 s.players[playerId].workers[0].districtId=districtId;
 s.players[playerId].workers[0].used=false;
 s.players[playerId].workersLeft=G.playerWorkers(s,playerId).filter(w=>!w.used&&!w.jailed).length;
 s.activeWorkerId=s.players[playerId].workers[0].id;
}
function perform(s,pid,id){return G.organizeE02TradeEvent(s,pid,id);}

test('E02 switches approved design to single main-worker fair; legacy +$2 district effect removed',()=>{
 const s=game(),c=newsCard('E02');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ГОРОДСКАЯ ТОРГОВАЯ НЕДЕЛЯ!');
 assert.equal(c.target,'none');assert.equal(c.delta,0);
 assert.equal(c.frequency,'oncePerYear');
 assert.equal(G.E02_MAX_EVENTS_PER_PLAYER,1);assert.equal(G.E02_ORGANIZER_VP,1);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).e02.events,[]);
 assert.deepEqual(G.newsPreview(s).e02.remainingPlayers,[0,1,2]);
 assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
});

test('E02 cannot be used without a completed trading venue, and becomes available on completion',()=>{
 const s=game();
 site(s,'NOT_READY','shops',1,'civic','under-construction');
 site(s,'WRONG_TYPE','tenement',1,'civic');
 site(s,'ABANDONED','brewery',1,'civic','abandoned');
 assert.deepEqual(G.e02TradeOptions(s,0).venues,[]);
 const before=snap(s);
 assert.equal(perform(s,0,'NOT_READY').reason,'invalid-venue');
 assert.equal(snap(s),before);
 s.constructions[0].status='complete';
 const opt=G.e02TradeOptions(s,0);
 assert.equal(opt.venues.length,1);
 assert.equal(opt.venues[0].cash,4);
 assert.equal(opt.venues[0].available,true);
});

for(const [quantity,cash] of [[1,4],[2,5],[3,6],[4,6]]){
 test('E02 counts exactly '+quantity+' completed trade buildings in ONE district, rewards $'+cash+' and VP',()=>{
  const s=game();
  const types=['shops','brewery','customs_warehouse','pub'];
  for(let i=0;i<quantity;i++)site(s,'T'+i,types[i],1,'civic');
  site(s,'NEIGHBOR','wholesale_market',1,'financial');
  site(s,'INCOMPLETE','club',2,'civic','under-construction');
  const own=s.players[0],host=s.players[1];
  const start={capital:own.capital,vp:own.prestige,influence:own.influence,
    hostInfluence:host.influence,workerLoc:own.workers[0].districtId,
    hostCapital:host.capital,hostVP:host.prestige};
  const options=G.e02TradeOptions(s,0);
  assert.equal(options.venues.filter(v=>v.districtId==='civic').length,quantity);
  assert.ok(options.venues.filter(v=>v.districtId==='civic').every(v=>v.tradeCount===quantity&&v.cash===cash));
  const r=perform(s,0,'T0');
  assert.equal(r.ok,true);
  assert.deepEqual(r.event,{round:1,playerId:0,venueConstructionId:'T0',venueOwnerId:1,
    districtId:'civic',tradeCount:quantity,cash,vp:1,
    influenceSteps:1,influenceFrom:start.hostInfluence,influenceTo:start.hostInfluence+1});
  assert.equal(own.capital,start.capital+cash);assert.equal(own.prestige,start.vp+1);
  assert.equal(own.influence,start.influence);
  assert.equal(host.capital,start.hostCapital);assert.equal(host.prestige,start.hostVP);
  assert.equal(host.influence,start.hostInfluence+1);
  assert.equal(own.workers[0].used,true);assert.equal(own.workersLeft,2);
  assert.equal(s.activationMainActionUsed,true);
  assert.equal(s.actionSpaceOccupancy?.T0,undefined,'trade event does not occupy building action space');
  assert.equal(s.newsE02TradeWeek.events.length,1);
  const done=snap(s);
  assert.equal(perform(s,0,'T0').reason,'already-organized');
  assert.equal(perform(s,0,'NEIGHBOR').reason,'already-organized');
  assert.equal(snap(s),done);
 });
}

test('mixed Trade + Industrial, Civic, Residential and Business projects are each counted exactly once',()=>{
 const s=game(),types=['brewery','customs_warehouse','bakery','club'];
 types.forEach((id,i)=>site(s,'MX'+i,id,1));
 const r=perform(s,0,'MX0');
 assert.equal(r.ok,true);assert.equal(r.event.tradeCount,4);
 assert.equal(r.event.cash,6);
 assert.equal(s.newsE02TradeWeek.events.length,1);
});

test('selected VENUE decides recipient of +1 Influence, not owners of nearby trade buildings',()=>{
 const s=game();
 site(s,'H0','shops',0);site(s,'H1','pub',1);site(s,'H2','brewery',2);
 const before=s.players.map(p=>p.influence);
 assert.equal(perform(s,0,'H2').ok,true);
 assert.equal(s.players[0].capital,26);
 assert.equal(s.players[0].prestige,1);
 assert.equal(s.players[0].influence,before[0]);
 assert.equal(s.players[1].influence,before[1]);
 assert.equal(s.players[2].influence,before[2]+1);
});

test('organizer who owns selected building receives both cash+VP and the owner Influence step',()=>{
 const s=game();
 site(s,'OWN','shops',0);
 const before={cash:s.players[0].capital,vp:s.players[0].prestige,influence:s.players[0].influence};
 const r=perform(s,0,'OWN');
 assert.equal(r.ok,true);
 assert.equal(s.players[0].capital,before.cash+4);
 assert.equal(s.players[0].prestige,before.vp+1);
 assert.equal(s.players[0].influence,before.influence+1);
 assert.equal(r.event.venueOwnerId,0);
});

test('three players may reuse SAME host and SAME district; host is paid Influence 3 times, never cash',()=>{
 const s=game();
 site(s,'SHARED','shops',2);
 const cap=s.players.map(p=>p.capital),vp=s.players.map(p=>p.prestige);
 const inf=s.players[2].influence;
 for(const pid of [0,1,2]){
   activate(s,pid);
   const r=perform(s,pid,'SHARED');
   assert.equal(r.ok,true);
   assert.equal(r.event.venueOwnerId,2);
   assert.equal(r.event.influenceSteps,1);
 }
 assert.equal(s.newsE02TradeWeek.events.length,3);
 assert.deepEqual(s.newsE02TradeWeek.events.map(e=>e.playerId),[0,1,2]);
 assert.equal(s.players[0].capital,cap[0]+4);
 assert.equal(s.players[1].capital,cap[1]+4);
 assert.equal(s.players[2].capital,cap[2]+4);
 assert.deepEqual(s.players.map(p=>p.prestige),vp.map(x=>x+1));
 assert.equal(s.players[2].influence,inf+3);
 assert.equal(s.players[0].influence,10);
 assert.equal(s.players[1].influence,20);
});

test('one-player-per-year cap applies after later activations and even when choosing another venue',()=>{
 const s=game();site(s,'A','shops',1);site(s,'B','pub',1);
 assert.equal(perform(s,0,'A').ok,true);
 activate(s,0);
 const before=snap(s);
 assert.equal(perform(s,0,'B').reason,'already-organized');
 assert.equal(snap(s),before);
});

test('normal worker movement from adjacent district consumes one action and moves worker to venue',()=>{
 const s=game();
 site(s,'TRADE','shops',1,'financial');
 activate(s,0,{districtId:'civic'});
 assert.equal(G.workerCanReachDistrict(s,0,'financial'),true);
 const from=s.players[0].workers[0].districtId;
 const r=perform(s,0,'TRADE');
 assert.equal(r.ok,true);
 assert.equal(r.action.from,from);
 assert.equal(r.action.to,'financial');
 assert.equal(s.players[0].workers[0].districtId,'financial');
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.developmentSlotsUsed[0],0,'consuming action does not bypass normal activation/endActivation accounting');
});

test('nonadjacent worker cannot teleport to distant fair; failed action does not mutate any state',()=>{
 const s=game();
 site(s,'DISTANT','shops',1,'sunset');
 const options=G.e02TradeOptions(s,0);
 assert.equal(options.venues.length,1);
 assert.equal(options.venues[0].reachable,false);
 const before=snap(s);
 assert.equal(perform(s,0,'DISTANT').reason,'worker-range');
 assert.equal(snap(s),before);
});

test('wrong turn, no selected worker, used worker, arrested worker, or already used main action cannot organize',()=>{
 const scenarios=[
  s=>{s.developmentPlayer=1;},
  s=>{s.activeWorkerId=null;},
  s=>{s.players[0].workers[0].used=true;},
  s=>{s.players[0].workers[0].jailed=true;},
  s=>{s.activationMainActionUsed=true;},
  s=>{s.developmentComplete=true;},
  s=>{s.phase='declare';}
 ];
 scenarios.forEach((edit,i)=>{
  const s=game();site(s,'SHOP','shops',1);
  edit(s);
  const before=snap(s);
  assert.equal(perform(s,0,'SHOP').reason,'main-action-unavailable','case '+i);
  assert.equal(snap(s),before,'case '+i);
 });
});

test('wrong player, invalid nontrade venue, unresolved and resolved year give precise atomic refusal',()=>{
 const s=game();site(s,'SHOP','shops',1);site(s,'HOUSE','tenement',1);
 const base=snap(s);
 assert.equal(perform(s,3,'SHOP').reason,'player');
 assert.equal(perform(s,0,'HOUSE').reason,'invalid-venue');
 assert.equal(perform(s,0,'ABSENT').reason,'invalid-venue');
 assert.equal(snap(s),base);
 s.newsLastResolvedRound=1;
 const before=snap(s);
 assert.equal(perform(s,0,'SHOP').reason,'not-active');
 assert.equal(snap(s),before);
});

test('an archived, abandoned or redeveloped trade building cannot host a new event',()=>{
 const s=game();
 for(const status of ['under-construction','abandoned','redeveloped']){
   site(s,status,'shops',1,'civic',status);
 }
 assert.equal(G.e02TradeOptions(s,0).venues.length,0);
 assert.equal(perform(s,0,'abandoned').reason,'invalid-venue');
});

test('owner Influence uses live track rules and skips occupied positions',()=>{
 const s=game();
 site(s,'H','pub',1);
 s.players[1].influence=12;
 s.players[2].influence=13;
 const beforeCash=s.players[0].capital;
 const r=perform(s,0,'H');
 assert.equal(r.ok,true);
 assert.equal(r.event.influenceSteps,1);
 assert.equal(s.players[1].influence,14);
 assert.equal(s.players[0].capital,beforeCash+4);
});

test('save + repeated ensureNewspaper do not reset claims or repeat cash/VP/Influence',()=>{
 const s=game();site(s,'A','shops',1);
 assert.equal(perform(s,0,'A').ok,true);
 const loaded=JSON.parse(snap(s));
 const before=snap(loaded);
 G.ensureNewspaper(loaded);G.ensureNewspaper(loaded);
 assert.equal(snap(loaded),before);
 activate(loaded,0);
 const beforeRepeat=snap(loaded);
 assert.equal(perform(loaded,0,'A').reason,'already-organized');
 assert.equal(snap(loaded),beforeRepeat);
});

test('legacy active E02 save gets empty current ledger without payout for existing trading sites',()=>{
 const s=game({round:3});
 site(s,'OLD','shops',0);
 delete s.newsE02TradeWeek;
 const before=s.players.map(p=>[p.capital,p.prestige,p.influence]);
 G.ensureNewspaper(s);G.ensureNewspaper(s);
 assert.equal(s.newsE02TradeWeek,null,'legacy state remains lazily inactive until a real action');
 assert.deepEqual(s.players.map(p=>[p.capital,p.prestige,p.influence]),before);
 activate(s,0);
 assert.equal(perform(s,0,'OLD').ok,true);
 assert.equal(s.newsE02TradeWeek.round,3);
 assert.equal(s.newsE02TradeWeek.events.length,1);
});

test('E02 end-year archives actual events, never creates a passive trade income',()=>{
 const s=game(),venue=site(s,'S','shops',1);
 assert.equal(perform(s,0,'S').ok,true);
 s.developmentComplete=true;s.developmentPlayer=null;s.activeWorkerId=null;
 const income=s.players.map(p=>G.roundIncome(s,p.id));
 const before=s.players.map(p=>({cash:p.capital,vp:p.prestige,inf:p.influence}));
 s.newsDeck=['E03',...s.newsDeck.filter(x=>x!=='E03')];
 const r=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(r.ok,true);
 assert.equal(s.round,2);
 assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].cardId,'E02');
 assert.equal(s.newsArchive[0].e02.events.length,1);
 assert.equal(s.newsArchive[0].e02.events[0].venueConstructionId,'S');
 assert.equal(s.newsArchive[0].e02.unused,2);
 assert.deepEqual(s.newsArchive[0].changes,{});
 assert.deepEqual(s.newsArchive[0].entries,[]);
 assert.equal(s.newsE02TradeWeek,null);
 for(let i=0;i<3;i++){
  assert.equal(s.players[i].capital,before[i].cash+income[i],'only standard annual income');
  assert.equal(s.players[i].prestige,before[i].vp);
  assert.equal(s.players[i].influence,before[i].inf);
 }
 assert.equal(s.newsCurrentIds[0],'E03');
 activate(s,1);
 assert.equal(perform(s,1,'S').reason,'not-active');
});

test('E02 begins next year with 3 available claims, and expiry does not persist',()=>{
 const s=game();
 s.newsCurrentIds=['E03'];
 s.newsDeck=['E02','E04',...s.newsDeck.filter(x=>!['E02','E04'].includes(x))];
 s.newsE02TradeWeek=null;
 s.developmentComplete=true;s.developmentPlayer=null;
 assert.equal(G.cleanupMarket(s,{rng:()=>.2}).ok,true);
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'E02');
 assert.deepEqual(s.newsE02TradeWeek,{round:2,events:[]});
 site(s,'SH','shops',2);
 activate(s,0);
 assert.equal(perform(s,0,'SH').ok,true);
 s.developmentComplete=true;s.developmentPlayer=null;
 assert.equal(G.cleanupMarket(s,{rng:()=>.2}).ok,true);
 assert.equal(s.round,3);assert.equal(s.newsE02TradeWeek,null);
 assert.equal(s.newsArchive[1].e02.events.length,1);
});

test('E02 as final 1905 newspaper archives choices without a seventh year',()=>{
 const s=game({round:6});
 site(s,'H','pub',1);
 assert.equal(perform(s,0,'H').ok,true);
 s.developmentComplete=true;s.developmentPlayer=null;
 const r=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(r.ok,true);assert.equal(r.finished,true);
 assert.equal(s.round,6);assert.equal(s.newsE02TradeWeek,null);
 assert.equal(s.newsArchive[0].e02.events.length,1);
});

test('legacy settled E02 historical report survives untouched and does not get a second award',()=>{
 const s=game({round:2});
 const legacy={year:1900,round:1,cardId:'E02',title:'Торговля на пике',
   entries:[{playerId:1,districtIds:['civic'],actual:2}],
   changes:{1:{capital:2,influence:0,prestige:0}}};
 s.newsArchive.push(structuredClone(legacy));
 s.newsCurrentIds=['E03'];s.newsE02TradeWeek=null;s.newsLastResolvedRound=1;
 G.ensureNewspaper(s);
 assert.deepEqual(s.newsArchive[0],legacy);
 assert.equal(G.e02TradeWeekPreview(s).active,false);
});
