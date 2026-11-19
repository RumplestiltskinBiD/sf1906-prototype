import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const screens=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game(funded){
 const s=createInitialState({rng:()=>0.23});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];
 s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['H03'];
 s.constructions=[
  {id:'ST',projectId:'std_fire',playerId:1,districtId:'civic',
   startedRound:1,completedRound:1,status:'complete',
   materialsDelivered:[...projectById('std_fire').materials],warehouseInventory:[]},
  {id:'FULL',projectId:'firehouse',playerId:2,districtId:'financial',
   startedRound:1,completedRound:1,status:'complete',
   materialsDelivered:[...projectById('firehouse').materials],warehouseInventory:[]}
 ];
 if(funded)s.research.R03={status:'funded',holderId:0,fundedRound:1};
 return s;
}
async function seed(page,save){
 await page.goto('/');
 await page.evaluate(([key,gameState])=>localStorage.setItem(key,JSON.stringify(gameState)),[KEY,save]);
 await page.reload();
}
async function fits(page,viewport){
 const dim=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth}));
 expect(dim.scroll).toBeLessThanOrEqual(viewport.width+3);
 expect(dim.client).toBeLessThanOrEqual(viewport.width+3);
}
for(const vp of screens){
 test('R03 current std fire card and source risk reflect researched P−2 '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game(true));
  const card=page.locator('.standard-project-card').filter({has:page.locator('[data-standard-build="std_fire"]')});
  await expect(card).toContainText('П −2');
  await expect(page.locator('#standardProjects')).toBeVisible();
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(stored.research.R03.status).toBe('funded');
  expect(stored.constructions[0].status).toBe('complete');
  await page.reload();
  await expect(card).toContainText('П −2');
  await fits(page,vp);
 });
 test('unfunded R03 retains P−1 standard card, no invented global modernization '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game(false));
  const card=page.locator('.standard-project-card').filter({has:page.locator('[data-standard-build="std_fire"]')});
  await expect(card).toContainText('П −1');
  await fits(page,vp);
 });
}
for(const vp of screens){
 test('Phase II saved game imports R03 std post and market station with actual P−2, no double charge '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game(true);
  await seed(page,s);
  const savedBeforeLab=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  await page.goto('/catastrophe.html');
  await expect(page.locator('#mapWindow svg')).toBeVisible();
  await page.locator('#loadSaved').click();
  await expect(page.locator('#message')).toContainText('Загружены реальные риски');
  await page.locator('#mapWindow [data-district="civic"]').dispatchEvent('click');
  await expect(page.locator('#firehouse')).toBeChecked();
  await expect(page.locator('#selectionInfo')).toContainText('П с пожарной частью');
  await page.locator('#quake').click();
  await expect(page.locator('#selectionInfo')).toContainText('защита П −2');
  await expect(page.locator('#selectionInfo')).toContainText('пожарная часть:');
  const after=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(after).toEqual(savedBeforeLab,'Phase II lab must not rewrite Phase I saved game');
 });
}
for(const vp of screens){
 test('R03 finished research updates actual firehouse market risk labels without changing base card '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game(true);s.phase='declare';s.view='hall';
  s.market[0].id='firehouse';
  await seed(page,s);
  const card=page.locator('#projectMarket .project-card').filter({hasText:'Муниципальная пожарная часть'}).first();
  await expect(card).toContainText('П -2');
  const compact=page.locator('.market-overview-item').filter({hasText:'Муниципальная пожарная часть'});
  if(vp.width<=640||(vp.height<=500&&vp.width<=960))await expect(compact.first()).toContainText('П-2');
  await fits(page,vp);
 });
}
