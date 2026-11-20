import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {
 createInitialState,fundResearch,cleanupMarket,researchLogisticsForecast,
 researchLogisticsArrivalReport,LOGISTICS_NODES,cityGoalAdvanceOptions,
 claimCityGoal,currentReinforcementChoice,resolveReinforcementChoice
} from '../game-core.js';

const snapshot=s=>JSON.stringify(s);
function dev(){
 const s=createInitialState({rng:()=>0.3});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=50;p.workersLeft=3;
   p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.newsCurrentIds=['E02'];s.newsE02TradeWeek={round:s.round,events:[]};
 s.pendingBreadProduction=[];s.pendingWorkforceLinks=[];s.pendingPressCampaigns=[];s.pendingSailorRecruitments=[];
 return s;
}
function financeR05(s){
 s.research.R05={status:'held',holderId:0,fundedRound:null};
 assert.equal(fundResearch(s,0,'R05',{rng:()=>0.2}).ok,true);
}
test('8B R05 is hidden before funding and its exact five-node forecast is read-only',()=>{
 const s=dev();
 s.research.R05={status:'held',holderId:0,fundedRound:null};
 assert.equal(researchLogisticsForecast(s),null);
 financeR05(s);
 s.newsDeck=['H01','F02'];
 const before=snapshot(s),forecast=researchLogisticsForecast(s);
 assert.equal(forecast.year,1901);
 assert.deepEqual(Object.keys(forecast.supply),LOGISTICS_NODES.map(x=>x.id));
 for(const n of LOGISTICS_NODES)assert.equal(forecast.supply[n.id].length,n.throughput);
 assert.deepEqual(forecast.possibleAdjustments,['H03','F03','C02']);
 assert.equal('newsDeck' in forecast,false);
 forecast.supply.broadway.splice(0,1);
 assert.equal(snapshot(s),before,'UI preview cannot consume actual forecast, news or RNG');
});
test('8B R05 receipt compares original plan and post-event manifest after real purchase',()=>{
 const s=dev();financeR05(s);
 s.newsDeck=['H03','E01'];s.developmentComplete=true;
 const plan=structuredClone(s.researchLogisticsForecast.supply);
 assert.equal(cleanupMarket(s,{rng:()=>0.51}).ok,true);
 const receipt=researchLogisticsArrivalReport(s);
 assert.equal(receipt.adjustment,'H03');
 assert.deepEqual(receipt.planned,plan);
 assert.equal(receipt.actual.broadway.length,plan.broadway.length-1);
 const saved=snapshot(s);
 s.logisticsSupply.broadway.shift();
 const after=researchLogisticsArrivalReport(s);
 assert.deepEqual(after,receipt,'actual is receipt at arrival, not current remaining stock');
 assert.equal(s.researchLogisticsArrival.round,2);
 assert.notEqual(snapshot(s),saved,'purchase changes live state but not receipt');
});
test('8B R06 shows opt-in availability, keeps old claim unchanged and limits active advances',()=>{
 const s=createInitialState({rng:()=>0.3});
 s.phase='declare';s.view='hall';s.declarationIndex=0;s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.players[0].capital=20;
 s.research.R06={status:'funded',holderId:2,fundedRound:1};
 let opt=cityGoalAdvanceOptions(s,0);
 assert.equal(opt.available,true);assert.equal(opt.amount,3);
 const goal=s.goalMarket.findIndex(x=>x?.id==='C01');
 assert.ok(goal>=0);
 assert.equal(claimCityGoal(s,goal,{takeAdvance:true}).ok,true);
 assert.equal(s.players[0].capital,23);
 assert.equal(s.players[0].goals[0].advanceAmount,3);
 s.round=2;s.players[0].goalTakenRound=null;
 opt=cityGoalAdvanceOptions(s,0);
 assert.equal(opt.available,false);assert.equal(opt.reason,'advance-limit');
 const before=snapshot(s);
 assert.equal(claimCityGoal(s,1,{takeAdvance:true}).reason,'advance-limit');
 assert.equal(snapshot(s),before,'disabled advance is atomic');
 assert.equal(claimCityGoal(s,1).ok,true,'normal goal is still legal');
 assert.equal(s.players[0].capital,23);
 assert.equal(s.players[0].goals[1].advanceAmount,undefined);
});
test('8B R02 mandatory pending decision survives serialization and has no second worker cost',()=>{
 const s=dev();
 s.research.R02={status:'funded',holderId:2,fundedRound:1};
 s.constructions=[{id:'SITE',playerId:0,projectId:'polytechnic_campus',districtId:'civic',
   status:'under-construction',startedRound:1,completedRound:null,
   materialsDelivered:['Lumber','Lumber','Masonry','Masonry'],warehouseInventory:[]}];
 s.pendingReinforcements=['SITE'];
 const save=JSON.parse(snapshot(s)),choice=currentReinforcementChoice(save);
 assert.equal(choice.ok,true);assert.equal(choice.cost,2);
 const workers=save.players[0].workersLeft;
 assert.equal(resolveReinforcementChoice(save,'SITE',false).ok,true);
 assert.equal(save.players[0].workersLeft,workers);
 assert.equal(save.constructions[0].status,'complete');
 assert.equal(save.constructions[0].earthquakeReinforcement,undefined);
 assert.deepEqual(save.pendingReinforcements,[]);
 assert.equal(resolveReinforcementChoice(save,'SITE',true).reason,'not-pending');
});
test('8B UI delegates transactions and previews to canonical core, not a second economy',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
 for(const token of [
  'researchLogisticsForecast(state)',
  'researchLogisticsArrivalReport(state)',
  'cityGoalAdvanceOptions(state,cd)',
  'claimCityGoal(state,slot,{takeAdvance})',
  'resolveReinforcementChoice(state,id,reinforced)',
  'data-goal-advance-slot',
  'data-research-forecast-node',
  'data-research-arrived-node'
 ])assert.ok(app.includes(token),token);
});
