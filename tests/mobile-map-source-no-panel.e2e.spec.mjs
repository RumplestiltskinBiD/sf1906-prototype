import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function fixture(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';
  s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.activeWorkerId=null;
  s.players[0].capital=40;
  return s;
}
async function mount(page,s){
  await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
  await page.goto('/');
}
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('mobile map source: no floating panel, can cancel and choose source '+viewport.width+'x'+viewport.height,async({page})=>{
   await page.setViewportSize(viewport);
   await mount(page,fixture());
   const bar=page.locator('#mobileActionDock');
   await bar.locator('[data-mobile-action="delivery"]').click();
   await expect(page.locator('#deliveryPanel')).toBeHidden();
   await expect(page.locator('.delivery-source-grid')).toHaveCount(0);
   const cancel=bar.locator('[data-mobile-action="cancel-delivery"]');
   await expect(cancel).toBeVisible();
   const loc=await page.evaluate(()=>{
      const bar=document.querySelector('#mobileActionDock'),r=bar.getBoundingClientRect(),
            p=document.querySelector('#deliveryPanel').getBoundingClientRect();
      return {top:r.top,height:r.height,bottom:getComputedStyle(bar).bottom,panelHeight:p.height,
       pageWidth:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   expect(loc.bottom).toBe('auto');
   expect(loc.height).toBeLessThan(70);
   expect(loc.panelHeight).toBe(0);
   expect(loc.pageWidth).toBeLessThanOrEqual(loc.viewport+2);
   await expect(page.locator('[data-delivery-supplier="gray-quarry"]')).toHaveClass(/source-available/);
   await cancel.click();
   await expect(page.locator('#deliveryPanel')).toBeHidden();
   await expect(bar.locator('[data-mobile-action="delivery"]')).toBeVisible();
   await bar.locator('[data-mobile-action="delivery"]').click();
   await page.locator('[data-delivery-supplier="gray-quarry"]').click();
   await expect(page.locator('[data-hauler="dray2a"]')).toBeVisible();
   await page.locator('#deliveryBackSource').click();
   await expect(page.locator('#deliveryPanel')).toBeHidden();
   await expect(bar.locator('[data-mobile-action="cancel-delivery"]')).toBeVisible();
 });
 test('mobile no unfinished construction means no wasted header strip '+viewport.width+'x'+viewport.height,async({page})=>{
   await page.setViewportSize(viewport);
   const s=fixture();s.freightYardInventories=[['Steel'],[],[]];
   await mount(page,s);
   await expect(page.locator('#mobileObjectStrip')).toBeHidden();
   await expect(page.locator('[data-delivery-freight-yard="freightyard"]')).toBeVisible();
   await page.locator('#mobileActionDock [data-mobile-action="delivery"]').click();
   await expect(page.locator('#mobileObjectStrip')).toBeHidden();
   await expect(page.locator('#deliveryPanel')).toBeHidden();
 });
}
