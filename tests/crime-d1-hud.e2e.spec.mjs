import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const SIZES=[{width:390,height:844},{width:932,height:430},{width:1440,height:900}];

function fixture(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.players[0].capital=1234;s.players[0].prestige=15;s.players[0].influence=8;
 s.players[1].suspicion=2;s.players[2].suspicion=3;
 s.players[0].workers[0].jailed=true;s.players[0].workers[0].arrestedRound=1;
 s.players[0].workersLeft=2;
 return s;
}
async function load(page,state){
 await page.goto('/');
 await page.evaluate(({key,value})=>localStorage.setItem(key,value),
   {key:KEY,value:JSON.stringify(state)});
 await page.reload();
}
const saved=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);

for(const size of SIZES){
 test('D1 visible 0/2/3 suspicion, readable card and Office '+size.width+'x'+size.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewportSize(size);
  await load(page,fixture());
  const cards=page.locator('#playersBar .player-pill');
  await expect(cards).toHaveCount(3);
  for(const [i,stars] of ['☆☆☆','★★☆','★★★'].entries()){
   const card=cards.nth(i),indicator=card.locator('.suspicion-stars');
   await expect(indicator).toBeVisible();
   await expect(indicator).toHaveText(stars);
   await expect(indicator).toHaveAttribute('data-suspicion-level',String([0,2,3][i]));
   await expect(card).toHaveAttribute('aria-label',new RegExp('Подозрение '+[0,2,3][i]+' из 3'));
  }
  await expect(cards.nth(0)).toContainText('VP 15');
  await expect(cards.nth(0)).toContainText('Вл 8');
  await expect(cards.nth(0)).toContainText('$1234');
  await expect(cards.nth(0)).toContainText('2');
  await expect(page.locator('#yearTransitionSheet')).toBeHidden();
  const layout=await page.evaluate(()=>{
   const pills=[...document.querySelectorAll('#playersBar .player-pill')];
   return {
    overflow:document.documentElement.scrollWidth-innerWidth,
    items:pills.map(pill=>{
     const r=pill.getBoundingClientRect(),badge=pill.querySelector('.suspicion-stars').getBoundingClientRect();
     const stats=pill.querySelector('.compact-player-stats')||pill.querySelector('.player-stats');
     const st=stats.getBoundingClientRect();
     const inf=[...stats.children].find(el=>el.textContent.includes('Вл '));
     const ir=inf.getBoundingClientRect();
     return {left:badge.left,right:badge.right,top:badge.top,bottom:badge.bottom,
       cardRight:r.right,statLeft:st.left,statRight:st.right,
       influenceRight:ir.right,statsBottom:st.bottom};
    })
   };
  });
  expect(layout.overflow).toBeLessThanOrEqual(2);
  for(const a of layout.items){
   expect(a.left).toBeGreaterThanOrEqual(a.influenceRight-1);
   expect(a.right).toBeLessThanOrEqual(a.cardRight+1);
   expect(a.right).toBeLessThanOrEqual(a.statRight+1);
   expect(a.left).toBeGreaterThanOrEqual(a.statLeft-1);
   expect(a.bottom).toBeLessThanOrEqual(a.statsBottom+2);
  }
  // No new overlay: the existing player card opens the existing Office.
  await cards.nth(1).click();
  await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
  let detail=page.locator('#officeContent .office-suspicion-details');
  await expect(detail).toHaveAttribute('data-office-suspicion','2');
  await expect(detail).toContainText('★★☆');
  await expect(detail).toContainText('$3 или −1 шаг');
  await page.locator('#officeContent [data-office-tab="2"]').click();
  await expect(detail).toContainText('★★★');
  await expect(detail).toContainText('$6');
  await page.locator('#officeContent [data-office-tab="0"]').click();
  await expect(detail).toContainText('☆☆☆');
  await expect(detail).toContainText('штраф отсутствует');
  await page.locator('#officeDrawer [data-close-drawer]').click();
  await page.reload();
  await expect(cards.nth(1).locator('.suspicion-stars')).toHaveText('★★☆');
  await expect(cards.nth(2).locator('.suspicion-stars')).toHaveText('★★★');
  expect((await saved(page)).players.map(p=>p.suspicion)).toEqual([0,2,3]);
  expect(errors).toEqual([]);
 });
}

test('D1 live tester and legal-case action update stars without new panels',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await load(page,fixture());
 const blue=page.locator('#playersBar .player-pill[data-office="0"]');
 await page.locator('#settingsBtn').click();
 await page.locator('#settingsDrawer [data-debug-suspicion="0"][data-delta="1"]').click();
 await expect(blue.locator('.suspicion-stars')).toHaveText('★☆☆');
 await page.locator('#settingsDrawer [data-close-drawer]').click();
 await page.reload();
 await expect(blue.locator('.suspicion-stars')).toHaveText('★☆☆');

 await blue.click();
 await expect(page.locator('#officeContent .office-suspicion-details')).toContainText('★☆☆');
 await page.locator('#officeContent [data-legal-case="cash"]').click();
 await expect(blue.locator('.suspicion-stars')).toHaveText('☆☆☆');
 await expect(page.locator('#officeContent .office-suspicion-details')).toContainText('штраф отсутствует');
 expect((await saved(page)).players[0].suspicion).toBe(0);
 expect((await saved(page)).players[0].capital).toBe(1230);
 await expect(page.locator('#yearTransitionSheet')).toBeHidden();
});

test('D1 legacy missing/invalid suspicion renders safely without changing game economy',async({page})=>{
 const s=fixture();
 delete s.players[0].suspicion;s.players[1].suspicion=999;
 await page.setViewportSize({width:932,height:430});
 await load(page,s);
 const cards=page.locator('#playersBar .player-pill');
 await expect(cards.nth(0).locator('.suspicion-stars')).toHaveText('☆☆☆');
 await expect(cards.nth(1).locator('.suspicion-stars')).toHaveText('★★★');
 expect((await saved(page)).players.map(p=>p.suspicion)).toEqual([0,3,3]);
 await expect(cards.nth(0)).toContainText('$1234');
 await expect(cards.nth(0)).toContainText('VP 15');
});
