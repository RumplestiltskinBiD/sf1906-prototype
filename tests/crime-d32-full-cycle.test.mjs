import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const rng=()=>0.1;
function city(round=1){
 const s=G.createInitialState({rng});
 s.round=round;s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 return s;
}
function endYear(s){
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 s.developmentSlotsUsed=s.players.map(()=>3);
 s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.newsLastResolvedRound=s.round;s.pressCampaignQueuedRound=s.round;
 s.pendingSailorRecruitments=[];s.pendingWorkforceLinks=[];s.pendingPressCampaigns=[];
 return G.cleanupMarket(s,{rng});
}
const confirm=(s,pid,choice,workerId=null)=>G.resolveAnnualCrimeAssessment(s,pid,choice,workerId,{rng});
function resumeCity(s,playerId=0){
 assert.equal(s.phase,'declare');
 s.phase='development';s.view='city';s.developmentPlayer=playerId;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=s.players.map(()=>0);
}
function worker(s,pid,index){return s.players[pid].workers[index];}
function prison(s,pid,index,round){
 const w=worker(s,pid,index);w.jailed=true;w.arrestedRound=round;
 s.players[pid].workersLeft=G.availableWorkers(s,pid).length;
 return w;
}

test('D3.2 timeline: 1901 annual arrest -> 1902 paid hire in own city action -> 1903 no duplicate free replacement',()=>{
 const s=city(2),p=s.players[0];
 p.capital=2;p.influence=0;p.suspicion=3;
 let r=endYear(s);
 assert.equal(r.reason,'crime-choice');
 assert.equal(s.crimeAssessment.cursor,0);
 assert.equal(G.currentAnnualCrimeAssessment(s).level,3);
 const arrested=worker(s,0,0);
 r=confirm(s,0,'arrest',arrested.id);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.round,3);
 assert.equal(s.phase,'declare');
 assert.equal(arrested.jailed,true);
 assert.equal(arrested.arrestedRound,2);
 assert.equal(p.suspicion,0);
 assert.equal(p.prestige,-3);
 assert.equal(p.capital,5,'income strictly after arrest');
 const resumed=JSON.parse(JSON.stringify(s));
 assert.equal(G.paidReplacementOptions(resumed,0).active,false,'hiring forbidden during City Hall');
 assert.equal(G.hireReplacementWorker(resumed,0,arrested.id).reason,'not-active-turn');
 resumeCity(resumed);
 const curr=resumed.players[0],other=worker(resumed,0,1);
 assert.equal(G.selectWorker(resumed,0,other.id).ok,true);
 assert.equal(G.raiseCapital(resumed,0,'civic').ok,true);
 assert.equal(curr.capital,8);
 assert.equal(G.hireReplacementWorker(resumed,0,arrested.id).ok,true);
 assert.equal(curr.capital,1);
 assert.equal(curr.workers[0].replacementKind,'paid');
 assert.equal(curr.workers[0].replacementRound,3);
 assert.equal(G.canTakeMainAction(resumed,0),false,'hiring does not create a second main action');
 assert.equal(G.endActivation(resumed,0).ok,true);
 for(const pid of [1,2]){
  assert.equal(G.selectWorker(resumed,pid,worker(resumed,pid,0).id).ok,true);
  assert.equal(G.raiseCapital(resumed,pid,'civic').ok,true);
  assert.equal(G.endActivation(resumed,pid).ok,true);
 }
 assert.equal(G.currentDeveloper(resumed),0);
 assert.equal(G.selectWorker(resumed,0,arrested.id).ok,true);
 assert.equal(G.raiseCapital(resumed,0,'civic').ok,true);
 assert.equal(curr.capital,4);
 assert.deepEqual(resumed.developmentSlotsUsed,[1,1,1]);
 assert.equal(G.endActivation(resumed,0).ok,true);
 r=endYear(resumed);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(resumed.round,4);
 assert.equal(resumed.players[0].workers[0].jailed,false);
 assert.equal(resumed.players[0].workers[0].replacementKind,'paid');
 assert.equal(resumed.players[0].workers[0].replacementRound,3);
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(resumed,0).restored,[]);
 assert.equal(resumed.players[0].workers.length,3);
 assert.equal(resumed.players[0].prestige,-3);
});

test('D3.2 no hire: 1901 arrest -> 1902 absent all year -> free 1903 Civic Center replacement',()=>{
 const s=city(2),w=prison(s,0,0,2),p=s.players[0];
 w.districtId='mission';p.suspicion=1;
 let r=endYear(s);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.round,3);
 assert.equal(w.jailed,true);
 assert.equal(w.districtId,'mission');
 assert.equal(G.workerRosterPreview(s,0).workers[0].paidYear,1902);
 resumeCity(s);
 assert.equal(G.workerRosterPreview(s,0).workers[0].hireEnabled,true);
 // Declining paid hire does not silently free the worker.
 assert.equal(w.jailed,true);assert.equal(s.players[0].workers.length,3);
 r=endYear(s);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.round,4);
 assert.equal(w.jailed,false);
 assert.equal(w.districtId,'civic');
 assert.equal(w.replacementKind,'free');
 assert.equal(w.replacementRound,4);
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[]);
 assert.equal(s.players[0].workersLeft,3);
 assert.equal(s.players[0].suspicion,1);
 assert.equal(s.players[0].workers.length,3);
});

test('D3.2 1905: paid replacement of 1904 inmate avoids -5, two current inmates each cost -5, final sanctions once',()=>{
 const s=city(6),p=s.players[0];
 const paid=prison(s,0,0,5);
 prison(s,0,1,6);
 p.capital=7;p.influence=0;p.prestige=15;p.suspicion=3;
 assert.equal(G.hireReplacementWorker(s,0,paid.id).ok,true);
 assert.equal(p.capital,0);
 const r=endYear(s);
 assert.equal(r.reason,'crime-choice');
 const arrest=worker(s,0,2).id;
 const end=confirm(s,0,'arrest',arrest);
 assert.equal(end.ok,true,JSON.stringify(end));
 assert.equal(end.finished,true);
 assert.equal(s.finished,true);assert.equal(s.phase,'finished');
 assert.equal(p.workers[0].jailed,false);
 assert.equal(p.workers[1].jailed,true);
 assert.equal(p.workers[2].jailed,true);
 assert.equal(p.prestige,2,'15 -3 sanction -10 prison');
 assert.equal(p.suspicion,0);
 assert.equal(s.finalPrisonPenaltyApplied,true);
 const freeze=JSON.stringify(s);
 assert.deepEqual(G.applyFinalPrisonPenalty(s),{ok:true,applied:false,total:0});
 assert.equal(JSON.stringify(s),freeze);
 assert.equal(G.hireReplacementWorker(s,0,p.workers[1].id).ok,false);
});

test('D3.2 yearly checkpoint with five players never repeats previously paid penalties after reload',()=>{
 const s=city(4);
 for(let id=3;id<5;id++)s.players.push({...s.players[0],id,name:'Test '+id,workers:G.createWorkers(id),workersLeft:3,loans:[],portfolio:[],goals:[],suspicion:0});
 s.yearTurnOrder=[4,0,2,3,1];s.developmentSlotsUsed=[0,0,0,0,0];
 s.players[4].suspicion=2;s.players[0].suspicion=3;s.players[3].suspicion=2;
 let r=endYear(s);
 assert.equal(r.reason,'crime-choice');assert.equal(r.options.playerId,4);
 r=confirm(s,4,'cash');
 assert.equal(r.options.playerId,0);
 const resumed=JSON.parse(JSON.stringify(s));
 const before=resumed.players[4].capital,logs=resumed.log.length;
 assert.equal(G.cleanupMarket(resumed,{rng}).reason,'crime-choice');
 assert.equal(resumed.players[4].capital,before);
 assert.equal(resumed.log.length,logs);
 r=confirm(resumed,0,'cash');
 assert.equal(r.options.playerId,3);
 r=confirm(resumed,3,'cash');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(resumed.round,5);
 assert.equal(resumed.crimeAssessedRound,4);
 assert.equal(resumed.players[4].workers.length,3);
 assert.deepEqual(resumed.yearTurnOrder.slice().sort(),[0,1,2,3,4]);
});
