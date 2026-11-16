import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const views=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({round=1}={}){
 const s=createInitialState({rng:()=>.39});
 s.phase='development';s.view='city';s.round=round;
 s.newsCurrentIds=['E04'];s.newsDeck=s.newsDeck.filter(id=>id!=='E04');
 s.newsLastResolvedRound=round-1;
 s.newsE04Strike={round,resolution:null,marineDeliveries:0,surchargePaid:0};
 s.newsH02Incident=null;s.developmentComplete=false;s.developmentPlayer=0;
 s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 s.players.forEach((p,i)=>{
  p.capital=40;p.prestige=0;p.influence=[10,20,30][i];p.workersLeft=3;
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='soma';});
 });
 s.activeWorkerId=s.players[0].workers[0].id;s.selectedDistrictId='soma';
 s.constructions=[{id:'WH',playerId:0,projectId:'warehouse',
  districtId:'soma',status:'complete',warehouseInventory:[],
  materialsDelivered:[],startedRound:1,completedRound:1}];
 s.logisticsSupply.pacificmail=['Steel','Lumber','Masonry'];
 s.logisticsSupply.southernpacific=['Steel','Masonry','Lumber'];
 s.lastDeliveryKey=null;s.haulersUsed=[];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),
  {key:KEY,value:s});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function news(page,viewport){
 if(viewport.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of views){
 test('E04 real negotiation pays $5, spends worker and saves global resolution '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game());await news(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ЗАБАСТОВКА НА НАБЕРЕЖНОЙ!');
  await expect(page.locator('#newsSheetContent .news-forecast > b')).toHaveText('ЗАБАСТОВКА НА НАБЕРЕЖНОЙ');
  await expect(page.locator('.news-e04-panel')).toContainText('каждая Доставка с морской погрузкой +$2');
  await expect(page.locator('[data-e04-port="soma"]')).toBeEnabled();
  const before=await saved(page);
  await page.locator('[data-e04-port="soma"]').click();
  const after=await saved(page);
  expect(after.newsE04Strike.resolution).toMatchObject({playerId:0,districtId:'soma',cost:5,prestige:3,influenceSteps:1});
  expect(after.players[0].capital).toBe(before.players[0].capital-5);
  expect(after.players[0].prestige).toBe(before.players[0].prestige+3);
  expect(after.players[0].influence).toBe(before.players[0].influence+1);
  expect(after.players[0].workers[0].used).toBe(true);
  expect(after.players[0].workersLeft).toBe(2);
  expect(after.activationMainActionUsed).toBe(true);
  await expect(page.locator('.news-e04-panel')).toContainText('Забастовка урегулирована');
  await expect(page.locator('[data-e04-port]')).toHaveCount(0);
  await page.reload();await news(page,vp);
  expect((await saved(page)).newsE04Strike.resolution.playerId).toBe(0);
  await expect(page.locator('.news-e04-panel')).toContainText('Надбавка отменена');
  const dims=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,
   sheet:document.querySelector('#newsSheet').getBoundingClientRect().toJSON()}));
  expect(dims.overflow).toBeLessThanOrEqual(3);
  expect(dims.sheet.x).toBeGreaterThanOrEqual(-2);
  expect(dims.sheet.x+dims.sheet.width).toBeLessThanOrEqual(vp.width+2);
 });
}
for(const vp of views){
 test('E04 marine delivery shows $2 surcharge, spends exact resources and cash '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);await seed(page,game());
  const initial=await saved(page);
  await page.locator('#actionDelivery').click();
  if(vp.width<1000){
   await expect(page.locator('#deliveryPanel')).toBeHidden();
   await page.locator('#deliverySourceToolbarBtn').click();
  }
  await page.locator('[data-ds-node="pacificmail"]').click();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('[data-load="Steel"]').click();
  await page.locator('#deliveryBeginRoute').click();
  if(vp.width<1000){
   await page.locator('#deliveryLockRoute').click();
   await page.locator('#deliveryToggleTargetList').click();
   await page.locator('[data-delivery-unload-target="WH"]').click();
  }
  await expect(page.locator('[data-drop-kind="warehouse"][data-drop-type="Steel"]')).toBeEnabled();
  await page.locator('[data-drop-kind="warehouse"][data-drop-type="Steel"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await expect(page.locator('#deliveryConfirm')).toContainText('$4');
  await page.locator('#deliveryConfirm').click();
  const s=await saved(page);
  expect(s.newsE04Strike.marineDeliveries).toBe(1);
  expect(s.newsE04Strike.surchargePaid).toBe(2);
  expect(s.players[0].capital).toBe(initial.players[0].capital-4);
  expect(s.logisticsSupply.pacificmail).toEqual(['Lumber','Masonry']);
  expect(s.constructions.find(c=>c.id==='WH').warehouseInventory).toEqual(['Steel']);
  expect(s.activationMainActionUsed).toBe(false);
  await page.reload();await news(page,vp);
  await expect(page.locator('.news-e04-status')).toContainText('морских рейсов с надбавкой: 1');
  expect((await saved(page)).newsE04Strike.surchargePaid).toBe(2);
 });
}
test('E04 port district context action spends worker and disappears after resolution',async({page})=>{
 await page.setViewportSize({width:1366,height:768});
 await seed(page,game());
 const btn=page.locator('#contextPanel [data-e04-context-port="soma"]');
 await expect(btn).toBeVisible();await expect(btn).toBeEnabled();
 await btn.click();
 const s=await saved(page);
 expect(s.newsE04Strike.resolution).toMatchObject({playerId:0,districtId:'soma'});
 expect(s.players[0].capital).toBe(35);
 await expect(page.locator('#contextPanel [data-e04-context-port="soma"]')).toBeDisabled();
});
test('E04 newspaper does not allow unfunded or off-range negotiation',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game();s.players[0].capital=4;
 await seed(page,s);await news(page,{width:390,height:844});
 await expect(page.locator('[data-e04-port="soma"]')).toBeDisabled();
 await expect(page.locator('.news-e04-ports')).toContainText('необходимо $5');
 expect((await saved(page)).newsE04Strike.resolution).toBeNull();
});
test('E04 legacy port penalty archive remains historic, not rerendered as new strike',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game({round:2});s.newsCurrentIds=['E03'];
 s.newsArchive=[{year:1900,round:1,cardId:'E04',title:'На пристанях очереди',
   entries:[{playerId:0,actual:-2,districtIds:['soma']}],
   changes:{0:{capital:-2,influence:0,prestige:0}}}];
 await seed(page,s);await news(page,{width:390,height:844});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('На пристанях очереди');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции E04');
 await expect(page.locator('.news-e04-panel')).toHaveCount(0);
});
