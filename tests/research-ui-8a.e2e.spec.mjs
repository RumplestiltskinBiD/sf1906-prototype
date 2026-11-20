import {test,expect} from '@playwright/test';
import {createInitialState,RESEARCH_STATUSES} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function fixture(){
 const s=createInitialState({rng:()=>0.22});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['H03'];s.newsLastResolvedRound=0;
 s.newsF04Notices=null;s.newsE01Contracts=null;s.newsC03Offer=null;
 s.players.forEach(p=>{p.capital=40;p.prestige=0;p.workersLeft=3;
   p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});});
 s.constructions=[];
 return s;
}
function campus(id,owner,district='civic'){
 return {id,projectId:'polytechnic_campus',playerId:owner,districtId:district,
  status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:['Lumber','Lumber','Masonry','Masonry'],warehouseInventory:[]};
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function nav(page){
 await page.locator('#researchBtn').click();
 await expect(page.locator('#researchDrawer')).toHaveClass(/open/);
 await expect(page.locator('[data-research-card]')).toHaveCount(8);
}
async function visible(page,v){
 const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,
   width:window.innerWidth,drawer:document.querySelector('#researchContent').clientWidth}));
 expect(metrics.scroll).toBeLessThanOrEqual(v.width+3);
 expect(metrics.drawer).toBeGreaterThan(200);
}
for(const v of viewports){
 test('R01–R08 research screen accessible, all cards and no hidden awards '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);await seed(page,fixture());
  await nav(page);
  await expect(page.locator('#researchContent')).toContainText('Открыто 8');
  await expect(page.locator('#researchContent')).toContainText('удерживается 0');
  await expect(page.locator('[data-research-card="R01"]')).toContainText('Геологическое исследование');
  await expect(page.locator('[data-research-card="R03"]')).toContainText('минимум 2 пожарных');
  await expect(page.locator('[data-research-card="R05"]')).toContainText('поставок материалов');
  await expect(page.locator('[data-research-card="R08"]')).toContainText('Фаза II');
  const s=await saved(page);
  expect(s.players[0].capital).toBe(40);
  expect(s.players[0].prestige).toBe(0);
  expect(s.players[0].workersLeft).toBe(3);
  await visible(page,v);
  await page.keyboard.press('Escape');
  // Drawer close is always accessible independently of viewport.
  await page.locator('#researchDrawer [data-close-drawer]').click();
  await expect(page.locator('#researchDrawer')).not.toHaveClass(/open/);
 });
 test('real Civic research acquisition and free funding + save/reload '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);await seed(page,fixture());
  await expect(page.locator('#researchActionSources [data-research-open-kind="civic"]')).toBeEnabled();
  await page.locator('#researchActionSources [data-research-open-kind="civic"]').click();
  await expect(page.locator('[data-research-card="R01"] .research-take')).toBeEnabled();
  await page.locator('[data-research-card="R01"] .research-take').click();
  let s=await saved(page);
  expect(s.research.R01).toMatchObject({status:'held',holderId:0});
  expect(s.players[0].capital).toBe(40);
  expect(s.players[0].prestige).toBe(0);
  expect(s.players[0].workersLeft).toBe(2);
  expect(s.activationMainActionUsed).toBe(true);
  await expect(page.locator('[data-research-card="R01"] .research-fund')).toBeEnabled();
  await expect(page.locator('[data-research-card="R02"] .research-take')).toBeDisabled();
  await page.locator('[data-research-card="R01"] .research-fund').click();
  s=await saved(page);
  expect(s.research.R01).toMatchObject({status:'funded',holderId:0,fundedRound:1});
  expect(s.players[0].capital).toBe(37);
  expect(s.players[0].prestige).toBe(2);
  expect(s.players[0].workersLeft).toBe(2);
  await expect(page.locator('[data-research-card="R01"]')).toContainText('ПРОФИНАНСИРОВАНО');
  const before=JSON.stringify(s);
  await page.reload();
  const again=await saved(page);
  expect(JSON.stringify(again)).toBe(before);
  await nav(page);
  await expect(page.locator('[data-research-card="R01"] .research-fund')).toHaveCount(0);
  await expect(page.locator('[data-research-card="R01"] .research-take')).toHaveCount(0);
  await visible(page,v);
 });
 test('every completed campus has an independent action, occupied site blocked, other owner rewarded '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);
  const s=fixture();s.constructions=[campus('CAMP-A',1),campus('CAMP-B',2)];
  await seed(page,s);
  await expect(page.locator('[data-research-open-kind="building"]')).toHaveCount(2);
  await expect(page.locator('[data-research-open-id="CAMP-A"]')).toBeEnabled();
  await page.locator('[data-research-open-id="CAMP-A"]').click();
  await expect(page.locator('[data-research-card="R02"] .research-take')).toBeEnabled();
  await page.locator('[data-research-card="R02"] .research-take').click();
  const first=await saved(page);
  expect(first.research.R02).toMatchObject({status:'held',holderId:0});
  expect(first.actionSpaceOccupancy['CAMP-A']).toBe(0);
  expect(first.players[1].capital).toBe(41);
  expect(first.players[0].capital).toBe(40);
  await page.locator('#researchDrawer [data-close-drawer]').click();
  await expect(page.locator('[data-research-open-id="CAMP-A"]')).toBeDisabled();
  await page.locator('#actionEndActivation').click();
  await page.locator('[data-select-worker="'+s.players[1].workers[0].id+'"]').click();
  await expect(page.locator('[data-research-open-id="CAMP-A"]')).toBeDisabled();
  await expect(page.locator('[data-research-open-id="CAMP-B"]')).toBeEnabled();
  await page.locator('[data-research-open-id="CAMP-B"]').click();
  await page.locator('[data-research-card="R03"] .research-take').click();
  const second=await saved(page);
  expect(second.research.R03).toMatchObject({status:'held',holderId:1});
  expect(second.actionSpaceOccupancy['CAMP-B']).toBe(1);
  expect(second.players[2].capital).toBe(41);
  expect(second.players[1].capital).toBe(41);
  await visible(page,v);
 });
 test('prerequisites, insufficient cash, foreign holdings and unlimited hand have correct reasons '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);
  const s=fixture();
  Object.assign(s.research.R03,{status:'held',holderId:0,fundedRound:null});
  Object.assign(s.research.R04,{status:'held',holderId:0,fundedRound:null});
  Object.assign(s.research.R05,{status:'held',holderId:0,fundedRound:null});
  Object.assign(s.research.R06,{status:'held',holderId:1,fundedRound:null});
  s.players[0].capital=3;
  await seed(page,s);await nav(page);
  await expect(page.locator('#researchContent')).toContainText('У Синий удерживается 3 карт');
  await expect(page.locator('[data-research-card="R03"] .research-fund')).toBeDisabled();
  await expect(page.locator('[data-research-card="R03"] .research-reason')).toContainText('0 из 2');
  await expect(page.locator('[data-research-card="R04"] .research-reason')).toContainText('0 из 1');
  await expect(page.locator('[data-research-card="R05"] .research-reason')).toContainText('Недостаточно капитала');
  await expect(page.locator('[data-research-card="R06"] .research-fund')).toHaveCount(0);
  await page.locator('[data-research-viewer="1"]').click();
  await expect(page.locator('[data-research-card="R06"] .research-fund')).toBeDisabled();
  const now=await saved(page);
  expect(now.players[0].capital).toBe(3);
  expect(now.research.R03.status).toBe('held');
  expect(now.research.R04.status).toBe('held');
  expect(now.research.R05.status).toBe('held');
  await visible(page,v);
 });
 test('Civic research inaccessible from remote worker but browse stays possible '+v.width+'x'+v.height,async({page})=>{
  await page.setViewportSize(v);
  const s=fixture();s.players[0].workers.forEach(w=>w.districtId='sunset');
  await seed(page,s);
  await expect(page.locator('#researchActionSources [data-research-open-kind="civic"]')).toBeDisabled();
  await nav(page);
  await expect(page.locator('[data-research-card="R01"] .research-take')).toBeDisabled();
  await expect(page.locator('[data-research-card="R01"]')).toContainText('Выбранный источник недоступен');
  expect((await saved(page)).players[0].workersLeft).toBe(3);
  await visible(page,v);
 });
}
