
// ----------------- DOM -----------------
const themeSel=document.getElementById('themeSel');
const levelSel=document.getElementById('levelSel');
const modeSel=document.getElementById('modeSel');
const newGameBtn=document.getElementById('newGame');
const startPeekBtn=document.getElementById('startPeek');
const startRecallBtn=document.getElementById('startRecall');
const dailyBtn=document.getElementById('dailyBtn');
const shareBtn=document.getElementById('shareBtn');
const leaderBtn=document.getElementById('leaderBtn');
const hintBtn=document.getElementById('hintBtn');
const soundToggle=document.getElementById('soundToggle');
const vibeToggle=document.getElementById('vibeToggle');

const timeEl=document.getElementById('time');
const scoreAEl=document.getElementById('scoreA');
const scoreBEl=document.getElementById('scoreB');
const scoreBWrap=document.getElementById('scoreBWrap');
const playerALabel=document.getElementById('playerALabel');
const playerBLabel=document.getElementById('playerBLabel');
const phaseLabel=document.getElementById('phaseLabel');
const coinEl=document.getElementById('coins');

const board=document.getElementById('board');
const iconList=document.getElementById('iconList');
const achList=document.getElementById('achList');
const customBox=document.getElementById('customBox');
const customText=document.getElementById('customText');
const applyCustom=document.getElementById('applyCustom');

const endModal=document.getElementById('endModal');
const resultText=document.getElementById('resultText');
const copyResult=document.getElementById('copyResult');
const playAgain=document.getElementById('playAgain');

const leaderModal=document.getElementById('leaderModal');
const lbWrap=document.getElementById('lbWrap');
const closeLeader=document.getElementById('closeLeader');

// ----------------- STATE -----------------
let N=+levelSel.value;
let tiles=[];
let icons=[];
let mapping=new Map();
let phase='ready';
let selectedIcon=null;
let timer=null, seconds=0;
let scoreA=0, scoreB=0;
let turn='A';
let cpuSkill=0.2;
let coins=0;
let seed=''; // for daily/challenge
let customItems=[];

// ----------------- UTIL -----------------
const fmtTime = s => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
const tick = ()=>{ seconds++; timeEl.textContent=fmtTime(seconds); };
const setGrid = n => { board.style.gridTemplateColumns=`repeat(${n},1fr)`; board.style.gridTemplateRows=`repeat(${n},1fr)`; };
const pick = arr => arr[Math.floor(Math.random()*arr.length)];
function escXML(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&apos;');}

// Seeded RNG (Mulberry32)
function sfc32(a,b,c,d){return function(){a|=0;b|=0;c|=0;d|=0;let t=(a+b|0)+(d= d+1|0)|0;a=b^b>>>9;b=c+(c<<3)|0;c=(c<<21|0)|(c>>>11);c=c+(t|0)|0;return (t>>>0)/4294967296;}}
function xmur3(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),3432918353),h=h<<13|h>>>19;return function(){h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);return (h^h>>>16)>>>0;}}
function RNG(seed){const m=xmur3(seed);return sfc32(m(),m(),m(),m());}
function shuffleSeeded(arr, rnd){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()* (i+1)); [arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}

// WebAudio SFX
let audioCtx;
function ping(freq=880, dur=0.08, type='sine'){
  if(!soundToggle.checked) return;
  audioCtx = audioCtx || new (window.AudioContext||window.webkitAudioContext)();
  const o=audioCtx.createOscillator(), g=audioCtx.createGain();
  o.type=type; o.frequency.value=freq; o.connect(g); g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.001,audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.2,audioCtx.currentTime+0.01);
  g.gain.exponentialRampToValueAtTime(0.001,audioCtx.currentTime+dur);
  o.start(); o.stop(audioCtx.currentTime+dur);
}

function vibrate(ms){ if(vibeToggle.checked && navigator.vibrate) navigator.vibrate(ms); }

// ----------------- DATA (names only) -----------------
const COUNTRY_LIST = ["India","United States","China","Japan","Germany","France","United Kingdom","Italy","Canada","Australia","Brazil","Russia","Mexico","Indonesia","Saudi Arabia","South Africa","Spain","Netherlands","Switzerland","Turkey","Argentina","Poland","Sweden","Norway","Denmark","UAE","Singapore","Malaysia","Thailand","Vietnam","Bangladesh","Pakistan","Sri Lanka","Nepal","Philippines","Nigeria","Egypt","Kenya","Ethiopia","Israel","Qatar","Finland","Ireland","Portugal","Greece","New Zealand","Chile","Colombia","Peru"];
const PERSON_LIST = ["Cristiano Ronaldo","Elon Musk","Donald Trump","Narendra Modi","Virat Kohli","Shah Rukh Khan","Jeff Bezos","Bill Gates","Gautam Adani","Mukesh Ambani","Lionel Messi","Amitabh Bachchan","APJ Abdul Kalam","MS Dhoni","Sundar Pichai","Satya Nadella","Ratan Tata","A R Rahman","Deepika Padukone","Priyanka Chopra"];
const CURRENCY_LIST = [
  {code:"INR", sym:"₹"}, {code:"USD", sym:"$"}, {code:"EUR", sym:"€"}, {code:"JPY", sym:"¥"},
  {code:"GBP", sym:"£"}, {code:"CNY", sym:"¥"}, {code:"AUD", sym:"$"}, {code:"CAD", sym:"$"},
  {code:"CHF", sym:"Fr"}, {code:"RUB", sym:"₽"}, {code:"BRL", sym:"R$"}, {code:"ZAR", sym:"R"},
  {code:"MXN", sym:"$"}, {code:"KRW", sym:"₩"}, {code:"TRY", sym:"₺"}, {code:"SEK", sym:"kr"},
  {code:"NOK", sym:"kr"}, {code:"DKK", sym:"kr"}, {code:"PLN", sym:"zł"}, {code:"AED", sym:"د.إ"},
  {code:"SAR", sym:"﷼"}, {code:"EGP", sym:"£"}, {code:"ILS", sym:"₪"}, {code:"SGD", sym:"$"},
  {code:"MYR", sym:"RM"}, {code:"THB", sym:"฿"}, {code:"VND", sym:"₫"}, {code:"NGN", sym:"₦"}
];

// ----------------- THEMES -----------------
function genIcons(theme, count, rnd){
  const out=[];
  for(let i=0;i<count;i++){
    const hue=Math.floor((rnd?rnd():Math.random())*360);
    if(theme==='shapes'){ out.push({theme,type:pick(['circle','square','triangle','star','diamond','ring']), hue}); }
    else if(theme==='flags'){ out.push({theme,type:'flag_abstract', label:COUNTRY_LIST[i%COUNTRY_LIST.length], hue}); }
    else if(theme==='gods'){ out.push({theme,type:'sacred', label:pick(['Om','Trishul','Chakra','Diya','Lotus','Veena','Flute','Gada']), hue}); }
    else if(theme==='currencies'){ const c=CURRENCY_LIST[i% CURRENCY_LIST.length]; out.push({theme,type:'currency', label:c.code, sub:c.sym, hue}); }
    else if(theme==='numbers'){ out.push({theme,type:'number', label:`${i+1}`, hue}); }
    else if(theme==='math'){ out.push({theme,type:'math', label:pick(['+','−','×','÷','=','%','>','<','±','≈']), hue}); }
    else if(theme==='famous'){ out.push({theme,type:'person', label:PERSON_LIST[i%PERSON_LIST.length], hue}); }
    else if(theme==='ai'){ out.push({theme,type:pick(['chip','brain','network','bot']), hue}); }
    else if(theme==='cars'){ out.push({theme,type:pick(['car','car_low','car_suv','truck']), hue}); }
    else if(theme==='heroes'){ out.push({theme,type:pick(['shield','cape','mask','bolt']), hue}); }
    else if(theme==='heroines'){ out.push({theme,type:pick(['tiara','heart','flower','butterfly']), hue}); }
    else if(theme==='cartoons'){ out.push({theme,type:pick(['smile','wink','glasses','mustache']), hue}); }
    else if(theme==='foods'){ out.push({theme,type:pick(['apple','pizza','ice','egg']), hue}); }
    else if(theme==='custom'){ const lbl = (customItems[i%customItems.length]||`Item ${i+1}`); out.push({theme,type:'number', label:lbl, hue}); }
    else { out.push({theme:'shapes',type:'circle',hue}); }
  }
  return out;
}

const svgWrap = (inner, hue, label=null)=> {
  const color2=`hsl(${(hue+40)%360},85%,50%)`;
  const text = label ? `<foreignObject x="5" y="72" width="90" height="24"><div xmlns="http://www.w3.org/1999/xhtml" style="font-size:11px;color:#dbeafe;text-align:center;opacity:.95;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escXML(label)}</div></foreignObject>` : '';
  return 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g" cx="30%" cy="30%"><stop offset="0%" stop-color="${color2}"/><stop offset="100%" stop-color="transparent"/></radialGradient></defs><rect width="100" height="100" fill="url(#g)"/>${inner}${text}</svg>`);
};
function c(h){ return `hsl(${h},80%,60%)`; }

function drawIconSVG(def){
  const t=def.type, h=def.hue;
  if(t==='circle') return svgWrap(`<circle cx="50" cy="50" r="34" fill="${c(h)}"/>`, h);
  if(t==='square') return svgWrap(`<rect x="20" y="20" width="60" height="60" rx="14" fill="${c(h)}"/>`, h);
  if(t==='triangle') return svgWrap(`<polygon points="50,16 84,84 16,84" fill="${c(h)}"/>`, h);
  if(t==='star') return svgWrap(`<polygon points="50,12 60,38 88,38 64,54 72,82 50,66 28,82 36,54 12,38 40,38" fill="${c(h)}"/>`, h);
  if(t==='diamond') return svgWrap(`<polygon points="50,10 90,50 50,90 10,50" fill="${c(h)}"/>`, h);
  if(t==='ring') return svgWrap(`<circle cx="50" cy="50" r="30" fill="none" stroke="${c(h)}" stroke-width="12"/>`, h);
  if(t==='flag_abstract'){ const col=c(h), col2=c((h+80)%360), col3=c((h+160)%360); const inner=`<rect x="12" y="20" width="76" height="44" rx="6" fill="${col}"/><rect x="12" y="44" width="76" height="20" fill="${col2}"/><circle cx="32" cy="42" r="8" fill="${col3}"/>`; return svgWrap(inner, h, def.label); }
  if(t==='sacred'){ let inner=''; if(def.label==='Om') inner=`<text x="50" y="54" text-anchor="middle" font-size="42" fill="${c(h)}" font-family="serif">ॐ</text>`; if(def.label==='Trishul') inner=`<path d="M50 18 L50 86" stroke="${c(h)}" stroke-width="6"/><path d="M30 30 C38 26 38 40 30 46" stroke="${c(h)}" stroke-width="4" fill="none"/><path d="M70 30 C62 26 62 40 70 46" stroke="${c(h)}" stroke-width="4" fill="none"/>`; if(def.label==='Chakra') inner=`<circle cx="50" cy="50" r="30" fill="none" stroke="${c(h)}" stroke-width="6"/><line x1="50" y1="20" x2="50" y2="80" stroke="${c(h)}" stroke-width="3"/><line x1="20" y1="50" x2="80" y2="50" stroke="${c(h)}" stroke-width="3"/>`; if(def.label==='Diya') inner=`<ellipse cx="50" cy="66" rx="24" ry="10" fill="${c(h)}"/><path d="M50 34 C60 40 60 56 50 56 C40 56 40 40 50 34 Z" fill="#f97316"/>`; if(def.label==='Lotus') inner=`<path d="M20 66 C34 52 46 52 50 66 C54 52 66 52 80 66 Z" fill="${c(h)}"/>`; if(def.label==='Veena') inner=`<rect x="24" y="58" width="52" height="8" rx="4" fill="${c(h)}"/><circle cx="28" cy="62" r="10" fill="${c(h)}"/>`; if(def.label==='Flute') inner=`<rect x="20" y="58" width="60" height="6" rx="3" fill="${c(h)}"/><circle cx="40" cy="61" r="2" fill="#111"/><circle cx="50" cy="61" r="2" fill="#111"/><circle cx="60" cy="61" r="2" fill="#111"/>`; if(def.label==='Gada') inner=`<rect x="48" y="24" width="4" height="40" fill="${c(h)}"/><circle cx="50" cy="70" r="12" fill="${c(h)}"/>`; return svgWrap(inner, h, def.label); }
  if(t==='currency'){ const inner=`<rect x="18" y="30" width="64" height="36" rx="6" fill="${c(h)}"/><circle cx="38" cy="48" r="10" fill="#0b1228"/><text x="62" y="52" text-anchor="middle" font-size="18" fill="#0b1228" font-family="sans-serif">${escXML(def.sub||'')}</text>`; return svgWrap(inner, h, def.label); }
  if(t==='number') return svgWrap(`<rect x="22" y="20" width="56" height="56" rx="10" fill="${c(h)}"/>`, h, def.label);
  if(t==='math') return svgWrap(`<circle cx="50" cy="50" r="28" fill="${c(h)}"/><text x="50" y="58" text-anchor="middle" font-size="34" fill="#0b1228" font-family="sans-serif">${escXML(def.label)}</text>`, h);
  if(t==='person'){ const inner=`<circle cx="50" cy="42" r="14" fill="${c(h)}"/><rect x="34" y="58" width="32" height="16" rx="8" fill="${c(h)}"/>`; return svgWrap(inner, h, def.label); }
  if(t==='chip') return svgWrap(`<rect x="22" y="22" width="56" height="56" rx="8" fill="${c(h)}"/><rect x="36" y="36" width="28" height="28" rx="6" fill="#0b1228"/><g stroke="${c(h)}" stroke-width="3"><line x1="22" y1="30" x2="10" y2="30"/><line x1="22" y1="70" x2="10" y2="70"/><line x1="78" y1="30" x2="90" y2="30"/><line x1="78" y1="70" x2="90" y2="70"/></g>`, h);
  if(t==='brain') return svgWrap(`<path d="M40 34 C28 34 28 54 40 54 C28 54 28 74 40 74" stroke="${c(h)}" stroke-width="6" fill="none"/><path d="M60 34 C72 34 72 54 60 54 C72 54 72 74 60 74" stroke="${c(h)}" stroke-width="6" fill="none"/>`, h);
  if(t==='network') return svgWrap(`<circle cx="50" cy="50" r="6" fill="${c(h)}"/><circle cx="20" cy="30" r="6" fill="${c(h)}"/><circle cx="80" cy="30" r="6" fill="${c(h)}"/><circle cx="20" cy="70" r="6" fill="${c(h)}"/><circle cx="80" cy="70" r="6" fill="${c(h)}"/><g stroke="${c(h)}" stroke-width="3"><line x1="50" y1="50" x2="20" y2="30"/><line x1="50" y1="50" x2="80" y2="30"/><line x1="50" y1="50" x2="20" y2="70"/><line x1="50" y1="50" x2="80" y2="70"/></g>`, h);
  if(t==='bot') return svgWrap(`<rect x="30" y="34" width="40" height="32" rx="8" fill="${c(h)}"/><circle cx="44" cy="50" r="4" fill="#111"/><circle cx="56" cy="50" r="4" fill="#111"/><rect x="46" y="22" width="8" height="8" rx="2" fill="${c(h)}"/>`, h);
  if(t==='car') return svgWrap(`<rect x="18" y="44" width="64" height="18" rx="6" fill="${c(h)}"/><rect x="28" y="34" width="30" height="12" rx="4" fill="${c(h)}"/><circle cx="30" cy="68" r="8" fill="#111"/><circle cx="70" cy="68" r="8" fill="#111"/>`, h);
  if(t==='car_low') return svgWrap(`<rect x="18" y="48" width="64" height="14" rx="6" fill="${c(h)}"/><rect x="36" y="38" width="26" height="10" rx="3" fill="${c(h)}"/><circle cx="30" cy="66" r="7" fill="#111"/><circle cx="70" cy="66" r="7" fill="#111"/>`, h);
  if(t==='car_suv') return svgWrap(`<rect x="16" y="42" width="68" height="22" rx="4" fill="${c(h)}"/><rect x="26" y="32" width="38" height="12" rx="2" fill="${c(h)}"/><circle cx="32" cy="68" r="8" fill="#111"/><circle cx="72" cy="68" r="8" fill="#111"/>`, h);
  if(t==='truck') return svgWrap(`<rect x="14" y="44" width="44" height="18" rx="2" fill="${c(h)}"/><rect x="58" y="48" width="26" height="14" rx="2" fill="${c(h)}"/><circle cx="26" cy="66" r="7" fill="#111"/><circle cx="64" cy="66" r="7" fill="#111"/>`, h);
  if(t==='shield') return svgWrap(`<path d="M50 12 L72 20 Q76 46 50 88 Q24 46 28 20 Z" fill="${c(h)}"/>`, h);
  if(t==='cape') return svgWrap(`<path d="M28 18 Q40 22 52 18 Q70 30 80 64 Q60 70 40 88 Q22 58 20 34 Z" fill="${c(h)}"/>`, h);
  if(t==='mask') return svgWrap(`<rect x="18" y="36" width="64" height="16" rx="8" fill="${c(h)}"/><circle cx="36" cy="44" r="6" fill="#111"/><circle cx="64" cy="44" r="6" fill="#111"/>`, h);
  if(t==='bolt') return svgWrap(`<polygon points="44,12 76,42 54,42 72,88 26,50 48,50" fill="${c(h)}"/>`, h);
  if(t==='tiara') return svgWrap(`<path d="M16 66 Q50 20 84 66 Z" fill="${c(h)}"/><circle cx="50" cy="42" r="8" fill="#fff6"/>`, h);
  if(t==='heart') return svgWrap(`<path d="M50 78 L20 48 Q20 28 38 28 Q50 28 50 40 Q50 28 62 28 Q80 28 80 48 Z" fill="${c(h)}"/>`, h);
  if(t==='flower') return svgWrap(`<circle cx="50" cy="50" r="8" fill="#ffd966"/><circle cx="50" cy="32" r="12" fill="${c(h)}"/><circle cx="68" cy="50" r="12" fill="${c(h)}"/><circle cx="50" cy="68" r="12" fill="${c(h)}"/><circle cx="32" cy="50" r="12" fill="${c(h)}"/>`, h);
  if(t==='butterfly') return svgWrap(`<path d="M50 50 C30 24 18 24 22 46 C26 70 38 70 50 50 C62 70 74 70 78 46 C82 24 70 24 50 50 Z" fill="${c(h)}"/>`, h);
  if(t==='smile') return svgWrap(`<circle cx="50" cy="50" r="32" fill="${c(h)}"/><circle cx="40" cy="44" r="4" fill="#111"/><circle cx="60" cy="44" r="4" fill="#111"/><path d="M36 56 Q50 70 64 56" stroke="#111" stroke-width="4" fill="none"/>`, h);
  if(t==='wink') return svgWrap(`<circle cx="50" cy="50" r="32" fill="${c(h)}"/><rect x="36" y="42" width="10" height="3" fill="#111"/><circle cx="60" cy="44" r="4" fill="#111"/><path d="M36 58 Q50 68 64 58" stroke="#111" stroke-width="4" fill="none"/>`, h);
  if(t==='glasses') return svgWrap(`<circle cx="38" cy="48" r="8" fill="none" stroke="#111" stroke-width="4"/><circle cx="62" cy="48" r="8" fill="none" stroke="#111" stroke-width="4"/><rect x="46" y="46" width="8" height="4" fill="#111"/>`, h);
  if(t==='mustache') return svgWrap(`<path d="M30 58 C36 52 44 52 50 58 C56 52 64 52 70 58" stroke="#111" stroke-width="6" fill="none" stroke-linecap="round"/>`, h);
  if(t==='apple') return svgWrap(`<circle cx="52" cy="56" r="20" fill="${c(h)}"/><rect x="48" y="26" width="4" height="12" fill="#654321"/><path d="M52 28 C60 24 66 30 64 34 C60 34 56 32 52 28 Z" fill="#2ecc71"/>`, h);
  if(t==='pizza') return svgWrap(`<path d="M50 20 L82 80 L18 80 Z" fill="#f59e0b"/><circle cx="56" cy="60" r="4" fill="#b91c1c"/><circle cx="44" cy="64" r="4" fill="#b91c1c"/><circle cx="62" cy="72" r="4" fill="#b91c1c"/>`, h);
  if(t==='ice') return svgWrap(`<rect x="40" y="26" width="20" height="34" rx="10" fill="${c(h)}"/><rect x="48" y="60" width="4" height="14" fill="#8d6e63"/>`, h);
  if(t==='egg') return svgWrap(`<ellipse cx="50" cy="54" rx="18" ry="24" fill="#fde68a"/><circle cx="50" cy="60" r="8" fill="#f59e0b"/>`, h);
  return svgWrap(`<circle cx="50" cy="50" r="34" fill="${c(h)}"/>`, h);
}

// ----------------- GAME CORE -----------------
function setupGame(opts={}){
  N=+levelSel.value; setGrid(N);
  const total=N*N;

  // Seed handling (for Daily/Share)
  const url = new URL(location.href);
  seed = opts.seed || url.searchParams.get('seed') || '';
  const useSeed = seed && seed.length>0;
  const rnd = useSeed ? RNG(seed) : null;

  // Custom list UI
  if(themeSel.value==='custom') customBox.classList.remove('hidden'); else customBox.classList.add('hidden');

  icons = genIcons(themeSel.value, total, rnd);
  tiles=[...Array(total).keys()]; mapping.clear();

  let idxs=[...Array(total).keys()];
  if(useSeed){ idxs = shuffleSeeded(idxs, rnd); } else { idxs.sort(()=>Math.random()-0.5); }
  for(let i=0;i<total;i++) mapping.set(i, idxs[i]);

  renderBoard(true); renderIconList();
  selectedIcon=null; seconds=0; timeEl.textContent='00:00'; if(timer){clearInterval(timer); timer=null;}
  scoreA=0; scoreB=0; scoreAEl.textContent=0; scoreBEl.textContent=0;
  coins = +localStorage.getItem('p3025.coins') || 0; coinEl.textContent=coins.toString();
  phase='ready'; phaseLabel.textContent= useSeed ? `Ready • Seed ${seed}` : 'Ready'; turn='A';
  const m=modeSel.value;
  if(m==='solo'){ scoreBWrap.classList.add('hidden'); playerALabel.textContent='(You)'; }
  else if(m==='pvp'){ scoreBWrap.classList.remove('hidden'); playerALabel.textContent='(P1)'; playerBLabel.textContent='(P2)'; }
  else { scoreBWrap.classList.remove('hidden'); playerALabel.textContent='(You)'; playerBLabel.textContent='(CPU)'; cpuSkill=(m==='cpu_e')?0.2:(m==='cpu_m')?0.45:0.7; }
  startPeekBtn.disabled=false; startRecallBtn.disabled=true;
  refreshAch();
}

function renderBoard(covered){
  board.innerHTML='';
  for(let i=0;i<tiles.length;i++){
    const tile=document.createElement('div'); tile.className='tile';
    const icon=document.createElement('img'); icon.className='icon'; icon.src = drawIconSVG(icons[mapping.get(i)]);
    const cover=document.createElement('div'); cover.className='cover'; cover.textContent='Tap';
    tile.appendChild(icon); tile.appendChild(cover);
    if(!covered){ tile.classList.add('revealed'); cover.style.opacity=0; }
    tile.addEventListener('click', ()=> onTile(i, tile));
    board.appendChild(tile);
  }
}

function renderIconList(){
  iconList.innerHTML='';
  for(let i=0;i<icons.length;i++){
    const btn=document.createElement('button'); btn.className='iconbtn'; btn.dataset.icon=i;
    const img=document.createElement('img'); img.src=drawIconSVG(icons[i]); img.style.width='70%'; img.style.height='70%';
    const label=document.createElement('small'); label.textContent = icons[i].label || '';
    btn.appendChild(img); btn.appendChild(label);
    btn.addEventListener('click', ()=>{ [...iconList.children].forEach(x=>x.classList.remove('selected')); btn.classList.add('selected'); selectedIcon=i; });
    iconList.appendChild(btn);
  }
}

function startPeek(){ if(timer) clearInterval(timer); seconds=0; timeEl.textContent='00:00'; timer=setInterval(tick,1000); phase='peek'; phaseLabel.textContent='Peek'; startPeekBtn.disabled=true; startRecallBtn.disabled=false; }
function startRecall(){ if(!timer){ timer=setInterval(tick,1000); } phase='recall'; phaseLabel.textContent=(modeSel.value==='solo')?'Recall':`Recall — Turn ${turn}`; startRecallBtn.disabled=true; [...board.children].forEach(t=>t.classList.remove('revealed')); }

function flashTile(el, cls){ el.classList.add('flip',cls); setTimeout(()=>el.classList.remove('flip',cls),260); if(cls==='correct'){ping(880,0.07,'triangle'); vibrate(20);} else {ping(220,0.05,'square'); vibrate(8);} }
function pulseIcons(){ iconList.animate([{transform:'scale(1)'},{transform:'scale(1.03)'},{transform:'scale(1)'}],{duration:300}); }

function onTile(i, el){
  if(phase==='ready') return;
  if(phase==='peek'){ el.classList.toggle('revealed'); return; }
  if(phase==='recall'){
    if(selectedIcon==null){ pulseIcons(); return; }
    const correct = (mapping.get(i)===selectedIcon);
    flashTile(el, correct?'correct':'wrong');
    if(correct){
      el.classList.add('revealed');
      const btn=[...iconList.children].find(b=>+b.dataset.icon===selectedIcon);
      if(btn){ btn.disabled=true; btn.classList.remove('selected'); btn.style.opacity=.5; }
      addScore('A', 10); selectedIcon=null;
      coins += 1; coinEl.textContent=coins; localStorage.setItem('p3025.coins', coins.toString());
    } else { addScore('A', -3); }
    nextTurn(correct); checkEnd();
  }
}

function addScore(_, pts){
  const m=modeSel.value;
  if(m==='solo'){ scoreA+=pts; scoreAEl.textContent=scoreA; return; }
  if(turn==='A'){ scoreA+=pts; scoreAEl.textContent=scoreA; } else { scoreB+=pts; scoreBEl.textContent=scoreB; }
}

function nextTurn(correct){
  const m=modeSel.value; if(m==='solo') return;
  if(!correct){ turn = (turn==='A')?'B':'A'; phaseLabel.textContent=`Recall — Turn ${turn}`; }
  if(turn==='B' && m!=='pvp'){ setTimeout(cpuMove, 600); }
}

function cpuMove(){
  const availableIcons=[...iconList.children].filter(b=>!b.disabled).map(b=>+b.dataset.icon);
  if(availableIcons.length===0) return;
  let pickIcon = availableIcons[Math.floor(Math.random()*availableIcons.length)];
  if(Math.random()<cpuSkill){
    const unrevealed=[...board.children].map((t,i)=>({t,i})).filter(o=>!o.t.classList.contains('revealed'));
    const choice=unrevealed[Math.floor(Math.random()*unrevealed.length)];
    pickIcon = mapping.get(choice.i);
    const btn=[...iconList.children].find(b=>+b.dataset.icon===pickIcon); if(btn){btn.classList.add('selected');}
    selectedIcon=pickIcon; onTile(choice.i, choice.t);
  } else {
    const unrevealed=[...board.children].map((t,i)=>({t,i})).filter(o=>!o.t.classList.contains('revealed'));
    const choice=unrevealed[Math.floor(Math.random()*unrevealed.length)];
    const btn=[...iconList.children].find(b=>+b.dataset.icon===pickIcon); if(btn){btn.classList.add('selected');}
    selectedIcon=pickIcon; onTile(choice.i, choice.t);
  }
}

function checkEnd(){
  const allRev = [...board.children].every(t=>t.classList.contains('revealed'));
  if(allRev){
    phase='done'; if(timer){clearInterval(timer); timer=null;}
    const total=icons.length; const maxScore=total*10;
    const info = {theme: themeSel.value, grid: N, mode: modeSel.value, seed: seed, time: seconds, score: scoreA};
    saveLeaderboard(info);
    const rank = (scoreA>=0.9*maxScore?'S':scoreA>=0.75*maxScore?'A':scoreA>=0.6*maxScore?'B':'C');
    const msg = `Theme ${themeSel.value} • ${N}×${N} • ${seed?`Seed ${seed} • `:''}Time ${fmtTime(seconds)} • Score ${scoreA} • Rank ${rank}`;
    resultText.textContent = msg;
    evaluateAchievements(seconds, scoreA, maxScore);
    endModal.classList.remove('hidden');
  }
}

// ----------------- DAILY / SHARE -----------------
function todaySeed(){
  const d=new Date();
  return `${d.getUTCFullYear()}-${(d.getUTCMonth()+1).toString().padStart(2,'0')}-${d.getUTCDate().toString().padStart(2,'0')}`;
}
function startDaily(){ setupGame({seed: todaySeed()}); }
function shareLink(){
  const u = new URL(location.href);
  u.searchParams.set('seed', seed || todaySeed());
  u.searchParams.set('grid', N);
  u.searchParams.set('theme', themeSel.value);
  return u.toString();
}
shareBtn.addEventListener('click', ()=>{ if(!seed) seed=todaySeed(); navigator.clipboard.writeText(shareLink()); alert('Link copied! Share with friends.'); });
dailyBtn.addEventListener('click', ()=> startDaily());

// ----------------- HINT (coins) -----------------
hintBtn.addEventListener('click', ()=>{
  if(phase!=='recall'){ alert('Hints are available during Recall.'); return; }
  if(coins<5){ alert('Not enough coins. Earn by correct matches.'); return; }
  const unrevealed=[...board.children].map((t,i)=>({t,i})).filter(o=>!o.t.classList.contains('revealed'));
  if(unrevealed.length===0) return;
  coins -= 5; coinEl.textContent=coins; localStorage.setItem('p3025.coins', coins.toString());
  const choice = unrevealed[Math.floor(Math.random()*unrevealed.length)];
  const idx = mapping.get(choice.i);
  // Auto-select correct icon and reveal
  const btn=[...iconList.children].find(b=>+b.dataset.icon===idx);
  if(btn){ btn.classList.add('selected'); selectedIcon=idx; }
  onTile(choice.i, choice.t);
});

// ----------------- ACHIEVEMENTS -----------------
const ACHS = [
  {id:'rankS', label:'Rank S', test:(s,max)=> s>=0.9*max},
  {id:'fast',  label:'Under 2:00', test:(s,max,sec)=> sec<=120},
  {id:'perfect', label:'No mistakes', test:(s,max,sec)=> lastMistakes===0},
  {id:'daily3', label:'3 Dailies', test:(s,max,sec)=> (+localStorage.getItem('p3025.dailyWins')||0)>=3 },
];
let lastMistakes=0;
function evaluateAchievements(sec, score, max){
  const key='p3025.achs'; const got = JSON.parse(localStorage.getItem(key)||'[]');
  const before = new Set(got);
  ACHS.forEach(a=>{ if(!before.has(a.id) && a.test(score,max,sec)) before.add(a.id); });
  localStorage.setItem(key, JSON.stringify([...before]));
  if(seed){ const wins= (+localStorage.getItem('p3025.dailyWins')||0)+1; localStorage.setItem('p3025.dailyWins', wins.toString()); }
  refreshAch();
}
function refreshAch(){
  const got = new Set(JSON.parse(localStorage.getItem('p3025.achs')||'[]'));
  achList.innerHTML=''; ACHS.forEach(a=>{ const li=document.createElement('li'); li.textContent = (got.has(a.id)?'✅ ':'⬜ ') + a.label; achList.appendChild(li); });
}

// Track mistakes
function addScoreWrapper(original){
  return function(role, pts){ if(pts<0) lastMistakes++; return original(role, pts); }
}
addScore = addScoreWrapper(addScore);

// ----------------- LEADERBOARD (local) -----------------
function lbKey(){ return `p3025.lb.${themeSel.value}.${N}`; }
function saveLeaderboard(info){
  const arr = JSON.parse(localStorage.getItem(lbKey())||'[]');
  arr.push({t:Date.now(), ...info});
  arr.sort((a,b)=> a.time-b.time || b.score-a.score); // fast time first, then score
  localStorage.setItem(lbKey(), JSON.stringify(arr.slice(0,20)));
}
function showLeaderboard(){
  const arr = JSON.parse(localStorage.getItem(lbKey())||'[]');
  let html = `<table class="lb"><tr><th>#</th><th>Time</th><th>Score</th><th>Mode</th><th>Seed</th><th>Date</th></tr>`;
  arr.forEach((r,i)=>{ html += `<tr><td>${i+1}</td><td>${fmtTime(r.time)}</td><td>${r.score}</td><td>${r.mode}</td><td>${escXML(r.seed||'—')}</td><td>${new Date(r.t).toLocaleDateString()}</td></tr>`; });
  html += `</table>`; lbWrap.innerHTML = html; leaderModal.classList.remove('hidden');
}
leaderBtn.addEventListener('click', showLeaderboard);
closeLeader.addEventListener('click', ()=> leaderModal.classList.add('hidden'));

// ----------------- EVENTS -----------------
newGameBtn.addEventListener('click', ()=> setupGame({seed:''}));
startPeekBtn.addEventListener('click', startPeek);
startRecallBtn.addEventListener('click', startRecall);
playAgain.addEventListener('click', ()=>{ endModal.classList.add('hidden'); setupGame({seed}); });
copyResult.addEventListener('click', ()=>{ navigator.clipboard.writeText(resultText.textContent + ' • ' + shareLink()); alert('Copied!'); });

themeSel.addEventListener('change', ()=>{
  if(themeSel.value==='custom'){ customBox.classList.remove('hidden'); }
  else customBox.classList.add('hidden');
  setupGame({seed:''});
});
levelSel.addEventListener('change', ()=> setupGame({seed:''}));
modeSel.addEventListener('change', ()=> setupGame({seed:''}));
applyCustom.addEventListener('click', ()=>{
  customItems = customText.value.split(/\n+/).map(s=>s.trim()).filter(Boolean);
  if(customItems.length===0){ alert('Paste at least one line.'); return; }
  setupGame({seed:''});
});

// Parse URL params for seed/theme/grid
(function initFromURL(){
  const p=new URL(location.href).searchParams;
  const s=p.get('seed'); const grid=p.get('grid'); const theme=p.get('theme');
  if(theme){ themeSel.value=theme; }
  if(grid){ levelSel.value = (grid==='6'?'6': grid==='4'?'4':'5'); }
  if(s){ seed=s; }
})();

setupGame({seed});
