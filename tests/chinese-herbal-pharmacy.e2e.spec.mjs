import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const id='chinese_herbal_pharmacy';
const sizes=[{width:390,height:844},{width:932,height:430}];
function game(){
 const s=createInitialState({rng:()=>0.18});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.developmentSlotsUsed=[0,0,0];
 s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['H03'];s.newsH01Incident=null;s.newsH02Incident=null;
 s.players.forEach(p=>{p.capital=100;p.portfolio=[];p.workers.forEach(w=>{w.jailed=false;w.used=false;});});
 s.constructions=[];return s;
}
function built(pid,owner=0,district='soma',extra={}){
 return {id:'C'+(Math.random().toString().slice(2,9)),projectId:pid,playerId:owner,districtId:district,
  status:'complete',startedRound:1,completedRound:1,materialsDelivered:[...projectById(pid).materials],
  warehouseInventory:[],...extra};
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,value])=>localStorage.setItem(key,JSON.stringify(value)),[KEY,s]);
 await page.reload();
}
async function saved(page){return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),KEY));}
async function fits(page,size){
 const d=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
 expect(d.scroll-d.width).toBeLessThanOrEqual(3,'no horizontal overflow');
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const size of sizes){
 test('pharmacy is a real card with wood, fire, income, dual types and zero-land text '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);
  const s=game();s.phase='declare';s.view='hall';s.declarationIndex=0;
  s.market[0]={...s.market[0],id};
  await seed(page,s);
  const card=page.locator('#projectMarket .project-card').filter({hasText:'Китайская аптекарская лавка'}).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Бизнес');
  await expect(card).toContainText('Торговое');
  await expect(card).toContainText('Тайный сбыт');
  await expect(card).toContainText('Связи в Chinatown');
  await expect(card.locator('.opening-price')).toContainText('$4');
  await expect(card.locator('.prestige-chip')).toHaveText('VP 1');
  await expect(card.locator('.resource-pip.lumber')).toHaveCount(3);
  await expect(card.locator('.resource-pip.masonry')).toHaveCount(0);
  await expect(card.locator('.resource-pip.steel')).toHaveCount(0);
  await expect(card.locator('.risk-change.fire')).toContainText('П +2');
  await fits(page,size);
 });
 test('purple cargo can be delivered to the new pharmacy with correct earnings and saved state '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);
  const s=game();
  s.constructions=[
   built('customs_warehouse',1,'soma',{id:'SOURCE',contrabandStock:2}),
   built(id,2,'soma',{id:'PHARMACY'})];
  await seed(page,s);
  await page.locator('#mobileActionDock [data-mobile-action="delivery"]').click();
  await expect(page.locator('[data-delivery-contraband="SOURCE"]')).toHaveClass(/source-available/);
  await page.locator('[data-delivery-contraband="SOURCE"]').click();
  await page.locator('[data-hauler="standard"]').click();
  await page.locator('[data-load="Contraband"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await expect(page.locator('[data-construction-token="PHARMACY"]')).toHaveClass(/delivery-drop-available/);
  await page.locator('[data-construction-token="PHARMACY"][data-delivery-drop-target="PHARMACY"]').click();
  await expect(page.locator('#deliveryPanel')).toContainText('Китайская аптекарская лавка');
  await expect(page.locator('[data-drop-kind="contraband-sale"][data-drop-id="PHARMACY"][data-drop-type="Contraband"]')).toBeEnabled();
  await page.locator('[data-drop-kind="contraband-sale"][data-drop-id="PHARMACY"][data-drop-type="Contraband"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const after=await saved(page);
  expect(after.constructions.find(c=>c.id==='SOURCE').contrabandStock).toBe(1);
  expect(after.players[0].capital).toBe(103);
  expect(after.players[1].capital).toBe(101);
  expect(after.players[2].capital).toBe(101);
  expect(after.players[0].suspicion).toBe(1);
  expect(after.players[1].suspicion).toBe(0);expect(after.players[2].suspicion).toBe(0);
  await page.reload();const retained=await saved(page);
  expect(retained.constructions.find(c=>c.id==='SOURCE').contrabandStock).toBe(1);
  expect(retained.players[0].suspicion).toBe(1);
  await fits(page,size);
 });
 test('Chinatown land is fully free even at value 6; real worker, contract and cash persist '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);
  const s=game();s.players[0].portfolio=[id];s.players[0].bureauContracts=1;
  s.players[0].workers[0].districtId='chinatown';s.districts.chinatown.landValue=6;
  s.players[0].capital=0;
  await seed(page,s);
  await page.locator('#officeBtn').click();
  await expect(page.locator('[data-start-project="'+id+'"]')).toBeVisible();
  await page.locator('[data-start-project="'+id+'"]').click();
  await page.locator('[data-district="chinatown"]').click();
  await expect(page.locator('#confirmConstruction')).toBeEnabled();
  await page.locator('#confirmConstruction').click();
  const after=await saved(page);
  expect(after.constructions.find(c=>c.projectId===id).status).toBe('under-construction');
  expect(after.constructions.find(c=>c.projectId===id).districtId).toBe('chinatown');
  expect(after.players[0].capital).toBe(0);
  expect(after.players[0].bureauContracts).toBe(1);
  expect(after.districts.chinatown.landValue).toBe(6);
  expect(after.players[0].workers[0].used).toBe(true);
  await page.reload();const reloaded=await saved(page);
  expect(reloaded.constructions.find(c=>c.projectId===id).status).toBe('under-construction');
  expect(reloaded.players[0].bureauContracts).toBe(1);
  await fits(page,size);
 });
 test('real completion locks clinic bonus even if clinic later disappears '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);const s=game();
  s.constructions=[built(id,0,'chinatown',{id:'PHARMACY',status:'under-construction',completedRound:null}),built('std_clinic',1,'financial',{id:'CLINIC'})];
  await seed(page,s);await page.locator('#officeBtn').click();
  await expect(page.locator('[data-complete-build="PHARMACY"]')).toBeEnabled();
  await page.locator('[data-complete-build="PHARMACY"]').dispatchEvent('click');
  let after=await saved(page);
  expect(after.constructions.find(c=>c.id==='PHARMACY').status).toBe('complete');
  expect(after.constructions.find(c=>c.id==='PHARMACY').herbalPrivatePracticeBonus).toBe(1);
  expect(after.players[0].prestige).toBe(1);
  await expect(page.locator('#officeContent')).toContainText('Доход +2 / год');
  after.constructions.find(c=>c.id==='CLINIC').status='abandoned';
  await page.evaluate(([key,val])=>localStorage.setItem(key,JSON.stringify(val)),[KEY,after]);
  await page.reload();const reload=await saved(page);
  expect(reload.constructions.find(c=>c.id==='PHARMACY').herbalPrivatePracticeBonus).toBe(1);
  await page.locator('#officeBtn').click();
  await expect(page.locator('#officeContent')).toContainText('Доход +2 / год');
  await fits(page,size);
 });
 test('completion without medicine stays at base income after later clinic '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);const s=game();
  s.constructions=[built(id,0,'chinatown',{id:'PHARMACY',status:'under-construction',completedRound:null})];
  await seed(page,s);await page.locator('#officeBtn').click();
  await expect(page.locator('[data-complete-build="PHARMACY"]')).toBeEnabled();
  await page.locator('[data-complete-build="PHARMACY"]').dispatchEvent('click');
  let after=await saved(page);
  expect(after.constructions.find(c=>c.id==='PHARMACY').herbalPrivatePracticeBonus).toBe(0);
  await expect(page.locator('#officeContent')).toContainText('Доход +1 / год');
  after.constructions.push(built('clinic',1,'financial',{id:'LATER-CLINIC'}));
  await page.evaluate(([key,val])=>localStorage.setItem(key,JSON.stringify(val)),[KEY,after]);
  await page.reload();
  expect((await saved(page)).constructions.find(c=>c.id==='PHARMACY').herbalPrivatePracticeBonus).toBe(0);
  await page.locator('#officeBtn').click();
  await expect(page.locator('#officeContent')).toContainText('Доход +1 / год');
  await fits(page,size);
 });
}
test('migration freezes income visible for a completed old-version pharmacy exactly once',async({page})=>{
 const s=game();delete s.herbalPrivatePracticeSnapshotV1;
 s.constructions=[built(id,0,'chinatown',{id:'OLD-PHARMACY'}),built('std_clinic',1,'financial',{id:'OLD-CLINIC'})];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 let old=await saved(page);
 expect(old.herbalPrivatePracticeSnapshotV1).toBe(true);
 expect(old.constructions.find(c=>c.id==='OLD-PHARMACY').herbalPrivatePracticeBonus).toBe(1);
 await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).toContainText('Доход +2 / год');
 old.constructions.find(c=>c.id==='OLD-CLINIC').status='abandoned';
 await page.evaluate(([key,val])=>localStorage.setItem(key,JSON.stringify(val)),[KEY,old]);
 await page.reload();const current=await saved(page);
 expect(current.constructions.find(c=>c.id==='OLD-PHARMACY').herbalPrivatePracticeBonus).toBe(1);
 await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).toContainText('Доход +2 / год');
});
test('migration freezes zero when old save has no finished medical neighbor',async({page})=>{
 const s=game();delete s.herbalPrivatePracticeSnapshotV1;
 s.constructions=[built(id,0,'chinatown',{id:'OLD-PHARMACY'})];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 let old=await saved(page);
 expect(old.herbalPrivatePracticeSnapshotV1).toBe(true);
 expect(old.constructions.find(c=>c.id==='OLD-PHARMACY').herbalPrivatePracticeBonus).toBe(0);
 old.constructions.push(built('std_clinic',1,'financial',{id:'NEW-CLINIC'}));
 await page.evaluate(([key,val])=>localStorage.setItem(key,JSON.stringify(val)),[KEY,old]);
 await page.reload();const current=await saved(page);
 expect(current.constructions.find(c=>c.id==='OLD-PHARMACY').herbalPrivatePracticeBonus).toBe(0);
 await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).toContainText('Доход +1 / год');
});
test('old save gains missing two cards once; preserves market, portfolios, building and other deck order',async({page})=>{
 const s=game();delete s.chineseHerbalPharmacyExpansionV1;
 s.deck=s.deck.filter(c=>c.id!==id);
 s.market=s.market.map(c=>c?.id===id?null:c);
 s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!==id));
 s.starterDiscards=(s.starterDiscards||[]).filter(c=>c.id!==id);
 s.expired=(s.expired||[]).filter(c=>c.id!==id);
 s.players[0].portfolio=['bank'];
 s.constructions=[built('bank',0,'civic',{id:'EXISTING'})];
 const market=structuredClone(s.market),hold=structuredClone(s.players[0].portfolio);
 const otherDeck=s.deck.map(c=>c.uid);
 await seed(page,s);const saved1=await saved(page);
 expect(saved1.chineseHerbalPharmacyExpansionV1).toBe(true);
 expect(saved1.deck.filter(c=>c.id===id)).toHaveLength(2);
 expect(saved1.deck.filter(c=>c.id!==id).map(c=>c.uid)).toEqual(otherDeck);
 expect(saved1.market).toEqual(market);
 expect(saved1.players[0].portfolio).toEqual(hold);
 expect(saved1.constructions.find(c=>c.id==='EXISTING').projectId).toBe('bank');
 await page.reload();const saved2=await saved(page);
 expect(saved2.deck.filter(c=>c.id===id)).toHaveLength(2);
 expect(saved2.deck.map(c=>c.uid)).toEqual(saved1.deck.map(c=>c.uid));
});
test('legacy save with one owned pharmacy gains only one and does not mint extras after reload',async({page})=>{
 const s=game();delete s.chineseHerbalPharmacyExpansionV1;
 s.market=s.market.map(c=>c?.id===id?null:c);
 s.deck=s.deck.filter(c=>c.id!==id);
 s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!==id));
 s.players[0].portfolio=[id];
 await seed(page,s);const a=await saved(page);
 expect(a.players[0].portfolio).toEqual([id]);
 expect(a.deck.filter(c=>c.id===id)).toHaveLength(1);
 await page.reload();const b=await saved(page);
 expect(b.deck.filter(c=>c.id===id)).toHaveLength(1);
});
