import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430}];
function game(){
 const s=createInitialState({rng:()=>0.11});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players.forEach(p=>{p.capital=80;p.portfolio=[];});
 s.constructions=[];return s;
}
function built(id,projectId='bakery',districtId='northbeach',playerId=0,extra={}){
 return {id,playerId,projectId,districtId,status:'complete',
  materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[],
  startedRound:1,completedRound:1,...extra};
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[KEY,s]);
 await page.reload();
}
async function stored(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}
async function noPageOverflow(page,viewport){
 const rect=await page.evaluate(()=>({
   htmlWidth:document.documentElement.scrollWidth,
   bodyWidth:document.body.scrollWidth,
   clientWidth:document.documentElement.clientWidth
 }));
 expect(rect.htmlWidth).toBeLessThanOrEqual(viewport.width+2);
 expect(rect.clientWidth).toBeLessThanOrEqual(viewport.width+2);
}

for(const viewport of viewports){
 test('mixed bakery quick action, both modes and persistence '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();
  s.constructions=[built('B1','bakery','northbeach',0,{bakeryInventory:['Lumber']}),built('B2','bakery','civic',0,{bakeryInventory:['Lumber']})];
  await seed(page,s);
  await page.locator('#officeBtn').click();
  await expect(page.locator('[data-bakery-id="B1"][data-bakery-choice="cash"]')).toBeEnabled();
  await page.locator('[data-bakery-id="B1"][data-bakery-choice="cash"]').click();
  await expect(page.locator('[data-bakery-id="B1"][data-bakery-choice="cash"]')).toBeDisabled();
  await page.locator('[data-bakery-id="B2"][data-bakery-choice="vp"]').click();
  const saved=await stored(page);
  expect(saved.players[0].capital).toBe(87);
  expect(saved.players[0].prestige).toBe(1);
  expect(saved.constructions.find(c=>c.id==='B1').bakeryInventory).toEqual([]);
  expect(saved.constructions.find(c=>c.id==='B2').bakeryInventory).toEqual([]);
  expect(saved.players[0].workersLeft).toBe(3);
  await page.reload();await page.locator('#officeBtn').click();
  await expect(page.locator('[data-bakery-id="B1"][data-bakery-choice="cash"]')).toBeDisabled();
  await noPageOverflow(page,viewport);
 });
 test('mixed bakery real delivery through mobile UI '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();s.constructions=[built('B','bakery','northbeach')];
  s.logisticsSupply.broadway=['Lumber','Lumber'];s.players[0].capital=80;
  await seed(page,s);
  await page.locator('#actionDelivery').dispatchEvent('click');
  await expect(page.locator('#deliveryPanel')).toBeHidden();
  await expect(page.locator('[data-delivery-node="broadway"]')).toHaveClass(/source-available/);
  await page.locator('[data-delivery-node="broadway"]').click();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Lumber"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="B"][data-delivery-drop-target="B"]').dispatchEvent('click');
  await expect(page.locator('[data-drop-kind="bakery"][data-drop-id="B"][data-drop-type="Lumber"]')).toBeEnabled();
  await page.locator('[data-drop-kind="bakery"][data-drop-id="B"][data-drop-type="Lumber"]').click();
  await page.locator('#deliveryConfirm').click();
  let saved=await stored(page);
  expect(saved.constructions.find(c=>c.id==='B').bakeryInventory).toEqual(['Lumber']);
  expect(saved.players[0].capital).toBeLessThan(80);
  await page.locator('#officeBtn').click();
  await page.locator('[data-bakery-id="B"][data-bakery-choice="cash"]').click();
  saved=await stored(page);
  expect(saved.constructions.find(c=>c.id==='B').bakeryInventory).toEqual([]);
  expect(saved.players[0].capital).toBeGreaterThan(80-7);
  await page.reload();await page.locator('#officeBtn').click();
  await expect(page.locator('[data-bakery-id="B"][data-bakery-choice="cash"]')).toBeDisabled();
  await noPageOverflow(page,viewport);
 });
}
test('migration adds two of each mixed project once without disturbing old hands and built sites',async({page})=>{
 const s=game();s.residentialMixedV1=false;
 s.market=s.market.map(m=>m&&['bakery','orphanage'].includes(m.id)?{...m,id:'tenement'}:m);
 s.deck=s.deck.filter(c=>!['bakery','orphanage'].includes(c.id));
 s.starterDraftHands=s.starterDraftHands.map(hand=>hand.filter(c=>!['bakery','orphanage'].includes(c.id)));
 s.players[0].portfolio=['tenement'];s.constructions=[built('OLD','tenement','civic')];
 await seed(page,s);
 let after=await stored(page);
 expect(after.residentialMixedV1).toBe(true);
 expect(after.deck.filter(c=>c.id==='bakery')).toHaveLength(2);
 expect(after.deck.filter(c=>c.id==='orphanage')).toHaveLength(2);
 expect(after.players[0].portfolio).toContain('tenement');
 expect(after.constructions.find(c=>c.id==='OLD').status).toBe('complete');
 await page.reload();after=await stored(page);
 expect(after.deck.filter(c=>c.id==='bakery')).toHaveLength(2);
 expect(after.deck.filter(c=>c.id==='orphanage')).toHaveLength(2);
});
test('orphanage market card is readable and displays correct value on a narrow viewport',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game();s.players[0].portfolio=['orphanage'];s.constructions=[built('O','orphanage','civic',0,{orphanageInfluenceAwarded:true})];
 await seed(page,s);await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).toContainText('Сиротский приют');
 await expect(page.locator('#officeContent')).toContainText('1906');
 await noPageOverflow(page,{width:390,height:844});
});
