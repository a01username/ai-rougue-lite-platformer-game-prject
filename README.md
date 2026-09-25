# Ascent

Play online: https://a01username.github.io/ai-rougue-lite-platformer-game-prject/

Open `index.html` directly to play offline. No build step, installation, or local server is required. GitHub Pages serves the same files from the root of `main`.

# Ascent — first iteration

Open **index.html** in a desktop browser. Keep **game.js**, **sprites.js**, and **style.css** beside it. No server, installation, internet connection, or build command is needed. The implementation uses HTML, CSS, and JavaScript (browser JavaScript, rather than Java).

## Controls

Use the **Original · Mouse** and **New · Arrow Keys** buttons below the game to switch at any time without restarting. The control reference updates to match. New controls are selected when the page opens.

Original: A/D move, W aims up, S crouches or aims down, left click attacks, and Space jumps. Hold W + click to attack up or S + click to attack down/pogo. S + Space drops through thin platforms.

New controls:

| Input | Action |
| --- | --- |
| A / D | Move left / right |
| Up Arrow | Attack up |
| Left / Right Arrow | Attack left / right, independently of movement |
| S | Crouch on the ground; hold position on a wall |
| Down Arrow | Attack down; pogo on enemies or projectiles while airborne |
| W or Space | Jump, wall jump, or climb a grabbed ledge |
| S + Space | Drop through a thin or moving platform |
| Escape | Pause / resume |
| E | Open / close the empty inventory |

Walk through gaps in the side walls to enter adjacent rooms. Jump through ceiling openings to go up, or drop through floor openings to go down. You must physically cross the room boundary; standing near an opening does not trigger it. A short fade covers the transition, and you arrive safely inside the next room. Jump through the ceiling opening in the finish room to generate the next floor.

You start empty-handed with five hearts, two hits per heart, and three damage per attack. Taking damage causes knockback and brief blinking invincibility. The top half of a heart empties first. Enemy health bars have no numeric HP; damage numbers appear on hit.

Only visible boundary rock patches and interior rock walls support wall grabs. Open cliff edges cannot be used to wall-jump up the whole room. Hold toward rock to slow your slide further. Hold S to stop sliding. Approach a platform edge while falling and holding toward it to grab its ledge; W or Space climbs up. Grounded crouching prevents walking off platform edges.

Thick platforms are solid. Thin platforms allow upward passage and crouch-drop. Cracked platforms collapse after standing on them briefly and then return. Moving platforms travel along visible tracks.

The starting room on every floor is always small. Other rooms vary among four physical room sizes: small (780 × 580), large (1560 × 1160), long (1560 × 580), and tall (780 × 1160). The camera follows the player through rooms larger than the screen; smaller rooms are centered. The room size appears at the bottom left.

Each room generates its own platform widths, positions, ascent direction changes, optional branches, and low platforms. The main ascent now uses breaking and moving platforms, interspersed with fixed steps. Breaking steps collapse after 0.75 seconds of standing on them and return after 3 seconds; moving steps follow tracks assembled from connected 32-pixel horizontal and vertical segments, with generated turns. The final exit landing stays fixed. Jump spacing accounts for platform motion, and optional platforms stay clear of the main jump paths. Enemy types, order, support platforms, and positions are randomized; larger rooms can hold more enemies. Layouts persist when revisiting a room during the same run. Floor room arrangements are also randomized, with increasing height limits.

The four enemy placeholders are a diving flyer, a crawling ground enemy, a flying shooter, and a ground shooter. Item rooms, shops, and inventory are placeholders only. There are no items, purchases, character selection, slippery platforms, or sound effects in this iteration.

The game is an in-memory prototype: refreshing starts over. Click **Start again** after losing all hearts to begin a new run.

## Files

- `index.html`: page, HUD, overlays, and control reference.
- `style.css`: interface styling.
- `game.js`: generation, movement, collisions, combat, and canvas drawing.

Validated by opening the local file in Microsoft Edge. The room generation checks cover 160 unique layouts across all four sizes, 1,280 main-route jumps, optional platform access, enemy placement, camera limits, doorway arrivals, and room connectivity across 15 generated floors.



Enemy projectiles have 6 hidden HP. Each attack deals 3 damage once per swing, so two separate hits destroy a projectile. Surviving projectiles remain dangerous. This works in all four attack directions and with either control scheme; projectile health is not displayed. Projectiles still disappear on contact with the player or solid platforms, or when their lifetime expires.


Ground and flying shooters fire only when the player is within 400 world pixels (center-to-center distance). Existing shots keep traveling. Airborne downward attacks bounce you off projectiles, dealing 3 damage; the bounce works whether the projectile survives or reaches zero HP.

A larger, 300 × 230 translucent room map sits at the top right. Press Tab during play to toggle an enlarged map without pausing. It shows visited rooms and adjacent unexplored rooms; your current room is highlighted. Visited special rooms are marked S (start), I (item), $ (shop), or F (finish). Room shapes reflect their sizes. The map updates when you change rooms or floors.

Divers only begin and complete their windup when the player is within their downward cone (370 pixels deep). Leaving the cone cancels the windup; launched dives do not retarget.

Defeating all enemies in a room drops one randomly chosen half, full, or double heart on a reachable permanent surface. These restore 1, 2, or 4 HP, capped at 10 HP. Pickups remain when you have full health and persist when revisiting the room. Each enemy room rewards a clear only once; empty rooms do not drop hearts.

Room shapes follow their actual connections: long rooms only connect left/right, and tall rooms only connect up/down. Small and large rooms can also serve those straight connections, plus corners and junctions. Starting rooms remain small. A floor does not need to contain every shape if its layout has no suitable connections.

Floors use non-overlapping grid footprints: small 1×1, long 2×1, tall 1×2, and large 2×2. Passages link touching room edges, and the map shows these footprints. Main-route moving platforms use generated tile tracks with horizontal runs, vertical lifts, and corners. Their drawn paths match their movement, and riders are carried horizontally and vertically. Time jumps for their approach.

Flying shooters and divers spawn in clear air 140–190 pixels above a reachable platform, with lateral offsets into open space. Placement reserves room for their idle flight and avoids the full sweep of moving platforms. Flying shooters have a wider vertical bob.

## Mountain sections

The mountain changes appearance on every floor: Foothills, Pine Belt, Rust Cliffs, Scree Ridge, Alpine Meadows, Glacier, Storm Face, and Summit. Further floors continue into numbered High Summit sections with changing sky and rock palettes. The HUD displays the current section.

Artwork is drawn locally in canvas: layered mountain ridges, forest silhouettes, fractured rock, snow at higher elevations, a climber in an orange jacket, diving mountain birds, flying frost birds, rock beetles, and stone spitters. Moving platforms use wooden slats on visible tracks. Snow and scenery are visual only; this update does not add slippery surfaces or weather damage.

## Latest update

- Regular sprites now use native **8×8** pixel art; bosses use 16×16 canvases (four 8×8 tiles) at the same pixel scale. `sprites.js` generates them locally; `sprites-8.png` is a reference sheet (not required at runtime).
- Forward exits are higher than entrances. Large rooms advance through their ceiling; horizontal routes climb toward raised side passages. Shared passages use the same grid altitude, including upper-side connections on large rooms. Return routes remain usable.
- Item rooms end branches containing three to five intervening rooms; shops retain one or two. These branches never merge back into the main path.
- The final room is a boss arena. The three original bosses appear once each, followed by distinct variants and stronger numbered variants on higher floors. Each identity keeps a fixed arena shape and three deterministic layouts. Defeat the boss to unlock the upper passage.

| Boss | Arena | Mechanic |
| --- | --- | --- |
| Crag Warden | Large, 2×2 | Telegraphs a slam, sends ground waves in both directions, then recovers. |
| Storm Roc | Tall, 1×2 | Marks a dive target, commits to it, then leaves a recovery opening. |
| Glacier Heart | Small, 1×1 | Fires a shard fan behind a shield, then becomes vulnerable. |

Boss projectiles retain hidden health and can be attacked or pogoed. Boss damage does not show numeric HP. The existing health, movement, map, and two control schemes remain available.

## Tile tracks and rock obstacles

Tracks are assembled segment by segment for each room rather than selected from fixed shapes. Platforms travel at a steady speed, reverse at the ends, and carry riders through turns. The main ascent has wider vertical spacing, making moving and breaking steps part of the climb. Random vertical rock columns add interior walls for movement; generation reserves jumping corridors, doorway approaches, and rider clearance. Outer rock coverage varies, leaving non-grippable cliff sections instead of a continuous wall-jump shortcut.

Crawlers now circle their platform continuously in either direction: across the top, down a side, underneath, and back up. Their sprites turn with the surface. They also patrol vertical rock columns, with clearance reserved around the whole patrol. Crawlers retain 6 HP and can still be attacked or pogoed.


Doorway approaches now use narrow solid rock and breaking ledges with uneven heights, ending on stable rock landings. The automatic thin-platform ramps have been removed. Track generation checks the rock approaches and keeps a climbing step fixed if there is no safe moving path there.


Floor access: lower shelves leave a clear descent with a drop-through foothold for climbing back up. The opening avoids side door landings and the passage to the room below. Recessed rock buttresses, fractured strata, and rubble now visually connect fixed ledges to the mountain. These muted midground rocks are scenery, not collision surfaces.


Developer mode: hold D + E + V together for 0.6 seconds to toggle invincibility. Release and hold the combination again to switch it off. A DEV MODE / INVINCIBLE indicator appears while enabled. Health does not decrease and hits do not knock you back in this mode. The setting lasts until toggled off or the page is refreshed. E by itself opens/closes inventory when released; the developer shortcut does not open inventory. Connecting midground rock formations are now fully opaque scenery.


Developer flight: while developer mode is enabled, double-tap Space or W within 0.3 seconds while airborne to enter flight/noclip. A/D steer, hold Space or W to rise, and S to descend. Release movement keys to hover. Double-tap Space or W within 0.3 seconds to leave flight; turning developer mode off also ends flight. If flight ends inside rock or outside the room, the player returns to the saved flight entry position. Midground rock faces no longer have line/strata markings.


Boss arenas seal every exit while the boss is alive, including return passages; defeating the boss reopens them and the next-floor passage. The Crag Warden approaches a launch point, telegraphs its target, and jumps between platforms toward the player, creating landing shockwaves and a recovery window. Boss rooms use a skull marker, item rooms a diamond, and shops a dollar sign on the minimap and at their entrances. Discovered adjacent special rooms show their markers before entry.


Pixel-art presentation: mountain silhouettes and rock faces now use stepped pixel edges; platforms have small block-shaped stone details; the sky uses discrete palette bands with sparse dithering; the sun and attack arc are pixel shapes. Scenery, characters, and combat effects share the same low-resolution render surface before crisp upscaling. Midground rocks stay opaque and unlined. Interface corners and typography have been adjusted to match.


Sprite stability: all sprites use a shared 4x integer scale, with positions snapped to the render grid. Crouching has its own 8x6 pose instead of a vertically compressed sprite. Platform rendering is snapped independently of physics. The game canvas fits to integer physical-pixel scale factors to avoid browser resampling; narrower screens may show a smaller canvas or horizontal scrolling.

Breaking platforms now have repeated dark, branching cracks with bright chipped edges; the cracks widen while collapsing. Use the FULLSCREEN button beside Pause to expand the game, and EXIT FULLSCREEN to return. Browsers without fullscreen support use a full-window fallback, which also closes with Escape. Integer pixel scaling is preserved in both modes.


Fullscreen now adapts the render dimensions to cover the entire display, maintaining integer scaling for world pixels. Larger displays can show more of the room. Boss clears award three full hearts (6 HP total), once per arena. A separate BOSS_ITEM_POOL is reserved for future item definitions; it is currently empty and does not award an item yet.


Flying enemies now animate four actual wing poses in a six-frame forward/back loop (up, middle, down, folded, down, middle). Flight motion uses its own continuous timer so shooting does not reset the bob or horizontal motion. Divers ease back into their moving idle position after attacking. All sprite pixels, including boss pixels, share the same four-world-pixel size.

Boss variants: Shale Breaker adds an upward shard burst to landing shockwaves; Frostwing fires a shard burst after each dive; Splinter Core fires a second, staggered fan. Variants have distinct palettes, names, health, and attack patterns. Higher numbered forms increase health and projectile patterns/speed, so an exact boss identity does not recur during the climb. Starting a new run resets the sequence. Item-room branches now contain 3–5 ordinary rooms before the item room, remain dead ends, and never merge back with the main route.

Latest branch and variant update: both item and shop routes contain 5–7 ordinary rooms before the special room. They can turn upward as well as continue sideways, and remain separate dead ends. Shale Breaker marks three rockfall lanes, drops rocks, then loses its armor for a recovery window. Frostwing sweeps horizontally across the arena, leaving temporary frost projectiles behind, then recovers. Splinter Core has a shield sustained by destructible orbiting shards; destroying the shards exposes it for 2.5 seconds before the shield reforms. These replace the earlier added-volley variant attacks.

All enemies now animate: crawlers cycle their legs; ground shooters breathe, charge, and recoil; flyers and flying bosses flap and tuck their wings during attacks. Stone bosses have walking, windup, airborne, and recovery poses. Crystal bosses cycle highlights and display a pulsing exposed core. Boss variants use animation states matching their mechanics. All poses retain integer pixel scaling and fixed collision sizes.


Special-room branches now choose among small, large, long, and tall rooms, including the final special room. Long rooms connect horizontally, tall rooms connect vertically, and large branch rooms continue upward. Branches remain 5–7 ordinary rooms long, end at the item room or shop, and never merge into another route. Shape choice respects occupied grid tiles; every branch is not guaranteed to contain all four shapes.


Developer mode reveals every room, connection, and special-room marker on both map sizes. Turning it off restores normal discovery visibility without changing which rooms you have actually visited.


Glacier Heart difficulty: it fires three telegraphed aimed volleys per cycle, with a wider final fan and faster shards. Its exposed window is 1.4 seconds. Starting with the next cycle after reaching half health, it fires four volleys at higher speed and opens for 1.1 seconds. Each volley locks its aim during a 0.35-second warning. This change applies to the original Glacier Heart; Splinter Core retains its orbiting-shard mechanic.


Variants now use distinct native 16x16 models at the shared four-world-pixel scale: Shale Breaker is a jagged, asymmetrical rock brute; Frostwing is a fork-tailed ice moth; Splinter Core is a broken crystal shell surrounding an energy nucleus. Each retains animation poses. Shale Breaker again jumps between platforms and produces landing shockwaves, followed by marked rockfalls and recovery. See boss-variants.png for a visual comparison.


Frostwing now alternates the original telegraphed dive with its frost-trailing horizontal sweep. Splinter Core retains Glacier Heart's aimed multi-volley cycle and normal vulnerability window while adding orbiting shield shards. Destroying its shield shards early cancels remaining volleys and grants a longer 2.5-second opening. All variants retain their distinct models and animations.


Floor growth: the main path starts with two generated climbing sections instead of five. It gains one section every three floors (floors 1–3: two; 4–6: three; 7–9: four). Random connectors still vary the exact room count. Both special-room branches retain their 5–7 rooms, so total floor size includes those optional routes.


Boss rooms now sit entirely above item and shop rooms. Branch generation stays below the boss arena's grid elevation, and the main route includes longer horizontal stretches. Developer mode: open the map with Tab and click any room to teleport; this also works while paused and cancels pending transitions/attacks. Glacier Heart and all its variants now use long arenas. They periodically mark a random clear destination, wait 0.45 seconds, then dash there over 0.38 seconds. Attack timers pause during the dash, and solid-rock clearance is checked along the path.


Developer settings: while dev mode is active, a panel offers damage and flight-speed −/+ buttons and Reset. Damage ranges from 3 to 99 (applies to enemy and projectile hits); flight speed ranges from 0.25× to 5×. Turning dev mode off restores normal 3-damage attacks. Reset returns dev settings to 3 damage and 1× flight speed. The panel is also available in fullscreen.


Breakable-platform update: each platform has a stable, irregular crack pattern with varied branching and spacing. Standing on one sheds small pixel debris; collapse produces a larger burst. Leaving it before collapse regenerates the timer at one second per second until fully restored. Collapsed platforms still return after three seconds, and particles expire automatically.

Branches now require at least two upward connections and no more than two consecutive horizontal connections, regenerating layouts that cannot fit both special routes. Shift crouches, holds walls, and descends in dev flight (S remains available). Q dashes horizontally in the facing/movement direction for 0.16 seconds with a 0.65-second cooldown; normal collision and damage rules still apply.

Branch origins are now shuffled across eligible main-path rooms at all heights, including free upward connections. The boss is placed after special routes, extending the final climb when needed to keep it above both special rooms. Main-path horizontal stretches are shorter and optional; every section climbs vertically. Branches retain 5–7 rooms, upward turns, varied footprints, and separate dead ends.

Runs now end after six floors, with two floors per biome: Foothills (Crag Warden, Shale Breaker), Rust Cliffs (Storm Roc, Frostwing), Glacier (Glacier Heart, Splinter Core). The six distinct existing boss mechanics and models are retained. Defeating Splinter Core on floor six displays victory; Climb Again starts a fresh run. Numbered repeat bosses are no longer reached.

Eight-floor extension: floors 7–8 enter the Mountain Interior, with cavern silhouettes, stalactites, and glowing mineral details instead of the outdoor sky. Echo Sentinel (floor 7, tall arena, 90 HP) fires sound rings with rotating gaps and recovery openings. The Mountain Furnace (floor 8, large arena, 150 HP) marks eruption columns, alternates aimed fans and rotating radial bursts, and becomes faster with more pulses below half health. Both have unique animated 16x16 models at the shared pixel scale. Victory now occurs only after the eighth boss. Verified eight-floor progression, restart, attack cycles, vulnerability windows, and final-boss enrage.

Upside-down L rooms: a two-by-two reserved footprint with the lower-right corner filled by solid rock, leaving a left vertical shaft and upper horizontal arm. These rooms occur on the main climb and special-room branches, with lower entrances kept in the shaft. Two decorative animated pixel waterfalls flow from the horizontal arm down the rock face. Maps show the L silhouette. Generation checks covered 75 L rooms with clear route platforms and bottom entrances.

L-room river update: water runs left across the upper rock ledge, falls down the inside corner, and collects in a small pool. Contact with the river pushes the player toward the drop; the waterfall adds downward force. Normal collision stays active, and dev noclip ignores the current. Animated pixel streaks show flow direction.
