import {
  PROJECTS,DISTRICTS,MAX_ROUNDS,RESOURCE_PRICES,BASE_ROUND_INCOME,RAISE_CAPITAL_AMOUNT,LOAN_PRINCIPAL,MAX_ACTIVE_LOANS,BUREAU_LAND_DISCOUNT,HAND_LIMIT,STARTER_KEEP,WORKERS_PER_PLAYER,
  LOGISTICS_NODES,LOGISTICS_RESOURCE_WEIGHTS,CONSTRUCTION_STAGING_CAPACITY,WAREHOUSE_STORAGE_CAPACITY,DELIVERY_HAULERS,DELIVERY_EDGE_COST,generateLogisticsSupply,
  projectById,districtById,districtAccess,districtNeighbors,turnOrder,currentDeclarer,currentDeveloper,openingPrice,
  createWorkers,playerWorkers,activeWorker,workerCanReachDistrict,workerReachableDistricts,selectWorker,
  createInitialState,claimProject,passDeclaration,beginBidding,currentBidTask,submitBid,
  resolveTenders,cleanupMarket,districtConstructionCount,constructionEligibility,beginConstruction,setLandValue,
  constructionProgress,completedWarehouses,warehouseInventory,canCompleteConstruction,completeConstructionFromStorage,
  availableDeliveryHaulers,deliveryNeighbors,deliverySourceInfo,deliveryPlanCost,validateDeliveryPlan,executeDelivery,
  roundIncome,grossRoundIncome,buildingIncome,
  activeLoans,loanInterest,completedActionSpaces,canTakeMainAction,canUseFreeAction,endActivation,actionSpaceOccupant,raiseCapital,takeBankLoan,repayLoan,takeBureauContract,useShoppingProcurement,useSocialClub,currentDraftPlayer,toggleStarterDraftCard,revealStarterDraft,confirmStarterDraft
} from './game-core.js';

const STORAGE_KEY='sf1906_phase1_ui_v028';
const LEGACY_STORAGE_KEYS=['sf1906_phase1_ui_v027','sf1906_phase1_ui_v026','sf1906_phase1_ui_v025','sf1906_phase1_ui_v024','sf1906_phase1_ui_v023','sf1906_phase1_ui_v022','sf1906_phase1_ui_v021','sf1906_phase1_ui_v020','sf1906_phase1_ui_v0192','sf1906_phase1_ui_v0191','sf1906_phase1_ui_v019','sf1906_phase1_ui_v018','sf1906_phase1_ui_v017','sf1906_phase1_ui_v0166','sf1906_phase1_ui_v0165'];
let state=loadState();
let inspectedOffice=0;
let pendingBidReveal=false;
let mobileContextOpen=false;
let mobileMapDetail=false;
let deliveryDraft=null;
let overviewPlayerId=null;
let focusedConstructionId=null;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function loadState(){
  try{
    let raw=localStorage.getItem(STORAGE_KEY);
    if(!raw){
      for(const key of LEGACY_STORAGE_KEYS){raw=localStorage.getItem(key);if(raw)break;}
    }
    if(raw){
      const parsed=JSON.parse(raw);
      if(['0.16.5','0.16.6','0.17','0.18','0.19','0.19.1','0.19.2','0.20','0.21','0.22','0.23','0.24','0.25','0.26','0.27','0.28'].includes(parsed?.version))return migrateState(parsed);
    }
  }catch(e){}
  return createInitialState();
}
function migrateState(parsed){
  const originalVersion=parsed.version;
  parsed.version='0.28';
  parsed.players=(parsed.players||[]).map(p=>{
    let workers=Array.isArray(p.workers)&&p.workers.length?p.workers.map((w,i)=>({
      id:w.id||`P${p.id+1}W${i+1}`,
      number:w.number||i+1,
      districtId:w.districtId||'civic',
      used:!!w.used
    })):createWorkers(p.id);
    if(originalVersion!=='0.24'&&(!Array.isArray(p.workers)||!p.workers.length)){
      const legacyLeft=Math.max(0,Math.min(WORKERS_PER_PLAYER,p.workersLeft??WORKERS_PER_PLAYER));
      const usedCount=WORKERS_PER_PLAYER-legacyLeft;
      workers=workers.map((w,i)=>({...w,used:i<usedCount}));
    }
    return {
      ...p,
      workers,
      workersLeft:workers.filter(w=>!w.used).length,
      portfolio:p.portfolio||[],
      loans:p.loans||[],
      bureauContracts:p.bureauContracts||0,
      prestige:p.prestige??(parsed.constructions||[]).filter(x=>x.playerId===p.id&&x.status==='complete').reduce((sum,x)=>sum+(projectById(x.projectId)?.prestige||0),0)
    };
  });
  parsed.constructions=(parsed.constructions||[]).map(x=>({...x,materialsDelivered:x.status==='under-construction'?(x.materialsDelivered||[]).slice(0,CONSTRUCTION_STAGING_CAPACITY):(x.materialsDelivered||[]),warehouseInventory:Array.isArray(x.warehouseInventory)?x.warehouseInventory:[],completedRound:x.completedRound??null}));
  parsed.market=(parsed.market||[]).map((m,i)=>m?({...m,uid:m.uid||`MIG-M-${i}-${m.id}`}):null);
  parsed.deck=(parsed.deck||[]).map((card,i)=>typeof card==='string'?{uid:`MIG-D-${i}-${card}`,id:card}:card);
  parsed.expired=parsed.expired||[];
  parsed.nextConstructionId=parsed.nextConstructionId||(parsed.constructions.reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1);
  parsed.nextLoanId=parsed.nextLoanId||(parsed.players.flatMap(p=>p.loans||[]).reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1);
  parsed.districts=parsed.districts||Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites,roadAccess:!!d.road}]));
  DISTRICTS.forEach(d=>{
    parsed.districts[d.id]=parsed.districts[d.id]||{landValue:d.landValue,sites:d.sites,roadAccess:!!d.road};
    if(parsed.districts[d.id].landValue==null)parsed.districts[d.id].landValue=d.landValue;
    parsed.districts[d.id].sites=d.sites;
    if(parsed.districts[d.id].roadAccess==null){
      const completedStreetcar=(parsed.constructions||[]).some(x=>x.districtId===d.id&&x.projectId==='streetcar'&&x.status==='complete');
      parsed.districts[d.id].roadAccess=!!d.road||completedStreetcar;
    }
  });
  parsed.logisticsSupply=parsed.logisticsSupply||generateLogisticsSupply();
  parsed.haulersUsed=Array.isArray(parsed.haulersUsed)?parsed.haulersUsed:[];
  parsed.bankOwnerRewarded=parsed.bankOwnerRewarded||{};
  parsed.bureauOwnerRewarded=parsed.bureauOwnerRewarded||{};
  parsed.actionSpaceOccupancy=parsed.actionSpaceOccupancy||{};
  parsed.activationMainActionUsed=parsed.activationMainActionUsed||false;
  parsed.activeWorkerId=parsed.activeWorkerId||null;
  parsed.pendingWorkerAction=parsed.pendingWorkerAction||null;
  parsed.procurementRemaining=parsed.procurementRemaining||0;
  parsed.procurementSource=parsed.procurementSource||null;
  parsed.starterDraftHands=parsed.starterDraftHands||[[],[],[]];
  parsed.starterDiscards=parsed.starterDiscards||[];
  parsed.starterDraftPlayer=parsed.phase==='draft'?(parsed.starterDraftPlayer??0):null;
  parsed.draftSelection=parsed.draftSelection||[];
  parsed.draftRevealed=parsed.phase==='draft'?!!parsed.draftRevealed:false;
  parsed.selectedMarketUid=parsed.selectedMarketUid||parsed.market.find(m=>m&&m.id===parsed.selectedProjectId)?.uid||parsed.market.find(Boolean)?.uid||null;
  parsed.pendingConstruction=null;
  if(parsed.phase==='development'){
    const order=[0,1,2].map((_,i)=>(parsed.firstPlayer+i)%3);
    const candidate=order.find(pid=>(parsed.players[pid]?.workersLeft??0)>0);
    parsed.developmentComplete=candidate==null;
    parsed.developmentPlayer=parsed.developmentComplete?null:(parsed.developmentPlayer!=null&&(parsed.players[parsed.developmentPlayer]?.workersLeft??0)>0?parsed.developmentPlayer:candidate);
  }else{
    parsed.developmentPlayer=null;
    parsed.developmentComplete=false;
  }
  if(!['0.22','0.23','0.24','0.25'].includes(originalVersion)&&parsed.phase==='draft')parsed.phase='declare';
  return parsed;
}
function isMobile(){return window.matchMedia('(max-width:640px), (max-height:500px) and (max-width:960px)').matches;}
function closeMobileContext(){mobileContextOpen=false;syncMobileContext();}
function syncMobileContext(){
  const open=isMobile()&&mobileContextOpen;
  $('#contextPanel')?.classList.toggle('mobile-open',open);
  document.body.classList.toggle('context-open',open);
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));}
function playerColor(pid){return state.players[pid].key;}
function preferredOfficePlayer(){
  if(state.phase==='development'&&currentDeveloper(state)!=null)return currentDeveloper(state);
  if(state.phase==='declare'&&currentDeclarer(state)!=null)return currentDeclarer(state);
  return state.firstPlayer;
}
function typeClass(type){return type==='Жильё'?'type-housing':type==='Коммерция'?'type-commerce':type==='Промышленность'?'type-industry':type==='Логистика'?'type-logistics':type==='Городская служба'?'type-civic':'type-infra';}
const RESOURCE_ORDER=['Lumber','Masonry','Steel'];
function materialLabel(x){return {Lumber:'Дерево',Masonry:'Камень',Steel:'Сталь'}[x]||x;}
function materialShort(x){return {Lumber:'Д',Masonry:'К',Steel:'С'}[x]||'?';}
function materialClass(x){return {Lumber:'lumber',Masonry:'masonry',Steel:'steel'}[x]||'';}
function logisticsKindLabel(kind){
  return {port:'Порт',rail:'Ж/д станция','rail-port':'Порт + ж/д','industrial-rail-port':'Порт + ж/д · промышленный'}[kind]||kind;
}
function logisticsKindCode(kind){
  return {port:'П',rail:'ЖД','rail-port':'П+Ж','industrial-rail-port':'П+Ж'}[kind]||'?';
}
function logisticsProfileText(node){
  const w=node?.weights||LOGISTICS_RESOURCE_WEIGHTS;
  return 'Д '+Math.round((w.Lumber||0)*100)+'% · К '+Math.round((w.Masonry||0)*100)+'% · С '+Math.round((w.Steel||0)*100)+'%';
}

function currentOverviewPlayerId(){
  const active=currentDeveloper(state);
  if(overviewPlayerId==null)return active??state.firstPlayer??0;
  return overviewPlayerId;
}
function materialCountText(items=[]){
  const counts=deliveryCounts(items);
  return RESOURCE_ORDER.map(type=>materialShort(type)+(counts[type]||0)).join(' · ');
}
function missingConstructionMaterials(con){
  const pr=projectById(con?.projectId);
  const need=deliveryCounts(pr?.materials||[]);
  const have=deliveryCounts(con?.materialsDelivered||[]);
  const missing=[];
  for(const type of RESOURCE_ORDER){
    const count=Math.max(0,(need[type]||0)-(have[type]||0));
    if(count)missing.push(materialLabel(type)+' ×'+count);
  }
  return missing;
}
function requirementParts(project){
  return String(project?.requires||'Нет дополнительных требований').split('·').map(x=>x.trim()).filter(Boolean);
}
function requirementChips(project){
  return requirementParts(project).map(x=>'<span class="requirement-chip">'+x+'</span>').join('');
}
function syncStickyLayout(){
  const top=$('.topbar'),players=$('#playersBar');
  if(!top||!players)return;
  const topH=Math.ceil(top.getBoundingClientRect().height);
  const playersH=Math.ceil(players.getBoundingClientRect().height);
  document.documentElement.style.setProperty('--topbar-h',topH+'px');
  document.documentElement.style.setProperty('--hud-stack-h',(topH+playersH)+'px');
}

function showObjectsOnMap(playerId){
  overviewPlayerId=playerId===currentDeveloper(state)?null:playerId;
  focusedConstructionId=null;
  state.view='city';
  closeDrawers();closeMobileContext();
  render();
  requestAnimationFrame(()=>$('#cityBoardScroll')?.scrollIntoView({behavior:'smooth',block:'center'}));
}
function focusDeliveryMap({detail=false,districtId=null}={}){
  if(!isMobile())return;
  mobileMapDetail=!!detail;
  syncMapZoom();
  requestAnimationFrame(()=>{
    if(districtId){focusMapOnDistrict(districtId);return;}
    $('#cityBoardScroll')?.scrollIntoView({behavior:'smooth',block:'center'});
  });
}

function focusMapOnDistrict(districtId){
  const scroll=$('#cityBoardScroll'),svg=$('.city-board');
  if(!scroll||!svg)return;
  if(isMobile()){mobileMapDetail=true;syncMapZoom();}
  requestAnimationFrame(()=>{
    const pos=DISTRICT_POS[districtId];if(!pos)return;
    const rect=svg.getBoundingClientRect();
    const scale=rect.width/1536;
    const left=Math.max(0,pos[0]*scale-scroll.clientWidth/2);
    scroll.scrollTo({left,behavior:'smooth'});
    const sticky=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-stack-h'))||0;
    const bottomReserve=isMobile()?72:0;
    const viewportCenter=sticky+Math.max(120,(window.innerHeight-sticky-bottomReserve)/2);
    const targetDocumentY=window.scrollY+rect.top+pos[1]*scale;
    window.scrollTo({top:Math.max(0,targetDocumentY-viewportCenter),behavior:'smooth'});
  });
}
function focusConstruction(constructionId){
  const con=(state.constructions||[]).find(x=>x.id===constructionId);if(!con)return;
  overviewPlayerId=con.playerId===currentDeveloper(state)?null:con.playerId;
  focusedConstructionId=constructionId;
  state.view='city';
  state.selectedDistrictId=con.districtId;
  if(isMobile())mobileContextOpen=true;
  render();
  requestAnimationFrame(()=>focusMapOnDistrict(con.districtId));
  setTimeout(()=>document.querySelector('[data-construction-token="'+constructionId+'"]')?.classList.remove('focus-pulse'),1700);
}

function resourcePills(materials,delivered=[]){
  const seen={};
  const have=delivered.reduce((a,x)=>{a[x]=(a[x]||0)+1;return a;},{});
  return materials.map(type=>{
    const idx=seen[type]||0;seen[type]=idx+1;
    return '<span class="resource-pip '+materialClass(type)+' '+(idx<(have[type]||0)?'filled':'')+'" title="'+materialLabel(type)+'">'+materialShort(type)+'</span>';
  }).join('');
}
function accessChip(label,on){
  return '<span class="access-chip '+(on?'on':'off')+'">'+label+' '+(on?'✓':'—')+'</span>';
}
function serviceSourceText(sources){
  if(!sources?.length)return '';
  return [...new Set(sources.map(x=>districtById(x.districtId)?.name).filter(Boolean))].join(', ');
}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),1800);}


function deliveryCounts(items=[]){
  return items.reduce((a,t)=>{a[t]=(a[t]||0)+1;return a;},{});
}
function deliveryAssigned(){
  return (deliveryDraft?.drops||[]).flatMap(d=>d.materials||[]);
}
function deliveryRemaining(){
  const c=deliveryCounts(deliveryDraft?.cargo||[]);
  for(const t of deliveryAssigned())c[t]=Math.max(0,(c[t]||0)-1);
  return c;
}
function startDeliveryFlow(playerId){
  if(!canUseFreeAction(state,playerId)){showToast('Доставка доступна только во время вашей активации');return;}
  deliveryDraft={playerId,step:'source',source:null,haulerId:null,cargo:[],route:[],drops:[],listOpen:false};
  state.pendingConstruction=null;state.pendingWorkerAction=null;state.view='city';
  closeDrawers();closeMobileContext();render();
  focusDeliveryMap({detail:false});
}
function cancelDeliveryFlow(){deliveryDraft=null;document.body.classList.remove('delivery-active');render();}
function chooseDeliverySource(source){
  if(deliveryDraft?.step!=='source')return;
  const info=deliverySourceInfo(state,deliveryDraft.playerId,source);
  if(!info?.inventory?.length){showToast('В этом источнике нет ресурсов');return;}
  deliveryDraft.source={kind:source.kind,id:source.id};deliveryDraft.step='load';deliveryDraft.haulerId=null;deliveryDraft.cargo=[];deliveryDraft.route=[];deliveryDraft.drops=[];render();
}
function chooseDeliveryHauler(id){
  if(deliveryDraft?.step!=='load')return;
  const h=availableDeliveryHaulers(state).find(x=>x.id===id);
  if(!h?.available){showToast('Перевозчик уже использован');return;}
  deliveryDraft.haulerId=id;if(deliveryDraft.cargo.length>h.capacity)deliveryDraft.cargo=[];render();
}
function addDeliveryCargo(type){
  if(deliveryDraft?.step!=='load'||!deliveryDraft.haulerId)return;
  const h=availableDeliveryHaulers(state).find(x=>x.id===deliveryDraft.haulerId);
  const src=deliverySourceInfo(state,deliveryDraft.playerId,deliveryDraft.source);
  if(!h||!src)return;
  if(deliveryDraft.cargo.length>=h.capacity){showToast('Перевозчик заполнен');return;}
  const have=deliveryCounts(src.inventory),used=deliveryCounts(deliveryDraft.cargo);
  if((used[type]||0)>=(have[type]||0)){showToast('Больше такого ресурса нет');return;}
  deliveryDraft.cargo.push(type);render();
}
function clearDeliveryCargo(){if(deliveryDraft?.step==='load'){deliveryDraft.cargo=[];render();}}
function beginDeliveryRoute(){
  if(!deliveryDraft?.haulerId||!deliveryDraft.cargo.length){showToast('Выберите перевозчика и груз');return;}
  const src=deliverySourceInfo(state,deliveryDraft.playerId,deliveryDraft.source);if(!src)return;
  deliveryDraft.step='route';deliveryDraft.route=[src.districtId];deliveryDraft.drops=[];deliveryDraft.listOpen=false;render();
  if(isMobile())focusMapOnDistrict(src.districtId);
}
function addDeliveryRouteDistrict(id){
  if(deliveryDraft?.step!=='route')return false;
  const last=deliveryDraft.route[deliveryDraft.route.length-1];
  if(id===last){showToast('Вы уже в этом районе — выберите точку разгрузки в панели доставки');return true;}
  if(!deliveryNeighbors(last).includes(id)){showToast(id==='park'?'Через Golden Gate Park груз не едет':'Чтобы ехать дальше, выберите соседний район');return true;}
  deliveryDraft.route.push(id);render();if(isMobile())focusMapOnDistrict(id);return true;
}
function undoDeliveryRoute(){
  if(deliveryDraft?.step!=='route'||deliveryDraft.route.length<=1)return;
  deliveryDraft.route.pop();
  const routeSet=new Set(deliveryDraft.route);
  deliveryDraft.drops=(deliveryDraft.drops||[]).filter(d=>{
    const con=(state.constructions||[]).find(x=>x.id===d.id);
    return con&&routeSet.has(con.districtId);
  });
  render();
}
function deliveryTarget(kind,id){
  return (deliveryDraft?.drops||[]).find(d=>d.kind===kind&&d.id===id);
}
function deliveryCanDrop(kind,id,type){
  if(deliveryDraft?.step!=='route'||(deliveryRemaining()[type]||0)<=0)return false;
  const con=(state.constructions||[]).find(x=>x.id===id);
  if(!con||con.playerId!==deliveryDraft.playerId||!deliveryDraft.route.includes(con.districtId))return false;
  const assigned=deliveryTarget(kind,id)?.materials||[];
  if(kind==='construction'){
    if(con.status!=='under-construction'||(con.materialsDelivered||[]).length+assigned.length>=CONSTRUCTION_STAGING_CAPACITY)return false;
    const req=deliveryCounts(projectById(con.projectId)?.materials||[]),have=deliveryCounts([...(con.materialsDelivered||[]),...assigned]);
    return (have[type]||0)<(req[type]||0);
  }
  if(kind==='warehouse'){
    if(con.projectId!=='warehouse'||con.status!=='complete')return false;
    if(deliveryDraft.source?.kind==='warehouse'&&deliveryDraft.source.id===id)return false;
    return warehouseInventory(con).length+assigned.length<WAREHOUSE_STORAGE_CAPACITY;
  }
  return false;
}
function addDeliveryDrop(kind,id,type){
  if(!deliveryCanDrop(kind,id,type)){showToast('Этот объект не может принять ресурс');return;}
  let d=deliveryTarget(kind,id);if(!d){d={kind,id,materials:[]};deliveryDraft.drops.push(d);}d.materials.push(type);render();
}
function clearDeliveryDrops(){if(deliveryDraft?.step==='route'){deliveryDraft.drops=[];render();}}
function deliveryPlan(){
  return {playerId:deliveryDraft.playerId,source:{...deliveryDraft.source},haulerId:deliveryDraft.haulerId,cargo:[...deliveryDraft.cargo],route:[...deliveryDraft.route],drops:(deliveryDraft.drops||[]).filter(d=>d.materials.length).map(d=>({kind:d.kind,id:d.id,materials:[...d.materials]}))};
}
function confirmDelivery(){
  if(!deliveryDraft)return;const plan=deliveryPlan(),check=validateDeliveryPlan(state,plan);
  if(!check.ok){showToast(check.reason==='unassigned'?'Разгрузите весь груз':check.reason==='capital'?'Недостаточно Капитал':'План доставки недопустим');return;}
  const r=executeDelivery(state,plan);if(!r.ok){showToast('Доставка не выполнена');return;}
  deliveryDraft=null;document.body.classList.remove('delivery-active');showToast('Delivery −$'+r.cost.total+(r.completed.length?' · стройка завершена':''));
  render();
}
function renderDeliveryPanel(){
  const el=$('#deliveryPanel');if(!el)return;
  const active=!!deliveryDraft&&deliveryDraft.playerId===currentDeveloper(state)&&canUseFreeAction(state,deliveryDraft.playerId);
  document.body.classList.toggle('delivery-active',active);
  if(!active){if(deliveryDraft)deliveryDraft=null;el.className='delivery-panel';el.innerHTML='';return;}
  el.className='delivery-panel active';
  const pid=deliveryDraft.playerId,p=state.players[pid];
  let html='<div class="delivery-head"><div><small>СВОБОДНОЕ ДЕЙСТВИЕ · ДОСТАВКА</small><strong>'+p.name+'</strong></div><button id="cancelDelivery" class="delivery-close">×</button></div>';
  if(deliveryDraft.step==='source'){
    html+='<div class="delivery-instruction">1. Выберите порт, ж/д станцию или свой склад.</div><div class="delivery-source-grid">';
    for(const n of LOGISTICS_NODES){
      const inv=state.logisticsSupply?.[n.id]||[],cnt=deliveryCounts(inv);
      html+='<button class="delivery-source-card" data-ds-node="'+n.id+'" '+(inv.length?'':'disabled')+'><b>'+n.shortName+'</b><span>'+districtById(n.districtId)?.name+' · '+logisticsKindLabel(n.kind)+'</span><small>Д '+(cnt.Lumber||0)+' · К '+(cnt.Masonry||0)+' · С '+(cnt.Steel||0)+' · профиль: '+logisticsProfileText(n)+'</small></button>';
    }
    for(const w of completedWarehouses(state,pid)){
      const inv=warehouseInventory(w),cnt=deliveryCounts(inv);
      html+='<button class="delivery-source-card warehouse-source" data-ds-wh="'+w.id+'" '+(inv.length?'':'disabled')+'><b>Склад</b><span>'+districtById(w.districtId)?.name+' · '+inv.length+'/'+WAREHOUSE_STORAGE_CAPACITY+'</span><small>Д '+(cnt.Lumber||0)+' · К '+(cnt.Masonry||0)+' · С '+(cnt.Steel||0)+'</small></button>';
    }
    html+='</div>';
  }else if(deliveryDraft.step==='load'){
    const src=deliverySourceInfo(state,pid,deliveryDraft.source),haulers=availableDeliveryHaulers(state),sel=haulers.find(h=>h.id===deliveryDraft.haulerId),have=deliveryCounts(src.inventory),used=deliveryCounts(deliveryDraft.cargo);
    html+='<div class="delivery-instruction">2. Перевозчик + груз из <b>'+src.name+'</b>.</div><div class="hauler-grid">';
    for(const h of haulers)html+='<button class="hauler-card '+(deliveryDraft.haulerId===h.id?'selected ':'')+(h.available?'':'used')+'" data-hauler="'+h.id+'" '+(h.available?'':'disabled')+'><b>'+h.capacity+'</b><span>мест</span><strong>$'+h.baseCost+'</strong><small>'+(h.limited?(h.available?'разовый':'ИСПОЛЬЗОВАН'):'∞ обычный')+'</small></button>';
    html+='</div><div class="load-resource-grid">';
    for(const t of RESOURCE_ORDER){
      const left=(have[t]||0)-(used[t]||0),disabled=!sel||left<=0||deliveryDraft.cargo.length>=sel.capacity;
      html+='<button class="load-resource '+materialClass(t)+'" data-load="'+t+'" '+(disabled?'disabled':'')+'><span>'+materialShort(t)+'</span><b>'+materialLabel(t)+'</b><strong>'+(deliveryDraft.source.kind==='node'?'$'+RESOURCE_PRICES[t]:'ОПЛАЧЕНО')+'</strong><small>'+left+' ост.</small></button>';
    }
    html+='</div><div class="cargo-box"><b>Груз '+deliveryDraft.cargo.length+'/'+(sel?.capacity||'—')+'</b><span>'+((deliveryDraft.cargo||[]).map(materialShort).join(' · ')||'пусто')+'</span><button id="clearCargo" class="ghost-btn">Очистить</button></div>';
    const cost=deliveryDraft.haulerId?deliveryPlanCost(state,{...deliveryDraft,route:[src.districtId]}):null;
    html+='<div class="delivery-cost-preview">'+(cost?'Материалы $'+cost.materialCost+' · перевозчик $'+cost.haulerCost:'Выберите перевозчика')+'</div><div class="delivery-footer"><button id="deliveryBackSource" class="ghost-btn">← Источник</button><button id="deliveryBeginRoute" class="primary-btn" '+(deliveryDraft.haulerId&&deliveryDraft.cargo.length?'':'disabled')+'>Маршрут →</button></div>';
  }else{
    const cost=deliveryPlanCost(state,deliveryDraft),left=deliveryRemaining(),leftTotal=Object.values(left).reduce((a,b)=>a+b,0),last=deliveryDraft.route.at(-1),next=deliveryNeighbors(last);
    const routeSet=new Set(deliveryDraft.route);
    const routeTargets=(state.constructions||[]).filter(con=>{
      if(con.playerId!==pid||!routeSet.has(con.districtId))return false;
      if(con.status==='under-construction')return true;
      return con.projectId==='warehouse'&&con.status==='complete'&&!(deliveryDraft.source.kind==='warehouse'&&deliveryDraft.source.id===con.id);
    });
    const hasCurrentTarget=routeTargets.some(con=>{
      if(con.districtId!==last)return false;
      const kind=con.status==='under-construction'?'construction':'warehouse';
      return RESOURCE_ORDER.some(type=>deliveryCanDrop(kind,con.id,type));
    });
    html+='<div class="delivery-instruction">'+(hasCurrentTarget?'3. Вы уже в районе с подходящей точкой разгрузки. Сначала распределите груз ниже. Ехать дальше необязательно.':'3. В текущем районе нет точки, которая может принять этот груз. Добавьте соседний район (+$1 за границу).')+'</div><div class="delivery-route-strip">';
    deliveryDraft.route.forEach((id,i)=>{html+='<span class="route-chip '+(i===deliveryDraft.route.length-1?'current':'')+'"><b>'+i+'</b>'+shortDistrictName(id)+'</span>'+(i<deliveryDraft.route.length-1?'<span>→</span>':'');});
    html+='</div><div class="delivery-cargo-status"><b>Не распределено:</b> Д '+(left.Lumber||0)+' · К '+(left.Masonry||0)+' · С '+(left.Steel||0)+'</div><div class="delivery-targets" id="deliveryTargets">';
    for(const con of routeTargets){
      let kind=null,label='',cap='';
      if(con.status==='under-construction'){kind='construction';label=projectById(con.projectId).name;cap='На стройке '+((con.materialsDelivered||[]).length+(deliveryTarget(kind,con.id)?.materials.length||0))+'/'+CONSTRUCTION_STAGING_CAPACITY;}
      else {kind='warehouse';label='Склад';cap='На складе '+(warehouseInventory(con).length+(deliveryTarget(kind,con.id)?.materials.length||0))+'/'+WAREHOUSE_STORAGE_CAPACITY;}
      const assigned=deliveryTarget(kind,con.id)?.materials||[];
      html+='<div class="delivery-target-card"><b>'+label+'</b><span>'+districtById(con.districtId)?.name+' · '+cap+'</span><small>Назначено: '+(assigned.map(materialShort).join(' · ')||'—')+'</small><div class="drop-buttons">';
      for(const t of RESOURCE_ORDER)html+='<button data-drop-kind="'+kind+'" data-drop-id="'+con.id+'" data-drop-type="'+t+'" '+(deliveryCanDrop(kind,con.id,t)?'':'disabled')+'>+'+materialShort(t)+'</button>';
      html+='</div></div>';
    }
    if(!routeTargets.length)html+='<div class="delivery-target-empty">На текущем маршруте пока нет вашей стройки или склада для разгрузки.</div>';
    html+='</div><div class="route-continue-label"><b>ЕХАТЬ ДАЛЬШЕ</b><span>'+(hasCurrentTarget?'Необязательно — только если часть груза нужно отвезти дальше.':'Выберите следующий соседний район.')+'</span></div><div class="route-next-list">';
    next.forEach(id=>html+='<button data-route-next="'+id+'" class="route-next-btn">+'+shortDistrictName(id)+' <small>+$1</small></button>');
    html+='</div><div class="delivery-route-tools"><button id="deliveryUndoRoute" class="ghost-btn" '+(deliveryDraft.route.length>1?'':'disabled')+'>← район</button><button id="clearDrops" class="ghost-btn">Сбросить разгрузку</button></div>';
    html+='<div class="delivery-total"><span>Материалы <b>$'+(cost?.materialCost||0)+'</b></span><span>Перевозчик <b>$'+(cost?.haulerCost||0)+'</b></span><span>Границы <b>$'+(cost?.routeCost||0)+'</b></span><strong>ИТОГО $'+(cost?.total||0)+'</strong></div><div class="delivery-footer"><button id="deliveryBackLoad" class="ghost-btn">← Груз</button><button id="deliveryConfirm" class="primary-btn" '+(leftTotal===0&&validateDeliveryPlan(state,deliveryPlan()).ok?'':'disabled')+'>Подтвердить · $'+(cost?.total||0)+'</button></div>';
  }
  el.innerHTML=html;
  $('#cancelDelivery')?.addEventListener('click',cancelDeliveryFlow);
  $$('[data-ds-node]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'node',id:b.dataset.dsNode}));
  $$('[data-ds-wh]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'warehouse',id:b.dataset.dsWh}));
  $$('[data-hauler]').forEach(b=>b.onclick=()=>chooseDeliveryHauler(b.dataset.hauler));
  $$('[data-load]').forEach(b=>b.onclick=()=>addDeliveryCargo(b.dataset.load));
  $('#clearCargo')?.addEventListener('click',clearDeliveryCargo);
  $('#deliveryBackSource')?.addEventListener('click',()=>{deliveryDraft.step='source';deliveryDraft.source=null;deliveryDraft.haulerId=null;deliveryDraft.cargo=[];render();});
  $('#deliveryBeginRoute')?.addEventListener('click',beginDeliveryRoute);
  $$('[data-route-next]').forEach(b=>b.onclick=()=>addDeliveryRouteDistrict(b.dataset.routeNext));
  $('#deliveryUndoRoute')?.addEventListener('click',undoDeliveryRoute);
  $('#clearDrops')?.addEventListener('click',clearDeliveryDrops);
  $$('[data-drop-type]').forEach(b=>b.onclick=()=>addDeliveryDrop(b.dataset.dropKind,b.dataset.dropId,b.dataset.dropType));
  $('#deliveryBackLoad')?.addEventListener('click',()=>{deliveryDraft.step='load';deliveryDraft.route=[];deliveryDraft.drops=[];render();});
  $('#deliveryConfirm')?.addEventListener('click',confirmDelivery);
}
function renderDeliveryRouteOverlay(){
  const layer=$('#deliveryRouteLayer');if(!layer)return;
  if(deliveryDraft?.step!=='route'||!deliveryDraft.route?.length){layer.innerHTML='';return;}
  const pts=deliveryDraft.route.map(id=>DISTRICT_POS[id]).filter(Boolean);let html='';
  for(let i=1;i<pts.length;i++)html+='<line class="delivery-route-line" x1="'+pts[i-1][0]+'" y1="'+pts[i-1][1]+'" x2="'+pts[i][0]+'" y2="'+pts[i][1]+'"/>';
  pts.forEach((p,i)=>html+='<g class="delivery-route-stop '+(i===pts.length-1?'current':'')+'" transform="translate('+p[0]+' '+p[1]+')"><circle r="17"/><text y="4">'+i+'</text></g>');
  layer.innerHTML=html;
}

function render(){
  saveState();
  renderTop();renderPlayers();renderViews();renderMarket();renderStarterDraft();renderSupply();renderSupplyNodes();renderWorkerDock();renderCityActions();renderDeliveryPanel();renderCity();renderCityOverview();renderMobileObjectStrip();renderContext();renderOffice();renderLog();renderDebug();renderActionBar();renderTenderSteps();syncMobileContext();syncMapZoom();requestAnimationFrame(syncStickyLayout);
  if(state.phase==='bids'&&!$('#privacyModal').classList.contains('open')&&!pendingBidReveal)openBidCurtain();
}

function renderTop(){
  $('#roundStat').textContent=state.finished?`${MAX_ROUNDS} / ${MAX_ROUNDS}`:`${state.round} / ${MAX_ROUNDS}`;
  $('#firstStat').textContent=state.players[state.firstPlayer].name;
  $('#phaseStat').textContent=state.phase==='draft'?'Стартовый драфт':state.phase==='declare'?'Мэрия · заявки':state.phase==='bids'?'Мэрия · ставки':state.phase==='ready'?'Мэрия · вскрытие':state.phase==='development'?'Развитие города':'Тест завершён';
}

function renderPlayers(){
  const el=$('#playersBar');el.innerHTML='';const cd=currentDeclarer(state),dev=currentDeveloper(state),overviewPid=state.view==='city'?currentOverviewPlayerId():null;
  state.players.forEach((p,i)=>{
    const declareActive=state.phase==='declare'&&cd===i;
    const devActive=state.phase==='development'&&dev===i;
    const overviewActive=state.view==='city'&&overviewPid===i;
    const pill=document.createElement('button');
    pill.className=`player-pill ${declareActive||devActive?'active':''} ${declareActive?'declare-active':''} ${devActive?'dev-active':''} ${overviewActive?'overview':''} ${state.firstPlayer===i?'first':''}`;
    pill.dataset.office=i;
    const debt=(p.loans||[]).length;
    const workerPlaces=[...new Set(playerWorkers(state,p.id).map(w=>districtById(w.districtId)?.name).filter(Boolean))];
    const activeEffect=dev===i&&(state.procurementRemaining||0)>0?`Закупка ×${state.procurementRemaining}`:'';
    const flags=[`Проекты ${p.portfolio.length}/${HAND_LIMIT}`,`Представители: ${workerPlaces.join(' / ')}`,debt?`Кредиты ${debt}`:'',(p.bureauContracts||0)>0?'Контракт':'',activeEffect].filter(Boolean).join(' · ');
    pill.innerHTML=`<span class="player-dot ${p.key}"></span><span class="player-main"><span class="player-name">${p.name}</span><span class="player-stats"><span>👤 ${p.workersLeft??0}</span><span>VP ${p.prestige||0}</span><span>Вл ${p.influence}</span><span>+$${roundIncome(state,p.id)}</span></span>${flags?`<span class="player-flags">${flags}</span>`:''}</span><span class="player-money">$${p.capital}</span>`;
    pill.onclick=()=>{
      if(state.phase==='draft'){showToast('Стартовые руки скрыты до завершения драфта');return;}
      inspectedOffice=i;openDrawer('officeDrawer');renderOffice();
    };
    el.appendChild(pill);
  });
}


function renderCityOverview(){
  const el=$('#cityOverviewPanel');if(!el)return;
  if(state.view!=='city'||state.phase==='draft'){
    el.classList.remove('active');el.innerHTML='';return;
  }
  const pid=currentOverviewPlayerId(),p=state.players[pid];
  if(!p){el.classList.remove('active');el.innerHTML='';return;}
  el.classList.add('active');
  const activePid=currentDeveloper(state);
  const builds=(state.constructions||[]).filter(x=>x.playerId===pid&&x.status==='under-construction');
  const warehouses=completedWarehouses(state,pid);
  const buildHtml=builds.map(con=>{
    const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id);
    const missing=missingConstructionMaterials(con);
    const finish=canCompleteConstruction(state,con.id);
    const ready=finish.ok&&finish.warehouseUse>0;
    return '<button class="overview-object build-object '+(focusedConstructionId===con.id?'focused':'')+'" data-overview-construction="'+con.id+'">'
      +'<span class="overview-object-head"><b>'+pr.name+'</b><em>'+d.name+'</em></span>'
      +'<span class="overview-materials">'+resourcePills(pr.materials,con.materialsDelivered||[])+'</span>'
      +'<span class="overview-object-foot"><strong>'+prog.delivered+'/'+prog.required+'</strong><small>'+(ready?'Склад может завершить':missing.length?'Нужно: '+missing.join(', '):'Комплект собран')+'</small></span>'
      +'</button>';
  }).join('');
  const warehouseHtml=warehouses.map(wh=>{
    const d=districtById(wh.districtId),inv=warehouseInventory(wh),counts=deliveryCounts(inv);
    const supported=builds.filter(x=>x.districtId===wh.districtId).map(x=>projectById(x.projectId)?.name).filter(Boolean);
    return '<button class="overview-object warehouse-object '+(focusedConstructionId===wh.id?'focused':'')+'" data-overview-construction="'+wh.id+'">'
      +'<span class="overview-object-head"><b>Склад</b><em>'+d.name+'</em></span>'
      +'<span class="warehouse-counts"><i class="lumber">Д '+(counts.Lumber||0)+'</i><i class="masonry">К '+(counts.Masonry||0)+'</i><i class="steel">С '+(counts.Steel||0)+'</i><strong>'+inv.length+'/'+WAREHOUSE_STORAGE_CAPACITY+'</strong></span>'
      +'<span class="overview-object-foot"><small>'+(supported.length?'Поддерживает: '+supported.join(', '):'Нет активной стройки в районе')+'</small></span>'
      +'</button>';
  }).join('');
  const viewingOpponent=activePid!=null&&pid!==activePid;
  const procurement=activePid===pid?(state.procurementRemaining||0):0;
  el.innerHTML='<div class="overview-head"><div><span class="player-dot '+p.key+'"></span><b>'+(viewingOpponent?'Просмотр: ':'Объекты: ')+p.name+'</b><small>'+builds.length+' строек · '+warehouses.length+' складов</small></div>'
    +'<div class="overview-head-actions">'+(viewingOpponent?'<button class="overview-active-btn" id="overviewBackActive">Активный игрок</button>':'')+'<button class="overview-office-btn" id="overviewOpenOffice">Офис</button></div></div>'
    +(procurement?'<div class="overview-effect">Закупка активна: <b>'+procurement+'</b> материала по $0 в следующих доставках этой активации</div>':'')
    +'<div class="overview-scroll">'+(buildHtml||'<div class="overview-empty">Незавершённых строек нет</div>')+warehouseHtml+'</div>';
  $$('[data-overview-construction]').forEach(b=>b.onclick=()=>focusConstruction(b.dataset.overviewConstruction));
  $('#overviewBackActive')?.addEventListener('click',()=>{overviewPlayerId=null;renderPlayers();renderCityOverview();});
  $('#overviewOpenOffice')?.addEventListener('click',()=>{inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();});
}

function renderMobileObjectStrip(){
  const el=$('#mobileObjectStrip');if(!el)return;
  if(!isMobile()||state.view!=='city'||state.phase==='draft'){
    el.className='mobile-object-strip';el.innerHTML='';return;
  }
  const pid=currentOverviewPlayerId(),p=state.players[pid],activePid=currentDeveloper(state);
  if(!p){el.className='mobile-object-strip';el.innerHTML='';return;}
  const builds=(state.constructions||[]).filter(x=>x.playerId===pid&&x.status==='under-construction');
  const warehouses=completedWarehouses(state,pid);
  const viewingOpponent=activePid!=null&&pid!==activePid;
  const items=[];
  for(const con of builds){
    const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id),cnt=deliveryCounts(con.materialsDelivered||[]);
    items.push('<button class="mobile-object-chip build" data-mobile-object="'+con.id+'"><b>'+pr.name+'</b><span>'+d.name+' · '+prog.delivered+'/'+prog.required+' · Д'+(cnt.Lumber||0)+' К'+(cnt.Masonry||0)+' С'+(cnt.Steel||0)+'</span></button>');
  }
  for(const wh of warehouses){
    const d=districtById(wh.districtId),inv=warehouseInventory(wh),cnt=deliveryCounts(inv);
    items.push('<button class="mobile-object-chip warehouse" data-mobile-object="'+wh.id+'"><b>Склад · '+d.name+'</b><span>'+inv.length+'/'+WAREHOUSE_STORAGE_CAPACITY+' · Д'+(cnt.Lumber||0)+' К'+(cnt.Masonry||0)+' С'+(cnt.Steel||0)+'</span></button>');
  }
  const procurement=activePid===pid?(state.procurementRemaining||0):0;
  if(procurement)items.unshift('<span class="mobile-effect-chip"><b>Закупка ×'+procurement+'</b><span>материалы по $0</span></span>');
  if(!items.length)items.push('<span class="mobile-empty-chip">Нет активных строек и складов</span>');
  el.className='mobile-object-strip active';
  el.innerHTML='<div class="mobile-object-owner"><span class="player-dot '+p.key+'"></span><span><b>'+(viewingOpponent?'Просмотр: ':'Объекты: ')+p.name+'</b><small>'+builds.length+' стр. · '+warehouses.length+' скл.</small></span>'+(viewingOpponent?'<button id="mobileObjectsBack" aria-label="Вернуться к активному игроку">×</button>':'')+'</div><div class="mobile-object-scroll">'+items.join('')+'</div>';
  $('[data-mobile-object]').forEach(b=>b.onclick=()=>focusConstruction(b.dataset.mobileObject));
  $('#mobileObjectsBack')?.addEventListener('click',()=>{overviewPlayerId=null;focusedConstructionId=null;renderPlayers();renderCityOverview();renderMobileObjectStrip();});
}


function setView(view){state.view=view;$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hallView').classList.toggle('active',view==='hall');$('#cityView').classList.toggle('active',view==='city');saveState();renderContext();}
function renderViews(){
  setViewSilently(state.view||'hall');
  $('#endRoundBtn').disabled=state.phase!=='development'||state.finished||!state.developmentComplete;
  $('#endRoundBtn').textContent=state.phase==='development'&&!state.developmentComplete?'Используйте всех представителей':'Завершить тестовый раунд';
}
function setViewSilently(view){$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hallView').classList.toggle('active',view==='hall');$('#cityView').classList.toggle('active',view==='city');}

function renderTenderSteps(){
  const steps=[['draft','0 Драфт'],['declare','1 Заявки'],['bids','2 Закрытые ставки'],['ready','3 Вскрытие'],['development','4 Развитие']];
  const order={draft:0,declare:1,bids:2,ready:3,development:4,finished:5};const current=order[state.phase]??0;
  $('#tenderSteps').innerHTML=steps.map(([id,label],idx)=>`<span class="step-chip ${idx===current?'active':idx<current?'done':''}">${label}</span>`).join('');
  $('#hallInstruction').textContent=state.phase==='draft'?'Рынок проектов уже открыт. Каждый игрок приватно смотрит 5 стартовых карт и оставляет 2.':state.phase==='declare'?'Игроки по очереди заявляются на один проект или пасуют. Последний игрок видит предыдущие заявки.':state.phase==='bids'?'Проекты уже выбраны. Конкурирующие игроки делают ставки по одному за защитной шторкой.':state.phase==='ready'?'Все закрытые ставки собраны. Вскройте их одновременно и определите победителей.':state.phase==='development'?'Тендеры завершены. Результаты остаются видимыми до конца раунда.':'Тест завершён.';
}

function projectCardRules(p){
  return `<div class="card-rules">
    <div class="card-rule benefit"><b>ДАЁТ</b><span>${p.benefit||p.effect||'—'}</span></div>
    <div class="card-rule action ${p.actionName==='—'?'muted':''}"><b>ДЕЙСТВИЕ · ${p.actionName||'—'}</b><span>${p.actionText||'—'}</span></div>
    <div class="card-rule limits"><b>ОГРАНИЧЕНИЯ</b><span>${p.limits||'—'}</span></div>
  </div>`;
}
function projectCoreCard(p,{topLeft='',topRight='',priceLabel='старт',priceValue=null,selected=false,extraClass='',footer=''}={}){
  const price=priceValue==null?p.open:priceValue;
  return `<article class="project-card full-info ${typeClass(p.type)} ${selected?'selected':''} ${extraClass}">
    <div class="card-stripe"></div>
    <div class="project-inner">
      <div class="card-top"><span class="slot-mark">${topLeft}</span><span class="age-badge">${topRight}</span></div>
      <div class="project-title">${p.name}</div>
      <div class="project-type">${p.type}</div>
      <div class="card-value-row"><div class="opening-price">$${price}<small>${priceLabel}</small></div><span class="prestige-chip">VP ${p.prestige||0}</span></div>
      <div class="card-section-label">МАТЕРИАЛЫ</div>
      <div class="card-resource-row">${resourcePills(p.materials)}</div>
      <div class="card-requirement-band"><b>ТРЕБОВАНИЯ</b><div class="requirement-chip-row">${requirementChips(p)}</div></div>
      ${projectCardRules(p)}
      ${footer}
    </div>
  </article>`;
}

function renderMarket(){
  const el=$('#projectMarket');el.innerHTML='';const cd=currentDeclarer(state);const already=cd!=null&&state.market.some(x=>x&&x.claims.some(c=>c.player===cd));
  for(let slot=0;slot<5;slot++){
    const m=state.market[slot];
    if(!m){const d=document.createElement('div');d.className='project-card empty full-info';d.innerHTML='<span>Пустое место рынка</span>';el.appendChild(d);continue;}
    const p=projectById(m.id),price=openingPrice(m),selected=state.selectedMarketUid===m.uid;
    const claims=m.claims.map(c=>`<span class="claim-chip"><span class="claim-dot ${playerColor(c.player)}"></span>${state.players[c.player].name}</span>`).join('');
    const handFull=cd!=null&&(state.players[cd].portfolio||[]).length>=HAND_LIMIT;
    const canClaim=state.phase==='declare'&&cd!=null&&!already&&!m.sold&&!handFull&&state.players[cd].capital>=price;
    const result=m.result&&typeof m.result==='object'?`<div class="result-box">${state.players[m.result.player].name} · $${m.result.price}<br>${m.result.reason}</div>`:m.result?`<div class="result-box bad">${m.result}</div>`:'';
    const disabledText=m.sold?'Продан':state.phase==='draft'?'После драфта':handFull?'Рука 5/5':canClaim?'Заявиться':'Недоступно';
    const footer=`<div class="claims-row">${claims||'<span class="mini-line">Нет заявок</span>'}</div>${result}<button class="claim-btn ${canClaim?'':'secondary'}" ${canClaim?'':'disabled'} data-slot="${slot}">${disabledText}</button>`;
    const wrap=document.createElement('div');wrap.className='market-card-wrap';
    wrap.innerHTML=projectCoreCard(p,{
      topLeft:`SLOT ${slot+1}`,
      topRight:m.age===1?'LAST CHANCE · −$1':'NEW',
      priceLabel:'opening',
      priceValue:price,
      selected,
      extraClass:`${m.age===1?'old':''} ${m.sold?'sold':''}`,
      footer
    });
    const card=wrap.firstElementChild;
    if(m.age===1)card.querySelector('.age-badge')?.classList.add('last');
    card.onclick=e=>{if(!e.target.closest('button')){state.selectedMarketUid=m.uid;state.selectedProjectId=m.id;if(isMobile())mobileContextOpen=true;render();}};
    card.querySelector('[data-slot]')?.addEventListener('click',e=>{e.stopPropagation();doClaim(slot);});
    el.appendChild(card);
  }
}

function renderStarterDraft(){
  const el=$('#starterDraft');if(!el)return;
  if(state.phase!=='draft'){el.classList.remove('active');el.innerHTML='';return;}
  el.classList.add('active');
  const pid=currentDraftPlayer(state),player=state.players[pid];
  const marketStrip=(state.market||[]).filter(Boolean).map((m,i)=>{
    const p=projectById(m.id);
    return `<div class="draft-market-item ${typeClass(p.type)}"><span class="draft-market-slot">M${i+1}</span><b>${p.name}</b><small>$${openingPrice(m)} open · +$${p.income||0} income · ${p.prestige||0} VP</small><div class="draft-market-materials">${resourcePills(p.materials)}</div></div>`;
  }).join('');
  const marketRef=`<div class="draft-market-ref"><div class="draft-market-ref-head"><b>OPEN MARKET</b><span>Публичный рынок уже открыт — учитывайте его при выборе стартовой стратегии.</span></div><div class="draft-market-strip">${marketStrip}</div></div>`;

  if(!state.draftRevealed){
    el.innerHTML=`<div class="draft-handoff"><div><span class="draft-kicker">PRIVATE STARTING HAND</span><h3>Передайте устройство: ${player.name}</h3><p>${player.name} получит 5 случайных проектов, оставит 2 и сбросит 3. Совпадающие проекты допустимы. Рынок остаётся общедоступной информацией.</p></div><button class="primary-btn" id="revealStarterDraft">Показать 5 карт</button></div>${marketRef}`;
    $('#revealStarterDraft').onclick=()=>{revealStarterDraft(state);render();};
    return;
  }
  const hand=state.starterDraftHands?.[pid]||[];
  const selected=new Set(state.draftSelection||[]);
  const cards=hand.map((card,i)=>{
    const p=projectById(card.id),isSelected=selected.has(card.uid);
    const footer=`<button class="draft-keep-btn ${isSelected?'selected':''}" data-draft-card="${card.uid}">${isSelected?'ОСТАВЛЯЮ ✓':'Оставить эту карту'}</button>`;
    return projectCoreCard(p,{topLeft:`START ${i+1}`,topRight:'KEEP 2 / 5',priceLabel:'starter right',priceValue:0,selected:isSelected,extraClass:'draft-card',footer});
  }).join('');
  el.innerHTML=`<div class="draft-head"><div><span class="draft-kicker">STARTING DRAFT · ${player.name}</span><h3>Оставьте 2 проекта из 5</h3><p>Стартовые права на выбранные проекты стоят $0; землю и материалы вы оплачиваете позже при строительстве. Выбрано: <b>${selected.size}/${STARTER_KEEP}</b>. Лимит руки: <b>${HAND_LIMIT}</b>.</p></div><button class="primary-btn" id="confirmStarterDraft" ${selected.size===STARTER_KEEP?'':'disabled'}>Оставить 2 и передать дальше</button></div>${marketRef}<div class="starter-draft-cards">${cards}</div>`;
  $$('[data-draft-card]').forEach(b=>b.onclick=()=>{
    const r=toggleStarterDraftCard(state,b.dataset.draftCard);
    if(!r.ok&&r.reason==='keep-limit'){showToast('Можно оставить ровно 2 карты');return;}
    render();
  });
  $('#confirmStarterDraft').onclick=()=>{
    const r=confirmStarterDraft(state);
    if(!r.ok){showToast('Выберите ровно 2 карты');return;}
    showToast(r.complete?'Стартовый драфт завершён':`Передайте устройство: ${state.players[r.nextPlayer].name}`);
    render();
  };
}

function renderActionBar(){
  const bar=$('#hallActionBar');
  if(state.phase==='draft'){
    const pid=currentDraftPlayer(state),player=state.players[pid],selected=(state.draftSelection||[]).length;
    if(!state.draftRevealed){
      bar.innerHTML=`<div class="sticky-copy"><strong>Стартовый драфт · ${player.name}</strong><span>Рынок открыт. Покажите только свои 5 стартовых карт.</span></div><div class="sticky-actions"><button class="secondary-btn" id="draftRevealSticky">Показать карты</button></div>`;
      $('#draftRevealSticky').onclick=()=>{revealStarterDraft(state);render();};
    }else{
      bar.innerHTML=`<div class="sticky-copy"><strong>${player.name}: оставить 2 из 5 · выбрано ${selected}/${STARTER_KEEP}</strong><span>Стартовые карты бесплатны; остальные 3 сбрасываются.</span></div><div class="sticky-actions"><button class="primary-btn" id="draftConfirmSticky" ${selected===STARTER_KEEP?'':'disabled'}>Подтвердить 2</button></div>`;
      $('#draftConfirmSticky').onclick=()=>{const r=confirmStarterDraft(state);if(!r.ok){showToast('Выберите ровно 2 карты');return;}render();};
    }
  }else if(state.phase==='declare'){
    const pid=currentDeclarer(state);
    if(pid==null){bar.innerHTML=`<div class="sticky-copy"><strong>Все заявки сделаны</strong><span>Перейдите к закрытым ставкам. Если конкуренции нет, сразу к вскрытию.</span></div><div class="sticky-actions"><button class="secondary-btn" id="nextTenderStage">Перейти к ставкам</button></div>`;$('#nextTenderStage').onclick=()=>{beginBidding(state);render();};}
    else bar.innerHTML=`<div class="sticky-copy"><strong>Заявка: ${state.players[pid].name} · рука ${state.players[pid].portfolio.length}/${HAND_LIMIT}</strong><span>Выберите один проект или пасуйте. При полной руке сначала нужно начать стройку в Development.</span></div><div class="sticky-actions"><button class="ghost-btn" id="passTender">Пас</button></div>`,$('#passTender').onclick=()=>{passDeclaration(state);render();};
  }else if(state.phase==='bids'){
    const q=currentBidTask(state),pl=q?state.players[q.player]:null;bar.innerHTML=`<div class="sticky-copy"><strong>Закрытые ставки</strong><span>${pl?`Следующая ставка: ${pl.name}`:'Ставки собраны'}. Суммы скрыты до вскрытия.</span></div><div class="sticky-actions"><button class="secondary-btn" id="openBidNow">Продолжить ставки</button></div>`;$('#openBidNow').onclick=openBidCurtain;
  }else if(state.phase==='ready'){
    bar.innerHTML='<div class="sticky-copy"><strong>Ставки собраны</strong><span>При равной сумме выигрывает большее Влияние; затем более ранняя заявка.</span></div><div class="sticky-actions"><button class="primary-btn" id="resolveTender">Вскрыть ставки</button></div>';$('#resolveTender').onclick=()=>{resolveTenders(state);state.view='city';render();};
  }else if(state.phase==='development'){
    if(state.developmentComplete){
      bar.innerHTML='<div class="sticky-copy"><strong>Development завершён</strong><span>Все представители использованы.</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">Открыть город</button></div>';$('#enterCity').onclick=()=>{state.view='city';render();};
    }else{
      const dev=currentDeveloper(state),used=state.activationMainActionUsed;
      bar.innerHTML=`<div class="sticky-copy"><strong>Активация: ${state.players[dev].name} · 👤 ${state.players[dev].workersLeft}/3 · рука ${state.players[dev].portfolio.length}/${HAND_LIMIT}</strong><span>${used?'Основное действие использовано — доступны свободные действия или завершение активации.':'Свободные действия можно выполнять до или после основного действия.'}</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">${used?'Продолжить активацию':'Городские действия'}</button></div>`;$('#enterCity').onclick=()=>{state.view='city';render();};
    }
  }else{
    bar.innerHTML='<div class="sticky-copy"><strong>Тест завершён</strong><span>Можно изучить результаты или начать новую партию.</span></div><div class="sticky-actions"><button class="primary-btn" id="restartBottom">Новая партия</button></div>';$('#restartBottom').onclick=newGame;
  }
}

function doClaim(slot){
  const res=claimProject(state,slot);
  if(!res.ok&&res.reason==='capital')showToast('Недостаточно капитала для opening price');
  else if(!res.ok&&res.reason==='hand-limit')showToast(`Рука заполнена: лимит ${HAND_LIMIT} карт`);
  render();
}

function openBidCurtain(){
  if(state.phase!=='bids')return;const q=currentBidTask(state);if(!q){render();return;}pendingBidReveal=true;
  const m=state.market[q.slot],p=projectById(m.id),pl=state.players[q.player];
  $('#modalBackdrop').classList.add('open');$('#privacyModal').classList.add('open');
  $('#privacyCard').innerHTML=`<div class="privacy-curtain"><div class="eyebrow">ПЕРЕДАЙТЕ УСТРОЙСТВО · ЗАКРЫТАЯ СТАВКА</div><div class="big-player">${pl.name}</div><p>Передайте устройство этому игроку. Ставка остальных на экран не выводится.</p><button class="secondary-btn full" id="revealBidForm">Я готов сделать ставку</button></div>`;
  $('#revealBidForm').onclick=()=>{
    const min=openingPrice(m);
    $('#privacyCard').innerHTML=`<div class="eyebrow">ЗАКРЫТАЯ СТАВКА</div><h3>${p.name}</h3><p>Стартовая цена <b>$${min}</b> · капитал ${pl.name}: <b>$${pl.capital}</b></p><div class="bid-form"><label for="secretBid">Ваша максимальная ставка</label><input class="bid-input" id="secretBid" type="number" inputmode="numeric" min="${min}" max="${pl.capital}" value="${min}"/><div class="modal-actions"><button class="primary-btn" id="submitSecretBid">Подтвердить и скрыть</button></div></div>`;
    $('#submitSecretBid').onclick=()=>{const v=$('#secretBid').value;const r=submitBid(state,v);if(!r.ok){showToast(`Ставка должна быть от $${r.min} до $${r.max}`);return;}closePrivacy();pendingBidReveal=false;render();};setTimeout(()=>$('#secretBid')?.focus(),40);
  };
}
function closePrivacy(){ $('#privacyModal').classList.remove('open');$('#modalBackdrop').classList.remove('open'); }

const DISTRICT_POS={
  presidio:[479,177],marina:[735,130],northbeach:[910,140],chinatown:[944,217],
  pacific:[747,231],financial:[1034,303],soma:[1042,480],civic:[835,399],western:[646,352],
  innerrichmond:[436,335],outerrichmond:[243,346],haight:[647,505],innersunset:[479,632],
  sunset:[274,700],mission:[795,644],missionbay:[1106,646],potrero:[1103,822],
  noe:[641,784],bernal:[842,855],park:[358,490],twinpeaks:[480,800]
};
const DISTRICT_META_POS=Object.fromEntries(
  Object.entries(DISTRICT_POS).map(([id,[x,y]])=>[id,[x,y+34]])
);
const TOKEN_OFFSETS=[[-36,-18],[0,-18],[36,-18],[-18,19],[18,19]];
const WORKER_OFFSETS=[[-48,-48],[-16,-48],[16,-48],[48,-48],[-32,-18],[0,-18],[32,-18],[64,-18],[-64,-18]];

function renderSupply(){
  const el=$('#resourceSupply');if(!el)return;
  const total=LOGISTICS_NODES.reduce((sum,node)=>sum+node.throughput,0);
  el.innerHTML='<div class="supply-label"><strong>ГОРОДСКИЕ ПОСТАВКИ</strong><span>Узлы имеют разные профили ресурсов · общий средний баланс сохраняется · доставка = материалы + перевозчик + $1 за границу</span></div><div class="supply-items">'
    +RESOURCE_ORDER.map(type=>'<span class="supply-resource '+materialClass(type)+'"><b>'+materialShort(type)+'</b><span>'+materialLabel(type)+'</span><strong>'+Math.round((LOGISTICS_RESOURCE_WEIGHTS[type]||0)*100)+'%</strong></span>').join('')
    +'<span class="supply-resource city-throughput"><b>'+total+'</b><span>кубиков / раунд</span><strong>'+LOGISTICS_NODES.length+' узлов</strong></span></div>';
}

function renderSupplyNodes(){
  const layer=$('#supplyNodeLayer');if(!layer)return;
  const supply=state.logisticsSupply||{};
  const selecting=deliveryDraft?.step==='source'&&deliveryDraft.playerId===currentDeveloper(state);
  layer.innerHTML=LOGISTICS_NODES.map(node=>{
    const stock=supply[node.id]||[];
    const nodeClass='node-'+node.kind;
    const code=logisticsKindCode(node.kind);
    const start=-((stock.length-1)*7);
    const pips=stock.map((type,i)=>'<circle class="node-resource '+materialClass(type)+'" cx="'+(start+i*14)+'" cy="25" r="5"/>').join('');
    const stockText=stock.length?stock.map(materialLabel).join(', '):'нет груза';
    const selectable=selecting&&stock.length;
    return '<g class="supply-node '+nodeClass+' '+(selectable?'source-available':'')+'" transform="translate('+node.x+' '+node.y+')" data-delivery-node="'+node.id+'">'
      +'<title>'+node.name+' · '+(districtById(node.districtId)?.name||node.districtId)+' · '+logisticsKindLabel(node.kind)+' · пропускная способность '+node.throughput+' · профиль '+logisticsProfileText(node)+' · '+stockText+'</title>'
      +'<circle class="node-pin" r="20"/><text class="node-code" y="4">'+code+'</text>'
      +pips+'<text class="node-name" y="48">'+node.shortName+'</text><text class="node-type" y="61">'+logisticsKindLabel(node.kind)+'</text></g>';
  }).join('');
  $$('[data-delivery-node]').forEach(g=>g.onclick=e=>{
    e.stopPropagation();
    if(deliveryDraft?.step!=='source')return;
    chooseDeliverySource({kind:'node',id:g.dataset.deliveryNode});
  });
}

function loadDevMapBackground(){
  const image=$('#devMapImage');if(!image)return;
  image.setAttribute('href','./assets/v8-map.webp?v=028');
}

function shortDistrictName(id){
  return {presidio:'Presidio',marina:'Marina',northbeach:'N. Beach',chinatown:'Chinatown',pacific:'Pacific',financial:'Financial',civic:'Civic',western:'Western',innerrichmond:'I. Richmond',outerrichmond:'O. Richmond',haight:'Haight',innersunset:'I. Sunset',sunset:'O. Sunset',soma:'SoMa',mission:'Mission',missionbay:'M. Bay',potrero:'Potrero',noe:'Noe',bernal:'Bernal',park:'G.G. Park',twinpeaks:'Twin Peaks'}[id]||districtById(id)?.name||id;
}

function renderWorkerDock(){
  const el=$('#workerDock');if(!el)return;
  if(state.phase!=='development'||state.developmentComplete){
    el.classList.remove('active');
    el.innerHTML='';
    return;
  }
  const pid=currentDeveloper(state),p=state.players[pid],workers=playerWorkers(state,pid),selected=activeWorker(state,pid);
  el.classList.add('active');
  const buttons=workers.map(w=>{
    const isSelected=selected?.id===w.id;
    return `<button class="dock-worker token-${p.key} ${isSelected?'selected':''} ${w.used?'used':''}" data-dock-worker="${w.id}" ${w.used||state.activationMainActionUsed?'disabled':''}><span>#${w.number}</span><b>${shortDistrictName(w.districtId)}</b><small>${w.used?'ИСПОЛЬЗОВАН':isSelected?'ВЫБРАН':'ГОТОВ'}</small></button>`;
  }).join('');
  const reach=selected?workerReachableDistricts(state,pid,selected.id).map(shortDistrictName).join(' · '):'Выберите представителя';
  el.innerHTML=`<div class="worker-dock-head"><span class="player-dot ${p.key}"></span><div><b>${p.name} · представители</b><small>${selected?`#${selected.number}: ${districtById(selected.districtId)?.name} · можно остаться или перейти в соседний район`:'Выберите одного из трёх. Позиции сохраняются между раундами.'}</small></div></div><div class="worker-dock-grid">${buttons}</div><div class="worker-dock-reach"><b>Доступ:</b> ${reach}</div>`;
  $$('[data-dock-worker]').forEach(b=>b.onclick=()=>{
    const r=selectWorker(state,pid,b.dataset.dockWorker);
    if(!r.ok){showToast(r.reason==='used'?'Этот представитель уже использован':'Нельзя выбрать этого представителя');return;}
    state.pendingConstruction=null;
    state.pendingWorkerAction=null;
    render();
  });
}

function syncMapZoom(){
  const scroll=$('#cityBoardScroll');if(!scroll)return;
  scroll.classList.toggle('detail',isMobile()&&mobileMapDetail);
  const fit=$('#mapZoomFit'),detail=$('#mapZoomDetail');
  if(fit)fit.classList.toggle('active',!mobileMapDetail);
  if(detail)detail.classList.toggle('active',mobileMapDetail);
}

function renderCityActions(){
  const el=$('#cityActions');if(!el)return;
  if(state.phase!=='development'){
    el.innerHTML='<div class="city-actions-empty">Городские действия откроются после City Hall Session.</div>';
    return;
  }
  if(state.developmentComplete){
    el.innerHTML='<div class="city-turn-complete"><strong>Development Phase завершена</strong><span>Все 9 представителей использованы. Их позиции сохранятся на следующий раунд.</span></div>';
    return;
  }
  const pid=currentDeveloper(state),p=state.players[pid];
  const mainUsed=!!state.activationMainActionUsed;
  const workers=playerWorkers(state,pid);
  const selected=activeWorker(state,pid);
  const reachable=selected?workerReachableDistricts(state,pid,selected.id):[];
  const banks=completedActionSpaces(state,'bank');
  const bureaus=completedActionSpaces(state,'bureau');
  const shops=completedActionSpaces(state,'shops');
  const clubs=completedActionSpaces(state,'club');
  const availableProjects=(p.portfolio||[]).length;
  const debt=(p.loans||[]).length;
  const contract=(p.bureauContracts||0)>0;
  const procurement=state.procurementRemaining||0;

  const workerButtons=workers.map(w=>{
    const d=districtById(w.districtId),isSelected=selected?.id===w.id;
    return `<button class="worker-choice token-${p.key} ${isSelected?'selected':''} ${w.used?'used':''}" data-select-worker="${w.id}" ${w.used||mainUsed?'disabled':''}><span>#${w.number}</span><b>${d?.name||w.districtId}</b><small>${w.used?'ИСПОЛЬЗОВАН':isSelected?'ВЫБРАН · переход ≤ 1 район':'доступен'}</small></button>`;
  }).join('');
  const reachText=selected?reachable.map(id=>districtById(id)?.name).filter(Boolean).join(' · '):'Сначала выберите представителя';
  const actionReach=con=>!!selected&&workerCanReachDistrict(state,pid,con.districtId,selected.id);
  const hasConstruction=(state.constructions||[]).some(x=>x.playerId===pid&&x.status==='under-construction');
  const spaceFree=con=>actionSpaceOccupant(state,con.id)==null;
  const bankAvailable=!mainUsed&&!!selected&&debt<MAX_ACTIVE_LOANS&&banks.some(x=>actionReach(x)&&spaceFree(x));
  const bureauAvailable=!mainUsed&&!!selected&&!contract&&bureaus.some(x=>actionReach(x)&&spaceFree(x));
  const shopsAvailable=!mainUsed&&!!selected&&p.capital>=1&&hasConstruction&&shops.some(x=>actionReach(x)&&spaceFree(x));
  const clubAvailable=!mainUsed&&!!selected&&p.capital>=1&&clubs.some(x=>actionReach(x)&&spaceFree(x));

  const bankButtons=banks.length?banks.map(bank=>{
    const owner=state.players[bank.playerId],d=districtById(bank.districtId),occupiedBy=actionSpaceOccupant(state,bank.id);
    const occupied=occupiedBy!=null,range=actionReach(bank);
    const disabled=mainUsed||!selected||!range||debt>=MAX_ACTIVE_LOANS||occupied;
    const gain=debt===0?6:5;
    const ownerReward=bank.playerId===pid?'Ваш Bank':'Чужой Bank → владельцу +1 Inf';
    const usedText=occupied?`ИСПОЛЬЗОВАНО · ${state.players[occupiedBy].name}`:!selected?'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ':!range?'СЛИШКОМ ДАЛЕКО':debt>=MAX_ACTIVE_LOANS?'МАКС. 2 КРЕДИТА':mainUsed?'ДЕЙСТВИЕ ИСП.':`+$${gain}`;
    return `<button class="action-space-btn bank ${disabled?'':'available-action'} ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-bank-action="${bank.id}" ${disabled?'disabled':''}><b>Bank · ${owner.name}</b><span>${d.name} · ${occupied?`занят ${state.players[occupiedBy].name}`:ownerReward}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Bank ещё не построен</div>';

  const bureauButtons=bureaus.length?bureaus.map(bureau=>{
    const owner=state.players[bureau.playerId],d=districtById(bureau.districtId),occupiedBy=actionSpaceOccupant(state,bureau.id);
    const occupied=occupiedBy!=null,range=actionReach(bureau);
    const disabled=mainUsed||!selected||!range||contract||occupied;
    const ownerReward=bureau.playerId===pid?'Ваш Bureau':'Чужое Bureau → владельцу +$1';
    const usedText=occupied?`ИСПОЛЬЗОВАНО · ${state.players[occupiedBy].name}`:!selected?'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ':!range?'СЛИШКОМ ДАЛЕКО':contract?'КОНТРАКТ ГОТОВ':mainUsed?'ДЕЙСТВИЕ ИСП.':'−$2 land';
    return `<button class="action-space-btn bureau ${disabled?'':'available-action'} ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-bureau-action="${bureau.id}" ${disabled?'disabled':''}><b>Bureau · ${owner.name}</b><span>${d.name} · ${occupied?`занято ${state.players[occupiedBy].name}`:ownerReward}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Construction Bureau ещё не построено</div>';

  const shopsButtons=shops.length?shops.map(shop=>{
    const owner=state.players[shop.playerId],d=districtById(shop.districtId),occupiedBy=actionSpaceOccupant(state,shop.id);
    const occupied=occupiedBy!=null,range=actionReach(shop);
    const disabled=mainUsed||!selected||!range||occupied||p.capital<1||!hasConstruction;
    const ownerText=shop.playerId===pid?'$1 procurement cost':'$1 → владельцу';
    const usedText=occupied?`ИСПОЛЬЗОВАНО · ${state.players[occupiedBy].name}`:!selected?'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ':!range?'СЛИШКОМ ДАЛЕКО':!hasConstruction?'НЕТ СТРОЙКИ':p.capital<1?'НУЖЕН $1':mainUsed?'ДЕЙСТВИЕ ИСП.':'следующая доставка · 2 бесплатно';
    return `<button class="action-space-btn shops ${disabled?'':'available-action'} ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-shops-action="${shop.id}" ${disabled?'disabled':''}><b>Shopping Row · ${owner.name}</b><span>${d.name} · ${occupied?`занят ${state.players[occupiedBy].name}`:ownerText}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Shopping Row ещё не построен</div>';

  const clubButtons=clubs.length?clubs.map(club=>{
    const owner=state.players[club.playerId],d=districtById(club.districtId),occupiedBy=actionSpaceOccupant(state,club.id);
    const occupied=occupiedBy!=null,range=actionReach(club);
    const disabled=mainUsed||!selected||!range||occupied||p.capital<1;
    const ownerText=club.playerId===pid?'ужин / приём $1':'$1 → владельцу';
    const usedText=occupied?`ИСПОЛЬЗОВАНО · ${state.players[occupiedBy].name}`:!selected?'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ':!range?'СЛИШКОМ ДАЛЕКО':p.capital<1?'НУЖЕН $1':mainUsed?'ДЕЙСТВИЕ ИСП.':'−$1 · +1 Влияние';
    return `<button class="action-space-btn club ${disabled?'':'available-action'} ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-club-action="${club.id}" ${disabled?'disabled':''}><b>Restaurant & Club · ${owner.name}</b><span>${d.name} · ${occupied?`занят ${state.players[occupiedBy].name}`:ownerText}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Restaurant & Club ещё не построен</div>';

  const buildDisabled=availableProjects===0||mainUsed||!selected;
  const capitalDisabled=mainUsed||!selected;
  const deliveryDisabled=!canUseFreeAction(state,pid);
  el.innerHTML=`<div class="turn-banner player-${p.key} ${mainUsed?'main-used':''}"><span class="player-dot ${p.key}"></span><div><small>АКТИВАЦИЯ</small><strong>${p.name}</strong><span>👤 ${p.workersLeft}/3 · VP ${p.prestige||0} · Проекты ${availableProjects} · Кредиты ${debt}/${MAX_ACTIVE_LOANS}${contract?' · Контракт':''}${procurement?` · Закупка ${procurement}`:''}</span></div><span class="activation-state">${mainUsed?'ОСНОВНОЕ ДЕЙСТВИЕ ИСПОЛЬЗОВАНО':selected?`ПРЕДСТАВИТЕЛЬ #${selected.number} ГОТОВ`:'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ'}</span></div>
  <div class="worker-selector"><div class="worker-selector-head"><b>3 REPRESENTATIVES · позиции сохраняются между раундами</b><span>Действие: текущий район или 1 соседний. После действия представитель остаётся там.</span></div><div class="worker-choice-row">${workerButtons}</div><div class="worker-reach"><b>Доступ за эту активацию:</b> ${reachText}</div></div>
  <div class="action-legend"><b>${mainUsed?'СВОБОДНЫЕ ДЕЙСТВИЯ / ЗАВЕРШЕНИЕ АКТИВАЦИИ':'ОСНОВНОЕ ДЕЙСТВИЕ'}</b><span>${procurement?`Закупка: ещё ${procurement} бесплатн. материала при следующей покупке`:mainUsed?'Доставка и погашение кредита доступны до завершения активации':selected?'Выберите основное действие или выполните доставку':'Доставку можно выполнить и до выбора представителя'}</span><em>СВОБОДНЫЕ: Доставка · Завершить со склада · Погасить кредит</em></div>
  ${mainUsed?'<button class="end-activation-btn" id="actionEndActivation">Завершить активацию → следующий игрок</button>':''}
  <div class="city-action-grid ${mainUsed?'main-action-used':''}">
    <button class="city-action-card build ${buildDisabled?'':'action-available'}" id="actionBuild" ${buildDisabled?'disabled':''}><b>Начать строительство</b><span>${availableProjects===0?'Нет доступного проекта':mainUsed?'Основное действие уже использовано':!selected?'Сначала выберите представителя':'Выбрать проект в офисе'}</span><strong>${buildDisabled?'НЕДОСТУПНО':'переход ≤ 1 район · 1 представитель'}</strong></button>
    <button class="city-action-card capital ${capitalDisabled?'':'action-available'}" id="actionRaiseCapital" ${capitalDisabled?'disabled':''}><b>Привлечь капитал</b><span>+$3 и можно остаться или перейти в 1 соседний район</span><strong>${capitalDisabled?'НЕДОСТУПНО':'ВЫБРАТЬ РАЙОН'}</strong></button>
    <button class="city-action-card delivery ${deliveryDisabled?'':'free-action-available'}" id="actionDelivery" ${deliveryDisabled?'disabled':''}><b>Доставка · СВОБОДНОЕ ДЕЙСТВИЕ</b><span>Источник → перевозчик → маршрут → несколько разгрузок</span><strong>${deliveryDisabled?'НЕДОСТУПНО':'НАЧАТЬ'}</strong></button>
    <div class="city-action-card bank-card ${bankAvailable?'action-available':''}"><b>Банковский кредит</b><span>Нужно добраться до района Bank · 1 use / round</span><div class="action-space-list">${bankButtons}</div></div>
    <div class="city-action-card bureau-card ${bureauAvailable?'action-available':''}"><b>Строительное бюро</b><span>Нужно добраться до Bureau · 1 use / round</span><div class="action-space-list">${bureauButtons}</div></div>
    <div class="city-action-card shops-card ${shopsAvailable?'action-available':''}"><b>Торговый ряд · Закупка</b><span>$1 → до 2 материалов бесплатно в следующей Delivery</span><div class="action-space-list">${shopsButtons}</div></div>
    <div class="city-action-card club-card ${clubAvailable?'action-available':''}"><b>Ресторан и клуб</b><span>Нужно добраться до клуба · −$1 → +1 Влияние</span><div class="action-space-list">${clubButtons}</div></div>
  </div>`;

  $$('[data-select-worker]').forEach(b=>b.onclick=()=>{
    const r=selectWorker(state,pid,b.dataset.selectWorker);
    if(!r.ok){showToast(r.reason==='used'?'Этот представитель уже использован':'Нельзя выбрать этого представителя');return;}
    state.pendingConstruction=null;state.pendingWorkerAction=null;render();
  });
  const build=$('#actionBuild');if(build&&!buildDisabled)build.onclick=()=>{inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();};
  const deliveryBtn=$('#actionDelivery');if(deliveryBtn&&!deliveryDisabled)deliveryBtn.onclick=()=>startDeliveryFlow(pid);
  const raise=$('#actionRaiseCapital');if(raise&&!capitalDisabled)raise.onclick=()=>{
    deliveryDraft=null;
    state.pendingConstruction=null;
    state.pendingWorkerAction={type:'raiseCapital',playerId:pid};
    state.view='city';
    closeDrawers();closeMobileContext();
    render();
    showToast('Привлечь капитал: выберите текущий или соседний район на карте');
  };
  const end=$('#actionEndActivation');if(end)end.onclick=()=>{
    deliveryDraft=null;
    const r=endActivation(state,pid);
    if(!r.ok){showToast(r.reason==='main-action-required'?'Сначала сделайте main action':'Нельзя завершить активацию');return;}
    overviewPlayerId=null;focusedConstructionId=null;
    closeDrawers();closeMobileContext();
    showToast(r.complete?'Все представители использованы':`Ход: ${state.players[r.nextPlayer].name} · выберите представителя`);
    render();
  };
  $$('[data-bank-action]').forEach(b=>b.onclick=()=>{
    const r=takeBankLoan(state,pid,b.dataset.bankAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Этот Bank уже занят в этом раунде':r.reason==='max-loans'?'Уже 2 активных кредита':'Bank сейчас недоступен');return;}
    showToast(`Bank Loan +$${r.received}. Представитель #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
  $$('[data-bureau-action]').forEach(b=>b.onclick=()=>{
    const r=takeBureauContract(state,pid,b.dataset.bureauAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Это Bureau уже занято в этом раунде':r.reason==='has-contract'?'Контракт уже есть':'Bureau сейчас недоступно');return;}
    showToast(`Construction Contract получен. Представитель #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
  $$('[data-shops-action]').forEach(b=>b.onclick=()=>{
    const r=useShoppingProcurement(state,pid,b.dataset.shopsAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Этот Shopping Row уже занят':r.reason==='capital'?'Нужен $1':r.reason==='no-construction'?'Нет незавершённой стройки':'Procurement недоступен');return;}
    showToast(`Procurement активирован. Представитель #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
  $$('[data-club-action]').forEach(b=>b.onclick=()=>{
    const r=useSocialClub(state,pid,b.dataset.clubAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Этот Club уже занят':r.reason==='capital'?'Нужен $1 на ужин / приём':'Club сейчас недоступен');return;}
    showToast(`Ужин и связи: −$1 · +1 Влияние. Представитель #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
}

function renderCity(){
  const pending=state.pendingConstruction;
  const workerAction=state.pendingWorkerAction;
  const devPid=currentDeveloper(state);
  const selectedWorker=devPid!=null?activeWorker(state,devPid):null;
  const reachableIds=new Set(selectedWorker?workerReachableDistricts(state,devPid,selectedWorker.id):[]);
  const deliveryMode=deliveryDraft?.playerId===devPid?deliveryDraft:null;
  const mode=$('#constructionMode');
  if(state.phase!=='development'){
    mode.innerHTML='<div><strong>Строительство пока закрыто</strong><span>Сначала завершите City Hall Session.</span></div>';
    mode.className='construction-mode muted';
  }else if(deliveryMode){
    mode.className='construction-mode hidden';
    mode.innerHTML='';
  }else if(workerAction?.type==='raiseCapital'){
    const pl=state.players[workerAction.playerId],w=activeWorker(state,workerAction.playerId);
    mode.className='construction-mode active movement-mode';
    mode.innerHTML=`<div><strong>${pl.name}: Привлечь капитал +$${RAISE_CAPITAL_AMOUNT}</strong><span>Представитель #${w?.number}: выберите его текущий или соседний район. После действия он останется там.</span></div><button class="ghost-btn" id="cancelWorkerAction">Отмена</button>`;
    $('#cancelWorkerAction').onclick=()=>{state.pendingWorkerAction=null;mobileContextOpen=false;render();};
  }else if(pending){
    const pl=state.players[pending.playerId],pr=projectById(pending.projectId);
    mode.className='construction-mode active';
    mode.innerHTML=`<div><strong>${pl.name}: ${pr.name}</strong><span>Выберите район в пределах 1 шага выбранного представителя. Подсветка учитывает Стоимость земли, уличную сеть / ж/д / порт / пожарную защиту / клинику.</span></div><button class="ghost-btn" id="cancelConstruction">Отмена</button>`;
    $('#cancelConstruction').onclick=()=>{state.pendingConstruction=null;mobileContextOpen=false;render();};
  }else if(state.developmentComplete){
    mode.className='construction-mode complete';
    mode.innerHTML='<div><strong>Все представители использованы</strong><span>Development Phase завершена.</span></div>';
  }else{
    mode.className='construction-mode hidden';
    mode.innerHTML='';
  }

  $$('[data-district]').forEach(g=>{
    const id=g.dataset.district;
    g.classList.toggle('selected',state.selectedDistrictId===id);
    g.classList.remove('build-ok','build-blocked','worker-reachable','worker-unreachable','worker-origin','move-target','delivery-route','delivery-current','delivery-next','delivery-blocked');
    if(deliveryMode?.step==='route'){
      const route=deliveryMode.route||[],last=route[route.length-1],next=new Set(deliveryNeighbors(last));
      if(route.includes(id))g.classList.add('delivery-route');
      if(id===last)g.classList.add('delivery-current');
      if(next.has(id))g.classList.add('delivery-next');
      else if(!route.includes(id))g.classList.add('delivery-blocked');
    }else if(!deliveryMode&&selectedWorker&&!state.activationMainActionUsed){
      if(id===selectedWorker.districtId)g.classList.add('worker-origin');
      if(reachableIds.has(id))g.classList.add('worker-reachable');
      else g.classList.add('worker-unreachable');
    }
    if(workerAction?.type==='raiseCapital'&&reachableIds.has(id))g.classList.add('move-target');
    if(pending){
      if(reachableIds.has(id)){
        const check=constructionEligibility(state,pending.playerId,pending.projectId,id);
        g.classList.add(check.ok?'build-ok':'build-blocked');
      }else{
        g.classList.add('build-dim');
      }
    }
  });

  const meta=$('#districtMetaLayer');
  if(meta){
    meta.innerHTML=DISTRICTS.map(d=>{
      const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),[x,y]=DISTRICT_META_POS[d.id]||DISTRICT_POS[d.id],a=districtAccess(state,d.id);
      const pendingCheck=pending?constructionEligibility(state,pending.playerId,pending.projectId,d.id):null;
      const movementLegal=workerAction?.type==='raiseCapital'?reachableIds.has(d.id):null;
      const klass=(d.passable===false?'district-meta special closed':d.buildable===false?'district-meta special passage':
        pending?(reachableIds.has(d.id)?(pendingCheck.ok?'district-meta eligible':'district-meta blocked'):'district-meta dimmed')
        :workerAction?.type==='raiseCapital'?(movementLegal?'district-meta eligible':'district-meta blocked')
        :'district-meta');
      const tags=[a.road?'ST':'',a.rail?'RL':'',a.port?'PT':'',a.fire?'F':'',a.clinic?'C':''].filter(Boolean).join('·');
      const label=d.passable===false?'CLOSED':d.buildable===false?'PASSAGE · NO BUILD':`LAND ${ds.landValue} · ${used}/5${tags?` · ${tags}`:''}`;
      return `<text class="${klass}" x="${x}" y="${y}">${label}</text>`;
    }).join('');
  }

  const workerLayer=$('#workerLayer');
  if(workerLayer){
    const grouped={};
    state.players.forEach(p=>playerWorkers(state,p.id).forEach(w=>(grouped[w.districtId] ||= []).push({p,w})));
    let workerHtml='';
    Object.entries(grouped).forEach(([districtId,items])=>{
      const [cx,cy]=DISTRICT_POS[districtId]||[0,0];
      items.forEach(({p,w},i)=>{
        const [dx,dy]=WORKER_OFFSETS[i]||[0,-42-i*22];
        const isSelected=state.activeWorkerId===w.id&&currentDeveloper(state)===p.id;
        const selectable=state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===p.id&&!w.used&&!state.activationMainActionUsed;
        workerHtml+=`<g class="worker-token token-${p.key} ${w.used?'used':''} ${isSelected?'selected':''} ${selectable?'selectable':''}" transform="translate(${cx+dx} ${cy+dy})" data-worker-token="${w.id}" data-worker-player="${p.id}"><circle r="16"/><text y="4">${w.number}</text><title>${p.name} · представитель #${w.number} · ${districtById(w.districtId)?.name}${w.used?' · использован':''}</title></g>`;
      });
    });
    workerLayer.innerHTML=workerHtml;
    $$('[data-worker-token]').forEach(g=>g.onclick=()=>{
      const workerPlayer=Number(g.dataset.workerPlayer);
      if(deliveryDraft)return;
      if(state.phase!=='development'||currentDeveloper(state)!==workerPlayer)return;
      const r=selectWorker(state,workerPlayer,g.dataset.workerToken);
      if(!r.ok)return;
      state.pendingConstruction=null;state.pendingWorkerAction=null;render();
    });
  }

  const layer=$('#constructionLayer');
  if(layer){
    const byDistrict={};(state.constructions||[]).forEach(x=>(byDistrict[x.districtId] ||= []).push(x));
    let html='';
    Object.entries(byDistrict).forEach(([districtId,list])=>{
      const [cx,cy]=DISTRICT_POS[districtId]||[0,0];
      list.forEach((con,i)=>{
        const [dx,dy]=TOKEN_OFFSETS[i]||[0,34+i*12];
        const pl=state.players[con.playerId],pr=projectById(con.projectId),prog=constructionProgress(state,con.id);
        const complete=con.status==='complete',isWarehouse=complete&&con.projectId==='warehouse';
        const focusClass=focusedConstructionId===con.id?'focus-pulse':'';
        const whSource=deliveryMode?.step==='source'&&isWarehouse&&con.playerId===deliveryMode.playerId&&warehouseInventory(con).length?` data-delivery-warehouse="${con.id}"`:``;
        let content='';
        if(isWarehouse){
          const inv=warehouseInventory(con),cnt=deliveryCounts(inv);
          content=`<rect x="-31" y="-19" width="62" height="38" rx="10"/><text class="warehouse-token-title" y="-4">СКЛ ${inv.length}/${WAREHOUSE_STORAGE_CAPACITY}</text><text class="warehouse-token-stock" y="10">Д${cnt.Lumber||0} К${cnt.Masonry||0} С${cnt.Steel||0}</text>`;
        }else{
          const label=complete?'✓':`${prog.delivered}/${prog.required}`;
          content=`<rect x="-29" y="-16" width="58" height="32" rx="10"/><text y="4">${label}</text>`;
        }
        const title=complete
          ?(isWarehouse?`${pl.name}: Склад · ${materialCountText(warehouseInventory(con))}`:`${pl.name}: ${pr.name} · готово`)
          :`${pl.name}: ${pr.name} · ${prog.delivered}/${prog.required} · ${missingConstructionMaterials(con).join(', ')}`;
        html+=`<g class="construction-token ${complete?'complete':'under'} token-${pl.key} ${whSource?'source-available':''} ${focusClass}" transform="translate(${cx+dx} ${cy+dy+30})" data-construction-token="${con.id}"${whSource}>${content}<title>${title}</title></g>`;
      });
    });
    layer.innerHTML=html;
    $$('[data-construction-token]').forEach(g=>g.onclick=e=>{
      if(deliveryDraft)return;
      e.stopPropagation();
      focusConstruction(g.dataset.constructionToken);
    });
    $$('[data-delivery-warehouse]').forEach(g=>g.onclick=e=>{e.stopPropagation();chooseDeliverySource({kind:'warehouse',id:g.dataset.deliveryWarehouse});});
  }
  renderDeliveryRouteOverlay();
}

function startConstructionFlow(playerId,projectId){
  deliveryDraft=null;
  const pl=state.players[playerId],pr=projectById(projectId);
  if(state.phase!=='development'){showToast('Сначала завершите тендеры');return;}
  if(!canTakeMainAction(state,playerId)){showToast(activeWorker(state,playerId)?'Сейчас нельзя начать новое main action':'Сначала выберите одного из 3 представителей');return;}
  if(!pl.portfolio.includes(projectId)){showToast('Проект уже недоступен');return;}
  state.pendingWorkerAction=null;
  state.pendingConstruction={playerId,projectId};
  state.view='city';state.selectedDistrictId=state.selectedDistrictId||'civic';
  mobileContextOpen=false;closeDrawers();render();
  showToast(`Выберите район для «${pr.name}»`);
}

function confirmConstructionInDistrict(){
  const pending=state.pendingConstruction;if(!pending)return;
  const r=beginConstruction(state,pending.playerId,pending.projectId,state.selectedDistrictId);
  if(!r.ok){showToast(r.reasons?.[0]||'Нельзя начать строительство здесь');render();return;}
  mobileContextOpen=false;
  const land=r.bureauDiscount>0?`земля $${r.cost} · contract −$${r.bureauDiscount}`:`земля $${r.cost}`;
  showToast(`Основное действие: стройка начата · ${land}. Worker #${r.worker?.number} теперь в ${districtById(state.selectedDistrictId)?.name}.`);
  render();
}

function confirmRaiseCapitalInDistrict(targetDistrictId=state.selectedDistrictId){
  const pending=state.pendingWorkerAction;
  if(!pending||pending.type!=='raiseCapital')return;
  const worker=activeWorker(state,pending.playerId);
  if(!worker||!workerCanReachDistrict(state,pending.playerId,targetDistrictId,worker.id)){
    showToast('Этот район дальше одного шага');
    return;
  }
  const from=worker.districtId;
  const r=raiseCapital(state,pending.playerId,targetDistrictId);
  if(!r.ok){
    showToast(r.reason==='worker-range'?'Этот район дальше одного шага':'Привлечь капитал сейчас недоступен');
    return;
  }
  state.pendingWorkerAction=null;
  state.selectedDistrictId=targetDistrictId;
  mobileContextOpen=false;
  const fromName=districtById(from)?.name||from,toName=districtById(targetDistrictId)?.name||targetDistrictId;
  showToast(`Привлечь капитал +$${r.amount} · #${r.worker.number}: ${fromName}${from===targetDistrictId?'':` → ${toName}`}`);
  render();
}

function renderContext(){
  const panel=$('#contextPanel');
  const close=isMobile()?'<button class="context-close" id="contextClose" aria-label="Закрыть подробности">×</button>':'';
  if(state.view==='hall'){
    const m=state.market.find(x=>x&&x.uid===state.selectedMarketUid)||state.market.find(Boolean);
    if(!m){panel.innerHTML=close+'<div class="empty-state">На рынке нет проекта.</div>';wireContextClose();return;}
    const p=projectById(m.id),claims=m.claims.map(c=>state.players[c.player].name).join(', ')||'нет';
    panel.innerHTML=`${close}<div class="detail-type">${p.type}</div><h3>${p.name}</h3><div class="detail-price">$${openingPrice(m)} <span style="font-size:11px;color:#84786a">opening</span></div><div class="project-vp-callout">Престиж <b>+${p.prestige||0} VP</b> после завершения</div><div class="detail-section"><div class="detail-label">Материалы</div><div class="project-material-line">${resourcePills(p.materials)}</div></div><div class="detail-section"><div class="detail-label">Условия строительства</div><div class="detail-text">${p.requires}</div></div><div class="detail-section"><div class="detail-label">После постройки</div><div class="detail-text">${p.effect}</div></div><div class="detail-section"><div class="detail-label">Тендер</div><div class="detail-text">Заявки: ${claims}<br>${m.age===1?'Последний шанс · скидка $1':'Новый проект'}${m.result?`<br><b>Результат: ${state.players[m.result.player].name} за $${m.result.price}</b>`:''}</div></div>`;
  }else{
    const d=districtById(state.selectedDistrictId)||DISTRICTS.find(x=>x.id==='civic')||DISTRICTS[0],ds=state.districts[d.id],access=districtAccess(state,d.id);
    const used=districtConstructionCount(state,d.id),free=d.buildable===false?0:Math.max(0,ds.sites-used);
    const builtHere=(state.constructions||[]).filter(x=>x.districtId===d.id);
    const focusedHere=builtHere.find(x=>x.id===focusedConstructionId);
    let focusedHtml='';
    if(focusedHere){
      const fp=projectById(focusedHere.projectId),owner=state.players[focusedHere.playerId];
      if(focusedHere.status==='under-construction'){
        const prog=constructionProgress(state,focusedHere.id),missing=missingConstructionMaterials(focusedHere);
        focusedHtml=`<div class="focused-object-detail"><div class="focused-object-title"><span class="player-dot ${owner.key}"></span><span><b>${fp.name}</b><small>${owner.name} · стройка ${prog.delivered}/${prog.required}</small></span></div><div class="project-material-line">${resourcePills(fp.materials,focusedHere.materialsDelivered||[])}</div><div class="focused-object-note">${missing.length?'Нужно: '+missing.join(', '):'Все материалы доставлены'}</div></div>`;
      }else if(focusedHere.projectId==='warehouse'){
        const inv=warehouseInventory(focusedHere);
        focusedHtml=`<div class="focused-object-detail warehouse"><div class="focused-object-title"><span class="player-dot ${owner.key}"></span><span><b>Склад</b><small>${owner.name} · ${d.name} · ${inv.length}/${WAREHOUSE_STORAGE_CAPACITY}</small></span></div><div class="focused-object-note">На складе: ${materialCountText(inv)}</div></div>`;
      }else{
        focusedHtml=`<div class="focused-object-detail"><div class="focused-object-title"><span class="player-dot ${owner.key}"></span><span><b>${fp.name}</b><small>${owner.name} · готово</small></span></div><div class="focused-object-note">Престиж +${fp.prestige||0} VP · Доход +${fp.income||0} / раунд</div></div>`;
      }
    }
    const fireSource=serviceSourceText(access.fireSources),clinicSource=serviceSourceText(access.clinicSources);
    const accessHtml=`<div class="access-grid">${accessChip('STREET',access.road)}${accessChip('RAIL',access.rail)}${accessChip('PORT',access.port)}${accessChip('FIRE',access.fire)}${accessChip('CLINIC',access.clinic)}</div>${fireSource?`<div class="access-source">Fire Protection: ${fireSource}</div>`:''}${clinicSource?`<div class="access-source">Clinic access: ${clinicSource}</div>`:''}`;

    let workerActionHtml='';
    if(state.pendingWorkerAction?.type==='raiseCapital'){
      const pid=state.pendingWorkerAction.playerId,w=activeWorker(state,pid);
      const canMove=!!w&&workerCanReachDistrict(state,pid,d.id,w.id);
      workerActionHtml=`<div class="construction-confirm ${canMove?'ok':'blocked'}"><div class="detail-label">Привлечь капитал · move</div><strong>+$${RAISE_CAPITAL_AMOUNT} · представитель #${w?.number||'—'}</strong><div class="detail-text">${canMove?`После действия останется в ${d.name}.`:'Слишком далеко: максимум текущий или соседний район.'}</div>${canMove?'<button class="primary-btn full" id="confirmRaiseCapital">Получить $3 здесь</button>':''}</div>`;
    }

    let constructionHtml='';
    if(state.pendingConstruction){
      const pending=state.pendingConstruction,pl=state.players[pending.playerId],pr=projectById(pending.projectId),check=constructionEligibility(state,pending.playerId,pending.projectId,d.id);
      const priceLine=check.bureauDiscount>0?`<span>Земля <b>$${check.baseCost} → $${check.cost}</b></span><span>Contract <b>−$${check.bureauDiscount}</b></span>`:`<span>Земля <b>$${check.cost}</b></span><span>Представитель <b>1</b></span>`;
      constructionHtml=`<div class="construction-confirm ${check.ok?'ok':'blocked'}"><div class="detail-label">Начать строительство</div><strong>${pl.name} · ${pr.name}</strong><div class="context-requirements"><b>Требования</b><div class="requirement-chip-row">${requirementChips(pr)}</div></div><div class="construction-cost">${priceLine}</div>${check.ok?'<button class="primary-btn full" id="confirmConstruction">Начать строительство</button>':`<div class="eligibility-errors">${check.reasons.map(x=>`<div>• ${x}</div>`).join('')}</div>`}</div>`;
    }

    const objects=builtHere.length?builtHere.map(x=>{
      const pr=projectById(x.projectId),prog=constructionProgress(state,x.id),pl=state.players[x.playerId];
      const land=x.projectId==='factory'&&x.status==='complete'?' · Land −1':['firehouse','clinic','publicworks','streetcar'].includes(x.projectId)&&x.status==='complete'?' · Land +1':'';
      return `<div class="mini-construction ${x.status==='complete'?'done':''}"><span class="player-dot ${pl.key}"></span><span><b>${pr.name}</b><small>${pl.name} · ${x.status==='complete'?`готово · VP +${pr.prestige||0} · Доход +$${pr.income||0}${land}`:`материалы ${prog.delivered}/${prog.required}`}</small></span><button class="mini-open" data-open-construction="${x.id}">Открыть</button></div>`;
    }).join(''):'Пока нет.';

    const neighborNames=districtNeighbors(d.id).map(id=>districtById(id)?.name).filter(Boolean).join(', ');
    const statsHtml=d.buildable===false
      ?`<div class="district-stats special-stats"><div><span>СТАТУС</span><strong>${d.passable===false?'CLOSED':'PASSAGE'}</strong></div><div><span>СТРОИТЬ</span><strong>НЕТ</strong></div><div><span>ПЕРЕДВИЖЕНИЕ</span><strong>${d.passable===false?'НЕТ':'ДА'}</strong></div></div>`
      :`<div class="district-stats"><div><span>LAND VALUE</span><strong>${ds.landValue}</strong></div><div><span>ПЛОЩАДКИ</span><strong>${used} / 5</strong></div><div><span>СВОБОДНО</span><strong>${free}</strong></div></div>`;
    panel.innerHTML=`${close}<div class="detail-type">${d.buildable===false?'SPECIAL AREA':'DISTRICT'}</div><h3>${d.name}</h3>${statsHtml}${focusedHtml}<div class="detail-section"><div class="detail-label">Доступ и городские службы</div>${d.buildable===false?'':accessHtml}<div class="access-neighbors">Соседние доступные зоны: ${neighborNames||'нет'}</div></div><div class="detail-section"><div class="detail-label">Характер района</div><div class="detail-text">${d.hint}</div></div>${workerActionHtml}${constructionHtml}<div class="detail-section"><div class="detail-label">Объекты в районе</div><div class="detail-text">${objects}</div></div><div class="district-placeholder"><b>v0.28 Map Test:</b> 18 строительных районов по 5 слотов. Golden Gate Park — проходная зона без строительства. Presidio и Twin Peaks закрыты. Fire House и Clinic по-прежнему работают на свой и соседний район; Rail/Port заданы картой.</div>`;
    const confirmMove=$('#confirmRaiseCapital');if(confirmMove)confirmMove.onclick=()=>confirmRaiseCapitalInDistrict(d.id);
    const confirm=$('#confirmConstruction');if(confirm)confirm.onclick=confirmConstructionInDistrict;
    $$('[data-open-construction]').forEach(b=>b.onclick=()=>{const con=state.constructions.find(x=>x.id===b.dataset.openConstruction);if(!con)return;inspectedOffice=con.playerId;closeMobileContext();openDrawer('officeDrawer');renderOffice();});
  }
  wireContextClose();
}
function wireContextClose(){const b=$('#contextClose');if(b)b.onclick=closeMobileContext;}

function renderOffice(){
  const p=state.players[inspectedOffice]||state.players[0];$('#officeTitle').textContent=`Офис · ${p.name}`;
  const activePlayerId=currentDeveloper(state);
  const isActive=state.phase==='development'&&!state.developmentComplete&&activePlayerId===p.id;
  const active=(state.constructions||[]).filter(x=>x.playerId===p.id);
  const loans=p.loans||[],debt=loans.reduce((s,x)=>s+x.principal,0),interest=loanInterest(state,p.id);
  const canRepay=isActive&&loans.some(x=>x.interestPaid)&&p.capital>=LOAN_PRINCIPAL;
  const procurement=isActive?(state.procurementRemaining||0):0;
  const loanHtml=loans.length?loans.map((loan,i)=>`<div class="loan-row"><span><b>Кредит ${i+1}</b><small>${loan.interestPaid?'процент уже уплачен · можно погашать':'погашение откроется после фазы дохода'}</small></span><strong>$${loan.principal}</strong></div>`).join(''):'<div class="empty-state compact">Активных кредитов нет.</div>';

  const available=p.portfolio.map((id,handIndex)=>{
    const pr=projectById(id),isTurn=canTakeMainAction(state,p.id);
    const buttonText=state.phase!=='development'?'После тендеров':!isActive?'Не ваша активация':state.activationMainActionUsed?'Основное действие уже использовано':'Начать строительство';
    const footer=`<button class="secondary-btn full hand-build-btn" data-start-project="${id}" data-player="${p.id}" ${isTurn?'':'disabled'}>${buttonText}</button>`;
    return projectCoreCard(pr,{topLeft:`HAND ${handIndex+1}/${HAND_LIMIT}`,topRight:'IN HAND',priceLabel:'base open',priceValue:pr.open,extraClass:'hand-card',footer});
  }).join('');

  const activeHtml=active.map(con=>{
    const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id);
    if(con.status==='complete'){
      const wh=con.projectId==='warehouse'?`<div class="warehouse-note">Склад · Хранение <b>${warehouseInventory(con).length}/${WAREHOUSE_STORAGE_CAPACITY}</b> · может быть источником/точкой доставки и снабжать стройки в этом районе.</div>`:'';
      let actionNote='';
      if(['bank','bureau','shops','club'].includes(con.projectId)){
        const occupant=actionSpaceOccupant(state,con.id);
        const labels={bank:'Bank Loan',bureau:'Construction Contract −$2 land',shops:'Procurement: $1 → до 2 материалов бесплатно в следующей Delivery',club:'Networking Dinner: −$1 → +1 Влияние'};
        actionNote=`<div class="action-building-note ${occupant!=null?'used':''}">Ячейка действия: ${labels[con.projectId]} · ${occupant!=null?`ИСПОЛЬЗОВАНО В ЭТОМ РАУНДЕ · ${state.players[occupant].name}`:'доступно в этом раунде'}</div>`;
      }else if(['firehouse','clinic','publicworks','streetcar'].includes(con.projectId)){
        actionNote=con.projectId==='streetcar'?'<div class="land-building-note">Трамвай повысил стоимость земли на $1 и, если требовалось, открыл уличную сеть в районе.</div>':'<div class="land-building-note">После завершения этот объект повысил стоимость земли района на $1.</div>';
      }else if(con.projectId==='factory'){
        actionNote='<div class="factory-building-note">После завершения фабрика снизила стоимость земли района на $1.</div>';
      }
      return `<div class="portfolio-card construction-card completed"><div class="construction-card-head"><span><strong>${pr.name}</strong><small>${d.name}</small></span><span class="status-badge done">ГОТОВО</span></div><div class="project-material-line large">${resourcePills(pr.materials,con.materialsDelivered)}</div><div class="completed-effect"><b>Престиж +${pr.prestige||0} VP</b> · Доход +$${pr.income||0} / раунд · ${pr.effect}</div>${wh}${actionNote}</div>`;
    }

    const finish=canCompleteConstruction(state,con.id);
    const warehouses=completedWarehouses(state,p.id,con.districtId);
    const stored=warehouses.reduce((sum,w)=>sum+warehouseInventory(w).length,0);
    const needsWarehouse=pr.materials.length>CONSTRUCTION_STAGING_CAPACITY;
    const warehouseLine=warehouses.length
      ?`<div class="warehouse-support">Поддержка склада: <b>${stored}/${warehouses.length*WAREHOUSE_STORAGE_CAPACITY}</b> хранится в ${d.name}</div>`
      :needsWarehouse?'<div class="capacity-warning">Для здания на 4+ ресурса нужен завершённый склад в этом районе.</div>':'';
    const finishBtn=isActive&&finish.ok
      ?`<button class="primary-btn full complete-storage-btn" data-complete-build="${con.id}">Завершить · использовать Warehouse</button>`
      :'';
    return `<div class="portfolio-card construction-card active-build ${isActive?'':'view-only'}"><div class="construction-card-head"><span><strong>${pr.name}</strong><small>${d.name}</small></span><span class="status-badge">${prog.delivered}/${prog.required}</span></div><div class="project-material-line large">${resourcePills(pr.materials,con.materialsDelivered)}</div><div class="site-capacity"><span>Staging</span><b>${prog.delivered} / ${CONSTRUCTION_STAGING_CAPACITY}</b><small>Ресурсы привозятся через Delivery</small></div>${warehouseLine}${finishBtn}</div>`;
  }).join('');

  const contract=(p.bureauContracts||0)>0?'<span class="contract-chip">Construction Contract · −$2 next paid land</span>':'<span class="contract-chip empty">No Construction Contract</span>';
  const procurementChip=procurement?`<span class="procurement-chip">Procurement · ${procurement} material${procurement===1?'':'s'} at $0</span>`:'';
  const activationNote=isActive
    ?`<div class="office-activation active"><b>АКТИВАЦИЯ ${p.name}</b><span>Доставка / завершение со склада / погашение кредита доступны до и после основного действия. Ход не перейдёт дальше, пока вы не завершите активацию.</span></div>`
    :state.phase==='development'&&!state.developmentComplete
      ?`<div class="office-activation locked"><b>ТОЛЬКО ПРОСМОТР</b><span>Сейчас активация: ${state.players[activePlayerId].name}. Доставка / завершение / погашение кредита доступны только активному игроку.</span></div>`
      :'';

  $('#officeContent').innerHTML=`<div class="office-tabs">${state.players.map((x,i)=>`<button class="office-tab ${i===inspectedOffice?'active':''}" data-office-tab="${i}">${x.name}</button>`).join('')}</div>${activationNote}<div class="office-summary four"><div class="office-stat"><span>Капитал</span><strong>$${p.capital}</strong></div><div class="office-stat"><span>Престиж</span><strong>${p.prestige||0} VP</strong></div><div class="office-stat"><span>Влияние</span><strong>${p.influence}</strong></div><div class="office-stat"><span>Следующий доход</span><strong>+$${roundIncome(state,p.id)}</strong></div></div><div class="office-mini-note">Представители: <b>${p.workersLeft??0}/3</b> · Рука: <b>${p.portfolio.length}/${HAND_LIMIT}</b> · Доставка / завершение со склада / погашение кредита = свободные действия только во время собственной активации.</div><div class="loan-panel"><div class="loan-head"><span><b>КРЕДИТЫ ${loans.length}/${MAX_ACTIVE_LOANS}</b><small>Долг $${debt} · Процент −$${interest} к следующему доходу</small></span><button class="mini-repay" id="repayLoanBtn" ${canRepay?'':'disabled'}>Погасить $6</button></div>${loanHtml}</div><div class="contract-line">${contract}${procurementChip}</div><div class="detail-label">Доступные проекты</div><div style="margin-top:7px">${available||'<div class="empty-state">Нет доступных проектов. Получите их на сессии мэрии.</div>'}</div><div class="detail-label office-subhead">Стройки и здания</div><div style="margin-top:7px">${activeHtml||'<div class="empty-state compact">Объектов пока нет.</div>'}</div><div class="district-placeholder"><b>v0.28:</b> рука ограничена 5 проектами. Основное действие привязано к представителю; доставка — отдельное повторяемое свободное действие.</div>`;

  $$('[data-office-tab]').forEach(b=>b.onclick=()=>{inspectedOffice=+b.dataset.officeTab;renderOffice();});
  $$('[data-start-project]').forEach(b=>b.onclick=()=>startConstructionFlow(+b.dataset.player,b.dataset.startProject));
  $$('[data-complete-build]').forEach(b=>b.onclick=()=>{const r=completeConstructionFromStorage(state,b.dataset.completeBuild);if(!r.ok){showToast(r.reason==='not-active-player'?'Не ваша активация':'На стройке и Warehouse пока нет полного набора материалов');return;}showToast('Строительство завершено из Warehouse');render();});
  const repay=$('#repayLoanBtn');if(repay)repay.onclick=()=>{const r=repayLoan(state,p.id);if(!r.ok){showToast(r.reason==='not-active-player'?'Погашение доступно только активному игроку':r.reason==='capital'?'Недостаточно денег':r.reason==='not-seasoned'?'Сначала по кредиту должна пройти фаза дохода':'Сейчас нельзя погасить');return;}showToast('Кредит погашен · −$6');render();};
}

function renderLog(){const el=$('#gameLog');el.innerHTML=state.log.map(x=>`<div class="${x.cls||''}">${escapeHtml(x.msg)}</div>`).join('');el.scrollTop=el.scrollHeight;}
function renderDebug(){
  const players=state.players.map((p,i)=>`<div class="debug-player"><div class="debug-head"><span>${p.name}</span><span>${p.capital} · VP ${p.prestige||0} · +${roundIncome(state,p.id)} · Inf ${p.influence} · 👤 ${p.workersLeft??0}</span></div><div class="debug-actions"><button class="mini-btn" data-money="${i}" data-delta="5">+$5</button><button class="mini-btn" data-money="${i}" data-delta="-5">−$5</button><button class="mini-btn" data-inf="${i}" data-delta="1">Inf +1</button><button class="mini-btn" data-workers="${i}">👤 = 3</button></div></div>`).join('');
  const lands=DISTRICTS.map(d=>`<div class="debug-land"><span>${d.name}</span><div><button class="mini-btn" data-land="${d.id}" data-delta="-1">−</button><b>${state.districts[d.id].landValue}</b><button class="mini-btn" data-land="${d.id}" data-delta="1">+</button></div></div>`).join('');
  $('#debugPlayers').innerHTML=players+`<div class="debug-section-title">Land Value</div>${lands}`;
  $$('[data-money]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.money];p.capital=Math.max(0,p.capital+(+b.dataset.delta));render();});
  $$('[data-inf]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.inf];p.influence=Math.max(0,p.influence+(+b.dataset.delta));render();});
  $$('[data-workers]').forEach(b=>b.onclick=()=>{const pid=+b.dataset.workers;state.players[pid].workersLeft=3;if(state.phase==='development'){state.developmentComplete=false;if(currentDeveloper(state)==null){state.developmentPlayer=pid;state.activationMainActionUsed=false;}}render();});
  $$('[data-land]').forEach(b=>b.onclick=()=>{const id=b.dataset.land;setLandValue(state,id,state.districts[id].landValue+(+b.dataset.delta));render();});
}

function openDrawer(id){closeMobileContext();closeDrawers();$('#drawerBackdrop').classList.add('open');$('#'+id).classList.add('open');}
function closeDrawers(){$('#drawerBackdrop').classList.remove('open');$$('.drawer').forEach(d=>d.classList.remove('open'));}
function newGame(){if(!confirm('Начать новую тестовую партию?'))return;deliveryDraft=null;overviewPlayerId=null;focusedConstructionId=null;state=createInitialState();inspectedOffice=0;localStorage.removeItem(STORAGE_KEY);LEGACY_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));closeDrawers();closeMobileContext();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$$('.nav-btn[data-view]').forEach(b=>b.onclick=()=>{mobileContextOpen=false;state.view=b.dataset.view;render();});
$('#officeBtn').onclick=()=>{if(state.phase==='draft'){showToast('Офисы откроются после стартового драфта');return;}inspectedOffice=preferredOfficePlayer();openDrawer('officeDrawer');renderOffice();};
$('#logBtn').onclick=()=>openDrawer('logDrawer');
$('#settingsBtn').onclick=()=>openDrawer('settingsDrawer');
$('#helpBtn').onclick=()=>{showToast('v0.28: Доставка — свободное действие. Выберите источник, перевозчика и груз, затем маршрут по соседним районам и разгрузку на свои стройки / склад.');};
$('#drawerBackdrop').onclick=closeDrawers;
$('#contextBackdrop').onclick=closeMobileContext;$$('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
$('#modalBackdrop').onclick=()=>{};
$('#newGameBtn').onclick=newGame;
$('#copyLogBtn').onclick=async()=>{const text=state.log.map(x=>x.msg).join('\n');try{await navigator.clipboard.writeText(text);showToast('Лог скопирован');}catch{prompt('Скопируйте лог:',text);}};
$('#endRoundBtn').onclick=()=>{deliveryDraft=null;overviewPlayerId=null;focusedConstructionId=null;state.pendingConstruction=null;state.pendingWorkerAction=null;mobileContextOpen=false;const r=cleanupMarket(state);if(!r.ok){if(r.reason==='development-not-complete')showToast('Сначала используйте всех представителей');return;}state.view=r.finished?'city':'hall';render();};
const mapFit=$('#mapZoomFit');if(mapFit)mapFit.onclick=()=>{mobileMapDetail=false;syncMapZoom();};
const mapDetail=$('#mapZoomDetail');if(mapDetail)mapDetail.onclick=()=>{mobileMapDetail=true;syncMapZoom();};
$$('[data-district]').forEach(g=>g.onclick=()=>{
  const id=g.dataset.district;
  if(deliveryDraft?.step==='route'){addDeliveryRouteDistrict(id);return;}
  if(deliveryDraft)return;
  state.selectedDistrictId=id;
  if(state.pendingWorkerAction?.type==='raiseCapital'){
    confirmRaiseCapitalInDistrict(id);
    return;
  }
  if(isMobile())mobileContextOpen=true;
  render();
});
window.addEventListener('resize',()=>{if(!isMobile())mobileContextOpen=false;syncMobileContext();syncMapZoom();syncStickyLayout();});

loadDevMapBackground();
render();
