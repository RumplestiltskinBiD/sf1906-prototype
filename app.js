import {
  PROJECTS,DISTRICTS,MAX_ROUNDS,RESOURCE_PRICES,BASE_ROUND_INCOME,RAISE_CAPITAL_AMOUNT,LOAN_PRINCIPAL,MAX_ACTIVE_LOANS,BUREAU_LAND_DISCOUNT,HAND_LIMIT,STARTER_KEEP,WORKERS_PER_PLAYER,LOGISTICS_NODES,LOGISTICS_RESOURCE_WEIGHTS,HAULERS,CONSTRUCTION_STAGING_CAPACITY,WAREHOUSE_STORAGE_CAPACITY,generateLogisticsSupply,
  projectById,districtById,districtAccess,districtNeighbors,turnOrder,currentDeclarer,currentDeveloper,openingPrice,
  createWorkers,playerWorkers,activeWorker,workerCanReachDistrict,workerReachableDistricts,selectWorker,
  createInitialState,claimProject,passDeclaration,beginBidding,currentBidTask,submitBid,
  resolveTenders,cleanupMarket,districtConstructionCount,constructionEligibility,beginConstruction,setLandValue,
  constructionProgress,constructionCapacity,projectMaterialCounts,deliveredMaterialCounts,playerWarehouses,warehouseFreeCapacity,deliveryNeighbors,deliverySourceInfo,deliveryCostPreview,validateDelivery,commitDelivery,haulerAvailable,roundIncome,grossRoundIncome,buildingIncome,
  activeLoans,loanInterest,completedActionSpaces,canTakeMainAction,canUseFreeAction,endActivation,actionSpaceOccupant,raiseCapital,takeBankLoan,repayLoan,takeBureauContract,useShoppingProcurement,useSocialClub,currentDraftPlayer,toggleStarterDraftCard,revealStarterDraft,confirmStarterDraft
} from './game-core.js?v=028';

const STORAGE_KEY='sf1906_phase1_ui_v028';
const LEGACY_STORAGE_KEYS=['sf1906_phase1_ui_v027','sf1906_phase1_ui_v026','sf1906_phase1_ui_v025','sf1906_phase1_ui_v024','sf1906_phase1_ui_v023','sf1906_phase1_ui_v022','sf1906_phase1_ui_v021','sf1906_phase1_ui_v020','sf1906_phase1_ui_v0192','sf1906_phase1_ui_v0191','sf1906_phase1_ui_v019','sf1906_phase1_ui_v018','sf1906_phase1_ui_v017','sf1906_phase1_ui_v0166','sf1906_phase1_ui_v0165'];
let state=loadState();
let inspectedOffice=0;
let pendingBidReveal=false;
let mobileContextOpen=false;
let mobileMapDetail=false;
let deliveryDraft=null;

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
  parsed.constructions=(parsed.constructions||[]).map(x=>({...x,materialsDelivered:x.materialsDelivered||[],storedMaterials:x.storedMaterials||[],completedRound:x.completedRound??null}));
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
  parsed.haulersUsed=parsed.haulersUsed||[];
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
function isMobile(){return window.matchMedia('(max-width:640px)').matches;}
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
function materialLabel(x){return {Lumber:'Lumber',Masonry:'Masonry',Steel:'Steel'}[x]||x;}
function materialShort(x){return {Lumber:'L',Masonry:'M',Steel:'S'}[x]||'?';}
function materialClass(x){return {Lumber:'lumber',Masonry:'masonry',Steel:'steel'}[x]||'';}
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

function render(){
  saveState();
  renderTop();renderPlayers();renderViews();renderMarket();renderStarterDraft();renderSupply();renderSupplyNodes();renderWorkerDock();renderCityActions();renderCity();renderDeliveryRoute();renderDeliveryPanel();renderContext();renderOffice();renderLog();renderDebug();renderActionBar();renderTenderSteps();syncMobileContext();syncMapZoom();
  if(state.phase==='bids'&&!$('#privacyModal').classList.contains('open')&&!pendingBidReveal)openBidCurtain();
}

function renderTop(){
  $('#roundStat').textContent=state.finished?`${MAX_ROUNDS} / ${MAX_ROUNDS}`:`${state.round} / ${MAX_ROUNDS}`;
  $('#firstStat').textContent=state.players[state.firstPlayer].name;
  $('#phaseStat').textContent=state.phase==='draft'?'Стартовый драфт':state.phase==='declare'?'City Hall · заявки':state.phase==='bids'?'City Hall · ставки':state.phase==='ready'?'City Hall · вскрытие':state.phase==='development'?'Развитие города':'Тест завершён';
}

function renderPlayers(){
  const el=$('#playersBar');el.innerHTML='';const cd=currentDeclarer(state),dev=currentDeveloper(state);
  state.players.forEach((p,i)=>{
    const declareActive=state.phase==='declare'&&cd===i;
    const devActive=state.phase==='development'&&dev===i;
    const pill=document.createElement('button');
    pill.className=`player-pill ${declareActive||devActive?'active':''} ${declareActive?'declare-active':''} ${devActive?'dev-active':''} ${state.firstPlayer===i?'first':''}`;
    pill.dataset.office=i;
    const debt=(p.loans||[]).length;
    const workerPlaces=[...new Set(playerWorkers(state,p.id).map(w=>districtById(w.districtId)?.name).filter(Boolean))];
    const flags=[`Hand ${p.portfolio.length}/${HAND_LIMIT}`,`Workers: ${workerPlaces.join(' / ')}`,debt?`Debt ${debt}`:'',(p.bureauContracts||0)>0?'Contract':''].filter(Boolean).join(' · ');
    pill.innerHTML=`<span class="player-dot ${p.key}"></span><span class="player-main"><span class="player-name">${p.name}</span><span class="player-stats"><span>👤 ${p.workersLeft??0}</span><span>VP ${p.prestige||0}</span><span>Inf ${p.influence}</span><span>+$${roundIncome(state,p.id)}</span></span>${flags?`<span class="player-flags">${flags}</span>`:''}</span><span class="player-money">$${p.capital}</span>`;
    pill.onclick=()=>{if(deliveryDraft){showToast('Сначала завершите или отмените Delivery');return;}if(state.phase==='draft'){showToast('Стартовые руки скрыты до завершения драфта');return;}inspectedOffice=i;openDrawer('officeDrawer');renderOffice();};
    el.appendChild(pill);
  });
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
    <div class="card-rule build"><b>BUILD</b><span>${p.requires||'Нет дополнительных условий'}</span></div>
    <div class="card-rule benefit"><b>GIVES</b><span>${p.benefit||p.effect||'—'}</span></div>
    <div class="card-rule action ${p.actionName==='—'?'muted':''}"><b>ACTION · ${p.actionName||'—'}</b><span>${p.actionText||'—'}</span></div>
    <div class="card-rule limits"><b>LIMITS</b><span>${p.limits||'—'}</span></div>
  </div>`;
}
function projectCoreCard(p,{topLeft='',topRight='',priceLabel='opening',priceValue=null,selected=false,extraClass='',footer=''}={}){
  const price=priceValue==null?p.open:priceValue;
  return `<article class="project-card full-info ${typeClass(p.type)} ${selected?'selected':''} ${extraClass}">
    <div class="card-stripe"></div>
    <div class="project-inner">
      <div class="card-top"><span class="slot-mark">${topLeft}</span><span class="age-badge">${topRight}</span></div>
      <div class="project-title">${p.name}</div>
      <div class="project-type">${p.type}</div>
      <div class="card-value-row"><div class="opening-price">$${price}<small>${priceLabel}</small></div><span class="prestige-chip">VP ${p.prestige||0}</span></div>
      <div class="card-section-label">MATERIALS</div>
      <div class="card-resource-row">${resourcePills(p.materials)}</div>
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
    bar.innerHTML='<div class="sticky-copy"><strong>Ставки собраны</strong><span>При равной сумме выигрывает больший Influence; затем более ранняя заявка.</span></div><div class="sticky-actions"><button class="primary-btn" id="resolveTender">Вскрыть ставки</button></div>';$('#resolveTender').onclick=()=>{resolveTenders(state);state.view='city';render();};
  }else if(state.phase==='development'){
    if(state.developmentComplete){
      bar.innerHTML='<div class="sticky-copy"><strong>Development завершён</strong><span>Все представители использованы.</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">Открыть город</button></div>';$('#enterCity').onclick=()=>{state.view='city';render();};
    }else{
      const dev=currentDeveloper(state),used=state.activationMainActionUsed;
      bar.innerHTML=`<div class="sticky-copy"><strong>Активация: ${state.players[dev].name} · 👤 ${state.players[dev].workersLeft}/3 · рука ${state.players[dev].portfolio.length}/${HAND_LIMIT}</strong><span>${used?'Main action использован — free actions или End Activation.':'Free actions можно до или после main action.'}</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">${used?'Продолжить активацию':'Городские действия'}</button></div>`;$('#enterCity').onclick=()=>{state.view='city';render();};
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
  $('#privacyCard').innerHTML=`<div class="privacy-curtain"><div class="eyebrow">PASS & PLAY · SECRET BID</div><div class="big-player">${pl.name}</div><p>Передайте устройство этому игроку. Ставка остальных на экран не выводится.</p><button class="secondary-btn full" id="revealBidForm">Я готов сделать ставку</button></div>`;
  $('#revealBidForm').onclick=()=>{
    const min=openingPrice(m);
    $('#privacyCard').innerHTML=`<div class="eyebrow">SECRET BID</div><h3>${p.name}</h3><p>Opening price <b>$${min}</b> · капитал ${pl.name}: <b>$${pl.capital}</b></p><div class="bid-form"><label for="secretBid">Ваша максимальная ставка</label><input class="bid-input" id="secretBid" type="number" inputmode="numeric" min="${min}" max="${pl.capital}" value="${min}"/><div class="modal-actions"><button class="primary-btn" id="submitSecretBid">Подтвердить и скрыть</button></div></div>`;
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
  const limited=HAULERS.filter(h=>h.limited),free=limited.filter(h=>haulerAvailable(state,h.id)).length;
  el.innerHTML='<div class="supply-label"><strong>ГОРОДСКАЯ ЛОГИСТИКА</strong><span>Остатки в портах исчезают в конце раунда · Delivery = fast action · маршрут $1 / граница</span></div><div class="supply-items">'
    +RESOURCE_ORDER.map(type=>'<span class="supply-resource '+materialClass(type)+'"><b>'+materialShort(type)+'</b><span>'+materialLabel(type)+'</span><strong>$'+RESOURCE_PRICES[type]+'</strong></span>').join('')
    +'<span class="supply-resource city-throughput"><b>'+total+'</b><span>ресурсов / раунд</span><strong>'+free+'/'+limited.length+' рейсов</strong></span></div>';
}

function renderSupplyNodes(){
  const layer=$('#supplyNodeLayer');if(!layer)return;
  const supply=state.logisticsSupply||{};
  const sourceMode=deliveryDraft?.step==='source';
  const activeSource=deliveryDraft?.source?.kind==='node'?deliveryDraft.source.id:null;
  layer.innerHTML=LOGISTICS_NODES.map(node=>{
    const stock=supply[node.id]||[];
    const nodeClass='node-'+node.kind;
    const code=node.kind==='rail'?'R':node.kind==='rail-port'?'R/P':node.kind==='industrial-port'?'IND':'P';
    const start=-((stock.length-1)*7);
    const pips=stock.map((type,i)=>'<circle class="node-resource '+materialClass(type)+'" cx="'+(start+i*14)+'" cy="25" r="5"/>').join('');
    const stockText=stock.length?stock.join(', '):'нет груза';
    const selectable=sourceMode&&stock.length&&canUseFreeAction(state,currentDeveloper(state));
    return '<g class="supply-node '+nodeClass+' '+(selectable?'delivery-source-selectable ':'')+(activeSource===node.id?'delivery-source-active':'')+'" transform="translate('+node.x+' '+node.y+')" '+(selectable?'data-delivery-source-node="'+node.id+'"':'')+'>'
      +'<title>'+node.name+' · '+(districtById(node.districtId)?.name||node.districtId)+' · '+stockText+'</title>'
      +'<circle class="node-pin" r="20"/><text class="node-code" y="4">'+code+'</text>'
      +pips+'<text class="node-name" y="48">'+node.shortName+'</text></g>';
  }).join('');
  $$('[data-delivery-source-node]').forEach(g=>g.onclick=e=>{e.stopPropagation();selectDeliverySource({kind:'node',id:g.dataset.deliverySourceNode});});
}


function materialCountsLocal(list=[]){
  return list.reduce((acc,type)=>{acc[type]=(acc[type]||0)+1;return acc;},{});
}

function deliverySourceStock(){
  if(!deliveryDraft)return [];
  return deliverySourceInfo(state,deliveryDraft.playerId,deliveryDraft.source)?.stock||[];
}

function deliveryCargoTypes(){
  const stock=deliverySourceStock();
  return (deliveryDraft?.cargoIndexes||[]).map(i=>stock[i]).filter(Boolean);
}

function allocatedDeliveryTypes(){
  return (deliveryDraft?.drops||[]).flatMap(d=>d.materials||[]);
}

function remainingDeliveryTypes(){
  const cargo=[...deliveryCargoTypes()];
  for(const type of allocatedDeliveryTypes()){
    const i=cargo.indexOf(type);if(i>=0)cargo.splice(i,1);
  }
  return cargo;
}

function startDelivery(){
  const pid=currentDeveloper(state);
  if(pid==null||!canUseFreeAction(state,pid)){showToast('Delivery доступна только активному игроку');return;}
  state.pendingConstruction=null;
  state.pendingWorkerAction=null;
  deliveryDraft={playerId:pid,step:'source',source:null,haulerId:null,cargoIndexes:[],route:[],drops:[],selectedStopIndex:0};
  closeDrawers();closeMobileContext();render();
}

function cancelDelivery(){deliveryDraft=null;render();}

function selectDeliverySource(source){
  if(!deliveryDraft||deliveryDraft.step!=='source')return;
  const info=deliverySourceInfo(state,deliveryDraft.playerId,source);
  if(!info||!info.stock.length){showToast('В этом источнике нет ресурсов');return;}
  deliveryDraft.source=source;
  deliveryDraft.step='load';
  deliveryDraft.haulerId=null;
  deliveryDraft.cargoIndexes=[];
  deliveryDraft.route=[];
  deliveryDraft.drops=[];
  render();
}

function deliveryPlan(){
  if(!deliveryDraft)return null;
  return {
    source:deliveryDraft.source,
    haulerId:deliveryDraft.haulerId,
    cargoIndexes:[...(deliveryDraft.cargoIndexes||[])],
    route:[...(deliveryDraft.route||[])],
    drops:(deliveryDraft.drops||[]).map(d=>({...d,materials:[...(d.materials||[])]}))
  };
}

function draftTargetAllocated(kind,id){
  return (deliveryDraft?.drops||[]).filter(d=>d.targetKind===kind&&d.targetId===id).flatMap(d=>d.materials||[]);
}

function constructionAcceptsDraftMaterial(con,type){
  const pr=projectById(con.projectId);
  const staged=[...(con.materialsDelivered||[]),...draftTargetAllocated('construction',con.id)];
  const required=projectMaterialCounts(pr.id),have=materialCountsLocal(staged);
  if((have[type]||0)>=(required[type]||0))return false;
  const next=[...staged,type];
  if(next.length<=CONSTRUCTION_STAGING_CAPACITY)return true;
  const nextCounts=materialCountsLocal(next);
  const bootstrap=con.projectId==='warehouse'&&next.length===pr.materials.length&&Object.entries(required).every(([t,n])=>(nextCounts[t]||0)>=n);
  return bootstrap;
}

function warehouseDraftFree(con){
  const allocated=draftTargetAllocated('warehouse',con.id).length;
  return Math.max(0,WAREHOUSE_STORAGE_CAPACITY-(con.storedMaterials||[]).length-allocated);
}

function addDeliveryDrop(routeIndex,targetKind,targetId,type){
  if(!deliveryDraft||deliveryDraft.step!=='route')return;
  const remaining=remainingDeliveryTypes();
  if(!remaining.includes(type))return;
  let drop=deliveryDraft.drops.find(d=>d.routeIndex===routeIndex&&d.targetKind===targetKind&&d.targetId===targetId);
  if(!drop){drop={routeIndex,targetKind,targetId,materials:[]};deliveryDraft.drops.push(drop);}
  drop.materials.push(type);
  render();
}

function removeDeliveryDrop(dropIndex,materialIndex){
  if(!deliveryDraft)return;
  const drop=deliveryDraft.drops[dropIndex];if(!drop)return;
  drop.materials.splice(materialIndex,1);
  if(!drop.materials.length)deliveryDraft.drops.splice(dropIndex,1);
  render();
}

function handleDeliveryDistrictClick(id){
  if(!deliveryDraft)return false;
  if(deliveryDraft.step!=='route')return true;
  const route=deliveryDraft.route||[];
  const last=route[route.length-1];
  if(id===last){
    deliveryDraft.selectedStopIndex=route.length-1;render();return true;
  }
  const allowed=deliveryNeighbors(last);
  if(!allowed.includes(id)){showToast(id==='park'?'Через Golden Gate Park груз не едет':'Маршрут должен идти через соседний доступный район');return true;}
  route.push(id);
  deliveryDraft.selectedStopIndex=route.length-1;
  render();
  return true;
}

function renderDeliveryRoute(){
  const layer=$('#deliveryRouteLayer');if(!layer)return;
  if(!deliveryDraft||deliveryDraft.step!=='route'||!deliveryDraft.route?.length){layer.innerHTML='';return;}
  const route=deliveryDraft.route;
  let html='';
  for(let i=1;i<route.length;i++){
    const a=DISTRICT_POS[route[i-1]],b=DISTRICT_POS[route[i]];if(!a||!b)continue;
    html+='<line class="delivery-route-line" x1="'+a[0]+'" y1="'+a[1]+'" x2="'+b[0]+'" y2="'+b[1]+'"/>';
  }
  route.forEach((id,i)=>{
    const p=DISTRICT_POS[id];if(!p)return;
    const dropCount=(deliveryDraft.drops||[]).filter(d=>d.routeIndex===i).flatMap(d=>d.materials||[]).length;
    html+='<g class="delivery-route-stop '+(i===route.length-1?'current':'')+'" transform="translate('+p[0]+' '+p[1]+')"><circle r="18"/><text y="5">'+(i===0?'S':i)+'</text>'+(dropCount?'<text class="delivery-drop-count" y="34">↓'+dropCount+'</text>':'')+'</g>';
  });
  layer.innerHTML=html;
}

function deliveryReceiverName(kind,id){
  const con=(state.constructions||[]).find(c=>c.id===id);if(!con)return id;
  return kind==='warehouse'?'Warehouse':projectById(con.projectId)?.name||id;
}

function renderDeliveryPanel(){
  const el=$('#deliveryPanel');if(!el)return;
  if(!deliveryDraft){el.classList.remove('open');el.innerHTML='';return;}
  el.classList.add('open');
  const pid=deliveryDraft.playerId,player=state.players[pid];

  if(deliveryDraft.step==='source'){
    const nodes=LOGISTICS_NODES.map(node=>{
      const stock=state.logisticsSupply?.[node.id]||[];
      return '<button class="delivery-source-card" data-sheet-source-node="'+node.id+'" '+(stock.length?'':'disabled')+'><b>'+node.shortName+'</b><span>'+districtById(node.districtId)?.name+'</span><small>'+stock.map(materialShort).join(' ')+' · '+stock.length+' ед.</small></button>';
    }).join('');
    const warehouses=playerWarehouses(state,pid).map(w=>{
      const stock=w.storedMaterials||[];
      return '<button class="delivery-source-card warehouse" data-sheet-source-warehouse="'+w.id+'" '+(stock.length?'':'disabled')+'><b>Warehouse</b><span>'+districtById(w.districtId)?.name+'</span><small>'+stock.map(materialShort).join(' ')+' · '+stock.length+'/'+WAREHOUSE_STORAGE_CAPACITY+'</small></button>';
    }).join('');
    el.innerHTML='<div class="delivery-sheet-head"><div><small>FAST ACTION · DELIVERY</small><b>1. Выберите источник груза</b></div><button class="delivery-close" id="deliveryCancel">×</button></div><div class="delivery-source-grid">'+nodes+warehouses+'</div><div class="delivery-hint">Можно выбрать порт / ж/д на карте или свой Warehouse. Golden Gate Park, Presidio и Twin Peaks не используются грузовым маршрутом.</div>';
    $('#deliveryCancel').onclick=cancelDelivery;
    $$('[data-sheet-source-node]').forEach(b=>b.onclick=()=>selectDeliverySource({kind:'node',id:b.dataset.sheetSourceNode}));
    $$('[data-sheet-source-warehouse]').forEach(b=>b.onclick=()=>selectDeliverySource({kind:'warehouse',id:b.dataset.sheetSourceWarehouse}));
    return;
  }

  const info=deliverySourceInfo(state,pid,deliveryDraft.source);
  if(!info){deliveryDraft.step='source';render();return;}

  if(deliveryDraft.step==='load'){
    const selected=new Set(deliveryDraft.cargoIndexes||[]);
    const hauler=HAULERS.find(h=>h.id===deliveryDraft.haulerId)||null;
    const haulerHtml=HAULERS.map(h=>{
      const available=haulerAvailable(state,h.id),active=deliveryDraft.haulerId===h.id;
      return '<button class="hauler-card '+(active?'selected ':'')+(h.limited?'limited':'spot')+'" data-hauler="'+h.id+'" '+(available?'':'disabled')+'><b>'+h.capacity+' slots</b><span>base $'+h.baseCost+'</span><small>'+(h.limited?(available?'разовый':'USED'):'без лимита')+'</small></button>';
    }).join('');
    const cargoHtml=info.stock.map((type,i)=>{
      const active=selected.has(i),limit=hauler?selected.size>=hauler.capacity&&!active:false;
      const price=info.kind==='node'?'$'+RESOURCE_PRICES[type]:'stored';
      return '<button class="cargo-pick '+materialClass(type)+' '+(active?'selected':'')+'" data-cargo-index="'+i+'" '+(!hauler||limit?'disabled':'')+'><span>'+materialShort(type)+'</span><b>'+materialLabel(type)+'</b><small>'+price+'</small></button>';
    }).join('');
    const count=selected.size,canStart=!!hauler&&count>0&&count<=hauler.capacity;
    el.innerHTML='<div class="delivery-sheet-head"><div><small>'+info.name+'</small><b>2. Перевозчик и груз · '+count+'/'+(hauler?.capacity||'—')+'</b></div><button class="delivery-close" id="deliveryCancel">×</button></div><div class="delivery-section-title">ПЕРЕВОЗЧИК</div><div class="hauler-grid">'+haulerHtml+'</div><div class="delivery-section-title">ГРУЗ</div><div class="cargo-grid">'+cargoHtml+'</div><div class="delivery-sheet-actions"><button class="ghost-btn" id="deliveryBackSource">← Источник</button><button class="primary-btn" id="deliveryStartRoute" '+(canStart?'':'disabled')+'>Строить маршрут →</button></div>';
    $('#deliveryCancel').onclick=cancelDelivery;
    $('#deliveryBackSource').onclick=()=>{deliveryDraft.step='source';deliveryDraft.source=null;deliveryDraft.haulerId=null;deliveryDraft.cargoIndexes=[];render();};
    $$('[data-hauler]').forEach(b=>b.onclick=()=>{deliveryDraft.haulerId=b.dataset.hauler;const h=HAULERS.find(x=>x.id===deliveryDraft.haulerId);deliveryDraft.cargoIndexes=(deliveryDraft.cargoIndexes||[]).slice(0,h.capacity);render();});
    $$('[data-cargo-index]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.cargoIndex),set=new Set(deliveryDraft.cargoIndexes||[]);if(set.has(i))set.delete(i);else set.add(i);deliveryDraft.cargoIndexes=[...set].sort((a,b)=>a-b);render();});
    const start=$('#deliveryStartRoute');if(start&&!start.disabled)start.onclick=()=>{deliveryDraft.step='route';deliveryDraft.route=[info.districtId];deliveryDraft.drops=[];deliveryDraft.selectedStopIndex=0;render();};
    return;
  }

  const plan=deliveryPlan(),preview=deliveryCostPreview(state,pid,plan);
  const route=deliveryDraft.route||[],selectedIndex=Math.min(deliveryDraft.selectedStopIndex??route.length-1,route.length-1);
  deliveryDraft.selectedStopIndex=selectedIndex;
  const stopDistrict=route[selectedIndex],remaining=remainingDeliveryTypes();
  const routeChips=route.map((id,i)=>'<button class="route-chip '+(selectedIndex===i?'selected':'')+'" data-route-stop="'+i+'"><b>'+(i===0?'START':i)+'</b><span>'+shortDistrictName(id)+'</span></button>').join('');
  const receivers=(state.constructions||[]).filter(con=>con.playerId===pid&&con.districtId===stopDistrict&&(con.status==='under-construction'||(con.status==='complete'&&con.projectId==='warehouse')));
  const receiverHtml=receivers.length?receivers.map(con=>{
    const isWh=con.status==='complete'&&con.projectId==='warehouse';
    const pr=projectById(con.projectId);
    const free=isWh?warehouseDraftFree(con):Math.max(0,CONSTRUCTION_STAGING_CAPACITY-((con.materialsDelivered||[]).length+draftTargetAllocated('construction',con.id).length));
    const resourceBtns=[...new Set(remaining)].map(type=>{
      const can=isWh?free>0:constructionAcceptsDraftMaterial(con,type);
      return '<button class="drop-resource '+materialClass(type)+'" data-drop-kind="'+(isWh?'warehouse':'construction')+'" data-drop-id="'+con.id+'" data-drop-type="'+type+'" '+(can?'':'disabled')+'>'+materialShort(type)+' '+materialLabel(type)+'</button>';
    }).join('');
    const status=isWh?'Storage '+((con.storedMaterials||[]).length+draftTargetAllocated('warehouse',con.id).length)+'/'+WAREHOUSE_STORAGE_CAPACITY:'Staging '+((con.materialsDelivered||[]).length+draftTargetAllocated('construction',con.id).length)+'/'+CONSTRUCTION_STAGING_CAPACITY;
    return '<div class="delivery-receiver"><div><b>'+(isWh?'Warehouse':pr.name)+'</b><span>'+status+'</span></div><div class="drop-resource-row">'+(resourceBtns||'<small>Нет подходящего груза</small>')+'</div></div>';
  }).join(''):'<div class="delivery-empty-stop">Ваших объектов, способных принять груз, здесь нет.</div>';
  const dropSummary=(deliveryDraft.drops||[]).map((d,di)=>{
    const district=route[d.routeIndex];
    return '<div class="delivery-drop-summary"><span><b>'+shortDistrictName(district)+'</b> · '+deliveryReceiverName(d.targetKind,d.targetId)+'</span><div>'+d.materials.map((type,mi)=>'<button data-remove-drop="'+di+':'+mi+'" class="drop-chip '+materialClass(type)+'">'+materialShort(type)+' ×</button>').join('')+'</div></div>';
  }).join('');
  const valid=validateDelivery(state,pid,plan);
  const total=preview.ok?preview.totalCost:0,routeCost=preview.ok?preview.routeCost:Math.max(0,route.length-1),base=preview.ok?preview.hauler.baseCost:0,materials=preview.ok?preview.materialCost:0,discount=preview.ok?preview.procurementDiscount:0;
  const canPay=preview.ok&&player.capital>=total;
  const allAllocated=remaining.length===0;
  const confirmOk=valid.ok&&allAllocated&&canPay;
  const next=route.length?deliveryNeighbors(route[route.length-1]).map(shortDistrictName).join(' · '):'';
  el.innerHTML='<div class="delivery-sheet-head"><div><small>FAST ACTION · '+info.name+'</small><b>3. Маршрут и разгрузка</b></div><button class="delivery-close" id="deliveryCancel">×</button></div><div class="delivery-cost-live"><span>Материалы <b>$'+materials+'</b>'+(discount?' <em>Procurement −$'+discount+'</em>':'')+'</span><span>Перевозчик <b>$'+base+'</b></span><span>Границы '+routeCost+' <b>$'+routeCost+'</b></span><strong>ИТОГО $'+total+'</strong></div><div class="route-chip-row">'+routeChips+'</div><div class="delivery-hint">Следующий район: '+(next||'нет доступных')+'. Тап по соседнему району на карте добавляет его к маршруту.</div><div class="delivery-section-title">РАЗГРУЗКА · '+shortDistrictName(stopDistrict)+'</div>'+receiverHtml+'<div class="delivery-section-title">В МАШИНЕ</div><div class="cargo-remaining">'+(remaining.length?remaining.map(t=>'<span class="drop-chip '+materialClass(t)+'">'+materialShort(t)+'</span>').join(''):'<b>Весь груз распределён ✓</b>')+'</div>'+(dropSummary?'<div class="delivery-drop-list">'+dropSummary+'</div>':'')+'<div class="delivery-sheet-actions wrap"><button class="ghost-btn" id="deliveryUndoRoute" '+(route.length<=1?'disabled':'')+'>← Убрать последний район</button><button class="ghost-btn" id="deliveryBackLoad">Изменить груз</button><button class="primary-btn" id="deliveryConfirm" '+(confirmOk?'':'disabled')+'>Подтвердить · $'+total+'</button></div>'+(preview.ok&&!canPay?'<div class="delivery-error">Не хватает Capital.</div>':'')+(!allAllocated?'<div class="delivery-error subtle">Перед подтверждением разгрузите весь выбранный груз.</div>':'');
  $('#deliveryCancel').onclick=cancelDelivery;
  $$('[data-route-stop]').forEach(b=>b.onclick=()=>{deliveryDraft.selectedStopIndex=Number(b.dataset.routeStop);render();});
  $$('[data-drop-kind]').forEach(b=>b.onclick=()=>addDeliveryDrop(selectedIndex,b.dataset.dropKind,b.dataset.dropId,b.dataset.dropType));
  $$('[data-remove-drop]').forEach(b=>b.onclick=()=>{const [di,mi]=b.dataset.removeDrop.split(':').map(Number);removeDeliveryDrop(di,mi);});
  $('#deliveryUndoRoute').onclick=()=>{if(deliveryDraft.route.length<=1)return;deliveryDraft.route.pop();deliveryDraft.drops=deliveryDraft.drops.filter(d=>d.routeIndex<deliveryDraft.route.length);deliveryDraft.selectedStopIndex=deliveryDraft.route.length-1;render();};
  $('#deliveryBackLoad').onclick=()=>{deliveryDraft.step='load';deliveryDraft.route=[];deliveryDraft.drops=[];deliveryDraft.selectedStopIndex=0;render();};
  const confirm=$('#deliveryConfirm');if(confirm&&!confirm.disabled)confirm.onclick=()=>{
    const result=commitDelivery(state,pid,deliveryPlan());
    if(!result.ok){showToast('Доставка не прошла проверку: '+result.reason);render();return;}
    const completed=result.completed?.length||0;
    deliveryDraft=null;
    showToast('Доставка завершена · −$'+result.totalCost+(completed?' · завершено зданий: '+completed:''));
    render();
  };
}

function loadDevMapBackground(){
  const image=$('#devMapImage');if(!image)return;
  image.setAttribute('href','./assets/v8-map.webp?v=0271');
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
    return `<button class="dock-worker token-${p.key} ${isSelected?'selected':''} ${w.used?'used':''}" data-dock-worker="${w.id}" ${deliveryDraft||w.used||state.activationMainActionUsed?'disabled':''}><span>#${w.number}</span><b>${shortDistrictName(w.districtId)}</b><small>${w.used?'USED':isSelected?'SELECTED':'READY'}</small></button>`;
  }).join('');
  const reach=selected?workerReachableDistricts(state,pid,selected.id).map(shortDistrictName).join(' · '):'Выберите представителя';
  el.innerHTML=`<div class="worker-dock-head"><span class="player-dot ${p.key}"></span><div><b>${p.name} · представители</b><small>${selected?`#${selected.number}: ${districtById(selected.districtId)?.name} · можно остаться или перейти в соседний район`:'Выберите одного из трёх. Позиции сохраняются между раундами.'}</small></div></div><div class="worker-dock-grid">${buttons}</div><div class="worker-dock-reach"><b>Доступ:</b> ${reach}</div>`;
  $('[data-dock-worker]').forEach(b=>b.onclick=()=>{
    if(deliveryDraft)return;
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
  if(deliveryDraft){
    el.innerHTML='<div class="city-turn-complete delivery-active-banner"><strong>DELIVERY MODE ACTIVE</strong><span>Закончите или отмените рейс в панели доставки. Main action не изменяется.</span></div>';
    return;
  }
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
    return `<button class="worker-choice token-${p.key} ${isSelected?'selected':''} ${w.used?'used':''}" data-select-worker="${w.id}" ${w.used||mainUsed?'disabled':''}><span>#${w.number}</span><b>${d?.name||w.districtId}</b><small>${w.used?'USED':isSelected?'SELECTED · move ≤ 1 district':'available'}</small></button>`;
  }).join('');
  const reachText=selected?reachable.map(id=>districtById(id)?.name).filter(Boolean).join(' · '):'Сначала выберите представителя';
  const actionReach=con=>!!selected&&workerCanReachDistrict(state,pid,con.districtId,selected.id);

  const bankButtons=banks.length?banks.map(bank=>{
    const owner=state.players[bank.playerId],d=districtById(bank.districtId),occupiedBy=actionSpaceOccupant(state,bank.id);
    const occupied=occupiedBy!=null,range=actionReach(bank);
    const disabled=mainUsed||!selected||!range||debt>=MAX_ACTIVE_LOANS||occupied;
    const gain=debt===0?6:5;
    const ownerReward=bank.playerId===pid?'Ваш Bank':'Чужой Bank → владельцу +1 Inf';
    const usedText=occupied?`USED · ${state.players[occupiedBy].name}`:!selected?'SELECT WORKER':!range?'TOO FAR':debt>=MAX_ACTIVE_LOANS?'MAX 2 LOANS':mainUsed?'MAIN USED':`+$${gain}`;
    return `<button class="action-space-btn bank ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-bank-action="${bank.id}" ${disabled?'disabled':''}><b>Bank · ${owner.name}</b><span>${d.name} · ${occupied?`занят ${state.players[occupiedBy].name}`:ownerReward}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Bank ещё не построен</div>';

  const bureauButtons=bureaus.length?bureaus.map(bureau=>{
    const owner=state.players[bureau.playerId],d=districtById(bureau.districtId),occupiedBy=actionSpaceOccupant(state,bureau.id);
    const occupied=occupiedBy!=null,range=actionReach(bureau);
    const disabled=mainUsed||!selected||!range||contract||occupied;
    const ownerReward=bureau.playerId===pid?'Ваш Bureau':'Чужое Bureau → владельцу +$1';
    const usedText=occupied?`USED · ${state.players[occupiedBy].name}`:!selected?'SELECT WORKER':!range?'TOO FAR':contract?'CONTRACT READY':mainUsed?'MAIN USED':'−$2 land';
    return `<button class="action-space-btn bureau ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-bureau-action="${bureau.id}" ${disabled?'disabled':''}><b>Bureau · ${owner.name}</b><span>${d.name} · ${occupied?`занято ${state.players[occupiedBy].name}`:ownerReward}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Construction Bureau ещё не построено</div>';

  const shopsButtons=shops.length?shops.map(shop=>{
    const owner=state.players[shop.playerId],d=districtById(shop.districtId),occupiedBy=actionSpaceOccupant(state,shop.id);
    const occupied=occupiedBy!=null,range=actionReach(shop);
    const hasConstruction=(state.constructions||[]).some(x=>x.playerId===pid&&x.status==='under-construction');
    const disabled=mainUsed||!selected||!range||occupied||p.capital<1||!hasConstruction;
    const ownerText=shop.playerId===pid?'$1 procurement cost':'$1 → владельцу';
    const usedText=occupied?`USED · ${state.players[occupiedBy].name}`:!selected?'SELECT WORKER':!range?'TOO FAR':!hasConstruction?'NO BUILD':p.capital<1?'NEED $1':mainUsed?'MAIN USED':'2 materials / $1';
    return `<button class="action-space-btn shops ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-shops-action="${shop.id}" ${disabled?'disabled':''}><b>Shopping Row · ${owner.name}</b><span>${d.name} · ${occupied?`занят ${state.players[occupiedBy].name}`:ownerText}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Shopping Row ещё не построен</div>';

  const clubButtons=clubs.length?clubs.map(club=>{
    const owner=state.players[club.playerId],d=districtById(club.districtId),occupiedBy=actionSpaceOccupant(state,club.id);
    const occupied=occupiedBy!=null,range=actionReach(club);
    const disabled=mainUsed||!selected||!range||occupied||p.capital<1;
    const ownerText=club.playerId===pid?'ужин / приём $1':'$1 → владельцу';
    const usedText=occupied?`USED · ${state.players[occupiedBy].name}`:!selected?'SELECT WORKER':!range?'TOO FAR':p.capital<1?'NEED $1':mainUsed?'MAIN USED':'−$1 · +1 Inf';
    return `<button class="action-space-btn club ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-club-action="${club.id}" ${disabled?'disabled':''}><b>Restaurant & Club · ${owner.name}</b><span>${d.name} · ${occupied?`занят ${state.players[occupiedBy].name}`:ownerText}</span><strong>${usedText}</strong></button>`;
  }).join(''):'<div class="action-space-locked">Restaurant & Club ещё не построен</div>';

  const buildDisabled=availableProjects===0||mainUsed||!selected;
  const capitalDisabled=mainUsed||!selected;
  el.innerHTML=`<div class="turn-banner player-${p.key} ${mainUsed?'main-used':''}"><span class="player-dot ${p.key}"></span><div><small>АКТИВАЦИЯ</small><strong>${p.name}</strong><span>👤 ${p.workersLeft}/3 · VP ${p.prestige||0} · Projects ${availableProjects} · Loans ${debt}/${MAX_ACTIVE_LOANS}${contract?' · Contract':''}${procurement?` · Procurement ${procurement}`:''}</span></div><span class="activation-state">${mainUsed?'MAIN ACTION USED':selected?`WORKER #${selected.number} READY`:'SELECT WORKER'}</span></div>
  <div class="worker-selector"><div class="worker-selector-head"><b>3 REPRESENTATIVES · позиции сохраняются между раундами</b><span>Действие: текущий район или 1 соседний. После действия представитель остаётся там.</span></div><div class="worker-choice-row">${workerButtons}</div><div class="worker-reach"><b>Доступ за эту активацию:</b> ${reachText}</div></div>
  <div class="action-legend"><b>${mainUsed?'FREE ACTIONS / END ACTIVATION':'MAIN ACTION + FAST ACTIONS'}</b><span>${procurement?`Procurement: ещё ${procurement} купленных материала по $0`:mainUsed?'Delivery и Repay доступны до завершения активации':selected?'Выберите main action или сделайте Delivery':'Delivery можно делать даже до выбора представителя'}</span><em>FAST: Delivery · Repay</em></div><div class="fast-action-row"><button class="delivery-fast-btn" id="actionDelivery"><b>Delivery</b><span>Выбрать источник → перевозчика → груз → маршрут → разгрузки</span><strong>FAST ACTION</strong></button></div>
  ${mainUsed?'<button class="end-activation-btn" id="actionEndActivation">Завершить активацию → следующий игрок</button>':''}
  <div class="city-action-grid ${mainUsed?'main-action-used':''}">
    <button class="city-action-card build" id="actionBuild" ${buildDisabled?'disabled':''}><b>Begin Construction</b><span>${availableProjects===0?'Нет доступного проекта':mainUsed?'Main action уже использован':!selected?'Сначала выберите представителя':'Выбрать проект в Office'}</span><strong>${buildDisabled?'LOCKED':'move ≤ 1 · 1 представитель'}</strong></button>
    <button class="city-action-card capital" id="actionRaiseCapital" ${capitalDisabled?'disabled':''}><b>Raise Capital</b><span>+$3 и можно остаться или перейти в 1 соседний район</span><strong>${capitalDisabled?'LOCKED':'CHOOSE DISTRICT'}</strong></button>
    <div class="city-action-card bank-card"><b>Bank Loan</b><span>Нужно добраться до района Bank · 1 use / round</span><div class="action-space-list">${bankButtons}</div></div>
    <div class="city-action-card bureau-card"><b>Construction Bureau</b><span>Нужно добраться до Bureau · 1 use / round</span><div class="action-space-list">${bureauButtons}</div></div>
    <div class="city-action-card shops-card"><b>Shopping Row · Procurement</b><span>Нужно добраться до Shopping Row · $1</span><div class="action-space-list">${shopsButtons}</div></div>
    <div class="city-action-card club-card"><b>Restaurant & Social Club</b><span>Нужно добраться до Club · −$1 → +1 Influence</span><div class="action-space-list">${clubButtons}</div></div>
  </div>`;

  $$('[data-select-worker]').forEach(b=>b.onclick=()=>{
    const r=selectWorker(state,pid,b.dataset.selectWorker);
    if(!r.ok){showToast(r.reason==='used'?'Этот представитель уже использован':'Нельзя выбрать этого представителя');return;}
    state.pendingConstruction=null;state.pendingWorkerAction=null;render();
  });
  const delivery=$('#actionDelivery');if(delivery)delivery.onclick=startDelivery;
  const build=$('#actionBuild');if(build&&!buildDisabled)build.onclick=()=>{inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();};
  const raise=$('#actionRaiseCapital');if(raise&&!capitalDisabled)raise.onclick=()=>{
    state.pendingConstruction=null;
    state.pendingWorkerAction={type:'raiseCapital',playerId:pid};
    state.view='city';
    closeDrawers();closeMobileContext();
    render();
    showToast('Raise Capital: выберите текущий или соседний район на карте');
  };
  const end=$('#actionEndActivation');if(end)end.onclick=()=>{
    const r=endActivation(state,pid);
    if(!r.ok){showToast(r.reason==='main-action-required'?'Сначала сделайте main action':'Нельзя завершить активацию');return;}
    closeDrawers();closeMobileContext();
    showToast(r.complete?'Все представители использованы':`Ход: ${state.players[r.nextPlayer].name} · выберите представителя`);
    render();
  };
  $$('[data-bank-action]').forEach(b=>b.onclick=()=>{
    const r=takeBankLoan(state,pid,b.dataset.bankAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Этот Bank уже занят в этом раунде':r.reason==='max-loans'?'Уже 2 активных кредита':'Bank сейчас недоступен');return;}
    showToast(`Bank Loan +$${r.received}. Worker #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
  $$('[data-bureau-action]').forEach(b=>b.onclick=()=>{
    const r=takeBureauContract(state,pid,b.dataset.bureauAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Это Bureau уже занято в этом раунде':r.reason==='has-contract'?'Контракт уже есть':'Bureau сейчас недоступно');return;}
    showToast(`Construction Contract получен. Worker #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
  $$('[data-shops-action]').forEach(b=>b.onclick=()=>{
    const r=useShoppingProcurement(state,pid,b.dataset.shopsAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Этот Shopping Row уже занят':r.reason==='capital'?'Нужен $1':r.reason==='no-construction'?'Нет незавершённой стройки':'Procurement недоступен');return;}
    showToast(`Procurement активирован. Worker #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
  $$('[data-club-action]').forEach(b=>b.onclick=()=>{
    const r=useSocialClub(state,pid,b.dataset.clubAction);
    if(!r.ok){showToast(r.reason==='worker-range'?'Выбранный представитель слишком далеко':r.reason==='worker'?'Сначала выберите представителя':r.reason==='occupied'?'Этот Club уже занят':r.reason==='capital'?'Нужен $1 на ужин / приём':'Club сейчас недоступен');return;}
    showToast(`Networking Dinner: −$1 · +1 Influence. Worker #${r.worker.number} теперь в ${districtById(r.worker.districtId)?.name}.`);render();
  });
}

function renderCity(){
  const pending=state.pendingConstruction;
  const workerAction=state.pendingWorkerAction;
  const devPid=currentDeveloper(state);
  const selectedWorker=devPid!=null?activeWorker(state,devPid):null;
  const reachableIds=new Set(selectedWorker?workerReachableDistricts(state,devPid,selectedWorker.id):[]);
  const mode=$('#constructionMode');
  if(state.phase!=='development'){
    mode.innerHTML='<div><strong>Строительство пока закрыто</strong><span>Сначала завершите City Hall Session.</span></div>';
    mode.className='construction-mode muted';
  }else if(workerAction?.type==='raiseCapital'){
    const pl=state.players[workerAction.playerId],w=activeWorker(state,workerAction.playerId);
    mode.className='construction-mode active movement-mode';
    mode.innerHTML=`<div><strong>${pl.name}: Raise Capital +$${RAISE_CAPITAL_AMOUNT}</strong><span>Представитель #${w?.number}: выберите его текущий или соседний район. После действия он останется там.</span></div><button class="ghost-btn" id="cancelWorkerAction">Отмена</button>`;
    $('#cancelWorkerAction').onclick=()=>{state.pendingWorkerAction=null;mobileContextOpen=false;render();};
  }else if(pending){
    const pl=state.players[pending.playerId],pr=projectById(pending.projectId);
    mode.className='construction-mode active';
    mode.innerHTML=`<div><strong>${pl.name}: ${pr.name}</strong><span>Выберите район в пределах 1 шага выбранного представителя. Подсветка учитывает Land Value, Street Network / Rail / Port / Fire / Clinic.</span></div><button class="ghost-btn" id="cancelConstruction">Отмена</button>`;
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
    g.classList.toggle('selected',!deliveryDraft&&state.selectedDistrictId===id);
    g.classList.remove('build-ok','build-blocked','worker-reachable','worker-unreachable','worker-origin','move-target','delivery-route-district','delivery-route-current','delivery-next','delivery-blocked');
    if(deliveryDraft?.step==='route'){
      const route=deliveryDraft.route||[],last=route[route.length-1],next=new Set(deliveryNeighbors(last));
      if(route.includes(id))g.classList.add('delivery-route-district');
      if(id===last)g.classList.add('delivery-route-current');
      if(next.has(id))g.classList.add('delivery-next');
      if(['park','presidio','twinpeaks'].includes(id))g.classList.add('delivery-blocked');
      return;
    }
    if(selectedWorker&&!state.activationMainActionUsed){
      if(id===selectedWorker.districtId)g.classList.add('worker-origin');
      if(reachableIds.has(id))g.classList.add('worker-reachable');
      else g.classList.add('worker-unreachable');
    }
    if(workerAction?.type==='raiseCapital'&&reachableIds.has(id))g.classList.add('move-target');
    if(pending){
      const check=constructionEligibility(state,pending.playerId,pending.projectId,id);
      g.classList.add(check.ok?'build-ok':'build-blocked');
    }
  });

  const meta=$('#districtMetaLayer');
  if(meta){
    meta.innerHTML=DISTRICTS.map(d=>{
      const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),[x,y]=DISTRICT_META_POS[d.id]||DISTRICT_POS[d.id],a=districtAccess(state,d.id);
      const pendingCheck=pending?constructionEligibility(state,pending.playerId,pending.projectId,d.id):null;
      const movementLegal=workerAction?.type==='raiseCapital'?reachableIds.has(d.id):null;
      const klass=(d.passable===false?'district-meta special closed':d.buildable===false?'district-meta special passage':
        pending?(pendingCheck.ok?'district-meta eligible':'district-meta blocked')
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
        const selectable=!deliveryDraft&&state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===p.id&&!w.used&&!state.activationMainActionUsed;
        workerHtml+=`<g class="worker-token token-${p.key} ${w.used?'used':''} ${isSelected?'selected':''} ${selectable?'selectable':''}" transform="translate(${cx+dx} ${cy+dy})" data-worker-token="${w.id}" data-worker-player="${p.id}"><circle r="16"/><text y="4">${w.number}</text><title>${p.name} · представитель #${w.number} · ${districtById(w.districtId)?.name}${w.used?' · использован':''}</title></g>`;
      });
    });
    workerLayer.innerHTML=workerHtml;
    $$('[data-worker-token]').forEach(g=>g.onclick=()=>{
      const workerPlayer=Number(g.dataset.workerPlayer);
      if(deliveryDraft||state.phase!=='development'||currentDeveloper(state)!==workerPlayer)return;
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
        const complete=con.status==='complete';
        const warehouseComplete=complete&&con.projectId==='warehouse';
        const warehouseLoad=(con.storedMaterials||[]).length;
        const label=warehouseComplete?'W '+warehouseLoad+'/'+WAREHOUSE_STORAGE_CAPACITY:complete?'✓':prog.delivered+'/'+prog.required;
        const sourceSelectable=deliveryDraft?.step==='source'&&warehouseComplete&&con.playerId===deliveryDraft.playerId&&warehouseLoad>0;
        html+='<g class="construction-token '+(complete?'complete':'under')+' token-'+pl.key+' '+(sourceSelectable?'delivery-source-selectable':'')+'" transform="translate('+(cx+dx)+' '+(cy+dy+30)+')" '+(sourceSelectable?'data-delivery-source-warehouse="'+con.id+'"':'')+'><rect x="-29" y="-16" width="58" height="32" rx="10"/><text y="4">'+label+'</text><title>'+pl.name+': '+pr.name+' — '+(warehouseComplete?'Storage '+warehouseLoad+'/'+WAREHOUSE_STORAGE_CAPACITY:complete?'Completed':prog.delivered+'/'+prog.required+' materials')+'</title></g>';
      });
    });
    layer.innerHTML=html;
    $('[data-delivery-source-warehouse]').forEach(g=>g.onclick=e=>{e.stopPropagation();selectDeliverySource({kind:'warehouse',id:g.dataset.deliverySourceWarehouse});});
  }
}

function startConstructionFlow(playerId,projectId){
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
  showToast(r.completed?`Main action: объект сразу завершён со склада · ${land}`:`Main action: стройка начата · ${land}. Worker #${r.worker?.number} теперь в ${districtById(state.selectedDistrictId)?.name}.`);
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
    showToast(r.reason==='worker-range'?'Этот район дальше одного шага':'Raise Capital сейчас недоступен');
    return;
  }
  state.pendingWorkerAction=null;
  state.selectedDistrictId=targetDistrictId;
  mobileContextOpen=false;
  const fromName=districtById(from)?.name||from,toName=districtById(targetDistrictId)?.name||targetDistrictId;
  showToast(`Raise Capital +$${r.amount} · #${r.worker.number}: ${fromName}${from===targetDistrictId?'':` → ${toName}`}`);
  render();
}

function renderContext(){
  const panel=$('#contextPanel');
  const close=isMobile()?'<button class="context-close" id="contextClose" aria-label="Закрыть подробности">×</button>':'';
  if(state.view==='hall'){
    const m=state.market.find(x=>x&&x.uid===state.selectedMarketUid)||state.market.find(Boolean);
    if(!m){panel.innerHTML=close+'<div class="empty-state">На рынке нет проекта.</div>';wireContextClose();return;}
    const p=projectById(m.id),claims=m.claims.map(c=>state.players[c.player].name).join(', ')||'нет';
    panel.innerHTML=`${close}<div class="detail-type">${p.type}</div><h3>${p.name}</h3><div class="detail-price">$${openingPrice(m)} <span style="font-size:11px;color:#84786a">opening</span></div><div class="project-vp-callout">Prestige <b>+${p.prestige||0} VP</b> после завершения</div><div class="detail-section"><div class="detail-label">Материалы</div><div class="project-material-line">${resourcePills(p.materials)}</div></div><div class="detail-section"><div class="detail-label">Условия строительства</div><div class="detail-text">${p.requires}</div></div><div class="detail-section"><div class="detail-label">После постройки</div><div class="detail-text">${p.effect}</div></div><div class="detail-section"><div class="detail-label">Тендер</div><div class="detail-text">Заявки: ${claims}<br>${m.age===1?'Последний шанс · скидка $1':'Новый проект'}${m.result?`<br><b>Результат: ${state.players[m.result.player].name} за $${m.result.price}</b>`:''}</div></div>`;
  }else{
    const d=districtById(state.selectedDistrictId)||DISTRICTS.find(x=>x.id==='civic')||DISTRICTS[0],ds=state.districts[d.id],access=districtAccess(state,d.id);
    const used=districtConstructionCount(state,d.id),free=d.buildable===false?0:Math.max(0,ds.sites-used);
    const builtHere=(state.constructions||[]).filter(x=>x.districtId===d.id);
    const fireSource=serviceSourceText(access.fireSources),clinicSource=serviceSourceText(access.clinicSources);
    const accessHtml=`<div class="access-grid">${accessChip('STREET',access.road)}${accessChip('RAIL',access.rail)}${accessChip('PORT',access.port)}${accessChip('FIRE',access.fire)}${accessChip('CLINIC',access.clinic)}</div>${fireSource?`<div class="access-source">Fire Protection: ${fireSource}</div>`:''}${clinicSource?`<div class="access-source">Clinic access: ${clinicSource}</div>`:''}`;

    let workerActionHtml='';
    if(state.pendingWorkerAction?.type==='raiseCapital'){
      const pid=state.pendingWorkerAction.playerId,w=activeWorker(state,pid);
      const canMove=!!w&&workerCanReachDistrict(state,pid,d.id,w.id);
      workerActionHtml=`<div class="construction-confirm ${canMove?'ok':'blocked'}"><div class="detail-label">Raise Capital · move</div><strong>+$${RAISE_CAPITAL_AMOUNT} · представитель #${w?.number||'—'}</strong><div class="detail-text">${canMove?`После действия останется в ${d.name}.`:'Слишком далеко: максимум текущий или соседний район.'}</div>${canMove?'<button class="primary-btn full" id="confirmRaiseCapital">Получить $3 здесь</button>':''}</div>`;
    }

    let constructionHtml='';
    if(state.pendingConstruction){
      const pending=state.pendingConstruction,pl=state.players[pending.playerId],pr=projectById(pending.projectId),check=constructionEligibility(state,pending.playerId,pending.projectId,d.id);
      const priceLine=check.bureauDiscount>0?`<span>Земля <b>$${check.baseCost} → $${check.cost}</b></span><span>Contract <b>−$${check.bureauDiscount}</b></span>`:`<span>Земля <b>$${check.cost}</b></span><span>Представитель <b>1</b></span>`;
      constructionHtml=`<div class="construction-confirm ${check.ok?'ok':'blocked'}"><div class="detail-label">Begin Construction</div><strong>${pl.name} · ${pr.name}</strong><div class="construction-cost">${priceLine}</div>${check.ok?'<button class="primary-btn full" id="confirmConstruction">Начать строительство</button>':`<div class="eligibility-errors">${check.reasons.map(x=>`<div>• ${x}</div>`).join('')}</div>`}</div>`;
    }

    const objects=builtHere.length?builtHere.map(x=>{
      const pr=projectById(x.projectId),prog=constructionProgress(state,x.id),pl=state.players[x.playerId];
      const land=x.projectId==='factory'&&x.status==='complete'?' · Land −1':['firehouse','clinic','publicworks','streetcar'].includes(x.projectId)&&x.status==='complete'?' · Land +1':'';
      return `<div class="mini-construction ${x.status==='complete'?'done':''}"><span class="player-dot ${pl.key}"></span><span><b>${pr.name}</b><small>${pl.name} · ${x.status==='complete'?`готово · VP +${pr.prestige||0} · Income +$${pr.income||0}${land}`:`материалы ${prog.delivered}/${prog.required}`}</small></span><button class="mini-open" data-open-construction="${x.id}">Открыть</button></div>`;
    }).join(''):'Пока нет.';

    const neighborNames=districtNeighbors(d.id).map(id=>districtById(id)?.name).filter(Boolean).join(', ');
    const statsHtml=d.buildable===false
      ?`<div class="district-stats special-stats"><div><span>СТАТУС</span><strong>${d.passable===false?'CLOSED':'PASSAGE'}</strong></div><div><span>СТРОИТЬ</span><strong>НЕТ</strong></div><div><span>ПЕРЕДВИЖЕНИЕ</span><strong>${d.passable===false?'НЕТ':'ДА'}</strong></div></div>`
      :`<div class="district-stats"><div><span>LAND VALUE</span><strong>${ds.landValue}</strong></div><div><span>ПЛОЩАДКИ</span><strong>${used} / 5</strong></div><div><span>СВОБОДНО</span><strong>${free}</strong></div></div>`;
    panel.innerHTML=`${close}<div class="detail-type">${d.buildable===false?'SPECIAL AREA':'DISTRICT'}</div><h3>${d.name}</h3>${statsHtml}<div class="detail-section"><div class="detail-label">Доступ и городские службы</div>${d.buildable===false?'':accessHtml}<div class="access-neighbors">Соседние доступные зоны: ${neighborNames||'нет'}</div></div><div class="detail-section"><div class="detail-label">Характер района</div><div class="detail-text">${d.hint}</div></div>${workerActionHtml}${constructionHtml}<div class="detail-section"><div class="detail-label">Объекты в районе</div><div class="detail-text">${objects}</div></div><div class="district-placeholder"><b>v0.28:</b> Delivery — fast action. Грузовые маршруты идут по adjacency обычных районов; Golden Gate Park, Presidio и Twin Peaks для грузов закрыты. Склад хранит 5 ресурсов, стройка — 3.</div>`;
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
  const loanHtml=loans.length?loans.map((loan,i)=>`<div class="loan-row"><span><b>Loan ${i+1}</b><small>${loan.interestPaid?'процент уже уплачен · можно погашать':'погашение откроется после Income Phase'}</small></span><strong>$${loan.principal}</strong></div>`).join(''):'<div class="empty-state compact">Активных кредитов нет.</div>';

  const available=p.portfolio.map((id,handIndex)=>{
    const pr=projectById(id),isTurn=canTakeMainAction(state,p.id);
    const buttonText=state.phase!=='development'?'После тендеров':!isActive?'Не ваша активация':state.activationMainActionUsed?'Main action уже использован':'Начать строительство';
    const footer=`<button class="secondary-btn full hand-build-btn" data-start-project="${id}" data-player="${p.id}" ${isTurn?'':'disabled'}>${buttonText}</button>`;
    return projectCoreCard(pr,{topLeft:`HAND ${handIndex+1}/${HAND_LIMIT}`,topRight:'IN HAND',priceLabel:'base open',priceValue:pr.open,extraClass:'hand-card',footer});
  }).join('');

  const activeHtml=active.map(con=>{
    const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id);
    if(con.status==='complete'){
      const stored=con.projectId==='warehouse'?(con.storedMaterials||[]):[];
      const wh=con.projectId==='warehouse'
        ?'<div class="warehouse-note"><b>Warehouse storage '+stored.length+'/'+WAREHOUSE_STORAGE_CAPACITY+'</b><div class="warehouse-stock">'+(stored.length?stored.map(type=>'<span class="drop-chip '+materialClass(type)+'">'+materialShort(type)+'</span>').join(''):'<small>Пусто</small>')+'</div><span>Ресурсы сохраняются между раундами. Из склада можно начинать Delivery.</span></div>'
        :'';
      let actionNote='';
      if(['bank','bureau','shops','club'].includes(con.projectId)){
        const occupant=actionSpaceOccupant(state,con.id);
        const labels={bank:'Bank Loan',bureau:'Construction Contract −$2 land',shops:'Procurement: $1 → до 2 купленных материалов по $0',club:'Networking Dinner: −$1 → +1 Influence'};
        actionNote='<div class="action-building-note '+(occupant!=null?'used':'')+'">Action space: '+labels[con.projectId]+' · '+(occupant!=null?'USED THIS ROUND · '+state.players[occupant].name:'available this round')+'</div>';
      }else if(['firehouse','clinic','publicworks','streetcar'].includes(con.projectId)){
        actionNote=con.projectId==='streetcar'?'<div class="land-building-note">Streetcar повысил Land Value на $1 и, если требовалось, открыл Street Network в районе.</div>':'<div class="land-building-note">После завершения этот объект повысил Land Value района на $1.</div>';
      }else if(con.projectId==='factory'){
        actionNote='<div class="factory-building-note">После завершения Factory снизила Land Value района на $1.</div>';
      }
      return '<div class="portfolio-card construction-card completed"><div class="construction-card-head"><span><strong>'+pr.name+'</strong><small>'+d.name+'</small></span><span class="status-badge done">COMPLETE</span></div><div class="project-material-line large">'+resourcePills(pr.materials,pr.materials)+'</div><div class="completed-effect"><b>Prestige +'+(pr.prestige||0)+' VP</b> · Income +$'+(pr.income||0)+' / раунд · '+pr.effect+'</div>'+wh+actionNote+'</div>';
    }

    const localWarehouses=playerWarehouses(state,p.id,con.districtId);
    const localStored=localWarehouses.reduce((sum,w)=>sum+(w.storedMaterials||[]).length,0);
    const needsWarehouse=pr.materials.length>CONSTRUCTION_STAGING_CAPACITY&&con.projectId!=='warehouse';
    const capacityNote=needsWarehouse&&!localWarehouses.length
      ?'<div class="capacity-warning">Для завершения проекта из '+pr.materials.length+' материалов нужен завершённый Warehouse в этом районе.</div>'
      :con.projectId==='warehouse'?'<div class="warehouse-note">Bootstrap: у самого Warehouse разрешён финальный 4-й материал, чтобы первый склад можно было построить.</div>'
      :localWarehouses.length?'<div class="warehouse-note">В районе Warehouse: '+localStored+' сохранённых ресурсов. Они могут автоматически закрыть недостающие требования проекта.</div>':'';
    return '<div class="portfolio-card construction-card active-build '+(isActive?'':'view-only')+'"><div class="construction-card-head"><span><strong>'+pr.name+'</strong><small>'+d.name+'</small></span><span class="status-badge">'+prog.delivered+'/'+prog.required+'</span></div><div class="project-material-line large">'+resourcePills(pr.materials,con.materialsDelivered)+'</div><div class="site-capacity"><span>Staging</span><b>'+prog.delivered+' / '+CONSTRUCTION_STAGING_CAPACITY+'</b><small>Ресурсы поступают только через Delivery fast action.</small></div>'+capacityNote+'</div>';
  }).join('');

  const contract=(p.bureauContracts||0)>0?'<span class="contract-chip">Construction Contract · −$2 next paid land</span>':'<span class="contract-chip empty">No Construction Contract</span>';
  const procurementChip=procurement?`<span class="procurement-chip">Procurement · ${procurement} material${procurement===1?'':'s'} at $0</span>`:'';
  const activationNote=isActive
    ?`<div class="office-activation active"><b>АКТИВАЦИЯ ${p.name}</b><span>Free actions доступны до и после main action. Ход не перейдёт дальше, пока вы не нажмёте End Activation.</span></div>`
    :state.phase==='development'&&!state.developmentComplete
      ?`<div class="office-activation locked"><b>VIEW ONLY</b><span>Сейчас активация: ${state.players[activePlayerId].name}. Delivery / Repay доступны только активному игроку.</span></div>`
      :'';

  $('#officeContent').innerHTML=`<div class="office-tabs">${state.players.map((x,i)=>`<button class="office-tab ${i===inspectedOffice?'active':''}" data-office-tab="${i}">${x.name}</button>`).join('')}</div>${activationNote}<div class="office-summary four"><div class="office-stat"><span>Capital</span><strong>$${p.capital}</strong></div><div class="office-stat"><span>Prestige</span><strong>${p.prestige||0} VP</strong></div><div class="office-stat"><span>Influence</span><strong>${p.influence}</strong></div><div class="office-stat"><span>Next income</span><strong>+$${roundIncome(state,p.id)}</strong></div></div><div class="office-mini-note">Представители: <b>${p.workersLeft??0}/3</b> · Рука: <b>${p.portfolio.length}/${HAND_LIMIT}</b> · Delivery / Repay = free actions только во время собственной активации.</div><div class="loan-panel"><div class="loan-head"><span><b>LOANS ${loans.length}/${MAX_ACTIVE_LOANS}</b><small>Debt $${debt} · Interest −$${interest} next Income</small></span><button class="mini-repay" id="repayLoanBtn" ${canRepay?'':'disabled'}>Repay $6</button></div>${loanHtml}</div><div class="contract-line">${contract}${procurementChip}</div><div class="detail-label">Available Projects</div><div style="margin-top:7px">${available||'<div class="empty-state">Нет доступных проектов. Выиграйте их в City Hall.</div>'}</div><div class="detail-label office-subhead">Construction & Buildings</div><div style="margin-top:7px">${activeHtml||'<div class="empty-state compact">Объектов пока нет.</div>'}</div><div class="district-placeholder"><b>v0.25:</b> рука ограничена 5 проектами. Каждый из 3 представителей имеет собственную позицию и может выполнить main action только здесь или в соседнем районе.</div>`;

  $$('[data-office-tab]').forEach(b=>b.onclick=()=>{inspectedOffice=+b.dataset.officeTab;renderOffice();});
  $$('[data-start-project]').forEach(b=>b.onclick=()=>startConstructionFlow(+b.dataset.player,b.dataset.startProject));
  const repay=$('#repayLoanBtn');if(repay)repay.onclick=()=>{const r=repayLoan(state,p.id);if(!r.ok){showToast(r.reason==='not-active-player'?'Repay доступен только активному игроку':r.reason==='capital'?'Недостаточно денег':r.reason==='not-seasoned'?'Сначала кредит должен пройти Income Phase':'Сейчас нельзя погасить');return;}showToast('Кредит погашен · −$6');render();};
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
function newGame(){if(!confirm('Начать новую тестовую партию?'))return;deliveryDraft=null;state=createInitialState();inspectedOffice=0;localStorage.removeItem(STORAGE_KEY);LEGACY_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));closeDrawers();closeMobileContext();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$('.nav-btn[data-view]').forEach(b=>b.onclick=()=>{deliveryDraft=null;mobileContextOpen=false;state.view=b.dataset.view;render();});
$('#officeBtn').onclick=()=>{if(deliveryDraft){showToast('Сначала завершите или отмените Delivery');return;}if(state.phase==='draft'){showToast('Офисы откроются после стартового драфта');return;}inspectedOffice=preferredOfficePlayer();openDrawer('officeDrawer');renderOffice();};
$('#logBtn').onclick=()=>openDrawer('logDrawer');
$('#settingsBtn').onclick=()=>openDrawer('settingsDrawer');
$('#helpBtn').onclick=()=>{showToast('v0.28: Delivery — fast action. Источник → перевозчик → груз → маршрут по районам → разгрузка на своих стройках/складах. Парк закрыт для грузов.');};
$('#drawerBackdrop').onclick=closeDrawers;
$('#contextBackdrop').onclick=closeMobileContext;$$('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
$('#modalBackdrop').onclick=()=>{};
$('#newGameBtn').onclick=newGame;
$('#copyLogBtn').onclick=async()=>{const text=state.log.map(x=>x.msg).join('\n');try{await navigator.clipboard.writeText(text);showToast('Лог скопирован');}catch{prompt('Скопируйте лог:',text);}};
$('#endRoundBtn').onclick=()=>{deliveryDraft=null;state.pendingConstruction=null;state.pendingWorkerAction=null;mobileContextOpen=false;const r=cleanupMarket(state);if(!r.ok){if(r.reason==='development-not-complete')showToast('Сначала используйте всех представителей');return;}state.view=r.finished?'city':'hall';render();};
const mapFit=$('#mapZoomFit');if(mapFit)mapFit.onclick=()=>{mobileMapDetail=false;syncMapZoom();};
const mapDetail=$('#mapZoomDetail');if(mapDetail)mapDetail.onclick=()=>{mobileMapDetail=true;syncMapZoom();};
$('[data-district]').forEach(g=>g.onclick=()=>{
  const id=g.dataset.district;
  if(handleDeliveryDistrictClick(id))return;
  state.selectedDistrictId=id;
  if(state.pendingWorkerAction?.type==='raiseCapital'){
    confirmRaiseCapitalInDistrict(id);
    return;
  }
  if(isMobile())mobileContextOpen=true;
  render();
});
window.addEventListener('resize',()=>{if(!isMobile())mobileContextOpen=false;syncMobileContext();syncMapZoom();});

loadDevMapBackground();
render();
