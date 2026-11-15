import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=x=>JSON.stringify(x);
const materials=['Lumber','Masonry','Steel'];
function game({roll=1,stock=['Lumber','Masonry','Steel','Lumber'],count=3,round=1}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';s.newsCurrentIds=['C02'];
 s.newsDeck=s.newsDeck.filter(id=>id!=='C02');s.newsLastResolvedRound=round-1;
 s.newsC02Incident=null;s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.constructions=[];s.newsEmergency={};
 while(s.players.length<count){const id=s.players.length;s.players.push({
   ...structuredClone(s.players[0]),id,name:'Player '+id,key:'k'+id,
   workers:G.createWorkers(id),portfolio:[],goals:[]});}
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.developmentSlotsUsed=Array(count).fill(0);
 s.developmentComplete=false;s.developmentPlayer=0;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach((p,i)=>{p.capital=25;p.prestige=0;p.influence=30-i*5;p.suspicion=0;});
 s.logisticsSupply={...s.logisticsSupply,
  broadway:[...stock],pacificmail:[...stock],chinabasin:[...stock],unioniron:[...stock]};
 const draws=[(roll-.5)/6,0,0];
 const r=G.applyC02Theft(s,{rng:()=>draws.shift()??0});
 assert.equal(r.ok,true,JSON.stringify(r));
 return s;
}
function turn(s,pid=0,district='financial'){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activeWorkerId=s.players[pid].workers[0].id;
 s.activationMainActionUsed=false;s.players[pid].workers[0].districtId=district;
}
function build(s,id='WH',district='financial',pid=0){
 const c={id,playerId:pid,projectId:'warehouse',districtId:district,status:'complete',
  startedRound:1,completedRound:1,materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function routePlan(s,{pid=0,source='stolen',cargo=null,destination='financial',route=null,haulerId='dray2a',pickups=[]}={}){
 const lot=s.newsC02Incident,origin=G.LOGISTICS_NODES.find(n=>n.id===lot.portId).districtId;
 return {playerId:pid,source:{kind:source,id:lot.portId},
  haulerId,cargo:cargo||[...lot.materials],pickups,route:route||[origin,destination],
  drops:[{kind:'warehouse',id:'WH',routeIndex:(route||[origin,destination]).length-1,
    materials:cargo||[...lot.materials]}]};
}

test('C02 is physical stolen lot, not old $2 warehouse/factory fine or emergency',()=>{
 const c=newsCard('C02'),s=game();
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ЦЕЛАЯ ПАРТИЯ ГРУЗА БЕССЛЕДНО ИСЧЕЗЛА!');
 assert.equal(c.delta,0);assert.equal(c.target,'none');assert.equal(c.defense,null);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.equal(G.takeNewspaperEmergency(s,0,'northbeach').reason,'not-negative-event');
 build(s);const before=s.players.map(p=>p.capital);
 G.resolveNewspaper(s);
 assert.deepEqual(s.players.map(p=>p.capital),before);
 assert.equal(s.newsArchive[0].c02.status,'available');
});
for(let roll=1;roll<=6;roll++)test('D6 '+roll+' steals two existing cubes only from the chosen sea port',()=>{
 const original=['Lumber','Masonry','Steel','Lumber'],s=game({roll,stock:original});
 const h=s.newsC02Incident,port=G.C02_PORTS_BY_D6[roll-1];
 assert.equal(h.roll,roll);assert.equal(h.portId,port);
 assert.deepEqual(h.materials,['Lumber','Masonry']);
 assert.deepEqual(s.logisticsSupply[port],['Steel','Lumber']);
 assert.equal(h.initialStock,4);
 for(const id of ['broadway','pacificmail','chinabasin','unioniron']){
  if(id!==port)assert.deepEqual(s.logisticsSupply[id],original);
 }
 assert.equal(s.logisticsSupply.southernpacific.length>0,true,'rail station must not be stolen');
 const old=snap(s);
 G.ensureNewspaper(s,{rng:()=>{throw Error('no reroll')}});
 for(let n=0;n<5;n++){G.newsPreview(s);G.c02Preview(s);G.c02ReturnOptions(s,0);}
 assert.equal(snap(s),old);
});
test('a real fresh shuffled game may reveal C02, taking exactly two cubes before City Hall',()=>{
 let found=null;
 for(let i=1;i<950;i++){
  let seed=i;const rng=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);
    t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const s=G.createInitialState({rng});
  if(s.newsCurrentIds[0]==='C02'){found=s;break;}
 }
 assert.ok(found);assert.equal(found.phase,'draft');
 assert.equal(found.newsC02Incident.materials.length,2);
 const port=G.LOGISTICS_NODES.find(n=>n.id===found.newsC02Incident.portId);
 assert.equal(port.kind!=='rail',true);
});
test('shortage does not duplicate cubes, steal one, reroll a port or invent a fallback',()=>{
 for(const stock of [[],['Steel']]){
  const s=game({stock}),h=s.newsC02Incident,before=snap(s.logisticsSupply);
  assert.equal(h.status,'insufficient-stock');assert.deepEqual(h.materials,[]);
  assert.equal(G.c02ActiveLot(s),null);
  assert.equal(G.c02ReturnOptions(s,0).reason,'insufficient-stock');
  assert.equal(G.returnC02Lot(s,0).reason,'insufficient-stock');
  assert.deepEqual(G.newsPreview(s).entries,[]);
  const old=snap(s);G.ensureNewspaper(s,{rng:()=>{throw Error('reroll under shortage')}});
  assert.equal(snap(s),old);assert.equal(snap(s.logisticsSupply),before);
 }
});
test('exactly 2 source cubes stolen, legal $1 return restores exact multiset and scores once',()=>{
 const s=game({stock:['Steel','Steel']}),h=s.newsC02Incident;
 assert.deepEqual(s.logisticsSupply.broadway,[]);assert.deepEqual(h.materials,['Steel','Steel']);
 const old=s.players[0].prestige;turn(s,0,'financial');
 const res=G.returnC02Lot(s,0);assert.equal(res.ok,true,JSON.stringify(res));
 assert.deepEqual(s.logisticsSupply.broadway,['Steel','Steel']);
 assert.equal(s.players[0].capital,24);
 assert.equal(s.players[0].prestige,old+1);
 assert.equal(s.players[0].influence,31);
 assert.equal(s.players[0].workers[0].districtId,'northbeach','worker moves only ordinary 1 edge');
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(h.status,'returned');
 const once=snap(s);
 assert.equal(G.returnC02Lot(s,0).reason,'already-claimed');
 assert.equal(snap(s),once);
 assert.equal(G.deliverySourceInfo(s,0,{kind:'stolen',id:'broadway'}),null);
 G.resolveNewspaper(s);
 assert.equal(s.newsArchive[0].c02.status,'returned');
 assert.equal(s.newsArchive[0].c02.claim.mode,'returned');
});
test('legal return refused without main action, range or cash, with no partial changes',()=>{
 const base=game();turn(base,0,'financial');
 for(const [mutate,reason] of [
  [s=>s.players[0].capital=0,'capital'],
  [s=>s.players[0].workers[0].districtId='sunset','worker-range'],
  [s=>s.phase='hall','main-action-unavailable'],
  [s=>s.developmentPlayer=1,'main-action-unavailable'],
  [s=>s.activationMainActionUsed=true,'main-action-unavailable'],
  [s=>s.activeWorkerId=null,'main-action-unavailable'],
  [s=>s.players[0].workers[0].jailed=true,'main-action-unavailable'],
  [s=>s.pendingConstruction={projectId:'warehouse'},'pending-action'],
  [s=>s.pendingWorkerAction={kind:'delivery'},'pending-action']
 ]){
  const s=structuredClone(base);mutate(s);const old=snap(s);
  assert.equal(G.returnC02Lot(s,0).reason,reason);
  assert.equal(snap(s),old);
 }
 const no=structuredClone(base);assert.equal(G.returnC02Lot(no,100).reason,'player');
});
test('illegal delivery is real, pays $1 for whole bundle plus hauler and road, gains ★',()=>{
 const s=game();build(s);
 const plan=routePlan(s);
 assert.equal(G.deliverySourceInfo(s,0,plan.source).inventory.length,2);
 const cost=G.deliveryPlanCost(s,plan);
 assert.equal(cost.stolenLotCost,1);assert.equal(cost.materialCost,0);
 assert.equal(cost.haulerCost,0);assert.equal(cost.routeCost,1);assert.equal(cost.total,2);
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true);
 const r=G.executeDelivery(s,plan);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.players[0].capital,23);
 assert.equal(s.players[0].suspicion,1);
 assert.equal(s.newsC02Incident.status,'kept');
 assert.equal(s.newsC02Incident.claim.deliveryTotal,2);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Lumber','Masonry']);
 assert.deepEqual(s.logisticsSupply.broadway,['Steel','Lumber']);
 assert.equal(s.lastDeliveryKey,G.currentDeliveryKey(s,0));
 assert.equal(s.players[0].workers[0].used,false,'delivery is a free action');
 const after=snap(s);
 assert.equal(G.executeDelivery(s,plan).ok,false,'second sale is impossible');
 assert.equal(snap(s),after);
 G.resolveNewspaper(s);
 assert.equal(s.newsArchive[0].c02.status,'kept');
 assert.deepEqual(s.newsArchive[0].c02.materials,['Lumber','Masonry']);
});
test('zero-edge illegal delivery is $1, not $1 per cube',()=>{
 const s=game({stock:['Steel','Steel']});build(s,'WH','northbeach');
 const plan=routePlan(s,{route:['northbeach'],destination:'northbeach'});
 assert.equal(G.deliveryPlanCost(s,plan).total,1);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.equal(s.players[0].capital,24);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Steel','Steel']);
});
test('higher H02 global road tariff applies without altering bundle price',()=>{
 const s=game();build(s);s.newsH02Incident=G.createH02Incident(1,()=>.3);
 const cost=G.deliveryPlanCost(s,routePlan(s));
 assert.equal(cost.routeCost,2);assert.equal(cost.stolenLotCost,1);
 assert.equal(cost.total,3);assert.equal(G.executeDelivery(s,routePlan(s)).ok,true);
 assert.equal(s.players[0].capital,22);
 assert.equal(s.newsH02Incident.resolvedRound,null);
});
test('no partial buy, wrong port, forged source, duplicate pickup or extra illegal lot',()=>{
 const s=game();build(s);const plan=routePlan(s);
 const invalid=[
  {...plan,cargo:['Lumber'],drops:[{...plan.drops[0],materials:['Lumber']}]},
  {...plan,source:{kind:'stolen',id:'unioniron'}},
  {...plan,source:{kind:'node',id:s.newsC02Incident.portId}},
  {...plan,pickups:[{source:{kind:'stolen',id:'broadway'},routeIndex:0,cargo:['Lumber','Masonry']}]},
  {...plan,pickups:[{source:{kind:'contraband',id:'BAD'},routeIndex:0,cargo:['Contraband']}]}
 ];
 for(const [i,p] of invalid.entries()){
  const before=snap(s);
  assert.equal(G.executeDelivery(s,p).ok,false,'forged '+i);
  assert.equal(snap(s),before,'atomic rejection '+i);
 }
});
test('capacity, route, target, no deliverable funds and missing free action reject atomically',()=>{
 const base=game();build(base);
 for(const [mutate,reason] of [
  [p=>p.haulerId='bad','hauler'],
  [p=>p.route=['northbeach','sunset'],'route'],
  [p=>p.drops[0].id='missing','target'],
  [p=>p.drops=[], 'unassigned'],
  [p=>p.haulerId='dray2a'&&p.cargo.push('Steel'),'stolen-lot']
 ]){
  const s=structuredClone(base),p=routePlan(s);mutate(p);
  const before=snap(s),r=G.executeDelivery(s,p);
  assert.equal(r.ok,false,'reject '+reason+': '+JSON.stringify(r));
  assert.equal(snap(s),before);
 }
 const broke=structuredClone(base);broke.players[0].capital=1;
 const r=G.executeDelivery(broke,routePlan(broke));
 assert.equal(r.reason,'capital');assert.equal(broke.players[0].suspicion,0);
 const closed=structuredClone(base);closed.phase='hall';
 assert.equal(G.executeDelivery(closed,routePlan(closed)).ok,false);
});
test('suspicion ★★★: no worker choice rejects, valid choice arrests under existing contract',()=>{
 const s=game();build(s);
 s.players[0].suspicion=3;
 const plan=routePlan(s);
 const old=snap(s);
 assert.equal(G.executeDelivery(s,plan).reason,'arrest-worker');
 assert.equal(snap(s),old);
 plan.arrestWorkerId=s.players[0].workers[1].id;
 const r=G.executeDelivery(s,plan);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.arrested,true);
 assert.equal(s.players[0].workers[1].jailed,true);
 assert.equal(s.players[0].suspicion,0);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Lumber','Masonry']);
 assert.equal(s.newsC02Incident.status,'kept');
});
test('all jailed staff prevents illegal trade but does not remove original lot',()=>{
 const s=game();build(s);
 for(const w of s.players[0].workers)w.jailed=true;
 const original=snap(s);
 const r=G.executeDelivery(s,routePlan(s));
 assert.equal(r.ok,false);assert.equal(snap(s),original);
});
test('legal and illegal purchases mutually exclusive, including another player',()=>{
 for(const mode of ['legal','illegal']){
  const s=game();build(s);turn(s,0,'financial');
  if(mode==='legal')assert.equal(G.returnC02Lot(s,0).ok,true);
  else assert.equal(G.executeDelivery(s,routePlan(s)).ok,true);
  turn(s,1,'financial');
  assert.equal(G.returnC02Lot(s,1).reason,'already-claimed');
  assert.equal(G.executeDelivery(s,routePlan(s,{pid:1})).ok,false);
 }
});
for(const count of [3,4,5])test(count+' players all see one lot and exactly one eligible buyer',()=>{
 const s=game({count});build(s,'WH','financial',count-1);
 turn(s,count-1,'financial');
 const pid=count-1;
 assert.equal(G.c02ReturnOptions(s,pid).available,true);
 assert.equal(G.returnC02Lot(s,pid).ok,true);
 assert.equal(s.newsC02Incident.claimedBy,pid);
 assert.equal(s.players[pid].prestige,1);
 const others=s.players.filter(p=>p.id!==pid).map(p=>p.prestige);
 assert.equal(others.every(x=>x===0),true);
});
test('newspaper after unclaimed C02 retains physical record but never mints/re-draws cargo',()=>{
 const s=game();const lot=[...s.newsC02Incident.materials];
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.developmentComplete=true;s.developmentPlayer=null;
 const r=G.cleanupMarket(s,{rng:()=>.4});assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'E02');
 assert.deepEqual(s.newsArchive[0].c02.materials,lot);
 assert.equal(s.newsArchive[0].c02.unresolved,true);
 assert.equal(s.newsC02Incident.status,'available','unresolved metadata preserved, no unapproved disposal');
 assert.equal(G.c02ActiveLot(s),null,'no invented post-year purchase');
 assert.equal(G.returnC02Lot(s,0).ok,false);
 const before=snap(s);G.ensureNewspaper(s,{rng:()=>{throw Error('no redraw')}});
 assert.equal(snap(s),before);
});
test('old active C02 save steals only once from remaining real stock; old archive immutable',()=>{
 const s=game(),before=snap(s.logisticsSupply);
 delete s.newsC02Incident;
 G.ensureNewspaper(s,{rng:()=>0});
 assert.equal(s.newsC02Incident.roll,1);
 assert.equal(s.logisticsSupply.broadway.length,2);
 const old=snap(s);G.ensureNewspaper(s,{rng:()=>{throw Error('no reroll')}});
 assert.equal(snap(s),old);assert.notEqual(snap(s.logisticsSupply),before);
 const legacy=game();legacy.round=2;legacy.newsCurrentIds=['E02'];
 legacy.newsLastResolvedRound=1;legacy.newsC02Incident=null;
 const report={round:1,cardId:'C02',year:1900,title:'Исчезают целые партии товара',
    entries:[{playerId:0,districtIds:['financial'],actual:-2}],changes:{0:{capital:-2}}};
 legacy.newsArchive=[report];G.ensureNewspaper(legacy,{rng:()=>{throw Error('historic redraw')}});
 assert.equal(legacy.newsC02Incident,null);assert.deepEqual(legacy.newsArchive[0],report);
});
test('final 1905 archives the physical cargo once without seventh-year effect',()=>{
 const s=game({round:6});s.newsDeck=[];
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const lot=snap(s.newsC02Incident.materials);
 const res=G.cleanupMarket(s,{rng:()=>.4});assert.equal(res.ok,true,JSON.stringify(res));
 assert.equal(s.finished,true);
 assert.equal(s.newsArchive.at(-1).c02.status,'available');
 assert.equal(snap(s.newsArchive.at(-1).c02.materials),lot);
 assert.equal(s.newsArchive.filter(x=>x.cardId==='C02').length,1);
});
