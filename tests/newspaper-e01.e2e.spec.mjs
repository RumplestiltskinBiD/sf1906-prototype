import {test,expect} from '@playwright/test';
import {createInitialState,projectById,completeConstruction} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({round=1,phase='development'}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase=phase;s.view='city';
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.newsCurrentIds=['E01'];s.newsDeck=s.newsDeck.filter(id=>id!=='E01');
 s.newsLastResolvedRound=round-1;s.newsE01Contracts={round,claims:[]};
 s.yearTurnOrder=[0,1,2];s.developmentSlotsUsed=[0,0,0];
 s.players.forEach((p,i)=>{p.capital=20;p.prestige=0;p.influence=10+i*10;});
 s.activeWorkerId=s.players[0].workers[0].id;
 return s;
}
function site(s,id,projectId,ownerId=0,{status='under-construction',startedRound=s.round,districtId='civic'}={}){
 const c={id,projectId,playerId:ownerId,districtId,status,startedRound,
   completedRound:status==='complete'?startedRound:null,
   materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[]};
 s.constructions.push(c);
 return c;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s});
 await page.reload();
}
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function openNews(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
test.beforeEach(async({page})=>{
 page.on('pageerror',err=>{throw err;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of viewports){
 test('E01 real storage completion opens immediate optional package choice '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game();
  site(s,'HOUSE','tenement');
  await seed(page,s);
  const before=await read(page);
  await page.locator('[data-office="0"]').first().click();
  await expect(page.locator('[data-complete-build="HOUSE"]')).toBeVisible();
  await page.locator('[data-complete-build="HOUSE"]').click();
  await expect(page.locator('.e01-rental-choice')).toBeVisible();
  await expect(page.locator('.e01-rental-choice')).toContainText('Рабочий доходный дом');
  await expect(page.locator('[data-e01-choice="cash"]')).toBeVisible();
  const pending=await read(page);
  expect(pending.constructions[0].status).toBe('complete');
  expect(pending.newsE01Contracts.claims).toHaveLength(1);
  expect(pending.newsE01Contracts.claims[0].choice).toBe(null);
  expect(pending.players[0].capital).toBe(before.players[0].capital);
  await page.reload();
  await expect(page.locator('.e01-rental-choice')).toBeVisible();
  await page.locator('[data-e01-choice="cash"]').click();
  const after=await read(page);
  expect(after.players[0].capital).toBe(before.players[0].capital+6);
  expect(after.players[0].prestige).toBe(before.players[0].prestige+projectById('tenement').prestige);
  expect(after.players[0].influence).toBe(before.players[0].influence);
  expect(after.newsE01Contracts.claims[0]).toMatchObject({playerId:0,constructionId:'HOUSE',choice:'cash',capital:6,vp:0});
  expect(after.players[0].workers).toEqual(before.players[0].workers);
  expect(after.developmentSlotsUsed).toEqual(before.developmentSlotsUsed);
  await expect(page.locator('.e01-rental-choice')).toHaveCount(0);
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toContainText('РАБОТОДАТЕЛИ ИЩУТ ЖИЛЬЁ');
  await expect(page.locator('.news-e01-panel')).toContainText('осталось 1 из 2');
  await expect(page.locator('.news-e01-panel')).toContainText('+$6');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  const layout=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    rect:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()
  }));
  expect(layout.overflow).toBeLessThanOrEqual(3);
  expect(layout.rect.x).toBeGreaterThanOrEqual(-2);
  expect(layout.rect.x+layout.rect.width).toBeLessThanOrEqual(vp.width+2);
 });
}
test('E01 civic reward on mixed residential building gives both VP and Influence, not cash',async({page})=>{
 const s=game({round:4});
 const c=site(s,'MIX','sailorlodging',1,{startedRound:2,districtId:'soma'});
 expect(completeConstruction(s,c).ok).toBe(true);
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await expect(page.locator('.e01-rental-choice')).toContainText('Матросская ночлежка');
 const before=await read(page);
 await page.locator('[data-e01-choice="civic"]').click();
 const after=await read(page);
 expect(after.players[1].capital).toBe(before.players[1].capital);
 expect(after.players[1].prestige).toBe(before.players[1].prestige+1);
 expect(after.players[1].influence).toBe(before.players[1].influence+1);
 expect(after.newsE01Contracts.claims[0]).toMatchObject({playerId:1,projectId:'sailorlodging',choice:'civic',vp:1,influenceSteps:1});
 await page.reload();
 expect((await read(page)).newsE01Contracts.claims[0].choice).toBe('civic');
 await expect(page.locator('.e01-rental-choice')).toHaveCount(0);
});
test('E01 two pending different owners must resolve in reservation order with no third token',async({page})=>{
 const s=game();
 expect(completeConstruction(s,site(s,'A','tenement',0)).ok).toBe(true);
 expect(completeConstruction(s,site(s,'B','tenement',1,{districtId:'mission'})).ok).toBe(true);
 expect(completeConstruction(s,site(s,'C','tenement',2,{districtId:'soma'})).ok).toBe(true);
 await page.setViewportSize({width:932,height:430});await seed(page,s);
 await expect(page.locator('.e01-rental-choice')).toContainText('Синий');
 await page.locator('[data-e01-choice="cash"]').click();
 await expect(page.locator('.e01-rental-choice')).toContainText('Красный');
 await page.locator('[data-e01-choice="civic"]').click();
 const after=await read(page);
 expect(after.newsE01Contracts.claims).toHaveLength(2);
 expect(after.newsE01Contracts.claims.map(c=>[c.playerId,c.choice])).toEqual([[0,'cash'],[1,'civic']]);
 expect(after.players[2].capital).toBe(20);
 await expect(page.locator('.e01-rental-choice')).toHaveCount(0);
});
test('E01 non-residential completion never triggers contract or UI prompt',async({page})=>{
 const s=game();site(s,'SHOP','shops');
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('[data-office="0"]').first().click();
 await page.locator('[data-complete-build="SHOP"]').click();
 expect((await read(page)).newsE01Contracts.claims).toHaveLength(0);
 await expect(page.locator('.e01-rental-choice')).toHaveCount(0);
 // Close the real Office drawer before using the desktop header news button.
 // Leaving that drawer open blocks the header by design; do not force-click.
 await page.locator('#officeDrawer [data-close-drawer]').click();
 await openNews(page,{width:1366,height:768});
 await expect(page.locator('.news-e01-panel')).toContainText('осталось 2 из 2');
});
test('E01 legacy archive preserves old article title and does not display new reward outcomes',async({page})=>{
 const s=game({round:2});
 s.newsCurrentIds=['E02'];s.newsE01Contracts=null;
 s.newsArchive=[{cardId:'E01',title:'Новые семьи ищут квартиры',year:1900,round:1,
   changes:{0:{capital:2,influence:0,prestige:0}},
   entries:[{playerId:0,actual:2,districtIds:['civic']}]}];
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await openNews(page,{width:390,height:844});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toContainText('Новые семьи ищут квартиры');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции E01');
 await expect(page.locator('#newsSheetContent')).not.toContainText('Арендные контракты · осталось');
});
