import {createExecBoard,trackAccess} from './board.js?v=c3676fb15de8ce7ded90f50ef42e2b99558273a8658873b3a5146afa1e1a70dc';


import {sha256HexSyncText} from './sha256.js?v=c3676fb15de8ce7ded90f50ef42e2b99558273a8658873b3a5146afa1e1a70dc';




/** First synchronous cartridge host. Shares ChainSpot's OperationSpec and access tracking.
 * This is not yet its compiled gateway/PCR, stage discovery, or tidy integration.
 */
export function loadCartridge(cartridge          ){
 const px=createExecBoard();
 const ticks                                                           =[];
 return {px,ticks,run(stageId       ,variant='clean'){
  const stage=cartridge.stages.find(s=>s.id===stageId&&s.variant===variant);
  if(!stage)throw Error(`Unknown stage: ${stageId}/${variant}`);
  for(const key of stage.operation.consumes)if(!px.has(key))throw Error('Missing input: '+key);
  const startedAtMs=Date.now();
  const access=trackAccess(px,stage.operation);
  stage.execute(access.tracked);
  if(stage.operation.accessConformance==='exact'){
   const mismatch=(declared                  ,actual                    )=>declared.length!==actual.size||declared.some(address=>!actual.has(address));
   if(mismatch(stage.operation.consumes,access.consumed)||mismatch(stage.operation.produces,access.produced)){
    throw Error(`PxC: Tick '${stage.operation.id}' actual access differs from its exact declaration.`);
   }
  }
  const frozenCalculations                    =[...access.called].map(address=>{
   const calculate=access.registered.get(address);
   if(!calculate)throw Error(`PxC: Tick '${stage.operation.id}' called '${address}' without registering its implementation in this Tick.`);
   return {address,implementationHash:sha256HexSyncText(calculate.toString()),identityScope:'runtime-function-body',limitation:'called helpers, constants, templates, and assets are not covered'};
  });
  const receipt        ={opId:stage.operation.id,frozenCalculations,startedAtMs,durationMs:Date.now()-startedAtMs,
   declaredConsumes:stage.operation.consumes,declaredProduces:stage.operation.produces,
   actualConsumes:[...access.consumed],actualProduces:[...access.produced],writes:access.writes,probes:[],artifacts:[]};
  const record={stage:stage.id,variant:stage.variant,operation:stage.operation.id,...receipt};ticks.push(record);return record;
 }};
}
