import {test,expect} from '@playwright/test';
import {createInitialState,ensureNewspaper,projectById,LOGISTICS_NODES} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
const stock=()=>({
 broadway:['Lumber','Masonry','Steel'],
 pacificmail:['Steel','Lumber','Masonry','Steel'],
 southernpacific:['Masonry','Steel','Lumber','Masonry'],
 chinabasin:['Masonry','Lumber','Steel','Masonry'],
 unioniron:['Steel','Lumber']
});
function game({roll=1,withWarehouse=false}={}){
 const s=createInitialState({rng:()=>.39});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.newsCurrentIds=['F03'];
 s.newsF03Incident=null;s.newsDeck=s.newsDeck.filter(x=>x!=='F03');
 s.logisticsSupply=stock();s.players.forEach(p=>{p.capital=70;p.prestige=0;});
 s.constructions=withWarehouse?[{id:'W1',playerId:0,projectId:'warehouse',
   districtId:'soma',status:'complete',
   materialsDelivered:[...projectById('warehouse').materials],
   warehouseInventory:[],startedRound:1,completedRound:1}]:[];
 ensureNewspaper(s,{rng:()=> (roll-.5)/6});
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
for(const viewport of sizes){
 test('F03 D6=1 immediately closes Broadway, redistributes supply on map/news and persists '+viewport.width+'x'+viewport.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(viewport);await seed(page,game());
  const closed=page.locator('[data-delivery-node="broadway"]');
  await expect(closed).toHaveClass(/f03-port-closed/);
  await expect(closed).toContainText('ПОЖАР');
  await expect(closed.locator('.node-resource')).toHaveCount(0);
  await expect(page.locator('[data-delivery-node="pacificmail"] .node-resource')).toHaveCount(5);
  await expect(page.locator('[data-delivery-node="chinabasin"] .node-resource')).toHaveCount(5);
  await expect(page.locator('[data-delivery-node="unioniron"] .node-resource')).toHaveCount(3);
  await expect(page.locator('[data-delivery-node="southernpacific"] .node-resource')).toHaveCount(4);
  await openNews(page,viewport);
  await expect(page.locator('.news-headline')).toHaveText('ПОЖАР ПАРАЛИЗОВАЛ ОДИН ИЗ ПОРТОВ ГОРОДА!');
  await expect(page.locator('.news-f03-panel')).toContainText('Broadway Wharf');
  await expect(page.locator('.news-f03-panel')).toContainText('D6: 1');
  await expect(page.locator('.news-f03-panel')).toContainText('Перенаправлено 3 куб.');
  await expect(page.locator('.news-f03-panel')).toContainText('Южная железная дорога не затронута');
  await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
  await expect(page.locator('[data-f02-kind]')).toHaveCount(0);
  const value=await read(page);
  expect(value.newsF03Incident.roll).toBe(1);
  expect(value.newsF03Incident.portId).toBe('broadway');
  expect(value.logisticsSupply.broadway).toEqual([]);
  expect(Object.values(value.logisticsSupply).flat()).toHaveLength(17);
  const before=JSON.stringify(value.newsF03Incident);
  await page.reload();
  await expect(page.locator('[data-delivery-node="broadway"]')).toHaveClass(/f03-port-closed/);
  expect(JSON.stringify((await read(page)).newsF03Incident)).toBe(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}
for(const viewport of sizes.slice(0,2)){
 test('F03 closed port cannot enter delivery source selection '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await seed(page,game());
  await page.locator('#actionDelivery').click();
  await page.locator('[data-delivery-node="broadway"]').click();
  await expect(page.locator('[data-hauler="standard"]')).toHaveCount(0);
  await expect(page.locator('[data-delivery-node="pacificmail"]')).toBeVisible();
  const s=await read(page);
  expect(s.logisticsSupply.broadway).toEqual([]);
  expect(s.newsF03Incident.portId).toBe('broadway');
  expect(s.players[0].capital).toBe(70);
 });
}
test('F03 actual receiving-port delivery consumes the re-routed material without rerunning the fire',async({page})=>{
 const s=game({roll:1,withWarehouse:true});
 const material=s.logisticsSupply.pacificmail[0],received=s.logisticsSupply.pacificmail.length;
 s.activeWorkerId=null;
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
 let now=await read(page);
 expect(now.constructions[0].warehouseInventory).toEqual([material]);
 expect(now.logisticsSupply.pacificmail).toHaveLength(received-1);
 expect(now.logisticsSupply.broadway).toEqual([]);
 expect(now.newsF03Incident.redistributed).toBe(3);
 const after=JSON.stringify(now.logisticsSupply);
 await page.reload();
 now=await read(page);
 expect(JSON.stringify(now.logisticsSupply)).toBe(after);
 expect(now.newsF03Incident.portId).toBe('broadway');
 await expect(page.locator('[data-delivery-node="broadway"]')).toHaveClass(/f03-port-closed/);
});
test('F03 end year has no owner fines, restores every port next year, and archives the exact redistribution',async({page})=>{
 const s=game({roll:2});
 s.newsDeck=['E02',...s.newsDeck.filter(x=>x!=='E02')];
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentComplete=true;s.developmentPlayer=null;
 const prior=s.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}));
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await read(page);
 expect(now.round).toBe(2);
 expect(now.newsArchive).toHaveLength(1);
 expect(now.newsArchive[0].f03.portId).toBe('pacificmail');
 expect(now.newsArchive[0].f03.roll).toBe(2);
 expect(now.newsArchive[0].f03.redistributed).toBe(4);
 expect(now.newsArchive[0].entries).toEqual([]);
 expect(now.newsArchive[0].changes).toEqual({});
 expect(now.players.map(p=>({capital:p.capital,influence:p.influence,prestige:p.prestige}))).toEqual(prior);
 expect(now.newsF03Incident).toBeNull();
 for(const node of LOGISTICS_NODES)expect(now.logisticsSupply[node.id]).toHaveLength(node.throughput);
 await expect(page.locator('.f03-port-closed')).toHaveCount(0);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Pacific Mail');
 await expect(page.locator('#newsSheetContent')).toContainText('Перенаправлено 4 куб.');
 await page.reload();
 expect((await read(page)).newsArchive).toHaveLength(1);
});
test('F03 legacy news archive keeps old headline and losses from earlier saves',async({page})=>{
 const s=game();s.round=2;s.newsCurrentIds=['E02'];s.newsF03Incident=null;
 s.newsArchive=[{round:1,year:1900,cardId:'F03',title:'Горючие товары за деревянными дверями',
  category:'Пожар',entries:[{playerId:1,districtIds:['financial'],actual:-2,defended:false}],
  changes:{1:{capital:-2,influence:0,prestige:0}},serviceRecognition:[],emergency:{}}];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await openNews(page,{width:1366,height:768});
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Горючие товары за деревянными дверями');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции F03');
 await expect(page.locator('#newsSheetContent')).not.toContainText('Перенаправлено');
 const now=await read(page);
 expect(now.newsArchive[0].changes['1'].capital).toBe(-2);
 expect(now.newsArchive[0].f03).toBeUndefined();
});
