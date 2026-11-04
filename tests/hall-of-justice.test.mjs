import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {begin,run,preset,registeredPropertyTitleResults,awardRegisteredPropertyTitleVp} from '../catastrophe-core.js';

function setup(){
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='development';s.developmentComplete=false;s.developmentPlayer=0;
  s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
  s.constructions=[];s.actionSpaceOccupancy={};
  s.players.forEach(p=>{p.capital=100;p.prestige=0;p.portfolio=[];});
  return s;
}
function built(id,playerId,projectId,districtId='civic',status='complete',materials=null){
  return {id,playerId,projectId,districtId,status,startedRound:1,
    completedRound:status==='complete'?1:null,
    materialsDelivered:materials??(status==='complete'?[...G.projectById(projectId).materials]:[]),
    warehouseInventory:[]};
}
test('Hall of Justice enters two-copy market with the approved card, land 3+ and both mixed types',()=>{
  const p=G.projectById('hall_of_justice');
  assert.equal(G.PROJECTS.length,41);
  assert.deepEqual(p.types,['Бизнес','Общественное']);
  assert.deepEqual(p.materials,['Lumber','Masonry','Masonry','Steel']);
  assert.deepEqual([p.open,p.income,p.prestige,p.landMin],[5,1,2,3]);
  assert.deepEqual(p.risk,{earthquake:1,fire:0});
  assert.equal(G.createProjectCardPool({rng:()=>0.1}).filter(c=>c.id===p.id).length,2);
  const s=setup();s.players[0].portfolio=[p.id];s.districts.civic.landValue=2;
  assert.ok(G.constructionEligibility(s,0,p.id,'civic').reasons.some(x=>x.includes('Land Value')));
  s.districts.civic.landValue=3;
  assert.equal(G.constructionEligibility(s,0,p.id,'civic').ok,true);
});
test('registration costs $1 and worker, accepts P0 and one courthouse slot, rejects duplicates and fire-producing buildings',()=>{
  const s=setup();s.constructions=[
    built('H',1,'hall_of_justice'),
    built('A',0,'luxury'),
    built('F',0,'tenement'),
    built('B',1,'luxury')
  ];
  const original=s.players[0].capital;
  assert.equal(G.useHallOfJustice(s,0,'H','register','F').reason,'registration-target');
  assert.equal(G.useHallOfJustice(s,0,'H','register','B').reason,'registration-target');
  assert.equal(s.players[0].workers[0].used,false,'rejected actions do not spend worker');
  const r=G.useHallOfJustice(s,0,'H','register','A');
  assert.equal(r.ok,true);assert.equal(r.cost,1);
  assert.equal(s.players[0].capital,original-1);
  assert.equal(s.constructions.find(c=>c.id==='A').propertyTitleRegistered,true);
  assert.equal(s.actionSpaceOccupancy.H,0);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.players[0].workers[0].districtId,'civic');
  s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[1].id;
  assert.equal(G.useHallOfJustice(s,0,'H','register','A').reason,'occupied');
});
test('reorganization discards the unfinished site card, consumes the new unstarted card and keeps matching delivered materials',()=>{
  const s=setup();s.players[0].portfolio=['brewery'];
  s.constructions=[built('H',1,'hall_of_justice'),
    built('S',0,'factory','civic','under-construction',['Lumber','Masonry','Steel'])];
  const r=G.useHallOfJustice(s,0,'H','reorganize','S','brewery');
  assert.equal(r.ok,true);assert.equal(r.completed,true);
  assert.equal(s.constructions.find(c=>c.id==='S').projectId,'brewery');
  assert.equal(s.constructions.find(c=>c.id==='S').districtId,'civic');
  assert.deepEqual(s.constructions.find(c=>c.id==='S').materialsDelivered,['Lumber','Masonry','Steel']);
  assert.equal(s.constructions.find(c=>c.id==='S').justiceReorganized,true);
  assert.equal(s.constructions.find(c=>c.id==='S').beerStock,2);
  assert.equal(s.players[0].capital,98);
  assert.equal(s.players[0].prestige,1);
  assert.deepEqual(s.players[0].portfolio,[]);
  assert.equal(s.expired.at(-1).id,'factory');
  assert.equal(s.actionSpaceOccupancy.H,0);
});
test('reorganization drops excess delivered material without losing compatible ones; cannot be repeated',()=>{
  const s=setup();s.players[0].portfolio=['tenement','brewery'];
  s.constructions=[built('H',0,'hall_of_justice'),
    built('S',0,'factory','civic','under-construction',['Lumber','Steel','Masonry'])];
  const r=G.useHallOfJustice(s,0,'H','reorganize','S','tenement');
  assert.equal(r.ok,true);assert.deepEqual(r.kept,['Lumber','Masonry']);
  assert.deepEqual(r.lost,['Steel']);
  assert.equal(s.constructions.find(c=>c.id==='S').status,'under-construction');
  assert.deepEqual(s.constructions.find(c=>c.id==='S').lostMaterials,['Steel']);
  s.actionSpaceOccupancy={};s.activationMainActionUsed=false;
  s.activeWorkerId=s.players[0].workers[1].id;
  assert.equal(G.useHallOfJustice(s,0,'H','reorganize','S','brewery').reason,'construction-target');
});
test('reorganization never bypasses new project district requirements or uses a card absent from portfolio',()=>{
  const s=setup();s.constructions=[built('H',0,'hall_of_justice'),
    built('S',0,'tenement','civic','under-construction',['Lumber'])];
  s.players[0].portfolio=['skyscraper'];s.districts.civic.landValue=1;
  assert.equal(G.useHallOfJustice(s,0,'H','reorganize','S','skyscraper').reason,'replacement-requirements');
  assert.equal(G.useHallOfJustice(s,0,'H','reorganize','S','brewery').reason,'replacement-card');
  assert.equal(s.actionSpaceOccupancy.H,undefined);
  assert.equal(s.constructions.find(c=>c.id==='S').projectId,'tenement');
  assert.equal(s.players[0].workers[0].used,false);
  assert.equal(s.players[0].capital,100);
  // Even owning another copy does not allow a no-op replacement.
  s.players[0].portfolio.push('tenement');
  assert.equal(G.useHallOfJustice(s,0,'H','reorganize','S','tenement').reason,'replacement-card');
});
test('courthouse needs a reachable free worker and enough money; cannot serve both actions in same year',()=>{
  const s=setup();s.constructions=[built('H',1,'hall_of_justice'),built('R',0,'luxury')];
  s.players[0].capital=0;
  assert.equal(G.useHallOfJustice(s,0,'H','register','R').reason,'capital');
  s.players[0].capital=100;s.players[0].workers[0].districtId='sunset';
  assert.equal(G.useHallOfJustice(s,0,'H','register','R').reason,'worker-range');
  assert.equal(s.actionSpaceOccupancy.H,undefined);
  assert.equal(s.players[0].workers[0].used,false);
});
test('separate Phase II scoring grants exactly one VP for registered deed even after total destruction; idempotent',()=>{
  const s=setup();s.constructions=[built('R',0,'luxury','civic'),built('U',1,'luxury','western')];
  s.constructions[0].propertyTitleRegistered=true;
  const risk=preset('base');for(const id of Object.keys(risk))risk[id]={z:0,p:0,firehouse:false};
  risk.civic.z=3;
  const sim=run(begin(risk));
  assert.equal(registeredPropertyTitleResults(s,begin(risk)).reason,'simulation-incomplete');
  const outcome=registeredPropertyTitleResults(s,sim);
  assert.equal(outcome.ok,true);assert.equal(outcome.entries[0].survived,false);
  const first=awardRegisteredPropertyTitleVp(s,sim);
  assert.equal(first.prestige,1);assert.equal(s.players[0].prestige,1);
  assert.equal(awardRegisteredPropertyTitleVp(s,sim).prestige,0);
  assert.equal(s.players[0].prestige,1);assert.equal(s.players[1].prestige,0);
});
