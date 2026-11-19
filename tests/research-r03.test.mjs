import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import * as C from '../catastrophe-core.js';
import {researchCardById} from '../research-cards.js';

const snap=s=>JSON.stringify(s);
function game(funded=false){
 const s=G.createInitialState({rng:()=>0.23});
 s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.players.forEach(p=>{p.capital=60;p.prestige=0;});
 s.pendingReinforcements=[];s.pendingBreadProduction=[];s.pendingSailorRecruitments=[];
 s.pendingWorkforceLinks=[];s.pendingPressCampaigns=[];
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];
 if(funded)Object.assign(s.research.R03,{status:'funded',holderId:2,fundedRound:1});
 return s;
}
function built(id,projectId,districtId='civic',playerId=0,status='complete',extra={}){
 return {id,projectId,districtId,playerId,status,startedRound:1,
  completedRound:status==='complete'?1:null,
  materialsDelivered:status==='complete'?[...G.projectById(projectId).materials]:[],
  warehouseInventory:[],...extra};
}
function stations(s){
 s.constructions.push(built('S','std_fire','civic',1));
 s.constructions.push(built('F','firehouse','financial',2));
}
function fund(s){
 Object.assign(s.research.R03,{status:'held',holderId:0,fundedRound:null});
 const r=G.fundResearch(s,0,'R03');
 assert.equal(r.ok,true,JSON.stringify(r));
 return r;
}
test('R03 requirement counts both completed service types regardless of owner; failed funding atomic',()=>{
 const c=researchCardById('R03');
 assert.deepEqual([c.fundingCost,c.effect.fireProtectionInOwnDistrictBefore,c.effect.fireProtectionInOwnDistrictAfter],[5,1,2]);
 const s=game();Object.assign(s.research.R03,{status:'held',holderId:0,fundedRound:null});
 const frozen=snap(s);assert.equal(G.fundResearch(s,0,'R03').reason,'research-prerequisite');
 assert.equal(snap(s),frozen);
 s.constructions.push(built('S','std_fire','civic',1));
 s.constructions.push(built('F','firehouse','financial',2,'under-construction'));
 assert.equal(G.researchFundingPreview(s,0,'R03').completed,1);
 s.constructions[1].status='complete';
 const money=s.players[0].capital,prestige=s.players[0].prestige,influence=s.players[0].influence;
 const r=G.fundResearch(s,0,'R03');
 assert.equal(r.ok,true);assert.equal(r.influence.steps,2);
 assert.equal(s.players[0].capital,money-5);
 assert.equal(s.players[0].prestige,prestige+2);
 assert.equal(s.players[0].influence,influence+2);
 assert.equal(s.research.R03.status,'funded');
 const after=snap(s);
 assert.equal(G.fundResearch(s,0,'R03').reason,'already-funded');
 assert.equal(snap(s),after);
});
test('held R03 remains inert; funded R03 immediately upgrades existing standard/full services for all owners',()=>{
 const s=game();stations(s);
 const a=G.districtRisk(s,'civic').fire.net,b=G.districtRisk(s,'financial').fire.net;
 assert.equal(G.fireServiceProtection(s,'std_fire'),1);
 assert.equal(G.fireServiceProtection(s,'firehouse'),1);
 Object.assign(s.research.R03,{status:'held',holderId:0,fundedRound:null});
 assert.equal(G.districtRisk(s,'civic').fire.net,a);
 assert.equal(G.districtRisk(s,'financial').fire.net,b);
 fund(s);
 assert.equal(G.fireServiceProtection(s,'std_fire'),2);
 assert.equal(G.fireServiceProtection(s,'firehouse'),2);
 assert.equal(G.districtRisk(s,'civic').fire.net,a-1);
 assert.equal(G.districtRisk(s,'financial').fire.net,b-1);
 assert.equal(G.districtRisk(s,'civic').sources.find(x=>x.constructionId==='S').fire,-2);
 assert.equal(G.districtRisk(s,'financial').sources.find(x=>x.constructionId==='F').fire,-2);
 assert.deepEqual(G.validateResearchState(s),[]);
});
test('R03 local P reduction never grows fire-service radius, nor impacts adjacent P',()=>{
 const s=game(true);s.constructions=[built('F','firehouse','civic',1)];
 const neighbor=G.districtNeighbors('civic').find(id=>G.districtById(id)?.buildable!==false);
 assert.ok(neighbor);
 const net=G.districtRisk(s,neighbor).fire.net;
 assert.equal(G.districtAccess(s,neighbor).fire,true,'market access remains adjacent');
 assert.equal(G.districtRisk(s,neighbor).fire.net,net,'no adjacent P change');
 s.constructions=[built('S','std_fire','civic',1)];
 assert.equal(G.districtAccess(s,neighbor).fire,false,'standard post gains no radius');
 assert.equal(G.districtRisk(s,neighbor).fire.net,net);
 assert.equal(G.districtRisk(s,'civic').sources.find(x=>x.constructionId==='S').fire,-2);
});
test('future standard/full completions apply upgrade, while unfinished or abandoned do not',()=>{
 const s=game(true);
 const c=built('S','std_fire','civic',0,'under-construction');
 c.materialsDelivered=[...G.projectById(c.projectId).materials];
 s.constructions.push(c);
 assert.equal(G.districtRisk(s,'civic').sources.some(x=>x.constructionId==='S'),false);
 assert.equal(G.districtRiskPreview(s,'civic','std_fire').delta.fire,-2);
 assert.equal(G.districtRiskPreview(s,'civic','firehouse').delta.fire,-2);
 assert.equal(G.completeConstruction(s,c).ok,true);
 assert.equal(G.districtRisk(s,'civic').sources.find(x=>x.constructionId==='S').fire,-2);
 const d=built('F','firehouse','financial',1,'under-construction');
 d.materialsDelivered=[...G.projectById(d.projectId).materials];
 s.constructions.push(d);
 assert.equal(G.completeConstruction(s,d).ok,true);
 assert.equal(G.districtRisk(s,'financial').sources.find(x=>x.constructionId==='F').fire,-2);
 c.status='abandoned';
 assert.equal(G.districtRisk(s,'civic').sources.some(x=>x.constructionId==='S'),false);
});
test('R03 excludes fire workshop and other projects; preserves R02 U and personal fire modernization',()=>{
 const s=game(true);
 s.constructions=[built('W','fireworkshop'),built('A','factory','civic',1,'complete',{earthquakeReinforcement:1,fireSafetyModernized:true})];
 assert.equal(G.fireServiceProtection(s,'fireworkshop'),0);
 assert.equal(G.fireServiceProtection(s,'std_clinic'),0);
 assert.equal(G.fireServiceProtection(s,'std_police'),0);
 const x=G.districtRisk(s,'civic').sources;
 assert.equal(x.find(v=>v.constructionId==='W').fire,-1);
 assert.equal(x.find(v=>v.constructionId==='A').fire,1);
 assert.equal(x.find(v=>v.constructionId==='A').earthquake,0);
 assert.equal(G.projectRisk('firehouse').fire,-1,'card registry is unchanged');
 assert.equal(G.districtRiskPreview(s,'civic','fireworkshop').delta.fire,-1);
});
test('Phase II import restores station protection before quake, no double reduction even at P0',()=>{
 const s=game(true);stations(s);
 for(const [district,id] of [['civic','S'],['financial','F']]){
  const r=G.districtRisk(s,district),imp=C.fromGame(s)[district];
  assert.equal(imp.firehouse,true);assert.equal(imp.fireProtection,2);
  assert.equal(imp.p,Math.max(0,r.fire.net+2),'undo Phase I reduction');
  const n=C.begin(C.fromGame(s)).nodes[district];
  assert.equal(n.firehouseProtection,2);
  assert.equal(n.initialAfterQuakeP,Math.max(0,imp.p+n.quakeFireBonus-2));
  assert.equal(r.sources.find(x=>x.constructionId===id).fire,-2);
 }
});
test('Phase II recognizes standard std_fire without R03 and keeps legacy manual checkbox P-1',()=>{
 const s=game();s.constructions=[built('S','std_fire','financial',1)];
 const imp=C.fromGame(s);
 assert.equal(imp.financial.firehouse,true);
 assert.equal(imp.financial.fireProtection,1);
 assert.equal(imp.financial.p,Math.max(0,G.districtRisk(s,'financial').fire.net+1));
 assert.equal(C.begin(imp).nodes.financial.initialAfterQuakeP,Math.max(0,imp.financial.p-1));
 const vanilla=C.fromGame(game());
 vanilla.financial.firehouse=true;
 assert.equal(vanilla.financial.fireProtection,0);
 assert.equal(C.begin(vanilla).nodes.financial.firehouseProtection,1);
});
test('Phase II research applies protection after quake damage; quake collapse cancels it',()=>{
 const s=game(true);
 s.constructions=[built('A','std_fire','civic'),built('B','firehouse','soma',1)];
 const imp=C.fromGame(s);
 imp.civic.z=2;imp.civic.p=3;
 imp.soma.z=3;imp.soma.p=4;
 const sim=C.begin(imp);
 assert.equal(sim.nodes.civic.quake,'damaged');
 assert.equal(sim.nodes.civic.initialAfterQuakeP,2,'P3+damage1-protection2');
 assert.equal(sim.nodes.civic.firehouseActive,true);
 assert.equal(sim.nodes.soma.quake,'destroyed');
 assert.equal(sim.nodes.soma.initialAfterQuakeP,4,'collapsed station offers no protection');
 assert.equal(sim.nodes.soma.firehouseDestroyed,true);
});
test('R03 station is not an ongoing shield against neighboring fire spread',()=>{
 const s=game(true);s.constructions=[built('S','std_fire','civic')];
 const imp=C.fromGame(s);
 for(const d of C.DISTRICT_IDS){imp[d].z=0;imp[d].p=0;}
 imp.soma.z=3;
 const sim=C.begin(imp,{spread:2});
 assert.equal(sim.nodes.civic.p,0);
 C.next(sim);
 assert.equal(sim.nodes.civic.p,2);
 assert.equal(sim.nodes.civic.firehouseProtection,2);
});
test('R03 report reflects -2, and fire survival/zero floor remain explicit',()=>{
 const s=game(true);s.constructions=[built('S','std_fire','civic'),built('F','firehouse','soma',1)];
 const imp=C.fromGame(s);
 imp.civic.z=2;imp.civic.p=3;
 imp.soma.z=3;imp.soma.p=3;
 const sim=C.run(C.begin(imp));
 const report=C.formatReport({input:imp,simulation:sim,scenario:'R03'});
 assert.match(report,/Пожарная часть: только свой район/);
 assert.match(report,/П3 \+1 \(повреждение\) −2 \(пожарная часть\) → П2/);
 assert.equal(sim.nodes.soma.firehouseDestroyed,true);
 assert.equal(sim.nodes.soma.firehouseActive,false);
});
test('R03 funded state survives JSON reload with no extra rewards, action or new save schema',()=>{
 const s=game();stations(s);fund(s);
 const reloaded=JSON.parse(snap(s));
 assert.equal(G.fireServiceProtection(reloaded,'std_fire'),2);
 assert.equal(C.fromGame(reloaded).financial.fireProtection,2);
 assert.deepEqual(G.validateResearchState(reloaded),[]);
 const before=snap(reloaded);
 assert.equal(G.researchFundingPreview(reloaded,0,'R03').reason,'already-funded');
 assert.equal(snap(reloaded),before);
 assert.equal(reloaded.players[0].prestige,2);
});