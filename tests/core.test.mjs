import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function devState({rng=()=>0.1}={}){
  const s=G.createInitialState({rng});
  s.phase='development';
  s.view='city';
  s.developmentPlayer=0;
  s.developmentComplete=false;
  s.activationMainActionUsed=false;
  s.activeWorkerId=null;
  s.pendingWorkerAction=null;
  s.players.forEach(p=>{p.capital=100;});
  return s;
}
function construction(id,playerId,projectId,districtId,status='under-construction',materialsDelivered=[],warehouseInventory=[]){
  return {id,playerId,projectId,districtId,status,materialsDelivered:[...materialsDelivered],warehouseInventory:[...warehouseInventory],startedRound:1,completedRound:status==='complete'?1:null};
}

test('initial state is internally consistent',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  assert.equal(s.version,'0.44');
  assert.equal(s.players.length,3);
  assert.equal(s.market.length,5);
  assert.equal(s.starterDraftHands.length,3);
  assert.ok(s.starterDraftHands.every(h=>h.length===5));
  assert.equal(Object.values(s.logisticsSupply).flat().length,17);
  assert.equal(G.DELIVERY_HAULERS.filter(h=>h.limited).length,6);
  assert.equal(G.DELIVERY_HAULERS.find(h=>h.id==='standard').capacity,3);
  assert.equal(G.DELIVERY_HAULERS.find(h=>h.id==='standard').baseCost,3);
  assert.equal(G.LOGISTICS_NODES.find(n=>n.id==='pacificmail').kind,'rail-port');
  assert.equal(G.LOGISTICS_NODES.find(n=>n.id==='unioniron').kind,'industrial-rail-port');
});


test('Influence starts on unique 2/3/4 spaces and freezes annual order',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  assert.deepEqual([...s.players.map(p=>p.influence)].sort((a,b)=>a-b),[2,3,4]);
  assert.equal(new Set(s.players.map(p=>p.influence)).size,3);
  const frozen=[...G.turnOrder(s)];
  assert.equal(s.firstPlayer,frozen[0]);
  const last=frozen.at(-1);
  const before=s.players[last].influence;
  const move=G.moveInfluence(s,last,1);
  assert.equal(move.ok,true);
  assert.ok(s.players[last].influence>before);
  assert.deepEqual(G.turnOrder(s),frozen,'mid-year Influence must not reorder the year');
});

test('Influence skips occupied spaces both forward and backward',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  s.players[0].influence=2;
  s.players[1].influence=3;
  s.players[2].influence=4;
  s.yearTurnOrder=[2,1,0];
  s.firstPlayer=2;
  const up=G.moveInfluence(s,0,1);
  assert.deepEqual({from:up.from,to:up.to,steps:up.steps},{from:2,to:5,steps:1});
  const down=G.moveInfluence(s,0,-1);
  assert.deepEqual({from:down.from,to:down.to,steps:down.steps},{from:5,to:2,steps:-1});
  assert.deepEqual(G.turnOrder(s),[2,1,0]);
  assert.deepEqual(G.setYearTurnOrderFromInfluence(s),[2,1,0]);
});


test('v0.44 City Hall goal catalog and all five requirement evaluators work',()=>{
  assert.deepEqual(G.CITY_GOALS.map(g=>g.id),['C01','C02','C03','C04','C05']);
  const s=devState();
  s.constructions=[
    construction('W1',0,'tenement','outerrichmond','complete'),
    construction('W2',0,'luxury','innersunset','complete'),
    construction('B1',0,'bank','financial','complete'),
    construction('B2',0,'bureau','civic','complete'),
    construction('I1',0,'factory','soma','complete'),
    construction('T1',0,'warehouse','soma','complete'),
    construction('P1',0,'firehouse','civic','complete'),
    construction('P2',0,'clinic','western','complete'),
    construction('M1',0,'tenement','missionbay','complete'),
    construction('M2',0,'bank','missionbay','complete'),
    construction('M3',0,'warehouse','missionbay','complete')
  ];
  for(const id of ['C01','C02','C03','C04','C05']){
    const e=G.cityGoalEvaluation(s,0,id);
    assert.equal(e.complete,true,id);
    assert.equal(e.progress,G.cityGoalTarget(id),id);
  }
});

test('City Hall player can take at most one goal without ending project declaration',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='declare';s.declarationIndex=0;
  const pid=G.currentDeclarer(s);
  const r=G.claimCityGoal(s,0);
  assert.equal(r.ok,true);
  assert.equal(G.currentDeclarer(s),pid,'taking a goal must not advance declaration');
  assert.equal(s.players[pid].goals.length,1);
  assert.equal(s.goalMarket[0],null);
  assert.equal(G.claimCityGoal(s,1).reason,'already-taken');
  assert.equal(G.passDeclaration(s).ok,true);
  assert.notEqual(G.currentDeclarer(s),pid);
});

test('goal completed with old buildings reports only in a later City Hall and records retroactive use',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  const p=s.players[0];
  p.capital=10;p.prestige=0;
  s.constructions=[
    construction('OLD1',0,'tenement','outerrichmond','complete'),
    construction('OLD2',0,'luxury','innersunset','complete')
  ];
  p.goals=[{uid:'X',id:'C01',status:'active',acquiredRound:1,preExistingConstructionIds:['OLD1','OLD2']}];
  s.round=1;
  assert.equal(G.reportCompletedCityGoals(s).length,0,'same City Hall cannot report newly acquired goal');
  s.round=2;
  const reports=G.reportCompletedCityGoals(s);
  assert.equal(reports.length,1);
  assert.equal(reports[0].retroactiveCount,2);
  assert.equal(p.capital,14);
  assert.equal(p.prestige,4);
  assert.equal(p.goals[0].status,'completed');
});

test('C04 report moves Influence before next-year order is recalculated',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  s.players[0].influence=2;s.players[1].influence=3;s.players[2].influence=4;
  s.yearTurnOrder=[2,1,0];s.firstPlayer=2;
  s.constructions=[
    construction('CIV1',0,'firehouse','civic','complete'),
    construction('CIV2',0,'clinic','western','complete')
  ];
  s.players[0].goals=[{uid:'C04X',id:'C04',status:'active',acquiredRound:1,preExistingConstructionIds:[]}];
  s.round=2;
  const before=G.turnOrder(s);
  const reports=G.reportCompletedCityGoals(s);
  assert.equal(reports.length,1);
  assert.equal(s.players[0].influence,5,'+1 skips occupied 3 and 4');
  assert.deepEqual(G.turnOrder(s),before,'current stored order stays frozen until recalculation');
  assert.deepEqual(G.setYearTurnOrderFromInfluence(s),[0,2,1]);
});

test('goal market refresh keeps leftovers after three claims but flushes them after fewer claims',()=>{
  const keep=G.createInitialState({rng:()=>0.1});
  const beforeKeep=keep.goalMarket.map(x=>x?.uid);
  keep.goalMarket[0]=null;keep.goalMarket[1]=null;keep.goalMarket[2]=null;
  keep.goalSessionClaims=[{},{},{}];
  const kr=G.refreshCityGoalMarket(keep,{rng:()=>0.2});
  assert.equal(kr.claims,3);
  assert.equal(keep.goalMarket.length,5);
  assert.equal(keep.goalMarket[3]?.uid,beforeKeep[3]);
  assert.equal(keep.goalMarket[4]?.uid,beforeKeep[4]);
  assert.equal(new Set(keep.goalMarket.filter(Boolean).map(x=>x.id)).size,5,'no duplicate goal types in one market');

  const flush=G.createInitialState({rng:()=>0.1});
  const old=new Set(flush.goalMarket.filter(Boolean).map(x=>x.uid));
  flush.goalMarket[0]=null;flush.goalSessionClaims=[{}];
  const fr=G.refreshCityGoalMarket(flush,{rng:()=>0.2});
  assert.equal(fr.claims,1);
  assert.equal(flush.goalMarket.filter(Boolean).length,5);
  assert.ok(flush.goalMarket.filter(Boolean).every(x=>!old.has(x.uid)),'remaining old market is discarded after weak demand');
  assert.equal(new Set(flush.goalMarket.filter(Boolean).map(x=>x.id)).size,5);
});

test('final Phase I goal check rewards completed goals and penalizes only incomplete goals',()=>{
  const s=G.createInitialState({rng:()=>0.1});
  s.round=6;s.phase='development';s.developmentComplete=true;
  s.newsCurrentIds=['E05'];s.newsLastResolvedRound=5;
  s.players[0].prestige=10;
  s.constructions=[
    construction('B1',0,'bank','financial','complete'),
    construction('B2',0,'bureau','civic','complete')
  ];
  s.players[0].goals=[
    {uid:'DONE',id:'C02',status:'active',acquiredRound:5,preExistingConstructionIds:[]},
    {uid:'FAIL',id:'C05',status:'active',acquiredRound:5,preExistingConstructionIds:[]}
  ];
  const r=G.cleanupMarket(s,{rng:()=>0.9});
  assert.equal(r.ok,true);assert.equal(r.finished,true);
  assert.equal(s.players[0].goals.find(g=>g.uid==='DONE').status,'completed');
  assert.equal(s.players[0].goals.find(g=>g.uid==='FAIL').status,'failed');
  assert.equal(s.players[0].prestige,9,'10 +4 VP for C02 −5 VP for failed C05');
});
test('district adjacency is symmetric and references valid districts',()=>{
  const ids=new Set(G.DISTRICTS.map(d=>d.id));
  for(const [id,neighbors] of Object.entries(G.DISTRICT_ADJACENCY)){
    assert.ok(ids.has(id),id);
    for(const n of neighbors){
      assert.ok(ids.has(n),`${id} -> ${n}`);
      assert.ok(G.DISTRICT_ADJACENCY[n]?.includes(id),`asymmetric: ${id} -> ${n}`);
    }
  }
});

test('worker movement allows Golden Gate Park but blocks Presidio and Twin Peaks',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];
  w.districtId='western';
  assert.equal(G.selectWorker(s,0,w.id).ok,true);
  assert.equal(G.workerCanReachDistrict(s,0,'park',w.id),true);
  assert.equal(G.workerCanReachDistrict(s,0,'presidio',w.id),false);
  w.districtId='innersunset';
  assert.equal(G.workerCanReachDistrict(s,0,'twinpeaks',w.id),false);
});

test('Market Street connects its five districts for representative actions without changing freight adjacency',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];
  w.districtId='noe';
  assert.deepEqual(G.MARKET_STREET_DISTRICTS,['noe','mission','civic','soma','financial']);
  assert.equal(G.workerCanReachDistrict(s,0,'financial',w.id),true);
  assert.equal(G.workerCanReachDistrict(s,0,'civic',w.id),true);
  assert.equal(G.workerCanReachDistrict(s,0,'northbeach',w.id),false);
  assert.ok(G.workerReachableDistricts(s,0,w.id).includes('soma'));
  assert.equal(G.deliveryNeighbors('noe').includes('financial'),false);
});

test('v0.43A exposes canonical building types and historical ground classes',()=>{
  assert.deepEqual(G.projectTypes('tenement'),['Жилое']);
  assert.deepEqual(G.projectTypes('club'),['Бизнес','Торговое']);
  assert.deepEqual(G.projectTypes('factory'),['Промышленное']);
  assert.deepEqual(G.projectTypes('firehouse'),['Общественное']);
  assert.equal(G.districtById('marina').earthquakeBase,2);
  assert.deepEqual(G.POOR_GROUND_DISTRICTS,['marina','financial','soma','mission','missionbay']);
  assert.deepEqual(G.STABLE_GROUND_DISTRICTS,['pacific','chinatown']);
  assert.equal(G.districtSoilClass('pacific'),'stable');
  assert.equal(G.districtSoilClass('western'),'normal');
});

test('starter draft completes for all players and transitions to declarations',()=>{
  const s=G.createInitialState({rng:()=>0.2});
  for(let pid=0;pid<3;pid++){
    assert.equal(G.currentDraftPlayer(s),pid);
    assert.equal(G.revealStarterDraft(s).ok,true);
    const hand=s.starterDraftHands[pid];
    assert.equal(G.toggleStarterDraftCard(s,hand[0].uid).ok,true);
    assert.equal(G.toggleStarterDraftCard(s,hand[1].uid).ok,true);
    const r=G.confirmStarterDraft(s);
    assert.equal(r.ok,true);
    assert.equal(s.players[pid].portfolio.length,2);
  }
  assert.equal(s.phase,'declare');
  assert.equal(s.starterDiscards.length,9);
});

test('tender tie uses Influence then earlier declaration',()=>{
  const s=G.createInitialState({rng:()=>0.3});
  s.phase='ready';
  const m=s.market[0];
  m.claims=[{player:0,order:1},{player:1,order:0}];
  m.bids={0:5,1:5};
  s.players[0].influence=3;
  s.players[1].influence=2;
  s.players[0].capital=20;
  s.players[1].capital=20;
  assert.equal(G.resolveTenders(s).ok,true);
  assert.equal(m.result.player,0);
  assert.equal(m.result.price,5);

  const s2=G.createInitialState({rng:()=>0.31});
  s2.phase='ready';
  const m2=s2.market[0];
  m2.claims=[{player:0,order:1},{player:1,order:0}];
  m2.bids={0:5,1:5};
  s2.players[0].influence=2;
  s2.players[1].influence=2;
  s2.players[0].capital=20;
  s2.players[1].capital=20;
  G.resolveTenders(s2);
  assert.equal(m2.result.player,1);
});

test('Warehouse recipe is exactly Lumber + Masonry + Steel',()=>{
  assert.deepEqual(G.projectById('warehouse').materials,['Lumber','Masonry','Steel']);
  assert.equal(G.CONSTRUCTION_STAGING_CAPACITY,3);
  assert.equal(G.WAREHOUSE_STORAGE_CAPACITY,5);
});

test('4+ resource construction can begin without a Warehouse',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];w.districtId='soma';
  G.selectWorker(s,0,w.id);
  s.players[0].portfolio=['factory'];
  const e=G.constructionEligibility(s,0,'factory','soma');
  assert.equal(e.ok,true,e.reasons.join(' | '));
  assert.equal(e.reasons.some(x=>x.includes('Warehouse')),false);
});

test('final Delivery may exceed staging 3 only when it completes the project exactly',()=>{
  const s=devState();
  s.logisticsSupply.pacificmail=['Steel','Steel'];
  s.constructions=[construction('F1',0,'factory','soma','under-construction',['Lumber','Masonry','Masonry'])];
  const finalPlan={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',cargo:['Steel','Steel'],route:['soma'],drops:[{kind:'construction',id:'F1',materials:['Steel','Steel']}]};
  const valid=G.validateDeliveryPlan(s,finalPlan);
  assert.equal(valid.ok,true,JSON.stringify(valid));
  assert.equal(G.executeDelivery(s,finalPlan).ok,true);
  assert.equal(s.constructions[0].status,'complete');

  const s2=devState();
  s2.logisticsSupply.pacificmail=['Steel'];
  s2.constructions=[construction('F2',0,'factory','soma','under-construction',['Lumber','Masonry','Masonry'])];
  const partial={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',cargo:['Steel'],route:['soma'],drops:[{kind:'construction',id:'F2',materials:['Steel']}]};
  const invalid=G.validateDeliveryPlan(s2,partial);
  assert.equal(invalid.ok,false);
  assert.equal(invalid.reason,'target-capacity');
});

test('same-district Delivery is valid and has zero road cost',()=>{
  const s=devState();
  s.logisticsSupply.pacificmail=['Masonry','Steel'];
  s.constructions=[construction('C1',0,'insurance','soma')];
  const plan={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',cargo:['Masonry','Steel'],route:['soma'],drops:[{kind:'construction',id:'C1',materials:['Masonry','Steel']}]};
  const v=G.validateDeliveryPlan(s,plan);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.routeCost,0);
  assert.equal(v.cost.materialCost,3);
  assert.equal(v.cost.haulerCost,0);
  assert.equal(v.cost.total,3);
  const r=G.executeDelivery(s,plan);
  assert.equal(r.ok,true);
  assert.deepEqual(s.constructions[0].materialsDelivered,['Masonry','Steel']);
});


test('historical neutral suppliers are unlimited expensive Delivery sources',()=>{
  assert.deepEqual(
    G.NEUTRAL_MATERIAL_SUPPLIERS.map(x=>[x.name,x.districtId,x.resource,x.unitPrice]),
    [
      ['Gray Brothers Quarry','noe','Masonry',3],
      ['Engle & Son Lumber Yard','marina','Lumber',3],
      ['Axford Bros. Iron Foundry','mission','Steel',5]
    ]
  );
  const s=devState();
  s.players[0].capital=20;
  s.procurementRemaining=2;
  s.constructions=[construction('I1',0,'insurance','mission')];

  const source=G.deliverySourceInfo(s,0,{kind:'supplier',id:'gray-quarry'});
  assert.equal(source.unlimited,true);
  assert.ok(source.inventory.every(x=>x==='Masonry'));
  assert.equal(source.unitPrice,3);

  const first={playerId:0,source:{kind:'supplier',id:'gray-quarry'},haulerId:'dray2a',cargo:['Masonry'],route:['noe','mission'],drops:[{kind:'construction',id:'I1',materials:['Masonry']}]};
  let v=G.validateDeliveryPlan(s,first);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.materialCost,3);
  assert.equal(v.cost.procurementDiscount,0);
  assert.equal(v.cost.routeCost,1);
  assert.equal(v.cost.total,4);
  assert.equal(G.executeDelivery(s,first).ok,true);
  assert.equal(s.procurementRemaining,2,'Shopping Row discount must not apply to neutral suppliers');

  const second={...first,haulerId:'dray2b'};
  v=G.validateDeliveryPlan(s,second);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(G.executeDelivery(s,second).ok,true);
  assert.deepEqual(s.constructions[0].materialsDelivered,['Masonry','Masonry']);
  assert.equal(s.players[0].capital,12);
  assert.equal(G.deliverySourceInfo(s,0,{kind:'supplier',id:'gray-quarry'}).inventory.length,5,'supplier stock never depletes');
});

test('neutral supplier only offers its own material at its fixed premium',()=>{
  const s=devState();
  const lumber=G.deliverySourceInfo(s,0,{kind:'supplier',id:'engle-lumber'});
  const steel=G.deliverySourceInfo(s,0,{kind:'supplier',id:'axford-iron'});
  assert.deepEqual(new Set(lumber.inventory),new Set(['Lumber']));
  assert.deepEqual(new Set(steel.inventory),new Set(['Steel']));
  assert.equal(G.deliveryMaterialCost(s,{kind:'supplier',id:'engle-lumber'},['Lumber','Lumber']).cost,6);
  assert.equal(G.deliveryMaterialCost(s,{kind:'supplier',id:'axford-iron'},['Steel','Steel']).cost,10);
});

test('multi-drop route charges each crossed border once and preserves cargo multiset',()=>{
  const s=devState();
  s.logisticsSupply.broadway=['Lumber','Lumber'];
  s.constructions=[
    construction('C1',0,'tenement','pacific'),
    construction('C2',0,'tenement','western')
  ];
  const plan={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'dray2a',cargo:['Lumber','Lumber'],route:['northbeach','pacific','western'],drops:[
    {kind:'construction',id:'C1',materials:['Lumber']},
    {kind:'construction',id:'C2',materials:['Lumber']}
  ]};
  const v=G.validateDeliveryPlan(s,plan);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.routeCost,2);
  const r=G.executeDelivery(s,plan);
  assert.equal(r.ok,true);
  assert.equal(s.constructions[0].materialsDelivered.length,1);
  assert.equal(s.constructions[1].materialsDelivered.length,1);
});

test('Delivery rejects forbidden routes, opponent targets, off-route targets, overflow and wrong materials',()=>{
  const s=devState();
  s.logisticsSupply.broadway=['Lumber','Masonry','Steel','Lumber'];
  s.constructions=[
    construction('OWN',0,'warehouse','northbeach'),
    construction('OPP',1,'warehouse','northbeach'),
    construction('FAR',0,'tenement','western')
  ];
  const base={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'standard'};
  let v=G.validateDeliveryPlan(s,{...base,cargo:['Lumber'],route:['northbeach','pacific','western','park'],drops:[{kind:'construction',id:'FAR',materials:['Lumber']}]});
  assert.equal(v.reason,'route');
  v=G.validateDeliveryPlan(s,{...base,cargo:['Lumber'],route:['northbeach'],drops:[{kind:'construction',id:'OPP',materials:['Lumber']}]});
  assert.equal(v.reason,'target');
  v=G.validateDeliveryPlan(s,{...base,cargo:['Lumber'],route:['northbeach'],drops:[{kind:'construction',id:'FAR',materials:['Lumber']}]});
  assert.equal(v.reason,'target-route');
  v=G.validateDeliveryPlan(s,{...base,cargo:['Lumber','Lumber'],route:['northbeach'],drops:[{kind:'construction',id:'OWN',materials:['Lumber','Lumber']}]});
  assert.equal(v.reason,'target-material');
});

test('limited haulers are shared once per round; Standard Hauler is reusable',()=>{
  const s=devState();
  s.logisticsSupply.broadway=['Lumber','Lumber','Lumber'];
  s.constructions=[
    construction('C1',0,'tenement','northbeach'),
    construction('C2',0,'tenement','northbeach')
  ];
  const limited={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'dray2a',cargo:['Lumber'],route:['northbeach'],drops:[{kind:'construction',id:'C1',materials:['Lumber']}]};
  assert.equal(G.executeDelivery(s,limited).ok,true);
  assert.equal(G.validateDeliveryPlan(s,limited).reason,'hauler-used');

  const standard1={...limited,haulerId:'standard',drops:[{kind:'construction',id:'C2',materials:['Lumber']}]};
  assert.equal(G.executeDelivery(s,standard1).ok,true);
  const standard2={...limited,haulerId:'standard',drops:[{kind:'construction',id:'C1',materials:['Lumber']}]};
  assert.equal(G.validateDeliveryPlan(s,standard2).ok,true);
  assert.equal(G.executeDelivery(s,standard2).ok,true);
});


test('Public Freight Yard has private 2-slot sections and charges $2 only when an empty section is occupied',()=>{
  const s=devState();
  assert.equal(G.FREIGHT_YARD.districtId,'western');
  assert.equal(G.FREIGHT_YARD.capacityPerPlayer,2);
  assert.equal(G.FREIGHT_YARD.rentCost,2);
  assert.deepEqual(G.freightYardInventory(s,0),[]);
  assert.deepEqual(G.freightYardInventory(s,1),[]);

  s.logisticsSupply.broadway=['Lumber','Masonry','Steel'];
  const first={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'dray2a',cargo:['Lumber'],route:['northbeach','pacific','western'],drops:[{kind:'freight-yard',id:'freightyard',materials:['Lumber']}]};
  let v=G.validateDeliveryPlan(s,first);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.materialCost,1);
  assert.equal(v.cost.routeCost,2);
  assert.equal(v.cost.yardRentCost,2);
  assert.equal(v.cost.total,5);
  assert.equal(G.executeDelivery(s,first).ok,true);
  assert.deepEqual(G.freightYardInventory(s,0),['Lumber']);
  assert.deepEqual(G.freightYardInventory(s,1),[]);

  const second={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'dray2b',cargo:['Masonry'],route:['northbeach','pacific','western'],drops:[{kind:'freight-yard',id:'freightyard',materials:['Masonry']}]};
  v=G.validateDeliveryPlan(s,second);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.yardRentCost,0);
  assert.equal(v.cost.total,3);
  assert.equal(G.executeDelivery(s,second).ok,true);
  assert.deepEqual(G.freightYardInventory(s,0),['Lumber','Masonry']);

  const overflow={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:['Steel'],route:['northbeach','pacific','western'],drops:[{kind:'freight-yard',id:'freightyard',materials:['Steel']}]};
  assert.equal(G.validateDeliveryPlan(s,overflow).reason,'target-capacity');
});

test('Freight Yard is a paid-storage source; emptying it resets the next $2 occupancy fee',()=>{
  const s=devState();
  s.freightYardInventories=[['Lumber','Masonry'],[],[]];
  s.constructions=[
    construction('C1',0,'tenement','western'),
    construction('C2',0,'shops','western')
  ];
  const first={playerId:0,source:{kind:'freight-yard',id:'freightyard'},haulerId:'standard',cargo:['Lumber'],route:['western'],drops:[{kind:'construction',id:'C1',materials:['Lumber']}]};
  let v=G.validateDeliveryPlan(s,first);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.materialCost,0);
  assert.equal(v.cost.yardRentCost,0);
  assert.equal(G.executeDelivery(s,first).ok,true);

  const second={playerId:0,source:{kind:'freight-yard',id:'freightyard'},haulerId:'standard',cargo:['Masonry'],route:['western'],drops:[{kind:'construction',id:'C2',materials:['Masonry']}]};
  assert.equal(G.executeDelivery(s,second).ok,true);
  assert.deepEqual(G.freightYardInventory(s,0),[]);

  s.logisticsSupply.broadway=['Lumber'];
  const reoccupy={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:['Lumber'],route:['northbeach','pacific','western'],drops:[{kind:'freight-yard',id:'freightyard',materials:['Lumber']}]};
  v=G.validateDeliveryPlan(s,reoccupy);
  assert.equal(v.ok,true,JSON.stringify(v));
  assert.equal(v.cost.yardRentCost,2);
});

test('Warehouse stores max 5 and can supply missing resources in same district',()=>{
  const s=devState();
  s.constructions=[
    construction('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Steel','Steel']),
    construction('F1',0,'factory','soma','under-construction',['Lumber','Masonry','Masonry'])
  ];
  const c=G.canCompleteConstruction(s,'F1');
  assert.equal(c.ok,true);
  assert.equal(c.warehouseUse,2);
  const r=G.completeConstructionFromStorage(s,'F1');
  assert.equal(r.ok,true);
  assert.equal(s.constructions[1].status,'complete');
  assert.deepEqual(G.warehouseInventory(s.constructions[0]),[]);

  const s2=devState();
  s2.constructions=[construction('W2',0,'warehouse','northbeach','complete',['Lumber','Masonry','Steel'],['Lumber','Lumber','Masonry','Masonry','Steel'])];
  s2.logisticsSupply.broadway=['Lumber'];
  const v=G.validateDeliveryPlan(s2,{playerId:0,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:['Lumber'],route:['northbeach'],drops:[{kind:'warehouse',id:'W2',materials:['Lumber']}]});
  assert.equal(v.reason,'target-capacity');
});

test('Procurement discounts the two most expensive purchased materials and is consumed',()=>{
  const s=devState();
  s.procurementRemaining=2;
  s.logisticsSupply.broadway=['Steel','Masonry','Lumber'];
  s.constructions=[construction('C1',0,'warehouse','northbeach')];
  const plan={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'wagon3a',cargo:['Steel','Masonry','Lumber'],route:['northbeach'],drops:[{kind:'construction',id:'C1',materials:['Steel','Masonry','Lumber']}]};
  const v=G.validateDeliveryPlan(s,plan);
  assert.equal(v.ok,true);
  assert.equal(v.cost.materialGross,4);
  assert.equal(v.cost.procurementDiscount,3);
  assert.equal(v.cost.materialCost,1);
  assert.equal(G.executeDelivery(s,plan).ok,true);
  assert.equal(s.procurementRemaining,0);
});

test('invalid Delivery does not mutate state',()=>{
  const s=devState();
  s.players[0].capital=0;
  s.logisticsSupply.broadway=['Steel'];
  s.constructions=[construction('C1',0,'warehouse','northbeach')];
  const plan={playerId:0,source:{kind:'node',id:'broadway'},haulerId:'standard',cargo:['Steel'],route:['northbeach'],drops:[{kind:'construction',id:'C1',materials:['Steel']}]};
  const before=JSON.stringify(s);
  const r=G.executeDelivery(s,plan);
  assert.equal(r.ok,false);
  assert.equal(r.reason,'capital');
  assert.equal(JSON.stringify(s),before);
});

test('round cleanup refreshes city supply and haulers but preserves staged and Warehouse resources',()=>{
  const s=devState();
  s.developmentComplete=true;
  s.haulersUsed=['dray2a','freight5'];
  s.freightYardInventories=[['Masonry'],[],[]];
  s.constructions=[
    construction('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Steel','Lumber']),
    construction('C1',0,'insurance','soma','under-construction',['Masonry'])
  ];
  const r=G.cleanupMarket(s,{rng:()=>0.99});
  assert.equal(r.ok,true);
  assert.deepEqual(s.haulersUsed,[]);
  assert.ok(Object.values(s.logisticsSupply).flat().every(x=>x==='Steel'));
  assert.deepEqual(G.warehouseInventory(s.constructions[0]),['Steel','Lumber']);
  assert.deepEqual(G.freightYardInventory(s,0),['Masonry']);
  assert.deepEqual(s.constructions[1].materialsDelivered,['Masonry']);
  assert.equal(s.firstPlayer,1);
  assert.ok(s.players.every(p=>p.workersLeft===3));
});


test('year transition pays income first, then $1 upkeep per unfinished construction',()=>{
  const s=devState();
  s.developmentComplete=true;
  s.newsCurrentIds=['E05'];
  s.newsLastResolvedRound=0;
  s.players[0].capital=0;
  s.constructions=[
    construction('C1',0,'tenement','civic','under-construction',['Lumber']),
    construction('C2',0,'warehouse','civic','under-construction',[])
  ];
  assert.equal(G.constructionUpkeepDue(s,0),2);
  const r=G.cleanupMarket(s,{rng:()=>0.99});
  assert.equal(r.ok,true);
  assert.equal(s.round,2);
  assert.equal(s.phase,'declare');
  assert.equal(s.players[0].capital,1,'base income 3 then upkeep 2');
  assert.equal(G.constructionUpkeepDue(s,0),2);
});

test('insufficient upkeep pauses after income and player closure frees the site and loses staged materials',()=>{
  const s=devState();
  s.developmentComplete=true;
  s.newsCurrentIds=['E05'];
  s.newsLastResolvedRound=0;
  s.players[0].capital=0;
  s.yearTurnOrder=[0,1,2];
  s.firstPlayer=0;
  s.constructions=[
    construction('C1',0,'tenement','civic','under-construction',['Lumber']),
    construction('C2',0,'warehouse','civic'),
    construction('C3',0,'insurance','civic'),
    construction('C4',0,'bureau','civic')
  ];
  const r=G.cleanupMarket(s,{rng:()=>0.99});
  assert.equal(r.ok,false);
  assert.equal(r.reason,'upkeep-choice');
  assert.equal(s.phase,'upkeep');
  assert.equal(s.players[0].capital,3,'income is credited before upkeep choice');
  assert.equal(r.due,4);
  const portfolioBefore=[...s.players[0].portfolio];
  const sitesBefore=G.districtConstructionCount(s,'civic');
  const close=G.closeConstructionForUpkeep(s,0,'C1',{rng:()=>0.99});
  assert.equal(close.ok,true);
  assert.equal(s.round,2);
  assert.equal(s.phase,'declare');
  assert.equal(s.players[0].capital,0,'remaining 3 unfinished projects cost $3');
  const closed=s.constructions.find(c=>c.id==='C1');
  assert.equal(closed.status,'abandoned');
  assert.deepEqual(closed.lostMaterials,['Lumber']);
  assert.deepEqual(closed.materialsDelivered,[]);
  assert.equal(G.districtConstructionCount(s,'civic'),sitesBefore-1);
  assert.deepEqual(s.players[0].portfolio,portfolioBefore,'closed project never returns to hand');
});

test('upkeep can require several closures before the remaining sites are affordable',()=>{
  const s=devState();
  s.developmentComplete=true;
  s.newsCurrentIds=['E05'];
  s.newsLastResolvedRound=0;
  s.players[0].capital=0;
  s.yearTurnOrder=[0,1,2];
  s.firstPlayer=0;
  const districts=['civic','western','mission','soma','financial','pacific'];
  s.constructions=districts.map((district,i)=>construction('X'+i,0,'bureau',district));
  let r=G.cleanupMarket(s,{rng:()=>0.99});
  assert.equal(r.reason,'upkeep-choice');
  assert.equal(s.players[0].capital,3);
  r=G.closeConstructionForUpkeep(s,0,'X0',{rng:()=>0.99});
  assert.equal(r.reason,'upkeep-choice');
  r=G.closeConstructionForUpkeep(s,0,'X1',{rng:()=>0.99});
  assert.equal(r.reason,'upkeep-choice');
  r=G.closeConstructionForUpkeep(s,0,'X2',{rng:()=>0.99});
  assert.equal(r.ok,true);
  assert.equal(s.players[0].capital,0);
  assert.equal(s.constructions.filter(c=>c.status==='abandoned').length,3);
  assert.equal(G.unfinishedConstructions(s,0).length,3);
});

test('one player can start multiple constructions in the same year using separate representatives',()=>{
  const s=devState();
  s.yearTurnOrder=[0,1,2];s.firstPlayer=0;s.developmentPlayer=0;
  s.players[0].portfolio=['tenement','warehouse'];
  let w=G.playerWorkers(s,0)[0];w.districtId='civic';
  assert.equal(G.selectWorker(s,0,w.id).ok,true);
  assert.equal(G.beginConstruction(s,0,'tenement','civic').ok,true);
  assert.equal(G.endActivation(s,0).nextPlayer,1);
  for(const pid of [1,2]){
    const other=G.playerWorkers(s,pid)[0];other.districtId='civic';
    assert.equal(G.selectWorker(s,pid,other.id).ok,true);
    assert.equal(G.raiseCapital(s,pid,'civic').ok,true);
    assert.equal(G.endActivation(s,pid).ok,true);
  }
  assert.equal(G.currentDeveloper(s),0);
  w=G.playerWorkers(s,0).find(x=>!x.used);w.districtId='civic';
  assert.equal(G.selectWorker(s,0,w.id).ok,true);
  const second=G.beginConstruction(s,0,'warehouse','civic');
  assert.equal(second.ok,true);
  assert.equal(s.round,1);
  assert.equal(G.unfinishedConstructions(s,0).length,2);
});

test('next year recomputes order from current Influence only after upkeep is resolved',()=>{
  const s=devState();
  s.developmentComplete=true;
  s.newsCurrentIds=['E05'];
  s.newsLastResolvedRound=0;
  s.players[0].influence=5;s.players[1].influence=4;s.players[2].influence=3;
  s.yearTurnOrder=[2,1,0];s.firstPlayer=2;
  assert.deepEqual(G.turnOrder(s),[2,1,0]);
  const r=G.cleanupMarket(s,{rng:()=>0.99});
  assert.equal(r.ok,true);
  assert.deepEqual(G.turnOrder(s),[0,1,2]);
  assert.equal(s.firstPlayer,0);
});

test('Bank loan action occupies the bank and repayment requires an Income phase',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];
  w.districtId='civic';
  G.selectWorker(s,0,w.id);
  s.constructions=[construction('B1',1,'bank','civic','complete',['Masonry','Masonry','Steel','Steel'])];
  const beforeOwnerInf=s.players[1].influence;
  const r=G.takeBankLoan(s,0,'B1');
  assert.equal(r.ok,true);
  assert.equal(r.received,6);
  assert.equal(s.players[0].loans.length,1);
  assert.equal(s.players[1].influence,beforeOwnerInf+1);
  assert.equal(G.repayLoan(s,0).reason,'not-seasoned');
});

test('Fire House and Clinic service reach own and adjacent districts without a Street Network gate',()=>{
  const s=devState();
  s.constructions=[
    construction('FIRE',0,'firehouse','civic','complete',['Lumber','Masonry','Steel']),
    construction('CLINIC',0,'clinic','civic','complete',['Lumber','Masonry','Masonry'])
  ];
  const civic=G.districtAccess(s,'civic');
  const pacific=G.districtAccess(s,'pacific');
  const outer=G.districtAccess(s,'outerrichmond');
  assert.equal(civic.fire,true);
  assert.equal(civic.clinic,true);
  assert.equal(pacific.fire,true);
  assert.equal(pacific.clinic,true);
  assert.equal(outer.fire,false);
  assert.equal(outer.clinic,false);
});


test('complete six-year Phase I lifecycle reaches finished state with workers resetting between years',()=>{
  const s=G.createInitialState({rng:()=>0.42});
  for(let pid=0;pid<3;pid++){
    G.revealStarterDraft(s);
    const hand=s.starterDraftHands[pid];
    G.toggleStarterDraftCard(s,hand[0].uid);
    G.toggleStarterDraftCard(s,hand[1].uid);
    assert.equal(G.confirmStarterDraft(s).ok,true);
  }

  for(let round=1;round<=6;round++){
    assert.equal(s.phase,'declare');
    for(let i=0;i<3;i++)assert.equal(G.passDeclaration(s).ok,true);
    assert.equal(G.beginBidding(s).ok,true);
    assert.equal(s.phase,'ready');
    assert.equal(G.resolveTenders(s).ok,true);
    assert.equal(s.phase,'development');

    let activations=0;
    while(!s.developmentComplete){
      const pid=G.currentDeveloper(s);
      const worker=G.playerWorkers(s,pid).find(w=>!w.used);
      assert.ok(worker,`round ${round}, player ${pid}`);
      assert.equal(G.selectWorker(s,pid,worker.id).ok,true);
      assert.equal(G.raiseCapital(s,pid,worker.districtId).ok,true);
      assert.equal(G.endActivation(s,pid).ok,true);
      activations++;
      assert.ok(activations<=9);
    }
    assert.equal(activations,9);
    assert.ok(s.players.every(p=>p.workersLeft===0));

    const cleaned=G.cleanupMarket(s,{rng:()=>0.7});
    assert.equal(cleaned.ok,true);
    if(round<6){
      assert.equal(cleaned.finished,false);
      assert.equal(s.round,round+1);
      assert.equal(s.phase,'declare');
      assert.ok(s.players.every(p=>p.workersLeft===3));
    }else{
      assert.equal(cleaned.finished,true);
      assert.equal(s.phase,'finished');
      assert.equal(s.finished,true);
    }
  }
});

test('Bureau contract discounts the next paid land and is consumed',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];
  w.districtId='civic';
  G.selectWorker(s,0,w.id);
  s.constructions=[construction('BU',0,'bureau','civic','complete',['Lumber','Masonry','Steel'])];
  assert.equal(G.takeBureauContract(s,0,'BU').ok,true);
  assert.equal(s.players[0].bureauContracts,1);
  assert.equal(G.endActivation(s,0).ok,true);

  // Bring player 0 back to a fresh activation for the construction test.
  s.developmentPlayer=0;
  s.activationMainActionUsed=false;
  const w2=G.playerWorkers(s,0).find(x=>!x.used);
  w2.districtId='civic';
  assert.equal(G.selectWorker(s,0,w2.id).ok,true);
  s.players[0].portfolio=['tenement'];
  const e=G.constructionEligibility(s,0,'tenement','civic');
  assert.equal(e.baseCost,3);
  assert.equal(e.cost,1);
  assert.equal(e.bureauDiscount,2);
  const r=G.beginConstruction(s,0,'tenement','civic');
  assert.equal(r.ok,true);
  assert.equal(s.players[0].bureauContracts,0);
});

test('Social Club pays owner on opponent use and grants Influence to visitor',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];
  w.districtId='civic';
  G.selectWorker(s,0,w.id);
  s.constructions=[construction('CL',1,'club','civic','complete',['Lumber','Masonry','Masonry'])];
  const visitorMoney=s.players[0].capital;
  const ownerMoney=s.players[1].capital;
  const visitorInf=s.players[0].influence;
  const r=G.useSocialClub(s,0,'CL');
  assert.equal(r.ok,true);
  assert.equal(s.players[0].capital,visitorMoney-1);
  assert.equal(s.players[1].capital,ownerMoney+1);
  assert.ok(s.players[0].influence>visitorInf);
  assert.equal(new Set(s.players.map(p=>p.influence)).size,3);
});


test('Delivery log preserves causal order for partial then completing shipment',()=>{
  const s=devState();
  s.logisticsSupply.pacificmail=['Masonry','Steel'];
  s.logisticsSupply.southernpacific=['Masonry'];
  s.constructions=[construction('C1',0,'insurance','soma')];

  const first={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',cargo:['Masonry','Steel'],route:['soma'],drops:[{kind:'construction',id:'C1',materials:['Masonry','Steel']}]};
  const r1=G.executeDelivery(s,first);
  assert.equal(r1.ok,true);
  assert.equal(s.constructions[0].status,'under-construction');
  assert.deepEqual(s.constructions[0].materialsDelivered,['Masonry','Steel']);
  const firstDeliveryIndex=s.log.findIndex(x=>x.msg.includes('Pacific Mail / Pier 40')&&x.msg.includes('выполняет Delivery'));
  assert.ok(firstDeliveryIndex>=0);
  assert.match(s.log[firstDeliveryIndex].msg,/«Страховая компания» \(SoMa\): Камень ×1, Сталь ×1/);
  assert.equal(s.log.some(x=>x.msg.includes('завершил «Страховая компания»')),false);

  const second={playerId:0,source:{kind:'node',id:'southernpacific'},haulerId:'dray2b',cargo:['Masonry'],route:['soma'],drops:[{kind:'construction',id:'C1',materials:['Masonry']}]};
  const r2=G.executeDelivery(s,second);
  assert.equal(r2.ok,true);
  assert.equal(s.constructions[0].status,'complete');

  const secondDeliveryIndex=s.log.findIndex(x=>x.msg.includes('Southern Pacific · Third & Townsend')&&x.msg.includes('выполняет Delivery'));
  const completionIndex=s.log.findIndex(x=>x.msg.includes('завершил «Страховая компания»'));
  assert.ok(secondDeliveryIndex>firstDeliveryIndex);
  assert.ok(completionIndex>secondDeliveryIndex,'completion must be logged after the Delivery that caused it');
  assert.match(s.log[secondDeliveryIndex].msg,/«Страховая компания» \(SoMa\): Камень ×1/);
});


test('logistics node profiles specialize sources while preserving citywide 40/35/25 balance',()=>{
  const expected={
    broadway:{Lumber:.60,Masonry:.30,Steel:.10},
    pacificmail:{Lumber:.40,Masonry:.40,Steel:.20},
    southernpacific:{Lumber:.40,Masonry:.35,Steel:.25},
    chinabasin:{Lumber:.35,Masonry:.40,Steel:.25},
    unioniron:{Lumber:.20,Masonry:.25,Steel:.55}
  };
  for(const node of G.LOGISTICS_NODES){
    assert.deepEqual(node.weights,expected[node.id]);
    assert.ok(Math.abs(Object.values(node.weights).reduce((a,b)=>a+b,0)-1)<1e-9,node.id);
  }
  const total=G.LOGISTICS_NODES.reduce((s,n)=>s+n.throughput,0);
  const weighted={Lumber:0,Masonry:0,Steel:0};
  for(const node of G.LOGISTICS_NODES)for(const type of Object.keys(weighted))weighted[type]+=node.throughput*node.weights[type];
  assert.ok(Math.abs(weighted.Lumber/total-.40)<.001);
  assert.ok(Math.abs(weighted.Masonry/total-.35)<.01);
  assert.ok(Math.abs(weighted.Steel/total-.25)<.01);
});

test('logistics node map coordinates match approved historical placement pass',()=>{
  const pos=Object.fromEntries(G.LOGISTICS_NODES.map(n=>[n.id,[n.x,n.y,n.districtId,n.kind]]));
  assert.deepEqual(pos.broadway,[1048,195,'northbeach','port']);
  assert.deepEqual(pos.pacificmail,[1195,525,'soma','rail-port']);
  assert.deepEqual(pos.southernpacific,[1052,560,'soma','rail']);
  assert.deepEqual(pos.chinabasin,[1225,625,'missionbay','rail-port']);
  assert.deepEqual(pos.unioniron,[1222,850,'potrero','industrial-rail-port']);
});

test('node-specific random resource thresholds work at profile boundaries',()=>{
  const node=id=>G.LOGISTICS_NODES.find(n=>n.id===id);
  assert.equal(G.randomLogisticsResource(()=>.59,node('broadway').weights),'Lumber');
  assert.equal(G.randomLogisticsResource(()=>.61,node('broadway').weights),'Masonry');
  assert.equal(G.randomLogisticsResource(()=>.95,node('broadway').weights),'Steel');
  assert.equal(G.randomLogisticsResource(()=>.54,node('unioniron').weights),'Steel');
});

test('district risk keeps raw values above Level III instead of capping at 3',()=>{
  const s=devState();
  s.constructions=[
    construction('F1',0,'factory','soma','complete'),
    construction('F2',0,'factory','soma','complete'),
    construction('F3',1,'factory','soma','complete'),
    construction('F4',2,'factory','soma','complete'),
    construction('H1',0,'firehouse','soma','complete'),
    construction('H2',1,'firehouse','soma','complete')
  ];
  const risk=G.districtRisk(s,'soma');
  assert.equal(risk.earthquake.raw,5);
  assert.equal(risk.earthquake.level,3);
  assert.equal(risk.fire.raw,7);
  assert.equal(risk.fire.level,3);
  assert.equal(G.riskLevel(99),3);
});

test('district risk preview is deterministic and does not mutate current city risk',()=>{
  const s=devState();
  const before=G.districtRisk(s,'missionbay');
  assert.equal(before.earthquake.raw,2);
  assert.equal(before.fire.raw,0);
  const preview=G.districtRiskPreview(s,'missionbay','factory');
  assert.equal(preview.after.earthquake.raw,3);
  assert.equal(preview.after.fire.raw,2);
  const unchanged=G.districtRisk(s,'missionbay');
  assert.deepEqual(unchanged,before);
});

test('risk from a project enters the district only after construction is completed',()=>{
  const s=devState();
  const c=construction('T1',0,'tenement','civic','under-construction',['Lumber','Lumber','Masonry']);
  s.constructions=[c];
  assert.equal(G.districtRisk(s,'civic').fire.raw,0);
  const r=G.completeConstruction(s,c);
  assert.equal(r.ok,true);
  assert.equal(G.districtRisk(s,'civic').fire.raw,1);
  assert.ok(s.log.some(x=>x.msg.includes('Риск Civic Center:')&&x.msg.includes('П 0→1')));
});


test('risk preview respects safety already built below zero instead of overstating the next project',()=>{
  const s=devState();
  s.constructions=[construction('H1',0,'firehouse','civic','complete')];
  const before=G.districtRisk(s,'civic');
  assert.equal(before.fire.raw,0);
  assert.equal(before.fire.net,-1);
  const preview=G.districtRiskPreview(s,'civic','factory');
  assert.equal(preview.after.fire.raw,1);
  s.constructions.push(construction('F1',0,'factory','civic','complete'));
  assert.equal(G.districtRisk(s,'civic').fire.raw,1);
});
