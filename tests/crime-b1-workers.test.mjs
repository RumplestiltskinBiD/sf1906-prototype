import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const fixedRng=()=>0.1;
function dev(){
  const s=G.createInitialState({rng:fixedRng});
  s.phase='development';
  s.view='city';
  s.developmentPlayer=0;
  s.developmentComplete=false;
  s.activationMainActionUsed=false;
  return s;
}
function yearTransition(s){
  s.phase='development';
  s.developmentComplete=true;
  s.newsCurrentIds=['E05'];
  s.newsLastResolvedRound=s.round-1;
  const result=G.cleanupMarket(s,{rng:fixedRng});
  assert.equal(result.ok,true,JSON.stringify(result));
  return result;
}
test('B1 fresh slots start free, with no imprisonment metadata',()=>{
  const s=dev();
  assert.equal(s.players.length,3);
  for(const p of s.players){
    assert.equal(p.workers.length,3);
    assert.equal(p.workersLeft,3);
    for(const w of p.workers){
      assert.equal(w.jailed,false);
      assert.equal(w.arrestedRound,null);
      assert.equal(w.used,false);
    }
  }
});
test('B1 jail is a low-level worker state, not a crime/fine transaction',()=>{
  const s=dev(),worker=s.players[0].workers[0];
  worker.districtId='mission';
  assert.equal(G.selectWorker(s,0,worker.id).ok,true);
  s.pendingWorkerAction={type:'raiseCapital',playerId:0};
  const capital=s.players[0].capital,inf=s.players[0].influence,points=s.players[0].prestige;
  const result=G.jailWorker(s,0,worker.id);
  assert.equal(result.ok,true);
  assert.equal(result.arrestedRound,1);
  assert.equal(worker.jailed,true);
  assert.equal(worker.arrestedRound,1);
  assert.equal(worker.districtId,'mission','old employee location preserved for the historical record');
  assert.equal(s.players[0].workersLeft,2);
  assert.equal(s.activeWorkerId,null);
  assert.equal(s.pendingWorkerAction,null);
  assert.equal(G.activeWorker(s,0),null);
  assert.equal(G.availableWorkers(s,0).length,2);
  assert.equal(G.workerCanReachDistrict(s,0,'mission',worker.id),false);
  assert.deepEqual(G.workerReachableDistricts(s,0,worker.id),[]);
  assert.deepEqual(G.selectWorker(s,0,worker.id),{ok:false,reason:'jailed'});
  assert.equal(s.players[0].capital,capital);
  assert.equal(s.players[0].influence,inf);
  assert.equal(s.players[0].prestige,points);
  assert.equal(G.jailWorker(s,0,worker.id).reason,'already-jailed');
  assert.equal(s.players[0].workersLeft,2,'duplicate arrest never subtracts another slot');
});
test('B1 used worker may be jailed without refreshing its main action',()=>{
  const s=dev(),w=s.players[0].workers[0];
  assert.equal(G.selectWorker(s,0,w.id).ok,true);
  assert.equal(G.raiseCapital(s,0,w.districtId).ok,true);
  assert.equal(w.used,true);
  assert.equal(G.jailWorker(s,0,w.id).ok,true);
  assert.equal(w.used,true);
  assert.equal(s.players[0].workersLeft,2);
});
test('B1 jail does not prevent the other two workers from acting',()=>{
  const s=dev();
  const first=s.players[0].workers[0];
  assert.equal(G.jailWorker(s,0,first.id).ok,true);
  assert.equal(G.selectWorker(s,0,s.players[0].workers[1].id).ok,true);
  assert.equal(G.raiseCapital(s,0,'civic').ok,true);
  assert.equal(s.players[0].workersLeft,1);
});
test('B1 all three can be jailed without inventing a fourth worker',()=>{
  const s=dev();
  const workers=[...s.players[0].workers];
  for(const w of workers)assert.equal(G.jailWorker(s,0,w.id).ok,true);
  assert.equal(s.players[0].workersLeft,0);
  assert.equal(G.availableWorkers(s,0).length,0);
  assert.equal(G.selectWorker(s,0,workers[0].id).reason,'jailed');
  assert.equal(s.players[0].workers.length,3);
  assert.equal(G.jailWorker(s,0,workers[2].id).reason,'already-jailed');
});
test('B1 arrest year Y remains jailed throughout Y+1; free replacement appears at start of Y+2',()=>{
  const s=dev(),w=s.players[0].workers[0],id=w.id;
  w.districtId='mission';
  assert.equal(G.jailWorker(s,0,id).ok,true);
  yearTransition(s);
  assert.equal(s.round,2);
  assert.equal(s.players[0].workers[0].jailed,true);
  assert.equal(s.players[0].workers[0].arrestedRound,1);
  assert.equal(s.players[0].workers[0].used,false);
  assert.equal(s.players[0].workers[0].districtId,'mission');
  assert.equal(s.players[0].workersLeft,2);
  assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[],'no early restoration');
  yearTransition(s);
  assert.equal(s.round,3);
  const replacement=s.players[0].workers[0];
  assert.equal(replacement.id,id,'same staff SLOT id, new person');
  assert.equal(replacement.number,1);
  assert.equal(replacement.jailed,false);
  assert.equal(replacement.arrestedRound,null);
  assert.equal(replacement.used,false);
  assert.equal(replacement.districtId,'civic');
  assert.equal(s.players[0].workersLeft,3);
  assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[],'idempotent at same round');
  assert.equal(s.players[0].workers.length,3);
});
test('B1 prison terms are independent for different arrests across years',()=>{
  const s=dev();
  const [a,b]=s.players[0].workers;
  assert.equal(G.jailWorker(s,0,a.id).ok,true);
  yearTransition(s); // Y+1 (round 2)
  assert.equal(G.jailWorker(s,0,b.id).ok,true);
  assert.equal(s.players[0].workersLeft,1);
  yearTransition(s); // round 3
  assert.equal(a.jailed,false);
  assert.equal(a.districtId,'civic');
  assert.equal(b.jailed,true);
  assert.equal(b.arrestedRound,2);
  assert.equal(s.players[0].workersLeft,2);
  yearTransition(s); // round 4
  assert.equal(b.jailed,false);
  assert.equal(s.players[0].workersLeft,3);
});
test('B1 arrest transition preserves 1905 prisoner without manufacturing a replacement in finished state',()=>{
  const s=dev(),w=s.players[0].workers[0];
  s.round=6;
  assert.equal(G.jailWorker(s,0,w.id).ok,true);
  const result=yearTransition(s);
  assert.equal(result.finished,true);
  assert.equal(s.phase,'finished');
  assert.equal(w.jailed,true);
  assert.equal(w.arrestedRound,6);
  assert.equal(s.players[0].workersLeft,2);
});
