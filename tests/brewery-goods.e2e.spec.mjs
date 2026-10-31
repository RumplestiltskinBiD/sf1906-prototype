import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430}];
function setup(){
 const s=createInitialState({rng:()=>0.18});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
 s.constructions=[
   {id:'B',projectId:'brewery',districtId:'soma',playerId:1,status:'complete',
     materialsDelivered:[...projectById('brewery').materials],beerStock:2,warehouseInventory:[],startedRound:1,completedRound:1},
   {id:'P',projectId:'pub',districtId:'soma',playerId:2,status:'complete',
     materialsDelivered:[...projectById('pub').materials],warehouseInventory:[],startedRound:1,completedRound:1}
 ];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,value])=>localStorage.setItem(key,JSON.stringify(value)),[KEY,s]);
 await page.reload();
}
async function saved(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}
for(const size of sizes){
 test('pink beer from brewery to pub is payable and persistent '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);
  await seed(page,setup());
  await page.locator('#actionDelivery').dispatchEvent('click');
  await expect(page.locator('[data-delivery-goods="B"]')).toHaveClass(/source-available/);
  await page.locator('[data-delivery-goods="B"]').dispatchEvent('click');
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Beer"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="P"][data-delivery-drop-target="P"]').dispatchEvent('click');
  await expect(page.locator('[data-drop-kind="goods-sale"][data-drop-id="P"][data-drop-type="Beer"]')).toBeEnabled();
  await page.locator('[data-drop-kind="goods-sale"][data-drop-id="P"][data-drop-type="Beer"]').click();
  await page.locator('#deliveryConfirm').click();
  const after=await saved(page);
  expect(after.constructions.find(c=>c.id==='B').beerStock).toBe(1);
  expect(after.players[0].capital).toBe(100,'carrier +$3 minus $3 standard hauler');
  expect(after.players[1].capital).toBe(101);
  expect(after.players[2].capital).toBe(101);
  expect(after.players[0].suspicion).toBe(0);
  await page.reload();
  const persisted=await saved(page);
  expect(persisted.constructions.find(c=>c.id==='B').beerStock).toBe(1);
  await page.locator('#actionDelivery').dispatchEvent('click');
  await expect(page.locator('#deliveryPanel')).not.toHaveClass(/active/);
 });
 test('older completed brewery gains safe 2-beer inventory '+size.width+'x'+size.height,async({page})=>{
  const s=setup();delete s.constructions[0].beerStock;
  await page.setViewportSize(size);await seed(page,s);
  expect((await saved(page)).constructions.find(c=>c.id==='B').beerStock).toBe(2);
 });
}
