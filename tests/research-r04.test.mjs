import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {researchCardById} from '../research-cards.js';

const snap=state=>JSON.stringify(state);
function game({funded=false}={}){
 const s=G.createInitialState({rng:()=>0.3});
 s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=50;p.prestige=0;p.advertisingIncomeBonus=0;});
 s.newsCurrentIds=['E02'];s.newsC01Incident=null;s.newsH01Incident=null;s.newsH02Incident=null;
 s.pendingReinforcements=[];s.pendingBreadProduction=[];s.pendingPressCampaigns=[];
 s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];s.newsE01Contracts=null;
 s.constructions=[];
 if(funded)Object.assign(s.research.R04,{status:'funded',holderId:2,fundedRound:1});
 return s;
}
function built(id,projectId,districtId='civic',playerId=0,status='complete',extras={}){
 return {id,projectId,districtId,playerId,status,
  startedRound:1,completedRound:status==='complete'?1:null,
  materialsDelivered:status==='complete'?[...G.projectById(projectId).materials]:[],
  warehouseInventory:[],...extras};
}
function fund(s){
 Object.assign(s.research.R04,{status:'held',holderId:0,fundedRound:null});
 const result=G.fundResearch(s,0,'R04');
 assert.equal(result.ok,true,JSON.stringify(result));
 return result;
}
test('R04 card registry defines annual $1 per eligible clinic, cap one, global ownership and both service variants',()=>{
 const card=researchCardById('R04');
 assert.equal(card.fundingCost,4);
 assert.deepEqual(card.sponsorReward,{vp:2,influence:1});
 assert.equal(card.effect.type,'clinic-income-if-near-residential');
 assert.equal(card.effect.annualIncomePerEligibleClinic,1);
 assert.equal(card.effect.maxIncomePerClinicPerYear,1);
 assert.equal(card.effect.residenceCanBelongToAnyPlayer,true);
 assert.equal(card.effect.eligibleDistrictScope,'own-or-adjacent');
 assert.equal(card.effect.eligibleResidentialStatus,'complete');
 assert.deepEqual(G.STANDARD_SERVICE_FAMILIES.clinic,['clinic','std_clinic']);
});
test('funding requires one completed clinic, not a home, and does not retrospectively transfer income',()=>{
 const s=game();
 Object.assign(s.research.R04,{status:'held',holderId:0,fundedRound:null});
 let before=snap(s);
 assert.equal(G.fundResearch(s,0,'R04').reason,'research-prerequisite');
 assert.equal(snap(s),before);
 s.constructions.push(built('M','std_clinic','civic',2,'under-construction'));
 assert.equal(G.researchFundingPreview(s,0,'R04').completed,0);
 s.constructions[0].status='complete';
 const bank=s.players[0].capital,owner=s.players[2].capital;
 const r=G.fundResearch(s,0,'R04');
 assert.equal(r.ok,true);assert.equal(r.cost,4);assert.equal(r.vp,2);assert.equal(r.influence.steps,1);
 assert.equal(s.players[0].capital,bank-4);
 assert.equal(s.players[2].capital,owner,'no immediate retrospective annual bonus');
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),0,'no nearby finished home yet');
 before=snap(s);
 assert.equal(G.fundResearch(s,0,'R04').reason,'already-funded');
 assert.equal(snap(s),before);
});
test('held or available R04 is inert even when qualifying homes already exist',()=>{
 for(const mode of ['available','held']){
  const s=game();
  s.constructions=[built('C','clinic','civic'),built('H','tenement','civic',1)];
  if(mode==='held')Object.assign(s.research.R04,{status:'held',holderId:0,fundedRound:null});
  assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),0);
  assert.equal(G.buildingIncome(s,0),0);
  assert.equal(G.roundIncome(s,0),G.BASE_ROUND_INCOME);
 }
});
test('both full and standard clinic receive global $1 from ANY owner completed residence in same or adjacent district',()=>{
 for(const clinicId of ['clinic','std_clinic']){
  for(const place of ['civic',...G.districtNeighbors('civic').filter(id=>G.districtById(id)?.buildable!==false).slice(0,2)]){
   const s=game({funded:true});
   s.constructions=[built('C',clinicId,'civic',0),built('H','tenement',place,2)];
   assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),1,clinicId+' '+place);
   assert.equal(G.buildingIncome(s,0),1,clinicId+' '+place);
   assert.equal(G.roundIncome(s,0),G.BASE_ROUND_INCOME+1);
   assert.equal(s.players[2].capital,50,'neighbor residence owner is not paid clinic bonus');
  }
 }
});
test('mixed residential buildings qualify, including those with zero personal income',()=>{
 for(const id of ['bakery','orphanage','polytechnic_campus','workers_complex','wagonboarding']){
  const s=game({funded:true});
  assert.equal(G.projectTypes(id).includes('Жилое'),true,id);
  s.constructions=[built('C','std_clinic','civic',0),built('H',id,'civic',1)];
  assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),1,id);
  assert.equal(G.buildingIncome(s,0),1,'clinic receives income despite residence owner '+id);
 }
});
test('one clinic never multiplies its bonus by several residences or their owners',()=>{
 const s=game({funded:true});
 s.constructions=[built('C','clinic','civic',1),built('H1','tenement','civic',0),
  built('H2','luxury','civic',2),built('H3','orphanage','civic',1)];
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),1);
 assert.equal(G.buildingIncome(s,1),1+G.projectById('orphanage').income);
 assert.equal(G.roundIncome(s,1),G.BASE_ROUND_INCOME+1);
});
test('separate clinics independently earn $1 each for one nearby residence, including rival-owned clinics',()=>{
 const s=game({funded:true});
 const adj=G.districtNeighbors('civic').find(id=>G.districtById(id)?.buildable!==false);
 s.constructions=[built('C1','clinic','civic',0),built('C2','std_clinic',adj,0),
  built('H','tenement','civic',1),built('RIVAL','std_clinic','mission',2),
  built('HOME2','tenement','mission',1)];
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),1);
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[1]),1);
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[3]),1);
 assert.equal(G.buildingIncome(s,0),2);
 assert.equal(G.buildingIncome(s,2),1);
});
test('incomplete, closed, redeveloped or distant residences do not qualify; nearby business-only building is ineligible',()=>{
 const s=game({funded:true});
 const distant=G.DISTRICTS.find(d=>d.buildable!==false&&d.id!=='civic'&&!G.districtNeighbors('civic').includes(d.id)).id;
 const clinic=built('C','std_clinic','civic',0);
 const residence=built('H','tenement','civic',1,'under-construction');
 s.constructions=[clinic,residence,built('B','bank','civic',2),built('D','tenement',distant,2)];
 assert.equal(G.researchClinicIncomeBonus(s,clinic),0);
 residence.status='complete';
 assert.equal(G.researchClinicIncomeBonus(s,clinic),1);
 residence.status='abandoned';
 assert.equal(G.researchClinicIncomeBonus(s,clinic),0);
 residence.status='redeveloped';
 assert.equal(G.researchClinicIncomeBonus(s,clinic),0);
 clinic.status='under-construction';residence.status='complete';
 assert.equal(G.researchClinicIncomeBonus(s,clinic),0,'unfinished clinic earns nothing');
 clinic.status='complete';
 assert.equal(G.researchClinicIncomeBonus(s,clinic),1);
 clinic.status='redeveloped';
 assert.equal(G.researchClinicIncomeBonus(s,clinic),0);
});
test('current income is recalculated as neighborhood changes and follows normal penalties/loans',()=>{
 const s=game({funded:true});
 const clinic=built('C','std_clinic','civic',0);
 const residence=built('H','tenement','civic',1,'under-construction');
 s.constructions=[clinic,residence];
 const initial=G.roundIncome(s,0);
 assert.equal(initial,G.BASE_ROUND_INCOME);
 residence.status='complete';
 assert.equal(G.roundIncome(s,0),initial+1);
 s.players[0].advertisingIncomeBonus=2;
 s.players[0].fireIncomePenalty=1;
 s.players[0].breadIncomePenalty=1;
 assert.equal(G.grossRoundIncome(s,0),G.BASE_ROUND_INCOME+1+2);
 assert.equal(G.roundIncome(s,0),G.BASE_ROUND_INCOME+1+2-2);
 residence.status='redeveloped';
 assert.equal(G.roundIncome(s,0),G.BASE_ROUND_INCOME+2-2);
});
test('the actual annual transition pays one R04 bonus exactly once and cannot re-enter settlement',()=>{
 const s=game({funded:true});
 s.constructions=[built('C','clinic','civic',0),built('H','tenement','civic',1)];
 s.developmentComplete=true;
 const capital=s.players.map(p=>p.capital);
 const expected=s.players.map(p=>G.roundIncome(s,p.id));
 const result=G.cleanupMarket(s,{rng:()=>0.99});
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(s.round,2);
 assert.equal(s.phase,'declare');
 s.players.forEach((p,i)=>assert.equal(p.capital,capital[i]+expected[i],'year settlement '+i));
 assert.equal(G.cleanupMarket(s).ok,false,'second entry cannot pay income again');
 s.players.forEach((p,i)=>assert.equal(p.capital,capital[i]+expected[i],'no double settlement '+i));
});
test('JSON reload preserves funded research and automatically derives bonus, without repeating funding',()=>{
 const s=game({funded:true});
 s.constructions=[built('C','clinic','civic',2),built('H','orphanage','civic',1)];
 const saved=JSON.parse(snap(s));
 assert.deepEqual(G.validateResearchState(saved),[]);
 assert.equal(G.researchClinicIncomeBonus(saved,saved.constructions[0]),1);
 assert.equal(G.buildingIncome(saved,2),1);
 const frozen=snap(saved);
 assert.equal(G.fundResearch(saved,2,'R04').reason,'already-funded');
 assert.equal(snap(saved),frozen);
});
test('other medicines and fire service protection do not become residential or clinic R04 bonuses',()=>{
 const s=game({funded:true});
 s.constructions=[built('C','std_clinic','civic',0),built('P','chinese_herbal_pharmacy','civic',1),
  built('F','std_fire','civic',2),built('T','shops','civic',0)];
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[0]),0);
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[1]),0,'pharmacy is not a full clinic');
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[2]),0);
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions[3]),0);
 assert.equal(G.fireServiceProtection(s,'std_fire'),1,'R04 cannot activate R03');
 assert.equal(G.buildingIncome(s,0),G.projectById('shops').income);
});