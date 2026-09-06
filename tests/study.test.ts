import {test} from 'node:test';
import assert from 'node:assert/strict';
import {moveStudyPiece,normalizeStudyLabel,prepareStudyFrame,STUDY_HISTORY_LIMITATION,studyPieceMatches} from '../src/chess/study.ts';

test('all color-first piece aliases normalize without conflating black pieces with bishops',()=>{
 for(const color of ['W','B'])for(const type of 'KQRBNP'){
  assert.equal(normalizeStudyLabel(`${color}${type}`),`${type}${color.toLowerCase()}`);
 }
});

test('loaded FEN remains intact until a study edit creates a history-free sandbox',()=>{
 const loaded=prepareStudyFrame({fen:'7k/6Q1/5K2/8/8/8/8/8 b KQ e3 4 12',pieces:[{square:'f6',label:'Kw'},{square:'g7',label:'Qw'},{square:'h8',label:'Kb'}],sideToMove:'black'});
 assert.equal(loaded.fen,'7k/6Q1/5K2/8/8/8/8/8 b KQ e3 4 12');
 const edited=moveStudyPiece(loaded,'WK','e5');
 assert.equal(edited.fen,'7k/6Q1/8/4K3/8/8/8/8 b - - 0 1');
 assert.match(edited.note??'',new RegExp(STUDY_HISTORY_LIMITATION));
});

test('identifier aliases also match S0 materialized piece objects',()=>{
 assert.equal(studyPieceMatches({id:'Qw@g7',square:'g7',label:'Qw'},'WQ'),true);
 assert.equal(studyPieceMatches({id:'Qw@g7',square:'g7',type:'Queen',color:'white'} as any,'WQ'),true);
});
