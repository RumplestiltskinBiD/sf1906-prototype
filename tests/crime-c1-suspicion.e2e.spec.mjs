import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
const seed=async(page,s)=>{
  await page.goto('/');
  // Seed only once: addInitScript would overwrite gameplay state again on every reload.
  await page.evaluate(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
  await page.reload();
};
async function saved(page){
  return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
}
for(const viewport of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
 test('C1.1 legacy save suspicion migration and reload '+viewport.width+'x'+viewport.height,async({page})=>{
  const s=createInitialState({rng:()=>0.1});
  delete s.players[0].suspicion;
  s.players[1].suspicion=2;
  s.players[2].suspicion=999;
  s.players[0].workers[0].jailed=true;
  s.players[0].workers[0].arrestedRound=1;
  await page.setViewportSize(viewport);
  await seed(page,s);
  let after=await saved(page);
  expect(after.players.map(p=>p.suspicion)).toEqual([0,2,3]);
  expect(after.players[0].workers[0].jailed).toBe(true);
  await expect(page.locator('#playersBar .player-pill')).toHaveCount(3);
  // C1.1 is intentionally data-only: there must not be a new intrusive sheet.
  await expect(page.locator('#yearTransitionSheet')).toBeHidden();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  await page.reload();
  after=await saved(page);
  expect(after.players.map(p=>p.suspicion)).toEqual([0,2,3]);
  expect(after.players[0].workers[0].jailed).toBe(true);
 });
}
test('C1.1 shared core mutation persists over a real page reload without adding a new UI action',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await seed(page,createInitialState({rng:()=>0.1}));
 const response=await page.evaluate(async key=>{
  const {changeSuspicion}=await import('./game-core.js');
  const st=JSON.parse(localStorage.getItem(key));
  const changed=changeSuspicion(st,0,3);
  localStorage.setItem(key,JSON.stringify(st));
  return changed;
 },KEY);
 expect(response).toEqual({ok:true,playerId:0,from:0,to:3,change:3});
 await page.reload();
 let s=await saved(page);
 expect(s.players.map(p=>p.suspicion)).toEqual([3,0,0]);
 await page.reload();
 s=await saved(page);
 expect(s.players.map(p=>p.suspicion)).toEqual([3,0,0]);
 await expect(page.locator('#playersBar .player-pill')).toHaveCount(3);
});
