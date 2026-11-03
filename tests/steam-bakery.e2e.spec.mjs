import {test,expect} from '@playwright/test';
import {createInitialState,projectById,completeConstruction,BREAD_FACTORY_ID} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430}];

function base(){
 const s=createInitialState({rng:()=>0.18});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
 s.constructions=[];
 return s;
}
function built(id,projectId,owner=1,extra={}){
 return {id,projectId,districtId:'soma',playerId:owner,status:'complete',
 materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[],
 startedRound:1,completedRound:1,...extra};
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,value])=>localStorage.setItem(key,JSON.stringify(value)),[KEY,s]);
 await page.reload();
}
async function saved(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}
for(const size of sizes){
 test('mandatory bread production prompts on completion and survives reload '+size.width+'x'+size.height,async({page})=>{
   const s=base(),bakery=built('F',BREAD_FACTORY_ID,1,{status:'under-construction'});
   s.constructions.push(bakery);
   const r=completeConstruction(s,bakery);
   expect(r.ok).toBe(true);
   await page.setViewportSize(size);await seed(page,s);
   await expect(page.locator('#yearTransitionSheet')).toBeVisible();
   await expect(page.locator('#yearTransitionSheet')).toContainText('Паровая хлебопекарная фабрика');
   await expect(page.locator('[data-bread-output="2"]')).toBeVisible();
   await expect(page.locator('[data-bread-output="4"]')).toBeVisible();
   await page.locator('[data-bread-output="4"]').click();
   const after=await saved(page),con=after.constructions.find(x=>x.id==='F');
   expect(con.breadStock).toBe(4);
   expect(con.breadProductionQuantity).toBe(4);
   expect(con.breadProductionRound).toBe(after.round);
   expect(after.pendingBreadProduction).toEqual([]);
   await page.reload();
   expect((await saved(page)).constructions.find(x=>x.id==='F').breadStock).toBe(4);
   await expect(page.locator('#yearTransitionSheet')).toBeHidden();
 });
 test('bread delivered to wholesale buyer respects 3 common slots and pays $3/$1/$1 '+size.width+'x'+size.height,async({page})=>{
   const s=base();
   s.constructions=[
    built('F',BREAD_FACTORY_ID,1,{breadStock:4,breadProductionRound:1,breadProductionQuantity:4}),
    built('M','wholesale_market',2)
   ];
   await page.setViewportSize(size);await seed(page,s);
   await page.locator('#actionDelivery').dispatchEvent('click');
   await expect(page.locator('[data-delivery-goods="F"]')).toHaveClass(/source-available/);
   await page.locator('[data-delivery-goods="F"]').dispatchEvent('click');
   await page.locator('[data-hauler="standard"]').click();
   await page.locator('[data-load="Bread"]').click();
   await page.locator('[data-load="Bread"]').click();
   await page.locator('#deliveryBeginRoute').click();
   await page.locator('#deliveryLockRoute').click();
   await expect(page.locator('[data-construction-token="M"]')).toHaveClass(/delivery-drop-available/);
   await page.locator('[data-construction-token="M"][data-delivery-drop-target="M"]').dispatchEvent('click');
   await expect(page.locator('#deliveryPanel')).toContainText('Розовые товары 0/3');
   await expect(page.locator('[data-drop-kind="goods-sale"][data-drop-id="M"][data-drop-type="Bread"]')).toBeEnabled();
   await page.locator('[data-drop-kind="goods-sale"][data-drop-id="M"][data-drop-type="Bread"]').click();
   await page.locator('[data-drop-kind="goods-sale"][data-drop-id="M"][data-drop-type="Bread"]').click();
   await expect(page.locator('#deliveryPanel')).toContainText('Розовые товары 2/3');
   await page.locator('#deliveryConfirm').click();
   const after=await saved(page);
   expect(after.constructions.find(c=>c.id==='F').breadStock).toBe(2);
   expect(after.constructions.find(c=>c.id==='M').goodsIntakeCount).toBe(2);
   expect(after.players[0].capital).toBe(103);
   expect(after.players[1].capital).toBe(102);
   expect(after.players[2].capital).toBe(102);
   await page.reload();
   const persisted=await saved(page);
   expect(persisted.constructions.find(c=>c.id==='F').breadStock).toBe(2);
   expect(persisted.constructions.find(c=>c.id==='M').goodsIntakeCount).toBe(2);
 });
}
