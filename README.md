# Game Night

Multiplayer board, dice and card games for phones. Create a room, share the 4-letter code or link, pick a game, play.

Games: BINGO, Tic-Tac-Toe, Four in a Row, Dots & Boxes, Checkers, Yacht Dice, Crazy Eights, Race Home (Ludo-style).

Static site, no server: peers connect over WebRTC via PeerJS. The room creator's browser is the host and runs the rules (`app.js`); each game is one file in `games/` that calls `register({...})`.

Live: https://bingo-teal-eight.vercel.app
