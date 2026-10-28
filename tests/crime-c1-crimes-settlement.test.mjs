import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function development(){
 const s=G.createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 return s;
}
function jailAll(s,pid){for(const w of s.players[pid].workers)if(!w.jailed)G.jailWorker(s,pid,w.id);}

test('C1.3 case settlement cash: one star, $4, free action, exactly once per game year',()=>{
 const s=development(),p=s.players[0];G.setSuspicion(s,0,3);
 const cash=p.capital,slots=JSON.stringify(s.developmentSlotsUsed),workers=JSON.stringify(p.workers);
 const first=G.settleLegalCase(s,0,'cash');
 assert.deepEqual(first,{ok:true,playerId:0,payment:'cash',before:3,after:2,cost:4,mainActionUsed:false});
 assert.equal(p.capital,cash-4);assert.equal(p.suspicion,2);
 assert.equal(p.caseSettledRound,1);
 assert.equal(JSON.stringify(p.workers),workers);
 assert.equal(JSON.stringify(s.developmentSlotsUsed),slots);
 assert.equal(s.activationMainActionUsed,false);
 const afterFirst=JSON.stringify(s);
 assert.equal(G.settleLegalCase(s,0,'cash').reason,'already-used');
 assert.equal(JSON.stringify(s),afterFirst);
 s.round=2;
 assert.equal(G.settleLegalCase(s,0,'cash').ok,true);
 assert.equal(p.caseSettledRound,2);
 assert.equal(p.suspicion,1);assert.equal(p.capital,cash-8);
});

test('C1.3 influence payment requires two ACTUAL steps and never pays partially',()=>{
 const s=development(),p=s.players[0];G.setSuspicion(s,0,1);
 p.influence=5;s.players[1].influence=4;s.players[2].influence=3;
 const preview=G.legalCaseOptions(s,0);
 assert.equal(preview.influence,true);
 assert.equal(preview.influenceSteps,2);
 const order=[...s.yearTurnOrder];
 assert.equal(G.settleLegalCase(s,0,'influence').ok,true);
 assert.equal(p.influence,1,'skips occupied 4 and 3 during two actual downward steps');
 assert.equal(p.suspicion,0);assert.deepEqual(s.yearTurnOrder,order);
 const t=development();G.setSuspicion(t,0,3);
 t.players[0].influence=2;t.players[1].influence=1;t.players[2].influence=0;
 const initial=JSON.stringify(t);
 assert.equal(G.legalCaseOptions(t,0).influence,false);
 assert.equal(G.settleLegalCase(t,0,'influence').reason,'influence');
 assert.equal(JSON.stringify(t),initial);
});

test('C1.3 cash insufficient, zero suspicion, invalid payment, wrong player/turn are no-ops',()=>{
 const s=development(),p=s.players[0];
 assert.equal(G.settleLegalCase(s,0,'cash').reason,'no-suspicion');
 G.setSuspicion(s,0,2);p.capital=3;
 const snap=JSON.stringify(s);
 assert.equal(G.settleLegalCase(s,0,'cash').reason,'capital');
 assert.equal(G.settleLegalCase(s,0,'credit').reason,'payment');
 assert.equal(G.settleLegalCase(s,1,'cash').reason,'not-active-player');
 assert.equal(G.settleLegalCase(s,99,'cash').reason,'player');
 assert.equal(JSON.stringify(s),snap);
});

test('C1.3 legitimate settlement works with all 3 workers jailed, in service window',()=>{
 const s=development(),p=s.players[0];jailAll(s,0);G.setSuspicion(s,0,2);
 assert.equal(p.workersLeft,0);
 assert.equal(G.canUseFreeAction(s,0),true);
 assert.equal(G.settleLegalCase(s,0,'cash').ok,true);
 assert.equal(p.suspicion,1);
 assert.equal(s.activationMainActionUsed,false);
 assert.equal(G.endActivation(s,0,{skipRemainingService:true}).ok,true);
 assert.equal(G.developmentSlotsRemaining(s,0),0);
 assert.equal(p.workers.length,3);
});

test('C1.3 settlement works after a spent main action; yearly marker roundtrip and reset by year',()=>{
 const s=development(),p=s.players[0];G.setSuspicion(s,0,3);
 const id=p.workers[0].id;
 assert.equal(G.selectWorker(s,0,id).ok,true);
 assert.equal(G.raiseCapital(s,0,'civic').ok,true);
 assert.equal(G.settleLegalCase(s,0,'cash').mainActionUsed,true);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(p.workers[0].used,true);
 const copy=JSON.parse(JSON.stringify(s));
 assert.equal(copy.players[0].caseSettledRound,1);
 assert.equal(G.settleLegalCase(copy,0,'cash').reason,'already-used');
 copy.round=2;copy.phase='development';copy.developmentPlayer=0;copy.developmentComplete=false;
 copy.activationMainActionUsed=false;
 assert.equal(G.settleLegalCase(copy,0,'cash').ok,true);
 assert.equal(copy.players[0].caseSettledRound,2);
});

test('C1.3 free criminal action at suspicion 2 resolves benefit, increases suspicion without arrest',()=>{
 const s=development();G.setSuspicion(s,0,2);
 const r=G.resolveCriminalAction(s,0,{mode:'free',suspicionGain:2,
   perform:draft=>{draft.players[0].capital+=7;return {ok:true,cash:7};}});
 assert.equal(r.ok,true);
 assert.equal(r.arrested,false);
 assert.equal(r.suspicionBefore,2);assert.equal(r.suspicionAfter,3);
 assert.equal(s.players[0].capital,21);
 assert.equal(s.players[0].workersLeft,3);
 assert.equal(s.activationMainActionUsed,false);
});

test('C1.3 on three stars, quick crime resolves reward BEFORE arrest of chosen USED worker',()=>{
 const s=development(),p=s.players[0];p.influence=0;
 const w=p.workers[0],id=w.id;
 assert.equal(G.selectWorker(s,0,id).ok,true);
 assert.equal(G.raiseCapital(s,0,'civic').ok,true);
 assert.equal(G.endActivation(s,0).ok,true);
 // Remaining players can complete their activations until P0's next service/fast window.
 for(const pid of [1,2]){
   G.selectWorker(s,pid,s.players[pid].workers[0].id);
   G.raiseCapital(s,pid,'civic');
   G.endActivation(s,pid);
 }
 assert.equal(G.currentDeveloper(s),0);
 G.setSuspicion(s,0,3);
 const cash=p.capital;
 const result=G.resolveCriminalAction(s,0,{mode:'free',arrestWorkerId:id,suspicionGain:1,
   perform:draft=>{draft.players[0].capital+=8;return {ok:true,reward:8};}});
 assert.equal(result.ok,true);
 assert.equal(result.arrested,true);assert.equal(result.workerId,id);
 assert.equal(s.players[0].capital,cash+8,'reward survives arrest');
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.players[0].workers[0].jailed,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.developmentSlotsUsed[0],1);
});

test('C1.3 main crime catches EXACT actor after action completes; no extra action',()=>{
 const s=development();G.setSuspicion(s,0,3);
 const w=s.players[0].workers[1];G.selectWorker(s,0,w.id);
 const before=s.players[0].capital;
 const r=G.resolveCriminalAction(s,0,{mode:'main',workerId:w.id,suspicionGain:1,
   perform:draft=>G.raiseCapital(draft,0,'civic')});
 assert.equal(r.ok,true);assert.equal(r.arrested,true);
 assert.equal(s.players[0].capital,before+G.RAISE_CAPITAL_AMOUNT);
 assert.equal(s.players[0].workers[1].jailed,true);
 assert.equal(s.players[0].workers[1].used,true);
 assert.equal(s.players[0].workers[0].jailed,false);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.endActivation(s,0).ok,true);
 assert.equal(G.developmentSlotsRemaining(s,0),2);
});

test('C1.3 invalid criminal offender or zero staff prevents reward and suspicion changes',()=>{
 const s=development();G.setSuspicion(s,0,3);
 const before=JSON.stringify(s);
 for(const options of [
  {mode:'free',suspicionGain:1,perform:d=>{d.players[0].capital+=10;return {ok:true};}},
  {mode:'free',arrestWorkerId:'not-worker',suspicionGain:1,perform:d=>({ok:true})},
  {mode:'main',workerId:s.players[0].workers[1].id,suspicionGain:1,perform:d=>({ok:true})}
 ])assert.equal(G.resolveCriminalAction(s,0,options).ok,false);
 assert.equal(JSON.stringify(s),before);
 jailAll(s,0);
 const jailed=JSON.stringify(s);
 assert.equal(G.resolveCriminalAction(s,0,{mode:'free',arrestWorkerId:s.players[0].workers[0].id,suspicionGain:1,
  perform:d=>{d.players[0].capital+=100;return {ok:true};}}).reason,'no-free-worker');
 assert.equal(JSON.stringify(s),jailed);
});

test('C1.3 unsuccessful or malformed criminal callback rolls back money, materials and worker state',()=>{
 const s=development(),id=s.players[0].workers[0].id;
 G.setSuspicion(s,0,3);
 const before=JSON.stringify(s);
 assert.equal(G.resolveCriminalAction(s,0,{mode:'free',arrestWorkerId:id,suspicionGain:1,
  perform:d=>{d.players[0].capital+=100;return {ok:false,reason:'no-material'};}}).reason,'no-material');
 assert.equal(JSON.stringify(s),before);
 assert.equal(G.resolveCriminalAction(s,0,{mode:'free',arrestWorkerId:id,suspicionGain:1,
  perform:()=>{throw Error('payment failed');}}).reason,'action-error');
 assert.equal(JSON.stringify(s),before);
 assert.equal(G.resolveCriminalAction(s,0,{mode:'free',arrestWorkerId:id,suspicionGain:0,
  perform:()=>({ok:true})}).reason,'suspicion-gain');
 assert.equal(JSON.stringify(s),before);
});

test('C1.3 main callback must consume the designated worker and free callback cannot consume a main action',()=>{
 const s=development();G.setSuspicion(s,0,3);
 const w=s.players[0].workers[0];G.selectWorker(s,0,w.id);
 const before=JSON.stringify(s);
 assert.equal(G.resolveCriminalAction(s,0,{mode:'main',workerId:w.id,suspicionGain:1,
   perform:d=>{d.players[0].capital+=5;return {ok:true};}}).reason,'main-action-required');
 assert.equal(JSON.stringify(s),before);
 assert.equal(G.resolveCriminalAction(s,0,{mode:'free',suspicionGain:1,arrestWorkerId:w.id,
   perform:d=>G.raiseCapital(d,0,'civic')}).reason,'free-action-contract');
 assert.equal(JSON.stringify(s),before);
});

test('C1.3 criminal quick actions are forbidden out of turn, but settlement tracks remain independent',()=>{
 const s=development();G.setSuspicion(s,0,3);
 const snapshot=JSON.stringify(s);
 assert.equal(G.resolveCriminalAction(s,1,{mode:'free',suspicionGain:1,
   perform:()=>({ok:true})}).reason,'not-active-player');
 assert.equal(JSON.stringify(s),snapshot);
});

test('C1.3 5-player scenario still cannot exceed 3 worker slots and fixed yearly turn order',()=>{
 const s=development();for(let id=3;id<5;id++)s.players.push({...s.players[0],id,name:'Other '+id,
   key:'test',workers:G.createWorkers(id),workersLeft:3,loans:[],portfolio:[],suspicion:0,caseSettledRound:null});
 s.yearTurnOrder=[4,0,3,1,2];s.developmentPlayer=4;s.developmentSlotsUsed=Array(5).fill(0);
 G.setSuspicion(s,4,3);
 const w=s.players[4].workers[2];
 const r=G.resolveCriminalAction(s,4,{mode:'free',arrestWorkerId:w.id,suspicionGain:1,
  perform:d=>{d.players[4].capital+=5;return {ok:true};}});
 assert.equal(r.ok,true);
 assert.equal(s.players[4].workers.length,3);
 assert.deepEqual(s.yearTurnOrder,[4,0,3,1,2]);
});
