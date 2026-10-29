import {test,expect} from '@playwright/test';
import {createInitialState,projectById,MAX_ROUNDS} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1440,height:900}];
function scenario({stars=0,influence=0,round=2,owner=0,developer=1}={}){
 const s=createInitialState({rng:()=>0.1});
 s.round=round;s.phase='development';s.view='city';s.developmentComplete=false;
 s.developmentPlayer=developer;s.developmentSlotsUsed=[0,0,0];s.activationMainActionUsed=false;
 const p=s.players[owner];p.capital=10;p.influence=influence;p.suspicion=stars;
 s.constructions=[{id:'SL',projectId:'sailorlodging',playerId:owner,districtId:'northbeach',
  status:'complete',startedRound:1,completedRound:1,
  materialsDelivered:[...projectById('sailorlodging').materials],warehouseInventory:[]}];
 s.pendingSailorRecruitments=['SL'];
 return s;
}
async function enter(page,state){
 await page.goto('/');
 await page.evaluate(({key,s})=>localStorage.setItem(key,JSON.stringify(s)),{key:KEY,s:state});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function withinScreen(page,width,height){
 const rect=await page.locator('#sailorRecruitmentSheet').boundingBox();
 expect(rect.x).toBeGreaterThanOrEqual(-2);
 expect(rect.y).toBeGreaterThanOrEqual(-2);
 expect(rect.x+rect.width).toBeLessThanOrEqual(width+2);
 expect(rect.y+rect.height).toBeLessThanOrEqual(height+2);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
}

for(const size of sizes){
 test('sailors E off-turn illegal +$6 +1 ★, with no Influence reduction '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(size);
  const s=scenario({stars:2,influence:0});
  await enter(page,s);
  const sheet=page.locator('#sailorRecruitmentSheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Незаконная вербовка · +$6 / +1 ★');
  await withinScreen(page,size.width,size.height);
  await expect(page.locator('[data-recruit-mode="illegal"]')).toBeEnabled();
  await page.reload();
  await expect(sheet).toBeVisible();
  await page.locator('[data-recruit-mode="illegal"]').click();
  await expect(sheet).toBeHidden();
  const result=await saved(page);
  expect(result.players[0].capital).toBe(16);
  expect(result.players[0].influence).toBe(0);
  expect(result.players[0].suspicion).toBe(3);
  expect(result.players[0].workers).toHaveLength(3);
  expect(result.players[0].workers.filter(w=>w.jailed)).toHaveLength(0);
  expect(result.pendingSailorRecruitments).toEqual([]);
  expect(result.constructions[0].sailorRecruitmentRound).toBe(2);
  expect(result.developmentPlayer).toBe(1,'owner did not become active developer');
  await page.reload();
  expect((await saved(page)).players[0].suspicion).toBe(3);
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
 });
}
for(const size of sizes.slice(0,2)){
 test('sailors E at ★★★ require owner culprit, then +$6 arrest/−3 VP and suspicion 0 '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(size);
  const s=scenario({stars:3,influence:0,round:MAX_ROUNDS});
  s.players[0].workers[0].used=true;s.players[0].workersLeft=2;
  await enter(page,s);
  const sheet=page.locator('#sailorRecruitmentSheet');
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Сначала получите $6, затем подозрение обнулится');
  await expect(sheet.locator('[data-recruit-mode="illegal"]')).toHaveCount(3);
  await expect(sheet.locator('[data-arrest-worker="P1W1"]')).toBeVisible();
  await expect(sheet.locator('[data-arrest-worker="P1W2"]')).toBeVisible();
  await withinScreen(page,size.width,size.height);
  await page.locator('[data-recruit-mode="illegal"][data-arrest-worker="P1W1"]').click();
  await expect(sheet).toBeHidden();
  const after=await saved(page);
  expect(after.players[0].capital).toBe(16);
  expect(after.players[0].influence).toBe(0);
  expect(after.players[0].prestige).toBe(-3);
  expect(after.players[0].suspicion).toBe(0);
  expect(after.players[0].workers[0]).toMatchObject({jailed:true,arrestedRound:MAX_ROUNDS});
  expect(after.players[0].workersLeft).toBe(2);
  await page.reload();
  expect((await saved(page)).players[0].prestige).toBe(-3);
  expect((await saved(page)).players[0].workers[0].jailed).toBe(true);
  await expect(sheet).toBeHidden();
  expect(errors).toEqual([]);
 });
}
test('sailors E jailed suspect cannot be selected, lawfully resolving at ★★★ never alters suspicion',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=scenario({stars:3,influence:0});
 s.players[0].workers[0].jailed=true;s.players[0].workers[0].arrestedRound=1;
 s.players[0].workersLeft=2;
 await enter(page,s);
 await expect(page.locator('[data-recruit-mode="illegal"]')).toHaveCount(2);
 await expect(page.locator('[data-arrest-worker="P1W1"]')).toHaveCount(0);
 await page.locator('[data-recruit-mode="lawful"]').click();
 let r=await saved(page);
 expect(r.players[0].capital).toBe(12);
 expect(r.players[0].suspicion).toBe(3);
 expect(r.players[0].workers.filter(w=>w.jailed)).toHaveLength(1);
 expect(r.pendingSailorRecruitments).toEqual([]);
});
test('sailors E all jailed disables illegal, leaves lawful +$2 and no new interface pane',async({page})=>{
 await page.setViewportSize({width:932,height:430});
 const s=scenario({stars:2,influence:0});
 for(const w of s.players[0].workers){w.jailed=true;w.arrestedRound=1;}
 s.players[0].workersLeft=0;
 await enter(page,s);
 const sheet=page.locator('#sailorRecruitmentSheet');
 await expect(sheet).toContainText('все представители в заключении');
 await expect(sheet.locator('[data-recruit-mode="illegal"]')).toBeDisabled();
 await expect(sheet.locator('[data-recruit-mode="lawful"]')).toBeEnabled();
 await page.locator('[data-recruit-mode="lawful"]').click();
 const r=await saved(page);
 expect(r.players[0].capital).toBe(12);
 expect(r.players[0].suspicion).toBe(2);
 expect(r.players[0].workers.filter(w=>w.jailed)).toHaveLength(3);
});
