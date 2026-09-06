import {createExecBoard,pxKey} from './board.js?v=fa516eb9d427ea75fc05aa6f334df34cf6754f748ecfd6fc971f7e4d4b38d78f';
/** Navigation changes the viewed frame; it never reruns or edits the experiment. */
export function createReplay   (frames             ) {
 if(!frames.length)throw Error('Replay needs at least one frame');
 const px=createExecBoard(),frame=pxKey   ('px.story.frame'),cursor=pxKey        ('px.story.cursor');
 const seek=(index       )=>{if(!Number.isInteger(index)||index<0||index>=frames.length)throw Error('Frame out of range');px.set(cursor,index);px.set(frame,frames[index]);return frames[index];};
 seek(0);
 return {px,current:()=>px.get(frame),index:()=>px.get(cursor),seek,next:()=>seek(Math.min(frames.length-1,px.get(cursor)+1)),back:()=>seek(Math.max(0,px.get(cursor)-1)),count:frames.length};
}
