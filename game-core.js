export const PLAYER_NAMES = ['Синий','Красный','Зелёный'];
export const PLAYER_KEYS = ['blue','red','green'];
export const MAX_ROUNDS = 3;
export const RESOURCE_PRICES = {Lumber:1,Masonry:1,Steel:2};
export const BASE_ROUND_INCOME = 3;
export const RAISE_CAPITAL_AMOUNT = 3;
export const LOAN_PRINCIPAL = 6;
export const MAX_ACTIVE_LOANS = 2;
export const BUREAU_LAND_DISCOUNT = 2;
export const HAND_LIMIT = 5;
export const STARTER_DRAFT_SIZE = 5;
export const STARTER_KEEP = 2;
export const WORKERS_PER_PLAYER = 3;
export const STARTING_WORKER_DISTRICT = 'civic';
export const PROJECT_COPIES = 2;
export const LAND_VALUE_COMPLETION_CHANGE = {factory:-1,firehouse:1,clinic:1,publicworks:1,streetcar:1};

export const PROJECTS = [
  {prestige:1,income:2,id:'tenement',name:'Рабочий доходный дом',type:'Жильё',open:2,materials:['Lumber','Lumber','Masonry'],requires:'Street Network',accessAll:['road'],effect:'Income +2 · много жителей · Prestige +1',benefit:'Income +2 / раунд · Prestige +1 · много жителей',actionName:'—',actionText:'Отдельного действия нет.',limits:'Нужен Street Network.'},
  {prestige:0,income:3,id:'speculative',name:'Спекулятивный жилой комплекс',type:'Жильё',open:3,materials:['Lumber','Lumber','Lumber'],requires:'Land Value ≤2',effect:'Income +3 · очень много жителей · высокий риск',landMax:2,benefit:'Income +3 / раунд · Prestige 0 · очень много жителей',actionName:'—',actionText:'Отдельного действия нет.',limits:'Только Land Value ≤2. Высокий риск в будущей катастрофе.'},
  {prestige:3,income:3,id:'luxury',name:'Роскошные апартаменты',type:'Жильё',open:5,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Land Value 3+ · Fire Protection',accessAll:['fire'],effect:'Income +3 · Prestige +3',landMin:3,benefit:'Income +3 / раунд · Prestige +3',actionName:'—',actionText:'Отдельного действия нет.',limits:'Land Value 3+ и Fire Protection.'},
  {prestige:1,income:2,id:'shops',name:'Торговый ряд',type:'Коммерция',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Street Network · Land Value 1+',accessAll:['road'],effect:'Income +2 · Procurement action · Prestige +1',landMin:1,benefit:'Income +2 / раунд · Prestige +1',actionName:'Procurement',actionText:'1 представитель + $1 → до 2 материалов по $0 в эту активацию.',limits:'Нужна незавершённая стройка · 1 use / building / round · при чужом использовании $1 получает владелец.'},
  {prestige:3,income:4,id:'hotel',name:'Гранд-отель',type:'Коммерция',open:6,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Land Value 3+ · Fire Protection · Clinic access',accessAll:['fire','clinic'],effect:'Income +4 · Prestige +3',landMin:3,benefit:'Income +4 / раунд · Prestige +3',actionName:'—',actionText:'Отдельного действия нет.',limits:'Land Value 3+ · Fire Protection · Clinic access.'},
  {prestige:1,income:2,id:'bank',name:'Частный банк',type:'Коммерция',open:6,materials:['Masonry','Masonry','Steel','Steel'],requires:'Land Value 2+ · Street Network',accessAll:['road'],effect:'Income +2 · Bank Loan action · Prestige +1',landMin:2,benefit:'Income +2 / раунд · Prestige +1',actionName:'Bank Loan',actionText:'1 представитель → 1-й активный кредит +$6; 2-й +$5. Каждый кредит: долг $6 и −$1 к Income.',limits:'Макс. 2 активных кредита · 1 use / Bank / round · чужое использование даёт владельцу +1 Influence максимум 1×/round.'},
  {prestige:2,income:2,id:'club',name:'Ресторан и клуб',type:'Коммерция',open:4,materials:['Lumber','Masonry','Masonry'],requires:'Land Value 2+',effect:'Income +2 · Networking Dinner action · Prestige +2',landMin:2,benefit:'Income +2 / раунд · Prestige +2',actionName:'Networking Dinner',actionText:'1 представитель + $1 → +1 Influence.',limits:'1 use / building / round · если использует соперник, его $1 получает владелец.'},
  {prestige:1,income:2,id:'warehouse',name:'Распределительный склад',type:'Логистика',open:4,materials:['Lumber','Lumber','Masonry','Steel'],requires:'Port, Rail или Street Network',accessAny:['port','rail','road'],effect:'Income +2 · Storage +3 · Prestige +1',benefit:'Income +2 / раунд · Prestige +1 · +3 staging slots вашим стройкам в этом районе',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Нужен Port, Rail или Street Network.'},
  {prestige:0,income:5,id:'factory',name:'Крупная фабрика',type:'Промышленность',open:5,materials:['Lumber','Masonry','Masonry','Steel','Steel'],requires:'Rail или Port access',accessAny:['rail','port'],effect:'Income +5 · Land Value −1',benefit:'Income +5 / раунд · Prestige 0 · после завершения Land Value района −1',actionName:'—',actionText:'Отдельного действия нет.',limits:'Только Rail или Port access. Land Value не падает ниже 0.'},
  {prestige:1,income:0,id:'bureau',name:'Строительное бюро',type:'Коммерция',open:4,materials:['Lumber','Masonry','Steel'],requires:'Street Network',accessAll:['road'],effect:'Construction Contract · −$2 к Land Value · Prestige +1',benefit:'Prestige +1 · Income 0',actionName:'Construction Contract',actionText:'1 представитель → следующая платная земля дешевле до $2.',limits:'Макс. 1 сохранённый Contract · 1 use / building / round · чужое использование приносит владельцу $1.'},
  {prestige:1,income:3,id:'insurance',name:'Страховая компания',type:'Коммерция',open:5,materials:['Masonry','Masonry','Steel'],requires:'Land Value 2+',effect:'Income +3 · Prestige +1 · страховые действия позже',landMin:2,benefit:'Income +3 / раунд · Prestige +1',actionName:'Insurance',actionText:'Страховое действие ещё не активно в текущем прототипе.',limits:'Land Value 2+. Механика страхования будет добавлена позже.'},
  {prestige:3,income:0,id:'firehouse',name:'Муниципальная пожарная часть',type:'Городская служба',open:3,materials:['Lumber','Masonry','Steel'],requires:'Street Network · municipal site',accessAll:['road'],effect:'Fire Protection (district + adjacent road district) · Land Value +1 · Prestige +3',benefit:'Prestige +3 · Land Value района +1 · Fire Protection',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Нужен Street Network. Fire Protection действует в своём и соседнем районе через развитую уличную сеть. Municipal site пока не проверяется.'},
  {prestige:3,income:0,id:'clinic',name:'Районная клиника',type:'Городская служба',open:3,materials:['Lumber','Masonry','Masonry'],requires:'Street Network',accessAll:['road'],effect:'Clinic access (district + adjacent road district) · Land Value +1 · Prestige +3',benefit:'Prestige +3 · Land Value района +1 · Clinic access',actionName:'—',actionText:'Отдельного действия пока нет.',limits:'Нужен Street Network. Clinic access действует в своём и соседнем районе через развитую уличную сеть.'},
  {prestige:3,income:0,id:'publicworks',name:'Депо городских работ',type:'Городская служба',open:4,materials:['Lumber','Masonry','Masonry','Steel'],requires:'Street Network',accessAll:['road'],effect:'Water/Gas/repair infrastructure · Land Value +1 · Prestige +3',benefit:'Prestige +3 · Land Value района +1 · Water/Gas/repair infrastructure',actionName:'—',actionText:'Отдельное действие ещё не активно.',limits:'Нужен Street Network. Полные water/gas/repair правила будут добавлены позже.'},
  {prestige:3,income:0,id:'streetcar',name:'Трамвайное расширение и депо',type:'Инфраструктура',open:4,materials:['Lumber','Masonry','Steel'],requires:'Street Network или соседний район с Street Network',streetcarExtension:true,effect:'Открывает Street Network в районе · Land Value +1 · Prestige +3',benefit:'Prestige +3 · Land Value района +1 · открывает Street Network',actionName:'—',actionText:'Транспортное действие ещё не активно.',limits:'Можно строить при Street Network в районе или в одном из соседних районов.'}
]

export const DISTRICTS = [
  {id:'presidio',name:'Presidio',hint:'Federal Territory · закрыто для строительства и передвижения',landValue:0,sites:0,road:false,rail:false,port:false,buildable:false,passable:false},
  {id:'marina',name:'Marina',hint:'Северная набережная · дорогая земля · Port',landValue:3,sites:5,road:true,rail:false,port:true,buildable:true,passable:true},
  {id:'northbeach',name:'North Beach',hint:'Плотная северо-восточная застройка · Port',landValue:3,sites:5,road:true,rail:false,port:true,buildable:true,passable:true},
  {id:'chinatown',name:'Chinatown',hint:'Плотный центральный район',landValue:3,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'pacific',name:'Pacific Heights',hint:'Самая дорогая жилая земля',landValue:4,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'financial',name:'Financial District',hint:'Дорогой финансовый и портовый узел',landValue:4,sites:5,road:true,rail:false,port:true,buildable:true,passable:true},
  {id:'soma',name:'SoMa',hint:'Промышленный район · Rail + Port',landValue:2,sites:5,road:true,rail:true,port:true,buildable:true,passable:true},
  {id:'civic',name:'Civic Center',hint:'Административный центр и городские службы',landValue:3,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'western',name:'Western Addition',hint:'Средняя стоимость · развитая уличная сеть',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'innerrichmond',name:'Inner Richmond',hint:'Западный жилой район рядом с Golden Gate Park',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'outerrichmond',name:'Outer Richmond',hint:'Доступная западная земля',landValue:1,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'haight',name:'Haight-Ashbury',hint:'Средняя стоимость · центрально-западный узел',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'innersunset',name:'Inner Sunset',hint:'Доступная земля к югу от Golden Gate Park',landValue:1,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'sunset',name:'Outer Sunset',hint:'Самая дешёвая периферия · Street Network ещё не развит',landValue:0,sites:5,road:false,rail:false,port:false,buildable:true,passable:true},
  {id:'mission',name:'Mission',hint:'Доступная плотная застройка · Rail access',landValue:1,sites:5,road:true,rail:true,port:false,buildable:true,passable:true},
  {id:'missionbay',name:'Mission Bay',hint:'Дешёвая земля · Rail + Port · artificial fill',landValue:1,sites:5,road:true,rail:true,port:true,buildable:true,passable:true},
  {id:'potrero',name:'Potrero',hint:'Доступная промышленная земля · Rail + Port',landValue:1,sites:5,road:true,rail:true,port:true,buildable:true,passable:true},
  {id:'noe',name:'Noe Valley',hint:'Средняя стоимость · южный жилой район',landValue:2,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'bernal',name:'Bernal Heights',hint:'Доступная южная земля',landValue:1,sites:5,road:true,rail:false,port:false,buildable:true,passable:true},
  {id:'park',name:'Golden Gate Park',hint:'Строительство запрещено · рабочие могут проходить через парк',landValue:0,sites:0,road:false,rail:false,port:false,buildable:false,passable:true},
  {id:'twinpeaks',name:'Twin Peaks',hint:'Закрыто для строительства и передвижения',landValue:0,sites:0,road:false,rail:false,port:false,buildable:false,passable:false}
];

export const DISTRICT_ADJACENCY = {
  presidio:[],
  marina:['pacific','northbeach'],
  northbeach:['marina','chinatown'],
  chinatown:['northbeach','civic','financial'],
  pacific:['marina','western','civic'],
  financial:['chinatown','civic','soma'],
  civic:['pacific','western','chinatown','financial','haight','soma'],
  western:['pacific','civic','innerrichmond','haight'],
  innerrichmond:['outerrichmond','western','park'],
  outerrichmond:['innerrichmond','park'],
  park:['outerrichmond','innerrichmond','haight','innersunset','sunset'],
  haight:['park','western','civic','innersunset','mission'],
  innersunset:['park','sunset','haight','mission','noe'],
  sunset:['park','innersunset'],
  soma:['civic','financial','mission','missionbay'],
  mission:['haight','innersunset','soma','missionbay','potrero','noe','bernal'],
  missionbay:['soma','mission','potrero'],
  potrero:['missionbay','mission','bernal'],
  noe:['mission','innersunset','bernal'],
  bernal:['mission','noe','potrero'],
  twinpeaks:[]
};

export function shuffle(items, rng=Math.random){
  const a=[...items];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

export function projectById(id){return PROJECTS.find(p=>p.id===id) || null;}
export function districtById(id){return DISTRICTS.find(d=>d.id===id) || null;}
export function districtNeighbors(id){return [...(DISTRICT_ADJACENCY[id]||[])];}

export function createWorkers(playerId,{districtId=STARTING_WORKER_DISTRICT}={}){
  return Array.from({length:WORKERS_PER_PLAYER},(_,i)=>({
    id:`P${playerId+1}W${i+1}`,
    number:i+1,
    districtId,
    used:false
  }));
}
export function playerWorkers(state,playerId){return state.players?.[playerId]?.workers||[];}
export function availableWorkers(state,playerId){return playerWorkers(state,playerId).filter(w=>!w.used);}
export function activeWorker(state,playerId){
  const id=state.activeWorkerId;
  if(!id)return null;
  const worker=playerWorkers(state,playerId).find(w=>w.id===id);
  return worker&&!worker.used?worker:null;
}
export function workerCanReachDistrict(state,playerId,targetDistrictId,workerId=null){
  const worker=workerId?playerWorkers(state,playerId).find(w=>w.id===workerId):activeWorker(state,playerId);
  const target=districtById(targetDistrictId);
  if(!worker||worker.used||!target||target.passable===false)return false;
  return worker.districtId===targetDistrictId||districtNeighbors(worker.districtId).includes(targetDistrictId);
}
export function workerReachableDistricts(state,playerId,workerId=null){
  const worker=workerId?playerWorkers(state,playerId).find(w=>w.id===workerId):activeWorker(state,playerId);
  if(!worker||worker.used)return [];
  return [worker.districtId,...districtNeighbors(worker.districtId)].filter(id=>districtById(id)?.passable!==false);
}
export function selectWorker(state,playerId,workerId){
  if(state.phase!=='development'||state.developmentComplete)return {ok:false,reason:'wrong-phase'};
  if(currentDeveloper(state)!==playerId)return {ok:false,reason:'turn'};
  if(state.activationMainActionUsed)return {ok:false,reason:'main-used'};
  const worker=playerWorkers(state,playerId).find(w=>w.id===workerId);
  if(!worker)return {ok:false,reason:'worker'};
  if(worker.used)return {ok:false,reason:'used'};
  state.activeWorkerId=worker.id;
  return {ok:true,worker};
}
function syncWorkersLeft(state,playerId){
  const player=state.players[playerId];
  if(!player)return 0;
  player.workersLeft=availableWorkers(state,playerId).length;
  return player.workersLeft;
}
function workerMovementText(consumed){
  if(!consumed?.worker)return '';
  const from=districtById(consumed.from)?.name||consumed.from;
  const to=districtById(consumed.to)?.name||consumed.to;
  return consumed.moved
    ? ` Представитель #${consumed.worker.number}: ${from} → ${to}.`
    : ` Представитель #${consumed.worker.number} остаётся в ${to}.`;
}

export function districtRoadAccess(state,districtId){
  const d=districtById(districtId);
  return !!(state.districts?.[districtId]?.roadAccess ?? d?.road);
}
export function serviceSources(state,districtId,serviceProjectId){
  if(!districtRoadAccess(state,districtId))return [];
  const eligible=new Set([districtId,...districtNeighbors(districtId)]);
  return (state.constructions||[]).filter(c=>
    c.status==='complete'&&c.projectId===serviceProjectId&&eligible.has(c.districtId)&&districtRoadAccess(state,c.districtId)
  );
}
export function districtAccess(state,districtId){
  const d=districtById(districtId);
  if(!d)return {road:false,rail:false,port:false,fire:false,clinic:false,fireSources:[],clinicSources:[]};
  const fireSources=serviceSources(state,districtId,'firehouse');
  const clinicSources=serviceSources(state,districtId,'clinic');
  return {
    road:districtRoadAccess(state,districtId),
    rail:!!d.rail,
    port:!!d.port,
    fire:fireSources.length>0,
    clinic:clinicSources.length>0,
    fireSources,
    clinicSources
  };
}
export function canPlaceStreetcar(state,districtId){
  if(districtRoadAccess(state,districtId))return true;
  return districtNeighbors(districtId).some(id=>districtRoadAccess(state,id));
}
export function turnOrder(state){return [0,1,2].map((_,i)=>(state.firstPlayer+i)%3);}
export function currentDeclarer(state){return state.declarationIndex<3?turnOrder(state)[state.declarationIndex]:null;}
export function currentDeveloper(state){return state.phase==='development'&&!state.developmentComplete?state.developmentPlayer:null;}
export function activeLoans(state,playerId){return state.players[playerId]?.loans||[];}
export function loanInterest(state,playerId){return activeLoans(state,playerId).length;}
export function completedActionSpaces(state,projectId){
  return (state.constructions||[]).filter(c=>c.projectId===projectId&&c.status==='complete');
}
export function canTakeMainAction(state,playerId){
  const worker=activeWorker(state,playerId);
  return state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===playerId
    &&(state.players[playerId]?.workersLeft??0)>0&&!state.activationMainActionUsed&&!!worker;
}
export function canUseFreeAction(state,playerId){
  return state.phase==='development'&&!state.developmentComplete&&currentDeveloper(state)===playerId;
}

export function consumeMainAction(state,playerId,targetDistrictId=null){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:'main-action-unavailable'};
  const worker=activeWorker(state,playerId);
  if(targetDistrictId&&!workerCanReachDistrict(state,playerId,targetDistrictId,worker.id)){
    return {ok:false,reason:'worker-range',worker,targetDistrictId};
  }
  const from=worker.districtId;
  if(targetDistrictId)worker.districtId=targetDistrictId;
  worker.used=true;
  const workersLeft=syncWorkersLeft(state,playerId);
  state.activationMainActionUsed=true;
  return {ok:true,workersLeft,worker,from,to:worker.districtId,moved:from!==worker.districtId};
}

export function endActivation(state,playerId){
  if(state.phase!=='development'||state.developmentComplete)return {ok:false,reason:'wrong-phase'};
  if(currentDeveloper(state)!==playerId)return {ok:false,reason:'turn'};
  if(!state.activationMainActionUsed)return {ok:false,reason:'main-action-required'};
  const player=state.players[playerId];
  if((state.procurementRemaining||0)>0){
    logEvent(state,`${player.name} завершает Procurement; неиспользовано материалов: ${state.procurementRemaining}.`);
  }
  state.procurementRemaining=0;
  state.procurementSource=null;
  state.activeWorkerId=null;
  state.pendingWorkerAction=null;
  if(state.players.every(p=>(p.workersLeft??0)<=0)){
    state.developmentPlayer=null;
    state.activationMainActionUsed=false;
    state.developmentComplete=true;
    logEvent(state,'Все представители использованы. Development Phase можно завершить.','accent');
    return {ok:true,complete:true,nextPlayer:null};
  }
  for(let step=1;step<=state.players.length;step++){
    const pid=(playerId+step)%state.players.length;
    if((state.players[pid].workersLeft??0)>0){
      state.developmentPlayer=pid;
      state.activationMainActionUsed=false;
      logEvent(state,`${player.name} завершает активацию. Следующий: ${state.players[pid].name}.`);
      return {ok:true,complete:false,nextPlayer:pid};
    }
  }
  return {ok:false,reason:'no-next-player'};
}

export function actionSpaceOccupant(state,constructionId){
  const value=state.actionSpaceOccupancy?.[constructionId];
  return value==null?null:value;
}
export function openingPrice(marketCard){const p=projectById(marketCard.id);return Math.max(1,p.open-(marketCard.discount||0));}
export function emptyMarketCard(card){
  const data=typeof card==='string'?{uid:`legacy-${card}`,id:card}:card;
  return {uid:data.uid,id:data.id,age:0,discount:0,claims:[],bids:{},result:null,sold:false};
}
export function createProjectCardPool({rng=Math.random}={}){
  const cards=[];let serial=1;
  for(let copy=0;copy<PROJECT_COPIES;copy++)for(const project of PROJECTS)cards.push({uid:`PC${serial++}`,id:project.id});
  return shuffle(cards,rng);
}
export function currentDraftPlayer(state){return state.phase==='draft'?state.starterDraftPlayer:null;}
export function toggleStarterDraftCard(state,uid){
  if(state.phase!=='draft'||!state.draftRevealed)return {ok:false,reason:'draft-hidden'};
  const pid=currentDraftPlayer(state),hand=state.starterDraftHands?.[pid]||[];
  if(!hand.some(card=>card.uid===uid))return {ok:false,reason:'not-in-hand'};
  state.draftSelection=state.draftSelection||[];
  if(state.draftSelection.includes(uid)){state.draftSelection=state.draftSelection.filter(x=>x!==uid);return {ok:true,selected:false,count:state.draftSelection.length};}
  if(state.draftSelection.length>=STARTER_KEEP)return {ok:false,reason:'keep-limit'};
  state.draftSelection.push(uid);return {ok:true,selected:true,count:state.draftSelection.length};
}
export function revealStarterDraft(state){if(state.phase!=='draft')return {ok:false,reason:'wrong-phase'};state.draftRevealed=true;return {ok:true,player:state.starterDraftPlayer};}
export function confirmStarterDraft(state){
  if(state.phase!=='draft'||!state.draftRevealed)return {ok:false,reason:'draft-hidden'};
  const pid=currentDraftPlayer(state),player=state.players[pid],hand=state.starterDraftHands?.[pid]||[],selected=state.draftSelection||[];
  if(selected.length!==STARTER_KEEP)return {ok:false,reason:'keep-count',required:STARTER_KEEP};
  const kept=hand.filter(card=>selected.includes(card.uid));
  if(kept.length!==STARTER_KEEP)return {ok:false,reason:'invalid-selection'};
  if(player.portfolio.length+kept.length>HAND_LIMIT)return {ok:false,reason:'hand-limit'};
  const discarded=hand.filter(card=>!selected.includes(card.uid));
  player.portfolio.push(...kept.map(card=>card.id));
  state.starterDiscards=state.starterDiscards||[];state.starterDiscards.push(...discarded);state.starterDraftHands[pid]=[];
  logEvent(state,`${player.name} завершает стартовый драфт: оставляет ${STARTER_KEEP} проекта, сбрасывает ${discarded.length}.`,'good');
  state.draftSelection=[];state.draftRevealed=false;
  if(pid>=state.players.length-1){state.phase='declare';state.starterDraftPlayer=null;state.declarationIndex=0;logEvent(state,'Стартовый драфт завершён. Начинается City Hall Session.','accent');return {ok:true,complete:true,nextPlayer:null};}
  state.starterDraftPlayer=pid+1;return {ok:true,complete:false,nextPlayer:state.starterDraftPlayer};
}

export function createInitialState({rng=Math.random}={}){
  const pool=createProjectCardPool({rng});
  const market=pool.splice(0,5).map(emptyMarketCard);
  const starterDraftHands=[
    pool.splice(0,STARTER_DRAFT_SIZE),
    pool.splice(0,STARTER_DRAFT_SIZE),
    pool.splice(0,STARTER_DRAFT_SIZE)
  ];
  return {
    version:'0.26',
    round:1,
    firstPlayer:0,
    phase:'draft',
    view:'hall',
    declarationIndex:0,
    players:PLAYER_NAMES.map((name,id)=>({id,name,key:PLAYER_KEYS[id],capital:14,influence:2,prestige:0,workers:createWorkers(id),workersLeft:WORKERS_PER_PLAYER,portfolio:[],loans:[],bureauContracts:0})),
    market,
    deck:pool,
    expired:[],
    starterDraftHands,
    starterDiscards:[],
    starterDraftPlayer:0,
    draftSelection:[],
    draftRevealed:false,
    bidQueue:[],
    bidCursor:0,
    selectedMarketUid:market[0]?.uid||null,
    selectedProjectId:market[0]?.id||null,
    selectedDistrictId:'civic',
    pendingConstruction:null,
    constructions:[],
    nextConstructionId:1,
    nextLoanId:1,
    developmentPlayer:null,
    developmentComplete:false,
    activationMainActionUsed:false,
    activeWorkerId:null,
    pendingWorkerAction:null,
    procurementRemaining:0,
    procurementSource:null,
    actionSpaceOccupancy:{},
    bankOwnerRewarded:{},
    bureauOwnerRewarded:{},
    districts:Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites,roadAccess:!!d.road}])),
    log:[{msg:'Началась тестовая партия Phase I Map Test v0.26. На карте 18 строительных районов по 5 слотов. Golden Gate Park закрыт для строительства, но открыт для передвижения; Presidio и Twin Peaks полностью закрыты. Main action выполняется в текущем или соседнем доступном районе.','cls':'accent'}],
    finished:false
  };
}

export function logEvent(state,msg,cls=''){state.log.push({msg,cls});}

export function claimProject(state,slot){
  if(state.phase!=='declare') return {ok:false,reason:'wrong-phase'};
  const pid=currentDeclarer(state); if(pid==null) return {ok:false,reason:'no-declarer'};
  const m=state.market[slot]; if(!m) return {ok:false,reason:'empty-slot'};
  if(state.market.some(x=>x&&x.claims.some(c=>c.player===pid))) return {ok:false,reason:'already-declared'};
  if((state.players[pid].portfolio||[]).length>=HAND_LIMIT)return {ok:false,reason:'hand-limit'};
  const price=openingPrice(m);
  if(state.players[pid].capital<price) return {ok:false,reason:'capital'};
  m.claims.push({player:pid,order:state.declarationIndex});
  logEvent(state,`${state.players[pid].name} заявил проект «${projectById(m.id).name}» (opening $${price}).`);
  state.declarationIndex++;
  state.selectedMarketUid=m.uid;
  state.selectedProjectId=m.id;
  return {ok:true};
}

export function passDeclaration(state){
  if(state.phase!=='declare') return {ok:false};
  const pid=currentDeclarer(state); if(pid==null)return {ok:false};
  logEvent(state,`${state.players[pid].name} пасует на City Hall Session.`);
  state.declarationIndex++;
  return {ok:true};
}

export function beginBidding(state){
  if(state.phase!=='declare'||state.declarationIndex<3)return {ok:false};
  state.bidQueue=[];
  state.market.forEach((m,slot)=>{
    if(m&&m.claims.length>1){
      [...m.claims].sort((a,b)=>a.order-b.order).forEach(c=>state.bidQueue.push({slot,player:c.player}));
    }
  });
  state.bidCursor=0;
  state.phase=state.bidQueue.length?'bids':'ready';
  return {ok:true};
}

export function currentBidTask(state){return state.phase==='bids'&&state.bidCursor<state.bidQueue.length?state.bidQueue[state.bidCursor]:null;}

export function submitBid(state,value){
  const q=currentBidTask(state); if(!q)return {ok:false,reason:'no-task'};
  const m=state.market[q.slot], pl=state.players[q.player], min=openingPrice(m);
  const v=Math.floor(Number(value));
  if(!Number.isFinite(v)||v<min||v>pl.capital)return {ok:false,reason:'range',min,max:pl.capital};
  m.bids[q.player]=v;
  logEvent(state,`${pl.name} сделал закрытую ставку на «${projectById(m.id).name}».`);
  state.bidCursor++;
  if(state.bidCursor>=state.bidQueue.length)state.phase='ready';
  return {ok:true};
}

export function resolveTenders(state){
  if(state.phase!=='ready')return {ok:false};
  state.market.forEach(m=>{
    if(!m||!m.claims.length)return;
    const price=openingPrice(m);
    if(m.claims.length===1){
      const pid=m.claims[0].player;
      award(state,m,pid,price,'единственный претендент');
      return;
    }
    const ranked=m.claims.map(c=>({
      player:c.player,
      bid:m.bids[c.player]??price,
      influence:state.players[c.player].influence,
      order:c.order
    })).sort((a,b)=>b.bid-a.bid||b.influence-a.influence||a.order-b.order);
    const w=ranked[0];
    let reason=`ставка $${w.bid}`;
    if(ranked[1]&&w.bid===ranked[1].bid){
      reason += w.influence!==ranked[1].influence?` · Influence ${w.influence}`:' · более ранняя заявка';
    }
    award(state,m,w.player,w.bid,reason);
  });
  state.phase='development';
  state.developmentPlayer=state.firstPlayer;
  state.developmentComplete=false;
  state.activationMainActionUsed=false;
  state.activeWorkerId=null;
  state.pendingWorkerAction=null;
  state.actionSpaceOccupancy={};
  state.bankOwnerRewarded={};
  state.bureauOwnerRewarded={};
  logEvent(state,`Тендерная сессия завершена. Development Phase начинает ${state.players[state.developmentPlayer].name}.`,'accent');
  return {ok:true};
}

function award(state,m,pid,price,reason){
  const pl=state.players[pid], p=projectById(m.id);
  if(pl.capital<price){m.result='Ошибка: недостаточно капитала';return;}
  if((pl.portfolio||[]).length>=HAND_LIMIT){m.result='Ошибка: рука заполнена';return;}
  pl.capital-=price;
  pl.portfolio.push(m.id);
  m.sold=true;
  m.result={player:pid,price,reason};
  logEvent(state,`${pl.name} получает «${p.name}» за $${price} (${reason}). Рука: ${pl.portfolio.length}/${HAND_LIMIT}.`,'good');
}

export function districtConstructionCount(state,districtId){
  return (state.constructions||[]).filter(c=>c.districtId===districtId).length;
}

export function constructionEligibility(state,playerId,projectId,districtId){
  const reasons=[];
  const player=state.players[playerId];
  const project=projectById(projectId);
  const district=districtById(districtId);
  const ds=state.districts?.[districtId] || (district?{landValue:district.landValue,sites:district.sites,roadAccess:district.road}:null);
  const access=districtAccess(state,districtId);
  if(state.phase!=='development') reasons.push('Строительство доступно только после тендеров.');
  if(!player||!project||!district||!ds) reasons.push('Недоступный игрок, проект или район.');
  if(player&&project&&!player.portfolio.includes(projectId)) reasons.push('Проекта нет в доступном портфеле игрока.');
  if(player){
    const worker=activeWorker(state,playerId);
    if(currentDeveloper(state)!==playerId)reasons.push('Сейчас ход другого игрока.');
    else if(state.activationMainActionUsed)reasons.push('Главное действие этой активации уже использовано.');
    else if((player.workersLeft??0)<=0)reasons.push('Нет свободных представителей.');
    else if(!worker)reasons.push('Выберите одного из 3 представителей для этой активации.');
    else if(district&&!workerCanReachDistrict(state,playerId,districtId,worker.id)){
      const here=districtById(worker.districtId)?.name||worker.districtId;
      reasons.push(`Представитель #${worker.number} находится в ${here}: можно действовать только здесь или в соседнем районе.`);
    }
  }
  const used=ds?districtConstructionCount(state,districtId):0;
  if(district?.buildable===false) reasons.push('В этой зоне строительство запрещено.');
  else if(ds&&used>=ds.sites) reasons.push('В районе нет свободных строительных площадок.');
  if(project&&ds&&project.landMin!=null&&ds.landValue<project.landMin) reasons.push(`Требуется Land Value ${project.landMin}+.`);
  if(project&&ds&&project.landMax!=null&&ds.landValue>project.landMax) reasons.push(`Требуется Land Value ≤${project.landMax}.`);

  if(project?.accessAll){
    for(const need of project.accessAll){
      if(!access[need]){
        if(need==='road')reasons.push('Нет Street Network.');
        else if(need==='fire')reasons.push('Нет Fire Protection: нужна завершённая Fire House в этом или соседнем районе с Street Network.');
        else if(need==='clinic')reasons.push('Нет Clinic access: нужна завершённая Clinic в этом или соседнем районе с Street Network.');
        else reasons.push(`Нет требуемого доступа: ${need}.`);
      }
    }
  }
  if(project?.accessAny?.length&&!project.accessAny.some(need=>access[need])){
    const names=project.accessAny.map(x=>x==='road'?'Street':x==='rail'?'Rail':x==='port'?'Port':x).join(' или ');
    reasons.push(`Требуется ${names} access.`);
  }
  if(project?.streetcarExtension&&!canPlaceStreetcar(state,districtId)){
    reasons.push('Streetcar Extension требует Street Network в этом или соседнем районе.');
  }

  const bureauDiscount=player&&ds&&(player.bureauContracts||0)>0&&ds.landValue>0?Math.min(BUREAU_LAND_DISCOUNT,ds.landValue):0;
  const landCost=ds?Math.max(0,ds.landValue-bureauDiscount):0;
  if(player&&ds&&player.capital<landCost) reasons.push(`Не хватает капитала на землю ($${landCost}).`);
  return {
    ok:reasons.length===0,
    reasons,
    cost:landCost,
    baseCost:ds?.landValue??0,
    bureauDiscount,
    landValue:ds?.landValue??0,
    access,
    usedSites:used,
    totalSites:ds?.sites??0,
    freeSites:Math.max(0,(ds?.sites??0)-used)
  };
}

export function beginConstruction(state,playerId,projectId,districtId){
  const check=constructionEligibility(state,playerId,projectId,districtId);
  if(!check.ok)return {ok:false,...check};
  const player=state.players[playerId];
  const idx=player.portfolio.indexOf(projectId);
  if(idx<0)return {ok:false,reasons:['Проект уже недоступен.']};
  const consumed=consumeMainAction(state,playerId,districtId);
  if(!consumed.ok)return consumed;
  const construction={
    id:`C${state.nextConstructionId||1}`,
    playerId,projectId,districtId,
    startedRound:state.round,
    status:'under-construction',
    materialsDelivered:[],
    rentedSlots:0,
    completedRound:null
  };
  state.nextConstructionId=(state.nextConstructionId||1)+1;
  player.portfolio.splice(idx,1);
  player.capital-=check.cost;
  if(check.bureauDiscount>0)player.bureauContracts=Math.max(0,(player.bureauContracts||0)-1);
  state.constructions=state.constructions||[];
  state.constructions.push(construction);
  state.pendingConstruction=null;
  state.selectedDistrictId=districtId;
  const discountText=check.bureauDiscount>0?` (Construction Contract −$${check.bureauDiscount})`:'';
  logEvent(state,`${player.name} начал строительство «${projectById(projectId).name}» в ${districtById(districtId).name}: земля $${check.cost}${discountText}.${workerMovementText(consumed)}`,'good');
  return {ok:true,construction,cost:check.cost,bureauDiscount:check.bureauDiscount,worker:consumed.worker};
}

export function resourcePrice(type){return RESOURCE_PRICES[type]??null;}

export function projectMaterialCounts(projectId){
  const project=projectById(projectId);
  if(!project)return {};
  return project.materials.reduce((acc,x)=>{acc[x]=(acc[x]||0)+1;return acc;},{});
}

export function deliveredMaterialCounts(construction){
  return (construction?.materialsDelivered||[]).reduce((acc,x)=>{acc[x]=(acc[x]||0)+1;return acc;},{});
}

export function completedWarehouseCount(state,playerId,districtId){
  return (state.constructions||[]).filter(c=>
    c.playerId===playerId&&c.districtId===districtId&&c.projectId==='warehouse'&&c.status==='complete'
  ).length;
}

export function warehouseCapacityBonus(state,playerId,districtId){
  return completedWarehouseCount(state,playerId,districtId)*3;
}

export function constructionCapacity(state,construction){
  if(!construction)return 0;
  return 3+warehouseCapacityBonus(state,construction.playerId,construction.districtId)+(construction.rentedSlots||0);
}

export function constructionProgress(state,constructionId){
  const construction=(state.constructions||[]).find(c=>c.id===constructionId);
  if(!construction)return null;
  const project=projectById(construction.projectId);
  const required=project?.materials?.length||0;
  const delivered=(construction.materialsDelivered||[]).length;
  return {
    construction,project,required,delivered,
    capacity:constructionCapacity(state,construction),
    complete:construction.status==='complete',
    remaining:Math.max(0,required-delivered)
  };
}

export function canRentOverflow(state,constructionId){
  const progress=constructionProgress(state,constructionId);
  if(!progress)return {ok:false,reason:'not-found'};
  const {construction,project}=progress;
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(!canUseFreeAction(state,construction.playerId))return {ok:false,reason:'not-active-player'};
  if(construction.status!=='under-construction')return {ok:false,reason:'complete'};
  const player=state.players[construction.playerId];
  const permanent=3+warehouseCapacityBonus(state,construction.playerId,construction.districtId);
  const maxRental=Math.max(0,project.materials.length-permanent);
  if((construction.rentedSlots||0)>=maxRental)return {ok:false,reason:'not-needed'};
  if(player.capital<1)return {ok:false,reason:'capital'};
  return {ok:true,cost:1,maxRental,permanent};
}

export function rentOverflowSlot(state,constructionId){
  const check=canRentOverflow(state,constructionId);
  if(!check.ok)return check;
  const construction=state.constructions.find(c=>c.id===constructionId);
  const player=state.players[construction.playerId];
  player.capital-=1;
  construction.rentedSlots=(construction.rentedSlots||0)+1;
  logEvent(state,`${player.name} арендует 1 временный слот хранения для «${projectById(construction.projectId).name}» за $1.`);
  return {ok:true,cost:1,capacity:constructionCapacity(state,construction)};
}

export function canDeliverMaterial(state,constructionId,type){
  const progress=constructionProgress(state,constructionId);
  if(!progress)return {ok:false,reason:'not-found'};
  const {construction,project,capacity,delivered}=progress;
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(!canUseFreeAction(state,construction.playerId))return {ok:false,reason:'not-active-player'};
  if(construction.status!=='under-construction')return {ok:false,reason:'complete'};
  const price=resourcePrice(type);
  if(price==null)return {ok:false,reason:'bad-resource'};
  const required=projectMaterialCounts(project.id);
  const have=deliveredMaterialCounts(construction);
  if((have[type]||0)>=(required[type]||0))return {ok:false,reason:'not-needed'};
  if(delivered>=capacity)return {ok:false,reason:'capacity'};
  const player=state.players[construction.playerId];
  const procurement=(state.procurementRemaining||0)>0&&state.procurementSource!=null;
  const cost=procurement?0:price;
  if(player.capital<cost)return {ok:false,reason:'capital',cost};
  return {ok:true,cost,standardCost:price,procurement};
}

export function completeConstruction(state,construction){
  if(!construction||construction.status!=='under-construction')return {ok:false};
  const project=projectById(construction.projectId);
  if((construction.materialsDelivered||[]).length<project.materials.length)return {ok:false};
  construction.status='complete';
  construction.completedRound=state.round;
  const player=state.players[construction.playerId];
  const vp=project.prestige||0;
  if(vp){
    player.prestige=(player.prestige||0)+vp;
    logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name} и получает +${vp} Prestige VP.`,'good');
  }else{
    logEvent(state,`${player.name} завершил «${project.name}» в ${districtById(construction.districtId).name}.`,'good');
  }

  let roadOpened=false;
  if(construction.projectId==='streetcar'&&state.districts?.[construction.districtId]&&!districtRoadAccess(state,construction.districtId)){
    state.districts[construction.districtId].roadAccess=true;
    roadOpened=true;
    logEvent(state,`${project.name} открывает Street Network в районе ${districtById(construction.districtId).name}.`,'accent');
  }

  const landChange=LAND_VALUE_COMPLETION_CHANGE[construction.projectId]||0;
  if(landChange&&state.districts?.[construction.districtId]){
    const before=state.districts[construction.districtId].landValue;
    const after=Math.max(0,Math.min(6,before+landChange));
    state.districts[construction.districtId].landValue=after;
    if(after!==before){
      const verb=landChange>0?'повышает':'снижает';
      logEvent(state,`${project.name} ${verb} Land Value района ${districtById(construction.districtId).name}: $${before} → $${after}.`,'accent');
    }
  }
  return {ok:true,prestige:vp,landChange,roadOpened};
}

export function deliverMaterial(state,constructionId,type){
  const check=canDeliverMaterial(state,constructionId,type);
  if(!check.ok)return check;
  const construction=state.constructions.find(c=>c.id===constructionId);
  const player=state.players[construction.playerId];
  player.capital-=check.cost;
  construction.materialsDelivered=construction.materialsDelivered||[];
  construction.materialsDelivered.push(type);
  if(check.procurement){
    state.procurementRemaining=Math.max(0,(state.procurementRemaining||0)-1);
    logEvent(state,`${player.name} доставил ${type} на «${projectById(construction.projectId).name}» через Procurement ($0; осталось ${state.procurementRemaining}).`);
  }else{
    logEvent(state,`${player.name} доставил ${type} на «${projectById(construction.projectId).name}» за $${check.cost}.`);
  }
  const project=projectById(construction.projectId);
  let completed=false;
  if(construction.materialsDelivered.length===project.materials.length){
    completed=completeConstruction(state,construction).ok;
  }
  return {ok:true,cost:check.cost,standardCost:check.standardCost,procurement:check.procurement,completed,progress:constructionProgress(state,constructionId)};
}

export function buildingIncome(state,playerId){
  return (state.constructions||[]).filter(c=>c.playerId===playerId&&c.status==='complete')
    .reduce((sum,c)=>sum+(projectById(c.projectId)?.income||0),0);
}

export function grossRoundIncome(state,playerId){
  return BASE_ROUND_INCOME+buildingIncome(state,playerId);
}

export function roundIncome(state,playerId){
  return Math.max(0,grossRoundIncome(state,playerId)-loanInterest(state,playerId));
}

export function raiseCapital(state,playerId,targetDistrictId=null){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const worker=activeWorker(state,playerId);
  const target=targetDistrictId||worker?.districtId;
  if(!target||!workerCanReachDistrict(state,playerId,target,worker?.id))return {ok:false,reason:'worker-range',districtId:target};
  const player=state.players[playerId];
  const consumed=consumeMainAction(state,playerId,target);
  if(!consumed.ok)return consumed;
  player.capital+=RAISE_CAPITAL_AMOUNT;
  logEvent(state,`${player.name} использует Raise Capital: +${RAISE_CAPITAL_AMOUNT}.${workerMovementText(consumed)}`,'good');
  return {ok:true,amount:RAISE_CAPITAL_AMOUNT,worker:consumed.worker,from:consumed.from,to:consumed.to};
}

export function takeBankLoan(state,playerId,bankConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const bank=(state.constructions||[]).find(c=>c.id===bankConstructionId&&c.projectId==='bank'&&c.status==='complete');
  if(!bank)return {ok:false,reason:'no-bank'};
  if(!workerCanReachDistrict(state,playerId,bank.districtId))return {ok:false,reason:'worker-range',districtId:bank.districtId};
  if(actionSpaceOccupant(state,bankConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  player.loans=player.loans||[];
  if(player.loans.length>=MAX_ACTIVE_LOANS)return {ok:false,reason:'max-loans'};
  const received=player.loans.length===0?6:5;
  const consumed=consumeMainAction(state,playerId,bank.districtId);
  if(!consumed.ok)return consumed;
  const loan={id:`L${state.nextLoanId||1}`,principal:LOAN_PRINCIPAL,received,takenRound:state.round,interestPaid:false};
  state.nextLoanId=(state.nextLoanId||1)+1;
  player.loans.push(loan);
  player.capital+=received;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[bankConstructionId]=playerId;
  const owner=state.players[bank.playerId];
  if(bank.playerId!==playerId&&!state.bankOwnerRewarded?.[bank.playerId]){
    state.bankOwnerRewarded=state.bankOwnerRewarded||{};
    state.bankOwnerRewarded[bank.playerId]=true;
    owner.influence+=1;
    logEvent(state,`${owner.name} получает +1 Influence: другой игрок использовал его Bank.`,'good');
  }
  logEvent(state,`${player.name} берёт Bank Loan: +$${received}, долг $${LOAN_PRINCIPAL}, будущий Income −$1.${workerMovementText(consumed)}`,'accent');
  return {ok:true,received,loan,worker:consumed.worker};
}

export function repayLoan(state,playerId,loanId=null){
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(!canUseFreeAction(state,playerId))return {ok:false,reason:'not-active-player'};
  const player=state.players[playerId];
  if(!player)return {ok:false,reason:'player'};
  player.loans=player.loans||[];
  const loan=loanId?player.loans.find(x=>x.id===loanId):player.loans.find(x=>x.interestPaid);
  if(!loan)return {ok:false,reason:'not-seasoned'};
  if(!loan.interestPaid)return {ok:false,reason:'not-seasoned'};
  if(player.capital<loan.principal)return {ok:false,reason:'capital'};
  player.capital-=loan.principal;
  player.loans=player.loans.filter(x=>x.id!==loan.id);
  logEvent(state,`${player.name} погашает кредит $${loan.principal}.`,'good');
  return {ok:true,paid:loan.principal};
}

export function takeBureauContract(state,playerId,bureauConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const bureau=(state.constructions||[]).find(c=>c.id===bureauConstructionId&&c.projectId==='bureau'&&c.status==='complete');
  if(!bureau)return {ok:false,reason:'no-bureau'};
  if(!workerCanReachDistrict(state,playerId,bureau.districtId))return {ok:false,reason:'worker-range',districtId:bureau.districtId};
  if(actionSpaceOccupant(state,bureauConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if((player.bureauContracts||0)>=1)return {ok:false,reason:'has-contract'};
  const consumed=consumeMainAction(state,playerId,bureau.districtId);
  if(!consumed.ok)return consumed;
  player.bureauContracts=1;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[bureauConstructionId]=playerId;
  const owner=state.players[bureau.playerId];
  if(bureau.playerId!==playerId&&!state.bureauOwnerRewarded?.[bureau.playerId]){
    state.bureauOwnerRewarded=state.bureauOwnerRewarded||{};
    state.bureauOwnerRewarded[bureau.playerId]=true;
    owner.capital+=1;
    logEvent(state,`${owner.name} получает $1: другой игрок использовал его Construction Bureau.`,'good');
  }
  logEvent(state,`${player.name} получает Construction Contract: следующая платная земля дешевле до $2.${workerMovementText(consumed)}`,'accent');
  return {ok:true,discount:BUREAU_LAND_DISCOUNT,worker:consumed.worker};
}

export function useShoppingProcurement(state,playerId,shopsConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const shops=(state.constructions||[]).find(c=>c.id===shopsConstructionId&&c.projectId==='shops'&&c.status==='complete');
  if(!shops)return {ok:false,reason:'no-shops'};
  if(!workerCanReachDistrict(state,playerId,shops.districtId))return {ok:false,reason:'worker-range',districtId:shops.districtId};
  if(actionSpaceOccupant(state,shopsConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if(player.capital<1)return {ok:false,reason:'capital'};
  const hasConstruction=(state.constructions||[]).some(c=>c.playerId===playerId&&c.status==='under-construction');
  if(!hasConstruction)return {ok:false,reason:'no-construction'};
  const consumed=consumeMainAction(state,playerId,shops.districtId);
  if(!consumed.ok)return consumed;
  player.capital-=1;
  const owner=state.players[shops.playerId];
  if(shops.playerId!==playerId)owner.capital+=1;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[shopsConstructionId]=playerId;
  state.procurementRemaining=2;
  state.procurementSource=shopsConstructionId;
  if(shops.playerId!==playerId){
    logEvent(state,`${player.name} платит $1 Торговому ряду игрока ${owner.name} и получает Procurement: до 2 материалов без дополнительной оплаты.${workerMovementText(consumed)}`,'accent');
  }else{
    logEvent(state,`${player.name} тратит $1 на Procurement через собственный Торговый ряд: до 2 материалов без дополнительной оплаты.${workerMovementText(consumed)}`,'accent');
  }
  return {ok:true,materials:2,cost:1,worker:consumed.worker};
}

export function useSocialClub(state,playerId,clubConstructionId){
  if(!canTakeMainAction(state,playerId))return {ok:false,reason:activeWorker(state,playerId)?'turn':'worker'};
  const club=(state.constructions||[]).find(c=>c.id===clubConstructionId&&c.projectId==='club'&&c.status==='complete');
  if(!club)return {ok:false,reason:'no-club'};
  if(!workerCanReachDistrict(state,playerId,club.districtId))return {ok:false,reason:'worker-range',districtId:club.districtId};
  if(actionSpaceOccupant(state,clubConstructionId)!=null)return {ok:false,reason:'occupied'};
  const player=state.players[playerId];
  if(player.capital<1)return {ok:false,reason:'capital'};
  const consumed=consumeMainAction(state,playerId,club.districtId);
  if(!consumed.ok)return consumed;
  player.capital-=1;
  const owner=state.players[club.playerId];
  if(club.playerId!==playerId)owner.capital+=1;
  player.influence+=1;
  state.actionSpaceOccupancy=state.actionSpaceOccupancy||{};
  state.actionSpaceOccupancy[clubConstructionId]=playerId;
  if(club.playerId!==playerId){
    logEvent(state,`${player.name} ужинает и заводит связи в клубе игрока ${owner.name}: −$1, +1 Influence; $1 получает владелец заведения.${workerMovementText(consumed)}`,'accent');
  }else{
    logEvent(state,`${player.name} тратит $1 на ужин и приём состоятельных горожан в своём клубе: +1 Influence.${workerMovementText(consumed)}`,'accent');
  }
  return {ok:true,cost:1,influence:1,worker:consumed.worker};
}

export function setLandValue(state,districtId,value){
  const district=districtById(districtId);
  if(!district||!state.districts?.[districtId])return {ok:false};
  const v=Math.max(0,Math.min(6,Math.floor(Number(value))));
  if(!Number.isFinite(v))return {ok:false};
  state.districts[districtId].landValue=v;
  return {ok:true,value:v};
}

export function cleanupMarket(state){
  if(state.phase!=='development')return {ok:false,reason:'wrong-phase'};
  if(!state.developmentComplete)return {ok:false,reason:'development-not-complete'};
  const remaining=state.market.filter(m=>m&&!m.sold);
  const old=remaining.filter(m=>m.age===1);
  old.forEach(m=>{state.expired.push({uid:m.uid,id:m.id});logEvent(state,`«${projectById(m.id).name}» сгорел: последний шанс истёк.`,'bad');});
  const fresh=remaining.filter(m=>m.age===0);
  const survivors=fresh.slice(0,2);
  fresh.slice(2).forEach(m=>{state.expired.push({uid:m.uid,id:m.id});logEvent(state,`«${projectById(m.id).name}» сброшен с правого края рынка.`,'bad');});
  survivors.forEach(m=>{m.age=1;m.discount=1;m.claims=[];m.bids={};m.result=null;m.sold=false;});

  if(state.round>=MAX_ROUNDS){
    state.finished=true;state.phase='finished';
    state.market=[...survivors];
    state.procurementRemaining=0;state.procurementSource=null;
    const score=state.players.map(p=>`${p.name}: ${p.prestige||0} VP`).join(' · ');
    logEvent(state,`Prestige после Phase I — ${score}.`,'accent');
    logEvent(state,'Тест Phase I завершён после 3 раундов.','accent');
    return {ok:true,finished:true};
  }

  state.players.forEach(p=>{
    const gross=grossRoundIncome(state,p.id);
    const interest=loanInterest(state,p.id);
    const amount=Math.max(0,gross-interest);
    p.capital+=amount;
    (p.loans||[]).forEach(loan=>loan.interestPaid=true);
    const interestText=interest?` − $${interest} проценты`:'';
    logEvent(state,`${p.name} получает доход $${amount} ($${BASE_ROUND_INCOME} базовый + $${buildingIncome(state,p.id)} здания${interestText}).`,'good');
  });

  const needed=5-survivors.length;
  const incoming=[];
  while(incoming.length<needed&&state.deck.length)incoming.push(emptyMarketCard(state.deck.shift()));
  const blanks=Array(Math.max(0,5-incoming.length-survivors.length)).fill(null);
  state.market=[...incoming,...blanks,...survivors];
  state.round++;
  state.firstPlayer=(state.firstPlayer+1)%3;
  state.players.forEach(p=>{p.workers=p.workers?.length?p.workers:createWorkers(p.id);p.workers.forEach(w=>w.used=false);p.workersLeft=p.workers.length;});
  state.developmentPlayer=null;state.developmentComplete=false;state.activationMainActionUsed=false;state.activeWorkerId=null;state.pendingWorkerAction=null;
  state.procurementRemaining=0;state.procurementSource=null;
  state.actionSpaceOccupancy={};
  state.bankOwnerRewarded={};state.bureauOwnerRewarded={};
  state.phase='declare';state.view='hall';state.declarationIndex=0;state.bidQueue=[];state.bidCursor=0;
  state.market.forEach(m=>{if(m){m.claims=[];m.bids={};m.result=null;m.sold=false;}});
  const first=state.market.find(Boolean);
  state.selectedMarketUid=first?.uid||null;
  state.selectedProjectId=first?.id||null;
  logEvent(state,`Раунд ${state.round}. Первый игрок: ${state.players[state.firstPlayer].name}. Старые проекты сдвинуты вправо и стоят на $1 дешевле.`,'accent');
  return {ok:true,finished:false};
}

export function tenderSummary(state){
  return state.market.filter(Boolean).map(m=>({
    uid:m.uid,
    id:m.id,
    price:openingPrice(m),
    age:m.age,
    claims:m.claims.map(c=>c.player),
    sold:m.sold,
    result:m.result
  }));
}
