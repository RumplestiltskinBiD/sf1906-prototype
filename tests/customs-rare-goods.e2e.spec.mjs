import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430}];
function game(){
 const s=createInitialState({rng:()=>0.18});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];});
 s.constructions=[];return s;
}
function built(id,projectId,districtId='soma',playerId=0,extra={}){
 return {id,projectId,districtId,playerId,status:'complete',
  materialsDelivered:[...projectById(projectId).materials],
  startedRound:1,completedRound:1,warehouseInventory:[],...extra};
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[KEY,s]);
 await page.reload();
}
async function saved(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}
for(const viewport of viewports){
 test('purple contraband source and black-market recipient work on '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();s.constructions=[
   built('W','customs_warehouse','soma',1,{contrabandStock:2}),
   built('S','rare_goods_shop','soma',2,{fixedIncome:2})];
  await seed(page,s);
  await page.locator('#actionDelivery').dispatchEvent('click');
  await expect(page.locator('[data-delivery-contraband="W"]')).toHaveClass(/source-available/);
  await page.locator('[data-delivery-contraband="W"]').dispatchEvent('click');
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Contraband"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="S"][data-delivery-drop-target="S"]').dispatchEvent('click');
  await expect(page.locator('[data-drop-kind="contraband-sale"][data-drop-id="S"][data-drop-type="Contraband"]')).toBeEnabled();
  await page.locator('[data-drop-kind="contraband-sale"][data-drop-id="S"][data-drop-type="Contraband"]').click();
  await page.locator('#deliveryConfirm').click();
  const after=await saved(page);
  expect(after.constructions.find(c=>c.id==='W').contrabandStock).toBe(1);
  expect(after.players[0].capital).toBe(103);
  expect(after.players[1].capital).toBe(101);
  expect(after.players[2].capital).toBe(101);
  expect(after.players[0].suspicion).toBe(1);
  expect(after.players[1].suspicion).toBe(0);
  expect(after.players[2].suspicion).toBe(0);
  await page.reload();
  const persisted=await saved(page);
  expect(persisted.constructions.find(c=>c.id==='W').contrabandStock).toBe(1);
  expect(persisted.players[0].suspicion).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth))
   .toBeLessThanOrEqual(viewport.width+2);
 });
 test('three-star illegal delivery requires explicit offender on '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();s.players[0].suspicion=3;
  s.constructions=[built('W','customs_warehouse','soma',1,{contrabandStock:2}),
   built('S','rare_goods_shop','soma',2,{fixedIncome:2})];
  await seed(page,s);
  await page.locator('#actionDelivery').dispatchEvent('click');
  await page.locator('[data-delivery-contraband="W"]').dispatchEvent('click');
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Contraband"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="S"][data-delivery-drop-target="S"]').dispatchEvent('click');
  await page.locator('[data-drop-kind="contraband-sale"][data-drop-id="S"][data-drop-type="Contraband"]').click();
  await expect(page.locator('#contrabandArrestChoice')).toBeVisible();
  await expect(page.locator('#deliveryConfirm')).toBeDisabled();
  await page.locator('#contrabandArrestChoice').selectOption(s.players[0].workers[1].id);
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const after=await saved(page);
  expect(after.players[0].workers[1].jailed).toBe(true);
  expect(after.players[0].suspicion).toBe(0);
  expect(after.constructions.find(c=>c.id==='W').contrabandStock).toBe(1);
 });
}
test('old saved markets gain both cards exactly once without overwriting existing projects',async({page})=>{
 const s=game();s.criminalTradeV1=false;
 s.deck=s.deck.filter(c=>!['customs_warehouse','rare_goods_shop'].includes(c.id));
 s.market=s.market.filter(c=>c&&!['customs_warehouse','rare_goods_shop'].includes(c.id));
 s.starterDraftHands=(s.starterDraftHands||[]).map(hand=>hand.filter(c=>!['customs_warehouse','rare_goods_shop'].includes(c.id)));
 s.starterDiscards=(s.starterDiscards||[]).filter(c=>!['customs_warehouse','rare_goods_shop'].includes(c.id));
 s.expired=(s.expired||[]).filter(c=>!['customs_warehouse','rare_goods_shop'].includes(c.id));
 s.players[0].portfolio=['bank'];
 s.constructions=[built('OLD','bank','civic')];
 await seed(page,s);
 let after=await saved(page);
 expect(after.criminalTradeV1).toBe(true);
 expect(after.deck.filter(c=>c.id==='customs_warehouse')).toHaveLength(2);
 expect(after.deck.filter(c=>c.id==='rare_goods_shop')).toHaveLength(2);
 expect(after.starterDraftHands.flat().filter(c=>['customs_warehouse','rare_goods_shop'].includes(c.id))).toHaveLength(0);
 expect(after.constructions.find(c=>c.id==='OLD').status).toBe('complete');
 expect(after.players[0].portfolio).toEqual(['bank']);
 await page.reload();after=await saved(page);
 expect(after.deck.filter(c=>c.id==='customs_warehouse')).toHaveLength(2);
 expect(after.deck.filter(c=>c.id==='rare_goods_shop')).toHaveLength(2);
});
test('shop fixed income survives changing land and future rival business in saved state',async({page})=>{
 const s=game();
 s.constructions=[built('S','rare_goods_shop','soma',0,{fixedIncome:2})];
 s.districts.soma.landValue=5;
 await seed(page,s);
 await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).toContainText('Лавка редких товаров');
 await expect(page.locator('#officeContent')).toContainText('Доход +2 / год');
 const after=await saved(page);
 expect(after.constructions.find(c=>c.id==='S').fixedIncome).toBe(2);
});
