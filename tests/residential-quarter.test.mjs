import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const quarter=G.projectById('residential_quarter');
function state(){
  const s=G.createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
  s.players.forEach(p=>{p.capital=100;p.prestige=0;p.portfolio=[];});
  s.constructions=[];
  return s;
}
const warehouse=(id,stock,playerId=0,districtId='civic')=>({
  id,playerId,projectId:'std_warehouse',districtId,status:'complete',
  materialsDelivered:['Lumber','Masonry','Steel'],warehouseInventory:[...stock],
  startedRound:1,completedRound:1
});

test('residential quarter is sixth pure Housing project, with two copies and no special action',()=>{
  assert.equal(G.PROJECTS.length,41);
  assert.equal(G.PROJECT_COPIES,2);
  const pool=G.createProjectCardPool({rng:()=>0.2});
  assert.equal(pool.length,82);
  assert.equal(pool.filter(c=>c.id==='residential_quarter').length,2);
  assert.deepEqual(G.projectTypes(quarter),['Жилое']);
  assert.equal(G.PROJECTS.filter(p=>G.projectTypes(p).length===1&&G.projectTypes(p)[0]==='Жилое').length,6);
  assert.deepEqual(quarter.materials,['Lumber','Lumber','Lumber','Masonry']);
  assert.equal(quarter.open,4);
  assert.equal(quarter.income,3);
  assert.equal(quarter.prestige,2);
  assert.deepEqual(quarter.risk,{earthquake:0,fire:1});
  assert.equal(quarter.landMin,undefined);
  assert.equal(quarter.accessAny,undefined);
  assert.equal(quarter.largeBuilding,undefined);
  assert.equal(G.LAND_VALUE_COMPLETION_CHANGE[quarter.id],undefined);
});

test('quarter requires a real construction action and pays the current land value',()=>{
  const s=state();
  s.players[0].portfolio=[quarter.id];
  const before=s.players[0].capital,land=s.districts.civic.landValue;
  assert.equal(G.constructionEligibility(s,0,quarter.id,'civic').ok,true);
  const r=G.beginConstruction(s,0,quarter.id,'civic');
  assert.equal(r.ok,true,r.reasons?.join('; '));
  assert.equal(s.players[0].capital,before-land);
  assert.deepEqual(s.players[0].portfolio,[]);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(r.construction.projectId,quarter.id);
  assert.equal(r.construction.status,'under-construction');
  assert.equal(r.construction.materialsDelivered.length,0);
  assert.equal(G.buildingIncome(s,0),0,'unfinished houses do not earn');
});

test('quarter finishes from real fourth-material delivery, without any warehouse',()=>{
  const s=state();
  const beforeLand=s.districts.soma.landValue;
  s.logisticsSupply.pacificmail=['Masonry'];
  const c={id:'Q',playerId:0,projectId:quarter.id,districtId:'soma',
    status:'under-construction',materialsDelivered:['Lumber','Lumber','Lumber'],
    warehouseInventory:[],startedRound:1,completedRound:null};
  s.constructions=[c]; // Intentionally no warehouses anywhere.
  assert.equal(G.canCompleteConstruction(s,'Q').ok,false,'three materials do not complete four-item recipe');
  assert.equal(G.buildingIncome(s,0),0);
  const plan={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',
    cargo:['Masonry'],route:['soma'],drops:[{kind:'construction',id:'Q',materials:['Masonry']}]};
  const valid=G.validateDeliveryPlan(s,plan);
  assert.equal(valid.ok,true,JSON.stringify(valid));
  const result=G.executeDelivery(s,plan);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(result.completed,['Q']);
  assert.equal(c.status,'complete','the fourth material finishes construction automatically');
  assert.deepEqual(c.materialsDelivered,quarter.materials);
  assert.equal(G.buildingIncome(s,0),3);
  assert.equal(s.players[0].prestige,2);
  assert.equal(s.districts.soma.landValue,beforeLand);
  assert.equal(G.completeConstruction(s,c).ok,false,'no second completion reward');
  assert.equal(s.players[0].prestige,2);
});

test('quarter also accepts four correct materials in one final Delivery, without storage',()=>{
  const s=state();
  s.logisticsSupply.pacificmail=['Lumber','Lumber','Lumber','Masonry'];
  const c={id:'Q',playerId:0,projectId:quarter.id,districtId:'soma',
    status:'under-construction',materialsDelivered:[],warehouseInventory:[],
    startedRound:1,completedRound:null};
  s.constructions=[c];
  const plan={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'freight5',
    cargo:[...quarter.materials],route:['soma'],
    drops:[{kind:'construction',id:'Q',materials:[...quarter.materials]}]};
  const check=G.validateDeliveryPlan(s,plan);
  assert.equal(check.ok,true,JSON.stringify(check));
  const result=G.executeDelivery(s,plan);
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(c.status,'complete');
  assert.equal(s.players[0].prestige,2);
});

test('storage in another district or another player warehouse cannot finish the quarter',()=>{
  const s=state();
  s.constructions=[{id:'Q',playerId:0,projectId:quarter.id,districtId:'civic',status:'under-construction',
    materialsDelivered:['Lumber','Lumber','Lumber'],warehouseInventory:[],startedRound:1,completedRound:null},
    warehouse('OTHER-DISTRICT',['Masonry'],0,'soma'),
    warehouse('OTHER-PLAYER',['Masonry'],1,'civic')];
  assert.equal(G.canCompleteConstruction(s,'Q').ok,false);
  assert.equal(G.completeConstruction(s,s.constructions[0]).ok,false);
  assert.equal(s.players[0].prestige,0);
});
