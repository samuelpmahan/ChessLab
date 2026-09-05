import {createExecBoard,trackAccess} from './board.ts';
import type {PxC} from './board.ts';
import type {OperationSpec} from './contract.ts';
export interface Cartridge {
 id:string;
 stages:readonly {id:string;variant:string;operation:OperationSpec;execute:(px:PxC)=>void}[];
}
/** First synchronous cartridge host. Shares ChainSpot's OperationSpec and access tracking.
 * This is not yet its compiled gateway/PCR, stage discovery, or tidy integration.
 */
export function loadCartridge(cartridge:Cartridge){
 const px=createExecBoard();
 const ticks:{stage:string;variant:string;operation:string;reads:string[];writes:unknown[]}[]=[];
 return {px,ticks,run(stageId:string){
  const stage=cartridge.stages.find(s=>s.id===stageId);
  if(!stage)throw Error('Unknown stage: '+stageId);
  for(const key of stage.operation.consumes)if(!px.has(key))throw Error('Missing input: '+key);
  const access=trackAccess(px,stage.operation);
  stage.execute(access.tracked);
  const record={stage:stage.id,variant:stage.variant,operation:stage.operation.id,reads:[...access.consumed],writes:access.writes};ticks.push(record);return record;
 }};
}
