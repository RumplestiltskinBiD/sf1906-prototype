import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function dev(){
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
  s.developmentComplete=false;s.activationMainActionUsed=false;
  return s;
}
const jailAll=(s,pid)=>{for(const w of s.players[pid].workers)assert.equal(G.jailWorker(s,pid,w.id).ok,true);};

test('B2 fresh game has three persisted slots per player',()=>{
  const s=dev();
  assert.deepEqual(G.ensureDevelopmentSlots(s),[0,0,0]);
  assert.equal(G.developmentSlotsRemaining(s,0),3);
  assert.equal(G.canUseFreeAction(s,0),true);
  assert.equal(G.endActivation(s,0).reason,'main-action-required');
  assert.deepEqual(s.developmentSlotsUsed,[0,0,0]);
});

test('B2 all jailed keeps legal fast actions and one service pass, not a fourth main action',()=>{
  const s=dev();jailAll(s,0);
  assert.equal(s.players[0].workersLeft,0);
  assert.equal(G.currentDeveloper(s),0);
  assert.equal(G.canUseFreeAction(s,0),true);
  assert.equal(G.canTakeMainAction(s,0),false);
  assert.equal(G.endActivation(s,1).reason,'turn');
  assert.equal(G.endActivation(s,0,{skipRemainingService:true}).ok,true);
  assert.deepEqual(s.developmentSlotsUsed,[3,0,0]);
  assert.equal(G.currentDeveloper(s),1);
  assert.equal(G.endActivation(s,0).reason,'turn');
  assert.equal(G.developmentSlotsRemaining(s,0),0);
  assert.equal(G.canUseFreeAction(s,0),false);
  assert.equal(s.players[0].workers.length,3);
});

test('B2 all nine service turns rotate in fixed order and finish without deadlock',()=>{
  const s=dev();for(let pid=0;pid<3;pid++)jailAll(s,pid);
  const order=[];
  for(let i=0;i<9;i++){
    const pid=G.currentDeveloper(s);order.push(pid);
    assert.equal(G.canUseFreeAction(s,pid),true);
    assert.equal(G.endActivation(s,pid).ok,true);
  }
  assert.deepEqual(order,[0,1,2,0,1,2,0,1,2]);
  assert.equal(s.developmentComplete,true);
  assert.equal(G.currentDeveloper(s),null);
  assert.deepEqual(s.developmentSlotsUsed,[3,3,3]);
  assert.equal(G.endActivation(s,2).reason,'wrong-phase');
});

test('B2 an arrested worker never creates an extra activation or recovers its spent main action',()=>{
  const s=dev();
  const w=s.players[0].workers[0];
  assert.equal(G.selectWorker(s,0,w.id).ok,true);
  assert.equal(G.raiseCapital(s,0,'civic').ok,true);
  assert.equal(G.jailWorker(s,0,w.id).ok,true);
  assert.equal(G.endActivation(s,0).ok,true);
  assert.equal(G.developmentSlotsRemaining(s,0),2);
  for(const pid of [1,2]){
    const free=s.players[pid].workers[0];
    assert.equal(G.selectWorker(s,pid,free.id).ok,true);
    assert.equal(G.raiseCapital(s,pid,'civic').ok,true);
    assert.equal(G.endActivation(s,pid).ok,true);
  }
  assert.equal(G.currentDeveloper(s),0);
  jailAll(s,0); // remaining two workers, no extra main action
  assert.equal(G.canTakeMainAction(s,0),false);
  assert.equal(G.endActivation(s,0,{skipRemainingService:true}).ok,true);
  assert.deepEqual(s.developmentSlotsUsed,[3,1,1]);
  assert.equal(G.canUseFreeAction(s,0),false);
});

test('B2 cannot skip remaining slots while a worker or current main action is available',()=>{
  const s=dev();
  assert.equal(G.endActivation(s,0,{skipRemainingService:true}).reason,'main-action-required');
  const w=s.players[0].workers[0];
  G.selectWorker(s,0,w.id);G.raiseCapital(s,0,'civic');
  assert.equal(G.endActivation(s,0,{skipRemainingService:true}).reason,'service-only');
  assert.equal(G.endActivation(s,0).ok,true);
  assert.deepEqual(s.developmentSlotsUsed,[1,0,0]);
});

test('B2 handles five players in development without changing fixed turn order',()=>{
  const s=dev();
  for(let id=3;id<5;id++)s.players.push({...s.players[0],id,name:'Tester '+id,key:'test',workers:G.createWorkers(id),workersLeft:3,loans:[],portfolio:[]});
  s.yearTurnOrder=[4,1,3,0,2];s.developmentPlayer=4;
  s.developmentSlotsUsed=Array(5).fill(0);
  for(let pid=0;pid<5;pid++)jailAll(s,pid);
  const sequence=[];
  for(let i=0;i<15;i++){
    const pid=G.currentDeveloper(s);sequence.push(pid);
    assert.equal(G.endActivation(s,pid).ok,true);
  }
  assert.deepEqual(sequence,Array(3).fill(s.yearTurnOrder).flat());
  assert.equal(s.developmentComplete,true);
});

test('B2 year transition resets slots without releasing jailed staff a year early',()=>{
  const s=dev();jailAll(s,0);
  s.developmentSlotsUsed=[3,3,3];s.developmentComplete=true;s.developmentPlayer=null;
  s.newsCurrentIds=['E05'];s.newsLastResolvedRound=0;
  const r=G.cleanupMarket(s,{rng:()=>0.1});
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.deepEqual(s.developmentSlotsUsed,[0,0,0]);
  assert.equal(s.players[0].workersLeft,0);
  assert.ok(s.players[0].workers.every(w=>w.jailed));
});
