import {test,expect} from '@playwright/test';
import {createInitialState,MAX_ROUNDS} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
function fixture(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=true;
 s.newsLastResolvedRound=1;s.pressCampaignQueuedRound=1;
 s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];s.pendingPressCampaigns=[];
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;return s;
}
async function start(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
for(const vp of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
 test('C2 mandatory 2-star fine is paid on the year sheet, survives reload '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=fixture();s.players[0].suspicion=2;
  const startingCash=s.players[0].capital;
  await start(page,s);
  await page.locator('#endRoundBtn').click();
  const sheet=page.locator('#yearTransitionSheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Годовой штраф');
  await expect(sheet).toContainText('★★');
  await expect(page.locator('[data-crime-payment="cash"]')).toBeVisible();
  await expect(page.locator('[data-crime-payment="influence"]')).toBeVisible();
  const checkpoint=await saved(page);
  expect(checkpoint.phase).toBe('crime-assessment');
  expect(checkpoint.players[0].capital).toBe(startingCash);
  await page.reload();
  await expect(page.locator('[data-crime-payment="cash"]')).toBeVisible();
  expect((await saved(page)).players[0].capital).toBe(startingCash);
  const geom=await page.evaluate(()=>{
    const el=document.querySelector('#yearTransitionSheet'),r=el.getBoundingClientRect();
    return {left:r.left,right:r.right,width:document.documentElement.scrollWidth,screen:innerWidth};
  });
  expect(geom.width).toBeLessThanOrEqual(geom.screen+2);
  expect(geom.left).toBeGreaterThanOrEqual(-2);
  expect(geom.right).toBeLessThanOrEqual(geom.screen+2);
  await page.locator('[data-crime-payment="cash"]').click();
  const after=await saved(page);
  expect(after.phase).toBe('declare');expect(after.round).toBe(2);
  expect(after.players[0].suspicion).toBe(2);
  expect(after.players[0].capital).toBe(startingCash-3+3);
  expect(after.crimeAssessedRound).toBe(1);
  await page.reload();
  expect((await saved(page)).players[0].capital).toBe(after.players[0].capital);
  await expect(sheet).toBeHidden();
 });
}
test('C2 three-star fine with only mixed payment offers only that choice',async({page})=>{
 const s=fixture();s.players[0].suspicion=3;s.players[0].capital=3;s.players[0].influence=1;s.players[1].influence=4;s.players[2].influence=5;
 await page.setViewportSize({width:390,height:844});await start(page,s);
 await page.locator('#endRoundBtn').click();
 await expect(page.locator('[data-crime-payment="mixed"]')).toBeVisible();
 await expect(page.locator('[data-crime-payment="cash"]')).toHaveCount(0);
 await expect(page.locator('[data-crime-payment="influence"]')).toHaveCount(0);
 await page.locator('[data-crime-payment="mixed"]').click();
 const after=await saved(page);
 expect(after.players[0].suspicion).toBe(3);
 expect(after.players[0].influence).toBe(0);
 expect(after.players[0].prestige).toBe(0);
});
test('C2 impossible payment: choose an incarcerated worker on phone and apply C1.2 after click',async({page})=>{
 const s=fixture();s.players[0].suspicion=3;s.players[0].capital=0;s.players[0].influence=0;
 await page.setViewportSize({width:390,height:844});await start(page,s);
 await page.locator('#endRoundBtn').click();
 const sheet=page.locator('#yearTransitionSheet');
 await expect(sheet).toContainText('Полная оплата невозможна');
 await expect(page.locator('[data-crime-arrest]')).toHaveCount(3);
 await expect(page.locator('[data-crime-payment]')).toHaveCount(0);
 await page.locator('[data-crime-arrest="P1W2"]').click();
 const after=await saved(page);
 expect(after.players[0].workers[1].jailed).toBe(true);
 expect(after.players[0].prestige).toBe(-3);
 expect(after.players[0].suspicion).toBe(0);
 expect(after.players[0].capital).toBe(3);
 await expect(sheet).toBeHidden();
});
test('C2 all jailed and unpayable is automatic -3 VP with stars unchanged',async({page})=>{
 const s=fixture();s.players[0].suspicion=3;s.players[0].capital=0;s.players[0].influence=0;
 s.players[0].workers.forEach(w=>{w.jailed=true;w.arrestedRound=1;});
 s.players[0].workersLeft=0;
 await page.setViewportSize({width:932,height:430});await start(page,s);
 await page.locator('#endRoundBtn').click();
 const r=await saved(page);
 expect(r.phase).toBe('declare');expect(r.players[0].prestige).toBe(-3);
 expect(r.players[0].suspicion).toBe(3);
 expect(r.players[0].workers.filter(w=>w.jailed)).toHaveLength(3);
});
test('C2 serial player choices retain independent payments after reload and freeze next until picked',async({page})=>{
 const s=fixture();s.players[0].suspicion=2;s.players[1].suspicion=2;
 await page.setViewportSize({width:390,height:844});await start(page,s);
 await page.locator('#endRoundBtn').click();
 await page.locator('[data-crime-payment="cash"]').click();
 await expect(page.locator('#yearTransitionSheet')).toContainText('Красный');
 const r=await saved(page);expect(r.phase).toBe('crime-assessment');expect(r.players[0].capital).toBe(11);
 await page.reload();
 await expect(page.locator('#yearTransitionSheet')).toContainText('Красный');
 await page.locator('[data-crime-payment="cash"]').click();
 const after=await saved(page);
 expect(after.phase).toBe('declare');expect(after.players[0].capital).toBe(14);
 expect(after.players[1].capital).toBe(14);expect(after.crimeAssessedRound).toBe(1);
});
test('C2 final 1905 deducts exactly -5 VP for still-jailed staff in visible game score',async({page})=>{
 const s=fixture();s.round=MAX_ROUNDS;s.newsLastResolvedRound=MAX_ROUNDS;s.pressCampaignQueuedRound=MAX_ROUNDS;
 s.players[0].prestige=6;s.players[0].workers[0].jailed=true;s.players[0].workers[0].arrestedRound=MAX_ROUNDS;s.players[0].workersLeft=2;
 await page.setViewportSize({width:390,height:844});await start(page,s);
 await page.locator('#endRoundBtn').click();
 const result=await saved(page);
 expect(result.finished).toBe(true);
 expect(result.finalPrisonPenaltyApplied).toBe(true);
 expect(result.players[0].prestige).toBe(1);
 await expect(page.locator('#playersBar .player-pill[data-office="0"]')).toContainText('VP 1');
 await page.reload();
 expect((await saved(page)).players[0].prestige).toBe(1);
});
test('C2 old save missing checkpoint fields still advances with no suspicion',async({page})=>{
 const s=fixture();delete s.crimeAssessedRound;delete s.crimeAssessment;delete s.finalPrisonPenaltyApplied;
 await page.setViewportSize({width:390,height:844});await start(page,s);
 let r=await saved(page);expect(r.crimeAssessedRound).toBe(0);
 await page.locator('#endRoundBtn').click();
 r=await saved(page);expect(r.round).toBe(2);expect(r.crimeAssessedRound).toBe(1);
});
