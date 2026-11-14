import {test,expect} from '@playwright/test';
import {createInitialState,ensureNewspaper,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430}];
const building=(id,projectId,districtId,playerId=1,status='complete')=>({
 id,projectId,districtId,playerId,status,
 materialsDelivered:[...projectById(projectId).materials],warehouseInventory:[],
 startedRound:1,completedRound:status==='complete'?1:null
});
function game({services=true,incidentRoll=1}={}){
 const s=createInitialState({rng:()=>0.39});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;s.activationMainActionUsed=false;
 s.players.forEach((p,i)=>{p.capital=30;p.influence=20-i*4;p.prestige=0;});
 s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['F02'];s.newsF02Incident=null;
 s.newsDeck=s.newsDeck.filter(id=>id!=='F02');
 s.constructions=services?[
   building('F','std_fire','financial',1),
   building('P','std_police','financial',2)
 ]:[];
 ensureNewspaper(s,{rng:()=> (incidentRoll-0.5)/6});
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),
   {key:KEY,value:s});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY)}
async function openNews(page,viewport){
 if(viewport.width===390||viewport.height===430)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
test.beforeEach(async({page})=>{
 page.on('pageerror',error=>{throw error;});
 page.on('console',message=>{if(message.type()==='error')throw Error(message.text());});
});
for(const viewport of [...viewports,{width:1366,height:768}]){
 test('F02 shows two map markers and performs real fire operation '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await seed(page,game());
  await expect(page.locator('[data-f02-marker="fire"]')).toHaveCount(1);
  await expect(page.locator('[data-f02-marker="manhunt"]')).toHaveCount(1);
  await expect(page.locator('#newsStripLabel')).toContainText('ОН ПРЕДУПРЕДИЛ');
  await openNews(page,viewport);
  await expect(page.locator('.news-headline')).toContainText('ОН ПРЕДУПРЕДИЛ');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  await expect(page.locator('.news-f02-panel')).toContainText('North Beach');
  await expect(page.locator('.news-f02-panel')).toContainText('D6: 1');
  await expect(page.locator('.news-f02-services [data-f02-kind="fire"]')).toHaveCount(1);
  await expect(page.locator('.news-f02-services [data-f02-kind="manhunt"]')).toHaveCount(1);
  const fire=page.locator('[data-f02-kind="fire"][data-f02-service="F"]');
  await expect(fire).toBeEnabled();
  await expect(fire).toContainText('Выезд $1');
  await fire.click();
  const now=await saved(page);
  expect(now.newsF02Incident.firePending).toBe(false);
  expect(now.newsF02Incident.manhuntPending).toBe(true);
  expect(now.newsF02Incident.actions).toHaveLength(1);
  expect(now.newsF02Incident.actions[0].route).toEqual(['financial','northbeach']);
  expect(now.players[0].capital).toBe(29);
  expect(now.players[0].prestige).toBe(2);
  expect(now.players[0].influence).toBe(21);
  expect(now.players[0].workers[0].districtId).toBe('financial');
  expect(now.players[0].workers[0].used).toBe(true);
  expect(now.activationMainActionUsed).toBe(true);
  expect(now.players[1].prestige).toBe(0);
  await expect(page.locator('[data-f02-marker="fire"]')).toHaveCount(0);
  await expect(page.locator('[data-f02-marker="manhunt"]')).toHaveCount(1);
  await expect(page.locator('.news-f02-operation.done')).toContainText('Операция выполнена');
  await page.reload();
  await expect(page.locator('[data-f02-marker="fire"]')).toHaveCount(0);
  await expect(page.locator('[data-f02-marker="manhunt"]')).toHaveCount(1);
  expect((await saved(page)).newsF02Incident.actions).toHaveLength(1);
  const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth}));
  expect(metrics.overflow).toBeLessThanOrEqual(3);
 });
}
for(const viewport of viewports){
 test('F02 unavailable when no services: no fake municipal teams '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await seed(page,game({services:false}));
  await openNews(page,viewport);
  await expect(page.locator('.news-f02-panel')).toContainText('Нет завершённого профильного учреждения');
  await expect(page.locator('[data-f02-service]')).toHaveCount(0);
  await expect(page.locator('[data-f02-marker]')).toHaveCount(2);
  const s=await saved(page);
  expect(s.newsF02Incident.actions).toHaveLength(0);
  expect(s.players[0].prestige).toBe(0);
 });
 test('F02 disables operations without selected worker '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=game();s.activeWorkerId=null;
  await page.setViewportSize(viewport);await seed(page,s);await openNews(page,viewport);
  await expect(page.locator('[data-f02-service]')).toHaveCount(2);
  await expect(page.locator('[data-f02-service="F"]')).toBeDisabled();
  await expect(page.locator('[data-f02-service="P"]')).toBeDisabled();
  expect((await saved(page)).newsF02Incident.firePending).toBe(true);
 });
 test('F02 disables expensive route without funds and never takes the action '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=game();s.players[0].capital=0;
  await page.setViewportSize(viewport);await seed(page,s);await openNews(page,viewport);
  await expect(page.locator('[data-f02-service="F"]')).toBeDisabled();
  await expect(page.locator('[data-f02-service="F"]')).toContainText('Недостаточно денег');
  const now=await saved(page);
  expect(now.players[0].workers[0].used).toBe(false);
  expect(now.players[0].prestige).toBe(0);
 });
}
test('F02 police can catch arsonist first without putting out fire, other marker persists',async({page})=>{
 const s=game();
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-f02-kind="manhunt"][data-f02-service="P"]').click();
 let now=await saved(page);
 expect(now.newsF02Incident.firePending).toBe(true);
 expect(now.newsF02Incident.manhuntPending).toBe(false);
 expect(now.newsF02Incident.actions[0].operation).toBe('manhunt');
 await expect(page.locator('[data-f02-marker="fire"]')).toHaveCount(1);
 await expect(page.locator('[data-f02-marker="manhunt"]')).toHaveCount(0);
});
test('F02 end-of-year applies independent penalties once and archives original D6 outcome',async({page})=>{
 const s=game({services:false});
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentComplete=true;s.developmentPlayer=null;
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await saved(page);
 expect(now.newsArchive).toHaveLength(1);
 expect(now.newsArchive[0].f02).toMatchObject({roll:1,districtId:'northbeach',fireUnresolved:true,manhuntUnresolved:true,actions:[]});
 expect(now.newsArchive[0].entries).toHaveLength(3);
 expect(now.newsArchive[0].entries.map(e=>e.actual)).toEqual([-3,-3,-3]);
 expect(now.newsArchive[0].entries.map(e=>e.influenceActual)).toEqual([-1,-1,-1]);
 expect(now.newsF02Incident).toBeNull();
 await page.locator('#newsOpenBtn').click();await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('North Beach');
 await expect(page.locator('#newsSheetContent')).toContainText('Пожар: не потушен');
 await page.reload();
 expect((await saved(page)).newsArchive).toHaveLength(1);
});
test('F02 archives from before v2 keep old title and never retroactively show an arson',async({page})=>{
 const s=game();s.round=2;s.newsCurrentIds=['E02'];s.newsF02Incident=null;
 s.newsArchive=[{round:1,year:1900,cardId:'F02',title:'Снова дым над торговыми улицами',
   category:'Пожар',entries:[{playerId:1,districtIds:['financial'],actual:-2,defended:false}],
   changes:{1:{capital:-2,influence:0,prestige:0}},serviceRecognition:[],emergency:{}}];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Снова дым над торговыми улицами');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции F02');
 await expect(page.locator('#newsSheetContent')).not.toContainText('поджигатель не пойман');
 const now=await saved(page);expect(now.newsArchive).toHaveLength(1);
 expect(now.newsArchive[0].changes['1'].capital).toBe(-2);
});
