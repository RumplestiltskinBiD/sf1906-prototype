import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function cityScenario(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';
  s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.activeWorkerId=null;
  // E06 v2 is an individual relief-fund choice, not the former insurance
  // penalty. It must not expose obsolete district emergency/map controls.
  s.newsCurrentIds=['E06'];s.newsC01Incident=null;s.newsC02Incident=null;s.newsC03Offer=null;
  s.players[0].capital=30;
  return s;
}
async function load(page,s){
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
  await page.goto('/');
}
test('mobile replaces SF Call strip with three usable, non-bottom-floating actions',async({page})=>{
  for(const viewport of [{width:390,height:844},{width:932,height:430}]){
    await page.setViewportSize(viewport);
    await load(page,cityScenario());
    const bar=page.locator('#mobileActionDock');
    await expect(page.locator('#newsStrip')).toBeHidden();
    await expect(bar).toBeVisible();
    await expect(bar.locator('[data-mobile-action]')).toHaveCount(3);
    await expect(bar.locator('[data-mobile-action="delivery"]')).toBeVisible();
    await expect(bar.locator('[data-mobile-action="free"]')).toBeVisible();
    await expect(bar.locator('[data-mobile-action="main"]')).toBeVisible();
    const box=await page.evaluate(()=>{
      const el=document.querySelector('#mobileActionDock'),rect=el.getBoundingClientRect(),
            players=document.querySelector('#playersBar').getBoundingClientRect(),
            css=getComputedStyle(el);
      return {position:css.position,top:rect.top,playersBottom:players.bottom,bottom:css.bottom,width:rect.width,
        viewport:innerWidth,pageWidth:document.documentElement.scrollWidth};
    });
    expect(box.position).toBe('sticky');
    expect(box.bottom).toBe('auto');
    expect(box.top).toBeGreaterThanOrEqual(box.playersBottom-2);
    expect(box.top).toBeLessThanOrEqual(box.playersBottom+6);
    expect(box.pageWidth).toBeLessThanOrEqual(box.viewport+2);
    await bar.locator('[data-mobile-action="free"]').click();
    await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
    await page.locator('#officeDrawer [data-close-drawer]').click();
    await bar.locator('[data-mobile-action="main"]').click();
    await expect(page.locator('#cityActions')).toHaveClass(/ux-focus/);
  }
});
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  test('SF Call E06 remains reachable on mobile without removed generic emergency controls '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    await load(page,cityScenario());
    const node=page.locator('#callBuildingNode');
    await expect(node).toBeVisible();
    await node.click();
    await expect(page.locator('#newsSheet')).toBeVisible();
    await expect(page.locator('.news-headline')).toHaveText('ДЕНЬГИ ДЛЯ БЕЗРАБОТНЫХ ПОД УГРОЗОЙ!');
    await expect(page.locator('.news-e06-panel')).toBeVisible();
    await expect(page.locator('[data-e06-choice]')).toHaveCount(2);
    await expect(page.locator('[data-e06-choice="honest"]')).toBeDisabled();
    await expect(page.locator('[data-e06-choice="misappropriate"]')).toBeDisabled();
    // No representative selected. A newspaper click must not start an action,
    // expose the old insurance-era emergency workflow or change player money.
    await expect(page.locator('#newsIssueMapToggle')).toHaveCount(0);
    await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
    await expect(page.locator('#newsEmergencyCancelMobile')).toBeHidden();
    const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
    expect(saved.players[0].capital).toBe(30);
    expect(saved.activationMainActionUsed).toBe(false);
    expect(saved.newsEmergency).toEqual({});
    await page.locator('#newsCloseBtn').click();
    await expect(page.locator('#newsSheet')).toBeHidden();
    await expect(page.locator('#mobileActionDock [data-mobile-action]')).toHaveCount(3);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  });
}
test('mobile empty construction strip stays hidden even while the freight yard exists on the map',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await load(page,cityScenario());
  await expect(page.locator('#mobileObjectStrip')).toBeHidden();
  await expect(page.locator('#mobileObjectStrip .freight-yard')).toHaveCount(0);
  await expect(page.locator('[data-delivery-freight-yard="freightyard"]')).toBeVisible();
});
