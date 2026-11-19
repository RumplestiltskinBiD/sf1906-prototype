import {test,expect} from '@playwright/test';
import {createInitialState,fundResearch,cleanupMarket} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({funded=true}={}){
  const s=createInitialState({rng:()=>0.36});
  s.phase='development';s.developmentPlayer=0;s.developmentComplete=false;
  s.activeWorkerId=s.players[0].workers[0].id;
  s.activationMainActionUsed=false;s.players[0].capital=50;
  s.newsCurrentIds=['E02'];s.newsDeck=['H03','E01'];
  s.newsE02TradeWeek={round:1,events:[]};
  Object.assign(s.research.R05,{status:'held',holderId:0,fundedRound:null});
  if(funded)expect(fundResearch(s,0,'R05',{rng:()=>0.2}).ok).toBe(true);
  return s;
}
async function seed(page,s){
  await page.goto('/');
  await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
  await page.reload();
}
async function current(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
for(const viewport of viewports){
  test('R05 saved public forecast survives browser reload without exposing next newspaper '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const original=game(),planned=original.researchLogisticsForecast;
    await seed(page,original);
    await page.locator('#officeBtn').click();
    const now=await current(page);
    expect(now.research.R05.status).toBe('funded');
    expect(now.researchLogisticsForecast).toEqual(planned);
    const preview=await page.evaluate(async key=>{
      const G=await import('/game-core.js');
      return G.researchLogisticsForecast(JSON.parse(localStorage.getItem(key)));
    },KEY);
    expect(preview.supply).toEqual(planned.supply);
    expect(preview).not.toHaveProperty('newsDeck');
    expect(preview).not.toHaveProperty('futureNewspaper');
    expect(preview.possibleAdjustments).toEqual(['H03','F03','C02']);
    await page.reload();
    expect((await current(page)).researchLogisticsForecast).toEqual(planned);
    const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth}));
    expect(sizes.scroll).toBeLessThanOrEqual(viewport.width+3);
  });
  test('R05 held cards never reveal fake supply in a migrated mobile/desktop game '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const state=game({funded:false});
    delete state.researchLogisticsForecast;
    await seed(page,state);
    const r=await page.evaluate(async key=>{
      const G=await import('/game-core.js');
      const s=JSON.parse(localStorage.getItem(key));
      return {forecast:G.researchLogisticsForecast(s),status:s.research.R05.status};
    },KEY);
    expect(r.forecast).toBeNull();
    expect(r.status).toBe('held');
    await page.reload();
    expect((await current(page)).research.R05.status).toBe('held');
    const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth}));
    expect(sizes.scroll).toBeLessThanOrEqual(viewport.width+3);
  });
  test('R05 actual incoming H03 manifest remains auditable after browser save and future purchases '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const state=game();state.developmentComplete=true;
    state.newsDeck=['H03','E01'];
    const planned=JSON.parse(JSON.stringify(state.researchLogisticsForecast.supply));
    const result=cleanupMarket(state,{rng:()=>0.51});
    expect(result.ok).toBe(true);
    expect(state.round).toBe(2);
    expect(state.researchLogisticsArrival.planned).toEqual(planned);
    const receipt=JSON.parse(JSON.stringify(state.researchLogisticsArrival));
    state.logisticsSupply.broadway.shift();
    await seed(page,state);
    const visible=await page.evaluate(async key=>{
      const G=await import('/game-core.js');
      return G.researchLogisticsArrivalReport(JSON.parse(localStorage.getItem(key)));
    },KEY);
    expect(visible.actual).toEqual(receipt.actual);
    expect(visible.planned).toEqual(planned);
    expect(visible.adjustment).toBe('H03');
    await page.reload();
    expect((await current(page)).researchLogisticsArrival).toEqual(receipt);
    const sizes=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth}));
    expect(sizes.scroll).toBeLessThanOrEqual(viewport.width+3);
  });
}
