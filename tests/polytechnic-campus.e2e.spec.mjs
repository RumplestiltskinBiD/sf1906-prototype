import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a',id='polytechnic_campus';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game(){
 const s=createInitialState({rng:()=>0.2});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.newsCurrentIds=['H03'];s.newsH01Incident=null;s.newsC01Incident=null;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players[0].capital=50;s.players[0].prestige=0;
 s.players[0].workers[0].districtId='civic';s.selectedDistrictId='civic';
 s.players[0].portfolio=[];
 s.constructions=[];return s;
}
function site({status='under-construction',districtId='soma',materials=['Lumber','Lumber','Masonry']}={}){
 return {id:'CAMP',projectId:id,playerId:0,districtId,status,
  startedRound:1,completedRound:status==='complete'?1:null,
  materialsDelivered:[...materials],warehouseInventory:[]};
}
async function seed(page,s){
 await page.addInitScript(({key,val})=>{
  if(localStorage.getItem(key)==null)localStorage.setItem(key,val);
 },{key:KEY,val:JSON.stringify(s)});
 await page.goto('/');
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function fits(page,vp){
 const dim=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
 expect(dim.scroll-dim.w).toBeLessThanOrEqual(3);
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of sizes){
 test('Campus market card advertises implemented science, dual types, four materials and correct price '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);const s=game();s.phase='declare';s.view='hall';
  s.market[0].id=id;s.declarationIndex=0;
  await seed(page,s);
  const card=page.locator('#projectMarket .project-card').filter({hasText:'Политехнический кампус'}).first();
  await expect(card).toBeVisible();
  await expect(card).toContainText('Жилое');
  await expect(card).toContainText('Общественное');
  await expect(card).toContainText('Научная программа · исследования R01–R08');
  await expect(card).toContainText('Доход +$1/год');
  await expect(card.locator('.prestige-chip')).toHaveText('VP 2');
  await expect(card.locator('.opening-price')).toContainText('$3');
  await expect(card.locator('.resource-pip.lumber')).toHaveCount(2);
  await expect(card.locator('.resource-pip.masonry')).toHaveCount(2);
  await expect(card.locator('.resource-pip.steel')).toHaveCount(0);
  await expect(card.locator('.risk-change.quake')).toContainText('У +1');
  // The market preview is not an action space; a completed campus supplies the real button in City actions.
   await expect(page.locator('[data-research-open-kind="building"]')).toHaveCount(0);
  await fits(page,vp);
 });
 test('Campus actual fourth-brick delivery finishes building and persists land/value/VP '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game();s.constructions=[site()];
  s.logisticsSupply.pacificmail=['Masonry'];s.players[0].capital=50;
  const oldLand=s.districts.soma.landValue;
  await seed(page,s);
  await page.locator('#actionDelivery').dispatchEvent('click');
  await page.locator('[data-delivery-node="pacificmail"]').dispatchEvent('click');
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Masonry"]').click();
  await page.locator('#deliveryBeginRoute').click();
  const mobile=vp.width<=640||(vp.height<=500&&vp.width<=960);
  if(mobile){
   await page.locator('#deliveryLockRoute').click();
   await page.locator('[data-construction-token="CAMP"][data-delivery-drop-target="CAMP"]').dispatchEvent('click');
  }
  const drop=page.locator('[data-drop-kind="construction"][data-drop-id="CAMP"][data-drop-type="Masonry"]');
  await expect(drop).toBeEnabled();
  await drop.click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const current=await saved(page);
  expect(current.constructions[0].status).toBe('complete');
  expect(current.constructions[0].materialsDelivered).toEqual(projectById(id).materials);
  expect(current.players[0].prestige).toBe(2);
  expect(current.districts.soma.landValue).toBe(oldLand+1);
  expect(current.players[0].capital).toBeLessThan(50);
  await page.reload();
  const reloaded=await saved(page);
  expect(reloaded.players[0].prestige).toBe(2);
  expect(reloaded.districts.soma.landValue).toBe(oldLand+1);
  expect(reloaded.constructions[0].status).toBe('complete');
  await fits(page,vp);
 });
}
test('A campus in player hand uses an actual construction action, land payment and worker',async({page})=>{
 const s=game();s.players[0].portfolio=[id];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#officeBtn').click();
 await expect(page.locator('[data-start-project="polytechnic_campus"]')).toBeVisible();
 await page.locator('[data-start-project="polytechnic_campus"]').click();
 await page.locator('[data-district="civic"]').click();
 await expect(page.locator('#confirmConstruction')).toBeEnabled();
 await page.locator('#confirmConstruction').click();
 const after=await saved(page);
 expect(after.constructions.find(c=>c.projectId===id).status).toBe('under-construction');
 expect(after.players[0].capital).toBe(50-s.districts.civic.landValue);
 expect(after.players[0].workers[0].used).toBe(true);
 expect(after.players[0].workersLeft).toBe(2);
 expect(after.activationMainActionUsed).toBe(true);
 expect(after.players[0].prestige).toBe(0);
 expect(after.districts.civic.landValue).toBe(s.districts.civic.landValue);
});
test('legacy save gains exactly two campus cards once without changing existing market, holdings or cash',async({page})=>{
 const s=game();s.constructions=[];
 delete s.polytechnicCampusExpansionV1;
 s.market=s.market.map(c=>c?.id===id?{...c,id:'tenement'}:c);
 s.deck=s.deck.filter(c=>c.id!==id);
 s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!==id));
 s.players[0].portfolio=['bank','tenement'];
 const beforeMarket=structuredClone(s.market);
 const beforeHand=structuredClone(s.players[0].portfolio);
 const beforeCash=s.players[0].capital;
 const beforeDeck=s.deck.map(c=>c.uid);
 await seed(page,s);
 const one=await saved(page);
 expect(one.polytechnicCampusExpansionV1).toBe(true);
 expect(one.market).toEqual(beforeMarket);
 expect(one.players[0].portfolio).toEqual(beforeHand);
 expect(one.players[0].capital).toBe(beforeCash);
 expect(one.deck.filter(c=>c.id===id)).toHaveLength(2);
 expect(one.deck.filter(c=>c.id!==id).map(c=>c.uid)).toEqual(beforeDeck);
 await page.reload();const two=await saved(page);
 expect(two.deck.filter(c=>c.id===id)).toHaveLength(2);
 expect(two.deck.map(c=>c.uid)).toEqual(one.deck.map(c=>c.uid));
});
test('legacy part-owned and emptied-deck saves cannot mint extra copies or refill an already new game',async({page})=>{
 const s=game();s.players[0].portfolio=[id];
 s.market=s.market.map(c=>c?.id===id?{...c,id:'tenement'}:c);
 s.starterDraftHands=s.starterDraftHands.map(h=>h.filter(c=>c.id!==id));
 s.deck=s.deck.filter(c=>c.id!==id);delete s.polytechnicCampusExpansionV1;
 await seed(page,s);
 const one=await saved(page);
 expect(one.players[0].portfolio).toEqual([id]);
 expect(one.deck.filter(c=>c.id===id)).toHaveLength(1);
 await page.reload();
 expect((await saved(page)).deck.filter(c=>c.id===id)).toHaveLength(1);
});
