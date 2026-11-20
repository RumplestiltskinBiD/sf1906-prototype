import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {researchCardById} from '../research-cards.js';

const snap=state=>JSON.stringify(state);
const targetsDown=['marina','financial','soma','mission','missionbay'];
const targetsUp=['pacific','chinatown'];
const targets=new Set([...targetsDown,...targetsUp]);
const land=state=>Object.fromEntries(Object.entries(state.districts).map(([id,d])=>[id,d.landValue]));
function game(){
 const s=G.createInitialState({rng:()=>0.23});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];
 s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.players.forEach(p=>{
   p.capital=50;p.prestige=0;p.workersLeft=3;
   p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];
 return s;
}
function hold(state,id='R01',owner=0){
 Object.assign(state.research[id],{status:'held',holderId:owner,fundedRound:null});
 return state;
}

test('R01 card registry, preview and unfunded state do not change any land prices',()=>{
 const s=hold(game());
 const card=researchCardById('R01');
 assert.equal(card.effect.type,'land-revaluation-once');
 assert.deepEqual(card.effect.poorGroundDistricts,targetsDown);
 assert.deepEqual(card.effect.stableGroundDistricts,targetsUp);
 const before=snap(s);
 const preview=G.researchFundingPreview(s,0,'R01');
 assert.equal(preview.ok,true);
 assert.equal(preview.effectType,'land-revaluation-once');
 assert.equal(preview.landValueChanges.length,7);
 assert.deepEqual(preview.landValueChanges.map(c=>c.districtId),[...targetsDown,...targetsUp]);
 assert.equal(snap(s),before,'preview must be pure and held R01 must remain inert');
});

test('R01 funding changes exactly five districts down and two up from CURRENT land value',()=>{
 const s=hold(game());
 const previous=land(s);
 const before=s.players[0].capital;
 const result=G.fundResearch(s,0,'R01');
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(result.landValueChanges.length,7);
 assert.equal(s.players[0].capital,before-3);
 assert.equal(s.players[0].prestige,2);
 assert.equal(s.research.R01.status,'funded');
 assert.equal(s.research.R01.fundedRound,1);
 assert.equal(s.research.R01.holderId,0);
 for(const id of targetsDown)assert.equal(s.districts[id].landValue,previous[id]-1,id);
 for(const id of targetsUp)assert.equal(s.districts[id].landValue,previous[id]+1,id);
 for(const [id,value] of Object.entries(previous))if(!targets.has(id))
   assert.equal(s.districts[id].landValue,value,'untargeted '+id);
 assert.equal(s.players[1].capital,50);
 assert.equal(s.players[2].capital,50);
 assert.deepEqual(G.validateResearchState(s),[]);
});

test('R01 uses live modified prices, never initial immutable DISTRICTS values',()=>{
 const s=hold(game());
 assert.equal(G.setLandValue(s,'soma',5).ok,true);
 assert.equal(G.setLandValue(s,'chinatown',1).ok,true);
 assert.equal(G.setLandValue(s,'financial',6).ok,true);
 const originalDefaults=Object.fromEntries(G.DISTRICTS.map(d=>[d.id,d.landValue]));
 assert.equal(G.fundResearch(s,0,'R01').ok,true);
 assert.equal(s.districts.soma.landValue,4);
 assert.equal(s.districts.chinatown.landValue,2);
 assert.equal(s.districts.financial.landValue,5);
 assert.equal(G.DISTRICTS.find(d=>d.id==='soma').landValue,originalDefaults.soma);
 assert.equal(G.DISTRICTS.find(d=>d.id==='chinatown').landValue,originalDefaults.chinatown);
});

test('R01 floor 0 and ceiling 6 are respected; even clamped targets are reported only once',()=>{
 const s=hold(game());
 for(const id of targetsDown)G.setLandValue(s,id,0);
 for(const id of targetsUp)G.setLandValue(s,id,6);
 const result=G.fundResearch(s,0,'R01');
 assert.equal(result.ok,true);
 assert.equal(result.landValueChanges.length,7);
 for(const id of targetsDown)assert.equal(s.districts[id].landValue,0,id);
 for(const id of targetsUp)assert.equal(s.districts[id].landValue,6,id);
 assert.ok(result.landValueChanges.every(change=>change.from===change.to));
});

test('R01 truly changes construction land charge only for FUTURE purchases; old purchase is not refunded',()=>{
 const s=hold(game());
 s.players[0].workers[0].districtId='marina';
 const originalCash=s.players[0].capital;
 const started=G.beginConstruction(s,0,'std_warehouse','marina');
 assert.equal(started.ok,true,JSON.stringify(started));
 assert.equal(started.landCost,3);
 assert.equal(started.standardFee,2);
 assert.equal(s.players[0].capital,originalCash-5);
 const originalConstruction=snap(started.construction);
 const paid=G.fundResearch(s,0,'R01');
 assert.equal(paid.ok,true,JSON.stringify(paid));
 assert.equal(s.players[0].capital,originalCash-5-3,'no retroactive payment adjustment');
 assert.equal(snap(started.construction),originalConstruction,'existing construction untouched');
 assert.equal(s.districts.marina.landValue,2);
 s.developmentPlayer=1;s.activationMainActionUsed=false;
 s.activeWorkerId=s.players[1].workers[0].id;
 s.players[1].workers[0].districtId='marina';
 const later=G.beginConstruction(s,1,'std_warehouse','marina');
 assert.equal(later.ok,true,JSON.stringify(later));
 assert.equal(later.landCost,2,'later buyer pays updated land price');
 assert.equal(later.standardFee,2);
 assert.equal(s.players[1].capital,46);
});

test('R01 can be acquired and funded in a real single-worker activation',()=>{
 const s=game(),before=land(s);
 const acquired=G.acquireResearch(s,0,'R01');
 assert.equal(acquired.ok,true,JSON.stringify(acquired));
 assert.deepEqual(land(s),before,'acquisition does not affect prices');
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.players[0].prestige,0);
 assert.equal(G.fundResearch(s,0,'R01').ok,true);
 assert.equal(s.players[0].workersLeft,2,'funding does not consume second worker');
 assert.equal(s.developmentSlotsUsed[0],0);
 assert.equal(s.districts.missionbay.landValue,Math.max(0,before.missionbay-1));
});

test('R01 cannot be funded twice by any player, including after JSON reload',()=>{
 const s=hold(game());
 assert.equal(G.fundResearch(s,0,'R01').ok,true);
 const after=snap(s);
 const cloned=JSON.parse(after);
 G.ensureResearchState(cloned);
 assert.equal(snap(cloned),after);
 assert.equal(G.fundResearch(cloned,0,'R01').reason,'already-funded');
 assert.equal(G.fundResearch(cloned,1,'R01').reason,'already-funded');
 assert.equal(snap(cloned),after,'no second land shift, rewards or logs');
});

test('R01 invalid attempts preserve every district and the full game state',()=>{
 for(const variant of ['not-held','wrong-holder','funded','broke','wrong-player-turn','wrong-phase']){
   const s=hold(game(),'R01',variant==='wrong-holder'?1:0);
   if(variant==='not-held')s.research.R01={status:'available',holderId:null,fundedRound:null};
   if(variant==='funded')s.research.R01={status:'funded',holderId:0,fundedRound:1};
   if(variant==='broke')s.players[0].capital=2;
   if(variant==='wrong-player-turn')s.developmentPlayer=1;
   if(variant==='wrong-phase')s.phase='declare';
   const before=snap(s);
   assert.equal(G.fundResearch(s,0,'R01').ok,false,variant);
   assert.equal(snap(s),before,variant);
 }
});

test('malformed current Land Value fails atomically before deducting funding or rewarding sponsor',()=>{
 const s=hold(game());
 s.districts.marina.landValue='not-a-number';
 const before=snap(s);
 const out=G.fundResearch(s,0,'R01');
 assert.deepEqual(out,{ok:false,reason:'research-effect-invalid',districtId:'marina'});
 assert.equal(snap(s),before);
});

test('funding other research has no instant land revaluation even when R01 is held',()=>{
 const s=hold(game());hold(s,'R02');
 const before=land(s);
 const out=G.fundResearch(s,0,'R02');
 assert.equal(out.ok,true);
 assert.deepEqual(out.landValueChanges,[]);
 assert.deepEqual(land(s),before);
 assert.equal(s.research.R01.status,'held');
});

test('later changes through canonical setLandValue remain possible after R01',()=>{
 const s=hold(game());
 assert.equal(G.fundResearch(s,0,'R01').ok,true);
 const price=s.districts.marina.landValue;
 assert.equal(G.setLandValue(s,'marina',price+1).ok,true);
 assert.equal(s.districts.marina.landValue,price+1);
 assert.equal(s.research.R01.status,'funded');
});

test('last-round R01 funding remains legal and changes land once',()=>{
 const s=hold(game());s.round=6;
 const before=land(s);
 const out=G.fundResearch(s,0,'R01');
 assert.equal(out.ok,true);
 assert.equal(s.research.R01.fundedRound,6);
 assert.equal(s.districts.marina.landValue,before.marina-1);
});

test('two independent players observe same new land price and no per-player revaluation',()=>{
 const s=hold(game(),'R01',2);
 s.developmentPlayer=2;
 s.activeWorkerId=s.players[2].workers[0].id;
 const result=G.fundResearch(s,2,'R01');
 assert.equal(result.ok,true,JSON.stringify(result));
 assert.equal(s.research.R01.holderId,2);
 assert.equal(s.players[0].capital,50,'only sponsor pays');
 assert.equal(s.players[1].capital,50,'only sponsor pays');
 s.developmentPlayer=0;
 for(const pid of [0,1]){
   const constructionPreview=G.constructionEligibility(s,pid,'std_warehouse','marina');
   assert.equal(constructionPreview.landValue,2);
   assert.equal(constructionPreview.landCost,2);
 }
});
