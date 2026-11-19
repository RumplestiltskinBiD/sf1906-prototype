import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {RESEARCH_CARDS} from '../research-cards.js';

const snap=s=>JSON.stringify(s);
function game(){
 const s=G.createInitialState({rng:()=>0.23});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.players.forEach(p=>{p.capital=50;p.prestige=0;p.workersLeft=3;p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});});
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];
 return s;
}
function held(s,id,owner=0){
 Object.assign(s.research[id],{status:'held',holderId:owner,fundedRound:null});
 return s;
}
function built(s,id,{owner=1,site='civic',status='complete'}={}){
 s.constructions.push({id:'C'+(s.constructions.length+1),projectId:id,playerId:owner,districtId:site,status});
}
test('funding is a separate free action: actual cost and sponsor VP/Influence, no worker consumed',()=>{
 const s=held(game(),'R01');
 const before={money:s.players[0].capital,vp:s.players[0].prestige,inf:s.players[0].influence,
   workersLeft:s.players[0].workersLeft,actions:s.developmentSlotsUsed[0]};
 const result=G.fundResearch(s,0,'R01');
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.cost,3);assert.equal(result.vp,2);
 assert.equal(s.players[0].capital,before.money-3);
 assert.equal(s.players[0].prestige,before.vp+2);
 assert.equal(s.players[0].workersLeft,before.workersLeft);
 assert.equal(s.developmentSlotsUsed[0],before.actions);
 assert.equal(s.activationMainActionUsed,false);
 assert.equal(s.research.R01.status,'funded');
 assert.equal(s.research.R01.fundedRound,1);
 assert.deepEqual(G.validateResearchState(s),[]);
 assert.equal(s.research.R02.status,'available');
});

test('funding works after normal main action in same activation, without spending another worker',()=>{
 const s=held(game(),'R05');
 assert.equal(G.moveWorker(s,0,G.workerReachableDistricts(s,0).find(id=>id!=='civic')).ok,true);
 assert.equal(s.activationMainActionUsed,true);
 const used=s.players[0].workers.filter(w=>w.used).length;
 const before=s.players[0].capital;
 assert.equal(G.fundResearch(s,0,'R05').ok,true);
 assert.equal(s.players[0].capital,before-4);
 assert.equal(s.players[0].workers.filter(w=>w.used).length,used);
 assert.equal(s.activationMainActionUsed,true);
});

test('R03 required two completed fire institutions, standard and market, any owner, only on funding',()=>{
 const s=held(game(),'R03');
 let p=G.researchFundingPreview(s,0,'R03');
 assert.equal(p.ok,false);assert.equal(p.reason,'research-prerequisite');
 assert.equal(p.required,2);assert.equal(p.completed,0);
 const before=snap(s);
 assert.equal(G.fundResearch(s,0,'R03').ok,false);
 assert.equal(snap(s),before);
 built(s,'std_fire',{owner:1});
 built(s,'firehouse',{owner:2,status:'under-construction'});
 assert.equal(G.researchFundingPreview(s,0,'R03').completed,1);
 s.constructions[1].status='complete';
 const influence=s.players[0].influence;
 const out=G.fundResearch(s,0,'R03');
 assert.equal(out.ok,true,JSON.stringify(out));
 assert.equal(out.cost,5);assert.equal(out.vp,2);
 assert.equal(out.influence.steps,2);
 assert.ok(s.players[0].influence>influence);
 assert.equal(s.research.R03.status,'funded');
});

test('R04 medical prerequisite includes standard outpatient or market clinic, even if owned by rival',()=>{
 for(const kind of ['std_clinic','clinic']){
   const s=held(game(),'R04');
   built(s,kind,{owner:2});
   assert.equal(G.researchFundingPreview(s,0,'R04').ok,true,kind);
   assert.equal(G.fundResearch(s,0,'R04').ok,true);
   assert.equal(s.players[2].capital,50,'clinic owner receives no sponsor payment');
   assert.equal(s.research.R04.holderId,0);
 }
});

test('unfunded R03/R04 remain held without any citywide effect after unsuccessful funding',()=>{
 const s=game();held(s,'R03');held(s,'R04');
 const original=snap(s);
 assert.equal(G.fundResearch(s,0,'R03').reason,'research-prerequisite');
 assert.equal(G.fundResearch(s,0,'R04').reason,'research-prerequisite');
 assert.equal(snap(s),original);
 assert.deepEqual(G.listResearchStates(s,{status:'held',holderId:0}).map(x=>x.id),['R03','R04']);
});

test('funding is player-owned, one-time; illegal or unaffordable attempts never mutate state',()=>{
 for(const variant of ['wrong-owner','free','already-funded','broke','not-turn','wrong-phase','invalid-id']){
   const s=game();held(s,'R06',variant==='wrong-owner'?1:0);
   if(variant==='free')s.research.R06={status:'available',holderId:null,fundedRound:null};
   if(variant==='already-funded')s.research.R06={status:'funded',holderId:0,fundedRound:1};
   if(variant==='broke')s.players[0].capital=3;
   if(variant==='not-turn')s.developmentPlayer=1;
   if(variant==='wrong-phase')s.phase='declare';
   const before=snap(s);
   const out=G.fundResearch(s,0,variant==='invalid-id'?'R99':'R06');
   assert.equal(out.ok,false,variant);
   assert.equal(snap(s),before,variant);
 }
});

test('funding R05 is legal in 1905; no invented last-round restriction',()=>{
 const s=held(game(),'R05');s.round=6;s.developmentSlotsUsed=[0,0,0];
 assert.equal(G.fundResearch(s,0,'R05').ok,true);
 assert.equal(s.research.R05.fundedRound,6);
});

test('many held researches can be independently funded in same activation (no hidden cap)',()=>{
 const s=game();held(s,'R01');held(s,'R02');held(s,'R05');
 const first=s.players[0].capital;
 for(const id of ['R01','R02','R05'])assert.equal(G.fundResearch(s,0,id).ok,true,id);
 assert.equal(s.players[0].capital,first-3-4-4);
 assert.equal(G.listResearchStates(s,{status:'funded',holderId:0}).length,3);
 assert.deepEqual(G.validateResearchState(s),[]);
});

test('sponsor Influence uses real moveInfluence steps, passing occupied cells',()=>{
 const s=held(game(),'R03');
 built(s,'firehouse',{owner:1});built(s,'std_fire',{owner:2});
 s.players[0].influence=1;s.players[1].influence=2;s.players[2].influence=4;
 const result=G.fundResearch(s,0,'R03');
 assert.equal(result.ok,true);
 assert.equal(result.influence.steps,2);
 assert.equal(result.influence.to,5);
 assert.equal(s.players[1].influence,2);
 assert.equal(s.players[2].influence,4);
});

test('reloading a funded card cannot replay funding or sponsor rewards',()=>{
 const s=held(game(),'R02');
 assert.equal(G.fundResearch(s,0,'R02').ok,true);
 const serialized=snap(s);
 const reloaded=JSON.parse(serialized);
 G.ensureResearchState(reloaded);
 assert.equal(snap(reloaded),serialized);
 assert.equal(G.fundResearch(reloaded,0,'R02').reason,'already-funded');
 assert.equal(snap(reloaded),serialized);
});

test('research funding reads the registry prices/rewards instead of per-ID hardcoding (P22)',()=>{
 const s=game();
 for(const card of RESEARCH_CARDS.filter(c=>!c.requirement)){
  held(s,card.id);
  assert.equal(G.researchFundingPreview(s,0,card.id).cost,card.fundingCost);
  assert.deepEqual(G.researchFundingPreview(s,0,card.id).reward,card.sponsorReward);
 }
});
