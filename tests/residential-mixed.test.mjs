import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import * as C from '../catastrophe-core.js';

function game(pid=0){
 const s=G.createInitialState({rng:()=>0.18});
 s.phase='development';s.view='city';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[pid].workers[0].id;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
 s.constructions=[];return s;
}
function built(id,projectId,playerId=0,districtId='northbeach',more={}){
 return {id,projectId,playerId,districtId,status:'complete',completedRound:1,startedRound:1,
  materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],...more};
}
const delivery=(dropId,materials=['Lumber'],playerId=0)=>({
 playerId,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:materials,
 route:['northbeach'],drops:[{kind:'bakery',id:dropId,routeIndex:0,materials}]
});

test('catalog and auction contain two copies of each mixed card with exact draft balance',()=>{
 const bakery=G.projectById('bakery'),orphanage=G.projectById('orphanage');
 assert.deepEqual(bakery.types,['Жилое','Торговое']);assert.deepEqual(orphanage.types,['Жилое','Общественное']);
 assert.deepEqual(bakery.materials,['Lumber','Lumber','Masonry']);
 assert.deepEqual(orphanage.materials,['Lumber','Masonry','Masonry','Steel']);
 assert.equal(bakery.open,4);assert.equal(bakery.prestige,1);assert.equal(bakery.income,0);
 assert.deepEqual(bakery.risk,{earthquake:0,fire:2});
 assert.equal(orphanage.open,4);assert.equal(orphanage.prestige,3);assert.equal(orphanage.income,0);
 assert.deepEqual(orphanage.risk,{earthquake:1,fire:0});
 for(const id of ['bakery','orphanage'])assert.equal(G.createProjectCardPool({rng:()=>0.13}).filter(c=>c.id===id).length,2);
});
test('orphanage completion gives exactly 3 VP + one influence step and obeys mixed goal categories',()=>{
 const s=game();s.players[0].influence=5;s.players[1].influence=6;s.players[2].influence=9;
 const con=built('O','orphanage',0,'civic',{status:'under-construction'});
 s.constructions=[con];const before=s.players[0].prestige;
 const done=G.completeConstruction(s,con);
 assert.equal(done.ok,true,done.reason);
 assert.equal(s.players[0].prestige,before+3);
 assert.equal(s.players[0].influence,7,'leapfrog skips occupied influence position');
 assert.equal(G.completeConstruction(s,con).ok,false);
 assert.equal(s.players[0].prestige,before+3);
 assert.equal(s.players[0].influence,7);
 assert.deepEqual(G.projectTypes('orphanage'),['Жилое','Общественное']);
 assert.equal(G.serviceFamilyForProject('orphanage'),null,'cannot impersonate real services');
});
test('bakery refuses use without stock, accepts only owner in own activation, and produces money or VP once per year',()=>{
 const s=game(),b=built('B','bakery');s.constructions=[b];
 assert.equal(G.activateBakery(s,0,'B','cash').reason,'lumber');
 b.bakeryInventory=['Lumber'];
 const cash=s.players[0].capital,prestige=s.players[0].prestige;
 assert.equal(G.activateBakery(s,1,'B','cash').ok,false,'cannot activate foreign bakery');
 assert.equal(G.activateBakery(s,0,'B','invalid').reason,'choice');
 assert.equal(G.activateBakery(s,0,'B','cash').ok,true);
 assert.equal(s.players[0].capital,cash+7);assert.equal(s.players[0].prestige,prestige);
 assert.deepEqual(b.bakeryInventory,[]);assert.equal(b.bakeryUsedRound,s.round);
 b.bakeryInventory=['Lumber'];assert.equal(G.activateBakery(s,0,'B','vp').reason,'already-used');
 s.round=2;assert.equal(G.activateBakery(s,0,'B','vp').ok,true);
 assert.equal(s.players[0].prestige,prestige+1);assert.equal(s.players[0].capital,cash+7);
 s.developmentPlayer=1;assert.equal(G.activateBakery(s,0,'B','cash').reason,'not-active-player');
 assert.equal(s.players[0].workersLeft,3,'a fast action does not spend a worker');
});
test('bakery can consume Lumber from own same-district warehouse but not rival or distant stock',()=>{
 const s=game(),b=built('B','bakery'),ours=built('W','warehouse',0,'northbeach',{warehouseInventory:['Lumber','Masonry']}),
 rival=built('R','warehouse',1,'northbeach',{warehouseInventory:['Lumber']}),
 remote=built('F','std_warehouse',0,'civic',{warehouseInventory:['Lumber']});
 s.constructions=[b,ours,rival,remote];
 assert.deepEqual(G.bakeryFuelSources(s,0,'B'),[{kind:'warehouse',id:'W'}]);
 const r=G.activateBakery(s,0,'B','vp',{kind:'warehouse',id:'W'});
 assert.equal(r.ok,true);assert.deepEqual(ours.warehouseInventory,['Masonry']);
 assert.deepEqual(rival.warehouseInventory,['Lumber']);assert.deepEqual(remote.warehouseInventory,['Lumber']);
});
test('real delivery stores one Lumber in bakery, rejects steel, overflow, rival targets and impossible routes',()=>{
 const s=game();const b=built('B','bakery');s.constructions=[b];
 s.logisticsSupply.broadway=['Lumber','Masonry','Steel'];
 const valid=delivery('B');
 assert.equal(G.validateDeliveryPlan(s,valid).ok,true);
 const before=s.players[0].capital;
 const done=G.executeDelivery(s,valid);assert.equal(done.ok,true,done.reason);
 assert.deepEqual(b.bakeryInventory,['Lumber']);
 assert.ok(s.players[0].capital<before,'purchase and route were paid');
 assert.equal(G.validateDeliveryPlan(s,valid).reason,'delivery-once-per-activation');
 s.developmentSlotsUsed[0]=1; // next activation for target validation
 s.logisticsSupply.broadway.push('Lumber');
 assert.equal(G.validateDeliveryPlan(s,valid).reason,'target-capacity');
 assert.equal(G.validateDeliveryPlan(s,delivery('B',['Steel'])).reason,'target-material');
 assert.equal(G.validateDeliveryPlan(s,{...delivery('B'),route:['northbeach','park']}).ok,false);
 s.constructions=[built('OTHER','bakery',1)];assert.equal(G.validateDeliveryPlan(s,delivery('OTHER')).reason,'target');
});
test('separate bakeries cannot consume each others stocks and both may act once',()=>{
 const s=game(),one=built('B1','bakery',0,'northbeach',{bakeryInventory:['Lumber']}),two=built('B2','bakery',0,'civic',{bakeryInventory:['Lumber']});
 s.constructions=[one,two];const cash=s.players[0].capital;
 assert.equal(G.activateBakery(s,0,'B1','cash').ok,true);
 assert.equal(G.activateBakery(s,0,'B2','cash').ok,true);
 assert.equal(s.players[0].capital,cash+14);
 assert.equal(G.activateBakery(s,0,'B1','cash').ok,false);
});
test('catastrophe survival: damaged is rewarded, destroyed or burning is not; settlement is idempotent',()=>{
 const s=game(),o1=built('O1','orphanage',0,'outerrichmond'),o2=built('O2','orphanage',1,'soma');
 s.constructions=[o1,o2];
 const inp=C.fromGame(s);
 for(const id of C.DISTRICT_IDS)inp[id]={z:0,p:0,firehouse:false};
 inp.outerrichmond={z:2,p:0,firehouse:false}; // quake damage, too distant from SoMa blaze
 inp.soma={z:3,p:0,firehouse:false}; // quake destruction and source of fire
 const sim=C.run(C.begin(inp));
 assert.equal(sim.nodes.outerrichmond.quake,'damaged');
 assert.equal(sim.nodes.outerrichmond.burning,false);
 assert.equal(sim.nodes.soma.burning,true);
 const before=s.players[0].prestige;
 const report=C.orphanageSurvivalResults(s,sim);
 assert.deepEqual(report.entries.map(x=>x.bonus),[4,0]);
 assert.equal(C.awardOrphanageSurvivalVp(s,sim).prestige,4);
 assert.equal(s.players[0].prestige,before+4);assert.equal(s.players[1].prestige,0);
 assert.equal(C.awardOrphanageSurvivalVp(s,sim).prestige,0,'no double award');
 assert.equal(o1.orphanageSurvivalVpAwarded,true);assert.equal(o2.orphanageSurvivalVpAwarded,true);
});
test('catastrophe survival cannot award before fires have finished',()=>{
 const s=game();s.constructions=[built('O','orphanage')];
 const sim=C.begin(C.fromGame(s));
 sim.done=false;
 assert.equal(C.awardOrphanageSurvivalVp(s,sim).reason,'simulation-incomplete');
 assert.equal(s.players[0].prestige,0);
});
