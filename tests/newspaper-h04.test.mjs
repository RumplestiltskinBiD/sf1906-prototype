import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=state=>JSON.stringify(state);
function game({players=3,round=1,capital=25,phase='development'}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase=phase;s.view='city';
 s.newsCurrentIds=['H04'];s.newsDeck=s.newsDeck.filter(id=>id!=='H04');
 s.newsLastResolvedRound=round-1;
 s.newsH04Donations={round,donations:[]};s.newsEmergency={};
 s.developmentPlayer=0;s.developmentComplete=false;
 while(s.players.length<players){
  const id=s.players.length;
  s.players.push({...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
   workers:G.createWorkers(id),portfolio:[],goals:[]});
 }
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.developmentSlotsUsed=Array(players).fill(0);
 s.players.forEach((p,i)=>{p.capital=capital;p.influence=40-4*i;p.prestige=0;});
 return s;
}
function rngSeed(a){return ()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

test('H04 activated headline has no old housing prestige fine or emergency actions',()=>{
 const s=game();
 const c=newsCard('H04');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ВРАЧИ ТРЕБУЮТ СПАСТИ МЛАДЕНЦЕВ!');
 assert.equal(c.delta,0);assert.equal(c.target,'none');
 assert.equal(c.defense,null);assert.equal(c.frequency,'oncePerYear');
 assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).threatened,[]);
 assert.equal(G.newsPreview(s).h04.options.length,3);
 assert.equal(G.H04_DONATION_COST,10);
 assert.equal(G.H04_DONATION_VP,4);
 assert.equal(G.H04_DONATION_INFLUENCE,2);
});
test('H04 payment deducts exactly $10 and rewards 4 VP and 2 true Influence steps once',()=>{
 const s=game();
 const player=s.players[0];const from=player.influence;
 const workers=snap(player.workers),slots=snap(s.developmentSlotsUsed),actions=s.activationMainActionUsed;
 const r=G.donateH04(s,0);
 assert.equal(r.ok,true);
 assert.equal(player.capital,15);assert.equal(player.prestige,4);
 assert.equal(r.record.influenceSteps,2);
 assert.equal(player.influence,from+2);
 assert.equal(snap(player.workers),workers);
 assert.equal(snap(s.developmentSlotsUsed),slots);
 assert.equal(s.activationMainActionUsed,actions);
 assert.equal(s.newsH04Donations.donations.length,1);
 assert.deepEqual(G.newsPreview(s).h04.donations,[r.record]);
 assert.equal(G.h04DonationOptions(s,0).available,false);
 const before=snap(s);
 assert.equal(G.donateH04(s,0).reason,'already-donated');
 assert.equal(snap(s),before);
});
test('Influence reward counts 2 legal steps while jumping occupied positions',()=>{
 const s=game();
 s.players[0].influence=10;
 s.players[1].influence=11;
 s.players[2].influence=13;
 const originalOrder=snap(s.yearTurnOrder);
 const r=G.donateH04(s,0);
 assert.equal(r.ok,true);
 assert.equal(r.record.influenceFrom,10);
 assert.equal(r.record.influenceTo,14);
 assert.equal(r.record.influenceSteps,2);
 assert.equal(s.players[0].influence,14);
 assert.equal(snap(s.yearTurnOrder),originalOrder,'year turn order is fixed');
});
test('cost $10 exactly is legal and capital $9 or $0 refuses atomically',()=>{
 for(const initial of [9,0]){
  const s=game({capital:initial}),before=snap(s);
  assert.equal(G.h04DonationOptions(s,0).affordable,false);
  assert.equal(G.donateH04(s,0).reason,'capital');
  assert.equal(snap(s),before);
 }
 const s=game({capital:10});
 assert.equal(G.donateH04(s,0).ok,true);
 assert.equal(s.players[0].capital,0);
 assert.equal(s.players[0].prestige,4);
});
test('all 3, 4 and 5 players can donate independently without racing or building requirements',()=>{
 for(const count of [3,4,5]){
  const s=game({players:count});
  s.players.forEach(p=>{p.workers=[];p.workersLeft=0;});
  const buildings=snap(s.constructions);
  const before=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
  for(const playerId of s.players.map(p=>p.id)){
   const r=G.donateH04(s,playerId);
   assert.equal(r.ok,true,'player '+playerId);
   assert.equal(s.players[playerId].capital,before[playerId].capital-10);
   assert.equal(s.players[playerId].prestige,before[playerId].prestige+4);
   assert.equal(r.record.influenceSteps,2);
   assert.deepEqual(s.newsH04Donations.donations.map(x=>x.playerId),
    Array.from({length:playerId+1},(_,i)=>i));
  }
  assert.equal(snap(s.constructions),buildings);
  assert.equal(s.newsH04Donations.donations.length,count);
  const saved=snap(s);
  for(const playerId of s.players.map(p=>p.id)){
   assert.equal(G.donateH04(s,playerId).reason,'already-donated');
  }
  assert.equal(snap(s),saved);
 }
});
test('no worker, used worker, arrested worker, no clinics and no current developer are not restrictions',()=>{
 for(const phase of ['draft','declare','bids','ready','development']){
  const s=game({phase});
  s.developmentPlayer=null;
  s.players[1].workers.forEach(w=>{w.used=true;w.jailed=true;});
  s.players[1].workersLeft=0;
  assert.equal(s.constructions.length,0);
  assert.equal(G.donateH04(s,1).ok,true,'phase '+phase);
  assert.equal(s.players[1].capital,15);
  assert.equal(s.players[1].prestige,4);
 }
});
test('bad id, wrong newspaper, invalid phases, completed year and final game reject atomically',()=>{
 const tests=[
  {name:'wrong article',mutate:s=>{s.newsCurrentIds=['E02'];},pid:0,reason:'not-active'},
  {name:'past year',mutate:s=>{s.newsLastResolvedRound=s.round;},pid:0,reason:'not-active'},
  {name:'finished',mutate:s=>{s.finished=true;},pid:0,reason:'not-active'},
  {name:'crime assessment',mutate:s=>{s.phase='crime-assessment';},pid:0,reason:'not-active'},
  {name:'year transition',mutate:s=>{s.phase='upkeep-choice';},pid:0,reason:'not-active'},
  {name:'negative player id',mutate:()=>{},pid:-1,reason:'player'},
  {name:'string player id',mutate:()=>{},pid:'0',reason:'player'},
  {name:'missing player id',mutate:()=>{},pid:5,reason:'player'}
 ];
 for(const item of tests){
  const s=game();item.mutate(s);const before=snap(s);
  assert.equal(G.donateH04(s,item.pid).reason,item.reason,item.name);
  assert.equal(snap(s),before,item.name);
 }
});
test('serialize/reload and ensureNewspaper preserve paid donations without replay',()=>{
 const s=game();
 assert.equal(G.donateH04(s,0).ok,true);
 const copy=JSON.parse(snap(s)),before=snap(copy);
 G.ensureNewspaper(copy,{rng:()=>{throw Error('no reroll')}});
 assert.equal(snap(copy),before);
 assert.equal(G.h04DonationOptions(copy,0).donated,true);
 assert.equal(G.h04DonationOptions(copy,1).available,true);
 assert.equal(G.donateH04(copy,0).reason,'already-donated');
 assert.equal(G.donateH04(copy,1).ok,true);
 assert.equal(copy.newsH04Donations.donations.length,2);
});
test('old active H04 save initializes donations once, preserving player wealth and sites',()=>{
 const s=game();
 delete s.newsH04Donations;
 s.players[0].capital=63;s.players[0].influence=17;s.players[0].prestige=8;
 s.constructions.push({id:'W',playerId:0,projectId:'warehouse',districtId:'civic',
  status:'complete',materialsDelivered:[],warehouseInventory:['Lumber']});
 const original={players:snap(s.players),constructions:snap(s.constructions),logistics:snap(s.logisticsSupply)};
 G.ensureNewspaper(s,{rng:()=>{throw Error('must not redraw')}});
 assert.deepEqual(s.newsH04Donations,{round:1,donations:[]});
 assert.equal(snap(s.players),original.players);
 assert.equal(snap(s.constructions),original.constructions);
 assert.equal(snap(s.logisticsSupply),original.logistics);
 assert.equal(G.donateH04(s,0).ok,true);
 assert.equal(s.players[0].capital,53);
 const donated=snap(s);
 G.ensureNewspaper(s);
 assert.equal(snap(s),donated);
});
test('real first-year shuffled H04 permits charity from the opening City Hall draft',()=>{
 let found=null;
 for(let seed=1;seed<=700;seed++){
  const s=G.createInitialState({rng:rngSeed(seed)});
  if(s.newsCurrentIds[0]==='H04'){found=s;break;}
 }
 assert.ok(found,'H04 must be possible as a new game newspaper');
 assert.equal(found.phase,'draft');
 assert.deepEqual(found.newsH04Donations,{round:1,donations:[]});
 const before=found.players[0].capital;
 assert.equal(G.donateH04(found,0).ok,true);
 assert.equal(found.players[0].capital,before-10);
 assert.equal(found.players[0].prestige,4);
});
test('year end archives actual donations, never applies extra housing fine or repeats awards',()=>{
 const s=game();
 s.players[0].capital=50;s.players[1].capital=20;s.players[2].capital=9;
 s.newsDeck=['E02',...s.newsDeck.filter(x=>x!=='E02')];
 assert.equal(G.donateH04(s,0).ok,true);
 assert.equal(G.donateH04(s,1).ok,true);
 assert.equal(G.donateH04(s,2).reason,'capital');
 s.constructions.push({id:'H',playerId:2,projectId:'residential_quarter',
  districtId:'civic',status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:[],warehouseInventory:[]});
 const before=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
 const income=s.players.map(p=>G.roundIncome(s,p.id));
 s.developmentComplete=true;s.developmentPlayer=null;
 const result=G.cleanupMarket(s,{rng:()=>.3});
 assert.equal(result.ok,true);
 assert.equal(s.round,2);
 assert.equal(s.newsArchive.length,1);
 const report=s.newsArchive[0];
 assert.equal(report.cardId,'H04');
 assert.equal(report.h04.donations.length,2);
 assert.deepEqual(report.h04.donations.map(x=>x.playerId),[0,1]);
 assert.deepEqual(report.entries,[]);
 assert.deepEqual(report.changes,{});
 assert.equal(s.newsH04Donations,null);
 for(let i=0;i<s.players.length;i++){
  assert.equal(s.players[i].capital,before[i].capital+income[i]);
  assert.equal(s.players[i].prestige,before[i].prestige);
  assert.equal(s.players[i].influence,before[i].influence);
 }
 assert.equal(G.donateH04(s,0).reason,'not-active');
});
test('year transition into H04 initializes all available donations; next year expires them',()=>{
 const s=game();
 s.newsCurrentIds=['E02'];
 s.newsDeck=['H04','E03',...s.newsDeck.filter(id=>!['H04','E03'].includes(id))];
 s.newsH04Donations=null;
 s.developmentComplete=true;s.developmentPlayer=null;
 const first=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(first.ok,true);
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'H04');
 assert.deepEqual(s.newsH04Donations,{round:2,donations:[]});
 assert.equal(G.donateH04(s,2).ok,true,'available during City Hall');
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const second=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(second.ok,true);
 assert.equal(s.round,3);assert.equal(s.newsCurrentIds[0],'E03');
 assert.equal(s.newsH04Donations,null);
 assert.equal(s.newsArchive[1].h04.donations.length,1);
 assert.equal(G.donateH04(s,2).reason,'not-active');
});
test('H04 as final 1905 issue records donation and finishes without seventh year',()=>{
 const s=game({round:6});
 assert.equal(G.donateH04(s,0).ok,true);
 const expected=s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}));
 s.developmentComplete=true;s.developmentPlayer=null;
 const result=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(result.ok,true);assert.equal(result.finished,true);
 assert.equal(s.round,6);assert.equal(s.finished,true);
 assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].h04.donations.length,1);
 assert.deepEqual(s.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence})),expected);
 assert.equal(G.donateH04(s,0).reason,'not-active');
});
test('old H04 newspaper archives remain unmodified with original title and losses',()=>{
 const s=game();
 const old={round:1,year:1900,cardId:'H04',title:'Кто отвечает за больных?',
  category:'Болезнь',entries:[{playerId:0,districtIds:['civic'],actual:-1,defended:false}],
  changes:{0:{capital:0,influence:0,prestige:-1}},serviceRecognition:[],emergency:{}};
 s.newsArchive=[old];s.round=2;s.newsCurrentIds=['E02'];s.newsH04Donations=null;
 const archive=snap(old);
 G.ensureNewspaper(s);
 assert.equal(snap(s.newsArchive[0]),archive);
});
