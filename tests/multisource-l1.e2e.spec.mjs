import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const makeState=()=>{
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=null;s.players[0].capital=60;
 s.logisticsSupply.southernpacific=['Steel','Steel','Lumber','Masonry'];
 s.logisticsSupply.pacificmail=['Steel','Masonry','Lumber','Masonry'];
 s.constructions=[warehouse('W1','soma'),warehouse('W2','mission')];return s;
};
function warehouse(id,districtId){return {id,playerId:0,projectId:'warehouse',districtId,status:'complete',
 materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1};}
async function seed(page,s){
 await page.addInitScript(({key,value})=>{localStorage.setItem(key,value);},{key:KEY,value:JSON.stringify(s)});
 await page.goto('/');
}
async function save(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}
async function begin(page){
 await page.locator('#actionDelivery').click();
 await page.locator('[data-delivery-node="southernpacific"]').click();
 await page.locator('[data-hauler="standard"]').click();
 await page.locator('[data-load="Steel"]').click();
 await page.locator('#deliveryBeginRoute').click();
}
async function addFromPacific(page,type){
 await page.locator('#deliveryShowPickups').click();
 await page.locator('[data-extra-source-id="pacificmail"]').click();
 await page.locator('[data-extra-cargo="'+type+'"]').click();
}

for(const vp of [{width:390,height:844},{width:932,height:430}]){
 test('mobile '+vp.width+' multi-source pickup charges +$1 and unloads two resources',async({page})=>{
  page.on('pageerror',e=>{throw e;});
  await page.setViewportSize(vp);await seed(page,makeState());await begin(page);
  await expect(page.locator('#deliveryShowPickups')).toBeVisible();
  await addFromPacific(page,'Masonry');
  await expect(page.locator('.ux3-route-price')).toContainText('$7');
  const dims=await page.locator('#deliveryPanel').evaluate(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,bottom:r.bottom,height:r.height,w:innerWidth,h:innerHeight};});
  expect(dims.left).toBeGreaterThanOrEqual(-1);
  expect(dims.right).toBeLessThanOrEqual(dims.w+1);
  expect(dims.bottom).toBeLessThanOrEqual(dims.h+1);
  if(vp.height<500)expect(dims.height).toBeLessThanOrEqual(90);
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="W1"]').click();
  await page.locator('[data-drop-kind="warehouse"][data-drop-type="Steel"]').click();
  await page.locator('[data-drop-kind="warehouse"][data-drop-type="Masonry"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const saved=await save(page);
  expect(saved.constructions.find(x=>x.id==='W1').warehouseInventory).toEqual(['Steel','Masonry']);
  expect(saved.players[0].capital).toBe(53);
  expect(saved.logisticsSupply.southernpacific).toEqual(['Steel','Lumber','Masonry']);
  expect(saved.logisticsSupply.pacificmail).toEqual(['Steel','Lumber','Masonry']);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2)).toBe(false);
 });
 test('mobile '+vp.width+' same stop multiple items from Pacific Mail remain one extra loading fee',async({page})=>{
  await page.setViewportSize(vp);await seed(page,makeState());await begin(page);
  await addFromPacific(page,'Masonry');
  await addFromPacific(page,'Lumber');
  await expect(page.locator('.ux3-route-price')).toContainText('$8');
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="W1"]').click();
  for(const type of ['Steel','Masonry','Lumber'])await page.locator('[data-drop-type="'+type+'"][data-drop-kind="warehouse"]').click();
  await page.locator('#deliveryConfirm').click();
  const s=await save(page);
  expect(s.players[0].capital).toBe(52);
  expect(s.constructions[0].warehouseInventory).toEqual(['Steel','Masonry','Lumber']);
 });
}

test('mobile portrait allows return to same source only after leaving its district',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,makeState());await begin(page);
 await page.locator('#deliveryShowPickups').click();
 await expect(page.locator('[data-extra-source-id="southernpacific"]')).toHaveCount(0);
 await page.locator('#deliveryHidePickups').click();
 await page.locator('[data-district="mission"]').click();
 await expect(page.locator('#deliveryShowRouteDrops')).toBeVisible();
 await page.locator('#deliveryShowRouteDrops').click();
 await page.locator('[data-early-drop-target="W2"]').click();
 await page.locator('[data-drop-kind="warehouse"][data-drop-type="Steel"]').click();
 await page.locator('#deliveryCloseTarget').click();
 await page.locator('[data-district="soma"]').click();
 await page.locator('#deliveryShowPickups').click();
 await expect(page.locator('[data-extra-source-id="southernpacific"]')).toBeVisible();
 await page.locator('[data-extra-source-id="southernpacific"]').click();
 await page.locator('[data-extra-cargo="Steel"]').click();
 await page.locator('#deliveryLockRoute').click();
 await page.locator('[data-construction-token="W1"]').click();
 await page.locator('[data-drop-kind="warehouse"][data-drop-type="Steel"]').click();
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 await page.locator('#deliveryConfirm').click();
 const s=await save(page);
 expect(s.players[0].capital).toBe(50);
 expect(s.constructions.find(x=>x.id==='W1').warehouseInventory).toEqual(['Steel']);
 expect(s.constructions.find(x=>x.id==='W2').warehouseInventory).toEqual(['Steel']);
});
test('desktop extra pickup uses same flow and persists after reload',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await seed(page,makeState());await begin(page);
 await addFromPacific(page,'Masonry');
 await page.locator('[data-drop-kind="warehouse"][data-drop-id="W1"][data-drop-type="Steel"]').click();
 await page.locator('[data-drop-kind="warehouse"][data-drop-id="W1"][data-drop-type="Masonry"]').click();
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 await page.locator('#deliveryConfirm').click();
 await page.reload();
 const s=await save(page);
 expect(s.constructions[0].warehouseInventory).toEqual(['Steel','Masonry']);
 expect(s.logisticsSupply.pacificmail).toEqual(['Steel','Lumber','Masonry']);
 await expect(page.locator('.version-badge')).toHaveText('v0.44-L1');
});
test('canceling a drafted extra pickup never consumes city supply or money',async({page})=>{
 await page.setViewportSize({width:390,height:844});await seed(page,makeState());await begin(page);
 await addFromPacific(page,'Masonry');
 await page.locator('#cancelDelivery').click();
 const s=await save(page);
 expect(s.players[0].capital).toBe(60);
 expect(s.logisticsSupply.southernpacific).toEqual(['Steel','Steel','Lumber','Masonry']);
 expect(s.logisticsSupply.pacificmail).toEqual(['Steel','Masonry','Lumber','Masonry']);
});
