import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function state({funded=true}={}){
 const s=createInitialState({rng:()=>0.12});
 if(s.newsH02Incident)s.newsH02Incident.resolvedRound=s.round;
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.players[0].capital=70;
 s.logisticsSupply.southernpacific=['Lumber','Steel','Masonry','Lumber'];
 s.constructions=[{id:'MAR',projectId:'warehouse',playerId:0,districtId:'marina',status:'complete',
   materialsDelivered:[],warehouseInventory:[],startedRound:1,completedRound:1}];
 if(funded)Object.assign(s.research.R07,{status:'funded',holderId:1,fundedRound:1});
 return s;
}
async function seed(page,s){
 await page.addInitScript(({key,value})=>{
   if(!localStorage.getItem(key))localStorage.setItem(key,value);
 },{key:KEY,value:JSON.stringify(s)});
 await page.goto('/');
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function noPageOverflow(page,v){
 const width=await page.evaluate(()=>document.documentElement.scrollWidth);
 expect(width).toBeLessThanOrEqual(v.width+3);
}
for(const v of viewports){
 test('R07 funded: node Lumber $2 everywhere including live loading control '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);await seed(page,state());
  await page.locator('#actionDelivery').click();
  await page.locator('[data-delivery-node="southernpacific"]').click();
  await expect(page.locator('[data-load="Lumber"] strong')).toHaveText('$2');
  await expect(page.locator('[data-load="Steel"] strong')).toHaveText('$2');
  await expect(page.locator('[data-load="Masonry"] strong')).toHaveText('$1');
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await expect(page.locator('.delivery-cost-preview')).toContainText('Материалы $2');
  const s=await saved(page);
  expect(s.research.R07.status).toBe('funded');
  expect(s.players[0].capital).toBe(70,'unconfirmed cargo cannot debit funds');
  await noPageOverflow(page,v);
 });
 test('R07 funded: neutral Lumber source price $4 is consistent on map and load card '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);await seed(page,state());
  await page.locator('#actionDelivery').click();
  const node=page.locator('[data-delivery-supplier="engle-lumber"]');
  await expect(node.locator('.supplier-price')).toHaveText('$4');
  await expect(node.locator('title')).toContainText('$4');
  await node.click();
  await expect(page.locator('[data-load="Lumber"] strong')).toHaveText('$4');
  await expect(page.locator('[data-load="Masonry"]')).toBeDisabled();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await expect(page.locator('.delivery-cost-preview')).toContainText('Материалы $4');
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="MAR"]').click();
  await page.locator('[data-drop-kind="warehouse"][data-drop-type="Lumber"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  let s=await saved(page);
  expect(s.players[0].capital).toBe(63,'$4 material + $3 standard hauler');
  expect(s.constructions[0].warehouseInventory).toEqual(['Lumber']);
  await page.reload();
  s=await saved(page);
  expect(s.players[0].capital).toBe(63);
  expect(s.constructions[0].warehouseInventory).toEqual(['Lumber']);
  await noPageOverflow(page,v);
 });
 test('R07 unavailable: ordinary node $1 and supplier $3 prices survive browser reload '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);await seed(page,state({funded:false}));
  await page.locator('#actionDelivery').click();
  await expect(page.locator('[data-delivery-supplier="engle-lumber"] .supplier-price')).toHaveText('$3');
  await page.locator('[data-delivery-node="southernpacific"]').click();
  await expect(page.locator('[data-load="Lumber"] strong')).toHaveText('$1');
  await page.reload();
  const s=await saved(page);
  expect(s.research.R07.status).toBe('available');
  expect(s.players[0].capital).toBe(70);
  await noPageOverflow(page,v);
 });
}
