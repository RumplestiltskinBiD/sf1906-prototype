import {test,expect} from '@playwright/test';
const storage='sf1906_phase1_ui_v030a';
test.beforeEach(async({page})=>{
  page.on('pageerror',err=>{throw err;});
  page.on('console',msg=>{if(msg.type()==='error')throw Error(msg.text());});
});
async function seededGame(page,{news='C01',phase='development',constructions=[]}={}){
  await page.goto('/');
  await page.evaluate(async ({storage,news,phase,constructions})=>{
    const G=await import('/game-core.js');
    const s=G.createInitialState({rng:()=>0.45});
    s.newsCurrentIds=[news];
    s.newsDeck=s.newsDeck.filter(id=>id!==news);
    s.phase=phase;s.view='city';
    s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
    s.players[0].capital=30;
    s.activeWorkerId=s.players[0].workers[0].id;
    s.constructions=constructions.map((c,i)=>({
      id:'E2E'+i,projectId:c.projectId,districtId:c.districtId,playerId:c.playerId,
      status:'complete',startedRound:1,completedRound:1,
      materialsDelivered:[],warehouseInventory:[]
    }));
    localStorage.setItem(storage,JSON.stringify(s));
  },{storage,news,phase,constructions});
  await page.reload();
}
test('newspaper is visible across market and map; issue opens on demand',async({page})=>{
  await page.goto('/');
  await expect(page.locator('#newsStrip')).toBeVisible();
  await expect(page.locator('#newsStripLabel')).toContainText('1900');
  await expect(page.locator('#newsSheet')).toBeHidden();
  await page.locator('#newsOpenBtn').click();
  await expect(page.locator('#newsSheet')).toBeVisible();
  await expect(page.locator('#newsSheetContent .news-headline')).toBeVisible();
  await expect(page.locator('#newsSheetContent .news-forecast')).toContainText(/конец года/i);
  await page.locator('#newsCloseBtn').click();
  await expect(page.locator('#newsSheet')).toBeHidden();
  await page.locator('.nav-btn[data-view="city"]').click();
  await page.locator('#callBuildingNode').click();
  await expect(page.locator('#newsSheet')).toBeVisible();
});
test('police article forecasts correct protected and exposed locations on game map',async({page})=>{
  await seededGame(page,{news:'C01',constructions:[
    {projectId:'shops',districtId:'financial',playerId:0},
    {projectId:'shops',districtId:'mission',playerId:1},
    {projectId:'police',districtId:'financial',playerId:2}
  ]});
  await page.locator('#newsMapBtn').click();
  await expect(page.locator('[data-district="financial"]')).toHaveClass(/news-protected/);
  await expect(page.locator('[data-district="mission"]')).toHaveClass(/news-threat/);
  await page.locator('#newsOpenBtn').click();
  await expect(page.locator('#newsSheetContent')).toContainText('Районов под угрозой: 1');
  await expect(page.locator('#newsSheetContent')).toContainText('с защитой: 1');
});
test('mobile emergency measures use map tap, ordinary worker movement and existing action',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await seededGame(page,{news:'C01',constructions:[{projectId:'shops',districtId:'civic',playerId:1}]});
  await page.locator('#newsOpenBtn').click();
  await page.locator('#newsEmergencyStart').click();
  await expect(page.locator('#newsEmergencyCancel')).toBeVisible();
  await expect(page.locator('#newsSheet')).toBeHidden();
  await page.locator('[data-district="civic"] path').click();
  const s=await page.evaluate(storage=>JSON.parse(localStorage.getItem(storage)),storage);
  expect(s.newsEmergency.civic).toBeTruthy();
  expect(s.activationMainActionUsed).toBe(true);
  expect(s.players[0].capital).toBe(29);
  expect(s.players[0].workers[0].used).toBe(true);
  await expect(page.locator('#newsEmergencyCancel')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(393);
  await page.locator('#newsOpenBtn').click();
  await expect(page.locator('#newsSheetContent')).toContainText('ЗАЩИЩЕНО');
});
test('news settles once on end of year, next issue and archive remain accessible',async({page})=>{
  await seededGame(page,{news:'E02',constructions:[{projectId:'shops',districtId:'financial',playerId:0}]});
  await page.evaluate(storage=>{
    const s=JSON.parse(localStorage.getItem(storage));
    s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
    s.developmentComplete=true;s.developmentPlayer=null;
    localStorage.setItem(storage,JSON.stringify(s));
  },storage);
  await page.reload();
  await page.locator('#endRoundBtn').click();
  await expect(page.locator('#newsStripLabel')).toContainText('1901');
  const s=await page.evaluate(storage=>JSON.parse(localStorage.getItem(storage)),storage);
  expect(s.round).toBe(2);
  expect(s.newsArchive).toHaveLength(1);
  expect(s.newsArchive[0].cardId).toBe('E02');
  expect(s.newsArchive[0].changes[0].capital).toBe(2);
  await page.locator('#newsOpenBtn').click();
  await page.locator('[data-news-archive="0"]').click();
  await expect(page.locator('#newsSheetContent')).toContainText('Реальные результаты');
  await expect(page.locator('#newsSheetContent')).toContainText('Торговля на пике');
});
test('phone landscape news sheet fits screen, closes on Escape, never causes page overflow',async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await page.goto('/');
  await page.locator('#newsOpenBtn').click();
  const dim=await page.evaluate(()=>{
    const el=document.querySelector('#newsSheet');
    const r=el.getBoundingClientRect();
    return {width:window.innerWidth,height:window.innerHeight,
      pageWidth:document.documentElement.scrollWidth,
      sheetWidth:r.width,sheetHeight:r.height,top:r.top};
  });
  expect(dim.pageWidth).toBeLessThanOrEqual(dim.width+3);
  expect(dim.sheetWidth).toBeLessThanOrEqual(dim.width-8);
  expect(dim.sheetHeight).toBeLessThanOrEqual(dim.height);
  await page.keyboard.press('Escape');
  await expect(page.locator('#newsSheet')).toBeHidden();
});
