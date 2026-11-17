import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snapshot=s=>JSON.stringify(s);
function game({round=1,issue='E06',cash=30}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';s.finished=false;
 s.newsCurrentIds=[issue];s.newsDeck=s.newsDeck.filter(id=>id!==issue);
 s.newsLastResolvedRound=round-1;
 s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.developmentSlotsUsed=[0,0,0];
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.newsE06Relief=issue==='E06'?{round,choices:[]}:null;
 s.pendingConstruction=null;s.pendingWorkerAction=null;
 s.yearTurnOrder=[0,1,2];s.constructions=[];
 s.players.forEach((p,i)=>{
  p.capital=cash;p.prestige=0;p.influence=[5,10,15][i];p.suspicion=0;
  p.workersLeft=3;p.caseSettledRound=null;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 return s;
}
function turn(s,pid){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activationMainActionUsed=false;s.developmentSlotsUsed[pid]=0;
 s.players[pid].workers.forEach(w=>{w.used=false;});
 s.players[pid].workersLeft=s.players[pid].workers.filter(w=>!w.jailed).length;
 s.activeWorkerId=s.players[pid].workers.find(w=>!w.jailed)?.id||null;
}
function endable(s){
 s.developmentComplete=true;s.developmentPlayer=null;
 s.pendingConstruction=null;s.pendingWorkerAction=null;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];
 s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.newsDeck=['H03',...s.newsDeck.filter(id=>id!=='H03')];
 return s;
}
test('E06 card is active approved moral dilemma, without old insurance fine or emergency defense',()=>{
 const s=game(),c=newsCard('E06');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ДЕНЬГИ ДЛЯ БЕЗРАБОТНЫХ ПОД УГРОЗОЙ!');
 assert.equal(c.target,'none');assert.equal(c.resource,'capital');
 assert.equal(c.delta,0);assert.equal(c.defense,null);
 assert.equal(c.frequency,'oncePerYear');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).threatened,[]);
 assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
});
test('E06 honest path costs personal $6 and one actual main action, no fund cash reaches player',()=>{
 const s=game({cash:6}),p=s.players[0],before=snapshot(s.players[1]);
 const r=G.chooseE06Relief(s,0,'honest');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(p.capital,0);assert.equal(p.prestige,3);
 assert.equal(p.influence,7);assert.equal(p.suspicion,0);
 assert.equal(p.workers[0].used,true);assert.equal(p.workersLeft,2);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(s.developmentSlotsUsed[0],0,'activation slot is spent only when turn closes');
 assert.equal(s.newsE06Relief.choices.length,1);
 assert.deepEqual(s.newsE06Relief.choices[0],{
  round:1,playerId:0,choice:'honest',capitalDelta:-6,vp:3,influenceSteps:2,
  influenceFrom:5,influenceTo:7,suspicionBefore:0,suspicionAfter:0,arrestedWorkerId:null
 });
 assert.equal(snapshot(s.players[1]),before);
 assert.equal(G.chooseE06Relief(s,0,'honest').ok,false);
});
test('E06 honest path is blocked below $6 and absolutely no state is mutated',()=>{
 const s=game({cash:5}),old=snapshot(s);
 assert.equal(G.e06ReliefOptions(s,0).honest,false);
 assert.equal(G.chooseE06Relief(s,0,'honest').reason,'capital');
 assert.equal(snapshot(s),old);
});
test('E06 illegal path immediately pays exactly $8, loses one Influence step and raises suspicion',()=>{
 const s=game({cash:0});s.players[0].suspicion=1;
 const r=G.chooseE06Relief(s,0,'misappropriate');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.arrested,false);
 assert.equal(s.players[0].capital,8);assert.equal(s.players[0].prestige,0);
 assert.equal(s.players[0].influence,4);assert.equal(s.players[0].suspicion,2);
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(r.record.suspicionAfter,2);
 assert.equal(G.chooseE06Relief(s,0,'misappropriate').reason,'already-participated');
});
test('E06 criminal route uses occupied Influence track correctly and clamps at zero',()=>{
 const s=game();s.players[0].influence=3;s.players[1].influence=2;
 assert.equal(G.chooseE06Relief(s,0,'misappropriate').record.influenceSteps,-1);
 assert.equal(s.players[0].influence,1,'occupied 2 must be skipped');
 const low=game();low.players[0].influence=0;
 assert.equal(G.chooseE06Relief(low,0,'misappropriate').ok,true);
 assert.equal(low.players[0].influence,0);
 assert.equal(low.newsE06Relief.choices[0].influenceSteps,0);
});
test('E06 ★★★ illegal selection arrests a chosen non-jailed employee, applies normal sanction',()=>{
 const s=game();s.players[0].suspicion=3;
 // At Influence 3 the illegal −1 step leaves only two downward steps;
 // the approved arrest fallback must set Influence to 0 AND deduct 3 VP.
 s.players[0].influence=3;
 const actorId=s.players[0].workers[0].id,chosenId=s.players[0].workers[1].id;
 const r=G.chooseE06Relief(s,0,'misappropriate',chosenId);
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.arrested,true);
 assert.equal(r.record.arrestedWorkerId,chosenId);
 // Transactional criminal actions replace the cloned game-state object.
 // Verify the committed worker objects, not stale references from before commit.
 assert.equal(s.players[0].workers.find(w=>w.id===chosenId).jailed,true);
 assert.equal(s.players[0].workers.find(w=>w.id===actorId).jailed,false);
 assert.equal(s.players[0].workers.find(w=>w.id===actorId).used,true);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].capital,38);
 assert.equal(s.players[0].influence,0,'3→2 from theft, only 2 sanction steps remain');
 assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].workersLeft,1,'one worker used, another arrested');
});
test('E06 illegal ★★★ can apply three real Influence steps and avoid the fallback VP penalty',()=>{
 const s=game();s.players[0].suspicion=3;
 s.players[0].influence=20;
 assert.equal(G.chooseE06Relief(s,0,'misappropriate',s.players[0].workers[0].id).ok,true);
 assert.equal(s.players[0].influence,16);
 assert.equal(s.players[0].prestige,0);
 assert.equal(s.players[0].workers[0].jailed,true);
 assert.equal(s.players[0].workers[0].used,true);
});
test('E06 criminal ★★★ requires explicit arrest target; invalid targets rollback entire game',()=>{
 const s=game();s.players[0].suspicion=3;const before=snapshot(s);
 assert.equal(G.chooseE06Relief(s,0,'misappropriate').reason,'arrest-worker');
 assert.equal(snapshot(s),before);
 assert.equal(G.chooseE06Relief(s,0,'misappropriate','NOT_A_WORKER').reason,'arrest-worker');
 assert.equal(snapshot(s),before);
 s.players[0].workers[1].jailed=true;
 const already=snapshot(s);
 assert.equal(G.chooseE06Relief(s,0,'misappropriate',s.players[0].workers[1].id).reason,'arrest-worker');
 assert.equal(snapshot(s),already);
});
test('E06 invalid action / turn / resolved / pending / no worker cannot grant an effect',()=>{
 for(const mutate of [
  s=>{s.newsCurrentIds=['E05'];},
  s=>{s.newsLastResolvedRound=s.round;},
  s=>{s.developmentPlayer=1;},
  s=>{s.activeWorkerId=null;},
  s=>{s.activationMainActionUsed=true;},
  s=>{s.pendingConstruction={projectId:'hotel'};},
  s=>{s.pendingWorkerAction={type:'other'};},
  s=>{s.players[0].workers.forEach(w=>{w.jailed=true;});}
 ]){
  const s=game();mutate(s);const before=snapshot(s);
  assert.equal(G.chooseE06Relief(s,0,'misappropriate').ok,false);
  assert.equal(snapshot(s),before);
 }
});
test('E06 rejects wrong choice and wrong player with no mutation',()=>{
 const s=game(),before=snapshot(s);
 for(const args of [[0,'free'],[null,'honest'],[3,'honest'],[-1,'misappropriate']]){
  assert.equal(G.chooseE06Relief(s,...args).ok,false);
  assert.equal(snapshot(s),before);
 }
});
test('Each player may participate independently only once; no other player authorization',()=>{
 const s=game();assert.equal(G.chooseE06Relief(s,0,'honest').ok,true);
 turn(s,1);assert.equal(G.chooseE06Relief(s,1,'misappropriate').ok,true);
 turn(s,2);assert.equal(G.chooseE06Relief(s,2,'honest').ok,true);
 assert.deepEqual(G.e06ReliefPreview(s).remainingPlayers,[]);
 assert.equal(G.e06ReliefPreview(s).choices.length,3);
 turn(s,0);assert.equal(G.chooseE06Relief(s,0,'honest').reason,'already-participated');
});
test('Persisted E06 participation survives JSON reload and ensureNewspaper without doubling payouts',()=>{
 const s=game();assert.equal(G.chooseE06Relief(s,0,'honest').ok,true);
 const saved=snapshot(s),loaded=JSON.parse(saved);
 G.ensureNewspaper(loaded);G.ensureNewspaper(loaded);
 assert.equal(snapshot(loaded),saved);
 turn(loaded,0);
 assert.equal(G.chooseE06Relief(loaded,0,'misappropriate').reason,'already-participated');
 assert.equal(loaded.players[0].capital,24);
});
test('Old mid-year E06 save lazily migrates: no past insurance penalty / free payout',()=>{
 const s=game({round:3});delete s.newsE06Relief;
 const history=[{cardId:'E06',round:1,year:1900,title:'Страховщики требуют денег',
   entries:[{playerId:1,districtIds:['soma'],actual:-2}],
   changes:{1:{capital:-2,influence:0,prestige:0}}}];
 s.newsArchive=structuredClone(history);
 const before=s.players.map(p=>({cash:p.capital,inf:p.influence,vp:p.prestige}));
 G.ensureNewspaper(s);G.ensureNewspaper(s);
 assert.deepEqual(s.newsArchive,history);
 assert.equal(s.newsE06Relief,null);
 assert.deepEqual(s.players.map(p=>({cash:p.capital,inf:p.influence,vp:p.prestige})),before);
 assert.equal(G.chooseE06Relief(s,0,'honest').ok,true);
 assert.equal(s.newsE06Relief.choices.length,1);
 assert.deepEqual(s.newsArchive,history);
});
test('Year close archives E06 choices once, gives no extra fines or rewards and clears ledger',()=>{
 const s=game();s.players[0].suspicion=0;
 const eligible=s.players.map(p=>({cash:p.capital,inf:p.influence,vp:p.prestige}));
 assert.equal(G.chooseE06Relief(s,0,'honest').ok,true);
 endable(s);
 const prior=s.players.map(p=>({cash:p.capital,inf:p.influence,vp:p.prestige}));
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.equal(r.report.cardId,'E06');
 assert.equal(r.report.e06.choices.length,1);
 assert.equal(r.report.e06.unused,2);
 assert.equal(r.report.e06.choices[0].choice,'honest');
 assert.deepEqual(s.players.map(p=>({cash:p.capital,inf:p.influence,vp:p.prestige})),prior);
 assert.equal(s.newsE06Relief,null);
 assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
 assert.deepEqual(s.newsArchive.length,1);
});
test('E06 endable 1905 awards on decision, archive persists and normal crime assessment runs',()=>{
 const s=game({round:6});s.players[0].suspicion=2;
 const r=G.chooseE06Relief(s,0,'misappropriate');
 assert.equal(r.ok,true);assert.equal(s.players[0].suspicion,3);
 endable(s);
 const report=G.resolveNewspaper(s);
 assert.equal(report.ok,true);
 assert.equal(report.report.round,6);
 assert.equal(report.report.e06.choices[0].suspicionAfter,3);
 assert.equal(s.players[0].suspicion,3,'newspaper cannot bypass annual criminal fine');
 assert.equal(s.players[0].capital,38);
});
