import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=o=>JSON.stringify(o);
function game({players=3,round=1,phase='development'}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase=phase;s.view='city';
 s.newsCurrentIds=['E01'];s.newsDeck=s.newsDeck.filter(id=>id!=='E01');
 s.newsLastResolvedRound=round-1;s.newsE01Contracts={round,claims:[]};
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.yearTurnOrder=[0,1,2];s.developmentSlotsUsed=Array(players).fill(0);
 while(s.players.length<players){
   const id=s.players.length;
   s.players.push({...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
     workers:G.createWorkers(id),portfolio:[],goals:[]});
   s.yearTurnOrder.push(id);
 }
 s.players.forEach((p,i)=>{p.capital=20;p.influence=10+i*10;p.prestige=0;});
 s.activeWorkerId=s.players[0].workers[0].id;
 return s;
}
function site(s,id,projectId,playerId=0,{startedRound=1,status='under-construction',districtId='civic'}={}){
 const c={id,projectId,playerId,districtId,status,startedRound,
   completedRound:status==='complete'?startedRound:null,
   materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function finish(s,id,projectId,playerId=0,options={}){
 const c=site(s,id,projectId,playerId,options);
 return {result:G.completeConstruction(s,c),construction:c};
}
function pick(s,pid,choice){return G.chooseE01Contract(s,pid,choice);}

test('E01 implements approved rental tokens, not legacy per-district housing income',()=>{
 const s=game(),c=newsCard('E01');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.match(c.title,/РАБОТОДАТЕЛИ ИЩУТ ЖИЛЬЁ/);
 assert.equal(c.target,'none');assert.equal(c.delta,0);
 assert.equal(c.frequency,'oncePerYear');
 assert.equal(G.E01_CONTRACT_POOL,2);assert.equal(G.E01_CASH_REWARD,6);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.equal(G.newsPreview(s).e01.remaining,2);
 assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
});

test('real new residential completion reserves a token before monetary decision, using no extra worker',()=>{
 const s=game(),p=s.players[0];
 const workers=snap(p.workers),slots=snap(s.developmentSlotsUsed),main=s.activationMainActionUsed;
 const before={capital:p.capital,prestige:p.prestige,influence:p.influence};
 const r=finish(s,'A','residential_quarter');
 assert.equal(r.result.ok,true);
 assert.equal(r.construction.status,'complete');
 assert.equal(r.construction.completedRound,1);
 assert.equal(s.newsE01Contracts.claims.length,1);
 assert.deepEqual(s.newsE01Contracts.claims[0],{round:1,playerId:0,constructionId:'A',
   projectId:'residential_quarter',choice:null});
 assert.equal(p.capital,before.capital,'no +6 before decision');
 assert.equal(p.influence,before.influence);
 assert.equal(p.prestige,before.prestige+G.projectById('residential_quarter').prestige);
 assert.equal(G.currentE01PendingContract(s).constructionId,'A');
 assert.equal(G.canUseFreeAction(s,0),false);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.endActivation(s,0).reason,'e01-choice');
 const cash=pick(s,0,'cash');
 assert.equal(cash.ok,true);
 assert.equal(p.capital,before.capital+6);
 assert.equal(p.influence,before.influence);
 assert.equal(p.prestige,before.prestige+G.projectById('residential_quarter').prestige);
 assert.equal(snap(p.workers),workers);
 assert.equal(snap(s.developmentSlotsUsed),slots);
 assert.equal(s.activationMainActionUsed,main);
 assert.equal(G.currentE01PendingContract(s),null);
 assert.equal(G.canUseFreeAction(s,0),true);
 const done=snap(s);
 assert.equal(pick(s,0,'cash').reason,'no-pending');
 assert.equal(snap(s),done);
});

test('civic option gives +1 VP AND a real Influence step, not +$6',()=>{
 const s=game(),p=s.players[0];
 const v=p.prestige,c=p.capital,i=p.influence;
 assert.equal(finish(s,'A','tenement').result.ok,true);
 const earned=G.projectById('tenement').prestige;
 const r=pick(s,0,'civic');
 assert.equal(r.ok,true);
 assert.equal(r.record.choice,'civic');assert.equal(r.record.vp,1);
 assert.equal(r.record.influenceSteps,1);
 assert.equal(p.prestige,v+earned+1);
 assert.equal(p.influence,i+1);
 assert.equal(p.capital,c);
 assert.equal(r.record.influenceFrom,i);
 assert.equal(r.record.influenceTo,p.influence);
});

test('occupied Influence positions use actual legal move, with no duplicated money',()=>{
 const s=game();
 s.players[0].influence=12;s.players[1].influence=13;s.players[2].influence=40;
 assert.equal(finish(s,'A','tenement').result.ok,true);
 const v=s.players[0].prestige;
 const r=pick(s,0,'civic');
 assert.equal(r.ok,true);
 assert.equal(r.record.influenceSteps,1);
 assert.equal(s.players[0].influence,14,'occupied 13 is skipped');
 assert.equal(s.players[0].prestige,v+1);
 assert.equal(s.players[0].capital,20);
});

test('first TWO distinct owners reserve contracts; third cannot claim and first cannot repeat',()=>{
 const s=game({players:5});
 assert.equal(finish(s,'A','tenement',0).result.ok,true);
 assert.equal(finish(s,'B','residential_quarter',0,{districtId:'mission'}).result.ok,true);
 assert.deepEqual(s.newsE01Contracts.claims.map(c=>c.playerId),[0]);
 assert.equal(finish(s,'C','tenement',3,{districtId:'marina'}).result.ok,true);
 assert.deepEqual(s.newsE01Contracts.claims.map(c=>c.playerId),[0,3]);
 assert.equal(G.e01ContractPreview(s).remaining,0);
 assert.equal(finish(s,'D','tenement',1,{districtId:'soma'}).result.ok,true);
 assert.equal(finish(s,'E','tenement',2,{districtId:'missionbay'}).result.ok,true);
 assert.equal(s.newsE01Contracts.claims.length,2);
 assert.equal(pick(s,3,'civic').reason,'not-owner-turn','first reservation must select first');
 assert.equal(pick(s,0,'cash').ok,true);
 assert.equal(pick(s,3,'civic').ok,true);
 assert.equal(G.currentE01PendingContract(s),null);
 assert.equal(pick(s,1,'cash').reason,'no-pending');
});

for(const projectId of ['bakery','orphanage','wagonboarding','sailorlodging','workers_complex']){
 test('mixed-type residential '+projectId+' is eligible for exactly one E01 token',()=>{
   const s=game();
   assert.equal(G.projectTypes(projectId).includes('Жилое'),true);
   const r=finish(s,'M',projectId);
   assert.equal(r.result.ok,true);
   assert.equal(s.newsE01Contracts.claims.length,1);
   assert.equal(s.newsE01Contracts.claims[0].projectId,projectId);
 });
}

for(const projectId of ['hotel','school','warehouse','std_clinic','factory']){
 test('non-residential project '+projectId+' does NOT take an E01 token',()=>{
   const s=game();
   assert.equal(G.projectTypes(projectId).includes('Жилое'),false);
   assert.equal(finish(s,'N',projectId).result.ok,true);
   assert.equal(s.newsE01Contracts.claims.length,0);
 });
}

test('previous-year construction qualifies only when finished during E01, not at start',()=>{
 const s=game({round:4});
 const c=site(s,'OLD','tenement',1,{startedRound:2});
 assert.equal(s.newsE01Contracts.claims.length,0);
 assert.equal(G.completeConstruction(s,c).ok,true);
 assert.equal(s.newsE01Contracts.claims[0].round,4);
 assert.equal(s.newsE01Contracts.claims[0].playerId,1);
 assert.equal(pick(s,1,'cash').ok,true);
});

test('already completed housing, project purchase and failed completion never grant tokens',()=>{
 const s=game();
 site(s,'EARLY','tenement',0,{status:'complete'});
 site(s,'STARTED','tenement',1,{startedRound:1,status:'under-construction'}).materialsDelivered=[];
 s.players[1].portfolio.push('residential_quarter');
 assert.equal(G.completeConstruction(s,s.constructions[1]).ok,false);
 assert.equal(s.newsE01Contracts.claims.length,0);
 const before=snap(s);
 assert.equal(G.completeConstruction(s,s.constructions[0]).ok,false);
 assert.equal(snap(s),before);
});

test('invalid owner, choice, phase and resolved E01 requests are atomic',()=>{
 const s=game();
 assert.equal(finish(s,'A','tenement',0).result.ok,true);
 const before=snap(s);
 assert.equal(pick(s,1,'cash').reason,'not-owner-turn');
 assert.equal(pick(s,0,'both').reason,'choice');
 assert.equal(pick(s,99,'cash').reason,'player');
 assert.equal(snap(s),before);
 s.phase='ready';
 const halted=snap(s);
 assert.equal(pick(s,0,'cash').reason,'not-active');
 assert.equal(snap(s),halted);
 s.phase='development';
 assert.equal(pick(s,0,'cash').ok,true);
 s.newsLastResolvedRound=s.round;
 const after=snap(s);
 assert.equal(pick(s,0,'civic').reason,'not-active');
 assert.equal(snap(s),after);
});

test('fresh reset, reload and repeated ensureNewspaper preserve reservations without extra bonus',()=>{
 const s=game();
 finish(s,'A','tenement');
 const saved=JSON.parse(snap(s));
 G.ensureNewspaper(saved);G.ensureNewspaper(saved);
 assert.equal(saved.newsE01Contracts.claims.length,1);
 assert.equal(saved.newsE01Contracts.claims[0].choice,null);
 assert.equal(pick(saved,0,'cash').ok,true);
 const after=JSON.parse(snap(saved));
 G.ensureNewspaper(after);
 assert.equal(after.newsE01Contracts.claims.length,1);
 assert.equal(after.players[0].capital,saved.players[0].capital);
 assert.equal(pick(after,0,'cash').reason,'no-pending');
});

test('old active E01 save migrates without paying for prior buildings retroactively',()=>{
 const s=game({round:4});
 site(s,'PRE','tenement',0,{startedRound:1,status:'complete'});
 delete s.newsE01Contracts;
 const before=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
 G.ensureNewspaper(s);G.ensureNewspaper(s);
 assert.deepEqual(s.newsE01Contracts,{round:4,claims:[]});
 assert.deepEqual(s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence})),before);
 assert.equal(finish(s,'NEW','tenement',1).result.ok,true);
 assert.equal(s.newsE01Contracts.claims.length,1);
});

test('year end refuses pending reward; archives chosen packages and expires unused tokens',()=>{
 const s=game();
 const oldMoney=s.players.map(p=>p.capital),oldVP=s.players.map(p=>p.prestige);
 assert.equal(finish(s,'A','tenement',0).result.ok,true);
 s.developmentComplete=true;s.developmentPlayer=null;
 const stopped=snap(s);
 assert.equal(G.cleanupMarket(s).reason,'e01-choice');
 assert.equal(snap(s),stopped);
 assert.equal(pick(s,0,'cash').ok,true);
 const yearEndIncome=s.players.map(p=>G.roundIncome(s,p.id));
 const before=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
 const r=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(r.ok,true);
 assert.equal(s.round,2);
 assert.equal(s.newsArchive.length,1);
 const report=s.newsArchive[0];
 assert.equal(report.cardId,'E01');
 assert.equal(report.e01.unused,1);
 assert.deepEqual(report.e01.claims.map(x=>[x.playerId,x.choice]),[[0,'cash']]);
 assert.deepEqual(report.changes,{});
 assert.deepEqual(report.entries,[]);
 assert.equal(s.newsE01Contracts,null);
 s.players.forEach((p,i)=>{
   assert.equal(p.capital,before[i].capital+yearEndIncome[i]);
   assert.equal(p.prestige,before[i].prestige);
   assert.equal(p.influence,before[i].influence);
 });
 assert.equal(s.newsCurrentIds[0]!=='E01',true);
 assert.equal(G.e01ContractPreview(s).active,false);
});

test('year transition into E01 creates exactly two tokens and expires them next year',()=>{
 const s=game();
 s.newsCurrentIds=['E02'];s.newsDeck=['E01','E03',...s.newsDeck.filter(id=>!['E01','E03'].includes(id))];
 s.newsE01Contracts=null;
 s.developmentComplete=true;s.developmentPlayer=null;
 assert.equal(G.cleanupMarket(s,{rng:()=>.2}).ok,true);
 assert.equal(s.round,2);
 assert.deepEqual(s.newsE01Contracts,{round:2,claims:[]});
 assert.equal(finish(s,'A','tenement',0).result.ok,true);
 assert.equal(pick(s,0,'civic').ok,true);
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 assert.equal(G.cleanupMarket(s,{rng:()=>.2}).ok,true);
 assert.equal(s.round,3);assert.equal(s.newsCurrentIds[0],'E03');
 assert.equal(s.newsE01Contracts,null);
 assert.equal(s.newsArchive[1].e01.claims.length,1);
 assert.equal(finish(s,'OUT','tenement',1).result.ok,true);
 assert.equal(s.newsE01Contracts,null);
});

test('final 1905 E01 expires missing contract without creating an extra year',()=>{
 const s=game({round:6});
 assert.equal(finish(s,'A','tenement',0).result.ok,true);
 assert.equal(pick(s,0,'civic').ok,true);
 s.developmentComplete=true;s.developmentPlayer=null;
 const r=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(r.ok,true);assert.equal(r.finished,true);
 assert.equal(s.round,6);assert.equal(s.finished,true);
 assert.equal(s.newsArchive[0].e01.unused,1);
 assert.equal(s.newsE01Contracts,null);
});

test('historical E01 archive is not rewritten or re-awarded by ensureNewspaper',()=>{
 const s=game();
 const legacy={year:1900,round:1,cardId:'E01',
   title:'Новые семьи ищут квартиры',entries:[{playerId:0,actual:2}],
   changes:{0:{capital:2,influence:0,prestige:0}}};
 s.newsArchive.push(structuredClone(legacy));
 s.newsLastResolvedRound=1;s.newsE01Contracts=null;
 G.ensureNewspaper(s);
 assert.deepEqual(s.newsArchive[0],legacy);
 assert.equal(G.e01ContractPreview(s).active,false);
 assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
});
