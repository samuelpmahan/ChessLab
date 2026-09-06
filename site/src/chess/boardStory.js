





/** Pure Story projection: reads retained constructions; never generates moves or scores. */
export function boardStory(snapshot                 ,focus           ={},change                                                                 )            {
 const story           ={title:'Position',arrows:[],marks:[],notes:[]};
 const add=(from       ,to       ,kind                   ,label       )=>{
  if(!/^[a-h][1-8]$/.test(from)||!/^[a-h][1-8]$/.test(to)||from===to)return;
  if(!story.arrows.some(a=>a.from===from&&a.to===to&&a.kind===kind))story.arrows.push({from,to,kind,label});
 };
 const c=focus.candidate;
 if(c){
  story.title=c.legal?'Candidate preview · board remains at current position':'Rejected move · why it fails';
  add(c.from,c.to,'preview',c.legal?'candidate':'rejected');
  story.marks.push({square:c.to,label:c.legal?'TRY':'NO',kind:c.legal?'ghost':'blocked'});
  story.notes.push(`${c.source.type} ${c.from} → ${c.to}: ${c.score?.explanation.join('; ') || c.reasonText.join('; ')}.`);
  for(const w of c.kingSafetyWitnesses)add(w.sourcePiece.square,w.target,'check','king unsafe');
  const reply=c.score?.opponentMateWitnesses[0];
  if(reply){
   add(reply.reply.slice(0,2),reply.reply.slice(2,4),'preview','reply → mate');
   story.notes.push(`Then ${reply.reply.slice(0,2)} → ${reply.reply.slice(2,4)} is a mating reply. Dashed arrows are hypothetical.`);
   for(const w of reply.checkingSources)add(w.sourcePiece.square,w.target,'check','mate');
  }
  return story;
 }
 if(focus.piece && focus.pieceRelation){
  const p=focus.piece,r=focus.pieceRelation;story.title=`${p.type} on ${p.square} · relationships`;
  for(const w of r.attackedBy)add(w.sourcePiece.square,p.square,'check','attacks');
  for(const w of r.defendedBy)add(w.sourcePiece.square,p.square,'support','defends');
  for(const w of r.attacks.filter(w=>w.occupiedBy))add(p.square,w.target,w.relation==='defend'?'support':'check',w.relation==='defend'?'defends':'attacks');
  story.notes.push('Lines show occupied targets, attackers, and defenders. Highlighted squares show the complete attack set.');
  return story;
 }
 if(change){add(change.source,change.target,'move',change.san??'last move');story.notes.push(`Played ${change.san??`${change.source} → ${change.target}`}${change.capture?' · capture':''}.`);}
 const side=snapshot.sides[snapshot.sideToMove];
 if(side.inCheck){
  story.title=side.checkmate?'Checkmate · every exit fails':'Check · find a response';
  for(const w of side.checkWitnesses)add(w.sourcePiece.square,w.target,'check','check');
  // King response records already contain attacks recomputed AFTER its move.
  for(const response of side.candidates.filter(c=>c.source.type==='King'&&!c.legal)){
   story.marks.push({square:response.to,label:'×',kind:'blocked'});
   for(const w of response.kingSafetyWitnesses)add(w.sourcePiece.square,response.to,'support','covers exit');
  }
  story.notes.push(side.checkmate?'Red: checking line. Blue: pieces covering attempted king exits. ×: rejected king destination.':'Red: checking line. Blue: covered king exits. Inspect rejected moves for the exact reason.');
 }else if(!change && focus.nextMove){
  story.title='Next recorded move';add(focus.nextMove.source,focus.nextMove.target,'preview',focus.nextMove.san??'next');
  story.notes.push('Dashed arrow previews the next move in this replay; press Next to see its consequences.');
 }else{story.title='Last move · current position';story.notes.push('Select a piece or candidate to reveal its relationships on the board.');}
 return story;
}
