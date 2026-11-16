import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function setup(){
 const s=G.createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;s.developmentSlotsUsed=[0,0,0];
 s.activationMainActionUsed=false;s.activeWorkerId=null;
 return s;
}
function choose(s,pid=0,index=0){
 const w=s.players[pid].workers[index];
 assert.equal(G.selectWorker(s,pid,w.id).ok,true);
 return w;
}

test('movement is a whole main action: adjacent only, position persists, no rewards',()=>{
 const s=setup(),w=choose(s),before=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
 const result=G.moveWorker(s,0,'soma');
 assert.equal(result.ok,true);
 assert.deepEqual({from:result.from,to:result.to},{from:'civic',to:'soma'});
 assert.equal(w.districtId,'soma');
 assert.equal(w.used,true);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.deepEqual(s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence})),before);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.moveWorker(s,0,'mission').ok,false);
 assert.equal(G.endActivation(s,0).ok,true);
 assert.equal(s.players[0].workers[0].districtId,'soma');
});
test('cannot remain in the origin, jump far, move into closed land, or move without a worker',()=>{
 const s=setup();
 assert.equal(G.moveWorker(s,0,'soma').ok,false);
 const w=choose(s);
 for(const [destination,reason] of [['civic','no-movement'],['sunset','worker-range'],['presidio','worker-range'],['twinpeaks','worker-range'],[null,'no-movement']]){
   const before=JSON.stringify(s);
   const r=G.moveWorker(s,0,destination);
   assert.equal(r.ok,false,destination);
   assert.equal(r.reason,reason,destination);
   assert.equal(JSON.stringify(s),before,'invalid movement must not spend a worker or change state');
 }
 assert.equal(w.used,false);
 assert.equal(G.moveWorker(s,0,'mission').ok,true);
});
test('Golden Gate Park remains passable but no longer allows a free money action',()=>{
 const s=setup(),w=s.players[0].workers[0];w.districtId='haight';
 choose(s);
 const cap=s.players[0].capital;
 assert.equal(G.moveWorker(s,0,'park').ok,true);
 assert.equal(w.districtId,'park');
 assert.equal(s.players[0].capital,cap);
});
test('zero-capital player may reposition, but cannot conjure cash',()=>{
 const s=setup();s.players[0].capital=0;
 choose(s);
 assert.equal(G.moveWorker(s,0,'soma').ok,true);
 assert.equal(s.players[0].capital,0);
 assert.equal(G.endActivation(s,0).ok,true);
 assert.equal(Object.hasOwn(G,'raiseCapital'),false);
 assert.equal(Object.hasOwn(G,'RAISE_CAPITAL_AMOUNT'),false);
});
test('opponent, jailed worker, and spent main action cannot move',()=>{
 const s=setup();
 assert.equal(G.moveWorker(s,1,'soma').ok,false);
 const w=choose(s);
 w.jailed=true;s.players[0].workersLeft=2;
 assert.equal(G.moveWorker(s,0,'soma').ok,false);
 w.jailed=false;s.players[0].workersLeft=3;
 assert.equal(G.selectWorker(s,0,w.id).ok,true);
 assert.equal(G.moveWorker(s,0,'soma').ok,true);
 assert.equal(G.moveWorker(s,0,'mission').ok,false);
});
