import {test,expect} from '@playwright/test';
import {createInitialState,PROJECTS} from '../game-core.js';

const STORE='sf1906_phase1_ui_v030a';
async function loadSaved(page,s){
 await page.addInitScript(({key,value})=>{if(!localStorage.getItem(key))localStorage.setItem(key,value);},{key:STORE,value:JSON.stringify(s)});
 await page.goto('/');
 return JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORE));
}
function base(){
 const s=createInitialState({rng:()=>0.1});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.activationMainActionUsed=false;s.activeWorkerId=null;
 s.players[0].capital=47;
 s.players[0].prestige=6;
 return s;
}
function oldBuild(id,status){
 return {id,playerId:0,projectId:'streetcar',districtId:'western',status,
 materialsDelivered:status==='complete'?['Lumber','Masonry','Steel']:['Lumber'],
 warehouseInventory:[],startedRound:1,completedRound:status==='complete'?1:null};
}
for(const vp of [{width:390,height:844},{width:932,height:430}]){
 test('local movement and saved market work on phone '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=base();
  const worker=s.players[0].workers[0];worker.districtId='noe';
  const restored=await loadSaved(page,s);
  expect(restored.constructions).toEqual([]);
  expect(restored.market.every(c=>!c||c.id!=='streetcar')).toBe(true);
  await page.locator('[data-worker-token="'+worker.id+'"]').click();
  await page.locator('#actionRaiseCapital').click();
  await expect(page.locator('[data-district="financial"]')).not.toHaveClass(/move-target/);
  await expect(page.locator('[data-district="mission"]')).toHaveClass(/move-target/);
  const panel=await page.locator('#contextPanel').count();
  expect(panel).toBe(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2)).toBe(false);
  await page.locator('[data-district="mission"]').click();
  const saved=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORE));
  expect(saved.players[0].workers[0].districtId).toBe('mission');
  expect(saved.players[0].capital).toBe(50);
 });
}
test('old 0.44 save replaces retired market/hand/draft/deck cards and preserves built sites',async({page})=>{
 const s=base();
 s.players[0].portfolio=['streetcar','warehouse'];
 s.deck.unshift({id:'streetcar',uid:'obsolete-from-deck'});
 s.market[0]={...s.market[0],id:'streetcar',uid:'obsolete-market',claims:[],bids:{}};
 s.starterDraftHands[1][2]={id:'streetcar',uid:'obsolete-draft'};
 s.constructions=[oldBuild('OLD_DONE','complete'),oldBuild('OLD_STARTED','under-construction')];
 const saved=await loadSaved(page,s);
 expect(saved.players[0].capital).toBe(47);
 expect(saved.players[0].prestige).toBe(6);
 expect(saved.constructions.map(x=>x.id)).toEqual(['OLD_DONE','OLD_STARTED']);
 expect(saved.constructions[0].status).toBe('complete');
 expect(saved.constructions[1].materialsDelivered).toEqual(['Lumber']);
 expect(saved.market.every(c=>!c||c.id!=='streetcar')).toBe(true);
 expect(saved.deck.every(c=>c.id!=='streetcar')).toBe(true);
 expect(saved.players[0].portfolio.every(id=>id!=='streetcar')).toBe(true);
 expect(saved.starterDraftHands.every(hand=>hand.every(c=>c.id!=='streetcar'))).toBe(true);
 await page.locator('#officeBtn').click();
 await expect(page.locator('#officeContent')).toContainText('Трамвайное расширение и депо');
 await expect(page.locator('#officeContent')).toContainText('Архивный объект');
 await page.reload();
 const after=JSON.parse(await page.evaluate(key=>localStorage.getItem(key),STORE));
 expect(after.players[0].portfolio).toEqual(saved.players[0].portfolio);
 expect(after.market.map(c=>c?.uid)).toEqual(saved.market.map(c=>c?.uid));
});
test('market migration cancels invalid bidding tasks for retired project and preserves remaining bids',async({page})=>{
 const s=base();s.phase='bids';
 s.market[0]={...s.market[0],id:'streetcar',uid:'retired-bid',claims:[{player:0,order:0},{player:1,order:1}],bids:{}};
 s.market[1]={...s.market[1],claims:[{player:1,order:0},{player:2,order:1}],bids:{}};
 s.bidQueue=[{slot:0,player:0},{slot:0,player:1},{slot:1,player:1},{slot:1,player:2}];
 s.bidCursor=1;
 const after=await loadSaved(page,s);
 expect(after.bidQueue).toEqual([{slot:1,player:1},{slot:1,player:2}]);
 expect(after.bidCursor).toBe(0);
 expect(after.phase).toBe('bids');
 expect(after.market[0].claims).toEqual([]);
 expect(after.market[1].claims).toHaveLength(2);
});
test('fresh project pool has no streetcar and Market Street remains a labeled location',async({page})=>{
 const s=createInitialState({rng:()=>0.1});
 expect(PROJECTS.some(p=>p.id==='streetcar')).toBe(false);
 expect(s.market.every(c=>c.id!=='streetcar')).toBe(true);
 expect(s.deck.every(c=>c.id!=='streetcar')).toBe(true);
 expect(s.starterDraftHands.every(hand=>hand.every(c=>c.id!=='streetcar'))).toBe(true);
 await page.setViewportSize({width:390,height:844});
 const developed=base();developed.selectedDistrictId='noe';await loadSaved(page,developed);
 await expect(page.locator('.version-badge')).toHaveText('v0.51');
 await expect(page.locator('#contextPanel')).toContainText('Market Street');
 await expect(page.locator('#contextPanel')).not.toContainText('сеть быстрого перемещения');
});
