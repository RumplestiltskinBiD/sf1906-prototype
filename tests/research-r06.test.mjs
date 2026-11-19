import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {researchCardById} from '../research-cards.js';

const clone=s=>JSON.parse(JSON.stringify(s));
const snap=s=>JSON.stringify(s);
const houses=(pid=0)=>[
  {id:'HOME-A-'+pid,playerId:pid,projectId:'tenement',districtId:'outerrichmond',status:'complete',materialsDelivered:[]},
  {id:'HOME-B-'+pid,playerId:pid,projectId:'cottages',districtId:'innersunset',status:'complete',materialsDelivered:[]}
];
function city({funded=true,round=1}={}){
 const s=G.createInitialState({rng:()=>0.3});
 s.round=round;s.phase='declare';s.declarationIndex=0;s.yearTurnOrder=[0,1,2];
 s.firstPlayer=0;s.newsCurrentIds=['E02'];s.newsC03Offer=null;s.newsLastResolvedRound=0;
 s.players.forEach(p=>{p.capital=30;p.prestige=12;p.goals=[];p.goalTakenRound=null;});
 s.goalMarket=G.CITY_GOALS.map((g,i)=>({uid:'TEST-'+round+'-'+i,id:g.id}));
 s.goalSessionClaims=[];
 if(funded)Object.assign(s.research.R06,{status:'funded',holderId:2,fundedRound:1});
 return s;
}
function claim(s,goalId,{advance=false,pid=0}={}){
 const slot=s.goalMarket.findIndex(g=>g?.id===goalId);
 assert.notEqual(slot,-1,'fixture expects goal '+goalId);
 s.declarationIndex=s.yearTurnOrder.indexOf(pid);
 return G.claimCityGoal(s,slot,{takeAdvance:advance});
}
test('R06 card keeps approved cost, global access, $3 advance, settlement and 1-active limit',()=>{
 const c=researchCardById('R06');
 assert.equal(c.fundingCost,4);assert.deepEqual(c.sponsorReward,{vp:2,influence:1});
 assert.equal(c.effect.type,'city-goal-advance-option');
 assert.equal(c.effect.advanceAmount,3);
 assert.equal(c.effect.onSuccessMoneyRewardReduction,3);
 assert.equal(c.effect.onFailureAdditionalVpPenalty,3);
 assert.equal(c.effect.maxActiveAdvancedGoalsPerPlayer,1);
 assert.equal(c.effect.grantTiming,'when-taking-new-city-goal');
 assert.equal(c.effect.extraWorkerActionRequiredForAdvance,false);
});
test('R06 funded by rival is usable by active City Hall player; advance is immediate and goal-specific',()=>{
 const s=city();s.players[0].capital=10;
 const before=snap(s),opts=G.cityGoalAdvanceOptions(s,0);
 assert.equal(opts.ok,true);assert.equal(opts.available,true);
 assert.equal(opts.amount,3);assert.equal(opts.maxActive,1);
 assert.equal(snap(s),before,'preview must be pure');
 const result=claim(s,'C01',{advance:true});
 assert.equal(result.ok,true);assert.equal(result.advanceAmount,3);
 assert.equal(s.players[0].capital,13);
 assert.equal(s.players[2].capital,30,'research sponsor does not receive advance');
 assert.equal(s.players[0].goals[0].advanceAmount,3);
 assert.equal(s.players[0].goals[0].status,'active');
 assert.equal(s.goalMarket[0],null);
 assert.equal(s.goalSessionClaims.length,1);
 assert.equal(s.declarationIndex,0,'no extra worker or declaration turn');
 assert.equal(s.players[0].goalTakenRound,1);
});
test('without funded R06 the original claim has no advance, and opting in fails atomically',()=>{
 const s=city({funded:false});
 const prev=snap(s),option=G.cityGoalAdvanceOptions(s,0);
 assert.equal(option.available,false);assert.equal(option.reason,'research-not-funded');
 assert.equal(snap(s),prev);
 assert.equal(G.claimCityGoal(s,0,{takeAdvance:true}).reason,'research-not-funded');
 assert.equal(snap(s),prev);
 const normal=G.claimCityGoal(s,0);
 assert.equal(normal.ok,true);assert.equal(normal.advanceAmount,0);
 assert.equal(s.players[0].capital,30);
 assert.equal(Object.hasOwn(s.players[0].goals[0],'advanceAmount'),false);
});
test('held and unclaimed R06 cannot grant an advance',()=>{
 for(const status of ['held','available']){
  const s=city({funded:false});
  Object.assign(s.research.R06,{status,holderId:status==='held'?1:null,fundedRound:null});
  const before=snap(s);
  assert.equal(claim(s,'C01',{advance:true}).reason,'research-not-funded');
  assert.equal(snap(s),before);
 }
});
test('wrong phase, foreign turn, already-taken and empty slot do not modify state',()=>{
 const s=city();
 const first=G.cityGoalAdvanceOptions(s,1);
 assert.equal(first.available,false);assert.equal(first.reason,'not-city-hall-turn');
 assert.equal(G.cityGoalAdvanceOptions(s,999).reason,'invalid-player');
 s.phase='development';
 const old=snap(s);
 assert.equal(G.claimCityGoal(s,0,{takeAdvance:true}).reason,'wrong-phase');
 assert.equal(snap(s),old);
 s.phase='declare';
 const taken=claim(s,'C01',{advance:true});
 assert.equal(taken.ok,true);
 const after=snap(s);
 assert.equal(G.claimCityGoal(s,1,{takeAdvance:true}).reason,'already-taken');
 assert.equal(snap(s),after);
 s.declarationIndex=1;
 assert.equal(G.claimCityGoal(s,0,{takeAdvance:true}).reason,'empty-slot');
});
test('only one ACTIVE advanced goal per player; refusal cannot consume another card',()=>{
 const s=city();
 assert.equal(claim(s,'C01',{advance:true}).ok,true);
 s.round=2;s.players[0].goalTakenRound=null;
 s.goalMarket=G.CITY_GOALS.map((g,i)=>({uid:'Y2-'+i,id:g.id}));
 const before=snap(s);
 const o=G.cityGoalAdvanceOptions(s,0);
 assert.equal(o.available,false);assert.equal(o.reason,'advance-limit');
 assert.equal(claim(s,'C02',{advance:true}).reason,'advance-limit');
 assert.equal(snap(s),before);
 const allowed=claim(s,'C02');
 assert.equal(allowed.ok,true);assert.equal(allowed.advanceAmount,0);
 assert.equal(s.players[0].capital,33);
});
test('another player can simultaneously obtain one advance from globally funded R06',()=>{
 const s=city();
 assert.equal(claim(s,'C01',{advance:true,pid:0}).ok,true);
 assert.equal(claim(s,'C02',{advance:true,pid:1}).ok,true);
 assert.equal(claim(s,'C03',{advance:true,pid:2}).ok,true);
 for(const p of s.players){
  assert.equal(p.capital,33);
  assert.equal(p.goals.length,1);
  assert.equal(p.goals[0].advanceAmount,3);
 }
});
test('completed advanced goal pays only remainder, full VP and Influence, once next year',()=>{
 const s=city();assert.equal(claim(s,'C01',{advance:true}).ok,true);
 s.constructions=houses(0);
 let reports=G.reportCompletedCityGoals(s);
 assert.equal(reports.length,0,'new goal cannot be reported in same round');
 assert.equal(s.players[0].capital,33);
 s.round=2;
 reports=G.reportCompletedCityGoals(s);
 assert.equal(reports.length,1);
 assert.equal(reports[0].capital,1);assert.equal(reports[0].withheld,3);
 assert.equal(reports[0].advanceAmount,3);
 assert.equal(s.players[0].capital,34,'3 advanced earlier + 1 paid later = original $4');
 assert.equal(s.players[0].prestige,16);
 assert.equal(s.players[0].goals[0].status,'completed');
 assert.equal(G.reportCompletedCityGoals(s).length,0);
 assert.equal(s.players[0].capital,34);
});
test('normal goals keep complete reward and permit pre-existing buildings after R06 funded',()=>{
 const s=city();s.constructions=houses(0);
 assert.equal(claim(s,'C01').ok,true);
 s.round=2;
 const reports=G.reportCompletedCityGoals(s);
 assert.equal(reports.length,1);assert.equal(reports[0].capital,4);
 assert.equal(reports[0].withheld,0);
 assert.equal(s.players[0].capital,34);
 assert.equal(s.players[0].prestige,16);
});
test('after an advanced goal completes the player can take a fresh advance',()=>{
 const s=city();claim(s,'C01',{advance:true});
 s.constructions=houses(0);s.round=2;
 assert.equal(G.reportCompletedCityGoals(s).length,1);
 s.players[0].goalTakenRound=null;
 s.goalMarket=G.CITY_GOALS.map((g,i)=>({uid:'N2-'+i,id:g.id}));
 s.phase='declare';s.declarationIndex=0;
 assert.equal(G.cityGoalAdvanceOptions(s,0).available,true);
 assert.equal(claim(s,'C02',{advance:true}).ok,true);
 assert.equal(s.players[0].goals.filter(g=>g.status==='active'&&g.advanceAmount===3).length,1);
});
test('failure adds 3 VP to original penalty, with no refund and no double charge',()=>{
 const s=city();claim(s,'C05',{advance:true});
 const cash=s.players[0].capital;
 assert.equal(cash,33);
 const out=G.failIncompleteCityGoals(s);
 assert.equal(out.length,1);
 assert.equal(out[0].prestige,-8);assert.equal(out[0].advancePenalty,3);
 assert.equal(s.players[0].prestige,4,'12 - (5+3)');
 assert.equal(s.players[0].capital,cash,'funds are never reclaimed on failure');
 assert.equal(s.players[0].goals[0].status,'failed');
 assert.equal(G.failIncompleteCityGoals(s).length,0);
 assert.equal(s.players[0].prestige,4);
});
test('original VP floor at zero remains intact with extra R06 penalty',()=>{
 const s=city();claim(s,'C05',{advance:true});
 s.players[0].prestige=2;
 G.failIncompleteCityGoals(s);
 assert.equal(s.players[0].prestige,0);
 assert.equal(s.players[0].capital,33);
});
test('only an advance attached to that goal alters its report; other goal retains full reward',()=>{
 const s=city();claim(s,'C01',{advance:true});
 s.round=2;s.players[0].goalTakenRound=null;
 s.goalMarket=G.CITY_GOALS.map((g,i)=>({uid:'N2-'+i,id:g.id}));
 claim(s,'C02');
 s.constructions=[...houses(0),{id:'B1',projectId:'bank',playerId:0,districtId:'financial',status:'complete'},
   {id:'B2',projectId:'bureau',playerId:0,districtId:'soma',status:'complete'}];
 s.round=3;
 const report=G.reportCompletedCityGoals(s);
 assert.equal(report.length,2);
 assert.deepEqual(report.map(r=>r.capital),[1,5]);
 assert.equal(s.players[0].capital,39,'30 + 3 early + 1 + 5');
});
test('old JSON saves without an advance field retain existing rewards and penalties',()=>{
 const s=clone(city());
 delete s.research;
 s.players[0].goals=[
  {uid:'LEGACY1',id:'C01',status:'active',acquiredRound:1},
  {uid:'LEGACY2',id:'C05',status:'active',acquiredRound:1}
 ];
 s.round=2;s.constructions=houses(0);
 let report=G.reportCompletedCityGoals(s);
 assert.equal(report.length,1);assert.equal(report[0].capital,4);
 const failed=G.failIncompleteCityGoals(s);
 assert.equal(failed.length,1);assert.equal(failed[0].prestige,-5);
 assert.equal(failed[0].advancePenalty,0);
 assert.equal(s.players[0].capital,34);
});
test('R06 funding via real research action does not change existing goals retroactively',()=>{
 const s=city({funded:false});claim(s,'C01');
 const oldGoal=clone(s.players[0].goals[0]);
 s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 Object.assign(s.research.R06,{status:'held',holderId:0,fundedRound:null});
 const bank=s.players[0].capital,vp=s.players[0].prestige;
 const funded=G.fundResearch(s,0,'R06');
 assert.equal(funded.ok,true,JSON.stringify(funded));
 assert.equal(s.players[0].capital,bank-4);
 assert.equal(s.players[0].prestige,vp+2);
 assert.deepEqual(s.players[0].goals[0],oldGoal);
 s.round=2;s.constructions=houses(0);
 assert.equal(G.reportCompletedCityGoals(s)[0].capital,4);
});
test('final 1905 cleanup reports completed advanced goals and charges failures once',()=>{
 const s=city({round:6});s.phase='development';s.developmentComplete=true;
 s.newsCurrentIds=['E05'];s.newsLastResolvedRound=5;
 s.players[0].goals=[
  {uid:'READY',id:'C01',status:'active',acquiredRound:6,advanceAmount:3},
  {uid:'FAILED',id:'C05',status:'active',acquiredRound:5,advanceAmount:3}
 ];
 s.players[0].capital=25;s.players[0].prestige=20;s.constructions=houses(0);
 const result=G.cleanupMarket(s,{rng:()=>0.99});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.finished,true);
 assert.equal(s.players[0].goals[0].status,'completed');
 assert.equal(s.players[0].goals[1].status,'failed');
 assert.equal(s.players[0].capital,26,'only $1 outstanding goal reward; no final-year income');
 assert.equal(s.players[0].prestige,16,'20 + 4 - (5+3)');
 assert.equal(s.finished,true);
 assert.equal(G.cleanupMarket(s).ok,false,'cannot collect twice');
});
