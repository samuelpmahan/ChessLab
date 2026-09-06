import {createExecBoard,trackAccess} from './board.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
                                    
                                                 
                            
           
                                                                                             
 
/** First synchronous cartridge host. Shares ChainSpot's OperationSpec and access tracking.
 * This is not yet its compiled gateway/PCR, stage discovery, or tidy integration.
 */
export function loadCartridge(cartridge          ){
 const px=createExecBoard();
 const ticks                                                                                 =[];
 return {px,ticks,run(stageId       ){
  const stage=cartridge.stages.find(s=>s.id===stageId);
  if(!stage)throw Error('Unknown stage: '+stageId);
  for(const key of stage.operation.consumes)if(!px.has(key))throw Error('Missing input: '+key);
  const access=trackAccess(px,stage.operation);
  stage.execute(access.tracked);
  const record={stage:stage.id,variant:stage.variant,operation:stage.operation.id,reads:[...access.consumed],writes:access.writes};ticks.push(record);return record;
 }};
}
