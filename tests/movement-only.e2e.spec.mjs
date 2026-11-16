import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const STORAGE_KEY='sf1906_phase1_ui_v030a';
function setup({district='civic',capital=0}={}){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;s.developmentSlotsUsed=[0,0,0];
 s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.players[0].capital=capital;s.players[0].workers[0].districtId=district;
 return s;
}
async function enter(page,s){
 await page.goto('/');
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:STORAGE_KEY,raw:JSON.stringify(s)});
 await page.reload();
}
async function state(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),STORAGE_KEY);}

for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
 test('no-reward movement is actually clickable, saved and reversible '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=setup();await enter(page,s);
  await expect(page.locator('#actionRaiseCapital')).toHaveCount(0);
  await expect(page.locator('#actionMoveWorker')).toBeDisabled();
  await page.locator('[data-worker-token="P1W1"]').click();
  await expect(page.locator('#actionMoveWorker')).toBeEnabled();
  await page.locator('#actionMoveWorker').click();
  await expect(page.locator('[data-district="soma"]')).toHaveClass(/move-target/);
  await expect(page.locator('[data-district="civic"]')).not.toHaveClass(/move-target/);
  await expect(page.locator('[data-district="sunset"]')).not.toHaveClass(/move-target/);
  await page.locator('[data-district="civic"]').click();
  let after=await state(page);
  expect(after.players[0].capital).toBe(0);
  expect(after.players[0].workers[0].used).toBe(false);
  await page.locator('[data-district="sunset"]').click();
  after=await state(page);
  expect(after.players[0].workers[0].used).toBe(false);
  await page.locator('[data-district="soma"]').click();
  after=await state(page);
  expect(after.players[0].capital).toBe(0);
  expect(after.players[0].workers[0].districtId).toBe('soma');
  expect(after.players[0].workers[0].used).toBe(true);
  expect(after.activationMainActionUsed).toBe(true);
  await page.reload();
  const restored=await state(page);
  expect(restored.players[0].capital).toBe(0);
  expect(restored.players[0].workers[0].districtId).toBe('soma');
  expect(restored.players[0].workers[0].used).toBe(true);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}

for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('old pending Raise Capital request is discarded safely on mobile '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=setup({capital:6});s.pendingWorkerAction={type:'raiseCapital',playerId:0};
  await enter(page,s);
  const after=await state(page);
  expect(after.pendingWorkerAction).toBeNull();
  expect(after.players[0].capital).toBe(6);
  await expect(page.locator('#actionRaiseCapital')).toHaveCount(0);
  await expect(page.locator('#actionMoveWorker')).toBeDisabled();
 });
}
