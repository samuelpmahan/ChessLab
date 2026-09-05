// Verified historical replay fixture. See fixtures/fritz-kramnik.pgn.
export const famousGame = {
  "id": "fritz-kramnik-2006",
  "title": "Deep Fritz vs Kramnik \u00b7 2006 \u00b7 Game 2",
  "source": "https://en.chessbase.com/post/man-vs-machine-shocker-kramnik-allows-mate-in-one",
  "verification": "Full published game replayed with python-chess 1.11.2; legal moves and check status exported per frame. Replay consumes verified fixtures, not a live engine.",
  "frames": [
    {
      "title": "Before the finish",
      "note": "White to move. Watch the white knight on e6 and queen on e4.",
      "fen": "5r1k/q5p1/4N2p/4P3/pp2Q3/8/1P4PP/2b4K w - - 0 34",
      "pieces": [
        {
          "square": "c1",
          "label": "Bb"
        },
        {
          "square": "h1",
          "label": "Kw"
        },
        {
          "square": "b2",
          "label": "Pw"
        },
        {
          "square": "g2",
          "label": "Pw"
        },
        {
          "square": "h2",
          "label": "Pw"
        },
        {
          "square": "a4",
          "label": "Pb"
        },
        {
          "square": "b4",
          "label": "Pb"
        },
        {
          "square": "e4",
          "label": "Qw"
        },
        {
          "square": "e5",
          "label": "Pw"
        },
        {
          "square": "e6",
          "label": "Nw"
        },
        {
          "square": "h6",
          "label": "Pb"
        },
        {
          "square": "a7",
          "label": "Qb"
        },
        {
          "square": "g7",
          "label": "Pb"
        },
        {
          "square": "f8",
          "label": "Rb"
        },
        {
          "square": "h8",
          "label": "Kb"
        }
      ],
      "sideToMove": "white",
      "check": false,
      "checkmate": false,
      "legalMoves": [
        "e6f8",
        "e6d8",
        "e6g7",
        "e6c7",
        "e6g5",
        "e6c5",
        "e6f4",
        "e6d4",
        "e4a8",
        "e4h7",
        "e4b7",
        "e4g6",
        "e4c6",
        "e4f5",
        "e4d5",
        "e4h4",
        "e4g4",
        "e4f4",
        "e4d4",
        "e4c4",
        "e4b4",
        "e4f3",
        "e4e3",
        "e4d3",
        "e4e2",
        "e4c2",
        "e4e1",
        "e4b1",
        "h2h3",
        "g2g3",
        "b2b3",
        "h2h4",
        "g2g4"
      ],
      "change": null
    },
    {
      "title": "White knight: e6 \u2192 f8; captures Black rook",
      "note": "The knight now protects h7. White queen on e4 can reach h7 along f5 and g6.",
      "fen": "5N1k/q5p1/7p/4P3/pp2Q3/8/1P4PP/2b4K b - - 0 34",
      "pieces": [
        {
          "square": "c1",
          "label": "Bb"
        },
        {
          "square": "h1",
          "label": "Kw"
        },
        {
          "square": "b2",
          "label": "Pw"
        },
        {
          "square": "g2",
          "label": "Pw"
        },
        {
          "square": "h2",
          "label": "Pw"
        },
        {
          "square": "a4",
          "label": "Pb"
        },
        {
          "square": "b4",
          "label": "Pb"
        },
        {
          "square": "e4",
          "label": "Qw"
        },
        {
          "square": "e5",
          "label": "Pw"
        },
        {
          "square": "h6",
          "label": "Pb"
        },
        {
          "square": "a7",
          "label": "Qb"
        },
        {
          "square": "g7",
          "label": "Pb"
        },
        {
          "square": "f8",
          "label": "Nw"
        },
        {
          "square": "h8",
          "label": "Kb"
        }
      ],
      "sideToMove": "black",
      "check": false,
      "checkmate": false,
      "legalMoves": [
        "h8g8",
        "a7b8",
        "a7a8",
        "a7f7",
        "a7e7",
        "a7d7",
        "a7c7",
        "a7b7",
        "a7b6",
        "a7a6",
        "a7c5",
        "a7a5",
        "a7d4",
        "a7e3",
        "a7f2",
        "a7g1",
        "c1g5",
        "c1f4",
        "c1e3",
        "c1d2",
        "c1b2",
        "g7g6",
        "h6h5",
        "b4b3",
        "a4a3",
        "g7g5"
      ],
      "change": {
        "san": "Nxf8",
        "source": "e6",
        "target": "f8",
        "capture": "r",
        "before": "5r1k/q5p1/4N2p/4P3/pp2Q3/8/1P4PP/2b4K w - - 0 34"
      }
    },
    {
      "title": "Black queen: a7 \u2192 e3",
      "note": "Black overlooks the threat. White can now finish immediately.",
      "fen": "5N1k/6p1/7p/4P3/pp2Q3/4q3/1P4PP/2b4K w - - 1 35",
      "pieces": [
        {
          "square": "c1",
          "label": "Bb"
        },
        {
          "square": "h1",
          "label": "Kw"
        },
        {
          "square": "b2",
          "label": "Pw"
        },
        {
          "square": "g2",
          "label": "Pw"
        },
        {
          "square": "h2",
          "label": "Pw"
        },
        {
          "square": "e3",
          "label": "Qb"
        },
        {
          "square": "a4",
          "label": "Pb"
        },
        {
          "square": "b4",
          "label": "Pb"
        },
        {
          "square": "e4",
          "label": "Qw"
        },
        {
          "square": "e5",
          "label": "Pw"
        },
        {
          "square": "h6",
          "label": "Pb"
        },
        {
          "square": "g7",
          "label": "Pb"
        },
        {
          "square": "f8",
          "label": "Nw"
        },
        {
          "square": "h8",
          "label": "Kb"
        }
      ],
      "sideToMove": "white",
      "check": false,
      "checkmate": false,
      "legalMoves": [
        "f8h7",
        "f8d7",
        "f8g6",
        "f8e6",
        "e4a8",
        "e4h7",
        "e4b7",
        "e4g6",
        "e4c6",
        "e4f5",
        "e4d5",
        "e4h4",
        "e4g4",
        "e4f4",
        "e4d4",
        "e4c4",
        "e4b4",
        "e4f3",
        "e4e3",
        "e4d3",
        "e4c2",
        "e4b1",
        "e5e6",
        "h2h3",
        "g2g3",
        "b2b3",
        "h2h4",
        "g2g4"
      ],
      "change": {
        "san": "Qe3",
        "source": "a7",
        "target": "e3",
        "capture": null,
        "before": "5N1k/q5p1/7p/4P3/pp2Q3/8/1P4PP/2b4K b - - 0 34"
      }
    },
    {
      "title": "White queen: e4 \u2192 h7; CHECKMATE",
      "note": "Queen checks h8 and covers g8. Knight protects h7. Black pawn occupies g7.",
      "fen": "5N1k/6pQ/7p/4P3/pp6/4q3/1P4PP/2b4K b - - 2 35",
      "pieces": [
        {
          "square": "c1",
          "label": "Bb"
        },
        {
          "square": "h1",
          "label": "Kw"
        },
        {
          "square": "b2",
          "label": "Pw"
        },
        {
          "square": "g2",
          "label": "Pw"
        },
        {
          "square": "h2",
          "label": "Pw"
        },
        {
          "square": "e3",
          "label": "Qb"
        },
        {
          "square": "a4",
          "label": "Pb"
        },
        {
          "square": "b4",
          "label": "Pb"
        },
        {
          "square": "e5",
          "label": "Pw"
        },
        {
          "square": "h6",
          "label": "Pb"
        },
        {
          "square": "g7",
          "label": "Pb"
        },
        {
          "square": "h7",
          "label": "Qw"
        },
        {
          "square": "f8",
          "label": "Nw"
        },
        {
          "square": "h8",
          "label": "Kb"
        }
      ],
      "sideToMove": "black",
      "check": true,
      "checkmate": true,
      "legalMoves": [],
      "change": {
        "san": "Qh7#",
        "source": "e4",
        "target": "h7",
        "capture": null,
        "before": "5N1k/6p1/7p/4P3/pp2Q3/4q3/1P4PP/2b4K w - - 1 35"
      }
    }
  ]
};
