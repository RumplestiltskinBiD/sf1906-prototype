import {
PROJECTS,STANDARD_PROJECTS,STANDARD_PROJECT_FEE,isStandardProject,isWarehouseConstruction,warehouseStorageCapacity,PROJECT_COPIES,DISTRICTS,CITY_GOALS,MAX_ROUNDS,RESOURCE_PRICES,BASE_ROUND_INCOME,CONSTRUCTION_UPKEEP_COST,ADVERTISING_CAMPAIGN_COST,ADVERTISING_CAMPAIGN_INCOME,LOAN_PRINCIPAL,MAX_ACTIVE_LOANS,BUREAU_LAND_DISCOUNT,HAND_LIMIT,STARTER_KEEP,WORKERS_PER_PLAYER,
LOGISTICS_NODES,NEUTRAL_MATERIAL_SUPPLIERS,LOGISTICS_RESOURCE_WEIGHTS,CONSTRUCTION_STAGING_CAPACITY,WAREHOUSE_STORAGE_CAPACITY,FREIGHT_YARD,DELIVERY_HAULERS,DELIVERY_EDGE_COST,generateLogisticsSupply,f03CurrentPortIncident,h04DonationOptions,donateH04,e01ContractPreview,currentE01PendingContract,chooseE01Contract,e02TradeWeekPreview,e02TradeOptions,organizeE02TradeEvent,e03AidPreview,e03WarehouseAidOptions,claimE03WarehouseAid,E03_AID_DISTRICTS,E03_AID_MATERIALS,
projectById,projectTypes,cityGoalById,cityGoalEvaluation,cityGoalTarget,createCityGoalPool,districtById,districtAccess,districtNeighbors,districtHasMarketStreet,districtSoilClass,projectRisk,riskLevel,districtRisk,districtRiskPreview,turnOrder,normalizeInfluenceTrack,moveInfluence,normalizeSuspicion,legalCaseOptions,settleLegalCase,changeSuspicion,arrestSanctionPreview,paidReplacementOptions,hireReplacementWorker,workerRosterPreview,annualCrimeOptions,currentAnnualCrimeAssessment,resolveAnnualCrimeAssessment,currentDeclarer,currentDeveloper,openingPrice,
createWorkers,playerWorkers,activeWorker,jailWorker,ensureDevelopmentSlots,developmentSlotsRemaining,workerCanReachDistrict,workerReachableDistricts,selectWorker,
createInitialState,claimProject,claimCityGoal,passDeclaration,beginBidding,currentBidTask,submitBid,
resolveTenders,cleanupMarket,closeConstructionForUpkeep,ensureNewspaper,activeNewspaper,newsPreview,takeNewspaperEmergency,c03CurrentOffer,c03OfferPlayer,c03OfferOptions,acceptC03Offer,declineC03Offer,f01NoticeOptions,fileF01Notice,f02OperationOptions,completeF02Operation,h02Preview,h02ExpeditionOptions,completeH02Expedition,paidRoadEdgeCost,c01Preview,c01RaidOptions,completeC01Raid,c02Preview,c02ReturnOptions,returnC02Lot,h01Preview,h01ActiveIncident,h01ExpeditionOptions,completeH01Expedition,f04NoticeOptions,chooseF04Notice,resolveF04Notice,districtConstructionCount,unfinishedConstructions,constructionUpkeepDue,constructionEligibility,beginConstruction,setLandValue,
constructionProgress,completedWarehouses,warehouseInventory,bakeryInventory,bakeryFuelSources,activateBakery,completedIndustrialProducers,industrialInventory,INDUSTRIAL_PRODUCTION,industrialProductionCapacity,canneryIncomeBonus,freightYardInventory,canCompleteConstruction,completeConstructionFromStorage,
availableDeliveryHaulers,deliveryNeighbors,deliverySourceInfo,deliveryMaterialCost,deliveryPlanCost,deliveryAllCargo,validateDeliveryPlan,executeDelivery,completedCustomsWarehouses,contrabandInventory,CONTRABAND_CARGO,completedBreweries,beerInventory,BEER_CARGO,BREAD_CARGO,BREAD_FACTORY_ID,PINK_GOODS,completedBreadFactories,breadInventory,currentBreadProductionChoice,chooseBreadProduction,goodsBuyerCapacity,goodsBuyerUsed,goodsBuyerRemaining,currentDeliveryKey,
roundIncome,grossRoundIncome,buildingIncome,hallOfJusticeOptions,useHallOfJustice,
activeLoans,loanInterest,completedActionSpaces,canTakeMainAction,canUseFreeAction,endActivation,actionSpaceOccupant,moveWorker,useAdvertisingAgency,takeBankLoan,repayLoan,takeBureauContract,useShoppingProcurement,useSocialClub,useCommissionHouse,firehouseHasWorkshop,firehouseInspectionDistricts,firehouseUpgradeCandidates,firehouseInspectionTargets,useFirehouseAction,constructionFireRisk,upgradeWagonBoarding,currentSailorRecruitment,resolveSailorRecruitment,availableWorkforceTargets,currentWorkforceLink,resolveWorkforceLink,workforceIncomeBonus,currentPressCampaign,resolvePressCampaign,currentDraftPlayer,toggleStarterDraftCard,revealStarterDraft,confirmStarterDraft
} from './game-core.js?v=0582-movement-only';
import {NEWS_CARDS,newsCard} from './newspaper-cards.js?v=0582-movement-only';
const STORAGE_KEY='sf1906_phase1_ui_v030a';
const LEGACY_STORAGE_KEYS=['sf1906_phase1_ui_v028','sf1906_phase1_ui_v027','sf1906_phase1_ui_v026','sf1906_phase1_ui_v025','sf1906_phase1_ui_v024','sf1906_phase1_ui_v023','sf1906_phase1_ui_v022','sf1906_phase1_ui_v021','sf1906_phase1_ui_v020','sf1906_phase1_ui_v0192','sf1906_phase1_ui_v0191','sf1906_phase1_ui_v019','sf1906_phase1_ui_v018','sf1906_phase1_ui_v017','sf1906_phase1_ui_v0166','sf1906_phase1_ui_v0165'];
let state=loadState();
let inspectedOffice=0;
let pendingBidReveal=false;
let mobileContextOpen=false;
let mobileMapDetail=false;
let deliveryDraft=null;
let fireActionDraft=null;
let justiceDraft=null;
let overviewPlayerId=null;
let focusedConstructionId=null;
let riskViewActive=false;
let newsSheetOpen=false;
let newsArchiveIndex=null;
let newsMapVisible=false;
let newsEmergencyMode=false;
let upkeepSelectedConstructionId=null;
let undoHistory=[];
let undoApplying=false;
let lastSavedSnapshot=JSON.stringify(state);
let lastSavedFingerprint=gameplayFingerprint(state);
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

/** Remove obsolete unbuilt streetcar cards without destroying purchased buildings.
 * Replacements come from the already shuffled deck: no additional cards minted.
 * Completed/in-progress legacy sites remain in saves via RETIRED_PROJECTS.
 */
function retireStreetcarCardsInSave(parsed){
  const obsolete=id=>id==='streetcar';
  parsed.deck=(parsed.deck||[]).filter(c=>!obsolete(c?.id));
  const nextCard=()=>parsed.deck.length?parsed.deck.shift():null;
  const newMarketSlots=new Set();
  parsed.market=(parsed.market||[]).map((m,i)=>{
    if(!m||!obsolete(m.id))return m;
    newMarketSlots.add(i);
    const next=nextCard();
    return next?{...next,age:0,discount:0,claims:[],bids:{},result:null,sold:false}:null;
  });
  parsed.starterDraftHands=(parsed.starterDraftHands||[]).map(hand=>{
    const out=(hand||[]).filter(c=>!obsolete(c?.id));
    while(out.length<(hand||[]).length&&parsed.deck.length)out.push(nextCard());
    return out;
  });
  const allDraftIds=new Set(parsed.starterDraftHands.flatMap(h=>h.map(c=>c.uid)));
  parsed.draftSelection=(parsed.draftSelection||[]).filter(uid=>allDraftIds.has(uid));
  parsed.players.forEach(p=>{
    p.portfolio=(p.portfolio||[]).flatMap(id=>{
      if(!obsolete(id))return [id];
      const substitute=nextCard();
      return substitute?[substitute.id]:[];
    });
  });
  if(newMarketSlots.size){
    const oldQueue=parsed.bidQueue||[],cursor=parsed.bidCursor||0;
    parsed.bidCursor=oldQueue.slice(0,cursor).filter(q=>!newMarketSlots.has(q.slot)).length;
    parsed.bidQueue=oldQueue.filter(q=>!newMarketSlots.has(q.slot));
    if(parsed.phase==='bids'&&parsed.bidCursor>=parsed.bidQueue.length)parsed.phase='ready';
    if(!parsed.market.some(m=>m?.uid===parsed.selectedMarketUid)){
      const first=parsed.market.find(Boolean);
      parsed.selectedMarketUid=first?.uid||null;
      parsed.selectedProjectId=first?.id||null;
    }
  }
  return newMarketSlots.size;
}
function loadState(){
try{
let raw=localStorage.getItem(STORAGE_KEY);
if(!raw){
for(const key of LEGACY_STORAGE_KEYS){raw=localStorage.getItem(key);if(raw)break;}
}
if(raw){
const parsed=JSON.parse(raw);
if(['0.16.5','0.16.6','0.17','0.18','0.19','0.19.1','0.19.2','0.20','0.21','0.22','0.23','0.24','0.25','0.26','0.27','0.28','0.30a','0.43a','0.43b','0.44'].includes(parsed?.version))return migrateState(parsed);
}
}catch(e){}
return createInitialState();
}
function migrateState(parsed){
const originalVersion=parsed.version;
parsed.version='0.44';
 // Old Raise Capital selection must not reappear after reloading a previous save.
 if(parsed.pendingWorkerAction?.type==='raiseCapital')parsed.pendingWorkerAction=null;
parsed.crimeAssessedRound=Number.isInteger(parsed.crimeAssessedRound)&&parsed.crimeAssessedRound>=0&&parsed.crimeAssessedRound<=parsed.round?parsed.crimeAssessedRound:0;
parsed.finalPrisonPenaltyApplied=!!parsed.finalPrisonPenaltyApplied;
parsed.crimeAssessment=parsed.phase==='crime-assessment'&&parsed.crimeAssessment?.round===parsed.round&&Array.isArray(parsed.crimeAssessment.order)&&Number.isInteger(parsed.crimeAssessment.cursor)?parsed.crimeAssessment:null;
if(parsed.phase==='crime-assessment'&&!parsed.crimeAssessment){parsed.phase='development';parsed.crimeAssessedRound=0;}
parsed.players=(parsed.players||[]).map(p=>{
let workers=Array.isArray(p.workers)&&p.workers.length?p.workers.map((w,i)=>({
id:w.id||`P${p.id+1}W${i+1}`,
number:w.number||i+1,
districtId:w.districtId||'civic',
used:!!w.used,
jailed:!!w.jailed,
arrestedRound:w.jailed?(Number.isInteger(w.arrestedRound)?w.arrestedRound:parsed.round):null,
replacementKind:['paid','free'].includes(w.replacementKind)&&Number.isInteger(w.replacementRound)&&w.replacementRound>=1&&w.replacementRound<=parsed.round?w.replacementKind:null,
replacementRound:['paid','free'].includes(w.replacementKind)&&Number.isInteger(w.replacementRound)&&w.replacementRound>=1&&w.replacementRound<=parsed.round?w.replacementRound:null
})):createWorkers(p.id);
if(originalVersion!=='0.24'&&(!Array.isArray(p.workers)||!p.workers.length)){
const legacyLeft=Math.max(0,Math.min(WORKERS_PER_PLAYER,p.workersLeft??WORKERS_PER_PLAYER));
const usedCount=WORKERS_PER_PLAYER-legacyLeft;
workers=workers.map((w,i)=>({...w,used:i<usedCount}));
}
return {
...p,
suspicion:normalizeSuspicion(p.suspicion),
caseSettledRound:Number.isInteger(p.caseSettledRound)&&p.caseSettledRound>=1&&p.caseSettledRound<=parsed.round?p.caseSettledRound:null,
workers,
workersLeft:workers.filter(w=>!w.used&&!w.jailed).length,
portfolio:p.portfolio||[],
loans:p.loans||[],
bureauContracts:p.bureauContracts||0,
fireIncomePenalty:Math.max(0,Number(p.fireIncomePenalty)||0),
breadIncomePenalty:Math.max(0,Number.isInteger(p.breadIncomePenalty)?p.breadIncomePenalty:0),
advertisingIncomeBonus:Math.max(0,Number.isInteger(p.advertisingIncomeBonus)?p.advertisingIncomeBonus:0),
goals:Array.isArray(p.goals)?p.goals:[],
goalTakenRound:p.goalTakenRound??null,
prestige:p.prestige??(parsed.constructions||[]).filter(x=>x.playerId===p.id&&x.status==='complete').reduce((sum,x)=>sum+(projectById(x.projectId)?.prestige||0),0)
};
});
parsed.constructions=(parsed.constructions||[]).map(x=>({...x,
materialsDelivered:x.status==='under-construction'?(x.materialsDelivered||[]).slice(0,CONSTRUCTION_STAGING_CAPACITY):(x.materialsDelivered||[]),
warehouseInventory:Array.isArray(x.warehouseInventory)?x.warehouseInventory:[],
 bakeryInventory:x.projectId==='bakery'&&x.status==='complete'&&Array.isArray(x.bakeryInventory)?x.bakeryInventory.filter(t=>t==='Lumber').slice(0,1):[],
 bakeryUsedRound:Number.isInteger(x.bakeryUsedRound)?x.bakeryUsedRound:null,
 orphanageSurvivalVpAwarded:!!x.orphanageSurvivalVpAwarded,
 propertyTitleRegistered:!!x.propertyTitleRegistered,
 propertyTitleVpAwarded:!!x.propertyTitleVpAwarded,
 justiceReorganized:!!x.justiceReorganized,
completedRound:x.completedRound??null,
fireSafetyModernized:!!x.fireSafetyModernized,
 wagonLevel:x.projectId==='wagonboarding'?Math.max(1,Math.min(3,Number(x.wagonLevel)||1)):x.wagonLevel,
contrabandStock:x.projectId==='customs_warehouse'&&x.status==='complete'?Math.max(0,Math.min(2,Number.isInteger(x.contrabandStock)?x.contrabandStock:2)):0,
beerStock:x.projectId==='brewery'&&x.status==='complete'?Math.max(0,Math.min(2,Number.isInteger(x.beerStock)?x.beerStock:2)):0,
breadStock:x.projectId===BREAD_FACTORY_ID&&x.status==='complete'?Math.max(0,Math.min(4,Number.isInteger(x.breadStock)?x.breadStock:0)):0,
breadProductionRound:x.projectId===BREAD_FACTORY_ID&&x.status==='complete'&&Number.isInteger(x.breadProductionRound)?x.breadProductionRound:null,
breadProductionQuantity:x.projectId===BREAD_FACTORY_ID&&[2,4].includes(x.breadProductionQuantity)?x.breadProductionQuantity:null,
goodsIntakeRound:Number.isInteger(x.goodsIntakeRound)?x.goodsIntakeRound:0,
goodsIntakeCount:Math.max(0,Math.min(goodsBuyerCapacity(x.projectId),Number.isInteger(x.goodsIntakeCount)?x.goodsIntakeCount:0)),
fixedIncome:x.projectId==='rare_goods_shop'&&x.status==='complete'?(Number.isInteger(x.fixedIncome)?x.fixedIncome:1):x.fixedIncome,
lostMaterials:Array.isArray(x.lostMaterials)?x.lostMaterials:[]
}));
parsed.market=(parsed.market||[]).map((m,i)=>m?({...m,uid:m.uid||`MIG-M-${i}-${m.id}`}):null);
parsed.deck=(parsed.deck||[]).map((card,i)=>typeof card==='string'?{uid:`MIG-D-${i}-${card}`,id:card}:card);
if(!parsed.marketExtendedForSixYears){
  // Saved three-year games originally had two copies of each project.
  // Add one to the available deck once, retaining all acquired projects.
  for(const p of PROJECTS.filter(p=>!['brickworks','woodworks','foundry','cannery','cottages','brickapartments','school'].includes(p.id))){
    parsed.deck.push({uid:'V042-'+p.id,id:p.id});
  }
  parsed.marketExtendedForSixYears=true;
}
// Add the industrial expansion to old saves exactly once, without changing
// existing market, hands, bids or building ownership. Distribute remaining
// project cards through the unseen deck so they can appear before 1905.
if(!parsed.industrialExpansionV1){
  const ids=['brickworks','woodworks','foundry','cannery'];
  const held=[
    ...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.market||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.constructions||[]).map(c=>c.projectId)
  ];
  const additions=[];
  for(const id of ids){
    const already=held.filter(x=>x===id).length;
    for(let i=already;i<3;i++)additions.push({uid:'IND-V1-'+id+'-'+(i+1),id});
  }
  const deck=parsed.deck||[];
  const spacing=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  for(let i=0;i<additions.length;i++)deck.splice(Math.min((i+1)*spacing,deck.length),0,additions[i]);
  parsed.deck=deck;
  parsed.industrialExpansionV1=true;
}
// The three new projects must also appear in existing, already-started saves.
// Add exactly three copies per type to the future deck without moving
// current market cards, starter draft, player portfolios or built sites.
if(!parsed.housingSchoolExpansionV1){
  const ids=['cottages','brickapartments','school'];
  const held=[
    ...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.market||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),
    ...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)
  ];
  const additions=[];
  for(const id of ids){
    const already=held.filter(x=>x===id).length;
    for(let i=already;i<PROJECT_COPIES;i++)additions.push({uid:'BUILD-V2-'+id+'-'+(i+1),id});
  }
  const deck=parsed.deck||[];
  const spacing=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  for(let i=0;i<additions.length;i++)deck.splice(Math.min((i+1)*spacing,deck.length),0,additions[i]);
  parsed.deck=deck;
  parsed.housingSchoolExpansionV1=true;
}

if(!parsed.monoTradeExpansionV1){
  // Existing saves may have three copies. Keep every existing market, held,
  // drafted, constructed or discarded card intact, but trim ONLY the future
  // deck to at most two total per type. Add two of each new single-type card.
  const additionsIds=['wholesale_market','commission_house','pub','skyscraper'];
  const lockedIds=[
    ...(parsed.market||[]).map(x=>x?.id),
    ...(parsed.players||[]).flatMap(x=>x.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(x=>x?.id)),
    ...(parsed.starterDiscards||[]).map(x=>x?.id),
    ...(parsed.expired||[]).map(x=>x?.id),
    ...(parsed.constructions||[]).map(x=>x.projectId)
  ];
  const counts=new Map();
  for(const id of lockedIds)if(id)counts.set(id,(counts.get(id)||0)+1);
  const trimmed=[];
  for(const card of parsed.deck||[]){
    if(!card||!projectById(card.id))continue;
    const count=counts.get(card.id)||0;
    if(count>=PROJECT_COPIES)continue;
    trimmed.push(card);
    counts.set(card.id,count+1);
  }
  const additions=[];
  for(const id of additionsIds){
    const already=counts.get(id)||0;
    for(let i=already;i<PROJECT_COPIES;i++)additions.push({uid:'MONO-V1-'+id+'-'+(i+1),id});
  }
  const spacing=Math.max(1,Math.floor((trimmed.length+additions.length)/(additions.length+1)));
  for(let i=0;i<additions.length;i++)trimmed.splice(Math.min((i+1)*spacing,trimmed.length),0,additions[i]);
  parsed.deck=trimmed;
  parsed.monoTradeExpansionV1=true;
}

if(!parsed.fireSafetyExpansionV1){
  const id='fireworkshop';
  const held=[
    ...(parsed.market||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),
    ...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId),
    ...(parsed.deck||[]).map(c=>c?.id)
  ];
  const already=held.filter(x=>x===id).length;
  const additions=Array.from({length:Math.max(0,PROJECT_COPIES-already)},(_,i)=>({uid:'FIRE-V1-'+(i+1),id}));
  const deck=parsed.deck||[];
  const step=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,card));
  parsed.deck=deck;
  parsed.fireSafetyExpansionV1=true;
}
// v0.50: add only unseen cards to existing saves, never disturb market/portfolio.
if(!parsed.boardingExpansionV1){
  const locked=[...(parsed.market||[]).map(c=>c?.id),...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId),...(parsed.deck||[]).map(c=>c?.id)];
  const additions=[];
  for(const id of ['wagonboarding','sailorlodging'])for(let i=locked.filter(x=>x===id).length;i<PROJECT_COPIES;i++)additions.push({uid:'BOARD-V1-'+id+'-'+(i+1),id});
  const deck=parsed.deck||[];
  const step=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,card));
  parsed.deck=deck;
  parsed.boardingExpansionV1=true;
}
if(!parsed.pressAndWorkersExpansionV1){
 const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
  ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
  ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
  ...(parsed.constructions||[]).map(c=>c.projectId),...(parsed.deck||[]).map(c=>c?.id)];
 const cards=[];
 for(const id of ['press_tower','workers_complex'])for(let i=held.filter(x=>x===id).length;i<PROJECT_COPIES;i++)cards.push({uid:'V051-'+id+'-'+(i+1),id});
 const deck=parsed.deck||[];
 const step=Math.max(1,Math.floor((deck.length+cards.length)/(cards.length+1)));
 cards.forEach((card,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,card));
 parsed.deck=deck;parsed.pressAndWorkersExpansionV1=true;
}
if(!parsed.breweryTradeV1){
  const id='brewery';
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const additions=Array.from({length:Math.max(0,PROJECT_COPIES-held.filter(x=>x===id).length)},(_,i)=>({uid:'BEER-GOODS-'+(i+1),id}));
  parsed.deck=parsed.deck||[];
  const spacing=Math.max(1,Math.floor((parsed.deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>parsed.deck.splice(Math.min((i+1)*spacing,parsed.deck.length),0,card));
  parsed.breweryTradeV1=true;
}
if(!parsed.criminalTradeV1){
  const ids=['customs_warehouse','rare_goods_shop'];
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const additions=[];
  for(const id of ids)for(let i=held.filter(x=>x===id).length;i<PROJECT_COPIES;i++)additions.push({uid:'CRIME-GOODS-'+id+'-'+(i+1),id});
  parsed.deck=parsed.deck||[];
  parsed.deck.unshift(...additions);
  parsed.criminalTradeV1=true;
}
// One-time insertion of the new industrial bread factory into older saved decks.
if(!parsed.steamBakeryExpansionV1){
  const id=BREAD_FACTORY_ID;
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const additions=Array.from({length:Math.max(0,PROJECT_COPIES-held.filter(x=>x===id).length)},
    (_,i)=>({uid:'STEAM-BAKERY-'+(i+1),id}));
  const deck=parsed.deck||[];
  const step=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,card));
  parsed.deck=deck;
  parsed.steamBakeryExpansionV1=true;
}
parsed.breadSpoilageSettledRound=Number.isInteger(parsed.breadSpoilageSettledRound)?parsed.breadSpoilageSettledRound:0;
parsed.pendingBreadProduction=Array.isArray(parsed.pendingBreadProduction)
  ?parsed.pendingBreadProduction.filter(id=>parsed.constructions.some(c=>c.id===id&&c.projectId===BREAD_FACTORY_ID&&c.status==='complete'&&c.breadProductionRound!==parsed.round))
  :[];
if(parsed.phase==='bread-production'&&!parsed.pendingBreadProduction.length)parsed.phase='declare';
if(!parsed.residentialQuarterExpansionV1){
  const id='residential_quarter';
  // Older games retain their markets, cards, projects, capital, and construction state.
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const additions=Array.from({length:Math.max(0,PROJECT_COPIES-held.filter(x=>x===id).length)},
    (_,i)=>({uid:'RESIDENTIAL-QUARTER-'+(i+1),id}));
  const deck=parsed.deck||[];
  const step=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,card));
  parsed.deck=deck;
  parsed.residentialQuarterExpansionV1=true;
}
if(!parsed.grandCitySquareExpansionV1){
  const id='grand_city_square';
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const copies=Array.from({length:Math.max(0,PROJECT_COPIES-held.filter(x=>x===id).length)},
    (_,i)=>({uid:'GRAND-SQUARE-'+(i+1),id}));
  const deck=parsed.deck||[];
  const step=Math.max(1,Math.floor((deck.length+copies.length)/(copies.length+1)));
  copies.forEach((c,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,c));
  parsed.deck=deck;
  parsed.grandCitySquareExpansionV1=true;
}
if(!parsed.hallOfJusticeExpansionV1){
  const id='hall_of_justice';
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const additions=Array.from({length:Math.max(0,PROJECT_COPIES-held.filter(x=>x===id).length)},
    (_,i)=>({uid:'HALL-JUSTICE-'+(i+1),id}));
  const deck=parsed.deck||[];
  const step=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>deck.splice(Math.min((i+1)*step,deck.length),0,card));
  parsed.deck=deck;
  parsed.hallOfJusticeExpansionV1=true;
}
// Insert agency cards into existing saves without disturbing owned projects.
if(!parsed.advertisingAgencyExpansionV1){
  const id='ad_agency';
  const held=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
    ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
    ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
    ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
    ...(parsed.constructions||[]).map(c=>c.projectId)];
  const additions=Array.from({length:Math.max(0,PROJECT_COPIES-held.filter(x=>x===id).length)},
    (_,i)=>({uid:'AD-AGENCY-'+(i+1),id}));
  const deck=parsed.deck||[];
  const spacing=Math.max(1,Math.floor((deck.length+additions.length)/(additions.length+1)));
  additions.forEach((card,i)=>deck.splice(Math.min((i+1)*spacing,deck.length),0,card));
  parsed.deck=deck;
  parsed.advertisingAgencyExpansionV1=true;
}
if(!parsed.residentialMixedV1){
 const ids=['bakery','orphanage'];
 const locked=[...(parsed.market||[]).map(c=>c?.id),...(parsed.deck||[]).map(c=>c?.id),
  ...(parsed.players||[]).flatMap(p=>p.portfolio||[]),
  ...(parsed.starterDraftHands||[]).flatMap(h=>(h||[]).map(c=>c?.id)),
  ...(parsed.starterDiscards||[]).map(c=>c?.id),...(parsed.expired||[]).map(c=>c?.id),
  ...(parsed.constructions||[]).map(c=>c.projectId)];
 const cards=[];
 for(const id of ids)for(let i=locked.filter(x=>x===id).length;i<PROJECT_COPIES;i++)cards.push({uid:'MIXED-2026-'+id+'-'+(i+1),id});
 const deck=parsed.deck||[];
 const spacing=Math.max(1,Math.floor((deck.length+cards.length)/(cards.length+1)));
 cards.forEach((card,i)=>deck.splice(Math.min((i+1)*spacing,deck.length),0,card));
 parsed.deck=deck;parsed.residentialMixedV1=true;
}
parsed.pendingWorkforceLinks=Array.isArray(parsed.pendingWorkforceLinks)?parsed.pendingWorkforceLinks.filter(id=>parsed.constructions.some(c=>c.id===id&&c.projectId==='workers_complex'&&c.status==='complete'&&!c.linkedIndustryId)):[];
parsed.pendingPressCampaigns=Array.isArray(parsed.pendingPressCampaigns)?parsed.pendingPressCampaigns.filter(id=>parsed.constructions.some(c=>c.id===id&&c.projectId==='press_tower'&&c.status==='complete'&&c.pressCampaignRound!==parsed.round)):[];
parsed.pressCampaignQueuedRound=Number(parsed.pressCampaignQueuedRound)||0;
parsed.pendingSailorRecruitments=Array.isArray(parsed.pendingSailorRecruitments)?parsed.pendingSailorRecruitments.filter(id=>parsed.constructions.some(c=>c.id===id&&c.projectId==='sailorlodging'&&c.status==='complete')):[];
parsed.expired=parsed.expired||[];
parsed.nextConstructionId=parsed.nextConstructionId||(parsed.constructions.reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1);
parsed.nextLoanId=parsed.nextLoanId||(parsed.players.flatMap(p=>p.loans||[]).reduce((m,x)=>Math.max(m,Number(String(x.id||'').replace(/\D/g,''))||0),0)+1);
parsed.districts=parsed.districts||Object.fromEntries(DISTRICTS.map(d=>[d.id,{landValue:d.landValue,sites:d.sites,roadAccess:d.buildable!==false}]));
DISTRICTS.forEach(d=>{
parsed.districts[d.id]=parsed.districts[d.id]||{landValue:d.landValue,sites:d.sites,roadAccess:d.buildable!==false};
if(parsed.districts[d.id].landValue==null)parsed.districts[d.id].landValue=d.landValue;
parsed.districts[d.id].sites=d.sites;
// v0.43A: ordinary streets are background city infrastructure, not a gameplay gate.
parsed.districts[d.id].roadAccess=d.buildable!==false;
});
parsed.logisticsSupply=parsed.logisticsSupply||generateLogisticsSupply();
parsed.freightYardInventories=Array.from({length:3},(_,i)=>Array.isArray(parsed.freightYardInventories?.[i])?parsed.freightYardInventories[i].slice(0,2):[]);
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
retireStreetcarCardsInSave(parsed);
parsed.selectedMarketUid=parsed.selectedMarketUid||parsed.market.find(m=>m&&m.id===parsed.selectedProjectId)?.uid||parsed.market.find(Boolean)?.uid||null;
parsed.pendingConstruction=null;
parsed.yearTransition=parsed.yearTransition||null;
if(!Array.isArray(parsed.goalMarket)||!Array.isArray(parsed.goalDeck)){
const goalSetup=createCityGoalPool();
parsed.goalMarket=goalSetup.market;parsed.goalDeck=goalSetup.deck;parsed.goalDiscard=goalSetup.discard;
}
parsed.goalMarket=Array.from({length:5},(_,i)=>parsed.goalMarket?.[i]||null);
parsed.goalDiscard=Array.isArray(parsed.goalDiscard)?parsed.goalDiscard:[];
parsed.goalSessionClaims=Array.isArray(parsed.goalSessionClaims)?parsed.goalSessionClaims:[];
parsed.lastGoalReports=Array.isArray(parsed.lastGoalReports)?parsed.lastGoalReports:[];

if(!['0.43b','0.44'].includes(originalVersion)||!Array.isArray(parsed.yearTurnOrder)||parsed.yearTurnOrder.length!==parsed.players.length){
normalizeInfluenceTrack(parsed);
}
if(parsed.phase==='development'){
// Older saves and focused E2E fixtures did not have independent activation slots.
if(parsed.developmentComplete){
  parsed.developmentSlotsUsed=parsed.players.map(()=>WORKERS_PER_PLAYER);
}else if(!Array.isArray(parsed.developmentSlotsUsed)||parsed.developmentSlotsUsed.length!==parsed.players.length||parsed.developmentSlotsUsed.every(x=>x===0)){
  parsed.developmentSlotsUsed=parsed.players.map(p=>Math.max(0,(p.workers||[]).filter(w=>w.used).length-(parsed.developmentPlayer===p.id&&parsed.activationMainActionUsed?1:0)));
}
ensureDevelopmentSlots(parsed);
const order=turnOrder(parsed);
const candidate=order.find(pid=>developmentSlotsRemaining(parsed,pid)>0);
parsed.developmentComplete=candidate==null;
parsed.developmentPlayer=parsed.developmentComplete?null:(parsed.developmentPlayer!=null&&developmentSlotsRemaining(parsed,parsed.developmentPlayer)>0?parsed.developmentPlayer:candidate);
}else if(parsed.phase==='crime-assessment'){
  // Already completed development: preserve it while awaiting a mandatory annual fine.
  parsed.developmentPlayer=null;
  parsed.developmentComplete=true;
  parsed.developmentSlotsUsed=parsed.players.map(()=>WORKERS_PER_PLAYER);
}else{
parsed.developmentPlayer=null;
parsed.developmentComplete=false;
parsed.developmentSlotsUsed=parsed.players.map(()=>0);
}
if(!['0.22','0.23','0.24','0.25','0.28','0.30a','0.43a','0.43b','0.44'].includes(originalVersion)&&parsed.phase==='draft')parsed.phase='declare';
ensureNewspaper(parsed);
return parsed;
}
function isMobile(){return window.matchMedia('(max-width:640px), (max-height:500px) and (max-width:960px)').matches;}
function closeMobileContext(){mobileContextOpen=false;syncMobileContext();}
function syncMobileContext(){
const open=isMobile()&&mobileContextOpen;
$('#contextPanel')?.classList.toggle('mobile-open',open);
document.body.classList.toggle('context-open',open);
}
function gameplayFingerprint(source){
const {
view,selectedDistrictId,selectedProjectId,selectedMarketUid,
pendingConstruction,pendingWorkerAction,activeWorkerId,
...gameplay
}=source||{};
return JSON.stringify(gameplay);
}
function syncUndoButton(){
const btn=$('#undoBtn');if(!btn)return;
btn.disabled=undoHistory.length===0;
btn.title=undoHistory.length?'Отменить последнее игровое действие':'Нет действий для отмены';
}
function saveState(){
const serialized=JSON.stringify(state);
const fingerprint=gameplayFingerprint(state);
if(!undoApplying&&fingerprint!==lastSavedFingerprint){
const undoState=JSON.parse(lastSavedSnapshot);
undoState.pendingConstruction=null;
undoState.pendingWorkerAction=null;
undoHistory.push(JSON.stringify(undoState));
if(undoHistory.length>30)undoHistory.shift();
}
localStorage.setItem(STORAGE_KEY,serialized);
lastSavedSnapshot=serialized;
lastSavedFingerprint=fingerprint;
syncUndoButton();
}
function undoLastGameAction(){
if(!undoHistory.length){showToast('Нет игровых действий для отмены');return;}
const snapshot=undoHistory.pop();
undoApplying=true;
state=JSON.parse(snapshot);
deliveryDraft=null;overviewPlayerId=null;focusedConstructionId=null;
mobileContextOpen=false;pendingBidReveal=false;
lastSavedSnapshot=snapshot;
lastSavedFingerprint=gameplayFingerprint(state);
localStorage.setItem(STORAGE_KEY,snapshot);
closeDrawers();closeMobileContext();
$('#privacyModal')?.classList.remove('open');
$('#modalBackdrop')?.classList.remove('open');
render();
undoApplying=false;
syncUndoButton();
showToast('Последнее игровое действие отменено');
}
function playerColor(pid){return state.players[pid].key;}
function preferredOfficePlayer(){
if(state.phase==='development'&&currentDeveloper(state)!=null)return currentDeveloper(state);
if(state.phase==='declare'&&currentDeclarer(state)!=null)return currentDeclarer(state);
return state.firstPlayer;
}
function projectTypeLabel(project){const types=projectTypes(project).join(' · ')||project?.type||'Проект';return types+(project?.largeBuilding?' · КРУПНОЕ ЗДАНИЕ':'');}
const BUILDING_TYPE_COLORS=Object.freeze({
'Жилое':'#56875A',
'Бизнес':'#76558F',
'Промышленное':'#34383D',
'Общественное':'#3F78A8',
'Торговое':'#D5A021'
});
function projectTypeColors(project){
return projectTypes(project).map(t=>BUILDING_TYPE_COLORS[t]).filter(Boolean);
}
function projectTypeStripe(project){
const colors=projectTypeColors(project);
if(!colors.length)return '#8A7D6B';
if(colors.length===1)return colors[0];
const stop=100/colors.length;
return 'linear-gradient(90deg,'+colors.map((c,i)=>c+' '+(i*stop)+'% '+((i+1)*stop)+'%').join(',')+')';
}
function projectTypeStyle(project){return 'style="--type-stripe:'+projectTypeStripe(project)+'"';}
function projectSvgTypeStripe(project,{x,y,width,height=5}){
const colors=projectTypeColors(project);
if(!colors.length)return '';
const part=width/colors.length;
return colors.map((c,i)=>'<rect class="construction-type-cap" x="'+(x+i*part)+'" y="'+y+'" width="'+part+'" height="'+height+'" fill="'+c+'"/>').join('');
}
function typeClass(projectOrType){
const types=typeof projectOrType==='string'?[projectOrType]:projectTypes(projectOrType);
const type=types[0]||projectOrType?.type||'';
return type==='Жилое'||type==='Жильё'?'type-housing':
type==='Бизнес'||type==='Коммерция'?'type-commerce':
type==='Промышленное'||type==='Промышленность'?'type-industry':
type==='Торговое'||type==='Логистика'?'type-logistics':
type==='Общественное'||type==='Городская служба'?'type-civic':'type-infra';
}
const RESOURCE_ORDER=['Lumber','Masonry','Steel'];
const CARGO_ORDER=[...RESOURCE_ORDER,...PINK_GOODS,CONTRABAND_CARGO];
function materialLabel(x){return {Lumber:'Дерево',Masonry:'Камень',Steel:'Сталь',Beer:'Пиво',Bread:'Хлеб',Contraband:'Контрабанда'}[x]||x;}
function materialShort(x){return {Lumber:'Д',Masonry:'К',Steel:'С',Beer:'Р',Bread:'Х',Contraband:'Ф'}[x]||'?';}
function materialClass(x){return {Lumber:'lumber',Masonry:'masonry',Steel:'steel',Beer:'goods',Bread:'goods',Contraband:'contraband'}[x]||'';}
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
function constructionNeedCounts(con){
const pr=projectById(con?.projectId);
const need=deliveryCounts(pr?.materials||[]);
const have=deliveryCounts(con?.materialsDelivered||[]);
return Object.fromEntries(RESOURCE_ORDER.map(type=>[type,Math.max(0,(need[type]||0)-(have[type]||0))]));
}
function compactConstructionNeed(con,{prefix=false}={}){
const counts=constructionNeedCounts(con);
const parts=RESOURCE_ORDER.filter(type=>counts[type]>0).map(type=>materialShort(type)+counts[type]);
const value=parts.join(' · ')||'КОМПЛЕКТ';
return prefix?'ОСТ: '+value:value;
}
function playerConstructionNeeds(playerId){
return (state.constructions||[]).filter(con=>con.playerId===playerId&&con.status==='under-construction');
}
function aggregateConstructionNeeds(playerId){
const total={Lumber:0,Masonry:0,Steel:0};
for(const con of playerConstructionNeeds(playerId)){
const counts=constructionNeedCounts(con);
for(const type of RESOURCE_ORDER)total[type]+=counts[type]||0;
}
return total;
}
function deliveryConstructionNeedsHtml(playerId){
const builds=playerConstructionNeeds(playerId);
if(!builds.length)return '<div class="delivery-needs-panel empty"><div class="delivery-needs-head"><b>НУЖНО НА СТРОЙКАХ</b></div><span>Активных строек нет.</span></div>';
const rows=builds.map(con=>{
const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id);
return '<div class="delivery-need-row"><span><b>'+pr.name+'</b><small>'+d.name+' · '+prog.delivered+'/'+prog.required+'</small></span><strong>'+compactConstructionNeed(con)+'</strong></div>';
}).join('');
return '<div class="delivery-needs-panel"><div class="delivery-needs-head"><b>НУЖНО НА СТРОЙКАХ</b><span>остаток материалов</span></div><div class="delivery-needs-list">'+rows+'</div></div>';
}
function requirementParts(project){
return String(project?.requires||'Нет дополнительных требований').split('·').map(x=>x.trim()).filter(Boolean);
}
function requirementChips(project){
return requirementParts(project).map(x=>'<span class="requirement-chip">'+x+'</span>').join('');
}
function riskRoman(level){return ['0','I','II','III'][Math.max(0,Math.min(3,level||0))];}
function riskDisplay(raw,{compact=false}={}){
const value=Math.max(0,Math.floor(Number(raw)||0)),level=riskLevel(value),overflow=Math.max(0,value-3);
if(compact)return level===0?'0':riskRoman(level)+(overflow?`+${overflow}`:'');
return level===0?'0 · SAFE':`${value} · LEVEL ${riskRoman(level)}${overflow?` +${overflow} OVERFLOW`:''}`;
}
function signedRisk(value){const n=Number(value)||0;return n>0?`+${n}`:String(n);}
function projectRiskChips(projectOrId){
const id=typeof projectOrId==='string'?projectOrId:projectOrId?.id,r=projectRisk(id);
const chips=[];
if(r.earthquake)chips.push(`<span class="risk-change quake ${r.earthquake<0?'good':'bad'}">У ${signedRisk(r.earthquake)}</span>`);
if(r.fire)chips.push(`<span class="risk-change fire ${r.fire<0?'good':'bad'}">П ${signedRisk(r.fire)}</span>`);
return `<div class="card-risk-row ${chips.length?'':'neutral'}">${chips.length?chips.join(''):'<span class="risk-neutral">У 0 · П 0</span>'}</div>`;
}
function riskSourceRows(risk){
const rows=(risk?.sources||[]).filter(x=>x.earthquake||x.fire);
if(!rows.length)return '<div class="risk-source-empty">Нет активных источников риска.</div>';
return rows.map(src=>{
const owner=src.ownerId!=null?state.players[src.ownerId]?.name:null;
const parts=[];
if(src.earthquake)parts.push(`У ${signedRisk(src.earthquake)}`);
if(src.fire)parts.push(`П ${signedRisk(src.fire)}`);
return `<div class="risk-source-row"><span>${owner?owner+' · ':''}${src.label}</span><b>${parts.join(' · ')}</b></div>`;
}).join('');
}
function districtRiskPanelHtml(districtId){
const r=districtRisk(state,districtId);if(!r)return '';
const reserve=[];
if((r.earthquake.net??r.earthquake.raw)<0)reserve.push(`У запас ${Math.abs(r.earthquake.net)}`);
if((r.fire.net??r.fire.raw)<0)reserve.push(`П запас ${Math.abs(r.fire.net)}`);
return `<div class="district-risk-panel">
<div class="district-risk-head"><b>УЯЗВИМОСТЬ И ПОЖАРООПАСНОСТЬ</b><span>${reserve.length?reserve.join(' · '):'без верхнего лимита'}</span></div>
<div class="district-risk-values">
<div class="quake"><span>УЯЗВИМОСТЬ</span><strong>У ${riskDisplay(r.earthquake.raw)}</strong></div>
<div class="fire"><span>ПОЖАРООПАСНОСТЬ</span><strong>П ${riskDisplay(r.fire.raw)}</strong></div>
</div>
<details class="risk-sources"><summary>Почему такие значения</summary>${riskSourceRows(r)}</details>
</div>`;
}
function constructionRiskPreviewHtml(districtId,projectId){
const p=districtRiskPreview(state,districtId,projectId);if(!p)return '';
const qCross=p.before.earthquake.level!==p.after.earthquake.level,fCross=p.before.fire.level!==p.after.fire.level;
const overflow=p.after.earthquake.raw>3||p.after.fire.raw>3;
const warning=qCross||fCross
?'<div class="risk-preview-warning">⚠ После завершения проект переводит район на другой уровень риска.</div>'
:overflow?'<div class="risk-preview-warning">Риск продолжает накапливаться выше Level III: последующие улучшения сначала должны убрать overflow.</div>':'';
return `<div class="risk-preview-box ${qCross||fCross?'crosses-level':''}">
<div class="risk-preview-title">ПРОГНОЗ ПОСЛЕ ЗАВЕРШЕНИЯ</div>
<div class="risk-preview-grid">
<span>У <b>${p.before.earthquake.raw}</b> <em>→</em> <b>${p.after.earthquake.raw}</b> <small>${riskRoman(p.before.earthquake.level)} → ${riskRoman(p.after.earthquake.level)}</small></span>
<span>П <b>${p.before.fire.raw}</b> <em>→</em> <b>${p.after.fire.raw}</b> <small>${riskRoman(p.before.fire.level)} → ${riskRoman(p.after.fire.level)}</small></span>
</div>${warning}
</div>`;
}
function syncStickyLayout(){
const top=$('.topbar'),players=$('#playersBar'),news=$('#newsStrip'),mobileActions=$('#mobileActionDock');
if(!top||!players)return;
const topH=Math.ceil(top.getBoundingClientRect().height);
const playersH=Math.ceil(players.getBoundingClientRect().height);
const newsH=Math.ceil(news?.getBoundingClientRect().height||0);
const actionsH=isMobile()?Math.ceil(mobileActions?.getBoundingClientRect().height||0):0;
document.documentElement.style.setProperty('--topbar-h',topH+'px');
document.documentElement.style.setProperty('--news-top-h',(topH+playersH)+'px');
document.documentElement.style.setProperty('--hud-stack-h',(topH+playersH+newsH+actionsH)+'px');
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
const landscapeMobile=isMobile()&&window.innerWidth>640&&window.innerHeight<=500;
const usableWidth=Math.max(220,scroll.clientWidth);
const left=Math.max(0,pos[0]*scale-usableWidth/2);
scroll.scrollTo({left,behavior:'smooth'});
const sticky=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hud-stack-h'))||0;
const deliveryPanel=isMobile()&&['route','unload'].includes(deliveryDraft?.step)?$('#deliveryPanel'):null;
const routeReserve=deliveryPanel?.getBoundingClientRect().height||0;
const bottomReserve=isMobile()?(landscapeMobile?58:72)+Math.min(routeReserve+8,deliveryDraft?.panelExpanded?210:130):0;
const viewportCenter=sticky+Math.max(95,(window.innerHeight-sticky-bottomReserve)/2);
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
const c=deliveryCounts(deliveryDraft?deliveryAllCargo(deliveryDraft):[]);
for(const t of deliveryAssigned())c[t]=Math.max(0,(c[t]||0)-1);
return c;
}
function startDeliveryFlow(playerId){
if(!canUseFreeAction(state,playerId)){showToast('Доставка доступна только во время вашей активации');return;}
if(state.lastDeliveryKey===currentDeliveryKey(state,playerId)){showToast('В этой активации Доставка уже выполнена');return;}
deliveryDraft={playerId,step:'source',source:null,haulerId:null,cargo:[],pickups:[],pickupSource:null,pickupOpen:false,routeDropOpen:false,route:[],drops:[],listOpen:false,panelExpanded:false,menuOpen:false,focusTargetId:null};
state.pendingConstruction=null;state.pendingWorkerAction=null;state.view='city';
closeDrawers();closeMobileContext();render();
focusDeliveryMap({detail:false});
}
function cancelDeliveryFlow(){deliveryDraft=null;document.body.classList.remove('delivery-active');render();}
function chooseDeliverySource(source){
if(deliveryDraft?.step!=='source')return;
const info=deliverySourceInfo(state,deliveryDraft.playerId,source);
if(!info?.inventory?.length){showToast('В этом источнике нет ресурсов');return;}
deliveryDraft.source={kind:source.kind,id:source.id};deliveryDraft.step='load';deliveryDraft.haulerId=null;
deliveryDraft.cargo=source.kind==='stolen'?[...info.inventory]:[];deliveryDraft.pickups=[];deliveryDraft.pickupSource=null;deliveryDraft.pickupOpen=false;deliveryDraft.route=[];deliveryDraft.drops=[];deliveryDraft.panelExpanded=false;deliveryDraft.menuOpen=false;deliveryDraft.focusTargetId=null;render();
}
function chooseDeliveryHauler(id){
if(deliveryDraft?.step!=='load')return;
const h=availableDeliveryHaulers(state).find(x=>x.id===id);
if(!h?.available){showToast('Перевозчик уже использован');return;}
deliveryDraft.haulerId=id;if(deliveryDraft.cargo.length>h.capacity)deliveryDraft.cargo=[];render();
}
function addDeliveryCargo(type){
if(deliveryDraft?.step!=='load'||!deliveryDraft.haulerId||deliveryDraft.source?.kind==='stolen')return;
const h=availableDeliveryHaulers(state).find(x=>x.id===deliveryDraft.haulerId);
const src=deliverySourceInfo(state,deliveryDraft.playerId,deliveryDraft.source);
if(!h||!src)return;
if(deliveryDraft.cargo.length>=h.capacity){showToast('Перевозчик заполнен');return;}
const have=deliveryCounts(src.inventory),used=deliveryCounts(deliveryDraft.cargo);
if((used[type]||0)>=(have[type]||0)){showToast('Больше такого ресурса нет');return;}
if(type===CONTRABAND_CARGO&&deliveryAllCargo(deliveryDraft).includes(CONTRABAND_CARGO)){showToast('Только одна скрытая партия за Доставку');return;}
deliveryDraft.cargo.push(type);render();
}
function clearDeliveryCargo(){if(deliveryDraft?.step==='load'&&deliveryDraft.source?.kind!=='stolen'){deliveryDraft.cargo=[];render();}}
function beginDeliveryRoute(){
if(!deliveryDraft?.haulerId||!deliveryDraft.cargo.length){showToast('Выберите перевозчика и груз');return;}
const src=deliverySourceInfo(state,deliveryDraft.playerId,deliveryDraft.source);if(!src)return;
deliveryDraft.step='route';deliveryDraft.route=[src.districtId];deliveryDraft.drops=[];deliveryDraft.listOpen=false;deliveryDraft.panelExpanded=false;deliveryDraft.menuOpen=false;deliveryDraft.focusTargetId=null;render();
if(isMobile())focusMapOnDistrict(src.districtId);
}

function deliveryTargetDistrict(drop){
  if(drop.kind==='e03-aid')return E03_AID_DISTRICTS.includes(drop.id)?drop.id:null;
  if(drop.kind==='freight-yard')return FREIGHT_YARD.districtId;
  return (state.constructions||[]).find(c=>c.id===drop.id)?.districtId||null;
}
function deliveryPickupSources(){
  const d=deliveryDraft;if(d?.step!=='route')return [];
  const visit=d.route.length-1,district=d.route[visit];
  const sources=[...completedBreweries(state).filter(c=>beerInventory(c).length).map(c=>({kind:'goods',id:c.id})),...completedBreadFactories(state).filter(c=>breadInventory(c).length).map(c=>({kind:'goods',id:c.id})),...completedCustomsWarehouses(state).filter(c=>contrabandInventory(c).length).map(c=>({kind:'contraband',id:c.id})),...LOGISTICS_NODES.map(n=>({kind:'node',id:n.id})),
    ...NEUTRAL_MATERIAL_SUPPLIERS.map(n=>({kind:'supplier',id:n.id})),
    ...completedWarehouses(state,d.playerId).map(w=>({kind:'warehouse',id:w.id})),
    ...completedIndustrialProducers(state).map(p=>({kind:'industry',id:p.id})),
    {kind:'freight-yard',id:FREIGHT_YARD.id}];
  return sources.filter(src=>{
    const info=deliverySourceInfo(state,d.playerId,src);
    // The initial pickup cannot be repeated until the wagon leaves the district
    // and physically returns on a later route index.
    if(visit===0&&d.source.kind===src.kind&&d.source.id===src.id)return false;
    if(!info||info.districtId!==district||!info.inventory?.length)return false;
    const previous=[{source:d.source,cargo:d.cargo},...(d.pickups||[])]
      .filter(p=>p.source?.kind===src.kind&&p.source?.id===src.id)
      .flatMap(p=>p.cargo||[]);
    if(info.unlimited)return true;
    const used=deliveryCounts(previous),stock=deliveryCounts(info.inventory);
    return CARGO_ORDER.some(t=>(used[t]||0)<(stock[t]||0));
  });
}
function deliveryOnboardAt(stop){
  const d=deliveryDraft,loaded=[],pickups=[{routeIndex:0,cargo:d.cargo},...(d.pickups||[])];
  for(let i=0;i<=stop;i++){
    if(i===0)loaded.push(...d.cargo);
    const waiting=[];
    for(const drop of d.drops||[]){
      const at=drop.routeIndex??d.route.indexOf(deliveryTargetDistrict(drop));
      if(at!==i)continue;
      for(const type of drop.materials){const j=loaded.indexOf(type);if(j>=0)loaded.splice(j,1);else waiting.push(type);}
    }
    for(const p of (d.pickups||[]).filter(x=>x.routeIndex===i))loaded.push(...p.cargo);
    for(const t of waiting){const j=loaded.indexOf(t);if(j>=0)loaded.splice(j,1);}
  }
  return loaded;
}
function chooseExtraPickup(kind,id){
  const src=deliveryPickupSources().find(x=>x.kind===kind&&x.id===id);
  if(!src){showToast('Этот источник сейчас недоступен');return;}
  deliveryDraft.pickupSource=src;deliveryDraft.pickupOpen=true;render();
}
function addExtraPickupCargo(type){
  const d=deliveryDraft;if(d?.step!=='route'||!d.pickupSource)return;
  const info=deliverySourceInfo(state,d.playerId,d.pickupSource);
  const hauler=DELIVERY_HAULERS.find(h=>h.id===d.haulerId),at=d.route.length-1;
  if(!info||!hauler||!info.inventory.includes(type))return;
if(type===CONTRABAND_CARGO&&deliveryAllCargo(d).includes(CONTRABAND_CARGO)){showToast('Только одна скрытая партия за Доставку');return;}
  if(deliveryOnboardAt(at).length>=hauler.capacity){showToast('Перевозчик заполнен: сначала разгрузите груз');return;}
  const total=[{source:d.source,cargo:d.cargo},...(d.pickups||[])]
     .filter(p=>p.source?.kind===d.pickupSource.kind&&p.source?.id===d.pickupSource.id)
     .flatMap(p=>p.cargo||[]);
  if(!info.unlimited&&(deliveryCounts(total)[type]||0)>=(deliveryCounts(info.inventory)[type]||0)){
    showToast('Материала больше нет на складе источника');return;
  }
  const p=d.pickups.find(p=>p.routeIndex===at&&p.source.kind===d.pickupSource.kind&&p.source.id===d.pickupSource.id);
  if(p)p.cargo.push(type);else d.pickups.push({source:{...d.pickupSource},routeIndex:at,cargo:[type]});
  d.pickupSource=null;d.pickupOpen=false;render();
}
function pickupSelectorHtml(){
  const d=deliveryDraft;if(d?.step!=='route'||d.routeDropOpen||d.focusTargetId)return '';
  const sources=deliveryPickupSources();
  if(!sources.length&&!d.pickupSource)return '';
  const hauler=DELIVERY_HAULERS.find(h=>h.id===d.haulerId);
  const free=Math.max(0,(hauler?.capacity||0)-deliveryOnboardAt(d.route.length-1).length);
  let html='<div class="delivery-extra-loading '+(d.pickupOpen?'expanded':'collapsed')+'">';
  if(!d.pickupOpen)html+='<button id="deliveryShowPickups" class="delivery-extra-trigger">+ Догрузить здесь · $1</button>';
  else{
    html+='<div class="delivery-extra-head"><b>ДОПОГРУЗКА</b><span>Свободно '+free+'/'+hauler.capacity+'</span></div><button id="deliveryHidePickups" class="ghost-btn">× Закрыть</button>';
    if(d.pickupSource){
      const src=d.pickupSource,info=deliverySourceInfo(state,d.playerId,src),used=deliveryCounts([{source:d.source,cargo:d.cargo},...d.pickups].filter(p=>p.source.kind===src.kind&&p.source.id===src.id).flatMap(p=>p.cargo));
      const stock=deliveryCounts(info.inventory);
      html+='<b>'+info.name+'</b><div class="delivery-extra-load-buttons">';
      for(const t of CARGO_ORDER){
        const n=info.unlimited?'∞':Math.max(0,(stock[t]||0)-(used[t]||0));
        const loadHere=d.pickups.find(p=>p.routeIndex===d.route.length-1&&p.source.kind===src.kind&&p.source.id===src.id)?.cargo||[];
        const price=src.kind==='industry'?deliveryMaterialCost(state,src,[...loadHere,t],d.playerId).cost-deliveryMaterialCost(state,src,loadHere,d.playerId).cost:
          src.kind==='node'?RESOURCE_PRICES[t]:src.kind==='supplier'?info.unitPrice:0;
        html+='<button data-extra-cargo="'+t+'" '+((n===0||free<=0||(t===CONTRABAND_CARGO&&deliveryAllCargo(d).includes(CONTRABAND_CARGO)))?'disabled':'')+'>'+materialLabel(t)+' · '+n+' · $'+price+'</button>';
      }
      html+='</div>';
    }else for(const src of sources){
      const info=deliverySourceInfo(state,d.playerId,src);
      html+='<button data-extra-source-kind="'+src.kind+'" data-extra-source-id="'+src.id+'">'+info.name+'</button>';
    }
  }
  return html+'</div>';
}
function routeEarlyUnloadHtml(){
  const d=deliveryDraft;if(d?.step!=='route'||!isMobile()||d.pickupOpen)return '';
  const targets=deliveryRouteTargets().filter(x=>x.districtId===d.route.at(-1)&&deliveryRouteTargetCanAcceptAny(x));
  if(!targets.length)return '';
  const focus=d.focusTargetId?targets.find(x=>x.id===d.focusTargetId):null;
  let html='<div class="delivery-route-quickdrop '+(d.routeDropOpen||focus?'expanded':'collapsed')+'">';
  if(!d.routeDropOpen&&!focus)html+='<button id="deliveryShowRouteDrops">↓ Разгрузить здесь</button>';
  else if(!focus){
    html+='<button id="deliveryHideRouteDrops" class="ghost-btn">× Закрыть</button>';
    for(const t of targets)html+='<button data-early-drop-target="'+t.id+'">'+(t.kind==='e03-aid'?'Фонд помощи · ':t.id===FREIGHT_YARD.id?'Грузовой двор':isWarehouseConstruction(t)?'Склад':'Стройка')+' · '+districtById(t.districtId)?.name+'</button>';
  }else{
    const kind=deliveryRouteTargetKind(focus);
    html+='<strong>Разгрузить: '+districtById(focus.districtId)?.name+'</strong><div class="drop-buttons">';
    for(const type of CARGO_ORDER)html+='<button data-drop-kind="'+kind+'" data-drop-id="'+focus.id+'" data-drop-type="'+type+'" '+(deliveryCanDrop(kind,focus.id,type)?'':'disabled')+'>+'+materialShort(type)+'</button>';
    html+='</div>'+(kind==='e03-aid'?e03WarehouseContributionButtons(focus.id):'')+
      '<button id="deliveryCloseTarget" class="ghost-btn">Готово</button>';
  }
  return html+'</div>';
}
function addDeliveryRouteDistrict(id){
if(deliveryDraft?.step!=='route')return false;
const last=deliveryDraft.route[deliveryDraft.route.length-1];
if(id===last){showToast('Вы уже в этом районе — выберите точку разгрузки в панели доставки');return true;}
if(!deliveryNeighbors(last).includes(id)){showToast(id==='park'?'Через Golden Gate Park груз не едет':'Чтобы ехать дальше, выберите соседний район');return true;}
deliveryDraft.route.push(id);deliveryDraft.pickupOpen=false;deliveryDraft.pickupSource=null;deliveryDraft.routeDropOpen=false;deliveryDraft.listOpen=false;deliveryDraft.panelExpanded=false;deliveryDraft.menuOpen=false;deliveryDraft.focusTargetId=null;render();if(isMobile())focusMapOnDistrict(id);return true;
}
function undoDeliveryRoute(){
if(deliveryDraft?.step!=='route'||deliveryDraft.route.length<=1)return;
deliveryDraft.route.pop();
deliveryDraft.pickups=(deliveryDraft.pickups||[]).filter(p=>p.routeIndex<deliveryDraft.route.length);
deliveryDraft.pickupSource=null;deliveryDraft.pickupOpen=false;deliveryDraft.routeDropOpen=false;
const routeSet=new Set(deliveryDraft.route);
deliveryDraft.drops=(deliveryDraft.drops||[]).filter(d=>{
return (d.routeIndex??deliveryDraft.route.indexOf(deliveryTargetDistrict(d)))<deliveryDraft.route.length&&routeSet.has(deliveryTargetDistrict(d));
});
deliveryDraft.focusTargetId=null;
deliveryDraft.panelExpanded=false;
deliveryDraft.menuOpen=false;
render();
}
function deliveryTarget(kind,id){
return (deliveryDraft?.drops||[]).find(d=>d.kind===kind&&d.id===id);
}
function deliveryDropPhase(){
return deliveryDraft?.step==='unload'||deliveryDraft?.step==='route';
}
function freightYardTarget(){return {id:FREIGHT_YARD.id,districtId:FREIGHT_YARD.districtId,status:'freight-yard'};}
function deliveryCanDrop(kind,id,type){
if(!deliveryDropPhase()||(deliveryRemaining()[type]||0)<=0)return false;
const assigned=deliveryTarget(kind,id)?.materials||[];
if(kind==='e03-aid'){
  const preview=e03AidPreview(state);
  const drop=deliveryTarget(kind,id),fromStorage=(drop?.warehouseContributions||[]).map(x=>x.type);
  return preview.active&&E03_AID_DISTRICTS.includes(id)&&deliveryDraft.route.includes(id)&&
    !preview.claims.some(x=>x.playerId===deliveryDraft.playerId||x.districtId===id)&&
    E03_AID_MATERIALS.includes(type)&&assigned.length+fromStorage.length<2&&
    ![...assigned,...fromStorage].includes(type);
}
if(kind==='freight-yard')return type in RESOURCE_PRICES&&id===FREIGHT_YARD.id&&deliveryDraft.source?.kind!=='freight-yard'&&deliveryDraft.route.includes(FREIGHT_YARD.districtId)&&freightYardInventory(state,deliveryDraft.playerId).length+assigned.length<FREIGHT_YARD.capacityPerPlayer;
const con=(state.constructions||[]).find(x=>x.id===id);
if(!con||!deliveryDraft.route.includes(con.districtId))return false;
if(kind==='goods-sale')return con.status==='complete'&&goodsBuyerCapacity(con.projectId)>0&&PINK_GOODS.includes(type)&&goodsBuyerRemaining(state,con)>assigned.length&&!!deliveryPinkOriginForDrop(con.id,type);
if(kind==='contraband-sale')return con.projectId==='rare_goods_shop'&&con.status==='complete'&&type===CONTRABAND_CARGO&&!(deliveryDraft.drops||[]).some(d=>d.kind==='contraband-sale'&&d.materials?.includes(CONTRABAND_CARGO));
if(con.playerId!==deliveryDraft.playerId||type===CONTRABAND_CARGO||PINK_GOODS.includes(type))return false;
if(kind==='bakery')return con.projectId==='bakery'&&con.status==='complete'&&type==='Lumber'&&bakeryInventory(con).length+assigned.length<1;
if(kind==='warehouse')return isWarehouseConstruction(con)&&con.status==='complete'&&!(deliveryDraft.source?.kind==='warehouse'&&deliveryDraft.source.id===id)&&warehouseInventory(con).length+assigned.length<warehouseStorageCapacity(con);
if(kind!=='construction'||con.status!=='under-construction')return false;
const req=deliveryCounts(projectById(con.projectId)?.materials||[]),staged=[...(con.materialsDelivered||[]),...assigned],have=deliveryCounts(staged);
if((have[type]||0)>=(req[type]||0))return false;
const candidate=[...staged,type];if(candidate.length<=CONSTRUCTION_STAGING_CAPACITY)return true;
const cc=deliveryCounts(candidate),left={...deliveryRemaining()};left[type]=Math.max(0,(left[type]||0)-1);
return RESOURCE_ORDER.every(t=>Math.max(0,(req[t]||0)-(cc[t]||0))<=(left[t]||0));
}
function deliveryRouteTargetKind(con){
if(!con||!deliveryDraft||!deliveryDraft.route.includes(con.districtId))return null;
if(con.kind==='e03-aid')return e03AidPreview(state).active?'e03-aid':null;
if(con.id===FREIGHT_YARD.id)return deliveryDraft.source?.kind==='freight-yard'?null:'freight-yard';
if(con.status==='complete'&&goodsBuyerCapacity(con.projectId)>0)return 'goods-sale';
if(con.status==='complete'&&con.projectId==='rare_goods_shop')return 'contraband-sale';
if(con.playerId!==deliveryDraft.playerId)return null;
return con.status==='under-construction'?'construction':con.projectId==='bakery'&&con.status==='complete'?'bakery':isWarehouseConstruction(con)&&con.status==='complete'&&!(deliveryDraft.source?.kind==='warehouse'&&deliveryDraft.source.id===con.id)?'warehouse':null;
}
function deliveryTargetKind(con){return deliveryDropPhase()?deliveryRouteTargetKind(con):null;}
function deliveryRouteTargets(){const a=(state.constructions||[]).filter(x=>deliveryRouteTargetKind(x));
if(e03AidPreview(state).active){const preview=e03AidPreview(state);for(const districtId of E03_AID_DISTRICTS){if(deliveryDraft?.route?.includes(districtId)&&!preview.claims.some(x=>x.districtId===districtId||x.playerId===deliveryDraft.playerId))a.push({id:districtId,districtId,kind:'e03-aid'});}}
if(deliveryDraft?.route?.includes(FREIGHT_YARD.districtId)&&deliveryDraft.source?.kind!=='freight-yard')a.push(freightYardTarget());return a;}
function deliveryRouteTargetCanAcceptAny(con){
const kind=deliveryRouteTargetKind(con);if(!kind)return false;
if(kind==='e03-aid')return E03_AID_MATERIALS.some(type=>deliveryCanDrop(kind,con.id,type));
if(kind==='freight-yard')return freightYardInventory(state,deliveryDraft.playerId).length<FREIGHT_YARD.capacityPerPlayer;
if(kind==='goods-sale')return PINK_GOODS.some(type=>deliveryCanDrop(kind,con.id,type));
if(kind==='contraband-sale')return deliveryCanDrop(kind,con.id,CONTRABAND_CARGO);
if(kind==='bakery')return bakeryInventory(con).length<1;
if(kind==='warehouse')return warehouseInventory(con).length<warehouseStorageCapacity(con);
const req=deliveryCounts(projectById(con.projectId)?.materials||[]),have=deliveryCounts(con.materialsDelivered||[]),cargo=deliveryCounts(deliveryAllCargo(deliveryDraft));
const missing=Object.fromEntries(RESOURCE_ORDER.map(t=>[t,Math.max(0,(req[t]||0)-(have[t]||0))]));
if(!RESOURCE_ORDER.some(t=>(cargo[t]||0)>0&&(missing[t]||0)>0))return false;
return (con.materialsDelivered||[]).length<3||RESOURCE_ORDER.every(t=>(cargo[t]||0)>=(missing[t]||0));
}
function deliveryTargetAcceptsAny(con){const k=deliveryTargetKind(con);return !!k&&CARGO_ORDER.some(t=>deliveryCanDrop(k,con.id,t));}
function openDeliveryTargetFromMap(id){if(!isMobile()||!['unload','route'].includes(deliveryDraft?.step))return;const con=deliveryRouteTargets().find(x=>x.id===id);if(!deliveryTargetAcceptsAny(con)){showToast('Сюда сейчас нечего разгружать');return;}deliveryDraft.focusTargetId=id;render();}
// One physical source and product type per pink cube; works across multi-source routes.
function deliveryPinkOriginForDrop(targetId,type){
  const d=deliveryDraft,con=(state.constructions||[]).find(c=>c.id===targetId);
  if(!d||!con||!d.route?.includes(con.districtId)||!PINK_GOODS.includes(type))return null;
  const stop=d.step==='route'?d.route.length-1:d.route.lastIndexOf(con.districtId);
  const loads=[{source:d.source,routeIndex:0,cargo:d.cargo},...(d.pickups||[])];
  for(let i=0;i<loads.length;i++){
    const load=loads[i];
    if(load.source?.kind!=='goods'||load.routeIndex>stop||(load.routeIndex===stop&&i>0))continue;
    const loaded=(load.cargo||[]).filter(t=>t===type).length;
    const assigned=(d.drops||[]).reduce((sum,drop)=>sum+(drop.materials||[]).filter((t,j)=>t===type&&drop.goodsSourceIds?.[j]===load.source.id).length,0);
    if(assigned<loaded)return load.source.id;
  }
  return null;
}
function addDeliveryDrop(kind,id,type){
if(!deliveryCanDrop(kind,id,type)){showToast('Этот объект не может принять ресурс');return;}
let d=deliveryTarget(kind,id);if(!d){const district=deliveryTargetDistrict({kind,id});const at=deliveryDraft.step==='route'?deliveryDraft.route.length-1:deliveryDraft.route.lastIndexOf(district);d={kind,id,routeIndex:at,materials:[]};deliveryDraft.drops.push(d);}d.materials.push(type);
if(kind==='goods-sale'){d.goodsSourceIds=d.goodsSourceIds||[];d.goodsSourceIds.push(deliveryPinkOriginForDrop(id,type));}
render();
}

function e03WarehouseContributionButtons(id){
  if(!deliveryDraft||!E03_AID_DISTRICTS.includes(id))return '';
  const drop=deliveryTarget('e03-aid',id);
  const stored=drop?.warehouseContributions||[],fresh=drop?.materials||[];
  if(stored.length+fresh.length>=2)return '';
  const collected=[...fresh,...stored.map(x=>x.type)];
  const sources=completedWarehouses(state,deliveryDraft.playerId,id);
  const buttons=[];
  for(const wh of sources){
    const inv=[...(wh.warehouseInventory||[])];
    const loaded=[{source:deliveryDraft.source,cargo:deliveryDraft.cargo},...(deliveryDraft.pickups||[])]
      .filter(p=>p.source?.kind==='warehouse'&&p.source.id===wh.id).flatMap(p=>p.cargo||[]);
    for(const type of E03_AID_MATERIALS){
      const already=(stored.filter(c=>c.warehouseId===wh.id&&c.type===type).length)+
        loaded.filter(t=>t===type).length;
      if(inv.filter(t=>t===type).length<=already||collected.includes(type))continue;
      buttons.push('<button type="button" data-e03-warehouse="'+escapeHtml(String(wh.id))+
        '" data-e03-warehouse-district="'+id+'" data-e03-warehouse-type="'+type+'">'+
        escapeHtml(projectById(wh.projectId)?.name||'Склад')+' · '+materialLabel(type)+'</button>');
    }
  }
  return buttons.length?'<div class="delivery-e03-stock"><small>Добавить один материал из своего готового склада в этом районе (без новой поездки)</small>'+
    buttons.join('')+'</div>':'';
}
function addE03DeliveryStock(id,warehouseId,type){
  if(!deliveryDropPhase()||!E03_AID_DISTRICTS.includes(id)||!deliveryDraft.route.includes(id))return;
  const wh=completedWarehouses(state,deliveryDraft.playerId,id).find(w=>String(w.id)===String(warehouseId));
  const allowed=E03_AID_MATERIALS.includes(type);
  if(!wh||!allowed)return;
  let drop=deliveryTarget('e03-aid',id);
  if(!drop){drop={kind:'e03-aid',id,routeIndex:deliveryDraft.route.lastIndexOf(id),materials:[],warehouseContributions:[]};deliveryDraft.drops.push(drop);}
  const stored=drop.warehouseContributions||[],used=[...drop.materials,...stored.map(x=>x.type)];
  const pickupUsed=[{source:deliveryDraft.source,cargo:deliveryDraft.cargo},...(deliveryDraft.pickups||[])]
    .filter(p=>p.source?.kind==='warehouse'&&String(p.source.id)===String(wh.id))
    .flatMap(p=>p.cargo||[]);
  const requested=stored.filter(c=>String(c.warehouseId)===String(wh.id)).map(c=>c.type);
  if(used.length>=2||used.includes(type)||
     (wh.warehouseInventory||[]).filter(x=>x===type).length<=
     [...requested,...pickupUsed].filter(x=>x===type).length)return;
  drop.warehouseContributions=stored.concat({warehouseId:wh.id,type});
  render();
}
function clearDeliveryDrops(){
if(deliveryDraft&&['route','unload'].includes(deliveryDraft.step)){deliveryDraft.drops=[];deliveryDraft.focusTargetId=null;render();}
}
function deliveryPlan(){
return {playerId:deliveryDraft.playerId,arrestWorkerId:deliveryDraft.arrestWorkerId||null,source:{...deliveryDraft.source},haulerId:deliveryDraft.haulerId,cargo:[...deliveryDraft.cargo],pickups:(deliveryDraft.pickups||[]).map(p=>({source:{...p.source},routeIndex:p.routeIndex,cargo:[...p.cargo]})),route:[...deliveryDraft.route],drops:(deliveryDraft.drops||[]).filter(d=>d.materials.length).map(d=>({kind:d.kind,id:d.id,routeIndex:d.routeIndex,materials:[...d.materials],...(d.goodsSourceIds?{goodsSourceIds:[...d.goodsSourceIds]}:{}),...(d.warehouseContributions?{warehouseContributions:d.warehouseContributions.map(c=>({...c}))}:{})}))};
}
function confirmDeliveryRoute(){
if(!isMobile()||deliveryDraft?.step!=='route')return;
const targets=deliveryRouteTargets().filter(deliveryRouteTargetCanAcceptAny);
if(!targets.length&&!deliveryDraft.drops.length){showToast('Маршрут должен проходить через место разгрузки');return;}
const cost=deliveryPlanCost(state,deliveryDraft);
if(!cost){showToast('Маршрут недопустим');return;}
if(state.players[deliveryDraft.playerId].capital<cost.total){showToast('Недостаточно Капитал для этой доставки');return;}
deliveryDraft.step='unload';
deliveryDraft.focusTargetId=null;
deliveryDraft.listOpen=false;
deliveryDraft.panelExpanded=false;
deliveryDraft.menuOpen=false;
render();
focusDeliveryMap({detail:false});
}
function backToDeliveryRoute(){
if(deliveryDraft?.step!=='unload')return;
deliveryDraft.step='route';deliveryDraft.focusTargetId=null;render();
if(deliveryDraft.route?.length)focusMapOnDistrict(deliveryDraft.route.at(-1));
}
function confirmDelivery(){
if(!deliveryDraft)return;const plan=deliveryPlan(),check=validateDeliveryPlan(state,plan);
if(!check.ok){showToast(({'stolen-lot':'Выкуп возможен только всей партией','illegal-mix':'Нельзя объединить выкуп и контрабанду','arrest-worker':'При ★★★ выберите работника для ареста',unassigned:'Разгрузите весь груз',capital:'Недостаточно денег',capacity:'Превышена вместимость','goods-buyer-capacity':'У покупателя заполнены места для розового товара','source-stock':'Недостаточно ресурсов', 'unload-before-pickup':'Груз разгружен раньше погрузки','duplicate-pickup':'Повторная погрузка из одного источника на той же остановке'}[check.reason])||'Маршрут недопустим: '+check.reason);return;}
const r=executeDelivery(state,plan);if(!r.ok){showToast('Доставка не выполнена: '+r.reason);return;}
deliveryDraft=null;document.body.classList.remove('delivery-active','delivery-route-build','delivery-unload-mode');showToast('Delivery −$'+r.cost.total+(r.completed.length?' · стройка завершена':''));
render();
}
function renderDeliveryPanel(){
const el=$('#deliveryPanel');if(!el)return;
const valid=!!deliveryDraft&&deliveryDraft.playerId===currentDeveloper(state)&&canUseFreeAction(state,deliveryDraft.playerId);
const visible=valid&&state.view==='city';
const mobile=visible&&isMobile(),step=deliveryDraft?.step;
const mapSourceShortcut=$('#deliverySourceToolbarBtn');
if(mapSourceShortcut){
  const available=mobile&&step==='source'&&!deliveryDraft.listOpen&&!e03AidPreview(state).active;
  mapSourceShortcut.hidden=!available;
  mapSourceShortcut.onclick=available?()=>{
    deliveryDraft.listOpen=true;renderDeliveryPanel();
  }:null;
}
document.body.classList.toggle('delivery-active',visible);
document.body.classList.toggle('delivery-route-build',!!(mobile&&step==='route'));
document.body.classList.toggle('delivery-unload-mode',!!(mobile&&step==='unload'));
document.body.classList.remove('delivery-route-compact','delivery-route-expanded');
if(!valid){
document.body.classList.remove('delivery-route-build','delivery-unload-mode');
if(deliveryDraft)deliveryDraft=null;
el.className='delivery-panel';el.innerHTML='';return;
}
if(!visible){
document.body.classList.remove('delivery-route-build','delivery-unload-mode');
el.className='delivery-panel';el.innerHTML='';return;
}
el.className='delivery-panel active'
+(mobile&&step==='source'?' mobile-map-source':'')
+(mobile&&step==='route'?' mobile-route-build':'')
+(mobile&&step==='unload'?' mobile-unload':'')
+(mobile&&step==='unload'&&deliveryDraft.focusTargetId?' unload-target-open':'')
+(mobile&&deliveryDraft.listOpen?' list-open':'');
if(mobile&&step==='source'&&!deliveryDraft.listOpen){
  // Regular mobile logistics is map-first and must not cover factory/source tokens.
  // A separate map-toolbar button opens the same real source list on demand.
  const aid=e03AidPreview(state).active;
  if(!aid){el.className='delivery-panel';el.innerHTML='';return;}
  el.className='delivery-panel active mobile-map-source';
  el.innerHTML='<div class="delivery-head"><div><small>СВОБОДНОЕ ДЕЙСТВИЕ</small><strong>Выберите источник на карте или из списка</strong></div>'+
    '<button id="cancelDelivery" class="delivery-close delivery-cancel-text">Отмена</button></div>'+
    '<div class="delivery-map-prompt"><b>'+(aid?'Помощь E03 · материалы Д / К / С':'Доставка · выбор источника')+'</b>'+
    '<button id="deliveryShowSourceList" type="button" class="ghost-btn">Список источников</button></div>';
  $('#cancelDelivery')?.addEventListener('click',cancelDeliveryFlow);
  $('#deliveryShowSourceList')?.addEventListener('click',()=>{
    deliveryDraft.listOpen=true;renderDeliveryPanel();
  });
  return;
}
const pid=deliveryDraft.playerId,p=state.players[pid];
let html=(mobile&&(step==='route'||step==='unload'))?'':'<div class="delivery-head"><div><small>СВОБОДНОЕ ДЕЙСТВИЕ · ДОСТАВКА</small><strong>'+p.name+'</strong></div><button id="cancelDelivery" class="delivery-close delivery-cancel-text">Отмена</button></div>';
if(step==='source'){
if(mobile&&!deliveryDraft.listOpen){
const availableNodes=LOGISTICS_NODES.filter(n=>(state.logisticsSupply?.[n.id]||[]).length).length;
const availableWarehouses=completedWarehouses(state,pid).filter(w=>warehouseInventory(w).length).length,
      availablePlants=completedIndustrialProducers(state).filter(p=>industrialInventory(p).length).length,
      yard=freightYardInventory(state,pid);
html+='<div class="delivery-map-prompt"><div><b>1. Выберите источник на карте</b><span>Порт, ж/д, исторический поставщик, свой склад, завод или Грузовой двор.</span><small>'+availableNodes+' дешёвых узлов · '+NEUTRAL_MATERIAL_SUPPLIERS.length+' поставщика · '+availableWarehouses+' складов · '+availablePlants+' заводов с запасом</small></div><button id="deliveryShowSourceList" class="ghost-btn">Список</button></div>';
}else{
html+='<div class="delivery-instruction">'+(mobile?'Нажмите источник здесь или вернитесь к карте.':'1. Выберите порт, ж/д станцию или свой склад.')+'</div>';
if(mobile)html+='<button id="deliveryHideSourceList" class="ghost-btn delivery-map-return">← Выбирать на карте</button>';
html+='<div class="delivery-source-grid">';
const stolen=c02Preview(state);
if(stolen?.active){
 html+='<button class="delivery-source-card" data-ds-stolen="'+escapeHtml(stolen.portId)+'"><b>Похищенная партия · $1 за обе</b><span>'+escapeHtml(LOGISTICS_NODES.find(n=>n.id===stolen.portId)?.name||stolen.portId)+'</span><small>'+stolen.materials.map(materialLabel).join(' + ')+' · +1 ★ · обычная Доставка</small></button>';
}
for(const n of LOGISTICS_NODES){
const inv=state.logisticsSupply?.[n.id]||[],cnt=deliveryCounts(inv);
html+='<button class="delivery-source-card" data-ds-node="'+n.id+'" '+(inv.length?'':'disabled')+'><b>'+n.shortName+'</b><span>'+districtById(n.districtId)?.name+' · '+logisticsKindLabel(n.kind)+'</span><small>Д '+(cnt.Lumber||0)+' · К '+(cnt.Masonry||0)+' · С '+(cnt.Steel||0)+' · профиль: '+logisticsProfileText(n)+'</small></button>';
}
for(const supplier of NEUTRAL_MATERIAL_SUPPLIERS){
html+='<button class="delivery-source-card neutral-supplier-source" data-ds-supplier="'+supplier.id+'"><b>'+supplier.shortName+'</b><span>'+districtById(supplier.districtId)?.name+' · '+supplier.historical+'</span><small>'+materialLabel(supplier.resource)+' всегда доступен · $'+supplier.unitPrice+' / ед.</small></button>';
}
for(const w of completedWarehouses(state,pid)){const inv=warehouseInventory(w),cnt=deliveryCounts(inv);html+='<button class="delivery-source-card warehouse-source" data-ds-wh="'+w.id+'" '+(inv.length?'':'disabled')+'><b>Склад</b><span>'+districtById(w.districtId)?.name+' · '+inv.length+'/'+warehouseStorageCapacity(w)+'</span><small>Д '+(cnt.Lumber||0)+' · К '+(cnt.Masonry||0)+' · С '+(cnt.Steel||0)+'</small></button>';}
for(const plant of completedIndustrialProducers(state)){const inv=industrialInventory(plant),cnt=deliveryCounts(inv),capacity=industrialProductionCapacity(state,plant);
const own=plant.playerId===pid,resource=INDUSTRIAL_PRODUCTION[plant.projectId].resource;
const offer=resource==='Steel'?(own?'$1/Steel':'$2/Steel'):own?'$1 за 2 Masonry в одной погрузке (иначе $1/шт.)':'$1/Masonry';
html+='<button class="delivery-source-card warehouse-source" data-ds-plant="'+plant.id+'" '+(inv.length?'':'disabled')+'><b>'+projectById(plant.projectId).name+'</b><span>'+districtById(plant.districtId)?.name+' · '+inv.length+'/'+capacity+' · '+state.players[plant.playerId].name+'</span><small>'+offer+' · '+(own?'свой':'владельцу +$1 за покупку')+' · Д '+(cnt.Lumber||0)+' · К '+(cnt.Masonry||0)+' · С '+(cnt.Steel||0)+'</small></button>';}
const yi=freightYardInventory(state,pid),yc=deliveryCounts(yi);
for(const producer of [...completedBreweries(state),...completedBreadFactories(state)]){
  const isBread=producer.projectId===BREAD_FACTORY_ID,stock=isBread?breadInventory(producer).length:beerInventory(producer).length;
  const cap=isBread?(producer.breadProductionQuantity||2):2;
  html+='<button class="delivery-source-card warehouse-source" data-ds-goods="'+producer.id+'" '+(stock?'':'disabled')+'><b>'+projectById(producer.projectId).name+'</b><span>'+districtById(producer.districtId)?.name+' · владелец '+state.players[producer.playerId].name+'</span><small>'+(isBread?'Хлеб':'Пиво')+': '+stock+'/'+cap+' розовых кубиков · Доставка +$3/кубик</small></button>';
}
for(const wh of completedCustomsWarehouses(state)){const stock=contrabandInventory(wh).length;html+='<button class="delivery-source-card" data-ds-contraband="'+wh.id+'" '+(stock?'':'disabled')+'><b>Таможенный пакгауз</b><span>'+districtById(wh.districtId)?.name+' · владелец '+state.players[wh.playerId].name+'</span><small>Фиолетовых кубиков: '+stock+'/2 · продажа +$6 и +1 ★</small></button>';}
html+='<button class="delivery-source-card freight-yard-source" data-ds-yard="'+FREIGHT_YARD.id+'" '+(yi.length?'':'disabled')+'><b>Грузовой двор</b><span>Western Addition · ваша секция '+yi.length+'/2</span><small>Д '+(yc.Lumber||0)+' · К '+(yc.Masonry||0)+' · С '+(yc.Steel||0)+' · уже оплачено</small></button></div>';
}
}else if(step==='load'){
const src=deliverySourceInfo(state,pid,deliveryDraft.source),haulers=availableDeliveryHaulers(state),sel=haulers.find(h=>h.id===deliveryDraft.haulerId),have=deliveryCounts(src.inventory),used=deliveryCounts(deliveryDraft.cargo);
const totalNeeds=aggregateConstructionNeeds(pid);
html+='<div class="delivery-instruction">2. Перевозчик + груз из <b>'+src.name+'</b>.</div><div class="hauler-grid">';
for(const h of haulers)html+='<button class="hauler-card '+(deliveryDraft.haulerId===h.id?'selected ':'')+(h.available?'':'used')+'" data-hauler="'+h.id+'" '+(h.available?'':'disabled')+'><b>'+h.capacity+'</b><span>мест</span><strong>$'+h.baseCost+'</strong><small>'+(h.limited?(h.available?'разовый':'ИСПОЛЬЗОВАН'):'∞ обычный')+'</small></button>';
html+='</div>'+deliveryConstructionNeedsHtml(pid)+'<div class="load-resource-grid">';
for(const t of CARGO_ORDER){
const left=(have[t]||0)-(used[t]||0),disabled=deliveryDraft.source.kind==='stolen'||!sel||left<=0||deliveryDraft.cargo.length>=sel.capacity||(t===CONTRABAND_CARGO&&deliveryAllCargo(deliveryDraft).includes(CONTRABAND_CARGO));
const srcKind=deliveryDraft.source.kind;
const sourcePrice=srcKind==='industry'?'$'+(deliveryMaterialCost(state,deliveryDraft.source,[...deliveryDraft.cargo,t],pid).cost-deliveryMaterialCost(state,deliveryDraft.source,deliveryDraft.cargo,pid).cost):
  srcKind==='node'?'$'+RESOURCE_PRICES[t]:srcKind==='supplier'?'$'+src.unitPrice:['contraband','goods','stolen'].includes(srcKind)?'$0':'ОПЛАЧЕНО';
const stockText=deliveryDraft.source.kind==='supplier'?'∞ доступно':left+' ост.';
html+='<button class="load-resource '+materialClass(t)+'" data-load="'+t+'" '+(disabled?'disabled':'')+'><span>'+materialShort(t)+'</span><b>'+materialLabel(t)+'</b><strong>'+sourcePrice+'</strong><small>'+stockText+' · нужно '+(totalNeeds[t]||0)+'</small></button>';
}
html+='</div><div class="cargo-box"><b>Груз '+deliveryDraft.cargo.length+'/'+(sel?.capacity||'—')+'</b><span>'+((deliveryDraft.cargo||[]).map(materialShort).join(' · ')||'пусто')+'</span><button id="clearCargo" class="ghost-btn" '+(deliveryDraft.source.kind==='stolen'?'disabled':'')+'>Очистить</button></div>';
if(deliveryDraft.source.kind==='stolen')html+='<small class="delivery-stolen-note">Два кубика — неделимая партия · выкуп $1 · +1 ★ после доставки</small>';
const cost=deliveryDraft.haulerId?deliveryPlanCost(state,{...deliveryDraft,route:[src.districtId]}):null;
html+='<div class="delivery-cost-preview">'+(cost?'Материалы $'+cost.materialCost+' · перевозчик $'+cost.haulerCost+(cost.stolenLotCost?' · выкуп $'+cost.stolenLotCost:''):'Выберите перевозчика')+'</div><div class="delivery-footer"><button id="deliveryBackSource" class="ghost-btn">← Источник</button><button id="deliveryBeginRoute" class="primary-btn" '+(deliveryDraft.haulerId&&deliveryDraft.cargo.length?'':'disabled')+'>К маршруту →</button></div>';
}else if(step==='route'&&mobile){
const cost=deliveryPlanCost(state,deliveryDraft),routeText=deliveryDraft.route.map(shortDistrictName).join(' → ');
const targets=deliveryRouteTargets().filter(deliveryRouteTargetCanAcceptAny);
const canLock=!!cost&&targets.length>0&&p.capital>=cost.total;
html+='<div class="ux3-route-dock">'
+'<div class="ux3-route-copy"><small>🚚 МАРШРУТ</small><strong>'+routeText+'</strong><span>Тапайте зелёные соседние районы на карте</span></div>'
+'<button id="deliveryUndoRoute" class="ux3-route-undo" '+(deliveryDraft.route.length>1?'':'disabled')+'>↶</button>'
+'<div class="ux3-route-price"><small>ИТОГО</small><strong>$'+(cost?.total||0)+'</strong></div>'
+'<button id="deliveryLockRoute" class="primary-btn ux3-route-confirm" '+(canLock?'':'disabled')+'>Подтвердить маршрут</button>'
+'<button id="cancelDelivery" class="ux3-route-cancel">Отмена</button>'
+'</div>'+pickupSelectorHtml()+routeEarlyUnloadHtml();
}else if(step==='unload'&&mobile){
const cost=deliveryPlanCost(state,deliveryDraft),left=deliveryRemaining(),leftTotal=Object.values(left).reduce((a,b)=>a+b,0);
const routeTargets=deliveryRouteTargets(),focus=deliveryDraft.focusTargetId?routeTargets.find(x=>x.id===deliveryDraft.focusTargetId):null;
const canConfirm=leftTotal===0&&validateDeliveryPlan(state,deliveryPlan()).ok;
html+='<div class="ux3-unload-dock '+(focus?'target-open':'')+'">';
if(!focus){
html+='<div class="ux3-unload-copy"><small>РАЗГРУЗКА · МАРШРУТ ЗАФИКСИРОВАН</small><strong>Осталось: Д '+(left.Lumber||0)+' · К '+(left.Masonry||0)+' · С '+(left.Steel||0)+' · Р '+(left.Beer||0)+' · Х '+(left.Bread||0)+' · Ф '+(left.Contraband||0)+'</strong><span>Тапните подсвеченную стройку, торговое здание, пекарню, склад или грузовой двор на карте.</span></div>'
+'<button id="deliveryBackRoute" class="ghost-btn ux3-unload-back">← Маршрут</button>';
const aidOptions=deliveryRouteTargets().filter(t=>t.kind==='e03-aid'&&
  E03_AID_MATERIALS.some(type=>deliveryCanDrop('e03-aid',t.id,type)));
if(aidOptions.length)html+='<div class="delivery-e03-choose">'+
  aidOptions.map(t=>'<button type="button" data-e03-unload-target="'+t.id+'">'+
    '▣ Сдать помощь · '+districtById(t.id).name+'</button>').join('')+'</div>';
const otherTargets=deliveryRouteTargets().filter(t=>t.kind!=='e03-aid'&&deliveryTargetAcceptsAny(t));
if(otherTargets.length){
  html+='<div class="delivery-mobile-target-picker"><button id="deliveryToggleTargetList" type="button" class="ghost-btn">'+
    (deliveryDraft.targetListOpen?'Скрыть точки разгрузки':'Список точек разгрузки ('+otherTargets.length+')')+'</button>';
  if(deliveryDraft.targetListOpen){
    html+='<div class="delivery-mobile-target-list">'+otherTargets.map(t=>{
      const kind=deliveryRouteTargetKind(t),district=districtById(t.districtId)?.name||t.districtId;
      const localIndex=(state.constructions||[]).filter(c=>c.districtId===t.districtId)
        .findIndex(c=>c.id===t.id);
      const number=localIndex>=0?' №'+(localIndex+1):'';
      const label=kind==='warehouse'?'Склад'+number+' · '+warehouseInventory(t).map(materialShort).join(', '):
        kind==='construction'?(projectById(t.projectId)?.name||'Стройка')+number:
        kind==='bakery'?'Пекарня'+number:
        kind==='freight-yard'?'Городской грузовой двор':
        kind==='goods-sale'?(projectById(t.projectId)?.name||'Торговля')+number:
        kind==='contraband-sale'?'Лавка редких товаров'+number:'Точка разгрузки'+number;
      return '<button type="button" data-delivery-unload-target="'+escapeHtml(t.id)+'">'+
        escapeHtml(label+' · '+district)+'</button>';
    }).join('')+'</div>';
  }
  html+='</div>';
}
}else{
let kind=deliveryRouteTargetKind(focus),label='',cap='';
if(kind==='construction'){const pr=projectById(focus.projectId);label=pr.name;cap='Стройка '+((focus.materialsDelivered||[]).length+(deliveryTarget(kind,focus.id)?.materials.length||0))+'/'+pr.materials.length;}
else if(kind==='warehouse'){label='Склад';cap='На складе '+(warehouseInventory(focus).length+(deliveryTarget(kind,focus.id)?.materials.length||0))+'/'+warehouseStorageCapacity(focus);}
else if(kind==='bakery'){label='Пекарня';cap='Дерево '+(bakeryInventory(focus).length+(deliveryTarget(kind,focus.id)?.materials.length||0))+'/1';}
else if(kind==='e03-aid'){label='Фонд помощи · '+districtById(focus.id).name;cap='2 разных материала · +$13, +2 VP, +1 Influence';}
else if(kind==='goods-sale'){label=projectById(focus.projectId).name;cap='Розовые товары '+(goodsBuyerUsed(state,focus)+(deliveryTarget(kind,focus.id)?.materials.length||0))+'/'+goodsBuyerCapacity(focus.projectId)+' за год · +$3 перевозчику';}
else if(kind==='contraband-sale'){label='Лавка редких товаров';cap='Нелегальный сбыт · +$6 и +1 ★';}
else {const yi=freightYardInventory(state,pid),n=(deliveryTarget(kind,focus.id)?.materials.length||0);label='Городской грузовой двор';cap='Ваша секция '+(yi.length+n)+'/2 · '+(yi.length?'аренда активна':'занять +$2');}
const assigned=deliveryTarget(kind,focus.id)?.materials||[];
html+='<div class="ux3-unload-target"><div><small>РАЗГРУЗКА</small><strong>'+label+'</strong><span>'+districtById(focus.districtId)?.name+' · '+cap+'</span><em>Назначено: '+(assigned.map(materialShort).join(' · ')||'—')+'</em></div><div class="drop-buttons">';
for(const t of CARGO_ORDER)html+='<button data-drop-kind="'+kind+'" data-drop-id="'+focus.id+'" data-drop-type="'+t+'" '+(deliveryCanDrop(kind,focus.id,t)?'':'disabled')+'>+'+materialShort(t)+'</button>';
html+='</div>'+(kind==='e03-aid'?e03WarehouseContributionButtons(focus.id):'')+
  '<button id="deliveryCloseTarget" class="ghost-btn">Готово</button></div>';
}
html+='<div class="ux3-unload-footer"><span>Итого <b>$'+(cost?.total||0)+'</b>'+(cost?.yardRentCost?'<small> · аренда $'+cost.yardRentCost+'</small>':'')+'</span><button id="deliveryConfirm" class="primary-btn" '+(canConfirm?'':'disabled')+'>Подтвердить доставку · $'+(cost?.total||0)+'</button><button id="cancelDelivery" class="ux3-route-cancel">Отмена</button></div></div>';
}else{
const cost=deliveryPlanCost(state,deliveryDraft),left=deliveryRemaining(),leftTotal=Object.values(left).reduce((a,b)=>a+b,0),last=deliveryDraft.route.at(-1),next=deliveryNeighbors(last);
const routeTargets=deliveryRouteTargets();
const actionableTargets=routeTargets.filter(deliveryTargetAcceptsAny);
const hasCurrentTarget=actionableTargets.some(con=>con.districtId===last);
const canConfirm=leftTotal===0&&validateDeliveryPlan(state,deliveryPlan()).ok;
html+='<div class="delivery-instruction">'+(hasCurrentTarget?'3. В районе есть подходящая точка разгрузки.':'3. Добавьте соседний район (+$1 за границу).')+'</div><div class="delivery-route-strip">';
deliveryDraft.route.forEach((id,i)=>{html+='<span class="route-chip '+(i===deliveryDraft.route.length-1?'current':'')+'"><b>'+i+'</b>'+shortDistrictName(id)+'</span>'+(i<deliveryDraft.route.length-1?'<span>→</span>':'');});
html+='</div><div class="delivery-cargo-status"><b>Не распределено:</b> Д '+(left.Lumber||0)+' · К '+(left.Masonry||0)+' · С '+(left.Steel||0)+' · Р '+(left.Beer||0)+' · Х '+(left.Bread||0)+' · Ф '+(left.Contraband||0)+'</div><div class="delivery-targets" id="deliveryTargets">';
for(const con of routeTargets){
let kind=deliveryRouteTargetKind(con),label='',cap='';
if(kind==='construction'){const pr=projectById(con.projectId);label=pr.name;cap='Стройка '+((con.materialsDelivered||[]).length+(deliveryTarget(kind,con.id)?.materials.length||0))+'/'+pr.materials.length;}
else if(kind==='warehouse'){label='Склад';cap='На складе '+(warehouseInventory(con).length+(deliveryTarget(kind,con.id)?.materials.length||0))+'/'+warehouseStorageCapacity(con);}
else if(kind==='bakery'){label='Пекарня';cap='Дерево '+(bakeryInventory(con).length+(deliveryTarget(kind,con.id)?.materials.length||0))+'/1';}
else if(kind==='e03-aid'){label='Фонд помощи · '+districtById(con.id).name;cap='2 разных материала · +$13, +2 VP, +1 Influence';}
else if(kind==='goods-sale'){label=projectById(con.projectId).name;cap='Розовые товары '+(goodsBuyerUsed(state,con)+(deliveryTarget(kind,con.id)?.materials.length||0))+'/'+goodsBuyerCapacity(con.projectId)+' за год · +$3 перевозчику';}
else if(kind==='contraband-sale'){label='Лавка редких товаров';cap='Нелегальный сбыт · +$6 и +1 ★';}
else {const yi=freightYardInventory(state,pid),n=(deliveryTarget(kind,con.id)?.materials.length||0);label='Городской грузовой двор';cap='Ваша секция '+(yi.length+n)+'/2 · '+(yi.length?'аренда активна':'занять +$2');}
const assigned=deliveryTarget(kind,con.id)?.materials||[];
html+='<div class="delivery-target-card"><b>'+label+'</b><span>'+districtById(con.districtId)?.name+' · '+cap+'</span><small>Назначено: '+(assigned.map(materialShort).join(' · ')||'—')+'</small><div class="drop-buttons">';
for(const t of CARGO_ORDER)html+='<button data-drop-kind="'+kind+'" data-drop-id="'+con.id+'" data-drop-type="'+t+'" '+(deliveryCanDrop(kind,con.id,t)?'':'disabled')+'>+'+materialShort(t)+'</button>';
html+='</div>'+(kind==='e03-aid'?e03WarehouseContributionButtons(con.id):'')+'</div>';
}
if(!routeTargets.length)html+='<div class="delivery-target-empty">На маршруте пока нет подходящей точки разгрузки.</div>';
html+='</div>'+pickupSelectorHtml()+'<div class="route-continue-label"><b>ЕХАТЬ ДАЛЬШЕ</b><span>'+(hasCurrentTarget?'Необязательно — только если часть груза нужно отвезти дальше.':'Выберите следующий соседний район.')+'</span></div><div class="route-next-list">';
next.forEach(id=>html+='<button data-route-next="'+id+'" class="route-next-btn">+'+shortDistrictName(id)+' <small>+$1</small></button>');
html+='</div><div class="delivery-route-tools"><button id="deliveryUndoRoute" class="ghost-btn" '+(deliveryDraft.route.length>1?'':'disabled')+'>← район</button><button id="clearDrops" class="ghost-btn">Сбросить разгрузку</button></div>';
html+='<div class="delivery-total"><span>Материалы <b>$'+(cost?.materialCost||0)+'</b></span><span>Перевозчик <b>$'+(cost?.haulerCost||0)+'</b></span><span>Границы <b>$'+(cost?.routeCost||0)+'</b></span><span>Догрузки <b>$'+(cost?.loadingCost||0)+'</b></span>'+(cost?.stolenLotCost?'<span>Выкуп <b>$'+cost.stolenLotCost+'</b></span>':'')+(cost?.yardRentCost?'<span>Аренда <b>$'+cost.yardRentCost+'</b></span>':'')+'<strong>ИТОГО $'+(cost?.total||0)+'</strong></div><div class="delivery-footer"><button id="deliveryBackLoad" class="ghost-btn">← Груз</button><button id="deliveryConfirm" class="primary-btn" '+(canConfirm?'':'disabled')+'>Подтвердить · $'+(cost?.total||0)+'</button></div>';
}
if((deliveryAllCargo(deliveryDraft).includes(CONTRABAND_CARGO)||deliveryDraft.source?.kind==='stolen')&&state.players[pid].suspicion===3&&step==='unload'){
 const available=playerWorkers(state,pid).filter(w=>!w.jailed);
 html+='<label class="delivery-instruction"><b>★★★ · Выберите работника для ареста после незаконной доставки</b><select id="contrabandArrestChoice"><option value="">Выберите работника</option>'+
   available.map(w=>'<option value="'+w.id+'" '+(deliveryDraft.arrestWorkerId===w.id?'selected':'')+'>Работник #'+w.number+'</option>').join('')+'</select></label>';
}
el.innerHTML=html;
$('#contrabandArrestChoice')?.addEventListener('change',e=>{deliveryDraft.arrestWorkerId=e.target.value||null;render();});
$('#cancelDelivery')?.addEventListener('click',cancelDeliveryFlow);
$('#deliveryShowSourceList')?.addEventListener('click',()=>{deliveryDraft.listOpen=true;renderDeliveryPanel();});
$('#deliveryHideSourceList')?.addEventListener('click',()=>{deliveryDraft.listOpen=false;renderDeliveryPanel();focusDeliveryMap({detail:false});});
$$('[data-ds-stolen]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'stolen',id:b.dataset.dsStolen}));
$$('[data-ds-node]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'node',id:b.dataset.dsNode}));
$$('[data-ds-supplier]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'supplier',id:b.dataset.dsSupplier}));
$$('[data-ds-wh]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'warehouse',id:b.dataset.dsWh}));
$$('[data-ds-plant]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'industry',id:b.dataset.dsPlant}));
$$('[data-ds-yard]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'freight-yard',id:b.dataset.dsYard}));
$$('[data-ds-goods]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'goods',id:b.dataset.dsGoods}));
$$('[data-ds-contraband]').forEach(b=>b.onclick=()=>chooseDeliverySource({kind:'contraband',id:b.dataset.dsContraband}));
$$('[data-hauler]').forEach(b=>b.onclick=()=>chooseDeliveryHauler(b.dataset.hauler));
$$('[data-load]').forEach(b=>b.onclick=()=>addDeliveryCargo(b.dataset.load));
$('#clearCargo')?.addEventListener('click',clearDeliveryCargo);
$('#deliveryBackSource')?.addEventListener('click',()=>{deliveryDraft.step='source';deliveryDraft.source=null;deliveryDraft.haulerId=null;deliveryDraft.cargo=[];deliveryDraft.listOpen=false;deliveryDraft.focusTargetId=null;render();focusDeliveryMap({detail:false});});
$('#deliveryBeginRoute')?.addEventListener('click',beginDeliveryRoute);
$$('[data-route-next]').forEach(b=>b.onclick=()=>addDeliveryRouteDistrict(b.dataset.routeNext));
$('#deliveryUndoRoute')?.addEventListener('click',()=>{undoDeliveryRoute();if(isMobile()&&deliveryDraft?.route?.length)focusMapOnDistrict(deliveryDraft.route.at(-1));});
$('#deliveryLockRoute')?.addEventListener('click',confirmDeliveryRoute);
$('#deliveryBackRoute')?.addEventListener('click',backToDeliveryRoute);
$('#deliveryCloseTarget')?.addEventListener('click',()=>{deliveryDraft.focusTargetId=null;render();});
$('#clearDrops')?.addEventListener('click',clearDeliveryDrops);
$$('[data-drop-type]').forEach(b=>b.onclick=()=>addDeliveryDrop(b.dataset.dropKind,b.dataset.dropId,b.dataset.dropType));
$$('[data-e03-warehouse]').forEach(b=>b.onclick=()=>addE03DeliveryStock(b.dataset.e03WarehouseDistrict,b.dataset.e03Warehouse,b.dataset.e03WarehouseType));
$$('[data-e03-unload-target]').forEach(b=>b.onclick=()=>{
  const target=deliveryRouteTargets().find(t=>t.kind==='e03-aid'&&t.id===b.dataset.e03UnloadTarget);
  if(!target||!deliveryTargetAcceptsAny(target))return;
  deliveryDraft.focusTargetId=target.id;render();
});
$('#deliveryToggleTargetList')?.addEventListener('click',()=>{
  deliveryDraft.targetListOpen=!deliveryDraft.targetListOpen;render();
});
$$('[data-delivery-unload-target]').forEach(b=>b.onclick=()=>{
  const target=deliveryRouteTargets().find(t=>t.id===b.dataset.deliveryUnloadTarget);
  if(!target||!deliveryTargetAcceptsAny(target))return;
  deliveryDraft.focusTargetId=target.id;deliveryDraft.targetListOpen=false;render();
});
$('#deliveryShowPickups')?.addEventListener('click',()=>{deliveryDraft.pickupOpen=true;deliveryDraft.routeDropOpen=false;deliveryDraft.focusTargetId=null;render();});
$('#deliveryHidePickups')?.addEventListener('click',()=>{deliveryDraft.pickupOpen=false;deliveryDraft.pickupSource=null;render();});
$$('[data-extra-source-kind]').forEach(b=>b.onclick=()=>chooseExtraPickup(b.dataset.extraSourceKind,b.dataset.extraSourceId));
$$('[data-extra-cargo]').forEach(b=>b.onclick=()=>addExtraPickupCargo(b.dataset.extraCargo));
$('#deliveryShowRouteDrops')?.addEventListener('click',()=>{deliveryDraft.routeDropOpen=true;deliveryDraft.pickupOpen=false;deliveryDraft.pickupSource=null;render();});
$('#deliveryHideRouteDrops')?.addEventListener('click',()=>{deliveryDraft.routeDropOpen=false;deliveryDraft.focusTargetId=null;render();});
$$('[data-early-drop-target]').forEach(b=>b.onclick=()=>{deliveryDraft.focusTargetId=b.dataset.earlyDropTarget;render();});
$('#deliveryBackLoad')?.addEventListener('click',()=>{deliveryDraft.step='load';deliveryDraft.route=[];deliveryDraft.drops=[];deliveryDraft.listOpen=false;deliveryDraft.focusTargetId=null;render();});
$('#deliveryConfirm')?.addEventListener('click',confirmDelivery);
}
function renderDeliveryRouteOverlay(){
const layer=$('#deliveryRouteLayer');if(!layer)return;
if(!['route','unload'].includes(deliveryDraft?.step)||!deliveryDraft.route?.length){layer.innerHTML='';return;}
const pts=deliveryDraft.route.map(id=>DISTRICT_POS[id]).filter(Boolean);let html='';
for(let i=1;i<pts.length;i++)html+='<line class="delivery-route-line" x1="'+pts[i-1][0]+'" y1="'+pts[i-1][1]+'" x2="'+pts[i][0]+'" y2="'+pts[i][1]+'"/>';
pts.forEach((p,i)=>html+='<g class="delivery-route-stop '+(i===pts.length-1?'current':'')+'" transform="translate('+p[0]+' '+p[1]+')"><circle r="17"/><text y="4">'+i+'</text></g>');
layer.innerHTML=html;
}

function newspaperEffectShort(card){
  if(!card)return 'Выпуск отсутствует';
  if(card.id==='E03')return 'По 1 жетону помощи в Outer Richmond и Outer Sunset · 2 разных стройматериала → +$13, +2 VP, +1 Influence';
  if(card.id==='E02')return 'Одна торговая ярмарка на игрока: +$4–6 и +1 VP организатору, +1 Influence владельцу площадки';
  if(card.id==='E01')return '2 арендных контракта первым разным владельцам завершённого нового жилья; выбор +$6 или +1 VP и +1 Influence';
  if(card.id==='C04')return 'Уладить дело: $7 или −3 влияния';
  if(card.id==='C01')return 'Грабители: −$2/район без полиции; рейд +2 VP +1 Influence';
  if(card.id==='C02')return '2 похищенных материала · выкуп всей партии $1 · вернуть +1 VP/+1 Influence или присвоить +1 ★';
  if(card.id==='C03')return 'До City Hall: каждому 1 бесплатная случайная карта за +1 ★; обычные торги сохраняются';
  if(card.id==='F01')return 'Общий сбор: $2 и −1 Вл каждому; при акте: $6 и −1 Вл виновнику';
  if(card.id==='F02')return 'Пожар: −$3 всем; розыск: −1 Вл всем, если не устранены';
  if(card.id==='F03')return 'Один порт закрыт; его материалы перенаправлены, запас города сохранён';
  if(card.id==='H01')return 'Эпидемия: −$2/незащищённый заражённый район; экспедиция +2 VP +1 Influence';
  if(card.id==='H02')return 'Дорога $2/переход до санитарной операции; +3 VP и +1 Influence организатору';
  if(card.id==='H03')return 'Четыре порта: −1 материал при пополнении; всего 13 вместо 17';
  if(card.id==='H04')return 'Пожертвование $10: +4 VP и +2 Influence, без действия рабочего';
  if(card.id==='F04')return 'Предписание: исправить за $4, подкупить за $2 + ★ или потерять $4 и Influence';
  const unit=card.resource==='capital'?'$':card.resource==='influence'?'Влияние ':'ПО ';
  const sign=card.delta>0?'+':'−';
  return sign+(unit==='$'?unit+Math.abs(card.delta):Math.abs(card.delta)+' '+unit.trim())+
    (card.frequency==='perDistrict'?' / район':' / игрока');
}
function newsArchiveText(report){
  if(report?.e03)return 'Западная помощь: '+(report.e03.claims||[]).length+' из 2 заказов выполнено';
  if(report?.e02)return 'Торговая неделя: '+(report.e02.events||[]).length+' мероприятий, неиспользованных прав '+report.e02.unused;
  if(report?.c03){
    const c=report.c03,accepted=(c.decisions||[]).filter(d=>d.choice==='accepted').length;
    return 'Сомнительные разрешения: '+accepted+' принято, '+(c.decisions||[]).filter(d=>d.choice==='declined').length+' отказов';
  }
  if(report?.c02){
    const c=report.c02;
    return 'Похищенный груз: '+(c.status==='returned'?'возвращён':c.status==='kept'?'присвоен':'исход не определён')+
      ' · '+(c.materials||[]).map(materialLabel).join(' + ');
  }
  if(report?.c01||report?.ongoingC01){
    const c=report.c01||report.ongoingC01;
    return 'Грабители: '+(c.resolved?'ликвидированы':'налёты продолжаются')+
      ', штрафов '+(c.entries||[]).filter(e=>e.actual<0).length+
      ', защит '+(c.influenceRewards||[]).length;
  }
  if(report?.h02||report?.ongoingH02){
    const h=report.h02||report.ongoingH02;
    return 'Конюшни: '+(h.resolved?'зараза ликвидирована':'дорога $2/переход')+
      (h.operation?', санитарная операция $'+h.operation.cost+', +3 VP и +'+h.operation.influenceSteps+' Influence':'');
  }
  if(report?.h01||report?.ongoingH01){
    const h=report.h01||report.ongoingH01;
    return 'Эпидемия: '+(h.resolved?'ликвидирована':'радиус '+h.radius)+
      ', штрафов '+(h.entries||[]).filter(x=>x.actual<0).length+
      ', защит '+(h.influenceRewards||[]).length;
  }
  if(report?.h04)return (report.h04.donations||[]).map(d=>
    (state.players[d.playerId]?.name||'Игрок')+': пожертвовано $'+d.cost+
    ', +'+d.vp+' VP, +'+d.influenceSteps+' шага Influence').join('\n')||'Без пожертвований';
  return (report?.entries||[]).map(e=>{
    const names=(e.districtIds||[]).map(id=>districtById(id)?.name||id).join(', ')||'—';
    const player=state.players[e.playerId]?.name||'Игрок '+e.playerId;
    return player+' · '+names+': '+(e.defended?'предотвращено':e.actual===0?'без финансовых изменений':
      (e.actual>0?'+':'')+e.actual+' '+(report.cardId==='E05'?'Влияние/ПО/$':'ед.'));
  }).join('\n');
}
function openNewspaper(index=null){
  newsArchiveIndex=index;newsSheetOpen=true;
  renderNewspaper();
  $('#newsCloseBtn')?.focus();
}
function closeNewspaper(){
  newsSheetOpen=false;newsArchiveIndex=null;
  $('#newsSheet').hidden=true;$('#newsBackdrop').hidden=true;
  document.body.classList.remove('news-sheet-open');
  (isMobile()?$('#callBuildingNode'):$('#newsOpenBtn'))?.focus();
}
function startNewsEmergency(){
  const news=activeNewspaper(state);
  if(!news||news.delta>=0){showToast('Сегодня экстренная защита не нужна');return;}
  if(state.phase!=='development'||state.developmentComplete){showToast('Экстренные меры доступны в фазе развития');return;}
  if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction){showToast('Сначала завершите или отмените текущую операцию');return;}
  newsEmergencyMode=true;newsMapVisible=true;
  state.view='city';
  closeNewspaper();
  render();
  showToast('Выберите представителя, затем район на карте · $1 и основное действие');
  requestAnimationFrame(()=>$('#cityBoardScroll')?.scrollIntoView({behavior:'smooth',block:'center'}));
}
function toggleNewspaperMap(){
  newsMapVisible=!newsMapVisible;
  if(newsMapVisible)state.view='city';
  if(newsSheetOpen)closeNewspaper();
  render();
  if(newsMapVisible)requestAnimationFrame(()=>$('#cityBoardScroll')?.scrollIntoView({behavior:'smooth',block:'center'}));
}
function renderF02MapMarkers(incident){
  // The two markers remain independent and visible on the board even while
  // the newspaper sheet is closed; do not intercept district map interaction.
  $$('.f02-map-marker').forEach(marker=>marker.remove());
  if(!incident||(!incident.firePending&&!incident.manhuntPending))return;
  const group=$$('[data-district]').find(g=>g.dataset.district===incident.districtId);
  const region=group?.querySelector('path');
  if(!group||!region||typeof region.getBBox!=='function')return;
  const bounds=region.getBBox();
  const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
  const positions=[
    {kind:'fire',visible:incident.firePending,symbol:'🔥',x:x-19},
    {kind:'manhunt',visible:incident.manhuntPending,symbol:'🔎',x:x+19}
  ];
  const ns='http://www.w3.org/2000/svg';
  for(const item of positions){
    if(!item.visible)continue;
    const marker=document.createElementNS(ns,'g');
    marker.classList.add('f02-map-marker');
    marker.setAttribute('data-f02-marker',item.kind);
    marker.setAttribute('role','img');
    marker.setAttribute('aria-label',item.kind==='fire'?'Непотушенный пожар':'Поджигатель в розыске');
    const circle=document.createElementNS(ns,'circle');
    circle.setAttribute('cx',item.x);circle.setAttribute('cy',y);circle.setAttribute('r',17);
    circle.classList.add(item.kind==='fire'?'f02-marker-fire':'f02-marker-manhunt');
    const textNode=document.createElementNS(ns,'text');
    textNode.setAttribute('x',item.x);textNode.setAttribute('y',y+6);
    textNode.setAttribute('text-anchor','middle');textNode.textContent=item.symbol;
    textNode.setAttribute('font-size','23');
    marker.append(circle,textNode);group.append(marker);
  }
}
function renderH01MapMarker(epidemic){
  $$('.h01-map-marker').forEach(marker=>marker.remove());
  if(!epidemic?.active)return;
  const group=$$('[data-district]').find(g=>g.dataset.district===epidemic.districtId);
  const path=group?.querySelector('path');
  if(!path||typeof path.getBBox!=='function')return;
  const box=path.getBBox(),ns='http://www.w3.org/2000/svg';
  const circle=document.createElementNS(ns,'circle'),text=document.createElementNS(ns,'text');
  const marker=document.createElementNS(ns,'g');
  marker.classList.add('h01-map-marker');
  marker.setAttribute('role','img');
  marker.setAttribute('aria-label','Очаг эпидемии: '+(districtById(epidemic.districtId)?.name||epidemic.districtId));
  marker.setAttribute('data-h01-marker','source');
  const x=box.x+box.width/2,y=box.y+box.height/2;
  circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',18);
  text.setAttribute('x',x);text.setAttribute('y',y+7);text.setAttribute('text-anchor','middle');
  text.textContent='☣';
  marker.append(circle,text);group.append(marker);
}
function renderH02MapMarker(illness){
  $$('.h02-map-marker').forEach(marker=>marker.remove());
  if(!illness?.active)return;
  const group=$$('[data-district]').find(g=>g.dataset.district===illness.districtId);
  const path=group?.querySelector('path');
  if(!path||typeof path.getBBox!=='function')return;
  const box=path.getBBox(),ns='http://www.w3.org/2000/svg';
  const marker=document.createElementNS(ns,'g');
  const circle=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');
  marker.classList.add('h02-map-marker');marker.setAttribute('role','img');
  marker.setAttribute('data-h02-marker','source');
  marker.setAttribute('aria-label','Очаг болезни лошадей: '+(districtById(illness.districtId)?.name||illness.districtId));
  const other=h01Preview(state),shift=other?.active&&other.districtId===illness.districtId?23:0;
  const x=box.x+box.width/2+shift,y=box.y+box.height/2;
  circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',18);
  label.setAttribute('x',x);label.setAttribute('y',y+7);label.setAttribute('text-anchor','middle');
  label.textContent='♞';marker.append(circle,label);group.append(marker);
}
function renderC02MapMarker(lot){
  $$('.c02-map-marker').forEach(m=>m.remove());
  if(!lot?.active)return;
  const group=$$('[data-district]').find(g=>g.dataset.district===lot.districtId);
  const path=group?.querySelector('path');
  if(!path||typeof path.getBBox!=='function')return;
  const box=path.getBBox(),ns='http://www.w3.org/2000/svg',marker=document.createElementNS(ns,'g');
  const circle=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');
  marker.classList.add('c02-map-marker');marker.setAttribute('data-c02-marker','source');
  marker.setAttribute('role','img');
  marker.setAttribute('aria-label','Похищенная партия: '+(LOGISTICS_NODES.find(n=>n.id===lot.portId)?.name||lot.portId));
  const x=box.x+box.width/2+19,y=box.y+box.height/2-17;
  circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',15);
  label.setAttribute('x',x);label.setAttribute('y',y+6);label.setAttribute('text-anchor','middle');
  label.textContent='▣';marker.append(circle,label);group.append(marker);
}
function renderE03MapTokens(preview){
  const tokenLayer=$('#e03TokenLayer');
  if(!tokenLayer)return;
  tokenLayer.replaceChildren();
  if(!preview?.active)return;
  for(const token of preview.tokens){
    const group=$$('[data-district]').find(g=>g.dataset.district===token.districtId);
    const path=group?.querySelector('path');
    if(!path||typeof path.getBBox!=='function')continue;
    const box=path.getBBox(),ns='http://www.w3.org/2000/svg';
    const marker=document.createElementNS(ns,'g'),circle=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');
    const x=box.x+box.width/2,y=box.y+box.height/2;
    marker.classList.add('e03-map-token');
    if(token.claimed)marker.classList.add('claimed');
    marker.dataset.e03Token=token.districtId;
    marker.setAttribute('role','img');
    marker.setAttribute('aria-label','Помощь '+(districtById(token.districtId)?.name||token.districtId)+
      (token.claimed?' — выполнено':' — 2 разных стройматериала'));
    circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',17);
    label.setAttribute('x',x);label.setAttribute('y',y+6);label.setAttribute('text-anchor','middle');
    label.textContent=token.claimed?'✓':'▣';
    marker.append(circle,label);
    marker.addEventListener('click',event=>{
      if(!token.claimed&&deliveryDraft?.step==='unload'&&deliveryDraft.route?.includes(token.districtId)&&
         deliveryRouteTargets().some(t=>t.kind==='e03-aid'&&t.id===token.districtId)){
        event.stopPropagation();
        deliveryDraft.focusTargetId=token.districtId;render();
      }
    });
    tokenLayer.append(marker);
  }
}
function renderC01MapMarker(incident){
  $$('.c01-map-marker').forEach(marker=>marker.remove());
  if(!incident?.active)return;
  const group=$$('[data-district]').find(g=>g.dataset.district===incident.districtId);
  const path=group?.querySelector('path');
  if(!path||typeof path.getBBox!=='function')return;
  const box=path.getBBox(),ns='http://www.w3.org/2000/svg';
  const marker=document.createElementNS(ns,'g');
  const circle=document.createElementNS(ns,'circle'),label=document.createElementNS(ns,'text');
  marker.classList.add('c01-map-marker');marker.setAttribute('role','img');
  marker.setAttribute('data-c01-marker','source');
  marker.setAttribute('aria-label','Жетон грабителей: '+(districtById(incident.districtId)?.name||incident.districtId));
  const x=box.x+box.width/2,y=box.y+box.height/2;
  circle.setAttribute('cx',x);circle.setAttribute('cy',y);circle.setAttribute('r',18);
  label.setAttribute('x',x);label.setAttribute('y',y+7);label.setAttribute('text-anchor','middle');
  label.textContent='⚔';marker.append(circle,label);group.append(marker);
}
function renderNewspaper(){
  const card=activeNewspaper(state),forecast=newsPreview(state);
  const persistentH01=h01Preview(state),persistentH02=h02Preview(state),persistentC01=c01Preview(state),persistentC02=c02Preview(state);
  const year=1899+state.round;
  const latest=state.newsArchive?.[state.newsArchive.length-1];
  const event=card||((state.finished&&latest)?null:null);
  const stripLabel=$('#newsStripLabel');
  stripLabel.textContent=event
    ?year+' · '+event.category.toUpperCase()+' · '+event.title+' · '+newspaperEffectShort(event)
    :latest?'1906 близко · '+latest.year+' · Итоги: '+latest.title:'Нет выпуска';
  if(persistentH01?.active&&card?.id!=='H01')stripLabel.textContent+=
    ' · ☣ Эпидемия: '+(districtById(persistentH01.districtId)?.name||persistentH01.districtId)+
    ', радиус '+persistentH01.radius;
  if(persistentH02?.active&&card?.id!=='H02')stripLabel.textContent+=' · ♞ Конюшни: дорога $2/переход';
  if(card?.id==='H02'&&persistentH02&&!persistentH02.active)stripLabel.textContent+=' · Кризис ликвидирован';
  if(persistentC01?.active&&card?.id!=='C01')stripLabel.textContent+=' · ⚔ Грабители: '+(districtById(persistentC01.districtId)?.name||persistentC01.districtId);
  if(card?.id==='C01'&&persistentC01&&!persistentC01.active)stripLabel.textContent+=' · Банды ликвидированы';
  if(card?.id==='C02'&&persistentC02)stripLabel.textContent+=' · Порт: '+(LOGISTICS_NODES.find(n=>n.id===persistentC02.portId)?.shortName||persistentC02.portId)+' · '+(persistentC02.status==='available'?'партия доступна':persistentC02.status==='returned'?'возвращена':persistentC02.status==='kept'?'присвоена':'нет двух материалов');
  $('#newsMapBtn').setAttribute('aria-pressed',newsMapVisible?'true':'false');
  $('#newsEmergencyCancel').hidden=!newsEmergencyMode;
  $('#newsEmergencyCancelMobile').hidden=!newsEmergencyMode;
  if(newsEmergencyMode)$('#newsStripLabel').textContent='ЭКСТРЕННЫЕ МЕРЫ: выберите район на карте · $1 + действие';
  const board=$('.city-board');
  board?.classList.toggle('news-map',newsMapVisible);
  const affected=new Set(forecast.threatened),protectedSet=new Set(forecast.protected);
  $$('[data-district]').forEach(g=>{
    const id=g.dataset.district;
    g.classList.toggle('news-threat',(newsMapVisible||['F02','F03','F04'].includes(card?.id))&&affected.has(id));
    g.classList.toggle('news-protected',newsMapVisible&&protectedSet.has(id));
    g.classList.toggle('h01-infected',!!persistentH01?.active&&persistentH01.infectedDistrictIds.includes(id));
    g.classList.toggle('h01-protected',!!persistentH01?.active&&persistentH01.protectedDistrictIds.includes(id));
    g.classList.toggle('c01-threat',!!persistentC01?.active&&persistentC01.threatenedDistrictIds.includes(id));
    g.classList.toggle('c01-protected',!!persistentC01?.active&&persistentC01.protectedDistrictIds.includes(id));
  });
  renderF02MapMarkers(card?.id==='F02'?forecast.f02:null);
  renderH01MapMarker(persistentH01);
  renderH02MapMarker(persistentH02);
  renderC01MapMarker(persistentC01);
  renderC02MapMarker(persistentC02);
  renderE03MapTokens(card?.id==='E03'?forecast.e03:null);
  $('#newsSheet').hidden=!newsSheetOpen;
  $('#newsBackdrop').hidden=!newsSheetOpen;
  document.body.classList.toggle('news-sheet-open',newsSheetOpen);
  if(!newsSheetOpen)return;
  const archive=state.newsArchive||[];
  const archived=newsArchiveIndex==null
    ?(!card&&archive.length?archive[archive.length-1]:null)
    :archive[newsArchiveIndex];
  const issue=archived?null:card;
  const displayed=archived||issue;
  if(!displayed){$('#newsSheetContent').textContent='Выпусков пока нет';return;}
  // Old saved F01 archives record the *former* housing fine, not the new
  // 2026-11-14 levy. Preserve those historical outcomes instead of relabeling.
  const legacyF01Archive=!!(archived?.cardId==='F01'&&!archived.f01);
  const legacyF02Archive=!!(archived?.cardId==='F02'&&!archived.f02);
  const legacyF03Archive=!!(archived?.cardId==='F03'&&!archived.f03);
  const legacyH01Archive=!!(archived?.cardId==='H01'&&!archived.h01);
  const legacyC01Archive=!!(archived?.cardId==='C01'&&!archived.c01);
  const legacyC02Archive=!!(archived?.cardId==='C02'&&!archived.c02);
  const legacyC03Archive=!!(archived?.cardId==='C03'&&!archived.c03);
  const legacyH02Archive=!!(archived?.cardId==='H02'&&!archived.h02);
  const legacyH03Archive=!!(archived?.cardId==='H03'&&!archived.h03);
  const legacyH04Archive=!!(archived?.cardId==='H04'&&!archived.h04);
  const legacyF04Archive=!!(archived?.cardId==='F04'&&!archived.f04);
  const legacyE01Archive=!!(archived?.cardId==='E01'&&!archived.e01);
  const legacyE02Archive=!!(archived?.cardId==='E02'&&!archived.e02);
  const legacyE03Archive=!!(archived?.cardId==='E03'&&!archived.e03);
  const historical=archived&&!legacyE01Archive&&!legacyE02Archive&&!legacyE03Archive&&!legacyF01Archive&&!legacyF02Archive&&!legacyF03Archive&&!legacyH01Archive&&!legacyC01Archive&&!legacyC02Archive&&!legacyC03Archive&&!legacyH02Archive&&!legacyH03Archive&&!legacyH04Archive&&!legacyF04Archive?newsCardByHistory(archived.cardId):null;
  const record=archived?(historical||archived):displayed;
  const rentalNewspaper=!legacyE01Archive&&(record.id==='E01'||record.cardId==='E01');
  const tradeWeekNewspaper=!legacyE02Archive&&(record.id==='E02'||record.cardId==='E02');
  const westernAidNewspaper=!legacyE03Archive&&(record.id==='E03'||record.cardId==='E03');
  const policeAudit=record.id==='C04'||record.cardId==='C04';
  const streetCrimeNewspaper=!legacyC01Archive&&(record.id==='C01'||record.cardId==='C01');
  const stolenCargoNewspaper=!legacyC02Archive&&(record.id==='C02'||record.cardId==='C02');
  const corruptPermitsNewspaper=!legacyC03Archive&&(record.id==='C03'||record.cardId==='C03');
  const fireLevy=!legacyF01Archive&&(record.id==='F01'||record.cardId==='F01');
  const arson=!legacyF02Archive&&(record.id==='F02'||record.cardId==='F02');
  const portFire=!legacyF03Archive&&(record.id==='F03'||record.cardId==='F03');
  const epidemicNewspaper=!legacyH01Archive&&(record.id==='H01'||record.cardId==='H01');
  const horseIllnessNewspaper=!legacyH02Archive&&(record.id==='H02'||record.cardId==='H02');
  const seaQuarantine=!legacyH03Archive&&(record.id==='H03'||record.cardId==='H03');
  const infantCare=!legacyH04Archive&&(record.id==='H04'||record.cardId==='H04');
  const fireAudit=!legacyF04Archive&&(record.id==='F04'||record.cardId==='F04');
  const outcomeRows=archived&&!archived.f04&&!archived.h01&&!archived.c01?(archived.entries||[]).map(e=>{
    const p=state.players[e.playerId]?.name||'Игрок';
    const loc=(e.districtIds||[]).map(id=>districtById(id)?.name||id).join(', ');
    const delta=archived.changes?.[e.playerId];
    const status=arson?'Городское последствие':fireLevy?'Взыскание':e.defended?'Предотвращено':e.actual>0?'Прибыль':e.actual<0?'Потери':'Без изменений';
    return '<li>'+escapeHtml(p)+' · '+escapeHtml(loc)+': <b>'+escapeHtml(status)+'</b>'+
      (e.actual?' ('+(e.actual>0?'+':'')+e.actual+')':'')+'</li>';
  }).join(''):'';
  const remaining=archive.map((r,i)=>'<button type="button" class="'+(archived===r?'active':'')+
    '" data-news-archive="'+i+'">'+r.year+'</button>').join('');
  const group=archived?null:forecast.summary;
  const firePreview=issue?.id==='F01'?forecast.f01:null;
  const fireActions=firePreview&&Number.isInteger(currentDeveloper(state))
    ?f01NoticeOptions(state,currentDeveloper(state)):null;
  const fireStatus=firePreview?.filed
    ?'<li><b>Акт №1 подан.</b> '+escapeHtml(state.players[firePreview.accusedPlayerId]?.name||'Игрок')
      +' · '+escapeHtml(districtById(firePreview.districtId)?.name||firePreview.districtId)
      +' · вклад здания в П: '+firePreview.personalFire+'. '
      +(firePreview.active?'Предписание действует, штраф $6 и −1 Influence.':'Нарушение устранено: предписание снято, вернётся общий сбор.')+'</li>'
    :'<li>Предписание не подано. Каждый инвестор заплатит $2 и −1 Influence в конце года.</li>';
  const fireTargets=issue?.id==='F01'&&!firePreview?.filed
    ?'<div class="news-f01-actions"><strong>Акт о нарушении · одно основное действие</strong>'+
      '<small>Выберите свободного представителя в обычном интерфейсе. Приезжать к зданию не нужно. Заявителю награда не положена.</small>'+
      (fireActions?.targets?.length?'<div class="news-f01-targets">'+fireActions.targets.map(t=>{
        const c=state.constructions.find(c=>c.id===t.constructionId);
        const label=(districtById(t.districtId)?.name||t.districtId)+' · '+
          (projectById(c?.projectId)?.name||c?.projectId)+' · '+(state.players[t.ownerId]?.name||'Игрок')+
          ' · личный П +'+t.personalFire;
        return '<button type="button" data-f01-target="'+escapeHtml(String(t.constructionId))+'" '+
          (fireActions.canFile?'':'disabled')+'>'+escapeHtml(label)+'</button>';
      }).join('')+'</div>':'<p>В районах с максимальным П нет завершённого опасного здания соперника.</p>')+
      (!fireActions?.canFile&&fireActions?.targets?.length?'<small>Подача сейчас недоступна: выберите представителя и используйте свободное основное действие в свой ход.</small>':'')+
      '</div>':'';
  const f02Incident=issue?.id==='F02'?forecast.f02:null;
  const f02Operations=issue?.id==='F02'&&f02Incident
    ?['fire','manhunt'].map(kind=>{
      const done=kind==='fire'?!f02Incident.firePending:!f02Incident.manhuntPending;
      const title=kind==='fire'?'🔥 Потушить пожар':'🔎 Поймать поджигателя';
      const options=Number.isInteger(currentDeveloper(state))
        ?f02OperationOptions(state,currentDeveloper(state),kind):null;
      if(done)return '<section class="news-f02-operation done"><strong>'+title+
        '</strong><small>Операция выполнена — жетон снят. Повторная награда невозможна.</small></section>';
      const services=options?.services||[];
      const choices=services.length?services.map(service=>{
        const building=state.constructions.find(c=>c.id===service.constructionId);
        const name=projectById(building?.projectId)?.name||building?.projectId||'Служба';
        const district=districtById(service.districtId)?.name||service.districtId;
        const owner=state.players[service.ownerId]?.name||'Игрок';
        const explanation=service.cost===null?'Нет дорожного маршрута':
          'Выезд $'+service.cost+' · '+(service.route.length-1)+' переходов';
        const blockReason=!options?.actionAvailable?'Нет свободного основного действия':
          !service.route?'Нет маршрута':
          !service.reachable?'Представитель не достигает службы':
          !service.affordable?'Недостаточно денег':'';
        return '<button type="button" data-f02-kind="'+kind+'" data-f02-service="'+
          escapeHtml(String(service.constructionId))+'" '+(service.available?'':'disabled')+
          '><b>'+escapeHtml(name)+'</b><span>'+escapeHtml(district)+' · '+escapeHtml(owner)+
          '</span><small>'+escapeHtml(explanation)+(blockReason?' · '+escapeHtml(blockReason):'')+'</small></button>';
      }).join(''):'<small>Нет завершённого профильного учреждения. Резервных городских команд нет.</small>';
      return '<section class="news-f02-operation"><strong>'+title+'</strong>'+
        '<small>1 основное действие; +2 VP и +1 шаг Influence организатору. Выберите завершённую собственную или чужую службу в досягаемости представителя.</small>'+
        '<div class="news-f02-services">'+choices+'</div></section>';
    }).join(''):'';
  const f02Panel=issue?.id==='F02'
    ?'<div class="news-f02-panel"><strong>Поджог · D6: '+(f02Incident?.roll||'—')+
      ' · '+escapeHtml(districtById(f02Incident?.districtId)?.name||'место не определено')+'</strong>'+
      '<p>🔥 '+(f02Incident?.firePending?'Пожар не потушен':'Потушен')+
      ' · 🔎 '+(f02Incident?.manhuntPending?'Поджигатель в розыске':'Поджигатель пойман')+'</p>'+
      '<small>Без тушения каждый игрок теряет $3; без поимки каждый теряет 1 шаг Influence. Операции независимы.</small>'+
      f02Operations+'</div>':'';
  const f02Archive=arson&&archived?.f02
    ?'<li><b>Поджог: '+escapeHtml(districtById(archived.f02.districtId)?.name||archived.f02.districtId)+
       ' · D6 '+archived.f02.roll+'</b></li>'+
       '<li>Пожар: '+(archived.f02.fireUnresolved?'не потушен — по $3 со всех':'потушен — штрафа нет')+
       '; розыск: '+(archived.f02.manhuntUnresolved?'поджигатель не пойман — −1 Influence всем':'поимка состоялась — штрафа нет')+'</li>'+
       (archived.f02.actions||[]).map(a=>'<li>'+escapeHtml(state.players[a.playerId]?.name||'Игрок')+
         ' · '+(a.operation==='fire'?'тушение':'поимка')+
         ' · выезд $'+a.cost+' · +2 VP, +'+a.influenceSteps+' Influence</li>').join('')
    :'';
  const f03Incident=issue?.id==='F03'?forecast.f03:null;
  const f03PortName=LOGISTICS_NODES.find(n=>n.id===f03Incident?.portId)?.name||'не определён';
  const f03RecipientRows=f03Incident
    ?['pacificmail','chinabasin','broadway','unioniron'].filter(id=>id!==f03Incident.portId).map(id=>{
      const node=LOGISTICS_NODES.find(n=>n.id===id);
      const transferred=f03Incident.allocations.filter(a=>a.toPortId===id);
      const current=state.logisticsSupply?.[id]||[];
      return '<li>'+escapeHtml(node?.name||id)+' · перенаправлено +'+transferred.length+
        ' · осталось '+current.length+' куб.</li>';
    }).join('')
    :'';
  const f03Panel=issue?.id==='F03'
    ?'<div class="news-f03-panel"><strong>🔥 Закрыт порт: '+escapeHtml(f03PortName)+
      ' · D6: '+(f03Incident?.roll||'—')+'</strong>'+
      '<p>Его запас этого года перенаправлен в три работающих порта; никакого штрафа или отдельного действия.</p>'+
      '<p>Перенаправлено '+(f03Incident?.redistributed??0)+' куб. · Южная железная дорога не затронута.</p>'+
      '<ul>'+f03RecipientRows+'</ul>'+
      '<small>Цифры «осталось» учитывают выполненные в этом году доставки.</small></div>':'';
  const f03Archive=portFire&&archived?.f03
    ?'<li><b>Пострадал '+escapeHtml(LOGISTICS_NODES.find(n=>n.id===archived.f03.portId)?.name||archived.f03.portId)+
      ' · D6 '+archived.f03.roll+'</b></li>'+
      '<li>Перенаправлено '+archived.f03.redistributed+
      ' куб. без потерь и дополнительных штрафов.</li>'+
      ['pacificmail','chinabasin','broadway','unioniron'].filter(id=>id!==archived.f03.portId).map(id=>
        '<li>'+escapeHtml(LOGISTICS_NODES.find(n=>n.id===id)?.name||id)+': +'+
        (archived.f03.allocations||[]).filter(a=>a.toPortId===id).length+' куб.</li>').join('')
    :'';
  const h03Active=issue?.id==='H03'?forecast.h03:null;
  const h03Panel=issue?.id==='H03'
    ?'<div class="news-f03-panel news-h03-panel"><strong>⚕️ Карантин портов · '+
      (h03Active?.applied?'Поставки сокращены':'Старое сохранение: запасы сохранены')+'</strong>'+
      '<p>Broadway 2/3 · Pacific Mail 3/4 · China Basin 3/4 · Potrero Point 1/2. Southern Pacific 4/4.</p>'+
      '<p>'+(h03Active?.applied?'Сгенерировано 13 вместо 17 кубиков. Материалы не изымались из действующих запасов.':
        'Событие было активно до обновления прототипа: существующие запасы и покупки не пересчитываются.')+'</p>'+
      '<small>Изменяются только новые поставки этого года. Никаких штрафов и дополнительных действий.</small></div>':'';
  const h03Archive=seaQuarantine&&archived?.h03
    ?'<li>'+(archived.h03.applied?'Снабжение портов: −4 кубика при генерации (13 вместо 17).':
      'Существовавшие до обновления запасы сохранены без изъятия.')+'</li>'+
      '<li>Southern Pacific без изменений. Штрафов и дополнительных действий нет.</li>':'';



  const e03Preview=issue?.id==='E03'?forecast.e03:null;
  const e03Developer=currentDeveloper(state);
  const e03Warehouse=issue?.id==='E03'&&Number.isInteger(e03Developer)
    ?e03WarehouseAidOptions(state,e03Developer):null;
  const e03Panel=issue?.id==='E03'
    ?'<section class="news-e03-panel"><strong>Помощь западным семьям · 2 жетона</strong>'+
      '<p><b>Outer Richmond</b> и <b>Outer Sunset</b> — по одному заказу. Два разных материала из Д / К / С за <b>+$13, +2 VP и +1 Influence</b> одновременно. Не больше одного жетона на игрока. Сдача через обычную Доставку или со своего готового склада в районе, без основного действия.</p>'+
      '<div class="news-e03-tokens">'+e03Preview.tokens.map(token=>{
        const claimant=e03Preview.claims.find(c=>c.districtId===token.districtId);
        const opt=e03Warehouse?.tokens.find(t=>t.districtId===token.districtId);
        return '<section class="news-e03-token '+(token.claimed?'claimed':'')+'" data-e03-token="'+token.districtId+'">'+
          '<strong>'+escapeHtml(districtById(token.districtId)?.name||token.districtId)+
          (token.claimed?' · выполнен':' · доступен')+'</strong>'+
          (claimant?'<small>'+escapeHtml(state.players[claimant.playerId]?.name||'Игрок')+
            ' · '+claimant.materials.map(materialLabel).join(' + ')+
            ' · +$13, +2 VP, +'+claimant.influenceSteps+' Influence</small>':
            '<small>Сдайте 2 разных материала одной настоящей Доставкой либо уже имеющиеся на местном собственном складе.</small>')+
          (!claimant&&opt?.pairs?.length
            ?'<div class="news-e03-store-pairs">'+opt.pairs.map((pair,i)=>
              '<button type="button" data-e03-store-district="'+token.districtId+'" data-e03-store-pair="'+i+'" '+
                (opt.available?'':'disabled')+'>'+
                'Сдать со склада: '+pair.materials.map(materialLabel).join(' + ')+
                ' · +$13 и +2 VP и +1 Influence</button>').join('')+'</div>':'')+
          '</section>';
      }).join('')+'</div>'+
      '<small>Неиспользованные жетоны исчезнут в конце года. Складская сдача доступна только в ход действующего игрока; транспортировка расходует обычную быструю Доставку.</small>'+
      '</section>':'';
  const e03Archive=westernAidNewspaper&&archived?.e03
    ?((archived.e03.claims||[]).length
      ?archived.e03.claims.map(c=>'<li>'+escapeHtml(state.players[c.playerId]?.name||'Игрок')+
        ' · '+escapeHtml(districtById(c.districtId)?.name||c.districtId)+
        ' · '+c.materials.map(materialLabel).join(' + ')+
        ' · +$13, +2 VP, +'+c.influenceSteps+' Influence</li>').join('')
      :'<li>Ни один заказ помощи не выполнен.</li>')+
      '<li>Снято неиспользованных жетонов: '+archived.e03.unused+'. Дополнительных годовых начислений нет.</li>'
    :'';
  const e02Preview=issue?.id==='E02'?forecast.e02:null;
  const e02Dev=currentDeveloper(state);
  const e02Options=issue?.id==='E02'&&Number.isInteger(e02Dev)?e02TradeOptions(state,e02Dev):null;
  const e02Venues=e02Options?.venues||[];
  const e02VisibleVenues=e02Venues.some(v=>v.reachable)
    ?e02Venues.filter(v=>v.reachable):e02Venues;
  const e02Panel=issue?.id==='E02'
    ?'<div class="news-e02-panel"><strong>Городская торговая неделя · одно мероприятие на игрока</strong>'+
      '<p>Организатор тратит <b>одно основное действие представителя</b> в своём или соседнем районе с готовым Торговым зданием (включая смешанное). За 1 / 2 / 3+ торговых здания в районе: <b>+$4 / +$5 / +$6 и +1 VP</b>. Владелец выбранной площадки: <b>+1 Influence</b>.</p>'+
      '<small>Чужие площадки разрешены, могут повторно использоваться другими игроками. Награда сразу, в конце года новых выплат нет.</small>'+
      ((e02Preview?.events||[]).length
        ?'<ul class="news-e02-events">'+e02Preview.events.map(e=>'<li>'+
          escapeHtml(state.players[e.playerId]?.name||'Игрок')+' · '+
          escapeHtml(districtById(e.districtId)?.name||e.districtId)+
          ' · +$'+e.cash+', +1 VP; '+escapeHtml(state.players[e.venueOwnerId]?.name||'Владелец')+
          ' +'+e.influenceSteps+' Influence</li>').join('')+'</ul>'
        :'<small>Мероприятия ещё не проводились.</small>')+
      (e02Options
        ?'<p><strong>'+escapeHtml(state.players[e02Dev]?.name||'Игрок')+
          (e02Options.used?' · мероприятие уже проведено':
           !e02Options.actionAvailable?' · выберите свободного представителя и основное действие':
           ' · выберите площадку')+'</strong></p>'+
         (e02VisibleVenues.length?'<div class="news-e02-venues">'+e02VisibleVenues.map(v=>
           '<button type="button" data-e02-venue="'+escapeHtml(String(v.constructionId))+'" '+
             (v.available?'':'disabled')+'><b>'+
             escapeHtml(projectById(v.projectId)?.name||v.projectId)+'</b>'+
             '<small>'+escapeHtml(districtById(v.districtId)?.name||v.districtId)+' · '+
             escapeHtml(state.players[v.ownerId]?.name||'Владелец')+' · '+
             v.tradeCount+' Торговых · +$'+v.cash+' и +1 VP · владельцу +1 Influence'+
             (!v.reachable?' · вне радиуса представителя':'')+'</small></button>').join('')+'</div>'
          :'<small>Пока нет готовых торговых зданий. Они могут появиться в этом же году.</small>')+
         (e02Venues.length&&!e02Venues.some(v=>v.reachable)
           ?'<small>Ни одна площадка пока не находится в радиусе выбранного представителя. Выберите другого свободного работника или переместитесь обычным действием.</small>':'')
        :'<p>Площадки доступны в фазе развития, когда активный игрок выбрал представителя.</p>')+
      '</div>':'';
  const e02Archive=tradeWeekNewspaper&&archived?.e02
    ?((archived.e02.events||[]).length
       ?archived.e02.events.map(e=>'<li>'+
         escapeHtml(state.players[e.playerId]?.name||'Игрок')+' провёл торговое мероприятие в '+
         escapeHtml(districtById(e.districtId)?.name||e.districtId)+' · +$'+e.cash+
         ', +'+e.vp+' VP; '+escapeHtml(state.players[e.venueOwnerId]?.name||'Владелец')+
         ' +'+e.influenceSteps+' Influence</li>').join('')
       :'<li>Мероприятия не проводились.</li>')+
      '<li>Неиспользованные права: '+archived.e02.unused+'. Дополнительных годовых выплат нет.</li>'
    :'';
  const e01Preview=issue?.id==='E01'?forecast.e01:null;
  const e01Panel=issue?.id==='E01'
    ?'<div class="news-e01-panel"><strong>Арендные контракты · осталось '+(e01Preview?.remaining??2)+' из 2</strong>'+
      '<p>Первые два разных игрока, завершившие собственное новое жилое здание в этом году, получают по одному контракту. Смешанное Жилое тоже подходит; постройка могла начаться в предыдущем году.</p>'+
      '<p><b>Выбор за каждый контракт:</b> +$6 <b>ИЛИ</b> +1 VP и +1 Influence одновременно. Без дополнительного действия работника. Неиспользованные контракты исчезают в конце года.</p>'+
      ((e01Preview?.claims||[]).length
        ?'<ul class="news-e01-contracts">'+e01Preview.claims.map(c=>
          '<li>'+escapeHtml(state.players[c.playerId]?.name||'Игрок')+' · '+
          escapeHtml(projectById(c.projectId)?.name||c.projectId)+' · '+
          (c.choice==='cash'?'+$6':c.choice==='civic'?'+1 VP и +'+c.influenceSteps+
            ' Influence':'выбор награды ожидается')+'</li>').join('')+'</ul>'
        :'<small>Жетоны пока свободны. Завершение готового жилья сразу резервирует один контракт; выбор награды откроется автоматически.</small>')+
      '</div>':'';
  const e01Archive=rentalNewspaper&&archived?.e01
    ?(archived.e01.claims?.length
      ?archived.e01.claims.map(c=>'<li>'+escapeHtml(state.players[c.playerId]?.name||'Игрок')+
        ' · '+escapeHtml(projectById(c.projectId)?.name||c.projectId)+' · '+
        (c.choice==='cash'?'+$6 аванса':'+1 VP и +'+c.influenceSteps+' Influence')+'</li>').join('')
      :'<li>Ни один арендный контракт не заключён.</li>')+
      '<li>Неиспользованные контракты: '+archived.e01.unused+'. Дополнительных выплат в конце года нет.</li>'
    :'';
  const h04Preview=issue?.id==='H04'?forecast.h04:null;
  const h04Panel=issue?.id==='H04'
    ?'<div class="news-h04-panel"><strong>Детские санитарные пункты · добровольная помощь</strong>'+
      '<p>Каждый игрок может один раз в этом году внести $10: сразу +4 VP и +2 шага Influence. Ни клиника, ни действие рабочего не нужны.</p>'+
      '<div class="news-h04-donors">'+(h04Preview?.options||[]).map(o=>{
        const player=state.players[o.playerId];
        const donation=h04Preview.donations.find(d=>d.playerId===o.playerId);
        const status=o.donated?'Пожертвование сделано · +4 VP, +2 шага Influence':
          !o.active?'Период пожертвований завершён':
          !o.affordable?'Недостаточно денег (нужно $10)':'Доступно · капитал $'+player.capital;
        return '<section class="news-h04-donor '+(o.donated?'done':'')+'" data-h04-owner="'+o.playerId+'">'+
          '<strong>'+escapeHtml(player.name)+'</strong><small>'+escapeHtml(status)+'</small>'+
          (o.donated?'<span>Получено: +4 VP · Influence '+donation.influenceFrom+' → '+donation.influenceTo+'</span>':
            '<button type="button" data-h04-donate="'+o.playerId+'" '+(o.available?'':'disabled')+
              '>Пожертвовать $10 · +4 VP · +2 Influence</button>')+'</section>';
      }).join('')+'</div></div>':'';
  const h04Archive=infantCare&&archived?.h04
    ?((archived.h04.donations||[]).length
      ?archived.h04.donations.map(d=>'<li>'+escapeHtml(state.players[d.playerId]?.name||'Игрок')+
        ': пожертвование $'+d.cost+' · +'+d.vp+' VP · +'+d.influenceSteps+
        ' шага Influence ('+d.influenceFrom+' → '+d.influenceTo+')</li>').join('')
      :'<li>Пожертвований не было. Штрафов нет.</li>')
    :'';
  const f04Preview=issue?.id==='F04'?forecast.f04:null;
  const f04Player=Number.isInteger(currentDeveloper(state))?currentDeveloper(state):null;
  const f04Panel=issue?.id==='F04'
    ?'<div class="news-f04-panel"><strong>Пожарная ревизия · предписания владельцам</strong>'+
      '<small>Одно предписание на игрока. При равном максимальном личном П владелец выбирает цель до городских действий. Новые здания в этом году не проверяются.</small>'+
      (f04Preview?.pendingSelections?'<p class="news-f04-warning">Сначала выберите здания во всех спорных предписаниях — городские действия временно недоступны.</p>':'')+
      ((f04Preview?.notices||[]).length?f04Preview.notices.map(n=>{
        const owner=state.players[n.playerId]?.name||'Игрок';
        const site=state.constructions.find(c=>c.id===n.constructionId);
        const siteName=site?(projectById(site.projectId)?.name||site.projectId):null;
        const location=site?(districtById(site.districtId)?.name||site.districtId):'';
        if(n.status==='choose'){
          return '<section class="news-f04-item"><strong>'+escapeHtml(owner)+' · выбор здания (личный П +'+n.personalFire+')</strong>'+
            '<small>Владелец выбирает одно из одинаково опасных зданий. Выбор окончательный.</small>'+
            '<div class="news-f04-choices">'+n.candidateIds.map(id=>{
              const c=state.constructions.find(x=>x.id===id);
              return '<button type="button" data-f04-owner="'+n.playerId+'" data-f04-choose="'+escapeHtml(String(id))+'">'+
                escapeHtml(projectById(c?.projectId)?.name||c?.projectId||id)+' · '+
                escapeHtml(districtById(c?.districtId)?.name||c?.districtId||'—')+'</button>';
            }).join('')+'</div></section>';
        }
        if(n.status==='closed'){
          return '<section class="news-f04-item done"><strong>'+escapeHtml(owner)+' · предписание закрыто</strong><small>'+
            escapeHtml(siteName)+' · '+escapeHtml(location)+' · '+
            (n.method==='bribe'?'взятка $2, пожарный риск не изменён':n.method==='urgent'?'срочные работы $4, личный П −1':'штатная пожарная модернизация, без доплаты за F04')+
            '</small></section>';
        }
        const options=n.playerId===f04Player?f04NoticeOptions(state,n.playerId):null;
        const urgent='<button type="button" data-f04-urgent="'+n.playerId+'" '+
          (options?.urgent?'':'disabled')+'>Устранить нарушения · $4 + основное действие · П −1</button>';
        const bribe=options?.suspicion===3
          ?'<small>Подозрение ★★★: выберите сотрудника для ареста после незаконного платежа.</small>'+
            options.arrestWorkerIds.map(id=>{
              const w=state.players[n.playerId].workers.find(w=>w.id===id);
              return '<button type="button" data-f04-bribe="'+n.playerId+'" data-f04-arrest="'+escapeHtml(id)+'" '+
                (options.bribe?'':'disabled')+'>Подкупить · $2 + арест представителя #'+(w?.number||'?')+'</button>';
            }).join('')
          :'<button type="button" data-f04-bribe="'+n.playerId+'" '+
            (options?.bribe?'':'disabled')+'>Подкупить инспектора · $2 +1 ★ · быстрое действие</button>';
        return '<section class="news-f04-item"><strong>'+escapeHtml(owner)+' · '+escapeHtml(siteName)+
          ' · '+escapeHtml(location)+' · П +'+n.personalFire+'</strong>'+
          '<small>Не выполнено: в конце года −$4 и −1 Influence. Штатная модернизация через пожарную часть также закрывает предписание.</small>'+
          (options?'<div class="news-f04-choices">'+urgent+bribe+'</div>':
            '<small>Варианты урегулирования доступны этому игроку в его городской ход.</small>')+'</section>';
      }).join(''):'<p>Ни у одного игрока нет завершённого немодернизированного здания с личным П выше нуля. Предписания не выданы.</p>')+
      '</div>':'';
  const f04Archive=fireAudit&&archived?.f04
    ?((archived.f04.notices||[]).length?archived.f04.notices.map(n=>{
      const owner=state.players[n.playerId]?.name||'Игрок';
      const site=state.constructions.find(c=>c.id===n.constructionId);
      const name=projectById(site?.projectId)?.name||n.constructionId;
      const result=n.status==='closed'
        ?(n.method==='bribe'?'закрыто взяткой':n.method==='urgent'?'закрыто срочными работами':'закрыто модернизацией')
        :'не закрыто · списано '+String.fromCharCode(36)+n.capitalPaid+', Influence '+n.influenceSteps;
      return '<li>'+escapeHtml(owner)+' · '+escapeHtml(name)+': '+escapeHtml(result)+'</li>';
    }).join(''):'<li>Предписаний нет, штрафов нет.</li>')
    :'';
  const h01Data=!archived?persistentH01:null;
  const h01Opts=h01Data?.active&&Number.isInteger(currentDeveloper(state))
    ?h01ExpeditionOptions(state,currentDeveloper(state)):null;
  const h01Panel=h01Data&&(h01Data.active||issue?.id==='H01')
    ?'<div class="news-h01-panel"><strong>☣ Эпидемия · D6 '+h01Data.roll+' · '+
      escapeHtml(districtById(h01Data.districtId)?.name||h01Data.districtId)+'</strong>'+
      (h01Data.active
        ?'<p>Радиус '+h01Data.radius+' · заражённых районов '+h01Data.infectedDistrictIds.length+
          ' · незащищённых '+h01Data.exposedDistrictIds.length+
          ' · защищённых '+h01Data.protectedDistrictIds.length+'.</p>'+
         '<small>Каждый год −$2 за заражённый незащищённый район с готовым немедицинским зданием. Клиника защищает себя и соседей, стандартная амбулатория — только свой район. За каждый действительно защищённый район владельцу медицины +1 Influence ежегодно.</small>'+
         '<p>Районы: '+h01Data.infectedDistrictIds.map(id=>
           escapeHtml(districtById(id)?.name||id)).join(', ')+'</p>'+
         '<strong>Санитарная экспедиция · главное действие · +2 VP и +1 Influence</strong>'+
         '<small>Выберите собственную или чужую завершённую клинику в досягаемости выбранного представителя. Представитель остаётся на месте; медицинская группа едет к жетону по дорогам за $'+(h01Opts?.tariff||paidRoadEdgeCost(state))+'/переход.</small>'+
         (h01Opts?.services?.length
           ?'<div class="news-h01-services">'+h01Opts.services.map(service=>{
             const site=state.constructions.find(c=>c.id===service.constructionId);
             const name=projectById(site?.projectId)?.name||site?.projectId||'Медицинская служба';
             const routeText=service.route?service.route.length-1+' переходов · $'+service.cost:'дорога недоступна';
             const reason=!h01Opts.actionAvailable?'Нет свободного главного действия':
               !service.route?'Маршрут закрыт':
               !service.reachable?'Представитель не рядом с клиникой':
               !service.affordable?'Недостаточно денег':'';
             return '<button type="button" data-h01-expedition="'+escapeHtml(String(service.constructionId))+
               '" '+(service.available?'':'disabled')+'><b>'+escapeHtml(name)+'</b>'+
               '<span>'+escapeHtml(districtById(service.districtId)?.name||service.districtId)+' · '+
                 escapeHtml(state.players[service.ownerId]?.name||'Игрок')+'</span>'+
               '<small>'+escapeHtml(routeText)+(reason?' · '+escapeHtml(reason):'')+'</small></button>';
           }).join('')+'</div>'
           :'<p>Нет доступного медицинского учреждения. Постройте клинику или используйте чужую.</p>')+
         (!h01Opts?'<small>Экспедиция доступна в городской ход действующего игрока после выбора представителя.</small>':'')
        :'<p>Эпидемия ликвидирована. Штрафы и медицинские награды больше не начисляются.</p>'+
         (h01Data.operation?'<p>Экспедиция: '+escapeHtml(state.players[h01Data.operation.playerId]?.name||'Игрок')+
           ', выезд $'+h01Data.operation.cost+', +2 VP и +'+h01Data.operation.influenceSteps+' Influence.</p>':''))+
      '</div>':'';
  const h01Past=archived?.h01||archived?.ongoingH01||null;
  const h01Archive=h01Past
    ?'<li>Эпидемия · '+escapeHtml(districtById(h01Past.districtId)?.name||h01Past.districtId)+
      ' · D6 '+h01Past.roll+' · радиус '+h01Past.radius+
      ' · '+(h01Past.resolved?'ликвидирована':'продолжается')+'</li>'+
      (h01Past.operation?'<li>Санитарная экспедиция: '+
        escapeHtml(state.players[h01Past.operation.playerId]?.name||'Игрок')+
        ' · выезд $'+h01Past.operation.cost+' · +2 VP и +'+h01Past.operation.influenceSteps+' Influence</li>':'')+
      (h01Past.entries||[]).map(e=>'<li>'+escapeHtml(state.players[e.playerId]?.name||'Игрок')+
        ' · '+escapeHtml(districtById(e.districtIds[0])?.name||e.districtIds[0])+
        ': '+(e.defended?'защищено':'уплачено $'+(-e.actual))+'</li>').join('')+
      (h01Past.influenceRewards||[]).map(e=>'<li>'+
        escapeHtml(state.players[e.playerId]?.name||'Игрок')+' · защита '+
        escapeHtml(districtById(e.districtId)?.name||e.districtId)+
        ' · +'+e.steps+' Influence</li>').join(''):'';
  const h02Data=!archived?persistentH02:null;
  const h02Opts=h02Data?.active&&Number.isInteger(currentDeveloper(state))
    ?h02ExpeditionOptions(state,currentDeveloper(state)):null;
  const h02Panel=h02Data&&(h02Data.active||issue?.id==='H02')
    ?'<div class="news-h02-panel"><strong>♞ Зараза в конюшнях · D6 '+h02Data.roll+' · '+
      escapeHtml(districtById(h02Data.districtId)?.name||h02Data.districtId)+'</strong>'+
      (h02Data.active
        ?'<p>По всему городу: <b>$2 за каждый платный дорожный переход</b> в доставках и выездах служб. Локальное движение представителей не дорожает.</p>'+
         '<small>Кризис остаётся и при следующем выпуске газеты. Клиники не устраняют его автоматически. Никаких дополнительных годовых штрафов.</small>'+
         '<strong>Санитарная операция · 1 основное действие · +3 VP и +1 Influence</strong>'+
         '<small>Выберите свою или чужую завершённую клинику в досягаемости представителя. Медицинская группа едет по дорогам за $2/переход; рабочий остаётся на месте.</small>'+
         (h02Opts?.services?.length
           ?'<div class="news-h02-services">'+h02Opts.services.map(service=>{
             const site=state.constructions.find(c=>c.id===service.constructionId);
             const name=projectById(site?.projectId)?.name||site?.projectId||'Медицинская служба';
             const routeText=service.route?service.route.length-1+' переходов · $'+service.cost:'дорога недоступна';
             const reason=!h02Opts.actionAvailable?'Нет свободного главного действия':
               !service.route?'Маршрут закрыт':
               !service.reachable?'Представитель не рядом с клиникой':
               !service.affordable?'Недостаточно денег':'';
             return '<button type="button" data-h02-expedition="'+escapeHtml(String(service.constructionId))+
               '" '+(service.available?'':'disabled')+'><b>'+escapeHtml(name)+'</b>'+
               '<span>'+escapeHtml(districtById(service.districtId)?.name||service.districtId)+' · '+
                 escapeHtml(state.players[service.ownerId]?.name||'Игрок')+'</span>'+
               '<small>'+escapeHtml(routeText)+(reason?' · '+escapeHtml(reason):'')+'</small></button>';
           }).join('')+'</div>'
           :'<p>Нет доступного медицинского учреждения. Постройте клинику или используйте чужую.</p>')+
         (!h02Opts?'<small>Операция доступна в городской ход действующего игрока после выбора представителя.</small>':'')
        :'<p>Зараза ликвидирована. Дорожный тариф вновь $1/переход.</p>'+
         (h02Data.operation?'<p>Операция: '+escapeHtml(state.players[h02Data.operation.playerId]?.name||'Игрок')+
           ' · дорога $'+h02Data.operation.cost+' · +3 VP и +'+h02Data.operation.influenceSteps+' Influence.</p>':''))+
      '</div>':'';
  const h02Past=archived?.h02||archived?.ongoingH02||null;
  const h02Archive=h02Past
    ?'<li>Зараза в конюшнях · '+escapeHtml(districtById(h02Past.districtId)?.name||h02Past.districtId)+
      ' · D6 '+h02Past.roll+' · '+(h02Past.resolved?'ликвидирована':'продолжается, тариф $2/переход')+'</li>'+
      (h02Past.operation?'<li>Санитарная операция: '+
        escapeHtml(state.players[h02Past.operation.playerId]?.name||'Игрок')+
        ' · дорога $'+h02Past.operation.cost+' · +3 VP, +'+h02Past.operation.influenceSteps+' Influence</li>':'')
    :'';
  const c03Offer=issue?.id==='C03'?c03CurrentOffer(state):null;
  const c03Pending=c03Offer&&!c03Offer.completed;
  const c03Decisions=c03Offer?.decisions||[];
  const c03Panel=issue?.id==='C03'
    ?'<section class="news-c03-panel"><strong>ПЕРЕД CITY HALL · СЛУЧАЙНЫЙ ПРОЕКТ</strong>'+
      '<p>Каждый игрок может один раз взять верхнюю карту из обычной закрытой колоды проектов. Бесплатно, без действия представителя, +1 ★. Отказ — без подозрения.</p>'+
      '<p>Рука не более '+HAND_LIMIT+' проектов. Обычные заявки, городские цели и ставки остаются доступными.</p>'+
      (c03Offer
        ?'<p><b>Решений: '+c03Decisions.length+'/'+c03Offer.order.length+'</b>'+
         (c03Pending?' · следующий: '+escapeHtml(state.players[c03Offer.order[c03Offer.cursor]]?.name||'Игрок'):
          ' · все решения получены')+
         ' · колода '+state.deck.length+'</p>'+
         '<ul>'+c03Decisions.map(d=>'<li>'+
            escapeHtml(state.players[d.playerId]?.name||'Игрок')+' — '+
            (d.choice==='accepted'?'принято «'+escapeHtml(projectById(d.projectId)?.name||d.projectId)+'», +1 ★':'отказ')+
           '</li>').join('')+'</ul>'
        :'<small>В этом сохранении окно разрешений до City Hall недоступно; завершённые заявки задним числом не меняются.</small>')+
      '<small>При исходных ★★★ после успешного получения карты действуют обычные санкции ареста. Ежегодная проверка подозрения остаётся в конце года.</small></section>':'';
  const c03Past=archived?.c03||null;
  const c03Archive=c03Past
    ?'<li>Перерегистрация сомнительных разрешений: '+
       c03Past.decisions.filter(d=>d.choice==='accepted').length+' принятых, '+
       c03Past.decisions.filter(d=>d.choice==='declined').length+' отказов</li>'+
       c03Past.decisions.map(d=>'<li>'+escapeHtml(state.players[d.playerId]?.name||'Игрок')+
         ': '+(d.choice==='accepted'?'проект «'+escapeHtml(projectById(d.projectId)?.name||d.projectId)+'», +1 ★':'отказ')+
         '</li>').join('')+
       (c03Past.legacyMissed?'<li>Историческая партия без окна C03 до мэрии; старые заявки не изменены.</li>':'')
    :'';
  const c02Data=!archived&&persistentC02?.round===state.round?persistentC02:null;
  const c02Player=Number.isInteger(currentDeveloper(state))?currentDeveloper(state):null;
  const c02Return=c02Data?.active&&c02Player!=null?c02ReturnOptions(state,c02Player):null;
  const c02CanDeliver=!!c02Data?.active&&c02Player!=null&&canUseFreeAction(state,c02Player)&&
    state.lastDeliveryKey!==currentDeliveryKey(state,c02Player)&&
    state.players[c02Player].capital>=1&&state.players[c02Player].workers.some(w=>!w.jailed)&&
    !deliveryDraft&&!state.pendingConstruction&&!state.pendingWorkerAction;
  const c02PortName=LOGISTICS_NODES.find(n=>n.id===c02Data?.portId)?.name||c02Data?.portId||'порт';
  const c02Panel=c02Data
    ?'<div class="news-c02-panel"><strong>▣ Похищена партия · D6 '+c02Data.roll+' · '+escapeHtml(c02PortName)+'</strong>'+
      (c02Data.materials.length
        ?'<p class="news-c02-cubes">2 материала: <b>'+c02Data.materials.map(t=>escapeHtml(materialLabel(t))).join(' + ')+'</b></p>'
        :'<p>В выбранном порту осталось меньше двух материалов.</p>')+
      (c02Data.status==='available'
        ?'<strong>Выкуп — $1 за всю партию</strong>'+
         '<div class="news-c02-options">'+
         '<button type="button" data-c02-return '+(c02Return?.available?'':'disabled')+'><b>Вернуть городу</b><small>Основное действие в районе порта · $1 · +1 VP и +1 Influence'+
           (c02Return&&!c02Return.available?' · '+
             (!c02Return.actionAvailable?'Нет свободного основного действия':
              !c02Return.reachable?'Представитель не достигает порта':'Недостаточно денег'):'')+'</small></button>'+
         '<button type="button" data-c02-keep '+(c02CanDeliver?'':'disabled')+'><b>Оставить себе · начать Доставку</b><small>Загрузить оба материала в повозку из этого порта · выкуп $1 · +1 ★'+
           (!c02CanDeliver?' · Нужна свободная Доставка, деньги и незаключённый сотрудник':'')+'</small></button></div>'+
         '<small>Выкуп неделим; стоимость повозки, дорог и разгрузки оплачивается по обычным правилам. При ★★★ перед завершением доставки потребуется выбрать сотрудника для ареста.</small>'
        :c02Data.status==='returned'
        ?'<p>Груз возвращён в исходный порт. Организатор получил +1 VP и +1 Influence.</p>'
        :c02Data.status==='kept'
        ?'<p>Партия выкуплена и перевезена. Организатор получил +1 ★; повторная покупка закрыта.</p>'
        :'<small>Недостаток исходного запаса: изъятие не произошло. Правило для такого случая ещё не утверждено; система ничего не генерирует и не перебрасывает D6.</small>')+
      '</div>':'';
  const c02Past=archived?.c02||null;
  const c02Archive=c02Past
    ?'<li>Похищенная партия · '+escapeHtml(LOGISTICS_NODES.find(n=>n.id===c02Past.portId)?.name||c02Past.portId)+
      ' · D6 '+c02Past.roll+' · '+(c02Past.materials||[]).map(t=>escapeHtml(materialLabel(t))).join(' + ')+'</li>'+
     '<li>Итог: '+(c02Past.status==='returned'?'материалы возвращены городу':
       c02Past.status==='kept'?'материалы перевезены игроком':
       'груз остался неразрешённым, исход не утверждён')+
       (c02Past.claim?' · '+escapeHtml(state.players[c02Past.claim.playerId]?.name||'Игрок')+' · $1':'')+'</li>'
    :'';
  const c01Data=!archived?persistentC01:null;
  const c01Opts=c01Data?.active&&Number.isInteger(currentDeveloper(state))
    ?c01RaidOptions(state,currentDeveloper(state)):null;
  const c01Panel=c01Data&&(c01Data.active||issue?.id==='C01')
    ?'<div class="news-c01-panel"><strong>⚔ Грабители · D6 '+c01Data.roll+' · '+
      escapeHtml(districtById(c01Data.districtId)?.name||c01Data.districtId)+'</strong>'+
      (c01Data.active
        ?'<p>Под угрозой '+c01Data.threatenedDistrictIds.length+' районов · незащищённых с постройками '+
          c01Data.exposedDistrictIds.length+' · прикрытых полицией '+c01Data.protectedDistrictIds.length+'.</p>'+
         '<p>Зона: '+c01Data.threatenedDistrictIds.map(id=>escapeHtml(districtById(id)?.name||id)).join(', ')+'</p>'+
         '<small>Ежегодно −$2 за каждый незащищённый район, где есть готовое неполицейское здание игрока. Стандартная полиция прикрывает свой район, рыночная также соседние. За каждый район с предотвращённым штрафом владельцу защищающей полиции +1 Influence в конце года; местная имеет приоритет.</small>'+
         '<strong>Полицейский рейд · 1 основное действие · +2 VP и +1 Influence</strong>'+
         '<small>Выберите свою или чужую завершённую полицию в досягаемости представителя. Полиция выезжает по дорогам за $'+(c01Opts?.tariff||paidRoadEdgeCost(state))+'/переход; представитель остаётся на месте. Рейд снимает все угрозы и ежегодные последствия.</small>'+
         (c01Opts?.services?.length
           ?'<div class="news-c01-services">'+c01Opts.services.map(service=>{
             const site=state.constructions.find(c=>c.id===service.constructionId);
             const name=projectById(site?.projectId)?.name||site?.projectId||'Полицейский участок';
             const routeText=service.route?service.route.length-1+' переходов · $'+service.cost:'дорога недоступна';
             const reason=!c01Opts.actionAvailable?'Нет свободного основного действия':
               !service.route?'Нет дорожного маршрута':
               !service.reachable?'Представитель не достигает полиции':
               !service.affordable?'Недостаточно денег':'';
             return '<button type="button" data-c01-raid="'+escapeHtml(String(service.constructionId))+
               '" '+(service.available?'':'disabled')+'><b>'+escapeHtml(name)+'</b>'+
               '<span>'+escapeHtml(districtById(service.districtId)?.name||service.districtId)+' · '+
                 escapeHtml(state.players[service.ownerId]?.name||'Игрок')+'</span>'+
               '<small>'+escapeHtml(routeText)+(reason?' · '+escapeHtml(reason):'')+'</small></button>';
           }).join('')+'</div>'
           :'<p>Нет доступного завершённого полицейского учреждения. Постройте своё или используйте чужое.</p>')+
         (!c01Opts?'<small>Рейд доступен в городской ход действующего игрока после выбора представителя.</small>':'')
        :'<p>Банды ликвидированы. Штрафы и Influence за защиту больше не начисляются.</p>'+
         (c01Data.operation?'<p>Рейд: '+escapeHtml(state.players[c01Data.operation.playerId]?.name||'Игрок')+
           ' · маршрут $'+c01Data.operation.cost+' · +2 VP и +'+c01Data.operation.influenceSteps+' Influence.</p>':''))+
      '</div>':'';
  const c01Past=archived?.c01||archived?.ongoingC01||null;
  const c01Archive=c01Past
    ?'<li>Банды · '+escapeHtml(districtById(c01Past.districtId)?.name||c01Past.districtId)+
      ' · D6 '+c01Past.roll+' · '+(c01Past.resolved?'ликвидированы':'продолжают налёты')+'</li>'+
      (c01Past.operation?'<li>Рейд: '+escapeHtml(state.players[c01Past.operation.playerId]?.name||'Игрок')+
        ' · $'+c01Past.operation.cost+' · +2 VP и +'+c01Past.operation.influenceSteps+' Influence</li>':'')+
      (c01Past.entries||[]).map(e=>'<li>'+escapeHtml(state.players[e.playerId]?.name||'Игрок')+
        ' · '+escapeHtml(districtById(e.districtIds[0])?.name||e.districtIds[0])+
        ': '+(e.defended?'защищено':'уплачено $'+(-e.actual))+'</li>').join('')+
      (c01Past.influenceRewards||[]).map(e=>'<li>'+
        escapeHtml(state.players[e.playerId]?.name||'Игрок')+' · защита '+
        escapeHtml(districtById(e.districtId)?.name||e.districtId)+
        ' · +'+e.steps+' Influence</li>').join(''):'';
  const projections=issue?.id==='E03'
    ?'<li>2 разных материала, реальный маршрут или свой завершённый склад. Никаких частичных выплат.</li>'
    :issue?.id==='E02'
    ?'<li>Одно основное действие на игрока. Торговые здания считаются при проведении мероприятия, не при выходе газеты.</li>'
    :issue?.id==='E01'
    ?'<li>Два контракта первым разным владельцам завершённого нового жилья. Награда начисляется при выборе после завершения.</li>'
    :issue?.id==='C03'
    ?'<li>Перед заявками City Hall каждый игрок может получить 1 случайный проект за +1 ★. Не заменяет обычное участие в торгах и не расходует работников.</li>'
    :issue?.id==='C02'
    ?'<li>Выкуп только обеих единиц за $1. Законный возврат в том же порту либо присвоение через обычную Доставку.</li>'
    :issue?.id==='C01'
    ?'<li>Один жетон на D6, угроза своему и соседним районам. Рейд снимает всё событие. Без рейда ежегодные последствия повторяются.</li>'
    :issue?.id==='H01'
    ?'<li>Один очаг, радиус +1 в начале каждого последующего года. Санитарная экспедиция снимает все последствия.</li>'
    :issue?.id==='H02'
    ?'<li>Общегородской тариф $2/переход до единственной санитарной операции, в том числе после смены газеты.</li>'
    :issue?.id==='H04'
    ?'<li>Добровольный взнос не расходует рабочих или действия. Каждый инвестор может участвовать один раз.</li>'
    :issue?.id==='F04'
    ?'<li>Внеплановая проверка назначает не более одного предписания владельцу, с тремя способами разрешения.</li>'
    :issue?.id==='H03'
    ?'<li>'+(h03Active?.applied?'Четыре морских узла получили на один кубик меньше; Southern Pacific без изменений.':
      'Запас старой активной партии оставлен без изменения.')+'</li>'
    :issue?.id==='F03'
    ?'<li>Закрыт '+escapeHtml(f03PortName)+
      ' (D6 '+(f03Incident?.roll||'—')+'); доставка с него недоступна до следующего пополнения.</li>'
    :issue?.id==='F02'
    ?'<li>Пожар '+(f02Incident?.firePending?'требует тушения':'потушен')+
      '; розыск '+(f02Incident?.manhuntPending?'продолжается':'завершён')+'.</li>'
    :issue?.id==='F01'
    ?'<li>Максимальный текущий П: '+firePreview.maxFireRisk+'. Районы: '+
      firePreview.highestDistrictIds.map(id=>escapeHtml(districtById(id)?.name||id)).join(', ')+'.</li>'+fireStatus
    :issue?.id==='C04'
    ?'<li>Расследование повышает цену урегулирования дела на текущий год.</li>'
    :issue&&forecast.entries.length
    ?forecast.entries.map(e=>{
      const place=(e.districtIds||[]).map(id=>districtById(id)?.name||id).join(', ');
      const name=state.players[e.playerId]?.name||'Игрок';
      const status=e.defended?'ЗАЩИЩЕНО':e.exposedDistrictIds?.length?'ПОД УГРОЗОЙ':issue.delta>=0?'БОНУС':'—';
      return '<li>'+escapeHtml(place)+' · '+escapeHtml(name)+' · <strong>'+
        status+'</strong></li>';
    }).join('')
    :'<li>Пока нет завершённых построек под действием события. Список обновляется после новых построек.</li>';
  const isEmergencyPossible=!!issue&&!['F01','F02','F03','F04','H01','H02','H03','H04','C01','C02','C03'].includes(issue.id)&&issue.delta<0&&state.phase==='development'&&!state.developmentComplete;
  const targetDescription={
    housing:'Любое жильё',commerce:'Коммерческие здания','industry-logistics':'Фабрики и склады',factory:'Фабрики',
    'shops-club':'Торговые ряды и клубы','warehouse-factory':'Склады и фабрики',
    'bank-insurance-hotel':'Банки, страховые компании и отели',
    'tenement-speculative':'Рабочие и спекулятивные дома',
    'hotel-club-shops':'Отели, клубы, торговые ряды',
    'shops-club-hotel':'Торговые ряды, клубы и отели',
    'port-freight':'Фабрики и склады при портах или ж/д',
    'high-fire':'Здания в районах с П2+',
    service:'Городские службы'
  };
  const defenseDescription={
    firehouse:'Пожарная часть в этом же районе',
    clinic:'Клиника в этом или соседнем районе',
    police:'Полиция в этом или соседнем районе',
    emergency:'Экстренные меры',
  };
  $('#newsSheetContent').innerHTML=
    '<div class="news-issue-year">Сан-Франциско · '+(archived?archived.year:year)+
    ' · '+escapeHtml(record.category||archived?.category||'Газета')+'</div>'+
    '<h3 class="news-headline">'+escapeHtml(record.title)+'</h3>'+
    '<p class="news-editorial">'+escapeHtml(record.article||'Итоги года опубликованы редакцией.')+'</p>'+
    '<div class="news-forecast"><b>'+(archived?'ИТОГ ГОДА':rentalNewspaper?'АРЕНДНЫЕ КОНТРАКТЫ':tradeWeekNewspaper?'ТОРГОВЫЕ МЕРОПРИЯТИЯ':westernAidNewspaper?'ПОМОЩЬ ЗАПАДНЫМ КВАРТАЛАМ':'ПРОГНОЗ НА КОНЕЦ ГОДА')+'</b>'+
    (rentalNewspaper||legacyE01Archive||tradeWeekNewspaper||legacyE02Archive||westernAidNewspaper||legacyE03Archive||policeAudit||fireLevy||arson||portFire||seaQuarantine||infantCare||epidemicNewspaper||horseIllnessNewspaper||streetCrimeNewspaper||stolenCargoNewspaper||corruptPermitsNewspaper||fireAudit||legacyH01Archive||legacyC01Archive||legacyC02Archive||legacyC03Archive||legacyH02Archive||legacyF01Archive||legacyF02Archive||legacyF03Archive||legacyH03Archive||legacyH04Archive||legacyF04Archive?'':'<p>Объекты: '+escapeHtml(targetDescription[record.target]||record.target||'см. журнал')+'.</p>')+
    '<p><strong>'+(archived?'Исходный эффект':'Ожидаемый эффект')+': '+
    escapeHtml(legacyE03Archive?'Архив предыдущей редакции E03 — смотрите фактические начисления ниже':legacyE02Archive?'Архив предыдущей редакции E02 — смотрите фактические начисления ниже':legacyE01Archive?'Архив предыдущей редакции E01 — смотрите фактические начисления ниже':legacyF01Archive?'Архив предыдущей редакции F01 — смотрите фактические списания ниже':legacyF02Archive?'Архив предыдущей редакции F02 — смотрите фактические списания ниже':legacyF03Archive?'Архив предыдущей редакции F03 — смотрите фактические списания ниже':legacyH01Archive?'Архив предыдущей редакции H01 — смотрите фактические списания ниже':legacyC01Archive?'Архив прежней C01 — смотрите фактические списания ниже':legacyC02Archive?'Архив прежней C02 — смотрите фактические списания ниже':legacyC03Archive?'Архив прежней C03 — смотрите фактические списания ниже':legacyH02Archive?'Архив предыдущей редакции H02 — смотрите фактические списания ниже':legacyH03Archive?'Архив предыдущей редакции H03 — смотрите фактические списания ниже':legacyH04Archive?'Архив предыдущей редакции H04 — смотрите фактические потери ниже':legacyF04Archive?'Архив предыдущей редакции F04 — смотрите фактические списания ниже':newspaperEffectShort(record))+'</strong></p>'+
    (fireLevy?'<p>Предписание предъявляется только завершённому зданию соперника с положительным личным П в районе с максимальным П.</p>':'')+
    (record.defense?'<p>Противодействие: '+escapeHtml(defenseDescription[record.defense]||'Не требуется')+
    '. Экстренные меры: $1 и одно главное действие представителя защищают один район.</p>':'')+
    '</div>'+
    (archived?
      '<div class="news-scope"><strong>Реальные результаты</strong><ul class="news-protection-details">'+
      e03Archive+e02Archive+e01Archive+f02Archive+f03Archive+h03Archive+h04Archive+h01Archive+h02Archive+c01Archive+c02Archive+c03Archive+f04Archive+
      (fireLevy?'<li>'+(archived.f01?.mode==='personal'
         ?'Личный штраф: '+escapeHtml(state.players[archived.f01.filed?.accusedPlayerId]?.name||'Игрок')+' ($6 и −1 Influence).'
         :'Общий противопожарный сбор: каждый игрок ($2 и −1 Influence).')+'</li>':'')+
      (outcomeRows||(rentalNewspaper||legacyE01Archive||tradeWeekNewspaper||legacyE02Archive||westernAidNewspaper||legacyE03Archive||infantCare||h01Past||h02Past||c01Past||c02Past||c03Past?'':policeAudit?'<li>Служебная проверка завершена; обычная стоимость восстановлена.</li>':fireAudit?'':'<li>В этом году никто не пострадал.</li>'))+'</ul>'+
      '<p class="news-outcomes">Признание служб: '+(archived.serviceRecognition||[]).map(pid=>state.players[pid]?.name).join(', ')+
      '</p><button type="button" class="news-copy" id="newsCopyOutcome">Копировать итоги года</button></div>'
      :'<div class="news-scope"><strong>'+(westernAidNewspaper?'ЖЕТОНЫ ПОМОЩИ':tradeWeekNewspaper?'ТОРГОВЫЕ МЕРОПРИЯТИЯ':rentalNewspaper?'АРЕНДНЫЕ КОНТРАКТЫ':infantCare?'ПРОГРАММА ПОЖЕРТВОВАНИЙ':'Прогноз по текущей застройке')+'</strong>'+
      (westernAidNewspaper?'<small>Ровно два жетона на год; без бесплатных перевозок, других штрафов или годовой выплаты.</small>':
       tradeWeekNewspaper?'<small>Только основное действие в доступном районе. Награды сразу после мероприятия; пассивной годовой выплаты нет.</small>':
       rentalNewspaper?'<small>Награда только за новые завершения жилья в год E01, после выбора владельца. Ни штрафов, ни автоматических выплат в конце года.</small>':
       portFire?'<small>Узлы портов перераспределены при открытии выпуска; в конце года ничего дополнительно не списывается.</small>':
       seaQuarantine?'<small>Четыре морских узла недополучили по одному материалу при генерации; в конце года штрафов нет.</small>':
       infantCare?'<small>Автоматических штрафов и начислений нет. Награда выдаётся сразу при добровольном взносе.</small>':
       epidemicNewspaper?'<small>Штрафы и медицинские награды начисляются в конце года, если очаг остаётся. Экспедиция устраняет эпидемию целиком.</small>':
        horseIllnessNewspaper?'<small>Тариф $2 за каждый платный переход действует до санитарной операции и сохраняется в следующие годы. Годовых штрафов нет.</small>':
        streetCrimeNewspaper?'<small>Один жетон. Пока не проведён рейд, в конце каждого года −$2 за район с незащищённой собственностью; полиция получает Influence за реально защищённые районы.</small>':
        stolenCargoNewspaper?'<small>Из запаса одного порта на карточку перемещены два физических материала. Покупка только всей партией, $1; дополнительных годовых штрафов нет.</small>':
        corruptPermitsNewspaper?'<small>До заявок City Hall каждый игрок может принять одну случайную карту из обычной колоды и +1 ★, либо отказаться. Основное действие и деньги не нужны. Обычные заявки/аукцион и годовой штраф не меняются.</small>':
       arson?'<small>Два жетона в одном районе; они исчезают независимо после профильной операции.</small>':
       fireAudit?'<small>Выберите цель при равенстве, затем законно устраните нарушения или воспользуйтесь незаконным подкупом.</small>':
       fireLevy?'<small>Без действующего акта — общий сбор для всех. Действующий акт — штраф только владельцу указанного здания.</small>':
       policeAudit?'<small>До конца года: $7 либо −3 шага Influence за −1 ★. Нужна зона полиции; обычные санкции сохраняются.</small>':
       '<small>Районов под угрозой: '+group?.exposed+
      ' · с защитой: '+group?.safe+'. Проверка будет только после всех ходов года.</small>')+
      '<ul class="news-protection-details">'+projections+'</ul>'+e03Panel+e02Panel+e01Panel+c03Panel+c02Panel+c01Panel+h01Panel+h02Panel+fireTargets+f02Panel+f03Panel+h03Panel+h04Panel+f04Panel+'</div>'+
      (isEmergencyPossible?'<button type="button" class="news-emergency-action" id="newsEmergencyStart">'+
       'Экстренные меры → выбрать район на карте ($1 + действие)</button>':'')
    )+
    (!archived&&!rentalNewspaper&&!tradeWeekNewspaper&&!westernAidNewspaper&&!policeAudit&&!fireLevy&&!arson&&!portFire&&!seaQuarantine&&!infantCare&&!epidemicNewspaper&&!horseIllnessNewspaper&&!streetCrimeNewspaper&&!stolenCargoNewspaper&&!corruptPermitsNewspaper&&!fireAudit?'<button type="button" class="news-issue-map-action" id="newsIssueMapToggle">'+(newsMapVisible?'Скрыть зоны на карте':'Показать зоны на карте')+'</button>':'')+
    '<div class="news-archive"><button type="button" class="'+(!archived?'active':'')+
    '" data-news-current="1">'+(card?'ТЕКУЩИЙ ВЫПУСК':'ПОСЛЕДНИЕ ИТОГИ')+'</button>'+remaining+'</div>'+
    '<small style="display:block;color:#715c41">Газетные статьи — художественные игровые тексты, не исторические цитаты.</small>';
  $$('#newsSheetContent [data-e03-store-district]').forEach(button=>button.onclick=()=>{
    const pid=currentDeveloper(state),options=e03WarehouseAidOptions(state,pid);
    const chosen=options.tokens.find(x=>x.districtId===button.dataset.e03StoreDistrict);
    const pair=chosen?.pairs[Number(button.dataset.e03StorePair)];
    if(!pair||deliveryDraft||state.pendingConstruction||state.pendingWorkerAction){
      showToast('Завершите текущую операцию или выберите доступный складской набор');return;
    }
    const r=claimE03WarehouseAid(state,pid,chosen.districtId,pair.contributions);
    showToast(r.ok?'Материалы переданы · +$13, +2 VP, +1 Influence':'Нельзя сдать материалы: '+r.reason);
    render();
  });
  $$('#newsSheetContent [data-e02-venue]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const pid=currentDeveloper(state);
    const r=organizeE02TradeEvent(state,pid,button.dataset.e02Venue);
    if(!r.ok){showToast(r.reason==='already-organized'?'В этом году мероприятие уже проведено':
      r.reason==='worker-range'?'Представитель не достигает площадки':
      'Нужно свободное основное действие и завершённое Торговое здание');render();return;}
    showToast('Торговая неделя: +$'+r.event.cash+', +1 VP · владельцу +'+r.event.influenceSteps+' Influence');
    render();
  });
  $$('#newsSheetContent [data-h04-donate]').forEach(button=>button.onclick=()=>{
    const pid=Number(button.dataset.h04Donate);
    const result=donateH04(state,pid);
    showToast(result.ok?'Пожертвование $10 · +4 VP и +2 Influence':
      result.reason==='already-donated'?'Этот игрок уже пожертвовал':
      result.reason==='capital'?'Не хватает $10':'В этом году пожертвование недоступно');
    render();
  });
  $$('#newsSheetContent [data-f01-target]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction){
      showToast('Завершите или отмените текущую операцию перед подачей акта');return;
    }
    const r=fileF01Notice(state,currentDeveloper(state),button.dataset.f01Target);
    if(!r.ok){showToast(r.reason==='already-filed'?'Акт уже подан другим игроком':
      r.reason==='invalid-target'?'Здание больше не подходит для обвинения':
      'Для акта требуется своё свободное основное действие');render();return;}
    showToast('Предписание предъявлено · основное действие использовано');render();
  });
  $$('#newsSheetContent [data-c02-return]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const r=returnC02Lot(state,currentDeveloper(state));
    showToast(r.ok?'Груз возвращён · +1 VP и +1 Influence':
      r.reason==='capital'?'Нужен $1 для выкупа':
      r.reason==='worker-range'?'Представитель должен быть в порту или рядом':
      r.reason==='already-claimed'?'Партия уже продана':'Возврат недоступен: '+r.reason);
    render();
  });
  $$('#newsSheetContent [data-c02-keep]').forEach(button=>button.onclick=()=>{
    const pid=currentDeveloper(state),lot=c02Preview(state);
    if(!lot?.active||pid==null||deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||
       !canUseFreeAction(state,pid)||state.lastDeliveryKey===currentDeliveryKey(state,pid)||
       state.players[pid].capital<1||!state.players[pid].workers.some(w=>!w.jailed)){
      showToast('Для присвоения нужна доступная обычная Доставка');return;
    }
    closeNewspaper();startDeliveryFlow(pid);
    chooseDeliverySource({kind:'stolen',id:lot.portId});
  });
  $$('#newsSheetContent [data-c01-raid]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const result=completeC01Raid(state,currentDeveloper(state),button.dataset.c01Raid);
    showToast(result.ok?'Банды ликвидированы · +2 VP и +1 Influence':
      result.reason==='capital'?'Недостаточно денег на маршрут рейда':
      result.reason==='worker-range'?'Представитель должен быть рядом с полицейским учреждением':
      result.reason==='already-completed'?'Рейд уже проведён':
      'Рейд недоступен: '+result.reason);
    render();
  });
  $$('#newsSheetContent [data-h02-expedition]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const result=completeH02Expedition(state,currentDeveloper(state),button.dataset.h02Expedition);
    showToast(result.ok?'Зараза устранена · +3 VP и +1 Influence · дороги вновь $1/переход':
      result.reason==='capital'?'Не хватает средств на санитарный маршрут':
      result.reason==='worker-range'?'Представитель должен находиться рядом с медицинским учреждением':
      result.reason==='already-completed'?'Зараза уже устранена':
      'Санитарная операция недоступна: '+result.reason);
    render();
  });
  $$('#newsSheetContent [data-h01-expedition]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const result=completeH01Expedition(state,currentDeveloper(state),button.dataset.h01Expedition);
    showToast(result.ok?'Эпидемия ликвидирована · +2 VP и +1 Influence':
      result.reason==='capital'?'Не хватает средств на санитарный маршрут':
      result.reason==='worker-range'?'Представитель должен находиться рядом с медицинским учреждением':
      result.reason==='already-completed'?'Эпидемия уже устранена':
      'Экспедиция недоступна: '+result.reason);
    render();
  });
  $$('#newsSheetContent [data-f02-kind][data-f02-service]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const result=completeF02Operation(state,currentDeveloper(state),
      button.dataset.f02Kind,button.dataset.f02Service);
    if(!result.ok){showToast(result.reason==='already-completed'?'Операция уже выполнена':
      result.reason==='worker-range'?'Представитель слишком далеко от выбранной службы':
      result.reason==='capital'?'Не хватает денег на выезд':
      'Операция сейчас недоступна');render();return;}
    showToast(button.dataset.f02Kind==='fire'?'Пожар потушен · +2 VP и +1 Influence':
      'Поджигатель пойман · +2 VP и +1 Influence');
    render();
  });
  document.querySelectorAll('#newsSheetContent [data-f04-choose]').forEach(button=>button.onclick=()=>{
    const result=chooseF04Notice(state,Number(button.dataset.f04Owner),button.dataset.f04Choose);
    showToast(result.ok?'Предписание назначено выбранному зданию':'Нельзя выбрать цель: '+result.reason);
    render();
  });
  document.querySelectorAll('#newsSheetContent [data-f04-urgent], [data-f04-bribe]').forEach(button=>button.onclick=()=>{
    if(deliveryDraft||state.pendingConstruction||state.pendingWorkerAction||fireActionDraft||justiceDraft){
      showToast('Сначала завершите или отмените текущую операцию');return;
    }
    const urgent=button.hasAttribute('data-f04-urgent');
    const pid=Number(urgent?button.dataset.f04Urgent:button.dataset.f04Bribe);
    const result=resolveF04Notice(state,pid,urgent?'urgent':'bribe',button.dataset.f04Arrest||null);
    if(!result.ok){
      showToast(result.reason==='capital'?'Недостаточно денег':
        result.reason==='arrest-worker'?'Выберите сотрудника для ареста':
        result.reason==='f04-choice'?'Сначала все владельцы должны выбрать цель':
        'Предписание сейчас нельзя закрыть: '+result.reason);render();return;
    }
    showToast(urgent?'Нарушения устранены: −$4, здание модернизировано':
      result.arrested?'Взятка уплачена: предписание закрыто, сотрудник арестован':
      'Взятка уплачена: предписание закрыто, подозрение +1 ★');
    render();
  });
  $('#newsEmergencyStart')?.addEventListener('click',startNewsEmergency);
  $('#newsIssueMapToggle')?.addEventListener('click',toggleNewspaperMap);
  $('#newsCopyOutcome')?.addEventListener('click',async()=>{
    const txt='THE SAN FRANCISCO CALL · '+archived.year+' · '+archived.title+'\n'+
      JSON.stringify(archived,null,2);
    try{await navigator.clipboard.writeText(txt);showToast('Итоги газеты скопированы');}
    catch{prompt('Скопируйте итоги газеты:',txt);}
  });
  $$('#newsSheetContent [data-news-archive]').forEach(button=>button.onclick=()=>{
    newsArchiveIndex=Number(button.dataset.newsArchive);renderNewspaper();
  });
  $('#newsSheetContent [data-news-current]')?.addEventListener('click',()=>{
    newsArchiveIndex=null;renderNewspaper();
  });
}
function newsCardByHistory(id){
  // Historical cards are in an independent no-side-effect data module.
  return NEWS_CARDS.find(c=>c.id===id)||null;
}

function applyCrimeChoice(playerId,choice,workerId=null){
  const result=resolveAnnualCrimeAssessment(state,playerId,choice,workerId);
  if(result.ok){newsEmergencyMode=false;newsArchiveIndex=null;state.view=result.finished?'city':'hall';showToast(result.finished?'Фаза I завершена':'Годовой штраф учтён; начался следующий год');}
  else if(result.reason==='crime-choice')showToast('Следующий игрок: обязательная проверка');
  else if(result.reason==='upkeep-choice')showToast('Штраф учтён. Не хватает денег на простой — выберите стройку');
  else showToast('Нельзя подтвердить годовой штраф');
  render();
}
function renderYearTransition(){
const sheet=$('#yearTransitionSheet'),backdrop=$('#yearTransitionBackdrop');
if(!sheet||!backdrop)return;
// Mandatory reward decision is presented immediately after the residential
// construction completes; the reserved token cannot be taken by another owner.
const e01Pending=currentE01PendingContract(state);
if(e01Pending){
  sheet.hidden=false;backdrop.hidden=false;document.body.classList.add('year-transition-open');
  const owner=state.players[e01Pending.playerId];
  const name=projectById(e01Pending.projectId)?.name||e01Pending.projectId;
  sheet.innerHTML='<div class="year-transition-card e01-rental-choice" data-e01-pending="'+e01Pending.playerId+'">'+
    '<div class="year-transition-head"><span>THE SAN FRANCISCO CALL · E01</span><h2>Арендный контракт</h2></div>'+
    '<p>'+escapeHtml(owner.name)+' завершил «'+escapeHtml(name)+'» и получил один из двух контрактов работодателей. Выберите <b>ровно одну</b> награду:</p>'+
    '<div class="crime-payment-options"><button type="button" class="primary-btn" data-e01-choice="cash">Получить +$6</button>'+
    '<button type="button" class="secondary-btn" data-e01-choice="civic">Получить +1 VP и +1 Influence</button></div>'+
    '<small>Награда немедленная. Дополнительное действие рабочего и ресурсы не требуются. Другие городские действия доступны после выбора.</small></div>';
  document.querySelectorAll('[data-e01-choice]').forEach(button=>button.onclick=()=>{
    const result=chooseE01Contract(state,e01Pending.playerId,button.dataset.e01Choice);
    if(!result.ok){showToast('Не удалось выбрать контракт: '+result.reason);render();return;}
    showToast(result.record.choice==='cash'?'Арендный аванс: +$6':
      'Контракт: +1 VP и +'+result.record.influenceSteps+' Influence');
    render();
  });
  return;
}
const crime=currentAnnualCrimeAssessment(state);
const bread=currentBreadProductionChoice(state);
if(bread){
  sheet.hidden=false;backdrop.hidden=false;document.body.classList.add('year-transition-open');
  const owner=state.players[bread.playerId];
  const year=1899+state.round,first=state.phase==='development';
  sheet.innerHTML='<div class="year-transition-card bread-production-choice">'
    +'<div class="year-transition-head"><span>'+year+' · ОБЯЗАТЕЛЬНЫЙ ВЫПУСК</span><h2>Паровая хлебопекарная фабрика</h2></div>'
    +'<p>'+owner.name+' · '+districtById(bread.districtId)?.name+'. '+(first?'Завод завершён — выберите первый выпуск сейчас.':'Начало нового года — определите объём выпуска до торговли и заявок в мэрии.')+'</p>'
    +'<p>Весь непроданный хлеб портится в конце года: <b>−1 к постоянному Income</b> за каждый остаток до выплаты. Потеря не восстанавливается, в том числе в 1905 году.</p>'
    +'<div class="crime-payment-options"><button class="primary-btn" data-bread-output="2">Произвести 2 хлеба</button><button class="secondary-btn" data-bread-output="4">Произвести 4 хлеба</button></div>'
    +'<small>Пропустить производство нельзя. Кубики поступают на фабрику сразу после выбора.</small></div>';
  document.querySelectorAll('[data-bread-output]').forEach(button=>button.onclick=()=>{
    const result=chooseBreadProduction(state,bread.id,Number(button.dataset.breadOutput));
    if(result.ok){showToast('Произведено '+result.quantity+' хлеба');render();}
    else showToast('Не удалось выбрать объём производства');
  });
  return;
}
if(crime){
  sheet.hidden=false;backdrop.hidden=false;document.body.classList.add('year-transition-open');
  const player=state.players[crime.playerId],year=1899+state.round;
  const sanction=crime.canPay?null:arrestSanctionPreview(state,crime.playerId);
  const arrestWarning=sanction?.ok?'<p class="crime-arrest-warning" data-crime-arrest-warning="true">Последствие ареста: '+(sanction.vpPenalty?'влияние до 0 и −3 VP':'−3 реальных шага влияния')+(state.round===MAX_ROUNDS?' · в финале 1905 ещё −5 VP за этого заключённого':'')+'. Подозрение сбросится до 0.</p>':'';
  const buttons=crime.canPay
    ? '<div class="crime-payment-options">'
      +(crime.cash?'<button class="primary-btn" data-crime-payment="cash">Заплатить $'+crime.cost+'</button>':'')
      +(crime.influence?'<button class="secondary-btn" data-crime-payment="influence">−'+crime.steps+' '+(crime.steps===1?'шаг':'шага')+' влияния</button>':'')
      +(crime.mixed?'<button class="secondary-btn" data-crime-payment="mixed">$3 и 1 шаг влияния</button>':'')
      +'</div>'
    : '<div class="crime-payment-options">'+crime.unjailed.map(id=>{const w=playerWorkers(state,crime.playerId).find(x=>x.id===id);return '<button class="secondary-btn" data-crime-arrest="'+id+'">Арестовать представителя #'+w.number+(w.used?' · уже использован':'')+'</button>';}).join('')+'</div>';
  sheet.innerHTML='<div class="year-transition-card crime-assessment-card"><div class="year-transition-head"><span>'+year+' · ОБЯЗАТЕЛЬНАЯ ПРОВЕРКА</span><h2>Годовой штраф · '+player.name+'</h2></div>'
   +'<p>Подозрение: <b>'+('★'.repeat(crime.level))+'</b>. '+(crime.canPay?'Выберите один полный вариант оплаты. Арест вместо доступного платежа запрещён.':'Полная оплата невозможна — выберите работника для ареста. Никаких частичных платежей.')+'</p>'
   +'<div class="upkeep-summary"><div><span>Капитал</span><b>$'+player.capital+'</b></div><div><span>Influence</span><b>'+player.influence+'</b></div><div><span>Доступных шагов</span><b>'+crime.availableSteps+'</b></div></div>'
   +arrestWarning+buttons+'<small class="crime-assessment-note">Проверка проводится один раз после газеты, до дохода. При оплате подозрение остаётся прежним; при аресте немедленно сбрасывается до 0.</small></div>';
  $$('[data-crime-payment]').forEach(b=>b.onclick=()=>applyCrimeChoice(crime.playerId,b.dataset.crimePayment));
  $$('[data-crime-arrest]').forEach(b=>b.onclick=()=>applyCrimeChoice(crime.playerId,'arrest',b.dataset.crimeArrest));
  return;
}
const active=state.phase==='upkeep'&&state.yearTransition?.playerId!=null;
sheet.hidden=!active;backdrop.hidden=!active;
document.body.classList.toggle('year-transition-open',active);
if(!active){sheet.innerHTML='<div id="yearTransitionContent"></div>';upkeepSelectedConstructionId=null;return;}
const pid=state.yearTransition.playerId,p=state.players[pid];
const builds=unfinishedConstructions(state,pid);
const due=constructionUpkeepDue(state,pid);
if(upkeepSelectedConstructionId&&!builds.some(c=>c.id===upkeepSelectedConstructionId))upkeepSelectedConstructionId=null;
const cards=builds.map(con=>{
const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id);
const selected=con.id===upkeepSelectedConstructionId;
return '<article class="upkeep-build '+(selected?'selected':'')+'">'+
'<button class="upkeep-build-main" data-upkeep-select="'+con.id+'"><span><b>'+pr.name+'</b><small>'+d.name+' · '+prog.delivered+'/'+prog.required+' материалов</small></span><strong>−$1</strong></button>'+
'<button class="upkeep-map-btn" data-upkeep-focus="'+con.id+'">На карте</button></article>';
}).join('');
const selected=builds.find(c=>c.id===upkeepSelectedConstructionId);
const selectedText=selected?'Закрыть «'+(projectById(selected.projectId)?.name||'стройка')+'» · доставленные материалы будут потеряны, площадка освободится.':'Выберите стройку, которую закрываете из-за нехватки денег.';
sheet.innerHTML='<div class="year-transition-card"><div class="year-transition-head"><span>НАЧАЛО НОВОГО ГОДА</span><h2>Простой незавершённых строек</h2></div>'+
'<div class="upkeep-summary"><div><span>Игрок</span><b>'+p.name+'</b></div><div><span>После income</span><b>$'+p.capital+'</b></div><div><span>Нужно</span><b>$'+due+'</b></div></div>'+
'<p>Income уже начислен. Каждая незавершённая стройка стоит <b>$1</b>. Денег не хватает, поэтому нужно закрыть объект; если после этого денег всё ещё недостаточно, выбор повторится.</p>'+
'<div class="upkeep-build-list">'+cards+'</div>'+
'<div class="upkeep-confirm"><span>'+selectedText+'</span><button id="confirmUpkeepClosure" class="danger-btn" '+(selected?'':'disabled')+'>Закрыть выбранную стройку</button></div></div>';
$$('[data-upkeep-select]').forEach(b=>b.onclick=()=>{upkeepSelectedConstructionId=b.dataset.upkeepSelect;renderYearTransition();});
$$('[data-upkeep-focus]').forEach(b=>b.onclick=()=>{
const con=state.constructions.find(x=>x.id===b.dataset.upkeepFocus);if(!con)return;
upkeepSelectedConstructionId=con.id;focusedConstructionId=con.id;state.selectedDistrictId=con.districtId;state.view='city';
render();requestAnimationFrame(()=>focusMapOnDistrict(con.districtId));
});
$('#confirmUpkeepClosure')?.addEventListener('click',()=>{
if(!upkeepSelectedConstructionId)return;
const r=closeConstructionForUpkeep(state,pid,upkeepSelectedConstructionId);
upkeepSelectedConstructionId=null;focusedConstructionId=null;
if(r.ok){newsEmergencyMode=false;newsArchiveIndex=null;state.view='hall';showToast('Стройка закрыта. Простой оставшихся объектов оплачен; начался новый год.');}
else if(r.reason==='upkeep-choice')showToast('Стройка закрыта, но денег всё ещё не хватает — выберите следующий объект.');
else showToast('Не удалось закрыть стройку');
render();
});
}

function renderSailorRecruitment(){
 const sheet=$('#sailorRecruitmentSheet'),backdrop=$('#sailorRecruitmentBackdrop');
 if(!sheet||!backdrop)return;
 const con=currentSailorRecruitment(state),active=!!con;
 sheet.hidden=!active;backdrop.hidden=!active;
 if(!active){sheet.innerHTML='';return;}
 const owner=state.players[con.playerId],district=districtById(con.districtId);
 const stars=normalizeSuspicion(owner.suspicion),available=playerWorkers(state,con.playerId).filter(w=>!w.jailed);
 const caught=stars===3,illegalEnabled=available.length>0;
 const illegalChoices=caught&&illegalEnabled
   ?'<div class="sailor-arrest-choices"><b>Незаконная вербовка · +$6 → арест</b><small>При ★★★ выберите, кто примет вину. Сначала получите $6, затем подозрение обнулится и применится санкция ареста.</small>'
     +available.map(w=>'<button class="secondary-btn" data-recruit-mode="illegal" data-arrest-worker="'+escapeHtml(w.id)+'">Незаконно · +$6 · арест #'+w.number+'</button>').join('')+'</div>'
   :'<button class="secondary-btn" data-recruit-mode="illegal" '+(illegalEnabled?'':'disabled')+'>Незаконная вербовка · +$6 / +1 ★</button>';
 const note=!illegalEnabled?'Незаконный вариант недоступен: все представители в заключении. Законный найм остаётся доступен.'
   :caught?'Три звезды: следующее преступление после выплаты приведёт к аресту. Сотрудника для ареста выбирает владелец.'
   :'Текущее подозрение: '+('★'.repeat(stars)+'☆'.repeat(3-stars))+' · незаконная вербовка добавит одну звезду; влияние не уменьшается.';
 sheet.innerHTML='<div class="recruitment-card"><small>ПОРТОВОЙ БИЗНЕС · ВЫБОР ВЛАДЕЛЬЦА</small>'+
 '<h2>Матросская ночлежка</h2><p><b>'+owner.name+'</b> · '+district.name+'</p>'+
 '<p>После погрузки в местном порту владелец выбирает найм экипажа. Рабочий не расходуется.</p>'+
 '<div class="recruitment-actions"><button class="primary-btn" data-recruit-mode="lawful">Законный найм · +$2</button>'+
 illegalChoices+'</div><small class="sailor-risk-note">'+note+'</small></div>';
 $$('[data-recruit-mode]').forEach(b=>b.onclick=()=>{
   const r=resolveSailorRecruitment(state,con.id,b.dataset.recruitMode,b.dataset.arrestWorker||null);
   if(!r.ok){showToast(r.reason==='arrest-worker'?'Выберите представителя для ареста':r.reason==='no-free-worker'?'Незаконная вербовка: все работники заключены':'Вербовка сейчас недоступна');return;}
   showToast('Вербовка: +$'+r.capital+(r.arrested?' · арест · подозрение → 0':r.mode==='illegal'?' · подозрение +1 ★':''));
   render();
 });
}
function renderNewProjectDecisions(){
 const ws=$('#workforceLinkSheet'),wb=$('#workforceLinkBackdrop');
 const worker=currentWorkforceLink(state);
 if(ws&&wb){ws.hidden=!worker;wb.hidden=!worker;
  if(worker){const targets=availableWorkforceTargets(state,worker.playerId,worker.districtId,worker.id);
   ws.innerHTML='<div class="recruitment-card"><small>ФАБРИЧНЫЙ КОМПЛЕКС · ЗАВЕРШЕНО</small><h2>Выберите предприятие</h2><p>Рабочий корпус: '+state.players[worker.playerId].name+' · '+districtById(worker.districtId).name+'. Привязка постоянная, один корпус на предприятие. Удваивает доход и выпуск материалов.</p><div class="recruitment-actions">'+targets.map(c=>'<button class="primary-btn" data-workforce-target="'+c.id+'">'+projectById(c.projectId).name+' · доход $'+((projectById(c.projectId).income||0)+canneryIncomeBonus(state,c))+' → $'+2*((projectById(c.projectId).income||0)+canneryIncomeBonus(state,c))+(INDUSTRIAL_PRODUCTION[c.projectId]?' · выпуск '+INDUSTRIAL_PRODUCTION[c.projectId].capacity+'→'+INDUSTRIAL_PRODUCTION[c.projectId].capacity*2+' '+INDUSTRIAL_PRODUCTION[c.projectId].resource:'')+'</button>').join('')+'</div></div>';
   $$('[data-workforce-target]').forEach(b=>b.onclick=()=>{const r=resolveWorkforceLink(state,worker.id,b.dataset.workforceTarget);if(!r.ok){showToast('Нельзя привязать комплекс');return;}showToast('Ночная смена активна: доход и выпуск материалов ×2');render();});
  }else ws.innerHTML='';
 }
 const ps=$('#pressCampaignSheet'),pb=$('#pressCampaignBackdrop');
 const tower=currentPressCampaign(state);
 if(ps&&pb){ps.hidden=!tower;pb.hidden=!tower;
  if(tower){const owner=state.players[tower.playerId];
   ps.innerHTML='<div class="recruitment-card"><small>THE SAN FRANCISCO CALL · ЕЖЕГОДНЫЙ ВЫПУСК</small><h2>Газетная кампания</h2><p>'+owner.name+' · '+districtById(tower.districtId).name+'. Итоги газеты подведены. Выбери один эффект небоскрёба без рабочего.</p><div class="recruitment-actions"><button class="primary-btn" data-press-choice="cash">Рекламный доход · +$2</button><button class="secondary-btn" data-press-choice="influence" '+(owner.capital>=2?'':'disabled')+'>Кампания · −$2 и +1 Влияние</button></div>'+
     (owner.capital<2?'<small>Для политической кампании не хватает $2.</small>':'')+'</div>';
   $$('[data-press-choice]').forEach(b=>b.onclick=()=>{
     const r=resolvePressCampaign(state,tower.id,b.dataset.pressChoice);
     if(!r.ok){showToast('Недоступная газетная кампания');return;}
     if(!currentPressCampaign(state)){
       const next=cleanupMarket(state);
       if(next.ok){state.view=next.finished?'city':'hall';newsEmergencyMode=false;newsArchiveIndex=null;showToast(next.finished?'Фаза I завершена':'Год завершён · результаты газеты учтены');}
       else if(next.reason==='crime-choice')showToast('Проверка подозрения: выберите оплату штрафа или сотрудника для ареста');
        else if(next.reason!=='upkeep-choice'&&next.reason!=='pending-building-choice')showToast('Переход года: '+next.reason);
     }
     render();
   });
  }else ps.innerHTML='';
 }
}
function render(){
if(newsEmergencyMode&&(state.phase!=='development'||state.developmentComplete||state.activationMainActionUsed))newsEmergencyMode=false;
saveState();
renderTop();renderPlayers();renderViews();renderMarket();renderCityGoals();renderMarketOverview();renderStarterDraft();renderSupply();renderSupplyNodes();renderWorkerDock();renderStandardProjects();renderCityActions();renderMobileActionDock();renderDeliveryPanel();renderCity();renderCityOverview();renderMobileObjectStrip();renderContext();renderOffice();renderLog();renderDebug();renderActionBar();renderTenderSteps();renderNewspaper();renderYearTransition();renderSailorRecruitment();renderNewProjectDecisions();syncMobileContext();syncMapZoom();syncUndoButton();requestAnimationFrame(syncStickyLayout);
if(state.phase==='bids'&&!$('#privacyModal').classList.contains('open')&&!pendingBidReveal)openBidCurtain();
}
function renderTop(){
$('#roundStat').textContent=state.finished?`${MAX_ROUNDS} / ${MAX_ROUNDS}`:`${state.round} / ${MAX_ROUNDS}`;
$('#firstStat').textContent=state.players[state.firstPlayer].name;
$('#phaseStat').textContent=state.phase==='draft'?'Стартовый драфт':state.phase==='declare'?(c03OfferPlayer(state)!=null?'Мэрия · сомнительные разрешения':'Мэрия · заявки'):state.phase==='bids'?'Мэрия · ставки':state.phase==='ready'?'Мэрия · вскрытие':state.phase==='development'?'Развитие города':state.phase==='upkeep'?'Начало года · простой':state.phase==='bread-production'?'Начало года · выпуск хлеба':state.phase==='crime-assessment'?'Конец года · годовой штраф':'Тест завершён';
}
// Original handcuff pictogram, independent of the Flaticon visual reference.
const arrestedWorkerIcon='<svg class="arrested-worker-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="7.5" height="9.5" rx="3.3"/><rect x="14" y="4" width="7.5" height="9.5" rx="3.3"/><path d="M3.4 10.4h5.7M14.9 10.4h5.7M6.25 13.5v2.9l3.4 2.8 2.35-1.8 2.35 1.8 3.4-2.8v-2.9"/><path d="M9.6 19.2h4.8"/></svg>';
// D1: derive the compact player indicator from the existing saved C1.1 state.
function suspicionStars(level){return '★'.repeat(level)+'☆'.repeat(3-level);}
function suspicionBadge(level){return '<span class="suspicion-stars" data-suspicion-level="'+level+'" role="img" aria-label="Подозрение: '+level+' из 3" title="Подозрение: '+level+' из 3 · подробности в Офисе">'+suspicionStars(level)+'</span>';}
function renderPlayers(){
  const el=$('#playersBar');el.innerHTML='';
  const cd=currentDeclarer(state),dev=currentDeveloper(state),overviewPid=state.view==='city'?currentOverviewPlayerId():null,order=turnOrder(state),compact=isMobile();
  state.players.forEach((p,i)=>{
    const declareActive=state.phase==='declare'&&(cd===i||c03OfferPlayer(state)===i);
    const devActive=state.phase==='development'&&dev===i;
    const overviewActive=state.view==='city'&&overviewPid===i;
    const pill=document.createElement('button');pill.type='button';
    pill.className='player-pill '+(compact?'player-pill-compact ':'')+(declareActive||devActive?'active ':'')+(declareActive?'declare-active ':'')+(devActive?'dev-active ':'')+(overviewActive?'overview ':'')+(state.firstPlayer===i?'first':'');
    pill.dataset.office=i;
    const debt=(p.loans||[]).length,orderPos=Math.max(0,order.indexOf(p.id))+1,upkeep=constructionUpkeepDue(state,p.id);
    const workers=playerWorkers(state,p.id),jailed=workers.filter(w=>w.jailed).length,free=p.workersLeft??0;
    const suspicion=normalizeSuspicion(p.suspicion),stars=suspicionBadge(suspicion);
    const workerPlaces=[...new Set(workers.filter(w=>!w.jailed).map(w=>districtById(w.districtId)?.name).filter(Boolean))];
    const activeEffect=dev===i&&(state.procurementRemaining||0)>0?'Закупка ×'+state.procurementRemaining:'';
    const flags=['Порядок года #'+orderPos,upkeep?'Простой −$'+upkeep:'','Проекты '+p.portfolio.length+'/'+HAND_LIMIT,'Представители: '+workerPlaces.join(' / '),debt?'Кредиты '+debt:'',(p.bureauContracts||0)>0?'Контракт':'',activeEffect].filter(Boolean).join(' · ');
    pill.setAttribute('aria-label',p.name+'. Порядок хода '+orderPos+'. Деньги $'+p.capital+'. Победные очки '+(p.prestige||0)+'. Влияние '+p.influence+'. Свободных работников '+free+'. Арестовано '+jailed+'. Подозрение '+suspicion+' из 3. Открыть офис.');
    if(compact){
      pill.innerHTML='<span class="compact-player-head"><span class="compact-order" title="Порядок года #'+orderPos+'">#'+orderPos+'</span><span class="player-dot '+p.key+'"></span><span class="compact-player-name">'+p.name+'</span><span class="compact-player-money">$'+p.capital+'</span></span>'
        +'<span class="compact-player-stats"><span title="Победные очки">VP '+(p.prestige||0)+'</span><span title="Влияние">Вл '+p.influence+'</span>'+stars+'</span>'
        +'<span class="compact-player-workers"><span class="compact-free-worker" title="Свободных работников: '+free+'">👤 <b>'+free+'</b></span>'+(jailed?'<span class="compact-jailed-worker" title="Арестовано: '+jailed+'">'+arrestedWorkerIcon+'<b>'+jailed+'</b></span>':'')+'</span>';
    }else{
      pill.innerHTML='<span class="turn-order-badge" title="Порядок зафиксирован до следующего года">#'+orderPos+'</span><span class="player-dot '+p.key+'"></span><span class="player-main"><span class="player-name">'+p.name+'</span><span class="player-stats"><span>👤 '+free+'</span>'+(jailed?'<span class="player-jailed-count" title="Арестовано: '+jailed+'">'+arrestedWorkerIcon+jailed+'</span>':'')+'<span>VP '+(p.prestige||0)+'</span><span>Вл '+p.influence+'</span>'+stars+'<span>+$'+roundIncome(state,p.id)+'</span>'+(upkeep?'<span class="upkeep-mini">−$'+upkeep+' простой</span>':'')+'</span>'+(flags?'<span class="player-flags">'+flags+'</span>':'')+'</span><span class="player-money">$'+p.capital+'</span>';
    }
    pill.onclick=()=>{
      if(state.phase==='draft'){showToast('Стартовые руки скрыты до завершения драфта');return;}
      inspectedOffice=i;openDrawer('officeDrawer');renderOffice();
    };
    el.appendChild(pill);
  });
}
function renderStandardProjects(){
 const el=$('#standardProjects');if(!el)return;
 const pid=currentDeveloper(state),enabled=pid!=null&&canTakeMainAction(state,pid);
 const viewing=state.view==='city'&&state.phase==='development';
 el.hidden=!viewing;
 if(!viewing){el.innerHTML='';return;}
 const cards=STANDARD_PROJECTS.map(p=>{
   const note=p.id==='std_warehouse'?'До 3 материалов · склады без лимита':
    p.id==='std_fire'?'П −1 · служба своего района · земля +1':
    p.id==='std_police'?'Полиция в районе · земля +1':'Медицина в районе · земля +1';
   const selected=state.pendingConstruction?.projectId===p.id;
   return '<article class="standard-project-card typed-project '+(selected?'standard-selected':'')+'" '+projectTypeStyle(p)+'>'
    +'<div class="standard-project-card-title"><b>'+p.name+'</b><span>Проект $'+STANDARD_PROJECT_FEE+' · 1 VP</span></div>'
    +'<div class="standard-project-resource">'+resourcePills(p.materials)+'</div>'
    +'<small>'+note+'</small>'
    +'<button type="button" class="primary-btn standard-project-button" data-standard-build="'+p.id+'" '+(enabled?'':'disabled')+'>Выбрать район</button></article>';
 }).join('');
 el.innerHTML='<div class="standard-projects-head"><strong>Стандартные городские проекты</strong><span>Без тендера · проект $'+STANDARD_PROJECT_FEE+' + земля + материалы</span></div><div class="standard-projects-grid">'+cards+'</div>';
 el.querySelectorAll('[data-standard-build]').forEach(b=>b.onclick=()=>{if(pid!=null)startConstructionFlow(pid,b.dataset.standardBuild);});
}
function renderCityOverview(){
  // Desktop: the full-width sticky construction overview was covering the map.
  // Keep project details one click away in the existing Office drawer instead.
  const btn=$('#cityObjectsShortcut');
  if(!btn)return;
  const visible=state.view==='city'&&state.phase!=='draft'&&!isMobile();
  btn.hidden=!visible;
  if(!visible)return;
  const pid=currentOverviewPlayerId(),player=state.players[pid];
  if(!player){btn.hidden=true;return;}
  const builds=playerConstructionNeeds(pid);
  const warehouses=completedWarehouses(state,pid);
  btn.textContent='Стройки '+builds.length+' · Склады '+warehouses.length;
  btn.setAttribute('aria-label','Стройки и склады игрока '+player.name+': '+builds.length+' строек, '+warehouses.length+' складов. Открыть необходимые материалы в Офисе');
  btn.onclick=()=>{
    inspectedOffice=pid;
    openDrawer('officeDrawer');
    renderOffice();
    requestAnimationFrame(()=>$('#officeConstructionsTitle')?.scrollIntoView({block:'start'}));
  };
}
function renderMobileObjectStrip(){
const el=$('#mobileObjectStrip');if(!el)return;
if(!isMobile()||state.view!=='city'||state.phase==='draft'){
el.className='mobile-object-strip';el.innerHTML='';return;
}
const pid=currentOverviewPlayerId(),p=state.players[pid],activePid=currentDeveloper(state);
if(!p){el.className='mobile-object-strip';el.innerHTML='';return;}
const builds=(state.constructions||[]).filter(x=>x.playerId===pid&&x.status==='under-construction');
const viewingOpponent=activePid!=null&&pid!==activePid;
const items=[];
for(const con of builds){
const pr=projectById(con.projectId),d=districtById(con.districtId),prog=constructionProgress(state,con.id);
items.push('<button class="mobile-object-chip build construction-needs-chip typed-project type-stripe-compact" '+projectTypeStyle(pr)+' data-mobile-object="'+con.id+'"><b>'+pr.name+'</b><span>'+d.name+' · '+prog.delivered+'/'+prog.required+' · <strong>'+compactConstructionNeed(con,{prefix:true})+'</strong></span></button>');
}
if(!builds.length){el.className='mobile-object-strip';el.innerHTML='';return;}
el.className='mobile-object-strip active';
el.innerHTML='<div class="mobile-object-owner"><span class="player-dot '+p.key+'"></span><span><b>'+(viewingOpponent?'Просмотр: ':'Стройки: ')+p.name+'</b><small>'+builds.length+' строек</small></span>'+(viewingOpponent?'<button id="mobileObjectsBack" aria-label="Вернуться к активному игроку">×</button>':'')+'</div><div class="mobile-object-scroll">'+items.join('')+'</div>';
$$('[data-mobile-object]').forEach(b=>b.onclick=()=>focusConstruction(b.dataset.mobileObject));
$('#mobileObjectsBack')?.addEventListener('click',()=>{overviewPlayerId=null;focusedConstructionId=null;renderPlayers();renderCityOverview();renderMobileObjectStrip();});
}
function setView(view){state.view=view;$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hallView').classList.toggle('active',view==='hall');$('#cityView').classList.toggle('active',view==='city');saveState();renderContext();}
function renderViews(){
setViewSilently(state.view||'hall');
$('#hallView').classList.toggle('draft-mode',state.phase==='draft');
const btn=$('#endRoundBtn');
btn.disabled=state.phase!=='development'||state.finished||!state.developmentComplete;
const used=(state.players||[]).flatMap(p=>p.workers||[]).filter(w=>w.used).length;
const progress=state.phase==='development'&&!state.developmentComplete;
btn.classList.toggle('round-progress-only',progress);
btn.textContent=progress?'Представители '+used+'/'+(state.players.length*WORKERS_PER_PLAYER):'Завершить тестовый раунд';
}
function setViewSilently(view){$$('.nav-btn[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));$('#hallView').classList.toggle('active',view==='hall');$('#cityView').classList.toggle('active',view==='city');}
function renderTenderSteps(){
const steps=[['draft','0 Драфт'],['declare','1 Заявки'],['bids','2 Закрытые ставки'],['ready','3 Вскрытие'],['development','4 Развитие']];
const order={draft:0,declare:1,bids:2,ready:3,development:4,upkeep:5,finished:5};const current=order[state.phase]??0;
$('#tenderSteps').innerHTML=steps.map(([id,label],idx)=>`<span class="step-chip ${idx===current?'active':idx<current?'done':''}">${label}</span>`).join('');
const yearOrder=turnOrder(state).map((pid,i)=>`${i+1}. ${state.players[pid].name}`).join(' → ');
$('#hallInstruction').textContent=state.phase==='draft'?'Рынок проектов уже открыт. Каждый игрок приватно смотрит 5 стартовых карт и оставляет 2.':state.phase==='declare'&&c03OfferPlayer(state)!=null?'Газета C03 · до обычных заявок: каждый игрок по порядку может взять случайный проект и +1 ★ либо отказаться. Затем City Hall продолжится без изменений.':state.phase==='declare'?`Порядок года: ${yearOrder}. В свою очередь можно взять до 1 городской цели, затем заявить проект или пасовать.`:state.phase==='bids'?'Проекты уже выбраны. Конкурирующие игроки делают ставки по одному за защитной шторкой.':state.phase==='ready'?'Все закрытые ставки собраны. Вскройте их одновременно и определите победителей.':state.phase==='development'?`Тендеры завершены. Порядок активаций этого года: ${yearOrder}.`:state.phase==='upkeep'?'Income начислен. Требуется решить простой незавершённых строек перед началом нового года.':'Тест завершён.';
}
function projectIncomeText(p,con=null){
  if(p.id==='rare_goods_shop')return con?.status==='complete'?'$'+(Number.isInteger(con.fixedIncome)?con.fixedIncome:1):'$1–3';
  return '$'+(p.income||0);
}
function completedConstructionBaseIncome(pr,con){
  return con.projectId==='rare_goods_shop'?(Number.isInteger(con.fixedIncome)?con.fixedIncome:1):(pr.income||0);
}
function projectCardRules(p){
return `<div class="card-rules">
<div class="card-rule benefit"><b>ДАЁТ</b><span>${p.benefit||p.effect||'—'}</span></div>
<div class="card-rule action ${p.actionName==='—'?'muted':''}"><b>ДЕЙСТВИЕ · ${p.actionName||'—'}</b><span>${p.actionText||'—'}</span></div>
${p.limits?`<div class="card-rule limits"><b>ОГРАНИЧЕНИЯ</b><span>${p.limits}</span></div>`:''}
</div>`;
}
function projectCoreCard(p,{topLeft='',topRight='',priceLabel='старт',priceValue=null,selected=false,extraClass='',extraTop='',footer=''}={}){
const price=priceValue==null?p.open:priceValue;
return `<article class="project-card full-info typed-project ${typeClass(p)} ${selected?'selected':''} ${extraClass}" ${projectTypeStyle(p)}>
<div class="card-stripe"></div>
<div class="project-inner">
<div class="card-top"><span class="slot-mark">${topLeft}</span><span class="age-badge">${topRight}</span></div>
${extraTop}
<div class="project-title">${p.name}</div>
<div class="project-type">${projectTypeLabel(p)}</div>
<div class="card-value-row"><div class="opening-price">$${price}<small>${priceLabel}</small></div><span class="prestige-chip">VP ${p.prestige||0}</span></div>
<div class="card-section-label">МАТЕРИАЛЫ</div>
<div class="card-resource-row">${resourcePills(p.materials)}</div>
<div class="card-section-label risk-label">РИСК РАЙОНА ПОСЛЕ ЗАВЕРШЕНИЯ</div>
${projectRiskChips(p)}
<div class="card-requirement-band"><b>ТРЕБОВАНИЯ</b><div class="requirement-chip-row">${requirementChips(p)}</div></div>
${projectCardRules(p)}
${footer}
</div>
</article>`;
}
function compactMarketMaterials(project){
const counts=deliveryCounts(project?.materials||[]);
return RESOURCE_ORDER.filter(t=>counts[t]).map(t=>materialShort(t)+(counts[t]>1?counts[t]:'')).join(' ')||'—';
}
function compactMarketRisk(project){
const r=projectRisk(project?.id);
const q=r.earthquake?signedRisk(r.earthquake):'0';
const f=r.fire?signedRisk(r.fire):'0';
return 'У'+q+' · П'+f;
}
function renderMarketOverview(){
const el=$('#marketOverview');if(!el)return;
if(!isMobile()||state.view!=='hall'){
el.className='market-overview';el.innerHTML='';return;
}
const rows=(state.market||[]).map((m,slot)=>{
if(!m)return '<div class="market-overview-item empty"><b>'+(slot+1)+'</b><span>Пусто</span></div>';
const p=projectById(m.id),price=openingPrice(m),selected=state.selectedMarketUid===m.uid;
return '<button class="market-overview-item typed-project type-stripe-compact '+(selected?'selected ':'')+(m.age===1?'old ':'')+(m.sold?'sold':'')+'" '+projectTypeStyle(p)+' data-market-overview-slot="'+slot+'">'
+'<b>'+(slot+1)+'</b><span class="market-overview-name">'+p.name+'</span><strong>$'+price+'</strong>'
+'<span class="market-overview-mats">'+compactMarketMaterials(p)+'</span>'
+'<span class="market-overview-risk">'+compactMarketRisk(p)+'</span>'
+'</button>';
}).join('');
el.className='market-overview active';
el.innerHTML='<div class="market-overview-head"><b>СРАВНИТЬ РЫНОК</b><span>цена · материалы · изменение риска</span></div>'+rows;
$$('[data-market-overview-slot]').forEach(b=>b.onclick=()=>{
const slot=+b.dataset.marketOverviewSlot,m=state.market[slot];if(!m)return;
state.selectedMarketUid=m.uid;state.selectedProjectId=m.id;
render();
requestAnimationFrame(()=>$('#projectMarket')?.children?.[slot]?.scrollIntoView({behavior:'smooth',block:'nearest',inline:'center'}));
});
}
function goalRewardText(goal){
return '+$'+goal.reward.capital+' · +'+goal.reward.prestige+' VP'+(goal.reward.influence?' · +'+goal.reward.influence+' Влияние':'');
}
function renderCityGoals(){
const el=$('#cityGoalMarket');if(!el)return;
const cd=currentDeclarer(state),player=cd!=null?state.players[cd]:null,already=player?.goalTakenRound===state.round;
const report=(state.lastGoalReports||[]).length?'<div class="goal-report-banner"><b>ОТЧЁТ НАЧАЛА ГОДА</b><span>'+state.lastGoalReports.map(r=>state.players[r.playerId].name+' · '+cityGoalById(r.goalId)?.name+' → +$'+r.capital+' / +'+r.prestige+' VP').join(' · ')+'</span></div>':'';
const cards=(state.goalMarket||[]).map((card,slot)=>{
if(!card)return '<div class="city-goal-card empty"><span>Цель взята</span></div>';
const g=cityGoalById(card.id),ev=player?cityGoalEvaluation(state,player.id,g.id):null,can=state.phase==='declare'&&!!player&&!already;
const progress=player?(ev.progress+'/'+cityGoalTarget(g.id)):'—';
return '<article class="city-goal-card '+(ev?.complete?'complete-now':'')+'">'
+'<div class="goal-card-top"><span>ГОРОДСКАЯ ЦЕЛЬ</span><strong>'+g.id+'</strong></div>'
+'<h3>'+g.name+'</h3><small class="goal-sponsor">'+g.sponsor+'</small>'
+'<p class="goal-flavor">'+g.flavor+'</p>'
+'<div class="goal-requirement"><b>ТРЕБОВАНИЕ</b><span>'+g.requirement+'</span></div>'
+'<div class="goal-progress"><span>Прогресс '+(player?player.name:'')+'</span><strong>'+progress+(ev?.complete?' ✓':'')+'</strong></div>'
+'<div class="goal-reward"><span>'+goalRewardText(g)+'</span><em>Провал: −'+g.failPrestige+' VP</em></div>'
+'<button class="goal-take-btn" data-goal-slot="'+slot+'" '+(can?'':'disabled')+'>'+(already?'Цель уже взята':can?'Взять цель':'Только в свою заявку')+'</button>'
+'</article>';
}).join('');
el.innerHTML=report+'<div class="city-goal-head"><div><b>ГОРОДСКИЕ ЦЕЛИ</b><span>До 1 новой цели на игрока за City Hall · отчёт в начале следующего года</span></div>'+(player?'<strong>Сейчас: '+player.name+(already?' · цель уже взята':'')+'</strong>':'')+'</div><div class="city-goal-grid">'+cards+'</div>';
$$('[data-goal-slot]').forEach(b=>b.onclick=()=>{
const r=claimCityGoal(state,+b.dataset.goalSlot);
if(!r.ok){showToast(r.reason==='already-taken'?'В этой City Hall Session вы уже взяли цель':'Сейчас цель взять нельзя');return;}
showToast('Цель принята · проект всё ещё можно заявить');render();
});
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
return `<div class="draft-market-item typed-project type-stripe-compact ${typeClass(p)}" ${projectTypeStyle(p)}><span class="draft-market-slot">M${i+1}</span><b>${p.name}</b><small>$${openingPrice(m)} open · +$${projectIncomeText(p)} income · ${p.prestige||0} VP</small><div class="draft-market-materials">${resourcePills(p.materials)}</div></div>`;
}).join('');
const marketRef=`<div class="draft-market-ref"><div class="draft-market-ref-head"><b>OPEN MARKET</b><span>Публичный рынок уже открыт — учитывайте его при выборе стартовой стратегии.</span></div><div class="draft-market-strip">${marketStrip}</div></div>`;
if(!state.draftRevealed){
el.innerHTML=`<div class="draft-handoff"><div><span class="draft-kicker">PRIVATE STARTING HAND</span><h3>Передайте устройство: ${player.name}</h3><p>${player.name} получит 5 случайных проектов, оставит 2 и сбросит 3. Совпадающие проекты допустимы. Рынок остаётся общедоступной информацией.</p></div><button class="primary-btn" id="revealStarterDraft">Показать 5 карт</button></div>${marketRef}`;
$('#revealStarterDraft').onclick=()=>{revealStarterDraft(state);render();};
return;
}
const hand=state.starterDraftHands?.[pid]||[];
const chosen=state.draftSelection||[];
const selected=new Set(chosen);
const cards=hand.map((card,i)=>{
  const p=projectById(card.id),order=chosen.indexOf(card.uid),isSelected=order>=0;
  const confirmOnThisCard=isSelected&&chosen.length===STARTER_KEEP&&order===STARTER_KEEP-1;
  // One invisible full-card hit target: tapping anywhere selects/deselects.
  // The confirmation button is a separate, higher-layer control INSIDE the 2/2 card.
  const hit='<button type="button" class="draft-card-hit" data-draft-card="'+card.uid+'" aria-pressed="'+isSelected+'" aria-label="'+(isSelected?'Снять выбор: ':'Выбрать карту: ')+p.name+'"></button>';
  const confirm=confirmOnThisCard?'<div class="draft-card-confirm-row"><button type="button" class="draft-inline-confirm" id="confirmStarterDraft">Подтвердить 2 ✓</button></div>':'';
  return projectCoreCard(p,{
    topLeft:'START '+(i+1),topRight:isSelected?'✓ '+(order+1)+'/'+STARTER_KEEP:'ВЫБРАТЬ',
    priceLabel:'starter right',priceValue:0,selected:isSelected,
    extraClass:'draft-card',extraTop:confirm,footer:hit
  });
}).join('');
el.innerHTML=`<div class="draft-head"><div><span class="draft-kicker">STARTING DRAFT · ${player.name}</span><h3>Выберите 2 карты из 5</h3><p>Нажмите на карту для выбора; повторное нажатие отменяет его.</p></div></div>${marketRef}<div class="starter-draft-cards">${cards}</div>`;
$$('[data-draft-card]').forEach(b=>b.onclick=()=>{
  const oldCarousel=$('.starter-draft-cards');
  const oldX=oldCarousel?.scrollLeft||0,oldY=window.scrollY;
  const r=toggleStarterDraftCard(state,b.dataset.draftCard);
  if(!r.ok&&r.reason==='keep-limit'){showToast('Сначала отмените выбор одной из двух карт');return;}
  render();
  // Rebuilding the cards must not send the mobile carousel back to the first card.
  const carousel=$('.starter-draft-cards');
  if(carousel)carousel.scrollLeft=oldX;
  window.scrollTo(0,oldY);
});
$('#confirmStarterDraft')?.addEventListener('click',e=>{
  e.stopPropagation();
  const r=confirmStarterDraft(state);
  if(!r.ok){showToast('Выберите ровно 2 карты');return;}
  showToast(r.complete?'Стартовый драфт завершён':`Передайте устройство: ${state.players[r.nextPlayer].name}`);
  render();
});
}
function renderActionBar(){
const bar=$('#hallActionBar');
bar.hidden=state.phase==='draft';
if(state.phase==='draft'){
  // No floating selection bar. The 1/2 / 2/2 state and confirmation live on the cards.
  bar.innerHTML='';
}else if(state.phase==='declare'&&c03OfferPlayer(state)!=null){
 const pid=c03OfferPlayer(state),offer=c03OfferOptions(state,pid),p=state.players[pid];
 const needArrest=offer.suspicion===3,staff=offer.availableWorkerIds;
 const c03=state.newsC03Offer;
 bar.innerHTML='<div class="c03-offer-panel"><div class="sticky-copy">'+
   '<strong>THE SAN FRANCISCO CALL · C03 · '+escapeHtml(p.name)+' ('+(c03.cursor+1)+'/'+c03.order.length+')</strong>'+
   '<span>Чиновники предлагают сомнительное разрешение. Случайная карта из колоды бесплатно, +1 ★. Обычные проекты и торги впереди. Рука '+p.portfolio.length+'/'+HAND_LIMIT+' · колода '+offer.deckRemaining+'.</span>'+
   (!offer.canAccept?'<small class="c03-block-reason">'+
    escapeHtml(offer.blockReason==='hand-limit'?'Рука заполнена':
      offer.blockReason==='empty-deck'?'Колода проектов пуста':
      offer.blockReason==='no-free-worker'?'Все представители арестованы':offer.blockReason||'Сейчас недоступно')+'</small>':'')+
   (needArrest&&offer.canAccept?'<label class="c03-arrest-label">★★★ · Кого арестуют после получения карты?<select id="c03ArrestChoice"><option value="">Выберите представителя</option>'+
     staff.map(id=>{const w=p.workers.find(w=>w.id===id);return '<option value="'+escapeHtml(id)+'">Представитель #'+(w?.number||'?')+'</option>';}).join('')+
     '</select></label>':'')+
   '</div><div class="sticky-actions c03-offer-actions">'+
   '<button class="primary-btn" id="c03Accept" '+(!offer.canAccept||needArrest?'disabled':'')+'>Получить карту · +1 ★</button>'+
   '<button class="secondary-btn" id="c03Decline">Отказаться · без ★</button></div></div>';
 const choice=bar.querySelector('#c03ArrestChoice');
 if(choice)choice.onchange=()=>{bar.querySelector('#c03Accept').disabled=!choice.value;};
 bar.querySelector('#c03Accept').onclick=()=>{
   const workerId=choice?.value||null;
   const r=acceptC03Offer(state,pid,{arrestWorkerId:workerId});
   showToast(r.ok?'Получен проект «'+(projectById(r.projectId)?.name||r.projectId)+'» · '+(r.arrested?'арест':' +1 ★'):
     r.reason==='arrest-worker'?'При ★★★ необходимо выбрать представителя':'Получение недоступно: '+r.reason);
   render();
 };
 bar.querySelector('#c03Decline').onclick=()=>{
   const r=declineC03Offer(state,pid);
   showToast(r.ok?'Отказ от сомнительного разрешения: без подозрения':'Отказ недоступен');
   render();
 };
 }else if(state.phase==='declare'){
const pid=currentDeclarer(state);
if(pid==null){bar.innerHTML=`<div class="sticky-copy"><strong>Все заявки сделаны</strong><span>Перейдите к закрытым ставкам. Если конкуренции нет, сразу к вскрытию.</span></div><div class="sticky-actions"><button class="secondary-btn" id="nextTenderStage">Перейти к ставкам</button></div>`;$('#nextTenderStage').onclick=()=>{beginBidding(state);render();};}
else {const gp=state.players[pid],goalTaken=gp.goalTakenRound===state.round;bar.innerHTML=`<div class="sticky-copy"><strong>City Hall: ${gp.name} · рука ${gp.portfolio.length}/${HAND_LIMIT}</strong><span>${goalTaken?'Городская цель уже взята. ':'Можно взять 1 городскую цель. '}Затем выберите проект или пасуйте.</span></div><div class="sticky-actions"><button class="ghost-btn" id="passTender">Пас на проект</button></div>`;$('#passTender').onclick=()=>{passDeclaration(state);render();};}
}else if(state.phase==='bids'){
const q=currentBidTask(state),pl=q?state.players[q.player]:null;bar.innerHTML=`<div class="sticky-copy"><strong>Закрытые ставки</strong><span>${pl?`Следующая ставка: ${pl.name}`:'Ставки собраны'}. Суммы скрыты до вскрытия.</span></div><div class="sticky-actions"><button class="secondary-btn" id="openBidNow">Продолжить ставки</button></div>`;$('#openBidNow').onclick=openBidCurtain;
}else if(state.phase==='ready'){
bar.innerHTML='<div class="sticky-copy"><strong>Ставки собраны</strong><span>При равной сумме выигрывает большее Влияние; затем более ранняя заявка.</span></div><div class="sticky-actions"><button class="primary-btn" id="resolveTender">Вскрыть ставки</button></div>';$('#resolveTender').onclick=()=>{resolveTenders(state);state.view='city';render();};
}else if(state.phase==='development'){
if(state.developmentComplete){
bar.innerHTML='<div class="sticky-copy"><strong>Development завершён</strong><span>Все окна активации завершены.</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">Открыть город</button></div>';$('#enterCity').onclick=()=>{state.view='city';render();};
}else{
const dev=currentDeveloper(state),used=state.activationMainActionUsed,service=!used&&state.players[dev].workersLeft===0;
bar.innerHTML=`<div class="sticky-copy"><strong>${service?'Сервисный ход':'Активация'}: ${state.players[dev].name} · 👤 ${state.players[dev].workersLeft}/3 · ${WORKERS_PER_PLAYER-developmentSlotsRemaining(state,dev)+1}/3</strong><span>${service?'Нет свободных представителей. Можно выполнить законные свободные действия или передать ход.':used?'Основное действие использовано — доступны свободные действия или завершение активации.':'Свободные действия можно выполнять до или после основного действия.'}</span></div><div class="sticky-actions"><button class="secondary-btn" id="enterCity">Открыть город</button></div>`;$('#enterCity').onclick=()=>{state.view='city';render();};
}
}else if(state.phase==='upkeep'){
bar.innerHTML='<div class="sticky-copy"><strong>Переход года · простой строек</strong><span>Income уже начислен. Завершите обязательный выбор закрываемого объекта.</span></div><div class="sticky-actions"></div>';
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
const h03Reduced=activeNewspaper(state)?.id==='H03'&&state.newsH03SupplyRound===state.round;
const total=LOGISTICS_NODES.reduce((sum,node)=>sum+node.throughput,0)-(h03Reduced?4:0);
el.innerHTML='<div class="supply-label"><strong>ГОРОДСКИЕ ПОСТАВКИ</strong><span>Порты и ж/д: дешёвый ограниченный запас · 3 исторических поставщика: дорогой ресурс всегда доступен · доставка в обоих случаях обычная</span></div><div class="supply-items">'
+RESOURCE_ORDER.map(type=>'<span class="supply-resource '+materialClass(type)+'"><b>'+materialShort(type)+'</b><span>'+materialLabel(type)+'</span><strong>'+Math.round((LOGISTICS_RESOURCE_WEIGHTS[type]||0)*100)+'%</strong></span>').join('')
+'<span class="supply-resource city-throughput"><b>'+total+'</b><span>дешёвых кубиков / раунд</span><strong>'+LOGISTICS_NODES.length+' узлов + '+NEUTRAL_MATERIAL_SUPPLIERS.length+' поставщика</strong></span></div>';
}
function renderSupplyNodes(){
const layer=$('#supplyNodeLayer');if(!layer)return;const supply=state.logisticsSupply||{},pid=currentDeveloper(state),selecting=deliveryDraft?.step==='source'&&deliveryDraft.playerId===pid;
const closedPort=f03CurrentPortIncident(state)?.portId;
const nodes=LOGISTICS_NODES.map(n=>{const stock=supply[n.id]||[],start=-((stock.length-1)*7),pips=stock.map((t,i)=>'<circle class="node-resource '+materialClass(t)+'" cx="'+(start+i*14)+'" cy="25" r="5"/>').join(''),ok=selecting&&stock.length,closed=n.id===closedPort;
return '<g class="supply-node node-'+n.kind+' '+(closed?'f03-port-closed ':'')+(ok?'source-available':'')+'" transform="translate('+n.x+' '+n.y+')" data-delivery-node="'+n.id+'"><title>'+n.name+(closed?' · ПОЖАР: поставки перенаправлены до конца года':'')+'</title><circle class="node-hit" r="36"/><circle class="node-pin" r="20"/><text class="node-code" y="4">'+logisticsKindCode(n.kind)+'</text>'+pips+'<text class="node-name" y="48">'+n.shortName+'</text><text class="node-type" y="61">'+(closed?'ПОЖАР · НЕТ ГРУЗОВ':logisticsKindLabel(n.kind))+'</text>'+(closed?'<text class="f03-fire-label" y="-26">🔥 ПОЖАР</text>':'')+'</g>';}).join('');
const suppliers=NEUTRAL_MATERIAL_SUPPLIERS.map(n=>'<g class="neutral-supplier-node '+materialClass(n.resource)+' '+(selecting?'source-available':'')+'" transform="translate('+n.x+' '+n.y+')" data-delivery-supplier="'+n.id+'"><title>'+n.name+' · '+n.historical+' · '+materialLabel(n.resource)+' $'+n.unitPrice+'</title><circle class="node-hit" r="34"/><rect class="supplier-pin" x="-19" y="-19" width="38" height="38" rx="9"/><text class="supplier-code" y="4">'+n.code+'</text><text class="supplier-price" y="28">$'+n.unitPrice+'</text><text class="node-name" y="47">'+n.shortName+'</text><text class="node-type" y="59">'+materialLabel(n.resource)+' · всегда</text></g>').join('');
const yp=deliveryDraft?.playerId??pid??0,yi=freightYardInventory(state,yp),src=selecting&&yi.length,target=deliveryDropPhase()&&deliveryDraft?.route?.includes('western')&&deliveryDraft.source?.kind!=='freight-yard'&&deliveryTargetAcceptsAny(freightYardTarget());
const slots=state.players.map((p,i)=>'<circle class="yard-player-dot '+p.key+'" cx="'+(-18+i*18)+'" cy="26" r="6"/><text class="yard-count" x="'+(-18+i*18)+'" y="29">'+freightYardInventory(state,i).length+'</text>').join('');
const yard='<g class="freight-yard-node '+(src?'source-available ':'')+(target?'delivery-drop-available':'')+'" transform="translate('+FREIGHT_YARD.x+' '+FREIGHT_YARD.y+')" data-delivery-freight-yard="freightyard"><title>Городской грузовой двор · Western Addition · 2 места/игрок · вход $2</title><circle class="node-hit" r="38"/><rect class="freight-yard-pin" x="-24" y="-20" width="48" height="40" rx="9"/><text class="freight-yard-code" y="4">ГД</text>'+slots+'<text class="node-name" y="48">Грузовой двор</text><text class="node-type" y="61">2 места / игрок · $2</text></g>';
layer.innerHTML=nodes+suppliers+yard;
$$('[data-delivery-node]').forEach(g=>g.onclick=e=>{e.stopPropagation();if(deliveryDraft?.step==='source')chooseDeliverySource({kind:'node',id:g.dataset.deliveryNode});});
$$('[data-delivery-supplier]').forEach(g=>g.onclick=e=>{e.stopPropagation();if(deliveryDraft?.step==='source')chooseDeliverySource({kind:'supplier',id:g.dataset.deliverySupplier});});
$$('[data-delivery-freight-yard]').forEach(g=>g.onclick=e=>{e.stopPropagation();if(deliveryDraft?.step==='source'){if(!freightYardInventory(state,deliveryDraft.playerId).length){showToast('Ваша секция Грузового двора пуста');return;}chooseDeliverySource({kind:'freight-yard',id:FREIGHT_YARD.id});}else if(deliveryDraft?.step==='unload')openDeliveryTargetFromMap(FREIGHT_YARD.id);});
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
return `<button class="dock-worker token-${p.key} ${isSelected?'selected':''} ${w.jailed?'used':''} ${w.used?'used':''}" data-dock-worker="${w.id}" ${w.jailed||w.used||state.activationMainActionUsed?'disabled':''}><span>#${w.number}</span><b>${w.jailed?'ТЮРЬМА':shortDistrictName(w.districtId)}</b><small>${w.jailed?'АРЕСТ · '+(1899+w.arrestedRound):w.used?'ИСПОЛЬЗОВАН':isSelected?'ВЫБРАН':'ГОТОВ'}</small></button>`;
}).join('');
const reach=selected?workerReachableDistricts(state,pid,selected.id).map(shortDistrictName).join(' · '):p.workersLeft===0?'Все представители недоступны — быстрые действия остаются в меню «Свободные».':'Выберите представителя';
el.innerHTML=`<div class="worker-dock-head"><span class="player-dot ${p.key}"></span><div><b>${p.name} · представители</b><small>${selected?`#${selected.number}: ${districtById(selected.districtId)?.name} · соседний район${districtHasMarketStreet(selected.districtId)?' или любой район вдоль Market Street':''}`:'Выберите одного из трёх. Позиции сохраняются между раундами.'}</small></div></div><div class="worker-dock-grid">${buttons}</div><div class="worker-dock-reach"><b>Доступ:</b> ${reach}</div>`;
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
el.innerHTML='<div class="city-turn-complete"><strong>Development Phase завершена</strong><span>Все окна активации завершены. Позиции представителей сохранятся на следующий раунд.</span></div>';
return;
}
if(newsPreview(state).f04?.pendingSelections){
  el.innerHTML='<div class="city-actions-empty" role="status">F04: сначала выберите проверяемое здание для каждого владельца с несколькими равными целями. <button type="button" id="f04ChooseFromCity" class="secondary-btn">Открыть газету и выбрать цель</button></div>';
  el.querySelector('#f04ChooseFromCity').onclick=()=>openNewspaper();
  return;
}
const pid=currentDeveloper(state),p=state.players[pid];
const mainUsed=!!state.activationMainActionUsed;
const serviceOnly=!mainUsed&&p.workersLeft===0;
const workerSlot=WORKERS_PER_PLAYER-developmentSlotsRemaining(state,pid)+1;
const workers=playerWorkers(state,pid);
const selected=activeWorker(state,pid);
const reachable=selected?workerReachableDistricts(state,pid,selected.id):[];
const banks=completedActionSpaces(state,'bank');
const bureaus=completedActionSpaces(state,'bureau');
const advertisingAgencies=completedActionSpaces(state,'ad_agency');
const shops=completedActionSpaces(state,'shops');
const clubs=completedActionSpaces(state,'club');
const commissionHouses=completedActionSpaces(state,'commission_house');
const firehouses=completedActionSpaces(state,'firehouse');
const justiceHalls=completedActionSpaces(state,'hall_of_justice');
const availableProjects=(p.portfolio||[]).length;
const debt=(p.loans||[]).length;
const contract=(p.bureauContracts||0)>0;
const procurement=state.procurementRemaining||0;
const workerButtons=workers.map(w=>{
const d=districtById(w.districtId),isSelected=selected?.id===w.id;
return `<button class="worker-choice token-${p.key} ${isSelected?'selected':''} ${w.jailed||w.used?'used':''}" data-select-worker="${w.id}" ${w.jailed||w.used||mainUsed?'disabled':''}><span>#${w.number}</span><b>${w.jailed?'ТЮРЬМА':d?.name||w.districtId}</b><small>${w.jailed?'АРЕСТОВАН · '+(1899+w.arrestedRound):w.used?'ИСПОЛЬЗОВАН':isSelected?'ВЫБРАН · переход ≤ 1 район':'доступен'}</small></button>`;
}).join('');
const reachText=selected?reachable.map(id=>districtById(id)?.name).filter(Boolean).join(' · '):'Сначала выберите представителя';
const actionReach=con=>!!selected&&workerCanReachDistrict(state,pid,con.districtId,selected.id);
const hasConstruction=(state.constructions||[]).some(x=>x.playerId===pid&&x.status==='under-construction');
const spaceFree=con=>actionSpaceOccupant(state,con.id)==null;
const bankAvailable=!mainUsed&&!!selected&&debt<MAX_ACTIVE_LOANS&&banks.some(x=>actionReach(x)&&spaceFree(x));
const bureauAvailable=!mainUsed&&!!selected&&!contract&&bureaus.some(x=>actionReach(x)&&spaceFree(x));
const advertisingAvailable=!mainUsed&&!!selected&&p.capital>=ADVERTISING_CAMPAIGN_COST&&advertisingAgencies.some(x=>actionReach(x)&&spaceFree(x));
const shopsAvailable=!mainUsed&&!!selected&&p.capital>=1&&hasConstruction&&shops.some(x=>actionReach(x)&&spaceFree(x));
const clubAvailable=!mainUsed&&!!selected&&p.capital>=1&&clubs.some(x=>actionReach(x)&&spaceFree(x));
const commissionAvailable=!mainUsed&&!!selected&&availableProjects>0&&commissionHouses.some(x=>actionReach(x)&&spaceFree(x));
const fireAvailable=!mainUsed&&!!selected&&firehouses.some(x=>actionReach(x)&&spaceFree(x));
const justiceAvailable=!mainUsed&&!!selected&&justiceHalls.some(x=>actionReach(x)&&spaceFree(x));
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
const advertisingButtons=advertisingAgencies.length?advertisingAgencies.map(agency=>{
  const owner=state.players[agency.playerId],district=districtById(agency.districtId);
  const occupiedBy=actionSpaceOccupant(state,agency.id),occupied=occupiedBy!=null,range=actionReach(agency);
  const disabled=mainUsed||!selected||!range||occupied||p.capital<ADVERTISING_CAMPAIGN_COST;
  const label=occupied?'ЗАНЯТО':!selected?'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ':!range?'СЛИШКОМ ДАЛЕКО':mainUsed?'ДЕЙСТВИЕ ИСП.':p.capital<ADVERTISING_CAMPAIGN_COST?'НУЖНЫ $2':'−$2 · +2 Income';
  return `<button class="action-space-btn advertising ${disabled?'':'available-action'} ${occupied?'occupied':''} ${!range&&selected?'out-of-range':''}" data-advertising-action="${agency.id}" ${disabled?'disabled':''}><b>Агентство · ${owner.name}</b><span>${district.name}</span><strong>${label}</strong></button>`;
}).join(''):'<div class="action-space-locked">Рекламное агентство ещё не построено</div>';
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
const firehouseButtons=firehouses.length?firehouses.map(house=>{
  const range=actionReach(house),used=!spaceFree(house),enabled=!mainUsed&&!!selected&&range&&!used;
  const supported=firehouseHasWorkshop(state,house.id);
  const hint=used?'ЗАНЯТА':!selected?'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ':!range?'НЕДОСТУПНЫЙ РАЙОН':mainUsed?'ДЕЙСТВИЕ ИСПОЛЬЗОВАНО':supported?'МАСТЕРСКИЕ ПОДКЛЮЧЕНЫ':'БАЗОВАЯ СЛУЖБА';
  return `<div class="firehouse-choice"><div class="firehouse-choice-title"><b>${districtById(house.districtId)?.name}</b><small>${state.players[house.playerId]?.name} · ${hint}</small></div>`
    +`<div class="firehouse-choice-buttons"><button class="action-space-btn ${enabled?'available-action':''}" data-fire-mode="upgrade" data-firehouse-id="${house.id}" ${enabled?'':'disabled'}>Модернизация · $${supported?1:2}</button>`
    +`<button class="action-space-btn ${enabled?'available-action':''}" data-fire-mode="inspect" data-firehouse-id="${house.id}" ${enabled?'':'disabled'}>Инспекция</button></div></div>`;
}).join(''):'<div class="action-space-locked">Пожарные части ещё не построены</div>';
if(justiceDraft&&(justiceDraft.pid!==pid||justiceDraft.workerId!==selected?.id||mainUsed
  ||!justiceHalls.some(h=>h.id===justiceDraft.hallId&&spaceFree(h)&&actionReach(h))))justiceDraft=null;
const justiceButtons=justiceHalls.length?justiceHalls.map(h=>{
  const occupied=!spaceFree(h),range=actionReach(h),enabled=!mainUsed&&!!selected&&range&&!occupied;
  const hint=occupied?'ЗАНЯТО':!selected?'ВЫБЕРИТЕ РАБОЧЕГО':!range?'СЛИШКОМ ДАЛЕКО':mainUsed?'ДЕЙСТВИЕ ИСПОЛЬЗОВАНО':'Выберите действие';
  return '<div class="firehouse-choice"><div class="firehouse-choice-title"><b>'+districtById(h.districtId)?.name+'</b><small>'+state.players[h.playerId]?.name+' · '+hint+'</small></div>'
    +'<div class="firehouse-choice-buttons"><button class="action-space-btn" data-justice-mode="register" data-justice-hall="'+h.id+'" '+(enabled?'':'disabled')+'>Право собственности · $1</button>'
    +'<button class="action-space-btn" data-justice-mode="reorganize" data-justice-hall="'+h.id+'" '+(enabled?'':'disabled')+'>Реорганизация · $2</button></div></div>';
}).join(''):'<div class="action-space-locked">Дворец правосудия ещё не построен</div>';
let justiceTargetPanel='';
if(justiceDraft){
  const j=justiceDraft,options=hallOfJusticeOptions(state,pid,j.hallId);
  const header='<div class="fire-target-head"><b>'+(j.kind==='register'?'Регистрация собственности · $1':'Судебная реорганизация · $2')+'</b><button class="secondary-btn" id="cancelJusticeAction">Отмена</button></div>';
  let picks='';
  if(j.kind==='register'){
    picks=options.registrationTargets.map(id=>{
      const c=state.constructions.find(x=>x.id===id);
      return '<button class="action-space-btn" data-justice-target="'+id+'" '+(p.capital>=1?'':'disabled')+'>'+projectById(c.projectId).name+' · '+districtById(c.districtId)?.name+'</button>';
    }).join('');
  }else if(!j.siteId){
    picks=options.reorganizationTargets.map(id=>{
      const c=state.constructions.find(x=>x.id===id);
      return '<button class="action-space-btn" data-justice-site="'+id+'">'+projectById(c.projectId).name+' · '+districtById(c.districtId)?.name+'</button>';
    }).join('');
  }else{
    picks=[...new Set(options.unstartedProjects)].map(id=>{
      const c=state.constructions.find(x=>x.id===j.siteId);
      return '<button class="action-space-btn" data-justice-project="'+id+'" '+(p.capital>=2?'':'disabled')+'>'+projectById(id).name+' · '+districtById(c.districtId)?.name+'</button>';
    }).join('');
  }
  justiceTargetPanel='<div class="fire-target-panel" id="justiceTargetPanel">'+header
    +'<div class="fire-target-options">'+(picks||'<span>Нет подходящих объектов или карт</span>')+'</div></div>';
}
if(fireActionDraft&&(fireActionDraft.pid!==pid||fireActionDraft.workerId!==selected?.id||mainUsed
  ||!firehouses.some(h=>h.id===fireActionDraft.firehouseId&&spaceFree(h)&&actionReach(h))))fireActionDraft=null;
let fireTargetPanel='';
if(fireActionDraft){
  const house=firehouses.find(h=>h.id===fireActionDraft.firehouseId);
  const workshop=firehouseHasWorkshop(state,house.id);
  let choices=[];
  if(fireActionDraft.kind==='upgrade'){
    choices=firehouseUpgradeCandidates(state,pid,house.id).map(c=>({id:c.id,
      label:`${projectById(c.projectId)?.name} · ${districtById(c.districtId)?.name} · П +${constructionFireRisk(c)} → +${constructionFireRisk(c)-1}`,
      detail:`Своё здание · стоимость $${workshop?1:2}`,disabled:p.capital<(workshop?1:2)}));
  }else{
    choices=firehouseInspectionDistricts(state,house.id).map(id=>{
      const targets=firehouseInspectionTargets(state,house.id,id);
      const offenders=targets.map(c=>`${projectById(c.projectId)?.name} (${state.players[c.playerId]?.name}, П +${constructionFireRisk(c)})`).join(' · ');
      return {id,label:districtById(id)?.name||id,detail:targets.length?`${targets.length} объект(а): ${offenders} · $3 за каждый, −1 Влияние владельцу; при нехватке денег постоянное −$1 дохода`:'Нарушителей П +2 или выше нет',disabled:!targets.length};
    });
  }
  fireTargetPanel=`<div class="fire-target-panel" id="fireTargetPanel"><div class="fire-target-head"><b>${fireActionDraft.kind==='upgrade'?'Добровольная модернизация':'Принудительная инспекция'}</b><button class="secondary-btn" id="cancelFireAction">Отмена</button></div>`
    +`<div class="fire-target-options">${choices.map(c=>`<button class="action-space-btn ${c.disabled?'':'available-action'}" data-fire-target="${c.id}" ${c.disabled?'disabled':''}><b>${c.label}</b><span>${c.detail}</span></button>`).join('')||'<span>Подходящих объектов нет</span>'}</div></div>`;
}
const buildDisabled=availableProjects===0||mainUsed||!selected;
const moveDisabled=mainUsed||!selected;
const deliveryDisabled=!canUseFreeAction(state,pid)||state.lastDeliveryKey===currentDeliveryKey(state,pid);
const paidHire=paidReplacementOptions(state,pid);
const hireReady=paidHire.ok&&paidHire.active&&paidHire.affordable&&paidHire.eligible.length>0;
el.innerHTML=`<div class="turn-banner player-${p.key} ${mainUsed?'main-used':''}"><span class="player-dot ${p.key}"></span><div><small>${serviceOnly?'СЕРВИСНОЕ ОКНО':'АКТИВАЦИЯ'} ${workerSlot}/3</small><strong>${p.name}</strong><span>👤 ${p.workersLeft}/3 · VP ${p.prestige||0} · Проекты ${availableProjects} · Кредиты ${debt}/${MAX_ACTIVE_LOANS}${contract?' · Контракт':''}${procurement?` · Закупка ${procurement}`:''}</span></div><span class="activation-state">${serviceOnly?'НЕТ СВОБОДНЫХ РАБОТНИКОВ':mainUsed?'ОСНОВНОЕ ДЕЙСТВИЕ ИСПОЛЬЗОВАНО':selected?`ПРЕДСТАВИТЕЛЬ #${selected.number} ГОТОВ`:'ВЫБЕРИТЕ ПРЕДСТАВИТЕЛЯ'}</span></div>
${serviceOnly?'<div class="service-turn-hint">Работников нет. Вы можете выполнить законные быстрые действия или передать ход. Новое основное действие без работника не появляется.'+(hireReady?' Доступен наём за $7: откройте Офис через «Свободные» до пропуска оставшихся ходов.':'')+'</div>':`<div class="worker-selector"><div class="worker-selector-head"><b>3 REPRESENTATIVES · позиции сохраняются между раундами</b><span>Действие: текущий район или 1 соседний. После действия представитель остаётся там.</span></div><div class="worker-choice-row">${workerButtons}</div><div class="worker-reach"><b>Доступ за эту активацию:</b> ${reachText}</div></div>`}
<div class="action-legend"><b>${serviceOnly?'СВОБОДНЫЕ ДЕЙСТВИЯ И ПАС':mainUsed?'СВОБОДНЫЕ ДЕЙСТВИЯ / ЗАВЕРШЕНИЕ АКТИВАЦИИ':'ОСНОВНОЕ ДЕЙСТВИЕ'}</b><span>${serviceOnly?'Доставка, пекарня, погашение кредита и другие законные свободные действия доступны сейчас.':procurement?`Закупка: ещё ${procurement} бесплатн. материала при следующей покупке`:mainUsed?'Доставка и погашение кредита доступны до завершения активации':selected?'Выберите основное действие или выполните доставку':'Доставку можно выполнить и до выбора представителя'}</span><em>СВОБОДНЫЕ: Доставка · Достройка вагонного пансиона · Завершить со склада · Погасить кредит</em></div>
${mainUsed?'<button class="end-activation-btn" id="actionEndActivation">Завершить активацию → следующий игрок</button>':serviceOnly?'<div class="service-turn-actions"><button class="end-activation-btn" id="actionEndActivation">Пас · следующий игрок</button><button class="secondary-btn" id="actionPassRemaining">'+(hireReady?'Пропустить найм · завершить ходы':'Завершить мои ходы этого года')+'</button></div>':''}
<div class="city-action-grid ${mainUsed?'main-action-used':''} ${serviceOnly?'service-only':''}">
<button class="city-action-card build ${buildDisabled?'':'action-available'}" id="actionBuild" ${buildDisabled?'disabled':''}><b>Начать строительство</b><span>${availableProjects===0?'Нет доступного проекта':mainUsed?'Основное действие уже использовано':!selected?'Сначала выберите представителя':'Выбрать проект в офисе'}</span><strong>${buildDisabled?'НЕДОСТУПНО':'переход ≤ 1 район · 1 представитель'}</strong></button>
<button class="city-action-card movement ${moveDisabled?'':'action-available'}" id="actionMoveWorker" ${moveDisabled?'disabled':''}><b>Перемещение</b><span>Основное действие: перейти ровно в 1 соседний район, без дохода</span><strong>${moveDisabled?'НЕДОСТУПНО':'ВЫБРАТЬ СОСЕДНИЙ РАЙОН'}</strong></button>
<button class="city-action-card delivery ${deliveryDisabled?'':'free-action-available'}" id="actionDelivery" ${deliveryDisabled?'disabled':''}><b>Доставка · СВОБОДНОЕ ДЕЙСТВИЕ</b><span>Несколько источников по пути (+$1 за дополнительную погрузку)</span><strong>${deliveryDisabled?'НЕДОСТУПНО':'НАЧАТЬ'}</strong></button>
<div class="city-action-card bank-card ${bankAvailable?'action-available':''}"><b>Банковский кредит</b><span>Нужно добраться до района Bank · 1 use / round</span><div class="action-space-list">${bankButtons}</div></div>
<div class="city-action-card bureau-card ${bureauAvailable?'action-available':''}"><b>Строительное бюро</b><span>Нужно добраться до Bureau · 1 use / round</span><div class="action-space-list">${bureauButtons}</div></div>
<div class="city-action-card ${advertisingAvailable?'action-available':''}"><b>Рекламное агентство</b><span>$2 → +2 Income</span><div class="action-space-list">${advertisingButtons}</div></div>
 <div class="city-action-card shops-card ${shopsAvailable?'action-available':''}"><b>Торговый ряд · Закупка</b><span>$1 → до 2 материалов бесплатно в следующей Delivery</span><div class="action-space-list">${shopsButtons}</div></div>
<div class="city-action-card club-card ${clubAvailable?'action-available':''}"><b>Ресторан и клуб</b><span>Нужно добраться до клуба · −$1 → +1 Влияние</span><div class="action-space-list">${clubButtons}</div></div>
<div class="city-action-card ${fireAvailable?'action-available':''}"><b>🚒 Пожарная служба</b><span>1 представитель · пожарная часть: модернизация своего здания или инспекция района</span><div class="action-space-list firehouse-list">${firehouseButtons}</div>${fireTargetPanel}</div>
<div class="city-action-card ${justiceAvailable?'action-available':''}"><b>⚖ Дворец правосудия</b><span>Выберите действие: право собственности или реорганизация стройки</span><div class="action-space-list firehouse-list">${justiceButtons}</div>${justiceTargetPanel}</div>
<div class="city-action-card ${commissionAvailable?'action-available':''}"><b>Комиссионный торговый дом</b><span>Основное действие: перепродать неначатый проект за $4</span><button class="secondary-btn full" id="actionCommission" ${commissionAvailable?'':'disabled'}>${commissionHouses.length?'Выбрать проект в офисе':'Комиссионный дом ещё не построен'}</button></div>
</div>`;
$$('[data-select-worker]').forEach(b=>b.onclick=()=>{
const r=selectWorker(state,pid,b.dataset.selectWorker);
if(!r.ok){showToast(r.reason==='used'?'Этот представитель уже использован':'Нельзя выбрать этого представителя');return;}
state.pendingConstruction=null;state.pendingWorkerAction=null;fireActionDraft=null;justiceDraft=null;render();
});
const build=$('#actionBuild');if(build&&!buildDisabled)build.onclick=()=>{inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();};
const deliveryBtn=$('#actionDelivery');if(deliveryBtn&&!deliveryDisabled)deliveryBtn.onclick=()=>startDeliveryFlow(pid);
const commissionBtn=$('#actionCommission');if(commissionBtn&&!commissionBtn.disabled)commissionBtn.onclick=()=>{inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();};
const move=$('#actionMoveWorker');if(move&&!moveDisabled)move.onclick=()=>{
deliveryDraft=null;
state.pendingConstruction=null;
state.pendingWorkerAction={type:'moveWorker',playerId:pid};
state.view='city';
closeDrawers();closeMobileContext();
render();
showToast('Перемещение: выберите соседний район на карте. Денег это действие не приносит.');
};
const finishActivation=(skipRemainingService=false)=>{
deliveryDraft=null;fireActionDraft=null;justiceDraft=null;
const r=endActivation(state,pid,{skipRemainingService});
if(!r.ok){showToast(r.reason==='main-action-required'?'Сначала сделайте main action':'Нельзя завершить активацию');return;}
overviewPlayerId=null;focusedConstructionId=null;
closeDrawers();closeMobileContext();
showToast(r.complete?'Все окна активации завершены':`Ход: ${state.players[r.nextPlayer].name}`);
render();
};
const end=$('#actionEndActivation');if(end)end.onclick=()=>finishActivation(false);
const passAll=$('#actionPassRemaining');if(passAll)passAll.onclick=()=>finishActivation(true);
$$('[data-justice-mode]').forEach(b=>b.onclick=()=>{
  justiceDraft={pid,workerId:activeWorker(state,pid)?.id,hallId:b.dataset.justiceHall,kind:b.dataset.justiceMode,siteId:null};
  renderCityActions();
  $('#justiceTargetPanel')?.scrollIntoView({block:'nearest'});
});
$('#cancelJusticeAction')?.addEventListener('click',()=>{justiceDraft=null;renderCityActions();});
$$('[data-justice-site]').forEach(b=>b.onclick=()=>{if(justiceDraft){justiceDraft.siteId=b.dataset.justiceSite;renderCityActions();}});
const finishJustice=(targetId,newProject=null)=>{
  const j=justiceDraft;if(!j)return;
  const result=useHallOfJustice(state,pid,j.hallId,j.kind,targetId,newProject);
  if(!result.ok){
    showToast(result.reason==='replacement-requirements'?result.reasons.join(' · '):result.reason==='capital'?'Недостаточно денег':'Судебное действие недоступно: '+result.reason);
    return;
  }
  justiceDraft=null;
  showToast(result.kind==='register'?'Право собственности зарегистрировано: 1 VP после катастрофы.':'Проект реорганизован'+(result.completed?' и завершён':'')+'.');
  render();
};
$$('[data-justice-target]').forEach(b=>b.onclick=()=>finishJustice(b.dataset.justiceTarget));
$$('[data-justice-project]').forEach(b=>b.onclick=()=>finishJustice(justiceDraft?.siteId,b.dataset.justiceProject));
$$('[data-fire-mode]').forEach(b=>b.onclick=()=>{
  fireActionDraft={pid,workerId:activeWorker(state,pid)?.id,firehouseId:b.dataset.firehouseId,kind:b.dataset.fireMode};
  renderCityActions();
  $('#fireTargetPanel')?.scrollIntoView({block:'nearest',behavior:'smooth'});
});
$('#cancelFireAction')?.addEventListener('click',()=>{fireActionDraft=null;renderCityActions();});
$$('[data-fire-target]').forEach(b=>b.onclick=()=>{
  const draft=fireActionDraft;if(!draft)return;
  const result=useFirehouseAction(state,pid,draft.firehouseId,draft.kind,b.dataset.fireTarget);
  if(!result.ok){showToast(result.reason==='capital'?'Недостаточно денег':result.reason==='occupied'?'Эту пожарную часть уже использовали':result.reason==='no-violations'?'Нарушений в районе нет':'Пожарное действие сейчас недоступно');renderCityActions();return;}
  fireActionDraft=null;
  const affected=result.impacts.map(x=>`${state.players[x.playerId]?.name}: $${x.paid}/${x.cost}, Влияние ${x.influenceDelta}, штраф дохода ${x.incomePenalty}`).join('; ');
  showToast(`${result.kind==='inspect'?'Инспекция':'Модернизация'}: ${result.targets.length} объект(а), П ${result.fireBefore}→${result.fireAfter}. ${affected}`);
  render();
});
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
$$('[data-advertising-action]').forEach(b=>b.onclick=()=>{
 const result=useAdvertisingAgency(state,pid,b.dataset.advertisingAction);
 if(!result.ok){showToast(result.reason==='worker-range'?'Представитель слишком далеко от агентства':result.reason==='occupied'?'Агентство уже использовано':result.reason==='capital'?'Нужны $2':'Рекламная кампания недоступна');return;}
 showToast('Рекламная кампания: −$2 · +2 постоянного Income');render();
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
function openActiveFreeActions(){
const pid=currentDeveloper(state);if(pid==null)return;
inspectedOffice=pid;openDrawer('officeDrawer');renderOffice();
requestAnimationFrame(()=>$('#officeContent .office-activation')?.scrollIntoView({block:'start'}));
}
function renderMobileActionDock(){
const el=$('#mobileActionDock');if(!el)return;
const pid=currentDeveloper(state);
const selected=pid!=null?activeWorker(state,pid):null;
const blocked=!isMobile()||state.view!=='city'||state.phase!=='development'||state.developmentComplete
||(deliveryDraft&&deliveryDraft.step!=='source')||state.pendingConstruction||state.pendingWorkerAction||pid==null;
document.body.classList.toggle('mobile-turn-dock-active',!blocked);
if(blocked){el.className='mobile-action-dock';el.innerHTML='';return;}
if(newsPreview(state).f04?.pendingSelections){
  el.className='mobile-action-dock active persistent-turn-dock';
  el.innerHTML='<div class="mobile-action-buttons"><button type="button" id="mobileF04Choice" class="mobile-action-shortcut primary">F04 · Выбрать здание в газете</button></div>';
  el.querySelector('#mobileF04Choice').onclick=()=>openNewspaper();
  return;
}
if(deliveryDraft?.step==='source'){
  el.className='mobile-action-dock active persistent-turn-dock delivery-source-top';
  el.setAttribute('aria-label','Выбор источника доставки на карте');
  el.innerHTML='<div class="mobile-action-buttons"><button type="button" class="mobile-action-shortcut primary" data-mobile-action="cancel-delivery">← Отменить доставку</button></div>';
  el.querySelector('[data-mobile-action="cancel-delivery"]').onclick=cancelDeliveryFlow;
  return;
}
const p=state.players[pid],mainUsed=!!state.activationMainActionUsed,serviceOnly=!mainUsed&&p.workersLeft===0;
const paidHire=paidReplacementOptions(state,pid);
const hireReady=paidHire.ok&&paidHire.active&&paidHire.affordable&&paidHire.eligible.length>0;
const button=(id,label,disabled=false,cls='')=>'<button class="mobile-action-shortcut '+cls+'" data-mobile-action="'+id+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
let html=button('delivery','🚚 Доставка',!canUseFreeAction(state,pid)||state.lastDeliveryKey===currentDeliveryKey(state,pid),'free')
+button('free','Свободные',false,'secondary')
+(serviceOnly?button('service-pass',hireReady?'✓ Без найма':'✓ Все мои ходы',false,'primary'):mainUsed?button('end','✓ Завершить',false,'primary'):button('main','Основные',false,'primary'));
el.className='mobile-action-dock active persistent-turn-dock';
el.setAttribute('aria-label',p.name+' · '+(serviceOnly?'сервисное окно '+(WORKERS_PER_PLAYER-developmentSlotsRemaining(state,pid)+1)+'/3':mainUsed?'основное действие использовано':selected?'представитель #'+selected.number:'выберите представителя')+' · действия');
el.innerHTML='<div class="mobile-action-buttons">'+html+'</div>';
if(hireReady)el.querySelector('[data-mobile-action="service-pass"]')?.setAttribute('aria-label','Пропустить оставшиеся ходы и доступный наём за $7');
$$('[data-mobile-action]').forEach(b=>b.onclick=()=>{
const action=b.dataset.mobileAction;
if(action==='delivery')startDeliveryFlow(pid);
else if(action==='free')openActiveFreeActions();
else if(action==='end')$('#actionEndActivation')?.click();
else if(action==='service-pass')$('#actionPassRemaining')?.click();
else{
$('#cityActions')?.scrollIntoView({behavior:'smooth',block:'start'});
$('#cityActions')?.classList.add('ux-focus');
setTimeout(()=>$('#cityActions')?.classList.remove('ux-focus'),900);
}
});
}
function renderCity(){
const board=$('.city-board');if(board)board.classList.toggle('risk-mode',riskViewActive);
const riskBtn=$('#riskViewBtn');if(riskBtn){riskBtn.classList.toggle('active',riskViewActive);riskBtn.setAttribute('aria-pressed',riskViewActive?'true':'false');}
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
}else if(workerAction?.type==='moveWorker'){
const pl=state.players[workerAction.playerId],w=activeWorker(state,workerAction.playerId);
mode.className='construction-mode active movement-mode';
mode.innerHTML=`<div><strong>${pl.name}: Перемещение</strong><span>Представитель #${w?.number}: выберите один соседний доступный район. Расходуется основное действие, деньги не начисляются.</span></div><button class="ghost-btn" id="cancelWorkerAction">Отмена</button>`;
$('#cancelWorkerAction').onclick=()=>{state.pendingWorkerAction=null;mobileContextOpen=false;render();};
}else if(pending){
const pl=state.players[pending.playerId],pr=projectById(pending.projectId);
mode.className='construction-mode active';
mode.innerHTML=`<div><strong>${pl.name}: ${pr.name}</strong><span>${pr.standard?'Стандартный проект без тендера · 1 представитель, покупка земли и доставка 3 материалов.':'Выберите район. Если там есть ваш вагонный пансион, можно перестроить его без повторной покупки земли, использовав 1/2/3 Lumber. Требуется основное действие рабочего.'}</span></div><button class="ghost-btn" id="cancelConstruction">Отмена</button>`;
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
g.classList.remove('build-ok','build-blocked','build-dim','worker-reachable','worker-unreachable','worker-origin','move-target','delivery-route','delivery-current','delivery-next','delivery-blocked','risk-watch','risk-warning','risk-critical');
if(deliveryMode?.step==='route'){
const route=deliveryMode.route||[],last=route[route.length-1],next=new Set(deliveryNeighbors(last));
if(route.includes(id))g.classList.add('delivery-route');
if(id===last)g.classList.add('delivery-current');
if(next.has(id))g.classList.add('delivery-next');
else if(!route.includes(id))g.classList.add('delivery-blocked');
}else if(deliveryMode?.step==='unload'){
if((deliveryMode.route||[]).includes(id))g.classList.add('delivery-route');
else g.classList.add('delivery-blocked');
}else if(!deliveryMode&&selectedWorker&&!state.activationMainActionUsed){
if(id===selectedWorker.districtId)g.classList.add('worker-origin');
if(reachableIds.has(id))g.classList.add('worker-reachable');
else g.classList.add('worker-unreachable');
}
if(workerAction?.type==='moveWorker'&&reachableIds.has(id)&&id!==selectedWorker?.districtId)g.classList.add('move-target');
if(pending){
if(reachableIds.has(id)){
const check=constructionEligibility(state,pending.playerId,pending.projectId,id);
g.classList.add(canBuildOrRedevelop(pending,id)?'build-ok':'build-blocked');
}else{
g.classList.add('build-dim');
}
}
if(riskViewActive){
const risk=districtRisk(state,id);
const maxLevel=Math.max(risk?.earthquake?.level||0,risk?.fire?.level||0);
if(maxLevel===3)g.classList.add('risk-critical');
else if(maxLevel===2)g.classList.add('risk-warning');
else if(maxLevel===1)g.classList.add('risk-watch');
}
});
const meta=$('#districtMetaLayer');
if(meta){
meta.innerHTML=DISTRICTS.map(d=>{
const ds=state.districts[d.id],used=districtConstructionCount(state,d.id),[x,y]=DISTRICT_META_POS[d.id]||DISTRICT_POS[d.id],a=districtAccess(state,d.id);
const pendingCheck=pending?canBuildOrRedevelop(pending,d.id):false;
const movementLegal=workerAction?.type==='moveWorker'?reachableIds.has(d.id)&&d.id!==selectedWorker?.districtId:null;
const risk=d.buildable===false?null:districtRisk(state,d.id);
const maxLevel=Math.max(risk?.earthquake?.level||0,risk?.fire?.level||0);
const riskClass=riskViewActive?(maxLevel===3?' risk-critical':maxLevel===2?' risk-warning':maxLevel===1?' risk-watch':' risk-safe'):'';
const klass=(d.passable===false?'district-meta special closed':d.buildable===false?'district-meta special passage':
pending?(reachableIds.has(d.id)?(pendingCheck?'district-meta eligible':'district-meta blocked'):'district-meta dimmed')
:workerAction?.type==='moveWorker'?(movementLegal?'district-meta eligible':'district-meta blocked')
:'district-meta')+riskClass;
const tags=[a.rail?'RL':'',a.port?'PT':'',a.fire?'FIRE':'',a.clinic?'CL':'',a.police?'POL':''].filter(Boolean).join('·');
const normal=d.passable===false?'CLOSED':d.buildable===false?'PASSAGE · NO BUILD':`LAND ${ds.landValue} · ${used}/5${tags?` · ${tags}`:''}`;
const label=riskViewActive&&risk?`У ${riskDisplay(risk.earthquake.raw,{compact:true})} · П ${riskDisplay(risk.fire.raw,{compact:true})}`:normal;
return `<text class="${klass}" x="${x}" y="${y}">${label}</text>`;
}).join('');
}
const workerLayer=$('#workerLayer');
if(workerLayer){
const grouped={};
state.players.forEach(p=>playerWorkers(state,p.id).filter(w=>!w.jailed).forEach(w=>(grouped[w.districtId] ||= []).push({p,w})));
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
const byDistrict={};(state.constructions||[]).filter(x=>!['abandoned','redeveloped'].includes(x.status)).forEach(x=>(byDistrict[x.districtId] ||= []).push(x));
let html='';
Object.entries(byDistrict).forEach(([districtId,list])=>{
const [cx,cy]=DISTRICT_POS[districtId]||[0,0];
list.forEach((con,i)=>{
const [dx,dy]=TOKEN_OFFSETS[i]||[0,34+i*12];
const pl=state.players[con.playerId],pr=projectById(con.projectId),prog=constructionProgress(state,con.id);
const complete=con.status==='complete',isWarehouse=complete&&isWarehouseConstruction(con);
const isProducer=complete&&!!INDUSTRIAL_PRODUCTION[con.projectId];
const isContrabandSource=complete&&con.projectId==='customs_warehouse'&&contrabandInventory(con).length>0;
const isBeerSource=complete&&((con.projectId==='brewery'&&beerInventory(con).length>0)||(con.projectId===BREAD_FACTORY_ID&&breadInventory(con).length>0));
const focusClass=focusedConstructionId===con.id?'focus-pulse':'';
const whSource=deliveryMode?.step==='source'&&isWarehouse&&con.playerId===deliveryMode.playerId&&warehouseInventory(con).length?` data-delivery-warehouse="${con.id}"`:``;
const plantSource=deliveryMode?.step==='source'&&isProducer&&industrialInventory(con).length?` data-delivery-industry="${con.id}"`:``;
const beerSource=deliveryMode?.step==='source'&&isBeerSource?` data-delivery-goods="${con.id}"`:``;
const contrabandSource=deliveryMode?.step==='source'&&isContrabandSource?` data-delivery-contraband="${con.id}"`:``;
const dropAvailable=deliveryMode?.step==='unload'&&isMobile()&&deliveryTargetAcceptsAny(con);
const dropAttr=dropAvailable?` data-delivery-drop-target="${con.id}"`:``;
const interactionHit=whSource||plantSource||beerSource||contrabandSource
?'<rect class="construction-source-hit" x="-44" y="-32" width="88" height="64" rx="16"/>'
:dropAvailable?'<rect class="construction-drop-hit" x="-46" y="-34" width="92" height="68" rx="17"/>':'';
let content='';
if(isWarehouse||isProducer||isBeerSource||isContrabandSource){
const inv=isWarehouse?warehouseInventory(con):isProducer?industrialInventory(con):isBeerSource?(con.projectId===BREAD_FACTORY_ID?breadInventory(con):beerInventory(con)):contrabandInventory(con),cnt=deliveryCounts(inv);
const capacity=isWarehouse?warehouseStorageCapacity(con):isProducer?industrialProductionCapacity(state,con):isBeerSource&&con.projectId===BREAD_FACTORY_ID?(con.breadProductionQuantity||2):2;
content=`<rect x="-31" y="-19" width="62" height="38" rx="10"/>${projectSvgTypeStripe(pr,{x:-29,y:-18,width:58,height:5})}<text class="warehouse-token-title" y="-4">${isContrabandSource?'КОН':isBeerSource?(con.projectId===BREAD_FACTORY_ID?'ХЛЕБ':'ПИВ'):isWarehouse?'СКЛ':'ЗАВ'} ${inv.length}/${capacity}</text><text class="warehouse-token-stock" y="10">${isContrabandSource?'Ф'+(cnt.Contraband||0):isBeerSource?(con.projectId===BREAD_FACTORY_ID?'Х'+(cnt.Bread||0):'Р'+(cnt.Beer||0)):'Д'+(cnt.Lumber||0)+' К'+(cnt.Masonry||0)+' С'+(cnt.Steel||0)}</text>`;
}else{
const label=complete?'✓':`${prog.delivered}/${prog.required}`;
const showNeed=!!deliveryMode&&!complete;
const needText=showNeed?compactConstructionNeed(con):'';
content=showNeed
?`<rect x="-36" y="-21" width="72" height="44" rx="10"/>${projectSvgTypeStripe(pr,{x:-34,y:-20,width:68,height:5})}<text y="-2">${label}</text><text class="construction-need-text" y="13">${needText}</text>`
:`<rect x="-29" y="-16" width="58" height="32" rx="10"/>${projectSvgTypeStripe(pr,{x:-27,y:-15,width:54,height:5})}<text y="4">${label}</text>`;
}
const title=complete
?(isWarehouse?`${pl.name}: Склад · ${materialCountText(warehouseInventory(con))}`:isProducer?`${pl.name}: ${pr.name} · запас ${materialCountText(industrialInventory(con))}`:`${pl.name}: ${pr.name} · готово`)
:`${pl.name}: ${pr.name} · ${prog.delivered}/${prog.required} · ${missingConstructionMaterials(con).join(', ')}`;
html+=`<g class="construction-token ${complete?'complete':'under'} token-${pl.key} ${whSource||plantSource||beerSource||contrabandSource?'source-available':''} ${dropAvailable?'delivery-drop-available':''} ${deliveryDraft?.focusTargetId===con.id?'delivery-drop-focused':''} ${focusClass}" transform="translate(${cx+dx} ${cy+dy+30})" data-construction-token="${con.id}"${whSource}${plantSource}${beerSource}${contrabandSource}${dropAttr}>${interactionHit}${content}<title>${title}</title></g>`;
});
});
layer.innerHTML=html;
$$('[data-construction-token]').forEach(g=>g.onclick=e=>{
if(['route','unload'].includes(deliveryDraft?.step)&&g.dataset.deliveryDropTarget){
e.stopPropagation();openDeliveryTargetFromMap(g.dataset.deliveryDropTarget);return;
}
if(deliveryDraft)return;
e.stopPropagation();
focusConstruction(g.dataset.constructionToken);
});
$$('[data-delivery-warehouse]').forEach(g=>g.onclick=e=>{e.stopPropagation();chooseDeliverySource({kind:'warehouse',id:g.dataset.deliveryWarehouse});});
$$('[data-delivery-industry]').forEach(g=>g.onclick=e=>{e.stopPropagation();chooseDeliverySource({kind:'industry',id:g.dataset.deliveryIndustry});});
$$('[data-delivery-goods]').forEach(g=>g.onclick=e=>{e.stopPropagation();chooseDeliverySource({kind:'goods',id:g.dataset.deliveryGoods});});
$$('[data-delivery-contraband]').forEach(g=>g.onclick=e=>{e.stopPropagation();chooseDeliverySource({kind:'contraband',id:g.dataset.deliveryContraband});});
}
renderDeliveryRouteOverlay();
}
function startConstructionFlow(playerId,projectId){
deliveryDraft=null;
const pl=state.players[playerId],pr=projectById(projectId);
if(state.phase!=='development'){showToast('Сначала завершите тендеры');return;}
if(!canTakeMainAction(state,playerId)){showToast(activeWorker(state,playerId)?'Сейчас нельзя начать новое main action':'Сначала выберите одного из 3 представителей');return;}
if(!isStandardProject(projectId)&&!pl.portfolio.includes(projectId)){showToast('Проект уже недоступен');return;}
state.pendingWorkerAction=null;
state.pendingConstruction={playerId,projectId};
state.view='city';state.selectedDistrictId=state.selectedDistrictId||'civic';
mobileContextOpen=false;closeDrawers();render();
showToast(`Выберите район для «${pr.name}»`);
}
function confirmConstructionInDistrict(redevelopId=null){
const pending=state.pendingConstruction;if(!pending)return;
const r=beginConstruction(state,pending.playerId,pending.projectId,state.selectedDistrictId,{redevelopId});
if(!r.ok){showToast(r.reasons?.[0]||'Нельзя начать строительство здесь');render();return;}
mobileContextOpen=false;
const land=r.standardFee?`земля $${r.landCost} + проект $${r.standardFee} = $${r.cost}`:r.bureauDiscount>0?`земля $${r.landCost} · contract −$${r.bureauDiscount}`:`земля $${r.landCost}`;
showToast(`Основное действие: ${r.redevelopment?'перестройка · Lumber ×'+r.redeemedLumber:'стройка начата'} · ${land}${r.completedImmediately?' · сразу завершено':''}. Worker #${r.worker?.number} теперь в ${districtById(state.selectedDistrictId)?.name}.`);
render();
}
function confirmMoveWorkerInDistrict(targetDistrictId=state.selectedDistrictId){
 const pending=state.pendingWorkerAction;
 if(!pending||pending.type!=='moveWorker')return;
 const worker=activeWorker(state,pending.playerId);
 if(!worker){showToast('Сначала выберите свободного представителя');return;}
 if(targetDistrictId===worker.districtId){showToast('Для перемещения выберите соседний район, не текущий');return;}
 if(!workerCanReachDistrict(state,pending.playerId,targetDistrictId,worker.id)){showToast('Этот район недоступен за один шаг');return;}
 const from=worker.districtId;
 const r=moveWorker(state,pending.playerId,targetDistrictId);
 if(!r.ok){showToast(r.reason==='worker-range'?'Этот район недоступен за один шаг':'Перемещение сейчас недоступно');return;}
 state.pendingWorkerAction=null;
 state.selectedDistrictId=targetDistrictId;
 mobileContextOpen=false;
 showToast(`Перемещение · #${r.worker.number}: ${districtById(from)?.name||from} → ${districtById(targetDistrictId)?.name||targetDistrictId} · без дохода`);
 render();
}
function redevelopmentOptions(pending,districtId){
 return (state.constructions||[]).filter(c=>c.playerId===pending.playerId&&c.projectId==='wagonboarding'&&c.status==='complete'&&c.districtId===districtId)
   .map(con=>({con,check:constructionEligibility(state,pending.playerId,pending.projectId,districtId,{redevelopId:con.id})}));
}
function canBuildOrRedevelop(pending,districtId){
 return constructionEligibility(state,pending.playerId,pending.projectId,districtId).ok||redevelopmentOptions(pending,districtId).some(x=>x.check.ok);
}
function renderContext(){
const panel=$('#contextPanel');
const close=isMobile()?'<button class="context-close" id="contextClose" aria-label="Закрыть подробности">×</button>':'';
if(state.view==='hall'){
const m=state.market.find(x=>x&&x.uid===state.selectedMarketUid)||state.market.find(Boolean);
if(!m){panel.innerHTML=close+'<div class="empty-state">На рынке нет проекта.</div>';wireContextClose();return;}
const p=projectById(m.id),claims=m.claims.map(c=>state.players[c.player].name).join(', ')||'нет';
panel.innerHTML=`${close}<div class="detail-type-stripe" ${projectTypeStyle(p)}></div><div class="detail-type">${projectTypeLabel(p)}</div><h3>${p.name}</h3><div class="detail-price">$${openingPrice(m)} <span style="font-size:11px;color:#84786a">opening</span></div><div class="project-vp-callout"><b>+${p.prestige||0} VP</b> после завершения</div><div class="detail-section"><div class="detail-label">Материалы</div><div class="project-material-line">${resourcePills(p.materials)}</div></div><div class="detail-section"><div class="detail-label">Влияние на риск района</div>${projectRiskChips(p)}</div><div class="detail-section"><div class="detail-label">Условия строительства</div><div class="detail-text">${p.requires}</div></div><div class="detail-section"><div class="detail-label">После постройки</div><div class="detail-text">${p.effect}</div></div><div class="detail-section"><div class="detail-label">Тендер</div><div class="detail-text">Заявки: ${claims}<br>${m.age===1?'Последний шанс · скидка $1':'Новый проект'}${m.result?`<br><b>Результат: ${state.players[m.result.player].name} за $${m.result.price}</b>`:''}</div></div>`;
}else{
const d=districtById(state.selectedDistrictId)||DISTRICTS.find(x=>x.id==='civic')||DISTRICTS[0],ds=state.districts[d.id],access=districtAccess(state,d.id);
const used=districtConstructionCount(state,d.id),free=d.buildable===false?0:Math.max(0,ds.sites-used);
const builtHere=(state.constructions||[]).filter(x=>x.districtId===d.id&&!['abandoned','redeveloped'].includes(x.status));
const focusedHere=builtHere.find(x=>x.id===focusedConstructionId);
let focusedHtml='';
if(focusedHere){
const fp=projectById(focusedHere.projectId),owner=state.players[focusedHere.playerId];
if(focusedHere.status==='under-construction'){
const prog=constructionProgress(state,focusedHere.id),missing=missingConstructionMaterials(focusedHere);
focusedHtml=`<div class="focused-object-detail"><div class="focused-object-title"><span class="player-dot ${owner.key}"></span><span><b>${fp.name}</b><small>${owner.name} · стройка ${prog.delivered}/${prog.required}</small></span></div><div class="project-material-line">${resourcePills(fp.materials,focusedHere.materialsDelivered||[])}</div><div class="focused-object-note">${missing.length?'Нужно: '+missing.join(', '):'Все материалы доставлены'}</div></div>`;
}else if(isWarehouseConstruction(focusedHere)){
const inv=warehouseInventory(focusedHere);
focusedHtml=`<div class="focused-object-detail warehouse"><div class="focused-object-title"><span class="player-dot ${owner.key}"></span><span><b>Склад</b><small>${owner.name} · ${d.name} · ${inv.length}/${warehouseStorageCapacity(focusedHere)}</small></span></div><div class="focused-object-note">На складе: ${materialCountText(inv)}</div></div>`;
}else{
focusedHtml=`<div class="focused-object-detail"><div class="focused-object-title"><span class="player-dot ${owner.key}"></span><span><b>${fp.name}</b><small>${owner.name} · готово</small></span></div><div class="focused-object-note">VP +${fp.prestige||0} · Доход +${completedConstructionBaseIncome(fp,focusedHere)+(focusedHere.projectId==='wagonboarding'?(focusedHere.wagonLevel||1)-1:0)+canneryIncomeBonus(state,focusedHere)+workforceIncomeBonus(state,focusedHere)} / раунд</div></div>`;
}
}
const fireSource=serviceSourceText(access.fireSources),clinicSource=serviceSourceText(access.clinicSources);
const accessHtml=`<div class="access-grid">${accessChip('RAIL',access.rail)}${accessChip('PORT',access.port)}${accessChip('FIRE',access.fire)}${accessChip('CLINIC',access.clinic)}${accessChip('POLICE',access.police)}</div>${fireSource?`<div class="access-source">Fire Protection: ${fireSource}</div>`:''}${clinicSource?`<div class="access-source">Clinic access: ${clinicSource}</div>`:''}`;
let workerActionHtml='';
if(state.pendingWorkerAction?.type==='moveWorker'){
 const pid=state.pendingWorkerAction.playerId,w=activeWorker(state,pid);
 const canMove=!!w&&d.id!==w.districtId&&workerCanReachDistrict(state,pid,d.id,w.id);
 workerActionHtml=`<div class="construction-confirm ${canMove?'ok':'blocked'}"><div class="detail-label">Перемещение · основное действие</div><strong>Представитель #${w?.number||'—'} · без дохода</strong><div class="detail-text">${canMove?`Перейдёт в ${d.name} и завершит основное действие.`:d.id===w?.districtId?'Выберите соседний район, не текущий.':'Слишком далеко или район закрыт для движения.'}</div>${canMove?'<button class="primary-btn full" id="confirmMoveWorker">Переместиться сюда</button>':''}</div>`;
}).join('');
const wagonQuick=wagonActions?'<div class="wagon-upgrades"><b>🚋 Вагонный пансион · быстрое улучшение</b><small>Без рабочего. Один раз за год на пансион, в своей активации; перестройка — через обычное строительство.</small>'+wagonActions+'</div>':'';
const bakeryRows=active.filter(c=>c.projectId==='bakery'&&c.status==='complete').map(con=>{
 const sources=bakeryFuelSources(state,p.id,con.id),used=con.bakeryUsedRound===state.round;
 const available=!!sources.length&&!used&&isActive&&canUseFreeAction(state,p.id);
 const status=used?'Сезон завершён':!isActive?'Только в свою активацию':sources.length?'Можно переработать 1 Дерево':'Нужно 1 Дерево в пекарне или местном складе';
 return '<div class="wagon-upgrade-row bakery-action-row"><div><b>'+districtById(con.districtId).name+' · пекарня</b><small>Дерево в пекарне: '+bakeryInventory(con).length+'/1 · '+status+'</small></div><div class="bakery-buttons"><button class="secondary-btn" data-bakery-id="'+con.id+'" data-bakery-choice="cash" '+(available?'':'disabled')+'>1 Д → $7</button><button class="secondary-btn" data-bakery-id="'+con.id+'" data-bakery-choice="vp" '+(available?'':'disabled')+'>1 Д → +1 VP</button></div></div>';
}).join('');
const bakeryQuick=bakeryRows?'<div class="wagon-upgrades bakery-actions"><b>🥖 Пекарный сезон · быстрое действие</b><small>Раз в год на пекарню. Дерево можно доставить в неё напрямую или взять из своего склада в этом же районе. Без рабочего.</small>'+bakeryRows+'</div>':'';
const caseOptions=legalCaseOptions(state,p.id);
const caseUsed=caseOptions.ok&&caseOptions.used;
const caseVisible=caseOptions.ok&&(caseOptions.level>0||caseUsed);
const suspicionLevelNow=normalizeSuspicion(p.suspicion);
 const fineText=suspicionLevelNow<2?'годовой штраф отсутствует':suspicionLevelNow===2
  ?'в конце года: $3 или −1 шаг влияния'
  :'в конце года: $6, −2 шага влияния либо $3 и −1 шаг влияния';
 const suspicionInfo='<span class="office-suspicion-details" data-office-suspicion="'+suspicionLevelNow+'">Подозрение <b>'+suspicionStars(suspicionLevelNow)+'</b> · '+fineText+(suspicionLevelNow>=2?'; если ни один полный платёж недоступен — арест':'')+'. После оплаты звёзды сохраняются.</span>';
 const caseStatus=caseUsed?'В этом году уже использовано':
  !caseOptions.policeAccess?'Нужен свой неарестованный представитель в зоне завершённой полиции (чужая тоже подходит)':
  caseOptions.active?'Быстрое действие · один раз в год · −1 подозрение':'Доступно в собственный ход';
const caseInfo=caseVisible?'<div class="wagon-upgrades legal-case-actions"><b>⚖ Полиция · Уладить дело · '+('★'.repeat(caseOptions.level)||'☆☆☆')+'</b><small>'+caseStatus+'</small>'+(caseUsed?'':'<div class="legal-case-buttons"><button type="button" class="secondary-btn" data-legal-case="cash" '+(caseOptions.cash?'':'disabled')+'>−$'+caseOptions.capitalCost+' · −1 ★</button><button type="button" class="secondary-btn" data-legal-case="influence" '+(caseOptions.influence?'':'disabled')+'>−'+caseOptions.influenceCost+' шага Вл · −1 ★</button></div>')+'</div>':'';
// D3.1: keep the full roster in this Office; no new map, player-HUD or floating layer.
const roster=workerRosterPreview(state,p.id);
const rosterHtml=roster.ok?'<section class="office-staff-roster" aria-label="Штат и сроки заключения">'
  +'<div class="office-staff-head"><b>Штат · 3 представителя</b><small>Готовы '+roster.ready+' · арестованы '+roster.jailed+' · использованы '+roster.used+'</small></div>'
  +roster.workers.map(w=>{
    const location=districtById(w.districtId)?.name||w.districtId||'Civic Center';
    const title=w.jailed?'В заключении':w.replacementKind==='paid'?'Новый · наём за $7':w.replacementKind==='free'?'Новый · бесплатно':w.used?'Действие использовано':'Готов';
    let detail;
    if(w.jailed){
      const arrest=w.arrestYear===null?'Год ареста неизвестен':'Арест '+w.arrestYear;
      const paid=w.paidYear===null?'платный наём до конца Фазы I недоступен':'наём за $7: '+w.paidYear+' после мэрии';
      const free=w.freeYear===null?'бесплатной замены до конца Фазы I нет':'бесплатная замена: начало '+w.freeYear;
      detail=arrest+' · '+paid+' · '+free;
    }else if(w.replacementKind){
      detail=(w.replacementKind==='paid'?'Заменён за $7':'Штат пополнен бесплатно')
        +' в '+w.replacementYear+' · сейчас: '+location+' · '+(w.used?'действие использовано':'работник не использован');
    }else{
      detail='Сейчас: '+location+' · '+(w.used?'основное действие использовано':'работник не использован');
    }
    return '<div class="office-staff-row '+(w.jailed?'jailed':w.replacementKind?'replaced':'regular')+'" data-office-worker="'+escapeHtml(w.id)+'" data-office-worker-status="'+w.status+'">'
      +'<span class="office-staff-number">#'+w.number+'</span><span class="office-staff-main"><b>'+title+'</b><small>'+detail+'</small></span></div>';
  }).join('')+'</section>':'';
// D2: reuse the existing Office / mobile "Свободные" drawer for paid hires.
const hireOptions=paidReplacementOptions(state,p.id);
const hireInfo=hireOptions.ok&&hireOptions.jailed.length
 ?'<section class="paid-replacement-actions" aria-label="Наём сотрудников"><b>Наём нового сотрудника · $7</b><small>Свободное действие в свой ход, только в следующем году после ареста и после мэрии. Новый представитель приходит в Civic Center; прежний осуждённый исключается из штата и из финального штрафа.</small>'
  +hireOptions.jailed.map(w=>{
    const ready=w.eligible&&hireOptions.active&&hireOptions.affordable;
    const year=1899+w.arrestedRound;
    const remainingSlots=developmentSlotsRemaining(state,p.id);
    const status=!w.eligible?(w.arrestedRound>=MAX_ROUNDS?'В Фазе I наём недоступен':state.round>w.arrestedRound+1?'Период платного найма завершён':'Наём с '+(year+1)+' года, после мэрии')
      :!hireOptions.active?'Только в собственную активацию города'
      :!hireOptions.affordable?'Нужно $7'
      :state.activationMainActionUsed?(remainingSlots>1?'Новый сотрудник действует в следующем доступном окне':'Нового основного действия в этом году уже не будет'):'Можно использовать основное действие в этой активации';
    return '<div class="paid-replacement-row"><span><b>Представитель #'+w.number+'</b><small>Арест '+year+' · '+status+'</small></span>'
      +'<button type="button" class="secondary-btn" data-hire-worker="'+escapeHtml(w.id)+'" '+(ready?'':'disabled')+'>Нанять · $7</button></div>';
  }).join('')+'</section>'
 :'';
const mapObjectsBtn=active.length
?`<button class="secondary-btn full office-map-objects" id="showOfficeObjectsMap">Показать объекты ${p.name} на карте</button>`
:`<button class="secondary-btn full office-map-objects" disabled>Объектов на карте пока нет</button>`;
$('#officeContent').innerHTML=`<div class="office-tabs">${state.players.map((x,i)=>`<button class="office-tab ${i===inspectedOffice?'active':''}" data-office-tab="${i}">${x.name}</button>`).join('')}</div>${activationNote}${rosterHtml}${caseInfo}${hireInfo}${mapObjectsBtn}${wagonQuick}${bakeryQuick}<div class="office-summary four"><div class="office-stat"><span>Капитал</span><strong>$${p.capital}</strong></div><div class="office-stat"><span>VP</span><strong>${p.prestige||0}</strong></div><div class="office-stat"><span>Влияние / порядок</span><strong>${p.influence} · #${Math.max(0,turnOrder(state).indexOf(p.id))+1}</strong></div><div class="office-stat"><span>Income / простой</span><strong>+$${roundIncome(state,p.id)} / −$${upkeep}${fireFine?' · пожарный штраф −$'+fireFine+'/год':''}${breadFine?' · порча хлеба: постоянный Income −'+breadFine:''}</strong></div></div><div class="office-mini-note">Представители: <b>${p.workersLeft??0}/3</b> · Рука: <b>${p.portfolio.length}/${HAND_LIMIT}</b> · Доставка / завершение со склада / погашение кредита = свободные действия только во время собственной активации.${suspicionInfo}</div><div class="loan-panel"><div class="loan-head"><span><b>КРЕДИТЫ ${loans.length}/${MAX_ACTIVE_LOANS}</b><small>Долг $${debt} · Процент −$${interest} к следующему доходу</small></span><button class="mini-repay" id="repayLoanBtn" ${canRepay?'':'disabled'}>Погасить $6</button></div>${loanHtml}</div><div class="contract-line">${contract}${procurementChip}</div><div class="detail-label">Городские цели</div><div class="office-goals">${goalHtml}</div><div class="detail-label office-subhead">Доступные проекты</div><div style="margin-top:7px">${available||'<div class="empty-state">Нет доступных проектов. Получите их на сессии мэрии.</div>'}</div><div class="detail-label office-subhead" id="officeConstructionsTitle">Стройки и здания</div><div style="margin-top:7px">${activeHtml||'<div class="empty-state compact">Объектов пока нет.</div>'}</div><div class="district-placeholder"><b>v0.44:</b> City Hall Goals учитывают все построенные здания, включая завершённые до получения цели, без доплаты. Отчёт и награда — в следующей City Hall Session.</div>`;
$$('[data-office-tab]').forEach(b=>b.onclick=()=>{inspectedOffice=+b.dataset.officeTab;renderOffice();});
$$('[data-hire-worker]').forEach(b=>b.onclick=()=>{
 const result=hireReplacementWorker(state,p.id,b.dataset.hireWorker);
 if(!result.ok){
   showToast(result.reason==='capital'?'Нужно $7':result.reason==='same-year'?'Найм в год ареста запрещён':result.reason==='not-active-turn'?'Наём доступен только в свою активацию города':'Этот сотрудник ещё недоступен для найма');
   render();return;
 }
 showToast('Новый сотрудник #'+state.players[p.id].workers.find(w=>w.id===result.workerId)?.number+' нанят за $7 · Civic Center');
 render();
});
$$('[data-legal-case]').forEach(b=>b.onclick=()=>{
 const result=settleLegalCase(state,p.id,b.dataset.legalCase);
 if(!result.ok){
   const message=result.reason==='capital'?'Нужны '+caseOptions.capitalCost+' долларов':
     result.reason==='influence'?'Нужны '+caseOptions.influenceCost+' доступных шага влияния':
     result.reason==='no-police-access'?'Нет неарестованного представителя в зоне полиции':
     result.reason==='already-used'?'В этом году уже улаживали дело':'Действие сейчас недоступно';
   showToast(message);return;
 }
 showToast('Дело улажено · подозрение −1');render();
});
$('#showOfficeObjectsMap')?.addEventListener('click',()=>showObjectsOnMap(p.id));
$$('[data-start-project]').forEach(b=>b.onclick=()=>startConstructionFlow(+b.dataset.player,b.dataset.startProject));
document.querySelectorAll('[data-bakery-choice]').forEach(b=>b.onclick=()=>{
 const r=activateBakery(state,p.id,b.dataset.bakeryId,b.dataset.bakeryChoice);
 if(!r.ok){showToast(r.reason==='lumber'?'Привезите Дерево в пекарню или свой склад':r.reason==='already-used'?'Пекарный сезон уже завершён':'Действие пекарни сейчас недоступно');render();return;}
 showToast('Пекарный сезон: '+(r.choice==='cash'?'+$7':'+1 VP')+' · Дерево израсходовано');render();
});
document.querySelectorAll('[data-upgrade-wagon]').forEach(b=>b.onclick=()=>{
 const r=upgradeWagonBoarding(state,p.id,b.dataset.upgradeWagon);
 if(!r.ok){showToast(r.reason==='already-upgraded'?'Этот пансион уже улучшался в этом году':r.reason==='capital'?'Нужны $2':r.reason==='max-level'?'Достигнут III уровень':'Улучшение недоступно');return;}
 showToast('Вагонный пансион: уровень '+r.level+' · −$2, без рабочего');render();
});
$$('[data-sell-project-index]').forEach(b=>b.onclick=()=>{
  const r=useCommissionHouse(state,p.id,b.dataset.sellHouse,Number(b.dataset.sellProjectIndex));
  if(!r.ok){showToast(r.reason==='worker-range'?'Представитель слишком далеко от Комиссионного дома':r.reason==='occupied'?'Комиссионный дом уже использован в этом году':r.reason==='no-project'?'Нет доступного проекта':'Перепродажа сейчас недоступна');return;}
  showToast('Проект перепродан: +$4 · представитель использован');
  render();
});
$$('[data-complete-build]').forEach(b=>b.onclick=()=>{const r=completeConstructionFromStorage(state,b.dataset.completeBuild);if(!r.ok){showToast(r.reason==='not-active-player'?'Не ваша активация':'На стройке и Warehouse пока нет полного набора материалов');return;}showToast('Строительство завершено из Warehouse');render();});
const repay=$('#repayLoanBtn');if(repay)repay.onclick=()=>{const r=repayLoan(state,p.id);if(!r.ok){showToast(r.reason==='not-active-player'?'Погашение доступно только активному игроку':r.reason==='capital'?'Недостаточно денег':r.reason==='not-seasoned'?'Сначала по кредиту должна пройти фаза дохода':'Сейчас нельзя погасить');return;}showToast('Кредит погашен · −$6');render();};
}
function renderLog(){const el=$('#gameLog');el.innerHTML=state.log.map(x=>`<div class="${x.cls||''}">${escapeHtml(x.msg)}</div>`).join('');el.scrollTop=el.scrollHeight;}
function renderDebug(){
const players=state.players.map((p,i)=>`<div class="debug-player"><div class="debug-head"><span>${p.name}</span><span>${p.capital} · VP ${p.prestige||0} · +${roundIncome(state,p.id)} · Inf ${p.influence} · 👤 ${p.workersLeft??0}</span></div><div class="debug-actions"><button class="mini-btn" data-money="${i}" data-delta="5">+$5</button><button class="mini-btn" data-money="${i}" data-delta="-5">−$5</button><button class="mini-btn" data-inf="${i}" data-delta="1">Inf +1</button><button class="mini-btn" data-inf="${i}" data-delta="-1">Inf −1</button><button class="mini-btn" data-workers="${i}">👤 = 3</button><button class="mini-btn" data-debug-suspicion="${i}" data-delta="1">★ +1</button><button class="mini-btn" data-debug-suspicion="${i}" data-delta="-1">★ −1</button>${state.phase==='development'&&currentDeveloper(state)===p.id?`<button class="mini-btn" data-b2-jail-all="${i}">Тест B2: все в тюрьме</button>`:''}</div></div>`).join('');
const lands=DISTRICTS.map(d=>`<div class="debug-land"><span>${d.name}</span><div><button class="mini-btn" data-land="${d.id}" data-delta="-1">−</button><b>${state.districts[d.id].landValue}</b><button class="mini-btn" data-land="${d.id}" data-delta="1">+</button></div></div>`).join('');
$('#debugPlayers').innerHTML=players+`<div class="debug-section-title">Land Value</div>${lands}`;
$$('[data-money]').forEach(b=>b.onclick=()=>{const p=state.players[+b.dataset.money];p.capital=Math.max(0,p.capital+(+b.dataset.delta));render();});
$$('[data-inf]').forEach(b=>b.onclick=()=>{moveInfluence(state,+b.dataset.inf,+b.dataset.delta);render();});
$$('[data-debug-suspicion]').forEach(b=>b.onclick=()=>{changeSuspicion(state,+b.dataset.debugSuspicion,+b.dataset.delta);render();});
$$('[data-workers]').forEach(b=>b.onclick=()=>{const pid=+b.dataset.workers;state.players[pid].workersLeft=3;if(state.phase==='development'){state.developmentComplete=false;if(currentDeveloper(state)==null){state.developmentPlayer=pid;state.activationMainActionUsed=false;}}render();});
$$('[data-b2-jail-all]').forEach(b=>b.onclick=()=>{const pid=+b.dataset.b2JailAll;if(state.phase!=='development'||currentDeveloper(state)!==pid)return;for(const w of playerWorkers(state,pid)){if(!w.jailed)jailWorker(state,pid,w.id);}showToast('Тестер B2: сотрудники под стражей без штрафов. Сервисный ход доступен.');render();});
$$('[data-land]').forEach(b=>b.onclick=()=>{const id=b.dataset.land;setLandValue(state,id,state.districts[id].landValue+(+b.dataset.delta));render();});
}
function openDrawer(id){closeMobileContext();closeDrawers();document.body.classList.add('drawer-open');$('#drawerBackdrop').classList.add('open');$('#'+id).classList.add('open');}
function closeDrawers(){document.body.classList.remove('drawer-open');$('#drawerBackdrop').classList.remove('open');$$('.drawer').forEach(d=>d.classList.remove('open'));}
function newGame(){if(!confirm('Начать новую тестовую партию?'))return;deliveryDraft=null;overviewPlayerId=null;focusedConstructionId=null;riskViewActive=false;newsMapVisible=false;newsEmergencyMode=false;newsSheetOpen=false;newsArchiveIndex=null;upkeepSelectedConstructionId=null;state=createInitialState();inspectedOffice=0;undoHistory=[];lastSavedSnapshot=JSON.stringify(state);lastSavedFingerprint=gameplayFingerprint(state);localStorage.removeItem(STORAGE_KEY);LEGACY_STORAGE_KEYS.forEach(k=>localStorage.removeItem(k));closeDrawers();closeMobileContext();render();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
$$('.nav-btn[data-view]').forEach(b=>b.onclick=()=>{mobileContextOpen=false;state.view=b.dataset.view;render();});
$('#officeBtn').onclick=()=>{if(state.phase==='draft'){showToast('Офисы откроются после стартового драфта');return;}inspectedOffice=preferredOfficePlayer();openDrawer('officeDrawer');renderOffice();};
$('#logBtn').onclick=()=>openDrawer('logDrawer');
$('#settingsBtn').onclick=()=>openDrawer('settingsDrawer');
$('#newsOpenBtn').onclick=()=>openNewspaper();
$('#newsCloseBtn').onclick=closeNewspaper;
$('#newsBackdrop').onclick=closeNewspaper;
$('#newsMapBtn').onclick=toggleNewspaperMap;
$('#newsEmergencyCancel').onclick=()=>{newsEmergencyMode=false;render();};
$('#newsEmergencyCancelMobile').onclick=()=>{newsEmergencyMode=false;render();};
const callNode=$('#callBuildingNode');
if(callNode){
  callNode.addEventListener('click',()=>openNewspaper());
  callNode.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();openNewspaper();}
  });
}
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&newsSheetOpen)closeNewspaper();
  else if(event.key==='Escape'&&newsEmergencyMode){newsEmergencyMode=false;render();}
});
$('#undoBtn').onclick=undoLastGameAction;
$('#helpBtn').onclick=()=>{showToast('v0.44: в City Hall можно взять до 1 городской цели; выполненные цели отчитываются в начале следующего года. Influence и простой строек работают как в v0.43B.');};
$('#drawerBackdrop').onclick=closeDrawers;
$('#contextBackdrop').onclick=closeMobileContext;$$('[data-close-drawer]').forEach(b=>b.onclick=closeDrawers);
$('#modalBackdrop').onclick=()=>{};
$('#newGameBtn').onclick=newGame;
$('#copyLogBtn').onclick=async()=>{const text=state.log.map(x=>x.msg).join('\n');try{await navigator.clipboard.writeText(text);showToast('Лог скопирован');}catch{prompt('Скопируйте лог:',text);}};
$('#endRoundBtn').onclick=()=>{
deliveryDraft=null;overviewPlayerId=null;focusedConstructionId=null;state.pendingConstruction=null;state.pendingWorkerAction=null;mobileContextOpen=false;
const r=cleanupMarket(state);
if(!r.ok){
if(r.reason==='development-not-complete')showToast('Сначала используйте всех представителей');
else if(r.reason==='upkeep-choice')showToast('Income начислен. Не хватает денег на простой — выберите стройку для закрытия.');
 else if(r.reason==='crime-choice')showToast('Годовая криминальная проверка: выберите полный платёж или сотрудника для ареста.');
 else if(r.reason==='pending-press-campaign')showToast('После газеты выберите эффект газетного небоскрёба.');
 else if(r.reason==='pending-building-choice')showToast('Сначала привяжите рабочий корпус к фабрике или консервному заводу.');
else showToast('Переход года сейчас недоступен');
render();return;
}
newsEmergencyMode=false;newsArchiveIndex=null;state.view=r.finished?'city':'hall';render();
showToast(r.finished?'Итоговый выпуск газеты готов':'Новый год начался · порядок хода пересчитан по Influence');
};
const riskViewBtn=$('#riskViewBtn');if(riskViewBtn)riskViewBtn.onclick=()=>{riskViewActive=!riskViewActive;render();showToast(riskViewActive?'Режим риска: У / П по всем районам':'Обычный вид карты');};
const mapFit=$('#mapZoomFit');if(mapFit)mapFit.onclick=()=>{mobileMapDetail=false;syncMapZoom();};
const mapDetail=$('#mapZoomDetail');if(mapDetail)mapDetail.onclick=()=>{mobileMapDetail=true;syncMapZoom();};
$$('[data-district]').forEach(g=>g.onclick=()=>{
const id=g.dataset.district;
if(newsEmergencyMode){
  const pid=currentDeveloper(state);
  if(pid==null){newsEmergencyMode=false;showToast('Экстренные меры доступны только во время развития города');render();return;}
  const r=takeNewspaperEmergency(state,pid,id);
  if(!r.ok){
    const errors={'worker-range':'Действуйте в районе представителя или соседнем',
      'select-active-worker':'Сначала выберите действующего представителя',
      'district-not-buildable':'В этой зоне нет городской застройки',
      'already-protected':'Здесь уже приняты экстренные меры',
      'need-$1':'Не хватает $1'};
    showToast(errors[r.reason]||'Нельзя применить экстренные меры: '+r.reason);
    return;
  }
  newsEmergencyMode=false;
  state.selectedDistrictId=id;
  showToast('Экстренные меры выполнены: '+(districtById(id)?.name||id)+' · −$1');
  render();return;
}
if(deliveryDraft?.step==='route'){addDeliveryRouteDistrict(id);return;}
if(deliveryDraft)return;
state.selectedDistrictId=id;
if(state.pendingWorkerAction?.type==='moveWorker'){
confirmMoveWorkerInDistrict(id);
return;
}
if(isMobile())mobileContextOpen=true;
render();
});
window.addEventListener('resize',()=>{if(!isMobile())mobileContextOpen=false;syncMobileContext();syncMapZoom();syncStickyLayout();});
loadDevMapBackground();
render();
