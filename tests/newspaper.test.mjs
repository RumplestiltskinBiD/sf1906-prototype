import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {NEWS_CARDS,newsCard,newsYear} from '../newspaper-cards.js';

function game(cardId,{rng=()=>0.37}={}){
  const s=G.createInitialState({rng});
  s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;
  s.newsCurrentIds=[cardId];s.newsEmergency={};
  s.players.forEach(p=>{p.capital=30;p.influence=5;p.prestige=5;});
  return s;
}
function put(s,projectId,districtId,playerId=0,status='complete'){
  s.constructions.push({id:'N'+s.constructions.length,projectId,districtId,playerId,status,
    startedRound:1,completedRound:status==='complete'?1:null,materialsDelivered:[],warehouseInventory:[]});
}
test('newspaper holds 18 distinct issues and six years of forecast',()=>{
  assert.equal(NEWS_CARDS.length,18);
  assert.equal(new Set(NEWS_CARDS.map(c=>c.id)).size,18);
  assert.equal(newsYear(1),1900);
  assert.equal(newsYear(6),1905);
  assert.equal(G.MAX_ROUNDS,6);
  for(const c of NEWS_CARDS){
    assert.ok(c.title&&c.article&&c.target&&c.frequency&&c.resource);
    assert.equal(newsCard(c.id),c);
  }
});
test('police is a normal project competing for land and construction time',()=>{
  const p=G.projectById('police');
  assert.equal(p.type,'Городская служба');
  assert.deepEqual(p.materials,['Lumber','Masonry','Steel']);
  assert.equal(p.prestige,3);
  assert.equal(p.income,0);
  assert.deepEqual(G.projectTypes(p),['Общественное']);
  assert.equal(p.accessAll,undefined);
});
test('only complete projects contribute to a newspaper and police covers neighbours',()=>{
  const s=game('C01');
  put(s,'shops','financial',0);
  put(s,'shops','civic',0);
  put(s,'shops','mission',1);
  put(s,'police','financial',2);
  put(s,'shops','marina',0,'under-construction');
  const preview=G.newsPreview(s);
  assert.equal(preview.entries.length,3);
  assert.deepEqual(new Set(preview.protected),new Set(['financial','civic']));
  assert.deepEqual(preview.threatened,['mission']);
  assert.equal(G.districtAccess(s,'civic').police,true);
  assert.equal(G.districtAccess(s,'mission').police,false);
  const cash=s.players.map(p=>p.capital);
  const inf=s.players.map(p=>p.influence);
  const result=G.resolveNewspaper(s);
  assert.equal(result.ok,true);
  assert.equal(s.players[0].capital,cash[0]);
  assert.equal(s.players[1].capital,cash[1]-2);
  assert.equal(s.players[2].influence,inf[2]+1);
  assert.equal(s.newsArchive[0].entries.length,3);
  assert.equal(s.newsArchive[0].serviceRecognition[0],2);
  assert.equal(G.resolveNewspaper(s).ok,false);
});
test('firehouses counter news only in their own district',()=>{
  const s=game('F02');
  put(s,'shops','financial',1);
  put(s,'shops','civic',1);
  put(s,'firehouse','financial',0);
  const prev=G.newsPreview(s);
  assert.deepEqual(prev.protected,['financial']);
  assert.deepEqual(prev.threatened,['civic']);
  G.resolveNewspaper(s);
  assert.equal(s.players[1].capital,28);
  assert.equal(s.players[0].influence,6);
});
test('clinic protects neighbouring quarters with a road',()=>{
  const s=game('H01');
  put(s,'tenement','civic',0);
  put(s,'clinic','financial',1);
  assert.equal(G.newsPreview(s).entries[0].defended,true);
  assert.equal(G.resolveNewspaper(s).ok,true);
  assert.equal(s.players[0].capital,30);
  assert.equal(s.players[1].influence,6);
});
test('once-per-player penalties require ALL holdings to be covered',()=>{
  const s=game('C04');
  put(s,'tenement','financial',0);
  put(s,'speculative','mission',0);
  put(s,'police','financial',1);
  const prev=G.newsPreview(s);
  assert.equal(prev.entries.length,1);
  assert.equal(prev.entries[0].defended,false);
  assert.equal(prev.entries[0].exposedDistrictIds.length,1);
  G.resolveNewspaper(s);
  assert.equal(s.players[0].influence,4);
  assert.equal(s.players[1].influence,6);
});
test('emergency costs one worker action and $1, protects for only current issue',()=>{
  const s=game('C01');
  put(s,'shops','civic',1);
  const pid=0;
  s.activeWorkerId=s.players[pid].workers[0].id;
  s.players[pid].workers[0].districtId='civic';
  const before=s.players[0].capital;
  assert.equal(G.takeNewspaperEmergency(s,pid,'missionbay').ok,false);
  assert.equal(s.players[0].capital,before);
  const r=G.takeNewspaperEmergency(s,pid,'civic');
  assert.equal(r.ok,true);
  assert.equal(s.players[0].capital,before-1);
  assert.equal(s.players[0].workers[0].used,true);
  assert.equal(s.activationMainActionUsed,true);
  assert.ok(s.newsEmergency.civic);
  assert.equal(G.takeNewspaperEmergency(s,pid,'civic').ok,false);
  const prev=G.newsPreview(s);
  assert.equal(prev.entries[0].defended,true);
  G.resolveNewspaper(s);
  assert.equal(s.players[1].capital,30);
});
test('temporary protection never survives the next newspaper',()=>{
  const s=game('F02');
  s.developmentComplete=true;
  s.newsEmergency.civic={playerId:0,cardId:'F02',round:1};
  const r=G.cleanupMarket(s,{rng:()=>0.27});
  assert.equal(r.ok,true);
  assert.equal(s.round,2);
  assert.deepEqual(s.newsEmergency,{});
  assert.equal(s.newsArchive.length,1);
  assert.notEqual(G.activeNewspaper(s)?.id,'F02');
});
test('positive trade issues reward owners only once per district',()=>{
  const s=game('E02');
  put(s,'shops','financial',0);put(s,'club','financial',0);put(s,'hotel','financial',1);
  assert.equal(G.newsPreview(s).entries.length,2);
  G.resolveNewspaper(s);
  assert.equal(s.players[0].capital,32);
  assert.equal(s.players[1].capital,32);
});
test('six-year cleanup is deterministic and issues never repeat',()=>{
  const s=G.createInitialState({rng:()=>0.42});
  let ids=[];
  for(let yr=1;yr<=6;yr++){
    assert.equal(s.round,yr);
    const card=G.activeNewspaper(s);
    assert.ok(card);
    ids.push(card.id);
    s.phase='development';s.developmentComplete=true;
    const done=G.cleanupMarket(s,{rng:()=>0.42});
    assert.equal(done.ok,true);
    assert.equal(s.newsArchive.length,yr);
    assert.equal(s.newsArchive[yr-1].cardId,card.id);
    assert.equal(done.finished,yr===6);
  }
  assert.equal(new Set(ids).size,6);
  assert.equal(s.finished,true);
  assert.equal(s.players.length,3);
  assert.equal(s.newsLastResolvedRound,6);
});
test('failed cleanup cannot trigger end-of-year event prematurely',()=>{
  const s=game('E02');
  put(s,'shops','civic',0);
  const before=s.players[0].capital;
  assert.equal(G.cleanupMarket(s).ok,false);
  assert.equal(s.players[0].capital,before);
  assert.equal(s.newsArchive.length,0);
});
test('every article can calculate from realistic mixed completed projects',()=>{
  for(const card of NEWS_CARDS){
    const s=game(card.id);
    for(const p of G.PROJECTS)put(s,p.id,'civic',0);
    const preview=G.newsPreview(s);
    assert.equal(preview.card.id,card.id);
    assert.ok(Array.isArray(preview.entries));
    assert.ok(G.resolveNewspaper(s).ok);
    assert.ok(s.players[0].capital>=0&&s.players[0].influence>=0&&s.players[0].prestige>=0);
    assert.equal(s.newsArchive[0].cardId,card.id);
  }
});
test('legacy save starts its news without destroying buildings and funds',()=>{
  const s=G.createInitialState({rng:()=>0.33});
  put(s,'shops','financial',0);
  s.players[0].capital=37;
  delete s.newsDeck;delete s.newsCurrentIds;delete s.newsArchive;
  G.ensureNewspaper(s,{rng:()=>0.15});
  assert.equal(s.players[0].capital,37);
  assert.equal(s.constructions.length,1);
  assert.equal(s.newsDeck.length,17);
  assert.equal(s.newsCurrentIds.length,1);
});

test('six-year project supply can fill five market slots in every year',()=>{
  const s=G.createInitialState({rng:()=>0.42});
  const consumed=5+(3*5); // Market plus three 5-card starter hands.
  const available=s.deck.length+consumed;
  assert.equal(G.PROJECT_COPIES,3);
  assert.equal(available,G.PROJECTS.length*3);
  assert.ok(s.deck.length>=5*(G.MAX_ROUNDS-1),
    'Rotating market should not deplete across six rounds even if all five slots are refilled');
  assert.equal(s.marketExtendedForSixYears,true);
});
