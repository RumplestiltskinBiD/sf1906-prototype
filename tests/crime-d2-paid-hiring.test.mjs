import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const fresh=()=>G.createInitialState({rng:()=>0.1});
function city(round=2,{capital=20}={}){
 const s=fresh();
 s.round=round;s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=s.players.map(()=>0);
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.players[0].capital=capital;
 return s;
}
function prison(s,pid,index,arrestedRound=s.round-1){
 const w=s.players[pid].workers[index];
 w.jailed=true;w.arrestedRound=arrestedRound;
 s.players[pid].workersLeft=G.availableWorkers(s,pid).length;
 return w;
}
function snapshot(s){return JSON.stringify(s);}

test('D2 options are read-only, show only next-year prisoners and $7 cost',()=>{
 const s=city(3);
 const prev=prison(s,0,0,2),same=prison(s,0,1,3),old=prison(s,0,2,1);
 const before=snapshot(s),options=G.paidReplacementOptions(s,0);
 assert.equal(options.ok,true);
 assert.equal(options.cost,7);
 assert.equal(options.active,true);
 assert.equal(options.affordable,true);
 assert.deepEqual(options.eligible,[prev.id]);
 assert.deepEqual(options.jailed.map(x=>({id:x.id,eligible:x.eligible})),[
  {id:prev.id,eligible:true},{id:same.id,eligible:false},{id:old.id,eligible:false}]);
 assert.equal(snapshot(s),before);
 assert.equal(G.paidReplacementOptions(s,-1).reason,'player');
});

test('D2 next-year free hire costs exactly $7 and replaces a slot in Civic, never a fourth',()=>{
 const s=city(2),p=s.players[0],w=prison(s,0,0,1);
 w.districtId='mission';w.used=true;s.players[0].workersLeft=G.availableWorkers(s,0).length;
 p.suspicion=3;p.influence=8;p.prestige=-2;
 const before={cash:p.capital,inf:p.influence,prestige:p.prestige,slots:s.developmentSlotsUsed.slice()};
 const res=G.hireReplacementWorker(s,0,w.id);
 assert.equal(res.ok,true);
 assert.equal(res.cost,7);
 assert.equal(res.mainActionAvailable,true);
 assert.equal(res.remainingActivations,3);
 assert.equal(p.capital,before.cash-7);
 assert.equal(p.suspicion,3);
 assert.equal(p.influence,before.inf);
 assert.equal(p.prestige,before.prestige);
 assert.equal(p.workers.length,3);
 assert.equal(p.workers[0],w,'stable slot identity');
 assert.deepEqual({id:w.id,number:w.number,jailed:w.jailed,arrestedRound:w.arrestedRound,used:w.used,districtId:w.districtId},
 {id:'P1W1',number:1,jailed:false,arrestedRound:null,used:false,districtId:'civic'});
 assert.equal(p.workersLeft,3);
 assert.deepEqual(s.developmentSlotsUsed,before.slots);
 assert.equal(s.log.at(-1).msg.includes('исключён из штата'),true);
});

test('D2 all three jailed have genuine service turn; hire allows a main action in that same window',()=>{
 const s=city(2,{capital:21});
 for(let i=0;i<3;i++)prison(s,0,i,1);
 assert.equal(s.players[0].workersLeft,0);
 assert.equal(G.canUseFreeAction(s,0),true);
 assert.equal(G.canTakeMainAction(s,0),false);
 const first=s.players[0].workers[0];
 assert.equal(G.hireReplacementWorker(s,0,first.id).ok,true);
 assert.equal(G.selectWorker(s,0,first.id).ok,true);
 assert.equal(G.canTakeMainAction(s,0),true);
 assert.equal(G.raiseCapital(s,0,'civic').ok,true);
 assert.equal(s.players[0].capital,17);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.hireReplacementWorker(s,0,s.players[0].workers[1].id).ok,true);
 assert.equal(s.players[0].capital,10);
 assert.equal(G.canTakeMainAction(s,0),false,'no second main action in current activation');
 assert.equal(G.endActivation(s,0).ok,true);
 assert.deepEqual(s.developmentSlotsUsed,[1,0,0]);
 assert.equal(s.players[0].workers.length,3);
});

test('D2 repeat hiring or hiring a non-prisoner cannot charge again',()=>{
 const s=city();const w=prison(s,0,0,1);
 assert.equal(G.hireReplacementWorker(s,0,w.id).ok,true);
 const previous=snapshot(s);
 assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'not-jailed');
 assert.equal(G.hireReplacementWorker(s,0,'P1W99').reason,'worker');
 assert.equal(snapshot(s),previous);
});

test('D2 requires full $7, cannot partially charge or replace',()=>{
 const s=city(2,{capital:6});const w=prison(s,0,0,1),before=snapshot(s);
 assert.equal(G.paidReplacementOptions(s,0).affordable,false);
 assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'capital');
 assert.equal(snapshot(s),before);
 s.players[0].capital=7;
 assert.equal(G.hireReplacementWorker(s,0,w.id).ok,true);
 assert.equal(s.players[0].capital,0);
});

test('D2 never hires during arrest year, including 1905; no state mutation',()=>{
 for(const round of [1,2,6]){
  const s=city(round),w=prison(s,0,0,round),before=snapshot(s);
  assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'same-year');
  assert.equal(snapshot(s),before);
 }
});

test('D2 allowed next-year only, not a stale prisoner two years later',()=>{
 const s=city(4),w=prison(s,0,0,1),before=snapshot(s);
 assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'not-eligible-year');
 assert.equal(snapshot(s),before);
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[w.id]);
 assert.equal(w.jailed,false);
 assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'not-jailed');
});

test('D2 requires own city activation and remaining service slot, not City Hall or rival turn',()=>{
 const s=city(2),w=prison(s,0,0,1);
 for(const [phase,dev,complete,slots] of [
  ['declare',null,false,[0,0,0]],
  ['bids',null,false,[0,0,0]],
  ['crime-assessment',null,false,[0,0,0]],
  ['development',1,false,[0,0,0]],
  ['development',0,true,[0,0,0]],
  ['development',0,false,[3,0,0]],
  ['finished',null,true,[3,3,3]]
 ]){
  s.phase=phase;s.developmentPlayer=dev;s.developmentComplete=complete;s.developmentSlotsUsed=slots;
  const before=snapshot(s);
  assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'not-active-turn',phase);
  assert.equal(snapshot(s),before,phase);
 }
});

test('D2 may hire after current main action but cannot reactivate main until next window',()=>{
 const s=city(2),w=prison(s,0,0,1);
 const other=s.players[0].workers[1];
 assert.equal(G.selectWorker(s,0,other.id).ok,true);
 assert.equal(G.raiseCapital(s,0,'civic').ok,true);
 assert.equal(s.activationMainActionUsed,true);
 const hired=G.hireReplacementWorker(s,0,w.id);
 assert.equal(hired.ok,true);
 assert.equal(hired.mainActionAvailable,false);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.endActivation(s,0).ok,true);
 assert.equal(G.developmentSlotsRemaining(s,0),2);
 for(const playerId of [1,2]){
  assert.equal(G.selectWorker(s,playerId,s.players[playerId].workers[0].id).ok,true);
  assert.equal(G.raiseCapital(s,playerId,'civic').ok,true);
  assert.equal(G.endActivation(s,playerId).ok,true);
 }
 assert.equal(G.currentDeveloper(s),0);
 assert.equal(G.selectWorker(s,0,w.id).ok,true);
 assert.equal(G.raiseCapital(s,0,'civic').ok,true);
 assert.equal(s.players[0].workers.length,3);
});

test('D2 prepaid replacement is not auto-restored again in Y+2 and suspect stars stay',()=>{
 const s=city(2),w=prison(s,0,0,1);
 s.players[0].suspicion=2;
 assert.equal(G.hireReplacementWorker(s,0,w.id).ok,true);
 s.round=3;
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[]);
 assert.equal(w.jailed,false);
 assert.equal(s.players[0].workers.length,3);
 assert.equal(s.players[0].suspicion,2);
});

test('D2 replaced prisoner avoids final -5 VP at 1905, other prison staff still penalized',()=>{
 const s=city(6,{capital:14}),p=s.players[0];
 const old=prison(s,0,0,5);
 prison(s,0,1,6);
 p.prestige=20;
 assert.equal(G.hireReplacementWorker(s,0,old.id).ok,true);
 assert.equal(p.workers.filter(w=>w.jailed).length,1);
 s.developmentComplete=true;
 s.newsLastResolvedRound=6;s.pressCampaignQueuedRound=6;
 const result=G.cleanupMarket(s,{rng:()=>0.1});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.finished,true);
 assert.equal(s.finalPrisonPenaltyApplied,true);
 assert.equal(p.prestige,15,'only prisoner from 1905 still on payroll counts');
 assert.equal(p.capital,7);
 assert.equal(G.hireReplacementWorker(s,0,old.id).ok,false);
 assert.equal(p.prestige,15,'final penalty is idempotent');
});

test('D2 any number of prisoner slots may be hired within one free-action window, no extra turns',()=>{
 const s=city(2,{capital:21}),p=s.players[0];
 const ids=p.workers.map((w,i)=>prison(s,0,i,1).id);
 for(const id of ids)assert.equal(G.hireReplacementWorker(s,0,id).ok,true);
 assert.equal(p.capital,0);
 assert.equal(p.workers.length,3);
 assert.equal(p.workersLeft,3);
 assert.deepEqual(s.developmentSlotsUsed,[0,0,0]);
 assert.equal(G.hireReplacementWorker(s,0,ids[0]).reason,'not-jailed');
});

test('D2 five players: eligibility and money isolated, current order unchanged',()=>{
 const s=city(4);
 for(let id=3;id<5;id++)s.players.push({...s.players[0],id,name:'Test '+id,key:'test',workers:G.createWorkers(id),workersLeft:3,loans:[],portfolio:[]});
 s.yearTurnOrder=[4,1,3,0,2];s.developmentSlotsUsed=Array(5).fill(0);s.developmentPlayer=4;
 const hired=prison(s,4,0,3),other=prison(s,3,0,3),before=s.players[3].capital;
 const result=G.hireReplacementWorker(s,4,hired.id);
 assert.equal(result.ok,true);
 assert.equal(s.players[4].capital,13);
 assert.equal(s.players[3].capital,before);
 assert.equal(other.jailed,true);
 assert.deepEqual(s.yearTurnOrder,[4,1,3,0,2]);
 assert.equal(s.players[4].workers.length,3);
});

test('D2 pending municipal events block hire through normal free-action contract',()=>{
 const s=city(2),w=prison(s,0,0,1);
 s.pendingPressCampaigns=['pending'];
 const before=snapshot(s);
 assert.equal(G.hireReplacementWorker(s,0,w.id).reason,'not-active-turn');
 assert.equal(snapshot(s),before);
});
