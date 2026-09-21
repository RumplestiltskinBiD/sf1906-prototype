import {
  PROJECTS,DISTRICTS,MAX_ROUNDS,RESOURCE_PRICES,BASE_ROUND_INCOME,RAISE_CAPITAL_AMOUNT,LOAN_PRINCIPAL,MAX_ACTIVE_LOANS,BUREAU_LAND_DISCOUNT,HAND_LIMIT,STARTER_KEEP,WORKERS_PER_PLAYER,
  projectById,districtById,districtAccess,districtNeighbors,turnOrder,currentDeclarer,currentDeveloper,openingPrice,
  createWorkers,playerWorkers,activeWorker,workerCanReachDistrict,workerReachableDistricts,selectWorker,
  createInitialState,claimProject,passDeclaration,beginBidding,currentBidTask,submitBid,
  resolveTenders,cleanupMarket,districtConstructionCount,constructionEligibility,beginConstruction,setLandValue,
  constructionProgress,canDeliverMaterial,deliverMaterial,canRentOverflow,rentOverflowSlot,roundIncome,grossRoundIncome,buildingIncome,warehouseCapacityBonus,
  activeLoans,loanInterest,completedActionSpaces,canTakeMainAction,canUseFreeAction,endActivation,actionSpaceOccupant,raiseCapital,takeBankLoan,repayLoan,takeBureauContract,useShoppingProcurement,useSocialClub,currentDraftPlayer,toggleStarterDraftCard,revealStarterDraft,confirmStarterDraft
} from './game-core.js';

const STORAGE_KEY='sf1906_phase1_ui_v025';
const LEGACY_STORAGE_KEYS=['sf1906_phase1_ui_v024','sf1906_phase1_ui_v023','sf1906_phase1_ui_v022','sf1906_phase1_ui_v021','sf1906_phase1_ui_v020','sf1906_phase1_ui_v0192','sf1906_phase1_ui_v0191','sf1906_phase1_ui_v019','sf1906_phase1_ui_v018','sf1906_phase1_ui_v017','sf1906_phase1_ui_v0166','sf1906_phase1_ui_v0165'];
let state=loadState();
let inspectedOffice=0;
let pendingBidReveal=false;
let mobileContextOpen=false;
let mobileMapDetail=false;

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
      if(['0.16.5','0.16.6','0.17','0.18','0.19','0.19.1','0.19.2','0.20','0.21','0.22','0.23','0.24','0.25'].includes(parsed?.version))return migrateState(parsed);
    }
  }catch(e){}
  return createInitialState();
}
function migrateState(parsed){
  const originalVersion=parsed.version;
  parsed.version='0.25';
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
  parsed.constructions=(parsed.constructions||[]).map(x=>({...x,materialsDelivered:x.materialsDelivered||[],rentedSlots:x.rentedSlots||0,completedRound:x.completedRound??null}));
  parsed.market=(parsed.market||[]).map((m,i)=>m?({...m,uid:m.uid||`MIG-M-${i}-${m.id}`}):null);
  parsed.deck=(parsed.deck||[]).map((card,i)=>typeof card==='string'?{uid:`MIG-D-${i}-${card}`,id:card}:card);
  parsed.expired=parsed.expired||[];
  parsed.nextConstructionId=parsed.nextConstructionId||(parsed.constructions.reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1);
  parsed.nextLoanId=parsed.nextLoanId||(parsed.players.flatMap(p=>p.loans||[]).reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1);
  parsed.districts=parsed.districts||Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites,roadAccess:!!d.road}]));
  DISTRICTS.forEach(d=>{
    parsed.districts[d.id]=parsed.districts[d.id]||{landValue:d.landValue,sites:d.sites,roadAccess:!!d.road};
    if(parsed.districts[d.id].landValue==null)parsed.districts[d.id].landValue=d.landValue;
    if(parsed.districts[d.id].sites==null)parsed.districts[d.id].sites=d.sites;
    if(parsed.districts[d.id].roadAccess==null){
      const completedStreetcar=(parsed.constructions||[]).some(x=>x.districtId===d.id&&x.projectId==='streetcar'&&x.status==='complete');
      parsed.districts[d.id].roadAccess=!!d.road||completedStreetcar;
    }
  });
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
  renderTop();renderPlayers();renderViews();renderMarket();renderStarterDraft();renderSupply();renderWorkerDock();renderCityActions();renderCity();renderContext();renderOffice();renderLog();renderDebug();renderActionBar();renderTenderSteps();syncMobileContext();syncMapZoom();
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
    pill.onclick=()=>{if(state.phase==='draft'){showToast('Стартовые руки скрыты до завершения драфта');return;}inspectedOffice=i;openDrawer('officeDrawer');renderOffice();};
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
  pacific:[275,198],financial:[708,250],civic:[510,322],western:[308,340],
  soma:[535,452],mission:[365,502],missionbay:[742,444],sunset:[182,462]
};
const TOKEN_OFFSETS=[[-24,-12],[0,-12],[24,-12],[-12,13],[12,13],[36,13]];
const WORKER_OFFSETS=[[-54,-42],[-27,-42],[0,-42],[27,-42],[54,-42],[-40,-19],[-13,-19],[14,-19],[41,-19]];

function renderSupply(){
  const el=$('#resourceSupply');if(!el)return;
  el.innerHTML='<div class="supply-label"><strong>SUPPLY YARD</strong><span>v0.25 · movement + mobile UX</span></div><div class="supply-items">'+RESOURCE_ORDER.map(type=>'<span class="supply-resource '+materialClass(type)+'"><b>'+materialShort(type)+'</b><span>'+materialLabel(type)+'</span><strong>$'+RESOURCE_PRICES[type]+'</strong></span>').join('')+'</div>';
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
  <div class="action-legend"><b>${mainUsed?'FREE ACTIONS / END ACTIVATION':'MAIN ACTION'}</b><span>${procurement?`Procurement: ещё ${procurement} бесплатн. материала`:mainUsed?'Supply и Repay можно сделать сейчас':selected?'Выберите действие в пределах 1 района':'сначала выберите одного свободного представителя'}</span><em>FREE: Supply · Overflow · Repay</em></div>
  ${mainUsed?'<button class="end-activation-btn" id="actionEndActivation">Завершить активацию → следующий игрок</button>':''}
  <div class="city-action-grid ${mainUsed?'main-action-used':''}">
    <button class="city-action-card build" id="actionBuild" ${buildDisabled?'disabled':''}><b>Begin Construction</b><span>${availableProjects===0?'Нет доступного проекта':mainUsed?'Main action уже использован':!selected?'Сначала выберите представителя':'Выбрать проект в Office'}</span><strong>${buildDisabled?'LOCKED':'move ≤ 1 · 1 представитель'}</strong></button>
    <button class="city-action-card capital" id="actionRaiseCapital" ${capitalDisabled?'disabled':''}><b>Raise Capital</b><span>Без долга · представитель остаётся в текущем районе</span><strong>${capitalDisabled?'LOCKED':`+$${RAISE_CAPITAL_AMOUNT}`}</strong></button>
    <div class="city-action-card bank-card"><b>Bank Loan</b><span>Нужно добраться до района Bank · 1 use / round</span><div class="action-space-list">${bankButtons}</div></div>
    <div class="city-action-card bureau-card"><b>Construction Bureau</b><span>Нужно добраться до Bureau · 1 use / round</span><div class="action-space-list">${bureauButtons}</div></div>
    <div class="city-action-card shops-card"><b>Shopping Row · Procurement</b><span>Нужно добраться до Shopping Row · $1</span><div class="action-space-list">${shopsButtons}</div></div>
    <div class="city-action-card club-card"><b>Restaurant & Social Club</b><span>Нужно добраться до Club · −$1 → +1 Influence</span><div class="action-space-list">${clubButtons}</div></div>
  </div>`;

  $$('[data-select-worker]').forEach(b=>b.onclick=()=>{
    const r=selectWorker(state,pid,b.dataset.selectWorker);
    if(!r.ok){showToast(r.reason==='used'?'Этот представитель уже использован':'Нельзя выбрать этого представителя');return;}
    state.pendingConstruction=null;render();
  });
  const build=$('#actionBuild');if(build&&!buildDisabled)build.onclick=()=>{inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();};
  const raise=$('#actionRaiseCapital');if(raise&&!capitalDisabled)raise.onclick=()=>{const r=raiseCapital(state,pid);if(!r.ok){showToast(r.reason==='worker'?'Сначала выберите представителя':'Сейчас нельзя использовать Raise Capital');return;}showToast(`Raise Capital +$${r.amount}. Worker #${r.worker.number} остаётся в ${districtById(r.worker.districtId)?.name}.`);render();};
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
  const mode=$('#constructionMode');
  if(state.phase!=='development'){
    mode.innerHTML='<div><strong>Строительство пока закрыто</strong><span>Сначала завершите City Hall Session.</span></div>';
    mode.className='construction-mode muted';
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
    g.classList.toggle('selected',state.selectedDistrictId===id);
    g.classList.remove('build-ok','build-blocked');
    if(pending){
      const check=constructionEligibility(state,pending.playerId,pending.projectId,id);
      g.classList.add(check.ok?'build-ok':'build-blocked');
    }
  });

  const meta=$('#districtMetaLayer');
  if(meta){
    meta.innerHTML=DISTRICTS.map(d=>{
      const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),[x,y]=DISTRICT_POS[d.id],a=districtAccess(state,d.id);
      const pendingCheck=pending?constructionEligibility(state,pending.playerId,pending.projectId,d.id):null;
      const klass=pending?(pendingCheck.ok?'district-meta eligible':'district-meta blocked'):'district-meta';
      const tags=[a.road?'ST':'',a.rail?'RL':'',a.port?'PT':'',a.fire?'F':'',a.clinic?'C':''].filter(Boolean).join('·');
      return `<text class="${klass}" x="${x}" y="${y}">LAND $${ds.landValue} · ${used}/${ds.sites}${tags?` · ${tags}`:''}</text>`;
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
        workerHtml+=`<g class="worker-token token-${p.key} ${w.used?'used':''} ${isSelected?'selected':''} ${selectable?'selectable':''}" transform="translate(${cx+dx} ${cy+dy})" data-worker-token="${w.id}" data-worker-player="${p.id}"><circle r="11"/><text y="4">${w.number}</text><title>${p.name} · представитель #${w.number} · ${districtById(w.districtId)?.name}${w.used?' · использован':''}</title></g>`;
      });
    });
    workerLayer.innerHTML=workerHtml;
    $$('[data-worker-token]').forEach(g=>g.onclick=()=>{
      const workerPlayer=Number(g.dataset.workerPlayer);
      if(state.phase!=='development'||currentDeveloper(state)!==workerPlayer)return;
      const r=selectWorker(state,workerPlayer,g.dataset.workerToken);
      if(!r.ok)return;
      state.pendingConstruction=null;render();
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
        const complete=con.status==='complete',label=complete?'✓':`${prog.delivered}/${prog.required}`;
        html+=`<g class="construction-token ${complete?'complete':'under'} token-${pl.key}" transform="translate(${cx+dx} ${cy+dy+30})"><rect x="-23" y="-14" width="46" height="28" rx="9"/><text y="4">${label}</text><title>${pl.name}: ${pr.name} — ${complete?'Completed':`${prog.delivered}/${prog.required} materials`}</title></g>`;
      });
    });
    layer.innerHTML=html;
  }
}

function startConstructionFlow(playerId,projectId){
  const pl=state.players[playerId],pr=projectById(projectId);
  if(state.phase!=='development'){showToast('Сначала завершите тендеры');return;}
  if(!canTakeMainAction(state,playerId)){showToast(activeWorker(state,playerId)?'Сейчас нельзя начать новое main action':'Сначала выберите одного из 3 представителей');return;}
  if(!pl.portfolio.includes(projectId)){showToast('Проект уже недоступен');return;}
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
  showToast(`Main action: стройка начата · ${land}. Worker #${r.worker?.number} теперь в ${districtById(state.selectedDistrictId)?.name}.`);
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
    const d=districtById(state.selectedDistrictId)||DISTRICTS[0],ds=state.districts[d.id],access=districtAccess(state,d.id);
    const used=districtConstructionCount(state,d.id),free=Math.max(0,ds.sites-used);
    const builtHere=(state.constructions||[]).filter(x=>x.districtId===d.id);
    const fireSource=serviceSourceText(access.fireSources),clinicSource=serviceSourceText(access.clinicSources);
    const accessHtml=`<div class="access-grid">${accessChip('STREET',access.road)}${accessChip('RAIL',access.rail)}${accessChip('PORT',access.port)}${accessChip('FIRE',access.fire)}${accessChip('CLINIC',access.clinic)}</div>${fireSource?`<div class="access-source">Fire Protection: ${fireSource}</div>`:''}${clinicSource?`<div class="access-source">Clinic access: ${clinicSource}</div>`:''}`;

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
    panel.innerHTML=`${close}<div class="detail-type">DISTRICT</div><h3>${d.name}</h3><div class="district-stats"><div><span>LAND VALUE</span><strong>$${ds.landValue}</strong></div><div><span>ПЛОЩАДКИ</span><strong>${used} / ${ds.sites}</strong></div><div><span>СВОБОДНО</span><strong>${free}</strong></div></div><div class="detail-section"><div class="detail-label">Доступ и городские службы</div>${accessHtml}<div class="access-neighbors">Соседние районы: ${neighborNames||'нет'}</div></div><div class="detail-section"><div class="detail-label">Характер района</div><div class="detail-text">${d.hint}</div></div>${constructionHtml}<div class="detail-section"><div class="detail-label">Объекты в районе</div><div class="detail-text">${objects}</div></div><div class="district-placeholder"><b>v0.24:</b> Fire House и Clinic обслуживают свой и соседние районы по дорожной сети. Rail/Port заданы районом. Western Expansion начинает без Street Network; Streetcar Extension может открыть его.</div>`;
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
      const wh=con.projectId==='warehouse'?'<div class="warehouse-note">Warehouse: +3 staging capacity для ваших строек в этом районе.</div>':'';
      let actionNote='';
      if(['bank','bureau','shops','club'].includes(con.projectId)){
        const occupant=actionSpaceOccupant(state,con.id);
        const labels={bank:'Bank Loan',bureau:'Construction Contract −$2 land',shops:'Procurement: $1 → до 2 материалов',club:'Networking Dinner: −$1 → +1 Influence'};
        actionNote=`<div class="action-building-note ${occupant!=null?'used':''}">Action space: ${labels[con.projectId]} · ${occupant!=null?`USED THIS ROUND · ${state.players[occupant].name}`:'available this round'}</div>`;
      }else if(['firehouse','clinic','publicworks','streetcar'].includes(con.projectId)){
        actionNote=con.projectId==='streetcar'?'<div class="land-building-note">Streetcar повысил Land Value на $1 и, если требовалось, открыл Street Network в районе.</div>':'<div class="land-building-note">После завершения этот объект повысил Land Value района на $1.</div>';
      }else if(con.projectId==='factory'){
        actionNote='<div class="factory-building-note">После завершения Factory снизила Land Value района на $1.</div>';
      }
      return `<div class="portfolio-card construction-card completed"><div class="construction-card-head"><span><strong>${pr.name}</strong><small>${d.name}</small></span><span class="status-badge done">COMPLETE</span></div><div class="project-material-line large">${resourcePills(pr.materials,con.materialsDelivered)}</div><div class="completed-effect"><b>Prestige +${pr.prestige||0} VP</b> · Income +$${pr.income||0} / раунд · ${pr.effect}</div>${wh}${actionNote}</div>`;
    }

    const rent=canRentOverflow(state,con.id),whBonus=warehouseCapacityBonus(state,p.id,con.districtId);
    const buttons=RESOURCE_ORDER.map(type=>{
      const check=canDeliverMaterial(state,con.id,type);
      const need=pr.materials.filter(x=>x===type).length-(con.materialsDelivered||[]).filter(x=>x===type).length;
      if(need<=0)return '';
      const reason=check.ok?'':check.reason==='not-active-player'?'Не ваша активация':check.reason==='capacity'?'Нет места':check.reason==='capital'?'Нет денег':'Недоступно';
      const price=check.ok&&check.procurement?0:RESOURCE_PRICES[type];
      const detail=check.ok?(check.procurement?`Procurement · осталось ${procurement}`:`осталось ${need}`):reason;
      return `<button class="resource-buy ${materialClass(type)} ${check.procurement?'procurement':''}" data-deliver="${con.id}" data-resource="${type}" ${check.ok?'':'disabled'}><span class="resource-buy-icon">${materialShort(type)}</span><span>${materialLabel(type)}</span><b>$${price}</b><small>${detail}</small></button>`;
    }).join('');
    const capacityNote=prog.delivered>=prog.capacity&&prog.remaining>0?'<div class="capacity-warning">Площадка заполнена. Нужен дополнительный staging slot.</div>':'';
    const rentBtn=rent.ok?`<button class="overflow-btn" data-rent-slot="${con.id}">Арендовать +1 слот · $1</button>`:'';
    return `<div class="portfolio-card construction-card active-build ${isActive?'':'view-only'}"><div class="construction-card-head"><span><strong>${pr.name}</strong><small>${d.name}</small></span><span class="status-badge">${prog.delivered}/${prog.required}</span></div><div class="project-material-line large">${resourcePills(pr.materials,con.materialsDelivered)}</div><div class="site-capacity"><span>Staging</span><b>${prog.delivered} / ${prog.capacity}</b><small>base 3${whBonus?` · Warehouse +${whBonus}`:''}${con.rentedSlots?` · rental +${con.rentedSlots}`:''}</small></div>${capacityNote}<div class="resource-buy-grid">${buttons}</div>${rentBtn}</div>`;
  }).join('');

  const contract=(p.bureauContracts||0)>0?'<span class="contract-chip">Construction Contract · −$2 next paid land</span>':'<span class="contract-chip empty">No Construction Contract</span>';
  const procurementChip=procurement?`<span class="procurement-chip">Procurement · ${procurement} material${procurement===1?'':'s'} at $0</span>`:'';
  const activationNote=isActive
    ?`<div class="office-activation active"><b>АКТИВАЦИЯ ${p.name}</b><span>Free actions доступны до и после main action. Ход не перейдёт дальше, пока вы не нажмёте End Activation.</span></div>`
    :state.phase==='development'&&!state.developmentComplete
      ?`<div class="office-activation locked"><b>VIEW ONLY</b><span>Сейчас активация: ${state.players[activePlayerId].name}. Supply / Overflow / Repay доступны только активному игроку.</span></div>`
      :'';

  $('#officeContent').innerHTML=`<div class="office-tabs">${state.players.map((x,i)=>`<button class="office-tab ${i===inspectedOffice?'active':''}" data-office-tab="${i}">${x.name}</button>`).join('')}</div>${activationNote}<div class="office-summary four"><div class="office-stat"><span>Capital</span><strong>$${p.capital}</strong></div><div class="office-stat"><span>Prestige</span><strong>${p.prestige||0} VP</strong></div><div class="office-stat"><span>Influence</span><strong>${p.influence}</strong></div><div class="office-stat"><span>Next income</span><strong>+$${roundIncome(state,p.id)}</strong></div></div><div class="office-mini-note">Представители: <b>${p.workersLeft??0}/3</b> · Рука: <b>${p.portfolio.length}/${HAND_LIMIT}</b> · Supply / Overflow / Repay = free actions только во время собственной активации.</div><div class="loan-panel"><div class="loan-head"><span><b>LOANS ${loans.length}/${MAX_ACTIVE_LOANS}</b><small>Debt $${debt} · Interest −$${interest} next Income</small></span><button class="mini-repay" id="repayLoanBtn" ${canRepay?'':'disabled'}>Repay $6</button></div>${loanHtml}</div><div class="contract-line">${contract}${procurementChip}</div><div class="detail-label">Available Projects</div><div style="margin-top:7px">${available||'<div class="empty-state">Нет доступных проектов. Выиграйте их в City Hall.</div>'}</div><div class="detail-label office-subhead">Construction & Buildings</div><div style="margin-top:7px">${activeHtml||'<div class="empty-state compact">Объектов пока нет.</div>'}</div><div class="district-placeholder"><b>v0.24:</b> рука ограничена 5 проектами. Каждый из 3 представителей имеет собственную позицию и может выполнить main action только здесь или в соседнем районе.</div>`;

  $$('[data-office-tab]').forEach(b=>b.onclick=()=>{inspectedOffice=+b.dataset.officeTab;renderOffice();});
  $$('[data-start-project]').forEach(b=>b.onclick=()=>startConstructionFlow(+b.dataset.player,b.dataset.startProject));
  $$('[data-deliver]').forEach(b=>b.onclick=()=>{const r=deliverMaterial(state,b.dataset.deliver,b.dataset.resource);if(!r.ok){showToast(r.reason==='not-active-player'?'Free actions доступны только активному игроку':r.reason==='capacity'?'Нет места на площадке':r.reason==='capital'?'Недостаточно денег':'Нельзя доставить этот ресурс');return;}showToast(r.completed?'Здание завершено!':r.procurement?`${materialLabel(b.dataset.resource)} через Procurement · $0`:`${materialLabel(b.dataset.resource)} доставлен · −$${r.cost}`);render();});
  $$('[data-rent-slot]').forEach(b=>b.onclick=()=>{const r=rentOverflowSlot(state,b.dataset.rentSlot);if(!r.ok){showToast(r.reason==='not-active-player'?'Не ваша активация':r.reason==='capital'?'Недостаточно денег':'Дополнительный слот не нужен');return;}showToast('Временное хранение +1 · −$1');render();});
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
function newGame(){if(!confirm('Начать новую тестовую партию?'))return;state=createInitialState();inspectedOffice=0;localStorage.removeItem(STORAGE_KEY);LEGACY_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));closeDrawers();closeMobileContext();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

$$('.nav-btn[data-view]').forEach(b=>b.onclick=()=>{mobileContextOpen=false;state.view=b.dataset.view;render();});
$('#officeBtn').onclick=()=>{if(state.phase==='draft'){showToast('Офисы откроются после стартового драфта');return;}inspectedOffice=preferredOfficePlayer();openDrawer('officeDrawer');renderOffice();};
$('#logBtn').onclick=()=>openDrawer('logDrawer');
$('#settingsBtn').onclick=()=>openDrawer('settingsDrawer');
$('#helpBtn').onclick=()=>{showToast('v0.24: 3 представителя имеют позиции на карте. Main action — в текущем или соседнем районе; позиции сохраняются. Street Network = развитая уличная сеть.');};
$('#drawerBackdrop').onclick=closeDrawers;
$('#contextBackdrop').onclick=closeMobileContext;$$('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
$('#modalBackdrop').onclick=()=>{};
$('#newGameBtn').onclick=newGame;
$('#copyLogBtn').onclick=async()=>{const text=state.log.map(x=>x.msg).join('\n');try{await navigator.clipboard.writeText(text);showToast('Лог скопирован');}catch{prompt('Скопируйте лог:',text);}};
$('#endRoundBtn').onclick=()=>{state.pendingConstruction=null;mobileContextOpen=false;const r=cleanupMarket(state);if(!r.ok){if(r.reason==='development-not-complete')showToast('Сначала используйте всех представителей');return;}state.view=r.finished?'city':'hall';render();};
$$('[data-district]').forEach(g=>g.onclick=()=>{state.selectedDistrictId=g.dataset.district;if(isMobile())mobileContextOpen=true;render();});
window.addEventListener('resize',()=>{if(!isMobile())mobileContextOpen=false;syncMobileContext();});

render();
