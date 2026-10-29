import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';

const rng=()=>0.1;
function scenario({owner=0,developer=1,round=2,stars=0,influence=5,capital=10}={}){
 const s=G.createInitialState({rng});
 s.round=round;s.phase='development';s.view='city';
 s.developmentPlayer=developer;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activeWorkerId=null;
 s.players[owner].influence=influence;
 s.players[owner].suspicion=stars;s.players[owner].capital=capital;
 const con={id:'SL',projectId:'sailorlodging',playerId:owner,districtId:'northbeach',
  status:'complete',materialsDelivered:['Lumber','Lumber','Lumber'],
  completedRound:1,startedRound:1,warehouseInventory:[]};
 s.constructions=[con];s.pendingSailorRecruitments=[con.id];
 return s;
}
const staff=s=>s.players[0].workers;
const act=(s,mode,id=null)=>G.resolveSailorRecruitment(s,'SL',mode,id);

test('sailor E: out-of-turn owner gains +$6 and exactly one ★, influence and actions untouched',()=>{
 for(const initial of [0,1,2]){
  const s=scenario({stars:initial,influence:0});
  const before={slots:JSON.stringify(s.developmentSlotsUsed),inf:s.players[0].influence,capital:s.players[0].capital,dev:s.developmentPlayer};
  const r=act(s,'illegal');
  assert.equal(r.ok,true,JSON.stringify(r));
  assert.equal(r.arrested,false);
  assert.equal(s.players[0].capital,before.capital+6);
  assert.equal(s.players[0].influence,before.inf);
  assert.equal(s.players[0].suspicion,initial+1);
  assert.equal(JSON.stringify(s.developmentSlotsUsed),before.slots);
  assert.equal(s.developmentPlayer,before.dev);
  assert.equal(staff(s).length,3);
  assert.equal(s.pendingSailorRecruitments.length,0);
  assert.equal(G.currentSailorRecruitment(s),null);
  assert.equal(act(s,'illegal').reason,'no-pending');
 }
});

test('sailor E: lawful +$2 never changes stars, including ★★★ and no staff',()=>{
 const s=scenario({stars:3,capital:1,influence:0});
 for(const w of staff(s))G.jailWorker(s,0,w.id);
 const before=JSON.stringify(staff(s));
 const illegal=act(s,'illegal');
 assert.deepEqual(illegal,{ok:false,reason:'no-free-worker'});
 assert.equal(s.players[0].capital,1);
 const r=act(s,'lawful');
 assert.equal(r.ok,true);
 assert.equal(s.players[0].capital,3);
 assert.equal(s.players[0].suspicion,3);
 assert.equal(s.players[0].influence,0);
 assert.equal(JSON.stringify(staff(s)),before);
});

test('sailor E: 3 ★ needs chosen non-prisoner, never consumes trigger on invalid choice',()=>{
 const s=scenario({stars:3,influence:5});
 const frozen=JSON.stringify(s);
 assert.equal(act(s,'illegal').reason,'arrest-worker');
 assert.equal(JSON.stringify(s),frozen);
 assert.equal(act(s,'illegal','unknown').reason,'arrest-worker');
 assert.equal(JSON.stringify(s),frozen);
 const preview=G.arrestSanctionPreview(s,0);
 assert.equal(act(s,'illegal','P1W1').ok,true);
 assert.equal(staff(s)[0].jailed,true);
 assert.equal(staff(s)[0].arrestedRound,2);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].capital,16);
 assert.equal(s.players[0].influence,preview.influenceAfter);
 assert.equal(s.players[0].prestige,preview.vpPenalty===0?0:-preview.vpPenalty);
 assert.equal(staff(s).length,3);
 assert.equal(s.pendingSailorRecruitments.length,0);
});

test('sailor E: at ★★★ no Influence and −3 VP, +$6 still awarded first; used worker can be arrested',()=>{
 const s=scenario({stars:3,influence:0,capital:0});
 staff(s)[1].used=true;
 s.players[0].workersLeft=2;
 const r=act(s,'illegal',staff(s)[1].id);
 assert.equal(r.ok,true);
 assert.equal(r.arrested,true);
 assert.equal(r.arrest.workerId,staff(s)[1].id);
 assert.equal(r.arrest.vpPenalty,3);
 assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(s.players[0].capital,6);
 assert.equal(s.players[0].workersLeft,2);
 assert.equal(staff(s)[1].jailed,true);
});

test('sailor E: incomplete Influence steps cause influence=0 and −3 VP (C1.2 semantics)',()=>{
 const s=scenario({stars:3,influence:2});
 const r=act(s,'illegal','P1W3');
 assert.equal(r.ok,true);
 assert.equal(r.arrest.vpPenalty,3);
 assert.equal(s.players[0].influence,0);
 assert.equal(s.players[0].prestige,-3);
 assert.equal(s.players[0].capital,16);
});

test('sailor E: already jailed staff cannot be selected as culprit; after one arrest star restarts from 0',()=>{
 const s=scenario({stars:3,influence:5});
 G.jailWorker(s,0,'P1W1');
 assert.equal(act(s,'illegal','P1W1').reason,'arrest-worker');
 assert.equal(act(s,'illegal','P1W2').ok,true);
 assert.equal(s.players[0].suspicion,0);
 assert.equal(staff(s).filter(w=>w.jailed).length,2);
 const next={...s.constructions[0],id:'SL-2',sailorRecruitmentRound:null};
 s.constructions.push(next);
 s.pendingSailorRecruitments.push('SL-2');
 const r=G.resolveSailorRecruitment(s,'SL-2','illegal');
 assert.equal(r.ok,true);
 assert.equal(s.players[0].suspicion,1);
 assert.equal(staff(s).filter(w=>w.jailed).length,2);
});

test('sailor E: same port one building cannot award illegal reward twice, nor from wrong phase',()=>{
 const s=scenario({stars:1});
 const wrong=JSON.stringify(s);
 assert.equal(act(s,'invalid').reason,'mode');
 assert.equal(JSON.stringify(s),wrong);
 s.phase='declare';
 assert.equal(act(s,'illegal').reason,'no-pending');
 assert.equal(JSON.stringify(s.players[0]),JSON.stringify(JSON.parse(wrong).players[0]));
 s.phase='development';
 assert.equal(act(s,'illegal').ok,true);
 assert.equal(act(s,'lawful').reason,'no-pending');
 assert.equal(s.players[0].capital,16);
});

test('sailor E: final 1905 imprisonment penalty stacks with C1.2 once only',()=>{
 const s=scenario({round:G.MAX_ROUNDS,stars:3,influence:0});
 s.players[0].prestige=20;
 assert.equal(act(s,'illegal','P1W1').ok,true);
 assert.equal(s.players[0].prestige,17);
 assert.equal(s.players[0].workers[0].jailed,true);
 s.developmentComplete=true;s.developmentPlayer=null;
 s.developmentSlotsUsed=[3,3,3];
 s.newsLastResolvedRound=G.MAX_ROUNDS;s.pressCampaignQueuedRound=G.MAX_ROUNDS;
 s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 const r=G.cleanupMarket(s,{rng});
 assert.equal(r.ok,true,JSON.stringify(r));
 assert.equal(r.finished,true);
 assert.equal(s.players[0].prestige,12);
 assert.equal(s.finalPrisonPenaltyApplied,true);
 const before=JSON.stringify(s);
 assert.deepEqual(G.applyFinalPrisonPenalty(s),{ok:true,applied:false,total:0});
 assert.equal(JSON.stringify(s),before);
});
