import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const views=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({round=1,issue='E06',cash=30,suspicion=0}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=[issue];s.newsDeck=s.newsDeck.filter(id=>id!==issue);
 s.newsLastResolvedRound=round-1;s.newsE06Relief=issue==='E06'?{round,choices:[]}:null;
 s.developmentComplete=false;s.developmentPlayer=0;s.developmentSlotsUsed=[0,0,0];
 s.activationMainActionUsed=false;s.selectedDistrictId='civic';
 s.newsH01Incident=null;s.newsH02Incident=null;s.newsC01Incident=null;
 s.players.forEach((p,i)=>{
  p.capital=i===0?cash:30;p.prestige=0;p.influence=[5,10,15][i];
  p.suspicion=i===0?suspicion:0;p.workersLeft=3;p.caseSettledRound=null;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=[];s.pendingConstruction=null;s.pendingWorkerAction=null;
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:KEY,value:s});
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
 const m=await page.evaluate(()=>({
  overflow:document.documentElement.scrollWidth-innerWidth,
  sheet:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()
 }));
 expect(m.overflow).toBeLessThanOrEqual(3);
 expect(m.sheet.x).toBeGreaterThanOrEqual(-2);
 expect(m.sheet.x+m.sheet.width).toBeLessThanOrEqual(vp.width+2);
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of views){
 test('E06 honest fund path uses one worker, costs own $6, persists on '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);await seed(page,game({cash:6}));await news(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ДЕНЬГИ ДЛЯ БЕЗРАБОТНЫХ ПОД УГРОЗОЙ!');
  await expect(page.locator('#newsSheetContent .news-forecast > b')).toHaveText('ФОНД ПОМОЩИ БЕЗРАБОТНЫМ');
  await expect(page.locator('.news-e06-panel')).toContainText('Одно');
  await expect(page.locator('.news-e06-player')).toHaveCount(3);
  await expect(page.locator('[data-e06-choice="honest"]')).toBeEnabled();
  await expect(page.locator('[data-e06-choice="misappropriate"]')).toBeEnabled();
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  await expect(page.locator('#newsIssueMapToggle')).toHaveCount(0);
  await fits(page,vp);
  const before=await saved(page);
  await page.locator('[data-e06-choice="honest"]').click();
  const after=await saved(page);
  expect(after.players[0].capital).toBe(before.players[0].capital-6);
  expect(after.players[0].prestige).toBe(before.players[0].prestige+3);
  expect(after.players[0].influence).toBe(before.players[0].influence+2);
  expect(after.players[0].suspicion).toBe(0);
  expect(after.players[0].workers[0].used).toBe(true);
  expect(after.players[0].workersLeft).toBe(2);
  expect(after.activationMainActionUsed).toBe(true);
  expect(after.newsE06Relief.choices).toHaveLength(1);
  expect(after.newsE06Relief.choices[0].choice).toBe('honest');
  await expect(page.locator('.news-e06-player').first()).toContainText('Общественные работы');
  await expect(page.locator('[data-e06-choice="honest"]')).toBeDisabled();
  await expect(page.locator('[data-e06-choice="misappropriate"]')).toBeDisabled();
  await fits(page,vp);
  await page.reload();await news(page,vp);
  const reload=await saved(page);
  expect(reload.newsE06Relief.choices).toHaveLength(1);
  expect(reload.players[0].capital).toBe(0);
  await expect(page.locator('.news-e06-player').first()).toContainText('Общественные работы');
  await fits(page,vp);
 });
}
for(const vp of views){
 test('E06 illegal fund path +$8, −1 Influence, +1 suspicion and saves '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);await seed(page,game({cash:0,suspicion:1}));await news(page,vp);
  await expect(page.locator('[data-e06-choice="honest"]')).toBeDisabled();
  await expect(page.locator('[data-e06-choice="misappropriate"]')).toBeEnabled();
  const old=await saved(page);
  await page.locator('[data-e06-choice="misappropriate"]').click();
  const s=await saved(page);
  expect(s.players[0].capital).toBe(8);
  expect(s.players[0].prestige).toBe(old.players[0].prestige);
  expect(s.players[0].influence).toBe(old.players[0].influence-1);
  expect(s.players[0].suspicion).toBe(2);
  expect(s.players[0].workers[0].used).toBe(true);
  expect(s.newsE06Relief.choices[0].choice).toBe('misappropriate');
  expect(s.newsE06Relief.choices[0].suspicionAfter).toBe(2);
  await expect(page.locator('.news-e06-player').first()).toContainText('Присвоено $8');
  await page.reload();await news(page,vp);await fits(page,vp);
  expect((await saved(page)).newsE06Relief.choices).toHaveLength(1);
 });
}
test('E06 illegal suspicion ★★★ offers explicit arrest-worker selection and correct sanction',async({page})=>{
 const vp={width:390,height:844};
 await page.setViewportSize(vp);await seed(page,game({cash:0,suspicion:3}));await news(page,vp);
 await expect(page.locator('.news-e06-warning')).toContainText('арест');
 const buttons=page.locator('[data-e06-choice="misappropriate"][data-e06-arrest]');
 await expect(buttons).toHaveCount(3);
 await buttons.nth(1).click();
 const s=await saved(page);
 expect(s.newsE06Relief.choices[0].arrestedWorkerId).toBe(s.players[0].workers[1].id);
 expect(s.players[0].workers[0].used).toBe(true);
 expect(s.players[0].workers[0].jailed).toBe(false);
 expect(s.players[0].workers[1].jailed).toBe(true);
 expect(s.players[0].suspicion).toBe(0);
 expect(s.players[0].capital).toBe(8);
 expect(s.players[0].prestige).toBe(-3);
 await page.reload();await news(page,vp);
 await expect(page.locator('.news-e06-player').first()).toContainText('арест представителя');
 await expect(page.locator('[data-e06-choice]')).toHaveCount(2);
 await expect(page.locator('[data-e06-choice="misappropriate"]')).toBeDisabled();
});
test('E06 insufficient cash, unselected worker and pending action do not create phantom outcomes',async({page})=>{
 const vp={width:932,height:430},s=game({cash:5});
 s.activeWorkerId=null;
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await expect(page.locator('[data-e06-choice]')).toHaveCount(2);
 await expect(page.locator('[data-e06-choice="honest"]')).toBeDisabled();
 await expect(page.locator('[data-e06-choice="misappropriate"]')).toBeDisabled();
 const after=await saved(page);
 expect(after.newsE06Relief.choices).toHaveLength(0);
 expect(after.players[0].capital).toBe(5);
 await fits(page,vp);
});
test('E06 year transition keeps only already paid benefits; never pays again',async({page})=>{
 const vp={width:1366,height:768},s=game();
 s.developmentComplete=true;s.developmentPlayer=null;s.activeWorkerId=null;
 s.newsDeck=['H03',...s.newsDeck.filter(id=>id!=='H03')];
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await expect(page.locator('[data-e06-choice]')).toBeDisabled();
 await page.locator('#newsCloseBtn').click();
 await page.locator('#endRoundBtn').click();
 const a=await saved(page);
 expect(a.newsArchive[0].e06.choices).toHaveLength(0);
 expect(a.newsArchive[0].e06.unused).toBe(3);
 expect(a.round).toBe(2);
 await page.reload();await news(page,vp);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Участников: 0');
 await expect(page.locator('.news-e06-panel')).toHaveCount(0);
});
test('E06 old insurance newspaper archive stays historical; new article cannot rewrite it',async({page})=>{
 const vp={width:390,height:844},s=game({round:2,issue:'E05'});
 s.newsArchive=[{year:1900,round:1,cardId:'E06',title:'Страховщики требуют денег',
  entries:[{playerId:0,actual:-2,districtIds:['civic']}],
  changes:{0:{capital:-2,influence:0,prestige:0}}}];
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Страховщики требуют денег');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции E06');
 await expect(page.locator('.news-e06-panel')).toHaveCount(0);
});
