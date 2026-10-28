import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
const fresh=()=>G.createInitialState({rng:()=>0.1});
function stage(s,round=1){
 s.phase='development';s.view='city';s.developmentComplete=true;s.round=round;
 s.yearTurnOrder=[0,1,2];
 s.newsLastResolvedRound=round;s.pressCampaignQueuedRound=round;s.pendingPressCampaigns=[];
 s.pendingSailorRecruitments=[];s.pendingWorkforceLinks=[];s.constructions=[];
}
const finish=s=>G.cleanupMarket(s,{rng:()=>0.1});
const paid=(s,pid,choice,id=null)=>G.resolveAnnualCrimeAssessment(s,pid,choice,id,{rng:()=>0.1});
const scores=s=>s.players.map(p=>({cash:p.capital,inf:p.influence,vp:p.prestige,susp:p.suspicion,jailed:p.workers.filter(w=>w.jailed).length}));

test('C2 0/1 suspicion passes automatically, does not clear stars or invent penalties',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,1,1);
 const before=scores(s);
 const result=finish(s);
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(s.round,2);assert.equal(s.crimeAssessedRound,1);
 assert.equal(s.crimeAssessment,null);assert.equal(s.phase,'declare');
 assert.equal(s.players[1].suspicion,1);
 for(let id=0;id<3;id++){
   assert.equal(s.players[id].prestige,before[id].vp);
   assert.equal(s.players[id].influence,before[id].inf);
 }
});

test('C2 2 stars $3 payment occurs BEFORE income and never removes suspicion',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,0,2);
 const start=s.players[0].capital;
 let r=finish(s);
 assert.equal(r.reason,'crime-choice');assert.equal(s.phase,'crime-assessment');
 assert.equal(r.options.playerId,0);assert.equal(r.options.cost,3);
 assert.equal(s.players[0].capital,start,'no income before payment');
 r=paid(s,0,'cash');
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(s.round,2);
 assert.equal(s.players[0].suspicion,2);assert.equal(s.players[0].capital,start-3+G.roundIncome(s,0));
 assert.equal(s.crimeAssessedRound,1);
});

test('C2 2 stars permits -1 real influence step instead of cash; yearly order never moves midyear',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,0,2);
 s.players[0].influence=5;s.players[1].influence=4;s.players[2].influence=3;
 const order=[...s.yearTurnOrder],cash=s.players[0].capital;
 const r=finish(s);assert.equal(r.reason,'crime-choice');
 assert.equal(r.options.influence,true);
 assert.equal(paid(s,0,'influence').ok,true);
 assert.equal(s.players[0].influence,2,'leap over occupied 4,3');
 assert.equal(s.players[0].suspicion,2);
 assert.equal(s.players[0].capital,cash+G.roundIncome(s,0));
 assert.notDeepEqual(s.yearTurnOrder,order,'new annual order may respond in following year');
});

test('C2 3 stars permits $6, 2 influence steps or $3 + 1 step (only full options)',()=>{
 for(const choice of ['cash','influence','mixed']){
  const s=fresh();stage(s);G.setSuspicion(s,0,3);
  s.players[0].influence=5;s.players[1].influence=4;s.players[2].influence=3;
  const before=s.players[0].capital,initial=s.players[0].influence;
  const first=finish(s);assert.equal(first.reason,'crime-choice');
  assert.equal(first.options.cash,true);assert.equal(first.options.influence,true);assert.equal(first.options.mixed,true);
  const r=paid(s,0,choice);assert.equal(r.ok,true,choice+JSON.stringify(r));
  assert.equal(s.players[0].capital,before-(choice==='cash'?6:choice==='mixed'?3:0)+G.roundIncome(s,0));
  assert.equal(s.players[0].influence,choice==='cash'?initial:choice==='mixed'?2:1);
  assert.equal(s.players[0].suspicion,3);
 }
});

test('C2 payment is mandatory if any full option exists, invalid and unavailable options never mutate',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,0,3);
 s.players[0].capital=4;s.players[0].influence=2;s.players[1].influence=1;s.players[2].influence=0;
 const check=finish(s);
 assert.equal(check.reason,'crime-choice');assert.equal(check.options.cash,false);
 assert.equal(check.options.influence,false);assert.equal(check.options.mixed,false);
 const before=JSON.stringify(s);
 for(const invalid of ['cash','influence','mixed','arrest'])assert.equal(paid(s,0,invalid).ok,false);
 assert.equal(JSON.stringify(s),before);
 // explicit reset fixture for an independent positive-payment test
 const q=fresh();stage(q);G.setSuspicion(q,0,3);
 assert.equal(finish(q).reason,'crime-choice');
 const frozen=JSON.stringify(q);
 assert.equal(paid(q,0,'arrest',q.players[0].workers[0].id).reason,'payment');
 assert.equal(JSON.stringify(q),frozen);
});

test('C2 no possible full payment => chosen real arrest, no partial cash; immediate suspicion 0 and C1.2 sanction',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,0,3);
 s.players[0].capital=2;s.players[0].influence=0;s.players[1].influence=3;s.players[2].influence=4;
 const start=s.players[0].capital,worker=s.players[0].workers[1].id;
 const result=finish(s);
 assert.equal(result.reason,'crime-choice');assert.equal(result.options.canPay,false);
 assert.equal(result.options.unjailed.length,3);
 let r=paid(s,0,'arrest','missing');assert.equal(r.reason,'arrest-worker');
 assert.equal(s.players[0].capital,start);
 r=paid(s,0,'arrest',worker);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.players[0].suspicion,0);assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].workers[1].jailed,true);
 assert.equal(s.players[0].workers[1].arrestedRound,1);
 assert.equal(s.players[0].capital,start+G.roundIncome(s,0),'no partial payment before income');
});

test('C2 with 3 jailed & unable to pay => -3 VP, no 4th arrest and stars remain',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,0,3);
 s.players[0].capital=0;s.players[0].influence=0;
 for(const w of s.players[0].workers)G.jailWorker(s,0,w.id);
 const before=s.players[0].workers.map(w=>({...w}));
 const r=finish(s);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].suspicion,3);
 assert.deepEqual(s.players[0].workers,before);
 assert.equal(s.crimeAssessedRound,1);
});

test('C2 stays serialized between players, fixed order, each company fined once',()=>{
 const s=fresh();stage(s);
 s.yearTurnOrder=[2,0,1];G.setSuspicion(s,2,2);G.setSuspicion(s,0,3);G.setSuspicion(s,1,2);
 let r=finish(s);assert.equal(r.options.playerId,2);
 const first=JSON.stringify(s);
 assert.equal(finish(s).reason,'crime-choice');
 assert.equal(JSON.stringify(s),first);
 r=paid(s,2,'cash');assert.equal(r.options.playerId,0);
 const frozen=JSON.parse(JSON.stringify(s));
 assert.equal(paid(s,1,'cash').reason,'not-current-player');
 assert.deepEqual(s,frozen);
 r=paid(s,0,'cash');assert.equal(r.options.playerId,1);
 r=paid(s,1,'cash');assert.equal(r.ok,true);
 assert.equal(s.crimeAssessedRound,1);assert.equal(s.round,2);
 assert.equal(s.players[2].suspicion,2);assert.equal(s.players[0].suspicion,3);
});

test('C2 reload while awaiting annual choice does not reapply newspaper or another player fine',()=>{
 const s=fresh();stage(s);G.setSuspicion(s,0,2);G.setSuspicion(s,1,3);
 assert.equal(finish(s).options.playerId,0);
 assert.equal(paid(s,0,'cash').options.playerId,1);
 const revived=JSON.parse(JSON.stringify(s));
 const p0=revived.players[0].capital,logCount=revived.log.length;
 assert.equal(finish(revived).reason,'crime-choice');
 assert.equal(revived.players[0].capital,p0);
 assert.equal(revived.log.length,logCount);
 assert.equal(paid(revived,1,'cash').ok,true);
 assert.equal(revived.crimeAssessedRound,1);
});

test('C2 1905 final penalty -5 VP per currently jailed slot, no retroactive loss for replaced ones',()=>{
 const s=fresh();stage(s,G.MAX_ROUNDS);
 G.jailWorker(s,0,s.players[0].workers[0].id);
 G.jailWorker(s,0,s.players[0].workers[1].id);
 G.jailWorker(s,1,s.players[1].workers[0].id);
 s.players[0].prestige=5;s.players[1].prestige=3;
 // Past sentenced employee no longer in workers (already replaced).
 s.players[2].workers[0]={...s.players[2].workers[0],jailed:false,arrestedRound:null};
 const r=finish(s);
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.finished,true);
 assert.equal(s.phase,'finished');assert.equal(s.finalPrisonPenaltyApplied,true);
 assert.equal(s.players[0].prestige,-5);assert.equal(s.players[1].prestige,-2);
 assert.equal(s.players[2].prestige,0);
 const snapshot=JSON.stringify(s);
 assert.deepEqual(G.applyFinalPrisonPenalty(s),{ok:true,applied:false,total:0});
 assert.equal(JSON.stringify(s),snapshot);
});

test('C2 1905 crime assessment then prison scoring, including a newly arrested worker',()=>{
 const s=fresh();stage(s,G.MAX_ROUNDS);
 G.setSuspicion(s,0,3);s.players[0].capital=0;s.players[0].influence=0;
 assert.equal(finish(s).reason,'crime-choice');
 const r=paid(s,0,'arrest',s.players[0].workers[0].id);
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.finished,true);
 assert.equal(s.players[0].prestige,-8,'-3 VP arrest sanction, then -5 VP prison at finale');
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.finalPrisonPenaltyApplied,true);
});

test('C2 5 synthetic players share the one checkpoint and service order',()=>{
 const s=fresh();stage(s);
 for(let id=3;id<5;id++)s.players.push({...s.players[0],id,name:'Test '+id,workers:G.createWorkers(id),workersLeft:3,loans:[],suspicion:0});
 s.yearTurnOrder=[4,2,0,1,3];G.setSuspicion(s,4,2);
 assert.equal(finish(s).options.playerId,4);
 const result=paid(s,4,'cash');assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(s.crimeAssessedRound,1);assert.equal(s.players.length,5);
});
