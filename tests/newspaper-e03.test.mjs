import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const clone=x=>JSON.parse(JSON.stringify(x));
const snap=x=>JSON.stringify(x);
function state({round=1,playerId=0}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.developmentComplete=false;
 s.view='city';s.newsCurrentIds=['E03'];s.newsDeck=s.newsDeck.filter(x=>x!=='E03');
 s.newsLastResolvedRound=round-1;s.newsE03Aid={round,claims:[]};
 s.developmentPlayer=playerId;s.developmentSlotsUsed=[0,0,0];
 s.activationMainActionUsed=false;s.constructions=[];
 s.logisticsSupply.southernpacific=['Lumber','Masonry','Steel','Lumber','Masonry','Steel'];
 s.players.forEach((p,i)=>{p.capital=100;p.prestige=0;p.influence=[5,9,13][i];});
 s.players.forEach(p=>{p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});p.workersLeft=3;});
 s.activeWorkerId=s.players[playerId].workers[0].id;
 s.haulersUsed=[];s.lastDeliveryKey=null;
 return s;
}
function warehouse(s,id,owner=0,district='outerrichmond',stock=['Lumber','Steel'],status='complete',projectId='warehouse'){
 const c={id,projectId,playerId:owner,districtId:district,status,
   warehouseInventory:[...stock],materialsDelivered:[],startedRound:1,completedRound:1};
 s.constructions.push(c);return c;
}
function route(from,to){
 const q=[[from]],visited=new Set([from]);
 for(let i=0;i<q.length;i++){
  const p=q[i];if(p.at(-1)===to)return p;
  for(const id of G.deliveryNeighbors(p.at(-1)))if(!visited.has(id)){visited.add(id);q.push([...p,id]);}
 }
 throw Error('No real road path '+from+' -> '+to);
}
function plan(district='outerrichmond',{cargo=['Lumber','Steel'],contributions=[],sourceId='southernpacific',routeOverride}={}){
 const source={kind:'node',id:sourceId};
 const start=G.LOGISTICS_NODES.find(x=>x.id===sourceId).districtId;
 const road=routeOverride||route(start,district);
 return {playerId:0,source,haulerId:'dray2a',cargo:[...cargo],route:road,pickups:[],
   drops:[{kind:'e03-aid',id:district,routeIndex:road.length-1,materials:[...cargo],
     ...(contributions.length?{warehouseContributions:contributions}:{})}]};
}
function turn(s,playerId){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=playerId;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[playerId].workers[0].id;
 s.players[playerId].workers[0].used=false;
 s.players[playerId].workersLeft=G.playerWorkers(s,playerId).filter(w=>!w.used&&!w.jailed).length;
}
test('E03 is physical two-token western aid, not old district cash bonus',()=>{
 const s=state(),card=newsCard('E03');
 assert.equal(card.designV2.status,'implemented-for-playtest');
 assert.equal(card.title,'ЗАПАДНЫЕ КВАРТАЛЫ ПРОСЯТ ПОМОЩИ!');
 assert.equal(card.delta,0);assert.equal(card.target,'none');
 assert.deepEqual(G.E03_AID_DISTRICTS,['outerrichmond','sunset']);
 assert.deepEqual(G.E03_AID_MATERIALS,['Lumber','Masonry','Steel']);
 assert.deepEqual(G.E03_AID_REWARD,{capital:13,prestige:2,influence:1});
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.e03AidPreview(s).tokens.map(x=>x.districtId),['outerrichmond','sunset']);
});
for(const districtId of ['outerrichmond','sunset']){
 for(const types of [['Lumber','Masonry'],['Lumber','Steel'],['Masonry','Steel']]){
  test('real Delivery '+districtId+' · '+types.join('+')+' consumes exact physical units and grants all rewards',()=>{
   const s=state(),p=plan(districtId,{cargo:types});
   const initial=s.players[0].capital,stock=[...s.logisticsSupply.southernpacific];
   const cost=G.deliveryPlanCost(s,p);
   assert.equal(cost.routeCost,p.route.length-1);
   assert.equal(G.validateDeliveryPlan(s,p).ok,true);
   const r=G.executeDelivery(s,p);
   assert.equal(r.ok,true,JSON.stringify(r));
   const claim=s.newsE03Aid.claims[0];
   assert.equal(claim.playerId,0);assert.equal(claim.districtId,districtId);
   assert.deepEqual(claim.materials,types);
   assert.equal(claim.via,'delivery');
   assert.equal(s.players[0].capital,initial-cost.total+13);
   assert.equal(s.players[0].prestige,2);
   assert.equal(s.players[0].influence,6);
   assert.equal(s.logisticsSupply.southernpacific.length,stock.length-2);
   for(const t of types)assert.equal(s.logisticsSupply.southernpacific.filter(x=>x===t).length,stock.filter(x=>x===t).length-1);
   assert.equal(s.lastDeliveryKey,G.currentDeliveryKey(s,0));
   assert.deepEqual(G.e03AidPreview(s).tokens.map(x=>x.claimed),districtId==='outerrichmond'?[true,false]:[false,true]);
   assert.equal(G.validateDeliveryPlan(s,p).reason,'delivery-once-per-activation');
  });
 }
}
test('E03 requires 2 DISTINCT construction materials, never pink/purple, partial or duplicate',()=>{
 for(const cargo of [['Lumber','Lumber'],['Steel','Steel'],['Beer','Steel'],['Lumber','Contraband'],['Lumber']]){
  const s=state(),p=plan('sunset',{cargo}),before=snap(s);
  const reason=G.validateDeliveryPlan(s,p).reason;
  assert.notEqual(reason,undefined);
  assert.equal(G.executeDelivery(s,p).ok,false);
  assert.equal(snap(s),before,'invalid delivery must not spend anything: '+cargo);
 }
});
test('wrong destinations, missing route, forbidden park, forged extra token and routeIndex fail before spending',()=>{
 const invalid=[
  p=>{p.drops[0].id='innerrichmond';},
  p=>{p.drops[0].id='innersunset';},
  p=>{p.drops[0].id='civic';},
  p=>{p.route=['soma','park','sunset'];p.drops[0].routeIndex=2;},
  p=>{p.drops[0].routeIndex=0;},
  p=>{p.drops.push({...p.drops[0]});},
  p=>{p.drops[0].materials=['Lumber'];}
 ];
 for(let i=0;i<invalid.length;i++){
  const s=state(),p=plan('sunset');invalid[i](p);
  const before=snap(s);const check=G.validateDeliveryPlan(s,p);
  assert.equal(check.ok,false,'case '+i);
  assert.equal(G.executeDelivery(s,p).ok,false,'case '+i);
  assert.equal(snap(s),before,'case '+i);
 }
});
test('first player claims one token, second player can only claim other, third gets none',()=>{
 const s=state();
 warehouse(s,'WA',0,'outerrichmond',['Lumber','Steel']);
 warehouse(s,'WB',1,'sunset',['Masonry','Steel']);
 warehouse(s,'WC',2,'sunset',['Lumber','Masonry']);
 assert.equal(G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'WA',type:'Lumber'},{warehouseId:'WA',type:'Steel'}]).ok,true);
 turn(s,1);
 assert.equal(G.claimE03WarehouseAid(s,1,'sunset',[{warehouseId:'WB',type:'Masonry'},{warehouseId:'WB',type:'Steel'}]).ok,true);
 turn(s,2);
 const before=snap(s);
 assert.equal(G.claimE03WarehouseAid(s,2,'sunset',[{warehouseId:'WC',type:'Lumber'},{warehouseId:'WC',type:'Masonry'}]).reason,'token-claimed');
 assert.equal(snap(s),before);
 assert.deepEqual(s.newsE03Aid.claims.map(x=>x.playerId),[0,1]);
 assert.equal(s.players[0].capital,113);
 assert.equal(s.players[1].capital,113);
 assert.equal(s.players[2].capital,100);
 assert.equal(s.players[0].prestige,2);assert.equal(s.players[1].prestige,2);
});
test('one player cannot claim BOTH districts even with two stocked own warehouses',()=>{
 const s=state();warehouse(s,'A',0,'outerrichmond');warehouse(s,'B',0,'sunset');
 assert.equal(G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'A',type:'Lumber'},{warehouseId:'A',type:'Steel'}]).ok,true);
 const before=snap(s);
 assert.equal(G.claimE03WarehouseAid(s,0,'sunset',[{warehouseId:'B',type:'Lumber'},{warehouseId:'B',type:'Steel'}]).reason,'player-claimed');
 assert.equal(snap(s),before);
});
test('two own completed warehouses may together supply pair, without spending action/Delivery',()=>{
 const s=state();
 const a=warehouse(s,'A',0,'outerrichmond',['Masonry']);
 const b=warehouse(s,'B',0,'outerrichmond',['Lumber','Lumber']);
 const opts=G.e03WarehouseAidOptions(s,0);
 assert.equal(opts.tokens[0].pairs.length,2,'each physical Lumber candidate can form a valid pair');
 const cap=s.players[0].capital,workers=s.players[0].workersLeft,actor=s.activeWorkerId;
 const r=G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'A',type:'Masonry'},{warehouseId:'B',type:'Lumber'}]);
 assert.equal(r.ok,true);
 assert.deepEqual(a.warehouseInventory,[]);
 assert.deepEqual(b.warehouseInventory,['Lumber']);
 assert.equal(s.players[0].capital,cap+13);
 assert.equal(s.players[0].prestige,2);assert.equal(s.players[0].influence,6);
 assert.equal(s.players[0].workersLeft,workers);assert.equal(s.activeWorkerId,actor);
 assert.equal(s.activationMainActionUsed,false);assert.equal(s.lastDeliveryKey,null);
});
test('own std_warehouse is eligible, foreign/incomplete/other-district not; construction staging untouched',()=>{
 for(const [owner,district,status,reason] of [
  [1,'outerrichmond','complete','aid-warehouse'],
  [0,'innerrichmond','complete','aid-warehouse'],
  [0,'outerrichmond','under-construction','aid-warehouse'],
  [0,'outerrichmond','abandoned','aid-warehouse']
 ]){
  const s=state(),w=warehouse(s,'W',owner,district,['Masonry','Steel'],status);
  const construction={id:'BUILD',projectId:'shops',playerId:0,districtId:'outerrichmond',
    status:'under-construction',materialsDelivered:['Masonry','Steel'],warehouseInventory:[]};
  s.constructions.push(construction);
  const before=snap(s),r=G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'W',type:'Masonry'},{warehouseId:'W',type:'Steel'}]);
  assert.equal(r.reason,reason);
  assert.equal(snap(s),before);
  assert.deepEqual(construction.materialsDelivered,['Masonry','Steel']);
 }
 const s=state(),w=warehouse(s,'STD',0,'outerrichmond',['Masonry','Steel'],'complete','std_warehouse');
 assert.equal(G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'STD',type:'Masonry'},{warehouseId:'STD',type:'Steel'}]).ok,true);
 assert.deepEqual(w.warehouseInventory,[]);
});
test('warehouse-only invalid duplicate, missing stock or unsupported materials is atomic',()=>{
 const candidates=[
  [{warehouseId:'W',type:'Steel'},{warehouseId:'W',type:'Steel'}],
  [{warehouseId:'W',type:'Masonry'},{warehouseId:'W',type:'Lumber'}],
  [{warehouseId:'W',type:'Beer'},{warehouseId:'W',type:'Steel'}],
  [{warehouseId:'W',type:'Steel'}],
  [{warehouseId:'W',type:'Steel'},{warehouseId:'FORGED',type:'Masonry'}]
 ];
 for(const pair of candidates){
  const s=state();warehouse(s,'W',0,'outerrichmond',['Masonry','Steel']);
  const before=snap(s);
  const r=G.claimE03WarehouseAid(s,0,'outerrichmond',pair);
  assert.equal(r.ok,false);
  assert.equal(snap(s),before);
 }
});
test('combine one on-board material plus one real locally-owned warehouse cube atomically',()=>{
 const s=state(),wh=warehouse(s,'W',0,'sunset',['Masonry','Steel']);
 const p=plan('sunset',{cargo:['Lumber'],contributions:[{warehouseId:'W',type:'Steel'}]});
 const check=G.validateDeliveryPlan(s,p);assert.equal(check.ok,true,JSON.stringify(check));
 const money=s.players[0].capital,shipping=G.deliveryPlanCost(s,p).total;
 const res=G.executeDelivery(s,p);assert.equal(res.ok,true,JSON.stringify(res));
 assert.deepEqual(s.newsE03Aid.claims[0].materials,['Lumber','Steel']);
 assert.equal(s.newsE03Aid.claims[0].via,'delivery-and-warehouse');
 assert.deepEqual(wh.warehouseInventory,['Masonry']);
 assert.equal(s.players[0].capital,money-shipping+13);
 assert.equal(s.newsE03Aid.claims.length,1);
 assert.equal(s.lastDeliveryKey,G.currentDeliveryKey(s,0));
});
test('mixed-aid rejects wrong town, foreign storage, missing stock, same material, double-use from shipment',()=>{
 const cases=[
  s=>{s.constructions[0].playerId=1;},
  s=>{s.constructions[0].districtId='innersunset';},
  s=>{s.constructions[0].warehouseInventory=[];},
  (s,p)=>{p.drops[0].warehouseContributions[0].type='Lumber';},
  (s,p)=>{p.source={kind:'warehouse',id:'W'};p.cargo=['Steel'];p.route=route('sunset','sunset');p.drops[0].routeIndex=0;p.drops[0].warehouseContributions=[{warehouseId:'W',type:'Steel'}];s.constructions[0].warehouseInventory=['Steel'];}
 ];
 for(let i=0;i<cases.length;i++){
  const s=state(),w=warehouse(s,'W',0,'sunset',['Masonry','Steel']);
  const p=plan('sunset',{cargo:['Lumber'],contributions:[{warehouseId:'W',type:'Steel'}]});
  cases[i](s,p);const before=snap(s);
  assert.equal(G.validateDeliveryPlan(s,p).ok,false,'case '+i);
  assert.equal(G.executeDelivery(s,p).ok,false,'case '+i);
  assert.equal(snap(s),before,'case '+i);
 }
});
test('normal Delivery price, capacity, stock, once-per-activation and local route are never bypassed',()=>{
 const scenarios=[
  (s,p)=>{p.haulerId='dray2a';p.cargo=['Lumber','Steel','Masonry'];p.drops[0].materials=['Lumber','Steel','Masonry'];},
  (s,p)=>{s.players[0].capital=0;},
  (s,p)=>{s.logisticsSupply.southernpacific=['Steel'];},
  (s,p)=>{s.lastDeliveryKey=G.currentDeliveryKey(s,0);},
  (s,p)=>{s.phase='declare';},
  (s,p)=>{s.developmentPlayer=1;},
  (s,p)=>{p.route=['soma','park','outerrichmond'];p.drops[0].routeIndex=2;}
 ];
 for(let i=0;i<scenarios.length;i++){
  const s=state(),p=plan('outerrichmond');scenarios[i](s,p);
  const before=snap(s);
  assert.equal(G.validateDeliveryPlan(s,p).ok,false,'case '+i);
  assert.equal(G.executeDelivery(s,p).ok,false,'case '+i);
  assert.equal(snap(s),before,'case '+i);
 }
});
test('persisting/reloading claim does not duplicate rewards, warehouse stock or private ledger',()=>{
 const s=state();warehouse(s,'W',0,'outerrichmond');
 const r=G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'W',type:'Lumber'},{warehouseId:'W',type:'Steel'}]);
 assert.equal(r.ok,true);
 const x=clone(s),before=snap(x);
 G.ensureNewspaper(x);G.ensureNewspaper(x);
 assert.equal(snap(x),before);
 assert.equal(G.e03AidPreview(x).tokens[0].claimed,true);
 turn(x,0);
 const before2=snap(x);
 assert.equal(G.claimE03WarehouseAid(x,0,'outerrichmond',[{warehouseId:'W',type:'Lumber'},{warehouseId:'W',type:'Steel'}]).ok,false);
 assert.equal(snap(x),before2);
});
test('legacy E03 current save missing ledger does not auto-pay, old E03 archives remain identical',()=>{
 const s=state({round:3}),historic={year:1900,round:1,cardId:'E03',title:'Грузы и новые заказы',entries:[{playerId:0,actual:2}]};
 s.newsArchive=[clone(historic)];delete s.newsE03Aid;
 const before=snap(s);
 G.ensureNewspaper(s);G.ensureNewspaper(s);
 assert.equal(snap(s),before);
 assert.equal(G.e03AidPreview(s).tokens.filter(t=>!t.claimed).length,2);
 assert.deepEqual(s.newsArchive[0],historic);
 warehouse(s,'W',0,'outerrichmond');
 assert.equal(G.claimE03WarehouseAid(s,0,'outerrichmond',[{warehouseId:'W',type:'Lumber'},{warehouseId:'W',type:'Steel'}]).ok,true);
 assert.equal(s.newsE03Aid.round,3);
});
test('year end archives actual claims, expires remaining token with no passive payout',()=>{
 const s=state();warehouse(s,'W',0,'sunset');
 assert.equal(G.claimE03WarehouseAid(s,0,'sunset',[{warehouseId:'W',type:'Lumber'},{warehouseId:'W',type:'Steel'}]).ok,true);
 s.newsDeck=['E04',...s.newsDeck.filter(id=>id!=='E04')];
 s.developmentComplete=true;s.developmentPlayer=null;
 const b=s.players.map(p=>({cash:p.capital,vp:p.prestige,inf:p.influence}));
 const income=s.players.map(p=>G.roundIncome(s,p.id));
 const res=G.cleanupMarket(s,{rng:()=>.21});
 assert.equal(res.ok,true,JSON.stringify(res));
 assert.equal(s.round,2);assert.equal(s.newsE03Aid,null);
 const report=s.newsArchive[0];assert.equal(report.cardId,'E03');
 assert.equal(report.e03.claims.length,1);assert.equal(report.e03.unused,1);
 assert.deepEqual(report.entries,[]);assert.deepEqual(report.changes,{});
 for(let i=0;i<3;i++){
  assert.equal(s.players[i].capital,b[i].cash+income[i]);
  assert.equal(s.players[i].prestige,b[i].vp);
  assert.equal(s.players[i].influence,b[i].inf);
 }
});
test('E03 generated after another newspaper starts with both unclaimed tokens; ends after 1905',()=>{
 const s=state(),first=s.newsCurrentIds[0];
 s.newsCurrentIds=['E04'];s.newsDeck=['E03','F01',...s.newsDeck.filter(x=>!['E03','F01'].includes(x))];
 s.developmentComplete=true;s.developmentPlayer=null;
 assert.equal(G.cleanupMarket(s,{rng:()=>.2}).ok,true);
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'E03');
 assert.deepEqual(s.newsE03Aid,{round:2,claims:[]});
 const f=state({round:6});warehouse(f,'W');
 assert.equal(G.claimE03WarehouseAid(f,0,'outerrichmond',[{warehouseId:'W',type:'Lumber'},{warehouseId:'W',type:'Steel'}]).ok,true);
 f.developmentComplete=true;f.developmentPlayer=null;
 const done=G.cleanupMarket(f,{rng:()=>.2});
 assert.equal(done.ok,true);assert.equal(done.finished,true);assert.equal(f.round,6);
 assert.equal(f.newsE03Aid,null);assert.equal(f.newsArchive[0].e03.claims.length,1);
});
test('H02 persistent double-road tariff still applies to E03, reward unchanged',()=>{
 const s=state(),p=plan();
 s.newsH02Incident=G.createH02Incident(1,()=>.3);
 const cost=G.deliveryPlanCost(s,p);
 assert.equal(cost.routeCost,2*(p.route.length-1));
 const before=s.players[0].capital;
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,before-cost.total+13);
});
