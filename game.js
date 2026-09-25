/* Ascent: classic scripts and generated graphics; safe to open via file://. */
'use strict';
const canvas=document.getElementById('game'), displayCtx=canvas.getContext('2d');
const sceneryCanvas=document.createElement('canvas');sceneryCanvas.width=550;sceneryCanvas.height=350;
const sceneryCtx=sceneryCanvas.getContext('2d');
let ctx=displayCtx;displayCtx.imageSmoothingEnabled=false;sceneryCtx.imageSmoothingEnabled=false;
const $=id=>document.getElementById(id);
let W=1100,H=700;
const keys=new Set();
const isL=r=>r.size.startsWith('invertedL');
const mirroredL=r=>r.size.endsWith('Right');
const L_SHAPES=['invertedL','invertedLRight','invertedLLong','invertedLLongRight','invertedLTall','invertedLTallRight'];
const ROOM_SIZES={invertedLLong:{w:2340,h:1160,gridW:3,gridH:2},invertedLLongRight:{w:2340,h:1160,gridW:3,gridH:2},invertedLTall:{w:1560,h:1740,gridW:2,gridH:3},invertedLTallRight:{w:1560,h:1740,gridW:2,gridH:3},invertedLRight:{w:1560,h:1160,gridW:2,gridH:2},invertedL:{w:1560,h:1160,gridW:2,gridH:2},small:{w:780,h:580,gridW:1,gridH:1},large:{w:1560,h:1160,gridW:2,gridH:2},long:{w:1560,h:580,gridW:2,gridH:1},tall:{w:780,h:1160,gridW:1,gridH:2}};
const MOUNTAIN_SECTIONS=[
  {name:'FOOTHILLS',sky:'#203d3a',horizon:'#728371',far:'#526a60',near:'#344e43',rock:'#515a48',edge:'#9aaa70',shade:'#303e35',snow:false,trees:true},
  {name:'PINE BELT',sky:'#193139',horizon:'#607b74',far:'#415e5b',near:'#284b43',rock:'#49584c',edge:'#7eae88',shade:'#283c35',snow:false,trees:true},
  {name:'RUST CLIFFS',sky:'#3f3540',horizon:'#ba8c6b',far:'#80675f',near:'#694b40',rock:'#855f4a',edge:'#d6a075',shade:'#503d36',snow:false},
  {name:'SCREE RIDGE',sky:'#293946',horizon:'#869298',far:'#62727c',near:'#414f59',rock:'#687078',edge:'#b2b8aa',shade:'#3b474c',snow:false},
  {name:'ALPINE MEADOWS',sky:'#294953',horizon:'#98b7b0',far:'#729394',near:'#4a7070',rock:'#596e68',edge:'#bed3a2',shade:'#324d4c',snow:false,trees:true},
  {name:'GLACIER',sky:'#243e55',horizon:'#9fbdcc',far:'#779caf',near:'#4c7087',rock:'#638398',edge:'#e0f2ec',shade:'#3c5b72',snow:true},
  {name:'STORM FACE',sky:'#202a40',horizon:'#667890',far:'#4b6078',near:'#354a60',rock:'#56667a',edge:'#c2d9e7',shade:'#303e52',snow:true},
  {name:'SUMMIT',sky:'#414465',horizon:'#d1aaa3',far:'#9397b4',near:'#676e91',rock:'#7a849a',edge:'#f3efec',shade:'#454e6b',snow:true}
];
const RUN_FLOORS=8;
function mountainTheme(){
  if(floor>=7)return {name:'MOUNTAIN INTERIOR',sky:'#171521',horizon:'#503342',far:'#342636',near:'#49333e',rock:'#55404c',edge:'#d8946e',shade:'#291e2c',cave:true,snow:false};
  return MOUNTAIN_SECTIONS[[0,2,5][Math.min(2,Math.floor((floor-1)/2))]];
}

const camera={x:0,y:0,offsetX:0,offsetY:0};
function shuffle(values){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(rand(0,i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
let mode='title', floor=1, rooms=new Map(), room, player, tick=0, accumulator=0, lastTime=0;
let shots=[], numbers=[], attack=null, jumpQueued=false, attackQueued=false, exitLock=0, exitArmed=false;
let transition=null;
let mapExpanded=false;
let controlScheme='new';
let devMode=false,devHoldStart=null,devLatched=false,inventoryTap=false;
let devFlight=false,flightAnchor=null,flightTap=null;
let devDamage=3,devFlightSpeed=1;
const playerDamage=()=>devMode?devDamage:3;
function refreshDevIndicator(){
  $('dev-indicator').hidden=!devMode;
  $('dev-controls').hidden=!devMode;
  $('dev-damage-value').textContent=devDamage;
  $('dev-speed-value').textContent=devFlightSpeed+'×';
  $('dev-indicator').textContent=devFlight?'DEV · INVINCIBLE · FLIGHT / NOCLIP':'DEV MODE · INVINCIBLE';
}
function stopDevFlight(){
  devFlight=false;flightTap=null;
  const p=player;
  if(p.x<25||p.x+p.w>room.w-25||p.y<15||p.y+p.h>room.floorY||room.platforms.some(s=>s.gone<=0&&s.type!=='oneway'&&s.type!=='moving'&&overlap(p,s))){
    if(flightAnchor?.room===room){p.x=flightAnchor.x;p.y=flightAnchor.y;}
    else enterRoom(room);
  }
  p.vx=p.vy=0;p.wall=0;p.ledge=null;p.ground=null;p.coyote=0;
  refreshDevIndicator();
}
const devKeys=new Set();
const devChord=()=>['KeyD','KeyE','KeyV'].every(k=>devKeys.has(k));
function updateDevToggle(now){
  if(!devChord()){devHoldStart=null;devLatched=false;return;}
  keys.delete('KeyD');inventoryTap=false;
  if(devHoldStart===null)devHoldStart=now;
  if(!devLatched&&now-devHoldStart>=600){
    devMode=!devMode;devLatched=true;
    if(!devMode&&devFlight)stopDevFlight();
    refreshDevIndicator();
  }
}
function resetDevInput(){flightTap=null;devKeys.clear();devHoldStart=null;devLatched=false;inventoryTap=false;}

const jumpHint=()=>controlScheme==='original'?'SPACE':'W / SPACE';
const controlHint=()=>controlScheme==='original'?'A / D to move · SPACE to jump · CLICK to attack':'A / D to move · W / SPACE to jump · ARROWS to attack';
function selectControls(scheme){
  controlScheme=scheme;flightTap=null;keys.clear();jumpQueued=attackQueued=false;attack=null;
  $('scheme-original').setAttribute('aria-pressed',String(scheme==='original'));
  $('scheme-new').setAttribute('aria-pressed',String(scheme==='new'));
  const original=scheme==='original';
  document.querySelector('.controls').innerHTML='<span><kbd>A</kbd><kbd>D</kbd> MOVE</span>'+
    (original?'<span><kbd>SPACE</kbd> JUMP</span><span><kbd>LMB</kbd> ATTACK</span><span><kbd>W</kbd> AIM UP</span><span><kbd>SHIFT</kbd><kbd>S</kbd> CROUCH / AIM DOWN</span>':'<span><kbd>W</kbd><kbd>SPACE</kbd> JUMP</span><span><kbd>←</kbd><kbd>↑</kbd><kbd>↓</kbd><kbd>→</kbd> ATTACK</span><span><kbd>SHIFT</kbd><kbd>S</kbd> CROUCH</span>')+'<span><kbd>Q</kbd> DASH</span><span><kbd>E</kbd> INVENTORY</span><span><kbd>TAB</kbd> MAP</span>';
  const notes=document.querySelectorAll('.notes p');
  notes[0].innerHTML='<b>Downward movement</b>'+(original?'Hold S and click in the air to pogo.':'Press Down Arrow in the air to attack down and pogo on enemies or projectiles.')+' Hold Shift (or S) + Space to drop through a thin platform. Crouching keeps you from walking off an edge.';
  notes[1].innerHTML='<b>Walls & ledges</b>Touch visible rock to slide; open cliff edges cannot be gripped. Hold toward rock to slide slower, or hold Shift (or S) to stop. '+(original?'Space':'W or Space')+' wall-jumps or pulls you onto a grabbed ledge.';
  canvas.setAttribute('aria-label','Platformer. '+controlHint()+'. Full controls below.');
  if(mode==='title')$('overlay-foot').textContent=controlHint();
  if(mode==='playing')canvas.focus();
}
$('scheme-original').addEventListener('click',()=>selectControls('original'));
$('scheme-new').addEventListener('click',()=>selectControls('new'));
const rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const overlap=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
const key=(x,y)=>`${x},${y}`;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function platform(x,y,w,type='solid',h=20){return {x,y,w,h,type,baseX:x,baseY:y,life:0,gone:0,dx:0,dy:0};}
const TRACK_TILE=32;
function configureTrack(s){s.travel=64;s.rise=64;s.track='tiled';}
function trackPoint(s,u){
  if(!s.trackNodes)return {x:s.baseX+(s.travel||0)*u,y:s.baseY};
  const distance=clamp((u+1)/2,0,1)*s.trackLength;
  let passed=0;
  for(let i=1;i<s.trackNodes.length;i++){
    const a=s.trackNodes[i-1],b=s.trackNodes[i],length=Math.hypot(b.x-a.x,b.y-a.y);
    if(distance<=passed+length||i===s.trackNodes.length-1){const t=clamp((distance-passed)/length,0,1);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}passed+=length;
  }
  return s.trackNodes[0];
}
function platformBounds(s){
  if(s.type!=='moving')return s;
  const nodes=s.trackNodes||[{x:s.baseX-64,y:s.baseY-64},{x:s.baseX+64,y:s.baseY+TRACK_TILE}];
  const x=Math.min(...nodes.map(p=>p.x)),y=Math.min(...nodes.map(p=>p.y));
  return {x,y,w:Math.max(...nodes.map(p=>p.x))-x+s.w,h:Math.max(...nodes.map(p=>p.y))-y+s.h};
}
function buildTracks(r){
  for(const s of r.platforms.filter(p=>p.type==='moving')){
    let nodes;
    for(let attempt=0;attempt<20;attempt++){
      const path=[{x:s.baseX,y:s.baseY+TRACK_TILE}];let col=0;
      for(let row=1;row>=-2;row--){
        if(attempt<19&&Math.random()<.7){const next=clamp(col+pick([-1,1]),-2,2);if(next!==col){col=next;path.push({x:s.baseX+col*TRACK_TILE,y:s.baseY+row*TRACK_TILE});}}
        if(row>-2)path.push({x:s.baseX+col*TRACK_TILE,y:s.baseY+(row-1)*TRACK_TILE});
      }
      const safe=path.every(p=>p.x>=40&&p.x+s.w<=r.w-40&&p.y>=80&&p.y+s.h<r.floorY&&
        !r.platforms.some(b=>b!==s&&b.type!=='oneway'&&b.type!=='moving'&&overlap({x:p.x,y:p.y-44,w:s.w,h:s.h+44},b)));
      if(safe){nodes=path;break;}
    }
    if(!nodes){
      // A doorway can leave no safe room for a lift. Keep this existing
      // climbing step fixed instead of routing a platform through rock.
      s.type='oneway';s.x=s.baseX;s.y=s.baseY;s.travel=0;delete s.track;continue;
    }
    s.trackNodes=nodes;
    s.trackLength=s.trackNodes.slice(1).reduce((n,p,i)=>n+Math.hypot(p.x-s.trackNodes[i].x,p.y-s.trackNodes[i].y),0);
    s.x=s.trackNodes[0].x;s.y=s.trackNodes[0].y;s.travel=Math.max(...s.trackNodes.map(p=>Math.abs(p.x-s.baseX)));s.rise=64;
  }
  return true;
}
function addRockWalls(r,jumpCorridors){
  r.wallGrips={left:[],right:[]};
  for(const side of ['left','right']){
    // Some edges are sheer/open cliff faces; only visible rock patches grip.
    if(Math.random()<.35)continue;
    for(let y=110;y<r.floorY-70;y+=260)if(Math.random()<.65)r.wallGrips[side].push({y,h:120});
  }
  const clear=r.platforms.slice(1).map(p=>{const b=platformBounds(p);return {x:b.x-35,y:b.y-190,w:b.w+70,h:b.h+210};});
  clear.push(...jumpCorridors);
  for(const [side,d]of Object.entries(r.doors||{}))clear.push({x:side==='left'?0:r.w-230,y:d.y-70,w:230,h:d.h+140});
  const desired=r.size==='small'?1:r.size==='large'?4:2;let added=0;
  for(let attempt=0;attempt<140&&added<desired;attempt++){
    const w=32,h=pick([128,160,192]),x=Math.round(rand(65,r.w-97)/32)*32,y=Math.round(rand(170,r.floorY-h-50)/32)*32;
    const wall=platform(x,y,w,'solid',h);wall.verticalWall=true;
    if(y<80||y+h>r.floorY-30||clear.some(c=>overlap(wall,c))||r.platforms.some(p=>overlap(wall,platformBounds(p))))continue;
    r.platforms.push(wall);added++;
  }
}
function canGripBoundary(side,y,h){return (room.wallGrips?.[side]||[]).some(s=>y+h>s.y&&y<s.y+s.h);}
function makeRoom(x,y,type='normal'){
  const r={x,y,type,visited:false,platforms:[],enemies:[]};rooms.set(key(x,y),r);return r;
}
const BOSSES=[
  {id:'warden',name:'CRAG WARDEN',size:'large',hp:72,sprite:'warden',hint:'Dodge the marked leap and landing waves. Strike during recovery.'},
  {id:'roc',name:'STORM ROC',size:'tall',hp:54,sprite:'roc',hint:'Dodge the marked dive. Attack while it recovers.'},
  {id:'heart',name:'GLACIER HEART',size:'long',hp:60,sprite:'crystal',hint:'Dodge the marked volleys. Strike when the core opens. Below half health: extra volley.'}
];
function bossForFloor(number){
  if(number===7)return {id:'echo',family:'echo',name:'ECHO SENTINEL',size:'tall',hp:90,sprite:'echo',hint:'Find the gap in the sound rings. Strike between pulses.'};
  if(number>=8)return {id:'kiln',family:'kiln',name:'THE MOUNTAIN FURNACE',size:'large',hp:150,sprite:'kiln',hint:'Leave marked eruption lanes. Dodge the spiral and aimed bursts. Strike when the furnace opens.'};
  const index=Math.max(0,Math.min(RUN_FLOORS-1,number-1));
  const family=Math.floor(index/2),tier=index%2,base=BOSSES[family];
  if(!tier)return {...base,family:base.id,tier:0,tint:0};
  const forms=[
    {name:'SHALE BREAKER',sprite:'shale',hint:'Dodge the leap, then the marked rockfalls. Strike during recovery.'},
    {name:'FROSTWING',sprite:'frostwing',hint:'Dodge dives and frost-trailing swoops. Strike during recovery.'},
    {name:'SPLINTER CORE',sprite:'splinter',hint:'Dodge the volleys. Break orbiting shards for a longer opening.'}
  ];
  return {...base,...forms[family],id:base.id+'-variant-'+tier,family:base.id,tier,tint:(tier-1)*23,hp:base.hp+12*tier,name:forms[family].name+(tier>1?' '+tier:'')};
}
function roomBossSpec(r){return r.bossSpec||BOSSES.find(b=>b.id===r.bossId);}
function buildFloor(){
  for(let attempt=0;attempt<100;attempt++){const start=tryBuildFloor();if(start)return start;}
  throw Error("Unable to generate connected special-room branches");
}
function tryBuildFloor(){
  rooms=new Map();const occupied=new Set();let branchCeiling=Infinity;
  function add(x,y,size,type='normal'){
    const shape=ROOM_SIZES[size];
    for(let dx=0;dx<shape.gridW;dx++)for(let dy=0;dy<shape.gridH;dy++)if(occupied.has(key(x+dx,y+dy)))return null;
    const r=makeRoom(x,y,type);Object.assign(r,shape);r.size=size;r.links={};r.ports={};
    for(let dx=0;dx<shape.gridW;dx++)for(let dy=0;dy<shape.gridH;dy++)occupied.add(key(x+dx,y+dy));
    return r;
  }
  function remove(r){
    for(const [d,n]of Object.entries(r.links))delete n.links[{left:'right',right:'left',up:'down',down:'up'}[d]];
    for(let dx=0;dx<r.gridW;dx++)for(let dy=0;dy<r.gridH;dy++)occupied.delete(key(r.x+dx,r.y+dy));
    rooms.delete(key(r.x,r.y));
  }
  function attach(parent,direction,size,type='normal',branch=false){
    if(parent.links[direction])return null;
    const shape=ROOM_SIZES[size];let x=parent.x,y=parent.y;
    if(direction==='right'){x+=parent.gridW;y+=Math.max(0,parent.gridH-shape.gridH);}
    if(direction==='left'){x-=shape.gridW;y+=Math.max(0,parent.gridH-shape.gridH);}
    let bendColumn=null;
    if(direction==='up'){y+=parent.gridH;if(isL(parent)||isL({size})){bendColumn=parent.x+(isL(parent)&&!mirroredL(parent)?parent.gridW-1:0);x=bendColumn-(mirroredL({size})?shape.gridW-1:0);}}
    if(branch&&y+shape.gridH>branchCeiling)return null;
    const side=direction==='left'||direction==='right';
    const low=Math.max(parent.y,y)*580,high=Math.min(parent.y+parent.gridH,y+shape.gridH)*580;
    const altitude=side?Math.max(low+100,(parent.entryAltitude??parent.y*580+40)+(branch?45:90)):y*580+40;
    if(side&&altitude>high-120)return null;
    const r=add(x,y,size,type);if(!r)return null;
    const opposite={left:'right',right:'left',up:'down'}[direction];
    parent.links[direction]=r;r.links[opposite]=parent;r.parent=parent;r.entryDirection=opposite;r.entryAltitude=altitude;r.branch=branch;
    if(!branch)parent.forward=direction;
    const port=side?{altitude}:{worldX:bendColumn!==null?(bendColumn+.5)*780:(type==='finish'||size==='invertedL')?(x+.5)*780:(Math.max(parent.x,x)+Math.min(parent.x+parent.gridW,x+shape.gridW))*390};
    parent.ports[direction]=port;r.ports[opposite]=port;
    return r;
  }
  const start=add(0,0,'small','start');start.entryAltitude=40;let current=start;
  // A compact first climb, then one extra route section every three floors.
  const routeSections=2+Math.floor((floor-1)/3);
  for(let level=0;level<routeSections;level++){
    if(current.size!=='large'&&!isL(current)&&Math.random()<.6){
      const direction=pick(['left','right']),distance=pick([1,2]);
      for(let step=0;step<distance;step++){
        const previous=current,connector=attach(current,direction,step===distance-1?'small':pick(['long','small']));
        if(!connector)break;
        current=connector;
        if(current.size==='long'){
          const turn=attach(current,direction,'small');
          if(turn)current=turn;else{remove(connector);current=previous;break;}
        }
      }
    }
    if(Math.random()<.55){const shaft=attach(current,'up','tall');if(shaft)current=shaft;}
    current=attach(current,'up',pick(['small','large',...L_SHAPES]))||attach(current,'up','small')||current;
  }
  // Each special room ends its own 5–7-room branch with varied footprints.
  const main=[...rooms.values()].filter(r=>(r.type==='normal'||r.type==='start'));
  for(const type of ['item','shop']){
    let placed=false;
    for(const source of shuffle(main)){
      for(const direction of shuffle(source.size==='long'?['left','right']:source.size==='tall'||isL(source)?['up']:['left','right','up'])){
        for(let attempt=0;attempt<12&&!placed;attempt++){
        const path=[];let tip=source,horizontalRun=0,upSteps=0;const length=pick([5,6,7]);
        function extend(type,index){
          const sideDirection=direction==='up'?(source.x<=0?'left':'right'):direction;
          const directions=index===0?[direction]:tip.size==='long'?[sideDirection]:tip.size==='tall'||tip.size==='large'||isL(tip)||horizontalRun>=2?['up']:shuffle(['up',sideDirection]);
          for(const d of directions){
            // Match the incoming connection and reserve the correct outgoing
            // direction for elongated rooms. Occupancy checks cover every tile.
            const sizes=shuffle(d==='up'?['small','large','tall',...L_SHAPES]:['small','large','long']);
            for(const size of sizes){if(size==='long'&&horizontalRun>=1)continue;const n=attach(tip,d,size,type,true);if(n){horizontalRun=d==='up'?0:horizontalRun+1;if(d==='up')upSteps++;return n;}}
          }
          return null;
        }
        for(let i=0;i<length;i++){const n=extend('normal',i);if(!n)break;path.push(n);tip=n;}
        const special=path.length===length?extend(type,length):null;
        if(special&&upSteps>=2){placed=true;break;}
        if(special)remove(special);
        for(const r of path.reverse())remove(r);
        }
        if(placed)break;
      }
      if(placed)break;
    }
  }
  if(!["item","shop"].every(type=>[...rooms.values()].some(r=>r.type===type)))return null;
  // Place the summit after side routes so even high main-path rooms can branch.
  const specialTop=Math.max(...[...rooms.values()].filter(r=>r.type==='item'||r.type==='shop').map(r=>r.y+r.gridH));
  while(current.y+current.gridH<specialTop){
    const next=attach(current,'up',specialTop-(current.y+current.gridH)>=2?'tall':'small');
    if(!next)return null;current=next;
  }
  const spec=bossForFloor(floor),finish=attach(current,'up',spec.size,'finish');
  if(!finish)return null;
  finish.bossId=spec.id;finish.bossSpec=spec;finish.layout=Math.floor(rand(0,3));
  for(const r of rooms.values())generateRoom(r,r.size);
  return start;
}
function connectLanding(r,target){
  // Finish the room's climb with rock ledges, not a separate thin-platform ramp.
  const anchors=r.route.filter(s=>s.type!=='moving');
  const source=anchors.reduce((best,s)=>Math.abs(s.y-target.y)<Math.abs(best.y-target.y)?s:best,anchors[0]);
  const sx=source.x+source.w/2,tx=target.x+target.w/2;
  const steps=Math.max(1,Math.ceil(Math.abs(tx-sx)/150),Math.ceil(Math.abs(target.y-source.y)/85));
  let previous=source;
  for(let i=1;i<=steps;i++){
    const t=i/steps,last=i===steps,w=last?(target.w===150?150:90):80;
    const y=source.y+(target.y-source.y)*t+Math.sin(t*Math.PI)*28;
    const s=platform(sx+(tx-sx)*t-w/2,y,w,last||i%2===0?'solid':'break',24);
    s.access=true;s.accessFrom=previous;r.platforms.push(s);previous=s;
  }
}
function openFloorAccess(r){
  const first=r.route[0],gap=64;
  let x=first.x-gap-12>=184?first.x-gap-12:first.x+first.w+12;
  if(r.links.down&&x<r.bottomX+71&&x+gap>r.bottomX-29){
    const choices=[r.bottomX-29-gap-8,r.bottomX+79].filter(v=>v>=184&&v+gap<=r.w-184);
    x=choices.sort((a,b)=>Math.abs(a-x)-Math.abs(b-x))[0]??x;
  }
  r.floorAccess={x,y:first.y-45,w:gap,h:r.floorY-first.y+45};
  // Leave a body-wide descent beside the first climbing step, then a clear
  // jump back up. Split lower rock shelves that would seal off that opening.
  for(const s of [...r.platforms.slice(1)]){
    if(s.type==='moving'||!overlap(s,r.floorAccess))continue;
    const left=Math.max(0,x-s.x),right=Math.max(0,s.x+s.w-x-gap);
    if(left>=right){
      if(right>=40)r.platforms.push(platform(x+gap,s.y,right,s.type,s.h));
      s.w=left;
    }else{
      if(left>=40)r.platforms.push(platform(s.x,s.y,left,s.type,s.h));
      s.x=x+gap;s.baseX=s.x;s.w=right;
    }
    if(s.w<20){s.w=20;s.x=x-20;s.baseX=s.x;}
  }
}
function configurePassages(r){
  r.doors={};
  for(const [d,n]of Object.entries(r.links)){
    const port=r.ports?.[d];if(!port)continue;
    if(d==='left'||d==='right'){
      const sill=r.h-(port.altitude-r.y*580);
      r.doors[d]={x:d==='left'?0:r.w-25,y:sill-96,w:25,h:96,sill};
      connectLanding(r,{x:d==='left'?24:r.w-174,y:sill,w:150});
    }else{
      const center=port.worldX-r.x*780;
      if(d==='up'){r.topX=center-21;connectLanding(r,{x:center-110,y:140,w:220});}
      else r.bottomX=center-21;
    }
  }
  if(r.type==='finish')connectLanding(r,{x:r.topX-89,y:140,w:220});
  r.spawnX=clamp(r.bottomX+(r.bottomX<r.w/2?160:-160),65,r.w-91);
}
function generateRoom(r,size){
  if(r.bossId&&!r.generatingBoss){
    const originalRandom=Math.random;let seed=17011+BOSSES.findIndex(b=>b.id===(roomBossSpec(r).family||r.bossId))*1009+(roomBossSpec(r).tier||0)*3011+r.layout*97;
    Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};r.generatingBoss=true;
    try{generateRoom(r,size);}finally{Math.random=originalRandom;delete r.generatingBoss;}
    return;
  }
  r.size=size;r.links??={};Object.assign(r,ROOM_SIZES[size]);r.floorY=r.h-40;
  r.platforms=[platform(0,r.floorY,r.w,'solid',40)];r.route=[];r.enemies=[];r.hearts=[];r.debris=[];r.clearRewarded=false;
  // The main route includes moving and collapsing steps. Collapsed steps
  // return, and the final landing stays fixed so every exit remains usable.
  const rows=Math.max(3,Math.floor((r.floorY-140)/112)), rise=(r.floorY-140)/rows;
  let center=isL(r)?(mirroredL(r)?r.w-350:350):rand(190,r.w-190), drift=pick([-1,1]);
  for(let i=0;i<rows;i++){
    const previous=r.route.at(-1);
    if(previous){
      if(Math.random()<.35)drift*=-1;
      center+=drift*rand(195,205);
      if(center<195||center>r.w-195){drift*=-1;center=previous.x+previous.w/2+drift*rand(195,205);}
      center=clamp(center,195,r.w-195);
    }
    if(isL(r)&&r.floorY-rise*(i+1)>420)center=mirroredL(r)?clamp(center,r.w-550,r.w-190):clamp(center,190,550);
    const width=rand(180,190), y=r.floorY-rise*(i+1);
    const type=i===rows-1?'oneway':i%3===0?'break':i%3===1?'moving':'oneway';
    const s=platform(center-width/2,y,width,type,type==='break'?20:10);
    if(type==='moving')configureTrack(s);
    r.route.push(s);r.platforms.push(s);
  }
  if(isL(r)){const corner=platform(mirroredL(r)?0:780,580,r.w-780,'solid',r.h-580);corner.shapeBoundary=true;r.platforms.push(corner);}
  const top=r.route.at(-1);r.topX=top.x+top.w/2-21;
  r.bottomX=clamp(r.route[0].x+r.route[0].w/2-21,85,r.w-127);
  r.spawnX=clamp(r.bottomX+(r.bottomX<r.w/2?160:-160),65,r.w-91);
  const jumpCorridors=r.route.map((s,i)=>{
    const previous=r.route[i-1],fromX=previous?previous.x+previous.w/2:s.x+s.w/2,toX=s.x+s.w/2;
    const fromY=previous?previous.y:r.floorY;
    if(!previous)return {x:s.x-110,y:fromY-195,w:s.w+220,h:195};
    return {x:Math.min(fromX,toX)-40,y:fromY-195,w:Math.abs(toX-fromX)+80,h:195};
  });
  // Add branches outward from reachable steps, with clear space around them.
  const types=shuffle(['solid','break','moving']);
  for(const anchor of shuffle(r.route)){
    const side=pick([-1,1]), width=rand(115,160), travel=types[0]==='moving'?60:0;
    const x=side<0?anchor.x-width-45-travel:anchor.x+anchor.w+45+travel;
    const candidate=platform(x,anchor.y,width,types[0],types[0]==='moving'?10:20);
    candidate.travel=travel;
    const bounds={x:x-travel-16,y:anchor.y-180,w:width+travel*2+32,h:225};
    if(x-travel<45||x+width+travel>r.w-45||r.platforms.some(s=>overlap(bounds,platformBounds(s)))||jumpCorridors.some(c=>overlap(bounds,c)))continue;
    // Optional branches keep their generous horizontal clearance.
    if(candidate.type==='moving')configureTrack(candidate);
    r.platforms.push(candidate);types.push(types.shift());
  }
  // Long rooms also get several low, individually reachable islands.
  for(let x=100;x<r.w-170;x+=rand(210,285)){
    const candidate=platform(x,r.floorY-rand(65,105),rand(120,170),pick(['solid','oneway','break']),20);
    const bounds={x:candidate.x-95,y:r.floorY-210,w:candidate.w+190,h:210};
    if(!jumpCorridors.some(c=>overlap(bounds,c))&&!r.platforms.slice(1).some(s=>overlap(bounds,platformBounds(s))))r.platforms.push(candidate);
  }
  configurePassages(r);
  openFloorAccess(r);jumpCorridors.push(r.floorAccess);
  buildTracks(r);
  addRockWalls(r,jumpCorridors);
  // A drop-through foothold makes the floor route usable in both directions.
  r.floorStep=platform(r.floorAccess.x,r.floorY-65,r.floorAccess.w,'oneway',10);
  r.platforms.push(r.floorStep);
  if(r.bossId){createBoss(r);return;}
  if(r.type!=='normal')return;
  const supports=shuffle(r.platforms.slice(1).filter(s=>!s.shapeBoundary));
  const count=Math.min(supports.length,(isL(r)?Math.min(11,r.gridW+r.gridH+3):({small:3,long:5,large:7,tall:7})[size]));
  let kinds=[];
  for(const s of supports){
    if(r.enemies.length>=count)break;
    if(Math.abs(s.x+s.w/2-(r.topX+21))<100&&s.y<240)continue;
    if(!kinds.length)kinds=shuffle(['crawler','ground','air','dive']);
    const chosen=kinds.pop(),type=s.verticalWall?'crawler':s.type==='break'||s.type==='moving'?pick(['air','dive']):chosen;
    const flying=type==='air'||type==='dive';
    let x=rand(s.x+36,s.x+s.w-64),y=s.y-22;
    if(type==='crawler'){
      // Reserve the entire patrol, including sides and underside.
      const patrol={x:s.x-28,y:s.y-28,w:s.w+56,h:s.h+56};
      if(patrol.x<25||patrol.x+patrol.w>r.w-25||patrol.y<20||patrol.y+patrol.h>r.floorY||r.platforms.some(b=>b!==s&&overlap(patrol,platformBounds(b))))continue;
      x=s.x+s.w/2-14;y=s.y-28;
    }
    if(flying){
      let spot=null;
      for(let attempt=0;attempt<30;attempt++){
        const fx=clamp(s.x+s.w/2+pick([-1,1])*rand(45,125)-14,85,r.w-113);
        const fy=s.y-rand(140,190);
        if(fy<70)continue;
        // Reserve open air for the body, wings, and entire idle flight motion.
        const airspace={x:fx-60,y:fy-32,w:148,h:110};
        if(r.platforms.some(b=>overlap(airspace,platformBounds(b))))continue;
        if(r.enemies.some(e=>Math.hypot(e.homeX-fx,e.homeY-fy)<85))continue;
        spot={x:fx,y:fy};break;
      }
      if(!spot)continue;
      x=spot.x;y=spot.y;
    }
    const e=enemy(type,x,y,s);
    if(r.platforms.some(b=>b!==s&&overlap({x:x-34,y:y-14,w:96,h:50},b)))continue;
    r.enemies.push(e);
  }
}
function updateCamera(){
  camera.x=clamp(player.x+player.w/2-W/2,0,Math.max(0,room.w-W));
  camera.y=clamp(player.y+player.h/2-H/2,0,Math.max(0,room.h-H));
  camera.offsetX=Math.max(0,(W-room.w)/2);camera.offsetY=Math.max(0,(H-room.h)/2);
}
function enemy(type,x,y,support){return {type,x,y,w:28,h:type==='crawler'?28:22,hp:type==='ground'?9:6,max:type==='ground'?9:6,range:400,vx:pick([-1,1])*65,vy:0,homeX:x,homeY:y,support,phase:'idle',clock:rand(0,1.8),flightTime:rand(0,6),flash:0};}
function createPlayer(){return {x:170,y:620,w:26,h:40,vx:0,vy:0,hp:10,face:1,ground:null,wall:0,ledge:null,iframes:0,hitLock:0,drop:0,attackCD:0,coyote:0,ledgeCD:0,crouch:false};}
function enterRoom(r,from='start'){
  room=r;r.visited=true;shots=[];numbers=[];attack=null;exitLock=.75;exitArmed=false;
  const p=player;p.vx=p.vy=0;p.ledge=null;p.ground=null;p.h=40;p.wall=0;p.drop=0;p.coyote=0;
  if(from==='left'){p.x=45;p.y=(r.doors.left?.sill??r.floorY)-p.h;}
  else if(from==='right'){p.x=r.w-71;p.y=(r.doors.right?.sill??r.floorY)-p.h;}
  else if(from==='bottom'){p.x=r.spawnX;p.y=r.floorY-p.h;}
  else if(from==='top'){p.x=r.topX+8;p.y=140-p.h;}
  else{p.x=r.spawnX;p.y=r.floorY-p.h;}
  if(devFlight)flightAnchor={room,x:p.x,y:p.y};
  updateCamera();
  $('floor-label').textContent=`${String(floor).padStart(2,'0')} / ${mountainTheme().name}`;
  $('room-label').textContent=r.bossId?roomBossSpec(r).name:({start:'TRAILHEAD',normal:'MOUNTAIN PASS',item:'ITEM ROOM',shop:'SHOP',finish:'UPPER PASS'})[r.type];
  $('room-coordinate').textContent=`ROOM ${String([...rooms.values()].indexOf(r)+1).padStart(2,'0')} / ${rooms.size} · ${r.size.toUpperCase()}`;
  $('room-note').textContent=r.type==='item'||r.type==='shop'?'EMPTY • RESERVED FOR A LATER ITERATION':r.type==='finish'?'DEFEAT THE BOSS TO OPEN THE UPPER PASS':'FIND YOUR WAY UP';
}
function updateHearts(){
  $('hearts').innerHTML=Array.from({length:5},(_,i)=>`<span class="heart ${player.hp>=i*2+2?'':player.hp===i*2+1?'half':'empty'}"></span>`).join('');
  $('hearts').setAttribute('aria-label',`${player.hp} of 10 hit points`);
}
function start(){devFlight=false;flightAnchor=null;refreshDevIndicator();mapExpanded=false;transition=null;floor=1;player=createPlayer();enterRoom(buildFloor());updateHearts();setMode('playing');}
function setMode(next){
  mode=next;flightTap=null;keys.clear();jumpQueued=attackQueued=false;accumulator=0;
  $('overlay').classList.toggle('hidden',next==='playing');
  if(next==='playing'){canvas.focus();return;}
  const data={title:['UP THE MOUNTAIN','The only way<br>is up.','Empty hands. Five hearts. One mountain.<br>Climb from the foothills into the snow.','BEGIN THE CLIMB','A / D to move · W / SPACE to jump · ARROWS to attack'],paused:['TAKE A BREATH','Climb paused.','Your next step can wait.','RESUME THE CLIMB','ESC to resume'],inventory:['INVENTORY','Empty hands.','You started with nothing.<br>The inventory system will be developed in a later iteration.','BACK TO THE CLIMB','E or ESC to return'],won:['SUMMIT REACHED','You made it.','Eight floors. Eight bosses.<br>The mountain is conquered.','CLIMB AGAIN','Start a new eight-floor run'],dead:['END OF THE CLIMB','A little higher<br>next time.',`You reached floor ${floor}.<br>Begin again with five hearts and a new floor.`,'START AGAIN','A new run starts with nothing']}[next];
  $('overlay-kicker').textContent=data[0];$('overlay-title').innerHTML=data[1];$('overlay-copy').innerHTML=data[2];$('overlay-action').innerHTML=data[3]+' <span>↗</span>';$('overlay-foot').textContent=next==='title'?controlHint():data[4];
}
$('overlay-action').addEventListener('click',()=>mode==='title'||mode==='dead'||mode==='won'?start():setMode('playing'));
$('pause-button').addEventListener('click',()=>{if(mode==='playing')setMode('paused');else if(mode==='paused'||mode==='inventory')setMode('playing');});
window.addEventListener('keydown',e=>{
  if(e.code==='Tab'&&mode==='playing'){
    e.preventDefault();if(!e.repeat)mapExpanded=!mapExpanded;return;
  }
  if(e.target instanceof HTMLElement&&e.target.closest('button')&&(e.code==='Space'||e.code==='Enter'))return;
  const k=e.code;if(['Space','KeyW','KeyA','KeyS','KeyD','KeyE','KeyV','KeyQ','ShiftLeft','ShiftRight','Escape','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(k))e.preventDefault();
  if(e.repeat)return;
  if(k==='Escape'&&document.getElementById('game-display').classList.contains('window-mode')){setWindowMode(false);return;}
  if(k==='Escape'){if(mode==='playing')setMode('paused');else if(mode==='paused'||mode==='inventory')setMode('playing');return;}
  if(['KeyD','KeyE','KeyV'].includes(k)){
    devKeys.add(k);
    if(k==='KeyE')inventoryTap=true;
    if(devChord()){updateDevToggle(performance.now());return;}
    if(k==='KeyE'||k==='KeyV')return;
  }
  keys.add(k);
  if(mode==='playing'&&!transition){
    if(devMode&&(devFlight||(!player.ground&&!player.ledge&&!player.wall&&player.coyote<=0))&&(k==='Space'||k==='KeyW')){
      const now=performance.now();
      if(flightTap?.key===k&&now-flightTap.time<=300){
        if(devFlight)stopDevFlight();
        else{devFlight=true;flightTap=null;flightAnchor={room,x:player.x,y:player.y};refreshDevIndicator();}
        jumpQueued=false;
      }
      else flightTap={key:k,time:now};
      return;
    }
    if(k==='KeyQ'&&(player.dashCD||0)<=0){player.dashTime=.16;player.dashCD=.65;player.dashFace=keys.has('KeyA')?-1:keys.has('KeyD')?1:player.face;player.ledge=null;}
    if(k==='Space'||(controlScheme==='new'&&k==='KeyW'))jumpQueued=k;
    if(controlScheme==='new'&&k.startsWith('Arrow'))attackQueued=k;
  }
});
window.addEventListener('keyup',e=>{
  keys.delete(e.code);devKeys.delete(e.code);
  if(e.code==='KeyE'&&inventoryTap){inventoryTap=false;if(mode==='playing')setMode('inventory');else if(mode==='inventory')setMode('playing');}
  if(!devChord()){devHoldStart=null;devLatched=false;}
});
canvas.addEventListener('mousedown',e=>{canvas.focus();
  if(e.button===0&&devMode&&mapExpanded&&(mode==='playing'||mode==='paused')){
    e.preventDefault();const bounds=canvas.getBoundingClientRect(),x=(e.clientX-bounds.left)*W/bounds.width,y=(e.clientY-bounds.top)*H/bounds.height;
    const {cell,nodes}=mapLayout(true),target=nodes.find(n=>Math.abs(x-n.x)<=cell*(n.room.gridW-.18)/2&&Math.abs(y-n.y)<=cell*(n.room.gridH-.18)/2);
    if(target&&target.room!==room){transition=null;keys.clear();jumpQueued=attackQueued=false;enterRoom(target.room);}
    return;
  }
  if(e.button===0&&controlScheme==='original'&&mode==='playing'&&!transition){attackQueued='mouse';e.preventDefault();}});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
window.addEventListener('blur',()=>{resetDevInput();keys.clear();if(mode==='playing')setMode('paused');});
document.addEventListener('visibilitychange',()=>{if(document.hidden){resetDevInput();keys.clear();if(mode==='playing')setMode('paused');}});
function damage(source){
  const p=player;if(devMode||p.iframes>0||mode!=='playing')return;
  p.hp--;p.iframes=1.15;p.hitLock=.2;p.vx=(p.x+p.w/2<source.x+source.w/2?-1:1)*270;p.vy=-230;p.ledge=null;p.ground=null;updateHearts();
  if(p.hp<=0)setMode('dead');
}
function attackBox(){
  const p=player;
  if(attack.dir==='up')return {x:p.x-15,y:p.y-49,w:56,h:53};
  if(attack.dir==='down')return {x:p.x-14,y:p.y+p.h-2,w:54,h:52};
  return {x:attack.face>0?p.x+p.w-3:p.x-53,y:p.y-5,w:56,h:p.h+10};
}
function consumeAttack(down){
  const p=player;
  if(attackQueued&&p.attackCD<=0){
    const dir=attackQueued==='mouse'?(down?'down':keys.has('KeyW')?'up':'side'):attackQueued==='ArrowUp'?'up':attackQueued==='ArrowDown'?'down':'side';
    const face=attackQueued==='ArrowLeft'?-1:attackQueued==='ArrowRight'?1:p.face;
    if(dir==='side')p.face=face;
    attack={dir,face,time:.18,hit:new Set()};p.attackCD=.29;
  }
  attackQueued=false;
}
function riverZones(r){
  if(!isL(r))return null;
  const water={river:{x:756,y:552,w:r.w-781,h:28},fall:{x:748,y:560,w:32,h:r.floorY-560},pool:{x:688,y:r.floorY-20,w:92,h:20}};
  if(mirroredL(r))for(const zone of Object.values(water))zone.x=r.w-zone.x-zone.w;
  water.direction=mirroredL(r)?1:-1;return water;
}
function applyRiverCurrent(p,dt){
  const water=riverZones(room);p.inCurrent=false;
  if(!water||devFlight)return;
  if(overlap(p,water.river)){p.vx+=water.direction*5200*dt;p.inCurrent=true;}
  if(overlap(p,water.fall)){p.vy=Math.min(850,p.vy+4200*dt);p.inCurrent=true;}
  if(overlap(p,water.pool)){p.vx+=water.direction*1000*dt;p.inCurrent=true;}
}
function updatePlayer(dt){
  const p=player, oldX=p.x,oldY=p.y,down=keys.has('KeyS')||keys.has('ShiftLeft')||keys.has('ShiftRight');
  p.dashCD=Math.max(0,(p.dashCD||0)-dt);p.dashTime=Math.max(0,(p.dashTime||0)-dt);
  for(const field of ['iframes','drop','attackCD','coyote','ledgeCD','hitLock'])p[field]=Math.max(0,p[field]-dt);
  if(!devFlight&&(p.ground||p.ledge||p.wall||p.coyote>0))flightTap=null;
  if(devFlight&&devMode){
    jumpQueued=false;
    const dx=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
    const dy=Number(down)-Number(keys.has('Space')||keys.has('KeyW'));
    const length=Math.hypot(dx,dy)||1;
    p.vx=dx/length*330*devFlightSpeed;p.vy=dy/length*330*devFlightSpeed;if(p.dashTime>0)p.vx=p.dashFace*700*devFlightSpeed;p.ground=null;p.ledge=null;p.wall=0;p.coyote=0;p.crouch=false;p.h=40;
    if(dx)p.face=dx;
    p.x=clamp(p.x+p.vx*dt,-p.w,room.w);p.y=clamp(p.y+p.vy*dt,-p.h,room.h);
    consumeAttack(down);return;
  }

  if(p.ground&&p.ground.gone<=0){p.x+=p.ground.dx;p.y+=p.ground.dy;p.coyote=.1;}
  const crouch=down&&!!p.ground;
  const wantedH=crouch?25:40;
  if(wantedH<p.h){p.y+=p.h-wantedH;p.h=wantedH;}
  else if(wantedH>p.h){const expanded={x:p.x,y:p.y-(wantedH-p.h),w:p.w,h:wantedH};if(!room.platforms.some(s=>s.type!=='oneway'&&s.type!=='moving'&&s.gone<=0&&overlap(expanded,s))){p.y=expanded.y;p.h=wantedH;}}
  p.crouch=p.h<40;
  let direction=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);
  if(direction)p.face=direction;
  if(p.ledge){
    const ledge=p.ledge;
    if(ledge.platform.gone>0){p.ledge=null;p.ledgeCD=.25;}
    else if(jumpQueued){p.x=ledge.side===1?ledge.platform.x+5:ledge.platform.x+ledge.platform.w-p.w-5;p.y=ledge.platform.y-p.h;p.vy=0;p.ground=ledge.platform;p.ledge=null;p.ledgeCD=.3;}
    else if(down){p.ledge=null;p.vy=50;p.ledgeCD=.35;}
    else{p.y=ledge.platform.y+7;p.x=ledge.side===1?ledge.platform.x-p.w:ledge.platform.x+ledge.platform.w;p.vx=p.vy=0;}
    jumpQueued=false;
    if(p.ledge)return;
  }
  if(jumpQueued){
    if(down&&jumpQueued!=='KeyW'&&p.ground&&(p.ground.type==='oneway'||p.ground.type==='moving')){p.drop=.24;p.y+=5;p.vy=70;p.ground=null;p.coyote=0;}
    else if(p.ground||p.coyote>0){p.vy=-570;p.ground=null;p.coyote=0;}
    else if(p.wall){p.vy=-530;p.vx=-p.wall*330;p.hitLock=.19;p.ledgeCD=.2;}
    jumpQueued=false;
  }
  if(p.hitLock<=0){const target=direction*(p.crouch?115:270);p.vx+=(target-p.vx)*Math.min(1,dt*(p.ground?20:9));}
  p.vy=Math.min(740,p.vy+1120*dt);
  if(p.wall&&p.vy>0){p.vy=Math.min(p.vy,down?0:direction===p.wall?48:110);}
  if(p.dashTime>0){p.vx=p.dashFace*700;p.vy=0;}
  applyRiverCurrent(p,dt);
  const support=p.ground;p.wall=0;
  p.x+=p.vx*dt;
  if(crouch&&!p.inCurrent&&support&&p.drop<=0&&p.vy>=0&&p.y+p.h<=support.y+3){p.x=clamp(p.x,support.x,support.x+support.w-p.w);}
  const passages=exits(),leftOpen=passages.some(e=>e.dx===-1&&p.y>=e.y&&p.y+p.h<=e.y+e.h+1),rightOpen=passages.some(e=>e.dx===1&&p.y>=e.y&&p.y+p.h<=e.y+e.h+1);
  const bottom=passages.find(e=>e.dy===-1);
  if(crouch&&support===room.platforms[0]&&bottom){
    if(oldX+p.w<=bottom.x)p.x=Math.min(p.x,bottom.x-p.w);
    else if(oldX>=bottom.x+bottom.w)p.x=Math.max(p.x,bottom.x+bottom.w);
  }
  if(p.x<25&&!leftOpen){p.x=25;p.wall=canGripBoundary('left',p.y,p.h)?-1:0;p.vx=0;}if(p.x+p.w>room.w-25&&!rightOpen){p.x=room.w-25-p.w;p.wall=canGripBoundary('right',p.y,p.h)?1:0;p.vx=0;}
  for(const s of room.platforms){
    if(s.gone>0||s.type==='oneway'||s.type==='moving'||!overlap(p,s))continue;
    if(oldX+p.w<=s.x+1){p.x=s.x-p.w;p.wall=1;p.vx=0;}
    else if(oldX>=s.x+s.w-1){p.x=s.x+s.w;p.wall=-1;p.vx=0;}
  }
  // Keep contact when stationary, so S alone can hold a wall.
  if(p.x<=25.01&&!leftOpen&&canGripBoundary('left',p.y,p.h))p.wall=-1;
  else if(p.x+p.w>=room.w-25.01&&!rightOpen&&canGripBoundary('right',p.y,p.h))p.wall=1;
  for(const s of room.platforms){
    if(s.gone>0||s.type==='oneway'||s.type==='moving'||p.y+p.h<=s.y||p.y>=s.y+s.h)continue;
    if(Math.abs(p.x+p.w-s.x)<.1)p.wall=1;
    else if(Math.abs(p.x-s.x-s.w)<.1)p.wall=-1;
  }
  const beforeY=p.y;p.y+=p.vy*dt;p.ground=null;
  for(const s of room.platforms){
    if(s.gone>0||p.x+p.w<=s.x||p.x>=s.x+s.w)continue;
    if(s===room.platforms[0]&&bottom&&p.x>=bottom.x&&p.x+p.w<=bottom.x+bottom.w)continue;
    if(p.vy>=0&&beforeY+p.h<=s.y+Math.max(2,s.dy)&&p.y+p.h>=s.y&&!(p.drop>0&&(s.type==='oneway'||s.type==='moving'))){p.y=s.y-p.h;p.vy=0;p.ground=s;}
    else if(s.type!=='oneway'&&s.type!=='moving'&&p.vy<0&&beforeY>=s.y+s.h-1&&p.y<s.y+s.h){p.y=s.y+s.h;p.vy=0;}
  }
  // Openings are short physical tunnels. Keep the player inside their sides
  // until crossing the room boundary, even when steering or jumping mid-exit.
  const fits=(x,e)=>x>=e.x&&x+p.w<=e.x+e.w;
  if(p.y+p.h>room.floorY){
    if(bottom&&(fits(oldX,bottom)||fits(p.x,bottom))){
      const x=clamp(p.x,bottom.x,bottom.x+bottom.w-p.w);
      if(x!==p.x)p.vx=0;p.x=x;
    }else{
      p.y=room.floorY-p.h;p.vy=0;p.ground=room.platforms[0];
    }
  }
  const top=passages.find(e=>e.dy===1);
  if(p.y<15&&top&&(fits(oldX,top)||fits(p.x,top))){
    const x=clamp(p.x,top.x,top.x+top.w-p.w);
    if(x!==p.x)p.vx=0;p.x=x;
  }
  for(const e of passages){
    if((e.dx===-1&&p.x<25)||(e.dx===1&&p.x+p.w>room.w-25)){
      const y=clamp(p.y,e.y,e.y+e.h-p.h);
      if(y!==p.y)p.vy=0;p.y=y;
    }
  }
  if(!p.ground&&p.vy>=0&&p.ledgeCD<=0&&!down&&p.hitLock<=0){
    for(const s of room.platforms){
      if(s.gone>0||s.y>=room.floorY)continue;
      const side=p.x+p.w<=s.x+9&&p.x+p.w>=s.x-9?1:p.x>=s.x+s.w-9&&p.x<=s.x+s.w+9?-1:0;
      if(side&&direction===side&&p.y>=s.y-15&&p.y<=s.y+16){p.ledge={platform:s,side};p.vx=p.vy=0;break;}
    }
  }
  const topOpen=passages.some(e=>e.dy===1&&p.x>=e.x&&p.x+p.w<=e.x+e.w);
  if(p.y<15&&!topOpen){p.y=15;p.vy=Math.max(0,p.vy);}
  consumeAttack(down);
}
function crumbleParticles(s,count){
  room.debris??=[];
  for(let i=0;i<count;i++)room.debris.push({x:rand(s.x,s.x+s.w),y:s.y+rand(2,s.h),vx:rand(-65,65),vy:rand(-85,15),life:rand(.35,.8),size:pick([2,4]),shade:i%3});
  if(room.debris.length>160)room.debris.splice(0,room.debris.length-160);
}
function platformCracks(s){
  const signature=s.w+':'+s.h;
  if(s.crackShape===signature)return s.cracks;
  let seed=(Math.round(s.baseX*31+s.baseY*71+s.w*13)|0)>>>0;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const segments=[],count=Math.max(1,Math.floor(s.w/38));
  for(let i=0;i<count;i++){
    let x=clamp((i+.2+random()*.6)*s.w/count,4,s.w-6),y=0;
    const bends=2+Math.floor(random()*2);
    for(let j=1;j<=bends;j++){
      const nx=clamp(x+(random()-.5)*22,3,s.w-5),ny=s.h*j/bends-2;
      segments.push([x,y,nx,ny]);
      if(j<bends&&random()>.25)segments.push([nx,ny,clamp(nx+(random()>.5?1:-1)*(8+random()*12),3,s.w-4),clamp(ny+(random()-.5)*12,2,s.h-3)]);
      x=nx;y=ny;
    }
  }
  s.crackShape=signature;s.cracks=segments;return segments;
}
function drawDebris(){
  const t=mountainTheme(),colors=[t.rock,t.edge,t.shade];
  for(const p of room.debris||[])rect(Math.round(p.x/2)*2,Math.round(p.y/2)*2,p.size,p.size,colors[p.shade]);
}
function updatePlatforms(dt){
  room.debris??=[];
  for(const p of room.debris){p.life-=dt;p.vy+=420*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
  room.debris=room.debris.filter(p=>p.life>0);
  for(const s of room.platforms){s.dx=s.dy=0;
    if(s.type==='moving'){
      const cycle=(tick*62)%(s.trackLength*2),progress=cycle<=s.trackLength?cycle/s.trackLength:2-cycle/s.trackLength;
      const next=trackPoint(s,progress*2-1);s.dx=next.x-s.x;s.dy=next.y-s.y;s.x=next.x;s.y=next.y;
    }
    if(s.type==='break'){
      if(s.gone>0){s.gone-=dt;if(s.gone<=0&&overlap(player,s))s.gone=.1;continue;}
      if(player.ground===s){s.life+=dt;s.crumbleClock=(s.crumbleClock||0)+dt;if(s.crumbleClock>=.12){crumbleParticles(s,2);s.crumbleClock=0;}}
      else{s.life=Math.max(0,s.life-dt);s.crumbleClock=0;}
      if(s.life>=.75){crumbleParticles(s,18);s.life=0;s.gone=3;if(player.ground===s)player.ground=null;}
    }
  }
}
function createBoss(r){
  const spec=roomBossSpec(r);
  const b=enemy('boss',r.w*.66,r.floorY-80,r.platforms[0]);
  Object.assign(b,{boss:true,id:spec.family||spec.id,instanceId:spec.id,tier:spec.tier||0,tint:spec.tint||0,name:spec.name,sprite:spec.sprite,w:64,h:64,hp:spec.hp,max:spec.hp,phase:'idle',clock:0,guard:false,volley:false});
  if(b.id!=='warden')b.y=r.floorY-210;
  if(b.id==='echo'||b.id==='kiln'){b.x=r.w/2-32;b.y=r.floorY-150;b.homeY=b.y;}
  b.homeX=b.x;b.homeY=b.y;r.boss=b;r.enemies=[b];
}
function bossShot(x,y,vx,vy,kind='shard'){
  shots.push({x,y,w:kind==='wave'?22:12,h:kind==='wave'?12:12,vx,vy,life:5,hp:6,kind});
}
function bossShardBurst(b,angle,count,speed){
  for(let i=0;i<count;i++){const a=angle+(i-(count-1)/2)*.3;bossShot(b.x+b.w/2,b.y+b.h/2,Math.cos(a)*speed,Math.sin(a)*speed);}
}
function updateBossVariant(b,dt){
  if(b.id==='roc'){
    b.attackKind??='dive';
    if(b.phase==='idle'){
      b.sweepDir??=b.x>room.w/2?-1:1;
      const diving=b.attackKind==='dive';
      const x=diving?clamp(player.x+100,70,room.w-b.w-70):b.sweepDir>0?45:room.w-b.w-45;
      const y=clamp(player.y-(diving?180:0),90,room.floorY-b.h-35);
      b.x+=(x-b.x)*Math.min(1,dt*4);b.y+=(y-b.y)*Math.min(1,dt*4);
      if(b.clock>1.6){b.targetY=diving?player.y+player.h/2:b.y+b.h/2;b.targetX=diving?player.x+player.w/2:b.sweepDir>0?room.w-30:30;b.phase='warn';b.clock=0;}
    }else if(b.phase==='warn'&&b.clock>.8){
      b.phase=b.attackKind;b.clock=0;b.trailClock=0;
      if(b.phase==='dive'){const dx=b.targetX-b.x-b.w/2,dy=Math.max(40,b.targetY-b.y-b.h/2),length=Math.hypot(dx,dy);b.vx=dx/length*460;b.vy=dy/length*460;}
    }else if(b.phase==='dive'){
      b.x=clamp(b.x+b.vx*dt,30,room.w-b.w-30);b.y=Math.min(room.floorY-b.h,b.y+b.vy*dt);
      if(b.clock>.8||b.y>=room.floorY-b.h){b.phase='recover';b.clock=0;}
    }else if(b.phase==='sweep'){
      b.x+=b.sweepDir*480*dt;b.trailClock+=dt;
      if(b.trailClock>.22){b.trailClock=0;bossShot(b.x+b.w/2,b.y+b.h/2,0,0);shots.at(-1).life=2.2;}
      if(b.x<35||b.x+b.w>room.w-35){b.x=clamp(b.x,35,room.w-b.w-35);b.phase='recover';b.clock=0;b.sweepDir*=-1;}
    }else if(b.phase==='recover'&&b.clock>1.7){b.attackKind=b.attackKind==='dive'?'sweep':'dive';b.phase='idle';b.clock=0;}
  }else{
    b.y=b.homeY+Math.sin(tick*1.5)*14;
    if(b.phase==='idle'){
      b.satellites=[];const count=4+Math.min(2,b.tier-1);
      for(let i=0;i<count;i++){const shot={x:b.x,y:b.y,w:12,h:12,vx:0,vy:0,hp:6,life:30,orbit:b,angle:i*Math.PI*2/count};shots.push(shot);b.satellites.push(shot);}
      b.phase='orbit';b.guard=true;b.clock=0;b.coreVolley=0;b.coreEnraged=b.hp<=b.max/2;delete b.heartAim;
    }else if(b.phase==='orbit'||b.phase==='warn'){
      b.guard=true;
      const broken=b.satellites.every(s=>s.hp<=0||s.life<=0),shieldEnd=b.coreEnraged?3.6:2.9;
      if(broken||b.clock>=shieldEnd){
        for(const shot of b.satellites)shot.life=0;
        b.guard=false;b.phase='exposed';b.clock=0;b.exposure=broken?2.5:b.coreEnraged?1.1:1.4;delete b.heartAim;
      }else{
        const timings=b.coreEnraged?[.9,1.65,2.4,3.1]:[.9,1.65,2.4],next=timings[b.coreVolley];
        b.phase='orbit';
        if(next!==undefined&&b.clock>=next-.35){
          b.heartAim??=Math.atan2(player.y+player.h/2-b.y-b.h/2,player.x+player.w/2-b.x-b.w/2);b.phase='warn';
          if(b.clock>=next){bossShardBurst(b,b.heartAim,b.coreVolley>=2?7:5,b.coreEnraged?245:215);b.coreVolley++;delete b.heartAim;b.phase='orbit';}
        }
      }
    }else if(b.phase==='exposed'&&b.clock>b.exposure){b.phase='idle';b.clock=0;}
  }
}
function updateHeartDash(b,dt){
  b.dashWait??=rand(2.5,4);
  if(!b.dashPhase){
    b.dashWait-=dt;if(b.dashWait>0)return false;
    let target;
    for(let i=0;i<80;i++){
      const candidate={x:rand(65,room.w-b.w-65),y:rand(65,room.floorY-b.h-60),w:b.w,h:b.h};
      if(Math.hypot(candidate.x-b.x,candidate.y-b.y)<(i<40?230:96))continue;
      // Keep the endpoint and the entire dash clear of solid rock.
      let clear=true;
      for(let j=0;j<=12;j++){const t=j/12,body={x:b.x+(candidate.x-b.x)*t,y:b.y+(candidate.y-b.y)*t,w:b.w,h:b.h};if(room.platforms.some(s=>s.gone<=0&&(s.type==='solid'||s.type==='break')&&overlap(body,s))){clear=false;break;}}
      if(clear){target=candidate;break;}
    }
    if(!target){b.dashWait=.6;return false;}
    b.dashTarget=target;b.dashStart={x:b.x,y:b.y};b.dashPhase='warn';b.dashTime=0;
  }
  b.clock=Math.max(0,b.clock-dt);b.dashTime+=dt;
  if(b.dashPhase==='warn'){
    if(b.dashTime>=.45){b.dashPhase='move';b.dashTime=0;}
  }else{
    const t=clamp(b.dashTime/.38,0,1),ease=t*t*(3-2*t);
    b.x=b.dashStart.x+(b.dashTarget.x-b.dashStart.x)*ease;b.y=b.dashStart.y+(b.dashTarget.y-b.dashStart.y)*ease;
    if(t===1){b.homeX=b.x;b.homeY=b.y-Math.sin(tick*1.5)*14;b.dashPhase=null;b.dashWait=rand(2.5,4);}
  }
  return true;
}
function updateInteriorBoss(b,dt){
  const final=b.id==='kiln',enraged=final&&b.hp<=b.max/2;
  if(b.phase==='idle'){
    b.guard=false;b.y=b.homeY+Math.sin(tick*2)*8;
    if(b.clock>1.2){
      b.phase='warn';b.clock=0;b.guard=true;b.pulses=0;
      b.gap=Math.atan2(player.y-b.y,player.x-b.x);
      b.eruptions=final?[-180,0,180].map(dx=>clamp(player.x+player.w/2+dx,55,room.w-55)):[];
    }
  }else if(b.phase==='warn'&&b.clock>.85){b.phase='pulse';b.clock=0;b.nextPulse=0;}
  else if(b.phase==='pulse'){
    if(b.clock>=b.nextPulse){
      if(final){
        // Eruptions are marked before activation; lateral movement avoids them.
        if(b.pulses===0)for(const x of b.eruptions)for(let j=0;j<3;j++)bossShot(x-6,room.floorY-16-j*26,0,-310);
        if(b.pulses%2===0)bossShardBurst(b,Math.atan2(player.y-b.y,player.x-b.x),enraged?5:3,enraged?265:220);
        else for(let i=0;i<8;i++){const a=i*Math.PI/4+b.pulses*.32;bossShot(b.x+32,b.y+32,Math.cos(a)*185,Math.sin(a)*185);}
      }else{
        for(let i=0;i<16;i++){const a=i*Math.PI/8,delta=Math.atan2(Math.sin(a-b.gap),Math.cos(a-b.gap));if(Math.abs(delta)<.6)continue;bossShot(b.x+32,b.y+32,Math.cos(a)*170,Math.sin(a)*170);}
        b.gap+=Math.PI/4;
      }
      b.pulses++;b.nextPulse+=enraged?.48:.7;
      if(b.pulses>=(final?(enraged?6:4):3)){b.phase='recover';b.clock=0;b.guard=false;b.eruptions=[];}
    }
  }else if(b.phase==='recover'&&b.clock>(enraged?1.5:2.2)){b.phase='idle';b.clock=0;}
}
function updateBoss(b,dt){
  if(b.id==='echo'||b.id==='kiln'){updateInteriorBoss(b,dt);return;}
  if(b.id==='heart'&&updateHeartDash(b,dt))return;
  if(b.tier&&b.id!=='warden'){updateBossVariant(b,dt);return;}
  if(b.id==='warden'){
    if(b.support?.gone>0&&b.phase!=='jump'){b.phase='jump';b.vy=0;b.vx=0;b.clock=0;}
    if(b.phase==='rockfall'){
      if(b.clock>.9){for(const mark of b.rockTargets)bossShot(mark.x-6,mark.y,0,315);b.guard=false;b.phase='recover';b.clock=0;}return;
    }
    if(b.phase==='idle'){
      b.guard=false;
      const support=b.support||room.platforms[0];
      b.x=clamp(b.x+Math.sign(player.x-b.x)*45*dt,support.x,support.x+support.w-b.w);b.y=support.y-b.h;
      if(b.clock>1.3){
        const candidates=room.platforms.filter(s=>s!==support&&s.w>=b.w+12&&s.gone<=0&&!s.verticalWall&&s.y>=support.y-210&&Math.abs(s.x+s.w/2-b.x-b.w/2)<440);
        candidates.sort((a,c)=>Math.abs(a.y-player.y-player.h)+Math.abs(a.x+a.w/2-player.x)*.25-(Math.abs(c.y-player.y-player.h)+Math.abs(c.x+c.w/2-player.x)*.25));
        b.targetSupport=candidates[0]||support;
        b.targetX=clamp(player.x,b.targetSupport.x,b.targetSupport.x+b.targetSupport.w-b.w);b.targetY=b.targetSupport.y-b.h;
        const left=b.targetSupport.x-b.w-12,right=b.targetSupport.x+b.targetSupport.w+12;
        b.launchX=clamp(Math.abs(b.x-left)<Math.abs(b.x-right)?left:right,support.x,support.x+support.w-b.w);
        b.phase='approach';b.clock=0;
      }
    }else if(b.phase==='approach'){
      const delta=b.launchX-b.x;b.x+=Math.sign(delta)*Math.min(Math.abs(delta),160*dt);b.y=b.support.y-b.h;
      if(Math.abs(delta)<2){b.phase='warn';b.clock=0;}
    }else if(b.phase==='warn'&&b.clock>.7){
      const duration=1.1;b.vx=(b.targetX-b.x)/duration;b.vy=(b.targetY-b.y-500*duration*duration)/duration;b.phase='jump';b.clock=0;
    }else if(b.phase==='jump'){
      const oldX=b.x,oldY=b.y;b.vy+=1000*dt;
      if(b.y+b.h<=b.targetSupport.y+1||b.targetSupport===b.support){const dx=b.targetX-b.x;b.x+=Math.sign(dx)*Math.min(Math.abs(dx),400*dt);}
      b.x=clamp(b.x,25,room.w-b.w-25);b.y+=b.vy*dt;
      for(const s of room.platforms){
        if(s.gone>0)continue;
        if(b.x+b.w>s.x&&b.x<s.x+s.w&&b.vy>=0&&oldY+b.h<=s.y+2&&b.y+b.h>=s.y){
          b.y=s.y-b.h;b.support=s;b.vx=b.vy=0;b.phase='recover';b.clock=0;
          bossShot(b.x-24,s.y-14,-280,0,'wave');bossShot(b.x+b.w+2,s.y-14,280,0,'wave');if(b.tier){b.rockTargets=[-100,0,100].map(offset=>({x:clamp(player.x+13+offset,40,room.w-40),y:Math.max(45,player.y-200)}));b.phase='rockfall';b.clock=0;b.guard=true;}break;
        }
        if(s.type==='solid'||s.type==='break'){
          if(overlap(b,s)){
            if(oldY>=s.y+s.h&&b.vy<0){b.y=s.y+s.h;b.vy=0;}
            else if(oldX+b.w<=s.x){b.x=s.x-b.w;b.vx=0;}
            else if(oldX>=s.x+s.w){b.x=s.x+s.w;b.vx=0;}
          }
        }
      }
    }else if(b.phase==='recover'&&b.clock>1.4){b.phase='idle';b.clock=0;}
  }else if(b.id==='roc'){
    if(b.phase==='idle'){
      b.x+=(clamp(player.x+100,70,room.w-b.w-70)-b.x)*dt;
      b.y+=(clamp(player.y-180,90,room.floorY-210)-b.y)*dt*1.7;
      if(b.clock>1.5){b.phase='warn';b.clock=0;b.targetX=player.x+player.w/2;b.targetY=player.y+player.h/2;}
    }else if(b.phase==='warn'&&b.clock>.65){
      const dx=b.targetX-b.x-b.w/2,dy=Math.max(40,b.targetY-b.y-b.h/2),length=Math.hypot(dx,dy);
      b.vx=dx/length*460;b.vy=dy/length*460;b.phase='dive';b.clock=0;
    }else if(b.phase==='dive'){
      b.x=clamp(b.x+b.vx*dt,30,room.w-b.w-30);b.y=Math.min(room.floorY-b.h,b.y+b.vy*dt);
      if(b.clock>.8||b.y>=room.floorY-b.h){if(b.tier)bossShardBurst(b,Math.atan2(player.y-b.y,player.x-b.x),4+Math.min(b.tier,4),175+b.tier*10);b.phase='recover';b.clock=0;}
    }else if(b.phase==='recover'&&b.clock>1.5){b.phase='idle';b.clock=0;}
  }else{
    b.y=b.homeY+Math.sin(tick*1.5)*14;
    // Commit the harder phase at a cycle boundary, never midway through a tell.
    b.heartEnraged??=b.hp<=b.max/2;b.heartVolley??=0;
    const timings=b.heartEnraged?[.9,1.65,2.4,3.1]:[.9,1.65,2.4];
    const shieldEnd=b.heartEnraged?3.6:2.9,cycleEnd=shieldEnd+(b.heartEnraged?1.1:1.4);
    b.guard=b.clock<shieldEnd;b.phase=b.guard?'shield':'exposed';
    const next=timings[b.heartVolley];
    if(next!==undefined&&b.clock>=next-.35){
      if(b.heartAim===undefined)b.heartAim=Math.atan2(player.y+player.h/2-b.y-b.h/2,player.x+player.w/2-b.x-b.w/2);
      b.phase='warn';
      if(b.clock>=next){
        const count=b.heartVolley>=2?7:5,speed=b.heartEnraged?245:215;
        bossShardBurst(b,b.heartAim,count,speed);
        b.heartVolley++;delete b.heartAim;b.phase='shield';
      }
    }
    if(b.clock>=cycleEnd){b.clock=0;b.heartVolley=0;delete b.heartAim;b.heartEnraged=b.hp<=b.max/2;}

  }
}
function inDiveCone(e,p=player){
  const dx=p.x+p.w/2-(e.x+e.w/2),dy=p.y+p.h/2-(e.y+e.h/2);
  return dy>28&&dy<=370&&Math.abs(dx)<=dy*.65;
}
function updateCrawler(e,dt){
  const s=e.support,across=s.w+e.w,down=s.h+e.h,total=2*(across+down);
  // Expanded corners keep the body outside the rock throughout each turn.
  e.crawlDistance??=clamp(e.x-s.x+e.w,0,across);
  e.crawlDistance=((e.crawlDistance+e.vx*dt)%total+total)%total;
  let d=e.crawlDistance;
  if(d<across){e.x=s.x-e.w+d;e.y=s.y-e.h;e.crawlAngle=0;}
  else if((d-=across)<down){e.x=s.x+s.w;e.y=s.y-e.h+d;e.crawlAngle=Math.PI/2;}
  else if((d-=down)<across){e.x=s.x+s.w-d;e.y=s.y+s.h;e.crawlAngle=Math.PI;}
  else{d-=across;e.x=s.x-e.w;e.y=s.y+s.h-d;e.crawlAngle=-Math.PI/2;}
}
function updateEnemies(dt){
  const p=player;
  for(const e of room.enemies){
    if(e.hp<=0)continue;e.clock+=dt;e.flightTime=(e.flightTime||0)+dt;e.recoil=Math.max(0,(e.recoil||0)-dt);e.flash=Math.max(0,e.flash-dt);
    if(e.boss)updateBoss(e,dt);
    else if(e.type==='crawler')updateCrawler(e,dt);
    else if(e.type==='air'){e.x=e.homeX+Math.sin(e.flightTime*.8)*38;e.y=e.homeY+Math.sin(e.flightTime*2)*15;}
    else if(e.type==='dive'){
      if(e.phase==='idle'){e.y=e.homeY+Math.sin(e.flightTime*2)*5;if(inDiveCone(e)){e.phase='warn';e.clock=0;}}
      else if(e.phase==='warn'){
        if(!inDiveCone(e)){e.phase='idle';e.clock=0;}
        else if(e.clock>.48){
          const dx=p.x+p.w/2-e.x-e.w/2,dy=p.y+p.h/2-e.y-e.h/2,len=Math.hypot(dx,dy)||1;
          e.phase='dive';e.clock=0;e.vx=dx/len*390;e.vy=dy/len*390;
        }
      }
      else if(e.phase==='dive'){e.x=clamp(e.x+e.vx*dt,26,room.w-e.w-26);e.y+=e.vy*dt;if(e.clock>.72||e.y>room.floorY-e.h-5){e.phase='return';e.clock=0;e.returnX=e.x;e.returnY=e.y;}}
      else if(e.phase==='return'){const t=clamp(e.clock/.9,0,1),ease=t*t*(3-2*t),idleY=e.homeY+Math.sin(e.flightTime*2)*5;e.x=e.returnX+(e.homeX-e.returnX)*ease;e.y=e.returnY+(idleY-e.returnY)*ease;if(t===1){e.phase='idle';e.clock=0;}}
    }
    if((e.type==='ground'||e.type==='air')&&e.clock>2.2){
      const dx=p.x+p.w/2-e.x-e.w/2,dy=p.y+p.h/2-e.y-e.h/2,distance=Math.hypot(dx,dy);
      if(distance<=e.range){
        e.clock=0;e.recoil=.25;const len=distance||1;
        shots.push({x:e.x+e.w/2,y:e.y+e.h/2,w:9,h:9,vx:dx/len*190,vy:dy/len*190,life:5,hp:6});
      }
    }
    if(attack&&attack.time>0&&!attack.hit.has(e)&&overlap(attackBox(),e)){
      attack.hit.add(e);e.flash=.13;
      if(!e.guard){const damage=playerDamage();e.hp-=damage;numbers.push({x:e.x+e.w/2,y:e.y-10,text:String(damage),life:.7});}
      if(e.boss&&e.hp<=0){shots=[];$('room-note').textContent='BOSS DEFEATED · UPPER PASS OPEN';}
      if(attack.dir==='down'&&!p.ground){p.vy=-500;p.ledge=null;}
    }
    if(e.hp>0&&overlap(p,e))damage(e);
  }
  for(const s of shots){
    if(s.orbit){s.angle+=dt*1.4;s.x=s.orbit.x+s.orbit.w/2+Math.cos(s.angle)*76-s.w/2;s.y=s.orbit.y+s.orbit.h/2+Math.sin(s.angle)*76-s.h/2;}
    else{s.x+=s.vx*dt;s.y+=s.vy*dt;}s.life-=dt;
    // Each swing damages a projectile once. Surviving shots remain dangerous.
    if(s.life>0&&attack&&attack.time>0&&!attack.hit.has(s)&&overlap(attackBox(),s)){
      s.hp-=playerDamage();attack.hit.add(s);
      if(attack.dir==='down'&&!p.ground){
        p.vy=-500;p.ledge=null;
        // Separate from the shot so a successful pogo cannot also hit the body.
        p.y=Math.min(p.y,s.y-p.h);
      }
      if(s.hp<=0){s.life=0;continue;}
    }
    if(overlap(p,s)){damage(s);s.life=0;}
    if(room.platforms.some(b=>b.gone<=0&&b.type!=='oneway'&&b.type!=='moving'&&overlap(s,b)))s.life=0;
  }
  shots=shots.filter(s=>s.life>0);
}
// Reserved for future item definitions; no placeholder item is awarded.
const BOSS_ITEM_POOL=[];
function updateRoomHearts(dt){
  if(mode!=='playing')return;
  if(!room.clearRewarded&&room.enemies.length>0&&room.enemies.every(e=>e.hp<=0)){
    room.clearRewarded=true;
    // Rest on a permanent reachable surface, away from the floor passage.
    const spots=room.platforms.filter(s=>!s.verticalWall&&s.w>=48&&(s.type==='solid'||s.type==='oneway')).map(s=>({
      x:s===room.platforms[0]?room.spawnX:clamp(player.x, s.x+8,s.x+s.w-42),y:s.y-30
    }));
    spots.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y));
    if(room.boss){
      for(let i=0;i<3;i++)room.hearts.push({...spots[Math.min(i,spots.length-1)],w:34,h:26,value:2,delay:.3});
      room.bossItemReward=BOSS_ITEM_POOL.length?pick(BOSS_ITEM_POOL):null;
      if(floor===RUN_FLOORS){transition=null;attack=null;keys.clear();setMode('won');}
    }else room.hearts.push({...spots[0],w:34,h:26,value:pick([1,2,4]),delay:.3});
  }
  for(const heart of room.hearts){
    heart.delay=Math.max(0,heart.delay-dt);
    if(heart.delay===0&&player.hp<10&&overlap(player,heart)){
      player.hp=Math.min(10,player.hp+heart.value);heart.collected=true;updateHearts();
    }
  }
  room.hearts=room.hearts.filter(h=>!h.collected);
}
function exits(includeLocked=false){
  const list=[];
  if(room.links.left)list.push({...room.doors.left,dx:-1,dy:0,from:'right'});
  if(room.links.right)list.push({...room.doors.right,dx:1,dy:0,from:'left'});
  if(room.links.up)list.push({x:room.topX-29,y:0,w:100,h:15,dx:0,dy:1,from:'bottom'});
  if(room.links.down)list.push({x:room.bottomX-29,y:room.floorY,w:100,h:40,dx:0,dy:-1,from:'top'});
  if(room.type==='finish')list.push({x:room.topX-29,y:0,w:100,h:15,dx:0,dy:1,finish:true});
  const locked=!!room.boss&&room.boss.hp>0;
  return locked?(includeLocked?list.map(e=>({...e,locked:true})):[]):list;
}
function beginTransition(exit){transition={exit,time:0,switched:false};attack=null;jumpQueued=attackQueued=false;}
function update(dt){
  if(transition){
    transition.time+=dt;
    if(!transition.switched&&transition.time>=.22){
      const e=transition.exit;
      if(e.finish){if(floor>=RUN_FLOORS){transition=null;setMode('won');return;}floor++;enterRoom(buildFloor());}else enterRoom(room.links[e.dx<0?'left':e.dx>0?'right':e.dy>0?'up':'down'],e.from);
      transition.switched=true;
    }
    if(transition.time>=.44){transition=null;jumpQueued=attackQueued=false;}
    return;
  }
  tick+=dt;exitLock-=dt;updatePlatforms(dt);updatePlayer(dt);updateEnemies(dt);updateRoomHearts(dt);
  if(attack){attack.time-=dt;if(attack.time<=0)attack=null;}
  for(const n of numbers){n.y-=dt*45;n.life-=dt;}numbers=numbers.filter(n=>n.life>0);
  // Cross the physical room boundary; approaching a passage is not enough.
  if(mode==='playing')for(const e of exits()){
    const crossed=e.dx===-1?player.x+player.w/2<0:e.dx===1?player.x+player.w/2>room.w:e.dy===1?player.y+player.h/2<0:player.y+player.h/2>room.h;
    const aligned=devFlight|| (e.dx?player.y>=e.y&&player.y+player.h<=e.y+e.h+1:player.x>=e.x&&player.x+player.w<=e.x+e.w);
    if(crossed&&aligned){beginTransition(e);break;}
  }
}
function rect(x,y,w,h,color){if(w<=0||h<=0)return;ctx.fillStyle=color;const grid=ctx===sceneryCtx?2:1;ctx.fillRect(Math.round(x/grid)*grid,Math.round(y/grid)*grid,Math.max(grid,Math.round(w/grid)*grid),Math.max(grid,Math.round(h/grid)*grid));}
function line(x1,y1,x2,y2,color,width=1){
  const grid=ctx===sceneryCtx?2:1,steps=Math.ceil(Math.max(Math.abs(x2-x1),Math.abs(y2-y1))/grid);
  for(let i=0;i<=steps;i++){const t=steps?i/steps:0;rect(x1+(x2-x1)*t,y1+(y2-y1)*t,Math.max(grid,width),Math.max(grid,width),color);}
}
function text(t,x,y,size=12,color='#a6b59c',align='left'){ctx.font=`${size}px monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(t,x,y);ctx.textAlign='left';}
function polygon(points,color){
  // Fill a four-pixel grid directly: no antialiased vector edges.
  const grid=ctx===sceneryCtx?4:1,viewY=ctx===sceneryCtx?camera.y:0,min=Math.floor(Math.max(Math.min(...points.map(p=>p[1])),viewY-4)/grid)*grid,max=Math.min(Math.max(...points.map(p=>p[1])),viewY+H+4);
  for(let y=min;y<max;y+=grid){const crossings=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length],scan=y+grid/2;if((a[1]<=scan&&b[1]>scan)||(b[1]<=scan&&a[1]>scan))crossings.push(a[0]+(scan-a[1])*(b[0]-a[0])/(b[1]-a[1]));}crossings.sort((a,b)=>a-b);for(let i=0;i+1<crossings.length;i+=2){const x=Math.round(crossings[i]/grid)*grid,end=Math.round(crossings[i+1]/grid)*grid;if(end>x)rect(x,y,end-x,grid,color);}}
}
function drawBackground(){
  const t=mountainTheme(),width=room.w,height=room.h,bottom=room.floorY;
  const blend=(amount)=>{
    if(!/^#[0-9a-f]{6}$/i.test(t.sky)||!/^#[0-9a-f]{6}$/i.test(t.horizon))return amount<.3?t.sky:t.far;
    const parts=[1,3,5].map(i=>Math.round(parseInt(t.sky.slice(i,i+2),16)*(1-amount)+parseInt(t.horizon.slice(i,i+2),16)*amount));
    return `rgb(${parts.join(',')})`;
  };
  rect(0,0,width,height,t.sky);
  for(let band=1;band<=5;band++){
    const y=Math.round((camera.y+band*120)/4)*4,color=blend(band*.1);
    rect(0,y,width,height,color);
    for(let row=0;row<4;row++)for(let x=0;x<width;x+=8)if((x/8+row)%4<=row)rect(x,y-16+row*4,4,4,color);
  }
  if(t.cave){
    for(let layer=0;layer<3;layer++)for(let i=0;i<Math.ceil(width/120)+1;i++){
      const x=i*120+layer*34,color=layer===0?t.far:t.near,depth=80+(i*73+layer*41)%220;
      polygon([[x-70,0],[x+60,0],[x+20,depth],[x,depth-35]],color);
      polygon([[x-65,height],[x+65,height],[x+10,height-depth-45]],color);
      rect(x+12,height-depth+20,8,28,i%3===0?'#c17b65':'#654650');
    }
  }else{
  // Distant ridgelines move less than the climb, giving depth to the mountain.
  const baseline=Math.min(bottom-20,camera.y+H*.85);
  const sunX=Math.round(width*.73/4)*4,sunY=Math.round((camera.y+110)/4)*4;
  polygon(Array.from({length:16},(_,i)=>[sunX+Math.cos(i*Math.PI/8)*36,sunY+Math.sin(i*Math.PI/8)*36]),'#adb48a');
  rect(sunX-12,sunY-20,12,8,'#c8c69b');rect(sunX+8,sunY+8,16,8,'#969f78');
  for(let layer=0;layer<3;layer++){
    const color=layer===0?t.far:layer===1?t.near:t.shade;
    const shift=camera.x*(.15+layer*.12),span=layer===0?430:330;
    for(let i=-1;i<Math.ceil(width/span)+2;i++){
      const x=i*span+shift,peakY=baseline-230-layer*22-Math.sin(i*2.7+floor)*75;
      polygon([[x-80,height],[x-80,baseline+120],[x+span*.46,peakY],[x+span+90,baseline+155],[x+span+90,height]],color);
      if(layer<2){
        polygon([[x+span*.46,peakY],[x+span*.68,peakY+93],[x+span*.5,peakY+68],[x+span*.42,peakY+91],[x+span*.29,peakY+77]],t.snow?'#b7cbd2':'#93a99c');
        polygon([[x+span*.46,peakY],[x+span*.54,peakY+120],[x+span+90,baseline+155]],layer===0?t.near:t.shade);
      }
    }
  }
  if(t.trees)for(let i=0;i<Math.ceil(width/70);i++){
    const x=i*73+Math.sin(i*4)*20,y=baseline+5+Math.sin(i*3)*20,h=45+(i%4)*20;
    rect(x-2,y-h,4,h+20,t.shade);
    polygon([[x,y-h-20],[x-22,y-18],[x-12,y-21],[x-30,y+5],[x+30,y+5],[x+12,y-21],[x+22,y-18]],t.shade);
  }
  }
  // Low-contrast mountain haze leaves foreground ledges easy to read.
  ctx.globalAlpha=1;
  rect(0,0,24,bottom,'rgba(13,24,30,.3)');rect(width-24,0,24,bottom,'rgba(13,24,30,.3)');rect(0,0,width,15,t.rock);
  for(const side of ['left','right'])for(const patch of room.wallGrips?.[side]||[]){
    const x=side==='left'?0:width-24;rect(x,patch.y,24,patch.h,t.rock);
    for(let y=patch.y;y<patch.y+patch.h;y+=32){polygon([[x,y],[x+24,y+10],[x+16,y+31],[x,y+27]],t.shade);line(x+3,y+5,x+19,y+13,t.edge);}
  }
  for(let i=0;i<(t.snow?65:18);i++){
    const x=(i*173+tick*(t.snow?16:5))%width,y=(i*83+tick*(t.snow?30:6))%height;
    ctx.globalAlpha=t.snow?.48:.2;rect(x,y,t.snow?3:2,2,t.edge);
  }ctx.globalAlpha=1;
}
function drawMidground(){
  const t=mountainTheme();
  // Recessed rock buttresses share the ledges' positions but never collide.
  // Muted, unlined faces distinguish them from playable surfaces.
  for(const s of room.platforms.slice(1)){
    if(s.type==='moving'||s.type==='break'||s.verticalWall)continue;
    const x=s.x+8,w=Math.max(16,s.w-16),y=s.y+s.h;
    const foot=room.floorY;
    ctx.globalAlpha=1;
    polygon([[x,y],[x+w,y],[x+w-10,y+36],[x+w+24,foot-48],[x+w+42,foot],[x-32,foot],[x-12,foot-48],[x+12,y+50]],t.near);
    polygon([[x+w*.6,y],[x+w,y],[x+w+24,foot-48],[x+w+42,foot],[x+w*.45,foot],[x+w*.65,y+64]],t.shade);
    ctx.globalAlpha=1;
  }
  // Uneven talus at the bottom connects the recessed pillars into the slope.
  ctx.globalAlpha=1;
  for(let x=20;x<room.w-20;x+=72){const h=18+Math.abs(Math.sin(x*1.7+room.x))*36;polygon([[x-15,room.floorY],[x+6,room.floorY-h],[x+30,room.floorY-h-8],[x+71,room.floorY]],t.near);}
  ctx.globalAlpha=1;
}
function drawWaterfalls(){
  const water=riverZones(room);if(!water)return;
  const {river,fall,pool}=water;
  ctx.globalAlpha=.78;
  rect(river.x,river.y,river.w,river.h,'#467d91');
  rect(fall.x,fall.y,fall.w,fall.h,'#467d91');
  rect(pool.x,pool.y,pool.w,pool.h,'#467d91');
  ctx.globalAlpha=1;
  rect(river.x,river.y,river.w,4,'#a9dad5');
  rect(fall.x,fall.y,8,fall.h,'#78b6be');
  for(let i=0;i<20;i++){
    const x=river.x+((i*53+tick*220*water.direction)%river.w+river.w)%river.w;
    rect(Math.floor(x/4)*4,river.y+8+(i%3)*4,12,4,'#8ccbd0');
    const y=fall.y+(i*37+tick*210)%fall.h;
    rect(fall.x+8+(i%3)*4,Math.floor(y/4)*4,4,16,'#b9dcce');
  }
  for(let i=0;i<7;i++)rect(pool.x+i*12,pool.y-Math.floor((Math.sin(tick*7+i)*.5+.5)*3)*4,8,4,'#b9dcce');
}
function drawPlatforms(){
  const t=mountainTheme();
  for(const original of room.platforms){
    const s={...original,x:Math.round(original.x/4)*4,y:Math.round(original.y/4)*4};
    if(s.type==='moving'){
      ctx.strokeStyle=t.edge;ctx.globalAlpha=.55;ctx.lineWidth=2;ctx.beginPath();
      s.trackNodes.forEach((p,i)=>{if(i===0)ctx.moveTo(p.x+s.w/2,p.y+5);else ctx.lineTo(p.x+s.w/2,p.y+5);});
      ctx.stroke();ctx.globalAlpha=1;
      for(const p of s.trackNodes)rect(p.x+s.w/2-2,p.y+3,4,4,t.edge);
      for(const u of [-1,1]){const p=trackPoint(s,u);rect(p.x+s.w/2-3,p.y+2,6,6,t.edge);}
    }
    if(s.gone>0){ctx.globalAlpha=.18;line(s.x,s.y,s.x+s.w,s.y,'#b1bc75',2);ctx.globalAlpha=1;continue;}
    if(s.type==='oneway'||s.type==='moving'){
      rect(s.x,s.y,s.w,4,t.edge);
      polygon([[s.x,s.y+4],[s.x+s.w,s.y+4],[s.x+s.w-8,s.y+10],[s.x+s.w*.65,s.y+8],[s.x+s.w*.4,s.y+12],[s.x+5,s.y+9]],s.type==='moving'?'#937456':t.rock);
      if(s.type==='moving')for(let x=s.x+8;x<s.x+s.w;x+=23)line(x,s.y+4,x,s.y+10,'#473b32',2);
    }else{
      rect(s.x,s.y,s.w,s.h,t.rock);rect(s.x,s.y,s.w,4,t.edge);
      for(let y=s.y+8;y<s.y+s.h-3;y+=16)for(let x=s.x+4;x<s.x+s.w-8;x+=24){
        const variant=(Math.floor(x/24)+Math.floor(y/16))%3;
        rect(x+variant*2,y,Math.min(12,s.x+s.w-x-4),4,t.shade);
        if(variant===1)rect(x+4,y+4,4,Math.min(6,s.y+s.h-y-4),t.shade);
      }
      for(let x=s.x+8;x<s.x+s.w-8;x+=32){rect(x,s.y+4,8,2,t.edge);}

    }
    if(t.snow){rect(s.x,s.y,s.w,3,'#ecf4f1');for(let x=s.x+9;x<s.x+s.w-8;x+=49)polygon([[x,s.y+3],[x+7,s.y+3],[x+3,s.y+8]],'#c4dce3');}
    if(s.type==='break'){
      const edge=s.life>0?'#ffe0a0':'#dfd3aa',ink='#172326';
      ctx.save();ctx.beginPath();ctx.rect(s.x,s.y,s.w,s.h);ctx.clip();
      for(const [a,b,c,d]of platformCracks(original)){
        line(s.x+a+2,s.y+b,s.x+c+2,s.y+d,edge,4);
        line(s.x+a,s.y+b,s.x+c,s.y+d,ink,s.life>.4?4:2);
      }
      ctx.restore();
      if(s.life>0)rect(s.x,s.y-5,s.w*(1-s.life/.75),3,'#ffd78a');
    }
  }
}
function roomMarker(r){return r?.bossId?'boss':r?.type==='item'?'item':r?.type==='shop'?'shop':null;}
function drawRoomMarker(kind,x,y,size){
  const color=kind==='boss'?'#efa17d':kind==='item'?'#e8d887':'#9fdbc5';
  if(kind==='boss'){
    rect(x-size*.4,y-size*.4,size*.8,size*.6,color);rect(x-size*.25,y+size*.2,size*.5,size*.2,color);
    rect(x-size*.25,y-size*.2,size*.16,size*.17,'#25302e');rect(x+size*.09,y-size*.2,size*.16,size*.17,'#25302e');
  }else if(kind==='item')polygon([[x,y-size*.5],[x+size*.4,y],[x,y+size*.5],[x-size*.4,y]],color);
  else text('$',x,y+size*.35,size,color,'center');
}
function drawDoors(){
  const t=mountainTheme();
  for(const e of exits(true)){
    rect(e.x,e.y,e.w,e.h,'#0b1412');
    if(e.dx){
      rect(e.x,e.y-8,e.w,8,t.edge);
      line(e.dx<0?e.x+e.w:e.x,e.y,e.dx<0?e.x+e.w:e.x,e.y+e.h,'#1b2b21',3);
    }else{
      rect(e.x-6,e.y,6,e.h,t.edge);rect(e.x+e.w,e.y,6,e.h,t.edge);
      if(e.finish&&!e.locked)text(floor===6?'INTO THE MOUNTAIN':floor>=7?'DEEPER PASS':'HIGHER TRAIL',e.x+e.w/2,45,10,'#a7bd85','center');
    }
    const next=e.finish?null:room.links[e.dx<0?'left':e.dx>0?'right':e.dy>0?'up':'down'];
    const mark=roomMarker(next);
    const mx=e.dx<0?46:e.dx>0?room.w-46:e.x+e.w/2,my=e.dx?e.y+e.h/2:e.dy>0?40:room.floorY-27;
    if(mark)drawRoomMarker(mark,mx,my,20);
    if(e.locked){
      rect(e.x,e.y,e.w,e.h,'#51443e');
      for(let y=e.y+6;y<e.y+e.h;y+=14)line(e.x,y,e.x+e.w,y,'#bf8a65',3);
      drawRoomMarker('boss',mx,my,20);
    }
  }
}
function enemyPose(e){
  if(e.dashPhase)return e.dashPhase==='warn'?'warn':'attack';
  if(e.type==='ground')return e.recoil>0?'attack':e.clock>1.8?'warn':'idle';
  if(e.phase==='exposed')return 'exposed';
  if(e.phase==='warn'||e.phase==='rockfall')return 'warn';
  if(['dive','sweep','jump','slam'].includes(e.phase))return 'attack';
  if(['recover','return'].includes(e.phase))return 'recover';
  return e.phase==='approach'?'walk':'idle';
}
function drawEnemies(){
  for(const e of room.enemies){if(e.hp<=0)continue;
    const flying=e.type==='air'||e.type==='dive'||e.id==='roc';
    const size=e.boss?64:32,frame=Math.floor((e.flightTime??tick)*(flying?9:6))%6,pose=enemyPose(e);
    if(e.dashPhase==='warn'){line(e.x+e.w/2,e.y+e.h/2,e.dashTarget.x+e.w/2,e.dashTarget.y+e.h/2,'#87cbd7',2);rect(e.dashTarget.x+e.w/2-4,e.dashTarget.y+e.h/2-4,8,8,'#e2f5f3');}
    if(e.guard){ctx.strokeStyle='#a2dbef';ctx.lineWidth=3;ctx.strokeRect(e.x-7,e.y-7,e.w+14,e.h+14);}
    if(e.type==='crawler'){
      ctx.save();ctx.translate(Math.round((e.x+e.w/2)/4)*4,Math.round((e.y+e.h/2)/4)*4);ctx.rotate(e.crawlAngle||0);
      drawSprite('crawler',-size/2,-size/2,size,size,frame,e.vx<0,e.flash>0,0,pose);ctx.restore();
    }else drawSprite(e.sprite||e.type,e.x+e.w/2-size/2,e.y+e.h-size,size,size,frame,e.type==='ground'&&player.x<e.x,e.flash>0,e.tint||0,pose);
    rect(e.x-2,e.y-13,e.boss?68:32,3,'#3a3830');rect(e.x-2,e.y-13,(e.boss?68:32)*e.hp/e.max,3,'#d5ad84');
    if(e.phase==='warn'||e.phase==='rockfall'){
      if(e.boss&&e.id==='heart'&&e.heartAim!==undefined){const x=e.x+e.w/2,y=e.y+e.h/2;line(x,y,x+Math.cos(e.heartAim)*105,y+Math.sin(e.heartAim)*105,'#e9cb87',3);}
      if(e.boss&&e.id==='roc')line(e.x+e.w/2,e.y+e.h/2,e.targetX,e.targetY,'#e7b371',2);
      if(e.boss&&e.id==='kiln')for(const x of e.eruptions||[]){line(x,room.floorY-260,x,room.floorY,'#ffad69',4);text('!',x,room.floorY-270,18,'#ffe0a0','center');}
      if(e.boss&&e.id==='echo'){const x=e.x+32,y=e.y+32;line(x,y,x+Math.cos(e.gap)*105,y+Math.sin(e.gap)*105,'#a7e4df',4);}
      if(e.boss&&e.id==='warden'){if(e.phase==='rockfall'){for(const mark of e.rockTargets){line(mark.x,mark.y,mark.x,Math.min(room.floorY,mark.y+200),'#bd956c',2);text('!',mark.x,mark.y-8,18,'#ffd598','center');}}else line(e.targetX,e.targetY+e.h-3,e.targetX+e.w,e.targetY+e.h-3,'#f0a768',4);}
      text('!',e.x+14,e.y-23,22,'#f1c797','center');
      const cx=e.x+e.w/2,cy=e.y+e.h/2;
      if(!e.boss){ctx.strokeStyle='rgba(190,137,83,.45)';ctx.setLineDash([4,8]);ctx.beginPath();ctx.moveTo(cx-370*.65,cy+370);ctx.lineTo(cx,cy);ctx.lineTo(cx+370*.65,cy+370);ctx.stroke();ctx.setLineDash([]);}
    }
  }
  for(const s of shots){if(s.kind==='wave'){polygon([[s.x,s.y+12],[s.x+8,s.y],[s.x+14,s.y+5],[s.x+22,s.y+12]],'#d6bb8d');}else drawSprite('projectile',s.x+s.w/2-16,s.y+s.h/2-16,32,32);}
}
function drawSprite(kind,x,y,w=32,h=32,frame=0,flip=false,flash=false,tint=0,pose='idle'){
  const sprite=PixelArt.sprite(kind,frame,pose);
  // One source pixel occupies a whole number of pixels in the 550x350 buffer.
  const scale=4;
  const width=sprite.width*scale,height=sprite.height*scale;
  const left=Math.round((x+(w-width)/2)/4)*4,top=Math.round((y+h-height)/4)*4;
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(left+(flip?width:0),top);if(flip)ctx.scale(-1,1);
  if(tint||flash)ctx.filter=`hue-rotate(${tint}deg) brightness(${flash?2.5:1})`;
  ctx.drawImage(sprite,0,0,width,height);ctx.restore();
}
function drawRoomHearts(){
  for(const h of room.hearts){
    const y=h.y+Math.round(Math.sin(tick*3)*2);
    if(h.value===4){drawSprite('heart-full',h.x-5,y-4,32,32);drawSprite('heart-full',h.x+11,y,32,32);}
    else drawSprite(h.value===1?'heart-half':'heart-full',h.x+1,y-3,32,32);
  }
}
function drawPlayer(){
  const p=player;if(p.iframes>0&&Math.floor(p.iframes*16)%2===0)return;
  const frame=p.ground&&Math.abs(p.vx)>25?1+Math.floor(tick*9)%2:0;
  drawSprite(p.crouch?'player-crouch':'player',p.x+p.w/2-16,p.y+p.h-(p.crouch?24:32),32,p.crouch?24:32,frame,p.face<0);
  if(controlScheme==='original'&&keys.has('KeyW'))text('⌃',p.x+13,p.y-9,16,'#d6eba3','center');
  if(p.ledge)text(jumpHint(),p.x+13,p.y-18,10,'#d6eba3','center');
}
function drawAttack(){
  if(!attack)return;
  const cx=player.x+13,cy=player.y+player.h/2+(attack.dir==='down'?10:0);
  const start=attack.dir==='up'?Math.PI*1.15:attack.dir==='down'?Math.PI*.15:attack.face>0?-.9:Math.PI-.9;
  const sweep=attack.dir==='side'?1.8:Math.PI*.7;
  for(let i=0;i<=12;i++){const angle=start+sweep*i/12;rect(Math.round((cx+Math.cos(angle)*46)/4)*4,Math.round((cy+Math.sin(angle)*46)/4)*4,6,6,i<3||i>9?'#a8c886':'#efffcf');}
}
function mapLayout(expanded=mapExpanded){
  const all=[...rooms.values()];
  const visible=all.filter(r=>devMode||r.visited||Object.values(r.links).some(v=>v.visited));
  const minX=Math.min(...all.map(r=>r.x)),maxX=Math.max(...all.map(r=>r.x+r.gridW-1));
  const minY=Math.min(...all.map(r=>r.y)),maxY=Math.max(...all.map(r=>r.y+r.gridH-1));
  const box=expanded?{x:240,y:145,w:620,h:405}:{x:W-332,y:110,w:300,h:230};
  const cell=Math.min(expanded?68:42,box.w/(maxX-minX+1),box.h/(maxY-minY+1));
  const ox=box.x+(box.w-cell*(maxX-minX+1))/2,oy=box.y+(box.h-cell*(maxY-minY+1))/2;
  return {box,cell,nodes:visible.map(r=>({room:r,x:ox+(r.x-minX+r.gridW/2)*cell,y:oy+(maxY+1-r.y-r.gridH/2)*cell}))};
}
function drawMap(){
  if(mode==='title'||mode==='dead')return;
  const {box,cell,nodes}=mapLayout();
  ctx.save();
  // No solid panel: the room remains visible behind both map sizes.
  text(mapExpanded?'FLOOR '+String(floor).padStart(2,'0')+(devMode?' · CLICK ROOM TO TELEPORT':' · MAP'):'MAP',box.x,box.y-16,mapExpanded?13:10,'rgba(220,243,156,.65)');
  text(mapExpanded?'TAB · COLLAPSE':'TAB · ENLARGE',box.x+box.w,box.y-16,10,'rgba(220,243,156,.55)','right');
  for(const a of nodes)for(const b of nodes){
    if((a.room.x<b.room.x||a.room.y<b.room.y)&&Object.values(a.room.links).includes(b.room)&&(devMode||a.room.visited||b.room.visited))
    {
      const color=mapExpanded?'rgba(196,214,164,.45)':'rgba(196,214,164,.23)',width=mapExpanded?3:2;
      const horizontal=a.room.links.left===b.room||a.room.links.right===b.room;
      const bendX=horizontal?b.x:a.x,bendY=horizontal?a.y:b.y;
      line(a.x,a.y,bendX,bendY,color,width);line(bendX,bendY,b.x,b.y,color,width);
    }
  }
  for(const n of nodes){
    const r=n.room,current=r===room,revealed=devMode||r.visited;
    const w=cell*(r.gridW-.18),h=cell*(r.gridH-.18);
    const alpha=mapExpanded?.75:.4;
    const color=current?`rgba(220,243,156,${alpha})`:revealed?`rgba(115,142,102,${alpha*.65})`:'rgba(98,118,92,.12)';
    if(isL(r)){const armH=h/r.gridH,shaftW=w/r.gridW;rect(n.x-w/2,n.y-h/2,w,armH,color);rect(mirroredL(r)?n.x+w/2-shaftW:n.x-w/2,n.y-h/2+armH,shaftW,h-armH,color);}else rect(n.x-w/2,n.y-h/2,w,h,color);
    ctx.strokeStyle=current?'rgba(238,255,195,.9)':revealed?'rgba(195,215,164,.48)':'rgba(165,188,143,.26)';ctx.lineWidth=current?2:1;
    if(!revealed)ctx.setLineDash([3,3]);if(isL(r)){const flip=mirroredL(r)?-1:1;ctx.beginPath();for(const [i,[x,y]] of [[-w/2,-h/2],[w/2,-h/2],[w/2,-h/2+h/r.gridH],[-w/2+w/r.gridW,-h/2+h/r.gridH],[-w/2+w/r.gridW,h/2],[-w/2,h/2]].entries()){if(i===0)ctx.moveTo(n.x+x*flip,n.y+y);else ctx.lineTo(n.x+x*flip,n.y+y);}ctx.closePath();ctx.stroke();}else ctx.strokeRect(n.x-w/2,n.y-h/2,w,h);ctx.setLineDash([]);
    const marker=roomMarker(r);
    if(marker)drawRoomMarker(marker,n.x,n.y,Math.max(8,Math.min(18,cell*.45)));
    else if(current){ctx.fillStyle='#f0ffd0';ctx.beginPath();ctx.arc(n.x,n.y,Math.max(2,cell*.06),0,Math.PI*2);ctx.fill();}
    else if(revealed&&cell>=18){const symbol={start:'S',item:'I',shop:'$',finish:'F'}[r.type];if(symbol)text(symbol,n.x,n.y+cell*.12,Math.max(8,cell*.24),'rgba(229,241,202,.8)','center');}
  }
  if(mapExpanded)text('OUTLINE: YOU   ·   DIAMOND: ITEM   ·   $: SHOP   ·   SKULL: BOSS',W/2,box.y+box.h+30,11,'rgba(219,234,193,.8)','center');
  ctx.restore();
}
function draw(){
  ctx=sceneryCtx;ctx.setTransform(.5,0,0,.5,0,0);
  updateCamera();rect(0,0,W,H,'#0b1412');
  ctx.save();ctx.translate(Math.round((camera.offsetX-camera.x)/2)*2,Math.round((camera.offsetY-camera.y)/2)*2);
  ctx.beginPath();ctx.rect(0,0,room.w,room.h);ctx.clip();
  drawBackground();drawMidground();drawPlatforms();drawWaterfalls();drawDebris();drawDoors();
  drawEnemies();drawRoomHearts();drawPlayer();drawAttack();
  for(const n of numbers){ctx.globalAlpha=Math.min(1,n.life*3);text(n.text,n.x,n.y,19,'#f1e4bb','center');}ctx.globalAlpha=1;
  if(room.type==='start'){text('A / D   MOVE',room.spawnX-25,room.floorY-70,10,'#9bae80');text(jumpHint(),room.route[0].x+20,room.route[0].y-19,10,'#a7bd85');}
  if(room.type==='item'||room.type==='shop'){text(room.type==='item'?'ITEM ROOM':'SHOP',room.w/2,room.floorY-170,20,'#8fa477','center');text('COMING IN A LATER ITERATION',room.w/2,room.floorY-146,9,'#697e5e','center');}
  ctx.restore();
  displayCtx.imageSmoothingEnabled=false;displayCtx.drawImage(sceneryCanvas,0,0,W,H);ctx=displayCtx;
  drawMap();
  if(room.boss&&room.boss.hp>0){text(room.boss.name,W/2,98,14,'#edc79a','center');rect(W/2-140,108,280,5,'#2a3439');rect(W/2-140,108,280*room.boss.hp/room.boss.max,5,'#d9a979');text(roomBossSpec(room).hint,W/2,130,10,'#cfdbcf','center');}
  if(transition){
    const t=transition.time/.44;
    ctx.globalAlpha=Math.sin(Math.PI*clamp(t,0,1));rect(0,0,W,H,'#0b1412');ctx.globalAlpha=1;
  }
}
function frame(now){
  updateDevToggle(now);
  const elapsed=Math.min((now-lastTime)/1000,.05);lastTime=now;
  if(mode==='playing'){accumulator+=elapsed;while(accumulator>=1/120){update(1/120);accumulator-=1/120;if(mode!=='playing'){accumulator=0;break;}}}
  draw();requestAnimationFrame(frame);
}
player=createPlayer();enterRoom(buildFloor());updateHearts();requestAnimationFrame(frame);


// Keep the browser's final scale an integer number of physical display pixels.
function fitPixelCanvas(){
  const main=document.querySelector('main'),shell=document.querySelector('.game-shell'),host=$('game-display');
  const style=getComputedStyle(main),dpr=window.devicePixelRatio||1;
  const expanded=!!document.fullscreenElement||host.classList.contains('window-mode');
  if(expanded){
    const pixelScale=Math.max(1,Math.floor(Math.min(innerWidth*dpr/550,innerHeight*dpr/350)));
    const width=Math.ceil(innerWidth*dpr/pixelScale),height=Math.ceil(innerHeight*dpr/pixelScale);
    resizeRenderSurface(width,height);
    shell.style.width='100%';shell.style.height='100%';
    canvas.style.width=(width*pixelScale/dpr)+'px';canvas.style.height=(height*pixelScale/dpr)+'px';
  }else{
    resizeRenderSurface(550,350);
    const available=main.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight)-2;
    const scale=Math.max(1,Math.floor(available*dpr/550));
    shell.style.width=(550*scale/dpr+2)+'px';shell.style.height='';canvas.style.width='100%';canvas.style.height='auto';
  }
}
function resizeRenderSurface(width,height){
  if(sceneryCanvas.width===width&&sceneryCanvas.height===height)return;
  sceneryCanvas.width=width;sceneryCanvas.height=height;W=width*2;H=height*2;canvas.width=W;canvas.height=H;
  sceneryCtx.imageSmoothingEnabled=false;displayCtx.imageSmoothingEnabled=false;
}
function syncFullscreenButton(){
  const active=!!document.fullscreenElement||$('game-display').classList.contains('window-mode');
  $('fullscreen-button').textContent=active?'EXIT FULLSCREEN':'FULLSCREEN';
  $('fullscreen-button').setAttribute('aria-pressed',String(active));fitPixelCanvas();
}
function setWindowMode(active){$('game-display').classList.toggle('window-mode',active);syncFullscreenButton();canvas.focus();}
$('fullscreen-button').addEventListener('click',async()=>{
  const host=$('game-display');
  if(document.fullscreenElement){await document.exitFullscreen();}
  else if(host.classList.contains('window-mode'))setWindowMode(false);
  else if(host.requestFullscreen){try{await host.requestFullscreen();}catch{setWindowMode(true);}}
  else setWindowMode(true);
  syncFullscreenButton();canvas.focus();
});
document.addEventListener('fullscreenchange',syncFullscreenButton);
new ResizeObserver(fitPixelCanvas).observe(document.querySelector('main'));
window.addEventListener('resize',fitPixelCanvas);fitPixelCanvas();

for(const [id,setting,step]of [['dev-damage-down','damage',-1],['dev-damage-up','damage',1],['dev-speed-down','speed',-.25],['dev-speed-up','speed',.25]]){
  $(id).addEventListener('click',()=>{
    if(!devMode)return;
    if(setting==='damage')devDamage=clamp(devDamage+step,3,99);
    else devFlightSpeed=clamp(devFlightSpeed+step,.25,5);
    refreshDevIndicator();canvas.focus();
  });
}
$('dev-reset').addEventListener('click',()=>{if(!devMode)return;devDamage=3;devFlightSpeed=1;refreshDevIndicator();canvas.focus();});
