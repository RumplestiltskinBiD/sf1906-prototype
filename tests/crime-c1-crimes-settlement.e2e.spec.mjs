import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
function fixture(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;s.developmentSlotsUsed=[0,0,0];
 s.players[0].suspicion=2;
 s.newsCurrentIds=['F01'];
 s.constructions.push({id:'POLICE-FOREIGN',projectId:'std_police',districtId:'civic',playerId:1,status:'complete',startedRound:1,completedRound:1,materialsDelivered:[]});
 return s;
}
async function enter(page,state){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(state)});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function office(page,viewport){
 if(viewport.width===1440)await page.locator('#officeBtn').click();
 else await page.locator('#mobileActionDock [data-mobile-action="free"]').click();
 await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
}
for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
 test('C1.3 cash settlement is a genuine once-a-year Office action '+viewport.width+'x'+viewport.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(viewport);
  const s=fixture();
  await enter(page,s);
  await office(page,viewport);
  const settle=page.locator('.legal-case-actions');
  await expect(settle).toBeVisible();
  await expect(settle).toContainText('Уладить дело');
  await expect(page.locator('[data-legal-case="cash"]')).toBeEnabled();
  await expect(page.locator('[data-legal-case="influence"]')).toBeVisible();
  await page.locator('[data-legal-case="cash"]').click();
  const after=await saved(page);
  expect(after.players[0].capital).toBe(s.players[0].capital-4);
  expect(after.players[0].suspicion).toBe(1);
  expect(after.players[0].caseSettledRound).toBe(1);
  expect(after.activationMainActionUsed).toBe(false);
  expect(after.developmentSlotsUsed).toEqual([0,0,0]);
  expect(after.players[0].workersLeft).toBe(3);
  await expect(settle).toContainText('В этом году уже использовано');
  await expect(page.locator('[data-legal-case]')).toHaveCount(0);
  expect(errors).toEqual([]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(2);
  await page.reload();
  await office(page,viewport);
  await expect(page.locator('.legal-case-actions')).toContainText('В этом году уже использовано');
  expect((await saved(page)).players[0].capital).toBe(s.players[0].capital-4);
 });
}
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('C1.3 jailed workers cannot settle even though free service turn exists '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=fixture();for(const w of s.players[0].workers){w.jailed=true;w.arrestedRound=1;}
  s.players[0].workersLeft=0;s.players[0].suspicion=3;s.players[0].influence=0;
  await page.setViewportSize(viewport);await enter(page,s);
  await office(page,viewport);
  await expect(page.locator('.legal-case-actions')).toContainText('зоне завершённой полиции');
  await expect(page.locator('[data-legal-case="cash"]')).toBeDisabled();
  await expect(page.locator('[data-legal-case="influence"]')).toBeDisabled();
  await page.locator('#officeDrawer [data-close-drawer]').click();
  await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toBeVisible();
  await page.locator('#mobileActionDock [data-mobile-action="service-pass"]').click();
  const after=await saved(page);
  expect(after.players[0].suspicion).toBe(3);
  expect(after.developmentSlotsUsed).toEqual([3,0,0]);
 });
}
test('C1.3 case settlement influence uses real leap-over steps, no cash and no turn reorder',async({page})=>{
 const s=fixture();s.players[0].influence=5;s.players[1].influence=4;s.players[2].influence=3;
 await page.setViewportSize({width:390,height:844});await enter(page,s);
 await office(page,{width:390});
 await expect(page.locator('[data-legal-case="influence"]')).toBeEnabled();
 await page.locator('[data-legal-case="influence"]').click();
 const after=await saved(page);
 expect(after.players[0].influence).toBe(1);
 expect(after.players[0].suspicion).toBe(1);
 expect(after.players[0].capital).toBe(s.players[0].capital);
 expect(after.yearTurnOrder).toEqual([0,1,2]);
});
test('C1.3 no suspicion keeps Office clean, no always-on crime panel',async({page})=>{
 const s=fixture();s.players[0].suspicion=0;
 await page.setViewportSize({width:390,height:844});await enter(page,s);
 await office(page,{width:390});
 await expect(page.locator('.legal-case-actions')).toHaveCount(0);
 await expect(page.locator('[data-legal-case]')).toHaveCount(0);
});
test('C1.3 tester can raise suspicion without cluttering the map',async({page})=>{
 const s=fixture();s.players[0].suspicion=0;
 await page.setViewportSize({width:390,height:844});await enter(page,s);
 await page.locator('#settingsBtn').click();
 await expect(page.locator('#settingsDrawer [data-debug-suspicion="0"][data-delta="1"]')).toBeVisible();
 await page.locator('#settingsDrawer [data-debug-suspicion="0"][data-delta="1"]').click();
 expect((await saved(page)).players[0].suspicion).toBe(1);
 await page.locator('#settingsDrawer [data-close-drawer]').click();
 await office(page,{width:390});
 await expect(page.locator('.legal-case-actions')).toBeVisible();
});

for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('C04 Office changes settlement to $7 or 3 Influence steps and survives reload '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=fixture();s.newsCurrentIds=['C04'];
  await page.setViewportSize(viewport);await enter(page,s);
  await office(page,viewport);
  const settle=page.locator('.legal-case-actions');
  await expect(settle).toContainText('Полиция');
  await expect(page.locator('[data-legal-case="cash"]')).toContainText('−$7');
  await expect(page.locator('[data-legal-case="influence"]')).toContainText('−3');
  await expect(page.locator('[data-legal-case="cash"]')).toBeEnabled();
  await page.locator('[data-legal-case="cash"]').click();
  expect((await saved(page)).players[0].capital).toBe(s.players[0].capital-7);
  await page.reload();await office(page,viewport);
  await expect(settle).toContainText('В этом году уже использовано');
  await expect(page.locator('[data-legal-case]')).toHaveCount(0);
 });
 test('police zone disables settlement when no completed coverage '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=fixture();s.constructions=[];
  await page.setViewportSize(viewport);await enter(page,s);
  await office(page,viewport);
  await expect(page.locator('.legal-case-actions')).toContainText('зоне завершённой полиции');
  await expect(page.locator('[data-legal-case="cash"]')).toBeDisabled();
  await expect(page.locator('[data-legal-case="influence"]')).toBeDisabled();
 });
}
test('C04 newspaper shows temporary police scandal without old housing fine',async({page})=>{
 const s=fixture();s.newsCurrentIds=['C04'];s.constructions.push({id:'HOUSE',projectId:'tenement',districtId:'financial',playerId:0,status:'complete'});
 await page.setViewportSize({width:390,height:844});await enter(page,s);
 await expect(page.locator('#newsStripLabel')).toContainText('$7');
 await expect(page.locator('#newsStrip')).toBeHidden();
 await page.locator('#callBuildingNode').click();
 await expect(page.locator('#newsSheetContent')).toContainText('−3');
 await expect(page.locator('#newsSheetContent')).not.toContainText('Жители боятся возвращаться домой');
 await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
});
