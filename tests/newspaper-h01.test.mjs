import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=x=>JSON.stringify(x);
function game({roll=1,count=3,round=1}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=['H01'];s.newsDeck=s.newsDeck.filter(id=>id!=='H01');
 s.newsLastResolvedRound=round-1;
 s.newsH01Incident=G.createH01Incident(round,()=> (roll-.5)/6);
 s.newsEmergency={};s.constructions=[];
 while(s.players.length<count){const id=s.players.length;s.players.push({
  ...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
  workers:G.createWorkers(id),portfolio:[],goals:[]});}
 s.yearTurnOrder=s.players.map(p=>p.id);
 s.developmentSlotsUsed=Array(count).fill(0);
 s.developmentComplete=false;s.developmentPlayer=0;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach((p,i)=>{p.capital=40;p.prestige=0;p.influence=30-i*6;});
 return s;
}
function build(s,id,projectId,districtId='chinatown',playerId=0,status='complete'){
 const c={id,projectId,districtId,playerId,status,startedRound:s.round,
  completedRound:status==='complete'?s.round:null,
  materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function active(s,pid=0,worker=0,district='financial'){
 s.phase='development';s.developmentComplete=false;
 s.developmentPlayer=pid;s.activationMainActionUsed=false;
 s.players[pid].workers[worker].districtId=district;
 s.activeWorkerId=s.players[pid].workers[worker].id;
}
function nextYear(s,nextCard='E02'){
 s.newsDeck=[nextCard,...s.newsDeck.filter(id=>id!==nextCard)];
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const result=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(result.ok,true,JSON.stringify(result));
 return result;
}
test('H01 active data and one initial focus; no obsolete tenement fine or emergency measure',()=>{
 const s=game(),card=newsCard('H01');
 assert.equal(card.designV2.status,'implemented-for-playtest');
 assert.equal(card.title,'ЭПИДЕМИЯ ОХВАТЫВАЕТ ГОРОДСКИЕ КВАРТАЛЫ!');
 assert.equal(card.delta,0);assert.equal(card.target,'none');
 assert.equal(card.defense,null);assert.equal(card.frequency,'oncePerYear');
 assert.equal(G.takeNewspaperEmergency(s,0,'chinatown').reason,'not-negative-event');
 assert.deepEqual(G.newsPreview(s).threatened,['chinatown']);
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.equal(G.newsPreview(s).h01.radius,0);
 assert.equal(G.newsPreview(s).h01.roll,1);
});
for(const roll of [1,2,3,4,5,6]){
 test('H01 D6 '+roll+' creates exactly one source and does not reroll on preview/load',()=>{
  const s=game({roll});
  assert.equal(s.newsH01Incident.roll,roll);
  assert.equal(s.newsH01Incident.districtId,G.H01_ORIGIN_DISTRICTS[roll-1]);
  assert.equal(s.newsH01Incident.radius,0);
  assert.deepEqual(s.newsH01Incident.yearReports,[]);
  const old=snap(s);
  for(let i=0;i<4;i++){G.ensureNewspaper(s,{rng:()=>.99});G.h01Preview(s);
    G.newsPreview(s);assert.equal(snap(s),old);}
 });
}
test('real new-game H01 D6 roll is immediate before City Hall actions',()=>{
 let found=null;
 for(let i=1;i<750;i++){
  let seed=i;const rng=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);
   t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const s=G.createInitialState({rng});if(s.newsCurrentIds[0]==='H01'){found=s;break;}
 }
 assert.ok(found);
 assert.equal(found.phase,'draft');assert.ok(found.newsH01Incident);
 assert.equal(found.newsH01Incident.startRound,1);
 assert.equal(found.newsH01Incident.radius,0);
 assert.deepEqual(G.h01InfectedDistrictIds(found),[found.newsH01Incident.districtId]);
});
test('graph-based radius grows once per year and does not cross closed districts',()=>{
 const s=game();
 assert.deepEqual(G.h01InfectedDistrictIds(s),['chinatown']);
 nextYear(s,'E02');
 assert.equal(s.newsH01Incident.radius,1);
 assert.deepEqual(new Set(G.h01InfectedDistrictIds(s)),
  new Set(['chinatown','northbeach','financial','pacific']));
 G.ensureNewspaper(s);G.newsPreview(s);
 assert.equal(s.newsH01Incident.radius,1,'reopening the game does not expand');
 nextYear(s,'E03');
 assert.equal(s.newsH01Incident.radius,2);
 assert.ok(G.h01InfectedDistrictIds(s).includes('civic'));
 assert.ok(G.h01InfectedDistrictIds(s).includes('marina'));
 assert.ok(!G.h01InfectedDistrictIds(s).includes('presidio'));
 assert.ok(!G.h01InfectedDistrictIds(s).includes('twinpeaks'));
 for(const id of G.h01InfectedDistrictIds(s))assert.equal(G.districtById(id)?.buildable,true,id);
});
test('yearly penalty is $2 per owner per unprotected infected district, independent of site count',()=>{
 const s=game();
 build(s,'A','residential_quarter','chinatown',0);
 build(s,'B','std_warehouse','chinatown',0);
 build(s,'C','std_fire','chinatown',1);
 build(s,'D','warehouse','financial',0);
 build(s,'E','residential_quarter','chinatown',2,'building');
 const forecast=G.h01Preview(s);
 assert.equal(forecast.entries.length,2);
 assert.deepEqual(forecast.exposedDistrictIds,['chinatown']);
 const before=s.players.map(p=>p.capital);
 const r=G.resolveNewspaper(s);
 assert.equal(r.ok,true);
 assert.equal(s.players[0].capital,before[0]-2);
 assert.equal(s.players[1].capital,before[1]-2);
 assert.equal(s.players[2].capital,before[2]);
 assert.equal(r.report.h01.entries.length,2);
 assert.equal(r.report.h01.influenceRewards.length,0);
 assert.equal(r.report.h01.radius,0);
 assert.equal(G.resolveNewspaper(s).reason,'already-resolved');
 const twice=snap(s);
 assert.equal(G.settleH01Year(s).reason,'already-settled');
 assert.equal(snap(s),twice);
});
test('no medical-only penalty and no Influence reward without non-medical buildings',()=>{
 const s=game();
 build(s,'clinic','clinic','chinatown',2);
 build(s,'std','std_clinic','northbeach',1);
 let prev=G.h01Preview(s);
 assert.deepEqual(prev.entries,[]);
 assert.deepEqual(prev.protectedDistrictIds,[]);
 const before=snap(s.players);
 const r=G.resolveNewspaper(s);assert.equal(r.ok,true);
 assert.equal(snap(s.players),before);
 assert.deepEqual(r.report.h01.influenceRewards,[]);
});
test('local std_clinic beats neighboring market clinic when preventing real fines',()=>{
 const s=game();
 build(s,'STD','std_clinic','chinatown',2);
 build(s,'MARKET','clinic','northbeach',1);
 build(s,'TARGET','warehouse','chinatown',0);
 const p=G.h01Preview(s);
 assert.equal(p.protectedByDistrict.chinatown.clinicId,'STD');
 assert.equal(p.protectedByDistrict.chinatown.ownerId,2);
 G.resolveNewspaper(s);
 assert.equal(s.players[0].capital,40);
 assert.equal(s.players[2].influence,19); // 18 → 19; no other occupied position
 assert.equal(s.players[1].influence,24);
});
test('market clinic protects adjacent districts, standard clinic protects own only',()=>{
 const s=game();
 s.newsH01Incident.radius=1;
 build(s,'targetA','warehouse','financial',0);
 build(s,'targetB','std_warehouse','northbeach',0);
 build(s,'med','std_clinic','chinatown',1);
 let p=G.h01Preview(s);
 assert.ok(p.exposedDistrictIds.includes('northbeach'));
 assert.ok(p.exposedDistrictIds.includes('financial'));
 build(s,'MARKET','clinic','northbeach',2);
 p=G.h01Preview(s);
 assert.equal(p.protectedByDistrict.northbeach.clinicId,'MARKET');
 assert.equal(p.protectedByDistrict.financial.clinicId,'MARKET');
 G.resolveNewspaper(s);
 assert.equal(s.players[0].capital,40);
 assert.equal(s.players[2].influence,20); // 18 -> +2
 assert.equal(s.newsArchive[0].h01.influenceRewards.length,2);
});
test('two overlapping market clinics give exactly one district reward by year turn order (provisional tie)',()=>{
 const s=game();
 build(s,'N','clinic','northbeach',1);
 build(s,'F','clinic','financial',2);
 build(s,'T','warehouse','chinatown',0);
 const p=G.h01Preview(s);
 assert.equal(p.protectedByDistrict.chinatown.ownerId,1);
 const before=s.players.map(x=>x.influence);
 G.resolveNewspaper(s);
 assert.equal(s.newsArchive[0].h01.influenceRewards.length,1);
 assert.equal(s.players[1].influence,before[1]+1);
 assert.equal(s.players[2].influence,before[2]);
 assert.equal(s.players[0].capital,40);
});
test('income/checkpoint entry: yearly epidemic charges precede annual income',()=>{
 const s=game();
 build(s,'T','warehouse','chinatown',0);
 s.players[0].capital=1;
 const income=G.roundIncome(s,0);
 nextYear(s,'E02');
 assert.equal(s.newsArchive[0].h01.entries[0].capitalDue,2);
 assert.equal(s.newsArchive[0].h01.entries[0].actual,-1);
 assert.equal(s.players[0].capital,income);
 assert.equal(s.newsH01Incident.lastAssessedRound,1);
 assert.equal(s.newsArchive[0].cardId,'H01');
});
test('unresolved H01 continues under unrelated newspaper; annual score repeats, no second source',()=>{
 const s=game();
 build(s,'T','warehouse','chinatown',0);
 nextYear(s,'E02');
 const first=s.newsArchive[0];
 assert.equal(first.h01.entries.length,1);
 const focus=s.newsH01Incident.districtId;
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'E02');
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const b=s.players[0].capital;
 const r=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(r.ok,true);
 const report=s.newsArchive.find(x=>x.cardId==='E02');
 assert.ok(report.ongoingH01);
 assert.equal(report.ongoingH01.radius,1);
 assert.equal(report.ongoingH01.entries.length,1);
 assert.equal(report.ongoingH01.entries[0].districtIds[0],'chinatown');
 assert.equal(s.newsH01Incident.districtId,focus);
 assert.equal(s.newsH01Incident.yearReports.length,2);
 assert.equal(report.ongoingH01.entries[0].actual,-2);
 assert.ok(s.players[0].capital>=b-2,'ordinary income may follow');
});
test('completed own and foreign medical institutions launch a real $/road-step expedition',()=>{
 for(const projectId of ['std_clinic','clinic']){
  for(const owner of [0,1]){
   const s=game();
   build(s,'MED',projectId,'financial',owner);
   active(s,0,0,'civic');
   const opt=G.h01ExpeditionOptions(s,0);
   assert.equal(opt.ok,true);
   assert.equal(opt.services.length,1);
   assert.deepEqual(opt.services[0].route,['financial','chinatown']);
   assert.equal(opt.services[0].cost,1);
   assert.equal(opt.services[0].available,true);
   const from=s.players[0].workers[0].districtId;
   const beforeOther=snap(s.players[1]);
   const r=G.completeH01Expedition(s,0,'MED');
   assert.equal(r.ok,true,r.reason);
   assert.equal(s.players[0].capital,39);
   assert.equal(s.players[0].prestige,2);
   assert.equal(s.players[0].influence,31);
   assert.equal(s.players[0].workers[0].districtId,from,'worker must not teleport');
   assert.equal(s.players[0].workers[0].used,true);
   assert.equal(s.activationMainActionUsed,true);
   assert.equal(snap(s.players[1]),beforeOther,'foreign clinic owner is not paid');
   assert.equal(G.h01ActiveIncident(s),null);
   assert.deepEqual(G.h01InfectedDistrictIds(s),[]);
   assert.equal(G.completeH01Expedition(s,0,'MED').reason,'already-completed');
   assert.deepEqual(G.h01Preview(s).infectedDistrictIds,[]);
  }
 }
});
test('epidemic has no special transport cargo, does not use hauler or suppliers',()=>{
 const s=game();
 build(s,'MED','std_clinic','financial',1);
 active(s,0,0,'civic');
 const before={supply:snap(s.logisticsSupply),haulers:snap(s.haulersUsed),
  yard:snap(s.freightYardInventories)};
 assert.equal(G.completeH01Expedition(s,0,'MED').ok,true);
 assert.equal(snap(s.logisticsSupply),before.supply);
 assert.equal(snap(s.haulersUsed),before.haulers);
 assert.equal(snap(s.freightYardInventories),before.yard);
});
test('unreachable clinic, incomplete service, no money, wrong id, busy main action reject atomically',()=>{
 const cases=[
  {name:'unfinished',mutate:s=>build(s,'MED','std_clinic','financial',1,'building'),reason:'invalid-service'},
  {name:'wrong type',mutate:s=>build(s,'MED','std_police','financial',1),reason:'invalid-service'},
  {name:'far worker',mutate:s=>{build(s,'MED','clinic','financial',1);active(s,0,0,'sunset');},reason:'worker-range'},
  {name:'poor player',mutate:s=>{build(s,'MED','clinic','financial',1);s.players[0].capital=0;},reason:'capital'},
  {name:'busy action',mutate:s=>{build(s,'MED','clinic','financial',1);s.activationMainActionUsed=true;},reason:'main-action-unavailable'},
  {name:'wrong player',mutate:s=>build(s,'MED','clinic','financial',1),player:-1,reason:'player'},
  {name:'bad clinic id',mutate:s=>build(s,'MED','clinic','financial',1),clinic:'NO',reason:'invalid-service'},
  {name:'wrong phase',mutate:s=>{build(s,'MED','clinic','financial',1);s.phase='declare';},reason:'main-action-unavailable'},
  {name:'pending build',mutate:s=>{build(s,'MED','clinic','financial',1);s.pendingConstruction={id:'draft'};},reason:'main-action-unavailable'}
 ];
 for(const c of cases){
  const s=game();
  active(s,0,0,'civic');c.mutate(s);
  const before=snap(s);
  const res=G.completeH01Expedition(s,c.player??0,c.clinic||'MED');
  assert.equal(res.reason,c.reason,c.name);
  assert.equal(snap(s),before,c.name);
 }
});
test('service-route graph respects 0-distance and closed districts',()=>{
 assert.deepEqual(G.f02ServiceRoute('chinatown','chinatown'),['chinatown']);
 assert.equal(G.f02ServiceRoute('presidio','chinatown'),null);
 assert.equal(G.f02ServiceRoute('park','chinatown'),null);
 assert.equal(G.f02ServiceRoute('twinpeaks','chinatown'),null);
});
test('future implemented H02 tariff hook charges $2 per edge without altering free worker movement',()=>{
 const s=game();build(s,'MED','clinic','financial',1);
 active(s,0,0,'civic');
 s.newsH02Incident={active:true,resolvedRound:null};
 const opt=G.h01ExpeditionOptions(s,0);
 assert.equal(opt.tariff,2);
 assert.equal(opt.services[0].cost,2);
 const r=G.completeH01Expedition(s,0,'MED');
 assert.equal(r.ok,true);
 assert.equal(s.players[0].capital,38);
 assert.equal(s.players[0].workers[0].districtId,'civic');
});
test('a cured H01 has no future fines/rewards and no spreading even with other newspapers',()=>{
 const s=game();
 build(s,'MED','clinic','financial',1);
 build(s,'T','warehouse','chinatown',0);
 active(s,0,0,'civic');
 assert.equal(G.completeH01Expedition(s,0,'MED').ok,true);
 const b=snap(s.players);
 const r=G.resolveNewspaper(s);assert.equal(r.ok,true);
 assert.equal(r.report.h01.resolved,true);
 assert.equal(r.report.h01.entries.length,0);
 assert.equal(snap(s.players),b);
 nextYear(s,'E02');
 assert.equal(s.newsH01Incident.radius,0,'cleared epidemic cannot grow');
 assert.equal(s.newsCurrentIds[0],'E02');
 const second=nextYear(s,'E03');
 assert.equal(second.ok,true);
 assert.equal(s.newsH01Incident.yearReports.length,1,'no future tracking after cure');
 assert.equal(G.h01ActiveIncident(s),null);
 assert.deepEqual(G.h01InfectedDistrictIds(s),[]);
});
test('past H01 remains resolvable after H01 newspaper has ended',()=>{
 const s=game();
 build(s,'MED','clinic','financial',1);
 nextYear(s,'E02');
 active(s,0,0,'civic');
 const before=s.players[0].prestige;
 assert.equal(G.completeH01Expedition(s,0,'MED').ok,true);
 assert.equal(s.players[0].prestige,before+2);
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const end=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(end.ok,true);
 const h01=s.newsArchive.find(x=>x.cardId==='E02').ongoingH01;
 assert.equal(h01.resolved,true);
 assert.equal(h01.entries.length,0);
 assert.equal(h01.operation.playerId,0);
});
test('legacy active H01 rolls exactly once, no resource/wealth regression, old archive stays exact',()=>{
 const s=game();delete s.newsH01Incident;
 const saved={players:snap(s.players),constructions:snap(s.constructions),supplies:snap(s.logisticsSupply)};
 G.ensureNewspaper(s,{rng:()=>5/6});
 assert.equal(s.newsH01Incident.roll,6);
 assert.equal(s.newsH01Incident.districtId,'innerrichmond');
 assert.equal(snap(s.players),saved.players);
 assert.equal(snap(s.constructions),saved.constructions);
 assert.equal(snap(s.logisticsSupply),saved.supplies);
 const after=snap(s);G.ensureNewspaper(s,{rng:()=>.01});
 assert.equal(snap(s),after);
 const old={round:1,year:1900,cardId:'H01',title:'Лихорадка в переполненных комнатах',
  entries:[{playerId:0,districtIds:['civic'],actual:-2}],
  changes:{0:{capital:-2,influence:0,prestige:0}},serviceRecognition:[]};
 s.newsCurrentIds=['E02'];s.newsArchive=[old];s.newsH01Incident=null;
 G.ensureNewspaper(s);
 assert.equal(snap(s.newsArchive[0]),snap(old));
 assert.equal(s.newsH01Incident,null);
});
test('last 1905 year scores H01 once and never creates an extra newspaper',()=>{
 const s=game({round:6});
 build(s,'T','warehouse','chinatown',0);
 const previous=s.players[0].capital;
 s.developmentComplete=true;s.developmentPlayer=null;
 const end=G.cleanupMarket(s,{rng:()=>.3});
 assert.equal(end.ok,true);assert.equal(end.finished,true);
 assert.equal(s.round,6);assert.equal(s.finished,true);
 assert.equal(s.players[0].capital,previous-2);
 assert.equal(s.newsArchive[0].h01.entries[0].actual,-2);
 assert.equal(s.newsH01Incident.radius,0);
 assert.equal(s.newsH01Incident.yearReports.length,1);
 assert.equal(G.cleanupMarket(s).ok,false);
});

test('infection can travel through Golden Gate Park while park is never a penalty district',()=>{
 const s=game({roll:6});
 s.newsH01Incident.radius=2;
 const area=G.h01InfectedDistrictIds(s);
 assert.ok(area.includes('haight'),'park pass-through connects Inner Richmond to Haight');
 assert.ok(area.includes('innersunset'),'park pass-through connects Inner Richmond to Inner Sunset');
 assert.ok(area.includes('sunset'),'park pass-through connects Inner Richmond to Outer Sunset');
 assert.equal(area.includes('park'),false,'park may never be fined');
 assert.equal(area.includes('presidio'),false);
 assert.equal(area.includes('twinpeaks'),false);
 const before=snap(s.players);
 assert.equal(G.resolveNewspaper(s).ok,true);
 assert.equal(snap(s.players),before,'no buildings means no epidemic penalty');
});
test('one protected infected district grants exactly one clinic Influence EACH unresolved year',()=>{
 const s=game();
 build(s,'MED','clinic','financial',1);
 build(s,'T1','warehouse','chinatown',0);
 build(s,'T2','residential_quarter','chinatown',2);
 const first=G.resolveNewspaper(s);
 assert.equal(first.ok,true);
 assert.equal(first.report.h01.influenceRewards.length,1);
 assert.equal(first.report.h01.influenceRewards[0].steps,1);
 const afterFirst=s.players[1].influence;
 nextYear(s,'E02');
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const second=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(second.ok,true);
 const report=s.newsArchive.find(x=>x.cardId==='E02');
 assert.equal(report.ongoingH01.influenceRewards.length,1);
 assert.equal(report.ongoingH01.influenceRewards[0].steps,1);
 assert.ok(s.players[1].influence>=afterFirst+1);
 assert.equal(s.newsH01Incident.yearReports.length,2);
 const fixed=snap(s.newsH01Incident.yearReports);
 assert.equal(G.settleH01Year(s).reason,'already-settled');
 assert.equal(snap(s.newsH01Incident.yearReports),fixed);
});
