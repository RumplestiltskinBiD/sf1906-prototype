import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
 const s=G.createInitialState({rng:()=>0.3});s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;s.constructions=[];
 s.players.forEach(p=>{p.capital=50;p.portfolio=[];});s.activeWorkerId=s.players[0].workers[0].id;return s;
}
const built=(id,playerId,projectId,districtId='civic',options={})=>({id,playerId,projectId,districtId,status:'complete',materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],startedRound:1,completedRound:1,...options});

test('four unlimited standard public projects have fixed recipes and remain out of draft, auction, and market',()=>{
 const ids=['std_warehouse','std_fire','std_police','std_clinic'];assert.deepEqual(G.STANDARD_PROJECTS.map(p=>p.id),ids);
 for(const project of G.STANDARD_PROJECTS){
   assert.deepEqual(project.materials,['Lumber','Masonry','Steel']);assert.equal(project.income,0);
   assert.equal(project.prestige,1);assert.equal(project.open,0);assert.equal(project.standard,true);
   assert.equal(G.projectById(project.id).id,project.id);
   assert.equal(G.createProjectCardPool({rng:()=>0.3}).filter(c=>c.id===project.id).length,0);
 }
 assert.equal(G.PROJECTS.length,41);assert.equal(G.PROJECTS.filter(p=>p.id==='warehouse').length,1);
});

test('standard construction charges $2 project fee once, as well as land, and stays out of portfolio',()=>{
 const s=state();const initial=s.players[0].capital,land=s.districts.civic.landValue;
 assert.equal(G.constructionEligibility(s,0,'std_fire','civic').ok,true);
 const r=G.beginConstruction(s,0,'std_fire','civic');
 assert.equal(r.ok,true,r.reasons?.join(';'));assert.equal(r.cost,land+G.STANDARD_PROJECT_FEE);
 assert.equal(r.landCost,land);assert.equal(r.standardFee,2);
 assert.equal(s.players[0].capital,initial-land-2);assert.deepEqual(s.players[0].portfolio,[]);
 assert.equal(s.players[0].workersLeft,2);assert.equal(r.construction.status,'under-construction');
 assert.deepEqual(r.construction.materialsDelivered,[]);
 assert.equal(G.canCompleteConstruction(s,r.construction.id).ok,false,'requires actual delivery');
 r.construction.materialsDelivered=['Lumber','Masonry','Steel'];
 const done=G.completeConstruction(s,r.construction);assert.equal(done.ok,true,done.reason);
 assert.equal(s.players[0].prestige,1);assert.equal(s.districts.civic.landValue,Math.min(6,land+1));
 assert.equal(G.buildingIncome(s,0),0);
});

test('same district permits one fire, police and medical service each, no full counterpart and no pending duplicates',()=>{
 const families=[['std_fire','firehouse'],['std_police','police'],['std_clinic','clinic']];
 for(const [std,full] of families){
  const s=state();s.constructions=[built('A',1,std,'civic')];s.players[0].portfolio=[full];
  assert.ok(G.constructionEligibility(s,0,full,'civic').reasons.some(x=>x.includes('учреждение')),[std,full]);
  assert.ok(G.constructionEligibility(s,0,std,'civic').reasons.some(x=>x.includes('учреждение')),[std,std]);
  s.constructions[0].status='under-construction';
  assert.ok(G.constructionEligibility(s,0,std,'civic').reasons.some(x=>x.includes('учреждение')),'unfinished reserves the sole slot');
  s.constructions[0].status='redeveloped';
  assert.ok(!G.constructionEligibility(s,0,std,'civic').reasons.some(x=>x.includes('учреждение')),'abandoned does not block');
 }
 const s=state();s.constructions=[built('F',0,'std_fire'),built('P',1,'std_police'),built('C',2,'std_clinic')];
 assert.equal(G.completedCitywideServices(s,'firehouse').length,1);
 assert.equal(G.completedCitywideServices(s,'clinic').length,1);
});

test('service presence is public across opponents; basics only cover own district, full cards cover neighbors',()=>{
 const s=state();s.constructions=[built('C',1,'std_clinic','civic'),built('F',2,'std_fire','civic'),built('P',1,'std_police','civic')];
 let a=G.districtAccess(s,'civic');assert.equal(a.clinic,true);assert.equal(a.fire,true);assert.equal(a.police,true);
 assert.equal(a.clinicSources[0].playerId,1);
 assert.equal(G.districtAccess(s,'soma').clinicSources.length,0,'basic clinic not adjacent');
 assert.equal(G.districtAccess(s,'soma').fireSources.length,0,'basic fire post not adjacent');
 s.constructions=[built('FULL',1,'firehouse','civic')];
 assert.equal(G.districtAccess(s,'soma').fire,true,'full firehouse protects adjacent district');
});

test('fire delta and three land increments are additive, but do not exceed land value cap',()=>{
 const s=state();const start=G.districtRisk(s,'civic').fire.net;s.districts.civic.landValue=3;
 const ids=['std_fire','std_police','std_clinic'];
 for(const [i,id] of ids.entries()){
   const c=built('S'+i,0,id);c.status='under-construction';s.constructions.push(c);
   assert.equal(G.completeConstruction(s,c).ok,true);
 }
 assert.equal(s.districts.civic.landValue,6);assert.equal(G.districtRisk(s,'civic').fire.net,start-1);
 assert.equal(s.players[0].prestige,3);
 const h=built('F',1,'firehouse','soma');s.constructions.push(h);
 assert.equal(G.districtAccess(s,'civic').fireSources.length,2,'overlapping protection sources count cumulatively');
});

test('small warehouses are private, unrestricted by district count, and have independent capacity of three',()=>{
 const s=state();const small=built('W1',0,'std_warehouse'),extra=built('W2',0,'std_warehouse'),big=built('W3',0,'warehouse');
 s.constructions=[small,extra,big];
 assert.equal(G.completedWarehouses(s,0,'civic').length,3);assert.equal(G.completedWarehouses(s,1,'civic').length,0);
 assert.equal(G.warehouseStorageCapacity(small),3);assert.equal(G.warehouseStorageCapacity(big),5);
 assert.deepEqual(G.warehouseInventory(small),[]);
 assert.equal(G.constructionEligibility(s,0,'std_warehouse','civic').reasons.some(x=>x.includes('учреждение')),false);
 small.warehouseInventory=['Masonry','Steel','Steel'];
 s.constructions.push(built('SKY',0,'skyscraper','civic',{status:'under-construction',materialsDelivered:['Lumber','Masonry','Steel']}));
 let testComplete=G.canCompleteConstruction(s,'SKY');assert.equal(testComplete.ok,true,testComplete.reason);
 assert.equal(testComplete.warehouseUse,3);
 assert.equal(G.completeConstruction(s,s.constructions.at(-1)).ok,true);
 assert.deepEqual(small.warehouseInventory,[]);
 assert.deepEqual(G.completedWarehouses(s,1,'civic'),[],'cannot use rival warehouse');
});

test('standard buildings satisfy own city goals but rival builds do not satisfy personal construction goals',()=>{
 const s=state();
 s.constructions=[built('S1',0,'std_fire','civic'),built('S2',0,'std_clinic','mission')];
 assert.equal(G.cityGoalEvaluation(s,0,'C04').complete,true,'two different public types in different districts');
 assert.equal(G.cityGoalEvaluation(s,1,'C04').complete,false,'opponent buildings not owned');
 assert.equal(G.completedCitywideServices(s,'firehouse').length,1);
 assert.equal(G.completedCitywideServices(s,'clinic').length,1);
});

test('each of four standard projects has a $2 fee, paid at construction start without changing recipes or VP',()=>{
 for(const id of G.STANDARD_PROJECTS.map(p=>p.id)){
  const s=state(),land=s.districts.civic.landValue,before=s.players[0].capital;
  const check=G.constructionEligibility(s,0,id,'civic');
  assert.equal(check.ok,true,id);
  assert.deepEqual({land:check.landCost,fee:check.standardFee,total:check.cost},{land,fee:2,total:land+2},id);
  const result=G.beginConstruction(s,0,id,'civic');
  assert.equal(result.ok,true,id);assert.equal(s.players[0].capital,before-land-2,id);
  assert.equal(result.construction.status,'under-construction');
  assert.equal(result.construction.materialsDelivered.length,0,'fee never supplies materials');
  assert.equal(s.players[0].workersLeft,2,id);
 }
});

test('standard fee cannot be bypassed with insufficient funds and contract discounts land only',()=>{
 const s=state(),land=s.districts.civic.landValue,p=s.players[0];
 p.capital=land+1;
 const beforeWorkers=p.workersLeft;
 assert.equal(G.constructionEligibility(s,0,'std_clinic','civic').ok,false);
 assert.ok(G.constructionEligibility(s,0,'std_clinic','civic').reasons.some(t=>t.includes('капитала')));
 assert.equal(G.beginConstruction(s,0,'std_clinic','civic').ok,false);
 assert.equal(s.constructions.length,0);
 assert.equal(p.capital,land+1);
 assert.equal(p.workersLeft,beforeWorkers);
 // A $2 building-office discount can only reduce land, never the fixed fee.
 p.bureauContracts=1;
 p.capital=land; // land 3 - discount 2 + fixed 2 = $3.
 const discounted=G.constructionEligibility(s,0,'std_clinic','civic');
 assert.equal(discounted.ok,true);
 assert.equal(discounted.landCost,Math.max(0,land-2));
 assert.equal(discounted.standardFee,2);
 assert.equal(discounted.cost,discounted.landCost+2);
 const completed=G.beginConstruction(s,0,'std_clinic','civic');
 assert.equal(completed.ok,true);
 assert.equal(completed.cost,discounted.cost);
 assert.equal(p.capital,land-discounted.cost);
 assert.equal(p.bureauContracts,0);
});

test('regular market projects retain land-only build cost; no fee for an existing saved standard building',()=>{
 const s=state(),land=s.districts.civic.landValue;
 s.players[0].portfolio=['bureau'];
 const regular=G.constructionEligibility(s,0,'bureau','civic');
 assert.equal(regular.ok,true);
 assert.equal(regular.standardFee,0);assert.equal(regular.landCost,land);assert.equal(regular.cost,land);
 s.constructions=[built('OLD',0,'std_warehouse','civic')];
 assert.equal(s.constructions[0].status,'complete');
 const money=s.players[0].capital;
 assert.equal(G.completedWarehouses(s,0,'civic').length,1);
 assert.equal(s.players[0].capital,money,'loading an old finished building never charges a fee retroactively');
});
