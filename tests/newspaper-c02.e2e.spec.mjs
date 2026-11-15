import {test,expect} from '@playwright/test';
import {createInitialState,applyC02Theft} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const views=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({stock=['Lumber','Masonry','Steel'],roll=1,warehouse=true,stars=0}={}){
 const s=createInitialState({rng:()=>.39});
 s.phase='development';s.view='city';s.round=1;s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=s.players[0].workers[0].id;
 s.players[0].workers[0].districtId='financial';
 s.players.forEach((p,i)=>{p.capital=25;p.influence=30-i*5;p.prestige=0;p.suspicion=0;});
 s.players[0].suspicion=stars;s.newsCurrentIds=['C02'];
 s.newsDeck=s.newsDeck.filter(x=>x!=='C02');s.newsLastResolvedRound=0;
 s.newsC02Incident=null;s.newsC01Incident=null;s.newsH01Incident=null;s.newsH02Incident=null;
 s.logisticsSupply.broadway=[...stock];
 s.logisticsSupply.pacificmail=[...stock];
 s.logisticsSupply.chinabasin=[...stock];
 s.logisticsSupply.unioniron=[...stock];
 const sequence=[(roll-.5)/6,0,0];
 const theft=applyC02Theft(s,{rng:()=>sequence.shift()??0});
 if(!theft.ok)throw Error('fixture theft failed '+theft.reason);
 s.constructions=warehouse?[{id:'WH',playerId:0,projectId:'warehouse',districtId:'northbeach',
   status:'complete',startedRound:1,completedRound:1,materialsDelivered:[],warehouseInventory:[]}]:[];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:s});
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function news(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}
for(const vp of views)test('C02 legal return is one main action, one $1, both original cubes '+vp.width+'x'+vp.height,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setViewportSize(vp);await seed(page,game());
 await expect(page.locator('[data-c02-marker="source"]')).toHaveCount(1);
 await news(page,vp);
 await expect(page.locator('.news-headline')).toHaveText('ЦЕЛАЯ ПАРТИЯ ГРУЗА БЕССЛЕДНО ИСЧЕЗЛА!');
 await expect(page.locator('.news-c02-panel')).toContainText('Broadway Wharf');
 await expect(page.locator('.news-c02-panel')).toContainText('Дерево');
 await expect(page.locator('.news-c02-panel')).toContainText('Камень');
 await expect(page.locator('[data-c02-return]')).toBeEnabled();
 await expect(page.locator('#newsEmergencyStart')).toHaveCount(0);
 await page.locator('[data-c02-return]').click();
 const s=await saved(page);
 expect(s.newsC02Incident.status).toBe('returned');
 expect(s.newsC02Incident.claim.mode).toBe('returned');
 expect(s.newsC02Incident.claimedBy).toBe(0);
 expect(s.players[0].capital).toBe(24);
 expect(s.players[0].prestige).toBe(1);
 expect(s.players[0].influence).toBe(31);
 expect(s.players[0].workers[0].used).toBe(true);
 expect(s.activationMainActionUsed).toBe(true);
 expect(s.players[0].workers[0].districtId).toBe('northbeach');
 expect([...s.logisticsSupply.broadway].sort()).toEqual(['Lumber','Masonry','Steel'].sort());
 await expect(page.locator('[data-c02-marker]')).toHaveCount(0);
 await expect(page.locator('[data-c02-return]')).toHaveCount(0);
 await expect(page.locator('[data-c02-keep]')).toHaveCount(0);
 await page.reload();await news(page,vp);
 await expect(page.locator('.news-c02-panel')).toContainText('Груз возвращён');
 expect((await saved(page)).newsC02Incident.claim.mode).toBe('returned');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
 expect(errors).toEqual([]);
});
for(const vp of [{width:390,height:844},{width:932,height:430}]){
 test('C02 illegal delivery carries both cubes atomically with true wagon and suspicion '+vp.width+'x'+vp.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(vp);await seed(page,game());
  await news(page,vp);
  await expect(page.locator('[data-c02-keep]')).toBeEnabled();
  await page.locator('[data-c02-keep]').click();
  await expect(page.locator('#newsSheet')).toBeHidden();
  await expect(page.locator('#deliveryPanel')).toContainText('Похищенная партия');
  await expect(page.locator('#deliveryPanel')).toContainText('Груз 2/');
  await expect(page.locator('#clearCargo')).toBeDisabled();
  await page.locator('[data-hauler="dray2a"]').click();
  await page.locator('#deliveryBeginRoute').click();
  await page.locator('#deliveryLockRoute').click();
  await page.locator('[data-construction-token="WH"][data-delivery-drop-target="WH"]').dispatchEvent('click');
  await expect(page.locator('[data-drop-kind="warehouse"][data-drop-id="WH"][data-drop-type="Lumber"]')).toBeEnabled();
  await page.locator('[data-drop-kind="warehouse"][data-drop-id="WH"][data-drop-type="Lumber"]').click();
  await page.locator('[data-drop-kind="warehouse"][data-drop-id="WH"][data-drop-type="Masonry"]').click();
  await expect(page.locator('#deliveryConfirm')).toBeEnabled();
  await page.locator('#deliveryConfirm').click();
  const after=await saved(page);
  expect(after.newsC02Incident.status).toBe('kept');
  expect(after.newsC02Incident.claim.mode).toBe('kept');
  expect(after.players[0].capital).toBe(24,'whole lot costs $1, small dray costs zero');
  expect(after.players[0].suspicion).toBe(1);
  expect(after.players[0].prestige).toBe(0);
  expect(after.constructions.find(c=>c.id==='WH').warehouseInventory.sort()).toEqual(['Lumber','Masonry']);
  expect(after.haulersUsed).toContain('dray2a');
  await expect(page.locator('[data-c02-marker]')).toHaveCount(0);
  await page.reload();await news(page,vp);
  await expect(page.locator('.news-c02-panel')).toContainText('Партия выкуплена');
  expect((await saved(page)).newsC02Incident.status).toBe('kept');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}
test('C02 3-star stolen delivery requires offender and arrests on completed haul',async({page})=>{
 const vp={width:390,height:844},s=game({stars:3});
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await page.locator('[data-c02-keep]').click();
 await page.locator('[data-hauler="dray2a"]').click();
 await page.locator('#deliveryBeginRoute').click();
 await page.locator('#deliveryLockRoute').click();
 await page.locator('[data-construction-token="WH"][data-delivery-drop-target="WH"]').dispatchEvent('click');
 await page.locator('[data-drop-kind="warehouse"][data-drop-type="Lumber"]').click();
 await page.locator('[data-drop-kind="warehouse"][data-drop-type="Masonry"]').click();
 await expect(page.locator('#contrabandArrestChoice')).toBeVisible();
 await expect(page.locator('#deliveryConfirm')).toBeDisabled();
 await page.locator('#contrabandArrestChoice').selectOption(s.players[0].workers[1].id);
 await expect(page.locator('#deliveryConfirm')).toBeEnabled();
 await page.locator('#deliveryConfirm').click();
 const now=await saved(page);
 expect(now.newsC02Incident.status).toBe('kept');
 expect(now.players[0].workers[1].jailed).toBe(true);
 expect(now.players[0].suspicion).toBe(0);
});
test('C02 initial port shortage disables both routes and leaves original stock intact',async({page})=>{
 const vp={width:390,height:844},s=game({stock:['Steel']});
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await expect(page.locator('.news-c02-panel')).toContainText('меньше двух материалов');
 await expect(page.locator('[data-c02-return]')).toHaveCount(0);
 await expect(page.locator('[data-c02-keep]')).toHaveCount(0);
 expect((await saved(page)).logisticsSupply.broadway).toEqual(['Steel']);
 expect((await saved(page)).newsC02Incident.status).toBe('insufficient-stock');
});
test('C02 historical old fine remains readable without creating another lot',async({page})=>{
 const vp={width:1366,height:768},s=game();
 s.round=2;s.newsCurrentIds=['E02'];s.newsC02Incident=null;
 s.newsArchive=[{round:1,year:1900,cardId:'C02',title:'Исчезают целые партии товара',
   category:'Преступность',entries:[{playerId:0,districtIds:['northbeach'],actual:-2}],
   changes:{0:{capital:-2}}}];s.newsLastResolvedRound=1;
 await page.setViewportSize(vp);await seed(page,s);await news(page,vp);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Исчезают целые партии товара');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив прежней C02');
 await expect(page.locator('#newsSheetContent')).toContainText('-2');
 expect((await saved(page)).newsC02Incident).toBeNull();
});


test('C02 unclaimed after year remains historical only, no unapproved new-year buyout',async({page})=>{
 const vp={width:390,height:844},s=game();
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.developmentComplete=true;s.developmentPlayer=null;
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 await page.setViewportSize(vp);await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const after=await saved(page);
 expect(after.round).toBe(2);
 expect(after.newsCurrentIds[0]).toBe('E02');
 expect(after.newsArchive[0].c02.unresolved).toBe(true);
 expect(after.newsArchive[0].c02.materials).toEqual(['Lumber','Masonry']);
 expect(after.newsC02Incident.status).toBe('available');
 await page.locator('.nav-btn[data-view="city"]').click();
 await expect(page.locator('[data-c02-marker]')).toHaveCount(0);
 await news(page,vp);
 await expect(page.locator('.news-c02-panel')).toHaveCount(0);
 await expect(page.locator('[data-c02-return]')).toHaveCount(0);
 await expect(page.locator('[data-c02-keep]')).toHaveCount(0);
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('исход не утверждён');
 await page.reload();
 expect((await saved(page)).newsArchive[0].c02.materials).toEqual(['Lumber','Masonry']);
});
