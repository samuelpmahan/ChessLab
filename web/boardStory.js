import {boardStory} from './src/chess/boardStory.js';
const NS='http://www.w3.org/2000/svg';
const colors={move:'#ffd080',preview:'#d2b6ff',check:'#ff846d',support:'#70d5ff'};
function svg(tag,attrs={}){const el=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));return el;}
/** Positions are measured from the displayed cells, keeping arrows aligned at every size. */
export function renderBoardStory(board,snapshot,frame,focus){
 board.querySelector('.story-overlay')?.remove();
 for(const mark of board.querySelectorAll('.story-mark'))mark.remove();
 const story=boardStory(snapshot,focus,frame.change);
 const layer=svg('svg',{'class':'story-overlay','aria-hidden':'true'});
 const bounds=board.getBoundingClientRect();layer.setAttribute('viewBox',`0 0 ${bounds.width} ${bounds.height}`);
 const defs=svg('defs');
 for(const [kind,color] of Object.entries(colors)){
  const marker=svg('marker',{id:`arrow-${kind}`,viewBox:'0 0 10 10',refX:9,refY:5,markerWidth:3,markerHeight:3,orient:'auto-start-reverse'});
  marker.append(svg('path',{d:'M 0 0 L 10 5 L 0 10 z',fill:color}));defs.append(marker);
 }
 layer.append(defs);
 const point=sq=>{const r=board.querySelector(`[data-square="${sq}"]`)?.getBoundingClientRect();return r?{x:r.x-bounds.x+r.width/2,y:r.y-bounds.y+r.height/2}:null;};
 for(const a of story.arrows){
  const from=point(a.from),to=point(a.to);if(!from||!to)continue;
  const dx=to.x-from.x,dy=to.y-from.y,len=Math.hypot(dx,dy),pad=Math.min(13,len/4);
  const line=svg('line',{x1:from.x+dx/len*pad,y1:from.y+dy/len*pad,x2:to.x-dx/len*pad,y2:to.y-dy/len*pad,stroke:colors[a.kind],'stroke-width':a.kind==='support'?3:5,'stroke-opacity':.85,'marker-end':`url(#arrow-${a.kind})`});
  if(a.kind==='preview')line.setAttribute('stroke-dasharray','8 5');
  const title=svg('title');title.textContent=`${a.label}: ${a.from} to ${a.to}`;line.append(title);layer.append(line);
 }
 for(const m of story.marks){const cell=board.querySelector(`[data-square="${m.square}"]`);if(!cell)continue;const badge=document.createElement('span');badge.className=`story-mark ${m.kind}`;badge.textContent=m.label;cell.append(badge);}
 board.append(layer);
 const caption=document.querySelector('#board-story');caption.replaceChildren();
 const heading=document.createElement('strong');heading.textContent=story.title;caption.append(heading);
 const note=document.createElement('span');note.textContent=story.notes.join(' ');caption.append(note);
 const legend=document.createElement('span');legend.className='story-legend';legend.textContent='Gold: played · Dashed: preview · Red: check / attack · Blue: support';caption.append(legend);
}
