import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function game(){
  const s=G.createInitialState({rng:()=>0.12});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
  s.constructions=[];return s;
}
function built(id,projectId,playerId=0,districtId='soma',extra={}){
  return {id,projectId,playerId,districtId,status:'complete',
    materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],
    startedRound:1,completedRound:1,...extra};
}
function ship({source='B',target='P',cargo=[G.BEER_CARGO],route=['soma'],
    sourceIds=cargo.map(()=>source),pickups=[],haulerId='standard'}={}){
  return {playerId:0,source:{kind:'goods',id:source},haulerId,cargo,pickups,route,
    drops:[{kind:'goods-sale',id:target,routeIndex:route.length-1,
      materials:pickups.flatMap(p=>p.cargo).concat(cargo).filter(x=>x===G.BEER_CARGO),
      goodsSourceIds:sourceIds}]};
}
test('brewery physical card and more expensive customs recipe',()=>{
  const b=G.projectById('brewery'),w=G.projectById('customs_warehouse');
  assert.deepEqual(b.types,['Промышленное','Торговое']);
  assert.equal(b.open,5);assert.equal(b.income,1);assert.equal(b.prestige,1);
  assert.deepEqual(b.risk,{earthquake:0,fire:2});
  assert.deepEqual(b.materials,['Lumber','Masonry','Steel']);
  assert.deepEqual(w.materials,['Lumber','Masonry','Masonry','Steel']);
  assert.equal(G.createProjectCardPool({rng:()=>0.2}).filter(c=>c.id==='brewery').length,2);
});
test('brewery supplies two pink cubes immediately and receives fixed yearly income',()=>{
  const s=game(),b=built('B','brewery',1,'soma',{status:'under-construction'});
  s.constructions.push(b);
  assert.equal(G.completeConstruction(s,b).ok,true);
  assert.deepEqual(G.beerInventory(b),['Beer','Beer']);
  assert.equal(s.players[1].prestige,1);
  assert.equal(G.buildingIncome(s,1),1);
  assert.equal(G.completeConstruction(s,b).ok,false,'cannot double complete');
});
test('physical beer delivery pays carrier, brewer and recipient separately',()=>{
  const s=game();s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),
    built('P','pub',2,'mission')];
  const p=ship({route:['soma','mission']});
  const check=G.validateDeliveryPlan(s,p);
  assert.equal(check.ok,true,check.reason);
  assert.equal(check.cost.total,4);
  const result=G.executeDelivery(s,p);
  assert.equal(result.ok,true,result.reason);
  assert.equal(s.players[0].capital,99,'carrier gets +3 minus $4');
  assert.equal(s.players[1].capital,101);
  assert.equal(s.players[2].capital,101);
  assert.equal(s.constructions[0].beerStock,1);
  assert.equal(s.players[0].suspicion,0);
  assert.equal(G.validateDeliveryPlan(s,p).reason,'delivery-once-per-activation');
});
test('two beers may travel together and same-owner roles stack without free freight',()=>{
  const s=game();s.constructions=[built('B','brewery',0,'soma',{beerStock:2}),
    built('P','club',0,'soma')];
  const p=ship({cargo:['Beer','Beer'],sourceIds:['B','B']});
  assert.equal(G.executeDelivery(s,p).ok,true);
  assert.equal(s.players[0].capital,107,'two x $5 minus standard $3 freight');
  assert.equal(s.constructions[0].beerStock,0);
  assert.equal(G.validateDeliveryPlan(s,p).ok,false);
});
test('mixed pickups preserve both breweries producer rewards and capacity',()=>{
  const s=game();s.constructions=[
    built('B','brewery',1,'soma',{beerStock:1}),
    built('B2','brewery',2,'soma',{beerStock:1}),
    built('P','pub',2,'mission')];
  const extra=[{source:{kind:'goods',id:'B2'},routeIndex:0,cargo:['Beer']}];
  const p=ship({route:['soma','mission'],pickups:extra,sourceIds:['B','B2']});
  const r=G.executeDelivery(s,p);
  assert.equal(r.ok,true,r.reason);
  assert.equal(r.cost.loadingCost,1);
  assert.equal(s.players[0].capital,101,'6 minus 5');
  assert.equal(s.players[1].capital,101);
  assert.equal(s.players[2].capital,103,'second brewery and pub both pay owner');
  assert.equal(s.constructions[0].beerStock,0);assert.equal(s.constructions[1].beerStock,0);
});
test('wrong beer origin, unfinished buyer, regular warehouse and unpaid route fail atomically',()=>{
  const s=game();s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),
    built('P','pub',2,'mission'),built('W','warehouse',0,'mission')];
  const p=ship({route:['soma','mission']});
  const failures=[
    {...p,drops:[{...p.drops[0],goodsSourceIds:['W']}]},
    {...p,drops:[{kind:'warehouse',id:'W',routeIndex:1,materials:['Beer']}]},
    {...p,route:['soma','park','mission']},
    {...p,drops:[{...p.drops[0],id:'W'}]}
  ];
  for(const failed of failures){const before=JSON.stringify(s);
    assert.equal(G.executeDelivery(s,failed).ok,false);
    assert.equal(JSON.stringify(s),before);
  }
  s.players[0].capital=0;const before=JSON.stringify(s);
  assert.equal(G.executeDelivery(s,p).reason,'capital');
  assert.equal(JSON.stringify(s),before);
});
test('brewery stock replenishes at start of next economic year',()=>{
  const s=game();s.constructions=[built('B','brewery',1,'soma',{beerStock:1})];
  s.round=1;s.developmentComplete=true;s.developmentPlayer=null;s.market=[];s.deck=[];
  s.newsLastResolvedRound=1;s.crimeAssessedRound=1;
  s.players.forEach(p=>{p.suspicion=0;p.workers.forEach(w=>w.used=true);});
  const r=G.cleanupMarket(s,{rng:()=>0.2});
  assert.equal(r.ok,true,r.reason);
  assert.equal(s.round,2);
  assert.equal(s.constructions[0].beerStock,2);
  assert.equal(JSON.parse(JSON.stringify(s)).constructions[0].beerStock,2);
});


test('four market buyers accept the same pink cargo with distinct yearly capacities',()=>{
  assert.deepEqual([...G.PINK_GOODS],['Beer']);
  assert.deepEqual({...G.GOODS_BUYER_CAPACITIES},{wholesale_market:3,shops:1,club:2,pub:2});
  for(const [id,capacity] of Object.entries(G.GOODS_BUYER_CAPACITIES)){
    const card=G.projectById(id);
    assert.match(card.effect,/розов/i);
    assert.match(card.actionText,/розовы/);
    const s=game(),buyer=built('T',id,2,'soma');
    s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),buyer];
    assert.equal(G.goodsBuyerCapacity(id),capacity);
    assert.equal(G.goodsBuyerUsed(s,buyer),0);
    assert.equal(G.goodsBuyerRemaining(s,buyer),capacity);
    const result=G.executeDelivery(s,ship({target:'T'}));
    assert.equal(result.ok,true,id+': '+result.reason);
    assert.equal(G.goodsBuyerUsed(s,buyer),1,id);
    assert.equal(G.goodsBuyerRemaining(s,buyer),capacity-1,id);
    assert.equal(s.players[0].capital,100,id+': carrier +3 minus 3');
    assert.equal(s.players[1].capital,101,id+': producer +1');
    assert.equal(s.players[2].capital,101,id+': buyer +1');
    assert.equal(JSON.parse(JSON.stringify(s)).constructions[1].goodsIntakeCount,1);
  }
  for(const id of ['hotel','commission_house','rare_goods_shop','warehouse']){
    assert.equal(G.goodsBuyerCapacity(id),0,id+' should not receive regular pink cargo');
  }
});

test('full one-slot shop rejects a second sale without taking money or stock',()=>{
  const s=game(),shop=built('T','shops',2,'soma');
  s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),shop];
  assert.equal(G.executeDelivery(s,ship({target:'T'})).ok,true);
  s.lastDeliveryKey=null; // A new worker activation permits another separate delivery.
  const plan=ship({target:'T'}),before=JSON.stringify(s);
  assert.equal(G.validateDeliveryPlan(s,plan).reason,'goods-buyer-capacity');
  assert.equal(G.executeDelivery(s,plan).reason,'goods-buyer-capacity');
  assert.equal(JSON.stringify(s),before,'failed delivery is atomic');
  assert.equal(s.constructions[0].beerStock,1);
});

test('market fills 3 slots across two breweries and preserves producer identity',()=>{
  const s=game();
  s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),
    built('B2','brewery',2,'soma',{beerStock:2}),
    built('T','wholesale_market',0,'soma')];
  const plan=ship({target:'T',cargo:['Beer','Beer'],
    pickups:[{source:{kind:'goods',id:'B2'},routeIndex:0,cargo:['Beer']}],
    sourceIds:['B','B','B2'],haulerId:'heavy4'});
  const check=G.validateDeliveryPlan(s,plan);
  assert.equal(check.ok,true,check.reason);
  const out=G.executeDelivery(s,plan);
  assert.equal(out.ok,true,out.reason);
  assert.equal(s.constructions[0].beerStock,0);
  assert.equal(s.constructions[1].beerStock,1);
  assert.equal(G.goodsBuyerUsed(s,s.constructions[2]),3);
  assert.equal(s.players[1].capital,102,'first producer gets 2');
  assert.equal(s.players[2].capital,101,'second producer gets 1');
  assert.equal(s.players[0].capital,109,'carrier gets 9 and buyer gets 3 minus $3 freight and loading');
  s.lastDeliveryKey=null;
  const rejected=ship({source:'B2',target:'T',sourceIds:['B2']});
  assert.equal(G.validateDeliveryPlan(s,rejected).reason,'goods-buyer-capacity');
});

test('two drops to the same target cannot bypass its capacity within one route',()=>{
  const s=game();
  s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),built('T','shops',2,'soma')];
  const plan=ship({target:'T',cargo:['Beer','Beer'],sourceIds:['B','B']});
  plan.drops=[
    {kind:'goods-sale',id:'T',routeIndex:0,materials:['Beer'],goodsSourceIds:['B']},
    {kind:'goods-sale',id:'T',routeIndex:0,materials:['Beer'],goodsSourceIds:['B']}
  ];
  const before=JSON.stringify(s);
  assert.equal(G.validateDeliveryPlan(s,plan).reason,'goods-buyer-capacity');
  assert.equal(G.executeDelivery(s,plan).reason,'goods-buyer-capacity');
  assert.equal(JSON.stringify(s),before);
});

test('buyer capacities are per physical building, across all producers, and refresh by year',()=>{
  const s=game();
  const one=built('P','pub',2,'soma');
  const two=built('P2','pub',1,'soma');
  s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),one,two];
  assert.equal(G.executeDelivery(s,ship({target:'P',cargo:['Beer','Beer'],sourceIds:['B','B']})).ok,true);
  assert.equal(G.goodsBuyerRemaining(s,one),0);
  assert.equal(G.goodsBuyerRemaining(s,two),2);
  s.round=1;s.developmentComplete=true;s.developmentPlayer=null;s.market=[];s.deck=[];
  s.newsLastResolvedRound=1;s.crimeAssessedRound=1;
  s.players.forEach(p=>{p.suspicion=0;p.workers.forEach(w=>w.used=true);});
  const result=G.cleanupMarket(s,{rng:()=>0.2});
  assert.equal(result.ok,true,result.reason);
  assert.equal(s.round,2);
  assert.equal(G.goodsBuyerUsed(s,one),0);
  assert.equal(G.goodsBuyerRemaining(s,one),2);
  assert.equal(one.goodsIntakeRound,1,'previous count preserved for audit but ignored in new year');
  assert.equal(one.goodsIntakeCount,2);
});

test('unfinished buyer, unauthorized products and old two-beer delivery restrictions remain enforced',()=>{
  const s=game();
  s.constructions=[built('B','brewery',1,'soma',{beerStock:2}),
    built('H','hotel',2,'soma'),
    built('C','commission_house',2,'soma'),
    built('S','shops',2,'soma',{status:'under-construction'})];
  for(const target of ['H','C','S']){
    const p=ship({target});
    const before=JSON.stringify(s);
    assert.equal(G.validateDeliveryPlan(s,p).reason,'goods-buyer');
    assert.equal(JSON.stringify(s),before);
  }
  assert.equal(G.executeDelivery(s,ship({target:'S'})).ok,false);
});
