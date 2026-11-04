import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const AGENCY='ad_agency';
const site=(id,playerId=1,districtId='civic',status='complete')=>({
  id,playerId,projectId:AGENCY,districtId,status,
  materialsDelivered:status==='complete'?[...G.projectById(AGENCY).materials]:[],
  warehouseInventory:[],startedRound:1,completedRound:status==='complete'?1:null
});
function game(){
  const s=G.createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentComplete=false;
  s.developmentPlayer=0;s.activeWorkerId=s.players[0].workers[0].id;
  s.activationMainActionUsed=false;s.actionSpaceOccupancy={};
  s.players.forEach(p=>p.capital=10);
  s.constructions=[site('AD-A')];
  return s;
}

test('agency is the sixth pure Business project; compact printed card and two current catalog copies',()=>{
  const agency=G.projectById(AGENCY);
  assert.deepEqual(G.projectTypes(agency),['Бизнес']);
  assert.equal(G.PROJECTS.length,41);
  assert.equal(G.PROJECTS.filter(p=>G.projectTypes(p).length===1&&G.projectTypes(p)[0]==='Бизнес').length,6);
  assert.equal(G.createProjectCardPool({rng:()=>0.2}).filter(c=>c.id===AGENCY).length,2);
  assert.equal(agency.open,6);
  assert.equal(agency.income,3);
  assert.equal(agency.prestige,1);
  assert.deepEqual(agency.materials,['Lumber','Masonry','Steel']);
  assert.equal(agency.landMin,2);
  assert.deepEqual(agency.risk,{earthquake:0,fire:1});
  assert.equal(agency.limits,undefined,'common action restrictions are not duplicated on card');
});

test('any investor can use another investor agency, spending money and worker for personal Income',()=>{
  const s=game(),before=G.roundIncome(s,0),ownerBefore=s.players[1].capital;
  assert.equal(before,3);
  const r=G.useAdvertisingAgency(s,0,'AD-A');
  assert.equal(r.ok,true);
  assert.equal(r.cost,2);assert.equal(r.incomeGain,2);
  assert.equal(s.players[0].capital,8);
  assert.equal(s.players[0].advertisingIncomeBonus,2);
  assert.equal(G.roundIncome(s,0),5);
  assert.equal(G.buildingIncome(s,0),0,'the service does not claim to build an income-bearing property');
  assert.equal(s.players[1].capital,ownerBefore,'owner receives no client commission');
  assert.equal(s.actionSpaceOccupancy['AD-A'],0);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.players[0].workers[0].districtId,'civic');
  assert.equal(s.activationMainActionUsed,true);
  assert.ok(s.log.at(-1).msg.includes('рекламную кампанию'));
});

test('owner may use own agency and the action survives annual income calculations and penalties',()=>{
  const s=game();
  s.constructions=[site('SELF',0)];
  const owner=s.players[0];owner.capital=10;
  assert.equal(G.buildingIncome(s,0),3);
  assert.equal(G.roundIncome(s,0),6);
  assert.equal(G.useAdvertisingAgency(s,0,'SELF').ok,true);
  assert.equal(owner.capital,8);
  assert.equal(G.roundIncome(s,0),8,'base 3, building 3, marketing 2');
  owner.breadIncomePenalty=1;owner.fireIncomePenalty=2;
  assert.equal(G.roundIncome(s,0),5);
  assert.equal(G.grossRoundIncome(s,0),8);
});

test('no payment or action from missing, unfinished, occupied, inaccessible or unaffordable agency',()=>{
  const s=game();
  assert.equal(G.useAdvertisingAgency(s,0,'NO').reason,'no-agency');
  s.constructions[0].status='under-construction';
  assert.equal(G.useAdvertisingAgency(s,0,'AD-A').reason,'no-agency');
  s.constructions[0].status='complete';
  s.constructions[0].districtId='sunset';
  assert.equal(G.useAdvertisingAgency(s,0,'AD-A').reason,'worker-range');
  s.constructions[0].districtId='civic';
  s.players[0].capital=1;
  assert.equal(G.useAdvertisingAgency(s,0,'AD-A').reason,'capital');
  assert.equal(s.players[0].advertisingIncomeBonus,0);
  assert.equal(s.players[0].workers[0].used,false);
  assert.equal(s.actionSpaceOccupancy['AD-A'],undefined);
  s.players[0].capital=10;
  s.actionSpaceOccupancy['AD-A']=1;
  assert.equal(G.useAdvertisingAgency(s,0,'AD-A').reason,'occupied');
  assert.equal(s.players[0].capital,10);
});

test('two distinct agency copies allow two advertising actions by the same player, with no global player limit',()=>{
  const s=game();
  s.constructions.push(site('AD-B',2));
  const first=G.useAdvertisingAgency(s,0,'AD-A');
  assert.equal(first.ok,true);
  // Another legal main-action window and a second available worker.
  s.activationMainActionUsed=false;
  s.activeWorkerId=s.players[0].workers[1].id;
  assert.equal(G.useAdvertisingAgency(s,0,'AD-A').reason,'occupied');
  const second=G.useAdvertisingAgency(s,0,'AD-B');
  assert.equal(second.ok,true);
  assert.equal(s.players[0].advertisingIncomeBonus,4);
  assert.equal(s.players[0].capital,6);
  assert.equal(G.roundIncome(s,0),7);
  assert.equal(s.actionSpaceOccupancy['AD-A'],0);
  assert.equal(s.actionSpaceOccupancy['AD-B'],0);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.players[0].workers[1].used,true);
});

test('game setup initializes no marketing bonus and includes two agency cards and migration flag',()=>{
  const s=G.createInitialState({rng:()=>0.3});
  assert.equal(s.advertisingAgencyExpansionV1,true);
  assert.equal(s.players.every(p=>p.advertisingIncomeBonus===0),true);
  const count=[...s.market,...s.deck,...s.starterDraftHands.flat()].filter(x=>x?.id===AGENCY).length;
  assert.equal(count,2);
});
