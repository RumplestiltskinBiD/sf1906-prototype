import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {researchCardById} from '../research-cards.js';

const clone=x=>JSON.parse(JSON.stringify(x));
const stockCount=s=>Object.values(s).reduce((sum,a)=>sum+a.length,0);
const stockTypes=s=>Object.values(s).flat().sort();
function rngFactory(seed=1){
  let x=seed>>>0;
  return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);
}
function game(){
  const s=G.createInitialState({rng:()=>0.3});
  s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
  s.players.forEach(p=>{p.capital=60;p.suspicion=0;});
  s.newsCurrentIds=['E02'];s.newsE02TradeWeek={round:1,events:[]};
  s.newsLastResolvedRound=0;s.newsC02Incident=null;s.newsF03Incident=null;
  s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
  s.pendingReinforcements=[];s.pendingBreadProduction=[];s.pendingWorkforceLinks=[];
  s.pendingPressCampaigns=[];s.pendingSailorRecruitments=[];
  s.constructions=[];
  Object.assign(s.research.R05,{status:'held',holderId:0,fundedRound:null});
  return s;
}
function fund(s,rng=rngFactory(88)){
  const res=G.fundResearch(s,0,'R05',{rng});
  assert.equal(res.ok,true,JSON.stringify(res));
  return res;
}
function year(s,nextNews='E01',rng=rngFactory(33)){
  s.newsDeck=[nextNews,'E02','C01'];
  s.developmentComplete=true;
  const result=G.cleanupMarket(s,{rng});
  assert.equal(result.ok,true,JSON.stringify(result));
  assert.equal(s.round,2,'annual transition must advance to 1901');
  return result;
}
test('R05 registry: public next-year baseline, not new resources/reservations or a year lock',()=>{
  const c=researchCardById('R05');
  assert.equal(c.fundingCost,4);
  assert.deepEqual(c.sponsorReward,{vp:3,influence:1});
  assert.equal(c.effect.type,'reveal-next-year-logistics-supply');
  assert.equal(c.effect.sharedInformation,true);
  assert.equal(c.effect.mustPreGenerateAndPersistForecast,true);
  assert.equal(c.effect.changesResourceQuantity,false);
  assert.equal(c.effect.reservesResources,false);
  assert.equal(c.yearRestriction,null);
});
test('R05 funding forecasts once immediately, retains all existing supply and pays only once',()=>{
  const s=game(),before=clone(s.logisticsSupply),bank=s.players[0].capital;
  let draws=0;
  fund(s,()=>{draws++;return 0.19;});
  assert.equal(draws,17,'forecast must draw exactly one real future supply of five nodes');
  assert.equal(s.players[0].capital,bank-4);
  assert.deepEqual(s.logisticsSupply,before,'no live port cubes changed by research');
  assert.equal(s.research.R05.status,'funded');
  const p=G.researchLogisticsForecast(s);
  assert.equal(p.round,2);assert.equal(p.year,1901);
  assert.equal(stockCount(p.supply),17);
  for(const n of G.LOGISTICS_NODES)assert.equal(p.supply[n.id].length,n.throughput);
  assert.deepEqual(p.possibleAdjustments,['H03','F03','C02']);
  assert.equal(G.fundResearch(s,0,'R05',{rng:()=>{throw Error('repeat may not draw');}}).reason,'already-funded');
  assert.equal(draws,17);
});
test('R05 failed funding cannot draw random numbers, pay, alter turn or create forecast',()=>{
  const s=game();
  s.players[0].capital=3;
  const before=JSON.stringify(s);
  const r=G.fundResearch(s,0,'R05',{rng:()=>{throw Error('must not sample');}});
  assert.equal(r.ok,false);assert.equal(r.reason,'capital');assert.equal(JSON.stringify(s),before);
  s.players[0].capital=60;
  s.research.R05.holderId=2;
  const after=JSON.stringify(s);
  assert.equal(G.fundResearch(s,0,'R05').reason,'not-research-holder');
  assert.equal(JSON.stringify(s),after);
});
test('forecast is identical for every viewer, does not disclose hidden future news and is immutable by callers',()=>{
  const s=game();
  s.newsDeck=['H03','F03'];
  fund(s);
  const preview=G.researchLogisticsForecast(s);
  assert.equal(JSON.stringify(preview).includes('newsDeck'),false);
  assert.equal(JSON.stringify(preview).includes('forthcoming'),false);
  assert.equal(preview.scope,'ordinary-supply-before-newspaper');
  assert.deepEqual(G.researchLogisticsForecast(s),preview);
  preview.supply.broadway[0]='tampered';
  preview.possibleAdjustments.push('secret');
  assert.deepEqual(G.researchLogisticsForecast(s).supply,s.researchLogisticsForecast.supply);
  assert.equal(s.researchLogisticsForecast.supply.broadway.includes('tampered'),false);
});
test('normal year consumes exact predicted cubes and publishes a fresh forecast for the following year',()=>{
  const s=game();
  fund(s,rngFactory(1234));
  const planned=clone(G.researchLogisticsForecast(s).supply);
  year(s,'E01',rngFactory(555));
  assert.deepEqual(s.logisticsSupply,planned);
  assert.equal(stockCount(s.logisticsSupply),17);
  const arrival=G.researchLogisticsArrivalReport(s);
  assert.deepEqual(arrival.planned,planned);
  assert.deepEqual(arrival.actual,planned);
  assert.equal(arrival.adjustment,null);
  arrival.actual.broadway[0]='tampered';
  assert.deepEqual(G.researchLogisticsArrivalReport(s).actual,planned,'arrival getter must copy');
  const next=G.researchLogisticsForecast(s);
  assert.equal(next.round,3);assert.equal(stockCount(next.supply),17);
  assert.equal(s.research.R05.status,'funded');
});
test('H03 cancels one planned delivery per SEA PORT only, preserving the other forecast cargo',()=>{
  const s=game();
  fund(s,rngFactory(198));
  const planned=clone(G.researchLogisticsForecast(s).supply);
  year(s,'H03',rngFactory(29));
  assert.equal(s.newsH03SupplyRound,2);
  assert.equal(stockCount(s.logisticsSupply),13);
  const receipt=G.researchLogisticsArrivalReport(s);
  assert.deepEqual(receipt.planned,planned);
  assert.deepEqual(receipt.actual,s.logisticsSupply);
  assert.equal(receipt.adjustment,'H03');
  for(const n of G.LOGISTICS_NODES){
    assert.deepEqual(s.logisticsSupply[n.id],
      G.H03_SEA_PORT_IDS.includes(n.id)?planned[n.id].slice(0,-1):planned[n.id],
      'H03 must not redraw or replace the remaining materials in '+n.id);
  }
  assert.equal(stockCount(G.researchLogisticsForecast(s).supply),17,'following-year baseline returns to normal');
});
test('F03 redistributes exact planned cargo without deleting material or telegraphing the port in advance',()=>{
  const s=game();
  fund(s,rngFactory(53));
  const planned=clone(G.researchLogisticsForecast(s).supply);
  year(s,'F03',()=>0.5);
  assert.equal(s.newsF03Incident.round,2);
  assert.equal(s.newsF03Incident.originStock.length,planned[s.newsF03Incident.portId].length);
  assert.deepEqual(stockTypes(s.logisticsSupply),stockTypes(planned));
  assert.equal(stockCount(s.logisticsSupply),17);
  assert.deepEqual(s.logisticsSupply[s.newsF03Incident.portId],[]);
  assert.deepEqual(s.logisticsSupply.southernpacific,planned.southernpacific);
  const receipt=G.researchLogisticsArrivalReport(s);
  assert.equal(receipt.adjustment,'F03');
  assert.deepEqual(receipt.planned,planned);
  assert.deepEqual(receipt.actual,s.logisticsSupply);
});
test('C02 moves exactly two planned physical cubes into its lot, never generates replacements',()=>{
  const s=game();
  fund(s,rngFactory(73));
  const planned=clone(G.researchLogisticsForecast(s).supply);
  year(s,'C02',()=>0.99);
  const lot=s.newsC02Incident;
  assert.equal(lot.round,2);assert.equal(lot.status,'available');
  assert.equal(lot.materials.length,2);
  assert.equal(stockCount(s.logisticsSupply),15);
  const receipt=G.researchLogisticsArrivalReport(s);
  assert.equal(receipt.adjustment,'C02');
  assert.deepEqual(receipt.planned,planned);
  assert.deepEqual(receipt.actual,s.logisticsSupply);
  assert.deepEqual([...stockTypes(s.logisticsSupply),...lot.materials].sort(),stockTypes(planned));
  assert.equal(stockCount(G.researchLogisticsForecast(s).supply),17);
});
test('JSON reload retains the precise planned manifest and does not invoke RNG in public selectors',()=>{
  const s=game();fund(s,rngFactory(911));
  const saved=clone(s),before=JSON.stringify(saved);
  assert.deepEqual(G.researchLogisticsForecast(saved),G.researchLogisticsForecast(s));
  assert.equal(JSON.stringify(saved),before,'preview is pure after JSON parse');
  const planned=clone(G.researchLogisticsForecast(saved).supply);
  year(saved,'E04',rngFactory(333));
  assert.deepEqual(saved.logisticsSupply,planned);
});
test('manual refresh is not an annual forecast consumption and cannot erase the reserved next year',()=>{
  const s=game();fund(s);
  const before=clone(s.researchLogisticsForecast);
  G.refreshLogisticsSupply(s,{rng:()=>0.85});
  assert.deepEqual(s.researchLogisticsForecast,before);
  assert.deepEqual(G.researchLogisticsForecast(s).supply,before.supply);
});
test('R05 funding in the final 1905 year is legal and does not draw a nonexistent 1906 supply',()=>{
  const s=game();s.round=6;s.newsLastResolvedRound=5;
  let called=0;const bank=s.players[0].capital;
  const result=G.fundResearch(s,0,'R05',{rng:()=>{called++;return 0.5;}});
  assert.equal(result.ok,true);
  assert.equal(called,0);assert.equal(s.players[0].capital,bank-4);
  assert.equal(G.researchLogisticsForecast(s),null);
  assert.equal(s.researchLogisticsForecast,null);
});
test('unfunded R05 leaves the old annual supply distribution and RNG path unchanged',()=>{
  const s=game();s.research.R05={status:'available',holderId:null,fundedRound:null};
  const expected=G.generateLogisticsSupply({rng:()=>0.1});
  year(s,'E01',()=>0.1);
  assert.deepEqual(s.logisticsSupply,expected);
  assert.equal(s.researchLogisticsForecast,null);
  assert.equal(G.researchLogisticsForecast(s),null);
  assert.equal(G.researchLogisticsArrivalReport(s),null);
});
test('bad/legacy forecast is not published, and unrelated state remains unchanged by its preview',()=>{
  const s=game();fund(s);
  const damaged=clone(s);
  damaged.researchLogisticsForecast.supply.broadway.push('Steel');
  const before=JSON.stringify(damaged);
  assert.equal(G.researchLogisticsForecast(damaged),null);
  assert.equal(JSON.stringify(damaged),before);
  delete damaged.researchLogisticsForecast;
  assert.equal(G.researchLogisticsForecast(damaged),null);
});

test('arrival receipt is a persistent pre-purchase snapshot, not a mutable alias of port stock',()=>{
  const s=game();fund(s,rngFactory(91));
  const planned=clone(G.researchLogisticsForecast(s).supply);
  year(s,'H03',rngFactory(27));
  const arrival=clone(G.researchLogisticsArrivalReport(s));
  assert.deepEqual(arrival.planned,planned);
  s.logisticsSupply.broadway.shift();
  assert.deepEqual(G.researchLogisticsArrivalReport(s),arrival);
  const saved=clone(s);
  assert.deepEqual(G.researchLogisticsArrivalReport(saved),arrival);
  assert.equal(G.researchLogisticsArrivalReport(game()),null);
});
