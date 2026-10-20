import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.actionSpaceOccupancy={};s.activeWorkerId=s.players[0].workers[0].id;
  s.players.forEach(p=>{p.capital=50;p.fireIncomePenalty=0;p.prestige=0;});
  s.players[0].workers[0].districtId='civic';
  s.constructions=[];return s;
}
function built(id,playerId,projectId,districtId='civic'){
  return {id,playerId,projectId,districtId,status:'complete',
    materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],
    startedRound:1,completedRound:1,fireSafetyModernized:false};
}

test('v0.49 introduces one mixed workshop type with two copies and municipal land value bonus',()=>{
  const p=G.projectById('fireworkshop');
  assert.deepEqual(p.types,['Промышленное','Общественное']);
  assert.equal(p.income,1);assert.equal(p.prestige,2);
  assert.deepEqual(p.materials,['Lumber','Masonry','Steel']);
  assert.deepEqual(p.risk,{earthquake:0,fire:-1});
  const cards=G.createProjectCardPool({rng:()=>0.1});
  assert.equal(cards.length,G.PROJECTS.length*2);
  assert.equal(cards.filter(c=>c.id==='fireworkshop').length,2);
  const s=state(),before=s.districts.civic.landValue;
  const w=built('W1',0,'fireworkshop');
  w.status='under-construction';
  s.constructions.push(w);
  assert.equal(G.completeConstruction(s,w).ok,true);
  assert.equal(s.players[0].prestige,2);
  assert.equal(s.districts.civic.landValue,Math.min(6,before+1));
  assert.equal(G.districtRisk(s,'civic').fire.raw,Math.max(0,(G.districtById('civic').fireBase||0)-1));
});

test('voluntary modernization spends $2, places one permanent token and reduces district P',()=>{
  const s=state();
  s.constructions=[built('FIRE',1,'firehouse'),built('FAC',0,'factory')];
  const before=G.districtRisk(s,'civic').fire.raw;
  const result=G.useFirehouseAction(s,0,'FIRE','upgrade','FAC');
  assert.equal(result.ok,true);assert.deepEqual(result.targets,['FAC']);
  assert.equal(s.players[0].capital,48);
  assert.equal(s.constructions[1].fireSafetyModernized,true);
  assert.equal(G.districtRisk(s,'civic').fire.raw,before-1);
  assert.equal(s.actionSpaceOccupancy.FIRE,0);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(G.firehouseUpgradeCandidates(s,0,'FIRE').length,0);
  s.activationMainActionUsed=false;s.players[0].workers[1].districtId='civic';
  s.activeWorkerId=s.players[0].workers[1].id;
  assert.equal(G.useFirehouseAction(s,0,'FIRE','upgrade','FAC').reason,'occupied');
});

test('workshops cut upgrade cost to $1 and extend inspections to neighboring districts',()=>{
  const s=state(),neighbor=G.districtNeighbors('civic').find(id=>G.districtById(id)?.buildable);
  assert.ok(neighbor);
  s.constructions=[built('FH',1,'firehouse'),built('W1',2,'fireworkshop'),built('FAC',0,'factory'),
    built('FAR',1,'factory',neighbor)];
  assert.equal(G.firehouseHasWorkshop(s,'FH'),true);
  assert.equal(G.firehouseInspectionDistricts(s,'FH').includes(neighbor),true);
  assert.equal(G.useFirehouseAction(s,0,'FH','upgrade','FAC').ok,true);
  assert.equal(s.players[0].capital,49);
  s.actionSpaceOccupancy={};s.activationMainActionUsed=false;
  s.players[0].workers[1].districtId='civic';s.activeWorkerId=s.players[0].workers[1].id;
  const out=G.useFirehouseAction(s,0,'FH','inspect',neighbor);
  assert.equal(out.ok,true);
  assert.equal(s.constructions[3].fireSafetyModernized,true);
});

test('without workshops, inspections are limited to their own firehouse district',()=>{
  const s=state(),neighbor=G.districtNeighbors('civic').find(id=>G.districtById(id)?.buildable);
  s.constructions=[built('FH',1,'firehouse'),built('FAR',1,'factory',neighbor)];
  assert.deepEqual(G.firehouseInspectionDistricts(s,'FH'),['civic']);
  assert.equal(G.useFirehouseAction(s,0,'FH','inspect',neighbor).reason,'district');
  assert.equal(s.players[0].workers[0].used,false);
});

test('inspection modernizes all tied maximum-P buildings, charges owners and loses one Influence each',()=>{
  const s=state();
  s.players[1].capital=9;s.players[2].capital=9;
  s.constructions=[built('FH',0,'firehouse'),built('A',1,'factory'),built('B',2,'woodworks'),
    built('C',0,'tenement')];
  const before=G.districtRisk(s,'civic').fire.raw;
  const targets=G.firehouseInspectionTargets(s,'FH','civic');
  assert.deepEqual(targets.map(c=>c.id),['A','B']);
  const old1=s.players[1].influence,old2=s.players[2].influence;
  const r=G.useFirehouseAction(s,0,'FH','inspect','civic');
  assert.equal(r.ok,true);
  assert.deepEqual(r.targets,['A','B']);
  assert.equal(s.constructions.find(c=>c.id==='C').fireSafetyModernized,false);
  assert.equal(G.districtRisk(s,'civic').fire.raw,before-2);
  assert.equal(s.players[1].capital,6);assert.equal(s.players[2].capital,6);
  assert.ok(s.players[1].influence<old1);assert.ok(s.players[2].influence<old2);
  assert.equal(s.players[1].fireIncomePenalty,0);
  assert.equal(r.impacts.length,2);
});

test('one owner with multiple tied offenders pays both, loses Influence once, and shortage is one persistent annual income penalty',()=>{
  const s=state();
  s.players[1].capital=1;
  s.constructions=[built('FH',0,'firehouse'),built('A',1,'factory'),built('B',1,'woodworks')];
  const oldInfluence=s.players[1].influence;
  const beforeIncome=G.roundIncome(s,1);
  const r=G.useFirehouseAction(s,0,'FH','inspect','civic');
  assert.equal(r.ok,true);
  assert.equal(s.players[1].capital,0);
  assert.equal(r.impacts[0].cost,6);
  assert.equal(r.impacts[0].paid,1);
  assert.equal(r.impacts[0].incomePenalty,1);
  assert.equal(s.players[1].fireIncomePenalty,1);
  assert.equal(G.roundIncome(s,1),Math.max(0,beforeIncome-1));
  assert.ok(s.players[1].influence<oldInfluence);
  assert.ok(s.constructions.find(c=>c.id==='A').fireSafetyModernized);
  assert.ok(s.constructions.find(c=>c.id==='B').fireSafetyModernized);
  s.round=6;
  assert.equal(G.roundIncome(s,1),Math.max(0,beforeIncome-1),'penalty does not expire or depend on year');
});

test('inspection cannot target P+1 only, modified sites or an empty district; failed actions do not use worker',()=>{
  const s=state();
  s.constructions=[built('FH',0,'firehouse'),built('LOW',1,'tenement')];
  assert.equal(G.useFirehouseAction(s,0,'FH','inspect','civic').reason,'no-violations');
  assert.equal(s.players[0].workers[0].used,false);
  s.constructions.push(built('FAC',1,'factory'));
  s.constructions[2].fireSafetyModernized=true;
  assert.equal(G.useFirehouseAction(s,0,'FH','inspect','civic').reason,'no-violations');
  assert.equal(s.players[0].workers[0].used,false);
});

test('fire safety upgrade rejects a non-owned building or insufficient capital before consuming representative',()=>{
  const s=state();
  s.players[0].capital=1;
  s.constructions=[built('FH',1,'firehouse'),built('OPP',1,'factory'),built('FAC',0,'factory')];
  assert.equal(G.useFirehouseAction(s,0,'FH','upgrade','OPP').reason,'no-upgrade-target');
  assert.equal(G.useFirehouseAction(s,0,'FH','upgrade','FAC').reason,'capital');
  assert.equal(s.players[0].workers[0].used,false);
  assert.equal(s.constructions[2].fireSafetyModernized,false);
});

test('inspecting own worst offender imposes the same repairs and Influence sanction',()=>{
  const s=state();
  s.constructions=[built('FH',1,'firehouse'),built('FAC',0,'factory')];
  const influence=s.players[0].influence;
  const r=G.useFirehouseAction(s,0,'FH','inspect','civic');
  assert.equal(r.ok,true);assert.equal(s.players[0].capital,47);
  assert.ok(s.players[0].influence<influence);
});

test('income penalty is capped at zero but remains stored on player',()=>{
  const s=state();s.players[0].fireIncomePenalty=500;
  assert.equal(G.roundIncome(s,0),0);
  assert.equal(s.players[0].fireIncomePenalty,500);
});
