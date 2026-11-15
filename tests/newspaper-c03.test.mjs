import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snapshot=s=>JSON.stringify(s);
function base({count=3,phase='declare',deck=null}={}){
 const s=G.createInitialState({rng:()=>.38});
 while(s.players.length<count){
  const id=s.players.length;
  s.players.push({...structuredClone(s.players[0]),id,name:'Player '+id,key:'k'+id,
   portfolio:[],workers:G.createWorkers(id),suspicion:0,prestige:0,influence:12-id,
   loans:[],goals:[],workersLeft:3});
 }
 s.newsCurrentIds=['C03'];s.newsLastResolvedRound=0;s.newsDeck=s.newsDeck.filter(id=>id!=='C03');
 s.newsC03Offer=null;s.phase=phase;s.view='hall';s.round=1;
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.declarationIndex=0;s.developmentPlayer=null;
 s.players.forEach(p=>{p.portfolio=[];p.capital=25;p.suspicion=0;p.prestige=0;});
 s.developmentSlotsUsed=s.players.map(()=>0);
 if(deck)s.deck=deck.map((id,i)=>({uid:'X'+i,id}));
 s.newsC03Offer=G.createC03Offer(s);
 return s;
}
function finishOffer(s,accepted=[]){
 for(const pid of G.turnOrder(s)){
  const r=accepted.includes(pid)?G.acceptC03Offer(s,pid):G.declineC03Offer(s,pid);
  assert.equal(r.ok,true,JSON.stringify(r));
 }
}
test('C03 current data is approved and executable, old bank penalties/police defense abolished',()=>{
 const card=newsCard('C03'),s=base();
 assert.equal(card.designV2.status,'implemented-for-playtest');
 assert.equal(card.title,'В МЭРИИ СКРЫВАЮТ ФИКТИВНЫЕ ЗАЯВКИ!');
 assert.equal(card.delta,0);assert.equal(card.target,'none');assert.equal(card.defense,null);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.equal(G.newsPreview(s).c03.currentPlayerId,0);
 assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
 const before=s.players.map(p=>p.capital);
 finishOffer(s);
 assert.equal(G.resolveNewspaper(s).ok,true);
 assert.deepEqual(s.players.map(p=>p.capital),before);
 assert.equal(s.newsArchive[0].c03.decisions.length,3);
});
test('C03 is a one-time genuine top-deck grant before regular City Hall, no payment or worker action',()=>{
 const s=base({deck:['bank','shops','hotel']});const source=[...s.deck],market=snapshot(s.market);
 const before=snapshot({money:s.players[0].capital,prestige:s.players[0].prestige,
  influence:s.players[0].influence,workers:s.players[0].workers,
  goals:s.goalMarket,main:s.activationMainActionUsed,slots:s.developmentSlotsUsed});
 assert.equal(G.currentDeclarer(s),null,'ordinary City Hall must be locked while offers pending');
 assert.equal(G.claimProject(s,0).ok,false);
 assert.equal(G.claimCityGoal(s,0).ok,false);
 assert.equal(G.passDeclaration(s).ok,false);
 assert.equal(G.beginBidding(s).ok,false);
 const r=G.acceptC03Offer(s,0);
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.projectId,'bank');assert.equal(r.uid,'X0');
 assert.deepEqual(s.players[0].portfolio,['bank']);assert.deepEqual(s.deck,source.slice(1));
 assert.equal(s.players[0].suspicion,1);
 assert.equal(snapshot({money:s.players[0].capital,prestige:s.players[0].prestige,
  influence:s.players[0].influence,workers:s.players[0].workers,
  goals:s.goalMarket,main:s.activationMainActionUsed,slots:s.developmentSlotsUsed}),before);
 assert.equal(snapshot(s.market),market);
 assert.equal(s.constructions.length,0,'grant is not a started building');
 assert.equal(G.currentDeclarer(s),null);
 assert.equal(G.acceptC03Offer(s,0).ok,false,'no duplicate grant');
 assert.equal(G.declineC03Offer(s,1).ok,true);
 assert.equal(G.declineC03Offer(s,2).ok,true);
 assert.equal(s.newsC03Offer.completed,true);
 assert.equal(G.currentDeclarer(s),0);
 assert.equal(G.claimCityGoal(s,0).ok,true,'regular City Goal still accessible after free grant');
 assert.equal(G.claimProject(s,0).ok,true,'regular paid market project still accessible');
 assert.equal(s.market[0].claims[0].player,0);
 assert.equal(s.players[0].portfolio.length,1,'market card is only awarded after tenders');
 assert.equal(s.players[0].suspicion,1,'legal City Hall claim never adds new suspicion');
 assert.equal(s.newsC03Offer.decisions.length,3);
});
test('ordered opt-in/out is voluntary and causes no suspicion on refusal',()=>{
 const s=base({deck:['bank','hotel','shops']});const old=snapshot(s);
 assert.equal(G.acceptC03Offer(s,1).reason,'not-your-turn');
 assert.equal(G.declineC03Offer(s,1).reason,'not-your-turn');
 assert.equal(snapshot(s),old);
 assert.equal(G.declineC03Offer(s,0).ok,true);
 assert.equal(s.players[0].suspicion,0);assert.equal(s.players[0].portfolio.length,0);
 assert.equal(G.acceptC03Offer(s,1).projectId,'bank');
 assert.equal(G.declineC03Offer(s,2).ok,true);
 assert.equal(s.deck[0].id,'hotel');
 assert.deepEqual(s.newsC03Offer.decisions.map(x=>x.choice),['declined','accepted','declined']);
 assert.equal(G.acceptC03Offer(s,1).ok,false);
 assert.equal(G.declineC03Offer(s,0).ok,false);
 assert.equal(G.currentDeclarer(s),0);
});
test('draft of first year ends BEFORE C03 bonus (2 retained + optional third card)',()=>{
 const s=base({phase:'draft'});s.starterDraftPlayer=0;
 assert.equal(G.c03OfferOptions(s,0).canAccept,false);
 assert.equal(G.acceptC03Offer(s,0).ok,false);
 for(let pid=0;pid<3;pid++){
  assert.equal(G.revealStarterDraft(s).ok,true);
  const ids=s.starterDraftHands[pid].slice(0,2).map(c=>c.uid);
  ids.forEach(uid=>assert.equal(G.toggleStarterDraftCard(s,uid).ok,true));
  assert.equal(G.confirmStarterDraft(s).ok,true);
 }
 assert.equal(s.phase,'declare');assert.deepEqual(s.players.map(p=>p.portfolio.length),[2,2,2]);
 const p=s.players[0],first=s.deck[0],before=p.portfolio.length;
 assert.equal(G.acceptC03Offer(s,0).ok,true);
 assert.equal(p.portfolio.length,before+1);assert.equal(p.portfolio.at(-1),first.id);
 assert.equal(s.market.some(m=>m.id===first.id&&m.uid===first.uid),false);
});
test('hand=5, deck=0 or all jailed prevent benefit/★, but refusal advances queue',()=>{
 for(const problem of ['full','empty','jailed']){
  const s=base();
  if(problem==='full')s.players[0].portfolio=Array(5).fill('bank');
  if(problem==='empty')s.deck=[];
  if(problem==='jailed')s.players[0].workers.forEach(w=>w.jailed=true);
  const before=snapshot(s);
  const r=G.acceptC03Offer(s,0);
  assert.equal(r.ok,false);assert.equal(r.reason,problem==='full'?'hand-limit':
    problem==='empty'?'empty-deck':'no-free-worker');
  assert.equal(snapshot(s),before);
  assert.equal(G.declineC03Offer(s,0).ok,true);
  assert.equal(s.players[0].suspicion,0);
  assert.equal(s.newsC03Offer.cursor,1);
 }
});
test('no card/money/action is consumed by invalid order, repeated accept or invalid worker',()=>{
 const s=base(),before=snapshot(s);
 assert.equal(G.acceptC03Offer(s,8).ok,false);assert.equal(snapshot(s),before);
 assert.equal(G.acceptC03Offer(s,2).ok,false);assert.equal(snapshot(s),before);
 assert.equal(G.resolveCriminalAction(s,2,{mode:'c03',suspicionGain:1,perform:()=>({ok:true})}).ok,false);
 assert.equal(snapshot(s),before);
});
test('★★★ C03 receives real project only with selected arrest; existing sanctions apply after grant',()=>{
 const s=base({deck:['bank','shops']});
 s.players[0].suspicion=3;
 s.players[0].influence=0;
 const old=snapshot(s);
 assert.equal(G.acceptC03Offer(s,0).reason,'arrest-worker');
 assert.equal(snapshot(s),old);
 assert.equal(G.acceptC03Offer(s,0,{arrestWorkerId:'invalid'}).reason,'arrest-worker');
 assert.equal(snapshot(s),old);
 const id=s.players[0].workers[1].id;
 const r=G.acceptC03Offer(s,0,{arrestWorkerId:id});
 assert.equal(r.ok,true,JSON.stringify(r));assert.equal(r.arrested,true);
 assert.deepEqual(s.players[0].portfolio,['bank']);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].prestige,-3,'insufficient downward Influence means -3 VP');
 assert.equal(s.players[0].workers[1].jailed,true);
 assert.equal(s.players[0].workers[1].arrestedRound,1);
 assert.equal(s.newsC03Offer.cursor,1);
 assert.equal(s.deck[0].id,'shops');
 assert.equal(G.acceptC03Offer(s,0).ok,false);
});
test('no EARLY annual crime fine on C03 claim at ★★; end-of-year crime assessment unchanged',()=>{
 const s=base({deck:['bank','shops','hotel']});
 s.players[0].suspicion=1;
 assert.equal(G.acceptC03Offer(s,0).ok,true);
 assert.equal(s.players[0].suspicion,2);
 assert.equal(s.players[0].capital,25,'no fine before City Hall');
 assert.equal(s.crimeAssessedRound,0);
 finishOfferRemaining(s);
 assert.equal(G.currentDeclarer(s),0);
 // No annual side effects should be present in the claimed C03 offer itself.
 assert.equal(s.players[0].capital,25);
 assert.equal(s.phase,'declare');
});
function finishOfferRemaining(s){while(G.c03OfferPlayer(s)!=null)assert.equal(G.declineC03Offer(s,G.c03OfferPlayer(s)).ok,true);}
for(const count of [3,4,5])test(count+'-player C03 opt-in uses stable annual turn order, not a 3-player grant cap',()=>{
 const s=base({count,deck:['bank','shops','hotel','factory','club','school']});
 s.yearTurnOrder=Array.from({length:count},(_,i)=>count-1-i);
 s.newsC03Offer=G.createC03Offer(s);
 assert.deepEqual(s.newsC03Offer.order,s.yearTurnOrder);
 for(const pid of s.yearTurnOrder){
  assert.equal(G.c03OfferPlayer(s),pid);
  assert.equal(G.acceptC03Offer(s,pid).ok,true);
 }
 assert.deepEqual(s.players.map(p=>p.portfolio.length),Array(count).fill(1));
 assert.deepEqual(s.players.map(p=>p.suspicion),Array(count).fill(1));
 assert.equal(s.deck.length,6-count);
 assert.equal(s.newsC03Offer.completed,true);
});
test('end year archives C03 opt-ins once and next issue does not grant again',()=>{
 const s=base({deck:['bank','shops','hotel']});
 finishOffer(s,[0,2]);s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const firstPortfolio=s.players.map(p=>[...p.portfolio]),deck=[...s.deck];
 const r=G.cleanupMarket(s,{rng:()=>.27});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.round,2);
 assert.equal(s.newsCurrentIds[0],'E02');
 assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].c03.decisions.length,3);
 assert.equal(s.newsArchive[0].c03.decisions.filter(d=>d.choice==='accepted').length,2);
 assert.deepEqual(s.players.map(p=>p.portfolio),firstPortfolio);
 assert.equal(s.newsC03Offer,null);
 assert.equal(G.acceptC03Offer(s,0).ok,false);
 const before=snapshot(s);G.ensureNewspaper(s,{rng:()=>{throw Error('no re-offer')}});
 assert.equal(snapshot(s),before);
 assert.equal(s.newsArchive[0].c03.completed,true);
 // A new year's ordinary market refresh does not grant a second C03 project.
});
test('old C03 archived fine is kept; mid-City-Hall old save is NOT reopened',()=>{
 const s=base({phase:'development'}),report={year:1900,round:1,cardId:'C03',
  title:'Поддельные подписи в конторах',entries:[{playerId:0,actual:-2}],changes:{0:{capital:-2}}};
 s.round=2;s.newsCurrentIds=['E02'];s.newsLastResolvedRound=1;
 s.newsC03Offer=null;s.newsArchive=[report];
 const old=snapshot(s);
 G.ensureNewspaper(s,{rng:()=>{throw Error('no redraw')}});
 assert.equal(snapshot(s),old);
 const ongoing=base();delete ongoing.newsC03Offer;ongoing.declarationIndex=1;
 ongoing.market[0].claims=[{player:0,order:0}];
 G.ensureNewspaper(ongoing,{rng:()=>0});
 assert.equal(ongoing.newsC03Offer,null,'already underway auctions cannot receive a retroactive offer');
 assert.equal(G.acceptC03Offer(ongoing,0).ok,false);
});
test('legacy save exactly before declare may open a single new C03 offer, not duplicate after reload',()=>{
 const s=base();delete s.newsC03Offer;
 G.ensureNewspaper(s,{rng:()=>0});
 assert.equal(s.newsC03Offer.round,1);
 const old=snapshot(s);
 G.ensureNewspaper(s,{rng:()=>0});
 assert.equal(snapshot(s),old);
 const res=G.acceptC03Offer(s,0);assert.equal(res.ok,true);
 G.ensureNewspaper(s,{rng:()=>0});
 assert.equal(s.newsC03Offer.cursor,1);
});
test('final 1905 C03 archives once without a seventh-year grant',()=>{
 const s=base();s.round=6;s.newsC03Offer=G.createC03Offer(s);
 finishOffer(s,[0]);s.newsDeck=[];
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const r=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.finished,true);assert.equal(s.newsArchive.at(-1).c03.decisions.length,3);
 assert.equal(s.newsArchive.filter(x=>x.cardId==='C03').length,1);
});
