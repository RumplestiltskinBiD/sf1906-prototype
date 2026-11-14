import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const ports=['broadway','pacificmail','pacificmail','chinabasin','chinabasin','unioniron'];
const priority=['pacificmail','chinabasin','broadway','unioniron'];
const sampleSupply=()=>({
 broadway:['Lumber','Masonry','Steel'],
 pacificmail:['Steel','Lumber','Masonry','Steel'],
 southernpacific:['Masonry','Steel','Lumber','Masonry'],
 chinabasin:['Masonry','Lumber','Steel','Masonry'],
 unioniron:['Steel','Lumber']
});
const inventory=s=>Object.values(s.logisticsSupply).flat();
const counts=a=>Object.fromEntries(['Lumber','Masonry','Steel'].map(r=>[r,a.filter(x=>x===r).length]));
const snap=s=>JSON.stringify(s);
function setup({roll=1,players=3,apply=true}={}){
 const s=G.createInitialState({rng:()=>0.39});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.newsCurrentIds=['F03'];s.newsDeck=s.newsDeck.filter(id=>id!=='F03');
 s.newsF03Incident=null;s.newsEmergency={};s.constructions=[];
 s.logisticsSupply=sampleSupply();
 while(s.players.length<players){
  const id=s.players.length;
  s.players.push({...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
   workers:G.createWorkers(id),portfolio:[],goals:[]});
 }
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.developmentSlotsUsed=Array(players).fill(0);
 s.players.forEach((p,i)=>{p.capital=20;p.influence=25-i*4;p.prestige=0;});
 if(apply)assert.equal(G.applyF03PortFire(s,{rng:()=> (roll-0.5)/6}).ok,true);
 return s;
}
function rngSeed(a){return ()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

test('F03 active newspaper has no legacy industrial fine, emergency option, or extra action',()=>{
 const s=setup();const card=newsCard('F03');
 assert.equal(card.title,'ПОЖАР ПАРАЛИЗОВАЛ ОДИН ИЗ ПОРТОВ ГОРОДА!');
 assert.equal(card.designV2.status,'implemented-for-playtest');
 assert.equal(card.delta,0);assert.equal(card.target,'none');assert.equal(card.defense,null);
 assert.equal(card.frequency,'oncePerYear');
 assert.equal(G.takeNewspaperEmergency(s,0,'northbeach').reason,'not-negative-event');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).protected,[]);
 assert.equal(s.constructions.length,0);
});
for(let roll=1;roll<=6;roll++){
 test('F03 D6='+roll+' closes '+ports[roll-1]+' preserving precise total/type inventory',()=>{
  const base=sampleSupply(),s=setup({roll}),id=ports[roll-1];
  const issue=G.f03CurrentPortIncident(s);
  assert.equal(issue.roll,roll);assert.equal(issue.portId,id);
  assert.deepEqual(issue.originStock,base[id]);
  assert.deepEqual(s.logisticsSupply[id],[]);
  assert.deepEqual(s.logisticsSupply.southernpacific,base.southernpacific);
  assert.equal(issue.redistributed,base[id].length);
  assert.deepEqual(counts(inventory(s)),counts(Object.values(base).flat()));
  assert.equal(inventory(s).length,17);
  const recipients=priority.filter(p=>p!==id);
  assert.deepEqual(issue.allocations.map(a=>a.toPortId),
   Array.from({length:base[id].length},(_,i)=>recipients[i%recipients.length]));
  for(const recipient of recipients){
   const added=issue.allocations.filter(a=>a.toPortId===recipient);
   assert.equal(s.logisticsSupply[recipient].length,base[recipient].length+added.length);
   assert.deepEqual(counts(s.logisticsSupply[recipient]),
    counts([...base[recipient],...added.map(a=>a.resource)]));
  }
  const incidentSnapshot=snap(s);
  for(let i=0;i<3;i++){
   G.newsPreview(s);
   G.ensureNewspaper(s,{rng:()=>{throw Error('reroll after preview/load')}});
   assert.equal(snap(s),incidentSnapshot);
  }
 });
}
test('F03 transfers every source cube in a randomized order, not generated replacement materials',()=>{
 const s=setup({roll:1});
 const source=sampleSupply().broadway;
 // D6=1 uses rng=1/12 also for Fisher-Yates of L/M/S:
 // first i=2 swaps with 0, then i=1 swaps with 0 => M,S,L.
 const shifted=s.newsF03Incident.allocations.map(a=>a.resource);
 assert.deepEqual(shifted,['Masonry','Steel','Lumber']);
 assert.deepEqual(counts(shifted),counts(source));
 assert.deepEqual(s.newsF03Incident.allocations.map(a=>a.toPortId),
  ['pacificmail','chinabasin','unioniron']);
});
test('large ports can hold > normal annual throughput; no hard cap on redirected stock',()=>{
 for(const roll of [4,5]){
  const s=setup({roll});
  assert.equal(s.newsF03Incident.portId,'chinabasin');
  assert.equal(s.logisticsSupply.pacificmail.length,6);
  assert.equal(s.logisticsSupply.chinabasin.length,0);
  assert.equal(s.logisticsSupply.southernpacific.length,4);
  assert.equal(inventory(s).length,17);
 }
});
test('port closure changes only cargo stock, not district access, roads, buildings, owners or transport rules',()=>{
 const s=setup({roll:1});
 const district=G.districtById('northbeach');
 assert.equal(district.buildable,true);
 assert.ok(G.deliveryNeighbors('northbeach').includes('financial'));
 assert.equal(s.players[0].capital,20);
 assert.equal(s.players[0].prestige,0);
 assert.equal(s.players[0].workersLeft,3);
 assert.equal(s.activationMainActionUsed,false);
 assert.equal(G.deliverySourceInfo(s,0,{kind:'node',id:'broadway'}).inventory.length,0);
 assert.equal(G.deliverySourceInfo(s,0,{kind:'node',id:'southernpacific'}).inventory.length,4);
});
test('a real delivery from closed port fails atomically with source-stock, recipient supply remains purchasable',()=>{
 const s=setup({roll:1});
 s.players[0].capital=70;
 s.constructions.push({id:'W',playerId:0,projectId:'warehouse',
   districtId:'northbeach',status:'complete',materialsDelivered:[],
   warehouseInventory:[],startedRound:1,completedRound:1});
 const blank={playerId:0,source:{kind:'node',id:'broadway'},cargo:['Lumber'],
   haulerId:'standard',route:['northbeach'],
   drops:[{kind:'warehouse',id:'W',materials:['Lumber'],routeIndex:0}]};
 const before=snap(s);
 assert.equal(G.executeDelivery(s,blank).reason,'source-stock');
 assert.equal(snap(s),before,'failed delivery may not modify stock, coins or warehouse');
 const material=s.logisticsSupply.pacificmail[0];
 s.constructions[0].districtId='soma';s.constructions[0].warehouseInventory=[];
 const legal={...blank,source:{kind:'node',id:'pacificmail'},cargo:[material],
   route:['soma'],drops:[{kind:'warehouse',id:'W',materials:[material],routeIndex:0}]};
 const first=s.logisticsSupply.pacificmail.length;
 const done=G.executeDelivery(s,legal);
 assert.equal(done.ok,true,done.reason);
 assert.equal(s.logisticsSupply.pacificmail.length,first-1);
 assert.deepEqual(s.constructions[0].warehouseInventory,[material]);
 const after=snap(s);
 G.ensureNewspaper(s,{rng:()=>{throw Error('must not redraw after delivery')}});
 assert.equal(snap(s),after);
});
test('F03 no second draw, no re-routing after a delivery or explicit same-year refresh',()=>{
 const s=setup({roll:6});
 s.logisticsSupply.pacificmail.shift();
 const prior=snap(s),drawBefore=s.newsF03Incident;
 assert.equal(G.applyF03PortFire(s,{rng:()=>{throw Error('bad repeat draw')}}).reason,'already-applied');
 const inventoryBefore=JSON.stringify(s.logisticsSupply);
 G.refreshLogisticsSupply(s,{rng:()=>{throw Error('bad repeat refill')}});
 assert.equal(JSON.stringify(s.logisticsSupply),inventoryBefore);
 assert.equal(s.newsF03Incident,drawBefore);
 assert.equal(snap(s),prior);
});
test('invalid or non-F03 calls never consume random rolls or damage the state',()=>{
 const s=setup({apply:false});
 const copy=structuredClone(s);copy.newsCurrentIds=['E02'];
 let calls=0;const rng=()=>{calls++;return .6;};
 const beforeOther=snap(copy);
 assert.equal(G.applyF03PortFire(copy,{rng}).reason,'not-f03');
 assert.equal(snap(copy),beforeOther);
 for(const corrupt of [null,{...sampleSupply(),pacificmail:null},{...sampleSupply(),chinabasin:['Beer']}]){
  const bad=structuredClone(s);bad.logisticsSupply=corrupt;
  const before=snap(bad);
  assert.equal(G.applyF03PortFire(bad,{rng}).reason,'invalid-supply');
  assert.equal(snap(bad),before);
 }
 assert.equal(calls,0);
 s.newsLastResolvedRound=s.round;
 const beforeDone=snap(s);
 assert.equal(G.applyF03PortFire(s,{rng}).reason,'already-resolved');
 assert.equal(snap(s),beforeDone);
 assert.equal(calls,0);
});
test('legacy active F03 save applies only remaining stock once, never confiscates delivered goods',()=>{
 const s=setup({apply:false});
 delete s.newsF03Incident;
 s.logisticsSupply.broadway=['Steel','Lumber']; // one cube already collected by a player
 s.constructions.push({id:'W',playerId:0,projectId:'warehouse',districtId:'financial',
   status:'complete',materialsDelivered:[],warehouseInventory:['Masonry']});
 s.players[0].capital=57;
 const beforeOther=JSON.stringify(s.logisticsSupply.southernpacific);
 const oldWarehouse=JSON.stringify(s.constructions[0]);
 const beforeArchive=JSON.stringify(s.newsArchive);
 let calls=0;const rng=()=>{calls++;return 0;};
 G.ensureNewspaper(s,{rng});
 assert.equal(s.newsF03Incident.portId,'broadway');
 assert.equal(s.newsF03Incident.redistributed,2);
 assert.deepEqual(s.logisticsSupply.broadway,[]);
 assert.equal(JSON.stringify(s.logisticsSupply.southernpacific),beforeOther);
 assert.equal(JSON.stringify(s.constructions[0]),oldWarehouse);
 assert.equal(JSON.stringify(s.newsArchive),beforeArchive);
 assert.equal(s.players[0].capital,57);
 const count=calls;
 G.ensureNewspaper(s,{rng:()=>{throw Error('reroll of migrated F03')}});
 assert.equal(calls,count);
 const restored=JSON.parse(JSON.stringify(s)),before=snap(restored);
 G.ensureNewspaper(restored,{rng:()=>{throw Error('reload reroll')}});
 assert.equal(snap(restored),before);
});
for(const players of [3,4,5]){
 test('F03 year-end affects no coins, influence, prestige or workers ('+players+' players)',()=>{
  const s=setup({roll:3,players});
  const before=s.players.map(p=>({
   capital:p.capital,influence:p.influence,prestige:p.prestige,
   workersLeft:p.workersLeft,workers:p.workers
  }));
  const remain=snap(s.logisticsSupply);
  const result=G.resolveNewspaper(s);
  assert.equal(result.ok,true);
  assert.deepEqual(result.report.entries,[]);
  assert.deepEqual(result.report.changes,{});
  assert.deepEqual(result.report.serviceRecognition,[]);
  assert.deepEqual(s.players.map(p=>({
   capital:p.capital,influence:p.influence,prestige:p.prestige,
   workersLeft:p.workersLeft,workers:p.workers
  })),before);
  assert.equal(snap(s.logisticsSupply),remain);
  assert.equal(s.newsF03Incident,null);
  assert.equal(result.report.f03.portId,'pacificmail');
  assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
  assert.equal(s.newsArchive.length,1);
 });
}
test('after year ends and next issue is non-F03, standard replenishment restores every port to baseline',()=>{
 const s=setup({roll:2});
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.developmentComplete=true;s.developmentPlayer=null;
 const result=G.cleanupMarket(s,{rng:()=>.43});
 assert.equal(result.ok,true,result.reason);
 assert.equal(s.round,2);assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].f03.portId,'pacificmail');
 assert.equal(s.newsF03Incident,null);
 assert.equal(s.newsCurrentIds[0],'E02');
 assert.equal(G.LOGISTICS_NODES.reduce((sum,n)=>sum+s.logisticsSupply[n.id].length,0),17);
 for(const node of G.LOGISTICS_NODES)assert.equal(s.logisticsSupply[node.id].length,node.throughput);
});
test('future F03 is drawn when new newspaper replaces previous one, after ordinary supply refresh',()=>{
 const s=G.createInitialState({rng:()=>.4});
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 s.newsCurrentIds=['E02'];s.newsF03Incident=null;
 s.newsDeck=['F03',...s.newsDeck.filter(x=>x!=='F03')];
 const result=G.cleanupMarket(s,{rng:()=>.8});
 assert.equal(result.ok,true,result.reason);
 assert.equal(s.round,2);
 assert.equal(s.newsCurrentIds[0],'F03');
 assert.equal(s.newsF03Incident.roll,5);
 assert.equal(s.newsF03Incident.portId,'chinabasin');
 assert.ok(s.log.some(entry=>entry.msg.includes('Портовые поставки меняются сразу при выходе газеты.')));
 assert.equal(s.log.some(entry=>entry.msg.includes('ПОЖАР ПАРАЛИЗОВАЛ ОДИН ИЗ ПОРТОВ')&&
   entry.msg.includes('Событие произойдёт в конце года.')),false);
 assert.equal(s.logisticsSupply.chinabasin.length,0);
 assert.equal(inventory(s).length,17);
 assert.deepEqual(s.newsArchive[0].entries.length,0);
});
test('initial year can reveal F03 before player setup actions, without rerolling later',()=>{
 let found=null;
 for(let seed=1;seed<=150;seed++){
  const s=G.createInitialState({rng:rngSeed(seed)});
  if(s.newsCurrentIds[0]==='F03'){found=s;break;}
 }
 assert.ok(found,'F03 must be possible as the first year newspaper');
 assert.equal(found.round,1);
 assert.equal(found.phase,'draft');
 const f03=G.f03CurrentPortIncident(found);
 assert.ok(f03);
 assert.deepEqual(found.logisticsSupply[f03.portId],[]);
 assert.equal(inventory(found).length,17);
 const snapshot=snap(found);
 G.ensureNewspaper(found,{rng:()=>{throw Error('new startup rerolled')}});
 assert.equal(snap(found),snapshot);
});
test('F03 on last year 1905 resolves and closes, without future edition or penalties',()=>{
 const s=setup({roll:4});s.round=6;s.newsF03Incident.round=6;
 s.developmentComplete=true;s.developmentPlayer=null;s.players.forEach(p=>p.suspicion=0);
 const old=s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}));
 const r=G.cleanupMarket(s,{rng:()=>.3});
 assert.equal(r.ok,true);assert.equal(r.finished,true);
 assert.equal(s.finished,true);assert.equal(s.round,6);
 assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].f03.roll,4);
 assert.equal(s.newsF03Incident,null);
 assert.deepEqual(s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige})),old);
 assert.equal(G.cleanupMarket(s).reason,'wrong-phase');
});
