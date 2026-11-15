import {test,expect} from '@playwright/test';
import {createInitialState,createC01Incident,createH02Incident,roundIncome} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const screens=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({roll=1,police=true,round=1,crisis=false}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=['C01'];s.newsDeck=s.newsDeck.filter(x=>x!=='C01');
 s.newsC01Incident=createC01Incident(round,()=> (roll-.5)/6);
 s.newsLastResolvedRound=round-1;
 s.newsH01Incident=null;s.newsH02Incident=crisis?createH02Incident(round,()=>.3):null;
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.constructions=[{id:'W',playerId:2,projectId:'warehouse',districtId:'northbeach',
   status:'complete',startedRound:1,completedRound:1,materialsDelivered:[],warehouseInventory:[]}];
 s.players.forEach((p,i)=>{p.capital=30;p.prestige=0;p.influence=30-i*6;});
 s.yearTurnOrder=[0,1,2];
 if(police)s.constructions.push({id:'POL',playerId:1,
   projectId:'std_police',districtId:'financial',status:'complete',
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
for(const vp of screens){
 test('C01 foreign police raid removes gang token, pays actual distance and persists '+vp.width+'x'+vp.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(vp);await seed(page,game());
  await expect(page.locator('[data-c01-marker="source"]')).toHaveCount(1);
  await expect(page.locator('[data-district="northbeach"]')).toHaveClass(/c01-threat/);
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ГРАБИТЕЛИ ХОЗЯЙНИЧАЮТ НА УЛИЦАХ ГОРОДА!');
  await expect(page.locator('.news-c01-panel')).toContainText('Полицейский рейд');
  await expect(page.locator('.news-c01-panel')).toContainText('$1/переход');
  await expect(page.locator('[data-c01-raid="POL"]')).toBeEnabled();
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  const old=await saved(page),pos=old.players[0].workers[0].districtId;
  await page.locator('[data-c01-raid="POL"]').click();
  const now=await saved(page);
  expect(now.players[0].capital).toBe(29);
  expect(now.players[0].prestige).toBe(2);
  expect(now.players[0].influence).toBe(31);
  expect(now.players[1].capital).toBe(30);
  expect(now.players[1].prestige).toBe(0);
  expect(now.players[0].workers[0].districtId).toBe(pos);
  expect(now.players[0].workers[0].used).toBe(true);
  expect(now.activationMainActionUsed).toBe(true);
  expect(now.newsC01Incident.resolvedRound).toBe(1);
  expect(now.newsC01Incident.operation.cost).toBe(1);
  expect(now.newsC01Incident.operation.tariff).toBe(1);
  await expect(page.locator('[data-c01-marker]')).toHaveCount(0);
  await expect(page.locator('[data-district="northbeach"]')).not.toHaveClass(/c01-threat/);
  await expect(page.locator('.news-c01-panel')).toContainText('Банды ликвидированы');
  await expect(page.locator('[data-c01-raid]')).toHaveCount(0);
  await page.reload();await openNews(page,vp);
  await expect(page.locator('.news-c01-panel')).toContainText('Банды ликвидированы');
  expect((await saved(page)).newsC01Incident.operation.cost).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}
test('C01 no completed police exposes a real blocker with no invented backup',async({page})=>{
 const vp={width:390,height:844};
 await page.setViewportSize(vp);await seed(page,game({police:false}));
 await openNews(page,vp);
 await expect(page.locator('.news-c01-panel')).toContainText('Нет доступного завершённого полицейского учреждения');
 await expect(page.locator('[data-c01-raid]')).toHaveCount(0);
 expect((await saved(page)).newsC01Incident.resolvedRound).toBeNull();
});
test('C01 H02 tariff doubles cost and unaffordable raid is disabled',async({page})=>{
 const vp={width:932,height:430},s=game({crisis:true});s.players[0].capital=1;
 await page.setViewportSize(vp);await seed(page,s);await openNews(page,vp);
 const button=page.locator('[data-c01-raid="POL"]');
 await expect(button).toBeDisabled();
 await expect(button).toContainText('Недостаточно денег');
 await expect(page.locator('.news-c01-panel')).toContainText('$2/переход');
 let now=await saved(page);
 expect(now.newsC01Incident.resolvedRound).toBeNull();expect(now.players[0].workers[0].used).toBe(false);
 // Grant cash in a saved game and verify that C01 uses the already-active H02 tariff.
 await page.evaluate(key=>{const x=JSON.parse(localStorage.getItem(key));x.players[0].capital=2;
   localStorage.setItem(key,JSON.stringify(x));},KEY);
 await page.reload();await openNews(page,vp);
 await expect(page.locator('[data-c01-raid="POL"]')).toBeEnabled();
 await page.locator('[data-c01-raid="POL"]').click();
 now=await saved(page);
 expect(now.players[0].capital).toBe(0);
 expect(now.players[0].prestige).toBe(2);
 expect(now.newsC01Incident.operation.cost).toBe(2);
 expect(now.newsH02Incident.resolvedRound).toBeNull();
});
test('C01 stays on map and can be raided in a later newspaper year',async({page})=>{
 const vp={width:390,height:844},s=game({round:2});
 s.newsCurrentIds=['E02'];s.newsC01Incident.startRound=1;
 s.newsC01Incident.lastAssessedRound=1;
 s.newsC01Incident.yearReports=[{year:1900,round:1,roll:1,districtId:'northbeach',resolved:false}];
 s.newsArchive=[{round:1,year:1900,cardId:'C01',title:'ГРАБИТЕЛИ ХОЗЯЙНИЧАЮТ НА УЛИЦАХ ГОРОДА!',
   category:'Преступность',entries:[],changes:{},c01:{round:1,roll:1,districtId:'northbeach',
   resolved:false,entries:[],influenceRewards:[],changes:{}}}];
 await page.setViewportSize(vp);await seed(page,s);
 await expect(page.locator('#newsStripLabel')).toContainText('Грабители: North Beach');
 await expect(page.locator('[data-c01-marker="source"]')).toHaveCount(1);
 await openNews(page,vp);
 await expect(page.locator('.news-headline')).not.toHaveText('ГРАБИТЕЛИ ХОЗЯЙНИЧАЮТ НА УЛИЦАХ ГОРОДА!');
 await expect(page.locator('[data-c01-raid="POL"]')).toBeEnabled();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('продолжают налёты');
 await page.locator('[data-news-current="1"]').click();
 await page.locator('[data-c01-raid="POL"]').click();
 const now=await saved(page);
 expect(now.newsC01Incident.resolvedRound).toBe(2);
 await expect(page.locator('#newsStripLabel')).not.toContainText('Грабители: North Beach');
 await page.reload();expect((await saved(page)).newsC01Incident.operation.cost).toBe(1);
});
test('old C01 historical fines remain unchanged and old headline is displayed',async({page})=>{
 const vp={width:1366,height:768},s=game({round:2});
 s.newsCurrentIds=['E02'];s.newsC01Incident=null;
 s.newsArchive=[{year:1900,round:1,cardId:'C01',title:'Грабители хозяйничают на улицах города',
   category:'Преступность',entries:[{playerId:0,districtIds:['northbeach'],actual:-2}],
   changes:{0:{capital:-2}}}];
 await page.setViewportSize(vp);await seed(page,s);await openNews(page,vp);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Грабители хозяйничают на улицах города');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив прежней C01');
 await expect(page.locator('#newsSheetContent')).toContainText('-2');
 expect((await saved(page)).newsC01Incident).toBeNull();
});


test('unresolved C01 applies exactly one year-end loss, archives it and persists to new edition',async({page})=>{
 const vp={width:1366,height:768},s=game({police:false});
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.developmentComplete=true;s.developmentPlayer=null;
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 const start=s.players[2].capital,income=roundIncome(s,2);
 await page.setViewportSize(vp);await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await saved(page);
 expect(now.round).toBe(2);expect(now.newsCurrentIds[0]).toBe('E02');
 expect(now.players[2].capital).toBe(start-2+income);
 expect(now.newsC01Incident.lastAssessedRound).toBe(1);
 expect(now.newsArchive[0].cardId).toBe('C01');
 expect(now.newsArchive[0].c01.entries).toHaveLength(1);
 expect(now.newsArchive[0].c01.entries[0].actual).toBe(-2);
 expect(now.newsArchive[0].c01.resolved).toBe(false);
 await expect(page.locator('[data-c01-marker="source"]')).toHaveCount(1);
 await openNews(page,vp);
 await expect(page.locator('.news-c01-panel')).toContainText('Полицейский рейд');
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('уплачено $2');
 await page.reload();
 expect((await saved(page)).newsC01Incident.yearReports).toHaveLength(1);
});
