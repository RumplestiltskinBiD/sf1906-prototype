import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {researchCardById} from '../research-cards.js';

const clone=x=>JSON.parse(JSON.stringify(x));
const snapshot=x=>JSON.stringify(x);
const source=(kind,id)=>({kind,id});
const warehouse=(id,districtId,stock=[])=>({
  id,playerId:0,projectId:'warehouse',districtId,status:'complete',
  materialsDelivered:[],warehouseInventory:[...stock],startedRound:1,completedRound:1
});
function game({funded=true}={}){
  const s=G.createInitialState({rng:()=>0.15});
  if(s.newsH02Incident)s.newsH02Incident.resolvedRound=s.round;
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
  s.players.forEach(p=>p.capital=70);
  s.constructions=[warehouse('W','soma'),warehouse('MAR','marina'),warehouse('NORTH','northbeach')];
  s.logisticsSupply.southernpacific=['Lumber','Lumber','Steel','Masonry'];
  s.logisticsSupply.pacificmail=['Lumber','Steel','Lumber','Masonry'];
  s.logisticsSupply.broadway=['Lumber','Steel','Lumber'];
  if(funded)Object.assign(s.research.R07,{status:'funded',holderId:2,fundedRound:1});
  return s;
}
function plan({playerId=0,cargo=['Lumber'],from=source('node','southernpacific'),
  to='W',district='soma',haulerId='standard',pickups=[]}={}){
  const all=[...cargo,...pickups.flatMap(p=>p.cargo)];
  return {playerId,source:from,cargo,haulerId,route:[district],
    pickups,drops:[{kind:'warehouse',id:to,routeIndex:0,materials:all}]};
}
test('R07 registry is the approved global, permanent source-scoped surcharge',()=>{
 const c=researchCardById('R07');
 assert.equal(c.fundingCost,4);
 assert.deepEqual(c.sponsorReward,{vp:3,influence:1});
 assert.equal(c.effect.type,'citywide-lumber-purchase-price-increase');
 assert.equal(c.effect.resource,'Lumber');assert.equal(c.effect.unitPriceIncrease,1);
 assert.deepEqual(c.effect.appliesToSources,['logistics-node','neutral-supplier']);
 assert.equal(c.effect.appliesToAllPlayers,true);
 assert.equal(c.effect.starts,'immediately-after-financing');
 assert.equal(c.effect.previouslyPurchasedMaterials,'unchanged');
 assert.equal(c.effect.constructionRecipes,'unchanged');
 assert.equal(c.effect.earthquakeRisk,'unchanged');
});
test('unfunded and held R07 preserve every old material quote without mutation',()=>{
 const s=game({funded:false}),before=snapshot(s);
 for(const status of ['available','held']){
  Object.assign(s.research.R07,{status,holderId:status==='held'?0:null,fundedRound:null});
  const snap=snapshot(s);
  assert.equal(G.purchaseMaterialUnitPrice(s,source('node','southernpacific'),'Lumber'),1);
  assert.equal(G.purchaseMaterialUnitPrice(s,source('supplier','engle-lumber'),'Lumber'),3);
  assert.equal(G.deliveryMaterialCost(s,source('node','southernpacific'),['Lumber','Steel']).cost,3);
  assert.equal(G.deliveryMaterialCost(s,source('supplier','engle-lumber'),['Lumber','Lumber']).cost,6);
  assert.equal(snapshot(s),snap);
 }
 assert.notEqual(snapshot(s),before,'fixture holds R07 for the second iteration');
});
test('R07 funded changes only future Lumber unit purchase quotes, never Masonry/Steel',()=>{
 const s=game(),before=snapshot(s);
 for(const playerId of [0,1,2]){
   const node=source('node','southernpacific');
   assert.equal(G.purchaseMaterialUnitPrice(s,node,'Lumber'),2);
   assert.equal(G.purchaseMaterialUnitPrice(s,node,'Masonry'),1);
   assert.equal(G.purchaseMaterialUnitPrice(s,node,'Steel'),2);
   assert.deepEqual(G.deliveryMaterialCost(s,node,['Lumber','Lumber','Masonry','Steel'],playerId),
     {gross:7,discount:0,cost:7,procurementUsed:0});
 }
 assert.equal(G.purchaseMaterialUnitPrice(s,source('supplier','engle-lumber'),'Lumber'),4);
 assert.equal(G.deliverySourceInfo(s,0,source('supplier','engle-lumber')).unitPrice,4);
 assert.equal(G.deliveryMaterialCost(s,source('supplier','engle-lumber'),['Lumber','Lumber']).cost,8);
 assert.equal(G.purchaseMaterialUnitPrice(s,source('supplier','gray-quarry'),'Masonry'),3);
 assert.equal(G.purchaseMaterialUnitPrice(s,source('supplier','axford-iron'),'Steel'),5);
 assert.equal(snapshot(s),before,'all price selectors must be read-only');
});
test('R07 does not apply twice when read repeatedly, and survives JSON reload',()=>{
 const s=game();const reloaded=clone(s);
 for(let i=0;i<10;i++){
   assert.equal(G.deliveryMaterialCost(reloaded,source('node','southernpacific'),['Lumber']).gross,2);
   assert.equal(G.deliveryMaterialCost(reloaded,source('supplier','engle-lumber'),['Lumber']).gross,4);
 }
 assert.equal(s.research.R07.status,'funded');
 assert.equal(snapshot(reloaded),snapshot(s));
});
test('R07 ignores stored/purchased materials, factory production, stolen lot and recipes',()=>{
 const s=game();s.constructions.push({
   id:'I',playerId:0,projectId:'brickworks',districtId:'soma',status:'complete',industrialInventory:['Masonry','Masonry']
 });
 assert.equal(G.deliveryMaterialCost(s,source('warehouse','W'),['Lumber']).cost,0);
 assert.equal(G.deliveryMaterialCost(s,source('freight-yard','freightyard'),['Lumber']).cost,0);
 assert.equal(G.deliveryMaterialCost(s,source('industry','I'),['Masonry']).cost,1);
 assert.equal(G.deliveryMaterialCost(s,source('stolen','pacificmail'),['Lumber']).cost,0);
 assert.equal(G.purchaseMaterialUnitPrice(s,source('industry','I'),'Lumber'),0);
 assert.equal(G.projectById('tenement').materials.filter(x=>x==='Lumber').length,2);
 assert.deepEqual(G.RESOURCE_PRICES,{Lumber:1,Masonry:1,Steel:2});
});
test('source-aware pricing rejects unrelated neutral materials and invalid/nonpurchase sources',()=>{
 const s=game();
 assert.equal(G.purchaseMaterialUnitPrice(s,source('supplier','engle-lumber'),'Masonry'),0);
 assert.equal(G.purchaseMaterialUnitPrice(s,source('supplier','bogus'),'Lumber'),0);
 assert.equal(G.purchaseMaterialUnitPrice(s,source('warehouse','W'),'Lumber'),0);
 assert.equal(G.deliveryMaterialCost(s,source('supplier','engle-lumber'),['Masonry']).cost,0);
});
test('two Lumber from a node cost +$2 in a real validated Delivery and consume exact stock',()=>{
 const s=game(),p=plan({cargo:['Lumber','Lumber']});
 const quote=G.deliveryPlanCost(s,p);
 assert.equal(quote.materialGross,4);assert.equal(quote.materialCost,4);
 assert.equal(quote.total,7);assert.equal(quote.procurementDiscount,0);
 assert.equal(G.validateDeliveryPlan(s,p).ok,true);
 const before=s.players[0].capital;
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,before-7);
 assert.deepEqual(s.constructions.find(c=>c.id==='W').warehouseInventory,['Lumber','Lumber']);
 assert.deepEqual(s.logisticsSupply.southernpacific,['Steel','Masonry']);
});
test('real supplier delivery of two Lumber charges $8 plus unchanged transport',()=>{
 const s=game(),p=plan({from:source('supplier','engle-lumber'),cargo:['Lumber','Lumber'],
   to:'MAR',district:'marina',haulerId:'dray2a'});
 const c=G.deliveryPlanCost(s,p);
 assert.equal(c.materialGross,8);assert.equal(c.materialCost,8);
 assert.equal(c.haulerCost,0);assert.equal(c.total,8);
 assert.equal(G.validateDeliveryPlan(s,p).ok,true);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,62);
 assert.deepEqual(s.constructions.find(x=>x.id==='MAR').warehouseInventory,['Lumber','Lumber']);
 assert.equal(G.deliverySourceInfo(s,0,source('supplier','engle-lumber')).unlimited,true);
});
test('R07 increased price blocks underfunded real Delivery atomically before any stock removal',()=>{
 const s=game(),p=plan({from:source('supplier','engle-lumber'),cargo:['Lumber','Lumber'],
   to:'MAR',district:'marina',haulerId:'dray2a'});
 s.players[0].capital=7;
 const before=snapshot(s);
 const fail=G.executeDelivery(s,p);
 assert.equal(fail.ok,false);assert.equal(fail.reason,'capital');
 assert.equal(snapshot(s),before,'failed purchase must not change money, supply or action');
 s.players[0].capital=8;
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,0);
});
test('multi-source mixed Delivery adds exactly $1 for each node Lumber, never again at drop',()=>{
 const s=game();
 const p=plan({cargo:['Lumber','Steel'],pickups:[
   {source:source('node','pacificmail'),routeIndex:0,cargo:['Lumber']} ]});
 const c=G.deliveryPlanCost(s,p);
 assert.equal(c.materialGross,6);assert.equal(c.loadingCost,1);
 assert.equal(c.procurementDiscount,0);assert.equal(c.materialCost,6);
 assert.equal(c.total,10);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,60);
 assert.deepEqual(s.constructions.find(x=>x.id==='W').warehouseInventory,['Lumber','Steel','Lumber']);
 assert.equal(s.logisticsSupply.southernpacific.includes('Lumber'),true,'another unit remains');
 assert.equal(s.logisticsSupply.pacificmail.filter(x=>x==='Lumber').length,1);
});
test('Procurement makes the most expensive adjusted NODE cube free exactly once',()=>{
 const s=game();s.procurementRemaining=1;
 const p=plan({cargo:['Lumber','Steel']});
 const c=G.deliveryPlanCost(s,p);
 assert.equal(c.materialGross,4);
 assert.equal(c.procurementDiscount,2);
 assert.equal(c.procurementUsed,1);
 assert.equal(c.materialCost,2);
 assert.equal(c.total,5);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.players[0].capital,65);
 assert.equal(s.procurementRemaining,0);
});
test('mixed two-stop Procurement uses adjusted prices once across all node pickups',()=>{
 const s=game();s.procurementRemaining=2;
 const p=plan({cargo:['Lumber','Steel'],pickups:[
   {source:source('node','pacificmail'),routeIndex:0,cargo:['Lumber']} ]});
 const c=G.deliveryPlanCost(s,p);
 assert.equal(c.materialGross,6);
 assert.equal(c.procurementDiscount,4);
 assert.equal(c.procurementUsed,2);
 assert.equal(c.materialCost,2);
 assert.equal(c.total,6);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.procurementRemaining,0);
});
test('Procurement covers supplier Lumber at R07 adjusted prices',()=>{
 const s=game();s.procurementRemaining=2;
 const p=plan({from:source('supplier','engle-lumber'),cargo:['Lumber','Lumber'],
   to:'MAR',district:'marina',haulerId:'dray2a'});
 const c=G.deliveryPlanCost(s,p);
 assert.equal(c.materialGross,8);
 assert.equal(c.procurementDiscount,8);
 assert.equal(c.procurementUsed,2);
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.equal(s.procurementRemaining,0);
 assert.equal(s.players[0].capital,70);
});
test('old purchased warehouse Lumber can move without surcharge after R07 funding',()=>{
 const s=game();s.constructions[0].warehouseInventory=['Lumber'];
 s.constructions.push(warehouse('W2','soma'));
 const p=plan({from:source('warehouse','W'),to:'W2',cargo:['Lumber']});
 const c=G.deliveryPlanCost(s,p);
 assert.equal(c.materialGross,0);assert.equal(c.materialCost,0);
 assert.equal(c.total,3,'transport remains payable');
 assert.equal(G.executeDelivery(s,p).ok,true);
 assert.deepEqual(s.constructions.find(x=>x.id==='W2').warehouseInventory,['Lumber']);
});
test('research sponsor gets 3 VP + 1 influence and $4 cost, only when funded; price increases instantly',()=>{
 const s=game({funded:false});
 s.players[0].capital=30;
 s.activeWorkerId=s.players[0].workers[0].id;
 Object.assign(s.research.R07,{status:'held',holderId:0,fundedRound:null});
 const before={cash:s.players[0].capital,vp:s.players[0].prestige,inf:s.players[0].influence};
 assert.equal(G.purchaseMaterialUnitPrice(s,source('node','southernpacific'),'Lumber'),1);
 const funded=G.fundResearch(s,0,'R07');
 assert.equal(funded.ok,true,JSON.stringify(funded));
 assert.equal(s.players[0].capital,before.cash-4);
 assert.equal(s.players[0].prestige,before.vp+3);
 assert.ok(s.players[0].influence>before.inf);
 assert.equal(G.purchaseMaterialUnitPrice(s,source('node','southernpacific'),'Lumber'),2);
 const state=snapshot(s);
 assert.equal(G.fundResearch(s,0,'R07').reason,'already-funded');
 assert.equal(snapshot(s),state);
});
test('after JSON reload, R07 remains global to other buyers without new state fields',()=>{
 const s=game();const restored=clone(s);
 restored.developmentPlayer=1;
 restored.constructions[0].playerId=1;
 const p=plan({playerId:1,cargo:['Lumber'],to:'W'});
 assert.equal(G.deliveryPlanCost(restored,p).materialGross,2);
 assert.equal(G.validateDeliveryPlan(restored,p).ok,true);
 assert.equal(G.executeDelivery(restored,p).ok,true);
 assert.equal(restored.players[1].capital,65);
 assert.equal(restored.players[0].capital,70);
 assert.equal(restored.players[2].capital,70);
 assert.equal(restored.research.R07.holderId,2);
});
test('unfunded saves and invalid R07 card statuses preserve old multi-source pricing',()=>{
 const s=game({funded:false});
 const p=plan({cargo:['Lumber','Steel'],pickups:[
   {source:source('node','pacificmail'),routeIndex:0,cargo:['Lumber']} ]});
 const before=snapshot(s);
 assert.equal(G.deliveryPlanCost(s,p).materialGross,4);
 assert.equal(G.deliveryPlanCost(s,p).total,8);
 assert.equal(snapshot(s),before);
});
