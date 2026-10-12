import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
  const s=G.createInitialState({rng:()=>0.12});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.players.forEach(p=>p.capital=100);
  s.logisticsSupply.southernpacific=['Steel','Lumber','Masonry','Lumber'];
  s.logisticsSupply.pacificmail=['Steel','Masonry','Lumber','Masonry'];
  s.logisticsSupply.broadway=['Steel','Steel','Lumber'];
  s.constructions=[{id:'W1',playerId:0,projectId:'warehouse',districtId:'soma',
    status:'complete',warehouseInventory:[],materialsDelivered:[],startedRound:1,completedRound:1}];
  return s;
}
function path(a,b){
  const queue=[[a]],seen=new Set([a]);
  while(queue.length){
    const p=queue.shift(),end=p.at(-1);
    if(end===b)return p;
    for(const next of G.deliveryNeighbors(end))if(!seen.has(next)){seen.add(next);queue.push([...p,next]);}
  }
  throw new Error('no route '+a+' '+b);
}
function basic(s,extra={}){
 return {playerId:0,source:{kind:'node',id:'southernpacific'},haulerId:'standard',
 cargo:['Steel'],route:['soma'],drops:[{kind:'warehouse',id:'W1',routeIndex:0,materials:['Steel']}],...extra};
}

test('two sources in the same district cost one additional dollar and consume each stock once',()=>{
 const s=state();
 const plan=basic(s,{pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Masonry']}],
  drops:[{kind:'warehouse',id:'W1',routeIndex:0,materials:['Steel','Masonry']}]});
 const price=G.deliveryPlanCost(s,plan);
 assert.equal(price.materialCost,3);assert.equal(price.loadingCost,1);
 assert.equal(price.routeCost,0);assert.equal(price.total,7);
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.deepEqual(s.constructions[0].warehouseInventory,['Steel','Masonry']);
 assert.deepEqual(s.logisticsSupply.southernpacific,['Lumber','Masonry','Lumber']);
 assert.deepEqual(s.logisticsSupply.pacificmail,['Steel','Lumber','Masonry']);
 assert.equal(s.players[0].capital,93);
});
test('pickup must be on an actual route stop and cannot exceed source inventory',()=>{
 const s=state();const plan=basic(s,{pickups:[{source:{kind:'node',id:'broadway'},routeIndex:0,cargo:['Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'pickup-route');
 const repeated=basic(s,{pickups:[{source:{kind:'node',id:'southernpacific'},routeIndex:0,cargo:['Steel','Steel']}],
 drops:[{kind:'warehouse',id:'W1',routeIndex:0,materials:['Steel','Steel','Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,repeated).reason,'source-stock');
});
test('full hauler may unload and later refill without exceeding capacity along any route segment',()=>{
 const s=state(),toBroadway=path('soma','northbeach'),toMarina=path('northbeach','marina').slice(1);
 const route=[...toBroadway,...toMarina],at=route.indexOf('northbeach');
 const plan=basic(s,{cargo:['Steel','Lumber','Masonry'],
   route,pickups:[{source:{kind:'node',id:'broadway'},routeIndex:at,cargo:['Steel','Steel']}],
   drops:[{kind:'warehouse',id:'W1',routeIndex:0,materials:['Steel','Lumber','Masonry']},
     {kind:'export',id:'gas-house-cove',routeIndex:route.length-1,materials:['Steel','Steel']}]});
 s.players[0].mareIslandPartner=true;
 const check=G.validateDeliveryPlan(s,plan);
 assert.equal(check.ok,true,check.reason);
 assert.equal(check.cost.loadingCost,1);
 assert.equal(check.cost.exportRevenue,14);
 assert.equal(G.executeDelivery(s,plan).exported,2);
 assert.equal(s.players[0].mareIslandUsedRound,s.round);
 assert.equal(G.canExportMareIsland(s,0),false);
});
test('cannot unload export steel before it has been picked up or exceed capacity',()=>{
 const s=state();s.players[0].mareIslandPartner=true;
 const fromMarina=path('soma','marina'),plan=basic(s,{
   route:fromMarina,cargo:['Lumber'],
   pickups:[{source:{kind:'node',id:'broadway'},routeIndex:fromMarina.indexOf('northbeach'),cargo:['Steel']}],
   drops:[{kind:'export',id:'gas-house-cove',routeIndex:fromMarina.length-1,materials:['Steel']},
          {kind:'warehouse',id:'W1',routeIndex:0,materials:['Lumber']}]});
 if(plan.pickups[0].routeIndex>=0)assert.equal(G.validateDeliveryPlan(s,plan).ok,true);
 const bad=basic(s,{cargo:['Steel','Lumber','Masonry'],pickups:[{source:{kind:'node',id:'pacificmail'},routeIndex:0,cargo:['Steel']}],
   drops:[{kind:'warehouse',id:'W1',routeIndex:0,materials:['Steel','Steel','Lumber','Masonry']}]});
 assert.equal(G.validateDeliveryPlan(s,bad).reason,'capacity');
});
test('Mare Island export pays exactly $8 one-off or $7 partner and consumes one-off contracts',()=>{
 const s=state(),route=path('soma','marina');
 s.players[0].mareIslandOneOff=true;
 const plan=basic(s,{cargo:['Steel'],route,drops:[{kind:'export',id:'gas-house-cove',routeIndex:route.length-1,materials:['Steel']}]});
 assert.equal(G.deliveryPlanCost(s,plan).exportRevenue,8);
 const old=s.players[0].capital;
 const check=G.validateDeliveryPlan(s,plan);assert.equal(check.ok,true,check.reason);
 G.executeDelivery(s,plan);
 assert.equal(s.players[0].capital,old-check.cost.total+8);
 assert.equal(s.players[0].mareIslandOneOff,false);
 assert.equal(G.canExportMareIsland(s,0),false);
});
test('export is impossible without a signed agreement and is limited to two Steel',()=>{
 const s=state(),route=path('soma','marina');
 const plan=basic(s,{route,drops:[{kind:'export',id:'gas-house-cove',routeIndex:route.length-1,materials:['Steel']}]});
 assert.equal(G.validateDeliveryPlan(s,plan).reason,'export-unavailable');
 s.players[0].mareIslandPartner=true;
 const wrong=basic(s,{cargo:['Lumber'],route,drops:[{kind:'export',id:'gas-house-cove',routeIndex:route.length-1,materials:['Lumber']}]});
 assert.equal(G.validateDeliveryPlan(s,wrong).reason,'export-material');
});
test('Mare Island partnership requires completed industrial project and a reachable Ferry Building',()=>{
 const s=state(),w=s.players[0].workers[0];s.activeWorkerId=w.id;
 assert.equal(G.signMareIslandContract(s,0,'partner').reason,'industry-required');
 s.constructions.push({id:'F1',playerId:0,projectId:'factory',districtId:'mission',status:'complete',
 materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1});
 assert.equal(G.signMareIslandContract(s,0,'partner').ok,true);
 assert.equal(s.players[0].mareIslandPartner,true);
 assert.equal(s.ferryOfferTakenRound,s.round);
 assert.equal(G.signMareIslandContract(s,0,'one-off').ok,false);
});


test('a wagon can unload three cargo and load two new resources at the same intermediate stop',()=>{
 const s=state();
 s.constructions.push({id:'WN',playerId:0,projectId:'warehouse',districtId:'northbeach',status:'complete',
   warehouseInventory:[],materialsDelivered:[],startedRound:1,completedRound:1});
 s.players[0].mareIslandPartner=true;
 const route=[...path('soma','northbeach'),...path('northbeach','marina').slice(1)];
 const at=route.indexOf('northbeach');
 const plan=basic(s,{cargo:['Steel','Lumber','Masonry'],route,
   pickups:[{source:{kind:'node',id:'broadway'},routeIndex:at,cargo:['Steel','Steel']}],
   drops:[{kind:'warehouse',id:'WN',routeIndex:at,materials:['Steel','Lumber','Masonry']},
     {kind:'export',id:'gas-house-cove',routeIndex:route.length-1,materials:['Steel','Steel']}]});
 const check=G.validateDeliveryPlan(s,plan);assert.equal(check.ok,true,check.reason);
 assert.equal(check.cost.loadingCost,1);
 assert.equal(G.executeDelivery(s,plan).exported,2);
 assert.deepEqual(s.constructions.find(c=>c.id==='WN').warehouseInventory,['Steel','Lumber','Masonry']);
});
