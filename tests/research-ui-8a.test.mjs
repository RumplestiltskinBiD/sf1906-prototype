import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const snap=s=>JSON.stringify(s);
function fixture(){
  const s=G.createInitialState({rng:()=>0.3});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
  s.players.forEach(p=>{p.capital=25;p.workersLeft=3;
    p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});});
  s.constructions=[];return s;
}
function campus(s,id,owner=1,districtId='civic',status='complete'){
  s.constructions.push({id,projectId:'polytechnic_campus',playerId:owner,districtId,
    status,materialsDelivered:['Lumber','Lumber','Masonry','Masonry']});
}
test('UI reads exactly one registry, 8 canonical statuses, no extra card pool or hand limit',()=>{
 const s=fixture(),before=snap(s);
 assert.equal(G.listResearchStates(s).length,8);
 assert.deepEqual(G.listResearchStates(s,{status:'available'}).map(x=>x.id),
   G.RESEARCH_STATUSES.includes('available')?['R01','R02','R03','R04','R05','R06','R07','R08']:[]);
 assert.equal(G.researchAcquisitionSources(s,0).length,1);
 assert.equal(snap(s),before,'UI read-only preview must not save a hidden research hand');
});
test('UI Civic source reflects selected worker range without moving him',()=>{
 const s=fixture(),worker=s.players[0].workers[0];
 assert.equal(G.researchAcquisitionSources(s,0)[0].available,true);
 worker.districtId='sunset';
 assert.equal(G.researchAcquisitionSources(s,0)[0].available,false);
 worker.districtId='civic';s.activationMainActionUsed=true;
 assert.equal(G.researchAcquisitionSources(s,0)[0].available,false);
});
test('per-campus sources are derived from COMPLETE constructions with own occupancy and owner',()=>{
 const s=fixture();campus(s,'A',1);campus(s,'B',2);campus(s,'UNFINISHED',0,'civic','under-construction');
 const before=snap(s),sources=G.researchAcquisitionSources(s,0);
 assert.equal(sources.length,3);
 assert.equal(sources[1].constructionId,'A');
 assert.equal(sources[1].ownerId,1);
 assert.equal(sources[1].available,true);
 assert.equal(sources[2].constructionId,'B');
 assert.equal(sources[2].available,true);
 assert.equal(snap(s),before);
 const result=G.acquireResearch(s,0,'R01',{kind:'building',constructionId:'A'});
 assert.equal(result.ok,true);
 const after=G.researchAcquisitionSources(s,0);
 assert.equal(after[1].occupantId,0);
 assert.equal(after[1].available,false);
 assert.equal(s.players[1].capital,26);
});
test('same activation can fund just acquired card with no additional worker',()=>{
 const s=fixture(),before=snap(s);
 assert.equal(G.researchFundingPreview(s,0,'R01').reason,'not-research-holder');
 assert.equal(G.acquireResearch(s,0,'R01',{kind:'civic'}).ok,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.players[0].capital,25);
 const p=G.researchFundingPreview(s,0,'R01');
 assert.equal(p.ok,true);assert.equal(p.cost,3);
 assert.equal(s.players[0].workersLeft,2);
 const out=G.fundResearch(s,0,'R01');
 assert.equal(out.ok,true);assert.equal(out.vp,2);
 assert.equal(s.players[0].capital,22);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(G.researchFundingPreview(s,0,'R01').reason,'already-funded');
 assert.notEqual(snap(s),before);
});
test('held research is private, funded effect public, no retroactive acquisition after financing',()=>{
 const s=fixture();
 assert.equal(G.acquireResearch(s,0,'R07').ok,true);
 s.developmentPlayer=1;s.activationMainActionUsed=false;s.activeWorkerId=s.players[1].workers[0].id;
 const before=snap(s);
 assert.equal(G.researchFundingPreview(s,1,'R07').reason,'not-research-holder');
 assert.equal(G.acquireResearch(s,1,'R07').reason,'research-unavailable');
 assert.equal(snap(s),before);
 s.developmentPlayer=0;s.activationMainActionUsed=true;
 assert.equal(G.fundResearch(s,0,'R07').ok,true);
 assert.equal(G.purchaseMaterialUnitPrice(s,{kind:'node',id:'southernpacific'},'Lumber'),2);
});
test('unlimited held cards are visible as canonical held entries and funding is optional',()=>{
 const s=fixture();
 const names=['R02','R03','R04','R05','R06','R07','R08'];
 for(const id of names)Object.assign(s.research[id],{status:'held',holderId:0,fundedRound:null});
 const preview=G.listResearchStates(s,{status:'held',holderId:0});
 assert.equal(preview.length,7);
 assert.equal(G.researchFundingPreview(s,0,'R03').reason,'research-prerequisite');
 assert.equal(G.researchFundingPreview(s,0,'R04').reason,'research-prerequisite');
 assert.equal(s.players[0].capital,25);
});
test('campus availability clears across new round, not when closing an office or other UI panel',()=>{
 const s=fixture();campus(s,'CAMP');
 assert.equal(G.acquireResearch(s,0,'R02',{kind:'building',constructionId:'CAMP'}).ok,true);
 const now=snap(s);
 assert.equal(G.researchAcquisitionSources(s,0)[1].available,false);
 assert.equal(snap(s),now);
 // After the main action, the player passes but this campus remains occupied this year.
 assert.equal(G.endActivation(s,0).ok,true);
 const nextPlayer=s.developmentPlayer;
 assert.ok(Number.isInteger(nextPlayer)&&nextPlayer!==0);
 s.activeWorkerId=s.players[nextPlayer].workers[0].id;
 assert.equal(G.researchAcquisitionSources(s,nextPlayer)[1].available,false);
 // New year's canonical occupancy reset reopens the physical campus.
 s.round=2;s.actionSpaceOccupancy={};s.activationMainActionUsed=false;
 assert.equal(G.researchAcquisitionSources(s,nextPlayer)[1].available,true);
});
test('old saves without research field render canonical available cards, without mutating state',()=>{
 const s=fixture();delete s.research;
 const before=snap(s);
 assert.equal(G.researchCardState(s,'R01').status,'available');
 assert.equal(G.listResearchStates(s).length,8);
 assert.equal(snap(s),before);
});
