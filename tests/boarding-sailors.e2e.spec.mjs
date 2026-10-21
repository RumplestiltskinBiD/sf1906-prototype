import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[KEY,s]);
 await page.reload();
}
function game(pid=0){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=pid;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[pid].workers[0].id;
 s.players.forEach(p=>{p.capital=80;p.portfolio=[];});
 s.players[pid].workers[0].districtId='innersunset';s.constructions=[];return s;
}
function built(id,projectId,districtId,playerId=0,x={}){
 return {id,playerId,projectId,districtId,status:'complete',materialsDelivered:[...projectById(projectId).materials],
 warehouseInventory:[],startedRound:1,completedRound:1,...x};
}
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('v0.50 wagon quick upgrade mobile '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();s.constructions=[built('W','wagonboarding','sunset',0,{wagonLevel:1})];
  await seed(page,s);
  await page.locator('#officeBtn').click();
  const button=page.locator('[data-upgrade-wagon="W"]');
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('#officeContent')).toContainText('Уровень 2/3');
  await expect(button).toBeDisabled();
  let stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  expect(stored.constructions.find(x=>x.id==='W').wagonLevel).toBe(2);
  expect(stored.players[0].workers.every(w=>!w.used)).toBeTruthy();
  await page.reload();await page.locator('#officeBtn').click();
  await expect(page.locator('[data-upgrade-wagon="W"]')).toBeDisabled();
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
 });
 test('v0.50 sailor recruit mobile '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();s.constructions=[built('S','sailorlodging','northbeach')];
  s.players[0].influence=5;s.pendingSailorRecruitments=['S'];
  await seed(page,s);
  const modal=page.locator('#sailorRecruitmentSheet');
  await expect(modal).toBeVisible();await expect(modal).toContainText('Незаконная вербовка');
  const rect=await modal.boundingBox();
  expect(rect.x).toBeGreaterThanOrEqual(-1);
  expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);
  expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height+1);
  await page.locator('[data-recruit-mode="illegal"]').click();
  await expect(modal).toBeHidden();
  const stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  expect(stored.pendingSailorRecruitments).toEqual([]);
  expect(stored.players[0].capital).toBe(86);
  expect(stored.players[0].influence).toBeLessThan(5);
  await page.reload();await expect(modal).toBeHidden();
 });
}
test('v0.50 mixed building card migration inserts 2+2 in old save only once',async({page})=>{
 const s=game();s.boardingExpansionV1=false;s.deck=s.deck.filter(c=>!['wagonboarding','sailorlodging'].includes(c.id));
 s.market=s.market.map(m=>m&&['wagonboarding','sailorlodging'].includes(m.id)?{...m,id:'tenement'}:m);
 s.starterDraftHands=s.starterDraftHands.map(hand=>hand.filter(c=>!['wagonboarding','sailorlodging'].includes(c.id)));
 await seed(page,s);
 let stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
 expect(stored.boardingExpansionV1).toBe(true);
 expect(stored.deck.filter(c=>c.id==='wagonboarding')).toHaveLength(2);
 expect(stored.deck.filter(c=>c.id==='sailorlodging')).toHaveLength(2);
 await page.reload();
 stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
 expect(stored.deck.filter(c=>c.id==='wagonboarding')).toHaveLength(2);
 expect(stored.deck.filter(c=>c.id==='sailorlodging')).toHaveLength(2);
});
test('v0.50 replace wagon in a full district from map, preserve save on reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game();s.players[0].portfolio=['speculative'];s.constructions=[built('W','wagonboarding','sunset',0,{wagonLevel:3})];
 s.districts.sunset.landValue=0;s.players[0].workers[0].districtId='innersunset';
 s.selectedDistrictId='sunset';
 await seed(page,s);
 // Save migration intentionally discards a half-completed construction selection.
 // Start the project through the real player-facing UI after loading the save.
 await page.locator('#officeBtn').click();
 await expect(page.locator('[data-start-project="speculative"]')).toBeEnabled();
 await page.locator('[data-start-project="speculative"]').click();
 // Irregular SVG territory: forcing a click at its bounding-box center can hit the ocean.
 // Trigger the real district click handler, then assert the mobile sheet has opened.
 await page.locator('[data-district="sunset"]').dispatchEvent('click');
 const button=page.locator('[data-redevelop-wagon="W"]');
 await expect(page.locator('#contextPanel')).toHaveClass(/mobile-open/);
 await expect(button).toBeVisible();await button.click();
 const stored=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
 expect(stored.constructions.find(c=>c.id==='W').status).toBe('redeveloped');
 expect(stored.constructions.find(c=>c.redevelopedFrom==='W').status).toBe('complete');
 expect(stored.players[0].workers[0].used).toBe(true);
 await page.reload();await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).not.toContainText('Вагонный пансион «Виста-дель-Мар»');
});
