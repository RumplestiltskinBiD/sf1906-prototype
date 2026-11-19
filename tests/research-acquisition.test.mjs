import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const snapshot=s=>JSON.stringify(s);
function game(){
  const s=G.createInitialState({rng:()=>0.17});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];
  s.activationMainActionUsed=false;
  s.pendingBreadProduction=[];s.pendingSailorRecruitments=[];s.pendingPressCampaigns=[];
  s.pendingWorkforceLinks=[];s.newsF04Notices=null;s.newsE01Contracts=null;
  s.newsCurrentIds=['H03'];s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
  s.players.forEach(p=>{
    p.capital=40;p.prestige=0;p.portfolio=[];
    p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
    p.workersLeft=3;
  });
  s.activeWorkerId=s.players[0].workers[0].id;
  s.constructions=[];s.actionSpaceOccupancy={};
  return s;
}
function campus(s,{id='CAMP',owner=1,district='civic',status='complete'}={}){
  const c={id,projectId:'polytechnic_campus',playerId:owner,districtId:district,status,
    startedRound:1,completedRound:status==='complete'?1:null,
    materialsDelivered:status==='complete'?['Lumber','Lumber','Masonry','Masonry']:[]};
  s.constructions.push(c);return c;
}
function activate(s,player=0){
  s.developmentPlayer=player;s.developmentComplete=false;
  s.activationMainActionUsed=false;
  s.activeWorkerId=s.players[player].workers.find(w=>!w.used&&!w.jailed)?.id||null;
}
test('research civic acquisition uses one real worker main action without funding, VP or other rewards',()=>{
 const s=game(),cash=s.players[0].capital,inf=s.players[0].influence;
 const r=G.acquireResearch(s,0,'R01');
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.source,'civic');assert.equal(r.ownerReward,0);
 assert.deepEqual(s.research.R01,{status:'held',holderId:0,fundedRound:null});
 assert.equal(s.players[0].workers[0].used,true);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(s.activationMainActionUsed,true);
 assert.equal(s.players[0].capital,cash);
 assert.equal(s.players[0].influence,inf);
 assert.equal(s.players[0].prestige,0);
 assert.deepEqual(G.validateResearchState(s),[]);
 assert.equal(s.research.R02.status,'available');
});

test('R03 and R04 may be acquired before any clinic or firehouse exists',()=>{
 const s=game();
 assert.equal(s.constructions.length,0);
 assert.equal(G.acquireResearch(s,0,'R03').ok,true);
 activate(s,1);
 assert.equal(G.acquireResearch(s,1,'R04').ok,true);
 assert.equal(s.research.R03.status,'held');
 assert.equal(s.research.R04.status,'held');
 assert.equal(s.players[1].capital,40);
});

test('unique cards cannot be stolen, repicked, funded or duplicated by acquisition',()=>{
 const s=game();
 assert.equal(G.acquireResearch(s,0,'R05').ok,true);
 activate(s,1);
 const before=snapshot(s);
 const res=G.acquireResearch(s,1,'R05');
 assert.deepEqual(res,{ok:false,reason:'research-unavailable'});
 assert.equal(snapshot(s),before);
 assert.equal(G.acquireResearch(s,1,'R06').ok,true);
 assert.equal(G.listResearchStates(s,{status:'held'}).length,2);
});

test('no hand limit or artificial expiry: same player can hold at least three different cards',()=>{
 const s=game();
 for(let i=0;i<3;i++){
   s.activationMainActionUsed=false;
   s.activeWorkerId=s.players[0].workers[i].id;
   if(i>0)s.developmentSlotsUsed[0]=i;
   assert.equal(G.acquireResearch(s,0,['R01','R03','R04'][i]).ok,true);
 }
 assert.equal(G.listResearchStates(s,{status:'held',holderId:0}).length,3);
 const after=JSON.parse(snapshot(s));
 assert.equal(G.listResearchStates(after,{status:'held',holderId:0}).length,3);
 assert.equal(G.validateResearchState(after).length,0);
});

test('the civic district is NOT one shared player-built action space',()=>{
 const s=game();
 assert.equal(G.acquireResearch(s,0,'R01').ok,true);
 activate(s,1);
 assert.equal(G.acquireResearch(s,1,'R02').ok,true);
 assert.deepEqual(s.actionSpaceOccupancy,{});
 assert.equal(s.research.R02.holderId,1);
});

test('campus is a physical single-use action space; outsider pays nothing, owner gets bank $1',()=>{
 const s=game();campus(s);
 const beforeOwner=s.players[1].capital,visitorCash=s.players[0].capital;
 const out=G.acquireResearch(s,0,'R01',{kind:'building',constructionId:'CAMP'});
 assert.equal(out.ok,true,JSON.stringify(out));assert.equal(out.ownerReward,1);
 assert.equal(s.actionSpaceOccupancy.CAMP,0);
 assert.equal(s.players[1].capital,beforeOwner+1);
 assert.equal(s.players[0].capital,visitorCash);
 assert.equal(s.players[0].workers[0].used,true);
 activate(s,1);
 const before=snapshot(s);
 assert.deepEqual(G.acquireResearch(s,1,'R02',{kind:'building',constructionId:'CAMP'}),{ok:false,reason:'occupied'});
 assert.equal(snapshot(s),before,'failure cannot consume worker or pay twice');
});

test('campus owned and used by its owner does not pay bank reward',()=>{
 const s=game();campus(s,{owner:0});
 const prior=s.players[0].capital;
 assert.equal(G.acquireResearch(s,0,'R06',{kind:'building',constructionId:'CAMP'}).ok,true);
 assert.equal(s.players[0].capital,prior);
 assert.equal(s.actionSpaceOccupancy.CAMP,0);
});

test('multiple campus copies have independent action spaces and both can reward',()=>{
 const s=game();campus(s,{id:'C1'});campus(s,{id:'C2',owner:2});
 assert.equal(G.acquireResearch(s,0,'R01',{kind:'building',constructionId:'C1'}).ok,true);
 activate(s,1);
 assert.equal(G.acquireResearch(s,1,'R02',{kind:'building',constructionId:'C2'}).ok,true);
 assert.deepEqual(s.actionSpaceOccupancy,{C1:0,C2:1});
 assert.equal(s.players[1].capital,41,'owner of C1 rewarded for visitor');
 assert.equal(s.players[2].capital,41,'owner of C2 rewarded for visitor');
});

test('sources describe reachability, ownership and occupancy without changing game',()=>{
 const s=game();campus(s,{id:'B1',district:'civic'});campus(s,{id:'B2',district:'sunset'});
 const original=snapshot(s);
 const options=G.researchAcquisitionSources(s,0);
 assert.equal(options.length,3);
 assert.equal(options[0].kind,'civic');assert.equal(options[0].available,true);
 assert.equal(options[1].ownerId,1);assert.equal(options[1].available,true);
 assert.equal(options[2].available,false);
 assert.equal(snapshot(s),original);
});

test('invalid/unfinished/distant source cannot consume action or change money or records',()=>{
 for(const variant of ['unknown','unfinished','distant','non-science','wrong-kind','invalid-card']){
   const s=game();
   campus(s,{id:'CAMP',district:variant==='distant'?'sunset':'civic',
     status:variant==='unfinished'?'under-construction':'complete'});
   if(variant==='non-science')s.constructions[0].projectId='bank';
   const source=variant==='unknown'?{kind:'building',constructionId:'OTHER'}
     :variant==='wrong-kind'?{kind:'impossible'}
     :{kind:'building',constructionId:'CAMP'};
   const before=snapshot(s);
   const r=G.acquireResearch(s,0,variant==='invalid-card'?'R99':'R01',source);
   assert.equal(r.ok,false,variant);
   assert.equal(snapshot(s),before,variant);
 }
});

test('unavailable action/worker and corrupted owned status cannot spend or override',()=>{
 const s=game();s.activeWorkerId=null;
 let before=snapshot(s);assert.equal(G.acquireResearch(s,0,'R01').ok,false);
 assert.equal(snapshot(s),before);
 s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=true;
 before=snapshot(s);assert.equal(G.acquireResearch(s,0,'R01').ok,false);assert.equal(snapshot(s),before);
 s.activationMainActionUsed=false;s.research.R01={status:'funded',holderId:2,fundedRound:1};
 before=snapshot(s);assert.deepEqual(G.acquireResearch(s,0,'R01'),{ok:false,reason:'research-unavailable'});
 assert.equal(snapshot(s),before);
});

test('new research-enabled building can use same generic source property (P22)',()=>{
 const s=game();
 campus(s,{id:'EXT'});
 // A new research-capable project only needs an explicit catalog property;
 // no second action, reward or occupancy engine is introduced.
 assert.equal(G.projectById('polytechnic_campus').researchAcquisitionSource,true);
 assert.equal(G.researchAcquisitionSources(s,0).some(p=>p.constructionId==='EXT'),true);
});
