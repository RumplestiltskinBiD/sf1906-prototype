import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function game(pid=0,districtId='innersunset'){
 const s=G.createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[pid].workers[0].id;
 s.players[pid].workers[0].districtId=districtId;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
 s.constructions=[];return s;
}
function built(id,projectId,districtId,playerId=0,options={}){
 return {id,projectId,districtId,playerId,status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],...options};
}
test('v0.50: two mixed residential-business buildings, lumber only, two copies in deck',()=>{
 for(const id of ['wagonboarding','sailorlodging']){
  const p=G.projectById(id);
  assert.deepEqual(p.types,['Жилое','Бизнес']);
  assert.ok(p.materials.length>0&&p.materials.every(x=>x==='Lumber'));
  assert.equal(G.createProjectCardPool({rng:()=>0.1}).filter(x=>x.id===id).length,2);
 }
});
test('west / actual cargo port building rules, not generic port tag',()=>{
 const s=game();s.players[0].portfolio=['wagonboarding','sailorlodging'];
 assert.equal(G.constructionEligibility(s,0,'wagonboarding','sunset').ok,true);
 assert.equal(G.constructionEligibility(s,0,'wagonboarding','soma').ok,false);
 assert.equal(G.constructionEligibility(s,0,'sailorlodging','marina').ok,false,'port geographic tag but no supply loading node');
 s.players[0].workers[0].districtId='northbeach';
 assert.equal(G.constructionEligibility(s,0,'sailorlodging','northbeach').ok,true);
});
test('wagons: upgrade is a fast action, no selected worker required, once/year, affects income and P',()=>{
 const s=game();const b=built('W','wagonboarding','sunset');s.constructions=[b];
 s.activeWorkerId=null;s.activationMainActionUsed=true;
 const before=G.districtRisk(s,'sunset').fire.raw;
 assert.equal(G.buildingIncome(s,0),1);
 assert.equal(G.upgradeWagonBoarding(s,0,'W').ok,true);
 assert.equal(b.wagonLevel,2);assert.equal(G.buildingIncome(s,0),2);
 assert.equal(G.districtRisk(s,'sunset').fire.raw,before+1);
 assert.equal(G.upgradeWagonBoarding(s,0,'W').reason,'already-upgraded');
 s.round=2;
 assert.equal(G.upgradeWagonBoarding(s,0,'W').ok,true);assert.equal(b.wagonLevel,3);
 assert.equal(G.buildingIncome(s,0),3);
 assert.equal(G.upgradeWagonBoarding(s,0,'W').reason,'max-level');
 assert.equal(s.players[0].workers[0].used,false,'no worker consumed');
});
test('redevelopment uses main worker, reuses land and up to three Lumber, retires old plot, completes 3L building',()=>{
 const s=game(),b=built('W','wagonboarding','sunset',0,{wagonLevel:3});s.constructions=[b];
 for(let k=0;k<4;k++)s.constructions.push(built('X'+k,'tenement','sunset',k%3));
 assert.equal(G.districtConstructionCount(s,'sunset'),5);
 s.players[0].portfolio=['speculative'];s.players[0].bureauContracts=1;
 const cash=s.players[0].capital;
 assert.equal(G.constructionEligibility(s,0,'speculative','sunset').ok,false,'all five slots full');
 const can=G.constructionEligibility(s,0,'speculative','sunset',{redevelopId:'W'});
 assert.equal(can.ok,true,can.reasons.join(' '));assert.equal(can.cost,0);assert.equal(can.redeemedLumber,3);
 const r=G.beginConstruction(s,0,'speculative','sunset',{redevelopId:'W'});
 assert.equal(r.ok,true,r.reasons?.join(' '));assert.equal(r.redevelopment,true);assert.equal(r.completedImmediately,true);
 assert.equal(s.players[0].capital,cash);assert.equal(s.players[0].bureauContracts,1,'do not consume discount on free land');
 assert.equal(b.status,'redeveloped');assert.equal(r.construction.status,'complete');
 assert.deepEqual(r.construction.materialsDelivered,['Lumber','Lumber','Lumber']);
 assert.equal(G.districtConstructionCount(s,'sunset'),5);
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(G.buildingIncome(s,0),G.projectById('speculative').income+2*G.projectById('tenement').income,'old income lost; other owned homes remain');
 assert.equal(G.districtRisk(s,'sunset').fire.raw,4+1,'old high fire removed, new building P+1');
});
test('redevelopment level I credits only required Lumber and cannot bypass warehouse for 4+ resources',()=>{
 const s=game(),b=built('W','wagonboarding','innersunset',0,{wagonLevel:1});
 s.constructions=[b];s.players[0].portfolio=['brickapartments'];
 s.districts.innersunset.landValue=2;
 const r=G.beginConstruction(s,0,'brickapartments','innersunset',{redevelopId:'W'});
 assert.equal(r.ok,true,r.reasons?.join(' '));assert.equal(r.completedImmediately,false);
 assert.deepEqual(r.construction.materialsDelivered,['Lumber']);
 assert.equal(G.constructionProgress(s,r.construction.id).remaining,4);
 assert.equal(G.canCompleteConstruction(s,r.construction.id).reason,'warehouse-required');
});
test('invalid redevelopment does not take a worker or damage boarding',()=>{
 const s=game();const b=built('W','wagonboarding','sunset');s.constructions=[b];s.players[0].portfolio=['wagonboarding'];
 const r=G.beginConstruction(s,0,'wagonboarding','sunset',{redevelopId:'W'});
 assert.equal(r.ok,false);assert.equal(b.status,'complete');assert.equal(s.players[0].workers[0].used,false);
});
test('port delivery queues owner recruitment; lawful and illegal choice are once/year and do not use worker',()=>{
 const s=game(1,'northbeach');
 s.players[0].influence=5;s.players[1].capital=100;
 s.constructions=[built('S','sailorlodging','northbeach',0),built('WH','warehouse','northbeach',1)];
 s.logisticsSupply.broadway=['Lumber','Lumber','Lumber'];
 const make=()=>({playerId:1,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:['Lumber'],route:['northbeach'],drops:[{kind:'warehouse',id:'WH',routeIndex:0,materials:['Lumber']}]});
 const r=G.executeDelivery(s,make());assert.equal(r.ok,true,r.reason);
 assert.equal(G.currentSailorRecruitment(s)?.id,'S');
 assert.equal(G.canTakeMainAction(s,1),false,'choice must be resolved before next action');
 const influence=s.players[0].influence,cash=s.players[0].capital;
 assert.equal(G.resolveSailorRecruitment(s,'S','illegal').ok,true);
 assert.equal(s.players[0].capital,cash+6);
 assert.ok(s.players[0].influence<influence);
 assert.equal(s.constructions[0].sailorRecruitmentRound,s.round);
 assert.equal(G.currentSailorRecruitment(s),null);
 assert.equal(G.executeDelivery(s,make()).ok,true);
 assert.equal(G.currentSailorRecruitment(s),null,'no duplicate in same year');
 s.round=2;s.logisticsSupply.broadway=['Lumber'];
 assert.equal(G.executeDelivery(s,make()).ok,true);
 assert.equal(G.resolveSailorRecruitment(s,'S','lawful').ok,true);
 assert.equal(s.players[0].capital,cash+8);
});
test('zero influence disables illegal recruitment; failed/industrial loading never creates port business',()=>{
 const s=game(1,'northbeach');s.players[0].influence=0;
 s.constructions=[built('S','sailorlodging','northbeach',0),built('WH','warehouse','northbeach',1)];
 s.logisticsSupply.broadway=['Lumber'];
 const plan={playerId:1,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:['Lumber'],route:['northbeach'],drops:[{kind:'warehouse',id:'WH',routeIndex:0,materials:['Lumber']}]};
 const bad={...plan,source:{kind:'node',id:'pacificmail'}};assert.equal(G.executeDelivery(s,bad).ok,false);
 assert.deepEqual(s.pendingSailorRecruitments,[]);
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.equal(G.resolveSailorRecruitment(s,'S','illegal').reason,'influence');
 assert.equal(G.resolveSailorRecruitment(s,'S','lawful').ok,true);
});

test('wagon fire risk escalates from P+1 to P+3 and becomes inspectable at levels II/III',()=>{
 const s=game(0,'sunset');
 const b=built('W','wagonboarding','sunset',1,{wagonLevel:3});
 const house=built('FH','firehouse','sunset',0);
 s.constructions=[b,house];
 assert.equal(G.constructionFireRisk(b),3);
 assert.deepEqual(G.firehouseInspectionTargets(s,'FH','sunset').map(c=>c.id),['W']);
 assert.equal(G.districtRisk(s,'sunset').sources.find(x=>x.constructionId==='W').fire,3);
 const result=G.useFirehouseAction(s,0,'FH','inspect','sunset');
 assert.equal(result.ok,true,result.reason);
 assert.deepEqual(result.targets,['W']);
 assert.equal(s.players[1].capital,97);
 assert.equal(b.fireSafetyModernized,true);
 assert.equal(G.districtRisk(s,'sunset').sources.find(x=>x.constructionId==='W').fire,2);
});
