import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
 const s=G.createInitialState({rng:()=>0.11});
 s.phase='development';s.view='city';s.developmentComplete=false;s.developmentPlayer=0;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
 s.constructions=[];
 return s;
}
function built(id,projectId,playerId,districtId,extra={}){
 return {id,projectId,playerId,districtId,status:'complete',materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],startedRound:1,completedRound:1,...extra};
}
function finish(s,id,projectId,districtId,playerId=0){
 const c=built(id,projectId,playerId,districtId,{status:'under-construction'});
 s.constructions.push(c);
 const r=G.completeConstruction(s,c);
 assert.equal(r.ok,true,r.reason);
 return c;
}
function plan({playerId=0,warehouse='W',shop='S',route=['soma','mission'],haulerId='standard',arrestWorkerId=null}={}){
 return {playerId,source:{kind:'contraband',id:warehouse},haulerId,cargo:[G.CONTRABAND_CARGO],
   route,drops:[{kind:'contraband-sale',id:shop,routeIndex:route.length-1,materials:[G.CONTRABAND_CARGO]}],
   arrestWorkerId};
}

test('new cards: port-only customs, rare-goods shop, two copies and fixed recipes',()=>{
 const wh=G.projectById('customs_warehouse'),shop=G.projectById('rare_goods_shop');
 assert.equal(wh.open,5);assert.equal(wh.prestige,2);assert.equal(wh.income,1);
 assert.deepEqual(wh.materials,['Lumber','Masonry','Masonry','Steel']);
 assert.deepEqual(wh.types,['Общественное','Торговое']);
 assert.deepEqual(wh.risk,{earthquake:1,fire:1});
 assert.equal(shop.open,4);assert.deepEqual(shop.materials,['Lumber','Masonry','Masonry']);
 assert.deepEqual(shop.types,['Торговое']);assert.equal(shop.income,0);
 assert.equal(shop.prestige,1);assert.deepEqual(shop.risk,{earthquake:0,fire:1});
 const pool=G.createProjectCardPool({rng:()=>0.3});
 for(const id of ['customs_warehouse','rare_goods_shop'])assert.equal(pool.filter(c=>c.id===id).length,2);
 const s=state();s.players[0].portfolio=['customs_warehouse'];
 assert.equal(G.constructionEligibility(s,0,'customs_warehouse','civic').ok,false);
 assert.equal(G.constructionEligibility(s,0,'customs_warehouse','soma').reasons.some(x=>x.includes('портов')),false);
});

test('rare-goods income is fixed exactly at completion: high land or local business, never recalculated',()=>{
 const s=state();
 s.districts.mission.landValue=1;
 s.constructions=[built('B1','bank',1,'mission'),built('B2','club',2,'mission')];
 let shop=finish(s,'S1','rare_goods_shop','mission');
 assert.equal(shop.fixedIncome,3,'1 plus 2 completed business projects');
 assert.equal(G.buildingIncome(s,0),3);
 assert.equal(G.roundIncome(s,0),6);
 s.districts.mission.landValue=6;
 s.constructions.push(built('B3','hotel',1,'mission'));
 assert.equal(G.buildingIncome(s,0),3,'neither land nor later building affects income');
 assert.equal(G.completeConstruction(s,shop).ok,false);
 s.districts.civic.landValue=2;
 shop=finish(s,'S2','rare_goods_shop','civic');
 assert.equal(shop.fixedIncome,2);
 s.districts.noe.landValue=0;
 assert.equal(finish(s,'S3','rare_goods_shop','noe').fixedIncome,1);
 assert.equal(G.buildingIncome(s,0),6);
 const copy=JSON.parse(JSON.stringify(s));
 assert.equal(G.buildingIncome(copy,0),6,'income snapshot survives save serialization');
});

test('customs gets two purple cubes immediately, warehouse income and VP; no buyer remains legal to build',()=>{
 const s=state();
 const wh=finish(s,'W','customs_warehouse','soma');
 assert.equal(wh.contrabandStock,2);
 assert.equal(G.contrabandInventory(wh).length,2);
 assert.equal(G.buildingIncome(s,0),1);
 assert.equal(s.players[0].prestige,2);
 assert.equal(G.completedCustomsWarehouses(s).length,1);
 assert.equal(G.deliverySourceInfo(s,1,{kind:'contraband',id:'W'}).inventory.length,2);
 assert.equal(G.projectById('customs_warehouse').types.includes('Общественное'),true);
 assert.equal(G.serviceFamilyForProject('customs_warehouse'),null,'not a free police/fire service');
});

test('illegal delivery through a physical route settles 6/1/1 and only carrier star',()=>{
 const s=state();
 s.constructions=[built('W','customs_warehouse',1,'soma',{contrabandStock:2}),
   built('S','rare_goods_shop',2,'mission',{fixedIncome:1})];
 const initial=s.players.map(p=>p.capital);
 const action=plan();
 const check=G.validateDeliveryPlan(s,action);
 assert.equal(check.ok,true,check.reason);
 assert.equal(check.cost.haulerCost,3);
 assert.equal(check.cost.routeCost,1);
 assert.equal(check.cost.total,4);
 const r=G.executeDelivery(s,action);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.cost.total,4);
 assert.equal(s.players[0].capital,initial[0]+6-4);
 assert.equal(s.players[1].capital,initial[1]+1);
 assert.equal(s.players[2].capital,initial[2]+1);
 assert.equal(s.players[0].suspicion,1);
 assert.equal(s.players[1].suspicion,0);assert.equal(s.players[2].suspicion,0);
 assert.equal(s.constructions.find(c=>c.id==='W').contrabandStock,1);
 assert.equal(s.players[0].workersLeft,3);
 const again=G.validateDeliveryPlan(s,action);
 assert.equal(again.reason,'delivery-once-per-activation');
});

test('same owner of source, buyer and carrier earns $8 but still only 1 star',()=>{
 const s=state();s.constructions=[built('W','customs_warehouse',0,'soma',{contrabandStock:2}),
   built('S','rare_goods_shop',0,'soma',{fixedIncome:2})];
 const before=s.players[0].capital;
 const r=G.executeDelivery(s,plan({route:['soma']}));
 assert.equal(r.ok,true,r.reason);
 assert.equal(s.players[0].capital,before+8-3);
 assert.equal(s.players[0].suspicion,1);
 assert.equal(s.constructions[0].contrabandStock,1);
});

test('invalid buyer, no stock, no money and forbidden park are atomic failures',()=>{
 const s=state();
 s.constructions=[built('W','customs_warehouse',1,'soma',{contrabandStock:2}),
   built('S','rare_goods_shop',2,'mission',{fixedIncome:1})];
 const a=plan();
 let before=JSON.stringify(s);
 assert.equal(G.executeDelivery(s,{...a,drops:[{kind:'contraband-sale',id:'W',routeIndex:0,materials:[G.CONTRABAND_CARGO]}]}).ok,false);
 assert.equal(JSON.stringify(s),before);
 assert.equal(G.executeDelivery(s,{...a,route:['soma','park','mission']}).ok,false);
 assert.equal(JSON.stringify(s),before);
 s.players[0].capital=0;before=JSON.stringify(s);
 assert.equal(G.executeDelivery(s,a).reason,'capital');
 assert.equal(JSON.stringify(s),before);
 s.players[0].capital=100;s.constructions[0].contrabandStock=0;before=JSON.stringify(s);
 assert.equal(G.executeDelivery(s,a).reason,'source-stock');
 assert.equal(JSON.stringify(s),before);
});

test('cannot smuggle twice per activation or put purple cargo in regular store and yard',()=>{
 const s=state();
 s.constructions=[built('W','customs_warehouse',1,'soma',{contrabandStock:2}),
   built('S','rare_goods_shop',2,'soma',{fixedIncome:2}),
   built('R','warehouse',0,'soma',{warehouseInventory:[]})];
 const a=plan({route:['soma']});
 assert.equal(G.executeDelivery(s,a).ok,true);
 assert.equal(G.validateDeliveryPlan(s,a).reason,'delivery-once-per-activation');
 s.developmentSlotsUsed[0]=1;
 assert.equal(G.validateDeliveryPlan(s,a).ok,true);
 const wrong={...a,drops:[{kind:'warehouse',id:'R',materials:[G.CONTRABAND_CARGO],routeIndex:0}]};
 assert.equal(G.validateDeliveryPlan(s,wrong).reason,'target-material');
 const yard={...a,route:['soma','western'],drops:[{kind:'freight-yard',id:'freightyard',routeIndex:1,materials:[G.CONTRABAND_CARGO]}]};
 assert.equal(G.validateDeliveryPlan(s,yard).ok,false);
});

test('at three stars require explicit offender, then settle reward before arrest, never pay failed choice',()=>{
 const s=state();s.constructions=[built('W','customs_warehouse',1,'soma',{contrabandStock:2}),
   built('S','rare_goods_shop',2,'soma',{fixedIncome:1})];
 s.players[0].influence=0;
 G.setSuspicion(s,0,3);
 const a=plan({route:['soma']});
 const before=JSON.stringify(s);
 assert.equal(G.executeDelivery(s,a).reason,'arrest-worker');
 assert.equal(JSON.stringify(s),before);
 const id=s.players[0].workers[1].id;
 const r=G.executeDelivery(s,{...a,arrestWorkerId:id});
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.arrested,true);
 assert.equal(s.players[0].capital,100+6-3,'shipper gains after freight despite arrest');
 assert.equal(s.players[1].capital,101);assert.equal(s.players[2].capital,101);
 assert.equal(s.players[0].workers[1].jailed,true);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].prestige,-3);
});

test('replenish on new year caps at two, never adds to leftover 1 cube',()=>{
 const s=state();s.constructions=[built('W','customs_warehouse',1,'soma',{contrabandStock:1})];
 // The transition uses the ordinary income->upkeep path; test the published
 // six-year transition rather than calling inaccessible internal helpers.
 s.round=1;s.developmentComplete=true;
 s.phase='development';s.developmentPlayer=null;
 s.market=[];s.deck=[];s.newsLastResolvedRound=1;s.crimeAssessedRound=1;
 s.players.forEach(p=>{p.suspicion=0;p.workers.forEach(w=>{w.used=true;});});
 const r=G.cleanupMarket(s,{rng:()=>0.2});
 assert.equal(r.ok,true,r.reason);
 assert.equal(s.round,2);
 assert.equal(s.constructions[0].contrabandStock,2);
});
