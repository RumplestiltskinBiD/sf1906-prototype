import {test,expect} from '@playwright/test';
import {createInitialState,generateLogisticsSupply,LOGISTICS_NODES,projectById,roundIncome} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];

function game({legacy=false,withWarehouse=false}={}){
 const s=createInitialState({rng:()=>.39});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.newsCurrentIds=['H03'];s.newsDeck=s.newsDeck.filter(x=>x!=='H03');
 s.newsH03SupplyRound=legacy?null:1;
 s.logisticsSupply=generateLogisticsSupply({rng:()=>.22,h03:!legacy});
 s.players.forEach(p=>{p.capital=70;p.prestige=0;p.suspicion=0;});
 s.constructions=withWarehouse?[{id:'W1',playerId:0,projectId:'warehouse',
  districtId:'soma',status:'complete',materialsDelivered:[...projectById('warehouse').materials],
  warehouseInventory:[],startedRound:1,completedRound:1}]:[];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:s});
 await page.reload();
}
async function read(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function openNews(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
for(const vp of viewports){
 test('H03 visible supply decrease, actionable ports, news and reload '+vp.width+'x'+vp.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(vp);await seed(page,game());
  for(const [id,amount] of [['broadway',2],['pacificmail',3],['chinabasin',3],['unioniron',1],['southernpacific',4]]){
   await expect(page.locator('[data-delivery-node="'+id+'"] .node-resource')).toHaveCount(amount);
   await expect(page.locator('[data-delivery-node="'+id+'"]')).not.toHaveClass(/f03-port-closed/);
  }
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ЗАМОРСКИЕ ГРУЗЫ ЗАДЕРЖАНЫ!');
  await expect(page.locator('.news-h03-panel')).toContainText('Сгенерировано 13 вместо 17');
  await expect(page.locator('.news-h03-panel')).toContainText('Southern Pacific 4/4');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  await expect(page.locator('#newsIssueMapToggle')).toHaveCount(0);
  const first=await read(page);
  expect(Object.values(first.logisticsSupply).flat()).toHaveLength(13);
  expect(first.newsH03SupplyRound).toBe(1);
  const before=JSON.stringify(first.logisticsSupply);
  await page.reload();
  await openNews(page,vp);
  await expect(page.locator('.news-h03-panel')).toContainText('Сгенерировано 13 вместо 17');
  expect(JSON.stringify((await read(page)).logisticsSupply)).toBe(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}
for(const vp of viewports.slice(0,2)){
 test('H03 reduced port still selectable as ordinary delivery source '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);await seed(page,game());
  await page.locator('#actionDelivery').click();
  await page.locator('[data-delivery-node="broadway"]').click();
  await expect(page.locator('[data-hauler="standard"]')).toBeVisible();
  const s=await read(page);
  expect(s.logisticsSupply.broadway).toHaveLength(2);
  expect(s.players[0].capital).toBe(70);
 });
}
test('H03 real warehouse delivery consumes actual available cube, without refill after reload',async({page})=>{
 const s=game({withWarehouse:true});
 const material=s.logisticsSupply.pacificmail[0];
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await page.locator('#actionDelivery').click();
 await page.locator('[data-delivery-node="pacificmail"]').click();
 await page.locator('[data-hauler="standard"]').click();
 await page.locator('[data-load="'+material+'"]').click();
 await page.locator('#deliveryBeginRoute').click();
 await page.locator('#deliveryLockRoute').click();
 await page.locator('[data-construction-token="W1"]').click();
 await page.locator('[data-drop-kind="warehouse"][data-drop-type="'+material+'"]').click();
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 await page.locator('#deliveryConfirm').click();
 const now=await read(page);
 expect(now.constructions[0].warehouseInventory).toEqual([material]);
 expect(now.logisticsSupply.pacificmail).toHaveLength(2);
 expect(Object.values(now.logisticsSupply).flat()).toHaveLength(12);
 await page.reload();
 const restored=await read(page);
 expect(restored.logisticsSupply.pacificmail).toHaveLength(2);
 expect(restored.constructions[0].warehouseInventory).toEqual([material]);
});

test('H03 end-year archive has no penalties and restores all normal ports',async({page})=>{
 const s=game();s.newsDeck=['E02',...s.newsDeck.filter(x=>x!=='E02')];
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentComplete=true;s.developmentPlayer=null;
 const expected=s.players.map(p=>({capital:p.capital+roundIncome(s,p.id),influence:p.influence,prestige:p.prestige}));
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await read(page);
 expect(now.round).toBe(2);
 expect(now.newsCurrentIds[0]).toBe('E02');
 expect(now.newsArchive).toHaveLength(1);
 expect(now.newsArchive[0].cardId).toBe('H03');
 expect(now.newsArchive[0].h03).toEqual({
  applied:true,removedSlots:4,portIds:['broadway','pacificmail','chinabasin','unioniron']
 });
 expect(now.newsArchive[0].entries).toEqual([]);
 expect(now.newsArchive[0].changes).toEqual({});
 expect(now.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}))).toEqual(expected);
 for(const node of LOGISTICS_NODES)expect(now.logisticsSupply[node.id]).toHaveLength(node.throughput);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('13 вместо 17');
 await expect(page.locator('#newsSheetContent')).toContainText('Southern Pacific');
 await page.reload();
 expect((await read(page)).newsArchive[0].h03.removedSlots).toBe(4);
});

test('legacy active H03 save retains old stocks and honestly reports unchanged stock',async({page})=>{
 const s=game({legacy:true});
 delete s.newsH03SupplyRound;
 s.logisticsSupply.broadway=['Steel'];
 s.players[0].capital=77;
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await openNews(page,{width:390,height:844});
 await expect(page.locator('.news-h03-panel')).toContainText('Старое сохранение: запасы сохранены');
 await expect(page.locator('.news-h03-panel')).toContainText('существующие запасы и покупки не пересчитываются');
 let now=await read(page);
 expect(now.logisticsSupply.broadway).toEqual(['Steel']);
 expect(now.players[0].capital).toBe(77);
 await page.reload();
 now=await read(page);
 expect(now.logisticsSupply.broadway).toEqual(['Steel']);
});

test('old H03 newspaper archive retains its original headline and losses',async({page})=>{
 const s=game();s.round=2;s.newsCurrentIds=['E02'];s.newsH03SupplyRound=null;
 s.newsArchive=[{round:1,year:1900,cardId:'H03',title:'Рабочие уходят с фабрик с жаром',
  category:'Болезнь',entries:[{playerId:1,districtIds:['soma'],actual:-2,defended:false}],
  changes:{1:{capital:-2,influence:0,prestige:0}},serviceRecognition:[],emergency:{}}];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Рабочие уходят с фабрик с жаром');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции H03');
 await expect(page.locator('#newsSheetContent')).not.toContainText('13 вместо 17');
 expect((await read(page)).newsArchive[0].h03).toBeUndefined();
});
