import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {RESEARCH_CARDS} from '../research-cards.js';

const json=x=>JSON.stringify(x);
const restored=x=>JSON.parse(json(x));
function active(){
 const s=G.createInitialState({rng:()=>0.31});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];
 s.pendingSailorRecruitments=[];s.pendingReinforcements=[];
 s.newsCurrentIds=['E02'];s.newsE02TradeWeek={round:s.round,events:[]};
 s.newsF04Notices=null;s.newsE01Contracts=null;
 s.players.forEach(p=>{p.capital=100;p.workersLeft=3;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});});
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];s.actionSpaceOccupancy={};
 return s;
}
function construction(id,projectId,districtId,owner,status='complete',extras={}){
 return {id,projectId,districtId,playerId:owner,status,startedRound:1,
  completedRound:status==='complete'?1:null,
  materialsDelivered:status==='complete'?[...G.projectById(projectId).materials]:[],
  warehouseInventory:[],...extras};
}
function campus(id,owner){
 return construction(id,'polytechnic_campus','civic',owner);
}
function selectReady(s,pid){
 const w=G.playerWorkers(s,pid).find(w=>!w.used&&!w.jailed);
 assert.ok(w,'must have a usable worker for '+pid);
 const result=G.selectWorker(s,pid,w.id);
 assert.equal(result.ok,true,JSON.stringify(result));
 return w;
}
function moveNormally(s,pid){
 const worker=G.activeWorker(s,pid);
 const to=G.workerReachableDistricts(s,pid,worker.id).find(id=>id!==worker.districtId);
 assert.ok(to,'worker must have an adjacent normal district');
 const action=G.moveWorker(s,pid,to);
 assert.equal(action.ok,true,JSON.stringify(action));
}
function prepareR05(){
 const cycle=[0.2,0.55,0.95],calls={value:0};
 return ()=>cycle[(calls.value++)%cycle.length];
}

test('Stage 9: actual nine activations per year for three players, full 1900–1905 lifecycle with all R01–R08 acquired and funded',()=>{
 const s=G.createInitialState({rng:()=>0.42});
 for(let i=0;i<3;i++){
  G.revealStarterDraft(s);
  const hand=s.starterDraftHands[i];
  G.toggleStarterDraftCard(s,hand[0].uid);G.toggleStarterDraftCard(s,hand[1].uid);
  assert.equal(G.confirmStarterDraft(s).ok,true);
 }
 // This is a high-capital deterministic INTEGRATION/STRESS fixture, not a
 // claim of natural balance or of running physical playtest economics.
 s.players.forEach(p=>p.capital=150);
 const currentNews=s.newsCurrentIds?.[0];
 s.newsDeck=['E05','E02','H04','F01','C04','E01'].filter(id=>id!==currentNews).slice(0,5);
 const firstForecastRng=prepareR05();
 let take=0,advanceGoalId=null;
 for(let year=1;year<=6;year++){
   assert.equal(s.round,year);
   assert.equal(s.phase,'declare','real City Hall reached for '+year);
   if(year===3){
     const pid=G.currentDeclarer(s);
     const slot=s.goalMarket.findIndex(Boolean);
     const prevCash=s.players[pid].capital;
     const goal=G.claimCityGoal(s,slot,{takeAdvance:true});
     assert.equal(goal.ok,true,JSON.stringify(goal));
     assert.equal(s.players[pid].capital,prevCash+3);
     advanceGoalId=goal.goalId;
   }
   for(let i=0;i<3;i++)assert.equal(G.passDeclaration(s).ok,true);
   assert.equal(G.beginBidding(s).ok,true);
   assert.equal(G.resolveTenders(s).ok,true);
   assert.equal(s.phase,'development');
   let turns=0;
   const newSites=new Set();
   while(!s.developmentComplete){
     const pid=G.currentDeveloper(s);
     selectReady(s,pid);
     if(year===1&&take<8){
       const id=RESEARCH_CARDS[take++].id;
       const grab=G.acquireResearch(s,pid,id,{kind:'civic'});
       assert.equal(grab.ok,true,JSON.stringify(grab));
       assert.equal(s.research[id].status,'held');
       assert.equal(s.players[pid].workersLeft,3-G.playerWorkers(s,pid).filter(w=>w.used).length);
       if(id!=='R03'&&id!=='R04'){
         const finances=G.fundResearch(s,pid,id,id==='R05'?{rng:firstForecastRng}:{});
         assert.equal(finances.ok,true,JSON.stringify(finances));
       }
     }else if(year===2&&!newSites.has(pid)){
       const spec=pid===0
         ?{project:'std_fire',district:'soma',node:'pacificmail',route:['soma']}
         :pid===1
         ?{project:'std_fire',district:'civic',node:'southernpacific',route:['soma','civic']}
         :{project:'std_clinic',district:'civic',node:'chinabasin',route:['missionbay','soma','civic']};
       const begun=G.beginConstruction(s,pid,spec.project,spec.district);
       assert.equal(begun.ok,true,JSON.stringify(begun));
       newSites.add(pid);
       const delivery=G.executeDelivery(s,{
         playerId:pid,source:{kind:'node',id:spec.node},haulerId:'standard',
         cargo:['Lumber','Masonry','Steel'],route:spec.route,
         drops:[{kind:'construction',id:begun.construction.id,materials:['Lumber','Masonry','Steel']}]
       });
       assert.equal(delivery.ok,true,JSON.stringify(delivery));
       assert.equal(begun.construction.status,'complete','physical materials complete new service');
     }else moveNormally(s,pid);
     // R03/R04 were genuinely obtained before facilities existed. Their
     // holders may fund them later, as a FREE action after completing a main.
     for(const id of ['R03','R04']){
       if(s.research[id].status==='held'&&s.research[id].holderId===pid
         &&G.researchFundingPreview(s,pid,id).ok){
         const r=G.fundResearch(s,pid,id);
         assert.equal(r.ok,true,JSON.stringify(r));
       }
     }
     const end=G.endActivation(s,pid);
     assert.equal(end.ok,true,JSON.stringify(end));
     turns++;
     assert.ok(turns<=9,'never duplicate player activation slots');
   }
   assert.equal(turns,9);
   assert.ok(s.players.every(p=>p.workersLeft===0));
   assert.deepEqual(G.validateResearchState(s),[]);
   assert.equal(new Set(s.players.map(p=>p.influence)).size,3);
   if(year===1){
     assert.equal(take,8);
     assert.equal(s.research.R03.status,'held');
     assert.equal(s.research.R04.status,'held');
     assert.equal(s.research.R05.status,'funded');
     assert.ok(G.researchLogisticsForecast(s));
   }
   if(year===2){
     assert.equal(newSites.size,3);
     assert.ok(RESEARCH_CARDS.every(card=>s.research[card.id].status==='funded'),
       'all 8 research genuinely funded by their holder after real service completions');
     assert.equal(G.fireServiceProtection(s,'std_fire'),2);
   }
   const forecast=G.researchLogisticsForecast(s);
   const previousCash=s.players.map(p=>p.capital);
   const finish=G.cleanupMarket(s,{rng:()=>0.7});
   assert.equal(finish.ok,true,JSON.stringify(finish));
   if(year<6){
     assert.equal(s.round,year+1);assert.equal(s.phase,'declare');
     assert.ok(s.players.every(p=>p.workersLeft===3));
     if(forecast){
       const arrival=G.researchLogisticsArrivalReport(s);
       assert.ok(arrival);
       assert.deepEqual(arrival.planned,forecast.supply);
       assert.equal(arrival.round,year+1);
     }
   }else{
     assert.equal(finish.finished,true);
     assert.equal(s.finished,true);assert.equal(s.phase,'finished');
     assert.equal(s.round,6);
     assert.equal(G.researchLogisticsForecast(s),null);
   }
   assert.ok(s.players.every(p=>Number.isFinite(p.capital)));
   assert.ok(s.players.every(p=>Number.isFinite(p.prestige)));
 }
 assert.ok(advanceGoalId,'a city goal was accepted with real R06 advance');
 assert.deepEqual(G.validateResearchState(s),[]);
 assert.ok(RESEARCH_CARDS.every(card=>s.research[card.id].status==='funded'));
});

test('Stage 9 combined global effects: R02, R03, R04, R07, R08 coexist without duplicate price, service or risk',()=>{
 const s=active();
 s.research.R02={status:'funded',holderId:2,fundedRound:1};
 s.research.R03={status:'funded',holderId:1,fundedRound:1};
 s.research.R04={status:'funded',holderId:2,fundedRound:1};
 s.research.R07={status:'funded',holderId:0,fundedRound:1};
 s.research.R08={status:'funded',holderId:1,fundedRound:1};
 s.constructions=[
  construction('F-C','std_fire','civic',0),
  construction('F-S','std_fire','soma',1),
  construction('MED','std_clinic','civic',2),
  construction('HOME','tenement','soma',1),
  construction('UP','polytechnic_campus','civic',0,'under-construction',
    {materialsDelivered:['Lumber','Lumber','Masonry','Masonry']})
 ];
 assert.equal(G.fireServiceProtection(s,'std_fire'),2);
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions.find(c=>c.id==='MED')),1);
 assert.equal(G.purchaseMaterialUnitPrice(s,{kind:'node',id:'broadway'},'Lumber'),2);
 assert.equal(G.purchaseMaterialUnitPrice(s,{kind:'supplier',id:'engle-lumber'},'Lumber'),4);
 assert.equal(G.purchaseMaterialUnitPrice(s,{kind:'node',id:'broadway'},'Masonry'),1);
 assert.equal(G.standardProjectFee(s,'std_clinic'),3);
 assert.equal(G.standardProjectFee(s,'std_fire'),2);
 const riskBefore=G.districtRisk(s,'civic');
 assert.equal(G.constructionReinforcementOption(s,'UP').ok,true);
 assert.equal(G.completeConstruction(s,s.constructions.find(c=>c.id==='UP')).reason,'reinforcement-choice-required');
 assert.deepEqual(s.pendingReinforcements,['UP']);
 const cash=s.players[0].capital;
 const done=G.resolveReinforcementChoice(s,'UP',true);
 assert.equal(done.ok,true,JSON.stringify(done));
 assert.equal(s.players[0].capital,cash-2);
 assert.equal(s.constructions.find(c=>c.id==='UP').earthquakeReinforcement,1);
 assert.equal(G.districtRisk(s,'civic').earthquake.raw,riskBefore.earthquake.raw,
   'R02 cancels +1 U from campus while fire & medical effects remain independent');
 assert.equal(G.fireServiceProtection(s,'std_fire'),2);
 assert.equal(G.researchClinicIncomeBonus(s,s.constructions.find(c=>c.id==='MED')),1);
 assert.equal(G.standardProjectFee(s,'std_clinic'),3);
 assert.deepEqual(s.pendingReinforcements,[]);
 const before=json(s);
 assert.equal(G.resolveReinforcementChoice(s,'UP',true).reason,'not-pending');
 assert.equal(json(s),before);
});

test('Stage 9 each physical action space admits only one main action a year; sibling copy and Civic remain free',()=>{
 const s=active();
 s.constructions=[construction('AD-A','ad_agency','civic',1),
                  construction('AD-B','ad_agency','civic',2),
                  campus('CAMP',2)];
 const beforeOwnerIncome=G.buildingIncome(s,1);
 assert.equal(G.useAdvertisingAgency(s,0,'AD-A').ok,true);
 assert.equal(G.actionSpaceOccupant(s,'AD-A'),0);
 assert.equal(G.actionSpaceOccupant(s,'AD-B'),null);
 assert.equal(G.buildingIncome(s,1),beforeOwnerIncome,'owner passive income not consumed by use');
 assert.equal(G.canUseFreeAction(s,0),true);
 assert.equal(G.endActivation(s,0).ok,true);
 selectReady(s,1);
 const before=json(s);
 assert.equal(G.useAdvertisingAgency(s,1,'AD-A').reason,'occupied');
 assert.equal(json(s),before,'rejected second placement must not change money, worker or state');
 assert.equal(G.useAdvertisingAgency(s,1,'AD-B').ok,true);
 assert.equal(G.actionSpaceOccupant(s,'AD-B'),1);
 assert.equal(G.endActivation(s,1).ok,true);
 selectReady(s,2);
 const research=G.acquireResearch(s,2,'R01',{kind:'civic'});
 assert.equal(research.ok,true,'Civic Center is not a single citywide physical building slot');
 assert.equal(s.research.R01.holderId,2);
 assert.deepEqual(s.actionSpaceOccupancy,{'AD-A':0,'AD-B':1});
 assert.equal(G.endActivation(s,2).ok,true);
});

test('Stage 9 combined JSON reload preserves held cards, pending R02, R05 manifest, R06 debt and past rewards',()=>{
 const s=active();s.round=3;
 s.research.R05={status:'held',holderId:0,fundedRound:null};
 assert.equal(G.fundResearch(s,0,'R05',{rng:prepareR05()}).ok,true);
 s.research.R02={status:'funded',holderId:2,fundedRound:2};
 s.research.R03={status:'held',holderId:1,fundedRound:null};
 s.research.R04={status:'funded',holderId:2,fundedRound:2};
 s.research.R06={status:'funded',holderId:1,fundedRound:2};
 s.research.R07={status:'funded',holderId:0,fundedRound:1};
 s.constructions=[construction('PENDING','polytechnic_campus','civic',0,'under-construction',
   {materialsDelivered:['Lumber','Lumber','Masonry','Masonry']})];
 s.pendingReinforcements=['PENDING'];
 // Construct an existing legitimate City Hall advance in the same saved game.
 s.phase='declare';s.declarationIndex=0;s.players[0].goalTakenRound=null;
 const slot=s.goalMarket.findIndex(Boolean);
 assert.equal(G.claimCityGoal(s,slot,{takeAdvance:true}).ok,true);
 s.phase='development';s.developmentPlayer=0;s.activationMainActionUsed=false;
 const initial=json(s),forecast=G.researchLogisticsForecast(s);
 assert.ok(forecast);
 const replay=restored(s);
 assert.deepEqual(G.validateResearchState(replay),[]);
 const snapshot=json(replay);
 G.ensureResearchState(replay);G.ensureResearchState(replay);
 assert.equal(json(replay),snapshot,'migration does not re-award or regenerate');
 assert.equal(json(replay),initial,'mixed game snapshot is lossless');
 assert.deepEqual(G.researchLogisticsForecast(replay),forecast);
 assert.equal(replay.players[0].goals[0].advanceAmount,3);
 assert.equal(replay.research.R03.status,'held');
 assert.equal(replay.research.R04.status,'funded');
 assert.deepEqual(replay.pendingReinforcements,['PENDING']);
 const vp=replay.players.map(p=>p.prestige),ownerCash=replay.players[0].capital;
 assert.equal(G.resolveReinforcementChoice(replay,'PENDING',false).ok,true);
 assert.equal(replay.players[0].capital,ownerCash);
 assert.deepEqual(replay.players.map(p=>p.prestige).slice(1),vp.slice(1));
 assert.deepEqual(replay.pendingReinforcements,[]);
 assert.deepEqual(G.researchLogisticsForecast(replay),forecast);
 assert.equal(G.fundResearch(replay,0,'R05').reason,'already-funded');
});

test('Stage 9 missing R03/R04 prerequisites and insufficient funds remain atomic while other globally funded cards apply',()=>{
 const s=active();
 s.research.R03={status:'held',holderId:0,fundedRound:null};
 s.research.R04={status:'held',holderId:0,fundedRound:null};
 s.research.R07={status:'funded',holderId:1,fundedRound:1};
 assert.equal(G.purchaseMaterialUnitPrice(s,{kind:'node',id:'broadway'},'Lumber'),2);
 let before=json(s);
 assert.equal(G.fundResearch(s,0,'R03').reason,'research-prerequisite');
 assert.equal(G.fundResearch(s,0,'R04').reason,'research-prerequisite');
 assert.equal(json(s),before);
 s.constructions=[construction('F1','std_fire','civic',1),construction('F2','std_fire','soma',2),
                  construction('C','std_clinic','civic',2)];
 s.players[0].capital=0;
 before=json(s);
 assert.equal(G.fundResearch(s,0,'R03').reason,'capital');
 assert.equal(G.fundResearch(s,0,'R04').reason,'capital');
 assert.equal(json(s),before,'no payout, grant or worker when cash is missing');
 assert.equal(G.fireServiceProtection(s,'std_fire'),1,'held R03 never upgrades real fire services');
});
