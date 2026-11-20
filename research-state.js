/**
 * SF1906 research state foundation (R01–R08).
 *
 * One canonical record per research ID. This module owns migration and
 * selectors; acquisition, financing and global effects are implemented by
 * the shared game-core research transactions, not duplicated here.
 *
 * Future R09 is registered in research-cards.js, not hard-coded in this module.
 */
import {RESEARCH_CARDS,researchCardById} from './research-cards.js';

export const RESEARCH_STATUSES=Object.freeze(['available','held','funded']);

function newEntry(){
  return {status:'available',holderId:null,fundedRound:null};
}

export function createResearchState(){
  return Object.fromEntries(RESEARCH_CARDS.map(card=>[card.id,newEntry()]));
}

/**
 * Idempotent, additive migration for old saves with no research field.
 * Never reassign existing card records, so held/funded research survives reload.
 * Unknown entries are retained for forward-compatible saves; validation reports
 * them without destructively rewriting a saved game.
 */
export function ensureResearchState(state){
  if(!state||typeof state!=='object')throw new TypeError('game-state-required');
  if(!state.research||typeof state.research!=='object'||Array.isArray(state.research))
    state.research={};
  for(const card of RESEARCH_CARDS){
    if(!Object.hasOwn(state.research,card.id))
      state.research[card.id]=newEntry();
  }
  return state.research;
}

/** Non-mutating per-card snapshot; missing entries in legacy saves are available. */
export function researchCardState(state,id){
  if(!researchCardById(id))return null;
  const entry=state?.research?.[id];
  return entry?{...entry}:newEntry();
}

/** Canonical registry-backed listing, never an independent research deck. */
export function listResearchStates(state,{status=null,holderId=null}={}){
  return RESEARCH_CARDS.map(card=>({id:card.id,...researchCardState(state,card.id)}))
    .filter(entry=>(status===null||entry.status===status)
      &&(holderId===null||entry.holderId===holderId));
}

/** Non-destructive integrity diagnostics for future acquire/fund transactions. */
export function validateResearchState(state){
  const errors=[];
  const entries=state?.research;
  if(!entries||typeof entries!=='object'||Array.isArray(entries))return ['missing-research-state'];
  const registered=new Set(RESEARCH_CARDS.map(c=>c.id));
  for(const id of Object.keys(entries))if(!registered.has(id))errors.push(id+':unknown-id');
  const players=new Set((state.players||[]).map(p=>p.id));
  for(const card of RESEARCH_CARDS){
    const id=card.id,entry=entries[id];
    if(!entry||typeof entry!=='object'||Array.isArray(entry)){
      errors.push(id+':missing-entry');continue;
    }
    if(!RESEARCH_STATUSES.includes(entry.status)){
      errors.push(id+':invalid-status');continue;
    }
    if(entry.status==='available'&&(entry.holderId!==null||entry.fundedRound!==null))
      errors.push(id+':available-has-owner-or-round');
    if(entry.status==='held'&&(!players.has(entry.holderId)||entry.fundedRound!==null))
      errors.push(id+':invalid-held');
    if(entry.status==='funded'&&(!players.has(entry.holderId)
      ||!Number.isInteger(entry.fundedRound)||entry.fundedRound<1
      ||entry.fundedRound>state.round))
      errors.push(id+':invalid-funded');
  }
  return errors;
}
