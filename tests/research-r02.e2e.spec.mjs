import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({cash=50}={}){
 const s=createInitialState({rng:()=>0.2});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.activeWorkerId=s.players[0].workers[0].id;
 s.players[0].workers[0].districtId='civic';
 s.players[0].capital=cash;s.players[0].prestige=0;
 s.research.R02={status:'funded',holderId:2,fundedRound:1};
 s.selectedDistrictId='soma';
 s.constructions=[{id:'CAMP',playerId:0,projectId:'polytechnic_campus',
  districtId:'soma',status:'under-construction',startedRound:1,completedRound:null,
  materialsDelivered:['Lumber','Lumber','Masonry'],warehouseInventory:[]}];
 s.logisticsSupply.pacificmail=['Masonry'];
 return s;
}
async function seed(page,s){
 await page.addInitScript(({key,val})=>{
  if(localStorage.getItem(key)==null)localStorage.setItem(key,val);
 },{key:KEY,val:JSON.stringify(s)});
 await page.goto('/');
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function finishDelivery(page,vp){
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
 await page.locator('[data-drop-kind="construction"][data-drop-id="CAMP"][data-drop-type="Masonry"]').click();
 await page.locator('#deliveryConfirm').click();
}
async function noOverflow(page,vp){
 const w=await page.evaluate(()=>({view:innerWidth,scroll:document.documentElement.scrollWidth}));
 expect(w.scroll-w.view).toBeLessThanOrEqual(3);
}
test.beforeEach(({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of sizes){
 test('R02 real final delivery shows saved optional choice and paid reinforcement '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game());
  await finishDelivery(page,vp);
  await expect(page.locator('#reinforcementSheet')).toBeVisible();
  await expect(page.locator('#reinforcementSheet')).toContainText('Укрепить');
  const before=await saved(page);
  const construction=before.constructions.find(c=>c.id==='CAMP');
  expect(construction.status).toBe('under-construction');
  expect(construction.materialsDelivered).toEqual(['Lumber','Lumber','Masonry','Masonry']);
  expect(before.pendingReinforcements).toEqual(['CAMP']);
  expect(before.players[0].prestige).toBe(0);
  await page.reload();
  await expect(page.locator('#reinforcementSheet')).toBeVisible();
  await page.locator('[data-reinforcement-choice="yes"]').click();
  await expect(page.locator('#reinforcementSheet')).toBeHidden();
  const after=await saved(page);
  expect(after.pendingReinforcements).toEqual([]);
  expect(after.players[0].capital).toBe(before.players[0].capital-2);
  expect(after.players[0].prestige).toBe(2);
  expect(after.constructions.find(c=>c.id==='CAMP').status).toBe('complete');
  expect(after.constructions.find(c=>c.id==='CAMP').earthquakeReinforcement).toBe(1);
  await page.reload();
  expect((await saved(page)).players[0].capital).toBe(after.players[0].capital);
  expect((await saved(page)).players[0].prestige).toBe(2);
  await noOverflow(page,vp);
 });
 test('R02 decline keeps full risk and does not pay extra '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game());
  await finishDelivery(page,vp);
  const before=await saved(page);
  await page.locator('[data-reinforcement-choice="no"]').click();
  const after=await saved(page);
  expect(after.pendingReinforcements).toEqual([]);
  expect(after.players[0].capital).toBe(before.players[0].capital);
  expect(after.players[0].prestige).toBe(2);
  const construction=after.constructions.find(c=>c.id==='CAMP');
  expect(construction.status).toBe('complete');
  expect(construction.earthquakeReinforcement).toBeUndefined();
  await expect(page.locator('#reinforcementSheet')).toBeHidden();
  await noOverflow(page,vp);
 });
}
test('R02 unaffordable choice still has a usable normal completion on mobile',async({page})=>{
 const vp={width:390,height:844};await page.setViewportSize(vp);
 const s=game({cash:2});
 await seed(page,s);
 await finishDelivery(page,vp);
 await expect(page.locator('#reinforcementSheet')).toBeVisible();
 await expect(page.locator('[data-reinforcement-choice="yes"]')).toBeDisabled();
 await expect(page.locator('[data-reinforcement-choice="no"]')).toBeEnabled();
 await page.locator('[data-reinforcement-choice="no"]').click();
 const after=await saved(page);
 expect(after.pendingReinforcements).toEqual([]);
 expect(after.constructions[0].status).toBe('complete');
 expect(after.players[0].capital).toBeLessThan(2);
 await noOverflow(page,vp);
});
