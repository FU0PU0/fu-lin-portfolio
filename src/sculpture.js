import * as T from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const mix = T.MathUtils.lerp;
export function ease(a,b,t) {
  const x = T.MathUtils.clamp((t-a)/(b-a),0,1);
  return x*x*x*(x*(x*6-15)+10);
}

// The media faces share UV coordinates from this assembled layout. Gaps remain empty.
const layout = [
  [-2,1,'bloom','ivory'], [-1,1,'square','jade',false,1], [0,1,'scallop','ink',true], [2,1,'bloom','ivory',false,2],
  [-3,0,'scallop','deep',true], [-2,0,'flower','blue',false,0], [-1,0,'scallop','ink',true], [0,0,'flower','ink',true],
  [1,0,'square','ink',true],
  [-3,-1,'flower','jade'], [-2,-1,'scallop','deep',true], [-1,-1,'flower','ink',true], [0,-1,'square','ink',true],
  [1,-1,'flower','blue'], [2,-1,'square','jade'],
];
const pitch = 1.028;
const step = Math.PI*2;

function silhouette(type,scale=1) {
  const shape = new T.Shape();
  for (let i=0;i<144;i++) {
    const a=i/144*step;
    const x=Math.cos(a), y=Math.sin(a);
    let u,v;
    if (type==='flower' || type==='bloom') {
      const count=type==='flower' ? 4 : 5;
      const petal=(.5-.5*Math.cos(a*count))**.48;
      const r=(type==='flower' ? .201+.382*petal : .238+.265*petal)*(1+.029*Math.sin(a*3+.7)+.012*Math.cos(a*7));
      u=x*r;
      v=y*r;
    } else {
      const dent=type==='scallop' ? 1-.144*((1+Math.cos(a*4))*.5)**2 : 1;
      u=Math.sign(x)*Math.abs(x)**.29*.444*dent;
      v=Math.sign(y)*Math.abs(y)**.33*.460*dent;
      u*=1+.012*Math.sin(a*6+.8);
    }
    if (i) shape.lineTo(u*scale,v*scale);
    else shape.moveTo(u*scale,v*scale);
  }
  shape.closePath();
  return shape;
}

function studioShadow() {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=96;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(48,48,4,48,48,48);
  gradient.addColorStop(0,'rgba(36,56,55,.35)');
  gradient.addColorStop(.58,'rgba(36,56,55,.21)');
  gradient.addColorStop(1,'rgba(36,56,55,0)');
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,96,96);
  return new T.CanvasTexture(canvas);
}

function glazeTexture() {
  const canvas=document.createElement('canvas');
  canvas.width=canvas.height=256;
  const ctx=canvas.getContext('2d');
  const data=ctx.createImageData(256,256);
  let seed=47;
  for(let i=0;i<data.data.length;i+=4) {
    seed=(Math.imul(1664525,seed)+1013904223)>>>0;
    const x=(i/4)%256, y=Math.floor(i/1024);
    const cloud=Math.sin(x*.041+1.3*Math.sin(y*.026))*Math.cos(y*.048-.9*Math.sin(x*.024));
    const pooling=1.8*Math.hypot((x-127)/127,(y-129)/127)**3;
    const fine=(seed/4294967296-.5)*23;
    const value=211+cloud*16+10*pooling+fine;
    data.data.set([value,value,value,255],i);
  }
  ctx.putImageData(data,0,0);
  return new T.CanvasTexture(canvas);
}

function ceramicGeometry(type,media) {
  const outline=silhouette(type).getPoints().slice(0,-1);
  const count=outline.length;
  const points=[], coords=[], indices=[];
  const rings=[[.91,-.143],[.98,-.125],[1.027,-.094],[1.045,-.055],
    [1.048,.053],[1.037,.090],[1.008,.118],[.965,.139]];
  for(let i=0;i<21;i++) rings.push([.93-i*.044,.150]);
  const dimple=!media && (type==='flower' || type==='bloom');
  function faceHeight(x,y){
    const r=Math.hypot(x,y);
    return (media ? 0 : .005*Math.cos(r*3.2))-(dimple ? .050*Math.exp(-((r/.091)**3)) : 0);
  }
  for(let ring=0;ring<rings.length;ring++){
    const [scale,z]=rings[ring];
    for(let i=0;i<count;i++){
      const x=outline[i].x*scale, y=outline[i].y*scale;
      points.push(x,y,z+(ring>=8 ? faceHeight(x,y) : 0));
      coords.push(.5+x,.5+y);
    }
  }
  const top=points.length/3;
  points.push(0,0,.150+faceHeight(0,0),0,0,-.143);
  coords.push(.5,.5,.5,.5);
  for(let i=0;i<count;i++) indices.push(top+1,(i+1)%count,i);
  for(let ring=0;ring<rings.length-1;ring++){
    for(let i=0;i<count;i++){
      const j=(i+1)%count, a=ring*count+i, b=ring*count+j;
      indices.push(a,b,b+count,a,b+count,a+count);
    }
  }
  const last=(rings.length-1)*count;
  for(let i=0;i<count;i++) indices.push(last+i,last+(i+1)%count,top);
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
  geo.setAttribute('uv',new T.Float32BufferAttribute(coords,2));
  geo.setIndex(indices);
  const split=count*3+2*count*6;
  geo.addGroup(0,split,1);
  geo.addGroup(split,indices.length-split,0);
  geo.computeVertexNormals();
  return geo;
}

function inset(type,column,row) {
  const face = new T.ShapeGeometry(silhouette(type,.937));
  const vertices=face.getAttribute('position');
  const uv=face.getAttribute('uv');
  for(let i=0;i<vertices.count;i++){
    // Center-crop the 16:9 source to a near-square window spanning the media panes.
    uv.setXY(i,.68+(vertices.getX(i)+column*pitch)*.184,
      .50+(vertices.getY(i)+row*pitch)*.322);
  }
  return face;
}

export function createSculpture(canvas,media) {
  const renderer = new T.WebGLRenderer({canvas, alpha:true, antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0xf3f4f4,0);
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.88;
  const env=new RoomEnvironment();
  const pmrem=new T.PMREMGenerator(renderer);
  const scene=new T.Scene();
  scene.environment=pmrem.fromScene(env,.035).texture;
  env.dispose();
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xf3f8ff,0x586662,.82));
  const softbox=new T.DirectionalLight(0xf8fdff,2.1);
  softbox.position.set(-3,5,3);
  scene.add(softbox);
  const rim=new T.DirectionalLight(0xc5e1e7,1.2);
  rim.position.set(4,1,-2);
  scene.add(rim);
  scene.environmentIntensity=.77;
  const camera=new T.OrthographicCamera(-5,5,3,-3,.1,40);
  camera.position.set(0,0,12);

  const grain=glazeTexture();
  grain.colorSpace=T.SRGBColorSpace;
  function ceramic(color,roughness=.31) {
    return new T.MeshPhysicalMaterial({
      color,roughness,clearcoat:.67,clearcoatRoughness:.19,map:grain,bumpMap:grain,bumpScale:.006
    });
  }
  const materials={
    blue:ceramic(0x729aaa,.30),jade:ceramic(0x376660,.26),
    deep:ceramic(0x18485a,.22),ivory:ceramic(0xc0c6bb,.33),
    ink:ceramic(0x29464d,.23)
  };
  const clay=ceramic(0x857c6c,.58);
  clay.clearcoat=0;
  const shadowMap=studioShadow();
  const shadowGeo=new T.PlaneGeometry(1.38,1.33);
  const moulds=new Map();
  function mould(type,media) {
    const key=type+Boolean(media);
    if(!moulds.has(key)) moulds.set(key,ceramicGeometry(type,media));
    return moulds.get(key);
  }
  const wall=new T.Group();
  scene.add(wall);

  const films=new WeakMap();
  function textureFor(video) {
    if (!films.has(video)) {
      const texture=new T.VideoTexture(video);
      texture.colorSpace=T.SRGBColorSpace;
      films.set(video,texture);
    }
    return films.get(video);
  }
  const stillMap = new T.Texture();
  stillMap.colorSpace=T.SRGBColorSpace;
  const filmSurface=new T.MeshBasicMaterial({map:stillMap,toneMapped:false});
  const image = document.getElementById('wall-still');
  const loadStill = () => {stillMap.image=image; stillMap.needsUpdate=true;};
  if(image?.complete && image.naturalWidth) loadStill();
  else image?.addEventListener('load',loadStill,{once:true});
  const transitionSurface=new T.MeshBasicMaterial({
    transparent:true,opacity:0,depthWrite:false,toneMapped:false
  });
  const overlays=[];

  const tiles=layout.map(([column,row,type,color,media,category],index)=>{
    const pivot=new T.Group();
    wall.add(pivot);
    const tile=new T.Mesh(mould(type,media),[materials[color],clay]);
    pivot.add(tile);
    const shade=new T.Mesh(shadowGeo,new T.MeshBasicMaterial({
      map:shadowMap,transparent:true,depthWrite:false,opacity:.58,toneMapped:false
    }));
    shade.position.set(.065,-.079,-.28);
    pivot.add(shade);
    if(media){
      const pane = new T.Mesh(inset(type,column,row),filmSurface);
      pane.position.z=.155;
      pivot.add(pane);
      const overlay=new T.Mesh(pane.geometry,transitionSurface);
      overlay.position.z=.156;
      overlay.visible=false;
      overlay.renderOrder=1;
      overlays.push(overlay);
      pivot.add(overlay);
    }
    return {pivot,shade,column,row,category,index};
  });

  let width=0,height=0;
  return function render(p,time,pointer,hover,still) {
    const w=canvas.clientWidth, h=canvas.clientHeight;
    if(!w || !h) return;
    if(w!==width || h!==height) {
      width=w; height=h;
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));
      renderer.setSize(w,h,false);
      camera.top=3; camera.bottom=-3;
      camera.right=3*w/h; camera.left=-camera.right;
      camera.updateProjectionMatrix();
    }
    const current=media?.current;
    const next=media?.next;
    const primary=current?.readyState>=2 && !current.error && !still ? textureFor(current) : stillMap;
    if (filmSurface.map!==primary) {
      filmSurface.map=primary;
      filmSurface.needsUpdate=true;
    }
    const crossfade=!still && next?.readyState>=2 && media.blend>0;
    if (crossfade) {
      const overlay=textureFor(next);
      if (transitionSurface.map!==overlay) {
        transitionSurface.map=overlay;
        transitionSurface.needsUpdate=true;
      }
      transitionSurface.opacity=media.blend;
    }
    overlays.forEach(overlay=>{overlay.visible=Boolean(crossfade);});

    const narrow=w<641;
    const open=ease(.13,.56,p);
    const release=ease(.56,.95,p);
    const stemScale=Math.min(narrow ? .65 : .99,2*camera.right*(narrow ? .89 : .82)/6.19);
    wall.position.set(mix(narrow ? 0 : camera.right*.03,0,ease(.04,.40,p)),
      mix(narrow ? -.38 : -.91,.06,ease(.02,.39,p))-.21*release,0);
    wall.rotation.set((-.09+pointer.y*.13+open*.21)*(1-release),
      (-.082+pointer.x*.14-open*.22)*(1-release),(-.017-open*.035)*(1-release));

    for(const {pivot,shade,column,row,category,index} of tiles){
      const stagger=.028*(1-row)+.014*(column+3);
      const shift=ease(.14+stagger,.49+stagger,p);
      const bloom=shift*(1-.82*release);
      const startX=(column+.5)*pitch*stemScale;
      const startY=row*pitch*stemScale;
      const laidX=startX+stemScale*bloom*(column*.11+row*.19);
      const laidY=startY+stemScale*bloom*(row*.21 + Math.sin(index*1.77)*.11);
      const angle = (index%2 ? 1 : -1);
      const breathe = still ? 0 : time*.72+index*.71;
      if(category!==undefined){
        const lock=ease(.56+category*.04,.90+category*.025,p);
        const side=category-1;
        const finalX=side*(2*camera.right*(narrow?.89:.856)/3);
        pivot.visible=true;
        pivot.position.set(mix(laidX,finalX,lock),mix(laidY,
          (still ? 0 : .10*Math.sin(breathe))+(!narrow ? -.04 : .10),lock),
          .43*bloom+lock*(.12+hover[category]*.28));
        pivot.rotation.set(.10*bloom+lock*(.18*Math.sin(breathe*.91)+pointer.y*.19),
          .25*angle*bloom+lock*(.61*Math.sin(breathe*.82)+pointer.x*.21+hover[category]*.24),
          .16*angle*bloom+lock*.19*Math.sin(breathe*.89));
        const finalSize=Math.min(narrow?1.10:1.78,2*camera.right*(narrow?.78:.77)/3);
        pivot.scale.setScalar(mix(stemScale,finalSize+hover[category]*.09,lock));
        shade.material.opacity=.55*(1-lock);
      } else {
        const exit=ease(.54+stagger,.85+stagger,p);
        pivot.visible=exit<.996;
        pivot.position.set(laidX+angle*exit*.71,laidY+(row>=0?1:-1)*exit*1.32,
          (.23+index%4*.18)*bloom-exit*2.9);
        pivot.rotation.set(bloom*.18+exit*.74,angle*bloom*.31,angle*(bloom*.18+exit*.45));
        pivot.scale.setScalar(stemScale*Math.max(.005,1-exit));
        shade.material.opacity=.6*(1-.7*shift)*(1-exit);
      }
    }
    renderer.render(scene,camera);
  };
}
