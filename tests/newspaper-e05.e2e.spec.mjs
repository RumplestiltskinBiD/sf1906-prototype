import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const views=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({round=1,article='E05',cash=40}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=[article];s.newsDeck=s.newsDeck.filter(id=>id!==article);
 s.newsLastResolvedRound=round-1;
 s.developmentComplete=false;s.developmentPlayer=0;
 s.activationMainActionUsed=false;s.developmentSlotsUsed=[0,0,0];
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.yearTurnOrder=[0,1,2];s.selectedDistrictId='civic';
 s.players.forEach((p,i)=>{
  p.capital=i===0?cash:40;p.prestige=0;p.influence=[5,9,13][i];
  p.workersLeft=3;p.portfolio=[];
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];s.newsEmergency={};
 return s;
}
function site(s,id,projectId,playerId=0,districtId='civic',status='complete',completedRound=1){
 const c={id,projectId,playerId,districtId,status,startedRound:1,
  completedRound:status==='complete'?completedRound:null,
  materialsDelivered:status==='complete'?[...projectById(projectId).materials]:[],
  warehouseInventory:[]};
 s.constructions.push(c);return c;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),
  {key:KEY,value:s});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function news(page,vp){
 if(vp.width<1000){
  if(!(await page.locator('#callBuildingNode').isVisible()))
   await page.locator('.nav-btn[data-view="city"]').click();
  await page.locator('#callBuildingNode').click();
 }else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
async function fits(page,vp){
 const rect=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-innerWidth,
  sheet:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()
 }));
 expect(rect.overflow).toBeLessThanOrEqual(3);
 expect(rect.sheet.x).toBeGreaterThanOrEqual(-2);
 expect(rect.sheet.x+rect.sheet.width).toBeLessThanOrEqual(vp.width+2);
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of views){
 test('E05 free civic fire post is an ACTUAL main action, still unfinished, reloads '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game({cash:0}));await news(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ГОРОД БЛАГОДАРИТ СВОИХ ЗАЩИТНИКОВ!');
  await expect(page.locator('#newsSheetContent .news-forecast > b')).toHaveText('ПОДДЕРЖКА ГОРОДСКИХ СЛУЖБ');
  await expect(page.locator('.news-e05-panel')).toContainText('земля $0 + оформление $0');
  await expect(page.locator('.news-e05-panel')).toContainText('В конце этого года');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  await expect(page.locator('#newsIssueMapToggle')).toHaveCount(0);
  await expect(page.locator('.news-e05-player')).toHaveCount(3);
  await fits(page,vp);
  await page.locator('#newsCloseBtn').click();
  await expect(page.locator('#standardProjects')).toBeVisible();
  const panel=page.locator('#standardProjects');
  for(const id of ['std_fire','std_police','std_clinic'])
   await expect(panel.locator('[data-standard-build="'+id+'"]').locator('..')).toContainText('Проект $0');
  await expect(panel.locator('[data-standard-build="std_warehouse"]').locator('..')).toContainText('Проект $2');
  await panel.locator('[data-standard-build="std_fire"]').click();
  await page.locator('[data-district="civic"]').click();
  const costPanel=page.locator('.construction-confirm');
  await expect(costPanel).toContainText('E05 · город оплачивает землю и оформление');
  await expect(costPanel).toContainText('Земля $0');
  await expect(costPanel).toContainText('Стандартный проект $0');
  await expect(page.locator('#confirmConstruction')).toBeVisible();
  const before=await saved(page);
  await page.locator('#confirmConstruction').click();
  const after=await saved(page);
  const newSite=after.constructions.find(c=>c.projectId==='std_fire');
  expect(newSite).toBeTruthy();
  expect(newSite.status).toBe('under-construction');
  expect(newSite.materialsDelivered).toEqual([]);
  expect(after.players[0].capital).toBe(0);
  expect(after.players[0].workersLeft).toBe(before.players[0].workersLeft-1);
  expect(after.players[0].workers[0].used).toBe(true);
  expect(after.activationMainActionUsed).toBe(true);
  expect(after.players[0].influence).toBe(before.players[0].influence);
  await page.reload();
  const reload=await saved(page);
  expect(reload.constructions.find(c=>c.projectId==='std_fire').status).toBe('under-construction');
  await news(page,vp);
  await expect(page.locator('.news-e05-player').first()).toContainText('0 завершённых служб');
  await fits(page,vp);
 });
}
for(const project of ['std_clinic','std_police']){
 test('E05 fully free start for '+project+' also consumes main action but no capital',async({page})=>{
  const vp={width:1366,height:768};
  await page.setViewportSize(vp);await seed(page,game({cash:0}));
  const panel=page.locator('#standardProjects');
  await expect(panel.locator('[data-standard-build="'+project+'"]').locator('..')).toContainText('Проект $0');
  await panel.locator('[data-standard-build="'+project+'"]').click();
  await page.locator('[data-district="civic"]').click();
  await expect(page.locator('.construction-confirm')).toContainText('Стандартный проект $0');
  await page.locator('#confirmConstruction').click();
  const state=await saved(page);
  expect(state.constructions.find(c=>c.projectId===project).status).toBe('under-construction');
  expect(state.players[0].capital).toBe(0);
  expect(state.players[0].workersLeft).toBe(2);
 });
}
test('E05 normal standard warehouse STILL charges full land and $2 fee',async({page})=>{
 const vp={width:390,height:844},s=game({cash:40});
 await page.setViewportSize(vp);await seed(page,s);
 const panel=page.locator('#standardProjects');
 await expect(panel.locator('[data-standard-build="std_warehouse"]').locator('..')).toContainText('Проект $2');
 await panel.locator('[data-standard-build="std_warehouse"]').click();
 await page.locator('[data-district="civic"]').click();
 const land=s.districts.civic.landValue;
 await expect(page.locator('.construction-confirm')).toContainText('Итого $'+(land+2));
 await expect(page.locator('.construction-confirm')).not.toContainText('E05 · город оплачивает');
 await page.locator('#confirmConstruction').click();
 const result=await saved(page);
 expect(result.players[0].capital).toBe(40-land-2);
 expect(result.constructions.find(x=>x.projectId==='std_warehouse').status).toBe('under-construction');
});
test('E05 discount is not applied to warehouse even when player has no money',async({page})=>{
 const vp={width:932,height:430};
 await page.setViewportSize(vp);await seed(page,game({cash:0}));
 await page.locator('[data-standard-build="std_warehouse"]').click();
 await page.locator('[data-district="civic"]').click();
 await expect(page.locator('.construction-confirm')).toContainText('Не хватает капитала');
 await expect(page.locator('#confirmConstruction')).toHaveCount(0);
 const result=await saved(page);
 expect(result.players[0].capital).toBe(0);
 expect(result.constructions).toEqual([]);
});
for(const vp of views){
 test('E05 forecast lists actual completed OLD services, only ownership and status '+vp.width+'x'+vp.height,async({page})=>{
  const s=game({round:4});
  site(s,'A','std_fire',0,'civic','complete',1);
  site(s,'B','clinic',0,'mission','complete',2);
  site(s,'C','police',0,'soma','complete',3);
  site(s,'D','std_clinic',0,'western','under-construction');
  site(s,'E','std_police',1,'civic','complete',1);
  site(s,'F','orphanage',0,'western','complete',3);
  site(s,'W','std_warehouse',0,'mission','complete',2);
  await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
  const cards=page.locator('.news-e05-player');
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText('3 завершённых служб → +3 Influence');
  await expect(cards.nth(1)).toContainText('1 завершённых служб → +1 Influence');
  await expect(cards.nth(2)).toContainText('0 завершённых служб');
  await expect(cards.nth(0)).toContainText('civic'.toUpperCase()=== 'CIVIC' ? 'Civic Center':'Civic Center');
  await expect(cards.nth(0)).not.toContainText('Сиротский приют');
  await fits(page,vp);
 });
}
test('E05 newly completed standard post appears in forecast without early Influence reward',async({page})=>{
 const vp={width:1366,height:768};const s=game();
 const pending=site(s,'WAIT','std_clinic',0,'civic','under-construction');
 pending.materialsDelivered=[...projectById('std_clinic').materials];
 await page.setViewportSize(vp);await seed(page,s);
 await news(page,vp);await expect(page.locator('.news-e05-player').first()).toContainText('0 завершённых служб');
 await page.locator('#newsCloseBtn').click();
 await page.locator('[data-office="0"]').first().click();
 await expect(page.locator('[data-complete-build="WAIT"]')).toBeVisible();
 const before=await saved(page);
 await page.locator('[data-complete-build="WAIT"]').click();
 const after=await saved(page);
 expect(after.constructions.find(c=>c.id==='WAIT').status).toBe('complete');
 expect(after.players[0].prestige).toBe(before.players[0].prestige+1,'normal building completion VP retained');
 expect(after.players[0].influence).toBe(before.players[0].influence,'E05 pays only at year end');
 await page.locator('#officeDrawer [data-close-drawer]').click();
 await news(page,vp);
 await expect(page.locator('.news-e05-player').first()).toContainText('1 завершённых служб → +1 Influence');
 await page.reload();await news(page,vp);
 await expect(page.locator('.news-e05-player').first()).toContainText('1 завершённых служб');
});
test('E05 real year-close pays once, records annual service counts and next-year order in save/archive',async({page})=>{
 const vp={width:1366,height:768},s=game({round:1});
 for(const [i,d] of ['civic','soma','mission','western','pacific','northbeach'].entries())
  site(s,'S'+i,['std_clinic','clinic','std_fire','firehouse','std_police','police'][i],0,d);
 site(s,'OTHER','std_fire',1,'mission');
 site(s,'PENDING','std_police',2,'soma','under-construction');
 s.players[0].influence=5;s.players[1].influence=9;s.players[2].influence=13;
 s.newsDeck=['E06',...s.newsDeck.filter(id=>id!=='E06')];
 s.developmentComplete=true;s.developmentPlayer=null;s.activationMainActionUsed=true;
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 await page.setViewportSize(vp);await seed(page,s);
 await news(page,vp);
 await expect(page.locator('.news-e05-player').first()).toContainText('6 завершённых служб → +6 Influence');
 await page.locator('#newsCloseBtn').click();
 await page.locator('#endRoundBtn').click();
 const after=await saved(page);
 expect(after.round).toBe(2);
 expect(after.newsArchive).toHaveLength(1);
 expect(after.newsArchive[0].cardId).toBe('E05');
 expect(after.newsArchive[0].e05.awards.map(a=>a.count)).toEqual([6,1,0]);
 expect(after.newsArchive[0].e05.totalSites).toBe(7);
 expect(after.newsArchive[0].e05.awards[0].influenceSteps).toBe(6);
 expect(after.players[0].influence).toBe(11);
 expect(after.players[1].influence).toBe(10);
 expect(after.players[2].influence).toBe(13);
 expect(after.yearTurnOrder[0]).toBe(2,'13 remains higher than 11');
 await page.reload();
 const reloaded=await saved(page);
 expect(reloaded.newsArchive).toHaveLength(1);
 expect(reloaded.players[0].influence).toBe(11);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('ГОРОД БЛАГОДАРИТ СВОИХ ЗАЩИТНИКОВ!');
 await expect(page.locator('#newsSheetContent')).toContainText('Всего зачтено служб: 7');
 await expect(page.locator('#newsSheetContent')).toContainText('6 завершённых служб → +6 Influence');
 await expect(page.locator('.news-e05-panel')).toHaveCount(0);
 await fits(page,vp);
});
test('E05 legacy historical archive stays historical, not rewritten as new recognition',async({page})=>{
 const vp={width:390,height:844},s=game({round:2,article:'E04'});
 s.newsArchive=[{year:1900,round:1,cardId:'E05',title:'Город признаёт заслуги служащих',
  entries:[{playerId:0,districtIds:['civic'],actual:1}],
  changes:{0:{capital:0,influence:1,prestige:0}}}];
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Город признаёт заслуги служащих');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции E05');
 await expect(page.locator('.news-e05-panel')).toHaveCount(0);
 await expect(page.locator('#newsSheetContent')).not.toContainText('Всего зачтено служб:');
});
test('after E05 ends standard project cards display regular $2 costs again',async({page})=>{
 const vp={width:932,height:430},s=game({round:2,article:'E04'});
 await page.setViewportSize(vp);await seed(page,s);
 await expect(page.locator('#standardProjects .standard-project-card')).toHaveCount(4);
 for(const card of await page.locator('#standardProjects .standard-project-card').all())
  await expect(card).toContainText('Проект $2');
 await page.locator('[data-standard-build="std_fire"]').click();
 await page.locator('[data-district="civic"]').click();
 await expect(page.locator('.construction-confirm')).toContainText('Итого $'+(s.districts.civic.landValue+2));
});
