import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
function game({round=2,capital=20,allJailed=false,arrestedRound=1}={}){
 const s=createInitialState({rng:()=>0.1});
 s.round=round;s.phase='development';s.view='city';s.developmentPlayer=0;
 s.developmentComplete=false;s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.developmentSlotsUsed=[0,0,0];s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.players[0].capital=capital;s.players[0].suspicion=2;
 for(const w of s.players[0].workers.slice(0,allJailed?3:1)){
  w.jailed=true;w.arrestedRound=arrestedRound;w.districtId='mission';
 }
 s.players[0].workersLeft=allJailed?0:2;
 return s;
}
async function enter(page,s){
 await page.goto('/');
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:JSON.stringify(s)});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
async function openOffice(page,width){
 if(width===1440)await page.locator('#officeBtn').click();
 else await page.locator('#mobileActionDock [data-mobile-action="free"]').click();
 await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
}
for(const size of [{width:390,height:844},{width:932,height:430},{width:1440,height:900}]){
 test('D2 hires next-year prisoner from Office and creates a real main-action worker '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const s=game({allJailed:true,capital:21});
  await page.setViewportSize(size);await enter(page,s);
  const worker=page.locator('[data-dock-worker="P1W1"]');
  await expect(worker).toBeDisabled();
  await expect(page.locator('[data-worker-token="P1W1"]')).toHaveCount(0);
  await openOffice(page,size.width);
  const box=page.locator('#officeContent .paid-replacement-actions');
  await expect(box).toBeVisible();
  await expect(box.locator('[data-hire-worker]')).toHaveCount(3);
  await expect(box).toContainText('Civic Center');
  const hire=box.locator('[data-hire-worker="P1W1"]');
  await expect(hire).toBeEnabled();
  await hire.click();
  let next=await saved(page);
  expect(next.players[0].capital).toBe(14);
  expect(next.players[0].suspicion).toBe(2);
  expect(next.players[0].workers).toHaveLength(3);
  expect(next.players[0].workersLeft).toBe(1);
  expect(next.players[0].workers[0]).toMatchObject({id:'P1W1',number:1,jailed:false,
    arrestedRound:null,used:false,districtId:'civic'});
  expect(next.developmentSlotsUsed).toEqual([0,0,0]);
  await expect(page.locator('#playersBar .player-pill[data-office="0"] .suspicion-stars')).toHaveText('★★☆');
  await expect(page.locator('#playersBar .player-pill[data-office="0"] .compact-jailed-worker, #playersBar .player-pill[data-office="0"] .player-jailed-count')).toContainText('2');
  await expect(box.locator('[data-hire-worker="P1W1"]')).toHaveCount(0);
  await page.locator('#officeDrawer [data-close-drawer]').click();
  await expect(worker).toBeEnabled();
  await expect(page.locator('[data-worker-token="P1W1"]')).toHaveCount(1);
  if(size.width!==1440){
   await expect(page.locator('#mobileActionDock [data-mobile-action="main"]')).toBeVisible();
   await expect(page.locator('#mobileActionDock [data-mobile-action="service-pass"]')).toHaveCount(0);
   await page.locator('#mobileActionDock [data-mobile-action="main"]').click();
  }
  if(size.width===1440){
   await expect(page.locator('[data-select-worker="P1W1"]')).toBeEnabled();
   await page.locator('[data-select-worker="P1W1"]').click();
  }else await worker.click();
  await expect(page.locator('#actionRaiseCapital')).toBeEnabled();
  await page.locator('#actionRaiseCapital').click();
  // Raise Capital is spatial: click the new employee's Civic Center origin.
  await page.locator('[data-district="civic"]').click();
  next=await saved(page);
  expect(next.activationMainActionUsed).toBe(true);
  expect(next.players[0].workers[0].used).toBe(true);
  expect(next.players[0].workers[0].districtId).toBe('civic');
  expect(next.players[0].capital).toBe(17);
  expect(next.developmentSlotsUsed).toEqual([0,0,0]);
  await page.reload();
  next=await saved(page);
  expect(next.players[0].workers[0].jailed).toBe(false);
  expect(next.players[0].capital).toBe(17);
  expect(next.players[0].workers).toHaveLength(3);
  expect(errors).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(2);
 });
}

for(const size of [{width:390,height:844},{width:932,height:430}]){
 test('D2 same-year arrest has disabled hire; insufficient funds blocks next year '+size.width+'x'+size.height,async({page})=>{
  await page.setViewportSize(size);
  const s=game({round:2,capital:6,arrestedRound:2});
  await enter(page,s);await openOffice(page,size.width);
  const row=page.locator('.paid-replacement-row').first();
  await expect(row).toContainText('Наём с 1902 года');
  await expect(row.locator('[data-hire-worker]')).toBeDisabled();
  await expect(page.locator('#officeContent .office-suspicion-details')).toContainText('★★☆');
  const before=await saved(page);
  await page.reload();
  expect((await saved(page)).players[0].workers[0].jailed).toBe(true);
  expect((await saved(page)).players[0].capital).toBe(before.players[0].capital);
  await enter(page,game({round:2,capital:6,arrestedRound:1}));
  await openOffice(page,size.width);
  await expect(page.locator('.paid-replacement-row').first()).toContainText('Нужно $7');
  await expect(page.locator('[data-hire-worker="P1W1"]')).toBeDisabled();
  expect((await saved(page)).players[0].capital).toBe(6);
 });
}
test('D2 city hall and rival turn cannot trigger hiring, own service turn can',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game({allJailed:true,capital:7});
 s.developmentPlayer=1;
 await enter(page,s);
 await page.locator('#playersBar .player-pill[data-office="0"]').click();
 await expect(page.locator('[data-hire-worker="P1W1"]')).toBeDisabled();
 await expect(page.locator('.paid-replacement-actions')).toContainText('Только в собственную активацию');
 await page.locator('#officeDrawer [data-close-drawer]').click();
 const before=await saved(page);
 expect(before.players[0].workers.every(w=>w.jailed)).toBe(true);
 s.phase='declare';s.developmentPlayer=null;s.view='hall';
 await enter(page,s);
 await page.locator('#playersBar .player-pill[data-office="0"]').click();
 await expect(page.locator('[data-hire-worker="P1W1"]')).toBeDisabled();
});
test('D2 all three may be hired, but without payment repeat they never multiply',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await enter(page,game({allJailed:true,capital:21}));
 await openOffice(page,390);
 for(const id of ['P1W1','P1W2','P1W3'])await page.locator('[data-hire-worker="'+id+'"]').click();
 const after=await saved(page);
 expect(after.players[0].capital).toBe(0);
 expect(after.players[0].workers).toHaveLength(3);
 expect(after.players[0].workersLeft).toBe(3);
 expect(after.players[0].workers.every(w=>!w.jailed&&w.districtId==='civic')).toBe(true);
 await expect(page.locator('.paid-replacement-actions')).toHaveCount(0);
 await page.reload();
 expect((await saved(page)).players[0].workers).toHaveLength(3);
});
test('D2 hire in 1905 removes prisoner from final penalty; new 1905 arrest cannot be hired',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 const s=game({round:6,arrestedRound:5,capital:20});
 s.players[0].prestige=10;
 s.players[0].workers[1].jailed=true;
 s.players[0].workers[1].arrestedRound=6;
 s.players[0].workersLeft=1;
 await enter(page,s);await openOffice(page,390);
 await expect(page.locator('[data-hire-worker="P1W1"]')).toBeEnabled();
 await expect(page.locator('[data-hire-worker="P1W2"]')).toBeDisabled();
 await page.locator('[data-hire-worker="P1W1"]').click();
 const after=await saved(page);
 expect(after.players[0].workers[0].jailed).toBe(false);
 expect(after.players[0].workers[1].jailed).toBe(true);
 expect(after.players[0].prestige).toBe(10);
});
