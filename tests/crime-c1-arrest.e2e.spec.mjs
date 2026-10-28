import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
async function seed(page,state){
  await page.goto('/');
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(state)});
  await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
function fixture(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';s.view='city';
  s.developmentPlayer=0;s.developmentComplete=false;
  s.players[0].suspicion=3;s.players[0].influence=1;
  s.players[0].prestige=2;
  s.players[1].influence=5;s.players[2].influence=6;
  return s;
}
for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
  test('C1.2 sanctioned arrest updates visible jailed counter and persists '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    await seed(page,fixture());
    const before=await saved(page);
    const result=await page.evaluate(async key=>{
      const {arrestWorkerWithSanctions}=await import('./game-core.js');
      const s=JSON.parse(localStorage.getItem(key));
      const outcome=arrestWorkerWithSanctions(s,0,s.players[0].workers[0].id);
      localStorage.setItem(key,JSON.stringify(s));
      return {ok:outcome.ok,vpPenalty:outcome.vpPenalty,available:outcome.availableInfluenceSteps};
    },KEY);
    expect(result).toEqual({ok:true,vpPenalty:3,available:1});
    await page.reload();
    const after=await saved(page);
    expect(after.players[0].suspicion).toBe(0);
    expect(after.players[0].influence).toBe(0);
    expect(after.players[0].prestige).toBe(-1);
    expect(after.players[0].workers[0].jailed).toBe(true);
    expect(after.players[0].workersLeft).toBe(2);
    expect(after.players[0].workers.length).toBe(3);
    expect(after.yearTurnOrder).toEqual(before.yearTurnOrder);
    expect(after.players.slice(1)).toEqual(before.players.slice(1));
    const card=page.locator('.player-pill[data-office="0"]');
    if(viewport.width===1440)await expect(card.locator('.player-jailed-count')).toContainText('1');
    else await expect(card.locator('.compact-jailed-worker')).toContainText('1');
    await expect(card).toHaveAttribute('aria-label',/Арестовано 1/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
    await page.reload();
    expect((await saved(page)).players[0].prestige).toBe(-1);
  });
}
test('C1.2 successful full step penalty keeps VP and round order when seen on phone',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  const s=fixture();s.players[0].influence=5;s.players[1].influence=4;s.players[2].influence=3;
  await seed(page,s);
  const r=await page.evaluate(async key=>{
    const {arrestWorkerWithSanctions}=await import('./game-core.js');
    const st=JSON.parse(localStorage.getItem(key)),p=st.players[0];
    const result=arrestWorkerWithSanctions(st,0,p.workers[1].id);
    localStorage.setItem(key,JSON.stringify(st));
    return {vpPenalty:result.vpPenalty,influenceAfter:result.influenceAfter,steps:result.availableInfluenceSteps};
  },KEY);
  expect(r).toEqual({vpPenalty:0,influenceAfter:0,steps:3});
  await page.reload();
  const st=await saved(page);
  expect(st.players[0].prestige).toBe(2);
  expect(st.players[0].suspicion).toBe(0);
  await expect(page.locator('.player-pill[data-office="0"] .compact-jailed-worker')).toContainText('1');
});
