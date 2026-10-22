import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
async function seed(page,s){await page.goto('/');await page.evaluate(([key,data])=>localStorage.setItem(key,JSON.stringify(data)),[KEY,s]);await page.reload();}
const built=(id,projectId,districtId='soma',playerId=0,more={})=>({id,projectId,districtId,playerId,status:'complete',materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[],completedRound:1,startedRound:1,...more});
function state(){const s=createInitialState({rng:()=>0.2});s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;s.constructions=[];s.players.forEach(p=>{p.capital=50;p.portfolio=[];});return s;}
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('v0.51 factory complex mobile choice '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=state();s.constructions=[built('F','factory'),built('CAN','cannery'),built('W','workers_complex')];
  s.pendingWorkforceLinks=['W'];
  await seed(page,s);
  const sheet=page.locator('#workforceLinkSheet');await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-workforce-target]')).toHaveCount(2);
  const rect=await sheet.boundingBox();expect(rect.x).toBeGreaterThanOrEqual(-1);expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height+1);
  await sheet.locator('[data-workforce-target="CAN"]').click();
  await expect(sheet).toBeHidden();
  let saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  expect(saved.constructions.find(c=>c.id==='W').linkedIndustryId).toBe('CAN');
  expect(saved.pendingWorkforceLinks).toHaveLength(0);
  await page.reload();await expect(sheet).toBeHidden();
 });
 test('v0.51 press tower mobile press settlement '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=state();s.constructions=[built('P','press_tower','financial')];
  s.newsLastResolvedRound=1;s.pressCampaignQueuedRound=1;s.pendingPressCampaigns=['P'];
  s.newsArchive.push({year:1900,round:1,cardId:s.newsCurrentIds[0],title:'Итоги',entries:[],changes:{}});
  s.players[0].capital=10;s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});s.developmentComplete=true;s.developmentPlayer=null;
  await seed(page,s);
  const sheet=page.locator('#pressCampaignSheet');await expect(sheet).toBeVisible();
  const rect=await sheet.boundingBox();expect(rect.x).toBeGreaterThanOrEqual(-1);expect(rect.y).toBeGreaterThanOrEqual(-1);
  expect(rect.x+rect.width).toBeLessThanOrEqual(viewport.width+1);expect(rect.y+rect.height).toBeLessThanOrEqual(viewport.height+1);
  await sheet.locator('[data-press-choice="influence"]').click();
  await expect(sheet).toBeHidden();
  const saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  expect(saved.constructions.find(c=>c.id==='P').pressCampaignRound).toBe(1);
  expect(saved.pendingPressCampaigns).toHaveLength(0);
  await page.reload();await expect(sheet).toBeHidden();
 });
}
test('v0.51 old saves receive two press tower and complex cards only once',async({page})=>{
 const s=state();s.pressAndWorkersExpansionV1=false;
 const exclude=(arr)=>(arr||[]).filter(c=>!['press_tower','workers_complex'].includes(c?.id));
 s.deck=exclude(s.deck);s.market=exclude(s.market);s.starterDraftHands=s.starterDraftHands.map(exclude);
 await seed(page,s);
 let saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
 expect(saved.pressAndWorkersExpansionV1).toBe(true);
 expect(saved.deck.filter(c=>c.id==='press_tower')).toHaveLength(2);
 expect(saved.deck.filter(c=>c.id==='workers_complex')).toHaveLength(2);
 await page.reload();
 saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
 expect(saved.deck.filter(c=>c.id==='press_tower')).toHaveLength(2);
 expect(saved.deck.filter(c=>c.id==='workers_complex')).toHaveLength(2);
});
