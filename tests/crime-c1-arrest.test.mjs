import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const fresh=()=>G.createInitialState({rng:()=>0.17});
const setInfluences=(s,...values)=>s.players.forEach((p,i)=>{p.influence=values[i];});

test('C1.2 three ACTUAL downward Influence steps pay the full -3 without VP, even when passing occupied positions',()=>{
  const s=fresh();setInfluences(s,5,4,3);
  const w=s.players[0].workers[0];
  G.setSuspicion(s,0,3);
  const oldVp=s.players[0].prestige,order=[...s.yearTurnOrder];
  const preview=G.arrestSanctionPreview(s,0);
  assert.deepEqual({steps:preview.availableSteps,from:preview.from,to:preview.influenceAfter,vp:preview.vpPenalty},{steps:3,from:5,to:0,vp:0});
  assert.equal(s.players[0].influence,5,'preview must not mutate actual player track');
  const r=G.arrestWorkerWithSanctions(s,0,w.id);
  assert.equal(r.ok,true);assert.equal(r.availableInfluenceSteps,3);
  assert.equal(r.influenceBefore,5);assert.equal(r.influenceAfter,0);
  assert.equal(r.influenceDelta,-5,'printed delta differs from 3 real steps');
  assert.equal(r.vpPenalty,0);
  assert.equal(s.players[0].prestige,oldVp);
  assert.equal(s.players[0].suspicion,0);
  assert.equal(w.jailed,true);assert.equal(w.arrestedRound,1);
  assert.deepEqual(s.yearTurnOrder,order,'the current-year order must remain frozen');
});

test('C1.2 three steps on unoccupied positions also cost only Influence',()=>{
  const s=fresh();setInfluences(s,10,6,5);
  G.setSuspicion(s,0,2);
  const preview=G.arrestSanctionPreview(s,0);
  assert.equal(preview.availableSteps,3);assert.equal(preview.influenceAfter,7);
  const r=G.arrestWorkerWithSanctions(s,0,s.players[0].workers[1].id);
  assert.equal(r.influenceAfter,7);
  assert.equal(r.vpPenalty,0);assert.equal(r.suspicionBefore,2);
});

for(const [position,available] of [[2,2],[1,1],[0,0]]){
 test('C1.2 only '+available+' available Influence steps => force Influence 0 and exactly -3 VP',()=>{
   const s=fresh();setInfluences(s,position,9,10);
   const p=s.players[0];p.prestige=1;
   G.setSuspicion(s,0,3);
   const r=G.arrestWorkerWithSanctions(s,0,p.workers[0].id);
   assert.equal(r.ok,true);assert.equal(r.availableInfluenceSteps,available);
   assert.equal(r.vpPenalty,3);
   assert.equal(p.influence,0);assert.equal(p.prestige,-2,'negative VP allowed');
   assert.equal(p.suspicion,0);
 });
}

test('C1.2 occupied zero cannot prevent approved forced-zero sanction',()=>{
  const s=fresh();setInfluences(s,2,1,0);
  const p=s.players[0];p.prestige=4;
  const preview=G.arrestSanctionPreview(s,0);
  assert.equal(preview.availableSteps,0,'both positions 1 and 0 occupied');
  assert.equal(preview.influenceAfter,0);assert.equal(preview.vpPenalty,3);
  const r=G.arrestWorkerWithSanctions(s,0,p.workers[0].id);
  assert.equal(r.ok,true);
  assert.equal(p.influence,0);assert.equal(p.prestige,1);
  assert.equal(s.players[2].influence,0,'existing zero player not altered');
});

test('C1.2 arrest clears only current suspicion; later offences can accumulate again and restoration never re-clears it',()=>{
  const s=fresh();setInfluences(s,0,4,6);const p=s.players[0];
  G.setSuspicion(s,0,3);
  const r=G.arrestWorkerWithSanctions(s,0,p.workers[1].id);
  assert.equal(r.ok,true);
  assert.equal(p.suspicion,0);
  G.changeSuspicion(s,0,2);
  s.round=2;
  assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[]);
  assert.equal(p.suspicion,2);
  s.round=3;
  assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[p.workers[1].id]);
  assert.equal(p.suspicion,2,'restoring a staff slot never clears new suspicion');
  assert.equal(p.workers[1].districtId,'civic');
});

test('C1.2 used worker may be arrested but receives no refunded main action',()=>{
  const s=fresh();s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;
  const p=s.players[0],w=p.workers[0];
  assert.equal(G.selectWorker(s,0,w.id).ok,true);
  assert.equal(G.raiseCapital(s,0,'civic').ok,true);
  assert.equal(w.used,true);assert.equal(s.activationMainActionUsed,true);
  G.setSuspicion(s,0,1);
  const beforeSlots=JSON.stringify(s.developmentSlotsUsed);
  const r=G.arrestWorkerWithSanctions(s,0,w.id);
  assert.equal(r.ok,true);assert.equal(w.used,true);assert.equal(w.jailed,true);
  assert.equal(p.workersLeft,2);
  assert.equal(s.activationMainActionUsed,true);
  assert.equal(JSON.stringify(s.developmentSlotsUsed),beforeSlots);
  assert.equal(G.canTakeMainAction(s,0),false);
  assert.equal(G.endActivation(s,0).ok,true);
  assert.equal(G.developmentSlotsRemaining(s,0),2);
});

test('C1.2 arrest of selected worker clears pending actions but never touches other company or its worker',()=>{
  const s=fresh(),w=s.players[1].workers[1];
  s.phase='development';s.developmentPlayer=1;s.developmentComplete=false;
  assert.equal(G.selectWorker(s,1,w.id).ok,true);
  s.pendingWorkerAction={type:'raiseCapital',playerId:1};
  s.pendingConstruction={projectId:'tenement'};
  G.setSuspicion(s,1,2);G.setSuspicion(s,0,1);
  const p0=JSON.stringify(s.players[0]);
  const r=G.arrestWorkerWithSanctions(s,1,w.id);
  assert.equal(r.ok,true);assert.equal(w.jailed,true);
  assert.equal(s.activeWorkerId,null);assert.equal(s.pendingWorkerAction,null);assert.equal(s.pendingConstruction,null);
  assert.equal(s.players[1].suspicion,0);
  assert.equal(JSON.stringify(s.players[0]),p0);
});

test('C1.2 duplicate/invalid arrest is a strict no-op with no double penalties or suspicion reset',()=>{
  const s=fresh(),p=s.players[0];setInfluences(s,1,9,10);p.prestige=0;
  G.setSuspicion(s,0,3);
  const id=p.workers[0].id;
  assert.equal(G.arrestWorkerWithSanctions(s,0,id).ok,true);
  G.setSuspicion(s,0,2);
  const before=JSON.stringify(s);
  assert.deepEqual(G.arrestWorkerWithSanctions(s,0,id),{ok:false,reason:'already-jailed'});
  assert.deepEqual(G.arrestWorkerWithSanctions(s,0,'missing'),{ok:false,reason:'worker'});
  assert.deepEqual(G.arrestWorkerWithSanctions(s,99,id),{ok:false,reason:'player'});
  assert.deepEqual(G.arrestWorkerWithSanctions(s,0,null),{ok:false,reason:'worker'});
  assert.equal(G.arrestSanctionPreview(s,99).reason,'player');
  assert.equal(JSON.stringify(s),before);
});

test('C1.2 three incarcerated slots cannot be arrested a fourth time; no C2 fallback VP occurs here',()=>{
  const s=fresh(),p=s.players[0];
  for(const w of p.workers)assert.equal(G.arrestWorkerWithSanctions(s,0,w.id).ok,true);
  G.setSuspicion(s,0,3);
  const before=JSON.stringify(s);
  assert.equal(p.workers.length,3);
  assert.equal(p.workersLeft,0);
  for(const w of p.workers)assert.equal(G.arrestWorkerWithSanctions(s,0,w.id).reason,'already-jailed');
  assert.equal(JSON.stringify(s),before);
  assert.equal(p.suspicion,3,'no fourth actual arrest => no free suspicion reset');
});

test('C1.2 arbitrary five-player test preserves order, fixed 3 worker slots and only the arrested company changes',()=>{
  const s=fresh();
  for(let id=3;id<5;id++)s.players.push({...s.players[0],id,name:'Tester '+id,key:'test',
    workers:G.createWorkers(id),workersLeft:3,suspicion:0,prestige:0,loans:[],portfolio:[]});
  setInfluences(s,9,8,7,6,5);
  s.yearTurnOrder=[3,0,4,1,2];s.firstPlayer=3;
  G.setSuspicion(s,4,3);
  const before=s.players.map(p=>JSON.stringify(p));
  const r=G.arrestWorkerWithSanctions(s,4,s.players[4].workers[2].id);
  assert.equal(r.ok,true);assert.equal(r.vpPenalty,3,'only two downward transitions from 5 after leap over occupied 4?');
  assert.equal(s.players[4].workers.length,3);
  for(let id=0;id<4;id++)assert.equal(JSON.stringify(s.players[id]),before[id]);
  assert.deepEqual(s.yearTurnOrder,[3,0,4,1,2]);
});

test('C1.2 sanctions survive JSON reload and a year boundary without extra penalties',()=>{
  const s=fresh();setInfluences(s,1,4,5);const p=s.players[0];p.prestige=0;
  G.setSuspicion(s,0,3);
  assert.equal(G.arrestWorkerWithSanctions(s,0,p.workers[0].id).ok,true);
  const after=JSON.parse(JSON.stringify(s));
  assert.equal(after.players[0].prestige,-3);
  assert.equal(after.players[0].suspicion,0);
  assert.equal(after.players[0].workers[0].jailed,true);
  after.round=2;
  G.restoreExpiredJailedWorkerSlots(after,0);
  assert.equal(after.players[0].prestige,-3);
  assert.equal(after.players[0].workers[0].jailed,true);
});
