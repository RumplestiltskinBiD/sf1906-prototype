import {test,expect} from '@playwright/test';
import {createInitialState} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function phase1({funded=true,status='complete'}={}){
  const s=createInitialState({rng:()=>0.5});
  s.constructions=[{id:'CLINIC-1905',playerId:0,projectId:'std_clinic',
    districtId:'civic',status,startedRound:1,completedRound:status==='complete'?2:null,
    materialsDelivered:['Lumber','Masonry','Steel']}];
  s.players[0].prestige=9;
  s.research.R08={status:funded?'funded':'held',holderId:funded?2:1,
    fundedRound:funded?5:null};
  return s;
}
async function lab(page,s){
  await page.goto('/');
  await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
  await page.goto('/catastrophe.html');
  await expect(page.locator('#mapWindow [data-district]')).toHaveCount(21);
  await page.locator('#loadSaved').click();
  await expect(page.locator('#message')).toContainText('Загружены реальные риски партии');
}
async function setSoma(page,{z=3,p=null}={}){
  await page.locator('[data-district="soma"] path').click();
  await expect(page.locator('#selectedTitle')).toContainText('SoMa');
  await page.locator('#z').fill(String(z));
  await page.locator('#z').press('Tab');
  if(p!==null){
    await page.locator('#p').fill(String(p));
    await page.locator('#p').press('Tab');
  }
}
async function simulate(page,{z=3,p=null,ignition=4}={}){
  await page.locator('#igniteAt').fill(String(ignition));
  await page.locator('#spreadBy').fill('1');
  await setSoma(page,{z,p});
  await page.locator('#quake').click();
  if(await page.locator('#all').isEnabled()){
    await page.locator('#all').click();
    await expect(page.locator('#message')).toContainText('Готово');
  }
}
async function assertNoOverflow(page,width){
  const x=await page.evaluate(()=>document.documentElement.scrollWidth);
  expect(x).toBeLessThanOrEqual(width+3);
}
for(const v of viewports){
  test('R08 live catastrophe awards 2 VP to isolated test copy only; cannot award twice '+v.width+'x'+v.height,async({page})=>{
    await page.setViewportSize(v);
    const original=phase1();
    await lab(page,original);
    const stored=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await expect(page.locator('#applyR08MedicalAward')).toBeDisabled();
    await simulate(page,{z:3,ignition:4});
    await expect(page.locator('#medicalResearchPreview')).toContainText('право на 2 VP');
    await expect(page.locator('#medicalResearchPreview')).toContainText('ещё не начислено в тестовой копии 2 VP');
    await expect(page.locator('#medicalResearchPreview')).toContainText('сосед SoMa');
    await expect(page.locator('#applyR08MedicalAward')).toBeEnabled();
    await page.locator('#applyR08MedicalAward').click();
    await expect(page.locator('#medicalResearchFeedback')).toContainText('начислено 2 VP');
    await expect(page.locator('#medicalResearchPreview')).toContainText('ещё не начислено в тестовой копии 0 VP');
    await expect(page.locator('#applyR08MedicalAward')).toBeDisabled();
    const after=await page.evaluate(key=>localStorage.getItem(key),KEY);
    expect(after).toBe(stored,'Phase II laboratory must NEVER overwrite the Phase I party save');
    await page.reload();
    await page.locator('#loadSaved').click();
    await simulate(page,{z:3,ignition:4});
    await expect(page.locator('#medicalResearchPreview')).toContainText('право на 2 VP');
    await expect(page.locator('#applyR08MedicalAward')).toBeEnabled();
    await assertNoOverflow(page,v.width);
  });
  test('R08 held/unfunded never grants VP even after neighboring earthquake '+v.width+'x'+v.height,async({page})=>{
    await page.setViewportSize(v);await lab(page,phase1({funded:false}));
    const stored=await page.evaluate(key=>localStorage.getItem(key),KEY);
    await simulate(page,{z:3,ignition:4});
    await expect(page.locator('#medicalResearchPreview')).toContainText('ещё не профинансировано');
    await expect(page.locator('#applyR08MedicalAward')).toBeDisabled();
    expect(await page.evaluate(key=>localStorage.getItem(key),KEY)).toBe(stored);
    await assertNoOverflow(page,v.width);
  });
  test('R08 fire-only neighbor and unfinished clinic cannot earn a post-quake bonus '+v.width+'x'+v.height,async({page})=>{
    await page.setViewportSize(v);
    await lab(page,phase1());
    await simulate(page,{z:0,p:5,ignition:4});
    await expect(page.locator('#medicalResearchPreview')).toContainText('Подходящих учреждений нет');
    await expect(page.locator('#applyR08MedicalAward')).toBeDisabled();
    await page.locator('#reset').click();
    await expect(page.locator('#applyR08MedicalAward')).toBeDisabled();
    // Re-import the same Phase I save with a site not yet completed.
    await page.evaluate(([key,data])=>localStorage.setItem(key,JSON.stringify(data)),[KEY,phase1({status:'under-construction'})]);
    await page.locator('#loadSaved').click();
    await simulate(page,{z:3,ignition:4});
    await expect(page.locator('#medicalResearchPreview')).toContainText('Подходящих учреждений нет');
    await expect(page.locator('#applyR08MedicalAward')).toBeDisabled();
    await assertNoOverflow(page,v.width);
  });
}
