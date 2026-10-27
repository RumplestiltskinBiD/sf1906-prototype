import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
async function loadScenario(page,s){
  await page.addInitScript(({key,value})=>{
    localStorage.setItem(key,value);
  },{key:KEY,value:JSON.stringify(s)});
  await page.goto('/');
}
function development(){
  const s=createInitialState({rng:()=>0.1});
  s.phase='development';
  s.view='city';
  s.developmentPlayer=0;
  s.developmentComplete=false;
  s.activeWorkerId=null;
  s.activationMainActionUsed=false;
  return s;
}
test('B1 legacy 0.44 save gains non-jailed metadata without worker loss',async({page})=>{
  const s=development();
  for(const p of s.players){
    for(const w of p.workers){delete w.jailed;delete w.arrestedRound;}
  }
  await loadScenario(page,s);
  const saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY));
  expect(saved.players[0].workers).toHaveLength(3);
  expect(saved.players[0].workers.every(w=>w.jailed===false&&w.arrestedRound===null)).toBe(true);
  expect(saved.players.every(p=>p.workersLeft===3)).toBe(true);
  await expect(page.locator('[data-dock-worker="P1W1"]')).toBeEnabled();
});
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
  test('B1 jailed worker appears disabled and off-map at '+viewport.width+'x'+viewport.height,async({page})=>{
    await page.setViewportSize(viewport);
    const s=development(),w=s.players[0].workers[0];
    w.jailed=true;
    w.arrestedRound=1;
    w.districtId='mission';
    s.players[0].workersLeft=3; // stale saved count must be normalized
    await loadScenario(page,s);
    const saved=JSON.parse(await page.evaluate(k=>localStorage.getItem(k),KEY));
    expect(saved.players[0].workersLeft).toBe(2);
    expect(saved.players[0].workers[0].jailed).toBe(true);
    expect(saved.players[0].workers[0].arrestedRound).toBe(1);
    await expect(page.locator('[data-dock-worker="'+w.id+'"]')).toBeDisabled();
    await expect(page.locator('[data-dock-worker="'+w.id+'"]')).toContainText('АРЕСТ');
    await expect(page.locator('[data-worker-token="'+w.id+'"]')).toHaveCount(0);
    await expect(page.locator('[data-dock-worker="P1W2"]')).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
  });
}
