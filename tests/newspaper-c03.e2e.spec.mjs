import {test,expect} from '@playwright/test';
import {createInitialState,createC03Offer} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function game({stars=0,hand=0,empty=false,phase='declare'}={}){
 const s=createInitialState({rng:()=>.38});
 s.phase=phase;s.view='hall';s.round=1;s.yearTurnOrder=[0,1,2];
 s.newsCurrentIds=['C03'];s.newsDeck=s.newsDeck.filter(id=>id!=='C03');
 s.newsLastResolvedRound=0;s.declarationIndex=0;
 s.newsC01Incident=null;s.newsC02Incident=null;s.newsH01Incident=null;s.newsH02Incident=null;
 s.newsC03Offer=null;s.players.forEach((p,i)=>{
  p.capital=30;p.prestige=0;p.influence=3+i;p.suspicion=0;p.portfolio=[];
 });
 s.players[0].suspicion=stars;
 s.players[0].portfolio=Array(hand).fill('bank');
 if(empty)s.deck=[];
 s.newsC03Offer=createC03Offer(s);
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,state])=>localStorage.setItem(key,JSON.stringify(state)),[KEY,s]);
 await page.reload();
}
async function saved(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function c03Next(page,choice){
 await page.locator('#c03'+choice).click();
}
for(const vp of viewports)test('C03 before City Hall: claim/decline all players and keep normal market on '+vp.width+'x'+vp.height,async({page})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const original=game(),gift=original.deck[0];
 await page.setViewportSize(vp);await seed(page,original);
 await expect(page.locator('#phaseStat')).toContainText('сомнительные разрешения');
 await expect(page.locator('#c03Accept')).toBeEnabled();
 await expect(page.locator('#c03Decline')).toBeEnabled();
 await expect(page.locator('#projectMarket [data-slot="0"]')).toBeDisabled();
 await expect(page.locator('[data-goal-slot="0"]')).toBeDisabled();
 await expect(page.locator('#nextTenderStage')).toHaveCount(0);
 await c03Next(page,'Accept');
 const afterClaim=await saved(page);
 expect(afterClaim.newsC03Offer.cursor).toBe(1);
 expect(afterClaim.players[0].portfolio).toEqual([gift.id]);
 expect(afterClaim.players[0].suspicion).toBe(1);
 expect(afterClaim.players[0].capital).toBe(30);
 expect(afterClaim.players[0].prestige).toBe(0);
 expect(afterClaim.players[0].workers.every(w=>!w.used)).toBe(true);
 expect(afterClaim.deck[0].uid).not.toBe(gift.uid);
 expect(afterClaim.market).toEqual(original.market);
 expect(afterClaim.declarationIndex).toBe(0);
 await page.reload();
 await expect(page.locator('.c03-offer-panel')).toContainText('('+'2/3'+')');
 await c03Next(page,'Decline');
 await c03Next(page,'Decline');
 const after=await saved(page);
 expect(after.newsC03Offer.completed).toBe(true);
 expect(after.newsC03Offer.decisions.map(d=>d.choice)).toEqual(['accepted','declined','declined']);
 expect(after.players[1].suspicion).toBe(0);
 expect(after.players[2].portfolio).toEqual([]);
 await expect(page.locator('#c03Accept')).toHaveCount(0);
 await expect(page.locator('#passTender')).toBeVisible();
 await expect(page.locator('#projectMarket [data-slot="0"]')).toBeEnabled();
 await page.locator('#projectMarket [data-slot="0"]').click();
 const declared=await saved(page);
 expect(declared.market[0].claims[0].player).toBe(0);
 expect(declared.players[0].portfolio).toEqual([gift.id]);
 expect(declared.players[0].suspicion).toBe(1);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
 expect(errors).toEqual([]);
});
test('first-year C03 opens only after all three private starter drafts, then grants a third project',async({page})=>{
 const vp={width:390,height:844},s=game({phase:'draft'});
 s.starterDraftPlayer=0;s.draftRevealed=false;s.draftSelection=[];
 await page.setViewportSize(vp);await seed(page,s);
 await expect(page.locator('#c03Accept')).toHaveCount(0);
 await expect(page.locator('#revealStarterDraft')).toBeVisible();
 for(let i=0;i<3;i++){
  await page.locator('#revealStarterDraft').click();
  await expect(page.locator('[data-draft-card]')).toHaveCount(5);
  await page.locator('[data-draft-card]').nth(0).click();
  await page.locator('[data-draft-card]').nth(1).click();
  await expect(page.locator('#confirmStarterDraft')).toBeVisible();
  await page.locator('#confirmStarterDraft').click();
 }
 const before=await saved(page);
 expect(before.phase).toBe('declare');
 expect(before.players.map(p=>p.portfolio.length)).toEqual([2,2,2]);
 expect(before.newsC03Offer.cursor).toBe(0);
 await expect(page.locator('#c03Accept')).toBeEnabled();
 await page.locator('#c03Accept').click();
 const after=await saved(page);
 expect(after.players[0].portfolio.length).toBe(3);
 expect(after.players[0].suspicion).toBe(1);
 expect(after.players[0].workers.filter(w=>w.used)).toHaveLength(0);
 expect(after.declarationIndex).toBe(0);
 expect(after.newsC03Offer.cursor).toBe(1);
 await page.reload();
 await expect(page.locator('.c03-offer-panel')).toContainText('2/3');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
});
test('C03 ★★★ allows only explicit offender choice; actual project and jail survive reload',async({page})=>{
 const vp={width:390,height:844},s=game({stars:3});
 s.players[0].influence=0;
 await page.setViewportSize(vp);await seed(page,s);
 await expect(page.locator('#c03ArrestChoice')).toBeVisible();
 await expect(page.locator('#c03Accept')).toBeDisabled();
 await page.locator('#c03ArrestChoice').selectOption(s.players[0].workers[1].id);
 await expect(page.locator('#c03Accept')).toBeEnabled();
 await c03Next(page,'Accept');
 const a=await saved(page);
 expect(a.players[0].portfolio.length).toBe(1);
 expect(a.players[0].suspicion).toBe(0);
 expect(a.players[0].prestige).toBe(-3);
 expect(a.players[0].workers[1].jailed).toBe(true);
 expect(a.players[0].workers[1].arrestedRound).toBe(1);
 expect(a.players[0].capital).toBe(30);
 expect(a.newsC03Offer.cursor).toBe(1);
 await page.reload();
 const b=await saved(page);
 expect(b.newsC03Offer.cursor).toBe(1);
 expect(b.players[0].workers[1].jailed).toBe(true);
 await expect(page.locator('#c03Decline')).toBeVisible();
});
for(const vp of [{width:390,height:844},{width:932,height:430}]){
 test('C03 full hand, empty deck and jailed staff disable illegal gift but allow decline '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  for(const condition of [{hand:5,reason:'Рука заполнена'},{empty:true,reason:'Колода проектов пуста'}]){
   const s=game(condition);await seed(page,s);
   await expect(page.locator('.c03-offer-panel')).toContainText(condition.reason);
   await expect(page.locator('#c03Accept')).toBeDisabled();
   await expect(page.locator('#c03Decline')).toBeEnabled();
   await c03Next(page,'Decline');
   const now=await saved(page);
   expect(now.players[0].suspicion).toBe(0);
   expect(now.players[0].portfolio.length).toBe(condition.hand||0);
  }
  const s=game();s.players[0].workers.forEach(w=>w.jailed=true);
  await seed(page,s);
  await expect(page.locator('.c03-offer-panel')).toContainText('Все представители арестованы');
  await expect(page.locator('#c03Accept')).toBeDisabled();
  await c03Next(page,'Decline');
  expect((await saved(page)).newsC03Offer.cursor).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(3);
 });
}
test('C03 next year archives decisions and does not reopen free permits',async({page})=>{
 const vp={width:390,height:844},s=game();
 s.newsC03Offer.decisions=[{playerId:0,choice:'accepted',round:1,uid:'X',projectId:'bank'},
  {playerId:1,choice:'declined',round:1},{playerId:2,choice:'declined',round:1}];
 s.newsC03Offer.cursor=3;s.newsC03Offer.completed=true;
 s.players[0].portfolio=['bank'];s.players[0].suspicion=1;
 s.newsDeck=['E02',...s.newsDeck.filter(id=>id!=='E02')];
 s.phase='development';s.view='city';s.developmentPlayer=null;s.developmentComplete=true;
 s.players.forEach(p=>p.workers.forEach(w=>w.used=true));
 await page.setViewportSize(vp);await seed(page,s);
 await page.locator('#endRoundBtn').click();
 const a=await saved(page);
 expect(a.round).toBe(2);
 expect(a.newsCurrentIds[0]).toBe('E02');
 expect(a.newsArchive[0].c03.decisions).toHaveLength(3);
 expect(a.newsC03Offer).toBeNull();
 await page.locator('.nav-btn[data-view="city"]').click();
 await page.locator('#callBuildingNode').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('#newsSheetContent')).toContainText('Перерегистрация сомнительных разрешений');
 await expect(page.locator('#newsSheetContent')).toContainText('принятых');
 await page.reload();
 expect((await saved(page)).newsArchive[0].c03.decisions).toHaveLength(3);
});
test('old C03 newspaper archive keeps historic title and original old fine',async({page})=>{
 const s=game();s.round=2;s.newsCurrentIds=['E02'];s.newsC03Offer=null;
 s.newsLastResolvedRound=1;s.newsArchive=[{round:1,year:1900,cardId:'C03',
  title:'Поддельные подписи в конторах',category:'Преступность',
  entries:[{playerId:0,districtIds:['civic'],actual:-2}],changes:{0:{capital:-2}}}];
 s.phase='development';s.view='city';s.developmentPlayer=0;
 await page.setViewportSize({width:1366,height:768});await seed(page,s);
 await page.locator('#newsOpenBtn').click();
 await page.locator('[data-news-archive="0"]').click();
 await expect(page.locator('.news-headline')).toHaveText('Поддельные подписи в конторах');
 await expect(page.locator('#newsSheetContent')).toContainText('Архив прежней C03');
 expect((await saved(page)).newsArchive[0].c03).toBeUndefined();
});
