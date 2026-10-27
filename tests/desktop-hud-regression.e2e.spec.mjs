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
// UI contract changed by user request: the full-width sticky overview must not
// exist. Construction needs stay one click away via a compact map-toolbar shortcut.
for(const viewport of [{width:1440,height:900},{width:1280,height:800},{width:863,height:768}]){
  test('desktop HUD is readable, construction details accessible, and map not covered '+viewport.width,async({page})=>{
    await page.setViewportSize(viewport);await seed(page);
    await expect(page.locator('.version-badge')).toHaveText('v0.53.1');
    const pill=page.locator('.player-pill.dev-active').first();
    await expect(pill).toBeVisible();
    await expect(pill.locator('.player-stats')).toBeVisible();
    await expect(pill.locator('.player-money')).toContainText('$11');
    // The discarded gold "OBJECTS" badge is not displayed; ordinary turn badges remain.
    const label=await pill.evaluate(el=>getComputedStyle(el,'::before').content);
    expect(label).not.toContain('ОБЪЕКТЫ');
    await expect(page.locator('#cityOverviewPanel')).toHaveCount(0);
    const shortcut=page.locator('#cityObjectsShortcut');
    await expect(shortcut).toBeVisible();
    await expect(shortcut).toHaveText('Стройки 1 · Склады 0');
    await shortcut.click();
    await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
    const card=page.locator('#officeContent .construction-card.active-build').filter({hasText:'Рабочий доходный дом'});
    await expect(card).toBeVisible();
    await expect(card.locator('.project-material-line .resource-pip')).toHaveCount(projectById('tenement').materials.length);
    await expect(card.locator('.construction-need-label')).toContainText('Дерево ×1');
    await expect(card.locator('.construction-need-label')).toContainText('Камень ×1');
    await page.locator('#officeDrawer [data-close-drawer]').click();
    await page.locator('#cityBoardScroll').scrollIntoViewIfNeeded();
    await expect(page.locator('#cityBoardScroll')).toBeVisible();
  });
}
test('mobile overview remains compact; existing mobile object strip is the only construction summary',async({page})=>{
  await page.setViewportSize({width:390,height:844});await seed(page);
  const pill=page.locator('.player-pill.dev-active').first();
  await expect(pill).toBeVisible();
  const label=await pill.evaluate(el=>getComputedStyle(el,'::before').content);
  expect(label).not.toContain('ОБЪЕКТЫ');
  await expect(page.locator('#cityOverviewPanel')).toHaveCount(0);
  await expect(page.locator('#cityObjectsShortcut')).toBeHidden();
  await expect(page.locator('#mobileObjectStrip')).toContainText('Рабочий доходный дом');
  await expect(page.locator('#mobileObjectStrip')).toContainText('1/3');
});
