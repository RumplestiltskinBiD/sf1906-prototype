import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';
const KEY='sf1906_phase1_ui_v030a';
function fixture(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.yearTurnOrder=[0,1,2];s.firstPlayer=0;
 s.players[0].capital=1234;s.players[0].prestige=15;s.players[0].influence=8;
 s.players[1].capital=99;s.players[1].prestige=4;s.players[1].influence=2;
 s.players[0].workers[0].jailed=true;s.players[0].workers[0].arrestedRound=s.round;s.players[0].workersLeft=2;
 for(const w of s.players[1].workers.slice(0,2)){w.jailed=true;w.arrestedRound=s.round;}
 s.players[1].workersLeft=1;
 return s;
}
async function load(page,s){
 await page.addInitScript(({key,value})=>localStorage.setItem(key,value),{key:KEY,value:JSON.stringify(s)});
 await page.goto('/');
}
for(const viewport of [{width:390,height:844},{width:932,height:430}]){
 test('player cards show full mobile rank/name/money/stats with arrest counter '+viewport.width+'x'+viewport.height,async({page})=>{
  await page.setViewportSize(viewport);await load(page,fixture());
  const cards=page.locator('#playersBar .player-pill');
  await expect(cards).toHaveCount(3);
  for(let i=0;i<3;i++){
   const card=cards.nth(i);
   await expect(card).toHaveClass(/player-pill-compact/);
   await expect(card.locator('.compact-order')).toHaveText('#'+(i+1));
   await expect(card.locator('.compact-player-name')).toBeVisible();
   await expect(card.locator('.compact-player-money')).toBeVisible();
   await expect(card.locator('.compact-player-stats')).toBeVisible();
   await expect(card.locator('.compact-player-workers')).toBeVisible();
  }
  await expect(cards.nth(0).locator('.compact-player-money')).toHaveText('$1234');
  await expect(cards.nth(0).locator('.compact-player-stats')).toContainText('VP 15');
  await expect(cards.nth(0).locator('.compact-player-stats')).toContainText('Вл 8');
  await expect(cards.nth(0).locator('.compact-free-worker')).toContainText('2');
  await expect(cards.nth(0).locator('.compact-jailed-worker')).toContainText('1');
  await expect(cards.nth(1).locator('.compact-jailed-worker')).toContainText('2');
  await expect(cards.nth(2).locator('.compact-jailed-worker')).toHaveCount(0);
  await expect(cards.nth(0)).toHaveAttribute('aria-label',/Арестовано 1/);

  const layout=await page.evaluate(()=>{
   const cards=[...document.querySelectorAll('#playersBar .player-pill')];
   return {docWidth:document.documentElement.scrollWidth,viewport:innerWidth,
    items:cards.map(card=>{
     const rect=card.getBoundingClientRect(),head=card.querySelector('.compact-player-head');
     const order=head.querySelector('.compact-order').getBoundingClientRect(),
           dot=head.querySelector('.player-dot').getBoundingClientRect(),
           name=head.querySelector('.compact-player-name'),
           nameBox=name.getBoundingClientRect(),
           money=head.querySelector('.compact-player-money').getBoundingClientRect();
     const pseudo=getComputedStyle(card,'::after');
     return {cardLeft:rect.left,cardRight:rect.right,headRight:head.getBoundingClientRect().right,
      orderRight:order.right,dotLeft:dot.left,dotRight:dot.right,nameLeft:nameBox.left,
      nameRight:nameBox.right,moneyLeft:money.left,moneyRight:money.right,
      textFits:name.scrollWidth<=name.clientWidth+1,pseudoDisplay:pseudo.display};
    })};
  });
  expect(layout.docWidth).toBeLessThanOrEqual(layout.viewport+2);
  for(const item of layout.items){
   expect(item.orderRight).toBeLessThanOrEqual(item.dotLeft+1);
   expect(item.dotRight).toBeLessThanOrEqual(item.nameLeft+1);
   expect(item.nameRight).toBeLessThanOrEqual(item.moneyLeft+1);
   expect(item.moneyRight).toBeLessThanOrEqual(item.cardRight+1);
   expect(item.textFits).toBe(true);
   expect(item.pseudoDisplay).toBe('none');
  }
  await cards.nth(0).click();
  await expect(page.locator('#officeDrawer')).toHaveClass(/open/);
  await page.locator('#officeDrawer [data-close-drawer]').click();
  await page.reload();
  await expect(page.locator('.player-pill[data-office="0"] .compact-jailed-worker')).toContainText('1');
  await expect(page.locator('.player-pill[data-office="1"] .compact-jailed-worker')).toContainText('2');
 });
}
test('desktop retains player order and gains an arrest count without changing other stats',async({page})=>{
 await page.setViewportSize({width:1440,height:900});await load(page,fixture());
 const card=page.locator('.player-pill[data-office="0"]');
 await expect(card.locator('.turn-order-badge')).toHaveText('#1');
 await expect(card.locator('.player-name')).toHaveText('Синий');
 await expect(card.locator('.player-money')).toHaveText('$1234');
 await expect(card.locator('.player-stats')).toContainText('VP 15');
 await expect(card.locator('.player-jailed-count')).toContainText('1');
 await expect(card).not.toHaveClass(/player-pill-compact/);
});
