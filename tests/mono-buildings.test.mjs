import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=null;s.activationMainActionUsed=false;s.actionSpaceOccupancy={};
  s.constructions=[];s.players.forEach(p=>{p.capital=100;p.prestige=0;p.portfolio=[];});
  return s;
}
function construction(id,playerId,projectId,districtId,{status='complete',materials=null,warehouse=[]}={}){
  return {id,playerId,projectId,districtId,status,
    materialsDelivered:materials??(status==='complete'?[...G.projectById(projectId).materials]:[]),
    warehouseInventory:[...warehouse],completedRound:status==='complete'?1:null,startedRound:1};
}
function finish(s,id,pid,projectId,district){
  const c=construction(id,pid,projectId,district,{status:'under-construction',materials:[...G.projectById(projectId).materials]});
  s.constructions.push(c);
  return G.completeConstruction(s,c);
}

test('customs and rare-goods additions expand trading and mixed catalog; two-copy pool',()=>{
  assert.equal(G.PROJECTS.length,35);
  assert.equal(G.PROJECT_COPIES,2);
  const pool=G.createProjectCardPool({rng:()=>0.1});
  assert.equal(pool.length,70);
  for(const card of G.PROJECTS){
    assert.equal(pool.filter(c=>c.id===card.id).length,2,card.id);
  }
  for(const category of G.BUILDING_TYPES){
    const pure=G.PROJECTS.filter(p=>G.projectTypes(p).length===1&&G.projectTypes(p)[0]===category);
    assert.equal(pure.length,category==='Торговое'?6:5,category);
  }
  assert.equal(G.PROJECTS.filter(p=>G.projectTypes(p).length===2).length,9);
});

test('new mono-type card recipes, income, prestige, hazards and large-building rules',()=>{
  const spec=[
    ['wholesale_market',3,1,1,0,2,['Lumber','Lumber','Masonry']],
    ['commission_house',4,2,1,0,1,['Lumber','Masonry','Steel']],
    ['pub',3,2,1,0,1,['Lumber','Masonry','Masonry']],
    ['skyscraper',7,7,4,0,1,['Lumber','Masonry','Masonry','Steel','Steel','Steel']]
  ];
  for(const [id,open,income,prestige,earthquake,fire,materials] of spec){
    const p=G.projectById(id);
    assert.equal(p.open,open,id);
    assert.equal(p.income,income,id);
    assert.equal(p.prestige,prestige,id);
    assert.deepEqual(p.risk,{earthquake,fire},id);
    assert.deepEqual(p.materials,materials,id);
  }
  assert.equal(G.projectById('skyscraper').landMin,3);
  assert.equal(G.projectById('skyscraper').largeBuilding,true);
  assert.equal(G.projectById('pub').types[0],'Торговое');
});

test('wholesale market gets $3 for a new category in its own district; no duplicate-category windfall',()=>{
  const s=state();
  s.constructions=[construction('M1',0,'wholesale_market','civic')];
  const before=s.players[0].capital;
  assert.equal(finish(s,'R1',1,'tenement','civic').ok,true);
  assert.equal(s.players[0].capital,before+3);
  assert.equal(finish(s,'R2',1,'cottages','civic').ok,true);
  assert.equal(s.players[0].capital,before+3);
  assert.equal(finish(s,'S1',1,'school','civic').ok,true);
  assert.equal(s.players[0].capital,before+6);
  assert.equal(finish(s,'C1',1,'club','civic').ok,true);
  // Club adds Business but Trading already existed: one payment.
  assert.equal(s.players[0].capital,before+9);
});
test('market construction does not pay for itself or earlier categories',()=>{
  const s=state();
  s.constructions=[construction('R1',1,'tenement','civic')];
  const base=s.players[0].capital;
  assert.equal(finish(s,'M1',0,'wholesale_market','civic').ok,true);
  assert.equal(s.players[0].capital,base);
  assert.equal(finish(s,'R2',1,'cottages','civic').ok,true);
  assert.equal(s.players[0].capital,base);
});
test('commission house sells any hand card for $4 as a main action and locks its space',()=>{
  const s=state();
  s.players[0].portfolio=['tenement','school'];
  s.constructions=[construction('H1',1,'commission_house','civic')];
  s.activeWorkerId=s.players[0].workers[0].id;
  const result=G.useCommissionHouse(s,0,'H1',1);
  assert.equal(result.ok,true);
  assert.equal(result.projectId,'school');
  assert.equal(s.players[0].capital,104);
  assert.deepEqual(s.players[0].portfolio,['tenement']);
  assert.equal(s.actionSpaceOccupancy.H1,0);
  assert.equal(s.players[0].workers[0].used,true);
  assert.ok(s.expired.some(x=>x.id==='school'));
  // A fresh worker cannot bypass the used building-action slot.
  s.activationMainActionUsed=false;
  s.activeWorkerId=s.players[0].workers[1].id;
  assert.equal(G.useCommissionHouse(s,0,'H1',0).reason,'occupied');
});
test('commission house validates available cards before consuming worker',()=>{
  const s=state();
  s.constructions=[construction('H1',0,'commission_house','civic')];
  s.activeWorkerId=s.players[0].workers[0].id;
  assert.equal(G.useCommissionHouse(s,0,'H1',0).reason,'no-project');
  assert.equal(s.players[0].workers[0].used,false);
  assert.equal(s.activationMainActionUsed,false);
});
test('skyscraper fills one district slot, needs warehouse for six materials, adds $7 annual income',()=>{
  const s=state(),p=G.projectById('skyscraper');
  const pending=construction('SK1',0,'skyscraper','civic',{status:'under-construction',materials:['Lumber','Masonry','Masonry']});
  s.constructions=[pending];
  assert.equal(G.canCompleteConstruction(s,'SK1').reason,'warehouse-required');
  const warehouse=construction('WH1',0,'warehouse','civic',{warehouse:['Steel','Steel','Steel']});
  s.constructions.push(warehouse);
  assert.equal(G.canCompleteConstruction(s,'SK1').ok,true);
  assert.equal(G.completeConstruction(s,pending).ok,true);
  assert.equal(s.players[0].prestige,4);
  assert.equal(G.buildingIncome(s,0),p.income+G.projectById('warehouse').income);
  assert.equal(G.districtConstructionCount(s,'civic'),2);
  assert.equal(warehouse.warehouseInventory.length,0);
});
