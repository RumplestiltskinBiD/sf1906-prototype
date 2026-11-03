import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function game(round=1){
 const s=G.createInitialState({rng:()=>0.11});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;s.round=round;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];p.breadIncomePenalty=0;});
 s.constructions=[];s.pendingBreadProduction=[];s.breadSpoilageSettledRound=0;
 return s;
}
function built(id,projectId,playerId=0,districtId='soma',extra={}){
 return {id,projectId,playerId,districtId,status:'complete',materialsDelivered:[...G.projectById(projectId).materials],
 warehouseInventory:[],startedRound:1,completedRound:1,...extra};
}
function ship({source='F',target='P',cargo=['Bread'],route=['soma'],pickups=[],sources=cargo.map(()=>source),haulerId='standard',drops=null}={}){
 return {playerId:0,source:{kind:'goods',id:source},haulerId,cargo,pickups,route,
 drops:drops||[{kind:'goods-sale',id:target,routeIndex:route.length-1,materials:[...cargo,...pickups.flatMap(p=>p.cargo)],
 goodsSourceIds:sources}]};
}
function finishYear(s){
 s.developmentComplete=true;s.developmentPlayer=null;s.market=[];s.deck=[];
 s.newsLastResolvedRound=s.round;s.crimeAssessedRound=s.round;
 s.players.forEach(p=>{p.suspicion=0;p.workers.forEach(w=>w.used=true);});
 return G.cleanupMarket(s,{rng:()=>0.2});
}

test('steam bread bakery is one single-type industrial card with approved recipe and base income',()=>{
 const p=G.projectById(G.BREAD_FACTORY_ID);
 assert.equal(p.name,'Паровая хлебопекарная фабрика');
 assert.deepEqual(p.types,['Промышленное']);
 assert.deepEqual(p.materials,['Lumber','Lumber','Masonry','Steel']);
 assert.equal(p.open,5);assert.equal(p.income,1);assert.equal(p.prestige,1);
 assert.deepEqual(p.risk,{earthquake:0,fire:2});
 assert.deepEqual([...G.PINK_GOODS],['Beer','Bread']);
 const pool=G.createProjectCardPool({rng:()=>0.2});
 assert.equal(pool.filter(c=>c.id===G.BREAD_FACTORY_ID).length,2);
});

test('completion requires an immediate 2 or 4 bread production decision, never automatic skipping',()=>{
 const s=game();
 const f=built('F',G.BREAD_FACTORY_ID,1,'soma',{status:'under-construction'});
 s.constructions.push(f);
 const r=G.completeConstruction(s,f);
 assert.equal(r.ok,true,r.reason);
 assert.equal(f.status,'complete');
 assert.equal(f.breadStock,0,'pending choice is not yet resolved');
 assert.deepEqual(s.pendingBreadProduction,['F']);
 assert.equal(G.canUseFreeAction(s,0),false);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.endActivation(s,0).reason,'bread-production-choice');
 assert.equal(G.chooseBreadProduction(s,'F',0).ok,false);
 assert.equal(G.chooseBreadProduction(s,'F',3).ok,false);
 assert.equal(G.chooseBreadProduction(s,'wrong',2).ok,false);
 const selected=G.chooseBreadProduction(s,'F',4);
 assert.equal(selected.ok,true);
 assert.equal(f.breadProductionRound,1);
 assert.equal(f.breadStock,4);
 assert.equal(f.breadProductionQuantity,4);
 assert.deepEqual(s.pendingBreadProduction,[]);
 assert.equal(G.chooseBreadProduction(s,'F',2).ok,false,'cannot change production after market has moved');
});

test('both 2 and 4 outputs are valid in the construction year',()=>{
 for(const amount of [2,4]){
  const s=game(),f=built('F',G.BREAD_FACTORY_ID,0,'soma',{status:'under-construction'});
  s.constructions.push(f);
  assert.equal(G.completeConstruction(s,f).ok,true);
  assert.equal(G.chooseBreadProduction(s,'F',amount).ok,true);
  assert.equal(G.breadInventory(f).length,amount);
 }
});

test('bread sells to all four pink buyers using identical Beer distribution',()=>{
 for(const id of ['wholesale_market','shops','club','pub']){
  const s=game();
  s.constructions=[built('F',G.BREAD_FACTORY_ID,1,'soma',{breadStock:2,breadProductionQuantity:2,breadProductionRound:1}),built('P',id,2)];
  const r=G.executeDelivery(s,ship());
  assert.equal(r.ok,true,id+': '+r.reason);
  assert.equal(s.constructions[0].breadStock,1);
  assert.equal(G.goodsBuyerUsed(s,s.constructions[1]),1);
  assert.equal(s.players[0].capital,100,'+$3 carrier minus $3 standard cost');
  assert.equal(s.players[1].capital,101,'producer +$1');
  assert.equal(s.players[2].capital,101,'recipient +$1');
 }
});

test('mixed Beer and Bread delivery preserves type, origin, stock, and one common buyer quota',()=>{
 const s=game();
 s.constructions=[built('B','brewery',2,'soma',{beerStock:1}),
  built('F',G.BREAD_FACTORY_ID,1,'soma',{breadStock:2,breadProductionRound:1,breadProductionQuantity:2}),
  built('P','club',2)];
 const plan=ship({source:'B',target:'P',cargo:['Beer'],pickups:[{source:{kind:'goods',id:'F'},routeIndex:0,cargo:['Bread']}],
 sources:['B','F']});
 const r=G.executeDelivery(s,plan);
 assert.equal(r.ok,true,r.reason);
 assert.equal(s.constructions[0].beerStock,0);
 assert.equal(s.constructions[1].breadStock,1);
 assert.equal(G.goodsBuyerUsed(s,s.constructions[2]),2);
 assert.equal(s.players[0].capital,102,'two goods => $6 less $4 transport, with no buyer ownership');
 assert.equal(s.players[1].capital,101);
 assert.equal(s.players[2].capital,103,'one brewery, one beer producer, and two recipient bonuses');
});

test('forged pink goods source, mismatched producer, or unauthorized warehouse fails atomically',()=>{
 const s=game();
 s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),
  built('F',G.BREAD_FACTORY_ID,2,'soma',{breadStock:2,breadProductionRound:1,breadProductionQuantity:2}),
  built('P','pub',0),built('W','warehouse',0)];
 const failures=[
  ship({source:'B',cargo:['Bread'],sources:['B']}),
  ship({source:'F',cargo:['Beer'],sources:['F']}),
  ship({source:'F',cargo:['Bread'],sources:['B']}),
  ship({source:'F',cargo:['Bread'],drops:[{kind:'warehouse',id:'W',routeIndex:0,materials:['Bread']}]}),
  ship({source:'F',cargo:['Contraband'],sources:['F']})
 ];
 for(const p of failures){const snap=JSON.stringify(s);assert.equal(G.executeDelivery(s,p).ok,false);assert.equal(JSON.stringify(s),snap);}
});

test('at year end leftover bread lowers Income permanently BEFORE payout, no recovery',()=>{
 const s=game(1),f=built('F',G.BREAD_FACTORY_ID,1,'soma',{breadStock:2,breadProductionRound:1,breadProductionQuantity:2});
 s.constructions=[f];
 assert.equal(G.roundIncome(s,1),4,'base 3 plus factory 1');
 const r=finishYear(s);
 assert.equal(r.ok,true,r.reason);
 assert.equal(s.players[1].breadIncomePenalty,2);
 assert.equal(s.players[1].capital,102,'4 gross minus 2 spoiled = $2 paid this year');
 assert.equal(f.breadStock,0);
 assert.equal(s.round,2);
 assert.deepEqual(s.pendingBreadProduction,['F']);
 assert.equal(s.phase,'bread-production');
 assert.equal(G.roundIncome(s,1),2);
 assert.equal(G.chooseBreadProduction(s,'F',2).ok,true);
 assert.equal(s.phase,'declare');
 assert.equal(G.roundIncome(s,1),2,'successful production alone cannot restore lost income');
});

test('settlement cannot be used twice to double-penalize a physical batch',()=>{
 const s=game(1),f=built('F',G.BREAD_FACTORY_ID,1,'soma',{breadStock:4,breadProductionRound:1,breadProductionQuantity:4});
 s.constructions=[f];
 const first=G.settleBreadSpoilage(s),again=G.settleBreadSpoilage(s);
 assert.equal(first.spoiled,4);assert.equal(again.alreadySettled,true);
 assert.equal(s.players[1].breadIncomePenalty,4);
 assert.equal(f.breadStock,0);
 assert.equal(G.roundIncome(s,1),0,'payout floor remains $0, never negative capital');
});

test('spoilage is still a permanent Income loss in the final 1905 year',()=>{
 const s=game(6),f=built('F',G.BREAD_FACTORY_ID,1,'soma',{breadStock:4,breadProductionRound:6,breadProductionQuantity:4});
 s.constructions=[f];
 const before=s.players[1].prestige;
 const r=finishYear(s);
 assert.equal(r.ok,true,r.reason);
 assert.equal(r.finished,true);
 assert.equal(s.players[1].breadIncomePenalty,4);
 assert.equal(f.breadStock,0);
 assert.equal(s.players[1].prestige,before,'no 1905 VP conversion');
 assert.equal(s.players[1].capital,100,'no income payout after 1905');
});

test('two independent bread factories each contribute unsold cubes to owner penalty',()=>{
 const s=game(2);
 s.constructions=[built('F1',G.BREAD_FACTORY_ID,1,'soma',{breadStock:1,breadProductionRound:2,breadProductionQuantity:2}),
  built('F2',G.BREAD_FACTORY_ID,1,'mission',{breadStock:3,breadProductionRound:2,breadProductionQuantity:4})];
 const r=G.settleBreadSpoilage(s);
 assert.equal(r.spoiled,4);
 assert.equal(s.players[1].breadIncomePenalty,4);
 assert.equal(s.constructions[0].breadStock,0);
 assert.equal(s.constructions[1].breadStock,0);
});
