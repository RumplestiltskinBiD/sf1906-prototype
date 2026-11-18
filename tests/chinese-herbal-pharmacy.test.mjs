import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as G from '../game-core.js';

const id='chinese_herbal_pharmacy';
const snap=s=>JSON.stringify(s);
function game(){
 const s=G.createInitialState({rng:()=>0.19});
 s.phase='development';s.view='city';s.developmentComplete=false;s.developmentPlayer=0;
 s.activationMainActionUsed=false;s.developmentSlotsUsed=[0,0,0];
 s.newsCurrentIds=['H03'];s.newsLastResolvedRound=0;
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];p.suspicion=0;p.workersLeft=3;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});});
 s.activeWorkerId=s.players[0].workers[0].id;s.constructions=[];
 return s;
}
function built(s,projectId,owner=0,district='soma',extra={}){
 const project=G.projectById(projectId);
 const c={id:'B'+(s.constructions.length+1),projectId,playerId:owner,districtId:district,
  status:'complete',startedRound:1,completedRound:1,materialsDelivered:[...project.materials],
  warehouseInventory:[],...extra};
 s.constructions.push(c);return c;
}
function delivery(sourceId,buyerId,{route=['soma'],playerId=0,arrestWorkerId=null}={}){
 return {playerId,source:{kind:'contraband',id:sourceId},haulerId:'standard',
  cargo:[G.CONTRABAND_CARGO],route,arrestWorkerId,
  drops:[{kind:'contraband-sale',id:buyerId,routeIndex:route.length-1,materials:[G.CONTRABAND_CARGO]}]};
}
test('approved herbal pharmacy: types, cost, wood recipe, fire risk, capabilities, two real cards',()=>{
 const p=G.projectById(id);
 assert.equal(p.name,'Китайская аптекарская лавка');
 assert.deepEqual(p.types,['Бизнес','Торговое']);
 assert.deepEqual(p.materials,['Lumber','Lumber','Lumber']);
 assert.equal(p.open,4);assert.equal(p.income,1);assert.equal(p.prestige,1);
 assert.deepEqual(p.risk,{earthquake:0,fire:2});
 assert.equal(p.freeLandDistrict,'chinatown');assert.equal(G.acceptsContraband(id),true);
 assert.equal(G.contrabandSourceCapacity(id),0);
 assert.match(G.projectById('customs_warehouse').actionText,/любое завершённое здание, принимающее Контрабанду/);
 assert.doesNotMatch(G.projectById('customs_warehouse').actionText,/лавку редких товаров/);
 assert.equal(G.serviceFamilyForProject(id),null);
 assert.equal(G.PROJECTS.length,43);
 assert.equal(G.PROJECTS.filter(x=>x.types?.length===2).length,13);
 assert.equal(G.createProjectCardPool({rng:()=>0.22}).filter(x=>x.id===id).length,2);
 assert.equal(G.createProjectCardPool({rng:()=>0.22}).length,86);
});
test('Chinatown always waives full actual land value and preserves Construction Bureau contract',()=>{
 const s=game();s.players[0].portfolio=[id];s.players[0].bureauContracts=1;s.players[0].capital=0;
 s.players[0].workers[0].districtId='chinatown';s.districts.chinatown.landValue=6;
 const elig=G.constructionEligibility(s,0,id,'chinatown');
 assert.equal(elig.ok,true,elig.reasons.join('; '));assert.equal(elig.baseCost,6);
 assert.equal(elig.landCost,0);assert.equal(elig.cost,0);assert.equal(elig.districtLandWaived,true);
 assert.equal(elig.bureauDiscount,0);
 const start=G.beginConstruction(s,0,id,'chinatown');
 assert.equal(start.ok,true,start.reasons?.join('; '));
 assert.equal(s.players[0].capital,0);assert.equal(s.players[0].bureauContracts,1);
 assert.equal(s.districts.chinatown.landValue,6);
 assert.equal(start.construction.status,'under-construction');
 assert.equal(start.construction.materialsDelivered.length,0);
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.players[0].portfolio.includes(id),false);
 assert.equal(s.players[0].prestige,0);
 const again=G.constructionEligibility(s,0,id,'chinatown');
 assert.equal(again.ok,false,'the same worker cannot start a second project');
});
test('outside Chinatown the pharmacy pays normal land, still supports Bureau discount',()=>{
 const s=game();s.players[0].portfolio=[id];s.districts.civic.landValue=5;
 let elig=G.constructionEligibility(s,0,id,'civic');
 assert.equal(elig.landCost,5);assert.equal(elig.districtLandWaived,false);
 s.players[0].bureauContracts=1;elig=G.constructionEligibility(s,0,id,'civic');
 assert.equal(elig.landCost,3);assert.equal(elig.bureauDiscount,2);
 const start=G.beginConstruction(s,0,id,'civic');
 assert.equal(start.ok,true);assert.equal(s.players[0].capital,97);
 assert.equal(s.players[0].bureauContracts,0);
 assert.equal(s.districts.civic.landValue,5);
});
test('three wood finish once: +1 VP, +1 Income, P+2, never a medical service',()=>{
 const s=game(),c=built(s,id,0,'chinatown',{status:'under-construction',completedRound:null});
 const before=G.districtRisk(s,'chinatown').fire.raw;
 assert.equal(G.completeConstruction(s,c).ok,true);
 assert.equal(c.status,'complete');assert.equal(s.players[0].prestige,1);
 assert.equal(G.buildingIncome(s,0),1);
 assert.equal(G.districtRisk(s,'chinatown').fire.raw,before+2);
 assert.equal(G.serviceFamilyForProject(id),null);
 assert.equal(G.districtAccess(s,'chinatown').clinic,false);
 assert.equal(G.completedCitywideServices(s,'clinic').length,0);
 assert.equal(G.completeConstruction(s,c).ok,false);
 assert.equal(s.players[0].prestige,1);
});
test('private practice freezes +1 Income when a finished neighboring clinic exists at pharmacy completion',()=>{
 const s=game(),pharmacy=built(s,id,0,'chinatown',{status:'under-construction',completedRound:null});
 const clinic=built(s,'clinic',1,'financial');
 assert.equal(G.herbalPharmacyIncomeBonus(s,pharmacy),0,'unfinished pharmacy earns nothing');
 assert.equal(G.completeConstruction(s,pharmacy).ok,true);
 assert.equal(pharmacy.herbalPrivatePracticeBonus,1);
 assert.equal(G.buildingIncome(s,0),2);
 assert.equal(G.roundIncome(s,0),5,'base $3, pharmacy $1, permanent practice $1');
 const extra=built(s,'std_clinic',2,'northbeach');
 assert.equal(G.buildingIncome(s,0),2,'two neighboring providers cannot stack');
 clinic.status='abandoned';extra.status='redeveloped';
 assert.equal(G.buildingIncome(s,0),2,'removing every clinic after completion never removes the bonus');
 const from=snap(s);
 assert.equal(G.completeConstruction(s,pharmacy).ok,false);
 assert.equal(snap(s),from,'second completion cannot award again');
 const revived=JSON.parse(snap(s));
 assert.equal(G.herbalPharmacyIncomeBonus(revived,revived.constructions[0]),1);
 assert.equal(G.buildingIncome(revived,0),2,'save/reload preserves the locked Income');
});
test('new clinical building cannot activate a pharmacy that finished without medicine nearby',()=>{
 const s=game(),pharmacy=built(s,id,0,'chinatown',{status:'under-construction',completedRound:null});
 const pending=built(s,'clinic',1,'financial',{status:'under-construction'});
 assert.equal(G.completeConstruction(s,pharmacy).ok,true);
 assert.equal(pharmacy.herbalPrivatePracticeBonus,0,'unfinished neighbor is ineligible');
 assert.equal(G.buildingIncome(s,0),1);
 pending.status='complete';
 assert.equal(G.buildingIncome(s,0),1,'a later neighboring completed clinic cannot unlock the old pharmacy');
 const nearby=built(s,'std_clinic',2,'chinatown');
 assert.equal(G.buildingIncome(s,0),1,'even a later local standard clinic cannot unlock it');
 nearby.status='abandoned';
 const distant=built(s,'std_clinic',1,'mission');
 assert.equal(G.buildingIncome(s,0),1,'distant clinic does not matter');
 distant.districtId='financial';
 assert.equal(G.buildingIncome(s,0),1,'moving a clinic into range never recalculates');
 const revived=JSON.parse(snap(s));
 assert.equal(G.buildingIncome(revived,0),1,'saved permanent income remains base only');
});
test('both clinic types of any owner work in own or adjacent district, but not distant ones',()=>{
 for(const medicalId of ['clinic','std_clinic']){
  for(const district of ['chinatown','financial','northbeach']){
   const s=game();
   const pharmacy=built(s,id,0,'chinatown',{status:'under-construction',completedRound:null});
   built(s,medicalId,2,district);
   assert.equal(G.hasMedicalNeighborAtPharmacyCompletion(s,pharmacy),true,medicalId+' '+district);
   assert.equal(G.completeConstruction(s,pharmacy).ok,true);
   assert.equal(pharmacy.herbalPrivatePracticeBonus,1,medicalId+' '+district);
  }
  const far=game(),pharmacy=built(far,id,0,'chinatown',{status:'under-construction',completedRound:null});
  built(far,medicalId,1,'mission');
  assert.equal(G.hasMedicalNeighborAtPharmacyCompletion(far,pharmacy),false);
  assert.equal(G.completeConstruction(far,pharmacy).ok,true);
  assert.equal(pharmacy.herbalPrivatePracticeBonus,0,'distant provider is irrelevant');
 }
});
test('two copies take independent snapshots at their own completion dates',()=>{
 const s=game(),first=built(s,id,0,'chinatown',{status:'under-construction',completedRound:null});
 assert.equal(G.completeConstruction(s,first).ok,true);
 assert.equal(first.herbalPrivatePracticeBonus,0);
 const med=built(s,'std_clinic',2,'financial');
 const second=built(s,id,1,'chinatown',{status:'under-construction',completedRound:null});
 assert.equal(G.completeConstruction(s,second).ok,true);
 assert.equal(second.herbalPrivatePracticeBonus,1);
 assert.equal(first.herbalPrivatePracticeBonus,0);
 assert.equal(G.buildingIncome(s,0),1);assert.equal(G.buildingIncome(s,1),2);
 med.status='redeveloped';
 assert.equal(G.buildingIncome(s,0),1);assert.equal(G.buildingIncome(s,1),2);
});
test('old-version completed pharmacies get one-time snapshot from visible service at migration, not yearly',()=>{
 const s=game();
 const clinic=built(s,'std_clinic',1,'financial');
 const first=built(s,id,0,'chinatown');
 const second=built(s,id,2,'mission');
 assert.equal(first.herbalPrivatePracticeBonus,undefined);
 assert.equal(second.herbalPrivatePracticeBonus,undefined);
 delete s.herbalPrivatePracticeSnapshotV1;
 assert.equal(G.migrateHerbalPrivatePracticeSnapshot(s),2);
 assert.equal(first.herbalPrivatePracticeBonus,1);
 assert.equal(second.herbalPrivatePracticeBonus,0);
 assert.equal(s.herbalPrivatePracticeSnapshotV1,true);
 assert.equal(G.buildingIncome(s,0),2);
 assert.equal(G.buildingIncome(s,2),1);
 clinic.status='redeveloped';
 built(s,'clinic',1,'mission');
 assert.equal(G.migrateHerbalPrivatePracticeSnapshot(s),0,'do not recompute migration');
 assert.equal(first.herbalPrivatePracticeBonus,1);
 assert.equal(second.herbalPrivatePracticeBonus,0);
 assert.equal(G.buildingIncome(s,0),2);
 assert.equal(G.buildingIncome(s,2),1);
 const restored=JSON.parse(snap(s));
 assert.equal(G.migrateHerbalPrivatePracticeSnapshot(restored),0);
 assert.equal(G.buildingIncome(restored,0),2);
 assert.equal(G.buildingIncome(restored,2),1);
});
test('legacy migration leaves unfinished pharmacies and other project income untouched',()=>{
 const s=game(),pharmacy=built(s,id,0,'chinatown',{status:'under-construction'});
 built(s,'clinic',1,'financial');
 const business=built(s,'tenement',2,'civic');
 delete s.herbalPrivatePracticeSnapshotV1;
 assert.equal(G.migrateHerbalPrivatePracticeSnapshot(s),0);
 assert.equal(pharmacy.herbalPrivatePracticeBonus,undefined);
 assert.equal(G.buildingIncome(s,0),0);
 assert.equal(G.buildingIncome(s,2),G.projectById(business.projectId).income);
 assert.equal(G.completeConstruction(s,pharmacy).ok,true);
 assert.equal(pharmacy.herbalPrivatePracticeBonus,1);
 assert.equal(G.buildingIncome(s,0),2);
});
test('all real buyer/source capabilities: existing customs can ship to new pharmacy, no buyer star',()=>{
 const s=game();const source=built(s,'customs_warehouse',1,'soma',{contrabandStock:2});
 const buyer=built(s,id,2,'soma');
 assert.equal(G.contrabandSourceCapacity(source.projectId),2);
 assert.equal(G.acceptsContraband(buyer.projectId),true);
 assert.deepEqual(G.completedContrabandSources(s).map(x=>x.id),[source.id]);
 const a=delivery(source.id,buyer.id),preview=G.validateDeliveryPlan(s,a);
 assert.equal(preview.ok,true,preview.reason);assert.equal(preview.cost.total,3);
 const before=s.players.map(p=>p.capital);
 const done=G.executeDelivery(s,a);
 assert.equal(done.ok,true,done.reason);
 assert.equal(s.players[0].capital,before[0]+3,'carrier $6 minus $3 hauler');
 assert.equal(s.players[1].capital,before[1]+1);
 assert.equal(s.players[2].capital,before[2]+1);
 assert.equal(s.players[0].suspicion,1);
 assert.equal(s.players[1].suspicion,0);assert.equal(s.players[2].suspicion,0);
 assert.equal(s.constructions.find(c=>c.id===source.id).contrabandStock,1);
 assert.equal(G.validateDeliveryPlan(s,a).reason,'delivery-once-per-activation');
 assert.equal(G.buildingIncome(s,2),1,'successful trade does not change permanent Income');
});
test('properties, not IDs: an entirely new source project may produce purple cargo at declared capacity',()=>{
 const future={...G.projectById('customs_warehouse'),id:'future_contraband_source_fixture',name:'Future source',
   contrabandStockCapacity:3,types:['Торговое']};
 G.PROJECTS.push(future);
 try{
  const s=game(),source=built(s,future.id,1,'soma',{contrabandStock:3});
  const buyer=built(s,id,2,'soma');
  assert.equal(G.contrabandInventory(source).length,3);
  assert.equal(G.completedContrabandSources(s).some(x=>x.id===source.id),true);
  const a=delivery(source.id,buyer.id);
  assert.equal(G.validateDeliveryPlan(s,a).ok,true);
  assert.equal(G.executeDelivery(s,a).ok,true);
  assert.equal(s.constructions.find(c=>c.id===source.id).contrabandStock,2);
  assert.equal(s.players[1].capital,101);
  assert.equal(s.players[2].capital,101);
 }finally{
  const ix=G.PROJECTS.findIndex(p=>p.id===future.id);
  if(ix>=0)G.PROJECTS.splice(ix,1);
 }
});
test('invalid receiver, incomplete receiver, missing source or no stock cause atomic failures',()=>{
 const s=game(),source=built(s,'customs_warehouse',1,'soma',{contrabandStock:2});
 const receiver=built(s,id,2,'soma',{status:'under-construction'});
 const a=delivery(source.id,receiver.id);
 const snapshot=snap(s);
 assert.equal(G.executeDelivery(s,a).reason,'contraband-buyer');assert.equal(snap(s),snapshot);
 receiver.status='complete';receiver.projectId='pub';
 const before=snap(s);
 assert.equal(G.executeDelivery(s,a).reason,'contraband-buyer');assert.equal(snap(s),before);
 receiver.projectId=id;source.contrabandStock=0;
 const beforeStock=snap(s);
 assert.equal(G.executeDelivery(s,a).reason,'source-stock');assert.equal(snap(s),beforeStock);
 source.contrabandStock=2;
 const park=delivery(source.id,receiver.id,{route:['soma','civic','western','park','western','civic','soma']});
 const beforePark=snap(s);assert.equal(G.executeDelivery(s,park).ok,false);
 assert.equal(snap(s),beforePark);
});
test('old rare-goods buyer stays operational and an already suspicious courier is arrested AFTER payment',()=>{
 const s=game();const source=built(s,'customs_warehouse',1,'soma',{contrabandStock:2});
 const shop=built(s,'rare_goods_shop',2,'soma',{fixedIncome:2});
 s.players[0].suspicion=3;s.players[0].influence=0;
 const before=snap(s),a=delivery(source.id,shop.id);
 assert.equal(G.executeDelivery(s,a).reason,'arrest-worker');
 assert.equal(snap(s),before);
 const offender=s.players[0].workers[1].id;
 const done=G.executeDelivery(s,{...a,arrestWorkerId:offender});
 assert.equal(done.ok,true);assert.equal(done.arrested,true);
 assert.equal(s.players[0].capital,103);assert.equal(s.players[1].capital,101);
 assert.equal(s.players[2].capital,101);assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].workers[1].jailed,true);assert.equal(s.players[0].suspicion,0);
 assert.equal(s.constructions.find(c=>c.id===source.id).contrabandStock,1);
});

// The 2026-11-18 migration initially left one old selector in deliveryPickupSources.
// That made EVERY browser route fail even though all core unit tests passed.
test('delivery UI never calls removed contraband selector during route rendering',async()=>{
  const app=await readFile(new URL('../app.js',import.meta.url),'utf8');
  assert.doesNotMatch(app,/completedCustomsWarehouses\s*\(/);
  assert.match(app,/completedContrabandSources\(state\)/);
});
