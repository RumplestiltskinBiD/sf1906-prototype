import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const square=G.projectById('grand_city_square');
function state(){
  const s=G.createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.players.forEach(p=>{p.capital=100;p.prestige=0;p.portfolio=[];});
  s.constructions=[];s.activeWorkerId=s.players[0].workers[0].id;
  return s;
}
function site(id,playerId=0,districtId='civic',materials=[]){
  return {id,playerId,projectId:square.id,districtId,status:'under-construction',
    materialsDelivered:materials,warehouseInventory:[],startedRound:1,completedRound:null};
}
test('square is sixth pure Public card, two market copies, compact two-resource recipe',()=>{
  assert.equal(G.PROJECTS.length,38);
  assert.equal(G.createProjectCardPool({rng:()=>0.2}).length,76);
  assert.equal(G.createProjectCardPool({rng:()=>0.2}).filter(c=>c.id===square.id).length,2);
  assert.deepEqual(G.projectTypes(square),['Общественное']);
  assert.deepEqual(square.materials,['Lumber','Masonry']);
  assert.equal(square.open,3);
  assert.equal(square.income,0);assert.equal(square.prestige,2);
  assert.deepEqual(square.risk,{earthquake:0,fire:0});
  assert.equal(G.LAND_VALUE_COMPLETION_CHANGE[square.id],2);
  const singles=G.PROJECTS.filter(p=>G.projectTypes(p).length===1&&G.projectTypes(p)[0]==='Общественное');
  assert.equal(singles.length,6);
});
test('effect triggers only on actual completion, adds exactly +2 locally and scores exactly 2 VP',()=>{
  const s=state();s.districts.civic.landValue=1;
  s.districts.mission.landValue=2;
  s.constructions=[site('G',0,'civic',['Lumber'])];
  assert.equal(G.canCompleteConstruction(s,'G').ok,false);
  assert.equal(s.districts.civic.landValue,1,'no rise at construction start');
  s.constructions[0].materialsDelivered.push('Masonry');
  assert.equal(G.completeConstruction(s,s.constructions[0]).ok,true);
  assert.equal(s.districts.civic.landValue,3);
  assert.equal(s.districts.mission.landValue,2,'other districts unchanged');
  assert.equal(s.players[0].prestige,2);
  assert.equal(G.buildingIncome(s,0),0);
  assert.equal(G.completeConstruction(s,s.constructions[0]).ok,false,'no repeat completion');
  assert.equal(s.districts.civic.landValue,3);
  assert.equal(s.players[0].prestige,2);
});
test('land value is capped at 6, including several completed squares',()=>{
  for(const [before,expected] of [[0,2],[3,5],[4,6],[5,6],[6,6]]){
    const s=state();s.districts.civic.landValue=before;
    s.constructions=[site('G1',0,'civic',['Lumber','Masonry']),
      site('G2',1,'civic',['Lumber','Masonry'])];
    assert.equal(G.completeConstruction(s,s.constructions[0]).ok,true);
    assert.equal(s.districts.civic.landValue,expected);
    assert.equal(G.completeConstruction(s,s.constructions[1]).ok,true);
    assert.equal(s.districts.civic.landValue,Math.min(6,expected+2));
    assert.equal(s.players[0].prestige,2);assert.equal(s.players[1].prestige,2);
  }
});
test('completed square unlocks local land requirements even for competitor, but not elsewhere',()=>{
  const s=state();s.districts.civic.landValue=1;s.districts.mission.landValue=1;
  s.players[1].portfolio=['skyscraper'];
  assert.equal(G.constructionEligibility(s,1,'skyscraper','civic').ok,false);
  s.constructions=[site('G',0,'civic',['Lumber','Masonry'])];
  assert.equal(G.completeConstruction(s,s.constructions[0]).ok,true);
  assert.equal(s.districts.civic.landValue,3);
  assert.equal(G.constructionEligibility(s,1,'skyscraper','civic').ok,true);
  assert.equal(G.constructionEligibility(s,1,'skyscraper','mission').ok,false);
});
test('existing completed municipal buildings remain unchanged and their +1 land value stacks with square +2',()=>{
  const s=state();s.districts.civic.landValue=2;
  s.constructions=[site('G',0,'civic',['Lumber','Masonry']),
    {id:'P',playerId:1,projectId:'std_police',districtId:'civic',status:'under-construction',
    materialsDelivered:['Lumber','Masonry','Steel'],warehouseInventory:[],startedRound:1,completedRound:null}];
  assert.equal(G.completeConstruction(s,s.constructions[0]).ok,true);
  assert.equal(G.completeConstruction(s,s.constructions[1]).ok,true);
  assert.equal(s.districts.civic.landValue,5);
  assert.equal(s.players[0].prestige,2);
  assert.equal(s.players[1].prestige,1);
});
