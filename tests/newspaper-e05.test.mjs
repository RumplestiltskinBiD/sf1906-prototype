import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=s=>JSON.stringify(s);
function game({round=1,issue='E05'}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=[issue];s.newsDeck=s.newsDeck.filter(id=>id!==issue);
 s.newsLastResolvedRound=round-1;s.developmentComplete=false;
 s.developmentPlayer=0;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.pendingConstruction=null;s.pendingWorkerAction=null;
 s.players.forEach((p,i)=>{
  p.capital=40;p.prestige=0;p.influence=[5,9,13][i];
  p.bureauContracts=0;p.portfolio=[];p.workersLeft=3;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;s.constructions=[];
 return s;
}
function site(s,id,projectId,playerId=0,districtId='civic',status='complete',completedRound=1){
 const c={id,projectId,playerId,districtId,status,startedRound:1,
  completedRound:status==='complete'?completedRound:null,
  materialsDelivered:status==='complete'?[...(G.projectById(projectId)?.materials||[])]:[],
  warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function start(s,projectId,districtId='civic'){
 s.players[0].workers[0].districtId=districtId;
 if(!G.isStandardProject(projectId))s.players[0].portfolio.push(projectId);
 return G.beginConstruction(s,0,projectId,districtId);
}
function makeEndable(s){
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 s.activationMainActionUsed=true;s.newsDeck=['E06',...s.newsDeck.filter(id=>id!=='E06')];
 s.pendingConstruction=null;s.pendingWorkerAction=null;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];
 s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 return s;
}

test('E05 activates approved civic article, not old once-per-player +1 for any market-only station',()=>{
 const s=game(),c=newsCard('E05');
 assert.equal(c.title,'ГОРОД БЛАГОДАРИТ СВОИХ ЗАЩИТНИКОВ!');
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.target,'none');assert.equal(c.delta,0);
 assert.equal(c.frequency,'oncePerYear');assert.equal(c.defense,null);
 assert.deepEqual(G.E05_SUBSIDIZED_STANDARD_IDS,['std_clinic','std_fire','std_police']);
 assert.deepEqual(G.E05_RECOGNIZED_SERVICE_IDS,
  ['std_clinic','clinic','std_fire','firehouse','std_police','police']);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.deepEqual(G.newsPreview(s).threatened,[]);
 assert.deepEqual(G.newsPreview(s).protected,[]);
 assert.equal(G.takeNewspaperEmergency(s,0,'civic').reason,'not-negative-event');
});
for(const projectId of G.E05_SUBSIDIZED_STANDARD_IDS){
 for(const land of [0,3,6]){
  test('E05 '+projectId+' starts for $0 land and $0 fee when land='+land,()=>{
   const s=game();s.districts.civic.landValue=land;
   const original=s.players[0].capital;
   const check=G.constructionEligibility(s,0,projectId,'civic');
   assert.equal(check.ok,true,check.reasons?.join(', '));
   assert.equal(check.landCost,0);assert.equal(check.standardFee,0);
   assert.equal(check.cost,0);assert.equal(check.e05Subsidy,true);
   const result=start(s,projectId);
   assert.equal(result.ok,true,JSON.stringify(result));
   assert.equal(result.e05Subsidy,true);
   assert.equal(result.cost,0);assert.equal(result.landCost,0);assert.equal(result.standardFee,0);
   assert.equal(s.players[0].capital,original);
   assert.equal(result.construction.status,'under-construction');
   assert.deepEqual(result.construction.materialsDelivered,[]);
   assert.equal(G.canCompleteConstruction(s,result.construction.id).ok,false);
   assert.equal(s.players[0].workersLeft,2);
   assert.equal(s.players[0].workers[0].used,true);
   assert.deepEqual(s.players[0].portfolio,[]);
   assert.deepEqual(G.projectById(projectId).materials,['Lumber','Masonry','Steel']);
  });
 }
}
test('E05 free registration works with $0 capital but does NOT supply any materials',()=>{
 const s=game();s.players[0].capital=0;
 const r=start(s,'std_clinic');
 assert.equal(r.ok,true);assert.equal(r.cost,0);
 assert.equal(s.players[0].capital,0);
 assert.equal(G.canCompleteConstruction(s,r.construction.id).ok,false);
 assert.equal(s.constructions[0].materialsDelivered.length,0);
});
test('E05 does not consume a Construction Bureau land contract when both costs already zero',()=>{
 const s=game();s.players[0].bureauContracts=1;s.districts.civic.landValue=5;
 const c=G.constructionEligibility(s,0,'std_fire','civic');
 assert.equal(c.e05Subsidy,true);assert.equal(c.bureauDiscount,0);
 assert.equal(c.cost,0);
 assert.equal(start(s,'std_fire').ok,true);
 assert.equal(s.players[0].bureauContracts,1);
});
test('ordinary std_warehouse retains BOTH land and fee, even in E05',()=>{
 const s=game(),land=s.districts.civic.landValue;
 const check=G.constructionEligibility(s,0,'std_warehouse','civic');
 assert.equal(check.e05Subsidy,false);assert.equal(check.landCost,land);
 assert.equal(check.standardFee,G.STANDARD_PROJECT_FEE);
 const r=start(s,'std_warehouse');
 assert.equal(r.ok,true);
 assert.equal(r.cost,land+G.STANDARD_PROJECT_FEE);
 assert.equal(s.players[0].capital,40-land-G.STANDARD_PROJECT_FEE);
});
for(const projectId of ['clinic','firehouse','police']){
 test('E05 never discounts market '+projectId+' (only start-of-standard-service costs)',()=>{
  const s=game(),land=s.districts.civic.landValue,pr=G.projectById(projectId);
  assert.ok(pr);
  s.players[0].portfolio=[projectId];
  const c=G.constructionEligibility(s,0,projectId,'civic');
  assert.equal(c.e05Subsidy,false);
  assert.equal(c.landCost,land);assert.equal(c.standardFee,0);
  const r=start(s,projectId);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.cost,land);
  assert.equal(s.players[0].capital,40-land);
 });
}
test('outside E05 these same standard services still pay both costs',()=>{
 for(const issue of ['E04','E06']){
  for(const id of G.E05_SUBSIDIZED_STANDARD_IDS){
   const s=game({issue}),check=G.constructionEligibility(s,0,id,'civic');
   assert.equal(check.e05Subsidy,false);
   assert.equal(check.landCost,s.districts.civic.landValue);
   assert.equal(check.standardFee,G.STANDARD_PROJECT_FEE);
  }
 }
});
test('a resolved E05 year immediately restores normal prices for future start actions',()=>{
 const s=game();assert.equal(G.constructionEligibility(s,0,'std_fire','civic').cost,0);
 assert.equal(G.resolveNewspaper(s).ok,true);
 const check=G.constructionEligibility(s,0,'std_fire','civic');
 assert.equal(check.e05Subsidy,false);
 assert.equal(check.cost,s.districts.civic.landValue+G.STANDARD_PROJECT_FEE);
});
test('E05 never retroactively refunds an older ongoing construction or its land contract',()=>{
 const s=game({round:2});const older=site(s,'OLD','std_fire',0,'civic','under-construction');
 older.startedRound=1;s.players[0].capital=17;s.players[0].bureauContracts=1;
 const before=snap(s);const preview=G.e05RecognitionPreview(s);
 assert.equal(preview.perPlayer[0].count,0);
 assert.equal(s.players[0].capital,17);
 assert.equal(s.players[0].bureauContracts,1);
 assert.equal(snap(s),before);
});
test('E05 subsidy never bypasses normal action/movement, site, and service-family exclusions',()=>{
 const s=game();s.players[0].workers[0].districtId='civic';
 const distant=G.constructionEligibility(s,0,'std_fire','outerrichmond');
 assert.equal(distant.ok,false);assert.ok(distant.reasons.some(x=>x.includes('сосед')));
 site(s,'F','firehouse',1,'civic','under-construction');
 const conflict=G.constructionEligibility(s,0,'std_fire','civic');
 assert.equal(conflict.e05Subsidy,true);assert.equal(conflict.cost,0);
 assert.equal(conflict.ok,false);assert.ok(conflict.reasons.some(x=>x.includes('учреждение')));
 const before=snap(s);
 assert.equal(G.beginConstruction(s,0,'std_fire','civic').ok,false);
 assert.equal(snap(s),before);
 s.constructions=[];
 s.activationMainActionUsed=true;
 assert.equal(G.beginConstruction(s,0,'std_fire','civic').ok,false);
 s.activationMainActionUsed=false;
 s.activeWorkerId=null;
 assert.equal(G.beginConstruction(s,0,'std_fire','civic').ok,false);
});
test('E05 does not waive a commercial warehouse, civic-oriented mixed project or nonservice cost',()=>{
 for(const id of ['warehouse','orphanage','publicworks']){
  const s=game();s.players[0].portfolio=[id];
  const check=G.constructionEligibility(s,0,id,'civic');
  assert.equal(check.e05Subsidy,false);
  assert.equal(check.landCost,s.districts.civic.landValue);
 }
});
test('recognition preview counts only own COMPLETE six IDs (including earlier years), not civic lookalikes',()=>{
 const s=game({round:4});
 site(s,'A','std_fire',0,'civic','complete',1);
 site(s,'B','clinic',0,'soma','complete',2);
 site(s,'C','police',0,'mission','complete',4);
 site(s,'D','std_clinic',0,'western','under-construction');
 site(s,'E','std_police',1,'civic','complete',1);
 site(s,'F','orphanage',0,'civic','complete',3);
 site(s,'G','std_warehouse',0,'soma','complete',2);
 site(s,'H','warehouse',0,'mission','complete',3);
 site(s,'I','publicworks',0,'western','complete',4);
 const preview=G.e05RecognitionPreview(s);
 assert.equal(preview.active,true);
 assert.deepEqual(preview.perPlayer.map(x=>x.count),[3,1,0]);
 assert.deepEqual(preview.perPlayer[0].sites.map(x=>x.constructionId),['A','B','C']);
 assert.equal(preview.perPlayer[0].sites[0].completedRound,1);
 assert.equal(G.newsPreview(s).e05.perPlayer[0].count,3);
});
for(const count of [0,1,2,4,6]){
 test('exactly '+count+' completed service copies grant '+count+' INFLUENCE steps once',()=>{
  const s=game(),ids=G.E05_RECOGNIZED_SERVICE_IDS;
  for(let i=0;i<count;i++)site(s,'S'+i,ids[i],0,['civic','soma','mission','western','pacific','northbeach'][i]);
  const start=s.players[0].influence;
  const expected=G.moveInfluence(structuredClone(s),0,count);
  const r=G.resolveNewspaper(s);
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(s.players[0].influence,expected.to,
    'real Influence steps must leap over opponent-occupied positions');
  assert.equal(r.report.e05.awards[0].influenceFrom,start);
  assert.equal(r.report.e05.awards[0].influenceTo,expected.to);
  assert.equal(r.report.e05.awards[0].count,count);
  assert.equal(r.report.e05.awards[0].influenceSteps,count);
  assert.equal(r.report.e05.totalSites,count);
  assert.equal(s.newsLastResolvedRound,1);
  assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
 });
}
test('all three players receive independently; owner only, even with overlapping district sites',()=>{
 const s=game();
 site(s,'A','std_fire',0,'civic');site(s,'B','firehouse',0,'soma');
 site(s,'C','std_police',1,'mission');site(s,'D','clinic',1,'western');
 site(s,'E','std_clinic',2,'civic');
 const old=s.players.map(p=>p.influence);
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.deepEqual(r.report.e05.awards.map(a=>a.count),[2,2,1]);
 assert.equal(s.players[0].influence,old[0]+2);
 assert.equal(s.players[1].influence,old[1]+2);
 assert.equal(s.players[2].influence,old[2]+1);
 assert.deepEqual(Object.keys(r.report.changes),['0','1','2']);
 assert.deepEqual(r.report.entries,[],'legacy once per player no longer executes');
});
test('fixed current-year order controls sequential Influence occupancy skipping',()=>{
 const s=game();
 s.yearTurnOrder=[1,0,2];
 s.players[0].influence=6;s.players[1].influence=7;s.players[2].influence=9;
 site(s,'A','std_police',0);site(s,'B','std_clinic',1,'mission');
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.deepEqual(r.report.e05.order,[1,0,2]);
 assert.equal(r.report.e05.awards[0].playerId,1);
 assert.equal(r.report.e05.awards[0].influenceFrom,7);
 assert.equal(r.report.e05.awards[0].influenceTo,8);
 assert.equal(r.report.e05.awards[1].influenceFrom,6);
 assert.equal(r.report.e05.awards[1].influenceTo,7);
 assert.deepEqual(s.yearTurnOrder,[1,0,2],'issue must not mutate current order');
});
test('year-end E05 reward changes NEXT year order without extra worker action or VP',()=>{
 const s=game();
 s.players[0].influence=5;s.players[1].influence=7;s.players[2].influence=9;
 for(const [i,d] of ['civic','soma','mission','western','pacific','northbeach'].entries())
  site(s,'S'+i,G.E05_RECOGNIZED_SERVICE_IDS[i],0,d);
 const initial=s.players.map(p=>({capital:p.capital,prestige:p.prestige}));
 makeEndable(s);
 const r=G.cleanupMarket(s,{rng:()=>.31});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.round,2);
 assert.equal(s.newsArchive.find(a=>a.cardId==='E05').e05.awards[0].count,6);
 assert.equal(s.yearTurnOrder[0],0,'next-year order uses E05 Influence');
 assert.equal(s.players[0].influence,13,'occupied 7 and 9 must be skipped across six real steps');
 assert.deepEqual(s.players.map(p=>p.prestige),initial.map(p=>p.prestige),'E05 itself awards no VP');
 assert.equal(s.newsCurrentIds[0],'E06');
 assert.equal(G.isE05CivicSubsidy(s,'std_fire'),false);
 const old=snap(s);G.ensureNewspaper(s);
 assert.equal(snap(s),old,'save reload migration cannot re-award E05');
});
test('1905 terminal-year E05 still awards all Influence despite reduced future use',()=>{
 const s=game({round:6});
 site(s,'P','std_police',0);site(s,'F','firehouse',0,'soma');
 const inf=s.players[0].influence;
 makeEndable(s);
 const r=G.cleanupMarket(s,{rng:()=>.31});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.finished,true);assert.equal(s.finished,true);
 assert.equal(s.round,6);
 assert.equal(s.players[0].influence,inf+2);
 assert.equal(s.newsArchive.at(-1).e05.awards[0].count,2);
 assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
});
test('reloaded mid-year E05 does not change existing buildings, incomes, cards or capital',()=>{
 const s=game({round:3});
 site(s,'X','std_fire',0,'civic','complete',1);
 const old=snap(s);G.ensureNewspaper(s);G.ensureNewspaper(s);
 assert.equal(snap(s),old);
 const reloaded=JSON.parse(snap(s));
 assert.equal(G.e05RecognitionPreview(reloaded).perPlayer[0].count,1);
 assert.equal(G.resolveNewspaper(reloaded).ok,true);
 assert.equal(reloaded.newsArchive.length,1);
 assert.equal(G.resolveNewspaper(reloaded).reason,'already-resolved');
});
test('legacy historical E05 archive remains untouched and does not double-award',()=>{
 const s=game({round:3});
 s.newsArchive=[{round:1,year:1900,cardId:'E05',
   title:'Город признаёт заслуги служащих',entries:[{playerId:0,actual:1}],
   changes:{0:{influence:1,capital:0,prestige:0}}}];
 const previous=structuredClone(s.newsArchive);
 G.ensureNewspaper(s);
 assert.deepEqual(s.newsArchive,previous);
 assert.equal(s.players[0].influence,5);
});
