import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boardStory} from '../src/chess/boardStory.ts';
import {runDebugger} from '../src/chess/debugger.ts';
import {famousGame} from '../src/famousGame.ts';
test('mate story connects checking queen and supporting knight to blocked king exit',()=>{
 const s=runDebugger(famousGame.frames[3]).snapshot;
 const before=JSON.stringify(s);
 const story=boardStory(s,{},famousGame.frames[3].change);
 assert.ok(story.arrows.some(a=>a.from==='h7'&&a.to==='h8'&&a.kind==='check'));
 assert.ok(story.arrows.some(a=>a.from==='f8'&&a.to==='h7'&&a.kind==='support'));
 assert.ok(story.marks.some(m=>m.square==='h7'&&m.kind==='blocked'));
 assert.equal(JSON.stringify(s),before);
});
test('selected Qe3 projects actual retained mate reply from its future square',()=>{
 const s=runDebugger(famousGame.frames[1]).snapshot;
 const candidate=s.sides.black.candidates.find(c=>c.id==='a7e3')!;
 const story=boardStory(s,{candidate});
 assert.ok(story.arrows.some(a=>a.from==='a7'&&a.to==='e3'&&a.kind==='preview'));
 assert.ok(story.arrows.some(a=>a.from==='e4'&&a.to==='h7'&&a.kind==='preview'));
 assert.ok(story.arrows.some(a=>a.from==='h7'&&a.to==='h8'&&a.kind==='check'));
});
