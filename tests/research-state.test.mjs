import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {RESEARCH_CARDS} from '../research-cards.js';

const json=value=>JSON.stringify(value);
const fresh=()=>G.createInitialState({rng:()=>0.2});

test('research foundation: every data card has exactly one available canonical state',()=>{
  const s=fresh();
  const ids=RESEARCH_CARDS.map(c=>c.id);
  assert.equal(ids.length,8);
  assert.equal(new Set(ids).size,ids.length);
  assert.deepEqual(Object.keys(s.research),ids);
  assert.deepEqual(G.listResearchStates(s).map(c=>c.id),ids);
  for(const id of ids){
    assert.deepEqual(G.researchCardState(s,id),{status:'available',holderId:null,fundedRound:null});
  }
  assert.deepEqual(G.validateResearchState(s),[]);
  assert.equal(G.researchCardState(s,'R99'),null);
  assert.equal(s.researchMarket,undefined,'no competing research deck');
  assert.equal(s.players.reduce((n,p)=>n+p.prestige,0),0,'no research sponsor rewards');
});

test('registry initialization must not consume RNG or alter old gameplay setup',()=>{
  let calls=0;
  const s=G.createInitialState({rng:()=>{calls++;return 0.2718;}});
  const afterCalls=calls;
  const without=structuredClone(s);
  delete without.research;
  const same=G.createInitialState({rng:()=>0.2718});
  delete same.research;
  assert.deepEqual(without,same);
  assert.equal(calls,afterCalls);
});

test('old save migration is additive and preserves all economic, worker, city and newspaper state',()=>{
  const s=fresh();
  s.round=4;
  s.phase='development';s.players[0].capital=37;s.players[0].prestige=7;
  s.players[1].workers[0].used=true;
  s.developmentPlayer=1;s.actionSpaceOccupancy={ACT:2};
  s.constructions=[{id:'ACT',projectId:'bank',playerId:0,districtId:'civic',status:'complete'}];
  s.newsCurrentIds=['H02'];s.newsArchive=[{id:'E01',round:3}];
  s.districts.civic.landValue=5;
  s.logisticsSupply.broadway=['Lumber'];
  delete s.research;
  const before=json(s);
  const first=G.ensureResearchState(s);
  assert.deepEqual(G.validateResearchState(s),[]);
  assert.strictEqual(G.ensureResearchState(s),first,'idempotent: same registry and cards');
  const snapshot=structuredClone(s);
  delete snapshot.research;
  assert.equal(json(snapshot),before,'migration changes no other gameplay fields');
  assert.deepEqual(Object.keys(JSON.parse(json(s)).research),RESEARCH_CARDS.map(c=>c.id));
});

test('multiple held cards and funded card persist exactly, with no hand or time limit',()=>{
  const s=fresh();s.round=6;
  const heldA=s.research.R01,heldB=s.research.R02,funded=s.research.R03;
  Object.assign(heldA,{status:'held',holderId:0});
  Object.assign(heldB,{status:'held',holderId:0});
  Object.assign(funded,{status:'funded',holderId:2,fundedRound:2});
  assert.equal(G.listResearchStates(s,{status:'held',holderId:0}).length,2);
  assert.equal(G.listResearchStates(s,{status:'funded'}).length,1);
  const saved=json(s);
  const loaded=JSON.parse(saved);
  G.ensureResearchState(loaded);
  assert.equal(json(loaded),saved,'no annual expiry, no duplicate rewards, stable reload');
  assert.deepEqual(G.validateResearchState(loaded),[]);
  assert.equal(loaded.research.R03.fundedRound,2);
});

test('missing newly registered card receives its slot without rewriting held or funded entries',()=>{
  const s=fresh(), r1=s.research.R01, r2=s.research.R02;
  Object.assign(r1,{status:'funded',holderId:1,fundedRound:1});
  Object.assign(r2,{status:'held',holderId:0});
  delete s.research.R08;
  const originalR1=json(r1),originalR2=json(r2);
  G.ensureResearchState(s);
  assert.equal(json(s.research.R01),originalR1);
  assert.equal(json(s.research.R02),originalR2);
  assert.deepEqual(s.research.R08,{status:'available',holderId:null,fundedRound:null});
  assert.deepEqual(G.validateResearchState(s),[]);
});

test('read-only selectors do not create research or expose mutable state',()=>{
  const s=fresh();
  delete s.research;
  const before=json(s);
  assert.equal(G.listResearchStates(s).length,8);
  assert.equal(G.researchCardState(s,'R01').status,'available');
  assert.equal(json(s),before);
  const t=fresh();
  const snap=G.researchCardState(t,'R01');
  snap.status='funded';snap.holderId=1;
  assert.equal(t.research.R01.status,'available');
});

test('validation rejects invalid IDs, statuses, owners, future funding and duplicate attribution',()=>{
  const s=fresh();
  s.research.R99={status:'available',holderId:null,fundedRound:null};
  s.research.R01.status='held';s.research.R01.holderId=99;
  s.research.R02.status='funded';s.research.R02.holderId=1;s.research.R02.fundedRound=9;
  s.research.R03.status='available';s.research.R03.holderId=2;
  s.research.R04.status='incorrect';
  const errors=G.validateResearchState(s);
  for(const key of ['R99:unknown-id','R01:invalid-held','R02:invalid-funded',
                    'R03:available-has-owner-or-round','R04:invalid-status'])assert.ok(errors.includes(key),key);
  assert.deepEqual(G.validateResearchState({...s,research:null}),['missing-research-state']);
  assert.equal(s.research.R01.holderId,99,'diagnostics must not rewrite corrupted history');
});

test('fresh canonical research state remains unfunded while science action is available',()=>{
  const s=fresh();
  const p=G.projectById('polytechnic_campus');
  assert.equal(p.actionName,'Научная программа');
  assert.match(p.actionText,/1 раз на здание в год/);
  assert.equal(s.players[0].prestige,0);
  assert.equal(s.research.R01.status,'available');
  assert.equal(s.research.R07.status,'available');
  assert.equal(G.districts===undefined,true,'no alternative district registry introduced');
});
