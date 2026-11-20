import test from 'node:test';
import assert from 'node:assert/strict';
import {createInitialState,districtNeighbors} from '../game-core.js';
import {researchCardById} from '../research-cards.js';
import {DISTRICT_IDS,begin,run,next,fromGame,medicalResearchSurvivalResults,awardMedicalResearchSurvivalVp} from '../catastrophe-core.js';

const clone=x=>JSON.parse(JSON.stringify(x));
const snap=x=>JSON.stringify(x);
function game({funded=true}={}){
  const s=createInitialState({rng:()=>0.5});
  s.constructions=[];
  s.players.forEach(p=>p.prestige=10);
  if(funded)Object.assign(s.research.R08,{status:'funded',holderId:2,fundedRound:5});
  return s;
}
function clinic(s,id,districtId='civic',owner=0,projectId='std_clinic',status='complete',extra={}){
  const building={id,playerId:owner,projectId,districtId,status,startedRound:1,
    completedRound:status==='complete'?2:null,materialsDelivered:['Lumber','Masonry','Steel'],...extra};
  s.constructions.push(building);
  return building;
}
function sim({quake={},fire={},config={ignition:100,spread:1}}={}){
  const input=Object.fromEntries(DISTRICT_IDS.map(id=>[id,{z:0,p:0,firehouse:false}]));
  for(const [id,z] of Object.entries(quake))input[id].z=z;
  for(const [id,p] of Object.entries(fire))input[id].p=p;
  return run(begin(input,config));
}
function result(s,options={}){return medicalResearchSurvivalResults(s,sim(options));}

test('R08 retains the approved phase II contract in its research registry',()=>{
  const c=researchCardById('R08');
  const e=c.effect.phase2;
  assert.equal(c.effect.appliesToAllPlayers,true);
  assert.equal(c.fundingCost,4);
  assert.equal(e.type,'medical-survivor-neighbor-earthquake-award');
  assert.deepEqual(e.eligibleMedicalProjects,['std_clinic','clinic']);
  assert.deepEqual(e.neighboringEarthquakeStatuses,['damaged','destroyed']);
  assert.equal(e.pointsPerEligibleBuilding,2);
  assert.equal(e.requiresCompletedBuilding,true);
  assert.equal(e.requiresSurvivingBuilding,true);
  assert.equal(e.survivingMeans,'not-destroyed-by-earthquake-and-not-burned');
  assert.equal(e.onlyOncePerBuilding,true);
  assert.equal(e.adjacentDistrictOnly,true);
  assert.equal(e.fireOnlyDamageDoesNotQualify,true);
  assert.equal(e.appliesToBuildingsCompletedBeforeResearch,true);
  assert.equal(c.implementationStatus,'implemented-in-research-integration-branch-not-published');
});
test('strictly adjacent earthquake DAMAGE qualifies a living standard ambulance for +2 VP',()=>{
  const s=game();clinic(s,'A');
  assert.ok(districtNeighbors('civic').includes('soma'));
  const original=snap(s);
  const r=result(s,{quake:{soma:2}});
  assert.equal(r.ok,true);assert.equal(r.researchId,'R08');assert.equal(r.eligibleBuildings,1);
  assert.equal(r.pendingVp,2);assert.equal(r.entries.length,1);
  assert.deepEqual(r.entries[0].damagedNeighbors,['soma']);
  assert.equal(r.entries[0].quake,'intact');assert.equal(r.entries[0].burned,false);
  assert.equal(r.entries[0].bonus,2);assert.equal(r.entries[0].payable,2);
  assert.equal(snap(s),original,'pure preview cannot alter Phase I game or research');
});
test('damaged medical district may survive, but cannot qualify itself without a damaged NEIGHBOR',()=>{
  const s=game();clinic(s,'A');
  const r=result(s,{quake:{civic:2}});
  assert.equal(r.eligibleBuildings,0);assert.equal(r.pendingVp,0);
  assert.equal(r.entries[0].survived,true);assert.equal(r.entries[0].quake,'damaged');
  assert.deepEqual(r.entries[0].damagedNeighbors,[]);
});
test('damaged own district plus damaged adjacent district qualifies if neither is burning',()=>{
  const s=game();clinic(s,'A');
  const r=result(s,{quake:{civic:2,soma:2}});
  assert.equal(r.pendingVp,2);
  assert.equal(r.entries[0].quake,'damaged');
});
test('two adjacent districts damaged count once per institution, not per damaged district',()=>{
  const s=game();clinic(s,'A');
  const r=result(s,{quake:{soma:2,mission:2}});
  assert.deepEqual(r.entries[0].damagedNeighbors,['soma','mission']);
  assert.equal(r.pendingVp,2);
});
test('quake DESTROYED neighbor qualifies even if it burns and later sends fire into survivor',()=>{
  const s=game();clinic(s,'A');
  const q=sim({quake:{soma:3},config:{ignition:4,spread:1}});
  assert.equal(q.nodes.soma.quake,'destroyed');
  assert.equal(q.nodes.soma.burning,true);
  assert.equal(q.nodes.civic.quake,'intact');
  assert.equal(q.nodes.civic.burning,false);
  const r=medicalResearchSurvivalResults(s,q);
  assert.equal(r.pendingVp,2);
  assert.deepEqual(r.entries[0].damagedNeighbors,['soma']);
});
test('FIRE-ONLY damage in neighboring district never qualifies for R08 earthquake award',()=>{
  const s=game();clinic(s,'A');
  const q=sim({fire:{soma:3},config:{ignition:3,spread:1}});
  assert.equal(q.nodes.soma.quake,'intact');
  assert.equal(q.nodes.soma.burning,true);
  assert.equal(q.nodes.civic.burning,false);
  const r=medicalResearchSurvivalResults(s,q);
  assert.equal(r.pendingVp,0);assert.equal(r.entries[0].survived,true);
  assert.deepEqual(r.entries[0].damagedNeighbors,[]);
});
test('clinic in quake-destroyed district cannot receive VP even if its neighbor is quake damaged',()=>{
  const s=game();clinic(s,'A');
  const r=result(s,{quake:{civic:3,soma:2}});
  assert.equal(r.pendingVp,0);assert.equal(r.entries[0].survived,false);
  assert.equal(r.entries[0].quake,'destroyed');assert.equal(r.entries[0].burned,true);
});
test('clinic that survives earthquake but burns in the spreading fire is NOT eligible',()=>{
  const s=game();clinic(s,'A');
  const q=sim({quake:{soma:2},fire:{soma:3,civic:3},config:{ignition:4,spread:1}});
  assert.equal(q.nodes.soma.quake,'damaged');
  assert.equal(q.nodes.soma.burning,true);
  assert.equal(q.nodes.civic.quake,'intact');
  assert.equal(q.nodes.civic.burning,true);
  const r=medicalResearchSurvivalResults(s,q);
  assert.equal(r.pendingVp,0);assert.equal(r.entries[0].survived,false);
});
test('both standard and market clinics earn independent VP for THEIR owners, not the research sponsor',()=>{
  const s=game();clinic(s,'A','civic',0);clinic(s,'B','financial',1,'clinic');
  const q=sim({quake:{soma:2}});
  const r=medicalResearchSurvivalResults(s,q);
  assert.equal(r.pendingVp,4);assert.equal(r.eligibleBuildings,2);
  assert.equal(r.entries[0].playerId,0);assert.equal(r.entries[1].playerId,1);
  const award=awardMedicalResearchSurvivalVp(s,q);
  assert.equal(award.ok,true);assert.equal(award.prestige,4);assert.equal(award.awards.length,2);
  assert.deepEqual(s.players.map(p=>p.prestige),[12,12,10]);
  assert.equal(s.constructions[0].catastropheResearchVpAwarded.R08,true);
  assert.equal(s.constructions[1].catastropheResearchVpAwarded.R08,true);
});
test('medical clinic completed BEFORE R08 financing still qualifies after global research unlock',()=>{
  const s=game();clinic(s,'OLD','civic',0,'clinic','complete',{startedRound:1,completedRound:2});
  assert.equal(s.research.R08.fundedRound,5);
  const a=awardMedicalResearchSurvivalVp(s,sim({quake:{soma:2}}));
  assert.equal(a.prestige,2);assert.equal(s.players[0].prestige,12);
});
test('non-medical and unfinished buildings are completely ignored by R08, no phantom +2',()=>{
  const s=game();
  clinic(s,'UNFINISHED','civic',0,'std_clinic','under-construction');
  clinic(s,'PHARMACY','civic',0,'chinese_herbal_pharmacy');
  clinic(s,'WAREHOUSE','civic',0,'std_warehouse');
  const r=result(s,{quake:{soma:2}});
  assert.equal(r.entries.length,0);assert.equal(r.pendingVp,0);
  const a=awardMedicalResearchSurvivalVp(s,sim({quake:{soma:2}}));
  assert.deepEqual(a.awards,[]);assert.equal(s.players[0].prestige,10);
});
test('funding is required: unavailable, held and old saves cannot unlock Phase II',()=>{
  for(const status of ['available','held']){
    const s=game({funded:false});
    Object.assign(s.research.R08,{status,holderId:status==='held'?0:null,fundedRound:null});
    clinic(s,'A');
    const q=sim({quake:{soma:2}}),before=snap(s);
    assert.equal(medicalResearchSurvivalResults(s,q).reason,'research-not-funded');
    assert.equal(awardMedicalResearchSurvivalVp(s,q).reason,'research-not-funded');
    assert.equal(snap(s),before);
  }
  const old=game({funded:false});delete old.research;clinic(old,'OLD');
  assert.equal(result(old,{quake:{soma:2}}).reason,'research-not-funded');
});
test('incomplete simulation rejects any preview or payout; no partial-fire score leakage',()=>{
  const s=game();clinic(s,'A');
  const input=fromGame(s);
  for(const id of DISTRICT_IDS){input[id].z=0;input[id].p=0;}
  input.soma.z=3;
  const q=begin(input);
  assert.equal(q.done,false);
  const before=snap(s);
  assert.equal(medicalResearchSurvivalResults(s,q).reason,'simulation-incomplete');
  assert.equal(awardMedicalResearchSurvivalVp(s,q).reason,'simulation-incomplete');
  assert.equal(snap(s),before);
  next(q);
  // If all spread sources are exhausted, it may now be complete.
  if(!q.done)run(q);
  assert.equal(medicalResearchSurvivalResults(s,q).ok,true);
});
test('invalid/partial result snapshots fail closed and never grant VP',()=>{
  const s=game();clinic(s,'A');
  const q=sim({quake:{soma:2}});
  delete q.nodes.soma;
  const old=snap(s);
  assert.equal(medicalResearchSurvivalResults(s,q).reason,'invalid-simulation');
  assert.equal(awardMedicalResearchSurvivalVp(s,q).reason,'invalid-simulation');
  assert.equal(snap(s),old);
  const bad=sim({quake:{soma:2}});
  bad.nodes.civic.quake='fire-damaged';
  assert.equal(medicalResearchSurvivalResults(s,bad).reason,'invalid-simulation');
});
test('non-neighbor damaged earthquake is insufficient even if distant fires spread',()=>{
  const s=game();clinic(s,'A');
  const r=result(s,{quake:{potrero:2}});
  assert.equal(r.pendingVp,0);assert.deepEqual(r.entries[0].damagedNeighbors,[]);
});
test('one-time marker prevents duplicate award after JSON reload and recomputation, without forfeiting fresh institutions',()=>{
  const s=game();clinic(s,'A');
  const q=sim({quake:{soma:2}});
  const once=awardMedicalResearchSurvivalVp(s,q);
  assert.equal(once.prestige,2);assert.equal(s.players[0].prestige,12);
  const archived=clone(s),before=snap(archived);
  const report=medicalResearchSurvivalResults(archived,q);
  assert.equal(report.pendingVp,0);assert.equal(report.entries[0].alreadyAwarded,true);
  assert.equal(snap(archived),before);
  const repeat=awardMedicalResearchSurvivalVp(archived,q);
  assert.equal(repeat.prestige,0);assert.deepEqual(repeat.awards,[]);
  assert.equal(archived.players[0].prestige,12);
  clinic(archived,'B','financial',1,'clinic');
  const newAward=awardMedicalResearchSurvivalVp(archived,q);
  assert.equal(newAward.prestige,2);
  assert.deepEqual(archived.players.map(p=>p.prestige),[12,12,10]);
});
test('duplicate construction IDs cannot be abused for multiple VP payouts',()=>{
  const s=game();clinic(s,'A');clinic(s,'A','financial',0,'clinic');
  const q=sim({quake:{soma:2}});
  const preview=medicalResearchSurvivalResults(s,q);
  assert.equal(preview.entries.length,1);
  assert.equal(awardMedicalResearchSurvivalVp(s,q).prestige,2);
  assert.equal(awardMedicalResearchSurvivalVp(s,q).prestige,0);
});
test('research scorer is independent of R08 Phase I cost and never mutates construction recipes',()=>{
  const s=game();clinic(s,'A');
  const before=clone(s);
  const q=sim({quake:{soma:2}});
  const preview=medicalResearchSurvivalResults(s,q);
  assert.equal(preview.pendingVp,2);
  assert.deepEqual(s,before);
  assert.equal(s.players[0].capital,before.players[0].capital);
});
