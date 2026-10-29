import {test,expect} from '@playwright/test';
import {createInitialState,restoreExpiredJailedWorkerSlots} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1440,height:900}];
function scenario(round=4){
 const s=createInitialState({rng:()=>0.1});
 s.round=round;s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.players[0].capital=20;s.players[0].suspicion=2;
 return s;
}
function arrest(s,index,round){
 const w=s.players[0].workers[index];
 w.jailed=true;w.arrestedRound=round;w.districtId='mission';
 s.players[0].workersLeft=s.players[0].workers.filter(x=>!x.used&&!x.jailed).length;
 return w;
}
async function enter(page,s){
 await page.goto('/');
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:JSON.stringify(s)});
 await page.reload();
}
async function office(page,size){
 if(size.width===1440)await page.locator('#officeBtn').click();
 else await page.locator('#mobileActionDock [data-mobile-action="free"]').click();
 await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
}
const stored=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);

for(const size of sizes){
 test('D3.1 Office shows arrest years and real paid replacement, saved on '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(size);
  const s=scenario(4);arrest(s,0,3);
  await enter(page,s);await office(page,size);
  const list=page.locator('#officeContent .office-staff-roster');
  await expect(list).toBeVisible();
  await expect(list.locator('.office-staff-row')).toHaveCount(3);
  await expect(list).toContainText('Готовы 2 · арестованы 1 · использованы 0');
  const jailed=list.locator('[data-office-worker="P1W1"]');
  await expect(jailed).toHaveAttribute('data-office-worker-status','jailed');
  await expect(jailed).toContainText('Арест 1902');
  await expect(jailed).toContainText('наём за $7: 1903 после мэрии');
  await expect(jailed).toContainText('бесплатная замена: начало 1904');
  await expect(list.locator('[data-office-worker="P1W2"]')).toContainText('Готов');
  await expect(page.locator('[data-hire-worker="P1W1"]')).toBeEnabled();
  await page.locator('[data-hire-worker="P1W1"]').click();
  const after=await stored(page);
  expect(after.players[0].workers).toHaveLength(3);
  expect(after.players[0].capital).toBe(13);
  expect(after.players[0].suspicion).toBe(2);
  expect(after.players[0].workers[0]).toMatchObject({jailed:false,arrestedRound:null,replacementKind:'paid',replacementRound:4,districtId:'civic'});
  const replaced=page.locator('#officeContent [data-office-worker="P1W1"]');
  await expect(replaced).toHaveAttribute('data-office-worker-status','replaced-paid');
  await expect(replaced).toContainText('Новый · наём за $7');
  await expect(replaced).toContainText('Заменён за $7 в 1903');
  await expect(replaced).toContainText('Civic Center');
  await expect(page.locator('#officeContent [data-hire-worker="P1W1"]')).toHaveCount(0);
  await page.reload();
  await office(page,size);
  await expect(page.locator('#officeContent [data-office-worker="P1W1"]')).toHaveAttribute('data-office-worker-status','replaced-paid');
  expect((await stored(page)).players[0].workers[0].replacementRound).toBe(4);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
  if(size.width!==1440){
   await page.locator('#officeDrawer [data-close-drawer]').click();
   await expect(page.locator('#mobileActionDock [data-mobile-action]')).toHaveCount(3);
  }
 });
}

for(const size of sizes.slice(0,2)){
 test('D3.1 Office handles 1905 and all-jailed statuses without false 1906 promises '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);
  const s=scenario(6);
  arrest(s,0,5);arrest(s,1,6);arrest(s,2,6);
  await enter(page,s);await office(page,size);
  const roster=page.locator('#officeContent .office-staff-roster');
  await expect(roster).toContainText('Готовы 0 · арестованы 3 · использованы 0');
  const former=roster.locator('[data-office-worker="P1W1"]');
  await expect(former).toContainText('наём за $7: 1905 после мэрии');
  await expect(former).toContainText('бесплатной замены до конца Фазы I нет');
  const latest=roster.locator('[data-office-worker="P1W2"]');
  await expect(latest).toContainText('Арест 1905');
  await expect(latest).toContainText('платный наём до конца Фазы I недоступен');
  await expect(latest).toContainText('бесплатной замены до конца Фазы I нет');
  await expect(page.locator('[data-hire-worker="P1W1"]')).toBeEnabled();
  await expect(page.locator('[data-hire-worker="P1W2"]')).toBeDisabled();
  await expect(page.locator('[data-hire-worker="P1W3"]')).toBeDisabled();
  await expect(page.locator('.paid-replacement-row').nth(1)).toContainText('В Фазе I наём недоступен');
  await expect(page.locator('.paid-replacement-actions')).not.toContainText('Наём с 1906');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}

test('D3.1 free automatic replacement is reported, does not pretend paid hire',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=scenario(3),w=arrest(s,0,1);
 expect(restoreExpiredJailedWorkerSlots(s,0).restored).toEqual([w.id]);
 await enter(page,s);await office(page,{width:390,height:844});
 const row=page.locator('[data-office-worker="P1W1"]');
 await expect(row).toHaveAttribute('data-office-worker-status','replaced-free');
 await expect(row).toContainText('Новый · бесплатно');
 await expect(row).toContainText('Штат пополнен бесплатно в 1902');
 await expect(row).toContainText('Civic Center');
 await expect(page.locator('#officeContent .paid-replacement-actions')).toHaveCount(0);
 await page.reload();
 await office(page,{width:390,height:844});
 await expect(page.locator('[data-office-worker="P1W1"]')).toHaveAttribute('data-office-worker-status','replaced-free');
 const x=await stored(page);
 expect(x.players[0].workers).toHaveLength(3);
 expect(x.players[0].workers[0].replacementKind).toBe('free');
});

test('D3.1 legacy saves get neutral replacement provenance, never fabricated historical hire',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=scenario(4);
 for(const p of s.players)for(const w of p.workers){delete w.replacementKind;delete w.replacementRound;}
 s.players[0].workers[0].districtId='mission';
 await enter(page,s);await office(page,{width:390,height:844});
 const row=page.locator('[data-office-worker="P1W1"]');
 await expect(row).toHaveAttribute('data-office-worker-status','ready');
 await expect(row).toContainText('Сейчас: Mission');
 await expect(row).not.toContainText('Заменён');
 const after=await stored(page);
 expect(after.players[0].workers[0].replacementKind).toBe(null);
 expect(after.players[0].workers[0].replacementRound).toBe(null);
 expect(after.players[0].workers[0].districtId).toBe('mission');
});

test('D3.1 Office player tabs keep each player staffing private',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=scenario(4);arrest(s,0,3);
 await enter(page,s);await office(page,{width:390,height:844});
 await expect(page.locator('.office-staff-roster')).toContainText('арестованы 1');
 await page.locator('#officeContent [data-office-tab="1"]').click();
 await expect(page.locator('.office-staff-roster')).toContainText('арестованы 0');
 await expect(page.locator('#officeContent [data-office-worker="P2W1"]')).toHaveAttribute('data-office-worker-status','ready');
 await expect(page.locator('#officeContent .paid-replacement-actions')).toHaveCount(0);
 await page.locator('#officeContent [data-office-tab="0"]').click();
 await expect(page.locator('.office-staff-roster')).toContainText('арестованы 1');
});
