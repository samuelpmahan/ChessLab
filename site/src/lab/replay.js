import {createExecBoard,pxKey} from './board.js?v=c3676fb15de8ce7ded90f50ef42e2b99558273a8658873b3a5146afa1e1a70dc';
/** Navigation changes the viewed frame; it never reruns or edits the experiment. */
export function createReplay   (frames             ) {
 if(!frames.length)throw Error('Replay needs at least one frame');
 const px=createExecBoard(),frame=pxKey   ('px.story.frame'),cursor=pxKey        ('px.story.cursor');
 const seek=(index       )=>{if(!Number.isInteger(index)||index<0||index>=frames.length)throw Error('Frame out of range');px.set(cursor,index);px.set(frame,frames[index]);return frames[index];};
 seek(0);
 return {px,current:()=>px.get(frame),index:()=>px.get(cursor),seek,next:()=>seek(Math.min(frames.length-1,px.get(cursor)+1)),back:()=>seek(Math.max(0,px.get(cursor)-1)),count:frames.length};
}
