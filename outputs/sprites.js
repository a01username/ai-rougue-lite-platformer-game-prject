/* Hand-authored 8x8 sprites. Bosses use four 8x8 tiles at the same pixel scale. */
const PixelArt=(()=>{
  const cache=new Map(),flap=[0,1,2,3,2,1];
  const colors={o:'#222c32',c:'#d57543',h:'#ffcf91',s:'#e7bd91',b:'#619ca9',g:'#789477',l:'#b1c68c',d:'#40584d',w:'#e0f0ec',y:'#edbb63',r:'#ad8057',a:'#82afc7',p:'#ce995f'};
  function sprite(kind,frame=0,pose='idle'){
    const flying=['air','dive','roc'].includes(kind);
    frame=(kind==='player'||kind==='player-crouch')?frame%3:((frame%6)+6)%6;
    const id=kind+':'+frame+':'+pose;if(cache.has(id))return cache.get(id);
    const boss=['warden','roc','crystal','shale','frostwing','splinter','echo','kiln'].includes(kind),c=document.createElement('canvas');c.width=boss?16:8;c.height=kind==='player-crouch'?6:c.width;
    const g=c.getContext('2d');g.imageSmoothingEnabled=false;
    const r=(x,y,w,h,color)=>{g.fillStyle=colors[color]||color;g.fillRect(x,y,w,h);};
    const rows=(pattern)=>pattern.forEach((row,y)=>[...row].forEach((v,x)=>{if(v!=='.')r(x,y,1,1,v);}));
    if(kind==='echo'){
      // Hollow bronze bell, suspended between animated resonating fins.
      r(6,1,4,2,'o');r(7,1,2,2,'y');r(4,3,8,8,'o');r(5,3,6,7,'p');r(6,4,4,5,'d');
      r(2,10,12,3,'o');r(3,10,10,1,'y');r(7,11,2,4,pose==='recover'?'w':'a');
      const k=frame%3;r(1,4+k,2,4,'a');r(13,6-k,2,4,'a');r(6,6,1,1,'w');r(9,6,1,1,'w');
    }else if(kind==='kiln'){
      // Horned furnace shell surrounding an animated molten mouth.
      r(1,0,2,6,'o');r(13,0,2,6,'o');r(2,3,12,11,'o');r(3,4,10,9,'r');
      r(4,5,8,7,'d');r(5,6,6,5,pose==='recover'?'y':'c');
      for(let i=0;i<4;i++)r(5+i,7+(frame+i)%3,1,2,pose==='warn'?'w':'h');
      r(3,4,3,2,'o');r(10,4,3,2,'o');r(4,5,1,1,'y');r(11,5,1,1,'y');
      r(2,13,4,3,'o');r(10,13,4,3,'o');r(0,8,3,3,'r');r(13,8,3,3,'r');
    }else if(kind==='shale'){
      rows(['.....oo.........','....ollo..oo....','...olggloollo...','..oolgdgggglo...','..olggooyggdoo..','.olgggoddgggglo.','oollggooggdggloo','olgggoggggdogggo','olgggoggggdogggo','.oddooddddoogggo','..oo.oggggo.ooo.','....ogdddgo.....','...oogggggoo....','...olggggggo....','..oolgooogloo...','..oooo..ooooo...']);
      const step=frame<3?0:1;r(3+step,14,2,1,'l');r(9-step,14,2,1,'l');
      if(pose==='warn'){r(0,3,3,5,'o');r(0,3,2,3,'l');r(13,2,3,6,'o');r(14,2,2,4,'l');r(8,4,1,1,frame%2?'w':'y');}
      if(pose==='attack'){g.clearRect(2,14,12,2);r(4,12,3,2,'o');r(9,12,3,2,'o');}
      if(pose==='recover'){g.clearRect(4,0,8,2);r(7,6,2,2,frame%2?'y':'p');}
    }else if(kind==='frostwing'){
      // A broad, fork-tailed ice moth, rather than the Roc's bird silhouette.
      const wing=flap[frame],levels=[[1,2,3,4,5,6],[3,3,4,4,5,6],[6,6,6,6,6,6],[11,10,9,8,7,6]][wing];
      for(let side=0;side<2;side++)for(let i=0;i<6;i++){
        if(pose==='attack'&&i<2)continue;const x=side?15-i:i,y=levels[i];
        r(x,y,1,4,'o');r(x,y,1,2,'a');if(i%2===0)r(x,y,1,1,'w');r(x,y+2,1,1,'b');
      }
      r(5,4,6,7,'o');r(6,4,4,6,'a');r(7,5,2,7,'w');r(5,5,1,1,'y');r(10,5,1,1,'y');
      r(5,1,1,3,'a');r(10,1,1,3,'a');r(4,0,1,2,'w');r(11,0,1,2,'w');
      r(5,11,2,3,'a');r(9,11,2,3,'a');r(4,14,2,2,'w');r(10,14,2,2,'w');
    }else if(kind==='splinter'){
      // Broken crystal plates surround a hollow, exposed energy nucleus.
      const drift=frame%3===1?1:0;
      r(5,1,4,2,'o');r(6,1,2,1,'w');r(3,3+drift,3,4,'a');r(3,3+drift,1,3,'w');
      r(10,2,3,4,'b');r(11,2,1,3,'w');r(1,7,3,3,'a');r(1,7,1,2,'w');
      r(12,7+drift,3,4,'b');r(13,7+drift,1,2,'w');r(4,11,3,4,'a');r(4,12,1,2,'w');r(9,12,3,3,'b');
      r(6,6,4,4,'o');r(7,7,2,2,frame%2?'y':'p');
      if(pose==='exposed'){r(6,7,4,2,'y');r(7,6,2,4,'p');r(7,7,2,2,'w');}
    }else if(kind==='player'||kind==='player-crouch'){
      rows(kind==='player-crouch'?['..occco.','..chhco.','..ssbbo.','.dbccso.','.dcccco.','..oo.oo.']:['..occco.','..chhco.','..ssbbo.','.dbbbso.','.dcccco.','.dccsco.','..oddoo.','..oo.oo.']);
      if(kind==='player'&&frame){g.clearRect(0,7,8,1);r(frame===1?1:3,7,2,1,'o');r(frame===1?5:4,7,2,1,'o');}
    }else if(flying){
      const warm=kind!=='air',mid=warm?'r':'a',light=warm?'y':'w',wingPose=flap[frame];
      if(!boss){
        const heights=[[0,1,2],[2,2,3],[4,4,3],[6,5,4]][wingPose];
        for(let side=0;side<2;side++)for(let i=0;i<3;i++){if(pose==='attack'&&i===0)continue;const x=side?7-i:i,y=heights[i];r(x,y,1,2,'o');r(x,y,1,1,mid);}
        r(2,3,4,3,'o');r(3,3,2,4,mid);r(2,3,1,1,light);r(5,3,1,1,light);r(3,4,2,1,'y');r(3,5,2,1,light);r(3,7,2,1,'o');
      }else{
        const heights=[[1,1,2,3,4,5],[4,4,4,5,5,6],[8,8,7,7,6,6],[12,11,10,9,8,7]][wingPose];
        for(let side=0;side<2;side++)for(let i=0;i<6;i++){if(pose==='attack'&&i<3)continue;const x=side?15-i:i,y=heights[i];r(x,y,1,3,'o');r(x,y,1,2,mid);if(i%2===0)r(x,y,1,1,light);}
        r(5,5,6,8,'o');r(6,6,4,7,mid);r(6,9,4,3,light);r(5,5,6,2,'w');r(6,6,1,1,'o');r(9,6,1,1,'o');r(7,7,2,2,'y');r(6,13,1,2,'o');r(9,13,1,2,'o');r(5,3,1,2,'y');r(7,2,2,3,'y');r(10,3,1,2,'y');
      }
    }else if(kind==='crawler'){
      rows(['........','...oo...','..ollo..','.olldgo.','.olgddo.','.oggggo.','..y..y..','.oo..oo.']);
      g.clearRect(0,7,8,1);const step=flap[frame]%3;for(let i=0;i<3;i++)r(Math.min(7,i*3+(step===1?1:0)),7,1,1,'o');if(step===2){r(0,6,1,1,'d');r(7,6,1,1,'d');}
    }else if(kind==='ground'){
      rows(['........','...oo...','..olgo..','.olgggo.','.oyddyo.','.ogddooo','.ogggoy.','..oo.oo.']);
    }else if(kind==='warden'){
      rows(['..lo........ol..','..go..oooo..og..','..ggoollllooog..','...oolllglloo...','..oollgggggloo..','..ollggddggglo..','.oollyoddoylloo.','.ollgggddgggllo.','.olggggooggdglo.','.olggggooggdglo.','.ooggggggggggoo.','..ogggooddgggo..','..oggggggggggo..','.oogggoooogggoo.','.ollgoo..oogllo.','..oooo....oooo..']);
    }else if(kind==='crystal'){
      rows(['.......ww.......','......waaw......','.....wwaaww.....','....wwaaaaww....','...wwaaaabaaw...','..wwaaaaabbaaw..','..waaoaaaaoaaw..','..waabaaaabaaw..','..waabaaaabaaw..','..waabaaaabaaw..','...waabaaaabw...','....waabaabw....','.....waabaw.....','......waaw......','.......ww.......','................']);
    }else if(kind==='projectile')rows(['........','..oooo..','.ohhppo.','.ohpppo.','.opppdo.','..oddo..','........','........']);
    else if(kind.startsWith('heart')){
      rows(['.oo..oo.','olloodlo','ollllllo','ollllllo','.ollllo.','..ollo..','...oo...','........']);
      if(kind==='heart-half'){r(1,1,2,2,'d');r(5,1,2,2,'d');r(1,3,6,1,'d');}
    }
    if(kind==='ground'){
      const pulse=flap[frame];
      if(pulse>=2){r(2,2,3,1,'l');r(1,3,1,2,'g');}
      r(6,5,2,1,pose==='attack'?'y':'o');
      if(pose==='warn'){r(2,4,1,1,'w');r(5,4,1,1,'w');r(6,5,1,1,'p');}
      if(pose==='attack'){g.clearRect(7,5,1,2);r(5,5,2,2,'o');r(6,5,1,1,'w');}
    }
    if(kind==='warden'){
      if(pose==='idle'||pose==='walk'){
        g.clearRect(1,14,14,2);const offset=frame<3?0:1;
        r(2+offset,14,4,2,'o');r(9-offset,14,4,2,'o');r(3+offset,14,2,1,'l');r(10-offset,14,2,1,'l');
        r(4,7,1,1,frame%3===0?'l':'g');
      }else if(pose==='warn'){
        r(0,2,2,6,'o');r(1,2,1,4,'l');r(14,2,2,6,'o');r(14,2,1,4,'l');r(5,6,1,1,frame%2?'w':'y');r(10,6,1,1,frame%2?'w':'y');
      }else if(pose==='attack'){
        g.clearRect(0,13,16,3);r(3,12,4,2,'o');r(9,12,4,2,'o');r(2,5,2,5,'l');r(12,5,2,5,'l');
      }else if(pose==='recover'){
        g.clearRect(0,0,16,3);r(2,13,12,2,'o');r(4,6,2,1,'d');r(10,6,2,1,'d');
        if(frame%2)r(7,8,2,1,'y');
      }
    }
    if(kind==='crystal'){
      const glints=[[7,2],[10,4],[11,7],[8,11],[5,9],[4,5]],spot=glints[frame];
      r(spot[0],spot[1],1,2,'w');r(spot[0]-1,spot[1]+1,1,1,'w');
      if(pose==='exposed'){
        r(7,5,2,6,'o');r(6,8,4,2,frame%2?'y':'p');r(7,7,2,2,'w');
      }else if(pose==='warn'||pose==='attack'){r(5,6,1,1,'y');r(10,6,1,1,'y');r(7,8,2,2,frame%2?'w':'a');}
    }
    cache.set(id,c);return c;
  }
  return {sprite};
})();
