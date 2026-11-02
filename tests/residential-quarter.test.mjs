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
  assert.equal(G.PROJECTS.length,39);
  assert.equal(G.PROJECT_COPIES,2);
  const pool=G.createProjectCardPool({rng:()=>0.2});
  assert.equal(pool.length,78);
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

test('four-unit recipe needs one local warehouse material, then grants only income and two VP once',()=>{
  const s=state(); const beforeLand=s.districts.civic.landValue;
  const c={id:'Q',playerId:0,projectId:quarter.id,districtId:'civic',
    status:'under-construction',materialsDelivered:['Lumber','Lumber','Lumber'],
    warehouseInventory:[],startedRound:1,completedRound:null};
  s.constructions=[c];
  const incomplete=G.canCompleteConstruction(s,'Q');
  assert.equal(incomplete.ok,false);
  assert.equal(incomplete.reason,'warehouse-required');
  assert.equal(incomplete.missing.Masonry,1);
  s.constructions.push(warehouse('W',['Masonry']));
  assert.equal(G.canCompleteConstruction(s,'Q').ok,true);
  const finished=G.completeConstruction(s,c);
  assert.equal(finished.ok,true,finished.reason);
  assert.equal(c.status,'complete');
  assert.equal(s.constructions[1].warehouseInventory.length,0,'stored brick is consumed');
  assert.equal(G.buildingIncome(s,0),3,'income comes from finished quarter only');
  assert.equal(s.players[0].prestige,2);
  assert.equal(s.districts.civic.landValue,beforeLand,'no disguised land refund or value change');
  assert.equal(G.completeConstruction(s,c).ok,false,'repeat completion blocked');
  assert.equal(s.players[0].prestige,2);
  assert.equal(G.buildingIncome(s,0),3);
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
