import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const id='polytechnic_campus', project=G.projectById(id);
const snap=s=>JSON.stringify(s);
function game(){
 const s=G.createInitialState({rng:()=>0.2});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.developmentSlotsUsed=[0,0,0];
 s.newsCurrentIds=['H03'];s.newsLastResolvedRound=0;
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.players.forEach(p=>{p.capital=60;p.prestige=0;p.portfolio=[];p.workersLeft=3;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});});
 s.activeWorkerId=s.players[0].workers[0].id;s.constructions=[];
 return s;
}
function site(s,{district='civic',player=0,materials=project.materials,tag='PC',status='under-construction'}={}){
 const con={id:tag,projectId:id,playerId:player,districtId:district,status,
  startedRound:1,completedRound:status==='complete'?1:null,
  materialsDelivered:[...materials],warehouseInventory:[]};
 s.constructions.push(con);return con;
}
test('Issue #207: exact approved hybrid card, market price, recipe, risk and two copies',()=>{
 assert.equal(project.name,'Политехнический кампус');
 assert.deepEqual(G.projectTypes(id),['Жилое','Общественное']);
 assert.equal(project.type,'Жильё / Городская служба');
 assert.equal(project.open,3);assert.equal(G.openingPrice({id}),3);
 assert.equal(project.prestige,2);assert.equal(project.income,1);
 assert.deepEqual(project.materials,['Lumber','Lumber','Masonry','Masonry']);
 assert.deepEqual(project.risk,{earthquake:1,fire:0});
 assert.equal(G.LAND_VALUE_COMPLETION_CHANGE[id],1);
 assert.equal(project.landMin,undefined);assert.equal(project.accessAll,undefined);
 assert.equal(project.accessAny,undefined);assert.equal(project.standard,undefined);
 assert.match(project.actionText,/пока не подключены/);
 assert.equal(G.PROJECTS.length,42);
 assert.equal(G.PROJECTS.filter(p=>G.projectTypes(p).length===2).length,12);
 assert.equal(G.PROJECT_COPIES,2);
 const pool=G.createProjectCardPool({rng:()=>0.2});
 assert.equal(pool.length,84);
 assert.equal(new Set(pool.map(c=>c.uid)).size,pool.length);
 assert.equal(pool.filter(c=>c.id===id).length,2);
});
test('fresh game has exactly two hidden campus copies and an explicit migration sentinel',()=>{
 const s=G.createInitialState({rng:()=>0.2});
 assert.equal(s.polytechnicCampusExpansionV1,true);
 assert.equal(s.market.filter(c=>c?.id===id).length,0);
 assert.equal(s.starterDraftHands.flat().filter(c=>c.id===id).length,0);
 assert.equal(s.deck.filter(c=>c.id===id).length,2);
 const before=snap(s);
 G.ensureNewspaper(s);
 assert.equal(snap(s),before);
});
test('construction spends one real worker and exact current land cost, never pays start benefits',()=>{
 const s=game();s.players[0].portfolio=[id];
 const land=s.districts.civic.landValue,before=s.players[0].capital;
 assert.equal(G.constructionEligibility(s,0,id,'civic').ok,true);
 const start=G.beginConstruction(s,0,id,'civic');
 assert.equal(start.ok,true,JSON.stringify(start));
 assert.equal(start.cost,land);
 assert.equal(start.standardFee,0);
 assert.equal(s.players[0].capital,before-land);
 assert.equal(s.players[0].portfolio.includes(id),false);
 assert.equal(start.construction.status,'under-construction');
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(G.buildingIncome(s,0),0);
 assert.equal(s.players[0].prestige,0);
 assert.equal(s.districts.civic.landValue,land);
 assert.equal(G.beginConstruction(s,0,id,'civic').ok,false,'cannot reuse worker action');
});
test('no special district requirement but normal worker range, capital and sites apply',()=>{
 const s=game();
 s.players[0].portfolio=[id];
 s.players[0].capital=0;
 assert.equal(G.constructionEligibility(s,0,id,'civic').ok,false);
 s.districts.sunset.landValue=0;
 assert.equal(G.constructionEligibility(s,0,id,'sunset').ok,false,'worker in Civic cannot reach Sunset');
 s.players[0].workers[0].districtId='sunset';
 assert.equal(G.constructionEligibility(s,0,id,'sunset').ok,true,'$0 district is legal and accessible');
 s.districts.sunset.sites=0;
 assert.equal(G.constructionEligibility(s,0,id,'sunset').ok,false);
});
test('uncompleted campus is not income, VP, U or Land Value; missing fourth cube cannot be fabricated',()=>{
 const s=game();const oldLand=s.districts.civic.landValue;
 const c=site(s,{materials:['Lumber','Lumber','Masonry']});
 assert.equal(G.canCompleteConstruction(s,c.id).ok,false);
 const old=snap(s);assert.equal(G.completeConstruction(s,c).ok,false);
 assert.equal(snap(s),old);
 assert.equal(G.buildingIncome(s,0),0);
 assert.equal(s.players[0].prestige,0);
 assert.equal(s.districts.civic.landValue,oldLand);
 assert.equal(G.districtRisk(s,'civic').earthquake.raw,
   G.districtRisk({...s,constructions:[]},'civic').earthquake.raw);
});
test('fourth Masonry arrives through physical Delivery and completes without a warehouse',()=>{
 const s=game();s.logisticsSupply.pacificmail=['Masonry'];
 const c=site(s,{district:'soma',materials:['Lumber','Lumber','Masonry']});
 const land=s.districts.soma.landValue;
 const beforeRisk=G.districtRisk(s,'soma').earthquake.raw;
 const beforeCash=s.players[0].capital;
 const plan={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',
  cargo:['Masonry'],route:['soma'],drops:[{kind:'construction',id:c.id,materials:['Masonry']}]};
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true,JSON.stringify(G.validateDeliveryPlan(s,plan)));
 const out=G.executeDelivery(s,plan);
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.deepEqual(out.completed,['PC']);
 assert.equal(c.status,'complete');
 assert.deepEqual(c.materialsDelivered,project.materials);
 assert.equal(s.players[0].prestige,2);
 assert.equal(s.players[0].capital,beforeCash-out.cost.total);
 assert.equal(G.buildingIncome(s,0),1);
 assert.equal(s.districts.soma.landValue,land+1);
 assert.equal(G.districtRisk(s,'soma').earthquake.raw,beforeRisk+1);
 assert.equal(G.districtRisk(s,'soma').fire.raw,
  G.districtRisk({...s,constructions:[]},'soma').fire.raw);
 const stable=snap(s);
 assert.equal(G.completeConstruction(s,c).ok,false);
 assert.equal(snap(s),stable,'no repeated VP, income or land bonus on duplicate completion');
});
test('all four real materials can arrive in a single final Delivery; normal hauler cost paid',()=>{
 const s=game();s.logisticsSupply.pacificmail=[...project.materials];
 const c=site(s,{district:'soma',materials:[]});
 const plan={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'freight5',
  cargo:[...project.materials],route:['soma'],drops:[{kind:'construction',id:c.id,materials:[...project.materials]}]};
 assert.equal(G.validateDeliveryPlan(s,plan).ok,true,JSON.stringify(G.validateDeliveryPlan(s,plan)));
 assert.equal(G.executeDelivery(s,plan).ok,true);
 assert.equal(c.status,'complete');assert.equal(s.players[0].prestige,2);
});
test('invalid/mismatched fourth resource is rejected atomically, no free building',()=>{
 const s=game();s.logisticsSupply.pacificmail=['Lumber','Masonry'];
 const c=site(s,{district:'soma',materials:['Lumber','Lumber','Masonry']});
 const bad={playerId:0,source:{kind:'node',id:'pacificmail'},haulerId:'dray2a',
  cargo:['Lumber'],route:['soma'],drops:[{kind:'construction',id:c.id,materials:['Lumber']}]};
 const before=snap(s);
 assert.equal(G.validateDeliveryPlan(s,bad).ok,false);
 assert.equal(G.executeDelivery(s,bad).ok,false);
 assert.equal(snap(s),before);
});
test('Land Value increase happens once, is local, stacks across owners and is capped at 6',()=>{
 for(const [before,one,two] of [[0,1,2],[3,4,5],[5,6,6],[6,6,6]]){
  const s=game();s.districts.civic.landValue=before;s.districts.mission.landValue=2;
  const c1=site(s,{tag:'ONE'}),c2=site(s,{tag:'TWO',player:1});
  assert.equal(G.completeConstruction(s,c1).ok,true);
  assert.equal(s.districts.civic.landValue,one);
  assert.equal(G.completeConstruction(s,c2).ok,true);
  assert.equal(s.districts.civic.landValue,two);
  assert.equal(s.districts.mission.landValue,2);
  assert.equal(s.players[0].prestige,2);
  assert.equal(s.players[1].prestige,2);
  assert.equal(G.buildingIncome(s,0),1);
  assert.equal(G.buildingIncome(s,1),1);
 }
});
test('owner income pays in ordinary yearly gross, outsider gets none, no science or visitor cash yet',()=>{
 const s=game();const c=site(s,{tag:'F'});
 assert.equal(G.completeConstruction(s,c).ok,true);
 assert.equal(G.grossRoundIncome(s,0),G.BASE_ROUND_INCOME+1);
 assert.equal(G.grossRoundIncome(s,1),G.BASE_ROUND_INCOME);
 assert.equal(s.players[0].capital,60);
 assert.equal(s.players[1].capital,60);
 assert.equal(s.players[0].influence,2,'no speculative research/visitor reward');
 assert.equal(s.researchMarket,undefined);
 const roundTrip=JSON.parse(snap(s));
 assert.equal(G.buildingIncome(roundTrip,0),1);
 assert.equal(roundTrip.constructions[0].status,'complete');
 assert.equal(roundTrip.districts.civic.landValue,s.districts.civic.landValue);
});
