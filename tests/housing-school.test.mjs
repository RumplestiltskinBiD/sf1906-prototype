import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

function state(){
  const s=G.createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.developmentComplete=false;s.activeWorkerId=null;s.activationMainActionUsed=false;
  s.constructions=[];s.players.forEach(p=>{p.capital=100;p.prestige=0;});
  return s;
}
function build(id,playerId,projectId,districtId,status='complete',materialsDelivered=[]){
  return {id,playerId,projectId,districtId,status,
    materialsDelivered:[...materialsDelivered],warehouseInventory:[],
    startedRound:1,completedRound:status==='complete'?1:null};
}
function finish(s,construction){s.constructions.push(construction);return G.completeConstruction(s,construction);}

test('approved cards: exactly 5 residential, 5 municipal and 2 copies of each new type',()=>{
  assert.deepEqual(G.PROJECTS.filter(p=>G.projectTypes(p).includes('Жилое')).map(p=>p.id),
    ['tenement','speculative','luxury','cottages','brickapartments']);
  assert.deepEqual(G.PROJECTS.filter(p=>G.projectTypes(p).includes('Общественное')).map(p=>p.id),
    ['firehouse','police','clinic','school','publicworks']);
  const expected=[
    ['cottages',3,1,2,{earthquake:0,fire:1},['Lumber','Lumber','Masonry']],
    ['brickapartments',4,4,2,{earthquake:2,fire:0},['Lumber','Masonry','Masonry','Steel','Steel']],
    ['school',4,0,2,{earthquake:0,fire:0},['Lumber','Masonry','Masonry']]
  ];
  for(const [id,price,income,vp,risk,materials] of expected){
    const p=G.projectById(id);
    assert.equal(p.open,price,id+' market price');
    assert.equal(p.income,income,id+' base annual income');
    assert.equal(p.prestige,vp,id+' base VP');
    assert.deepEqual(p.risk,risk,id+' district hazard contribution');
    assert.deepEqual(p.materials,materials,id+' recipe');
    assert.equal(G.createProjectCardPool({rng:()=>0.1}).filter(x=>x.id===id).length,2);
  }
  assert.equal(G.projectById('brickapartments').landMin,2);
  assert.equal(G.LAND_VALUE_COMPLETION_CHANGE.school,1);
});

test('first cottages in an unbuilt district get $2 once; VP and residence income remain',()=>{
  const s=state();
  const c=build('C1',0,'cottages','outerrichmond','under-construction',['Lumber','Lumber','Masonry']);
  const out=finish(s,c);
  assert.equal(out.ok,true,out.reason);
  assert.equal(out.cottageBonus,2);
  assert.equal(out.prestige,2);
  assert.equal(c.cottageBonusAwarded,2);
  assert.equal(s.players[0].capital,102);
  assert.equal(s.players[0].prestige,2);
  assert.equal(G.buildingIncome(s,0),1);
  const second=build('C2',0,'cottages','outerrichmond','under-construction',['Lumber','Lumber','Masonry']);
  const result=finish(s,second);
  assert.equal(result.ok,true,result.reason);
  assert.equal(result.cottageBonus,0);
  assert.equal(s.players[0].capital,102);
});

test('unfinished buildings do not block cottages, but rival completed buildings do',()=>{
  const s=state();
  s.constructions.push(build('IN_PROGRESS',2,'factory','innersunset','under-construction'));
  const a=build('FIRST',0,'cottages','innersunset','under-construction',['Lumber','Lumber','Masonry']);
  assert.equal(finish(s,a).cottageBonus,2);
  s.constructions.push(build('OTHER_OWNER',1,'clinic','noe'));
  const b=build('C3',0,'cottages','noe','under-construction',['Lumber','Lumber','Masonry']);
  assert.equal(finish(s,b).cottageBonus,0);
});

test('brick apartments require warehouse logistics for five materials, risk +2 to district',()=>{
  const s=state(),district='civic';
  const site=build('BRICK',0,'brickapartments',district,'under-construction',['Lumber','Masonry','Steel']);
  s.constructions.push(site);
  assert.equal(G.canCompleteConstruction(s,'BRICK').ok,false,'two more resources need local storage');
  s.constructions.push(build('WAREHOUSE',0,'warehouse',district));
  s.constructions[1].warehouseInventory=['Masonry','Steel'];
  const before=G.districtRisk(s,district); // Include the existing warehouse's P+1 in baseline.
  assert.equal(G.canCompleteConstruction(s,'BRICK').ok,true);
  const done=G.completeConstructionFromStorage(s,'BRICK');
  assert.equal(done.ok,true,done.reason);
  assert.equal(done.prestige,2);
  assert.equal(s.players[0].prestige,2);
  assert.deepEqual(s.constructions[1].warehouseInventory,[],'warehouse materials consumed');
  assert.equal(s.constructions[0].status,'complete');
  assert.equal(G.districtRisk(s,district).earthquake.raw-before.earthquake.raw,2);
  assert.equal(G.districtRisk(s,district).fire.raw-before.fire.raw,0);
  assert.equal(G.buildingIncome(s,0),4+2,'brick apartments $4 plus warehouse $2');
});

test('school pays 2-4 VP, including neighboring rival homes, once at completion',()=>{
  for(const [homes,expectedVp] of [[0,2],[1,3],[2,4],[3,4]]){
    const s=state();
    const possible=[
      build('H1',1,'tenement','mission'),
      build('H2',2,'luxury','civic'),
      build('H3',0,'speculative','mission')
    ];
    s.constructions.push(...possible.slice(0,homes));
    const school=build('S',0,'school','civic','under-construction',['Lumber','Masonry','Masonry']);
    const oldLand=s.districts.civic.landValue;
    const out=finish(s,school);
    assert.equal(out.ok,true,out.reason);
    assert.equal(out.prestige,expectedVp);
    assert.equal(out.schoolHousingVp,expectedVp-2);
    assert.equal(s.players[0].prestige,expectedVp);
    assert.equal(school.schoolHousingVpAwarded,expectedVp-2);
    assert.equal(s.districts.civic.landValue,Math.min(6,oldLand+1));
    assert.equal(G.projectById('school').income,0,'school itself produces no income');
    s.constructions.push(build('LATE',1,'tenement','civic'));
    assert.equal(s.players[0].prestige,expectedVp,'no retroactive VP');
  }
});

test('school ignores unfinished housing and homes farther than adjacent district',()=>{
  const s=state();
  s.constructions=[
    build('UNFINISHED',1,'tenement','civic','under-construction'),
    build('DISTANT',2,'tenement','outerrichmond')
  ];
  const school=build('S',0,'school','civic','under-construction',['Lumber','Masonry','Masonry']);
  assert.equal(finish(s,school).prestige,2);
});

test('saved cottages and school record exact paid bonuses after JSON roundtrip',()=>{
  const s=state();
  const c=build('C',0,'cottages','civic','under-construction',['Lumber','Lumber','Masonry']);
  assert.equal(finish(s,c).cottageBonus,2);
  const school=build('S',0,'school','civic','under-construction',['Lumber','Masonry','Masonry']);
  assert.equal(finish(s,school).schoolHousingVp,1);
  const revived=JSON.parse(JSON.stringify(s));
  assert.equal(revived.constructions[0].cottageBonusAwarded,2);
  assert.equal(revived.constructions[1].schoolHousingVpAwarded,1);
  assert.equal(revived.players[0].prestige,5);
  assert.equal(revived.players[0].capital,102);
});
