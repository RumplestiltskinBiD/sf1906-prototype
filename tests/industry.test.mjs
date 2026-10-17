import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state() {
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=null;s.activationMainActionUsed=false;
  s.players.forEach(p=>{p.capital=100;});
  s.constructions=[];
  return s;
}
function building(id,playerId,projectId,districtId,{status='complete',stock=[],materials=[]}={}){
  return {id,playerId,projectId,districtId,status,startedRound:1,
    completedRound:status==='complete'?1:null,materialsDelivered:[...materials],
    warehouseInventory:[],industrialInventory:[...stock]};
}

test('exactly five industrial types and recipe/cost/risk/income data',()=>{
  const types=G.PROJECTS.filter(p=>G.projectTypes(p.id).includes('Промышленное'));
  assert.deepEqual(types.map(p=>p.id),['factory','brickworks','woodworks','foundry','cannery']);
  const expected=[
    ['brickworks',4,1,1,1,1,['Lumber','Masonry','Masonry','Steel']],
    ['woodworks',4,2,1,0,2,['Lumber','Lumber','Masonry','Steel']],
    ['foundry',6,2,1,1,2,['Lumber','Masonry','Steel','Steel']],
    ['cannery',4,1,1,0,1,['Lumber','Masonry','Masonry','Steel']]
  ];
  for(const [id,open,income,vp,earthquake,fire,materials] of expected){
    const p=G.projectById(id);
    assert.equal(p.open,open);assert.equal(p.income,income);assert.equal(p.prestige,vp);
    assert.deepEqual(p.risk,{earthquake,fire});assert.deepEqual(p.materials,materials);
  }
  const pool=G.createProjectCardPool({rng:()=>0.1});
  assert.equal(pool.length,G.PROJECTS.length*G.PROJECT_COPIES);
  for(const id of ['brickworks','woodworks','foundry','cannery']){
    assert.equal(pool.filter(p=>p.id===id).length,G.PROJECT_COPIES);
  }
});

test('industrial output replenishes to cap, does not pile up, and belongs to owner',()=>{
  const s=state();
  s.constructions=[
    building('BR',0,'brickworks','mission',{stock:['Masonry']}),
    building('FO',0,'foundry','soma'),
    building('WORK',0,'woodworks','soma'),
    building('UNDER',0,'brickworks','soma',{status:'under-construction'})
  ];
  assert.equal(G.deliverySourceInfo(s,0,{kind:'industry',id:'BR'}).inventory.length,1);
  assert.equal(G.deliverySourceInfo(s,1,{kind:'industry',id:'BR'}),null);
  assert.equal(G.deliverySourceInfo(s,0,{kind:'industry',id:'UNDER'}),null);
  assert.equal(G.deliverySourceInfo(s,0,{kind:'industry',id:'WORK'}),null);
  assert.equal(G.replenishIndustrialProduction(s).length,2);
  assert.deepEqual(G.industrialInventory(s.constructions[0]),['Masonry','Masonry']);
  assert.deepEqual(G.industrialInventory(s.constructions[1]),['Steel']);
  assert.deepEqual(G.replenishIndustrialProduction(s),[],'no duplicate generation within capacity');
  assert.deepEqual(G.industrialInventory(s.constructions[3]),[],'unfinished does not generate');
});

test('industrial output can be hauled for free as raw material, but normal route costs apply',()=>{
  const s=state();
  s.constructions=[
    building('BR',0,'brickworks','soma',{stock:['Masonry','Masonry']}),
    building('WH',0,'warehouse','soma')
  ];
  const plan={playerId:0,source:{kind:'industry',id:'BR'},
    haulerId:'standard',cargo:['Masonry','Masonry'],route:['soma'],
    drops:[{kind:'warehouse',id:'WH',routeIndex:0,materials:['Masonry','Masonry']}]};
  const check=G.validateDeliveryPlan(s,plan);
  assert.equal(check.ok,true,check.reason);
  assert.equal(check.cost.materialCost,0,'own production cannot be purchased again');
  assert.equal(check.cost.haulerCost,3,'standard hauler remains required');
  const paid=G.executeDelivery(s,plan);
  assert.equal(paid.ok,true);
  assert.equal(s.players[0].capital,97);
  assert.deepEqual(G.industrialInventory(s.constructions[0]),[]);
  assert.deepEqual(G.warehouseInventory(s.constructions[1]),['Masonry','Masonry']);
  assert.equal(G.replenishIndustrialProduction(s).length,1);
  assert.deepEqual(G.industrialInventory(s.constructions[0]),['Masonry','Masonry']);
});

test('woodworking premium only rewards own new nearby housing once per year per works',()=>{
  const s=state();
  s.constructions=[
    building('WOOD',0,'woodworks','mission'),
    building('H1',0,'tenement','mission',{status:'under-construction',materials:['Lumber','Lumber','Masonry']}),
    building('H2',0,'tenement','soma',{status:'under-construction',materials:['Lumber','Lumber','Masonry']}),
    building('H3',1,'tenement','mission',{status:'under-construction',materials:['Lumber','Lumber','Masonry']})
  ];
  const first=G.completeConstruction(s,s.constructions[1]);
  assert.equal(first.ok,true,first.reason);
  assert.equal(s.players[0].capital,102,'first own housing pays $2');
  assert.equal(s.constructions[0].woodworkingRewardRound,1);
  assert.equal(G.completeConstruction(s,s.constructions[2]).ok,true);
  assert.equal(s.players[0].capital,102,'second housing same year does not double-pay');
  assert.equal(G.completeConstruction(s,s.constructions[3]).ok,true);
  assert.equal(s.players[1].capital,100,'opponent housing does not pay owner');
  s.round=2;
  s.constructions.push(building('H4',0,'tenement','mission',{status:'under-construction',materials:['Lumber','Lumber','Masonry']}));
  assert.equal(G.completeConstruction(s,s.constructions.at(-1)).ok,true);
  assert.equal(s.players[0].capital,104,'new year allows new woodworks reward');
});

test('cannery adds $1 per completed home in its own district, max $3, any owner',()=>{
  const s=state();
  s.constructions=[
    building('CAN',0,'cannery','mission'),
    building('H1',1,'tenement','mission'),
    building('H2',0,'luxury','mission'),
    building('H3',2,'speculative','mission'),
    building('H4',0,'tenement','mission'),
    building('H5',0,'tenement','soma')
  ];
  assert.equal(G.canneryIncomeBonus(s,s.constructions[0]),3);
  assert.equal(G.buildingIncome(s,0),1+3+3+2+2,'cannery + homes with their normal income');
  assert.equal(G.roundIncome(s,0),3+(1+3+3+2+2));
  s.constructions.splice(1,4);
  assert.equal(G.canneryIncomeBonus(s,s.constructions[0]),0,'adjacent housing excluded');
  assert.equal(G.buildingIncome(s,0),1+2);
  s.constructions.push(building('INCOMPLETE',1,'tenement','mission',{status:'under-construction'}));
  assert.equal(G.canneryIncomeBonus(s,s.constructions[0]),0);
});

test('industrial inventory and annual bonus flags survive serializing a save',()=>{
  const s=state();
  s.constructions=[building('BR',0,'brickworks','mission',{stock:['Masonry']}),
    building('WO',0,'woodworks','mission')];
  s.constructions[1].woodworkingRewardRound=3;
  const saved=JSON.parse(JSON.stringify(s));
  assert.deepEqual(G.industrialInventory(saved.constructions[0]),['Masonry']);
  assert.equal(saved.constructions[1].woodworkingRewardRound,3);
  assert.equal(G.deliverySourceInfo(saved,0,{kind:'industry',id:'BR'}).inventory.length,1);
});
