import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=o=>JSON.stringify(o);
function game({round=1}={}){
  const s=G.createInitialState({rng:()=>.39});
  s.round=round;s.phase='development';s.view='city';
  s.newsCurrentIds=['E04'];s.newsDeck=s.newsDeck.filter(id=>id!=='E04');
  s.newsLastResolvedRound=round-1;
  s.newsE04Strike={round,resolution:null,marineDeliveries:0,surchargePaid:0};
  s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.developmentSlotsUsed=[0,0,0];
  s.activeWorkerId=s.players[0].workers[0].id;
  s.players.forEach((p,i)=>{
    p.capital=40;p.prestige=0;p.influence=[10,20,30][i];
    p.workersLeft=3;
    p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
  });
  s.constructions=[];s.haulersUsed=[];s.lastDeliveryKey=null;
  for(const n of G.LOGISTICS_NODES)
    s.logisticsSupply[n.id]=['Lumber','Masonry','Steel','Lumber','Masonry','Steel'];
  return s;
}
function warehouse(s,id='WH',districtId='soma',owner=0,stock=[]){
 const wh={id,projectId:'warehouse',playerId:owner,districtId,status:'complete',
  warehouseInventory:[...stock],materialsDelivered:[],startedRound:1,completedRound:1};
 s.constructions.push(wh);return wh;
}
function path(from,to){
 const q=[[from]],seen=new Set([from]);
 for(let i=0;i<q.length;i++){
  const p=q[i];if(p.at(-1)===to)return p;
  for(const next of G.deliveryNeighbors(p.at(-1)))
    if(!seen.has(next)){seen.add(next);q.push([...p,next]);}
 }
 throw Error('No legal road '+from+' -> '+to);
}
function plan({source='pacificmail',districtId='soma',cargo=['Steel'],pickups=[],haulerId='dray2a'}={}){
 const node=G.LOGISTICS_NODES.find(n=>n.id===source);
 const road=path(node.districtId,districtId);
 const materials=[...cargo,...pickups.flatMap(p=>p.cargo)];
 return {playerId:0,source:{kind:'node',id:source},haulerId,cargo:[...cargo],pickups,
  route:road,drops:[{kind:'warehouse',id:'WH',routeIndex:road.length-1,materials}]};
}
function turn(s,pid=0,district='civic'){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[pid].workers[0].id;
 s.players[pid].workers[0].districtId=district;
 s.players[pid].workers[0].used=false;
 s.players[pid].workersLeft=G.playerWorkers(s,pid).filter(w=>!w.used&&!w.jailed).length;
}
test('E04 implements approved newspaper; legacy automatic port-district penalty absent',()=>{
 const s=game(),c=newsCard('E04');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ЗАБАСТОВКА НА НАБЕРЕЖНОЙ!');
 assert.equal(c.target,'none');assert.equal(c.delta,0);assert.equal(c.defense,null);
 assert.equal(c.frequency,'oncePerYear');assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.E04_MARINE_NODE_IDS,['broadway','pacificmail','chinabasin','unioniron']);
 assert.equal(G.E04_MARINE_SURCHARGE,2);
 assert.equal(G.E04_SETTLEMENT_COST,5);assert.equal(G.E04_SETTLEMENT_VP,3);
 assert.equal(G.takeNewspaperEmergency(s,0,'soma').reason,'not-negative-event');
 assert.deepEqual(G.e04StrikePreview(s).portDistrictIds,
   G.DISTRICTS.filter(d=>d.port).map(d=>d.id));
 assert.equal(G.e04StrikePreview(s).active,true);
});
for(const node of G.E04_MARINE_NODE_IDS){
 test('E04 charges exactly $2 for actual Delivery from '+node,()=>{
  const s=game(),district=G.LOGISTICS_NODES.find(n=>n.id===node).districtId;
  const wh=warehouse(s,'WH',district);
  const p=plan({source:node,districtId:district,cargo:['Steel']});
  const cost=G.deliveryPlanCost(s,p),before=s.players[0].capital;
  assert.equal(cost.marineSurcharge,2);assert.equal(cost.routeCost,0);
  assert.equal(cost.materialCost,2);assert.equal(cost.total,4);
  assert.equal(G.validateDeliveryPlan(s,p).ok,true);
  assert.equal(G.executeDelivery(s,p).ok,true);
  assert.equal(s.players[0].capital,before-4);
  assert.deepEqual(wh.warehouseInventory,['Steel']);
  assert.equal(s.newsE04Strike.marineDeliveries,1);
  assert.equal(s.newsE04Strike.surchargePaid,2);
 });
}
test('Southern Pacific railway pickup has no E04 surcharge even in a port district',()=>{
 const s=game();warehouse(s);const p=plan({source:'southernpacific'});
 const before=s.players[0].capital;
 const c=G.deliveryPlanCost(s,p);assert.equal(c.marineSurcharge,0);assert.equal(c.total,2);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,before-2);
 assert.equal(s.newsE04Strike.marineDeliveries,0);
});
test('port-adjacent personal warehouse, factory and neutral source do not trigger marine surcharge',()=>{
 const s=game();warehouse(s,'STOCK','soma',0,['Steel']);warehouse(s,'WH','soma');
 const warehousePlan={playerId:0,source:{kind:'warehouse',id:'STOCK'},
  haulerId:'dray2a',cargo:['Steel'],route:['soma'],
  drops:[{kind:'warehouse',id:'WH',routeIndex:0,materials:['Steel']}]};
 assert.equal(G.deliveryPlanCost(s,warehousePlan).marineSurcharge,0);
 assert.equal(G.executeDelivery(s,warehousePlan).ok,true);
 assert.equal(s.newsE04Strike.marineDeliveries,0);
 assert.deepEqual(s.constructions.find(c=>c.id==='STOCK').warehouseInventory,[]);
});
test('two different marine pickups in one route pay surcharge ONCE',()=>{
 const s=game(),road=path('soma','missionbay');
 warehouse(s,'WH','missionbay');
 const p={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',
  cargo:['Steel'],route:road,
  pickups:[{source:{kind:'node',id:'chinabasin'},cargo:['Lumber'],routeIndex:road.length-1}],
  drops:[{kind:'warehouse',id:'WH',routeIndex:road.length-1,materials:['Steel','Lumber']}]};
 const cost=G.deliveryPlanCost(s,p);
 assert.equal(cost.marineSurcharge,2);assert.equal(cost.loadingCost,1);
 assert.equal(G.validateDeliveryPlan(s,p).ok,true,JSON.stringify(G.validateDeliveryPlan(s,p)));
 const cap=s.players[0].capital;
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,cap-cost.total);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Steel','Lumber']);
 assert.equal(s.newsE04Strike.marineDeliveries,1);
 assert.equal(s.newsE04Strike.surchargePaid,2);
});
test('marine pickup as second source still charges $2, railway first is not an exemption',()=>{
 const s=game(),road=path('soma','missionbay');
 warehouse(s,'WH','missionbay');
 const p={playerId:0,source:{kind:'node',id:'southernpacific'},haulerId:'dray2a',
  cargo:['Steel'],route:road,
  pickups:[{source:{kind:'node',id:'chinabasin'},cargo:['Lumber'],routeIndex:road.length-1}],
  drops:[{kind:'warehouse',id:'WH',routeIndex:road.length-1,materials:['Steel','Lumber']}]};
 assert.equal(G.deliveryPlanCost(s,p).marineSurcharge,2);
 assert.equal(G.executeDelivery(s,p).ok,true);
});
test('H02 double road tariff and E04 fixed marine surcharge are ADDITIVE',()=>{
 const s=game(),road=path('soma','mission');
 warehouse(s,'WH','mission');
 const p=plan({districtId:'mission',source:'pacificmail'});
 s.newsH02Incident=G.createH02Incident(1,()=>.3);
 const c=G.deliveryPlanCost(s,p);
 assert.ok(road.length>1);
 assert.equal(c.routeCost,2*(road.length-1));
 assert.equal(c.marineSurcharge,2);
 assert.equal(c.total,c.materialCost+c.haulerCost+c.routeCost+c.loadingCost+c.stolenLotCost+2);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.newsE04Strike.surchargePaid,2);
});
test('settlement in any accessible port costs $5 and MAIN worker action; grants +3 VP and one influence STEP',()=>{
 const s=game();
 turn(s,0,'soma');
 const before=s.players[0].capital;
 const options=G.e04SettlementOptions(s,0);
 assert.ok(options.districts.find(x=>x.districtId==='soma').available);
 const r=G.settleE04Strike(s,0,'soma');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.players[0].capital,before-5);
 assert.equal(s.players[0].prestige,3);
 assert.equal(s.players[0].influence,11);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.players[0].workers[0].districtId,'soma');
 assert.equal(s.newsE04Strike.resolution.districtId,'soma');
 assert.equal(s.newsE04Strike.resolution.influenceSteps,1);
 assert.equal(G.e04StrikePreview(s).active,false);
});
test('settlement from adjacent district moves worker, with no teleportation',()=>{
 const s=game();turn(s,0,'civic');
 const port=G.e04SettlementOptions(s,0).districts.find(d=>d.reachable);
 assert.ok(port,'one port must be within ordinary movement');
 assert.equal(G.settleE04Strike(s,0,port.districtId).ok,true);
 assert.equal(s.players[0].workers[0].districtId,port.districtId);
});
test('surcharge disappears for EVERY player immediately after resolution, no retroactive refund',()=>{
 const s=game();warehouse(s);
 const p=plan();
 const first=G.deliveryPlanCost(s,p);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.newsE04Strike.surchargePaid,2);
 turn(s,1,'soma');
 assert.equal(G.settleE04Strike(s,1,'soma').ok,true);
 assert.equal(s.players[1].prestige,3);
 assert.equal(s.players[1].capital,35);
 assert.equal(s.newsE04Strike.surchargePaid,2,'already paid surcharge persists in the archive ledger');
 turn(s,0,'soma');s.haulersUsed=[];s.lastDeliveryKey=null;
 const after=G.deliveryPlanCost(s,p);
 assert.equal(after.marineSurcharge,0);assert.equal(after.total,first.total-2);
 assert.equal(G.e04StrikePreview(s).settled,true);
});
test('repeated settlement by same or other player never gives a second VP/Influence award',()=>{
 const s=game();turn(s,0,'soma');assert.equal(G.settleE04Strike(s,0,'soma').ok,true);
 const copy=snap(s);
 assert.equal(G.settleE04Strike(s,0,'northbeach').reason,'already-settled');
 assert.equal(G.settleE04Strike(s,1,'soma').reason,'already-settled');
 assert.equal(snap(s),copy);
});
test('invalid port, distant port, unselected worker, no action, and insufficient money fail atomically',()=>{
 const cases=[
  s=>({pid:0,district:'civic',reason:'not-port'}),
  s=>({pid:0,district:'potrero',reason:'worker-range'}),
  s=>{s.activeWorkerId=null;return {pid:0,district:'soma',reason:'main-action-unavailable'};},
  s=>{s.activationMainActionUsed=true;return {pid:0,district:'soma',reason:'main-action-unavailable'};},
  s=>{s.players[0].capital=4;return {pid:0,district:'soma',reason:'capital'};},
  s=>{s.pendingWorkerAction={type:'moveWorker',playerId:0};return {pid:0,district:'soma',reason:'pending-action'};},
  s=>({pid:99,district:'soma',reason:'player'})
 ];
 for(const modify of cases){
  const s=game();turn(s,0,'soma');
  const c=modify(s);const before=snap(s);
  const result=G.settleE04Strike(s,c.pid,c.district);
  assert.equal(result.reason,c.reason,JSON.stringify(c));
  assert.equal(snap(s),before,'invalid negotiation cannot change game');
 }
});
test('invalid delivery with marine source never charges surcharge or consumes city supply',()=>{
 const s=game();warehouse(s);const p=plan();s.players[0].capital=1;
 const before=snap(s);
 assert.equal(G.deliveryPlanCost(s,p).marineSurcharge,2);
 assert.equal(G.validateDeliveryPlan(s,p).reason,'capital');
 assert.equal(G.executeDelivery(s,p).ok,false);
 assert.equal(snap(s),before);
});
test('old active E04 save without ledger migrates without resetting cash, market or history',()=>{
 const s=game();delete s.newsE04Strike;
 const cash=s.players[0].capital,old=[{cardId:'H03',year:1899,round:0}];
 s.newsArchive=structuredClone(old);
 G.ensureNewspaper(s);G.ensureNewspaper(s);
 assert.equal(s.newsE04Strike,null);assert.equal(s.players[0].capital,cash);
 assert.deepEqual(s.newsArchive,old);
 warehouse(s);
 assert.equal(G.executeDelivery(s,plan()).ok,true);
 assert.deepEqual(s.newsE04Strike,{round:1,resolution:null,marineDeliveries:1,surchargePaid:2});
});
test('year end archives actual surcharge and settlement without second reward',()=>{
 const s=game();warehouse(s);const p=plan();
 assert.equal(G.executeDelivery(s,p).ok,true);
 turn(s,0,'soma');assert.equal(G.settleE04Strike(s,0,'soma').ok,true);
 const totals={capital:s.players[0].capital,vp:s.players[0].prestige,influence:s.players[0].influence};
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.equal(r.report.cardId,'E04');
 assert.equal(r.report.e04.marineDeliveries,1);
 assert.equal(r.report.e04.surchargePaid,2);
 assert.equal(r.report.e04.resolution.playerId,0);
 assert.deepEqual({capital:s.players[0].capital,vp:s.players[0].prestige,influence:s.players[0].influence},totals);
 assert.equal(s.newsE04Strike,null);
 assert.equal(G.e04StrikePreview(s).active,false);
 assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
});
test('unsettled E04 expires at year end and gives no penalty or VP',()=>{
 const s=game();s.players[0].capital=17;
 const old=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.equal(r.report.e04.resolution,null);
 assert.equal(r.report.e04.marineDeliveries,0);
 assert.deepEqual(s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence})),old);
 assert.equal(G.e04StrikePreview(s).active,false);
});
test('legacy old E04 archive remains byte-for-byte and has no retroactive reward',()=>{
 const s=game({round:2}),old=[{round:1,year:1900,cardId:'E04',title:'На пристанях очереди',
   entries:[{playerId:0,actual:-2,districtIds:['soma']}],
   changes:{0:{capital:-2,influence:0,prestige:0}}}];
 s.newsArchive=structuredClone(old);s.newsE04Strike=null;
 G.ensureNewspaper(s);
 assert.deepEqual(s.newsArchive,old);
 assert.equal(G.e04StrikePreview(s).active,true);
});
