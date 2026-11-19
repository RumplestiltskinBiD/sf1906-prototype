import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import * as C from '../catastrophe-core.js';
import {researchCardById} from '../research-cards.js';

const snapshot=s=>JSON.stringify(s);
function game({funded=true,capital=50}={}){
 const s=G.createInitialState({rng:()=>0.2});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.players.forEach(p=>{
  p.capital=capital;p.prestige=0;p.portfolio=[];
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
  p.workersLeft=3;
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];
 if(funded)Object.assign(s.research.R02,{status:'funded',holderId:2,fundedRound:1});
 return s;
}
function site(id,projectId='polytechnic_campus',materials=null,{playerId=0,districtId='civic',status='under-construction',warehouseInventory=[]}={}){
 return {id,playerId,projectId,districtId,status,startedRound:1,
  completedRound:status==='complete'?1:null,
  materialsDelivered:materials??[...G.projectById(projectId).materials],
  warehouseInventory:[...warehouseInventory]};
}
function deliveryPlan(id='CAMP'){
 return {playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',
  cargo:['Masonry'],route:['soma'],
  drops:[{kind:'construction',id,materials:['Masonry']}]};
}
function pending(s,id){assert.deepEqual(s.pendingReinforcements,[id]);assert.equal(s.constructions.find(c=>c.id===id).status,'under-construction');}
test('R02 metadata remains distinct from $4 research funding; eligibility is global but held card is inert',()=>{
 const card=researchCardById('R02');
 assert.equal(card.fundingCost,4);assert.equal(card.effect.extraCost,2);
 const s=game({funded:false}),c=site('A');
 s.constructions=[c];
 assert.equal(G.constructionReinforcementOption(s,'A').reason,'research-unfunded');
 s.research.R02={status:'held',holderId:2,fundedRound:null};
 assert.equal(G.completeConstruction(s,c).ok,true);
 assert.deepEqual(s.pendingReinforcements,[]);
 assert.equal(c.earthquakeReinforcement,undefined);
});
test('R02 records choice before completion and does not debit money, consume materials or issue VP first',()=>{
 const s=game(),c=site('A');s.constructions=[c];
 const before={money:s.players[0].capital,prestige:s.players[0].prestige,materials:[...c.materialsDelivered]};
 const result=G.completeConstruction(s,c);
 assert.equal(result.ok,false);assert.equal(result.reason,'reinforcement-choice-required');
 pending(s,'A');assert.equal(s.players[0].capital,before.money);
 assert.equal(s.players[0].prestige,before.prestige);
 assert.deepEqual(c.materialsDelivered,before.materials);
 assert.equal(G.completeConstruction(s,c).reason,'reinforcement-choice-required');
 assert.deepEqual(s.pendingReinforcements,['A'],'queue idempotent');
 assert.equal(G.canUseFreeAction(s,0),false);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.endActivation(s,0).reason,'reinforcement-choice');
 assert.equal(G.cleanupMarket(s).reason,'reinforcement-choice');
});
test('R02 paid choice reduces own U by one and preserves full P, is once per building, reaches Phase II',()=>{
 const s=game(),c=site('A','brickapartments',undefined,{districtId:'civic'});
 s.constructions=[c];
 const rawBefore=G.districtRisk(s,'civic');
 assert.equal(rawBefore.earthquake.raw,0);
 assert.equal(G.completeConstruction(s,c).reason,'reinforcement-choice-required');
 const funds=s.players[0].capital;
 const resolved=G.resolveReinforcementChoice(s,'A',true);
 assert.equal(resolved.ok,true,JSON.stringify(resolved));
 assert.equal(resolved.reinforced,true);
 assert.equal(resolved.reinforcementCost,2);
 assert.equal(s.players[0].capital,funds-2);
 assert.equal(c.status,'complete');assert.equal(c.earthquakeReinforcement,1);
 assert.equal(c.reinforcementCostPaid,2);
 assert.deepEqual(s.pendingReinforcements,[]);
 assert.equal(s.players[0].prestige,G.projectById('brickapartments').prestige);
 const risks=G.districtRisk(s,'civic');
 assert.equal(risks.earthquake.raw,1,'U +2 becomes +1');
 assert.equal(risks.fire.raw,0,'P unchanged');
 assert.equal(risks.sources.find(x=>x.constructionId==='A').earthquake,1);
 assert.equal(C.fromGame(s).civic.z,1,'real Phase II adapter receives reduced U');
 assert.equal(G.resolveReinforcementChoice(s,'A',true).reason,'not-pending');
 assert.equal(G.completeConstruction(s,c).ok,false);
 assert.equal(s.players[0].capital,funds-2);
});
test('declining R02 completes normally without cost or reinforced marker',()=>{
 const s=game(),c=site('A');s.constructions=[c];
 assert.equal(G.completeConstruction(s,c).reason,'reinforcement-choice-required');
 const money=s.players[0].capital;
 const result=G.resolveReinforcementChoice(s,'A',false);
 assert.equal(result.ok,true);
 assert.equal(c.status,'complete');
 assert.equal(c.earthquakeReinforcement,undefined);
 assert.equal(s.players[0].capital,money);
 assert.deepEqual(s.pendingReinforcements,[]);
 assert.equal(G.districtRisk(s,'civic').earthquake.raw,1);
});
test('insufficient cash still permits normal completion; attempted paid choice is non-mutating',()=>{
 const s=game({capital:1}),c=site('A');s.constructions=[c];
 assert.equal(G.completeConstruction(s,c).reason,'reinforcement-choice-required');
 assert.equal(G.currentReinforcementChoice(s).affordable,false);
 const before=snapshot(s);
 assert.equal(G.resolveReinforcementChoice(s,'A',true).reason,'capital');
 assert.equal(snapshot(s),before);
 assert.equal(G.resolveReinforcementChoice(s,'A',false).ok,true);
 assert.equal(s.players[0].capital,1);assert.equal(c.status,'complete');
});
test('R02 does not prompt for projects with no positive U or projects already complete',()=>{
 const s=game(),c=site('W','warehouse');
 s.constructions=[c];
 assert.equal(G.constructionReinforcementOption(s,'W').reason,'not-eligible');
 assert.equal(G.completeConstruction(s,c).ok,true);
 assert.deepEqual(s.pendingReinforcements,[]);
 assert.equal(G.resolveReinforcementChoice(s,'W',true).reason,'not-pending');
 assert.equal(G.constructionReinforcementOption(s,'W').reason,'complete');
});
test('real final Delivery queues R02 after materials land; no extra cargo, worker or money lost',()=>{
 const s=game(),c=site('CAMP','polytechnic_campus',['Lumber','Lumber','Masonry'],{districtId:'soma'});
 s.constructions=[c];s.logisticsSupply.pacificmail=['Masonry'];
 const cost=G.validateDeliveryPlan(s,deliveryPlan()).cost.total;
 const money=s.players[0].capital;
 const result=G.executeDelivery(s,deliveryPlan());
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.deepEqual(result.completed,[]);
 assert.deepEqual(result.pendingReinforcements,['CAMP']);
 pending(s,'CAMP');
 assert.deepEqual(c.materialsDelivered,['Lumber','Lumber','Masonry','Masonry']);
 assert.equal(s.players[0].capital,money-cost);
 assert.equal(s.players[0].prestige,0);
 assert.deepEqual(s.logisticsSupply.pacificmail,[]);
 assert.equal(G.executeDelivery(s,deliveryPlan()).ok,false,'no second delivery while choice pending');
 const count=s.log.length;
 const paid=G.resolveReinforcementChoice(s,'CAMP',true);
 assert.equal(paid.ok,true);
 assert.equal(c.earthquakeReinforcement,1);
 assert.equal(s.players[0].capital,money-cost-2);
 assert.equal(s.players[0].prestige,2);
 assert.equal(G.districtRisk(s,'soma').earthquake.raw,G.DISTRICTS.find(x=>x.id==='soma').earthquakeBase);
 assert.ok(s.log.length>count);
});
test('completion from a completed local Warehouse keeps inventory until choice; consumes it only on finishing',()=>{
 const s=game();
 const w=site('W','warehouse',undefined,{status:'complete',warehouseInventory:['Steel','Steel'],districtId:'soma'});
 const c=site('F','factory',['Lumber','Masonry','Masonry'],{districtId:'soma'});
 s.constructions=[w,c];
 const first=G.completeConstructionFromStorage(s,'F');
 assert.equal(first.reason,'reinforcement-choice-required');
 assert.deepEqual(w.warehouseInventory,['Steel','Steel']);
 assert.deepEqual(c.materialsDelivered,['Lumber','Masonry','Masonry']);
 assert.equal(s.players[0].prestige,0);
 pending(s,'F');
 assert.equal(G.resolveReinforcementChoice(s,'F',false).ok,true);
 assert.deepEqual(w.warehouseInventory,[]);
 assert.equal(c.status,'complete');
 assert.equal(c.earthquakeReinforcement,undefined);
});
test('redevelopment of a three-Lumber building queues R02 rather than instantly awarding VP',()=>{
 const s=game();s.players[0].portfolio=['speculative'];s.players[0].workers[0].districtId='sunset';
 s.constructions=[site('W','wagonboarding',['Lumber','Lumber','Lumber'],
  {status:'complete',districtId:'sunset'})];s.constructions[0].wagonLevel=3;
 const r=G.beginConstruction(s,0,'speculative','sunset',{redevelopId:'W'});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.completedImmediately,false);
 assert.equal(r.construction.status,'under-construction');
 assert.deepEqual(s.pendingReinforcements,[r.construction.id]);
 assert.equal(s.players[0].prestige,0);
 assert.equal(G.resolveReinforcementChoice(s,r.construction.id,true).ok,true);
 assert.equal(r.construction.status,'complete');assert.equal(r.construction.earthquakeReinforcement,1);
 assert.equal(G.districtConstructionCount(s,'sunset'),1);
});
test('courthouse reorganization to an immediately complete U-positive building waits for R02 resolution',()=>{
 const s=game();s.players[0].portfolio=['hall_of_justice'];
 s.constructions=[site('H','hall_of_justice',undefined,{status:'complete',playerId:1}),
   site('S','factory',['Lumber','Masonry','Masonry','Steel'])];
 const r=G.useHallOfJustice(s,0,'H','reorganize','S','hall_of_justice');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.completed,false);
 assert.equal(s.constructions[1].projectId,'hall_of_justice');
 pending(s,'S');
 const money=s.players[0].capital;
 assert.equal(G.resolveReinforcementChoice(s,'S',true).ok,true);
 assert.equal(s.players[0].capital,money-2);
 assert.equal(s.constructions[1].status,'complete');
});
test('pending choice and reinforcement persist through JSON save/reload without duplicate payment',()=>{
 const s=game(),c=site('A');s.constructions=[c];
 assert.equal(G.completeConstruction(s,c).reason,'reinforcement-choice-required');
 const serialized=snapshot(s),restored=JSON.parse(serialized);
 assert.deepEqual(restored.pendingReinforcements,['A']);
 assert.equal(G.currentReinforcementChoice(restored).ok,true);
 assert.equal(G.resolveReinforcementChoice(restored,'A',true).ok,true);
 const done=snapshot(restored);
 const copy=JSON.parse(done);
 assert.equal(G.resolveReinforcementChoice(copy,'A',true).reason,'not-pending');
 assert.equal(snapshot(copy),done);
 assert.deepEqual(G.validateResearchState(copy),[]);
});
test('unauthorized, wrong type or out-of-order resolution cannot mutate pending choices',()=>{
 const s=game(),a=site('A'),b=site('B');s.constructions=[a,b];
 G.completeConstruction(s,a);G.completeConstruction(s,b);
 assert.deepEqual(s.pendingReinforcements,['A','B']);
 for(const [id,choice] of [['B',true],['A','invalid'],['missing',false]]){
  const before=snapshot(s);
  assert.equal(G.resolveReinforcementChoice(s,id,choice).ok,false);
  assert.equal(snapshot(s),before);
 }
 s.developmentPlayer=1;
 const before=snapshot(s);
 assert.equal(G.resolveReinforcementChoice(s,'A',true).reason,'not-owner-turn');
 assert.equal(snapshot(s),before);
 s.developmentPlayer=0;
 assert.equal(G.resolveReinforcementChoice(s,'A',false).ok,true);
 assert.deepEqual(s.pendingReinforcements,['B']);
 assert.equal(G.resolveReinforcementChoice(s,'B',true).ok,true);
 assert.deepEqual(s.pendingReinforcements,[]);
});
test('R02 can be funded in 1905 and still affects only newly completed, not earlier buildings',()=>{
 const s=game({funded:false});s.round=6;
 const old=site('OLD','polytechnic_campus',undefined,{status:'complete'}),fresh=site('NEW');
 s.constructions=[old,fresh];
 s.research.R02={status:'held',holderId:0,fundedRound:null};
 assert.equal(G.fundResearch(s,0,'R02').ok,true);
 assert.equal(s.research.R02.fundedRound,6);
 assert.equal(G.completeConstruction(s,fresh).reason,'reinforcement-choice-required');
 assert.equal(G.resolveReinforcementChoice(s,'NEW',true).ok,true);
 assert.equal(old.earthquakeReinforcement,undefined);
 assert.equal(G.districtRisk(s,'civic').earthquake.raw,1,'old +1 and fresh reinforced +0');
});
