# CODEMAP: where everything is in Super Rogues

For someone who is new to programming and wants to make small changes by hand. Read this file first, then open the file it points to:
every file starts with a "FILE GUIDE" comment and every function has a "WHAT:" note above it.

## 1. How the game is built, in one minute

- It is a **web page** (HTML, CSS and plain JavaScript, no framework). There is nothing to install to play it: `index.html` loads the scripts in `js/`.
- A small **server** (`api/`, on Vercel) keeps the shared things: the Gauntlet ghosts, the ranking, the suggestion box, the balance numbers. It uses a Postgres database (Neon).
- A game ("run") is one plain object saved in the browser after every move. Closing the page and coming back continues it.
- The code is split into three jobs: **data** (what exists), **rules** (what happens), **screens** (what you see). Never mix them: screens only draw, rules only change the run, data is only tables.
- Everything the scripts share hangs on one global object called `B` (`B.HEROES`, `B.Run`, `B.Sim`...).

```
 data.js  (tables of heroes, items, powers, enemies, events, prices)
    |
    v
 run.js   (rules of a game: team, stats, map, shops, events, XP)  -->  sim.js (plays one fight, tick by tick)
    |                                                                    |
    v                                                                    v
 ui.js    (draws every screen, handles every tap)  <---------------  render.js + models.js (draw the board and the units)
    |
    v
 net.js  --->  api/*.js (server)  --->  database
```

## 2. File by file

| File | What it is | Edit it when you want to... |
|---|---|---|
| `index.html` | the page shell; loads the scripts in order | add a new script file |
| `style.css` | all the looks (latest rule wins, see its guide) | change colours, sizes, spacing |
| `stats.html` + `js/stats.js` | the hidden balance dashboard (`/stats.html`, linked only from the menu) | change the dashboard |
| `js/data.js` | **all content as tables** | change numbers, prices, texts, heroes, items, powers, events, enemies |
| `js/hex.js` | the hex grid math (8 x 8 board) | almost never |
| `js/sim.js` | the **battle engine** (20 ticks per second) and one function per hero ability | change how fights work, add an ability |
| `js/run.js` | the **rules of a run** (no drawing) | change shops, XP, events, map, stats formulas, Auto-equip |
| `js/ui.js` | **every screen and every button** | change a screen, a text, a button |
| `js/render.js` | draws the board, units, effects, boss backgrounds | change how the fight looks |
| `js/models.js` | the look of each unit, drawn with code | change a hero's colours / gear, add a body type |
| `js/art.js`, `js/artlab.js`, `js/splash.js` | real pictures for heroes, the Art Lab, splash cards | add hero art |
| `js/icons.js`, `js/uiicons.js` | item / power icons and interface icons | add an icon |
| `js/juice.js`, `js/sfx.js` | confetti and coin effects, sounds (made with Web Audio) | add a sound or an effect |
| `js/net.js` | the only way the page talks to the server | almost never |
| `js/i18n.js`, `js/lang-boot.js`, `js/lang-pt.js`, `js/lang-de.js` | languages: the page watcher that swaps English text for its translation, the tiny loader of the chosen dictionary, and the two dictionaries (Portuguese, German) | translate a text, add a language (`node tools/idiomas.js` lists what is missing) |
| `api/elo.js` | the Gauntlet, Elo, leagues, balance ratings, fights per day | change Gauntlet or league rules |
| `api/player.js`, `api/_player.js` | accounts, Crown Shop, XP, profiles | change the Crown Shop or XP rules |
| `api/suggest.js` | the suggestion box | change its limits |
| `api/stats.js` | the numbers of the dashboard | add something to the dashboard |
| `api/_store.js` | the database layer (memory for tests, Postgres in production) | add a table or a query |
| `api/_http.js` | small helpers for the server files | never |
| `tools/` | balance and test scripts, the watcher, the deploy script | see section 5 |
| `art/` | the hero pictures (webp) | add pictures |
| `CLAUDE.md` | the permanent working rules of the assistant (design principles, conventions, how to test and publish, what never to break) | read it to know how to work on the game |
| `CHANGELOG.md` | the history of every version, newest on top (search it, do not read it all) | read it for why something is the way it is |

## 3. "I want to..." recipes

**Change how hard the fights are.** `js/data.js`: `B.CFG.fightScale` (strength of fight 1 to 8) and `B.DIFF` (easy / medium / hard per fight). Then run `node tools/pve-odds.js` to see the win rates (aim: easy about 99%, medium about 90%, hard about 60%, bosses about 55%). To let the computer find the numbers: `node tools/tune-pve.js`.

**Change a price or a gold reward.** `js/data.js`, `B.CFG` (`heroCost`, `itemCost`, `relicCost`, `reroll`, `gold`).

**Make a hero stronger or weaker.** `js/data.js`, his block in `B.HEROES` (`hp`, `atk`, `armor` = Defense, `as`, `mana` = Energy, `grow`, and the numbers in `ab`). Then `ONLY=hisKey node tools/hero-odds.js 0 100` shows his win rate (aim 54 to 60%, the roster average is about 58%).

**Add a hero.** Copy a block in `B.HEROES`; give it a new key; fill the fields (guide above the table); add a `TAGS` line (10 to 38 characters); add his look in `js/models.js` (`M`); if the ability is new write `A.myability = (W, u) => {...}` in `js/sim.js` and an entry in `SCALE` in `js/ui.js`; update the hero count in `tools/tests/motor.js`; run the tests.

**Add an item.** One line in `B.ITEMS` using `N(type, id, name, rarity, mods, description)`; an icon in `js/icons.js` (`IT`). `mods` names are the stats (`atk`, `hpPct`, `asPct`, `crit`, `armor`...): copy a similar item.

**Add a Power (relic).** One line in `B.RELICS` using `R(id, name, description, { mods | fl })`; an icon in `js/icons.js` (`RE`); a shorter text in `SHORT`. A plain stat bonus needs only `mods`. A special effect needs a flag (`fl: 'myflag'`) that you read where it matters (search an existing flag such as `bodyguard` in `js/sim.js` or `js/run.js`).

**Add an event (a ? day).** `B.EVENTS` in `js/data.js`: a text and 3 or 4 choices; each choice has an `act` command (list in `eventAct` in `js/run.js`). A new kind of result = a new branch in `eventAct`.

**Change a text on screen.** Search the text in `js/ui.js` (screens, buttons, the How to play text `HOWTO`) or in `js/data.js` (names and descriptions of heroes, items, powers, events). The word "relic" is called "Power" on screen but stays `relic` in the code.

**Change what a button does.** Find its `data-act="name"` in the HTML inside `js/ui.js`, then the same name in the `ACT = {...}` table near the end of the file.

**Change how a fight looks.** Units: `js/models.js` (or pictures in `js/art.js`). The board, effects, banners: `js/render.js`. A boss background: `bossBackdrop` in `js/render.js`.

**Change the map, league points, streaks, portraits and follows (v65).** The map road: `mapRoad`, `layoutMap`, `ROAD`, `mstripHTML` (js/ui.js) and the `.wmap/.wtrack/.rn/.rtoday` CSS at the end of style.css. League points per PvP result: `B.LP`, `B.lpParts`, `B.runLp` (data.js), applied in the `complete` / `fail` ops (api/elo.js), shown by `leagueCardHTML`. The win streak: columns `streak` / `bstreak` (api/_store.js), set in `complete` / `fail` / `flog` with `gaveUp` (api/elo.js), drawn by `flameHTML` / `streakCardHTML` / `animStreak` (ui.js). Portraits: `B.PORTRAITS_FREE`, `B.PORTRAIT_UNLOCKS`, `B.portraitLevel` (data.js), op `avatar` (api/player.js), `avKey` / `avatarHTML` / `avatarPickHTML` (ui.js). Follows: table `follows`, `follow` / `isFollowing` / `followCounts` / `friendsTop` (api/_store.js), ops `follow` / `friends` (api/player.js), the Friends tab in `openScores`. A hero offered by an event with a full team: `eventChoices` (js/run.js).
**Change the start, the recruits, leagues and trophies (v64).** The free recruits: `CFG.freeRecruits`, `recruitOffer` / `recruit` in `js/run.js`, `recruitHTML` in `js/ui.js`. The Hero Shop swap: `swapIn` (run.js), `swapHTML` (ui.js). League points at the end of a run: `B.runLp`, `B.VICTORY`, `B.LEAGUE_RULES` (data.js) and `leaguePoints` (api/elo.js). Trophies and head-to-head: table `duels`, `addDuel` / `trophiesOf` / `h2h` (api/_store.js), op `duel` (api/elo.js), `profile` (api/player.js). The end screens: `overHTML` + `leagueCardHTML` (ui.js). The map trail: `journeyHTML` (ui.js).
**Change the PvP days and the final fight (v63).** Which days have a duel: `CFG.pvpFights` in `js/data.js`; the lives: `CFG.lives`; the duel and final flow: `startDuel`, `finishDuel`, `stealOptions`, `steal`, `randomGhost`, `powerOf` in `js/run.js`; the screens: `optHTML` (the duel poster), `stealHTML`, `gauntletHTML` (the final fight gate), `findDuels`, `reportRunEnd` in `js/ui.js`; the server: ops `snap`, `final`, `duel`, `complete` in `api/elo.js` (`pickSnap`, `pickFinal` in `api/_store.js`).
**Change the old Gauntlet.** Rules of who you meet: `nextOpponent` in `api/elo.js`. What a ghost keeps: `cleanTeam` in `api/elo.js` and `teamSnapshot` in `js/run.js`. The fight itself: `gauntletWorld` in `js/run.js`.

**Add a sound.** A recipe in `S` in `js/sfx.js`, then `B.Sfx.play('name')` (usually through `sfx('name')` in `js/ui.js`).

**Change the tutorial prompts.** `tutMoveOn`, `tutSpeedOn` and friends in `js/ui.js`; their looks `.tutmove` and `.tutspeed` at the end of `style.css`. They remember their state in the browser keys `balance.tut.*`.

## 4. Words you will see

- **run**: one game from the first hero to the end. **fight number** 1 to 8; bosses are fights 4 and 8.
- **Power** (code name **relic**): a bonus for the whole team. **item**: equipment worn by one hero (7 types, one of each per hero).
- **spec**: one of the two powers offered at a level-up (the hero table has 4 pairs, for levels 2 to 5). **ab**: the numbers of a hero's ability. **fl**: flags that switch on special behaviour.
- **mods**: the shared list of stat bonuses (`atk`, `atkPct`, `hp`, `hpPct`, `asPct` attack speed, `crit`...). `Pct` means a fraction (0.1 = 10%).
- On screen the stats are **Health** (`hp`), **Attack** (`atk`), **Magic** (`ap`), **Defense** (`armor`, one stat for physical and magic damage) and **Energy** (`mana`, the blue bar that fires the ability); **AS** attack speed, **MS** move speed. The names in the code did not change.
- **ghost**: a saved team of another player that you duel in the **Gauntlet**. **floor**: a step of the Gauntlet tower.
- **tick**: 1/20 of a second in the simulation. **side 0** is the player, **side 1** is the enemy (or the ghost).
- **flog**: the list of fights a finished run reports for the balance dashboard.

## 5. Tools and tests (run them from the project folder with Node)

- `node tools/tests/run-all.js` : every check before publishing (takes about 10 minutes). `node tools/tests/motor.js` = rules and engine only (a few seconds). `node tools/tests/api.js` = the server logic. `node tools/tests/telas.mjs` = real Chrome, every screen.
- `npm run dev` : the game on http://localhost:3790 with a memory database (owner key for the review form: `dev-key`).
- Balance: `tools/pve-odds.js`, `tools/tune-pve.js` (fights), `tools/hero-odds.js` (heroes), `tools/item-odds.js`, `tools/relic-odds.js`, `tools/challenge-odds.js` (event challenges), `tools/boss-matrix.js`, `tools/sim-run.js` (a bot plays whole runs).
- Team model used by the balance tools: `tools/_team.js` (what real runs have at each fight).
- Owner and assistant: `tools/sugestoes.js` (the suggestion queue), `tools/vigia.js` (the watcher), `tools/deploy.sh` (publishing), `tools/limpar-gauntlet.js` (empties the Gauntlet, owner only).

## 6. Things not to break

- Text that came from a player must always go through `esc()` in `js/ui.js` (and `clean()` on the server). Never put it into HTML as it is.
- The page may only load its own scripts (the Content-Security-Policy in `vercel.json`): no outside scripts, no inline handlers, no tracking.
- Anything random inside a fight must use `W.rng()` (seeded) so a fight can be replayed. Never `Math.random()` in `js/sim.js` or `js/run.js`.
- The server never trusts the browser: a team sent as a ghost is cleaned by `cleanTeam`; keep that list of allowed fields.
- No screen may need scrolling on a phone (390 x 740 and 360 x 640) and no text may be cut off. The Chrome tests check it.
- After any change: run `node tools/tests/motor.js` at least; before publishing run everything.

## 7. Appendix: the older detailed file map (Portuguese, kept for its details such as server limits)

Some numbers in it (hero counts, etc.) are older than the code; trust the code and the tables above when they differ.

| Arquivo | O quê |
|---|---|
| `js/hex.js` | grade 8x8 (terreno por luta: `B.MAPS` no data.js, `Run.mapOf`), pointy-top "odd-r"; linha 0 = topo (inimigo), linhas 4-7 = deploy do jogador |
| `js/data.js` | TODO o conteúdo: `CFG` (economia, XP, sequência de nós, time máx 3), 36 heróis (habilidade + 4 pares de spec; 3 liberados por nível de conta; 6 com escala passiva; habilidade em % de AD e/ou AP, v28), 120 itens com tipo e raridade (`TYPES`, `RARITIES`, `SETS`), 35 relíquias, 14 mobs, 2 chefes, elites, 12 eventos |
| `js/sim.js` | motor de combate puro e determinístico (20 ticks/s). Roda no navegador e no Node |
| `js/run.js` | máquina de estados da run (mapa, lutas, lojas, eventos, XP, itens). JSON puro, salvo no localStorage |
| `js/models.js` | modelos 2.5D desenhados em código (humanoide, fera, bomba, golem, serpente, espectro, torre) com poses parado/andando/ataque/habilidade/morte; `portrait()` gera os retratos dos menus |
| `js/splash.js` | splash art de cada unidade (fora da luta): pose heroica com o modelo em modo `detail`, luz na cor do herói, raios, bokeh, névoa, luz de contorno e brilho; `B.Splash.image(key, w, h, 'bust'|'full')`, cache em data: URL |
| `js/icons.js` | ícones de itens e relíquias desenhados em código (~60 desenhos; cada item/relíquia mapeado em `IT`/`RE`), moldura na cor da raridade (lendário com brilho, mítico com moldura dupla), `B.Icons.slot(tipo)` = espaço vazio, cache em data: URL |
| `js/art.js` | arte em IMAGEM (v31, Art Lab): splash (recorte busto/banner por foco x/y + zoom) e 4 poses de batalha (parado/andando/ataque/habilidade; o movimento entre elas é feito em código). `OFFICIAL` lista a arte publicada em `art/<herói>/`; o teste do Art Lab fica só no aparelho (`localStorage balance.artlab`). Sem arte = modelo desenhado. `cutSheet` recorta a folha de poses (fundo = cor mais comum na borda) |
| `js/artlab.js` | tela do Art Lab (botão no fim do menu inicial e link na caixa de sugestões): escolher herói, subir splash e folha de poses, ver nas cartas e numa luta de teste, "Use in my game" (só o aparelho) e **Send for review** (vai junto com um lote normal) |
| `js/sfx.js` | v42: sons do jogo sintetizados com Web Audio (sem arquivo de áudio, CSP igual): `B.Sfx.play('coin')`; liga/desliga (🔊 no topo do menu e da batalha, guardado em `balance.sound`); sons repetidos (golpe, cura, contagem) têm intervalo mínimo |
| `js/juice.js` | v42: efeitos de recompensa em DOM numa camada fixa `#fx`: confete, moedas voando até o ouro do topo, número contando, "bump", "+6" subindo, cópia voando (item comprado → Team). Sem animação se o sistema pedir menos movimento |
| `js/uiicons.js` | v49: o conjunto de ícones da interface (SVG em código, traço redondo de 2,2, cor do texto): `B.UI.i(nome, classe)`, e a marca do logo `B.UI.mark()` (estrela de máscara). Use no lugar de emoji em botões, topo, trilha, lojas, lutas e menus |
| `js/render.js` | canvas 2.5D: tabuleiro achatado (K=0.6) com espessura, unidades pelos modelos, barras, efeitos. Interpola posição entre hexes |
| `js/ui.js` | telas DOM + loop da batalha. Sem handler inline (CSP): todo botão tem `data-act` |
| `js/net.js` | cliente JSON de `/api` |
| `api/suggest.js` | GET fila pública (agrupada por envio) + status do revisor; POST `{items: [...até 10], name}` = 1 envio (lote). v31: pode levar `art` (herói, splash, poses em data: URL PNG/JPG/WEBP; splash ≤ 900 KB, pose ≤ 300 KB; 6 envios de arte por IP/dia, 60 no total/dia), guardado na tabela `art`, NUNCA servido de volta. Limite por IP: 3 envios/10 min, 12 envios e 40 mudanças/dia; fila máx 300 |
| `api/elo.js` | Elo por jogador (id aleatório guardado no navegador) + Gauntlet PvP: `fail`, `enter`, `result` (Elo 1v1 K=32 contra o Elo do fantasma; o Elo do jogador só mexe nos duelos desde a v26), `boss`; GET = ladder, `?peak=1`. Elo de conteúdo (lote 14): cada herói/item/relíquia/chefe tem Elo próprio (K=16, tabela `ratings`), só o que agiu na luta (`usedIn`); a leitura (`?ratings=1`) virou desbloqueio da loja (v27) |
| `api/player.js` | v27: loja de Coroas (`buy`), troca de nome paga (`rename`), perfil público (`profile`; Rei vê mais), `me` (carteira, sem criar jogador), `ratings` (só com Content Elo) |
| `api/_player.js` | v27: temporadas, pagamento de Coroas por liga (`payLeagues`, atômico via `sreach`), indicação (`linkRef`, 1% mín. 1), jogos por herói (`phero`), visões do perfil |
| `api/_store.js` | Neon em produção, memória no dev/teste. Tabelas `suggestions`, `kv`, `scores`, `players`, `teams`, `ratings`, `phero` |
| `tools/vigia.js` | vigia em segundo plano (checa a cada 20 s): sai, e me acorda, assim que chega um envio novo |
| `tools/sugestoes.js` | fila do meu lado: listar (por lote; avisa "📎 arte"), `lendo`, `feito`, `recusa`, `status`, `pausa`/`retoma`, `arte <lote>` (salva as imagens em `art-inbox/`, fora do git) |
| `tools/sim-run.js`, `tools/boss-matrix.js`, `tools/tune-heroes.js`, `tools/audit-abilities.js`, `tools/challenge-odds.js` | robô joga runs inteiras / todos os times de 3 contra os 2 chefes / vitória contra chefe por herói e ajuste automático (v34) |
| `tools/relic-odds.js` | v50, refeito na v61: quanto vale cada relíquia de luta (os mesmos times de `_team.js` jogam Hard 3, Hard 6 e chefe 8 sem e com ela; mede o ganho de "margem" x100 e de vitórias). `node tools/relic-odds.js [times=60] [ids|all]` |
| `tools/_team.js` | v61: o time típico da luta N de uma run (heróis aleatórios: 1, 2, depois 3; o nível que o XP dá; itens da loja daquele ponto com Auto-equip; relíquias de luta) e `fight()` = vitória + margem (-1..1: vida que sobrou de quem venceu). Base de todas as ferramentas abaixo |
| `tools/pve-odds.js` | v61: vitória em cada luta da run (1..8, fácil/médio/difícil, chefes 4 e 8). Metas: fácil ~99%, médio ~90%, difícil ~60%, chefe ~55%. `node tools/pve-odds.js [times=60] [semente=9000]` (outra semente = times novos) |
| `tools/tune-pve.js` | v61: afina a curva PvE (`CFG.fightScale` por luta = médio e chefe; `DIFF.easy.mul` / `DIFF.hard.mul` por luta) até as metas; imprime os valores para colar no data.js. `node tools/tune-pve.js [rodadas=8] [times=80]` |
| `tools/limpar-gauntlet.js` | v62: PARA O DONO: faz backup e apaga todos os fantasmas da torre (`--dry` só conta). Eu não rodo (o modo automático barra) |
| `tools/hero-odds.js` | v61: cada herói em times aleatórios (Hard 3 e chefe 4 = começo; Hard 6, Hard 7 e chefe 8 = fim); com rodadas, afina força p (vida/ataque x p, mana / p) e crescimento g (`grow`, 0,5..1,8) para cada um ficar na média no começo e no fim. `node tools/hero-odds.js [rodadas=0] [times=60]`, `ONLY=a,b` |
| `tools/item-odds.js` | v61: quanto vale cada item (os mesmos times sem e com ele, vestido no herói que mais combina, como item a mais), listado por raridade, e os conjuntos completos. `node tools/item-odds.js [times=60]`, `ONLY=a,b` |
| `tools/boss-odds.js` | v52: chance de vencer cada chefe de cada posição (times aleatórios um pouco abaixo de uma run típica: posição 1 na luta 4 com Lv 2 e 1 item, posição 2 na luta 8 com Lv 4 e 3 itens; mesmas sementes). `node tools/boss-odds.js [times=80]` |
| `tools/tests/quadros.mjs` | v55: tira uma sequência de quadros da luta no celular (120 ms entre eles) para ver se o movimento está liso (`.saida/quadros.json`, montar a tira com PIL). `node tools/tests/quadros.mjs [quadros=12]` |
| `tools/tests/` | `motor.js`, `api.js`, `telas.mjs` (Chrome de verdade, run inteira no celular 390x740, checa que cada tela cabe), `dispositivos.mjs` (5 aparelhos), `vitrine.mjs` (fotos de todas as telas no celular e em 3 PCs, v29), `galeria.mjs` / `icones.mjs` / `splash.mjs` (fotos de modelos, ícones e splash) |

- `js/abilfx.js` (v62p): uma animação própria para cada habilidade (`B.AbilFx.SPEC[chave da habilidade]`), chamada por render.js para todo efeito com `f.ab`; áreas nos hexágonos reais; ferramenta de conferência `tools/fxlab.mjs`.
