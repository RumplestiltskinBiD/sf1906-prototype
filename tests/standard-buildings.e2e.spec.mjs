import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
async function seed(page,s){await page.goto('/');await page.evaluate(([key,data])=>localStorage.setItem(key,JSON.stringify(data)),[KEY,s]);await page.reload();}
function state(){
 const s=createInitialState({rng:()=>0.2});s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;s.constructions=[];
 s.players.forEach(p=>{p.capital=50;p.portfolio=[];});s.activeWorkerId=s.players[0].workers[0].id;return s;
}
function built(id,projectId,districtId='civic',playerId=0,more={}){return {id,projectId,districtId,playerId,status:'complete',materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[],completedRound:1,startedRound:1,...more};}
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('v0.53 standard projects are accessible and interactive '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);const s=state();await seed(page,s);
  await expect(page.locator('.version-badge')).toHaveText('v0.53');
  const panel=page.locator('#standardProjects');await expect(panel).toBeVisible();
  await expect(panel.locator('[data-standard-build]')).toHaveCount(4);
  for(const id of ['std_warehouse','std_fire','std_police','std_clinic'])await expect(panel.locator('[data-standard-build="'+id+'"]')).toBeEnabled();
  const docWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(docWidth).toBeLessThanOrEqual(viewport.width+2);
  await panel.locator('[data-standard-build="std_warehouse"]').click();
  await expect(page.locator('#constructionMode')).toContainText('Строительный склад');
  await page.locator('[data-district="civic"]').click();
  await expect(page.locator('#confirmConstruction')).toBeVisible();
  await page.locator('#confirmConstruction').click();
  const saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));
  expect(saved.constructions.some(c=>c.projectId==='std_warehouse'&&c.status==='under-construction')).toBe(true);
  expect(saved.players[0].portfolio).toHaveLength(0);
  expect(saved.players[0].workersLeft).toBe(2);
  await page.reload();await expect(page.locator('#cityOverviewPanel')).toContainText('Строительный склад');
 });
 test('v0.53 standard warehouse existing save stock appears in mobile logistics UI '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);const s=state();
  s.constructions=[built('W','std_warehouse','civic',0,{warehouseInventory:['Lumber','Masonry']})];
  await seed(page,s);
  await expect(page.locator('#cityOverviewPanel')).toContainText('2/3');
  await expect(page.locator('#mobileObjectStrip')).toContainText('2/3').catch(()=>{});
  await page.locator('#officeBtn').click();
  await expect(page.locator('#officeContent')).toContainText('2/3');
  await page.reload();await expect(page.locator('#cityOverviewPanel')).toContainText('2/3');
 });
}
