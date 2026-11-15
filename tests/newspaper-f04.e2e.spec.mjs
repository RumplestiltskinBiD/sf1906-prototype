import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
const building=(id,projectId,districtId,playerId=0,status='complete')=>({
 id,projectId,districtId,playerId,status,startedRound:1,
 completedRound:status==='complete'?1:null,
 materialsDelivered:[...projectById(projectId).materials],
 warehouseInventory:[],fireSafetyModernized:false
});
function game({tied=false,withFirehouse=false}={}){
 const s=createInitialState({rng:()=>.39});
 s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['F04'];s.newsDeck=s.newsDeck.filter(id=>id!=='F04');
 s.newsF04Notices=null;s.newsLastResolvedRound=0;
 s.yearTurnOrder=[0,1,2];s.developmentSlotsUsed=[0,0,0];
 s.players.forEach((p,i)=>{p.capital=20;p.influence=25-i*5;p.prestige=0;});
 s.constructions=[building('A','factory','civic',0)];
 if(tied)s.constructions.push(building('B','factory','financial',0));
 if(withFirehouse)s.constructions.push(building('H','firehouse','civic',1));
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:KEY,value:s});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function openNews(page,viewport){
 if(viewport.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const viewport of viewports){
 test('F04 urgent action is real, visible, durable and responsive '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await seed(page,game());
  await openNews(page,viewport);
  await expect(page.locator('.news-headline')).toHaveText('ИНСПЕКТОРЫ БОЛЬШЕ НЕ ЗАКРЫВАЮТ ГЛАЗА!');
  await expect(page.locator('.news-editorial')).not.toContainText('взятк');
  await expect(page.locator('.news-f04-panel')).toContainText('Пожарная ревизия');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  const urgent=page.locator('[data-f04-urgent="0"]');
  await expect(urgent).toBeEnabled();
  await expect(page.locator('[data-f04-bribe="0"]')).toBeEnabled();
  await urgent.click();
  const now=await saved(page);
  expect(now.newsF04Notices.notices[0]).toMatchObject({playerId:0,constructionId:'A',status:'closed',method:'urgent'});
  expect(now.constructions.find(c=>c.id==='A').fireSafetyModernized).toBe(true);
  expect(now.players[0].capital).toBe(16);
  expect(now.players[0].workers[0].used).toBe(true);
  expect(now.players[0].workers[0].districtId).toBe('civic');
  expect(now.activationMainActionUsed).toBe(true);
  await expect(page.locator('.news-f04-item.done')).toContainText('предписание закрыто');
  await expect(page.locator('[data-f04-urgent]')).toHaveCount(0);
  await page.reload();await openNews(page,viewport);
  expect((await saved(page)).newsF04Notices.notices[0].method).toBe('urgent');
  const rect=await page.evaluate(()=>({
   overflow:document.documentElement.scrollWidth-innerWidth,
   sheet:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()
  }));
  expect(rect.overflow).toBeLessThanOrEqual(3);
  expect(rect.sheet.x).toBeGreaterThanOrEqual(-2);
  expect(rect.sheet.x+rect.sheet.width).toBeLessThanOrEqual(viewport.width+2);
 });
}
for(const viewport of viewports.slice(0,2)){
 test('F04 tied buildings wait for explicit owner decision before city actions '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await seed(page,game({tied:true}));
  await expect(page.locator('#actionBuild')).toBeDisabled();
  await openNews(page,viewport);
  await expect(page.locator('.news-f04-warning')).toBeVisible();
  await expect(page.locator('[data-f04-choose]')).toHaveCount(2);
  await expect(page.locator('[data-f04-urgent]')).toHaveCount(0);
  await page.locator('[data-f04-choose="B"]').click();
  const now=await saved(page);
  expect(now.newsF04Notices.notices[0]).toMatchObject({constructionId:'B',status:'open'});
  await expect(page.locator('[data-f04-choose]')).toHaveCount(0);
  await expect(page.locator('[data-f04-urgent="0"]')).toBeEnabled();
  await page.reload();await openNews(page,viewport);
  expect((await saved(page)).newsF04Notices.notices[0].constructionId).toBe('B');
  await expect(page.locator('.news-f04-panel')).toContainText('Financial District');
 });
 test('F04 disables urgent repair without selected worker and bribe without money '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=game();s.activeWorkerId=null;s.players[0].capital=1;
  await page.setViewportSize(viewport);await seed(page,s);await openNews(page,viewport);
  await expect(page.locator('[data-f04-urgent="0"]')).toBeDisabled();
  await expect(page.locator('[data-f04-bribe="0"]')).toBeDisabled();
  const now=await saved(page);
  expect(now.players[0].capital).toBe(1);
  expect(now.constructions[0].fireSafetyModernized).toBe(false);
  expect(now.newsF04Notices.notices[0].status).toBe('open');
 });
}
test('F04 quick bribe works after spending main action and has no fire upgrade',async({page})=>{
 const s=game();s.activationMainActionUsed=true;s.players[0].suspicion=1;
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await expect(page.locator('[data-f04-urgent="0"]')).toBeDisabled();
 await page.locator('[data-f04-bribe="0"]').click();
 const now=await saved(page);
 expect(now.newsF04Notices.notices[0].method).toBe('bribe');
 expect(now.players[0].capital).toBe(18);
 expect(now.players[0].suspicion).toBe(2);
 expect(now.players[0].workers[0].used).toBe(false);
 expect(now.constructions[0].fireSafetyModernized).toBe(false);
 await expect(page.locator('.news-f04-item.done')).toContainText('взятка $2');
});
test('F04 three stars requires choosing an actual worker to arrest, no silent choice',async({page})=>{
 const s=game();s.players[0].suspicion=3;s.players[0].influence=0;
 await page.setViewportSize({width:390,height:844});await seed(page,s);await openNews(page,{width:390,height:844});
 await expect(page.locator('[data-f04-bribe]')).toHaveCount(3);
 await expect(page.locator('.news-f04-item')).toContainText('выберите сотрудника для ареста');
 await page.locator('[data-f04-arrest="'+s.players[0].workers[1].id+'"]').click();
 const now=await saved(page);
 expect(now.newsF04Notices.notices[0].method).toBe('bribe');
 expect(now.players[0].workers[1].jailed).toBe(true);
 expect(now.players[0].suspicion).toBe(0);
 expect(now.players[0].capital).toBe(18);
 expect(now.players[0].prestige).toBe(-3);
 expect(now.constructions[0].fireSafetyModernized).toBe(false);
});
test('F04 existing public firehouse upgrade closes notice without extra event fee',async({page})=>{
 const s=game({withFirehouse:true});
 s.constructions[0].playerId=0;s.constructions[1].playerId=1;
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await expect(page.locator('[data-fire-mode="upgrade"][data-firehouse-id="H"]')).toBeEnabled();
 await page.locator('[data-fire-mode="upgrade"][data-firehouse-id="H"]').click();
 await expect(page.locator('[data-fire-target="A"]')).toBeEnabled();
 await page.locator('[data-fire-target="A"]').click();
 const now=await saved(page);
 expect(now.newsF04Notices.notices[0].method).toBe('firehouse');
 expect(now.newsF04Notices.notices[0].status).toBe('closed');
 expect(now.players[0].capital).toBe(18);
 expect(now.constructions[0].fireSafetyModernized).toBe(true);
 await openNews(page,{width:1366,height:768});
 await expect(page.locator('.news-f04-item.done')).toContainText('без доплаты за F04');
});
test('F04 year-end fines only the unresolved owner, archives result and expires',async({page})=>{
 const s=game();s.players[0].capital=1;s.players[0].influence=0;
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentPlayer=null;s.developmentComplete=true;
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await saved(page);
 expect(now.newsArchive).toHaveLength(1);
 expect(now.newsArchive[0].cardId).toBe('F04');
 expect(now.newsArchive[0].f04.notices[0]).toMatchObject({status:'open',capitalPaid:1,influenceSteps:0});
 expect(now.newsArchive[0].entries).toHaveLength(1);
 expect(now.newsArchive[0].changes['0'].capital).toBe(-1);
 expect(now.players[0].capital).toBe(3,'year-end $1 lost then normal $3 income');
 expect(now.newsF04Notices).toBeNull();
 await page.locator('#newsOpenBtn').click();await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('не закрыто · списано $1');
 await page.reload();
 expect((await saved(page)).newsArchive).toHaveLength(1);
});
test('legacy F04 archive keeps old headline and never relabels earlier influence penalty',async({page})=>{
 const s=game();s.round=2;s.newsCurrentIds=['E02'];s.newsF04Notices=null;
 s.newsArchive=[{year:1900,round:1,cardId:'F04',
   title:'Инспекторы предпочитают не видеть копоти',category:'Пожар',
   entries:[{playerId:1,districtIds:['civic'],actual:-1,defended:false}],
   changes:{1:{capital:0,influence:-1,prestige:0}},serviceRecognition:[],emergency:{}}];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Инспекторы предпочитают не видеть копоти');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции F04');
 await expect(page.locator('#newsSheetContent')).not.toContainText('закрыто взяткой');
 const now=await saved(page);
 expect(now.newsArchive[0].changes['1'].influence).toBe(-1);
});
