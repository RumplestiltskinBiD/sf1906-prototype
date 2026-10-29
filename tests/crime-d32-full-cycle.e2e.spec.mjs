import {test,expect} from '@playwright/test';
import {createInitialState,MAX_ROUNDS} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1440,height:900}];
function city(round=2){
 const s=createInitialState({rng:()=>0.1});
 s.round=round;s.phase='development';s.view='city';
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 return s;
}
function jail(s,index,arrestedRound){
 const w=s.players[0].workers[index];w.jailed=true;w.arrestedRound=arrestedRound;
 s.players[0].workersLeft=s.players[0].workers.filter(x=>!x.jailed&&!x.used).length;
 return w;
}
async function enter(page,s){
 await page.goto('/');
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:JSON.stringify(s)});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function office(page,width){
 if(width===1440)await page.locator('#officeBtn').click();
 else await page.locator('#mobileActionDock [data-mobile-action="free"]').click();
 await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
}

for(const size of sizes){
 test('D3.2 viable paid hire is visible before irreversible service pass '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=city();s.players[0].capital=7;
  for(let i=0;i<3;i++)jail(s,i,1);
  await page.setViewportSize(size);await enter(page,s);
  await expect(page.locator('.service-turn-hint')).toContainText('Доступен наём за $7');
  if(size.width===1440){
   await expect(page.locator('#actionPassRemaining')).toContainText('Пропустить найм');
  }else{
   await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toContainText('Без найма');
   await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toHaveAttribute('aria-label',/наём за \$7/);
  }
  await office(page,size.width);
  await expect(page.locator('.office-staff-roster')).toContainText('арестованы 3');
  await expect(page.locator('[data-hire-worker="P1W1"]')).toBeEnabled();
  await page.locator('[data-hire-worker="P1W1"]').click();
  const actual=await saved(page);
  expect(actual.players[0].capital).toBe(0);
  expect(actual.players[0].workers[0]).toMatchObject({jailed:false,replacementKind:'paid',replacementRound:2,districtId:'civic'});
  expect(actual.developmentSlotsUsed).toEqual([0,0,0]);
  await expect(page.locator('.office-staff-roster')).toContainText('арестованы 2');
  await page.locator('#officeDrawer [data-close-drawer]').click();
  if(size.width!==1440){
   await expect(page.locator('#mobileActionDock [data-mobile-action="main"]')).toBeVisible();
   await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toHaveCount(0);
  }else await expect(page.locator('#actionPassRemaining')).toHaveCount(0);
  await page.reload();
  await office(page,size.width);
  await expect(page.locator('[data-office-worker="P1W1"]')).toHaveAttribute('data-office-worker-status','replaced-paid');
  expect((await saved(page)).players[0].workers).toHaveLength(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
 });
}

for(const size of sizes.slice(0,2)){
 test('D3.2 service pass stays ordinary if next-year hire is not affordable '+size.width+'x'+size.height,async({page})=>{
  const s=city();s.players[0].capital=6;
  for(let i=0;i<3;i++)jail(s,i,1);
  await page.setViewportSize(size);await enter(page,s);
  await expect(page.locator('.service-turn-hint')).not.toContainText('Доступен наём за $7');
  await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toContainText('Все мои ходы');
  await office(page,size.width);
  await expect(page.locator('[data-hire-worker="P1W1"]')).toBeDisabled();
  await page.locator('#officeDrawer [data-close-drawer]').click();
  await page.locator('#mobileActionDock [data-mobile-action="service-pass"]').click();
  const final=await saved(page);
  expect(final.developmentSlotsUsed).toEqual([3,0,0]);
  expect(final.players[0].workers.every(w=>w.jailed)).toBe(true);
 });
}

for(const size of sizes){
 test('D3.2 1905 annual sheet announces arrest/final -5 VP and scores once after reload '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=city(MAX_ROUNDS);
  s.developmentComplete=true;s.developmentPlayer=null;
  s.developmentSlotsUsed=[3,3,3];
  s.players[0].capital=0;s.players[0].influence=0;s.players[0].suspicion=3;s.players[0].prestige=10;
  jail(s,0,MAX_ROUNDS);
  s.newsLastResolvedRound=MAX_ROUNDS;s.pressCampaignQueuedRound=MAX_ROUNDS;
  await page.setViewportSize(size);await enter(page,s);
  await page.locator('#endRoundBtn').click();
  const sheet=page.locator('#yearTransitionSheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('[data-crime-arrest-warning="true"]')).toContainText('влияние до 0 и −3 VP');
  await expect(sheet.locator('[data-crime-arrest-warning="true"]')).toContainText('в финале 1905 ещё −5 VP');
  await expect(page.locator('[data-crime-arrest="P1W2"]')).toBeVisible();
  await page.reload();
  await expect(sheet.locator('[data-crime-arrest-warning="true"]')).toBeVisible();
  await page.locator('[data-crime-arrest="P1W2"]').click();
  const after=await saved(page);
  expect(after.phase).toBe('finished');
  expect(after.finalPrisonPenaltyApplied).toBe(true);
  expect(after.players[0].prestige).toBe(-3,'10 -3 arrest penalty -10 for two prisoners');
  expect(after.players[0].workers.filter(w=>w.jailed)).toHaveLength(2);
  expect(after.players[0].suspicion).toBe(0);
  await expect(sheet).toBeHidden();
  await page.reload();
  expect((await saved(page)).players[0].prestige).toBe(-3);
  expect((await saved(page)).players[0].workers).toHaveLength(3);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  expect(errors).toEqual([]);
 });
}

test('D3.2 last 1905 activation allows hire only to avoid prison fine, no phantom main action',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=city(MAX_ROUNDS);
 jail(s,0,5);
 s.players[0].capital=7;
 s.players[0].workers[1].used=true;s.players[0].workers[2].used=true;
 s.players[0].workersLeft=0;
 s.developmentSlotsUsed=[2,0,0];s.activationMainActionUsed=true;
 await enter(page,s);
 await office(page,390);
 const row=page.locator('.paid-replacement-row').first();
 await expect(row).toContainText('Нового основного действия в этом году уже не будет');
 await expect(page.locator('[data-hire-worker="P1W1"]')).toBeEnabled();
 await page.locator('[data-hire-worker="P1W1"]').click();
 await page.locator('#officeDrawer [data-close-drawer]').click();
 await expect(page.locator('#mobileActionDock [data-mobile-action="end"]')).toBeVisible();
 await expect(page.locator('#mobileActionDock [data-mobile-action="main"]')).toHaveCount(0);
 await page.locator('#mobileActionDock [data-mobile-action="end"]').click();
 const after=await saved(page);
 expect(after.developmentSlotsUsed[0]).toBe(3);
 expect(after.developmentPlayer).toBe(1);
 expect(after.players[0].workers[0]).toMatchObject({jailed:false,used:false,replacementKind:'paid'});
 expect(after.players[0].capital).toBe(0);
});
