import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const fresh=()=>G.createInitialState({rng:()=>0.1});
const prepareDevelopment=s=>{
  s.phase='development';
  s.view='city';
  s.developmentPlayer=0;
  s.developmentComplete=true;
  s.newsLastResolvedRound=0;
  s.pendingSailorRecruitments=[];
  s.pendingWorkforceLinks=[];
  s.pendingPressCampaigns=[];
};

test('C1.1 fresh game: one independent public suspicion track per player, all initially zero',()=>{
  const s=fresh();
  assert.equal(G.MAX_SUSPICION,3);
  assert.deepEqual(s.players.map(p=>p.suspicion),[0,0,0]);
  assert.deepEqual(s.players.map(p=>G.suspicionLevel(s,p.id)),[0,0,0]);
  assert.equal(G.suspicionLevel(s,-1),null);
  assert.equal(G.suspicionLevel(s,99),null);
  assert.equal(s.players[0].workers.some(w=>Object.hasOwn(w,'suspicion')),false);
});

test('C1.1 increase/decrease saturates 0..3 and never affects another player',()=>{
  const s=fresh();
  assert.deepEqual(G.changeSuspicion(s,1,2),{ok:true,playerId:1,from:0,to:2,change:2});
  assert.deepEqual(G.changeSuspicion(s,1,2),{ok:true,playerId:1,from:2,to:3,change:1});
  assert.deepEqual(G.changeSuspicion(s,1,20),{ok:true,playerId:1,from:3,to:3,change:0});
  assert.deepEqual(G.changeSuspicion(s,1,-1),{ok:true,playerId:1,from:3,to:2,change:-1});
  assert.deepEqual(G.changeSuspicion(s,1,-20),{ok:true,playerId:1,from:2,to:0,change:-2});
  assert.deepEqual(s.players.map(p=>p.suspicion),[0,0,0]);
});

test('C1.1 explicit reset is a pure state update: no arrest, VP/Influence/cash or worker mutation',()=>{
  const s=fresh(),p=s.players[0];
  const snapshot={capital:p.capital,influence:p.influence,prestige:p.prestige,
    workers:JSON.stringify(p.workers),left:p.workersLeft,order:JSON.stringify(s.yearTurnOrder)};
  assert.equal(G.setSuspicion(s,0,3).to,3);
  assert.deepEqual(G.setSuspicion(s,0,0),{ok:true,playerId:0,from:3,to:0,change:-3});
  assert.equal(p.suspicion,0);
  assert.equal(p.capital,snapshot.capital);
  assert.equal(p.influence,snapshot.influence);
  assert.equal(p.prestige,snapshot.prestige);
  assert.equal(JSON.stringify(p.workers),snapshot.workers);
  assert.equal(p.workersLeft,snapshot.left);
  assert.equal(JSON.stringify(s.yearTurnOrder),snapshot.order);
});

test('C1.1 invalid ids, delta, level never mutate or create a player',()=>{
  const s=fresh(),before=JSON.stringify(s.players);
  for(const id of [-1,3,1.5,NaN,null,undefined]){
    assert.equal(G.changeSuspicion(s,id,1).ok,false);
    assert.equal(G.setSuspicion(s,id,2).ok,false);
  }
  for(const value of [NaN,Infinity,-Infinity,0.5,'3',undefined,null,{}]){
    assert.equal(G.changeSuspicion(s,0,value).ok,false);
    assert.equal(G.setSuspicion(s,0,value).ok,false);
  }
  assert.equal(JSON.stringify(s.players),before);
});

test('C1.1 normalization of old and malformed save fields is deterministic',()=>{
  assert.equal(G.normalizeSuspicion(undefined),0);
  assert.equal(G.normalizeSuspicion(null),0);
  assert.equal(G.normalizeSuspicion('2'),0);
  assert.equal(G.normalizeSuspicion(2.2),0);
  assert.equal(G.normalizeSuspicion(NaN),0);
  assert.equal(G.normalizeSuspicion(-5),0);
  assert.equal(G.normalizeSuspicion(15),3);
  assert.deepEqual([0,1,2,3].map(G.normalizeSuspicion),[0,1,2,3]);
});

test('C1.1 JSON round-trip retains levels and a year change does not clear suspicion',()=>{
  const s=fresh();
  G.setSuspicion(s,0,1);G.setSuspicion(s,1,2);G.setSuspicion(s,2,3);
  const revived=JSON.parse(JSON.stringify(s));
  assert.deepEqual(revived.players.map(p=>p.suspicion),[1,2,3]);
  prepareDevelopment(revived);
  const first=G.cleanupMarket(revived,{rng:()=>0.1});
  assert.equal(first.reason,'crime-choice');
  assert.equal(first.options.playerId,1);
  const second=G.resolveAnnualCrimeAssessment(revived,1,'cash',null,{rng:()=>0.1});
  assert.equal(second.reason,'crime-choice');
  assert.equal(second.options.playerId,2);
  const result=G.resolveAnnualCrimeAssessment(revived,2,'cash',null,{rng:()=>0.1});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.deepEqual(revived.players.map(p=>p.suspicion),[1,2,3]);
  assert.equal(G.suspicionLevel(revived,1),2);
});

test('C1.1 game ending in 1905 retains suspicion after mandatory C2 fine, and never double-charges',()=>{
  const s=fresh();
  s.round=G.MAX_ROUNDS;
  prepareDevelopment(s);
  // Already resolved current year's newspaper: only the C1.1 integration boundary is under test.
  s.newsLastResolvedRound=G.MAX_ROUNDS;
  s.pressCampaignQueuedRound=G.MAX_ROUNDS;
  s.players[0].capital=20;
  G.setSuspicion(s,0,3);
  const p=s.players[0],start={cash:p.capital,vp:p.prestige,inf:p.influence};
  const pending=G.cleanupMarket(s,{rng:()=>0.1});
  assert.equal(pending.reason,'crime-choice');
  const result=G.resolveAnnualCrimeAssessment(s,0,'cash',null,{rng:()=>0.1});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(result.finished,true);
  assert.equal(p.suspicion,3);
  assert.deepEqual({cash:p.capital,vp:p.prestige,inf:p.influence},{...start,cash:start.cash-6});
});
