import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {researchCardById} from '../research-cards.js';

const clone=s=>JSON.parse(JSON.stringify(s));
const snap=s=>JSON.stringify(s);
function game({funded=false,round=1,issue='E02'}={}){
  const s=G.createInitialState({rng:()=>0.3});
  s.round=round;s.phase='development';s.view='city';
  s.newsCurrentIds=[issue];s.newsLastResolvedRound=round-1;
  s.developmentPlayer=0;s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];
  s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
  s.constructions=[];s.players.forEach(p=>{
    p.capital=50;p.prestige=0;p.portfolio=[];
    p.workersLeft=3;p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
  });
  s.research.R08={status:funded?'funded':'available',holderId:funded?2:null,fundedRound:funded?round:null};
  return s;
}
const fee=(s,id='std_clinic')=>G.standardProjectFee(s,id);
const eligible=(s,id='std_clinic',playerId=0)=>G.constructionEligibility(s,playerId,id,'civic');

test('R08 approved phase1 fee and standalone phase2 laboratory effect are recorded in registry',()=>{
  const card=researchCardById('R08');
  assert.equal(card.fundingCost,4);assert.deepEqual(card.sponsorReward,{vp:2,influence:1});
  assert.equal(card.effect.type,'citywide-ambulance-service-modernization');
  assert.equal(card.effect.phase1.type,'standard-project-fee-increase');
  assert.equal(card.effect.phase1.projectId,'std_clinic');
  assert.equal(card.effect.phase1.baseStandardProjectFee,G.STANDARD_PROJECT_FEE);
  assert.equal(card.effect.phase1.extraFee,1);
  assert.equal(card.effect.phase1.standardClinicFeeAfterResearch,3);
  assert.equal(card.effect.phase1.feeTiming,'on-construction-start-after-research');
  assert.equal(card.effect.phase1.affectsPreviouslyStartedConstruction,false);
  assert.equal(card.effect.phase1.affectsOtherStandardProjects,false);
  assert.equal(card.effect.appliesToAllPlayers,true);
  assert.equal(card.effect.phase2.type,'medical-survivor-neighbor-earthquake-award');
  assert.equal(card.implementationStatus,'implemented-in-main');
});
test('before funding R08 the four standard projects remain $2 and market projects have zero standard fee',()=>{
  const s=game();
  for(const id of G.STANDARD_PROJECTS.map(p=>p.id)){
    assert.equal(fee(s,id),2,id);
    assert.equal(eligible(s,id).standardFee,2,id);
  }
  assert.equal(fee(s,'clinic'),0);assert.equal(fee(s,'warehouse'),0);
  assert.equal(fee(s,'not-a-project'),0);
});
test('unpaid HELD and AVAILABLE R08 never activate a surcharge or mutate the preview',()=>{
  const s=game();
  for(const status of ['available','held']){
    Object.assign(s.research.R08,{status,holderId:status==='held'?0:null,fundedRound:null});
    const before=snap(s);
    assert.equal(fee(s),2);
    assert.equal(eligible(s).standardFee,2);
    assert.equal(snap(s),before);
  }
});
test('after R08 funding only std_clinic costs $3 for every player; unrelated standard and market projects unchanged',()=>{
  const s=game({funded:true}),before=snap(s);
  for(const id of G.STANDARD_PROJECTS.map(p=>p.id)){
    assert.equal(fee(s,id),id==='std_clinic'?3:2,id);
  }
  assert.equal(fee(s,'clinic'),0,'full market clinic never pays standard fee');
  assert.equal(fee(s,'std_warehouse'),2);assert.equal(fee(s,'std_fire'),2);assert.equal(fee(s,'std_police'),2);
  assert.equal(eligible(s).standardFee,3);assert.equal(eligible(s).cost,eligible(s).landCost+3);
  assert.equal(snap(s),before,'fee selectors are pure');
});
test('new standard clinic actually pays $3 once, without extra materials or additional worker',()=>{
  const s=game({funded:true}),before=s.players[0].capital,land=s.districts.civic.landValue;
  const r=G.beginConstruction(s,0,'std_clinic','civic');
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.landCost,land);assert.equal(r.standardFee,3);assert.equal(r.cost,land+3);
  assert.equal(s.players[0].capital,before-land-3);
  assert.equal(s.players[0].workersLeft,2);
  assert.equal(r.construction.status,'under-construction');
  assert.deepEqual(r.construction.materialsDelivered,[]);
  assert.equal(s.constructions.length,1);
  assert.deepEqual(G.projectById('std_clinic').materials,['Lumber','Masonry','Steel']);
});
test('underfunded clinic cannot start, use worker, occupy site or debit player after R08',()=>{
  const s=game({funded:true}),land=s.districts.civic.landValue;
  s.players[0].capital=land+2;
  const before=snap(s),preview=eligible(s);
  assert.equal(preview.ok,false);assert.equal(preview.standardFee,3);assert.equal(preview.cost,land+3);
  assert.ok(preview.reasons.some(t=>t.includes('капитала')));
  assert.equal(G.beginConstruction(s,0,'std_clinic','civic').ok,false);
  assert.equal(snap(s),before);
  s.players[0].capital=land+3;
  const r=G.beginConstruction(s,0,'std_clinic','civic');
  assert.equal(r.ok,true);assert.equal(s.players[0].capital,0);
});
test('real R08 funding activates new fee immediately and pays sponsor once',()=>{
  const s=game();s.research.R08={status:'held',holderId:0,fundedRound:null};
  const before={money:s.players[0].capital,vp:s.players[0].prestige,inf:s.players[0].influence,
    workers:s.players[0].workersLeft};
  assert.equal(fee(s),2);
  const r=G.fundResearch(s,0,'R08');
  assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.cost,4);assert.equal(r.vp,2);
  assert.equal(s.players[0].capital,before.money-4);
  assert.equal(s.players[0].prestige,before.vp+2);
  assert.ok(s.players[0].influence>before.inf);
  assert.equal(s.players[0].workersLeft,before.workers);
  assert.equal(fee(s),3);
  const saved=snap(s);
  assert.equal(G.fundResearch(s,0,'R08').reason,'already-funded');
  assert.equal(snap(s),saved,'no repeated fee activation or sponsor payout');
});
test('R08 global research founded by player 2 raises player 1 clinic price without compensating sponsor',()=>{
  const s=game({funded:true});
  s.developmentPlayer=1;s.activeWorkerId=s.players[1].workers[0].id;
  const before=s.players.map(p=>p.capital);
  const result=G.beginConstruction(s,1,'std_clinic','civic');
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.standardFee,3);
  assert.equal(s.players[1].capital,before[1]-result.cost);
  assert.equal(s.players[2].capital,before[2]);
});
test('Bureau contract discounts LAND but never the increased R08 standard fee',()=>{
  const s=game({funded:true}),p=s.players[0],land=s.districts.civic.landValue;
  p.bureauContracts=1;
  const preview=eligible(s);
  assert.equal(preview.landCost,Math.max(0,land-2));
  assert.equal(preview.standardFee,3);
  assert.equal(preview.cost,preview.landCost+3);
  const before=p.capital;
  const r=G.beginConstruction(s,0,'std_clinic','civic');
  assert.equal(r.ok,true);assert.equal(r.cost,preview.cost);
  assert.equal(p.capital,before-preview.cost);assert.equal(p.bureauContracts,0);
});
test('E05 fully waives even funded R08 clinic fee and land; OTHER three standard projects follow existing rules',()=>{
  const s=game({funded:true,issue:'E05'});
  s.players[0].capital=0;
  assert.equal(fee(s,'std_clinic'),0);assert.equal(fee(s,'std_fire'),0);
  assert.equal(fee(s,'std_police'),0);assert.equal(fee(s,'std_warehouse'),2);
  const p=eligible(s);
  assert.equal(p.standardFee,0);assert.equal(p.landCost,0);assert.equal(p.cost,0);
  const r=G.beginConstruction(s,0,'std_clinic','civic');
  assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.e05Subsidy,true);
  assert.equal(r.standardFee,0);assert.equal(r.cost,0);
  assert.equal(s.players[0].capital,0);
  assert.deepEqual(r.construction.materialsDelivered,[]);
});
test('E05 expired/reported no longer bypasses R08 $3 fee',()=>{
  const s=game({funded:true,issue:'E05'});
  s.newsLastResolvedRound=s.round;
  assert.equal(G.isE05CivicSubsidy(s,'std_clinic'),false);
  assert.equal(fee(s),3);assert.equal(eligible(s).standardFee,3);
});
test('already started std_clinic is not charged retroactively when R08 is funded',()=>{
  const s=game(),before=s.players[0].capital;
  const first=G.beginConstruction(s,0,'std_clinic','civic');
  assert.equal(first.ok,true);assert.equal(first.standardFee,2);
  const afterStart=s.players[0].capital;
  assert.equal(afterStart,before-first.cost);
  s.research.R08={status:'held',holderId:0,fundedRound:null};
  assert.equal(G.fundResearch(s,0,'R08').ok,true);
  const afterFunding=s.players[0].capital,construction=first.construction;
  assert.equal(fee(s),3);
  assert.equal(construction.status,'under-construction');
  assert.equal(s.players[0].capital,afterFunding,'funding does not charge existing construction');
  construction.materialsDelivered=['Lumber','Masonry','Steel'];
  const done=G.completeConstruction(s,construction);
  assert.equal(done.ok,true,JSON.stringify(done));
  assert.equal(s.players[0].capital,afterFunding,'finishing old clinic cannot charge $1 more');
});
test('completed standard clinic and saved older constructions do not accrue debt when price changes',()=>{
  const s=game({funded:true});
  s.constructions=[{id:'OLD',playerId:0,projectId:'std_clinic',districtId:'civic',status:'complete',
    startedRound:1,completedRound:1,materialsDelivered:['Lumber','Masonry','Steel']}];
  const before=snap(s),p=s.players[0].capital;
  assert.equal(fee(s),3);
  assert.equal(s.players[0].capital,p);assert.equal(snap(s),before);
  assert.equal(G.constructionEligibility(s,0,'std_clinic','civic').ok,false,'existing clinic occupies its service slot');
});
test('all six rounds including 1905 use the same immediate R08 fee, without year-based decay',()=>{
  for(const round of [1,2,3,4,5,6]){
    const s=game({funded:true,round});
    assert.equal(fee(s),3,round);assert.equal(eligible(s).standardFee,3,round);
  }
});
test('JSON save/reload preserves funded surcharge but adds no new migration fields or payments',()=>{
  const s=game({funded:true}),restored=clone(s),old=snap(restored);
  assert.equal(fee(restored),3);
  assert.equal(eligible(restored).standardFee,3);
  assert.equal(snap(restored),old);
  const legacy=clone(game());
  delete legacy.research;
  const original=snap(legacy);
  assert.equal(fee(legacy),2);
  assert.equal(eligible(legacy).standardFee,2);
  assert.equal(snap(legacy),original);
});
test('R08 phase 7B affects no Phase II catastrophe scoring state or stored risk for std_clinic',()=>{
  const s=game({funded:true}),before=snap(s);
  const project=G.projectById('std_clinic');
  assert.deepEqual(project.risk,{earthquake:0,fire:0});
  assert.equal(project.prestige,1);assert.equal(project.income,0);
  assert.equal(fee(s),3);
  assert.equal(snap(s),before);
});
