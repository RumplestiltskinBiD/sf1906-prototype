import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function dev(round=2){
 const s=G.createInitialState({rng:()=>0.1});
 s.round=round;s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];
 s.players[0].capital=21;
 return s;
}
function jail(s,pid,index,arrestRound){
 const w=s.players[pid].workers[index];
 w.jailed=true;w.arrestedRound=arrestRound;
 s.players[pid].workersLeft=G.availableWorkers(s,pid).length;
 return w;
}

test('D3.1 fresh roster has exactly three ready slots, no invented replacements',()=>{
 const s=dev(1),before=JSON.stringify(s),v=G.workerRosterPreview(s,0);
 assert.equal(v.ok,true);
 assert.deepEqual([v.ready,v.jailed,v.used],[3,0,0]);
 assert.deepEqual(v.workers.map(w=>w.status),['ready','ready','ready']);
 assert.ok(v.workers.every(w=>w.replacementKind===null&&w.replacementYear===null&&w.arrestYear===null));
 assert.equal(JSON.stringify(s),before,'preview never mutates the game');
 assert.equal(G.workerRosterPreview(s,999).reason,'player');
});

test('D3.1 arrest Y shows paid year Y+1 and automatic replacement start Y+2',()=>{
 const s=dev(4);const w=jail(s,0,0,3);
 w.districtId='mission';w.used=true;
 const v=G.workerRosterPreview(s,0),slot=v.workers[0];
 assert.deepEqual([slot.status,slot.arrestYear,slot.paidYear,slot.freeYear],['jailed',1902,1903,1904]);
 assert.equal(slot.eligibleNow,true);
 assert.equal(slot.hireEnabled,true);
 assert.equal(slot.districtId,'mission');
 assert.deepEqual([v.ready,v.jailed,v.used],[2,1,0]);
});

test('D3.1 same-year arrest is not yet eligible, even with money',()=>{
 const s=dev(3),w=jail(s,0,0,3),slot=G.workerRosterPreview(s,0).workers[0];
 assert.deepEqual([slot.arrestYear,slot.paidYear,slot.freeYear],[1902,1903,1904]);
 assert.equal(slot.eligibleNow,false);
 assert.equal(slot.hireEnabled,false);
 assert.equal(w.jailed,true);
});

test('D3.1 1904 and 1905 arrests never promise replacements after Phase I',()=>{
 const s=dev(6);
 jail(s,0,0,5);jail(s,0,1,6);
 const [a,b]=G.workerRosterPreview(s,0).workers;
 assert.deepEqual([a.arrestYear,a.paidYear,a.freeYear,a.eligibleNow],[1904,1905,null,true]);
 assert.deepEqual([b.arrestYear,b.paidYear,b.freeYear,b.eligibleNow],[1905,null,null,false]);
});

test('D3.1 free replacement at Y+2 persists its provenance without granting extra slots',()=>{
 const s=dev(3),w=jail(s,0,0,1);
 s.players[0].suspicion=2;
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[w.id]);
 const v=G.workerRosterPreview(s,0);
 assert.equal(v.workers[0].status,'replaced-free');
 assert.equal(v.workers[0].replacementKind,'free');
 assert.equal(v.workers[0].replacementYear,1902);
 assert.equal(w.districtId,'civic');
 assert.equal(s.players[0].workers.length,3);
 assert.equal(s.players[0].suspicion,2);
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[]);
});

test('D3.1 paid replacement Y+1 persists provenance, no automatic double replacement Y+2',()=>{
 const s=dev(2),w=jail(s,0,0,1);
 s.players[0].suspicion=3;
 const r=G.hireReplacementWorker(s,0,w.id);
 assert.equal(r.ok,true);
 assert.equal(w.replacementKind,'paid');
 assert.equal(w.replacementRound,2);
 const v=G.workerRosterPreview(s,0);
 assert.equal(v.workers[0].status,'replaced-paid');
 assert.equal(v.workers[0].replacementYear,1901);
 assert.equal(s.players[0].suspicion,3);
 s.round=3;
 assert.deepEqual(G.restoreExpiredJailedWorkerSlots(s,0).restored,[]);
 assert.equal(G.workerRosterPreview(s,0).workers[0].replacementYear,1901);
});

test('D3.1 replaced staff can use their ordinary action; status preserves replacement source',()=>{
 const s=dev(2),w=jail(s,0,0,1);
 assert.equal(G.hireReplacementWorker(s,0,w.id).ok,true);
 assert.equal(G.selectWorker(s,0,w.id).ok,true);
 assert.equal(G.raiseCapital(s,0,'civic').ok,true);
 const v=G.workerRosterPreview(s,0),slot=v.workers[0];
 assert.equal(slot.status,'replaced-paid');
 assert.equal(slot.used,true);
 assert.deepEqual([v.ready,v.jailed,v.used],[2,0,1]);
});

test('D3.1 preview for legacy workers without provenance makes no historical claims',()=>{
 const s=dev(4),w=s.players[0].workers[0];
 delete w.replacementKind;delete w.replacementRound;
 const v=G.workerRosterPreview(s,0).workers[0];
 assert.equal(v.status,'ready');
 assert.equal(v.replacementKind,null);
 assert.equal(v.replacementYear,null);
 w.replacementKind='paid';w.replacementRound=100;
 const bad=G.workerRosterPreview(s,0).workers[0];
 assert.equal(bad.replacementKind,null);
 assert.equal(bad.status,'ready');
});

test('D3.1 other players never inherit a replaced staff slot from inspected player',()=>{
 const s=dev(2),w=jail(s,0,0,1);
 G.hireReplacementWorker(s,0,w.id);
 const other=G.workerRosterPreview(s,1);
 assert.equal(other.jailed,0);
 assert.equal(other.ready,3);
 assert.ok(other.workers.every(x=>x.replacementKind===null));
});

test('D3.1 previous paid hire followed by another arrest displays current confinement, no double hire',()=>{
 const s=dev(2),w=jail(s,0,0,1);
 G.hireReplacementWorker(s,0,w.id);
 s.round=3;
 assert.equal(G.jailWorker(s,0,w.id).ok,true);
 const slot=G.workerRosterPreview(s,0).workers[0];
 assert.equal(slot.status,'jailed');
 assert.equal(slot.arrestYear,1902);
 assert.equal(slot.paidYear,1903);
 assert.equal(slot.freeYear,1904);
 assert.equal(slot.replacementKind,null,'past hire must not masquerade as current replacement');
});
