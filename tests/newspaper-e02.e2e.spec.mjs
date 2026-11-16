import {test,expect} from '@playwright/test';
import {createInitialState,cleanupMarket} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({round=1,phase='development',venue=true}={}){
 const s=createInitialState({rng:()=>.39});
 s.phase=phase;s.round=round;s.view='city';
 s.newsCurrentIds=['E02'];s.newsDeck=s.newsDeck.filter(id=>id!=='E02');
 s.newsLastResolvedRound=round-1;s.newsE02TradeWeek={round,events:[]};
 s.yearTurnOrder=[0,1,2];s.developmentSlotsUsed=[0,0,0];
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.players.forEach((p,i)=>{
   p.capital=20;p.influence=[10,20,30][i];p.prestige=0;
   p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});
   p.workersLeft=3;
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 if(venue)site(s,'SHOP','shops',1,'civic');
 return s;
}
function site(s,id,projectId,playerId=1,districtId='civic',status='complete'){
 const c={id,projectId,playerId,districtId,status,
   startedRound:1,completedRound:status==='complete'?1:null,
   materialsDelivered:[],warehouseInventory:[]};
 s.constructions.push(c);return c;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function openNews(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of viewports){
 test('E02 real newspaper venue action, owner Influence and reload '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game();
  site(s,'BREW','brewery',2,'civic');
  await seed(page,s);
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ГОРОДСКАЯ ТОРГОВАЯ НЕДЕЛЯ!');
  await expect(page.locator('.news-e02-panel')).toContainText('+$5');
  await expect(page.locator('[data-e02-venue="SHOP"]')).toBeEnabled();
  await expect(page.locator('[data-e02-venue="BREW"]')).toBeEnabled();
  const before=await saved(page);
  await page.locator('[data-e02-venue="BREW"]').click();
  const after=await saved(page);
  expect(after.newsE02TradeWeek.events).toHaveLength(1);
  expect(after.newsE02TradeWeek.events[0]).toMatchObject({
   playerId:0,venueConstructionId:'BREW',venueOwnerId:2,
   districtId:'civic',tradeCount:2,cash:5,vp:1,influenceSteps:1
  });
  expect(after.players[0].capital).toBe(before.players[0].capital+5);
  expect(after.players[0].prestige).toBe(before.players[0].prestige+1);
  expect(after.players[0].influence).toBe(before.players[0].influence);
  expect(after.players[2].influence).toBe(before.players[2].influence+1);
  expect(after.players[1].influence).toBe(before.players[1].influence);
  expect(after.players[0].workers[0].used).toBe(true);
  expect(after.players[0].workersLeft).toBe(2);
  expect(after.activationMainActionUsed).toBe(true);
  expect(after.developmentSlotsUsed).toEqual(before.developmentSlotsUsed);
  await expect(page.locator('.news-e02-panel')).toContainText('мероприятие уже проведено');
  await expect(page.locator('[data-e02-venue="SHOP"]')).toBeDisabled();
  await page.reload();
  await openNews(page,vp);
  expect((await saved(page)).newsE02TradeWeek.events).toHaveLength(1);
  await expect(page.locator('[data-e02-venue="BREW"]')).toBeDisabled();
  const rect=await page.evaluate(()=>({
    overflow:document.documentElement.scrollWidth-innerWidth,
    sheet:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()
  }));
  expect(rect.overflow).toBeLessThanOrEqual(3);
  expect(rect.sheet.x).toBeGreaterThanOrEqual(-2);
  expect(rect.sheet.x+rect.sheet.width).toBeLessThanOrEqual(vp.width+2);
 });
}
test('E02 map district context allows choosing OWN trade building and spends main action',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 const s=game({venue:false});
 site(s,'OWN','pub',0,'civic');site(s,'OTHER','shops',2,'civic');
 await seed(page,s);
 const btn=page.locator('#contextPanel [data-e02-context-venue="OWN"]');
 await expect(btn).toBeVisible();
 await expect(btn).toBeEnabled();
 const before=await saved(page);
 await btn.click();
 const after=await saved(page);
 expect(after.newsE02TradeWeek.events).toHaveLength(1);
 expect(after.newsE02TradeWeek.events[0]).toMatchObject({playerId:0,venueOwnerId:0,venueConstructionId:'OWN',cash:5});
 expect(after.players[0].capital).toBe(before.players[0].capital+5);
 expect(after.players[0].prestige).toBe(before.players[0].prestige+1);
 expect(after.players[0].influence).toBe(before.players[0].influence+1);
 await expect(btn).toBeDisabled();
});
test('E02 newspaper disabled when no worker, occupied action or nonadjacent venue',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game();
 site(s,'DISTANT','brewery',1,'sunset');
 s.activeWorkerId=null;
 await seed(page,s);await openNews(page,{width:390,height:844});
 await expect(page.locator('[data-e02-venue="SHOP"]')).toBeDisabled();
 await expect(page.locator('[data-e02-venue="DISTANT"]')).toBeDisabled();
 await expect(page.locator('.news-e02-panel')).toContainText('выберите свободного представителя');
 expect((await saved(page)).newsE02TradeWeek.events).toHaveLength(0);
});
test('E02 zero completed trade buildings has no action; newly completed mixed trade appears after reload',async({page})=>{
 await page.setViewportSize({width:932,height:430});
 const s=game({venue:false});
 site(s,'BUILDING','brewery',1,'civic','under-construction');
 await seed(page,s);await openNews(page,{width:932,height:430});
 await expect(page.locator('[data-e02-venue]')).toHaveCount(0);
 await expect(page.locator('.news-e02-panel')).toContainText('нет готовых торговых зданий');
 await page.evaluate(key=>{
  const state=JSON.parse(localStorage.getItem(key));
  state.constructions.find(c=>c.id==='BUILDING').status='complete';
  localStorage.setItem(key,JSON.stringify(state));
 },KEY);
 await page.reload();await openNews(page,{width:932,height:430});
 await expect(page.locator('[data-e02-venue="BUILDING"]')).toBeEnabled();
});
test('E02 historical legacy archive keeps original trade article and +$2 outcome, not new rewards',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game({round:2});
 s.newsCurrentIds=['E03'];s.newsE02TradeWeek=null;
 s.newsArchive=[{year:1900,round:1,cardId:'E02',title:'Торговля на пике',
   entries:[{playerId:0,districtIds:['civic'],actual:2}],
   changes:{0:{capital:2,influence:0,prestige:0}}}];
 await seed(page,s);await openNews(page,{width:390,height:844});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Торговля на пике');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции E02');
 await expect(page.locator('.news-e02-panel')).toHaveCount(0);
});
test('E02 new end-of-year archive shows actual venue owner and no bonus payout',async({page})=>{
 const s=game();
 s.players[0].capital=20;
 s.newsE02TradeWeek.events=[{round:1,playerId:0,venueConstructionId:'SHOP',venueOwnerId:1,
  districtId:'civic',tradeCount:1,cash:4,vp:1,influenceSteps:1,influenceFrom:20,influenceTo:21}];
 s.newsDeck=['E03',...s.newsDeck.filter(id=>id!=='E03')];
 s.developmentComplete=true;s.developmentPlayer=null;
 expect(cleanupMarket(s,{rng:()=>.2}).ok).toBe(true);
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Неиспользованные права: 2');
 await expect(page.locator('#newsSheetContent')).toContainText('+$4');
 await expect(page.locator('#newsSheetContent')).toContainText('+1 VP');
});
