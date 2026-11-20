import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({funded=true,issue='E02',capital=50}={}){
  const s=createInitialState({rng:()=>0.3});
  s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
  s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
  s.players.forEach(p=>{p.capital=capital;p.portfolio=[];});
  s.constructions=[];s.newsCurrentIds=[issue];s.newsLastResolvedRound=0;
  s.research.R08={status:funded?'funded':'available',holderId:funded?2:null,
    fundedRound:funded?1:null};
  return s;
}
async function seed(page,s){
  await page.goto('/');
  await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
  await page.reload();
}
async function current(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
function card(page,id){
  return page.locator('#standardProjects .standard-project-card')
    .filter({has:page.locator('[data-standard-build="'+id+'"]')});
}
async function noOverflow(page,width){
  const v=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(v).toBeLessThanOrEqual(width+3);
}
for(const v of viewports){
 test('R08 funded: only std_clinic shows $3 and a real new construction debits exact fee '+v.width+'x'+v.height,async({page})=>{
   await page.setViewportSize(v);
   const fixture=game(),land=fixture.districts.civic.landValue;
   await seed(page,fixture);
   await expect(card(page,'std_clinic')).toContainText('Проект $3');
   for(const id of ['std_fire','std_police','std_warehouse']){
     await expect(card(page,id)).toContainText('Проект $2');
   }
   await expect(page.locator('#standardProjects .standard-projects-head'))
     .toContainText('сбор указан на карточке');
   await page.locator('[data-standard-build="std_clinic"]').click();
   await page.locator('[data-district="civic"]').click();
   await expect(page.locator('.construction-confirm')).toContainText('Проект $3');
   await expect(page.locator('.construction-confirm')).toContainText('Итого $'+(land+3));
   await expect(page.locator('#confirmConstruction')).toBeEnabled();
   await page.locator('#confirmConstruction').click();
   const result=await current(page);
   expect(result.players[0].capital).toBe(50-land-3);
   expect(result.players[0].workersLeft).toBe(2);
   expect(result.constructions).toHaveLength(1);
   expect(result.constructions[0].projectId).toBe('std_clinic');
   expect(result.constructions[0].status).toBe('under-construction');
   expect(result.constructions[0].materialsDelivered).toEqual([]);
   await page.reload();
   const restored=await current(page);
   expect(restored.players[0].capital).toBe(50-land-3);
   expect(restored.constructions[0].projectId).toBe('std_clinic');
   await noOverflow(page,v.width);
 });
 test('R08 unpaid: legacy UI still shows $2 and no phantom surcharge '+v.width+'x'+v.height,async({page})=>{
   await page.setViewportSize(v);await seed(page,game({funded:false}));
   await expect(card(page,'std_clinic')).toContainText('Проект $2');
   await expect(card(page,'std_fire')).toContainText('Проект $2');
   await page.locator('[data-standard-build="std_clinic"]').click();
   await page.locator('[data-district="civic"]').click();
   await expect(page.locator('.construction-confirm')).toContainText('Проект $2');
   await page.reload();
   const restored=await current(page);
   expect(restored.research.R08.status).toBe('available');
   expect(restored.players[0].capital).toBe(50);
   await noOverflow(page,v.width);
 });
 test('R08 funded: insufficient $3 clinic fee blocks confirmation and never spends money '+v.width+'x'+v.height,async({page})=>{
   await page.setViewportSize(v);
   const fixture=game(),land=fixture.districts.civic.landValue;
   fixture.players[0].capital=land+2;
   await seed(page,fixture);
   await page.locator('[data-standard-build="std_clinic"]').click();
   await page.locator('[data-district="civic"]').click();
   await expect(page.locator('.construction-confirm')).toContainText('Не хватает капитала');
   await expect(page.locator('#confirmConstruction')).toHaveCount(0);
   const state=await current(page);
   expect(state.players[0].capital).toBe(land+2);
   expect(state.constructions).toHaveLength(0);
   expect(state.players[0].workersLeft).toBe(3);
   await noOverflow(page,v.width);
 });
 test('R08 funded with E05: free medical construction remains free in card, preview and actual action '+v.width+'x'+v.height,async({page})=>{
   await page.setViewportSize(v);await seed(page,game({issue:'E05',capital:0}));
   await expect(card(page,'std_clinic')).toContainText('Проект $0');
   await expect(card(page,'std_fire')).toContainText('Проект $0');
   await expect(card(page,'std_police')).toContainText('Проект $0');
   await expect(card(page,'std_warehouse')).toContainText('Проект $2');
   await page.locator('[data-standard-build="std_clinic"]').click();
   await page.locator('[data-district="civic"]').click();
   await expect(page.locator('.construction-confirm')).toContainText('Итого $0');
   await page.locator('#confirmConstruction').click();
   let saved=await current(page);
   expect(saved.players[0].capital).toBe(0);
   expect(saved.constructions).toHaveLength(1);
   expect(saved.constructions[0].projectId).toBe('std_clinic');
   expect(saved.constructions[0].materialsDelivered).toEqual([]);
   await page.reload();saved=await current(page);
   expect(saved.players[0].capital).toBe(0);
   await noOverflow(page,v.width);
 });
}
