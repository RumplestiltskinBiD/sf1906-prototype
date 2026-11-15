import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=x=>JSON.stringify(x);
function game({roll=1,round=1,count=3}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=['H02'];s.newsDeck=s.newsDeck.filter(id=>id!=='H02');
 s.newsLastResolvedRound=round-1;
 s.newsH02Incident=G.createH02Incident(round,()=> (roll-.5)/6);
 s.newsH01Incident=null;s.newsEmergency={};s.constructions=[];
 while(s.players.length<count){const id=s.players.length;s.players.push({
   ...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
   workers:G.createWorkers(id),portfolio:[],goals:[]});}
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.developmentSlotsUsed=Array(count).fill(0);
 s.developmentComplete=false;s.developmentPlayer=0;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach((p,i)=>{p.capital=40;p.prestige=0;p.influence=30-i*6;});
 return s;
}
function build(s,id,projectId,districtId='financial',playerId=1,status='complete'){
 const c={id,projectId,districtId,playerId,status,startedRound:1,
  completedRound:status==='complete'?1:null,
  materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function turn(s,pid=0,worker=0,district='civic'){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activationMainActionUsed=false;
 s.players[pid].workers[worker].districtId=district;
 s.activeWorkerId=s.players[pid].workers[worker].id;
}
function finish(s,nextId='E02'){
 s.newsDeck=[nextId,...s.newsDeck.filter(id=>id!==nextId)];
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const r=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(r.ok,true,JSON.stringify(r));
 return r;
}
function plan(route=['soma','mission'],cargo=['Steel']){
 return {playerId:0,source:{kind:'node',id:'southernpacific'},cargo,
  haulerId:'standard',route,
  drops:[{kind:'warehouse',id:'WH',materials:cargo,routeIndex:route.length-1}]};
}

test('H02 is the active v2 horse illness: no old hotel/club/shop levy or emergency',()=>{
 const s=game(),c=newsCard('H02');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ЗАРАЗА В ГОРОДСКИХ КОНЮШНЯХ!');
 assert.equal(c.target,'none');assert.equal(c.delta,0);assert.equal(c.defense,null);
 assert.equal(c.frequency,'oncePerYear');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).threatened,['northbeach']);
 assert.equal(G.takeNewspaperEmergency(s,0,'northbeach').reason,'not-negative-event');
});
for(let roll=1;roll<=6;roll++){
 test('H02 D6 '+roll+' creates exactly one permanent source, never a local tariff',()=>{
  const s=game({roll}),h=s.newsH02Incident;
  assert.equal(h.roll,roll);
  assert.equal(h.districtId,G.H02_ORIGIN_DISTRICTS[roll-1]);
  assert.equal(h.startRound,1);assert.equal(h.resolvedRound,null);
  assert.equal(G.paidRoadEdgeCost(s),2);
  const before=snap(s);
  for(let k=0;k<3;k++){G.ensureNewspaper(s,{rng:()=>.99});G.newsPreview(s);G.h02Preview(s);}
  assert.equal(snap(s),before);
 });
}
test('a genuinely new H02 party rolls the token before City Hall and doubles roads',()=>{
 let found;
 for(let i=1;i<900;i++){
  let seed=i;const rng=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);
   t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const s=G.createInitialState({rng});
  if(s.newsCurrentIds[0]==='H02'){found=s;break;}
 }
 assert.ok(found);assert.equal(found.phase,'draft');
 assert.equal(found.newsH02Incident.startRound,1);
 assert.equal(found.newsH02Incident.roll>=1&&found.newsH02Incident.roll<=6,true);
 assert.equal(G.paidRoadEdgeCost(found),2);
});
test('doubles each road crossing but not cargo price, wagon, load or rental',()=>{
 const s=game();build(s,'WH','warehouse','mission',0);
 s.logisticsSupply.southernpacific=['Steel','Lumber','Masonry'];
 const base=plan();
 const actual=G.deliveryPlanCost(s,base);
 assert.equal(actual.routeCost,2);assert.equal(actual.haulerCost,3);
 assert.equal(actual.materialCost,2);assert.equal(actual.loadingCost,0);
 assert.equal(actual.total,7);
 assert.equal(G.deliveryPlanCost(s,{...base,route:['soma']}).routeCost,0);
 const multi={...base,route:['soma','mission','noe','mission']};
 assert.equal(G.deliveryPlanCost(s,multi).routeCost,6,'three edges not fixed $2 per trip');
 s.newsH02Incident.resolvedRound=1;
 const normal=G.deliveryPlanCost(s,base);
 assert.equal(normal.routeCost,1);assert.equal(normal.total,6);
 assert.equal(G.paidRoadEdgeCost(s),1);
});
test('actual approved cargo route is charged atomically at $2/edge',()=>{
 const s=game();build(s,'WH','warehouse','mission',0);
 s.logisticsSupply.southernpacific=['Steel','Lumber'];
 turn(s,0,0,'soma');
 const cost=G.deliveryPlanCost(s,plan());
 assert.equal(cost.routeCost,2);
 const result=G.executeDelivery(s,plan());
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(s.players[0].capital,33);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Steel']);
});
test('same route instantly returns to $1/edge after medical operation, without reroute',()=>{
 const s=game({roll:2});build(s,'MED','std_clinic','financial',1);
 build(s,'WH','warehouse','mission',0);
 const before=G.deliveryPlanCost(s,plan());
 assert.equal(before.routeCost,2);
 turn(s);
 assert.equal(G.completeH02Expedition(s,0,'MED').ok,true);
 assert.equal(G.deliveryPlanCost(s,plan()).routeCost,1);
 assert.equal(G.h02Preview(s).active,false);
});
test('completed own and foreign medical sources both work, only the organizer is rewarded',()=>{
 for(const [id,owner] of [['A',0],['B',1]]){
  const s=game({roll:1});build(s,id,'std_clinic','financial',owner);
  const old=s.players.map(p=>({cash:p.capital,vp:p.prestige,influence:p.influence}));
  const inventory=snap(s.logisticsSupply);
  turn(s,0,0,'civic');
  const options=G.h02ExpeditionOptions(s,0),source=options.services[0];
  assert.equal(options.tariff,2);
  assert.deepEqual(source.route,G.f02ServiceRoute('financial','northbeach'));
  assert.equal(source.cost,2);
  assert.equal(source.available,true);
  const location=s.players[0].workers[0].districtId;
  const result=G.completeH02Expedition(s,0,id);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(s.players[0].capital,old[0].cash-2);
  assert.equal(s.players[0].prestige,old[0].vp+3);
  assert.equal(s.players[0].influence,old[0].influence+1);
  assert.equal(s.players[owner].capital,old[owner].cash-(owner===0?2:0));
  if(owner===1)assert.equal(s.players[1].prestige,old[1].vp);
  assert.equal(s.players[0].workers[0].districtId,location,'worker not teleported');
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.activationMainActionUsed,true);
  assert.equal(s.newsH02Incident.operation.tariff,2);
  assert.equal(s.newsH02Incident.resolvedRound,1);
  assert.equal(snap(s.logisticsSupply),inventory);
  assert.equal(G.paidRoadEdgeCost(s),1);
  const once=snap(s);
  assert.equal(G.completeH02Expedition(s,0,id).reason,'already-completed');
  assert.equal(snap(s),once);
 }
});
test('local clinic in outbreak district can solve for $0, not $2 minimum',()=>{
 const s=game({roll:2});build(s,'MED','clinic','financial',1);
 turn(s);
 const op=G.h02ExpeditionOptions(s,0).services[0];
 assert.deepEqual(op.route,['financial']);assert.equal(op.cost,0);
 s.players[0].capital=0;
 assert.equal(G.completeH02Expedition(s,0,'MED').ok,true);
 assert.equal(s.players[0].capital,0);
});
test('unfinished or wrong service, no route, distant worker: action never changes',()=>{
 const s=game({roll:6});build(s,'U','std_clinic','soma',1,'building');
 build(s,'F','std_fire','soma',1);
 build(s,'MED','clinic','financial',1);
 assert.deepEqual(G.h02ExpeditionOptions(s,0).services.map(e=>e.constructionId),['MED']);
 const first=snap(s);
 assert.equal(G.completeH02Expedition(s,0,'U').reason,'invalid-service');
 assert.equal(G.completeH02Expedition(s,0,'F').reason,'invalid-service');
 assert.equal(snap(s),first);
 turn(s,0,0,'sunset');
 const distant=G.h02ExpeditionOptions(s,0).services[0];
 assert.equal(distant.reachable,false);
 assert.equal(G.completeH02Expedition(s,0,'MED').reason,'worker-range');
});
test('insufficient capital fails without using worker or awarding VP',()=>{
 const s=game({roll:1});build(s,'MED','std_clinic','financial',1);
 turn(s);s.players[0].capital=1;
 const before=snap(s);
 assert.equal(G.completeH02Expedition(s,0,'MED').reason,'capital');
 assert.equal(snap(s),before);
 s.players[0].capital=2;
 assert.equal(G.completeH02Expedition(s,0,'MED').ok,true);
 assert.equal(s.players[0].capital,0);
});
test('phase, wrong player, unavailable action, jail and pending choices reject atomically',()=>{
 const base=game({roll:2});build(base,'MED','std_clinic','financial',1);
 for(const mutate of [
  s=>{s.phase='hall';},s=>{s.developmentPlayer=1;},
  s=>{s.activationMainActionUsed=true;},s=>{s.activeWorkerId=null;},
  s=>{s.players[0].workers[0].used=true;},
  s=>{s.players[0].workers[0].jailed=true;},
  s=>{s.pendingConstruction={projectId:'tenement'};},
  s=>{s.pendingWorkerAction={kind:'delivery'};}
 ]){
  const s=structuredClone(base);mutate(s);const before=snap(s);
  const outcome=G.completeH02Expedition(s,0,'MED');
  assert.equal(outcome.ok,false,JSON.stringify(outcome));
  assert.equal(snap(s),before);
 }
 assert.equal(G.completeH02Expedition(base,10,'MED').reason,'player');
});
test('duplicate H02 operation is prohibited across players and after save/reload',()=>{
 const s=game({roll:2});build(s,'MED','std_clinic','financial',1);
 assert.equal(G.completeH02Expedition(s,0,'MED').ok,true);
 const saved=structuredClone(JSON.parse(snap(s)));
 turn(saved,1,0,'financial');
 assert.equal(G.completeH02Expedition(saved,1,'MED').reason,'already-completed');
 assert.equal(saved.newsH02Incident.operation.playerId,0);
 assert.equal(saved.players[1].prestige,0);
});
test('unchanged forecasts and the original newspaper coexist with continuing illness',()=>{
 const s=game({roll:2});build(s,'WH','warehouse','mission',0);
 finish(s,'E02');
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'E02');
 assert.equal(G.paidRoadEdgeCost(s),2);
 assert.equal(G.h02Preview(s).active,true);
 assert.equal(s.newsArchive[0].h02.tariff,2);
 assert.equal(s.newsArchive[0].h02.resolved,false);
 assert.equal(s.newsH02Incident.lastAssessedRound,1);
 assert.equal(s.newsH02Incident.yearReports.length,1);
 G.ensureNewspaper(s,{rng:()=>{throw Error('no second focus')}});
 assert.equal(G.paidRoadEdgeCost(s),2);
 turn(s,0,0,'financial');build(s,'MED','std_clinic','financial',1);
 assert.equal(G.completeH02Expedition(s,0,'MED').ok,true);
 assert.equal(G.paidRoadEdgeCost(s),1);
 finish(s,'E03');
 assert.equal(s.newsArchive[1].cardId,'E02');
 assert.equal(s.newsArchive[1].ongoingH02.resolved,true);
 assert.equal(s.newsArchive[1].ongoingH02.operation.prestige,3);
 assert.equal(s.newsH02Incident.yearReports.length,2);
 assert.equal(s.round,3);
 assert.equal(G.paidRoadEdgeCost(s),1);
});
test('H01 and H02 persistence: existing epidemic expedition pays doubled roads',()=>{
 const s=game({roll:2,round:2});
 s.newsH01Incident=G.createH01Incident(1,()=>.01);s.newsH01Incident.radius=1;
 build(s,'MED','std_clinic','financial',1);
 turn(s);
 const options=G.h01ExpeditionOptions(s,0),route=options.services[0];
 assert.equal(options.tariff,2);
 assert.equal(route.cost,2);
 assert.equal(G.completeH01Expedition(s,0,'MED').ok,true);
 assert.equal(s.newsH01Incident.resolvedRound,2);
 assert.equal(G.paidRoadEdgeCost(s),2,'the separate H02 illness persists');
});
test('F02 services use the global $2 tariff even when the active paper is F02',()=>{
 const s=game({roll:2});s.newsCurrentIds=['F02'];
 s.newsF02Incident={round:1,roll:1,districtId:'northbeach',firePending:true,manhuntPending:true,actions:[]};
 build(s,'FIRE','std_fire','soma',1);turn(s,0,0,'civic');
 const o=G.f02OperationOptions(s,0,'fire');
 assert.equal(o.tariff,2);
 assert.equal(o.services[0].cost,2* (o.services[0].route.length-1));
 assert.equal(G.completeF02Operation(s,0,'fire','FIRE').ok,true);
 assert.equal(G.paidRoadEdgeCost(s),2);
});
test('old active H02 save migrates one D6 token without replacing stock or historical H02',()=>{
 const s=game({roll:1});const before=snap(s.logisticsSupply);
 delete s.newsH02Incident;const money=s.players.map(p=>p.capital);
 G.ensureNewspaper(s,{rng:()=>.9});
 assert.equal(s.newsH02Incident.roll,6);
 const again=snap(s);G.ensureNewspaper(s,{rng:()=>{throw Error('reroll')}});
 assert.equal(snap(s),again);
 assert.equal(snap(s.logisticsSupply),before);
 assert.deepEqual(s.players.map(p=>p.capital),money);
 const old=game();old.newsCurrentIds=['E02'];old.newsH02Incident=null;
 const archive={round:1,cardId:'H02',year:1900,title:'Болезни среди постояльцев',
  entries:[{playerId:0,districtIds:['financial'],actual:-2}],changes:{0:{capital:-2}}};
 old.newsArchive=[archive];old.round=2;old.newsLastResolvedRound=1;
 G.ensureNewspaper(old,{rng:()=>{throw Error('historic draw')}});
 assert.equal(old.newsH02Incident,null);
 assert.deepEqual(old.newsArchive[0],archive);
});
test('H02 at final 1905 archives outcome without applying seventh-year effect',()=>{
 const s=game({round:6,roll:1});build(s,'WH','warehouse','mission',0);
 s.newsH02Incident.startRound=6;
 s.newsDeck=[];s.newsLastResolvedRound=5;
 s.developmentComplete=true;s.developmentPlayer=null;
 const old=s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}));
 G.cleanupMarket(s,{rng:()=>.35});
 assert.equal(s.finished,true);
 assert.equal(s.newsArchive.at(-1).h02.resolved,false);
 assert.equal(s.newsArchive.at(-1).h02.tariff,2);
 assert.equal(s.newsH02Incident.yearReports.length,1);
 assert.equal(s.players[0].prestige,old[0].prestige,'no fictional extra points');
});
