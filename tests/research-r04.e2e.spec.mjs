import {test,expect} from '@playwright/test';
import {createInitialState,projectById} from '../game-core.js';

const KEY='sf1906_phase1_ui_v030a';
const viewports=[{width:390,height:844},{width:932,height:430},{width:1366,height:768}];
function site(id,projectId,districtId,playerId=0,status='complete'){
 return {id,projectId,districtId,playerId,status,startedRound:1,
  completedRound:status==='complete'?1:null,
  materialsDelivered:status==='complete'?[...projectById(projectId).materials]:[],
  warehouseInventory:[]};
}
function game({funded=true,residenceStatus='complete'}={}){
 const s=createInitialState({rng:()=>0.31});
 s.phase='development';s.view='city';s.developmentPlayer=0;s.developmentComplete=false;
 s.developmentSlotsUsed=[0,0,0];s.activeWorkerId=s.players[0].workers[0].id;
 s.newsCurrentIds=['E02'];s.newsC01Incident=null;
 s.constructions=[site('MED','std_clinic','civic',0),
  site('MED2','clinic','financial',0),site('HOUSE','bakery','civic',2,residenceStatus),
  site('HOUSE2','tenement','financial',1,residenceStatus)];
 s.players.forEach(p=>{p.capital=50;p.prestige=0;});
 if(funded)Object.assign(s.research.R04,{status:'funded',holderId:2,fundedRound:1});
 return s;
}
async function seed(page,s){
 await page.goto('/');
 await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,s]);
 await page.reload();
}
async function read(page){return page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);}
async function fits(page,vp){
 const w=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:innerWidth}));
 expect(w.scroll).toBeLessThanOrEqual(vp.width+3);
}
for(const vp of viewports){
 test('R04 office shows exactly +$1 yearly for completed clinic AND standard outpatient after funding '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  await seed(page,game());
  await page.locator('#officeBtn').click();
  const clinic=page.locator('#officeContent .portfolio-card.construction-card.completed').filter({hasText:'Районная клиника'});
  const outpatient=page.locator('#officeContent .portfolio-card.construction-card.completed').filter({hasText:'Районная амбулатория'});
  await expect(clinic).toContainText('Доход +1 / год');
  await expect(outpatient).toContainText('Доход +1 / год');
  await page.reload();
  await page.locator('#officeBtn').click();
  await expect(clinic).toContainText('Доход +1 / год');
  await expect(outpatient).toContainText('Доход +1 / год');
  const saved=await read(page);
  expect(saved.research.R04.status).toBe('funded');
  expect(saved.constructions.filter(x=>x.projectId==='clinic'||x.projectId==='std_clinic')).toHaveLength(2);
  await fits(page,vp);
 });
 test('R04 cannot show extra Income for held research or incomplete residential buildings '+vp.width+'x'+vp.height,async({page})=>{
  await page.setViewportSize(vp);
  const s=game({funded:false});
  Object.assign(s.research.R04,{status:'held',holderId:2,fundedRound:null});
  await seed(page,s);
  await page.locator('#officeBtn').click();
  let clinic=page.locator('#officeContent .portfolio-card.construction-card.completed').filter({hasText:'Районная клиника'});
  let outpatient=page.locator('#officeContent .portfolio-card.construction-card.completed').filter({hasText:'Районная амбулатория'});
  await expect(clinic).toContainText('Доход +0 / год');
  await expect(outpatient).toContainText('Доход +0 / год');
  const changed=game({funded:true,residenceStatus:'under-construction'});
  await page.evaluate(([key,save])=>localStorage.setItem(key,JSON.stringify(save)),[KEY,changed]);
  await page.reload();
  await page.locator('#officeBtn').click();
  clinic=page.locator('#officeContent .portfolio-card.construction-card.completed').filter({hasText:'Районная клиника'});
  outpatient=page.locator('#officeContent .portfolio-card.construction-card.completed').filter({hasText:'Районная амбулатория'});
  await expect(clinic).toContainText('Доход +0 / год');
  await expect(outpatient).toContainText('Доход +0 / год');
  await fits(page,vp);
 });
}