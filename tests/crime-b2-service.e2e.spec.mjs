import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function scenario(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentComplete=false;
 s.developmentPlayer=0;s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.developmentSlotsUsed=[0,0,0];
 for(const w of s.players[0].workers){w.jailed=true;w.arrestedRound=1;}
 s.players[0].workersLeft=0;
 s.players[0].loans=[{id:'L1',principal:6,interestPaid:true}];
 s.players[0].capital=14;
 return s;
}
async function enter(page,s){
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
 await page.goto('/');
}
async function saved(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}

for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
 test('B2 service turn remains usable without workers '+viewport.width+'x'+viewport.height,async({page})=>{
   const errs=[];page.on('pageerror',e=>errs.push(e.message));
   await page.setViewportSize(viewport);
   await enter(page,scenario());
   await expect(page.locator('#actionEndActivation')).toBeVisible();
   await expect(page.locator('#actionPassRemaining')).toBeVisible();
   await expect(page.locator('.service-turn-hint')).toContainText('законные быстрые действия');
   await expect(page.locator('.city-action-grid .city-action-card.delivery')).toBeVisible();
   await expect(page.locator('.city-action-grid .city-action-card.build')).toBeHidden();
   await expect(page.locator('[data-dock-worker="P1W1"]')).toBeDisabled();
   await expect(page.locator('[data-worker-token="P1W1"]')).toHaveCount(0);
   const extra=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   expect(extra).toBeLessThanOrEqual(2);
   const s=await saved(page);
   expect(s.developmentSlotsUsed).toEqual([0,0,0]);
   if(viewport.width!==1440){
     await expect(page.locator('#mobileActionDock [data-mobile-action="free"]')).toBeVisible();
     await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toBeVisible();
     await page.locator('#mobileActionDock [data-mobile-action="free"]').click();
     await expect(page.locator('#repayLoanBtn')).toBeEnabled();
     await page.locator('#repayLoanBtn').click();
     const paid=await saved(page);
     expect(paid.players[0].loans).toHaveLength(0);
     expect(paid.players[0].capital).toBe(8);
     await page.locator('#officeDrawer [data-close-drawer]').click();
     await page.locator('#mobileActionDock [data-mobile-action="service-pass"]').click();
     const after=await saved(page);
     expect(after.developmentSlotsUsed).toEqual([3,0,0]);
     expect(after.developmentPlayer).toBe(1);
   }else{
     await page.locator('#actionEndActivation').click();
     const after=await saved(page);
     expect(after.developmentSlotsUsed).toEqual([1,0,0]);
     expect(after.developmentPlayer).toBe(1);
   }
   expect(errs).toEqual([]);
 });
}
test('B2 old save without slots resumes with a service opportunity and retains prison records',async({page})=>{
 const s=scenario();delete s.developmentSlotsUsed;
 await page.setViewportSize({width:390,height:844});
 await enter(page,s);
 await expect(page.locator('#actionPassRemaining')).toBeVisible();
 let first=await saved(page);
 expect(first.developmentSlotsUsed).toEqual([0,0,0]);
 expect(first.players[0].workers.every(w=>w.jailed)).toBe(true);
 await page.reload();
 await expect(page.locator('#actionPassRemaining')).toBeVisible();
 await page.locator('#actionEndActivation').click();
 const after=await saved(page);
 expect(after.developmentSlotsUsed).toEqual([1,0,0]);
 expect(after.players[0].workers.every(w=>w.jailed)).toBe(true);
});

test('B2 tester shortcut simulates prison without editing saves on a phone',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=scenario();
 for(const w of s.players[0].workers){w.jailed=false;w.arrestedRound=null;}
 s.players[0].workersLeft=3;
 await enter(page,s);
 await page.locator('#settingsBtn').click();
 const shortcut=page.locator('#settingsDrawer [data-b2-jail-all="0"]');
 await expect(shortcut).toBeVisible();
 await shortcut.click();
 const jailed=await saved(page);
 expect(jailed.players[0].workers.every(w=>w.jailed)).toBe(true);
 expect(jailed.players[0].workersLeft).toBe(0);
 await page.locator('#settingsDrawer [data-close-drawer]').click();
 await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toBeVisible();
 await page.locator('#mobileActionDock [data-mobile-action="service-pass"]').click();
 const after=await saved(page);
 expect(after.developmentSlotsUsed).toEqual([3,0,0]);
 expect(after.developmentPlayer).toBe(1);
});
