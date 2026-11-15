import {test,expect} from '@playwright/test';
import {createInitialState,roundIncome} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const sizes=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];

function game({phase='development',view='city',round=1}={}){
 const s=createInitialState({rng:()=>.39});
 s.round=round;s.phase=phase;s.view=view;
 s.developmentPlayer=0;s.developmentComplete=false;s.activationMainActionUsed=false;
 s.newsCurrentIds=['H04'];s.newsDeck=s.newsDeck.filter(x=>x!=='H04');
 s.newsLastResolvedRound=round-1;
 s.newsH04Donations={round,donations:[]};
 s.players.forEach((p,i)=>{
  p.capital=[25,9,30][i];p.influence=[10,11,13][i];p.prestige=0;
 });
 s.yearTurnOrder=[2,1,0];
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:s});
 await page.reload();
}
async function read(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function openNews(page,vp){
 if(vp.width<1000)await page.locator('#callBuildingNode').click();
 else await page.locator('#newsOpenBtn').click();
 await expect(page.locator('#newsSheet')).toBeVisible();
}

for(const vp of sizes){
 test('H04 payment, Influence jumps, no worker cost, one-per-owner and reload '+vp.width+'x'+vp.height,async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const initial=game();
  initial.players[0].workers.forEach(w=>{w.used=true;w.jailed=true;});
  initial.players[0].workersLeft=0;
  initial.activationMainActionUsed=true;
  await page.setViewportSize(vp);
  await seed(page,initial);
  await openNews(page,vp);
  await expect(page.locator('.news-headline')).toHaveText('ВРАЧИ ТРЕБУЮТ СПАСТИ МЛАДЕНЦЕВ!');
  await expect(page.locator('.news-h04-panel')).toContainText('Детские санитарные пункты');
  await expect(page.locator('.news-h04-donor')).toHaveCount(3);
  await expect(page.locator('[data-h04-donate="0"]')).toBeEnabled();
  await expect(page.locator('[data-h04-donate="1"]')).toBeDisabled();
  await expect(page.locator('[data-h04-owner="1"]')).toContainText('Недостаточно денег');
  // Loading a saved arrested worker normalizes arrestedRound. Compare against
  // the actual post-migration state, before the donation, not the input fixture.
  const loaded=await read(page);
  const workers=JSON.stringify(loaded.players[0].workers),used=loaded.activationMainActionUsed;
  await page.locator('[data-h04-donate="0"]').click();
  const now=await read(page);
  expect(now.players[0].capital).toBe(15);
  expect(now.players[0].prestige).toBe(4);
  expect(now.players[0].influence).toBe(14);
  expect(now.newsH04Donations.donations).toHaveLength(1);
  expect(now.newsH04Donations.donations[0].influenceSteps).toBe(2);
  expect(JSON.stringify(now.players[0].workers)).toBe(workers);
  expect(now.activationMainActionUsed).toBe(used);
  expect(now.developmentSlotsUsed).toEqual(loaded.developmentSlotsUsed);
  await expect(page.locator('[data-h04-owner="0"]')).toContainText('Пожертвование сделано');
  await expect(page.locator('[data-h04-donate="0"]')).toHaveCount(0);
  await expect(page.locator('[data-h04-donate="2"]')).toBeEnabled();
  await page.reload();
  await openNews(page,vp);
  await expect(page.locator('[data-h04-donate="0"]')).toHaveCount(0);
  expect((await read(page)).players[0].prestige).toBe(4);
  await page.locator('[data-h04-donate="2"]').click();
  const both=await read(page);
  expect(both.players[2].capital).toBe(20);
  expect(both.players[2].prestige).toBe(4);
  expect(both.newsH04Donations.donations.map(d=>d.playerId)).toEqual([0,2]);
  await expect(page.locator('[data-h04-donate="2"]')).toHaveCount(0);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
  expect(errors).toEqual([]);
 });
}

test('H04 can be funded from starting City Hall draft without a worker action',async({page})=>{
 const s=game({phase:'draft',view:'hall'});
 await page.setViewportSize({width:1366,height:768});
 await seed(page,s);
 await page.locator('#newsOpenBtn').click();
 await expect(page.locator('[data-h04-donate="0"]')).toBeEnabled();
 await page.locator('[data-h04-donate="0"]').click();
 const now=await read(page);
 expect(now.phase).toBe('draft');
 expect(now.players[0].capital).toBe(15);
 expect(now.players[0].prestige).toBe(4);
 expect(now.players[0].influence).toBe(14);
 expect(now.players[0].workersLeft).toBe(3);
 expect(now.starterDraftPlayer).toBe(s.starterDraftPlayer);
});

test('H04 first year can activate directly before city actions after new game',async({page})=>{
 // An actual createInitialState initial newspaper is shuffled. Find a seed
 // that reveals H04, without manually changing the H04 donation record.
 function seeded(a){return ()=>{let t=a+=0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
 let s=null;
 for(let i=1;i<=700;i++){
  const candidate=createInitialState({rng:seeded(i)});
  if(candidate.newsCurrentIds[0]==='H04'){s=candidate;break;}
 }
 expect(s).not.toBeNull();
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#newsOpenBtn').click();
 await expect(page.locator('.news-headline')).toHaveText('ВРАЧИ ТРЕБУЮТ СПАСТИ МЛАДЕНЦЕВ!');
 await page.locator('[data-h04-donate="0"]').click();
 const now=await read(page);
 expect(now.newsH04Donations.donations).toHaveLength(1);
 expect(now.players[0].capital).toBe(s.players[0].capital-10);
});

test('H04 zero donations at end year has no automatic payout and empty charity archive',async({page})=>{
 const s=game();
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentComplete=true;s.developmentPlayer=null;
 const expected=s.players.map(p=>({capital:p.capital+roundIncome(s,p.id),prestige:p.prestige,influence:p.influence}));
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await read(page);
 expect(now.round).toBe(2);
 expect(now.newsArchive).toHaveLength(1);
 expect(now.newsArchive[0].h04.donations).toEqual([]);
 expect(now.newsArchive[0].entries).toEqual([]);
 expect(now.newsArchive[0].changes).toEqual({});
 expect(now.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}))).toEqual(expected);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Пожертвований не было');
 await page.reload();
 expect((await read(page)).newsArchive[0].h04.donations).toEqual([]);
});

test('H04 end-year archive records actual donor VP and Influence without a second payout',async({page})=>{
 const s=game();s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.newsH04Donations={round:1,donations:[
  {playerId:0,round:1,cost:10,vp:4,influenceSteps:2,influenceFrom:10,influenceTo:14}
 ]};
 s.players[0].capital=15;s.players[0].prestige=4;s.players[0].influence=14;
 s.players.forEach(p=>{p.workers.forEach(w=>w.used=true);p.workersLeft=0;});
 s.developmentComplete=true;s.developmentPlayer=null;
 const before=s.players.map(p=>({capital:p.capital+roundIncome(s,p.id),prestige:p.prestige,influence:p.influence}));
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const now=await read(page);
 expect(now.newsArchive[0].h04.donations).toHaveLength(1);
 expect(now.newsH04Donations).toBeNull();
 expect(now.players.map(p=>({capital:p.capital,prestige:p.prestige,influence:p.influence}))).toEqual(before);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('ВРАЧИ ТРЕБУЮТ СПАСТИ МЛАДЕНЦЕВ!');
 await expect(page.locator('#newsSheetContent')).toContainText('пожертвование $10');
 await expect(page.locator('#newsSheetContent')).toContainText('+4 VP');
 await expect(page.locator('#newsSheetContent')).toContainText('10 → 14');
 await expect(page.locator('[data-h04-donate]')).toHaveCount(0);
});

test('H04 from previous revision preserves old housing prestige loss and headline',async({page})=>{
 const s=game();s.round=2;s.newsCurrentIds=['E02'];s.newsH04Donations=null;
 s.newsArchive=[{round:1,year:1900,cardId:'H04',title:'Кто отвечает за больных?',
  category:'Болезнь',entries:[{playerId:0,districtIds:['civic'],actual:-1,defended:false}],
  changes:{0:{capital:0,influence:0,prestige:-1}},serviceRecognition:[],emergency:{}}];
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Кто отвечает за больных?');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив предыдущей редакции H04');
 await expect(page.locator('#newsSheetContent')).not.toContainText('пожертвование $10');
 expect((await read(page)).newsArchive[0].changes['0'].prestige).toBe(-1);
});
test('H04 legacy active save creates empty donor ledger but does not change funds on reload',async({page})=>{
 const s=game();delete s.newsH04Donations;s.players[0].capital=32;
 await page.setViewportSize({width:390,height:844});await seed(page,s);
 await openNews(page,{width:390,height:844});
 const now=await read(page);
 expect(now.players[0].capital).toBe(32);
 expect(now.newsH04Donations).toEqual({round:1,donations:[]});
 await page.locator('[data-h04-donate="0"]').click();
 expect((await read(page)).players[0].capital).toBe(22);
 await page.reload();await openNews(page,{width:390,height:844});
 await expect(page.locator('[data-h04-donate="0"]')).toHaveCount(0);
});
