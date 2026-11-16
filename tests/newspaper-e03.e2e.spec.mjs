import {test,expect} from '@playwright/test';
import {createInitialState,createH02Incident,deliveryNeighbors,RESOURCE_PRICES} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const views=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function store(id,district='sunset',stock=['Lumber','Steel'],owner=0,status='complete',projectId='warehouse'){
 return {id,projectId,playerId:owner,districtId:district,status,
  warehouseInventory:[...stock],materialsDelivered:[],
  startedRound:1,completedRound:1};
}
function game({district='sunset',warehouses=[store('W1')],round=1}={}){
 const s=createInitialState({rng:()=>.31});
 s.phase='development';s.view='city';s.round=round;
 s.newsCurrentIds=['E03'];s.newsLastResolvedRound=round-1;
 s.newsH02Incident=null; // Baseline $1/edge; persistent H02 tariff is verified separately in core.
 s.newsDeck=s.newsDeck.filter(id=>id!=='E03');s.newsE03Aid={round,claims:[]};
 s.developmentComplete=false;s.developmentPlayer=0;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=[0,0,0];s.players.forEach((p,i)=>{
  p.capital=60;p.prestige=0;p.influence=[5,9,13][i];
  p.workers.forEach(w=>{w.used=false;w.jailed=false;w.districtId='civic';});p.workersLeft=3;
 });
 s.activeWorkerId=s.players[0].workers[0].id;
 s.constructions=warehouses;s.selectedDistrictId=district;
 s.haulersUsed=[];s.lastDeliveryKey=null;
 s.logisticsSupply.southernpacific=['Lumber','Steel','Masonry','Steel'];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,source})=>localStorage.setItem(key,JSON.stringify(source)),{key:KEY,source:s});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function news(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
async function deliveryFromWarehouse(page,vp,id='W1',types=['Lumber','Steel']){
 await page.locator('#actionDelivery').click();
 if(vp.width<1000){
  // Use real fallback for overlapping warehouse map tokens.
  await expect(page.locator('#deliveryShowSourceList')).toBeVisible();
  await page.locator('#deliveryShowSourceList').click();
 }
 await page.locator('[data-ds-wh="'+id+'"]').click();
 await page.locator('[data-hauler="dray2a"]').click();
 for(const type of types)await page.locator('[data-load="'+type+'"]').click();
 await page.locator('#deliveryBeginRoute').click();
}
test.beforeEach(async({page})=>{
 page.on('pageerror',e=>{throw e;});
 page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const vp of views){
 test('E03 two visible tokens, warehouse-only claim, real rewards & saved state '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game({warehouses:[store('W1','outerrichmond',['Lumber','Steel'])]});
  await seed(page,s);
  await expect(page.locator('[data-e03-token]')).toHaveCount(2);
  await news(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ЗАПАДНЫЕ КВАРТАЛЫ ПРОСЯТ ПОМОЩИ!');
  await expect(page.locator('#newsSheetContent .news-forecast > b')).toHaveText('ПОМОЩЬ ЗАПАДНЫМ КВАРТАЛАМ');
  await expect(page.locator('.news-e03-panel')).toContainText('+$13, +2 VP и +1 Influence');
  await expect(page.locator('[data-e03-store-district="outerrichmond"]')).toBeEnabled();
  const before=await saved(page);
  await page.locator('[data-e03-store-district="outerrichmond"]').first().click();
  const after=await saved(page);
  expect(after.newsE03Aid.claims).toHaveLength(1);
  expect(after.newsE03Aid.claims[0]).toMatchObject({playerId:0,districtId:'outerrichmond',
    materials:['Lumber','Steel'],via:'warehouse',capital:13,prestige:2,influenceSteps:1});
  expect(after.players[0].capital).toBe(before.players[0].capital+13);
  expect(after.players[0].prestige).toBe(before.players[0].prestige+2);
  expect(after.players[0].influence).toBe(before.players[0].influence+1);
  expect(after.players[0].workersLeft).toBe(before.players[0].workersLeft);
  expect(after.lastDeliveryKey).toBe(before.lastDeliveryKey);
  expect(after.constructions[0].warehouseInventory).toEqual([]);
  await expect(page.locator('.news-e03-token.claimed')).toHaveCount(1);
  await expect(page.locator('.e03-map-token.claimed')).toHaveCount(1);
  await page.reload();await news(page,vp);
  expect((await saved(page)).newsE03Aid.claims).toHaveLength(1);
  await expect(page.locator('[data-e03-store-district="outerrichmond"]')).toHaveCount(0);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(3);
 });
}
for(const vp of [{width:390,height:844},{width:932,height:430}]){
 test('E03 genuine quick delivery, local own warehouse source, aid unload and reward '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);await seed(page,game());
  const before=await saved(page);
  await deliveryFromWarehouse(page,vp);
  await expect(page.locator('#deliveryLockRoute')).toBeEnabled();
  await page.locator('#deliveryLockRoute').click();
  await expect(page.locator('.e03-map-token[data-e03-token="sunset"]')).toBeVisible();
  await expect(page.locator('[data-e03-unload-target="sunset"]')).toBeVisible();
  await page.locator('[data-e03-unload-target="sunset"]').click();
  await expect(page.locator('[data-drop-kind="e03-aid"][data-drop-type="Lumber"]')).toBeEnabled();
  await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Lumber"]').click();
  await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Steel"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const result=await saved(page);
  expect(result.newsE03Aid.claims).toHaveLength(1);
  expect(result.newsE03Aid.claims[0]).toMatchObject({districtId:'sunset',via:'delivery',capital:13,prestige:2});
  expect(result.players[0].capital).toBe(before.players[0].capital+13);
  expect(result.players[0].prestige).toBe(2);
  expect(result.constructions[0].warehouseInventory).toEqual([]);
  expect(result.lastDeliveryKey).toBeTruthy();
  expect(result.activationMainActionUsed).toBe(false);
  expect(result.players[0].workersLeft).toBe(3);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  expect(overflow).toBeLessThanOrEqual(3);
 });
}
test('E03 mobile mixed new cargo and one local warehouse cube is one atomic handoff',async({page})=>{
 const vp={width:390,height:844};
 await page.setViewportSize(vp);
 await seed(page,game({warehouses:[store('SOURCE','sunset',['Lumber']),store('STOCK','sunset',['Steel'])]}));
 await deliveryFromWarehouse(page,vp,'SOURCE',['Lumber']);
 await page.locator('#deliveryLockRoute').click();
 await expect(page.locator('[data-e03-unload-target="sunset"]')).toBeVisible();
  await page.locator('[data-e03-unload-target="sunset"]').click();
 await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Lumber"]').click();
 await expect(page.locator('[data-e03-warehouse="STOCK"][data-e03-warehouse-type="Steel"]')).toBeEnabled();
 await page.locator('[data-e03-warehouse="STOCK"][data-e03-warehouse-type="Steel"]').click();
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 await page.locator('#deliveryConfirm').click();
 const after=await saved(page);
 expect(after.newsE03Aid.claims[0]).toMatchObject({via:'delivery-and-warehouse',
   materials:['Lumber','Steel'],districtId:'sunset'});
 expect(after.constructions.find(x=>x.id==='SOURCE').warehouseInventory).toEqual([]);
 expect(after.constructions.find(x=>x.id==='STOCK').warehouseInventory).toEqual([]);
 expect(after.players[0].capital).toBe(73);
});
test('E03 desktop long-haul from Southern Pacific to Outer Richmond uses real roadmap and price',async({page})=>{
 const vp={width:1366,height:768},s=game({warehouses:[]});
 await page.setViewportSize(vp);await seed(page,s);
 const bfs=(from,to)=>{
  const q=[[from]],visited=new Set([from]);
  for(let i=0;i<q.length;i++){
   const path=q[i];if(path.at(-1)===to)return path;
   for(const next of deliveryNeighbors(path.at(-1)))if(!visited.has(next)){visited.add(next);q.push([...path,next]);}
  }throw Error('no path');
 };
 const road=bfs('soma','outerrichmond');
 await page.locator('#actionDelivery').click();
 await page.locator('[data-ds-node="southernpacific"]').click();
 await page.locator('[data-hauler="dray2a"]').click();
 await page.locator('[data-load="Lumber"]').click();
 await page.locator('[data-load="Steel"]').click();
 await page.locator('#deliveryBeginRoute').click();
 for(const districtId of road.slice(1))await page.locator('[data-route-next="'+districtId+'"]').click();
 await expect(page.locator('[data-drop-kind="e03-aid"][data-drop-type="Lumber"]')).toBeEnabled();
 await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Lumber"]').click();
 await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Steel"]').click();
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 const before=await saved(page);
 await page.locator('#deliveryConfirm').click();
 const after=await saved(page);
 expect(after.newsE03Aid.claims[0]).toMatchObject({districtId:'outerrichmond',via:'delivery'});
 expect(after.players[0].capital).toBe(before.players[0].capital+13-(RESOURCE_PRICES.Lumber+RESOURCE_PRICES.Steel+road.length-1));
 expect(after.logisticsSupply.southernpacific).toEqual(['Masonry','Steel']);
});
test('E03 invalid missing stock and wrong district never show warehouse claim; legacy archive preserved',async({page})=>{
 const vp={width:390,height:844},s=game({round:2,
 warehouses:[store('W','innersunset',['Lumber','Steel']),store('F','sunset',['Lumber','Steel'],1),
  store('I','outerrichmond',['Lumber','Steel'],0,'under-construction')]});
 s.newsArchive=[{year:1900,round:1,cardId:'E03',title:'Грузы и новые заказы',
  entries:[{playerId:0,districtIds:['soma'],actual:2}],changes:{0:{capital:2}}}];
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await expect(page.locator('[data-e03-store-district]')).toHaveCount(0);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Грузы и новые заказы');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции E03');
});

test('E03 browser delivery displays and charges persistent H02 double road tariff',async({page})=>{
 const s=game({warehouses:[]});
 s.newsH02Incident=createH02Incident(1,()=>.3);
 await page.setViewportSize({width:1366,height:768});
 await seed(page,s);
 const queue=[['soma']],seen=new Set(['soma']);
 let road;
 for(let i=0;i<queue.length;i++){
  const current=queue[i];
  if(current.at(-1)==='outerrichmond'){road=current;break;}
  for(const next of deliveryNeighbors(current.at(-1))){
   if(!seen.has(next)){seen.add(next);queue.push([...current,next]);}
  }
 }
 expect(road).toBeTruthy();
 const expectedCost=RESOURCE_PRICES.Lumber+RESOURCE_PRICES.Steel+2*(road.length-1);
 await page.locator('#actionDelivery').click();
 await page.locator('[data-ds-node="southernpacific"]').click();
 await page.locator('[data-hauler="dray2a"]').click();
 await page.locator('[data-load="Lumber"]').click();
 await page.locator('[data-load="Steel"]').click();
 await page.locator('#deliveryBeginRoute').click();
 for(const districtId of road.slice(1))await page.locator('[data-route-next="'+districtId+'"]').click();
 await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Lumber"]').click();
 await page.locator('[data-drop-kind="e03-aid"][data-drop-type="Steel"]').click();
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 await expect(page.locator('#deliveryConfirm')).toHaveText('Подтвердить · $'+expectedCost);
 const before=await saved(page);
 await page.locator('#deliveryConfirm').click();
 const after=await saved(page);
 expect(after.newsE03Aid.claims).toHaveLength(1);
 expect(after.newsE03Aid.claims[0]).toMatchObject({districtId:'outerrichmond',via:'delivery',capital:13,prestige:2,influenceSteps:1});
 expect(after.players[0].capital).toBe(before.players[0].capital+13-expectedCost);
 expect(after.players[0].prestige).toBe(before.players[0].prestige+2);
 expect(after.logisticsSupply.southernpacific).toEqual(['Masonry','Steel']);
 expect(after.lastDeliveryKey).toBeTruthy();
});
