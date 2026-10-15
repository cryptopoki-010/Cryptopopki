/* 엘리베이터 런 (Elevator Run) — 1인칭 공포 탈출. 의존성 없는 캔버스 레이캐스터.
   index.html 에서 import('./elevator.js').then(m=>m.openElevator({toast,onClose})) */
const CSS = "#elv{position:fixed;inset:0;z-index:9500;background:#030406;color:#cfd8d0;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font-family:'Noto Sans KR',system-ui,sans-serif;overflow:hidden;--ink:#cfd8d0;--dim:#8a968e;--red:#d83a3a;--yel:#e8c040;--grn:#16e07a;--panel:#0d1216e6;--line:#2a3a3a}\n#elv *{box-sizing:border-box}\n#elv canvas{position:absolute;inset:0;width:100%;height:100%;display:block;background:#000;image-rendering:auto}\n#elv [hidden]{display:none!important}\n#elv #vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at center,transparent 45%,#000b 100%)}\n#elv #hurt{position:absolute;inset:0;pointer-events:none;opacity:0;background:radial-gradient(ellipse at center,transparent 25%,#c00a 100%)}\n#elv #flash{position:absolute;inset:0;pointer-events:none;opacity:0;background:#fff}\n#elv .warn{position:absolute;top:0;bottom:0;width:22%;pointer-events:none;opacity:0}\n#elv #wL{left:0;background:linear-gradient(90deg,#e22c,transparent)}\n#elv #wR{right:0;background:linear-gradient(-90deg,#e22c,transparent)}\n#elv #hidev{position:absolute;inset:0;pointer-events:none;display:none}\n#elv #hidev.on{display:block}\n#elv #hidev i{position:absolute;left:0;right:0;background:#000}\n#elv #hidev i:first-child{top:0;height:38%}#elv #hidev i:last-child{bottom:0;height:38%}\n#elv #hud{position:absolute;inset:0;pointer-events:none}\n#elv #hud button{pointer-events:auto}\n#elv #top{position:absolute;left:max(12px,env(safe-area-inset-left,0px));top:max(10px,env(safe-area-inset-top,0px));display:flex;flex-direction:column;gap:4px;text-shadow:0 1px 3px #000}\n#elv #obj{font-size:13px;font-weight:700;color:var(--yel);max-width:46vw}\n#elv #res{display:flex;gap:10px;font-size:14px;font-weight:700}\n#elv #bPause{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:max(10px,env(safe-area-inset-top,0px));width:44px;height:44px;border-radius:12px;background:#0009;border:1px solid var(--line);color:var(--ink);font-size:18px}\n#elv #comp{position:absolute;right:max(64px,calc(env(safe-area-inset-right,0px) + 58px));top:max(10px,env(safe-area-inset-top,0px));height:44px;display:flex;align-items:center;gap:6px;padding:0 10px;border-radius:12px;background:#0009;border:1px solid var(--line);font-size:12px}\n#elv #comp b{display:inline-block;font-size:22px;color:var(--grn);transition:transform .08s}\n#elv #msg{position:absolute;left:50%;top:22%;transform:translateX(-50%);max-width:80%;text-align:center;font-size:15px;font-weight:700;text-shadow:0 2px 6px #000;opacity:0;transition:opacity .25s;pointer-events:none}\n#elv #prompt{position:absolute;left:50%;top:58%;transform:translateX(-50%);padding:6px 14px;border-radius:99px;background:#000a;border:1px solid var(--yel);color:var(--yel);font-size:14px;font-weight:700;pointer-events:none;white-space:nowrap}\n#elv #cross{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff6}\n#elv #bars{position:absolute;left:50%;bottom:max(12px,env(safe-area-inset-bottom,0px));transform:translateX(-50%);display:flex;flex-direction:column;gap:6px;width:min(34vw,200px)}\n#elv .bar{position:relative;height:12px;border-radius:6px;background:#000a;border:1px solid var(--line);overflow:hidden}\n#elv .bar i{position:absolute;inset:0;transform-origin:left;background:linear-gradient(90deg,#2a9d6a,#6ae0a0);transform:scaleX(1)}\n#elv .bt i{background:linear-gradient(90deg,#c8a020,#f0d060)}\n#elv .bar span{position:absolute;inset:0;text-align:center;font-size:9px;line-height:12px;color:#fffc;letter-spacing:.06em}\n#elv #slots{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:calc(max(12px,env(safe-area-inset-bottom,0px)) + 66px);display:flex;gap:6px}\n#elv #slots button{width:48px;height:48px;border-radius:12px;background:#000c;border:1px solid var(--line);color:var(--ink);font-size:22px;padding:0;position:relative}\n#elv #slots button small{position:absolute;left:3px;top:1px;font-size:9px;color:var(--dim)}\n#elv #slots button.em{opacity:.35}\n#elv #ctl{position:absolute;right:max(12px,env(safe-area-inset-right,0px));bottom:max(12px,env(safe-area-inset-bottom,0px));display:flex;gap:8px;align-items:flex-end}\n#elv .rb{height:54px;min-width:54px;padding:0 12px;border-radius:14px;background:#000c;border:1px solid var(--line);color:var(--ink);font:700 13px 'Noto Sans KR',system-ui,sans-serif}\n#elv .rb.on{background:#2a5a3a;border-color:var(--grn)}\n#elv .rb.act{min-width:74px;height:64px;border-color:var(--yel);color:var(--yel)}\n#elv .rb.act.dis{opacity:.35;border-color:var(--line);color:var(--dim)}\n#elv #joy{position:absolute;left:max(24px,env(safe-area-inset-left,0px));bottom:max(24px,env(safe-area-inset-bottom,0px));width:120px;height:120px;border-radius:50%;border:2px solid #ffffff30;background:#ffffff0a;opacity:.55}\n#elv #knob{position:absolute;left:50%;top:50%;width:52px;height:52px;margin:-26px;border-radius:50%;background:#ffffff40;border:1px solid #fff6}\n#elv .ov{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:flex-start;gap:14px;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));text-align:center;overflow:auto;background:#030406e8}\n#elv .ov.on{display:flex}\n#elv #qte{background:#0000;justify-content:flex-end;padding-bottom:max(18px,env(safe-area-inset-bottom,0px))}\n#elv #fade{background:#000;transition:opacity .5s}\n#elv h1,#elv h2{margin:0;font-weight:800;letter-spacing:.05em;text-wrap:balance}\n#elv h1{font-size:clamp(34px,10vw,58px);color:#e8f0e8;text-shadow:0 0 22px #16e07a55}\n#elv h1.red{color:var(--red);text-shadow:0 0 22px #d83a3a88}\n#elv h2{font-size:clamp(22px,6vw,30px)}\n#elv small{letter-spacing:.2em;color:var(--dim);font-size:11px}\n#elv p{margin:0;color:var(--dim);line-height:1.55;max-width:32em;font-size:14px}\n#elv .foot{font-size:12px;opacity:.7}\n#elv button{font:700 16px 'Noto Sans KR',system-ui,sans-serif;color:var(--ink);background:#141c20;border:1px solid var(--line);border-radius:12px;padding:0 22px;min-height:48px;min-width:48px;cursor:pointer;touch-action:manipulation}\n#elv button:active{background:#1e2c32}\n#elv button.pri{background:linear-gradient(#2a8a5a,#17503a);border-color:#4ad090;color:#fff;min-width:170px}\n#elv button.big{height:84px;width:min(86vw,360px);font-size:26px}\n#elv .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:14px 16px;max-width:360px;width:100%;text-align:left}\n#elv .card.q{text-align:center;display:flex;flex-direction:column;gap:10px;align-items:center;background:#000b}\n#elv .tip b{font-size:13px;color:var(--yel)}#elv .tip p{font-size:12px;margin:4px 0 8px}\n#elv .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center}\n#elv .col{display:flex;flex-direction:column;gap:8px;width:min(92vw,360px)}\n#elv .col button{width:100%}\n#elv .stat{display:flex;justify-content:space-between;font-size:14px;padding:4px 0;border-bottom:1px solid #ffffff10}#elv .stat b{color:var(--yel)}\n#elv .tog{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0;font-size:14px}\n#elv .tog button{min-height:40px;padding:0 14px;font-size:14px;min-width:90px}\n#elv .qbar,#elv .qtime{width:min(86vw,360px);height:20px;border-radius:10px;background:#111;border:1px solid var(--line);overflow:hidden;position:relative}\n#elv .qtime{height:8px}\n#elv .qbar i,#elv .qtime i{position:absolute;inset:0;transform-origin:left;transform:scaleX(0)}\n#elv .qbar i{background:linear-gradient(90deg,#c8a020,#fff080)}\n#elv .qtime i{background:#d83a3a}\n#elv .tl{display:flex;flex-direction:column;gap:8px;align-items:center}\n#elv .xb{position:absolute;left:max(12px,env(safe-area-inset-left,0px));top:max(12px,env(safe-area-inset-top,0px))}\n#elv .fc{display:flex;flex-direction:column;gap:8px;align-items:center}\n#elv .shi{display:flex;align-items:center;gap:10px;text-align:left;padding:10px 12px;background:var(--panel);border:1px solid var(--line);border-radius:12px;width:100%}\n#elv .shi .t{flex:1;min-width:0}#elv .shi .t b{display:block;font-size:14px}#elv .shi .t span{font-size:11px;color:var(--dim)}\n#elv .shi button{min-height:40px;min-width:70px;padding:0 10px;font-size:14px}\n#elv .shi.no button{opacity:.4}\n#elv .ov::before{content:'';margin-top:auto}#elv .ov::after{content:'';margin-bottom:auto}\n#elv #qte{justify-content:flex-end}#elv #qte::before{margin-top:auto}\n@media (max-height:480px){#elv .ov{gap:8px}#elv h1{font-size:34px}#elv .tip p{margin:2px 0 4px}}\n@media (max-aspect-ratio:1/1){#elv #bars{bottom:calc(max(12px,env(safe-area-inset-bottom,0px)) + 80px);width:min(60vw,240px)}#elv #obj{max-width:60vw}#elv #slots{bottom:calc(max(12px,env(safe-area-inset-bottom,0px)) + 76px);right:max(12px,env(safe-area-inset-right,0px))}#elv #joy{bottom:max(24px,env(safe-area-inset-bottom,0px))}}\n";
const BODY = "<canvas id=\"cv\"></canvas>\n<div id=\"vig\"></div><div id=\"hurt\"></div><div id=\"flash\"></div>\n<div id=\"wL\" class=\"warn\"></div><div id=\"wR\" class=\"warn\"></div>\n<div id=\"hidev\"><i></i><i></i></div>\n<div id=\"hud\" hidden>\n  <div id=\"top\">\n    <div id=\"obj\"></div>\n    <div id=\"res\"><span id=\"gold\">🪙 0</span><span id=\"keyi\" hidden>🔑</span></div>\n  </div>\n  <button id=\"bPause\" aria-label=\"일시정지\">II</button>\n  <div id=\"comp\" hidden><b id=\"compA\">➤</b><small id=\"compD\"></small></div>\n  <div id=\"msg\"></div>\n  <div id=\"prompt\" hidden></div>\n  <div id=\"cross\"></div>\n  <div id=\"bars\"><div class=\"bar\"><i id=\"stB\"></i><span>스태미나</span></div><div class=\"bar bt\"><i id=\"btB\"></i><span id=\"btT\">배터리</span></div></div>\n  <div id=\"slots\"></div>\n  <div id=\"ctl\">\n    <button id=\"bRun\" class=\"rb\">달리기</button>\n    <button id=\"bFl\" class=\"rb\">손전등</button>\n    <button id=\"bAct\" class=\"rb act\">상호작용</button>\n  </div>\n  <div id=\"joy\"><div id=\"knob\"></div></div>\n</div>\n<div id=\"qte\" class=\"ov\"><div class=\"card q\"><h2 id=\"qT\">문을 연다!</h2><div class=\"qbar\"><i id=\"qF\"></i></div><div class=\"qtime\"><i id=\"qTm\"></i></div><button id=\"bTap\" class=\"pri big\">연타!</button><button id=\"bQx\">물러나기</button><p>화면 아래 버튼을 빠르게 연타하세요 (키보드: 스페이스)</p></div></div>\n<div id=\"title\" class=\"ov on\">\n  <button class=\"xb\" id=\"bExit1\" aria-label=\"나가기\">←</button>\n  <div class=\"tl\"><small>FIRST-PERSON HORROR ESCAPE</small><h1>엘리베이터 런</h1><p>정전된 엘리베이터에서 눈을 떴다. 손전등 하나로 어두운 사무실 층을 지나 비상구를 찾아라.</p></div>\n  <div class=\"row\"><button class=\"pri\" id=\"bStart\">게임 시작</button><button id=\"bSet1\">설정</button></div>\n  <div class=\"card tip\"><b>🎧 이어폰을 권장합니다</b><p>괴물의 발소리 방향과 거리가 중요한 단서입니다. 소리를 끄면 화면 가장자리에 위험 표시가 나타납니다.</p><b>조작</b><p>왼쪽 화면: 이동 스틱 · 오른쪽 화면: 드래그로 시선<br>PC: WASD 이동 · 마우스 시선 · Shift 달리기 · F 손전등 · E 상호작용 · 1~4 아이템 · Esc 일시정지</p></div>\n  <p class=\"foot\">프롤로그 + 1~5층</p>\n</div>\n<div id=\"settings\" class=\"ov\">\n  <h2>설정</h2>\n  <div class=\"card\">\n    <div class=\"tog\"><span>소리</span><button id=\"sSound\"></button></div>\n    <div class=\"tog\"><span>시점 감도</span><div class=\"row\"><button id=\"sSensM\">−</button><b id=\"sSensV\"></b><button id=\"sSensP\">+</button></div></div>\n    <div class=\"tog\"><span>화질 (성능)</span><button id=\"sQual\"></button></div>\n    <div class=\"tog\"><span>QTE 난이도</span><button id=\"sQte\"></button></div>\n    <div class=\"tog\"><span>진동</span><button id=\"sHap\"></button></div>\n  </div>\n  <button class=\"pri\" id=\"bSetBack\">돌아가기</button>\n</div>\n<div id=\"pause\" class=\"ov\"><h2>일시정지</h2><div class=\"col\"><button class=\"pri\" id=\"bResume\">계속하기</button><button id=\"bSet2\">설정</button><button id=\"bRestart\">이 층 다시 시작</button><button id=\"bExit2\">사이트로 나가기</button></div></div>\n<div id=\"fade\" class=\"ov\"><div class=\"fc\"><small id=\"fSub\"></small><h1 id=\"fTitle\"></h1><p id=\"fObj\"></p></div></div>\n<div id=\"shop\" class=\"ov\"><h2>비상 상점</h2><p>다음 층으로 가기 전에 준비하세요.</p><div class=\"card\"><div class=\"stat\"><span>보유 코인</span><b id=\"shGold\"></b></div><div class=\"stat\"><span>가방</span><b id=\"shBag\"></b></div></div><div id=\"shList\" class=\"col\"></div><button class=\"pri\" id=\"bGo\">다음 층으로</button></div>\n<div id=\"over\" class=\"ov\"><h1 class=\"red\">잡혔습니다</h1><p id=\"ovT\"></p><div class=\"row\"><button class=\"pri\" id=\"bRetry\">다시 시도</button><button id=\"bExit3\">나가기</button></div></div>\n<div id=\"end\" class=\"ov\"><h2>5층 돌파</h2><p>마지막 문 너머로 아침 햇살이 쏟아진다. 손에는 낯선 환자 팔찌가 채워져 있다. 그날 엘리베이터에서 무슨 일이 있었던 걸까…</p><div class=\"card\" id=\"endStats\"></div><div class=\"row\"><button class=\"pri\" id=\"bAgain\">처음부터 다시</button><button id=\"bExit4\">나가기</button></div><p class=\"foot\">엘리베이터 런 · 전 5층 클리어</p></div>\n";
export function openElevator(ctx) {
  ctx = ctx || {};
  if (document.getElementById('elv')) return null;
  const st = document.createElement('style'); st.id = 'elvcss'; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'elv'; root.innerHTML = BODY; document.body.appendChild(root);
  const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
  let closed = false, raf = 0;
// ===== 유틸 / 설정 / 오디오 =====
const TAU=Math.PI*2,clamp=(v,a,b)=>v<a?a:v>b?b:v,lerp=(a,b,t)=>a+(b-a)*t,hyp=Math.hypot;
const $=id=>root.querySelector('#'+id);
const L_=[];const on=(t,e,f,o)=>{t.addEventListener(e,f,o);L_.push(()=>t.removeEventListener(e,f,o))};
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
let SEED=(Date.now()&0xffffff)|1,rnd=mulberry(SEED);
const rr=(a,b)=>a+rnd()*(b-a),ri=(a,b)=>Math.floor(rr(a,b+1)),pick=a=>a[Math.floor(rnd()*a.length)];
let S={sens:1,sound:true,quality:1,qte:1,hap:true};
try{Object.assign(S,JSON.parse(localStorage.getItem('elv.s')||'{}'))}catch(e){}
const saveS=()=>{try{localStorage.setItem('elv.s',JSON.stringify(S))}catch(e){}};
// ---- 오디오 (WebAudio 합성, 3D 팬/거리 감쇠) ----
let AC=null,MAS=null,AMB=null,nbuf=null;
function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{
    AC=new(window.AudioContext||window.webkitAudioContext)();MAS=AC.createGain();MAS.gain.value=S.sound?.8:0;MAS.connect(AC.destination);
    nbuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate);const d=nbuf.getChannelData(0);let l=0;for(let i=0;i<d.length;i++){l=(l+(Math.random()*2-1)*.02)/1.02;d[i]=l*3.5}
    // 앰비언스: 저역 험 + 형광등 버즈
    const src=AC.createBufferSource();src.buffer=nbuf;src.loop=true;const lp=AC.createBiquadFilter();lp.type='lowpass';lp.frequency.value=240;const g=AC.createGain();g.gain.value=.5;src.connect(lp);lp.connect(g);g.connect(MAS);src.start();
    const o=AC.createOscillator();o.type='sine';o.frequency.value=52;const og=AC.createGain();og.gain.value=.05;o.connect(og);og.connect(MAS);o.start();
    const b=AC.createOscillator();b.type='sawtooth';b.frequency.value=120;const bg=AC.createGain();bg.gain.value=0;const bf=AC.createBiquadFilter();bf.type='bandpass';bf.frequency.value=900;bf.Q.value=3;b.connect(bf);bf.connect(bg);bg.connect(MAS);b.start();
    const dr=AC.createOscillator();dr.type='sawtooth';dr.frequency.value=38;const drg=AC.createGain();drg.gain.value=0;const drf=AC.createBiquadFilter();drf.type='lowpass';drf.frequency.value=110;dr.connect(drf);drf.connect(drg);drg.connect(MAS);dr.start();
    AMB={buzz:bg,drone:drg,nodes:[src,o,b,dr]};
  }catch(e){AC=null}
}
function setSound(){if(MAS)MAS.gain.value=S.sound?.8:0}
function tone(f,d,type='sine',vol=.1,slide=0,pan=0,delay=0){
  if(!AC||!S.sound)return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0008,t+d);o.connect(g);
  if(AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(MAS)}else g.connect(MAS);o.start(t);o.stop(t+d+.03);
}
function nz(d,vol=.1,lp=1500,pan=0,hp=0){
  if(!AC||!S.sound||!nbuf)return;const s=AC.createBufferSource();s.buffer=nbuf;s.playbackRate.value=1+Math.random()*.5;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;const g=AC.createGain();g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0008,AC.currentTime+d);
  s.connect(f);let n=f;if(hp){const h=AC.createBiquadFilter();h.type='highpass';h.frequency.value=hp;f.connect(h);n=h}n.connect(g);
  if(AC.createStereoPanner){const p=AC.createStereoPanner();p.pan.value=clamp(pan,-1,1);g.connect(p);p.connect(MAS)}else g.connect(MAS);s.start(0,Math.random());s.stop(AC.currentTime+d+.05);
}
const SFX={
  step(v,pan){nz(.09,v,420,pan)},
  thud(){tone(70,.25,'sine',.35,-30);nz(.2,.15,300)},
  door(){tone(180,.7,'sawtooth',.06,-90);tone(95,.9,'triangle',.05,-30);nz(.5,.05,900)},
  slam(){nz(.3,.3,500);tone(60,.3,'sine',.3,-20)},
  pick(){tone(880,.07,'square',.04);tone(1320,.12,'square',.04,0,0,.06)},
  coin(){tone(1500,.05,'square',.03);tone(2000,.09,'square',.03,0,0,.04)},
  tap(){nz(.05,.12,2000);tone(160+Math.random()*50,.06,'square',.04)},
  win(){[392,523,659].forEach((f,i)=>tone(f,.5,'triangle',.08,0,0,i*.12))},
  fail(){tone(110,.7,'sawtooth',.12,-60);nz(.5,.1,600)},
  scare(){nz(1.1,.5,3000);tone(60,1.2,'sawtooth',.3,-20);tone(1760,.5,'square',.1,-1200)},
  flare(){nz(.7,.14,6000,0,1500);tone(300,.6,'sawtooth',.04,400)},
  gulp(){tone(300,.12,'sine',.1,-120);tone(260,.14,'sine',.1,-100,0,.15)},
  decoy(pan,v){tone(1200,.1,'square',v,0,pan);tone(900,.1,'square',v,0,pan,.15)},
  click(){tone(1800,.02,'square',.04)},
};
function heartbeat(v){tone(55,.14,'sine',v,-20);tone(48,.16,'sine',v*.8,-18,0,.2)}
function breath(v,pan){nz(.7,v,900,pan,200)}

// ===== 절차적 텍스처/스프라이트 (모두 코드로 생성, 외부 에셋 없음) =====
const TS=64;
const hn=(x,y,s)=>{const n=Math.sin(x*12.9898+y*78.233+s*37.719)*43758.5453;return n-Math.floor(n)};
function pxTex(w,h,fn){const d=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const c=fn(x,y),i=(y*w+x)*4;d[i]=c[0];d[i+1]=c[1];d[i+2]=c[2];d[i+3]=c[3]===undefined?255:c[3]}return{w,h,d}}
function cTex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=false;draw(g,w,h);return{w,h,d:g.getImageData(0,0,w,h).data}}
const TEX={};
function buildTextures(){
  TEX.wall=[
    pxTex(TS,TS,(x,y)=>{let b=[146,138,112];if(y<5)b=[98,90,72];else if(y>55)b=[60,52,44];else if(x%16===0)b=[118,110,88];
      const n=(hn(x,y,1)-.5)*16,st=Math.sin(x*.21+3)*Math.sin(y*.13+x*.05)>.72?-30:0;return[b[0]+n+st,b[1]+n+st,b[2]+n+st]}),
    pxTex(TS,TS,(x,y)=>{const n=(hn(x>>1,y>>1,2)-.5)*26,cr=(Math.abs(Math.sin(x*.4+y*.13))<.04&&y>10&&y<50)?-40:0,b=y>57?[48,50,48]:[98,104,100];return[b[0]+n+cr,b[1]+n+cr,b[2]+n+cr]}),
    pxTex(TS,TS,(x,y)=>{let b=[108,128,118];if(y<6)b=[70,86,80];else if(y>54)b=[44,54,50];else if(x%32===0||(y>26&&y<30))b=[84,102,94];const n=(hn(x,y,3)-.5)*14;return[b[0]+n,b[1]+n,b[2]+n]}),
    // 3: 병원 타일 (흰 청록색 + 물때)
    pxTex(TS,TS,(x,y)=>{let b=[168,190,188];if(x%16===0||y%16===0)b=[96,116,114];else if(y>50)b=[84,112,108];const n=(hn(x,y,9)-.5)*14,st=(y>40&&Math.sin(x*.3)*.5+.5>hn(x>>2,3,4)+.2)?-34:0;return[b[0]+n+st,b[1]+n+st,b[2]+n+st]}),
    // 4: 붉은 콘크리트
    pxTex(TS,TS,(x,y)=>{const n=(hn(x>>1,y>>1,11)-.5)*30,dr=(hn(x>>2,0,12)>.7&&y<20+hn(x>>2,1,13)*40)?-36:0,b=[118,52,48];return[b[0]+n+dr,b[1]+n*.5+dr*.5,b[2]+n*.5+dr*.5]}),
  ];
  TEX.door=cTex(TS,TS,(g,w,h)=>{g.fillStyle='#4a3524';g.fillRect(0,0,w,h);for(let y=0;y<h;y++){g.fillStyle='rgba(0,0,0,'+(hn(0,y,4)*.15)+')';g.fillRect(0,y,w,1)}
    g.fillStyle='#2c1f15';g.fillRect(0,0,w,3);g.fillRect(0,0,3,h);g.fillRect(w-3,0,3,h);g.fillStyle='#5a4230';g.fillRect(8,8,48,22);g.fillRect(8,36,48,24);
    g.fillStyle='#1a2630';g.fillRect(18,12,28,14);g.fillStyle='#2e4658';g.fillRect(18,12,28,4);g.fillStyle='#c9a850';g.fillRect(49,34,5,3);g.fillRect(52,34,2,8)});
  TEX.exit=cTex(TS,TS,(g,w,h)=>{g.fillStyle='#3c4640';g.fillRect(0,0,w,h);g.fillStyle='#2a322e';g.fillRect(0,0,w,3);g.fillRect(0,0,3,h);g.fillRect(w-3,0,3,h);
    g.fillStyle='#16e07a';g.fillRect(8,6,48,16);g.fillStyle='#052a16';g.font='bold 12px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('비상구',32,14);
    g.fillStyle='#d8d83a';for(let i=0;i<8;i++){g.fillRect(i*8,h-12,4,8)}g.fillStyle='#1a1a1a';for(let i=0;i<8;i++){g.fillRect(i*8+4,h-12,4,8)}g.fillStyle='#b8c0b8';g.fillRect(8,34,48,3)});
  TEX.elev=cTex(TS,TS,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#78808a');gr.addColorStop(.5,'#a2aab4');gr.addColorStop(1,'#707882');g.fillStyle=gr;g.fillRect(0,0,w,h);for(let y=0;y<h;y++){g.fillStyle='rgba(255,255,255,'+(hn(1,y,5)*.07)+')';g.fillRect(0,y,w,1)}
    g.fillStyle='#2a2e34';g.fillRect(31,0,2,h);g.fillRect(0,0,w,3);g.fillStyle='#e8c040';g.fillRect(28,8,8,4)});
  TEX.floor=[pxTex(TS,TS,(x,y)=>{const n=(hn(x,y,6)-.5)*14,d=((x+y)%16===0||((x-y+64)%16===0))?-8:0,b=[56,62,72];return[b[0]+n+d,b[1]+n+d,b[2]+n+d]}),
    pxTex(TS,TS,(x,y)=>{const n=(hn(x>>1,y>>1,7)-.5)*10,g=(x%32===0||y%32===0)?-24:0,b=[112,116,110];return[b[0]+n+g,b[1]+n+g,b[2]+n+g]})];
  TEX.ceil=pxTex(TS,TS,(x,y)=>{const n=(hn(x,y,8)-.5)*10,g=(x%32<2||y%32<2)?-36:0,b=[104,104,96];return[b[0]+n+g,b[1]+n+g,b[2]+n+g]});
  TEX.lamp=pxTex(TS,TS,(x,y)=>{const e=x<4||y<4||x>59||y>59;return e?[120,120,110]:[255,250,228]});
  // 스프라이트
  const spr=(w,h,f)=>cTex(w,h,f);
  TEX.s={};
  TEX.s.desk=spr(64,40,g=>{g.fillStyle='#5a4630';g.fillRect(2,12,60,7);g.fillStyle='#3e2f20';g.fillRect(4,19,4,20);g.fillRect(56,19,4,20);g.fillRect(8,19,48,3);
    g.fillStyle='#1a1d22';g.fillRect(22,2,18,12);g.fillStyle='#38a070';g.fillRect(24,4,14,8);g.fillStyle='#22262c';g.fillRect(29,14,4,3);g.fillStyle='#d8d4c0';g.fillRect(46,9,10,3)});
  TEX.s.locker=spr(40,88,g=>{g.fillStyle='#4a5560';g.fillRect(2,2,36,84);g.fillStyle='#38424c';g.fillRect(4,4,32,80);g.fillStyle='#262e36';for(let i=0;i<6;i++)g.fillRect(10,10+i*4,20,2);g.fillStyle='#8a929a';g.fillRect(28,44,4,10);g.fillStyle='#2a323a';g.fillRect(4,40,32,2)});
  TEX.s.plant=spr(32,48,g=>{g.fillStyle='#5a3a26';g.fillRect(9,34,14,12);g.fillStyle='#3a2a1a';g.fillRect(8,32,16,3);g.strokeStyle='#4a5a2a';g.lineWidth=3;for(let i=-3;i<=3;i++){g.beginPath();g.moveTo(16,32);g.quadraticCurveTo(16+i*5,18,16+i*8,8+Math.abs(i)*3);g.stroke()}});
  TEX.s.chair=spr(32,40,g=>{g.fillStyle='#2e3238';g.fillRect(6,4,20,14);g.fillRect(6,18,22,5);g.fillRect(14,23,4,12);g.fillRect(6,34,20,3)});
  TEX.s.coin=spr(16,16,g=>{g.fillStyle='#8a6a10';g.beginPath();g.arc(8,8,7,0,TAU);g.fill();g.fillStyle='#f4c838';g.beginPath();g.arc(8,8,5.5,0,TAU);g.fill();g.fillStyle='#fff2a0';g.fillRect(6,4,2,5)});
  TEX.s.bat=spr(16,20,g=>{g.fillStyle='#1c2a1c';g.fillRect(3,4,10,15);g.fillStyle='#38c060';g.fillRect(4,6,8,11);g.fillStyle='#d0d0d0';g.fillRect(6,1,4,3);g.fillStyle='#0a2a10';g.fillRect(7,9,2,6);g.fillRect(5,11,6,2)});
  TEX.s.flare=spr(14,24,g=>{g.fillStyle='#a02020';g.fillRect(4,6,6,16);g.fillStyle='#e04040';g.fillRect(5,6,2,16);g.fillStyle='#d0d0d0';g.fillRect(4,2,6,4);g.fillStyle='#ffc060';g.fillRect(6,0,2,3)});
  TEX.s.drink=spr(14,22,g=>{g.fillStyle='#1a4a8a';g.fillRect(3,4,8,17);g.fillStyle='#3a8ae0';g.fillRect(4,6,6,13);g.fillStyle='#e8e8e8';g.fillRect(3,2,8,3);g.fillStyle='#ffe040';g.fillRect(6,9,3,6)});
  TEX.s.decoy=spr(18,18,g=>{g.fillStyle='#2a2a3a';g.beginPath();g.arc(9,9,8,0,TAU);g.fill();g.fillStyle='#d04aa0';g.beginPath();g.arc(9,9,4,0,TAU);g.fill();g.fillStyle='#e8e8e8';g.fillRect(8,1,2,3)});
  TEX.s.compass=spr(18,18,g=>{g.fillStyle='#6a5a2a';g.beginPath();g.arc(9,9,8,0,TAU);g.fill();g.fillStyle='#e8e0c0';g.beginPath();g.arc(9,9,6,0,TAU);g.fill();g.fillStyle='#d03030';g.beginPath();g.moveTo(9,3);g.lineTo(11,9);g.lineTo(7,9);g.fill()});
  TEX.s.key=spr(20,14,g=>{g.fillStyle='#e8c040';g.beginPath();g.arc(5,7,4.5,0,TAU);g.fill();g.fillStyle='#1a1a1a';g.beginPath();g.arc(5,7,1.8,0,TAU);g.fill();g.fillStyle='#e8c040';g.fillRect(8,6,11,3);g.fillRect(15,9,2,4);g.fillRect(12,9,2,3)});
  TEX.s.torch=spr(22,12,g=>{g.fillStyle='#2a2e34';g.fillRect(2,3,14,6);g.fillStyle='#c8ccd2';g.fillRect(4,4,10,4);g.fillStyle='#e8c040';g.fillRect(16,2,5,8);g.fillStyle='#fff8c0';g.fillRect(19,4,3,4)});
  TEX.s.light=spr(16,16,g=>{const r=g.createRadialGradient(8,8,0,8,8,8);r.addColorStop(0,'rgba(255,230,160,1)');r.addColorStop(1,'rgba(255,230,160,0)');g.fillStyle=r;g.fillRect(0,0,16,16)});
  // 괴물: 걷는 잔상 (키 큰 실루엣 + 어긋난 잔상)
  TEX.s.after=spr(64,128,g=>{
    const fig=(ox,a,pale)=>{g.globalAlpha=a;const c=pale;g.fillStyle=c;
      g.beginPath();g.ellipse(32+ox,16,9,12,0,0,TAU);g.fill();                       // 머리
      g.fillRect(29+ox,26,6,8);g.beginPath();g.moveTo(22+ox,34);g.lineTo(42+ox,34);g.lineTo(38+ox,76);g.lineTo(26+ox,76);g.fill(); // 몸통
      g.fillRect(14+ox,34,5,52);g.fillRect(45+ox,34,5,52);                           // 긴 팔
      g.fillRect(25+ox,76,6,50);g.fillRect(34+ox,76,6,50)};                          // 다리
    fig(-7,.28,'#aab2c0');fig(7,.28,'#aab2c0');fig(0,.92,'#d8dde6');g.globalAlpha=1;
    g.fillStyle='#050508';g.beginPath();g.ellipse(28,15,2.5,4,0,0,TAU);g.ellipse(36,15,2.5,4,0,0,TAU);g.fill();g.fillRect(27,22,10,2)});
  // 괴물: 기어오는 환자
  TEX.s.patient=spr(96,56,g=>{
    g.fillStyle='#c9ccd2';g.beginPath();g.ellipse(46,32,30,13,0,0,TAU);g.fill();g.fillStyle='#8fa0b4';g.fillRect(24,22,40,18);                // 환자복
    g.fillStyle='#d8d4cc';g.beginPath();g.ellipse(80,34,11,10,0,0,TAU);g.fill();g.fillStyle='#1a1414';g.beginPath();g.ellipse(82,28,12,8,0,Math.PI,TAU);g.fill();g.fillRect(70,28,5,24);
    g.fillStyle='#050508';g.fillRect(80,32,3,4);g.fillRect(86,32,3,4);g.fillStyle='#8a1a1a';g.fillRect(80,40,8,2);
    g.strokeStyle='#d8d4cc';g.lineWidth=4;g.beginPath();g.moveTo(66,40);g.lineTo(88,50);g.moveTo(30,40);g.lineTo(12,52);g.moveTo(52,42);g.lineTo(60,54);g.stroke()});
  TEX.s.key=TEX.s.key;
  TEX.s.fuse=spr(20,16,g=>{g.fillStyle='#2a2a2a';g.fillRect(2,2,16,12);g.fillStyle='#e8c040';g.fillRect(4,4,12,8);g.fillStyle='#1a1a1a';g.beginPath();g.moveTo(11,4);g.lineTo(7,9);g.lineTo(10,9);g.lineTo(8,12);g.lineTo(13,7);g.lineTo(10,7);g.fill()});
  TEX.s.card=spr(20,14,g=>{g.fillStyle='#e8e8ee';g.fillRect(1,2,18,10);g.fillStyle='#d03030';g.fillRect(1,4,18,3);g.fillStyle='#2a2a30';g.fillRect(3,9,8,1);g.fillRect(3,10,5,1)});
  // 괴물: 얼굴 없는 추격자 (검은 정장, 빈 얼굴)
  TEX.s.faceless=spr(56,128,g=>{
    g.fillStyle='#0b0b0f';g.beginPath();g.moveTo(14,34);g.lineTo(42,34);g.lineTo(46,84);g.lineTo(10,84);g.fill();g.fillRect(8,36,5,60);g.fillRect(43,36,5,60);g.fillRect(17,84,8,42);g.fillRect(31,84,8,42);
    g.fillStyle='#d8d4cc';g.beginPath();g.ellipse(28,18,10,14,0,0,TAU);g.fill();
    g.fillStyle='#b8b4ac';g.beginPath();g.ellipse(28,24,6,6,0,0,Math.PI);g.fill();
    g.fillStyle='#e8e8e8';g.fillRect(26,34,4,24);g.fillStyle='#8a1a1a';g.fillRect(26,40,4,16)});
  // 괴물: 공허 (최종 추격자)
  TEX.s.void=spr(80,144,g=>{
    const gr=g.createRadialGradient(40,72,6,40,72,64);gr.addColorStop(0,'#000');gr.addColorStop(.7,'#06020a');gr.addColorStop(1,'rgba(6,2,10,0)');
    g.fillStyle=gr;g.fillRect(0,0,80,144);
    g.fillStyle='#050207';g.beginPath();g.ellipse(40,24,15,20,0,0,TAU);g.fill();g.fillRect(24,40,32,70);
    for(let i=0;i<7;i++){g.fillRect(8+i*10,60+((i*37)%30),6,60-((i*23)%30))}
    g.fillStyle='#ff2a2a';g.beginPath();g.ellipse(33,22,3,5,0,0,TAU);g.ellipse(47,22,3,5,0,0,TAU);g.fill();
    g.fillStyle='#ff6a6a';g.fillRect(32,20,2,2);g.fillRect(46,20,2,2)});
}

// ===== 층 데이터 + 레벨 생성 (사무실 모듈: 방 + 복도 + 문 + 가구) =====
const FLOORS=[
  {id:0,name:'프롤로그',sub:'멈춰 선 엘리베이터',size:33,rooms:4,monsters:[],coins:3,bats:0,items:0,key:null,lamps:.9,walls:[0],shop:false,tint:[1,1,1],
   obj:'엘리베이터를 빠져나가 비상구를 찾으세요'},
  {id:1,name:'1층',sub:'버려진 오피스',size:58,rooms:15,monsters:['after'],coins:18,bats:4,items:3,key:null,lamps:.65,walls:[0,1],shop:true,tint:[1,1,1],
   obj:'비상구를 찾으세요 (초록 표지)'},
  {id:2,name:'2층',sub:'뒤틀린 오피스',size:66,rooms:18,monsters:['after','patient'],coins:20,bats:4,items:3,key:{n:'열쇠',ic:'🔑',t:'key'},lamps:.5,walls:[0,1,2],shop:true,tint:[1,1,.95],
   obj:'열쇠를 찾아 비상구를 여세요'},
  {id:3,name:'3층',sub:'침수 병원',size:74,rooms:21,monsters:['after','patient','faceless'],coins:22,bats:5,items:4,key:{n:'퓨즈',ic:'🔌',t:'fuse'},lamps:.45,walls:[3,1,3],shop:true,tint:[.8,1,1.1],
   obj:'차단기 퓨즈를 찾아 비상구 전원을 복구하세요',rmax:10},
  {id:4,name:'4층',sub:'뒤틀린 복도',size:82,rooms:24,monsters:['patient','faceless','after','patient'],coins:24,bats:5,items:4,key:{n:'카드키',ic:'💳',t:'card'},lamps:.4,walls:[2,1,0],shop:true,tint:[.9,1.05,.85],
   obj:'카드키를 찾아 비상구를 여세요 (뒤를 조심)',rmax:10},
  {id:5,name:'5층',sub:'붉은 나락',size:90,rooms:27,monsters:['void','faceless','patient','after'],coins:26,bats:6,items:5,key:{n:'마스터 키',ic:'🗝️',t:'key'},lamps:.35,walls:[4,1,4],shop:true,tint:[1.25,.75,.75],
   obj:'마스터 키를 찾아 탈출하세요 — 키를 줍는 순간 무언가 깨어난다',rmax:11,final:true},
];
// 스프라이트 정의: 텍스처, 월드 폭/높이(타일), 지면에서 띄움
const SPD={desk:{t:'desk',w:.95,h:.6,v:0},locker:{t:'locker',w:.5,h:1,v:0},plant:{t:'plant',w:.38,h:.56,v:0},chair:{t:'chair',w:.42,h:.52,v:0},
  coin:{t:'coin',w:.2,h:.2,v:.08},bat:{t:'bat',w:.2,h:.26,v:.08},flare:{t:'flare',w:.18,h:.3,v:.08},drink:{t:'drink',w:.17,h:.28,v:.08},decoy:{t:'decoy',w:.22,h:.22,v:.08},
  compass:{t:'compass',w:.22,h:.22,v:.08},key:{t:'key',w:.28,h:.2,v:.1},fuse:{t:'fuse',w:.26,h:.22,v:.1},card:{t:'card',w:.28,h:.2,v:.1},torch:{t:'torch',w:.32,h:.18,v:.08},light:{t:'light',w:.8,h:.8,v:.2}};
const ITEMDEF={
  flare:{n:'조명탄',ic:'🔥',price:12,desc:'15초간 시야 확보 · 시야 안의 추격자 5초 기절'},
  drink:{n:'에너지 드링크',ic:'🥤',price:8,desc:'20초간 스태미나 소모 없음 · 이동속도 +40%'},
  decoy:{n:'음향 유인구',ic:'📻',price:10,desc:'던진 곳에서 10초간 소리와 불빛 · 괴물을 유인'},
  compass:{n:'길찾기 나침반',ic:'🧭',price:14,desc:'이번 층 출구(또는 열쇠) 방향 표시'},
  bat:{n:'고성능 배터리',ic:'🔋',price:9,desc:'배터리 100% 충전 · 30초간 손전등 범위 증가'},
};
function genLevel(cfg,seed){
  const rd=mulberry(seed),R=(a,b)=>a+rd()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),PK=a=>a[Math.floor(rd()*a.length)];
  const N=cfg.size,g=new Uint8Array(N*N).fill(1),wv=new Uint8Array(N*N),rooms=[],corr=new Uint8Array(N*N);
  const I=(x,y)=>y*N+x,inb=(x,y)=>x>0&&y>0&&x<N-1&&y<N-1;
  const fits=(x,y,w,h)=>{if(x<2||y<2||x+w>N-2||y+h>N-2)return false;for(let yy=y-3;yy<=y+h+2;yy++)for(let xx=x-3;xx<=x+w+2;xx++)if(inb(xx,yy)&&g[I(xx,yy)]===0)return false;return true};
  const rmx=cfg.rmax||9;for(let k=0;k<3000&&rooms.length<cfg.rooms;k++){
    const el=rooms.length===0,w=el?5:RI(5,rmx),h=el?5:RI(5,Math.max(8,rmx-1)),x=RI(2,N-w-3),y=RI(2,N-h-3);
    if(!fits(x,y,w,h))continue;
    const r={x,y,w,h,cx:x+(w>>1),cy:y+(h>>1),kind:el?'elev':'room',wall:PK(cfg.walls)};rooms.push(r);
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){g[I(xx,yy)]=0;wv[I(xx,yy)]=r.wall}
  }
  const carve=(a,b)=>{
    let x=a.cx,y=a.cy;const hz=rd()<.5;
    const stepX=()=>{while(x!==b.cx){x+=x<b.cx?1:-1;if(g[I(x,y)]===1){g[I(x,y)]=0;corr[I(x,y)]=1}}};
    const stepY=()=>{while(y!==b.cy){y+=y<b.cy?1:-1;if(g[I(x,y)]===1){g[I(x,y)]=0;corr[I(x,y)]=1}}};
    if(hz){stepX();stepY()}else{stepY();stepX()}
  };
  const linked=new Set();
  for(let i=1;i<rooms.length;i++){let b=0,bd=1e9;for(let j=0;j<i;j++){const d=hyp(rooms[i].cx-rooms[j].cx,rooms[i].cy-rooms[j].cy);if(d<bd){bd=d;b=j}}carve(rooms[i],rooms[b]);linked.add(i+','+b)}
  for(let k=0;k<Math.floor(rooms.length/3);k++){const i=RI(0,rooms.length-1),j=RI(0,rooms.length-1);if(i!==j&&!linked.has(i+','+j)&&!linked.has(j+','+i)){carve(rooms[i],rooms[j]);linked.add(i+','+j)}}
  // 벽 변형(복도는 콘크리트)
  for(let y=0;y<N;y++)for(let x=0;x<N;x++)if(g[I(x,y)]===1){let v=0,cnt=0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(inb(xx,yy)&&g[I(xx,yy)]===0){v=corr[I(xx,yy)]?1:wv[I(xx,yy)];cnt++}}wv[I(x,y)]=cnt?v:0}
  // 문
  const doors=new Map();
  rooms.forEach((r,ri)=>{
    for(let yy=r.y-1;yy<=r.y+r.h;yy++)for(let xx=r.x-1;xx<=r.x+r.w;xx++){
      const ring=xx===r.x-1||xx===r.x+r.w||yy===r.y-1||yy===r.y+r.h,corner=(xx===r.x-1||xx===r.x+r.w)&&(yy===r.y-1||yy===r.y+r.h);
      if(!ring||corner||g[I(xx,yy)]!==0)continue;
      if(r.kind==='elev'){g[I(xx,yy)]=3;doors.set(I(xx,yy),{x:xx,y:yy,open:0,st:'closed',qte:cfg.id===0,type:3})}
      else if(rd()<.8){g[I(xx,yy)]=2;doors.set(I(xx,yy),{x:xx,y:yy,open:0,st:'closed',qte:rd()<(cfg.id===0?0:.22),type:2})}
    }});
  // BFS 거리
  const sr=rooms[0],start={x:sr.cx+.5,y:sr.cy+.5,a:0};
  const pass=c=>c===0||c===2||c===3;
  const dist=new Int32Array(N*N).fill(-1);{const q=[I(sr.cx,sr.cy)];dist[q[0]]=0;for(let h=0;h<q.length;h++){const c=q[h],cx=c%N,cy=(c/N)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=I(cx+dx,cy+dy);if(n>=0&&n<N*N&&dist[n]<0&&pass(g[n])){dist[n]=dist[c]+1;q.push(n)}}}}
  const rd_=r=>dist[I(r.cx,r.cy)];
  const order=rooms.slice(1).sort((a,b)=>rd_(b)-rd_(a));
  const exitRoom=order[0];exitRoom.kind='exit';
  // 비상구: 출구 방의 단단한 벽 한 칸
  let ex=null;{const cand=[];
    for(let yy=exitRoom.y-1;yy<=exitRoom.y+exitRoom.h;yy++)for(let xx=exitRoom.x-1;xx<=exitRoom.x+exitRoom.w;xx++){
      const ring=xx===exitRoom.x-1||xx===exitRoom.x+exitRoom.w||yy===exitRoom.y-1||yy===exitRoom.y+exitRoom.h,corner=(xx===exitRoom.x-1||xx===exitRoom.x+exitRoom.w)&&(yy===exitRoom.y-1||yy===exitRoom.y+exitRoom.h);
      if(!ring||corner||g[I(xx,yy)]!==1)continue;
      const ox=xx<exitRoom.x?-1:xx>=exitRoom.x+exitRoom.w?1:0,oy=yy<exitRoom.y?-1:yy>=exitRoom.y+exitRoom.h?1:0;
      if(inb(xx+ox,yy+oy)&&g[I(xx+ox,yy+oy)]===1&&Math.abs(xx-exitRoom.cx)+Math.abs(yy-exitRoom.cy)>1)cand.push({x:xx,y:yy,ix:xx-ox,iy:yy-oy})}
    ex=PK(cand)||{x:exitRoom.x-1,y:exitRoom.cy,ix:exitRoom.x,iy:exitRoom.cy};g[I(ex.x,ex.y)]=4;wv[I(ex.x,ex.y)]=0}
  const keyRoom=order[1]||order[0];
  const L={N,g,wv,corr,rooms,doors,start,exit:ex,exitRoom,dist,cfg,spr:[],dynLights:[],keyRoom};
  // 가구/사물
  const occ=new Set(),doorNear=(x,y)=>{for(const d of doors.values())if(Math.abs(d.x-x)+Math.abs(d.y-y)<=2)return true;return false};
  const cellFree=(x,y)=>g[I(x,y)]===0&&!occ.has(I(x,y));
  const addSpr=(type,x,y,o={})=>{const s=Object.assign({type,x,y,r:0},o);L.spr.push(s);return s};
  const randIn=(r,m=0)=>{for(let k=0;k<30;k++){const x=RI(r.x+m,r.x+r.w-1-m),y=RI(r.y+m,r.y+r.h-1-m);if(cellFree(x,y)&&!doorNear(x,y))return{x,y}}return null};
  rooms.forEach(r=>{
    if(r.kind==='elev'){return}
    const nd=cfg.id===0?0:RI(1,3);
    for(let i=0;i<nd;i++){const c=randIn(r,1);if(c){occ.add(I(c.x,c.y));{const o=rd()<.5;addSpr('desk',c.x+.5,c.y+.5,{r:.42,box:o?[.46,.26,.6]:[.26,.46,.6]})};if(rd()<.7){const cc=[[1,0],[-1,0],[0,1],[0,-1]].map(d=>({x:c.x+d[0],y:c.y+d[1]})).find(p=>cellFree(p.x,p.y)&&!doorNear(p.x,p.y));if(cc){occ.add(I(cc.x,cc.y));addSpr('chair',cc.x+.5,cc.y+.5,{r:.2,box:[.17,.17,.52]})}}}}
    const nl=cfg.id===0?(r.kind==='exit'?0:0):RI(1,2);
    for(let i=0;i<nl;i++){ // 사물함: 벽에 붙은 칸 (숨기 지점)
      for(let k=0;k<20;k++){const side=RI(0,3),t=side<2?RI(r.x,r.x+r.w-1):RI(r.y,r.y+r.h-1);const x=side===0?t:side===1?t:(side===2?r.x:r.x+r.w-1),y=side===0?r.y:side===1?r.y+r.h-1:t;
        if(cellFree(x,y)&&!doorNear(x,y)){occ.add(I(x,y));const fx=side===0?0:side===1?0:0;addSpr('locker',x+.5,(side===0?y+.28:side===1?y+.72:y+.5),{r:.3,hide:true,face:side,box:side<2?[.24,.2,1]:[.2,.24,1]});break}}}
    if(rd()<.5){const c=randIn(r,0);if(c){occ.add(I(c.x,c.y));addSpr('plant',c.x+.5,c.y+.5,{r:.15,box:[.15,.15,.56]})}}
  });
  // 조명 (램프)
  const lamps=[];
  rooms.forEach(r=>{
    const n=r.kind==='elev'?1:(r.w>=8?2:1);
    for(let i=0;i<n;i++){const x=n===1?r.cx:(i?r.x+r.w-2:r.x+1),y=r.cy;const alive=r.kind==='elev'||rd()<cfg.lamps+.25;lamps.push({x,y,R:r.kind==='elev'?7:6,col:[1,.95,.8],str:alive?(r.kind==='elev'?.7:.5):0,flick:alive&&rd()<(cfg.id===0?.5:.4),panel:true})}
  });
  const cc=[];for(let i=0;i<N*N;i++)if(corr[i]&&g[i]===0)cc.push(i);
  for(let k=0;k<cc.length;k+=7){const c=cc[k],x=c%N,y=(c/N)|0;const alive=rd()<cfg.lamps;lamps.push({x,y,R:5,col:[1,.93,.78],str:alive?.42:0,flick:alive&&rd()<.5,panel:true})}
  lamps.push({x:ex.ix,y:ex.iy,R:5,col:[.25,1,.55],str:.55,flick:false,panel:false});
  L.lamps=lamps;
  L.lightR=new Float32Array(N*N);L.lightG=new Float32Array(N*N);L.lightB=new Float32Array(N*N);L.fl=new Float32Array(N*N);L.lampCell=new Int8Array(N*N).fill(-1);
  lamps.forEach((lp,li)=>{
    const sx=Math.floor(lp.x),sy=Math.floor(lp.y);if(g[I(sx,sy)]!==0)return;
    if(lp.panel)L.lampCell[I(sx,sy)]=lp.str>0?(lp.flick?2:1):0;
    if(lp.str<=0)return;
    const dd=new Map([[I(sx,sy),0]]),q=[I(sx,sy)];
    for(let h=0;h<q.length;h++){const c=q[h],d=dd.get(c),cx=c%N,cy=(c/N)|0;if(d>=lp.R)continue;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const n=I(cx+dx,cy+dy);if(!inb(cx+dx,cy+dy)||dd.has(n))continue;const t=g[n];if(t===1||t===4)continue;dd.set(n,d+(t===2||t===3?2:1));q.push(n)}}
    for(const[c,d]of dd){if(d>lp.R)continue;const f=(1-d/lp.R);const v=lp.str*f*f;
      if(lp.flick){L.fl[c]+=v}else{L.lightR[c]+=v*lp.col[0];L.lightG[c]+=v*lp.col[1];L.lightB[c]+=v*lp.col[2]}}
  });
  // 획득물
  const spots=[];rooms.forEach(r=>{if(r.kind!=='elev')for(let y=r.y;y<r.y+r.h;y++)for(let x=r.x;x<r.x+r.w;x++)if(cellFree(x,y)&&!doorNear(x,y))spots.push({x,y,r})});
  cc.forEach(c=>{if(rd()<.25)spots.push({x:c%N,y:(c/N)|0,r:null})});
  const takeSpot=(pred)=>{const c=spots.filter(pred);if(!c.length)return null;const s=PK(c);spots.splice(spots.indexOf(s),1);occ.add(I(s.x,s.y));return s};
  const addPick=(type,s,o={})=>{if(s)addSpr(type,s.x+.5+R(-.2,.2),s.y+.5+R(-.2,.2),Object.assign({pick:type},o))};
  const far=s=>!s.r||s.r.kind!=='elev';
  for(let i=0;i<cfg.coins;i++)addPick('coin',takeSpot(far),{val:1});
  for(let i=0;i<cfg.bats;i++)addPick('bat',takeSpot(far));
  const itemPool=['flare','drink','decoy','compass'];
  for(let i=0;i<cfg.items;i++)addPick(PK(itemPool),takeSpot(far));
  if(cfg.key){const s=takeSpot(s=>s.r===keyRoom);addPick(cfg.key.t,s||takeSpot(far),{big:true,pick:'key'})}
  if(cfg.id===0){addSpr('torch',sr.cx+.5+1,sr.cy+.5+1,{pick:'torch'})}
  // 괴물 스폰 / 순찰 지점
  L.wp=rooms.filter(r=>r.kind!=='elev').map(r=>({x:r.cx+.5,y:r.cy+.5}));
  L.mspawn=order.filter(r=>rd_(r)>=14).map(r=>({x:r.cx+.5,y:r.cy+.5}));
  if(!L.mspawn.length)L.mspawn=[{x:exitRoom.cx+.5,y:exitRoom.cy+.5}];
  // 램프 패널 (천장 발광 위치)
  return L;
}

// ===== 게임 상태 / 플레이어 / 괴물 AI / 아이템 / QTE =====
const DBG=!!window.__ELV_DEBUG;
const G={mode:'title',floor:0,seed:1,t:0,fk:1,fkT:2,fkB:0};
const RUN={gold:0,inv:[],deaths:0,t:0,used:0,coins:0,floors:0};
let SNAP={gold:0,inv:[]};
let L=null,P=null,MON=[],DEC=null,QT=null,god=false;
const FX={flash:0,hurt:0,shake:0,msg:'',msgT:0,flashC:'#fff',caught:0};
const MAXINV=4,DX=[1,-1,0,0],DY=[0,0,1,-1];
const msg=(t,s=2.6)=>{FX.msg=t;FX.msgT=s};
const vib=ms=>{try{if(S.hap&&navigator.vibrate)navigator.vibrate(ms)}catch(e){}};
const angDiff=(a,b)=>{let d=(a-b)%TAU;if(d>Math.PI)d-=TAU;if(d<-Math.PI)d+=TAU;return d};
const tile=(x,y)=>{x=Math.floor(x);y=Math.floor(y);return(x<0||y<0||x>=L.N||y>=L.N)?1:L.g[y*L.N+x]};
const doorAt=(x,y)=>L.doors.get(Math.floor(y)*L.N+Math.floor(x));
function solidAt(x,y){const t=tile(x,y);if(t===1||t===4)return true;if(t===2||t===3){const d=doorAt(x,y);return!d||d.open<.7}return false}
function los(x1,y1,x2,y2){const d=hyp(x2-x1,y2-y1),n=Math.ceil(d/.18);for(let i=1;i<n;i++){const t=i/n;if(solidAt(x1+(x2-x1)*t,y1+(y2-y1)*t))return false}return true}
const SOLIDS={desk:1,locker:1,plant:1,chair:1};
function blocked(x,y,r,ignoreSpr){
  const x0=Math.floor(x-r),x1=Math.floor(x+r),y0=Math.floor(y-r),y1=Math.floor(y+r);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++)if(solidAt(cx+.5,cy+.5)){const nx=clamp(x,cx,cx+1),ny=clamp(y,cy,cy+1);if((x-nx)*(x-nx)+(y-ny)*(y-ny)<r*r)return true}
  if(!ignoreSpr)for(const s of L.spr){if(!s.r||!SOLIDS[s.type]||P.hide===s)continue;const dx=x-s.x,dy=y-s.y,rr=s.r+r;if(dx*dx+dy*dy<rr*rr)return true}
  return false;
}
function tryMove(o,dx,dy,r,ign){if(!blocked(o.x+dx,o.y,r,ign))o.x+=dx;if(!blocked(o.x,o.y+dy,r,ign))o.y+=dy}
// ---- 길찾기 (BFS) ----
let bP=null,bQ=null;
function findPath(sx,sy,tx,ty){
  const N=L.N,g=L.g;if(!bP||bP.length!==N*N){bP=new Int32Array(N*N);bQ=new Int32Array(N*N)}
  sx=clamp(sx|0,0,N-1);sy=clamp(sy|0,0,N-1);tx=clamp(tx|0,0,N-1);ty=clamp(ty|0,0,N-1);
  bP.fill(-2);const s=sy*N+sx,t=ty*N+tx;if(s===t)return[];
  let h=0,tl=0;bQ[tl++]=s;bP[s]=-1;
  while(h<tl){const c=bQ[h++];if(c===t)break;const cx=c%N,cy=(c/N)|0;
    for(let k=0;k<4;k++){const nx=cx+DX[k],ny=cy+DY[k];if(nx<0||ny<0||nx>=N||ny>=N)continue;const n=ny*N+nx;if(bP[n]!==-2)continue;const tt=g[n];if(tt===1||tt===4)continue;bP[n]=c;bQ[tl++]=n}}
  if(bP[t]===-2)return null;
  const p=[];for(let c=t;c!==s;c=bP[c])p.push(c);p.reverse();return p;
}
// ---- 소리 ----
const panOf=(x,y)=>Math.sin(angDiff(Math.atan2(y-P.y,x-P.x),P.a));
function noise(x,y,r,src){
  for(const m of MON){if(m.stun>0)continue;const d=hyp(m.x-x,m.y-y);if(d>r*m.hear*(los(m.x,m.y,x,y)?1:.65))continue;hear(m,x,y,src)}
}
function hear(m,x,y,src){
  if(src==='player'&&P.hide)return;
  if(src==='decoy'){m.attn=G.t+12;if(m.st==='chase'&&m.seen)return;m.st='investigate';m.tx=x;m.ty=y;m.rp=0;m.path=null;m.windup=.35;return}
  if(m.st==='chase'||(m.attn&&m.attn>G.t))return;
  if(m.st==='investigate'&&hyp(m.tx-x,m.ty-y)<2)return;
  m.st='investigate';m.tx=x;m.ty=y;m.rp=0;m.path=null;m.windup=.4;
}
// ---- 문 ----
function openDoor(d,who){
  if(d.st==='open'||d.st==='opening')return;
  d.st='opening';
  if(who==='mon'){if(d.qte){d.qte=false;SFX.slam();FX.shake=Math.max(FX.shake,.15)}else SFX.door()}
  else{SFX.door();noise(d.x+.5,d.y+.5,5,'player')}
}
function updDoors(dt){
  for(const d of L.doors.values()){
    if(d.st==='opening'){d.open=Math.min(1,d.open+dt*2.2);if(d.open>=1)d.st='open'}
    else if(d.st==='closing'){
      const pc=Math.floor(P.x)===d.x&&Math.floor(P.y)===d.y,mc=MON.some(m=>Math.floor(m.x)===d.x&&Math.floor(m.y)===d.y);
      if(pc||mc){d.st='opening'}else{d.open=Math.max(0,d.open-dt*2.6);if(d.open<=0){d.st='closed';SFX.slam()}}
    }
  }
}
// ---- 레벨 로드 ----
function loadFloor(i,retry){
  const cfg=FLOORS[i];G.floor=i;
  if(!retry){G.seed=(Math.random()*1e9|0)+1;SNAP={gold:RUN.gold,inv:RUN.inv.slice()}}else{RUN.gold=SNAP.gold;RUN.inv=SNAP.inv.slice()}
  L=genLevel(cfg,G.seed);
  P={x:L.start.x,y:L.start.y,a:0,pitch:0,st:100,exh:0,stD:0,run:false,fl:false,bat:100,boost:0,drink:0,flare:0,comp:false,key:false,hasTorch:i>0,hide:null,stepT:0,lock:0,bob:0,spd:0,breathT:0,hbT:0,drone:0,minD:99,pickMsgT:0};
  for(const d of L.doors.values())if(d.type===3){P.a=Math.atan2(d.y+.5-P.y,d.x+.5-P.x)}
  P.fl=P.hasTorch;MON=[];DEC=null;QT=null;G.floorT=0;G.t=0;
  cfg.monsters.forEach((ty,k)=>{
    const sp=L.mspawn[(k*3+((G.seed>>3)%L.mspawn.length))%L.mspawn.length],M=MT[ty];
    MON.push({type:ty,M,x:sp.x,y:sp.y,face:0,st:'patrol',path:null,pi:0,wait:6+k*3,tx:sp.x,ty:sp.y,rp:0,stun:0,windup:0,seen:false,lost:0,lastX:sp.x,lastY:sp.y,doorT:-1,stepT:0,d:99,search:0,knows:false,attn:0,catchT:0,sfT:0,mul:1,dorm:ty==='void',bT:0,pingT:8});
  });
  FX.flash=0;FX.hurt=0;FX.caught=0;
  buildLM();
}
const MT={
  after:{name:'걸어 다니는 잔상',sp:[1.35,2.95],sight:7,fov:105,hear:1.0,tex:'after',w:.62,h:1.0,lost:4.5},
  faceless:{name:'얼굴 없는 추격자',sp:[1.5,3.3],sight:8.5,fov:120,hear:.7,tex:'faceless',w:.5,h:1.0,lost:5,silent:true,look:true},
  void:{name:'공허',sp:[2.1,3.45],sight:11,fov:360,hear:1.5,tex:'void',w:.85,h:1.15,lost:10,beep:true},
  patient:{name:'기어오는 환자',sp:[1.15,3.75],sight:9,fov:160,hear:.8,tex:'patient',w:.95,h:.55,lost:5.5},
};
// ---- 괴물 AI ----
function canSee(m,d){
  if(P.hide&&!m.knows)return false;
  let rg=m.M.sight*(P.fl?1.45:1)*(P.flare>0?1.3:1);
  if(m.st==='chase')rg*=1.25;
  if(d>rg)return false;
  if(d>1.8&&m.st!=='chase'){const ang=Math.abs(angDiff(Math.atan2(P.y-m.y,P.x-m.x),m.face));if(ang>m.M.fov*Math.PI/360)return false}
  return los(m.x,m.y,P.x,P.y);
}
function monGo(m,tx,ty){m.tx=tx;m.ty=ty;m.path=findPath(m.x,m.y,tx,ty);m.pi=0;m.rp=.45}
function follow(m,dt,sp){
  if(!m.path||m.pi>=m.path.length)return true;
  const N=L.N,c=m.path[m.pi],cx=(c%N)+.5,cy=((c/N)|0)+.5,dd=L.doors.get(c);
  if(dd&&dd.open<.9){
    if(dd.st==='closed'||dd.st==='closing'){if(hyp(cx-m.x,cy-m.y)<1.3){if(m.doorT<0)m.doorT=dd.qte?2.4:1.0;m.doorT-=dt;if(m.doorT<=0){m.doorT=-1;openDoor(dd,'mon')}}}
    else if(dd.st==='opening'&&hyp(cx-m.x,cy-m.y)>=1.3){}
    if(hyp(cx-m.x,cy-m.y)<1.3||dd.open<.5)return false;
  }
  const dx=cx-m.x,dy=cy-m.y,d=hyp(dx,dy);
  if(d<.1){m.pi++;return m.pi>=m.path.length}
  const s=Math.min(d,sp*dt);m.x+=dx/d*s;m.y+=dy/d*s;m.face=Math.atan2(dy,dx);return false;
}
function monDirect(m,dt,sp){
  const dx=P.x-m.x,dy=P.y-m.y,d=hyp(dx,dy)||1,s=sp*dt,r=.28;
  const nx=m.x+dx/d*s,ny=m.y+dy/d*s;
  if(!blocked(nx,ny,r,true)){m.x=nx;m.y=ny;m.face=Math.atan2(dy,dx);return true}
  return false;
}
function updMon(m,dt){
  const M=m.M,d=hyp(P.x-m.x,P.y-m.y);m.d=d;
  if(m.dorm){m.d=99;return}
  if(m.stun>0){m.stun-=dt;return}
  let mul=1;
  if(M.look){const lk=Math.abs(angDiff(P.a,Math.atan2(m.y-P.y,m.x-P.x)+Math.PI))<.6&&d<16&&los(m.x,m.y,P.x,P.y);mul=lk?.22:1;m.looked=lk}
  if(M.beep){m.pingT-=dt;if(m.pingT<=0&&m.st!=='chase'){m.pingT=9;m.st='investigate';m.tx=P.x;m.ty=P.y;m.path=null;m.rp=0}
    m.bT-=dt;if(m.bT<=0){m.bT=clamp(.14+d*.055,.16,1.3);tone(1500,.05,'square',clamp(.16/(1+d*.12),.03,.16),0,panOf(m.x,m.y))}}
  if(m.windup>0){m.windup-=dt;m.face=Math.atan2(P.y-m.y,P.x-m.x)*(m.st==='chase'?1:0)+m.face*(m.st==='chase'?0:1);return}
  const seen=canSee(m,d);m.seen=seen;
  if(seen){
    m.lastX=P.x;m.lastY=P.y;m.lost=0;
    if(m.st!=='chase'){
      m.st='chase';m.windup=.55;m.rp=0;m.path=null;
      if(m.sfT<=0){SFX.scare();m.sfT=6}FX.flash=Math.max(FX.flash,.25);FX.flashC='#fff';vib(60);
      msg('⚠ 들켰다! 도망치세요!',2);
      return;
    }
  }
  m.sfT-=dt;
  // 접촉 (잡힘)
  if(!god&&d<.62&&!P.hide&&m.st==='chase'&&G.mode!=='caught')return caught(m);
  switch(m.st){
    case 'patrol':{
      if(!m.path||m.pi>=m.path.length){
        if(m.wait>0){m.wait-=dt;break}
        const c=L.wp.filter(w=>hyp(w.x-m.x,w.y-m.y)>6);const w=c.length?c[Math.floor(Math.random()*c.length)]:L.wp[0];
        monGo(m,w.x,w.y);if(!m.path){m.wait=1.5;break}m.wait=1+Math.random()*2.5;
      }else follow(m,dt,M.sp[0]*mul);
      break}
    case 'investigate':{
      m.rp-=dt;
      if(!m.path&&m.rp<=0)monGo(m,m.tx,m.ty);
      if(!m.path){m.st='search';m.search=3;break}
      if(follow(m,dt,M.sp[0]*1.45*mul)||hyp(m.tx-m.x,m.ty-m.y)<.7){m.st='search';m.search=4;m.path=null}
      break}
    case 'chase':{
      m.rp-=dt;
      const tx=seen?P.x:m.lastX,ty=seen?P.y:m.lastY;
      if(P.hide&&m.knows){// 숨은 곳으로 접근
        const hs=P.hide;if(hyp(hs.x-m.x,hs.y-m.y)<1.1){m.catchT+=dt;m.face=Math.atan2(hs.y-m.y,hs.x-m.x);if(m.catchT>2.4&&!god)return caught(m)}else{if(m.rp<=0||!m.path)monGo(m,hs.x,hs.y);follow(m,dt,M.sp[1]*mul)}
        break}
      if(!seen){m.lost+=dt;if(m.lost>M.lost){m.st='search';m.search=6;m.path=null;m.tx=m.lastX;m.ty=m.lastY;break}}
      if(seen&&d<3.4&&monDirect(m,dt,M.sp[1]*mul)){m.path=null;break}
      if(m.rp<=0||!m.path){monGo(m,tx,ty)}
      if(m.path)follow(m,dt,M.sp[1]*mul);
      break}
    case 'search':{
      m.search-=dt;
      if(P.hide&&hyp(P.hide.x-m.x,P.hide.y-m.y)<1.2){m.catchT+=dt;if(m.catchT>3.2&&!god)return caught(m)}else m.catchT=Math.max(0,m.catchT-dt);
      if(!m.path||m.pi>=m.path.length){
        if(m.search>0&&Math.random()<dt*.9){const a=Math.random()*TAU,r=2+Math.random()*3;monGo(m,m.tx+Math.cos(a)*r,m.ty+Math.sin(a)*r);if(!m.path)m.path=null}
      }else follow(m,dt,M.sp[0]*1.2*mul);
      if(m.search<=0){m.st='patrol';m.path=null;m.wait=2;m.knows=false;m.catchT=0}
      break}
  }
  // 괴물 자체 소음 (예고)
  const mv=m.st==='chase'?M.sp[1]:M.sp[0];
  m.stepT-=dt;
  if(m.stepT<=0&&d<20&&!M.silent&&!M.beep){
    m.stepT=m.type==='after'?(m.st==='chase'?.3:.55):(m.st==='chase'?.26:.5);
    const vol=clamp(.34/(1+d*.35),0,.34)*(los(m.x,m.y,P.x,P.y)?1:.55),pan=panOf(m.x,m.y);
    if(m.type==='after')SFX.step(vol*1.5,pan);else nz(.16,vol*.9,m.st==='chase'?1600:700,pan,300);
  }
}
function caught(m){
  if(G.mode==='caught')return;
  G.mode='caught';FX.caught=0;FX.hurt=1;FX.flash=.9;FX.flashC='#a00';FX.shake=.5;SFX.scare();vib([120,60,200]);
  G.cm=m;RUN.deaths++;QT=null;showQTE(false);
}
// ---- 아이템 ----
function addItem(id){if(RUN.inv.length>=MAXINV)return false;RUN.inv.push(id);return true}
function useItem(i){
  if(G.mode!=='play'&&G.mode!=='qte')return;
  const id=RUN.inv[i];if(!id)return;
  if(P.hide&&id!=='bat'&&id!=='compass'&&id!=='drink'){msg('숨어 있을 땐 쓸 수 없다');return}
  switch(id){
    case 'flare':P.flare=15;FX.flash=.7;FX.flashC='#ffd9a0';SFX.flare();noise(P.x,P.y,6,'player');
      for(const m of MON){const d=hyp(m.x-P.x,m.y-P.y);if(d<11&&Math.abs(angDiff(Math.atan2(m.y-P.y,m.x-P.x),P.a))<1.3&&los(P.x,P.y,m.x,m.y)){m.stun=5;m.path=null}}
      msg('조명탄! 정면의 추격자가 5초간 멈춘다');break;
    case 'drink':P.drink=20;SFX.gulp();msg('에너지 드링크: 20초간 지치지 않는다');break;
    case 'decoy':{let x=P.x,y=P.y;const cx=Math.cos(P.a)*.25,cy=Math.sin(P.a)*.25;for(let k=0;k<20;k++){if(solidAt(x+cx,y+cy))break;x+=cx;y+=cy}
      DEC={x,y,t:10,b:0};SFX.click();msg('음향 유인구를 던졌다');break}
    case 'compass':P.comp=true;SFX.click();msg('나침반: 이번 층 동안 방향이 표시된다');break;
    case 'bat':P.bat=100;P.boost=30;SFX.pick();msg('배터리 충전! 30초간 손전등이 더 멀리 비춘다');break;
  }
  RUN.inv.splice(i,1);RUN.used++;
}
// ---- QTE ----
function startQTE(kind,d){
  let lv=[{t:8,f:7,dec:6},{t:5,f:7,dec:10},{t:4,f:6,dec:14}][S.qte]||{t:5,f:7,dec:10};if(kind==='exit'&&L.cfg.final)lv={t:lv.t*.85,f:lv.f,dec:lv.dec*1.15};
  QT={kind,d,t:lv.t,T:lv.t,fill:0,f:lv.f,dec:lv.dec};G.mode='qte';showQTE(true);SFX.click();
}
function qteTap(){if(G.mode!=='qte'||!QT)return;QT.fill=Math.min(100,QT.fill+QT.f);FX.shake=Math.max(FX.shake,.1);SFX.tap();vib(10);if(QT.fill>=100)qteEnd(true)}
function qteEnd(ok){
  const q=QT;QT=null;showQTE(false);if(G.mode!=='qte')return;G.mode='play';
  if(ok){
    if(q.kind==='exit'){floorClear();return}
    if(q.d){q.d.qte=false;openDoor(q.d,'player')}
  }else{P.lock=1.2;SFX.slam();noise(P.x,P.y,9,'player');FX.shake=.35;msg('열리지 않았다…! 큰 소리가 났다');vib(80)}
}
function qteCancel(){if(G.mode!=='qte')return;QT=null;showQTE(false);G.mode='play'}
// ---- 상호작용 ----
function findTarget(){
  if(P.hide)return{k:'unhide',txt:'사물함에서 나오기'};
  const cs=Math.cos(P.a),sn=Math.sin(P.a);
  for(let s=.3;s<=1.7;s+=.1){
    const x=P.x+cs*s,y=P.y+sn*s,t=tile(x,y);
    if(t===4)return{k:'exit',txt:(L.cfg.key&&!P.key)?'비상구 (잠김 — '+L.cfg.key.n+' 필요)':'비상구 열기 (연타)'};
    if(t===2||t===3){const d=doorAt(x,y);if(!d)continue;
      if(d.open<.9)return{k:'door',d,txt:d.qte?'문 열기 (뻑뻑함 · 연타)':'문 열기'};
      if(s<1.3&&!(Math.floor(P.x)===d.x&&Math.floor(P.y)===d.y))return{k:'close',d,txt:'문 닫기'}}
    if(t===1)break;
  }
  let best=null,bd=1.6;
  for(const s of L.spr){if(!s.hide)continue;const d=hyp(s.x-P.x,s.y-P.y);if(d<bd&&Math.abs(angDiff(Math.atan2(s.y-P.y,s.x-P.x),P.a))<.8){bd=d;best=s}}
  if(best)return{k:'hide',s:best,txt:'사물함에 숨기'};
  return null;
}
function interact(){
  if(G.mode!=='play'||P.lock>0)return;
  const t=findTarget();if(!t)return;
  if(t.k==='unhide')return leaveHide();
  if(t.k==='door'){if(t.d.qte)startQTE('door',t.d);else openDoor(t.d,'player')}
  else if(t.k==='close'){t.d.st='closing';SFX.click()}
  else if(t.k==='exit'){if(L.cfg.key&&!P.key){msg('잠겨 있다. 이 층 어딘가에 '+L.cfg.key.n+'이(가) 있다');SFX.click();return}startQTE('exit',null)}
  else if(t.k==='hide')enterHide(t.s);
}
function enterHide(s){
  P.hide=s;P.px=P.x;P.py=P.y;P.x=s.x;P.y=s.y;P.fl=false;P.hideA=[Math.PI/2,-Math.PI/2,0,Math.PI][s.face]||0;P.a=P.hideA;P.pitch=0;SFX.click();
  for(const m of MON){const d=hyp(m.x-P.x,m.y-P.y);if(d<9&&los(m.x,m.y,P.x,P.y)&&m.stun<=0){m.knows=true;m.st='chase';m.path=null;m.windup=.4;msg('⚠ 숨는 걸 들켰다!',2)}}
}
function leaveHide(){
  const s=P.hide;if(!s)return;
  const fa=P.hideA;let ok=false;
  for(const dd of[.75,.6,.9]){const nx=s.x+Math.cos(fa)*dd,ny=s.y+Math.sin(fa)*dd;P.hide=null;if(!blocked(nx,ny,.22)){P.x=nx;P.y=ny;ok=true;break}P.hide=s}
  if(!ok){P.hide=null;P.x=P.px;P.y=P.py}
  SFX.click();
}
// ---- 줍기 ----
function pickups(){
  for(const s of L.spr){
    if(!s.pick||s.gone)continue;
    if(hyp(s.x-P.x,s.y-P.y)>.6)continue;
    if(s.pick==='coin'){s.gone=true;RUN.gold++;RUN.coins++;SFX.coin();noise(P.x,P.y,2,'player')}
    else if(s.pick==='key'){s.gone=true;P.key=true;SFX.pick();msg(L.cfg.key.ic+' '+L.cfg.key.n+'을(를) 찾았다! 비상구로 가자');
      if(L.cfg.final){const v=MON.find(m=>m.type==='void');if(v&&v.dorm){let bs=L.mspawn[0],bd=-1;for(const sp of L.mspawn){const d=hyp(sp.x-P.x,sp.y-P.y);if(d>bd){bd=d;bs=sp}}v.x=bs.x;v.y=bs.y;v.dorm=false;v.st='investigate';v.tx=P.x;v.ty=P.y;v.path=null;v.windup=1.2;SFX.scare();FX.flash=.6;FX.flashC='#a00';msg('⚠ 무언가 깨어났다… 비상구로 서둘러!',4)}}}
    else if(s.pick==='torch'){s.gone=true;P.hasTorch=true;P.fl=true;SFX.pick();msg('🔦 손전등을 얻었다 (손전등 버튼으로 켜고 끈다)',3.5)}
    else if(ITEMDEF[s.pick]){
      if(addItem(s.pick)){s.gone=true;SFX.pick();msg(ITEMDEF[s.pick].ic+' '+ITEMDEF[s.pick].n+' 획득')}
      else if(P.pickMsgT<=0){msg('가방이 가득 찼다 (최대 '+MAXINV+'칸)');P.pickMsgT=2}
    }
  }
}
// ---- 층 클리어 ----
function floorClear(){
  G.mode='trans';SFX.win();RUN.floors++;showQTE(false);
  flowAfterFloor();
}
// ---- 프레임 갱신 ----
function update(dt){
  FX.flash=Math.max(0,FX.flash-dt*1.6);FX.hurt=Math.max(0,FX.hurt-dt*.5);FX.shake=Math.max(0,FX.shake-dt*1.2);FX.msgT=Math.max(0,FX.msgT-dt);
  // 형광등 깜빡임 (전역)
  G.fkT-=dt;if(G.fkT<=0){if(G.fkB>0){G.fkB--;G.fkT=.04+Math.random()*.08;G.fk=Math.random()<.5?.15:1.1}else{G.fk=1;G.fkB=Math.random()<.5?ri(2,6):0;G.fkT=G.fkB?.03:1.5+Math.random()*4}}
  if(G.mode==='caught'){caughtUpd(dt);return}
  if(G.mode!=='play'&&G.mode!=='qte')return;
  G.t+=dt;G.floorT+=dt;RUN.t+=dt;P.pickMsgT-=dt;P.lock-=dt;
  updDoors(dt);
  // 손전등 / 배터리
  if(P.fl&&P.hasTorch){P.bat-=dt*.55;if(P.bat<=0){P.bat=0;P.fl=false;msg('배터리가 다 됐다…')}}
  P.boost=Math.max(0,P.boost-dt);P.drink=Math.max(0,P.drink-dt);P.flare=Math.max(0,P.flare-dt);
  // 이동
  if(G.mode==='play'&&P.lock<=0&&!P.hide){
    let mx=IN.jx,my=IN.jy;
    if(IN.k.w)my-=1;if(IN.k.s)my+=1;if(IN.k.a)mx-=1;if(IN.k.d)mx+=1;
    let ml=hyp(mx,my);if(ml>1){mx/=ml;my/=ml;ml=1}
    const wantRun=(P.run||IN.k.shift)&&ml>.2&&P.exh<=0&&(P.st>0||P.drink>0);
    let sp=wantRun?3.5:1.95;if(P.exh>0)sp*=.5;if(P.drink>0)sp*=1.4;
    sp*=ml<.35?ml/.35*.6+.4*0:Math.max(.35,ml);
    if(ml<.05)sp=0;
    const cs=Math.cos(P.a),sn=Math.sin(P.a);
    const vx=(cs*-my-sn*mx),vy=(sn*-my+cs*mx),vl=hyp(vx,vy)||1;
    if(sp>0){tryMove(P,vx/vl*sp*dt,vy/vl*sp*dt,.22)}
    P.spd=lerp(P.spd,sp,.2);P.bob+=sp*dt*2.6;
    // 스태미나
    if(wantRun&&sp>0){if(P.drink<=0)P.st=Math.max(0,P.st-dt*20);P.stD=.8;if(P.st<=0){P.exh=3;P.run=false;msg('숨이 차서 달릴 수 없다!',2)}}
    else{P.stD-=dt;if(P.stD<=0&&P.exh<=0)P.st=Math.min(100,P.st+dt*(sp>0?9:16))}
    if(P.exh>0){P.exh-=dt;P.breathT-=dt;if(P.breathT<=0){P.breathT=.9;breath(.14,0);noise(P.x,P.y,4,'player')}if(P.exh<=0)P.st=Math.max(P.st,8)}
    // 발소리
    if(sp>0){P.stepT-=dt;if(P.stepT<=0){P.stepT=wantRun?.32:.52;SFX.step(wantRun?.2:.09,0);noise(P.x,P.y,wantRun?9:3.4,'player')}}
  }
  if(P.hide){const dl=angDiff(P.a,P.hideA);if(Math.abs(dl)>.6)P.a=P.hideA+Math.sign(dl)*.6}
  if(DEC){DEC.t-=dt;DEC.b-=dt;if(DEC.b<=0){DEC.b=1;SFX.decoy(panOf(DEC.x,DEC.y),clamp(.12/(1+hyp(DEC.x-P.x,DEC.y-P.y)*.15),.02,.12));noise(DEC.x,DEC.y,13,'decoy')}if(DEC.t<=0)DEC=null}
  pickups();
  // 괴물
  let minD=99;
  for(const m of MON){updMon(m,dt);if(G.mode==='caught')break;minD=Math.min(minD,m.d)}
  P.minD=minD;
  // 근접 연출 (심장박동 / 드론)
  if(minD<8){P.hbT-=dt;if(P.hbT<=0){P.hbT=lerp(.38,1,clamp((minD-1.5)/6.5,0,1));heartbeat(.2+.25*(1-minD/8))}}
  const tgtDr=clamp((16-minD)/16,0,1)*.11;P.drone=lerp(P.drone,tgtDr,.05);
  if(AMB&&AC){AMB.drone.gain.value=S.sound?P.drone:0;AMB.buzz.gain.value=S.sound?.012:0}
  // 컴퍼스
  if(G.mode==='qte'&&QT){QT.t-=dt;QT.fill=Math.max(0,QT.fill-QT.dec*dt);if(QT.fill>=100)qteEnd(true);else if(QT.t<=0)qteEnd(false)}
}
function caughtUpd(dt){
  FX.caught+=dt;const m=G.cm;
  if(m){const ta=Math.atan2(m.y-P.y,m.x-P.x);P.a+=angDiff(ta,P.a)*Math.min(1,dt*9);const d=hyp(m.x-P.x,m.y-P.y);if(d>.45){m.x+=(P.x-m.x)/d*dt*2.2;m.y+=(P.y-m.y)/d*dt*2.2}}
  FX.shake=Math.max(FX.shake,.25);
  if(FX.caught>1.5&&G.mode==='caught'){G.mode='over';showOver()}
}

// ===== 레이캐스터 렌더러 (의존성 없는 소프트웨어 3D · 조명 + 손전등 + 스프라이트) =====
let cv=null,cx2=null,IMG=null,BUF=null,W=0,H=0,ZB=null,RL=null,BX2=null,PL=.85,VK=200,LM=null;
function buildLM(){
  const N=L.N;LM=new Float32Array(N*N*4);
  for(let i=0;i<N*N;i++){LM[i*4]=L.lightR[i];LM[i*4+1]=L.lightG[i];LM[i*4+2]=L.lightB[i];LM[i*4+3]=L.fl[i]}
}
function resizeGfx(){
  if(!cv)return;
  const rw=root.clientWidth||innerWidth,rh=root.clientHeight||innerHeight,ar=rw/rh;
  const tgt=[120*213,150*267,200*355][S.quality]||150*267;
  W=Math.max(64,Math.round(Math.sqrt(tgt*ar)));H=Math.max(64,Math.round(Math.sqrt(tgt/ar)));
  cv.width=W;cv.height=H;IMG=cx2.createImageData(W,H);BUF=IMG.data;for(let i=3;i<BUF.length;i+=4)BUF[i]=255;
  PL=clamp(.5*ar,.45,.85);VK=W/(2*PL);ZB=new Float32Array(W);RL=new Float32Array(W);BX2=new Float32Array(W);
  for(let x=0;x<W;x++){const c=2*(x+.5)/W-1;RL[x]=Math.sqrt(1+PL*PL*c*c)}
}
const LC=[0,0,0];let TNT=[1,1,1],AMB0=.045,AMB1=.045,AMB2=.045;
function lightAt(x,y){
  const N=L.N,fx=x-.5,fy=y-.5,ix=Math.floor(fx),iy=Math.floor(fy),tx=fx-ix,ty=fy-iy;
  const x0=ix<0?0:ix>=N?N-1:ix,x1=ix+1<0?0:ix+1>=N?N-1:ix+1,y0=iy<0?0:iy>=N?N-1:iy,y1=iy+1<0?0:iy+1>=N?N-1:iy+1;
  const a=(y0*N+x0)*4,b=(y0*N+x1)*4,c=(y1*N+x0)*4,d=(y1*N+x1)*4,w0=(1-tx)*(1-ty),w1=tx*(1-ty),w2=(1-tx)*ty,w3=tx*ty;
  const f=(LM[a+3]*w0+LM[b+3]*w1+LM[c+3]*w2+LM[d+3]*w3)*G.fk;
  LC[0]=(LM[a]*w0+LM[b]*w1+LM[c]*w2+LM[d]*w3+f)*TNT[0];LC[1]=(LM[a+1]*w0+LM[b+1]*w1+LM[c+1]*w2+LM[d+1]*w3+f)*TNT[1];LC[2]=(LM[a+2]*w0+LM[b+2]*w1+LM[c+2]*w2+LM[d+2]*w3+f*.9)*TNT[2];
}
let SPR_LIST=[];
function render(){
  if(!L||!P||!BUF)return;
  const N=L.N,g=L.g,doors=L.doors;
  const sh=FX.shake>0?(Math.random()-.5)*FX.shake*.06:0;
  const bobY=sh;TNT=L.cfg.tint||[1,1,1];AMB0=.045*TNT[0];AMB1=.045*TNT[1];AMB2=.045*TNT[2];
  let ang=P.a+(FX.shake>0?(Math.random()-.5)*FX.shake*.05:0);
  const px=P.x,py=P.y,dx=Math.cos(ang),dy=Math.sin(ang),plx=-dy*PL,ply=dx*PL;
  const hz=Math.round(H*(.5+P.pitch+bobY));
  // 손전등 파라미터
  const hasFl=P.fl&&P.hasTorch&&!P.hide;
  let fStr=0;if(hasFl){fStr=1;if(P.bat<20){const t=G.t*(P.bat<8?30:12);fStr=(Math.sin(t)+Math.sin(t*2.7+1)>-.4)?.55+P.bat/60:.12}}
  const fRange=(P.boost>0?11.5:7.2),RX=W*.40*(P.boost>0?1.25:1),RY=VK*.62*(P.boost>0?1.15:1),iRX=1/RX,iRY=1/RY;
  const cxm=W*.5;
  for(let x=0;x<W;x++){const q=(x+.5-cxm)*iRX;BX2[x]=q*q}
  const flr=P.flare>0?Math.min(1,P.flare/2):0;
  const flareR=9;
  const TW=TEX.wall,TF=TEX.floor,TC=TEX.ceil,TL=TEX.lamp;
  const fk=G.fk;
  // ---- 바닥/천장 ----
  const yMax=Math.max(H-1,2*hz);
  for(let y=hz+1;y<=yMax;y++){
    const p=y-hz,rd=.5*VK/p;if(rd>22)continue;
    let fxw=px+rd*(dx-plx),fyw=py+rd*(dy-ply);const sx=rd*2*plx/W,sy=rd*2*ply/W;
    const yc=2*hz-y,doF=y<H,doC=yc>=0&&yc<H;if(!doF&&!doC)continue;
    const by2f=((y-hz)*iRY)**2;
    const fogK=Math.max(0,1-rd/20);
    for(let x=0;x<W;x++,fxw+=sx,fyw+=sy){
      const cxl=Math.floor(fxw),cyl=Math.floor(fyw);
      if(cxl<0||cyl<0||cxl>=N||cyl>=N)continue;
      const ci=cyl*N+cxl,u=((fxw-cxl)*TS)&63,v=((fyw-cyl)*TS)&63,ti=(v*TS+u)*4;
      lightAt(fxw,fyw);
      let lr=AMB0+LC[0],lg=AMB1+LC[1],lb=AMB2+LC[2];
      const dE=rd*RL[x];
      if(fStr>0){const f=1-BX2[x]-by2f;if(f>0){const t=1-dE/fRange;if(t>0){const b=f*t*t*1.5*fStr;lr+=b;lg+=b*.96;lb+=b*.82}}}
      if(flr>0){const t=1-dE/flareR;if(t>0){const b=t*t*1.4*flr;lr+=b;lg+=b*.75;lb+=b*.5}}
      if(doF){
        const T=TF[L.corr[ci]?1:0].d,o=(y*W+x)*4;
        BUF[o]=T[ti]*lr*fogK;BUF[o+1]=T[ti+1]*lg*fogK;BUF[o+2]=T[ti+2]*lb*fogK;
      }
      if(doC){
        const o=(yc*W+x)*4,lc=L.lampCell[ci];
        if(lc>=0&&u>14&&u<50&&v>14&&v<50){
          const k=lc===0?.18:lc===2?Math.min(1.2,fk):1,T=TL.d;
          BUF[o]=T[ti]*k*(lc===0?.5:1);BUF[o+1]=T[ti+1]*k*(lc===0?.5:1);BUF[o+2]=T[ti+2]*k*(lc===0?.5:1);
        }else{
          const T=TC.d,by2c=((yc-hz)*iRY)**2;let cr=lr,cg=lg,cb=lb;
          if(fStr>0){const f=1-BX2[x]-by2c;if(f>0){const t=1-dE/fRange;if(t>0){const b=f*t*t*1.5*fStr;const bf=b*.6-b;cr+=bf;cg+=bf*.96;cb+=bf*.82}}}
          BUF[o]=T[ti]*cr*fogK*.85;BUF[o+1]=T[ti+1]*cg*fogK*.85;BUF[o+2]=T[ti+2]*cb*fogK*.85;
        }
      }
    }
  }
  // 수평선 위 천장 쪽에서 floor row가 없는 윗부분(pitch가 아래일 때) 보정: 위쪽 남은 줄은 어둡게
  for(let y=0;y<Math.min(H,Math.max(0,2*hz-yMax));y++){const o=y*W*4;for(let x=0;x<W*4;x+=4){BUF[o+x]=4;BUF[o+x+1]=4;BUF[o+x+2]=6}}
  // 수평선 한 줄
  if(hz>=0&&hz<H){const o=hz*W*4;for(let x=0;x<W*4;x+=4){BUF[o+x]=6;BUF[o+x+1]=6;BUF[o+x+2]=8}}
  // ---- 벽 ----
  for(let x=0;x<W;x++){
    const cxm_=2*(x+.5)/W-1,rdx=dx+plx*cxm_,rdy=dy+ply*cxm_;
    let mx=Math.floor(px),my=Math.floor(py);
    const ddx=rdx===0?1e30:Math.abs(1/rdx),ddy=rdy===0?1e30:Math.abs(1/rdy);
    let stx,sty,sdx,sdy;
    if(rdx<0){stx=-1;sdx=(px-mx)*ddx}else{stx=1;sdx=(mx+1-px)*ddx}
    if(rdy<0){sty=-1;sdy=(py-my)*ddy}else{sty=1;sdy=(my+1-py)*ddy}
    let side=0,hit=0,perp=0,wx=0,tid=0,doorOff=0,guard=0;
    while(guard++<80){
      if(sdx<sdy){sdx+=ddx;mx+=stx;side=0}else{sdy+=ddy;my+=sty;side=1}
      if(mx<0||my<0||mx>=N||my>=N){hit=1;tid=1;break}
      const t=g[my*N+mx];if(t===0)continue;
      perp=side===0?sdx-ddx:sdy-ddy;
      wx=side===0?py+perp*rdy:px+perp*rdx;wx-=Math.floor(wx);
      if(t===2||t===3){const d=doors.get(my*N+mx);if(d&&d.open>0){if(wx<d.open)continue;doorOff=d.open}}
      hit=t;tid=t;break;
    }
    if(!hit){ZB[x]=99;continue}
    perp=side===0?sdx-ddx:sdy-ddy;if(perp<.05)perp=.05;
    wx=side===0?py+perp*rdy:px+perp*rdx;wx-=Math.floor(wx);
    ZB[x]=perp;
    const lh=VK/perp,top=hz-lh*.5,y0=Math.max(0,Math.ceil(top)),y1=Math.min(H-1,Math.floor(hz+lh*.5));
    let tx=Math.floor((wx-(doorOff>0?doorOff:0))*TS);
    if(tid===1||tid===4){tx=Math.floor(wx*TS)}
    if(tx<0)tx=0;if(tx>63)tx=63;
    if((side===0&&rdx>0)||(side===1&&rdy<0))tx=TS-1-tx;
    const T=tid===1?TW[L.wv[my*N+mx]].d:tid===2?TEX.door.d:tid===3?TEX.elev.d:TEX.exit.d;
    // 조명: 벽 앞 셀
    const hxw=px+perp*rdx,hyw=py+perp*rdy,nx=side===0?-stx:0,ny=side===1?-sty:0;
    lightAt(hxw+nx*.45,hyw+ny*.45);
    const sd=side?.8:1;
    let lr0=(AMB0+LC[0])*sd,lg0=(AMB1+LC[1])*sd,lb0=(AMB2+LC[2])*sd;
    const dE=perp*RL[x],fogK=Math.max(0,1-perp/20);
    let colB=0;if(fStr>0){const t=1-dE/fRange;if(t>0)colB=t*t*1.5*fStr}
    let colF=0;if(flr>0){const t=1-dE/flareR;if(t>0)colF=t*t*1.4*flr}
    const bx2=BX2[x],em=tid===4;
    for(let y=y0;y<=y1;y++){
      let ty=Math.floor((y-top)*TS/lh);if(ty<0)ty=0;else if(ty>63)ty=63;
      const ti=(ty*TS+tx)*4;let lr=lr0,lg=lg0,lb=lb0;
      if(colB>0){const f=1-bx2-((y-hz)*iRY)**2;if(f>0){const b=f*colB;lr+=b*sd;lg+=b*.96*sd;lb+=b*.82*sd}}
      if(colF>0){lr+=colF*sd;lg+=colF*.75*sd;lb+=colF*.5*sd}
      let rr=T[ti],gg=T[ti+1],bb=T[ti+2];
      let o=(y*W+x)*4;
      if(em&&ty<26&&ty>4){BUF[o]=rr*.5+rr*lr*fogK*.5;BUF[o+1]=gg*(.9);BUF[o+2]=bb*.6;continue}
      BUF[o]=rr*lr*fogK;BUF[o+1]=gg*lg*fogK;BUF[o+2]=bb*lb*fogK;
    }
  }
  // ---- 스프라이트 ----
  const list=SPR_LIST;list.length=0;
  const invDet=1/(plx*dy-dx*ply);
  const addS=(o,tex,w,h,v,x,y,extra)=>{
    const rx=x-px,ry=y-py,tX=invDet*(dy*rx-dx*ry),tY=invDet*(-ply*rx+plx*ry);
    if(tY<.12||tY>16)return;
    list.push({tex,w,h,v,tX,tY,x,y,o,e:extra||0,box:(o&&o.box)||null});
  };
  for(const s of L.spr){if(s.gone)continue;const sd=SPD[s.type];if(!sd)continue;if(P.hide===s)continue;
    let v=sd.v;addS(s,TEX.s[sd.t],sd.w,sd.h,v,s.x,s.y,s.pick?1:0)}
  for(const m of MON)if(!m.dorm)addS(m,TEX.s[m.M.tex],m.M.w,m.M.h,m.type==='patient'?0:0,m.x,m.y,m.type==='after'?2:3);
  if(DEC){addS(DEC,TEX.s.decoy,.22,.22,.08,DEC.x,DEC.y,1);addS(DEC,TEX.s.light,1.2,1.2,-.3,DEC.x,DEC.y,4)}
  list.sort((a,b)=>b.tY-a.tY);
  for(const s of list){
    if(s.box){
      const hx=s.box[0],hy=s.box[1],bh=s.box[2],cxw=s.x,cyw=s.y,swb=VK/s.tY;
      const rad=Math.max(hx,hy)*1.5*swb,scb=cxm*(1+s.tX/(s.tY*PL));
      const bxs=Math.max(0,Math.floor(scb-rad)),bxe=Math.min(W-1,Math.ceil(scb+rad));
      const T=s.tex,tw=T.w,th=T.h,TD=T.d;
      for(let x=bxs;x<=bxe;x++){
        const c=2*(x+.5)/W-1,rdx=dx+plx*c,rdy=dy+ply*c;
        let t0=-1e9,t1=1e9,ax=0;
        if(rdx!==0){const a=(cxw-hx-px)/rdx,b=(cxw+hx-px)/rdx,lo=a<b?a:b,hi=a<b?b:a;if(lo>t0){t0=lo;ax=0}if(hi<t1)t1=hi}else if(px<cxw-hx||px>cxw+hx)continue;
        if(rdy!==0){const a=(cyw-hy-py)/rdy,b=(cyw+hy-py)/rdy,lo=a<b?a:b,hi=a<b?b:a;if(lo>t0){t0=lo;ax=1}if(hi<t1)t1=hi}else if(py<cyw-hy||py>cyw+hy)continue;
        if(t0>t1||t0<.1||t0>=ZB[x])continue;
        const hxw=px+t0*rdx,hyw=py+t0*rdy;
        let u=ax===0?(hyw-(cyw-hy))/(2*hy):(hxw-(cxw-hx))/(2*hx);
        if((ax===0&&rdx>0)||(ax===1&&rdy<0))u=1-u;
        const tu=Math.min(tw-1,Math.max(0,Math.floor(u*tw)));
        const lh=VK/t0,yb=hz+lh*.5,yt=hz+lh*(.5-bh),hgt=yb-yt;
        lightAt(hxw-(ax===0?Math.sign(rdx):0)*.25,hyw-(ax===1?Math.sign(rdy):0)*.25);
        const sdb=ax?.75:1;
        let lr=(AMB0+LC[0])*sdb,lg=(AMB1+LC[1])*sdb,lb=(AMB2+LC[2])*sdb;
        const dE=t0*RL[x],fogK=Math.max(0,1-t0/20);
        let colB=0;if(fStr>0){const t=1-dE/fRange;if(t>0)colB=t*t*1.5*fStr}
        if(flr>0){const t=1-dE/flareR;if(t>0){const b=t*t*1.4*flr;lr+=b;lg+=b*.75;lb+=b*.5}}
        const y0=Math.max(0,Math.floor(yt)),y1=Math.min(H-1,Math.ceil(yb));
        for(let y=y0;y<=y1;y++){
          const v=Math.floor((y-yt)*th/hgt);if(v<0||v>=th)continue;
          const ti=(v*tw+tu)*4;if(TD[ti+3]<40)continue;
          let l_r=lr,l_g=lg,l_b=lb;
          if(colB>0){const f=1-BX2[x]-((y-hz)*iRY)**2;if(f>0){const b=f*colB*sdb;l_r+=b;l_g+=b*.96;l_b+=b*.82}}
          const o=(y*W+x)*4;BUF[o]=TD[ti]*l_r*fogK;BUF[o+1]=TD[ti+1]*l_g*fogK;BUF[o+2]=TD[ti+2]*l_b*fogK;
        }
      }
      continue;
    }
    const sw=VK/s.tY,spW=s.w*sw*(s.e===4?1:1),spH=s.h*sw;
    const scx=cxm*(1+s.tX/(s.tY*PL));
    const yb=hz+(0.5-s.v)*sw,yt=yb-spH;
    const xs=Math.floor(scx-spW*.5),xe=Math.floor(scx+spW*.5);
    if(xe<0||xs>=W)continue;
    const T=s.tex,tw=T.w,th=T.h,TD=T.d;
    lightAt(s.x,s.y);
    let lr=AMB0+LC[0],lg=AMB1+LC[1],lb=AMB2+LC[2];
    if(s.e===1){lr+=.22+.1*Math.sin(G.t*4+s.x);lg+=.2;lb+=.08}
    if(s.e===2||s.e===3){lr+=.1;lg+=.1;lb+=.13}
    const dE=s.tY*Math.sqrt(1+(s.tX/s.tY)**2);
    const fogK=Math.max(0,1-s.tY/20);
    let colB=0;if(fStr>0){const t=1-dE/fRange;if(t>0)colB=t*t*1.5*fStr}
    if(flr>0){const t=1-dE/flareR;if(t>0){const b=t*t*1.4*flr;lr+=b;lg+=b*.75;lb+=b*.5}}
    const add=s.e===4;
    const y0=Math.max(0,Math.floor(yt)),y1=Math.min(H-1,Math.ceil(yb));
    const x0=Math.max(0,xs),x1=Math.min(W-1,xe);
    const sh2=s.e===2?Math.floor(G.t*14):0;
    for(let x=x0;x<=x1;x++){
      if(s.tY>=ZB[x]&&!add)continue;
      if(add&&s.tY>=ZB[x])continue;
      const tu=Math.floor((x-xs)*tw/Math.max(1,spW));
      for(let y=y0;y<=y1;y++){
        let u=tu;
        if(s.e===2){const q=((y>>2)+sh2)%9;if(q===0)u=tu+3;else if(q===4)u=tu-2}
        if(u<0||u>=tw)continue;
        const v=Math.floor((y-yt)*th/Math.max(1,spH));if(v<0||v>=th)continue;
        const ti=(v*tw+u)*4,al=TD[ti+3];if(al<40)continue;
        let o=(y*W+x)*4,l_r=lr,l_g=lg,l_b=lb;
        if(colB>0){const f=1-BX2[x]-((y-hz)*iRY)**2;if(f>0){const b=f*colB;l_r+=b;l_g+=b*.96;l_b+=b*.82}}
        if(add){const k=al/255*.55;BUF[o]+=255*k;BUF[o+1]+=90*k;BUF[o+2]+=200*k;continue}
        if(s.e===2){l_r=Math.max(l_r,.2);l_g=Math.max(l_g,.2);l_b=Math.max(l_b,.24)}
        if(s.e===3){l_r=Math.max(l_r,.14);l_g=Math.max(l_g,.14);l_b=Math.max(l_b,.16)}
        const a=al/255;
        BUF[o]=BUF[o]*(1-a)+TD[ti]*l_r*fogK*a;BUF[o+1]=BUF[o+1]*(1-a)+TD[ti+1]*l_g*fogK*a;BUF[o+2]=BUF[o+2]*(1-a)+TD[ti+2]*l_b*fogK*a;
      }
    }
  }
  cx2.putImageData(IMG,0,0);
}

// ===== 입력 / HUD / 화면 흐름 / 루프 =====
const IN={jx:0,jy:0,k:{}};
const TM=[];const later=(f,ms)=>{const t=setTimeout(()=>{const i=TM.indexOf(t);if(i>=0)TM.splice(i,1);if(!closed)f()},ms);TM.push(t);return t};
const ov=id=>$(id);
const show=(id,v)=>{const e=$(id);if(e)e.classList.toggle('on',!!v)};
const hideAll=()=>['title','settings','pause','fade','shop','over','end'].forEach(i=>show(i,0));
cv=$('cv');cx2=cv.getContext('2d');cx2.imageSmoothingEnabled=false;
const el={hud:$('hud'),obj:$('obj'),gold:$('gold'),keyi:$('keyi'),msg:$('msg'),prompt:$('prompt'),stB:$('stB'),btB:$('btB'),btT:$('btT'),slots:$('slots'),
  bRun:$('bRun'),bFl:$('bFl'),bAct:$('bAct'),comp:$('comp'),compA:$('compA'),compD:$('compD'),hurt:$('hurt'),flash:$('flash'),wL:$('wL'),wR:$('wR'),hidev:$('hidev'),
  joy:$('joy'),knob:$('knob'),qF:$('qF'),qTm:$('qTm'),qT:$('qT')};
let prevMode='play',curTarget=null;
// ---- QTE / 오버레이 ----
function showQTE(v){show('qte',v);if(v&&QT)el.qT.textContent=QT.kind==='exit'?'비상구를 연다!':'문을 연다!'}
function showOver(){$('ovT').textContent='포기하지 마세요. 같은 층에서 다시 시작합니다 (소지품은 층 시작 때 상태로 복원됩니다).';show('over',1);el.hud.hidden=true;SFX.fail()}
function fmtT(s){s=Math.floor(s);return Math.floor(s/60)+'분 '+String(s%60).padStart(2,'0')+'초'}
// ---- 층 시작/종료 흐름 ----
function startFloor(i,retry){
  hideAll();el.hud.hidden=true;G.mode='trans';
  loadFloor(i,retry);resizeGfx();
  const cfg=FLOORS[i];
  $('fSub').textContent=i===0?'PROLOGUE':'FLOOR '+i;$('fTitle').textContent=cfg.name+(cfg.sub?' · '+cfg.sub:'');
  $('fObj').textContent=i===0?'정전. 엘리베이터가 멈췄다. 어딘가에 손전등이 떨어져 있을 것이다.':cfg.obj;
  show('fade',1);
  later(()=>{show('fade',0);G.mode='play';el.hud.hidden=false;showObj()},retry?1300:2600);
}
function showObj(){const cfg=L.cfg;let t=cfg.obj;if(cfg.id===0&&!P.hasTorch)t='손전등을 찾으세요';else if(cfg.key&&!P.key)t=cfg.key.ic+' '+cfg.key.n+'을(를) 찾으세요 → 비상구';else if(cfg.key&&P.key)t='비상구로 가세요!';el.obj.textContent=t}
function flowAfterFloor(){
  hideAll();el.hud.hidden=true;$('fSub').textContent='CLEAR';$('fTitle').textContent='탈출 성공';$('fObj').textContent='';show('fade',1);
  later(()=>{
    const nx=G.floor+1;
    if(nx>=FLOORS.length){show('fade',0);showEnd();return}
    show('fade',0);
    if(FLOORS[nx].shop)openShop(nx);else startFloor(nx);
  },1600);
}
function openShop(nx){
  G.shopNext=nx;G.mode='shop';drawShop();show('shop',1);
}
function drawShop(){
  $('shGold').textContent='🪙 '+RUN.gold;$('shBag').textContent=RUN.inv.length+' / '+MAXINV;
  const lst=$('shList');lst.innerHTML='';
  Object.keys(ITEMDEF).forEach(id=>{
    const d=ITEMDEF[id],ok=RUN.gold>=d.price&&RUN.inv.length<MAXINV;
    const r=document.createElement('div');r.className='shi'+(ok?'':' no');
    r.innerHTML='<span style="font-size:26px">'+d.ic+'</span><div class="t"><b>'+d.n+'</b><span>'+d.desc+'</span></div>';
    const b=document.createElement('button');b.textContent='🪙 '+d.price;
    b.onclick=()=>{if(RUN.gold<d.price){msgShop('코인이 부족합니다');return}if(RUN.inv.length>=MAXINV){msgShop('가방이 가득 찼습니다');return}RUN.gold-=d.price;RUN.inv.push(id);SFX.coin();drawShop()};
    r.appendChild(b);lst.appendChild(r);
  });
}
function msgShop(t){SFX.click();const e=$('shBag');const o=e.textContent;e.textContent=t;later(()=>{if(G.mode==='shop')e.textContent=RUN.inv.length+' / '+MAXINV},1200)}
function showEnd(){
  G.mode='end';
  $('endStats').innerHTML='<div class="stat"><span>플레이 시간</span><b>'+fmtT(RUN.t)+'</b></div><div class="stat"><span>모은 코인</span><b>'+RUN.coins+'</b></div><div class="stat"><span>사용한 아이템</span><b>'+RUN.used+'</b></div><div class="stat"><span>잡힌 횟수</span><b>'+RUN.deaths+'</b></div>';
  show('end',1);SFX.win();
}
function newRun(){RUN.gold=0;RUN.inv=[];RUN.deaths=0;RUN.t=0;RUN.used=0;RUN.coins=0;RUN.floors=0;audioInit();startFloor(0)}
// ---- 설정 ----
const QL=['낮음','보통','높음'],QT_L=['쉬움 (8초)','보통 (5초)','어려움 (4초)'];
function drawSet(){$('sSound').textContent=S.sound?'켜짐':'꺼짐';$('sSensV').textContent=S.sens.toFixed(1)+'x';$('sQual').textContent=QL[S.quality];$('sQte').textContent=QT_L[S.qte];$('sHap').textContent=S.hap?'켜짐':'꺼짐'}
function openSet(from){G.setFrom=from;show(from,0);show('settings',1);drawSet()}
$('sSound').onclick=()=>{S.sound=!S.sound;saveS();setSound();drawSet();if(S.sound)SFX.click()};
$('sSensM').onclick=()=>{S.sens=clamp(Math.round((S.sens-.2)*10)/10,.4,2.4);saveS();drawSet()};
$('sSensP').onclick=()=>{S.sens=clamp(Math.round((S.sens+.2)*10)/10,.4,2.4);saveS();drawSet()};
$('sQual').onclick=()=>{S.quality=(S.quality+1)%3;saveS();resizeGfx();drawSet()};
$('sQte').onclick=()=>{S.qte=(S.qte+1)%3;saveS();drawSet()};
$('sHap').onclick=()=>{S.hap=!S.hap;saveS();drawSet();if(S.hap)vib(30)};
$('bSetBack').onclick=()=>{show('settings',0);show(G.setFrom||'title',1)};
$('bSet1').onclick=()=>openSet('title');$('bSet2').onclick=()=>openSet('pause');
// ---- 일시정지 ----
function pauseGame(){if(G.mode!=='play'&&G.mode!=='qte')return;prevMode=G.mode;G.mode='pause';IN.jx=IN.jy=0;endJoy();show('pause',1)}
function resumeGame(){if(G.mode!=='pause')return;show('pause',0);show('settings',0);G.mode=prevMode;last=performance.now()}
$('bPause').onclick=pauseGame;$('bResume').onclick=resumeGame;
$('bRestart').onclick=()=>{show('pause',0);startFloor(G.floor,true)};
$('bStart').onclick=newRun;$('bRetry').onclick=()=>{show('over',0);startFloor(G.floor,true)};
$('bAgain').onclick=()=>{show('end',0);newRun()};
$('bGo').onclick=()=>{if(G.mode!=='shop')return;show('shop',0);startFloor(G.shopNext)};
['bExit1','bExit2','bExit3','bExit4'].forEach(i=>{const e=$(i);if(e)e.onclick=()=>close()});
// ---- 버튼 ----
on($('bTap'),'pointerdown',e=>{e.preventDefault();qteTap()});
$('bQx').onclick=qteCancel;
$('bRun').onclick=()=>{if(G.mode!=='play')return;P.run=!P.run;SFX.click()};
function toggleFl(){if(G.mode!=='play'&&G.mode!=='qte')return;if(!P.hasTorch){msg('손전등이 없다');return}if(P.hide){return}if(P.bat<=0){msg('배터리가 없다');return}P.fl=!P.fl;SFX.click()}
$('bFl').onclick=toggleFl;
on($('bAct'),'click',()=>{if(G.mode==='play')interact()});
// 슬롯
let slotKey='';
function drawSlots(){
  const key=RUN.inv.join(',');if(key===slotKey)return;slotKey=key;
  el.slots.innerHTML='';
  for(let i=0;i<MAXINV;i++){
    const b=document.createElement('button'),id=RUN.inv[i];
    b.innerHTML=id?'<small>'+(i+1)+'</small>'+ITEMDEF[id].ic:'<small>'+(i+1)+'</small>';if(!id)b.className='em';
    b.setAttribute('aria-label',id?ITEMDEF[id].n:'빈 칸');
    b.onclick=()=>useItem(i);el.slots.appendChild(b);
  }
}
// ---- 터치 / 마우스 입력 ----
let joyId=null,joyO=null,lookId=null,lookP=null,mouseDown=false;
const JR=58;
function endJoy(){joyId=null;IN.jx=IN.jy=0;el.knob.style.transform='';el.joy.style.left='';el.joy.style.top='';el.joy.style.bottom='';el.joy.style.opacity=''}
function inPlay(){return(G.mode==='play'||G.mode==='qte')&&!el.hud.hidden}
on(root,'pointerdown',e=>{
  if(!inPlay()||e.target.closest('button'))return;
  const r=root.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
  if(e.pointerType==='mouse'){
    mouseDown=true;
    if(e.button===0&&G.mode==='play'&&document.pointerLockElement!==cv){try{const p=cv.requestPointerLock&&cv.requestPointerLock();if(p&&p.catch)p.catch(()=>{})}catch(er){}}
    if(e.button===0&&P&&G.mode==='play'&&document.pointerLockElement===cv)interact();
    lookId='mouse';lookP={x:e.clientX,y:e.clientY};return;
  }
  if(G.mode!=='play')return;
  if(x<r.width*.45&&joyId===null){
    joyId=e.pointerId;joyO={x:e.clientX,y:e.clientY};
    el.joy.style.left=(x-60)+'px';el.joy.style.top=(y-60)+'px';el.joy.style.bottom='auto';el.joy.style.opacity='.9';
  }else if(x>=r.width*.45&&lookId===null){lookId=e.pointerId;lookP={x:e.clientX,y:e.clientY}}
});
on(window,'pointermove',e=>{
  if(e.pointerId===joyId&&joyO){
    let dx=e.clientX-joyO.x,dy=e.clientY-joyO.y;const d=hyp(dx,dy);if(d>JR){dx=dx/d*JR;dy=dy/d*JR}
    el.knob.style.transform='translate('+dx+'px,'+dy+'px)';
    let jx=dx/JR,jy=dy/JR;const m=hyp(jx,jy);if(m<.14){jx=jy=0}IN.jx=jx;IN.jy=jy;
  }else if(lookId!==null&&e.pointerType!=='mouse'&&e.pointerId===lookId&&lookP){
    doLook(e.clientX-lookP.x,e.clientY-lookP.y,1);lookP={x:e.clientX,y:e.clientY};
  }
});
on(document,'mousemove',e=>{
  if(!P||G.mode!=='play')return;
  if(document.pointerLockElement===cv)doLook(e.movementX,e.movementY,.7);
  else if(mouseDown&&lookId==='mouse')doLook(e.movementX,e.movementY,.7);
});
function doLook(dx,dy,k){
  if(!P||G.mode!=='play')return;
  P.a+=dx*.0052*S.sens*k;P.pitch=clamp(P.pitch-dy*.0034*S.sens*k,-.22,.22);
}
const up=e=>{
  if(e.pointerId===joyId)endJoy();
  if(e.pointerId===lookId||(e.pointerType==='mouse'&&lookId==='mouse')){lookId=null;lookP=null}
  if(e.pointerType==='mouse')mouseDown=false;
};
on(window,'pointerup',up);on(window,'pointercancel',up);
on(document,'contextmenu',e=>{if(root.contains(e.target))e.preventDefault()});
// 키보드
const KM={KeyW:'w',ArrowUp:'w',KeyS:'s',ArrowDown:'s',KeyA:'a',KeyD:'d',ShiftLeft:'shift',ShiftRight:'shift'};
on(window,'keydown',e=>{
  if(closed)return;
  if(e.code==='Escape'){if(G.mode==='play'||G.mode==='qte')pauseGame();else if(G.mode==='pause')resumeGame();return}
  if(KM[e.code]){IN.k[KM[e.code]]=true;if(inPlay())e.preventDefault()}
  if(!inPlay())return;
  if(e.code==='ArrowLeft'&&P)P.a-=.12;if(e.code==='ArrowRight'&&P)P.a+=.12;
  if((e.code==='KeyE'||e.code==='Space')&&!e.repeat){e.preventDefault();if(G.mode==='qte')qteTap();else interact()}
  else if(e.code==='Space')e.preventDefault();
  if(e.code==='KeyF'&&!e.repeat)toggleFl();
  if(e.code==='KeyP'&&!e.repeat)pauseGame();
  if(/^Digit[1-4]$/.test(e.code)&&!e.repeat)useItem(+e.code.slice(5)-1);
});
on(window,'keyup',e=>{if(KM[e.code])IN.k[KM[e.code]]=false});
on(window,'blur',()=>{IN.k={};endJoy()});
on(document,'visibilitychange',()=>{if(document.hidden)pauseGame()});
on(window,'resize',()=>{resizeGfx()});
on(window,'orientationchange',()=>later(resizeGfx,300));
// ---- HUD 갱신 ----
let hc={};
const setT=(e,k,v)=>{if(hc[k]!==v){hc[k]=v;e.textContent=v}};
function hudUpdate(){
  if(el.hud.hidden||!P)return;
  setT(el.gold,'g','🪙 '+RUN.gold);
  if(el.keyi.hidden===P.key){el.keyi.hidden=!(P.key);if(P.key&&L.cfg.key)el.keyi.textContent=L.cfg.key.ic}
  showObj();
  el.stB.style.transform='scaleX('+(P.st/100).toFixed(3)+')';
  el.stB.style.filter=P.exh>0?'hue-rotate(-60deg)':'';
  el.btB.style.transform='scaleX('+(P.bat/100).toFixed(3)+')';
  setT(el.btT,'bt',P.hasTorch?(P.boost>0?'배터리 ★ 강화':P.bat<20?'배터리 부족!':'배터리'):'손전등 없음');
  el.bRun.classList.toggle('on',!!P.run);el.bFl.classList.toggle('on',!!P.fl);
  setT(el.bRun,'run',P.exh>0?'숨참…':P.drink>0?'질주':'달리기');
  drawSlots();
  // 메시지
  if(FX.msgT>0){setT(el.msg,'m',FX.msg);el.msg.style.opacity=Math.min(1,FX.msgT*2)}else el.msg.style.opacity=0;
  // 프롬프트
  if(G.mode==='play'){curTarget=findTarget()}else curTarget=null;
  if(curTarget){el.prompt.hidden=false;setT(el.prompt,'p',curTarget.txt);el.bAct.classList.remove('dis')}else{el.prompt.hidden=true;el.bAct.classList.add('dis')}
  // 컴퍼스
  if(P.comp){
    el.comp.hidden=false;let tx=L.exit.ix+.5,ty=L.exit.iy+.5;
    if(L.cfg.key&&!P.key){const k=L.spr.find(s=>s.pick==='key'&&!s.gone);if(k){tx=k.x;ty=k.y}}
    const rel=Math.atan2(ty-P.y,tx-P.x)-P.a;el.compA.style.transform='rotate('+(rel*180/Math.PI)+'deg)';setT(el.compD,'cd',Math.round(hyp(tx-P.x,ty-P.y))+'칸');
  }else el.comp.hidden=true;
  // QTE
  if(QT){el.qF.style.transform='scaleX('+(QT.fill/100).toFixed(3)+')';el.qTm.style.transform='scaleX('+Math.max(0,QT.t/QT.T).toFixed(3)+')'}
  // 위험 연출
  let near=0;if(MON.length&&P.minD<9)near=clamp((9-P.minD)/7,0,1);
  const chasing=MON.some(m=>m.st==='chase');
  const pulse=.65+.35*Math.sin(performance.now()/(chasing?110:260));
  el.hurt.style.opacity=Math.max(FX.hurt,near*(chasing?.75:.4)*pulse).toFixed(3);
  el.flash.style.opacity=Math.min(1,FX.flash).toFixed(3);el.flash.style.background=FX.flashC;
  // 소리 없이도 방향 경고
  let wl=0,wr=0;
  if(!S.sound||near>.35){let best=null;for(const m of MON)if(!best||m.d<best.d)best=m;
    if(best&&best.d<9){const s=Math.sin(angDiff(Math.atan2(best.y-P.y,best.x-P.x),P.a)),k=clamp((9-best.d)/8,0,1)*pulse*(S.sound?.5:1);
      if(s<-.25)wl=k;else if(s>.25)wr=k;else{wl=wr=k*.7}}}
  el.wL.style.opacity=wl.toFixed(3);el.wR.style.opacity=wr.toFixed(3);
  el.hidev.classList.toggle('on',!!P.hide);
}
// ---- 메인 루프 ----
let last=performance.now();
function frame(now){
  if(closed)return;
  raf=requestAnimationFrame(frame);
  let dt=(now-last)/1000;last=now;if(!(dt>0))dt=.016;if(dt>.05)dt=.05;
  try{
    if(L&&P&&G.mode!=='title'){update(dt);render();hudUpdate()}
  }catch(err){console.error('[elevator]',err);if(!G.errShown){G.errShown=true;msg('오류가 발생했습니다 (콘솔 확인)')}}
}
// ---- 종료 ----
function close(){
  if(closed)return;closed=true;cancelAnimationFrame(raf);TM.forEach(clearTimeout);TM.length=0;
  L_.forEach(f=>f());try{if(document.pointerLockElement)document.exitPointerLock()}catch(e){}
  try{if(AMB)AMB.nodes.forEach(n=>{try{n.stop()}catch(e){}});if(AC)AC.close()}catch(e){}AC=null;MAS=null;AMB=null;nbuf=null;
  root.remove();st.remove();document.body.style.overflow=prevOv;
  if(DBG)delete window.__E;
  ctx&&ctx.onClose&&ctx.onClose();
}
buildTextures();resizeGfx();drawSet();
if(DBG)window.__E={G,RUN,get P(){return P},get L(){return L},get MON(){return MON},get FX(){return FX},get QT(){return QT},IN,S,
  god(v){god=v},tp(x,y){P.x=x;P.y=y},step(n,dt){for(let i=0;i<n;i++)update(dt||.033)},start:newRun,loadFloor:startFloor,interact,useItem,addItem,render,hudUpdate,findTarget,qteTap,noise,canSee,los,findPath,
  skip(){L.spr.forEach(s=>{if(s.pick==='coin')s.gone=true})},clear:floorClear};
raf=requestAnimationFrame(frame);
return {close};

}
