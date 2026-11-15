import {test,expect} from '@playwright/test';
import {createInitialState,createH02Incident} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const screens=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({roll=1,clinic=true,round=1}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase='development';s.view='city';
 s.newsCurrentIds=['H02'];s.newsDeck=s.newsDeck.filter(x=>x!=='H02');
 s.newsH02Incident=createH02Incident(round,()=> (roll-.5)/6);
 s.newsLastResolvedRound=round-1;
 s.newsH01Incident=null;s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;
 s.constructions=[];
 s.players.forEach((p,i)=>{p.capital=30;p.prestige=0;p.influence=30-i*6;});
 s.yearTurnOrder=[0,1,2];
 if(clinic)s.constructions.push({id:'MED',playerId:1,
  projectId:'std_clinic',districtId:'financial',status:'complete',
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
 test('H02 dispatch from foreign clinic restores freight tariff and persists '+vp.width+'x'+vp.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=game();
  await page.setViewportSize(vp);await seed(page,s);
  await expect(page.locator('[data-h02-marker="source"]')).toHaveCount(1);
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ЗАРАЗА В ГОРОДСКИХ КОНЮШНЯХ!');
  await expect(page.locator('.news-h02-panel')).toContainText('$2 за каждый платный дорожный переход');
  await expect(page.locator('[data-h02-expedition="MED"]')).toBeEnabled();
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  const old=await saved(page),position=old.players[0].workers[0].districtId;
  await page.locator('[data-h02-expedition="MED"]').click();
  const now=await saved(page);
  expect(now.players[0].capital).toBe(26);
  expect(now.players[0].prestige).toBe(3);
  expect(now.players[0].influence).toBe(31);
  expect(now.players[1].capital).toBe(30);
  expect(now.players[1].prestige).toBe(0);
  expect(now.players[0].workers[0].districtId).toBe(position);
  expect(now.players[0].workers[0].used).toBe(true);
  expect(now.activationMainActionUsed).toBe(true);
  expect(now.newsH02Incident.resolvedRound).toBe(1);
  expect(now.newsH02Incident.operation.tariff).toBe(2);
  expect(now.newsH02Incident.operation.cost).toBe(4);
  await expect(page.locator('[data-h02-marker]')).toHaveCount(0);
  await expect(page.locator('.news-h02-panel')).toContainText('Дорожный тариф вновь $1/переход');
  await expect(page.locator('[data-h02-expedition]')).toHaveCount(0);
  await page.reload();await openNews(page,vp);
  await expect(page.locator('.news-h02-panel')).toContainText('Зараза ликвидирована');
  expect((await saved(page)).newsH02Incident.operation.cost).toBe(4);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}
test('H02 cannot be resolved without any completed clinic',async({page})=>{
 const vp={width:390,height:844};
 await page.setViewportSize(vp);await seed(page,game({clinic:false}));
 await openNews(page,vp);
 await expect(page.locator('.news-h02-panel')).toContainText('Нет доступного медицинского учреждения');
 await expect(page.locator('[data-h02-expedition]')).toHaveCount(0);
 const now=await saved(page);
 expect(now.players[0].capital).toBe(30);expect(now.newsH02Incident.resolvedRound).toBeNull();
});
test('H02 expensive route blocks destitute participant without spending action',async({page})=>{
 const vp={width:932,height:430},s=game();s.players[0].capital=3;
 await page.setViewportSize(vp);await seed(page,s);await openNews(page,vp);
 const button=page.locator('[data-h02-expedition="MED"]');
 await expect(button).toBeDisabled();
 await expect(button).toContainText('Недостаточно денег');
 const after=await saved(page);
 expect(after.players[0].workers[0].used).toBe(false);
 expect(after.newsH02Incident.resolvedRound).toBeNull();
});
test('H02 remains visible and solvable under next newspaper and preserves old results',async({page})=>{
 const vp={width:390,height:844},s=game({round:2});
 s.newsCurrentIds=['E02'];
 s.newsH02Incident.startRound=1;
 s.newsH02Incident.lastAssessedRound=1;
 s.newsH02Incident.yearReports=[{year:1900,round:1,roll:1,districtId:'northbeach',resolved:false,tariff:2}];
 s.newsArchive=[{round:1,year:1900,cardId:'H02',title:'ЗАРАЗА В ГОРОДСКИХ КОНЮШНЯХ!',
  category:'Болезнь',entries:[],changes:{},h02:{round:1,roll:1,districtId:'northbeach',
  resolved:false,tariff:2,entries:[],changes:{}}}];
 await page.setViewportSize(vp);await seed(page,s);
 await expect(page.locator('#newsStripLabel')).toContainText('Конюшни: дорога $2/переход');
 await expect(page.locator('[data-h02-marker="source"]')).toHaveCount(1);
 await openNews(page,vp);
 await expect(page.locator('.news-headline')).not.toHaveText('ЗАРАЗА В ГОРОДСКИХ КОНЮШНЯХ!');
 await expect(page.locator('[data-h02-expedition="MED"]')).toBeEnabled();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('продолжается, тариф $2/переход');
 await page.locator('[data-news-current="1"]').click();
 await page.locator('[data-h02-expedition="MED"]').click();
 const now=await saved(page);
 expect(now.newsH02Incident.resolvedRound).toBe(2);
 await expect(page.locator('#newsStripLabel')).not.toContainText('Конюшни: дорога $2/переход');
 await page.reload();
 expect((await saved(page)).newsH02Incident.operation.cost).toBe(4);
});
test('old pre-v2 H02 archive keeps its actual hotel fines and original headline',async({page})=>{
 const vp={width:1366,height:768},s=game({round:2});
 s.newsCurrentIds=['E02'];s.newsH02Incident=null;
 s.newsArchive=[{year:1900,round:1,cardId:'H02',title:'Болезни среди постояльцев',
  category:'Болезнь',entries:[{playerId:0,districtIds:['financial'],actual:-2}],
  changes:{0:{capital:-2}}}];
 await page.setViewportSize(vp);await seed(page,s);await openNews(page,vp);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Болезни среди постояльцев');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции H02');
 await expect(page.locator('#newsSheetContent')).toContainText('-2');
 expect((await saved(page)).newsH02Incident).toBeNull();
});
