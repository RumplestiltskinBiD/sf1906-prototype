import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
 const s=G.createInitialState({rng:()=>0.1});s.phase='development';s.view='city';
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.players.forEach(p=>p.capital=70);
 s.logisticsSupply.southernpacific=['Steel','Steel','Lumber','Masonry'];
 s.logisticsSupply.pacificmail=['Masonry','Lumber','Steel','Masonry'];
 s.logisticsSupply.broadway=['Steel','Steel','Lumber'];
 s.constructions=[building('SOMA','soma'),building('MISSION','mission'),building('NORTH','northbeach'),building('MARINA','marina')];
 return s;
}
function building(id,districtId){
 return {id,playerId:0,projectId:'warehouse',districtId,status:'complete',
   materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1};
}
function route(a,b){
 const queue=[[a]],seen=new Set([a]);while(queue.length){
  const p=queue.shift(),last=p.at(-1);if(last===b)return p;
  for(const n of G.deliveryNeighbors(last))if(!seen.has(n)){seen.add(n);queue.push([...p,n]);}
 }throw Error('No path: '+a+' to '+b);
}
function delivery({cargo=['Steel'],source={kind:'node',id:'southernpacific'},route:road=['soma'],pickups=[],drops=[{kind:'warehouse',id:'SOMA',materials:cargo,routeIndex:road.length-1}],haulerId='standard'}={}){
 return {playerId:0,source,cargo,haulerId,route:road,pickups,drops};
}
test('base legacy one-source delivery is valid and carries no loading surcharge',()=>{
 const s=state(),plan=delivery();
 const c=G.deliveryPlanCost(s,plan);
 assert.equal(c.loadingCost,0);assert.equal(c.total,5);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Steel']);
});
test('second source in same district costs $1 for the stop, regardless of units loaded',()=>{
 const s=state(),plan=delivery({
 cargo:['Steel'],pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Masonry','Lumber']}],
 drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Steel','Masonry','Lumber']}]});
 const p=G.deliveryPlanCost(s,plan);
 assert.equal(p.materialCost,4);assert.equal(p.haulerCost,3);assert.equal(p.loadingCost,1);assert.equal(p.total,8);
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.equal(s.players[0].capital,62);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Steel','Masonry','Lumber']);
});
test('same source and same route index cannot be split into duplicate pickup records',()=>{
 const s=state(),plan=delivery({
 pickups:[{source:{kind:'node',id:'southernpacific'},routeIndex:0,cargo:['Lumber']}],
 drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Steel','Lumber']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'duplicate-pickup');
 const withThird=delivery({
 pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Masonry']},{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Lumber']}],
 drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Steel','Masonry','Lumber']}]});
 assert.equal(G.validateDeliveryPlan(s,withThird).reason,'duplicate-pickup');
});
test('same source after physical return is a legal second loading stop for $1',()=>{
 const s=state(),road=['soma','mission','soma'];
 const plan=delivery({route:road,
 pickups:[{source:{kind:'node',id:'southernpacific'},routeIndex:2,cargo:['Steel']}],
 drops:[{kind:'warehouse',id:'MISSION',routeIndex:1,materials:['Steel']},{kind:'warehouse',id:'SOMA',routeIndex:2,materials:['Steel']}]});
 const c=G.deliveryPlanCost(s,plan);
 assert.equal(c.loadingCost,1);assert.equal(c.routeCost,2);
 assert.equal(c.materialCost,4);assert.equal(c.total,10);
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.deepEqual(s.constructions.find(c=>c.id==='MISSION').warehouseInventory,['Steel']);
 assert.deepEqual(s.constructions.find(c=>c.id==='SOMA').warehouseInventory,['Steel']);
 assert.equal(s.logisticsSupply.southernpacific.filter(x=>x==='Steel').length,0);
});
test('full wagon cannot add more cargo without unloading first',()=>{
 const s=state(),road=route('soma','mission');
 const plan=delivery({cargo:['Steel','Lumber','Masonry'],route:road,
 pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Masonry']}],
 drops:[{kind:'warehouse',id:'MISSION',routeIndex:road.length-1,materials:['Steel','Lumber','Masonry','Masonry']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'capacity');
});
test('unload at an intermediate stop then refill before leaving with total transported > capacity',()=>{
 const s=state(),road=[...route('soma','northbeach'),...route('northbeach','marina').slice(1)];
 const nb=road.indexOf('northbeach');
 const plan=delivery({cargo:['Steel','Lumber','Masonry'],route:road,
 pickups:[{source:{kind:'node',id:'broadway'},routeIndex:nb,cargo:['Steel','Steel']}],
 drops:[{kind:'warehouse',id:'NORTH',routeIndex:nb,materials:['Steel','Lumber','Masonry']},
 {kind:'warehouse',id:'MARINA',routeIndex:road.length-1,materials:['Steel','Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.deepEqual(s.constructions.find(c=>c.id==='NORTH').warehouseInventory,['Steel','Lumber','Masonry']);
 assert.deepEqual(s.constructions.find(c=>c.id==='MARINA').warehouseInventory,['Steel','Steel']);
});
test('cannot unload before material has been purchased and picked up',()=>{
 const s=state(),road=['soma','mission','soma'];
 const plan=delivery({cargo:['Lumber'],route:road,
 pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:2,cargo:['Steel']}],
 drops:[{kind:'warehouse',id:'MISSION',routeIndex:1,materials:['Steel']},
 {kind:'warehouse',id:'SOMA',routeIndex:2,materials:['Lumber']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'unload-before-pickup');
});
test('reject pickups that are not on route and never charge forbidden shortcuts through park',()=>{
 const s=state(),plan=delivery({pickups:[{source:{kind:'node',id:'broadway'},routeIndex:0,cargo:['Steel']}],
 drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Steel','Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'pickup-route');
 const bad=delivery({route:['soma','park'],drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,bad).reason,'route');
});
test('aggregate resource stocks across visits and reject overdraw without state mutation',()=>{
 const s=state(),road=['soma','mission','soma'];
 const plan=delivery({cargo:['Steel','Steel'],route:road,
 pickups:[{source:{kind:'node',id:'southernpacific'},routeIndex:2,cargo:['Steel']}],
 drops:[{kind:'warehouse',id:'MISSION',routeIndex:1,materials:['Steel','Steel']},
 {kind:'warehouse',id:'SOMA',routeIndex:2,materials:['Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'source-stock');
 const before=JSON.stringify(s);
 assert.equal(G.executeDelivery(s,plan).ok,false);
 assert.equal(JSON.stringify(s),before);
});
test('procurement discounts all relevant node pickups exactly once',()=>{
 const s=state();s.procurementRemaining=1;
 const plan=delivery({cargo:['Lumber'],
 pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Steel']}],
 drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Lumber','Steel']}]});
 const cost=G.deliveryPlanCost(s,plan);
 assert.equal(cost.materialGross,3);
 assert.equal(cost.procurementDiscount,2);
 assert.equal(cost.procurementUsed,1);
 assert.equal(cost.total,5);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.equal(s.procurementRemaining,0);
});
test('save/reload keeps inventories, route costs and legacy shape stable',()=>{
 const s=state(),plan=delivery({cargo:['Steel'],pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Masonry']}],
 drops:[{kind:'warehouse',id:'SOMA',routeIndex:0,materials:['Steel','Masonry']}]});
 const clone=JSON.parse(JSON.stringify(s));
 assert.equal(G.executeDelivery(clone,plan).ok,true);
 const restored=JSON.parse(JSON.stringify(clone));
 assert.deepEqual(restored.logisticsSupply,clone.logisticsSupply);
 assert.equal(restored.players[0].capital,clone.players[0].capital);
 assert.equal(restored.constructions[0].warehouseInventory.length,2);
 assert.equal(restored.version,'0.44');
});
