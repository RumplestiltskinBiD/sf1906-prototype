import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function activeState(){
  const s=createInitialState({rng:()=>0.2});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=s.players[0].workers[0].id;
  s.players[0].capital=11;s.players[0].prestige=0;
  s.constructions=[{
    id:'HUDBUILD',projectId:'tenement',districtId:'civic',playerId:0,status:'under-construction',
    materialsDelivered:['Lumber'],warehouseInventory:[],startedRound:1,completedRound:null
  }];
  return s;
}
async function seed(page){
  const s=activeState();
  await page.goto('/');
  await page.evaluate(([key,data])=>localStorage.setItem(key,JSON.stringify(data)),[KEY,s]);
  await page.reload();
}
for(const viewport of [{width:1440,height:900},{width:1280,height:800},{width:863,height:768}]){
  test('desktop player status and unfinished materials remain visible when active player is overview owner '+viewport.width,async({page})=>{
    await page.setViewportSize(viewport);await seed(page);
    await expect(page.locator('.version-badge')).toHaveText('v0.53.1');
    const pill=page.locator('.player-pill.dev-active.overview').first();
    await expect(pill).toBeVisible();
    const pseudo=await pill.evaluate(el=>{
      const st=getComputedStyle(el,'::before');
      return {top:st.top,bottom:st.bottom,height:parseFloat(st.height),width:parseFloat(st.width),
        content:st.content,position:st.position};
    });
    expect(pseudo.position).toBe('absolute');
    // Chromium resolves top:auto to the element's used pixel coordinate.
    // Verify the gold label sits near the LOWER edge, not stretched from above.
    expect(Number.parseFloat(pseudo.top)).toBeGreaterThan(18);
    expect(pseudo.bottom).toBe('-6px');
    expect(pseudo.height).toBeLessThanOrEqual(24);
    expect(pseudo.width).toBeLessThan(100);
    await expect(pill.locator('.player-stats')).toBeVisible();
    await expect(pill.locator('.player-money')).toContainText('$11');
    const overview=page.locator('#cityOverviewPanel');
    await expect(overview).toBeVisible();
    await expect(overview).toContainText('Рабочий доходный дом');
    const pips=overview.locator('[data-overview-construction="HUDBUILD"] .overview-materials .resource-pip');
    await expect(pips).toHaveCount(projectById('tenement').materials.length);
    const overlap=await page.evaluate(()=>{
      const player=document.querySelector('.player-pill.dev-active.overview');
      const stats=player.querySelector('.player-stats').getBoundingClientRect();
      const overview=document.querySelector('#cityOverviewPanel').getBoundingClientRect();
      const hud=document.querySelector('#playersBar').getBoundingClientRect();
      return {statsHeight:stats.height,overviewWidth:overview.width,overviewHeight:overview.height,
        overviewUnderHud:overview.top>=hud.bottom-2};
    });
    expect(overlap.statsHeight).toBeGreaterThan(0);
    expect(overlap.overviewWidth).toBeGreaterThan(200);
    expect(overlap.overviewHeight).toBeGreaterThan(80);
    expect(overlap.overviewUnderHud).toBe(true);
    // The city's long list of standard projects should not push this panel
    // out of sight. Once the player scrolls to the map it must stay pinned
    // immediately below the newspaper strip with material pips still present.
    await page.locator('#cityBoardScroll').scrollIntoViewIfNeeded();
    const stuck=await page.evaluate(()=>{
      const p=document.querySelector('#cityOverviewPanel').getBoundingClientRect();
      const strip=document.querySelector('#newsStrip').getBoundingClientRect();
      return {top:p.top,bottom:p.bottom,stripBottom:strip.bottom,viewport:innerHeight};
    });
    expect(stuck.top).toBeGreaterThanOrEqual(stuck.stripBottom-2);
    expect(stuck.top).toBeLessThanOrEqual(stuck.stripBottom+25);
    expect(stuck.bottom).toBeLessThan(stuck.viewport);
    await expect(pips).toHaveCount(3);
  });
}
test('mobile overview remains compact and does not expose giant gold badge',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seed(page);
  const pill=page.locator('.player-pill.dev-active.overview').first();
  await expect(pill).toBeVisible();
  expect(await pill.evaluate(el=>getComputedStyle(el,'::before').display)).toBe('none');
  await expect(page.locator('#mobileObjectStrip')).toContainText('Рабочий доходный дом');
  await expect(page.locator('#mobileObjectStrip')).toContainText('1/3');
});
