import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const devices=[{width:390,height:844},{width:932,height:430}];
const construction=(id,projectId,districtId,playerId,status='complete',extra={})=>({
  id,projectId,districtId,playerId,status,
  materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[],
  startedRound:1,completedRound:status==='complete'?1:null,...extra
});
function game({filable=true,owner=1}={}){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;s.activationMainActionUsed=false;
 s.players.forEach(p=>p.capital=30);
 s.players[0].influence=18;s.players[1].influence=12;s.players[2].influence=6;
 s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['F01'];s.newsDeck=s.newsDeck.filter(id=>id!=='F01');
 s.constructions=[construction('F','factory','financial',filable?owner:0)];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
 await page.reload();
}
async function read(page){return page.evaluate(k=>JSON.parse(localStorage.getItem(k)),KEY)}
async function openNews(page,viewport){
 if(viewport.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
for(const viewport of [...devices,{width:1366,height:768}]){
 test('F01 filing spends one real worker action and persists after reload '+viewport.width+'x'+viewport.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(viewport);await seed(page,game());
  await openNews(page,viewport);
  await expect(page.locator('#newsSheetContent .news-headline')).toHaveText('КТО ЗАПЛАТИТ ЗА ПОЖАРНУЮ ОПАСНОСТЬ?!');
  await expect(page.locator('#newsSheetContent')).toContainText('Максимальный текущий П');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  const button=page.locator('[data-f01-target="F"]');
  await expect(button).toHaveCount(1);
  await expect(button).toBeEnabled();
  await expect(button).toContainText('Financial District');
  const money=(await read(page)).players.map(p=>p.capital);
  await button.click();
  const saved=await read(page);
  expect(saved.newsF01Notice).toMatchObject({round:1,constructionId:'F',accusedPlayerId:1,filerId:0,districtId:'financial'});
  expect(saved.players[0].workers[0].used).toBe(true);
  expect(saved.players[0].workersLeft).toBe(2);
  expect(saved.activationMainActionUsed).toBe(true);
  expect(saved.players.map(p=>p.capital)).toEqual(money);
  await expect(page.locator('[data-f01-target]')).toHaveCount(0);
  await expect(page.locator('#newsSheetContent')).toContainText('Предписание действует');
  await page.reload();await openNews(page,viewport);
  await expect(page.locator('[data-f01-target]')).toHaveCount(0);
  expect((await read(page)).newsF01Notice.constructionId).toBe('F');
  const dims=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,
    sheet:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()}));
  expect(dims.overflow).toBeLessThanOrEqual(3);
  expect(dims.sheet.x).toBeGreaterThanOrEqual(-2);
  expect(dims.sheet.x+dims.sheet.width).toBeLessThanOrEqual(viewport.width+2);
  expect(errors).toEqual([]);
 });
}
for(const viewport of devices){
 test('F01 disables filing when available action lacks selected worker '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=game();s.activeWorkerId=null;
  await page.setViewportSize(viewport);await seed(page,s);await openNews(page,viewport);
  await expect(page.locator('[data-f01-target="F"]')).toBeDisabled();
  await expect(page.locator('#newsSheetContent')).toContainText('свободное основное действие');
  const saved=await read(page);
  expect(saved.newsF01Notice).toBeNull();
  expect(saved.players[0].workers[0].used).toBe(false);
 });
 test('F01 cannot target own, incomplete or non-positive personal fire source '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=game({filable:false});
  s.constructions.push(construction('INCOMPLETE','factory','financial',1,'under-construction'));
  s.constructions.push(construction('ZERO','tenement','financial',1,'complete',{fireSafetyModernized:true}));
  await page.setViewportSize(viewport);await seed(page,s);await openNews(page,viewport);
  await expect(page.locator('[data-f01-target]')).toHaveCount(0);
  await expect(page.locator('#newsSheetContent')).toContainText('нет завершённого опасного здания соперника');
  expect((await read(page)).newsF01Notice).toBeNull();
 });
}
test('F01 end-year penalty is applied only to accused player, with accurate archive and no repeated fine',async({page})=>{
 await page.setViewportSize({width:1366,height:768});await seed(page,game());
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-f01-target="F"]').click();
 await page.evaluate(key=>{
   const s=JSON.parse(localStorage.getItem(key));
   s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
   s.developmentComplete=true;s.developmentPlayer=null;
   localStorage.setItem(key,JSON.stringify(s));
 },KEY);
 await page.reload();
 await page.locator('#endRoundBtn').click();
 const saved=await read(page);
 expect(saved.newsArchive).toHaveLength(1);
 expect(saved.newsArchive[0].cardId).toBe('F01');
 expect(saved.newsArchive[0].f01.mode).toBe('personal');
 expect(saved.newsArchive[0].changes['1'].capital).toBe(-6);
 expect(saved.newsArchive[0].changes['1'].influence).toBe(-1);
 expect(saved.newsArchive[0].changes['0']).toBeUndefined();
 expect(saved.newsArchive[0].changes['2']).toBeUndefined();
 expect(saved.newsF01Notice).toBeNull();
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Личный штраф');
 expect((await read(page)).newsArchive).toHaveLength(1);
});
test('F01 archive displays general levy if the accused site was modernized after filing',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 const s=game();s.newsF01Notice={round:1,constructionId:'F',accusedPlayerId:1,districtId:'financial',filerId:0};
 s.constructions[0].fireSafetyModernized=true; // Factory +2 becomes +1, notice remains active.
 const other=construction('T','tenement','northbeach',1,'complete',{fireSafetyModernized:true});
 s.constructions=[other];
 // The original factory is no longer present: the notice MUST be void.
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentComplete=true;s.developmentPlayer=null;
 await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const saved=await read(page);
 expect(saved.newsArchive[0].f01.mode).toBe('collective');
 expect(Object.values(saved.newsArchive[0].changes).map(c=>c.capital)).toEqual([-2,-2,-2]);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Общий противопожарный сбор');
});
