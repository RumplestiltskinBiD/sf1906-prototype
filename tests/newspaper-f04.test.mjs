import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snapshot=s=>JSON.stringify(s);
function setup(count=3){
  const s=G.createInitialState({rng:()=>.39});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.newsCurrentIds=['F04'];
  s.newsDeck=s.newsDeck.filter(id=>id!=='F04');
  s.newsF04Notices=null;s.newsLastResolvedRound=0;s.constructions=[];
  while(s.players.length<count){
    const id=s.players.length;
    s.players.push({...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
      workers:G.createWorkers(id),portfolio:[],goals:[]});
  }
  s.players.forEach((p,i)=>{p.capital=20;p.influence=23-i*3;p.prestige=0;});
  s.yearTurnOrder=s.players.map(p=>p.id);
  s.developmentSlotsUsed=Array(count).fill(0);
  s.activeWorkerId=s.players[0].workers[0].id;
  return s;
}
function building(s,id,projectId='factory',districtId='civic',playerId=0,status='complete',extra={}){
  const c={id,projectId,districtId,playerId,status,startedRound:1,
    completedRound:status==='complete'?1:null,materialsDelivered:[],warehouseInventory:[],
    fireSafetyModernized:false,...extra};
  s.constructions.push(c);return c;
}
const reveal=s=>G.ensureNewspaper(s);
const notice=(s,pid)=>G.f04NoticePreview(s)?.notices.find(n=>n.playerId===pid);
function turn(s,pid=0,worker=0,district='civic'){
  s.developmentPlayer=pid;s.activationMainActionUsed=false;
  s.players[pid].workers[worker].districtId=district;
  s.activeWorkerId=s.players[pid].workers[worker].id;
}

test('F04 is the implemented article, not legacy factory influence loss or $1 emergency',()=>{
  const s=setup();building(s,'A');reveal(s);
  const card=newsCard('F04');
  assert.equal(card.designV2.status,'implemented-for-playtest');
  assert.equal(card.title,'ИНСПЕКТОРЫ БОЛЬШЕ НЕ ЗАКРЫВАЮТ ГЛАЗА!');
  assert.doesNotMatch(card.article,/взятк|подкуп/i);
  assert.equal(card.target,'none');assert.equal(card.delta,0);
  assert.equal(card.defense,null);assert.equal(card.frequency,'oncePerYear');
  assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
  assert.deepEqual(G.newsPreview(s).entries,[]);
  assert.equal(G.newsPreview(s).f04.notices.length,1);
});
for(const count of [3,4,5]){
 test('F04 gives exactly one highest-fire notice per eligible owner, including '+count+' players',()=>{
  const s=setup(count);
  for(let pid=0;pid<count;pid++){
    building(s,'F'+pid,'factory','civic',pid);
    building(s,'L'+pid,'tenement','financial',pid);
  }
  reveal(s);
  assert.equal(G.f04NoticePreview(s).notices.length,count);
  for(let pid=0;pid<count;pid++){
    assert.equal(notice(s,pid).constructionId,'F'+pid);
    assert.equal(notice(s,pid).personalFire,2);
    assert.equal(notice(s,pid).status,'open');
  }
  const before=snapshot(s);G.newsPreview(s);G.ensureNewspaper(s);
  assert.equal(snapshot(s),before,'repeated previews must not retarget');
  const result=G.resolveNewspaper(s);
  assert.equal(result.ok,true);assert.equal(result.report.entries.length,count);
  assert.equal(result.report.f04.notices.length,count);
  assert.deepEqual(s.players.map(p=>p.capital),Array(count).fill(16));
  assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
  assert.equal(s.newsArchive.length,1);
 });
}
test('incomplete, modernized and nonpositive-fire sites get no notice, including later builds',()=>{
 const s=setup();
 building(s,'UNFINISHED','factory','civic',0,'under-construction');
 building(s,'ALREADY','factory','civic',1,'complete',{fireSafetyModernized:true});
 building(s,'NONPOS','std_fire','financial',2);
 reveal(s);
 assert.deepEqual(G.f04NoticePreview(s).notices,[]);
 building(s,'NEW','factory','civic',0);
 G.ensureNewspaper(s);
 assert.deepEqual(G.f04NoticePreview(s).notices,[],'site after reveal excluded');
 const before=snapshot(s);
 assert.equal(G.resolveF04Notice(s,0,'urgent').reason,'no-notice');
 assert.equal(snapshot(s),before);
 assert.deepEqual(G.resolveNewspaper(s).report.entries,[]);
 assert.deepEqual(s.players.map(p=>p.capital),[20,20,20]);
});
test('highest tied targets require owner choice; selection frozen, never silently picks a site',()=>{
 const s=setup();
 building(s,'A','factory','financial',1);
 building(s,'B','factory','soma',1);
 building(s,'SMALL','tenement','civic',1);
 reveal(s);
 assert.equal(notice(s,1).status,'choose');
 assert.deepEqual(notice(s,1).candidateIds,['A','B']);
 assert.equal(G.newsPreview(s).f04.pendingSelections,true);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.canUseFreeAction(s,0),false);
 assert.equal(G.endActivation(s,0).reason,'f04-choice');
 const before=snapshot(s);
 assert.equal(G.chooseF04Notice(s,1,'SMALL').reason,'invalid-target');
 assert.equal(snapshot(s),before);
 assert.equal(G.resolveNewspaper(s).reason,'f04-choice');
 assert.equal(G.chooseF04Notice(s,1,'B').ok,true);
 assert.equal(notice(s,1).constructionId,'B');
 assert.equal(notice(s,1).status,'open');
 assert.equal(G.canTakeMainAction(s,0),true);
 assert.equal(G.chooseF04Notice(s,1,'A').reason,'already-chosen');
 assert.equal(G.resolveNewspaper(s).report.f04.notices[0].constructionId,'B');
});
test('urgent repairs spend exactly $4 + one main action, no teleport, permanently modernize +2 to +1',()=>{
 const s=setup();const c=building(s,'F','factory','financial',0);reveal(s);
 s.players[0].workers[0].districtId='sunset';
 const start=snapshot(s);
 assert.equal(G.resolveF04Notice(s,1,'urgent').reason,'no-notice');
 assert.equal(s.activeWorkerId,s.players[0].workers[0].id);
 assert.equal(G.resolveF04Notice(s,0,'urgent').ok,true);
 assert.equal(s.players[0].capital,16);
 assert.equal(c.fireSafetyModernized,true);
 assert.equal(G.constructionFireRisk(c),2,'base contribution still +2; modernized effective +1');
 assert.equal(G.districtRisk(s,'financial').sources.find(x=>x.constructionId==='F').fire,1);
 assert.equal(s.players[0].workers[0].districtId,'sunset');
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(notice(s,0).status,'closed');
 assert.equal(notice(s,0).method,'urgent');
 assert.equal(G.resolveF04Notice(s,0,'urgent').reason,'already-closed');
 assert.equal(G.resolveF04Notice(s,0,'bribe').reason,'already-closed');
 const report=G.resolveNewspaper(s).report;
 assert.deepEqual(report.entries,[]);assert.deepEqual(report.changes,{});
 assert.equal(s.players[0].capital,16,'never repay/charge F04 at year end');
 assert.notEqual(snapshot(s),start);
});
test('urgent action and illegal bribe reject absent workers, wrong turn, insufficient cash and pending operation atomically',()=>{
 for(const bad of ['wrong-turn','no-worker','no-capital','pending','action-used']){
  const s=setup();building(s,'A');reveal(s);
  if(bad==='wrong-turn')s.developmentPlayer=1;
  if(bad==='no-worker')s.activeWorkerId=null;
  if(bad==='no-capital')s.players[0].capital=3;
  if(bad==='pending')s.pendingWorkerAction={type:'moveWorker'};
  if(bad==='action-used')s.activationMainActionUsed=true;
  const before=snapshot(s),res=G.resolveF04Notice(s,0,'urgent');
  assert.equal(res.ok,false,bad);assert.equal(snapshot(s),before,bad);
 }
 for(const bad of ['wrong-turn','no-capital','pending','no-unjailed']){
  const s=setup();building(s,'A');reveal(s);
  if(bad==='wrong-turn')s.developmentPlayer=1;
  if(bad==='no-capital')s.players[0].capital=1;
  if(bad==='pending')s.pendingWorkerAction={type:'moveWorker'};
  if(bad==='no-unjailed')s.players[0].workers.forEach(w=>w.jailed=true);
  const before=snapshot(s),res=G.resolveF04Notice(s,0,'bribe');
  assert.equal(res.ok,false,bad);assert.equal(snapshot(s),before,bad);
 }
});
test('illegal fast bribe charges $2, raises suspicion by one, leaves worker and fire unchanged',()=>{
 const s=setup();const c=building(s,'F');reveal(s);
 s.players[0].suspicion=1;s.activationMainActionUsed=true;
 const before=s.players[0].workers.map(w=>({...w}));
 const result=G.resolveF04Notice(s,0,'bribe');
 assert.equal(result.ok,true,result.reason);
 assert.equal(result.arrested,false);
 assert.equal(s.players[0].capital,18);
 assert.equal(s.players[0].suspicion,2);
 assert.deepEqual(s.players[0].workers,before);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(c.fireSafetyModernized,false);
 assert.equal(notice(s,0).status,'closed');
 assert.equal(notice(s,0).method,'bribe');
 assert.deepEqual(G.resolveNewspaper(s).report.entries,[]);
});
test('at three stars bribe requires explicit arrest choice, commits cash then standard arrest sanctions once',()=>{
 const s=setup();building(s,'A');reveal(s);
 s.players[0].suspicion=3;s.players[0].influence=0;
 const before=snapshot(s);
 assert.equal(G.resolveF04Notice(s,0,'bribe').reason,'arrest-worker');
 assert.equal(G.resolveF04Notice(s,0,'bribe','not-worker').reason,'arrest-worker');
 assert.equal(snapshot(s),before,'bad arrest choice must be atomic');
 const worker=s.players[0].workers[2];
 worker.used=true;
 const res=G.resolveF04Notice(s,0,'bribe',worker.id);
 assert.equal(res.ok,true);assert.equal(res.arrested,true);
 assert.equal(s.players[0].workers[2].jailed,true);
 assert.equal(s.players[0].capital,18);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].prestige,-3,'standard influence-floor arrest gives -3 VP');
 assert.equal(notice(s,0).status,'closed');
 assert.equal(G.resolveF04Notice(s,0,'bribe',worker.id).reason,'already-closed');
});
for(const kind of ['upgrade','inspect']){
 test('existing real firehouse '+kind+' closes F04 with no extra $4 and no duplicate year-end fine',()=>{
  const s=setup();building(s,'A','factory','civic',1);
  building(s,'H','firehouse','civic',0);reveal(s);
  turn(s,kind==='upgrade'?1:0);
  const before=s.players[1].capital;
  const result=G.useFirehouseAction(s,kind==='upgrade'?1:0,'H',kind,kind==='upgrade'?'A':'civic');
  assert.equal(result.ok,true,result.reason);
  assert.equal(s.constructions.find(c=>c.id==='A').fireSafetyModernized,true);
  assert.equal(notice(s,1).status,'closed');
  assert.equal(notice(s,1).method,'firehouse');
  const after=s.players[1].capital;
  assert.equal(after,kind==='upgrade'?before-2:before-3);
  assert.equal(G.resolveNewspaper(s).report.f04.notices[0].status,'closed');
  assert.equal(s.players[1].capital,after);
 });
}
test('failed firehouse operation does not close F04; wrong service/unfinished service ignored',()=>{
 const s=setup();building(s,'A','factory','civic',0);
 building(s,'H','firehouse','civic',1,'under-construction');reveal(s);
 const before=snapshot(s);
 assert.equal(G.useFirehouseAction(s,0,'H','upgrade','A').ok,false);
 assert.equal(snapshot(s),before);
 assert.equal(notice(s,0).status,'open');
});
test('end-year debits only still-open owners, clips to actual cash/influence and never damages income',()=>{
 const s=setup();building(s,'A','factory','civic',0);building(s,'B','factory','financial',1);
 reveal(s);turn(s,1);assert.equal(G.resolveF04Notice(s,1,'bribe').ok,true);
 s.players[0].capital=1;s.players[0].influence=0;
 const report=G.resolveNewspaper(s).report;
 assert.equal(report.entries.length,1);
 assert.equal(report.entries[0].playerId,0);
 assert.equal(report.entries[0].capitalDue,4);
 assert.equal(report.entries[0].actual,-1);
 assert.equal(report.entries[0].influenceActual,0);
 assert.equal(report.changes[0].capital,-1);
 assert.equal(report.changes[1],undefined);
 assert.equal(s.players[0].capital,0);assert.equal(s.players[1].capital,18);
 assert.deepEqual(s.players.map(p=>p.fireIncomePenalty),[0,0,0]);
 assert.equal(s.newsF04Notices,null);
 assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
 assert.equal(s.newsArchive.length,1);
});
test('F04 assignment and closed result survive save/restore, without assigning newly built properties',()=>{
 const s=setup();building(s,'A','factory','financial',0);reveal(s);
 const first=snapshot(s);
 const restored=JSON.parse(first);
 G.ensureNewspaper(restored);
 assert.equal(snapshot(restored),first);
 assert.equal(G.resolveF04Notice(restored,0,'bribe').ok,true);
 const complete=JSON.parse(snapshot(restored));
 building(complete,'LATE','factory','civic',1);
 G.ensureNewspaper(complete);
 assert.equal(G.f04NoticePreview(complete).notices.length,1);
 assert.equal(G.f04NoticePreview(complete).notices[0].status,'closed');
 assert.equal(G.resolveNewspaper(complete).report.f04.notices[0].method,'bribe');
});
test('on the next year F04 captures only pre-existing buildings and can be resolved in final 1905',()=>{
 const s=setup();s.newsCurrentIds=['E02'];s.newsDeck=['F04',...s.newsDeck.filter(id=>id!=='F04')];
 building(s,'OLD','factory','civic',1);
 s.developmentComplete=true;s.developmentPlayer=null;
 const advance=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(advance.ok,true,advance.reason);
 assert.equal(s.round,2);assert.equal(G.activeNewspaper(s).id,'F04');
 assert.equal(notice(s,1).constructionId,'OLD');
 building(s,'NEW','factory','financial',2);
 G.ensureNewspaper(s);
 assert.equal(G.f04NoticePreview(s).notices.length,1);
 const last=setup();last.round=6;
 building(last,'FINAL','factory','civic',0);reveal(last);
 assert.equal(G.resolveNewspaper(last).report.round,6);
 assert.equal(last.newsArchive[0].year,1905);
 assert.equal(last.newsF04Notices,null);
});
