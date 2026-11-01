import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const artifactDir=path.dirname(fileURLToPath(import.meta.url));
const projectDir=path.resolve(artifactDir,'..');
const mode=process.argv[2];
if(!['baseline','modified'].includes(mode))throw new Error('Usage: node verify.mjs baseline|modified [html-path]');
const defaultFile=path.join(artifactDir,mode==='baseline'?'original.html':'MODIFIED_FILE.html');
const file=path.resolve(process.argv[3]||defaultFile);
const html=fs.readFileSync(file,'utf8');
const original=fs.readFileSync(path.join(artifactDir,'original.html'),'utf8');
const fail=message=>{console.error(`FAIL ${message}`);process.exit(1)};
const block=(source,start,end)=>{const a=source.indexOf(start);if(a<0)return null;const b=source.indexOf(end,a+start.length);return b<0?null:source.slice(a,b+end.length)};
const header=s=>block(s,'<header id="hd">','</header>');
const heroCss=s=>block(s,'/* hero */','/* areas */');
const heroMarkup=s=>block(s,'<section id="inicio" class="hero">','</section>');
const heroValues=s=>[...s.matchAll(/--hero:url\("data:image\/webp;base64,[^"]+"\)/g)].map(m=>m[0]);
const dataImages=s=>[...s.matchAll(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/g)].map(m=>m[0]);
const scriptSources=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)];
try{if(!scriptSources.length)throw new Error('no inline scripts');scriptSources.forEach((script,i)=>new vm.Script(script[1],{filename:`inline-${i+1}.js`}))}catch(error){fail(`inline_js_syntax ${error.message}`)}
if(header(original)!==header(html))fail('header changed');
if(heroCss(original)!==heroCss(html))fail('hero CSS changed');
if(heroMarkup(original)!==heroMarkup(html))fail('hero markup changed');
if(JSON.stringify(heroValues(original))!==JSON.stringify(heroValues(html)))fail('--hero values changed');
if(JSON.stringify(dataImages(original))!==JSON.stringify(dataImages(html)))fail('embedded image payload changed');
const stripInlineMotion=s=>s.replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi,'<style></style>').replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi,'<script></script>');
if(stripInlineMotion(original)!==stripInlineMotion(html))fail('HTML markup outside inline CSS/JS changed');
if(mode==='baseline'){
  if(!html.includes('.js .rv{opacity:0;transform:translateY(22px)')||!html.includes("$$('.rv').forEach(el=>io.observe(el))")||html.includes('parallax-ready'))fail('unexpected baseline motion state');
  console.log('mode=baseline');
  console.log(`file=${file}`);
  console.log('STATIC header=PASS');
  console.log('STATIC hero_css=PASS');
  console.log('STATIC hero_markup=PASS');
  console.log(`STATIC hero_values=${heroValues(original).length};unchanged=PASS`);
  console.log('STATIC inline_js_syntax=PASS');
  console.log('STATIC baseline_motion=single_rv_observer');
  console.log('STATIC baseline_state=PASS');
  process.exit(0);
}
const required=[
  ['individual reveals',html.includes('.motion-ready .reveal-item{')&&html.includes('.motion-ready .reveal-item.revealed{')],
  ['stagger cap',html.includes('Math.min(index*step,180)')],
  ['small-screen displacement',html.includes('@media(max-width:760px){.motion-ready .reveal-item{--reveal-y:18px}}')],
  ['reduced-motion CSS/runtime',html.includes('@media(prefers-reduced-motion:reduce){.motion-ready .reveal-item{opacity:1;translate:0 0;transition:none}')&&html.includes('watchMedia(reduceMotionQuery,onReducedMotionChange)')],
  ['no-IO visible fallback',html.includes("typeof IntersectionObserver!=='function'")&&html.includes("motionTargets.forEach(el=>el.classList.add('revealed'))")],
  ['focus/hash reveal',html.includes("addEventListener('focusin'")&&html.includes("addEventListener('hashchange',revealHashTarget)")&&html.includes("reveal-immediate")],
  ['individual section targets',html.includes("revealGroup('#areas .ac'")&&html.includes("revealGroup('#sobre .vi'")&&html.includes("revealGroup('#depoimentos .tc'")&&html.includes("revealGroup('#contato .fs .fi'")],
  ['office cards in groups',html.includes("revealGroup('#escritorio .office-main, #escritorio .office-logo'")&&html.includes("revealGroup('#escritorio .office-details .office-card'")],
  ['desktop fine-pointer parallax',html.includes("matchMedia('(min-width: 761px) and (pointer: fine)')")&&html.includes("$('#escritorio .office-main .office-image img')")],
  ['visible on-demand RAF',html.includes("rootMargin:'14% 0px 14% 0px'")&&html.includes("addEventListener('scroll',onParallaxScroll,{passive:true})")&&html.includes('requestAnimationFrame(()=>{parallaxFrame=0;')],
  ['parallax reduced-motion teardown',html.includes('!reduceMotionQuery.matches&&desktopFineQuery.matches')&&html.includes("removeEventListener('scroll',onParallaxScroll)")],
  ['parallax overscan',html.includes('scale:1.045;translate:0 var(--parallax-y,0px)')&&html.includes('Math.max(-6,Math.min(6,-progress*6)')],
  ['card hover transitions',html.includes('.motion-ready .ac.reveal-item:not(.reveal-immediate):not(:focus-within){transition:opacity')&&html.includes('transform .3s,box-shadow .3s')&&html.includes('transition-delay:var(--reveal-delay,0ms),var(--reveal-delay,0ms),0s,0s')&&html.includes('@media(prefers-reduced-motion:reduce){.motion-ready .reveal-item{opacity:1;translate:0 0;transition:none}.motion-ready .ac.reveal-item:not(.reveal-immediate):not(:focus-within){transition:none}')]
];
const missing=required.filter(([,pass])=>!pass).map(([name])=>name);
if(missing.length)fail(`motion requirements ${missing.join(',')}`);
console.log('mode=modified');
console.log(`file=${file}`);
console.log('STATIC header=PASS');
console.log('STATIC hero_css=PASS');
console.log('STATIC hero_markup=PASS');
console.log(`STATIC hero_values=${heroValues(html).length};unchanged=PASS`);
console.log('STATIC inline_js_syntax=PASS');
console.log('STATIC markup_outside_css_js=UNCHANGED');
console.log('STATIC individual_reveals=PASS');
console.log('STATIC stagger=PASS;cap=180ms');
console.log('STATIC reduced_motion_css_and_listener=PASS');
console.log('STATIC fallback_no_IO=VISIBLE');
console.log('STATIC focus_and_hash=IMMEDIATE');
console.log('STATIC parallax=office_main_only;desktop_fine_pointer;visible_passive_RAF');
console.log('STATIC parallax_scale=1.045;offset_limit=6px;overscan=PASS');
console.log('STATIC card_hover_transitions=PASS');
console.log('STATIC parallax_reduced_motion=OFF');
console.log('STATIC embedded_images=UNCHANGED');