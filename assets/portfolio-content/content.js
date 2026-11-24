/* Accessible work navigation: every category has a real #section target and remains discoverable without JS. */
(()=>{
 const categoryNames=new Set(['installations','web','motion']);
 const sectionIds=['work',...categoryNames];
 const anchors=[...document.querySelectorAll('a[href^="#"]')];
 const getId=()=>decodeURIComponent(location.hash.replace(/^#/,''))||'work';
 const update=()=>{
   // The original site filters by hash and hides nonselected work; all projects should be readable in this editorial archive.
   document.querySelectorAll('#projects article[hidden]').forEach(el=>{el.hidden=false});
   const current=getId();
   document.querySelectorAll('#work .filters a').forEach(link=>{
      if(link.hash.slice(1)===current)link.setAttribute('aria-current','true');
      else link.removeAttribute('aria-current');
   });
 };
 function toSection(id){
   update();
   const el=document.getElementById(id);
   if(!el)return;
   el.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }
 document.addEventListener('click',event=>{
    const link=event.target.closest('a[href="#installations"], a[href="#web"], a[href="#motion"], a[href="#work"]');
    if(!link)return;
    const id=link.hash.slice(1);
    if(!sectionIds.includes(id))return;
    // Override older site scripts which scroll to #work and hide non-selected categories.
    event.preventDefault();event.stopPropagation();
    if(location.hash!==link.hash)history.pushState(null,'',link.hash);
    update();toSection(id);
 },true);
 window.addEventListener('hashchange',()=>requestAnimationFrame(update));
 window.addEventListener('popstate',()=>{update(); const id=getId();if(sectionIds.includes(id)) toSection(id)});
 // main.js is deferred before this script; its initial filter runs first.
 update();requestAnimationFrame(update);
})();
