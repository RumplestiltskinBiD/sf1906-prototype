import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function cityState(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';
  s.view='city';
  s.developmentPlayer=0;
  s.developmentComplete=false;
  s.activationMainActionUsed=false;
  s.activeWorkerId=null;
  s.players[0].capital=40;
  return s;
}
async function seed(page,s){
  page.on('pageerror',error=>{throw error;});
  page.on('console',msg=>{if(msg.type()==='error')throw new Error(msg.text());});
  await page.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key:KEY,value:JSON.stringify(s)});
  await page.goto('/');
}
function construction(id,playerId,projectId,districtId,status,materialsDelivered=[]){
  return {id,playerId,projectId,districtId,status,
    materialsDelivered:[...materialsDelivered],warehouseInventory:[],
    startedRound:1,completedRound:status==='complete'?1:null};
}
test('desktop 1440x900: no full-width construction banner even with zero projects; map remains accessible',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await seed(page,cityState());
  await expect(page.locator('#cityOverviewPanel')).toHaveCount(0);
  const shortcut=page.locator('#cityObjectsShortcut');
  await expect(shortcut).toBeVisible();
  await expect(shortcut).toHaveText('Стройки 0 · Склады 0');
  await expect(page.locator('#cityBoardScroll')).toBeVisible();
  const layout=await page.evaluate(()=>{
    const button=document.querySelector('#cityObjectsShortcut').getBoundingClientRect();
    const board=document.querySelector('#cityBoardScroll').getBoundingClientRect();
    return {toolbarBottom:button.bottom,mapTop:board.top,horizontalOverflow:document.documentElement.scrollWidth>innerWidth+2};
  });
  expect(layout.toolbarBottom).toBeLessThan(layout.mapTop);
  expect(layout.horizontalOverflow).toBe(false);
  await shortcut.click();
  await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
  await expect(page.locator('#officeConstructionsTitle')).toHaveText('Стройки и здания');
  await expect(page.locator('#officeContent')).toContainText('Объектов пока нет');
});
test('desktop: compact map shortcut shows active construction and warehouse; office reveals missing materials',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  const s=cityState();
  s.constructions=[
    construction('NEW_HOME',0,'tenement','civic','under-construction',['Lumber']),
    construction('WAREHOUSE_1',0,'warehouse','civic','complete',['Lumber','Masonry','Steel'])
  ];
  await seed(page,s);
  await expect(page.locator('#cityObjectsShortcut')).toHaveText('Стройки 1 · Склады 1');
  await expect(page.locator('#cityOverviewPanel')).toHaveCount(0);
  await page.locator('#cityObjectsShortcut').click();
  const section=page.locator('#officeConstructionsTitle');
  await expect(section).toHaveText('Стройки и здания');
  const home=page.locator('#officeContent .construction-card.active-build').filter({hasText:'Рабочий доходный дом'});
  await expect(home).toBeVisible();
  await expect(home.locator('.construction-need-label')).toContainText('Осталось привезти:');
  await expect(home.locator('.construction-need-label')).toContainText('Дерево ×1');
  await expect(home.locator('.construction-need-label')).toContainText('Камень ×1');
  await expect(page.locator('#officeContent')).toContainText('Распределительный склад');
  const info=await page.evaluate(()=>{
    const box=document.querySelector('#officeContent').getBoundingClientRect();
    const header=document.querySelector('#officeConstructionsTitle').getBoundingClientRect();
    return {headerTop:header.top,officeTop:box.top,officeBottom:box.bottom};
  });
  expect(info.headerTop).toBeGreaterThanOrEqual(info.officeTop-2);
  expect(info.headerTop).toBeLessThan(info.officeBottom);
});
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  test('mobile '+viewport.width+'x'+viewport.height+': existing project strip remains, no desktop shortcut or map-obstructing banner',async({page})=>{
    await page.setViewportSize(viewport);
    const s=cityState();
    s.constructions=[construction('NEW_HOME',0,'tenement','civic','under-construction',['Lumber'])];
    await seed(page,s);
    await expect(page.locator('#cityOverviewPanel')).toHaveCount(0);
    await expect(page.locator('#cityObjectsShortcut')).toBeHidden();
    await expect(page.locator('#mobileObjectStrip')).toHaveClass(/active/);
    await expect(page.locator('#mobileObjectStrip')).toContainText('Рабочий доходный дом');
    await expect(page.locator('#mobileObjectStrip')).toContainText('ОСТ:');
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
    expect(overflow).toBe(false);
  });
}
