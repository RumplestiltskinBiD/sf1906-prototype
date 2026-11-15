import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const lengths={broadway:2,pacificmail:3,chinabasin:3,unioniron:1,southernpacific:4};
const normal={broadway:3,pacificmail:4,chinabasin:4,unioniron:2,southernpacific:4};
const snapshot=x=>JSON.stringify(x);
function setup({year=1,players=3,legacy=false}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=year;s.phase='development';s.view='city';
 s.newsCurrentIds=['H03'];s.newsDeck=s.newsDeck.filter(x=>x!=='H03');
 s.newsLastResolvedRound=year-1;s.newsEmergency={};
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.logisticsSupply=G.generateLogisticsSupply({rng:()=>.15,h03:!legacy});
 s.newsH03SupplyRound=legacy?null:year;
 while(s.players.length<players){
  const id=s.players.length;
  s.players.push({...structuredClone(s.players[0]),id,name:'Test '+id,
   key:'test'+id,workers:G.createWorkers(id),portfolio:[],goals:[]});
 }
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.developmentSlotsUsed=Array(players).fill(0);
 s.players.forEach((p,i)=>{p.capital=80;p.prestige=0;p.influence=20-i*3;p.suspicion=0;});
 return s;
}
function checkSupply(s,expected){
 for(const node of G.LOGISTICS_NODES)assert.equal(
  s.logisticsSupply[node.id].length,expected[node.id],node.id);
 assert.equal(Object.values(s.logisticsSupply).flat().length,
  Object.values(expected).reduce((a,b)=>a+b,0));
}
function seeded(a){return ()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);
 t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}

test('H03 v2 replaces the factory fine: no city action or year-end player penalty',()=>{
 const s=setup();
 const card=newsCard('H03');
 assert.equal(card.designV2.status,'implemented-for-playtest');
 assert.equal(card.title,'ЗАМОРСКИЕ ГРУЗЫ ЗАДЕРЖАНЫ!');
 assert.equal(card.target,'none');assert.equal(card.delta,0);
 assert.equal(card.defense,null);assert.equal(card.frequency,'oncePerYear');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).threatened,[]);
 assert.equal(G.takeNewspaperEmergency(s,0,'soma').reason,'not-negative-event');
 assert.equal(G.newsPreview(s).h03.removedSlots,4);
 assert.equal(s.players[0].workersLeft,3);
});

test('H03 generates 13 cubes at the four correct nodes and preserves rail=4',()=>{
 const s=setup();checkSupply(s,lengths);
 assert.deepEqual(G.H03_SEA_PORT_IDS,['broadway','pacificmail','chinabasin','unioniron']);
 assert.equal(s.newsH03SupplyRound,1);
 const standard=G.generateLogisticsSupply({rng:()=>.15});
 for(const node of G.LOGISTICS_NODES)
  assert.equal(standard[node.id].length,normal[node.id]);
});

test('shortage reduces random draws, not a second random deletion or node probabilities',()=>{
 const calls=[];
 const rng=()=>{calls.push(1);return .01;};
 const out=G.generateLogisticsSupply({rng,h03:true});
 assert.equal(calls.length,13);
 for(const node of G.LOGISTICS_NODES){
  assert.equal(out[node.id].length,lengths[node.id]);
  assert.deepEqual(out[node.id],Array(lengths[node.id]).fill('Lumber'));
 }
 const draws=[];
 G.generateLogisticsSupply({rng:()=>{draws.push(1);return .9999;}});
 assert.equal(draws.length,17);
});

test('first-year newspaper H03 is rolled before material generation',()=>{
 let h03=null,normalGame=null;
 for(let i=1;i<=600&&(!h03||!normalGame);i++){
  const s=G.createInitialState({rng:seeded(i)});
  if(s.newsCurrentIds[0]==='H03')h03=s;
  if(s.newsCurrentIds[0]!=='H03'&&s.newsCurrentIds[0]!=='F03')normalGame=s;
 }
 assert.ok(h03,'H03 must be a possible first-edition card');
 assert.ok(normalGame);
 checkSupply(h03,lengths);
 checkSupply(normalGame,normal);
 assert.equal(h03.newsH03SupplyRound,1);
 const before=snapshot(h03);
 G.ensureNewspaper(h03,{rng:()=>{throw Error('unwanted fresh draw')}});
 assert.equal(snapshot(h03),before);
});

test('same-year H03 refresh is idempotent and never restores bought cargo',()=>{
 const s=setup();
 s.logisticsSupply.pacificmail.shift();
 s.logisticsSupply.unioniron.pop();
 const before=snapshot(s);
 for(let i=0;i<3;i++){
  G.refreshLogisticsSupply(s,{rng:()=>{throw Error('unexpected refill')}});
  G.ensureNewspaper(s,{rng:()=>{throw Error('unexpected repeat')}});
  G.newsPreview(s);
  assert.equal(snapshot(s),before);
 }
});

test('ordinary delivery from a reduced port still transfers a real material',()=>{
 const s=setup();
 const mat=s.logisticsSupply.pacificmail[0];
 const wh={id:'W',playerId:0,projectId:'warehouse',districtId:'soma',
  status:'complete',materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1};
 s.constructions.push(wh);
 const request={playerId:0,source:{kind:'node',id:'pacificmail'},
  cargo:[mat],haulerId:'standard',route:['soma'],
  drops:[{kind:'warehouse',id:'W',materials:[mat],routeIndex:0}]};
 const done=G.executeDelivery(s,request);
 assert.equal(done.ok,true,done.reason);
 assert.equal(s.logisticsSupply.pacificmail.length,2);
 assert.deepEqual(wh.warehouseInventory,[mat]);
 const before=snapshot(s);
 G.ensureNewspaper(s);
 G.refreshLogisticsSupply(s,{rng:()=>{throw Error('reroll')}});
 assert.equal(snapshot(s),before);
});

test('insufficient cargo fails atomically: H03 is not a free re-supply',()=>{
 const s=setup();
 s.logisticsSupply.unioniron=[];
 s.constructions.push({id:'W',playerId:0,projectId:'warehouse',districtId:'potrero',
  status:'complete',materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1});
 const request={playerId:0,source:{kind:'node',id:'unioniron'},
  cargo:['Steel'],haulerId:'standard',route:['potrero'],
  drops:[{kind:'warehouse',id:'W',materials:['Steel'],routeIndex:0}]};
 const before=snapshot(s);
 assert.equal(G.executeDelivery(s,request).reason,'source-stock');
 assert.equal(snapshot(s),before);
});

test('no side effects on other inventories, owners, prices, or player actions',()=>{
 const s=setup({players:5});
 s.freightYardInventories=[['Lumber'],['Steel'],[]];
 s.constructions.push({id:'W',playerId:0,projectId:'warehouse',districtId:'soma',
  status:'complete',materialsDelivered:[],warehouseInventory:['Masonry']});
 const players=snapshot(s.players),sites=snapshot(s.constructions),yard=snapshot(s.freightYardInventories);
 G.ensureNewspaper(s);
 assert.equal(snapshot(s.players),players);
 assert.equal(snapshot(s.constructions),sites);
 assert.equal(snapshot(s.freightYardInventories),yard);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 checkSupply(s,lengths);
});

test('legacy active H03 saves are not retroactively depleted or rerolled',()=>{
 const s=setup({legacy:true});
 delete s.newsH03SupplyRound;
 s.logisticsSupply.pacificmail=['Steel']; // previously bought cargo
 s.freightYardInventories[0]=['Masonry'];
 const before=snapshot(s.logisticsSupply),beforeYard=snapshot(s.freightYardInventories);
 G.ensureNewspaper(s,{rng:()=>{throw Error('legacy draws cannot be undone')}});
 assert.equal(snapshot(s.logisticsSupply),before);
 assert.equal(snapshot(s.freightYardInventories),beforeYard);
 assert.equal(s.newsH03SupplyRound,null);
 assert.equal(G.newsPreview(s).h03.applied,false);
 const beforePlayer=snapshot(s.players);
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.equal(r.report.h03.applied,false);
 assert.equal(r.report.h03.removedSlots,0);
 assert.equal(snapshot(s.players),beforePlayer);
 assert.equal(snapshot(s.logisticsSupply),before);
});

test('end of H03 year records one no-penalty report, next year restores normal 17 cubes',()=>{
 const s=setup({players:4});
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.developmentComplete=true;s.developmentPlayer=null;
 const players=s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}));
 const income=s.players.map(p=>G.roundIncome(s,p.id));
 const done=G.cleanupMarket(s,{rng:()=>.27});
 assert.equal(done.ok,true);
 assert.equal(s.round,2);
 assert.equal(s.newsArchive.length,1);
 assert.deepEqual(s.newsArchive[0].entries,[]);
 assert.deepEqual(s.newsArchive[0].changes,{});
 assert.equal(s.newsArchive[0].h03.applied,true);
 assert.equal(s.newsArchive[0].h03.removedSlots,4);
 assert.deepEqual(s.newsArchive[0].h03.portIds,G.H03_SEA_PORT_IDS);
 assert.equal(s.newsH03SupplyRound,null);
 checkSupply(s,normal);
 for(let i=0;i<players.length;i++){
  assert.equal(s.players[i].capital,players[i].capital+income[i]);
  assert.equal(s.players[i].influence,players[i].influence);
  assert.equal(s.players[i].prestige,players[i].prestige);
 }
 assert.equal(G.resolveNewspaper(s).ok,true,'next new year may resolve its own issue');
 assert.equal(s.newsArchive.length,2);
});

test('transition INTO H03 generates reduced supply after new edition and leaves other resources intact',()=>{
 const s=G.createInitialState({rng:()=>.39});
 s.newsCurrentIds=['E02'];
 s.newsDeck=['H03','E03',...s.newsDeck.filter(x=>!['H03','E03'].includes(x))];
 s.newsH03SupplyRound=null;
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const beforeYard=snapshot(s.freightYardInventories);
 const beforePlayers=s.players.length;
 const result=G.cleanupMarket(s,{rng:()=>.19});
 assert.equal(result.ok,true);
 assert.equal(s.round,2);
 assert.equal(s.newsCurrentIds[0],'H03');
 assert.equal(s.newsH03SupplyRound,2);
 checkSupply(s,lengths);
 assert.equal(s.players.length,beforePlayers);
 assert.equal(snapshot(s.freightYardInventories),beforeYard);
 assert.equal(s.newsArchive[0].cardId,'E02');
 const untouched=snapshot(s.logisticsSupply);
 G.ensureNewspaper(s,{rng:()=>{throw Error('second H03 supply roll')}});
 assert.equal(snapshot(s.logisticsSupply),untouched);
 // The following City Hall session is simulated before ending another year.
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const next=G.cleanupMarket(s,{rng:()=>.2});
 assert.equal(next.ok,true);
 assert.equal(s.round,3);
 assert.equal(s.newsCurrentIds[0],'E03');
 assert.equal(s.newsH03SupplyRound,null);
 checkSupply(s,normal);
 assert.equal(s.newsArchive[1].h03.applied,true);
 assert.equal(s.newsArchive[1].h03.removedSlots,4);
});

test('H03 on 1905 resolves without generating a seventh year',()=>{
 const s=setup({year:6});
 s.developmentComplete=true;s.developmentPlayer=null;
 const before=s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}));
 const done=G.cleanupMarket(s,{rng:()=>.27});
 assert.equal(done.ok,true);assert.equal(done.finished,true);
 assert.equal(s.round,6);assert.equal(s.finished,true);
 assert.equal(s.newsArchive.length,1);
 assert.equal(s.newsArchive[0].h03.removedSlots,4);
 assert.deepEqual(s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige})),before);
 assert.equal(G.cleanupMarket(s).ok,false);
});

test('legacy H03 report remains unchanged and H03 current generator does not rewrite it',()=>{
 const s=setup();
 const old={round:1,year:1900,cardId:'H03',title:'Рабочие уходят с фабрик с жаром',
  category:'Болезнь',entries:[{playerId:1,districtIds:['soma'],actual:-2,defended:false}],
  changes:{1:{capital:-2,influence:0,prestige:0}},serviceRecognition:[],emergency:{}};
 s.round=2;s.newsCurrentIds=['E02'];s.newsH03SupplyRound=null;s.newsArchive=[old];
 const before=snapshot(old);
 G.ensureNewspaper(s);
 assert.equal(snapshot(s.newsArchive[0]),before);
});
