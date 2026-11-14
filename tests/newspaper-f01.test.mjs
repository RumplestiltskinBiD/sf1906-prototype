import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

function game(count=3){
  const s=G.createInitialState({rng:()=>0.31});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.developmentComplete=false;s.activationMainActionUsed=false;
  s.newsCurrentIds=['F01'];s.newsDeck=s.newsDeck.filter(id=>id!=='F01');
  s.newsEmergency={};s.constructions=[];
  while(s.players.length<count){
    const id=s.players.length;
    s.players.push({...structuredClone(s.players[0]),id,name:'Игрок '+(id+1),key:'test'+id,
      workers:G.createWorkers(id),portfolio:[],goals:[],suspicion:0,caseSettledRound:null});
  }
  s.players.forEach((p,i)=>{p.capital=20;p.influence=20-i*4;});
  s.yearTurnOrder=s.players.map(p=>p.id);
  s.developmentSlotsUsed=Array(count).fill(0);
  s.activeWorkerId=s.players[0].workers[0].id;
  return s;
}
function build(s,id,projectId,districtId,playerId,status='complete',other={}){
  const c={id,projectId,districtId,playerId,status,startedRound:1,
    completedRound:status==='complete'?1:null,materialsDelivered:[],warehouseInventory:[],
    fireSafetyModernized:false,...other};
  s.constructions.push(c);
  return c;
}
const snapshot=s=>JSON.stringify(s);
const cash=s=>s.players.map(p=>p.capital);
const influence=s=>s.players.map(p=>p.influence);
const act=(s,target='F')=>G.fileF01Notice(s,0,target);

test('F01 uses approved active rules, not obsolete housing penalty or emergency defense',()=>{
  const card=newsCard('F01'),s=game();
  assert.equal(card.title,'КТО ЗАПЛАТИТ ЗА ПОЖАРНУЮ ОПАСНОСТЬ?!');
  assert.equal(card.delta,0);assert.equal(card.target,'none');
  assert.equal(card.defense,null);assert.equal(card.designV2.complaint.workerMustBeInTargetDistrict,null);
  assert.deepEqual(G.newsPreview(s).entries,[]);
  assert.deepEqual(G.newsPreview(s).threatened,[]);
  assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
});

for(const count of [3,4,5]){
  test('F01 without an act levies $2 and 1 influence step on all '+count+' players, once',()=>{
    const s=game(count),before=s.players.map(p=>p.influence);
    const first=G.resolveNewspaper(s);
    assert.equal(first.ok,true);
    assert.equal(first.report.f01.mode,'collective');
    assert.equal(first.report.entries.length,count);
    assert.deepEqual(cash(s),Array(count).fill(18));
    assert.deepEqual(influence(s),before.map(x=>x-1));
    assert.deepEqual(first.report.serviceRecognition,[]);
    assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
    assert.deepEqual(cash(s),Array(count).fill(18));
    assert.equal(s.newsArchive.length,1);
    assert.equal(s.players.some(p=>p.fireIncomePenalty),false);
  });
}

test('short money and influence at floor are clipped without debt or annual income penalties',()=>{
  const s=game();
  s.players[0].capital=0;s.players[1].capital=1;s.players[2].capital=2;
  s.players[0].influence=0;s.players[1].influence=1;s.players[2].influence=5;
  const report=G.resolveNewspaper(s).report;
  assert.deepEqual(cash(s),[0,0,0]);
  assert.deepEqual(influence(s),[0,0,4]);
  assert.deepEqual(report.entries.map(e=>e.actual),[0,-1,-2]);
  assert.deepEqual(report.entries.map(e=>e.influenceActual),[0,-1,-1]);
  assert.deepEqual(s.players.map(p=>p.fireIncomePenalty),[0,0,0]);
});

test('maximal current fire risk is global; ties permit both districts, lower fire risk is excluded',()=>{
  const s=game();
  build(s,'F','factory','financial',1); // 1 base + 2 personal = 3
  build(s,'S','factory','soma',2);      // 1 base + 2 personal = 3
  build(s,'L','tenement','northbeach',2); // 1 base + 1 personal = 2
  const p=G.f01NoticeOptions(s,0);
  assert.equal(p.maxFireRisk,3);
  assert.equal(p.highestDistrictIds.includes('financial'),true);
  assert.equal(p.highestDistrictIds.includes('soma'),true);
  assert.deepEqual(p.targets.map(t=>t.constructionId).sort(),['F','S']);
  assert.equal(act(s,'L').reason,'invalid-target');
  assert.equal(s.activationMainActionUsed,false);
  assert.equal(act(s,'S').ok,true);
  assert.equal(s.newsF01Notice.accusedPlayerId,2);
});

test('maximal district without a completed opponent offender blocks filing everywhere else',()=>{
  const s=game();
  build(s,'OWN','factory','financial',0);
  build(s,'OPP','tenement','northbeach',1);
  assert.equal(G.districtRisk(s,'financial').fire.raw,3);
  assert.equal(G.districtRisk(s,'northbeach').fire.raw,2);
  const opts=G.f01NoticeOptions(s,0);
  assert.deepEqual(opts.targets,[]);
  const before=snapshot(s);
  assert.equal(act(s,'OPP').reason,'invalid-target');
  assert.equal(snapshot(s),before);
  assert.equal(G.resolveNewspaper(s).report.f01.mode,'collective');
});

test('only complete other-owned buildings with strictly positive personal fire contribution qualify',()=>{
  const s=game();
  build(s,'OWN','factory','financial',0);
  build(s,'UNFINISHED','factory','financial',1,'under-construction');
  build(s,'ZERO','tenement','financial',1,'complete',{fireSafetyModernized:true});
  build(s,'SERVICE','firehouse','financial',1);
  const opts=G.f01NoticeOptions(s,0);
  assert.deepEqual(opts.targets,[]);
  for(const id of ['OWN','UNFINISHED','ZERO','SERVICE']){
    const before=snapshot(s);assert.equal(act(s,id).reason,'invalid-target');
    assert.equal(snapshot(s),before,id+' rejection must be atomic');
  }
  build(s,'POS','tenement','financial',2);
  assert.deepEqual(G.f01NoticeOptions(s,0).targets.map(t=>t.constructionId),['POS']);
});

test('valid accusation requires active available worker but no travel to accused district',()=>{
  const s=game();
  build(s,'F','factory','financial',1);
  s.players[0].workers[0].districtId='sunset'; // far from Financial District
  const before=snapshot(s);
  assert.equal(act(s,'NOT-A-BUILDING').reason,'invalid-target');
  assert.equal(snapshot(s),before);
  const r=act(s);
  assert.equal(r.ok,true);
  assert.equal(r.action.moved,false);
  assert.equal(s.players[0].workers[0].districtId,'sunset');
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.players[0].workersLeft,2);
  assert.equal(s.activationMainActionUsed,true);
  assert.equal(s.newsF01Notice.districtId,'financial');
  assert.equal(s.newsF01Notice.constructionId,'F');
  assert.deepEqual(cash(s),[20,20,20]);
  assert.equal(G.f01NoticeOptions(s,0).canFile,false);
});

test('no second act, no reassignment and no second action on repeated submission',()=>{
  const s=game();
  build(s,'F','factory','financial',1);
  build(s,'S','factory','soma',2);
  assert.equal(act(s,'F').ok,true);
  const before=snapshot(s);
  assert.equal(act(s,'S').reason,'already-filed');
  assert.equal(snapshot(s),before);
  s.developmentPlayer=2;s.activeWorkerId=s.players[2].workers[0].id;
  assert.equal(G.fileF01Notice(s,2,'F').reason,'already-filed');
  assert.equal(s.players[2].workers[0].used,false);
});

test('filing rejects other phase, wrong turn, missing worker, spent action and resolved year atomically',()=>{
  const s=game();
  build(s,'F','factory','financial',1);
  for(const setup of [
    t=>{t.phase='hall';},t=>{t.developmentPlayer=1;},
    t=>{t.activeWorkerId=null;},t=>{t.activationMainActionUsed=true;},
    t=>{t.players[0].workers.forEach(w=>w.jailed=true);t.players[0].workersLeft=0;},
    t=>{t.pendingBreadProduction=['CHOICE'];}
  ]){
    const copy=structuredClone(s);setup(copy);
    const before=snapshot(copy);
    assert.equal(G.fileF01Notice(copy,0,'F').reason,'main-action-unavailable');
    assert.equal(snapshot(copy),before);
  }
  s.newsLastResolvedRound=s.round;
  const before=snapshot(s);
  assert.equal(act(s).reason,'already-resolved');
  assert.equal(snapshot(s),before);
});

test('an active notice charges only its owner $6 and 1 influence step; filer receives no reward',()=>{
  const s=game();
  build(s,'F','factory','financial',1);
  const r=act(s);
  assert.equal(r.ok,true);
  const paid=G.resolveNewspaper(s);
  assert.equal(paid.report.f01.mode,'personal');
  assert.equal(paid.report.f01.validAtYearEnd,true);
  assert.deepEqual(cash(s),[20,14,20]);
  assert.deepEqual(influence(s),[20,15,12]);
  assert.deepEqual(Object.keys(paid.report.changes),['1']);
  assert.deepEqual(paid.report.entries.map(e=>[e.playerId,e.capitalDue,e.actual,e.influenceActual]),[[1,6,-6,-1]]);
  assert.equal(s.players[0].prestige,0);
  assert.deepEqual(paid.report.serviceRecognition,[]);
  assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
});

test('notice follows exact building, even if another district later becomes more dangerous',()=>{
  const s=game();
  build(s,'F','tenement','northbeach',1); // 1 base + 1 =2
  assert.equal(act(s).ok,true);
  build(s,'HIGH1','factory','financial',1);
  build(s,'HIGH2','factory','financial',2);
  assert.ok(G.districtRisk(s,'financial').fire.raw>G.districtRisk(s,'northbeach').fire.raw);
  assert.equal(G.f01NoticePreview(s).active,true);
  assert.equal(G.resolveNewspaper(s).report.f01.mode,'personal');
});

test('modernizing a +1 building to zero cancels the personal notice and restores general levy',()=>{
  const s=game();
  const c=build(s,'F','tenement','northbeach',1);
  assert.equal(act(s).ok,true);
  c.fireSafetyModernized=true;
  assert.equal(G.f01NoticePreview(s).personalFire,0);
  assert.equal(G.f01NoticePreview(s).active,false);
  const r=G.resolveNewspaper(s);
  assert.equal(r.report.f01.mode,'collective');
  assert.equal(r.report.f01.filed.constructionId,'F');
  assert.deepEqual(cash(s),[18,18,18]);
});

test('modernizing a +2 building to +1 does NOT cancel notice',()=>{
  const s=game(),c=build(s,'F','factory','financial',1);
  assert.equal(act(s).ok,true);
  c.fireSafetyModernized=true;
  assert.equal(G.f01NoticePreview(s).personalFire,1);
  assert.equal(G.resolveNewspaper(s).report.f01.mode,'personal');
  assert.deepEqual(cash(s),[20,14,20]);
});

test('adding std_fire or firehouse lowers district P but not the accused building personal contribution',()=>{
  for(const station of ['std_fire','firehouse']){
    const s=game();
    build(s,'F','factory','financial',1);
    assert.equal(act(s).ok,true);
    build(s,'S',station,'financial',2);
    assert.equal(G.districtRisk(s,'financial').fire.raw,2);
    assert.equal(G.f01NoticePreview(s).personalFire,2);
    assert.equal(G.resolveNewspaper(s).report.f01.mode,'personal');
    assert.deepEqual(cash(s),[20,14,20]);
  }
});

test('removed or abandoned accused building clears notice without changing accused player',()=>{
  for(const removed of ['abandoned','redeveloped']){
    const s=game(),c=build(s,'F','factory','financial',1);
    assert.equal(act(s).ok,true);
    c.status=removed;
    assert.equal(G.f01NoticePreview(s).active,false);
    assert.equal(G.resolveNewspaper(s).report.f01.mode,'collective');
    assert.deepEqual(cash(s),[18,18,18]);
  }
});

test('cash shortage on personal fine charges only available capital, no debt',()=>{
  const s=game();build(s,'F','factory','financial',1);
  s.players[1].capital=3;
  assert.equal(act(s).ok,true);
  const r=G.resolveNewspaper(s);
  assert.deepEqual(cash(s),[20,0,20]);
  assert.equal(r.report.entries[0].capitalDue,6);
  assert.equal(r.report.entries[0].actual,-3);
  assert.equal(s.players[1].fireIncomePenalty,0);
});

test('zero or negative current Influence causes no impossible additional penalty',()=>{
  const s=game();build(s,'F','factory','financial',1);
  s.players[1].influence=0;
  assert.equal(act(s).ok,true);
  const r=G.resolveNewspaper(s);
  assert.equal(r.report.entries[0].influenceActual,0);
  assert.equal(s.players[1].influence,0);
});

test('legacy save gains F01 state without resetting money, buildings or previously filed act',()=>{
  const s=game();build(s,'F','factory','financial',1);
  const initial=snapshot(s);
  delete s.newsF01Notice;
  G.ensureNewspaper(s);
  assert.equal(s.newsF01Notice,null);
  assert.deepEqual(s.constructions.map(c=>c.id),['F']);
  assert.deepEqual(cash(s),[20,20,20]);
  assert.equal(act(s).ok,true);
  const encoded=JSON.stringify(s),restored=JSON.parse(encoded);
  G.ensureNewspaper(restored);
  assert.deepEqual(restored.newsF01Notice,s.newsF01Notice);
  assert.equal(G.f01NoticePreview(restored).active,true);
  assert.notEqual(snapshot(restored),initial);
});

test('F01 ends before crime assessment, does not repeat after retry, and resets for next newspaper',()=>{
  const s=game();build(s,'F','factory','financial',1);
  assert.equal(act(s).ok,true);
  s.developmentComplete=true;s.developmentPlayer=null;
  s.players.forEach(p=>p.suspicion=0);
  const first=G.cleanupMarket(s,{rng:()=>0.1});
  assert.equal(first.ok,true);
  assert.equal(s.newsArchive.length,1);
  assert.equal(s.newsArchive[0].cardId,'F01');
  assert.equal(s.newsArchive[0].f01.mode,'personal');
  assert.equal(s.round,2);
  assert.equal(s.newsF01Notice,null);
  assert.deepEqual(cash(s).map(x=>x>=0),[true,true,true]);
  assert.equal(G.f01NoticePreview(s),null);
});
