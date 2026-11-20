import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const screens=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game(){
 const s=createInitialState({rng:()=>0.31});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.pendingBreadProduction=[];s.pendingPressCampaigns=[];s.pendingWorkforceLinks=[];s.pendingSailorRecruitments=[];
 s.newsCurrentIds=['H03'];s.newsF04Notices=null;s.newsE01Contracts=null;
 s.players.forEach(p=>{
  p.capital=50;p.prestige=0;p.portfolio=[];p.workersLeft=3;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];s.actionSpaceOccupancy={};
 return s;
}
function campus(s,id,owner,district='civic'){
 s.constructions.push({id,projectId:'polytechnic_campus',playerId:owner,districtId:district,
  status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:['Lumber','Lumber','Masonry','Masonry']});
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function ensureFits(page,viewport){
 const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,screen:innerWidth}));
 expect(dimensions.width).toBeLessThanOrEqual(viewport.width+3);
}
async function openCatalog(page){
 await page.locator('#researchBtn').click();
 await expect(page.locator('#researchDrawer')).toHaveClass(/open/);
 await expect(page.locator('#researchContent [data-research-card]')).toHaveCount(8);
}
test.beforeEach(({page})=>{
 page.on('pageerror',error=>{throw error;});
 page.on('console',message=>{if(message.type()==='error')throw Error(message.text());});
});
for(const viewport of screens){
 test('8A Civic real UI: acquire R01 then fund in same activation, persist land/cash/VP '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const original=game(),land=original.districts.marina.landValue;
  await seed(page,original);
  await openCatalog(page);
  await expect(page.locator('[data-research-status="available"] [data-research-card]')).toHaveCount(8);
  await page.locator('[data-research-pick-source="civic"]').click();
  await expect(page.locator('[data-research-acquire="R01"]')).toBeEnabled();
  await page.locator('[data-research-acquire="R01"]').click();
  const afterAcquire=await saved(page);
  expect(afterAcquire.research.R01).toEqual({status:'held',holderId:0,fundedRound:null});
  expect(afterAcquire.players[0].capital).toBe(50);
  expect(afterAcquire.players[0].workersLeft).toBe(2);
  expect(afterAcquire.activationMainActionUsed).toBe(true);
  await expect(page.locator('[data-research-acquire="R02"]')).toBeDisabled();
  await expect(page.locator('[data-research-fund="R01"]')).toBeEnabled();
  await page.locator('[data-research-fund="R01"]').click();
  const final=await saved(page);
  expect(final.players[0].capital).toBe(47);
  expect(final.players[0].prestige).toBe(2);
  expect(final.players[0].workersLeft).toBe(2,'funding cannot consume another worker');
  expect(final.research.R01.status).toBe('funded');
  expect(final.districts.marina.landValue).toBe(Math.max(0,land-1));
  await expect(page.locator('[data-research-status="funded"] [data-research-card="R01"]')).toBeVisible();
  await expect(page.locator('[data-research-fund="R01"]')).toHaveCount(0);
  await page.reload();
  expect((await saved(page)).players[0].prestige).toBe(2);
  await openCatalog(page);
  await expect(page.locator('[data-research-card="R01"]')).toContainText('Профинансирован');
  await ensureFits(page,viewport);
 });
 test('8A two campuses: outsider owner payment, distinct annual occupancy and second player '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();campus(s,'CAMP1',1);campus(s,'CAMP2',2);
  await seed(page,s);
  const first=page.locator('[data-campus-research="CAMP1"]');
  await expect(first).toBeEnabled();
  await first.click();
  await expect(page.locator('[data-research-pick-source="building:CAMP1"]')).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-research-acquire="R02"]').click();
  let current=await saved(page);
  expect(current.actionSpaceOccupancy.CAMP1).toBe(0);
  expect(current.players[1].capital).toBe(51);
  expect(current.players[0].capital).toBe(50);
  expect(current.research.R02.holderId).toBe(0);
  await page.evaluate(key=>{
    const s=JSON.parse(localStorage.getItem(key));
    s.developmentPlayer=1;s.activationMainActionUsed=false;
    s.activeWorkerId=s.players[1].workers[0].id;
    localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload();
  await expect(page.locator('[data-campus-research="CAMP1"]')).toBeDisabled();
  await expect(page.locator('[data-campus-research="CAMP2"]')).toBeEnabled();
  await page.locator('[data-campus-research="CAMP2"]').click();
  await page.locator('[data-research-acquire="R03"]').click();
  current=await saved(page);
  expect(current.actionSpaceOccupancy.CAMP1).toBe(0);
  expect(current.actionSpaceOccupancy.CAMP2).toBe(1);
  expect(current.players[2].capital).toBe(51);
  expect(current.research.R03.holderId).toBe(1);
  expect(current.players[1].workersLeft).toBe(2);
  await ensureFits(page,viewport);
 });
 test('8A cannot fund R03 without prerequisites, but unlocks immediately with two complete firehouses '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();
  await seed(page,s);await openCatalog(page);
  await page.locator('[data-research-pick-source="civic"]').click();
  await page.locator('[data-research-acquire="R03"]').click();
  await expect(page.locator('[data-research-fund="R03"]')).toBeDisabled();
  await expect(page.locator('[data-research-card="R03"]')).toContainText('Нужно завершённых учреждений: 2 · сейчас 0');
  let pending=await saved(page);
  expect(pending.research.R03.status).toBe('held');
  expect(pending.players[0].capital).toBe(50);
  await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.constructions.push(
    {id:'F1',projectId:'std_fire',status:'complete',playerId:1,districtId:'marina'},
    {id:'F2',projectId:'firehouse',status:'complete',playerId:2,districtId:'soma'});
   localStorage.setItem(key,JSON.stringify(s));
  },KEY);
  await page.reload();await openCatalog(page);
  await expect(page.locator('[data-research-fund="R03"]')).toBeEnabled();
  await page.locator('[data-research-fund="R03"]').click();
  const funded=await saved(page);
  expect(funded.research.R03.status).toBe('funded');
  expect(funded.players[0].capital).toBe(45);
  expect(funded.players[0].prestige).toBe(2);
  expect(funded.players[0].workersLeft).toBe(2);
  await ensureFits(page,viewport);
 });
 test('8A low funds and opponent-owned research show reasons and never allow fund '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();s.players[0].capital=0;
  s.research.R07={status:'held',holderId:0,fundedRound:null};
  s.research.R08={status:'held',holderId:1,fundedRound:null};
  await seed(page,s);await openCatalog(page);
  await expect(page.locator('[data-research-fund="R07"]')).toBeDisabled();
  await expect(page.locator('[data-research-card="R07"]')).toContainText('Недостаточно денег: нужно $4, есть $0');
  await expect(page.locator('[data-research-card="R08"]')).toContainText('Зарезервировано другим игроком');
  await expect(page.locator('[data-research-fund="R08"]')).toHaveCount(0);
  const before=await saved(page);
  await page.reload();
  const after=await saved(page);
  expect(after.research.R07).toEqual(before.research.R07);
  expect(after.research.R08).toEqual(before.research.R08);
  expect(after.players[0].capital).toBe(0);
  await ensureFits(page,viewport);
 });
 test('8A legacy save and out-of-range campus show global catalogue but no illegal actions '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);
  const s=game();delete s.research;campus(s,'CAMP1',2);
  s.players[0].workers[0].districtId='outerrichmond';
  await seed(page,s);
  await expect(page.locator('[data-research-open-source="civic"]')).toBeDisabled();
  await expect(page.locator('[data-campus-research="CAMP1"]')).toBeDisabled();
  await openCatalog(page);
  await expect(page.locator('[data-research-status="available"] [data-research-card]')).toHaveCount(8);
  await expect(page.locator('[data-research-pick-source="civic"]')).toBeDisabled();
  await expect(page.locator('[data-research-pick-source="building:CAMP1"]')).toBeDisabled();
  await expect(page.locator('[data-research-acquire="R01"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('#researchDrawer')).not.toHaveClass(/open/);
  await expect(page.locator('#researchBtn')).toBeFocused();
  await page.locator('#officeBtn').click();
  await page.locator('#officeResearchBtn').click();
  await expect(page.locator('#researchDrawer')).toHaveClass(/open/);
  const savedGame=await saved(page);
  expect(savedGame.players[0].capital).toBe(50);
  expect(Object.keys(savedGame.research)).toHaveLength(8);
  await ensureFits(page,viewport);
 });
}
