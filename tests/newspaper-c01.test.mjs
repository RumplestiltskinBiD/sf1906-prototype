import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {newsCard} from '../newspaper-cards.js';

const snap=x=>JSON.stringify(x);
function game({roll=1,round=1,count=3}={}){
 const s=G.createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=['C01'];s.newsDeck=s.newsDeck.filter(id=>id!=='C01');
 s.newsLastResolvedRound=round-1;
 s.newsC01Incident=G.createC01Incident(round,()=> (roll-.5)/6);
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsEmergency={};s.constructions=[];
 while(s.players.length<count){const id=s.players.length;s.players.push({
  ...structuredClone(s.players[0]),id,name:'Player '+id,key:'test'+id,
  workers:G.createWorkers(id),portfolio:[],goals:[]});}
 s.yearTurnOrder=s.players.map(p=>p.id);s.developmentSlotsUsed=Array(count).fill(0);
 s.developmentComplete=false;s.developmentPlayer=0;s.activationMainActionUsed=false;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach((p,i)=>{p.capital=30;p.prestige=0;p.influence=30-i*6;});
 return s;
}
function build(s,id,projectId,districtId='northbeach',playerId=0,status='complete'){
 const c={id,projectId,districtId,playerId,status,startedRound:1,
  completedRound:status==='complete'?1:null,materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
function turn(s,pid=0,district='financial'){
 s.phase='development';s.developmentComplete=false;s.developmentPlayer=pid;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[pid].workers[0].id;
 s.players[pid].workers[0].districtId=district;
}
function next(s,card='E02'){
 s.newsDeck=[card,...s.newsDeck.filter(x=>x!==card)];
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const result=G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(result.ok,true,JSON.stringify(result));
 return result;
}

test('C01 uses approved event and not previous shop/club levy',()=>{
 const c=newsCard('C01'),s=game();
 assert.equal(c.designV2.status,'implemented-for-playtest');
 assert.equal(c.title,'ГРАБИТЕЛИ ХОЗЯЙНИЧАЮТ НА УЛИЦАХ ГОРОДА!');
 assert.equal(c.delta,0);assert.equal(c.target,'none');assert.equal(c.defense,null);
 assert.equal(c.frequency,'oncePerYear');
 assert.deepEqual(G.newsPreview(s).entries,[]);
 assert.equal(G.takeNewspaperEmergency(s,0,'northbeach').reason,'not-negative-event');
 assert.equal(G.c01Preview(s).roll,1);
});
for(const roll of [1,2,3,4,5,6]){
 test('D6 roll '+roll+' has exactly one persistent focus and fixed adjacency',()=>{
  const s=game({roll}),h=s.newsC01Incident;
  assert.equal(h.roll,roll);assert.equal(h.districtId,G.C01_CRIME_DISTRICTS[roll-1]);
  assert.equal(h.startRound,1);assert.equal(h.resolvedRound,null);
  const zone=[h.districtId,...G.districtNeighbors(h.districtId)]
    .filter((id,i,a)=>a.indexOf(id)===i&&G.districtById(id)?.buildable);
  assert.deepEqual(G.c01ThreatDistrictIds(s),zone);
  assert.deepEqual(G.newsPreview(s).threatened,zone);
  const old=snap(s);
  for(let i=0;i<4;i++){G.ensureNewspaper(s,{rng:()=>.99});G.c01Preview(s);G.newsPreview(s);}
  assert.equal(snap(s),old,'preview/save must not reroll or mutate');
 });
}
test('a truly new C01 party creates the token before any City Hall turn',()=>{
 let found;
 for(let i=1;i<950;i++){
  let seed=i;const rng=()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);
   t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};
  const s=G.createInitialState({rng});
  if(s.newsCurrentIds[0]==='C01'){found=s;break;}
 }
 assert.ok(found);assert.equal(found.phase,'draft');assert.equal(found.newsC01Incident.startRound,1);
 assert.equal(G.c01ThreatDistrictIds(found).includes(found.newsC01Incident.districtId),true);
});
test('multiple finished buildings of one owner in same district lose just $2',()=>{
 const s=game();build(s,'A','warehouse');build(s,'B','clinic');
 build(s,'C','std_fire','northbeach',1);
 const preview=G.c01Preview(s);
 assert.equal(preview.entries.length,2);assert.equal(preview.entries[0].capitalDue,2);
 assert.equal(G.settleC01Year(s).reason,'not-year-end');
 const r=G.resolveNewspaper(s);assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(s.players[0].capital,28);assert.equal(s.players[1].capital,28);
 assert.equal(s.newsArchive[0].c01.entries.length,2);
 assert.equal(s.newsArchive[0].c01.entries[0].actual,-2);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,0);
 assert.equal(G.settleC01Year(s).reason,'already-settled');
});
test('police buildings alone do not trigger penalties or automatic Influence',()=>{
 const s=game();build(s,'P','std_police','northbeach',2);
 build(s,'M','police','financial',1);
 const before=s.players.map(p=>({cash:p.capital,influence:p.influence}));
 G.resolveNewspaper(s);
 assert.deepEqual(s.players.map(p=>({cash:p.capital,influence:p.influence})),before);
 assert.equal(s.newsArchive[0].c01.entries.length,0);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,0);
});
test('unfinished police neither shields nor dispatches; nonpolice facilities still targeted',()=>{
 const s=game();build(s,'P','police','northbeach',1,'under-construction');
 build(s,'W','warehouse','northbeach',0);build(s,'CL','clinic','northbeach',2);
 assert.equal(G.c01Preview(s).entries.length,2);
 assert.equal(G.c01Preview(s).protectedDistrictIds.length,0);
 assert.equal(G.c01RaidOptions(s,0).services.length,0);
 const old=snap(s);assert.equal(G.completeC01Raid(s,0,'P').reason,'invalid-service');
 assert.equal(snap(s),old);
 assert.equal(G.resolveNewspaper(s).ok,true);
 assert.equal(s.players[0].capital,28);assert.equal(s.players[2].capital,28);
});
test('local std_police shields ONLY its district; neighbor exposed and +1 protection',()=>{
 const s=game();
 build(s,'A','warehouse','northbeach',0);
 build(s,'B','warehouse','chinatown',0);
 build(s,'P','std_police','northbeach',1);
 const p=G.c01Preview(s);
 assert.equal(p.protectedByDistrict.northbeach.policeId,'P');
 assert.equal(p.exposedDistrictIds.includes('chinatown'),true);
 G.resolveNewspaper(s);
 assert.equal(s.players[0].capital,28);
 assert.equal(s.players[1].influence,25);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,1);
 assert.equal(s.newsArchive[0].c01.influenceRewards[0].districtId,'northbeach');
});
test('market police covers own and adjacent but never two-hop, scoring per threatened district',()=>{
 const s=game();build(s,'P','police','northbeach',1);
 for(const district of G.c01ThreatDistrictIds(s))build(s,'W'+district,'warehouse',district,0);
 const p=G.c01Preview(s);
 assert.equal(p.exposedDistrictIds.length,0);
 assert.equal(p.protectedDistrictIds.length,p.threatenedDistrictIds.length);
 build(s,'OUT','warehouse','mission',0);
 assert.equal(G.c01Preview(s).entries.some(e=>e.districtIds.includes('mission')),false);
 G.resolveNewspaper(s);
 assert.equal(s.players[0].capital,30);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,p.threatenedDistrictIds.length);
 assert.equal(s.players[1].influence,24+p.threatenedDistrictIds.length);
});
test('local police owns defense and reward over a neighboring market police',()=>{
 const s=game();build(s,'T','warehouse','northbeach',0);
 build(s,'LOCAL','std_police','northbeach',2);
 build(s,'NEAR','police','financial',1);
 const p=G.c01Preview(s);
 assert.equal(p.protectedByDistrict.northbeach.policeId,'LOCAL');
 G.resolveNewspaper(s);
 assert.equal(s.newsArchive[0].c01.influenceRewards[0].playerId,2);
 assert.equal(s.players[2].influence,19);assert.equal(s.players[1].influence,24);
});
test('two overlapping neighbor market stations: deterministic technical fallback, never double score',()=>{
 const s=game();build(s,'T1','warehouse','northbeach',0);
 build(s,'P1','police','financial',1);build(s,'P2','police','chinatown',2);
 s.yearTurnOrder=[2,0,1];
 assert.equal(G.c01Preview(s).protectedByDistrict.northbeach.policeId,'P2');
 G.resolveNewspaper(s);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,1);
 assert.equal(s.newsArchive[0].c01.influenceRewards[0].playerId,2);
 assert.equal(s.players[1].influence,24);assert.equal(s.players[2].influence,19);
});
test('a protected district with many affected owners awards one Influence to police',()=>{
 const s=game();build(s,'A','warehouse','northbeach',0);
 build(s,'B','clinic','northbeach',1);
 build(s,'P','std_police','northbeach',2);
 G.resolveNewspaper(s);
 assert.equal(s.newsArchive[0].c01.entries.length,2);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,1);
 assert.equal(s.players[2].influence,19);
});
test('insufficient player capital never goes negative; a shield still prevents a due fine',()=>{
 const s=game();build(s,'T','warehouse','northbeach',0);
 s.players[0].capital=1;
 G.resolveNewspaper(s);
 assert.equal(s.players[0].capital,0);
 assert.equal(s.newsArchive[0].c01.entries[0].actual,-1);
});
test('foreign and own police conduct the raid; no commission, no teleport and one reward',()=>{
 for(const owner of [0,1]){
  const s=game();build(s,'POL','std_police','financial',owner);
  build(s,'T','warehouse','northbeach',2);
  turn(s,0,'financial');
  const options=G.c01RaidOptions(s,0),source=options.services[0];
  assert.equal(source.cost,1);
  assert.deepEqual(source.route,['financial','northbeach']);
  assert.equal(source.available,true);
  const starting=s.players.map(p=>({cash:p.capital,vp:p.prestige,influence:p.influence}));
  const pos=s.players[0].workers[0].districtId;
  const r=G.completeC01Raid(s,0,'POL');assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(s.players[0].capital,starting[0].cash-1);
  assert.equal(s.players[0].prestige,starting[0].vp+2);
  assert.equal(s.players[0].influence,starting[0].influence+1);
  if(owner===1){
   assert.equal(s.players[1].capital,starting[1].cash,'foreign police receives no fee');
   assert.equal(s.players[1].prestige,starting[1].vp,'foreign police earns no VP');
   assert.equal(s.players[1].influence,starting[1].influence,'foreign police earns no Influence for a raid');
  }
  assert.equal(s.players[0].workers[0].districtId,pos);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.activationMainActionUsed,true);
  assert.equal(s.newsC01Incident.resolvedRound,1);
  assert.equal(G.c01ThreatDistrictIds(s).length,0);
  assert.equal(G.c01Preview(s).active,false);
  const after=snap(s);assert.equal(G.completeC01Raid(s,0,'POL').reason,'already-completed');
  assert.equal(snap(s),after);
  G.resolveNewspaper(s);
  assert.equal(s.players[2].capital,starting[2].cash);
  assert.equal(s.newsArchive[0].c01.resolved,true);
  assert.equal(s.newsArchive[0].c01.entries.length,0);
  assert.equal(s.newsArchive[0].c01.influenceRewards.length,0);
 }
});
test('zero-edge local raid costs $0 even with no money',()=>{
 const s=game();build(s,'POL','police','northbeach',1);
 turn(s,0,'northbeach');s.players[0].capital=0;
 assert.deepEqual(G.c01RaidOptions(s,0).services[0].route,['northbeach']);
 assert.equal(G.c01RaidOptions(s,0).services[0].cost,0);
 assert.equal(G.completeC01Raid(s,0,'POL').ok,true);
 assert.equal(s.players[0].capital,0);
});
test('H02 citywide disease doubles C01 paid police route, not reward or worker movement',()=>{
 const s=game();build(s,'POL','std_police','financial',1);
 s.newsH02Incident=G.createH02Incident(1,()=>.3);
 turn(s,0,'financial');
 assert.equal(G.c01RaidOptions(s,0).tariff,2);
 assert.equal(G.c01RaidOptions(s,0).services[0].cost,2);
 const r=G.completeC01Raid(s,0,'POL');
 assert.equal(r.ok,true);assert.equal(s.players[0].capital,28);
 assert.equal(s.players[0].prestige,2);
 assert.equal(s.newsH02Incident.resolvedRound,null);
 assert.equal(s.newsC01Incident.operation.tariff,2);
});
test('lack of capital / unreachable worker blocks atomically',()=>{
 const s=game();build(s,'POL','std_police','financial',1);
 turn(s,0,'financial');s.players[0].capital=0;
 const old=snap(s);
 assert.equal(G.completeC01Raid(s,0,'POL').reason,'capital');
 assert.equal(snap(s),old);
 s.players[0].capital=1;
 turn(s,0,'sunset');
 const before=snap(s);
 assert.equal(G.c01RaidOptions(s,0).services[0].reachable,false);
 assert.equal(G.completeC01Raid(s,0,'POL').reason,'worker-range');
 assert.equal(snap(s),before);
});
test('wrong source, phase, used/jailed worker, wrong turn, pending action reject atomically',()=>{
 const base=game();build(base,'POL','std_police','financial',1);
 build(base,'BAD','std_fire','financial',2);
 for(const mutate of [
  s=>{s.phase='hall';},s=>{s.developmentPlayer=2;},
  s=>{s.activationMainActionUsed=true;},s=>{s.activeWorkerId=null;},
  s=>{s.players[0].workers[0].used=true;},s=>{s.players[0].workers[0].jailed=true;},
  s=>{s.pendingConstruction={projectId:'warehouse'};},
  s=>{s.pendingWorkerAction={kind:'delivery'};}
 ]){
  const s=structuredClone(base);mutate(s);const before=snap(s);
  assert.equal(G.completeC01Raid(s,0,'POL').ok,false);
  assert.equal(snap(s),before);
 }
 const s=structuredClone(base),before=snap(s);
 assert.equal(G.completeC01Raid(s,0,'BAD').reason,'invalid-service');
 assert.equal(G.completeC01Raid(s,4,'POL').reason,'player');
 assert.equal(snap(s),before);
});
test('unresolved crime persists under other newspapers, repeats precisely once per year',()=>{
 const s=game();build(s,'A','warehouse','northbeach',0);
 build(s,'P','police','financial',1);
 const oldCash=s.players[0].capital,oldInf=s.players[1].influence;
 next(s,'E02');
 assert.equal(s.round,2);assert.equal(s.newsCurrentIds[0],'E02');
 assert.equal(s.newsArchive[0].c01.resolved,false);
 assert.equal(s.newsC01Incident.lastAssessedRound,1);
 assert.equal(s.newsArchive[0].c01.influenceRewards.length,1);
 assert.equal(s.players[0].capital,oldCash+G.roundIncome(s,0));
 assert.equal(s.players[1].influence,oldInf+1);
 assert.equal(G.c01Preview(s).active,true);
 assert.equal(s.newsC01Incident.yearReports.length,1);
 G.ensureNewspaper(s,{rng:()=>{throw Error('no reroll')}});
 next(s,'E03');
 assert.equal(s.newsArchive[1].cardId,'E02');
 assert.equal(s.newsArchive[1].ongoingC01.resolved,false);
 assert.equal(s.newsArchive[1].ongoingC01.influenceRewards.length,1);
 assert.equal(s.players[1].influence,oldInf+2);
 assert.equal(s.newsC01Incident.yearReports.length,2);
});
test('later police raid prevents current and all future penalties under another newspaper',()=>{
 const s=game();build(s,'A','warehouse','northbeach',0);
 next(s,'E02');
 const afterYear1=s.players[0].capital;
 build(s,'POL','std_police','financial',1);
 turn(s,0,'financial');
 assert.equal(G.completeC01Raid(s,0,'POL').ok,true);
 const earned=s.players[0].prestige;
 next(s,'E03');
 assert.equal(s.newsArchive[1].ongoingC01.resolved,true);
 assert.equal(s.newsArchive[1].ongoingC01.entries.length,0);
 assert.equal(s.newsArchive[1].ongoingC01.operation.playerId,0);
 assert.equal(s.players[0].prestige,earned);
 assert.ok(s.players[0].capital>=afterYear1-1);
 next(s,'E04');
 assert.equal(s.newsC01Incident.yearReports.length,2,'no new annual crime settlement after cure');
});
test('legacy open C01 save migrates only its token; a historical C01 stays unchanged',()=>{
 const s=game(),cargo=snap(s.logisticsSupply);
 delete s.newsC01Incident;const history=snap(s.newsArchive),money=s.players.map(p=>p.capital);
 G.ensureNewspaper(s,{rng:()=>.5});
 assert.equal(s.newsC01Incident.roll,4);assert.equal(s.newsC01Incident.districtId,'chinatown');
 const old=snap(s);G.ensureNewspaper(s,{rng:()=>{throw Error('reroll')}});
 assert.equal(snap(s),old);assert.equal(snap(s.logisticsSupply),cargo);
 assert.deepEqual(s.players.map(p=>p.capital),money);assert.equal(snap(s.newsArchive),history);
 const saved=game();saved.round=2;saved.newsCurrentIds=['E02'];saved.newsC01Incident=null;
 saved.newsLastResolvedRound=1;
 const archive={round:1,cardId:'C01',year:1900,title:'Грабители хозяйничают на улицах города',
   entries:[{playerId:0,districtIds:['northbeach'],actual:-2}],changes:{0:{capital:-2}}};
 saved.newsArchive=[archive];
 G.ensureNewspaper(saved,{rng:()=>{throw Error('historic draw')}});
 assert.equal(saved.newsC01Incident,null);assert.deepEqual(saved.newsArchive[0],archive);
});
test('final year records crime settlement without seventh-year punishment',()=>{
 const s=game({round:6});s.newsC01Incident.startRound=6;
 build(s,'T','warehouse','northbeach',0);
 s.newsDeck=[];s.newsLastResolvedRound=5;
 s.phase='development';s.developmentComplete=true;s.developmentPlayer=null;
 const before=s.players[0].capital;
 G.cleanupMarket(s,{rng:()=>.39});
 assert.equal(s.finished,true);
 assert.equal(s.newsArchive.at(-1).c01.resolved,false);
 assert.equal(s.newsArchive.at(-1).c01.entries.length,1);
 assert.equal(s.newsC01Incident.yearReports.length,1);
 assert.ok(s.players[0].capital>=0);
 assert.equal(G.settleC01Year(s).reason,'already-settled');
});
