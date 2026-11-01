import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
const site=(id,playerId,projectId,status='complete',materials=[])=>({
 id,playerId,projectId,districtId:'civic',status,materialsDelivered:materials,
 startedRound:1,completedRound:status==='complete'?1:null,warehouseInventory:[]
});
function makeGame(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activeWorkerId=s.players[0].workers[0].id;s.activationMainActionUsed=false;
 s.players[0].capital=50;s.players[0].portfolio=['brewery'];
 s.constructions=[site('H',1,'hall_of_justice'),site('A',0,'luxury'),
   site('S',0,'factory','under-construction',['Lumber','Masonry','Steel'])];
 return s;
}
async function seed(page,s){
 await page.addInitScript(({key,val})=>{if(localStorage.getItem(key)===null)localStorage.setItem(key,val);},
   {key:KEY,val:JSON.stringify(s)});
 await page.goto('/');
}
async function stored(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY);}
for(const viewport of viewports){
 test('Hall of Justice card and action selection at '+viewport.width+'×'+viewport.height,async({page})=>{
   await page.setViewportSize(viewport);
   const game=makeGame();game.market[0].id='hall_of_justice';
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await seed(page,game);
   // All card properties, including min-land, are visible on the market.
   await page.locator('#officeBtn').dispatchEvent('click');
   await page.locator('#officeBtn').dispatchEvent('click');
   const hall=page.locator('#projectMarket .project-card').filter({hasText:'Дворец правосудия'}).first();
   if(await hall.count()){
     await expect(hall).toContainText('Дворец правосудия');
     await expect(hall).toContainText('Стоимость земли 3+');
   }
   await expect(page.locator('[data-justice-mode="register"]')).toBeEnabled();
   await page.locator('[data-justice-mode="register"]').dispatchEvent('click');
   await expect(page.locator('[data-justice-target="A"]')).toBeEnabled();
   await page.locator('[data-justice-target="A"]').dispatchEvent('click');
   let saved=await stored(page);
   expect(saved.constructions.find(c=>c.id==='A').propertyTitleRegistered).toBe(true);
   expect(saved.players[0].capital).toBe(49);
   expect(saved.actionSpaceOccupancy.H).toBe(0);
   expect(saved.players[0].workers[0].used).toBe(true);
   await expect(page.locator('[data-justice-mode="reorganize"]')).toBeDisabled();
   await page.reload();saved=await stored(page);
   expect(saved.constructions.find(c=>c.id==='A').propertyTitleRegistered).toBe(true);
   expect(errors).toEqual([]);
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
   expect(overflow).toBeLessThanOrEqual(2);
 });
 test('Hall of Justice real reorganization, hand discard and save at '+viewport.width+'×'+viewport.height,async({page})=>{
   await page.setViewportSize(viewport);const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await seed(page,makeGame());
   await page.locator('[data-justice-mode="reorganize"]').dispatchEvent('click');
   await expect(page.locator('[data-justice-site="S"]')).toBeEnabled();
   await page.locator('[data-justice-site="S"]').dispatchEvent('click');
   await expect(page.locator('[data-justice-project="brewery"]')).toBeEnabled();
   await page.locator('[data-justice-project="brewery"]').dispatchEvent('click');
   let saved=await stored(page);
   const con=saved.constructions.find(c=>c.id==='S');
   expect(con.projectId).toBe('brewery');expect(con.status).toBe('complete');
   expect(con.justiceReorganized).toBe(true);
   expect(con.materialsDelivered).toEqual(['Lumber','Masonry','Steel']);
   expect(saved.players[0].portfolio).toEqual([]);
   expect(saved.expired.at(-1).id).toBe('factory');
   expect(saved.players[0].capital).toBe(48);
   expect(saved.actionSpaceOccupancy.H).toBe(0);
   await page.reload();saved=await stored(page);
   expect(saved.constructions.find(c=>c.id==='S').projectId).toBe('brewery');
   expect(errors).toEqual([]);
 });
}

test('legacy save receives exactly two Hall of Justice cards, without duplication on reload',async({page})=>{
  const s=createInitialState({rng:()=>0.1});
  s.hallOfJusticeExpansionV1=false;
  s.market=s.market.map(m=>m?.id==='hall_of_justice'?{...m,id:'tenement'}:m);
  s.deck=s.deck.filter(c=>c.id!=='hall_of_justice');
  s.starterDraftHands=s.starterDraftHands.map(hand=>hand.filter(c=>c.id!=='hall_of_justice'));
  await seed(page,s);
  let storedGame=await stored(page);
  const count=g=>g.deck.filter(c=>c.id==='hall_of_justice').length
    +g.market.filter(c=>c?.id==='hall_of_justice').length
    +g.starterDraftHands.flat().filter(c=>c.id==='hall_of_justice').length;
  expect(count(storedGame)).toBe(2);
  await page.reload();storedGame=await stored(page);
  expect(count(storedGame)).toBe(2);
  expect(storedGame.hallOfJusticeExpansionV1).toBe(true);
});

test('catastrophe laboratory previews one protected title without changing saved game',async({page})=>{
  const s=makeGame();s.constructions.find(c=>c.id==='A').propertyTitleRegistered=true;
  await seed(page,s);
  await page.goto('/catastrophe.html');
  await page.locator('#loadSaved').click();
  await expect(page.locator('#message')).toContainText('Загружены реальные риски партии');
  await page.locator('#quake').click();
  if(await page.locator('#all').isEnabled())await page.locator('#all').click();
  await expect(page.locator('#titleProtectionPreview')).toContainText('Гарантированные VP: 1');
  const saved=await stored(page);
  expect(saved.constructions.find(c=>c.id==='A').propertyTitleVpAwarded).toBeFalsy();
});
