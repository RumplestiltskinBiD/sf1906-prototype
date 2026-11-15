import {test,expect} from '@playwright/test';
import {createInitialState,createH01Incident,roundIncome} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({round=1,withClinic=false,clinicOwner=1,withBuilding=false}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=['H01'];s.newsDeck=s.newsDeck.filter(x=>x!=='H01');
 s.newsH01Incident=createH01Incident(round,()=>.05);
 s.newsLastResolvedRound=round-1;
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.constructions=[];
 s.players.forEach((p,i)=>{p.capital=30;p.influence=30-6*i;p.prestige=0;});
 s.yearTurnOrder=[0,1,2];
 if(withClinic)s.constructions.push({id:'MED',playerId:clinicOwner,
  projectId:'std_clinic',districtId:'financial',status:'complete',
  startedRound:1,completedRound:1,materialsDelivered:[],warehouseInventory:[]});
 if(withBuilding)s.constructions.push({id:'T',playerId:0,
  projectId:'warehouse',districtId:'chinatown',status:'complete',
  startedRound:1,completedRound:1,materialsDelivered:[],warehouseInventory:[]});
 s.activeWorkerId=s.players[0].workers[0].id;
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:s});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function openNews(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
for(const vp of viewports){
 test('H01 first-year token, radius 0, usable foreign clinic expedition and save '+vp.width+'x'+vp.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=game({withClinic:true,withBuilding:true});
  await page.setViewportSize(vp);await seed(page,s);
  await expect(page.locator('[data-h01-marker="source"]')).toHaveCount(1);
  await expect(page.locator('[data-district="chinatown"]')).toHaveClass(/h01-infected/);
  await expect(page.locator('[data-district="financial"]')).not.toHaveClass(/h01-infected/);
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ЭПИДЕМИЯ ОХВАТЫВАЕТ ГОРОДСКИЕ КВАРТАЛЫ!');
  await expect(page.locator('.news-h01-panel')).toContainText('Радиус 0');
  await expect(page.locator('.news-h01-panel')).toContainText('незащищённых 1');
  await expect(page.locator('[data-h01-expedition="MED"]')).toBeEnabled();
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  const old=await saved(page),worker=old.players[0].workers[0];
  await page.locator('[data-h01-expedition="MED"]').click();
  const now=await saved(page);
  expect(now.players[0].capital).toBe(29);
  expect(now.players[0].prestige).toBe(2);
  expect(now.players[0].influence).toBe(31);
  expect(now.players[1].capital).toBe(30);
  expect(now.players[1].prestige).toBe(0);
  expect(now.players[0].workers[0].districtId).toBe(worker.districtId);
  expect(now.players[0].workers[0].used).toBe(true);
  expect(now.activationMainActionUsed).toBe(true);
  expect(now.newsH01Incident.resolvedRound).toBe(1);
  expect(now.newsH01Incident.operation.route).toEqual(['financial','chinatown']);
  await expect(page.locator('[data-h01-marker]')).toHaveCount(0);
  await expect(page.locator('[data-district="chinatown"]')).not.toHaveClass(/h01-infected/);
  await expect(page.locator('.news-h01-panel')).toContainText('Эпидемия ликвидирована');
  await expect(page.locator('[data-h01-expedition]')).toHaveCount(0);
  await page.reload();await openNews(page,vp);
  expect((await saved(page)).newsH01Incident.operation.cost).toBe(1);
  await expect(page.locator('.news-h01-panel')).toContainText('Эпидемия ликвидирована');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}
test('H01 without clinics shows a real blocker, never creates a fake rescue action',async({page})=>{
 const s=game({withBuilding:true});
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await openNews(page,{width:390,height:844});
 await expect(page.locator('.news-h01-panel')).toContainText('Нет доступного медицинского учреждения');
 await expect(page.locator('[data-h01-expedition]')).toHaveCount(0);
 const before=await saved(page);
 expect(before.players[0].capital).toBe(30);
 expect(before.players[0].prestige).toBe(0);
 await page.reload();
 expect((await saved(page)).newsH01Incident.resolvedRound).toBeNull();
});
test('H01 shortage blocks an available clinic without charging money or using action',async({page})=>{
 const s=game({withClinic:true});s.players[0].capital=0;
 await page.setViewportSize({width:932,height:430});await seed(page,s);
 await openNews(page,{width:932,height:430});
 await expect(page.locator('[data-h01-expedition="MED"]')).toBeDisabled();
 await expect(page.locator('[data-h01-expedition="MED"]')).toContainText('Недостаточно денег');
 const before=await saved(page);
 expect(before.players[0].workers[0].used).toBe(false);
 expect(before.newsH01Incident.resolvedRound).toBeNull();
});
test('H01 unsettled persists while next newspaper appears, expands and taxes just once',async({page})=>{
 const s=game({withBuilding:true});
 s.newsDeck=['E02','E03',...s.newsDeck.filter(x=>!['E02','E03'].includes(x))];
 s.developmentComplete=true;s.developmentPlayer=null;
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 const start=s.players[0].capital,inc=roundIncome(s,0);
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await saved(page);
 expect(now.round).toBe(2);expect(now.newsCurrentIds[0]).toBe('E02');
 expect(now.players[0].capital).toBe(start-2+inc);
 expect(now.newsH01Incident.radius).toBe(1);
 expect(now.newsH01Incident.lastAssessedRound).toBe(1);
 expect(now.newsArchive[0].h01.entries).toHaveLength(1);
 await page.locator('[data-view="city"]').click();
 await expect(page.locator('[data-district="financial"]')).toHaveClass(/h01-infected/);
 await expect(page.locator('[data-h01-marker="source"]')).toHaveCount(1);
 await openNews(page,{width:390,height:844});
 await expect(page.locator('.news-headline')).not.toHaveText('ЭПИДЕМИЯ ОХВАТЫВАЕТ ГОРОДСКИЕ КВАРТАЛЫ!');
 await expect(page.locator('.news-h01-panel')).toContainText('Радиус 1');
 await page.reload();
 const again=await saved(page);
 expect(again.newsH01Incident.radius).toBe(1);
 expect(again.newsArchive[0].h01.entries).toHaveLength(1);
});
test('H01 standard local clinic protects a threatened owner and rewards only its owner',async({page})=>{
 const s=game({withBuilding:true});
 s.constructions.push({id:'LOCAL',projectId:'std_clinic',playerId:2,
  districtId:'chinatown',status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:[],warehouseInventory:[]});
 s.constructions.push({id:'NEIGHBOR',projectId:'clinic',playerId:1,
  districtId:'northbeach',status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:[],warehouseInventory:[]});
 s.developmentComplete=true;s.developmentPlayer=null;s.newsDeck=['E02',...s.newsDeck.filter(x=>x!=='E02')];
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 const old=s.players.map(p=>({capital:p.capital,influence:p.influence}));
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await saved(page);
 expect(now.newsArchive[0].h01.influenceRewards).toHaveLength(1);
 expect(now.newsArchive[0].h01.influenceRewards[0].clinicId).toBe('LOCAL');
 expect(now.players[0].capital).toBe(old[0].capital+roundIncome(s,0));
 expect(now.players[2].influence).toBe(old[2].influence+1);
 expect(now.players[1].influence).toBe(old[1].influence);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('защищено');
 await expect(page.locator('#newsSheetContent')).toContainText('Influence');
});
test('H01 cleared in a later newspaper year records operation and never spreads further',async({page})=>{
 const s=game({round:2,withClinic:true,withBuilding:true});
 s.newsCurrentIds=['E02'];s.newsH01Incident.startRound=1;
 s.newsH01Incident.radius=1;s.newsH01Incident.lastAssessedRound=1;
 s.newsArchive=[{year:1900,round:1,cardId:'H01',title:'ЭПИДЕМИЯ ОХВАТЫВАЕТ ГОРОДСКИЕ КВАРТАЛЫ!',
  entries:[{playerId:0,districtIds:['chinatown'],actual:-2,defended:false}],
  changes:{0:{capital:-2,influence:0,prestige:0}},h01:{radius:0,roll:1,districtId:'chinatown',entries:[],
   influenceRewards:[],resolved:false}}];
 s.newsDeck=['E03',...s.newsDeck.filter(x=>x!=='E03')];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#newsOpenBtn').click();
 await expect(page.locator('.news-h01-panel')).toContainText('Радиус 1');
 await expect(page.locator('[data-h01-expedition="MED"]')).toBeEnabled();
 await page.locator('[data-h01-expedition="MED"]').click();
 const r=await saved(page);
 expect(r.newsH01Incident.resolvedRound).toBe(2);
 expect(r.players[0].prestige).toBe(2);
 // Finish the year to confirm the separate ongoing-H01 audit.
 await page.locator('#newsCloseBtn').click();
 await page.locator('#endRoundBtn').isEnabled().then(async enabled=>{
  if(!enabled)await page.evaluate(key=>{
    const s=JSON.parse(localStorage.getItem(key));s.developmentComplete=true;
    s.developmentPlayer=null;localStorage.setItem(key,JSON.stringify(s));},KEY).then(()=>page.reload());
 });
 await page.locator('#endRoundBtn').click();
 const now=await saved(page);
 expect(now.newsArchive.find(x=>x.round===2).ongoingH01.resolved).toBe(true);
 expect(now.newsH01Incident.radius).toBe(1);
 expect(now.newsH01Incident.yearReports).toHaveLength(2);
 await page.reload();
 expect((await saved(page)).newsH01Incident.resolvedRound).toBe(2);
});
test('legacy H01 saved game obtains a stable single focus; old archive is untouched',async({page})=>{
 const s=game();delete s.newsH01Incident;
 s.players[0].capital=17;
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 const first=await saved(page);
 expect(first.newsH01Incident.roll).toBeGreaterThanOrEqual(1);
 expect(first.newsH01Incident.roll).toBeLessThanOrEqual(6);
 expect(first.newsH01Incident.startRound).toBe(1);
 expect(first.players[0].capital).toBe(17);
 await page.reload();
 expect((await saved(page)).newsH01Incident.districtId).toBe(first.newsH01Incident.districtId);
 const old=game();old.round=2;old.newsCurrentIds=['E02'];old.newsH01Incident=null;
 old.newsArchive=[{round:1,year:1900,cardId:'H01',title:'Лихорадка в переполненных комнатах',
  category:'Болезнь',entries:[{playerId:0,districtIds:['chinatown'],actual:-2}],
  changes:{0:{capital:-2,influence:0,prestige:0}},serviceRecognition:[],emergency:{}}];
 await seed(page,old);
 await page.locator('[data-view="city"]').click();
 await openNews(page,{width:390,height:844});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Лихорадка в переполненных комнатах');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции H01');
 expect((await saved(page)).newsArchive[0].changes['0'].capital).toBe(-2);
});
