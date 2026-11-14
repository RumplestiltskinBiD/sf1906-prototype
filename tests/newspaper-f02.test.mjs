import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const districts=['northbeach','chinatown','financial','soma','mission','marina'];
function setup({roll=1,count=3}={}){
 const s=G.createInitialState({rng:()=>0.39});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.constructions=[];s.newsCurrentIds=['F02'];s.newsDeck=s.newsDeck.filter(x=>x!=='F02');
 s.newsF02Incident=null;s.newsEmergency={};
 while(s.players.length<count){
  const id=s.players.length;
  s.players.push({...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
   workers:G.createWorkers(id),portfolio:[],goals:[]});
 }
 s.developmentSlotsUsed=Array(count).fill(0);s.yearTurnOrder=s.players.map(p=>p.id);
 s.players.forEach((p,i)=>{p.capital=20;p.influence=25-i*4;p.prestige=0;});
 s.activeWorkerId=s.players[0].workers[0].id;
 G.ensureNewspaper(s,{rng:()=> (roll-0.5)/6});
 return s;
}
function build(s,id,projectId,districtId='northbeach',playerId=1,status='complete'){
 const c={id,projectId,districtId,playerId,status,startedRound:1,
   completedRound:status==='complete'?1:null,materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
const snap=s=>JSON.stringify(s);
const money=s=>s.players.map(p=>p.capital);
const influence=s=>s.players.map(p=>p.influence);
function turn(s,pid,workerIndex=0,districtId='civic'){
 s.developmentPlayer=pid;s.activationMainActionUsed=false;
 s.players[pid].workers[workerIndex].districtId=districtId;
 s.activeWorkerId=s.players[pid].workers[workerIndex].id;
}

test('F02 data are active v2: neither old commerce levy nor emergency protection',()=>{
 const s=setup();const card=newsCard('F02');
 assert.equal(card.title,'ОН ПРЕДУПРЕДИЛ РЕДАКЦИЮ. ГОРОД В ОГНЕ!');
 assert.equal(card.delta,0);assert.equal(card.target,'none');
 assert.equal(card.frequency,'oncePerYear');assert.equal(card.defense,null);
 assert.equal(G.takeNewspaperEmergency(s,0,'northbeach').reason,'not-negative-event');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).threatened,['northbeach']);
 assert.equal(s.constructions.length,0);
});
for(let roll=1;roll<=6;roll++){
 test('single F02 D6 roll '+roll+' places both markers in '+districts[roll-1],()=>{
  const s=setup({roll});
  assert.equal(s.newsF02Incident.roll,roll);
  assert.equal(s.newsF02Incident.districtId,districts[roll-1]);
  assert.equal(s.newsF02Incident.firePending,true);
  assert.equal(s.newsF02Incident.manhuntPending,true);
  assert.deepEqual(s.newsF02Incident.actions,[]);
  const original=snap(s);
  for(let i=0;i<3;i++){
   G.newsPreview(s);G.ensureNewspaper(s,{rng:()=>0.99});
   assert.equal(snap(s),original,'preview/load must never reroll');
  }
 });
}
test('creating a NEW game with F02 as the first issue rolls immediately and persists result',()=>{
 // Fisher-Yates with rng 0 places the second F02 card first; the original
 // createInitialState already exposes the D6 location before any player action.
 const s=G.createInitialState({rng:()=>0});
 assert.equal(s.newsCurrentIds[0],'F02');
 assert.deepEqual(s.newsF02Incident,{round:1,roll:1,districtId:'northbeach',
   firePending:true,manhuntPending:true,actions:[]});
 assert.equal(s.phase,'draft');
 assert.equal(G.newsPreview(s).f02.districtId,'northbeach');
});
test('service route is shortest legal road path, never through closed districts',()=>{
 assert.deepEqual(G.f02ServiceRoute('northbeach','northbeach'),['northbeach']);
 assert.deepEqual(G.f02ServiceRoute('financial','northbeach'),['financial','northbeach']);
 assert.equal(G.f02ServiceRoute('twinpeaks','marina'),null);
 assert.equal(G.f02ServiceRoute('presidio','northbeach'),null);
 assert.equal(G.f02ServiceRoute('INVALID','marina'),null);
 const route=G.f02ServiceRoute('sunset','northbeach');
 assert.ok(route?.length>2);
 for(let i=1;i<route.length;i++){
  assert.ok(G.deliveryNeighbors(route[i-1]).includes(route[i]));
 }
 assert.equal(route.includes('presidio'),false);
 assert.equal(route.includes('twinpeaks'),false);
});
test('no buildings, high fire P or player-owned commercial sites are required for a fire',()=>{
 const s=setup({roll:6});
 assert.deepEqual(s.constructions,[]);
 assert.equal(G.newsPreview(s).f02.districtId,'marina');
 assert.deepEqual(G.f02OperationOptions(s,0,'fire').services,[]);
 assert.equal(G.completeF02Operation(s,0,'fire','none').reason,'invalid-service');
 assert.equal(G.resolveNewspaper(s).report.f02.fireUnresolved,true);
});
for(const kind of ['fire','manhunt']){
 for(const projectId of (kind==='fire'?['std_fire','firehouse']:['std_police','police'])){
  test('operation '+kind+' accepts completed foreign or own '+projectId+'; reward ONLY organizer',()=>{
   const s=setup();build(s,'S',projectId,'financial',1);
   const before=s.players.map(p=>({money:p.capital,vp:p.prestige,influence:p.influence}));
   const option=G.f02OperationOptions(s,0,kind);
   assert.equal(option.services.length,1);
   assert.deepEqual(option.services[0].route,['financial','northbeach']);
   assert.equal(option.services[0].cost,1);
   const done=G.completeF02Operation(s,0,kind,'S');
   assert.equal(done.ok,true,done.reason);
   assert.equal(s.players[0].capital,before[0].money-1);
   assert.equal(s.players[0].prestige,before[0].vp+2);
   assert.equal(s.players[0].influence,before[0].influence+1);
   assert.equal(s.players[1].capital,before[1].money);
   assert.equal(s.players[1].prestige,before[1].vp);
   assert.equal(s.players[1].influence,before[1].influence);
   assert.equal(s.players[0].workers[0].used,true);
   assert.equal(s.players[0].workers[0].districtId,'financial');
   assert.equal(s.activationMainActionUsed,true);
   assert.equal(s.newsF02Incident[kind==='fire'?'firePending':'manhuntPending'],false);
   assert.equal(s.newsF02Incident[kind==='fire'?'manhuntPending':'firePending'],true);
   assert.equal(s.newsF02Incident.actions[0].playerId,0);
   assert.deepEqual(s.newsF02Incident.actions[0].route,['financial','northbeach']);
  });
 }
}
test('one player may resolve both operations in either order, using two DIFFERENT main actions',()=>{
 for(const order of [['fire','manhunt'],['manhunt','fire']]){
  const s=setup();
  build(s,'F','std_fire','financial',2);
  build(s,'P','police','financial',1);
  for(let i=0;i<2;i++){
   turn(s,0,i,'civic');
   const id=order[i]==='fire'?'F':'P';
   assert.equal(G.completeF02Operation(s,0,order[i],id).ok,true);
   assert.equal(s.players[0].workers[i].used,true);
  }
  assert.equal(s.players[0].prestige,4);
  assert.equal(s.players[0].influence,27);
  assert.equal(s.players[0].capital,18);
  assert.equal(s.newsF02Incident.actions.length,2);
  assert.deepEqual(s.newsF02Incident.actions.map(a=>a.operation),order);
  assert.deepEqual([s.newsF02Incident.firePending,s.newsF02Incident.manhuntPending],[false,false]);
  const report=G.resolveNewspaper(s).report;
  assert.equal(report.f02.fireUnresolved,false);
  assert.equal(report.f02.manhuntUnresolved,false);
  assert.deepEqual(Object.keys(report.changes),[]);
  assert.equal(s.players[0].prestige,4,'no year-end removal of operation rewards');
 }
});
test('different players can perform independent operations in reverse order',()=>{
 const s=setup();
 build(s,'F','firehouse','financial',2);
 build(s,'P','std_police','financial',0);
 turn(s,1,0);
 assert.equal(G.completeF02Operation(s,1,'manhunt','P').ok,true);
 turn(s,2,0);
 assert.equal(G.completeF02Operation(s,2,'fire','F').ok,true);
 assert.equal(s.players[1].prestige,2);
 assert.equal(s.players[2].prestige,2);
 assert.equal(s.players[0].prestige,0);
 assert.equal(G.resolveNewspaper(s).report.f02.actions.length,2);
});
test('service in incident district costs $0 and earns full reward',()=>{
 const s=setup();build(s,'F','std_fire','northbeach',2);
 turn(s,0,0,'northbeach');
 const a=G.completeF02Operation(s,0,'fire','F');
 assert.equal(a.ok,true);
 assert.equal(a.operationRecord.cost,0);
 assert.deepEqual(a.operationRecord.route,['northbeach']);
 assert.equal(s.players[0].capital,20);
 assert.equal(s.players[0].prestige,2);
});
test('completed source cannot be replaced with missing/unfinished/wrong-family or imaginary reserve',()=>{
 const s=setup();
 build(s,'INCOMPLETE','std_fire','financial',1,'under-construction');
 build(s,'WRONG','police','financial',1);
 for(const id of ['INCOMPLETE','WRONG','civic-reserve','UNKNOWN']){
  const before=snap(s);
  assert.equal(G.completeF02Operation(s,0,'fire',id).reason,'invalid-service');
  assert.equal(snap(s),before);
 }
 assert.equal(G.f02OperationOptions(s,0,'fire').services.length,0);
});
test('worker range to SOURCE not incident: distant team is unavailable and no teleport occurs',()=>{
 const s=setup();build(s,'F','std_fire','marina',1);
 const prev=snap(s);
 assert.equal(G.completeF02Operation(s,0,'fire','F').reason,'worker-range');
 assert.equal(snap(s),prev);
 turn(s,0,0,'northbeach'); // Adjacent marina
 assert.equal(G.completeF02Operation(s,0,'fire','F').ok,true);
 assert.equal(s.players[0].workers[0].districtId,'marina');
 assert.equal(s.newsF02Incident.districtId,'northbeach');
});
test('insufficient capital fails atomically, including at cost exactly one edge',()=>{
 const s=setup();build(s,'F','std_fire','financial');
 s.players[0].capital=0;
 const before=snap(s);
 assert.equal(G.completeF02Operation(s,0,'fire','F').reason,'capital');
 assert.equal(snap(s),before);
 s.players[0].capital=1;
 assert.equal(G.completeF02Operation(s,0,'fire','F').ok,true);
 assert.equal(s.players[0].capital,0);
});
test('H02 simultaneous road surcharge doubles each service edge without doubling reward',()=>{
 const s=setup();build(s,'F','std_fire','financial');
 s.newsCurrentIds=['F02','H02'];
 const opts=G.f02OperationOptions(s,0,'fire');
 assert.equal(opts.tariff,2);
 assert.equal(opts.services[0].cost,2);
 assert.equal(G.completeF02Operation(s,0,'fire','F').ok,true);
 assert.equal(s.players[0].capital,18);
 assert.equal(s.players[0].prestige,2);
});
test('duplicate operation and wrong turn, phase, used worker, jail or pending obligations reject atomically',()=>{
 const s=setup();build(s,'F','std_fire','financial');
 for(const modify of [
  t=>{t.phase='declare';},t=>{t.developmentComplete=true;},
  t=>{t.developmentPlayer=1;},t=>{t.activeWorkerId=null;},
  t=>{t.activationMainActionUsed=true;},
  t=>{t.players[0].workers[0].used=true;t.players[0].workersLeft=2;},
  t=>{t.players[0].workers[0].jailed=true;t.players[0].workersLeft=2;},
  t=>{t.pendingBreadProduction=['WAIT'];}
 ]){
  const copy=structuredClone(s);modify(copy);
  const before=snap(copy);
  assert.equal(G.completeF02Operation(copy,0,'fire','F').reason,'main-action-unavailable');
  assert.equal(snap(copy),before);
 }
 assert.equal(G.completeF02Operation(s,0,'INVALID','F').reason,'operation');
 assert.equal(G.completeF02Operation(s,7,'fire','F').reason,'player');
 assert.equal(G.completeF02Operation(s,0,'fire','F').ok,true);
 const before=snap(s);
 assert.equal(G.completeF02Operation(s,0,'fire','F').reason,'already-completed');
 assert.equal(snap(s),before);
});
for(const count of [3,4,5]){
 for(const resolved of ['none','fire','manhunt','both']){
  test('F02 year-end outcomes '+count+' players / '+resolved+'; no repeat',()=>{
   const s=setup({count});
   build(s,'F','std_fire','financial');
   build(s,'P','std_police','financial');
   if(['fire','both'].includes(resolved)){
    turn(s,0,0);assert.equal(G.completeF02Operation(s,0,'fire','F').ok,true);
   }
   if(['manhunt','both'].includes(resolved)){
    turn(s,0,resolved==='both'?1:0);
    assert.equal(G.completeF02Operation(s,0,'manhunt','P').ok,true);
   }
   const capitalBefore=money(s),influenceBefore=influence(s),vpBefore=s.players.map(p=>p.prestige);
   const result=G.resolveNewspaper(s);
   const fireOutstanding=!['fire','both'].includes(resolved);
   const huntOutstanding=!['manhunt','both'].includes(resolved);
   assert.equal(result.ok,true);
   assert.equal(result.report.f02.fireUnresolved,fireOutstanding);
   assert.equal(result.report.f02.manhuntUnresolved,huntOutstanding);
   for(let i=0;i<count;i++){
     assert.equal(s.players[i].capital,capitalBefore[i]-(fireOutstanding?3:0));
     assert.equal(s.players[i].influence,influenceBefore[i]-(huntOutstanding?1:0));
     assert.equal(s.players[i].prestige,vpBefore[i]);
   }
   assert.equal(s.newsF02Incident,null,'all event markers must disappear after end of year');
   assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
   assert.deepEqual(result.report.f02.actions.map(a=>a.operation),
      resolved==='none'?[]:resolved==='both'?['fire','manhunt']:[resolved]);
   assert.equal(s.newsArchive.length,1);
  });
 }
}
test('F02 short money and influence floor never create debt, negative influence or permanent fines',()=>{
 const s=setup();
 s.players[0].capital=0;s.players[1].capital=1;s.players[2].capital=2;
 s.players[0].influence=0;s.players[1].influence=1;s.players[2].influence=5;
 const report=G.resolveNewspaper(s).report;
 assert.deepEqual(money(s),[0,0,0]);
 assert.deepEqual(influence(s),[0,1,4]);
 assert.deepEqual(report.entries.map(x=>x.actual),[0,-1,-2]);
 assert.deepEqual(report.entries.map(x=>x.influenceActual),[0,0,-1]);
 assert.deepEqual(s.players.map(p=>p.fireIncomePenalty),[0,0,0]);
});
test('F02 previous save missing incident gets a single D6 roll without losing progress',()=>{
 const s=setup();build(s,'HOUSE','tenement','financial',1);
 delete s.newsF02Incident;
 s.players[0].capital=77;
 const beforeDeck=JSON.stringify(s.newsDeck),archives=JSON.stringify(s.newsArchive);
 let calls=0;
 const next=()=>{calls++;return 0.99;};
 G.ensureNewspaper(s,{rng:next});
 assert.equal(calls,1);
 assert.equal(s.newsF02Incident.roll,6);
 G.ensureNewspaper(s,{rng:next});
 assert.equal(calls,1);
 assert.equal(s.players[0].capital,77);
 assert.equal(s.constructions[0].id,'HOUSE');
 assert.equal(JSON.stringify(s.newsDeck),beforeDeck);
 assert.equal(JSON.stringify(s.newsArchive),archives);
 const restored=JSON.parse(JSON.stringify(s));
 G.ensureNewspaper(restored,{rng:()=>{throw Error('rerolled on load')}});
 assert.equal(restored.newsF02Incident.roll,6);
});
test('end of year clears F02 and advances without reapplying penalties; already-resolved save never rerolls',()=>{
 const s=setup();
 s.developmentComplete=true;s.developmentPlayer=null;
 const result=G.cleanupMarket(s,{rng:()=>0.21});
 assert.equal(result.ok,true);
 assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].cardId,'F02');
 assert.equal(s.newsF02Incident,null);
 assert.equal(s.round,2);
 assert.equal(s.newsLastResolvedRound,1);
 G.ensureNewspaper(s,{rng:()=>{throw Error('reroll old incident')}});
 assert.equal(s.newsF02Incident,null);
});
