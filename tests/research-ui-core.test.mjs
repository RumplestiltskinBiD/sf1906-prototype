import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {RESEARCH_CARDS} from '../research-cards.js';

const snapshot=x=>JSON.stringify(x);
function game(){
 const s=G.createInitialState({rng:()=>0.31});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.players.forEach(p=>{
   p.capital=50;p.prestige=0;p.portfolio=[];p.workersLeft=3;
   p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];s.actionSpaceOccupancy={};
 return s;
}
function campus(s,id='C1',owner=1,district='civic',status='complete'){
 s.constructions.push({id,projectId:'polytechnic_campus',playerId:owner,districtId:district,
   status,materialsDelivered:status==='complete'?['Lumber','Lumber','Masonry','Masonry']:[],
   completedRound:status==='complete'?1:null});
}
function activate(s,pid){
 s.developmentPlayer=pid;s.activationMainActionUsed=false;
 s.activeWorkerId=s.players[pid].workers.find(w=>!w.jailed&&!w.used)?.id||null;
}

test('8A catalogue is exactly the canonical 8 unique research IDs and pure listing',()=>{
 const s=game(),before=snapshot(s);
 const list=G.listResearchStates(s);
 assert.equal(list.length,RESEARCH_CARDS.length);
 assert.deepEqual(list.map(x=>x.id),RESEARCH_CARDS.map(x=>x.id));
 assert.deepEqual(list.map(x=>x.status),Array(8).fill('available'));
 assert.equal(snapshot(s),before);
});
test('8A Civic Center main acquisition then free funding spends one worker only',()=>{
 const s=game(),money=s.players[0].capital,beforeLand=s.districts.marina.landValue;
 const sources=G.researchAcquisitionSources(s,0);
 assert.equal(sources[0].kind,'civic');assert.equal(sources[0].available,true);
 const out=G.acquireResearch(s,0,'R01',{kind:'civic'});
 assert.equal(out.ok,true);assert.equal(out.ownerReward,0);
 assert.equal(s.research.R01.status,'held');
 assert.equal(s.players[0].workersLeft,2);assert.equal(s.activationMainActionUsed,true);
 assert.equal(s.players[0].capital,money);
 assert.equal(G.researchFundingPreview(s,0,'R01').ok,true);
 const funded=G.fundResearch(s,0,'R01');
 assert.equal(funded.ok,true);
 assert.equal(s.players[0].capital,money-3);
 assert.equal(s.players[0].prestige,2);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.research.R01.status,'funded');
 assert.equal(s.districts.marina.landValue,Math.max(0,beforeLand-1));
 assert.equal(G.researchAcquisitionSources(s,0)[0].available,false);
});
test('8A campus visitor reward and occupied space, rival cannot re-use physical campus',()=>{
 const s=game();campus(s);
 const visitorMoney=s.players[0].capital,ownerMoney=s.players[1].capital;
 const acquisition=G.acquireResearch(s,0,'R03',{kind:'building',constructionId:'C1'});
 assert.equal(acquisition.ok,true);assert.equal(acquisition.ownerReward,1);
 assert.equal(s.players[0].capital,visitorMoney);assert.equal(s.players[1].capital,ownerMoney+1);
 assert.equal(s.actionSpaceOccupancy.C1,0);
 activate(s,1);
 const before=snapshot(s);
 assert.equal(G.researchAcquisitionSources(s,1)[1].available,false);
 assert.equal(G.acquireResearch(s,1,'R04',{kind:'building',constructionId:'C1'}).reason,'occupied');
 assert.equal(snapshot(s),before);
});
test('8A two campuses provide two independently occupied slots in one year',()=>{
 const s=game();campus(s,'C1',1);campus(s,'C2',2);
 assert.equal(G.acquireResearch(s,0,'R03',{kind:'building',constructionId:'C1'}).ok,true);
 activate(s,1);
 const options=G.researchAcquisitionSources(s,1);
 assert.equal(options.find(x=>x.constructionId==='C1').available,false);
 assert.equal(options.find(x=>x.constructionId==='C2').available,true);
 assert.equal(G.acquireResearch(s,1,'R04',{kind:'building',constructionId:'C2'}).ok,true);
 assert.deepEqual(s.actionSpaceOccupancy,{C1:0,C2:1});
 assert.equal(s.players[1].capital,51);
 assert.equal(s.players[2].capital,51);
});
test('8A cards may be held without prerequisite and multiple held cards persist reload',()=>{
 const s=game();G.acquireResearch(s,0,'R03');
 s.activationMainActionUsed=false;s.developmentSlotsUsed[0]=1;
 s.activeWorkerId=s.players[0].workers[1].id;
 assert.equal(G.acquireResearch(s,0,'R04').ok,true);
 const saved=JSON.parse(snapshot(s));
 assert.deepEqual(G.listResearchStates(saved,{status:'held',holderId:0}).map(x=>x.id),['R03','R04']);
 assert.equal(G.researchFundingPreview(saved,0,'R03').reason,'research-prerequisite');
 assert.equal(G.researchFundingPreview(saved,0,'R04').reason,'research-prerequisite');
 assert.equal(G.validateResearchState(saved).length,0);
});
test('8A funding cards are global yet pay only the actual holder sponsor',()=>{
 const s=game();G.acquireResearch(s,0,'R07');
 activate(s,1);assert.equal(G.researchFundingPreview(s,1,'R07').reason,'not-research-holder');
 const before=snapshot(s);
 assert.equal(G.fundResearch(s,1,'R07').reason,'not-research-holder');
 assert.equal(snapshot(s),before);
 activate(s,0);s.players[0].workers[0].used=true;s.activeWorkerId=s.players[0].workers[1].id;
 assert.equal(G.fundResearch(s,0,'R07').ok,true);
 assert.equal(s.players[0].capital,46);
 assert.equal(s.players[0].prestige,3);
 assert.equal(s.players[1].prestige,0);
 assert.equal(G.purchaseMaterialUnitPrice(s,{kind:'node',id:'broadway'},'Lumber'),2);
});
test('8A no money blocks funding without spending state, still permits free acquisition',()=>{
 const s=game();s.players[0].capital=0;
 assert.equal(G.acquireResearch(s,0,'R06').ok,true);
 const before=snapshot(s);
 const preview=G.researchFundingPreview(s,0,'R06');
 assert.equal(preview.reason,'capital');assert.equal(preview.cost,4);
 assert.equal(G.fundResearch(s,0,'R06').reason,'capital');
 assert.equal(snapshot(s),before);
 assert.equal(s.research.R06.status,'held');
});
test('8A R03 requires two completed fire services at financing, not acquisition',()=>{
 const s=game();assert.equal(G.acquireResearch(s,0,'R03').ok,true);
 assert.equal(G.researchFundingPreview(s,0,'R03').completed,0);
 s.constructions.push({id:'F1',playerId:1,projectId:'std_fire',status:'complete',districtId:'civic'},
   {id:'F2',playerId:2,projectId:'firehouse',status:'under-construction',districtId:'soma'});
 assert.equal(G.researchFundingPreview(s,0,'R03').completed,1);
 s.constructions[1].status='complete';
 assert.equal(G.researchFundingPreview(s,0,'R03').ok,true);
 assert.equal(G.fundResearch(s,0,'R03').ok,true);
 assert.equal(s.research.R03.status,'funded');
});
test('8A cannot acquire another card after worker main action, but may fund held cards',()=>{
 const s=game();
 assert.equal(G.acquireResearch(s,0,'R01').ok,true);
 const before=snapshot(s);
 assert.equal(G.acquireResearch(s,0,'R02').reason,'main-action-unavailable');
 assert.equal(snapshot(s),before);
 assert.equal(G.fundResearch(s,0,'R01').ok,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.activationMainActionUsed,true);
});
test('8A old saves without research get registry state exactly once; no artificial held-card cap',()=>{
 const s=game();delete s.research;
 G.ensureResearchState(s);
 const created=s.research;
 assert.equal(Object.keys(created).length,8);
 G.ensureResearchState(s);
 assert.equal(s.research,created);
 for(const id of ['R01','R02','R03','R04'])
   Object.assign(s.research[id],{status:'held',holderId:0,fundedRound:null});
 const before=snapshot(s);
 G.ensureResearchState(s);
 assert.equal(G.listResearchStates(s,{status:'held',holderId:0}).length,4);
 assert.equal(snapshot(s),before);
});
