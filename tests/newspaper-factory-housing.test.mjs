import test from 'node:test';
import assert from 'node:assert/strict';
import * as G from '../game-core.js';
import {NEWS_CARDS} from '../newspaper-cards.js';

const build=(id,playerId,projectId,districtId='soma',more={})=>({id,playerId,projectId,districtId,status:'complete',materialsDelivered:[...G.projectById(projectId).materials],warehouseInventory:[],completedRound:1,startedRound:1,...more});
function state(){const s=G.createInitialState({rng:()=>0.2});s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;s.constructions=[];s.players.forEach(p=>{p.capital=50;p.portfolio=[];});s.activeWorkerId=s.players[0].workers[0].id;s.players[0].workers[0].districtId='soma';return s;}
test('v0.51 mixed catalog, construction prices, money, VP, vulnerabilities and card quantities',()=>{
 assert.equal(G.PROJECTS.length,31);assert.equal(G.PROJECT_COPIES,2);
 assert.equal(G.PROJECTS.filter(p=>G.projectTypes(p).length===2).length,6);
 const tower=G.projectById('press_tower'),workers=G.projectById('workers_complex');
 assert.deepEqual(tower.types,['Бизнес','Промышленное']);assert.equal(tower.open,6);assert.equal(tower.income,4);assert.equal(tower.prestige,3);assert.equal(tower.landMin,3);
 assert.deepEqual(tower.materials,['Lumber','Masonry','Masonry','Steel','Steel']);
 assert.deepEqual(tower.risk,{earthquake:0,fire:1});
 assert.deepEqual(workers.types,['Жилое','Промышленное']);assert.equal(workers.open,3);assert.equal(workers.income,0);
 assert.deepEqual(workers.materials,['Lumber','Lumber','Masonry']);assert.deepEqual(workers.risk,{earthquake:1,fire:2});
 for(const id of ['press_tower','workers_complex'])assert.equal(G.createProjectCardPool({rng:()=>0.2}).filter(c=>c.id===id).length,2);
});
test('worker housing requires owned completed factory/cannery in same district',()=>{
 const s=state();s.players[0].portfolio=['workers_complex'];s.districts.soma.landValue=0;
 assert.equal(G.constructionEligibility(s,0,'workers_complex','soma').ok,false);
 s.constructions=[build('OTHER',1,'factory')];
 assert.equal(G.constructionEligibility(s,0,'workers_complex','soma').ok,false);
 s.constructions.push(build('F',0,'factory'));
 assert.equal(G.constructionEligibility(s,0,'workers_complex','soma').ok,true);
});
test('factory income doubles after worker complex completion, not industrial physical production',()=>{
 const s=state();const f=build('F',0,'factory'),complex=build('C',0,'workers_complex','soma',{status:'under-construction'});
 s.constructions=[f,complex];
 assert.equal(G.buildingIncome(s,0),5);
 const r=G.completeConstruction(s,complex);assert.equal(r.ok,true,r.reason);
 assert.equal(complex.linkedIndustryId,'F');assert.equal(G.buildingIncome(s,0),10);
 assert.equal(G.workforceIncomeBonus(s,f),5);
 assert.deepEqual(s.pendingWorkforceLinks,[]);
});
test('cannery boosted income includes residential adjacency and never doubles a third-party cannery',()=>{
 const s=state(),can=build('CAN',0,'cannery'),other=build('OTHER',1,'cannery'),complex=build('C',0,'workers_complex','soma',{status:'under-construction'});
 s.constructions=[can,other,complex];
 assert.equal(G.completeConstruction(s,complex).ok,true);
 assert.equal(complex.linkedIndustryId,'CAN'); // Both existing same location, but only owner's cannery qualifies
 assert.equal(G.canneryIncomeBonus(s,can),1); // the completed worker housing counts as Residential
 assert.equal(G.buildingIncome(s,0),4); // (base 1 + housing 1)*2
 assert.equal(G.workforceIncomeBonus(s,other),0);
});
test('when factory AND cannery present, owner chooses exactly one; no stacking on same production',()=>{
 const s=state(),f=build('F',0,'factory'),can=build('CAN',0,'cannery'),
 c1=build('C1',0,'workers_complex','soma',{status:'under-construction'});
 s.constructions=[f,can,c1];assert.equal(G.completeConstruction(s,c1).ok,true);
 assert.equal(c1.linkedIndustryId,undefined);assert.deepEqual(s.pendingWorkforceLinks,['C1']);
 assert.equal(G.canTakeMainAction(s,0),false);
 assert.equal(G.resolveWorkforceLink(s,'C1','OTHER').ok,false);
 assert.equal(G.resolveWorkforceLink(s,'C1','CAN').ok,true);
 assert.deepEqual(s.pendingWorkforceLinks,[]);assert.equal(G.workforceIncomeBonus(s,f),0);
 assert.equal(G.workforceIncomeBonus(s,can),G.projectById('cannery').income+G.canneryIncomeBonus(s,can));
 const c2=build('C2',0,'workers_complex','soma',{status:'under-construction'});
 s.constructions.push(c2);assert.equal(G.completeConstruction(s,c2).ok,true);
 assert.equal(c2.linkedIndustryId,'F');assert.equal(G.workforceIncomeBonus(s,f),5);
});
test('press campaign queues after newspaper effects and before annual income; non-repeating on retry and final year',()=>{
 const s=state(),tower=build('P',0,'press_tower','financial');s.constructions=[tower];
 s.newsCurrentIds=['E01'];s.newsDeck=NEWS_CARDS.filter(c=>c.id!=='E01').map(c=>c.id);
 s.developmentComplete=true;s.developmentPlayer=null;
 s.players[0].capital=8;s.players[0].influence=7;
 const pending=G.cleanupMarket(s,{rng:()=>0.3});
 assert.equal(pending.reason,'pending-press-campaign');assert.equal(s.newsLastResolvedRound,1);
 assert.equal(G.currentPressCampaign(s).id,'P');
 assert.equal(s.players[0].capital,8,'campaign choice not collected automatically');
 assert.equal(G.cleanupMarket(s).reason,'pending-press-campaign','repeat does not create a second choice');
 const campaign=G.resolvePressCampaign(s,'P','cash');
 assert.equal(campaign.ok,true);assert.equal(s.players[0].capital,10);
 assert.equal(G.currentPressCampaign(s),null);
 assert.equal(G.resolvePressCampaign(s,'P','cash').ok,false);
 const r=G.cleanupMarket(s,{rng:()=>0.3});
 assert.equal(r.ok,true,r.reason);assert.equal(s.newsArchive.length,1);
 assert.equal(tower.pressCampaignRound,1);
});
test('political press option spends existing $2 and moves political influence one step; no negative capital',()=>{
 const s=state();const p=build('P',0,'press_tower','financial');
 s.constructions=[p];s.developmentComplete=true;s.developmentPlayer=null;
 s.players[0].capital=1;s.players[0].influence=7;
 assert.equal(G.cleanupMarket(s).reason,'pending-press-campaign');
 assert.equal(G.resolvePressCampaign(s,'P','influence').reason,'capital');
 assert.equal(s.players[0].capital,1);
 s.players[0].capital=3;const inf=s.players[0].influence;
 assert.equal(G.resolvePressCampaign(s,'P','influence').ok,true);
 assert.equal(s.players[0].capital,1);assert.ok(s.players[0].influence>inf);
});
