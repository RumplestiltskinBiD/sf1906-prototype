import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
import {RESEARCH_CARDS} from '../research-cards.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];

function oldGame(){
  const s=createInitialState({rng:()=>0.18});
  s.phase='development';s.view='city';s.developmentPlayer=0;
  s.developmentComplete=false;s.developmentSlotsUsed=[0,0,0];
  s.activationMainActionUsed=false;
  s.activeWorkerId=s.players[0].workers[0].id;
  s.players[0].capital=77;
  s.players[1].prestige=6;
  s.newsCurrentIds=['H03'];
  s.newsH01Incident=null;s.newsH02Incident=null;
  delete s.research;
  return s;
}
async function load(page,s){
  await page.goto('/');
  await page.evaluate(([key,val])=>localStorage.setItem(key,JSON.stringify(val)),[KEY,s]);
  await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
test.beforeEach(async({page})=>{
  page.on('pageerror',e=>{throw e;});
  page.on('console',e=>{if(e.type()==='error')throw Error(e.text());});
});
for(const viewport of sizes){
  test('legacy save migration and second reload preserve game without enabling research '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const old=oldGame();
    await load(page,old);
    let after=await saved(page);
    expect(Object.keys(after.research)).toEqual(RESEARCH_CARDS.map(c=>c.id));
    expect(Object.values(after.research).every(e=>e.status==='available'&&e.holderId===null&&e.fundedRound===null)).toBe(true);
    expect(after.players[0].capital).toBe(77);
    expect(after.players[1].prestige).toBe(6);
    expect(after.developmentPlayer).toBe(0);
    expect(after.players[0].workers[0].id).toBe(old.players[0].workers[0].id);
    expect(after.newsCurrentIds).toEqual(['H03']);
    expect(page.locator('[data-campus-research]')).toHaveCount(0);
    const first=JSON.stringify(after.research);
    await page.reload();
    after=await saved(page);
    expect(JSON.stringify(after.research)).toBe(first);
    expect(after.players[0].capital).toBe(77);
    expect(after.players[1].prestige).toBe(6);
    const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
    expect(size.scroll-size.width).toBeLessThanOrEqual(3);
  });
}
test('old game with multiple held and funded records is preserved, no yearly cleanup or duplicate bonuses',async({page})=>{
  const s=oldGame();
  s.round=5;
  s.research={
    R01:{status:'held',holderId:0,fundedRound:null},
    R02:{status:'held',holderId:0,fundedRound:null},
    R03:{status:'funded',holderId:2,fundedRound:3}
  };
  const original=JSON.parse(JSON.stringify(s.research));
  await load(page,s);
  const after=await saved(page);
  expect(after.research.R01).toEqual(original.R01);
  expect(after.research.R02).toEqual(original.R02);
  expect(after.research.R03).toEqual(original.R03);
  expect(after.research.R08).toEqual({status:'available',holderId:null,fundedRound:null});
  expect(after.players[0].capital).toBe(77);
  expect(after.players[1].prestige).toBe(6);
  await page.reload();
  expect((await saved(page)).research.R03.fundedRound).toBe(3);
});
