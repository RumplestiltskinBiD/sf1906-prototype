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
  assert.equal(s.version,'0.28');
  assert.equal(s.players.length,3);
  assert.equal(s.market.length,5);
  assert.equal(s.starterDraftHands.length,3);
  assert.ok(s.starterDraftHands.every(h=>h.length===5));
  assert.equal(Object.values(s.logisticsSupply).flat().length,17);
  assert.equal(G.DELIVERY_HAULERS.filter(h=>h.limited).length,6);
  assert.equal(G.DELIVERY_HAULERS.find(h=>h.id==='standard').capacity,3);
  assert.equal(G.DELIVERY_HAULERS.find(h=>h.id==='standard').baseCost,3);
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

test('4+ resource construction needs completed own Warehouse in the same district',()=>{
  const s=devState();
  const w=G.playerWorkers(s,0)[0];
  w.districtId='soma';
  G.selectWorker(s,0,w.id);
  s.players[0].portfolio=['factory'];
  let e=G.constructionEligibility(s,0,'factory','soma');
  assert.equal(e.ok,false);
  assert.ok(e.reasons.some(x=>x.includes('Warehouse')));

  s.constructions=[construction('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],[])];
  e=G.constructionEligibility(s,0,'factory','soma');
  assert.equal(e.ok,true,e.reasons.join(' | '));
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
  s.constructions=[
    construction('W1',0,'warehouse','soma','complete',['Lumber','Masonry','Steel'],['Steel','Lumber']),
    construction('C1',0,'insurance','soma','under-construction',['Masonry'])
  ];
  const r=G.cleanupMarket(s,{rng:()=>0.99});
  assert.equal(r.ok,true);
  assert.deepEqual(s.haulersUsed,[]);
  assert.ok(Object.values(s.logisticsSupply).flat().every(x=>x==='Steel'));
  assert.deepEqual(G.warehouseInventory(s.constructions[0]),['Steel','Lumber']);
  assert.deepEqual(s.constructions[1].materialsDelivered,['Masonry']);
  assert.equal(s.firstPlayer,1);
  assert.ok(s.players.every(p=>p.workersLeft===3));
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

test('Fire House and Clinic service reach own and adjacent road districts only',()=>{
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


test('complete three-round Phase I lifecycle reaches finished state with workers resetting between rounds',()=>{
  const s=G.createInitialState({rng:()=>0.42});
  for(let pid=0;pid<3;pid++){
    G.revealStarterDraft(s);
    const hand=s.starterDraftHands[pid];
    G.toggleStarterDraftCard(s,hand[0].uid);
    G.toggleStarterDraftCard(s,hand[1].uid);
    assert.equal(G.confirmStarterDraft(s).ok,true);
  }

  for(let round=1;round<=3;round++){
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
    if(round<3){
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
  assert.equal(s.players[0].influence,visitorInf+1);
});
