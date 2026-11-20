import { createSculpture, ease } from './sculpture.js';

const select = selector => document.querySelector(selector);
const sequence = select('.sequence');
const stage = select('.stage');
const canvas = select('#sculpture');
const tileNav = select('.tile-nav');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const filters = [...document.querySelectorAll('.filters a')];
const projects = [...document.querySelectorAll('#projects article')];
const categoryLinks = [...tileNav.querySelectorAll('a')];
const categories = new Set(['installations','web','motion']);

function updateFilter() {
  const category = location.hash.slice(1);
  const key = categories.has(category) ? category : 'work';
  filters.forEach(link => {
    if (link.hash === '#' + key) link.setAttribute('aria-current','true');
    else link.removeAttribute('aria-current');
  });
  projects.forEach(project => {
    const type = project.dataset.category;
    project.hidden = key === 'work' ? type === 'web' || type === 'motion' : type !== key;
  });
}

addEventListener('hashchange', updateFilter);
updateFilter();
for (const link of [...categoryLinks,...document.querySelectorAll('.disciplines a')]) {
  link.addEventListener('click', event => {
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null,'',link.hash);
    updateFilter();
    select('#work').scrollIntoView({behavior:reduced.matches ? 'instant' : 'smooth'});
    select('#work-title').setAttribute('tabindex','-1');
    select('#work-title').focus({preventScroll:true});
  });
}

const chapterTitle = select('.chapter-title span');
const progress = select('.progress i');
const grid = select('.grid');
const name = select('.name');
const clips = [...document.querySelectorAll('[data-wall-clip]')];
const filmButton = select('.film-control');
const titleCategories = select('.disciplines');
const transitionLength = .65;
const media = {current:clips[0],next:null,blend:0};
let videoPaused = false;
let playbackWanted = false;
let nextClipFailed = false;

for (const clip of clips) {
  clip.muted = true;
  clip.loop = clips.length === 1;
  clip.addEventListener('playing',syncFilmControl);
  clip.addEventListener('pause',syncFilmControl);
}

function syncFilmControl() {
  const paused = !media.current || media.current.paused;
  filmButton.dataset.paused = String(paused);
  filmButton.setAttribute('aria-label',paused ? 'Play moving image' : 'Pause moving image');
}

function setFilmPlayback(wanted) {
  if (wanted === playbackWanted) return;
  playbackWanted = wanted;
  for (const clip of [media.current,media.next]) {
    if (!clip) continue;
    if (wanted) clip.play().catch(syncFilmControl);
    else clip.pause();
  }
}

function advanceFilm() {
  const current=media.current;
  if (clips.length<2 || !playbackWanted || !Number.isFinite(current.duration)) return;
  if (!media.next && !nextClipFailed && current.duration-current.currentTime <= transitionLength) {
    const available=clips.filter(clip=>!clip.error);
    const next=available[(available.indexOf(current)+1)%available.length];
    if (!next || next===current) {
      current.loop=true;
      return;
    }
    next.currentTime=0;
    media.next=next;
    next.play().catch(() => {
      if (media.next!==next) return;
      media.next=null;
      media.blend=0;
      if (playbackWanted) {
        nextClipFailed=true;
        current.loop=true;
        if (current.ended) current.play().catch(syncFilmControl);
      }
    });
  }
  if (!media.next || media.next.readyState<2) return;
  media.blend=ease(0,transitionLength,media.next.currentTime);
  if (media.blend>=1 || media.next.ended) {
    media.current=media.next;
    media.next=null;
    media.blend=0;
    current.pause();
    syncFilmControl();
  }
}

filmButton.addEventListener('click', () => {
  videoPaused = !media.current.paused;
  playbackWanted = videoPaused;
  setFilmPlayback(!videoPaused);
});
const scrollLink = select('.scroll-link');
const target = {x:0,y:0};
const pointer = {x:0,y:0};
const hover = [0,0,0];
const hoverTarget = [0,0,0];
const chapters = ['', 'Fragments', '', 'Explore'];
const ranges = [0,.20,.57,.82,1];
let chapter = -1;
let render;
let displayed = 0;
let previous = 0;
let started = false;

function activateRenderer() {
  try {
    render = createSculpture(canvas,media);
  } catch (error) {
    stage.dataset.renderer = 'poster';
    console.warn('WebGL unavailable. Showing the still image.', error);
  }
}
activateRenderer();
canvas.addEventListener('webglcontextlost', event => {
  event.preventDefault();
  render = undefined;
  stage.dataset.renderer = 'poster';
});
canvas.addEventListener('webglcontextrestored', activateRenderer);

stage.addEventListener('pointermove', event => {
  if (event.pointerType !== 'mouse') return;
  target.x = (event.clientX / stage.clientWidth - .5) * 2;
  target.y = (event.clientY / stage.clientHeight - .5) * 2;
}, {passive:true});
stage.addEventListener('pointerleave', () => {target.x = target.y = 0;});
categoryLinks.forEach((link,index) => {
  link.addEventListener('pointerenter', () => hoverTarget[index] = 1);
  link.addEventListener('pointerleave', () => hoverTarget[index] = 0);
  link.addEventListener('focus', () => hoverTarget[index] = 1);
  link.addEventListener('blur', () => hoverTarget[index] = 0);
});

function choreograph(p, still) {
  const active = p >= ranges[3] ? 3 : p >= ranges[2] ? 2 : p >= ranges[1] ? 1 : 0;
  if (chapter !== active) {
    chapter = active;
    chapterTitle.textContent = chapters[active];
  }
  const retreat = ease(.025,.27,p);
  const assemblyExit = ease(.63,.91,p);
  name.style.transform = `translate(${-6*retreat}vw,${-147*retreat}%) scale(${1+.13*retreat})`;
  grid.style.setProperty('--datum', ((innerWidth <= 640 ? 22 : 32) - 14*retreat + 60*assemblyExit) + '%');
  progress.style.transform = 'scaleX(' + p + ')';
  const entry = active === 0 ? 1 : ease(ranges[active], ranges[active]+.065,p);
  const exit = active === 3 ? 0 : ease(ranges[active+1]-.065,ranges[active+1],p);
  const offset = (1-entry)*110-exit*110;
  chapterTitle.style.transform = 'translateY(' + offset + '%)';
  titleCategories.inert = p >= .14;
  tileNav.inert = !(still || p >= .895);
  stage.dataset.chapter = String(active);
  filmButton.hidden = still || active >= 2 || !render;
  scrollLink.style.visibility = p > .26 || still ? 'hidden' : 'visible';
}

function frame(now) {
  requestAnimationFrame(frame);
  const delta = Math.min(.05, (now-previous)/1000);
  previous = now;
  const bounds = sequence.getBoundingClientRect();
  if (bounds.bottom <= 0 || document.hidden) {
    setFilmPlayback(false);
    return;
  }
  const still = reduced.matches;
  const travel = Math.max(1,sequence.offsetHeight-stage.offsetHeight);
  const p = still ? 0 : Math.max(0,Math.min(1,-bounds.top/travel));
  const smoothing = 1-Math.exp(-delta*12);
  displayed = still || !started ? p : displayed + (p-displayed)*smoothing;
  started = true;
  for (const axis of ['x','y']) pointer[axis] += ((still ? 0 : target[axis])-pointer[axis])*smoothing;
  hover.forEach((value,index) => {hover[index] += ((still ? 0 : hoverTarget[index])-value)*smoothing;});
  choreograph(displayed,still);
  setFilmPlayback(Boolean(render && !still && !videoPaused && displayed < .83 && bounds.bottom > stage.offsetHeight*.52));
  advanceFilm();
  if (render) {
    render(displayed,now/1000,pointer,hover,still);
    stage.dataset.renderer = 'webgl';
  }
}
requestAnimationFrame(frame);
