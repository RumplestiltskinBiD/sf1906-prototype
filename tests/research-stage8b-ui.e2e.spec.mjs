import {test,expect} from '@playwright/test';
import {
 createInitialState,fundResearch,cleanupMarket,claimCityGoal,
 researchLogisticsForecast,researchLogisticsArrivalReport,LOGISTICS_NODES
} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const screens=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function development({r05=true}={}){
 const s=createInitialState({rng:()=>0.31});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=50;p.workersLeft=3;
   p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.newsCurrentIds=['E02'];s.newsE02TradeWeek={round:s.round,events:[]};
 s.newsF04Notices=null;s.newsE01Contracts=null;s.newsDeck=['H01','H03'];
 if(r05){
   s.research.R05={status:'held',holderId:0,fundedRound:null};
   expect(fundResearch(s,0,'R05',{rng:()=>0.2}).ok).toBe(true);
 }
 return s;
}
function hall({funded=true}={}){
 const s=createInitialState({rng:()=>0.3});
 s.phase='declare';s.view='hall';s.declarationIndex=0;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.newsCurrentIds=['E02'];s.newsC03Offer=null;
 s.players.forEach(p=>{p.capital=30;p.prestige=12;});
 s.research.R06={status:funded?'funded':'held',holderId:funded?2:0,fundedRound:funded?1:null};
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function fits(page,viewport){
 const width=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
 expect(width).toBeLessThanOrEqual(3);
}
test.beforeEach(({page})=>{
 page.on('pageerror',error=>{throw error;});
 page.on('console',message=>{if(message.type()==='error')throw Error(message.text());});
});
for(const viewport of screens){
 test('8B R05 displays exact saved public forecast, no future paper or state mutation '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=development(),forecast=researchLogisticsForecast(s);
  expect(forecast).not.toBeNull();
  await seed(page,s);
  await expect(page.locator('#openResearchForecast')).toBeVisible();
  await page.locator('#openResearchForecast').click();
  await expect(page.locator('[data-research-forecast]')).toBeVisible();
  await expect(page.locator('[data-research-forecast]')).toContainText(String(forecast.year));
  await expect(page.locator('[data-research-forecast-node]')).toHaveCount(LOGISTICS_NODES.length);
  for(const n of LOGISTICS_NODES){
    const row=page.locator('[data-research-forecast-node="'+n.id+'"]');
    await expect(row).toContainText((forecast.supply[n.id]||[]).length+' ед.');
  }
  await expect(page.locator('#researchLogisticsSection')).not.toContainText('H01');
  await expect(page.locator('[data-research-arrival]')).toHaveCount(0);
  expect((await saved(page)).researchLogisticsForecast).toEqual(s.researchLogisticsForecast);
  expect((await saved(page)).newsDeck).toEqual(s.newsDeck);
  await page.reload();
  await page.locator('#researchBtn').click();
  await expect(page.locator('[data-research-forecast-node]')).toHaveCount(5);
  await fits(page,viewport);
 });
 test('8B R05 shows no supply before funding or in 1905 '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=development({r05:false});
  s.research.R05={status:'held',holderId:0,fundedRound:null};
  await seed(page,s);
  await expect(page.locator('#openResearchForecast')).toHaveCount(0);
  await page.locator('#researchBtn').click();
  await expect(page.locator('[data-research-forecast]')).toHaveCount(0);
  await expect(page.locator('#researchLogisticsSection')).toHaveCount(0);
  expect((await saved(page)).research.R05.status).toBe('held');
  const final=development();final.round=6;final.researchLogisticsForecast=null;
  await seed(page,final);
  await page.locator('#researchBtn').click();
  await expect(page.locator('[data-research-no-forecast]')).toContainText('последний экономический год');
  await expect(page.locator('[data-research-forecast]')).toHaveCount(0);
  await fits(page,viewport);
 });
 test('8B R05 explains H03 difference and preserves arrival before player purchases '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=development();s.developmentComplete=true;s.newsDeck=['H03','E01'];
  const planned=structuredClone(s.researchLogisticsForecast.supply);
  expect(cleanupMarket(s,{rng:()=>0.51}).ok).toBe(true);
  expect(s.round).toBe(2);
  const arrival=researchLogisticsArrivalReport(s);
  expect(arrival.adjustment).toBe('H03');
  expect(arrival.planned).toEqual(planned);
  s.logisticsSupply.broadway.shift(); // a player's later purchase must not change the receipt
  await seed(page,s);
  await page.locator('#researchBtn').click();
  await expect(page.locator('[data-research-arrival]')).toContainText('H03');
  await expect(page.locator('[data-research-arrival]')).toContainText('до любых покупок');
  await expect(page.locator('[data-research-planned-node]')).toHaveCount(5);
  await expect(page.locator('[data-research-arrived-node]')).toHaveCount(5);
  for(const n of LOGISTICS_NODES){
    await expect(page.locator('[data-research-planned-node="'+n.id+'"]')).toContainText(arrival.planned[n.id].length+' ед.');
    await expect(page.locator('[data-research-arrived-node="'+n.id+'"]')).toContainText(arrival.actual[n.id].length+' ед.');
  }
  await page.reload();
  await page.locator('#researchBtn').click();
  await expect(page.locator('[data-research-arrival]')).toContainText('H03');
  expect(researchLogisticsArrivalReport(await saved(page))).toEqual(arrival);
  await fits(page,viewport);
 });
 test('8B R06 two genuine City Hall choices: advance is opt-in, once per contract '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=hall(),slot=s.goalMarket.findIndex(x=>x?.id==='C01');
  expect(slot).toBeGreaterThanOrEqual(0);
  await seed(page,s);
  await expect(page.locator('[data-goal-slot="'+slot+'"]')).toBeEnabled();
  await expect(page.locator('[data-goal-advance-slot="'+slot+'"]')).toBeEnabled();
  await expect(page.locator('.goal-advance-note').first()).toContainText('дополнительно −3 VP');
  await page.locator('[data-goal-advance-slot="'+slot+'"]').click();
  let result=await saved(page);
  expect(result.players[0].capital).toBe(33);
  expect(result.players[0].goals[0].advanceAmount).toBe(3);
  expect(result.players[0].goals[0].status).toBe('active');
  await page.reload();
  await page.locator('#officeBtn').click();
  await expect(page.locator('.office-goal')).toContainText('аванс $3');
  expect((await saved(page)).players[0].capital).toBe(33);
  await fits(page,viewport);
 });
 test('8B R06 default claim, unfunded lock and existing advance limit '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  let s=hall({funded:false});
  await seed(page,s);
  await expect(page.locator('[data-goal-advance-slot]')).toHaveCount(0);
  await page.locator('[data-goal-slot="0"]').click();
  expect((await saved(page)).players[0].capital).toBe(30);
  expect((await saved(page)).players[0].goals[0]).not.toHaveProperty('advanceAmount');
  s=hall();const slot=s.goalMarket.findIndex(x=>x?.id==='C01');
  expect(claimCityGoal(s,slot,{takeAdvance:true}).ok).toBe(true);
  s.round=2;s.players[0].goalTakenRound=null;
  await seed(page,s);
  await expect(page.locator('[data-goal-advance-slot="1"]')).toBeDisabled();
  await expect(page.locator('#cityGoalMarket')).toContainText('Лимит: уже есть одна активная цель с авансом');
  await expect(page.locator('[data-goal-slot="1"]')).toBeEnabled();
  await page.locator('[data-goal-slot="1"]').click();
  const after=await saved(page);
  expect(after.players[0].capital).toBe(33);
  expect(after.players[0].goals).toHaveLength(2);
  expect(after.players[0].goals[1]).not.toHaveProperty('advanceAmount');
  await fits(page,viewport);
 });
 test('8B R02 remains a saved mandatory two-choice completion, not another main action '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=development({r05:false});
  s.research.R02={status:'funded',holderId:1,fundedRound:1};
  s.constructions=[{id:'R02-SITE',playerId:0,projectId:'polytechnic_campus',districtId:'civic',
    status:'under-construction',startedRound:1,completedRound:null,
    materialsDelivered:['Lumber','Lumber','Masonry','Masonry'],warehouseInventory:[]}];
  s.pendingReinforcements=['R02-SITE'];
  await seed(page,s);
  await expect(page.locator('#reinforcementSheet')).toBeVisible();
  await expect(page.locator('#reinforcementSheet')).toContainText('Выбор обязателен');
  const before=await saved(page);
  expect(before.constructions[0].status).toBe('under-construction');
  await page.reload();
  await page.locator('[data-reinforcement-choice="no"]').click();
  const after=await saved(page);
  expect(after.constructions[0].status).toBe('complete');
  expect(after.constructions[0].earthquakeReinforcement).toBeUndefined();
  expect(after.pendingReinforcements).toEqual([]);
  expect(after.players[0].workersLeft).toBe(before.players[0].workersLeft);
  await fits(page,viewport);
 });
}
