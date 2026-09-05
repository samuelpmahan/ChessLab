import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Board,King,Queen,attacks,compose,specimen,session} from '../src/state.ts';
test('specimen mate has complete response witnesses',()=>{
 const s=compose(specimen());assert.equal(s.checkmate.value,true);
 assert.deepEqual(s.checkmate.has.responses.map(r=>r.to).sort(),['g7','g8','h7']);
 const capture=s.checkmate.has.responses.find(r=>r.to==='g7');assert.equal(capture.has.capture.id,'WQ');assert.equal(capture.has.attacks[0].source,'WK');
});
test('moving supporting king makes capture a legal escape and retains previous state',()=>{
 const l=session();l.refine(new Board([King('WK','white','e5'),Queen('WQ','white','g7'),King('BK','black','h8')]));
 assert.equal(l.current().state.checkmate.value,false);assert.equal(l.current().state.legal_moves.set[0].to,'g7');assert.equal(l.history[0].state.checkmate.value,true);assert.notEqual(l.history[0].hash,l.current().hash);
});
test('stalemate is not checkmate',()=>{
 const s=compose(new Board([King('WK','white','f7'),Queen('WQ','white','g6'),King('BK','black','h8')]));assert.equal(s.stalemate,true);assert.equal(s.checkmate.value,false);
});
test('queen rays stop at occupancy',()=>{
 const b=new Board([King('WK','white','a1'),Queen('WQ','white','d4'),Queen('BQ','black','d6'),King('BK','black','h8')]);
 const a=attacks(b,b.at('d4')!).map(a=>a.target);assert.ok(a.includes('d6'));assert.ok(!a.includes('d7'));
});
test('capture recomputes newly exposed queen ray',()=>{
 const b=new Board([King('WK','white','a1'),Queen('WQ','white','h1'),Queen('WQ2','white','h7'),King('BK','black','h8')]);
 const r=compose(b).checkmate.has.responses.find(r=>r.to==='h7');assert.equal(r.legal,false);assert.ok(r.has.attacks.some(a=>a.source==='WQ'));
});
test('malformed positions and wrong-side check rejected; JSON restore recomposes',()=>{
 assert.throws(()=>new Board([King('a','white','a1'),King('b','black','a2')]));
 assert.throws(()=>session(new Board(specimen().pieces,'white')));
 const s=JSON.parse(JSON.stringify(session().current().state));assert.deepEqual(compose(new Board(s.position.pieces,s.position.sideToMove)),s);
});
