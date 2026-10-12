import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const STORAGE_KEY='sf1906_phase1_ui_v030a';
function state(){
 const s=createInitialState({rng:()=>0.12});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.players[0].capital=50;
 s.logisticsSupply.southernpacific=['Steel','Lumber'];
 s.logisticsSupply.pacificmail=['Masonry','Lumber'];
 s.constructions=[{id:'W1',playerId:0,projectId:'warehouse',districtId:'soma',status:'complete',
 materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1}];
 return s;
}
async function start(page,s){
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:STORAGE_KEY,value:JSON.stringify(s)});
 await page.goto('/');
}
async function saved(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORAGE_KEY));}

for(const vp of [{width:390,height:844},{width:932,height:430}]){
 test('mobile '+vp.width+'px two-source loading at same stop costs exactly +$1',async({page})=>{
  page.on('pageerror',e=>{throw e;});
  await page.setViewportSize(vp);await start(page,state());
  await page.locator('#actionDelivery').click();
  await page.locator('#deliveryShowSourceList').click();
  await page.locator('[data-ds-node="southernpacific"]').click();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Steel"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await expect(page.locator('#deliveryShowPickups')).toBeVisible();
  await page.locator('#deliveryShowPickups').click();
  await page.locator('[data-extra-source-id="pacificmail"]').click();
  await page.locator('[data-extra-cargo="Masonry"]').click();
  await expect(page.locator('.ux3-route-price')).toContainText('$7');
  await page.locator('#deliveryLockRoute').click();
  const wh=page.locator('[data-delivery-drop-target="W1"]');
  await expect(wh).toBeVisible();
  await wh.click();
  await page.locator('[data-drop-kind="warehouse"][data-drop-type="Steel"]').click();
  await page.locator('[data-drop-kind="warehouse"][data-drop-type="Masonry"]').click();
  await page.locator('#deliveryConfirm').click();
  const s=await saved(page);
  expect(s.constructions[0].warehouseInventory).toEqual(['Steel','Masonry']);
  expect(s.players[0].capital).toBe(43);
  expect(s.logisticsSupply.southernpacific).toEqual(['Lumber']);
  expect(s.logisticsSupply.pacificmail).toEqual(['Lumber']);
  const horizontalOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  expect(horizontalOverflow).toBe(false);
 });
 test('mobile '+vp.width+'px export wharf unloads Steel and credits one-off revenue',async({page})=>{
  page.on('pageerror',e=>{throw e;});
  await page.setViewportSize(vp);
  const s=state();s.players[0].mareIslandOneOff=true;
  s.constructions=[{id:'WM',playerId:0,projectId:'warehouse',districtId:'marina',status:'complete',
  materialsDelivered:[],warehouseInventory:['Steel','Steel'],startedRound:1,completedRound:1}];
  await start(page,s);
  await expect(page.locator('[data-export-cove="gas-house-cove"]')).toBeVisible();
  await page.locator('#actionDelivery').click();
  await page.locator('#deliveryShowSourceList').click();
  await page.locator('[data-ds-wh="WM"]').click();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Steel"]').click();
  await page.locator('[data-load="Steel"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-export-cove="gas-house-cove"]').click();
  await page.locator('[data-drop-kind="export"][data-drop-type="Steel"]').click();
  await page.locator('[data-drop-kind="export"][data-drop-type="Steel"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const result=await saved(page);
  expect(result.constructions[0].warehouseInventory).toEqual([]);
  expect(result.players[0].capital).toBe(63);
  expect(result.players[0].mareIslandOneOff).toBe(false);
 });
}
test('Ferry Building allows signing a single export deal as main action',async({page})=>{
 const s=state(),w=s.players[0].workers[0];
 w.districtId='financial';s.activeWorkerId=w.id;
 await start(page,s);
 await expect(page.locator('[data-mare-sign="one-off"]')).toBeEnabled();
 await page.locator('[data-mare-sign="one-off"]').click();
 const result=await saved(page);
 expect(result.players[0].mareIslandOneOff).toBe(true);
 expect(result.ferryOfferTakenRound).toBe(1);
 expect(result.activationMainActionUsed).toBe(true);
 await page.locator('#officeBtn').click();
 await expect(page.locator('.office-partner')).toContainText('РАЗОВЫЙ КОНТРАКТ');
});
