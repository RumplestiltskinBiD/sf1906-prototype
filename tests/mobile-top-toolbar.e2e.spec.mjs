import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function cityScenario(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';
  s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.activeWorkerId=null;
  s.newsCurrentIds=['C01'];
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
  test('SF Call remains usable from map, with forecast map and emergency cancellation '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    await load(page,cityScenario());
    const node=page.locator('#callBuildingNode');
    await expect(node).toBeVisible();
    await node.click();
    await expect(page.locator('#newsSheet')).toBeVisible();
    await expect(page.locator('#newsIssueMapToggle')).toBeVisible();
    await page.locator('#newsIssueMapToggle').click();
    await expect(page.locator('#newsSheet')).toBeHidden();
    await expect(page.locator('.city-board')).toHaveClass(/news-map/);
    await node.click();
    await expect(page.locator('#newsSheet')).toBeVisible();
    await page.locator('#newsEmergencyStart').click();
    await expect(page.locator('#newsEmergencyCancelMobile')).toBeVisible();
    await expect(page.locator('#newsStrip')).toBeHidden();
    await page.locator('#newsEmergencyCancelMobile').click();
    await expect(page.locator('#newsEmergencyCancelMobile')).toBeHidden();
    await expect(page.locator('#mobileActionDock [data-mobile-action]')).toHaveCount(3);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  });
}
test('mobile freight yard spells out $2 first placement fee instead of ambiguous entry',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await load(page,cityScenario());
  const chip=page.locator('#mobileObjectStrip .freight-yard');
  await expect(chip).toContainText('0/2');
  await expect(chip).toContainText('первое размещение $2');
  await expect(chip).not.toContainText('вход $2');
  await expect(chip).not.toContainText('Д0 К0 С0');
});
