/* 어비스 (Project Abyss) — 탑다운 슈터 로그라이크. index.html 에서 import('./abyss.js').then(m=>m.openAbyss({onClose}))  */
const CSS = "#aby{position:fixed;inset:0;z-index:9500;background:#0a0810;color:#eadfc8;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;font-family:'Noto Sans KR',system-ui,sans-serif;overflow:hidden;--ink:#eadfc8;--dim:#9b8f7a;--blood:#c23a30;--gold:#e0b050;--parch:#d9c29a;--panel:#171220;--line:#3a2f4a}\n#aby *{box-sizing:border-box}\n#aby #c{position:absolute;inset:0;width:100%;height:100%;display:block;background:#0a0810}\n#aby .ov{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:max(16px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) max(16px,env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));text-align:center;overflow:auto}\n#aby .ov.on{display:flex}\n#aby h1,#aby h2{font-family:'Noto Serif KR',serif;margin:0;font-weight:800;letter-spacing:.04em;text-wrap:balance}\n#aby h1{font-size:clamp(38px,12vw,64px);color:var(--parch);text-shadow:0 0 24px #8a2a2088}\n#aby h2{font-size:clamp(22px,6vw,32px);color:var(--parch)}\n#aby p{margin:0;color:var(--dim);line-height:1.5;max-width:30em;font-size:14px}\n#aby button{font:700 16px 'Noto Sans KR',system-ui,sans-serif;color:var(--ink);background:#2a1d33;border:1px solid var(--line);border-radius:12px;padding:0 22px;min-height:48px;min-width:48px;cursor:pointer;touch-action:manipulation}\n#aby button:active{background:#3c2a4a}\n#aby button.pri{background:linear-gradient(#a8322b,#6e1d1a);border-color:#d0584a;color:#fff;min-width:180px}\n#aby .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:16px 18px;max-width:340px;width:100%;text-align:left}\n#aby .row{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}\n#aby .stat{display:flex;justify-content:space-between;font-size:14px;padding:3px 0;border-bottom:1px solid #ffffff10}\n#aby .stat b{color:var(--gold)}\n#aby .tog{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:6px 0}\n#aby .tog button{min-height:40px;padding:0 14px;font-size:14px}\n#aby .items{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}\n#aby .items span{font-size:12px;padding:4px 8px;border-radius:99px;border:1px solid var(--line);background:#1d1628}\n#aby .xb{position:absolute;left:max(12px,env(safe-area-inset-left,0px));top:max(12px,env(safe-area-inset-top,0px))}";
const BODY = "<canvas id=\"c\"></canvas>\n<div id=\"probe\" style=\"position:absolute;left:0;top:0;width:0;height:0;visibility:hidden;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)\"></div>\n<div id=\"spot\" style=\"position:absolute;inset:0;pointer-events:none;display:none;background:#000\"></div>\n<div id=\"sel\" class=\"ov on\">\n  <button class=\"xb\" id=\"bExit1\" aria-label=\"\ub098\uac00\uae30\">\u2190</button>\n  <div style=\"font:700 12px 'Noto Sans KR',sans-serif;letter-spacing:.5em;color:var(--dim)\">PROJECT</div>\n  <h1>\uc5b4\ube44\uc2a4</h1>\n  <div class=\"card\" id=\"abel\">\n    <div style=\"display:flex;gap:14px;align-items:center\">\n      <svg width=\"78\" height=\"92\" viewBox=\"0 0 78 92\" aria-label=\"\uc544\ubca8\"><ellipse cx=\"39\" cy=\"86\" rx=\"26\" ry=\"5\" fill=\"#0006\"/><path d=\"M12 82 Q10 52 39 46 Q68 52 66 82Z\" fill=\"#4a5a7a\" stroke=\"#0008\" stroke-width=\"2\"/><circle cx=\"39\" cy=\"34\" r=\"22\" fill=\"#f0d0b0\" stroke=\"#0008\" stroke-width=\"2\"/><path d=\"M17 32 Q20 8 39 10 Q58 8 61 32 Q50 20 39 22 Q28 20 17 32Z\" fill=\"#3a2a20\"/><circle cx=\"30\" cy=\"36\" r=\"4.5\" fill=\"#fff\"/><circle cx=\"48\" cy=\"36\" r=\"4.5\" fill=\"#fff\"/><circle cx=\"31\" cy=\"37\" r=\"2.4\" fill=\"#134\"/><circle cx=\"49\" cy=\"37\" r=\"2.4\" fill=\"#134\"/><path d=\"M33 47 Q39 51 45 47\" stroke=\"#7a3a3a\" stroke-width=\"2\" fill=\"none\"/><circle cx=\"62\" cy=\"52\" r=\"3\" fill=\"#6ac4ff\"/></svg>\n      <div style=\"flex:1\"><div style=\"font:800 22px 'Noto Serif KR',serif;color:var(--parch)\">\uc544\ubca8 <small style=\"font:400 12px 'Noto Sans KR';color:var(--dim)\">Abel</small></div><div style=\"font-size:12px;color:var(--dim);margin-top:2px\">\ub208\ubb3c\uc744 \uc3d8\ub294 \uc18c\ub144. \uc9c0\ud558 \ucc38\ud638\uc5d0\uc11c \ud640\ub85c \uae68\uc5b4\ub0ac\ub2e4.</div></div>\n    </div>\n    <div style=\"margin-top:10px\">\n      <div class=\"stat\"><span>\uccb4\ub825</span><b>3\uce78 (HP 6)</b></div><div class=\"stat\"><span>\uacf5\uaca9\ub825</span><b>3.5</b></div>\n      <div class=\"stat\"><span>\uc774\ub3d9\uc18d\ub3c4</span><b>4.0 \ud0c0\uc77c/\ucd08</b></div><div class=\"stat\"><span>\ubc1c\uc0ac \uc18d\ub3c4</span><b>2.7\ubc1c/\ucd08</b></div><div class=\"stat\" style=\"border:0\"><span>\uc0ac\uac70\ub9ac</span><b>6.5 \ud0c0\uc77c</b></div>\n    </div>\n  </div>\n  <div class=\"row\"><button class=\"pri\" id=\"bStart\">\uc2dc\uc791</button><button id=\"bSet1\">\uc124\uc815</button></div>\n  <p>\uc67c\ucabd \ud654\uba74 \ub4dc\ub798\uadf8\ub85c \uc774\ub3d9 \u00b7 \uc790\ub3d9 \uc870\uc900\uc73c\ub85c \ubc1c\uc0ac<br>\uc8fd\uc73c\uba74 \ucc98\uc74c\ubd80\ud130 \ub2e4\uc2dc \uc2dc\uc791\ud569\ub2c8\ub2e4</p>\n</div>\n<div id=\"set\" class=\"ov\" style=\"background:#0a0810ee;z-index:5\">\n  <h2>\uc124\uc815</h2>\n  <div class=\"card\" id=\"setList\"></div>\n  <button id=\"bSetBack\">\ub2eb\uae30</button>\n</div>\n<div id=\"pause\" class=\"ov\" style=\"background:#0a0810d8;z-index:4\">\n  <h2>\uc77c\uc2dc\uc815\uc9c0</h2>\n  <div class=\"row\" style=\"flex-direction:column;align-items:stretch;min-width:220px\"><button class=\"pri\" id=\"bResume\">\uacc4\uc18d\ud558\uae30</button><button id=\"bSet2\">\uc124\uc815</button><button id=\"bGiveup\">\ud3ec\uae30\ud558\uace0 \uacb0\uacfc \ubcf4\uae30</button><button id=\"bExit2\">\uc0ac\uc774\ud2b8\ub85c \ub098\uac00\uae30</button></div>\n</div>\n<div id=\"res\" class=\"ov\" style=\"background:#0a0810f2;z-index:4\">\n  <h2 id=\"resT\">\uc0ac\ub9dd</h2>\n  <p id=\"resS\"></p>\n  <div class=\"card\" id=\"resList\"></div>\n  <div class=\"items\" id=\"resItems\" style=\"max-width:340px\"></div>\n  <div class=\"row\"><button class=\"pri\" id=\"bMain\">\uba54\uc778 \ud654\uba74\uc73c\ub85c</button><button id=\"bExit3\">\ub098\uac00\uae30</button></div>\n</div>\n";
export function openAbyss(ctx) {
  ctx = ctx || {};
  if (document.getElementById('aby')) return null;
  const st = document.createElement('style'); st.id = 'abycss'; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement('div'); root.id = 'aby'; root.innerHTML = BODY; document.body.appendChild(root);
  const prevOv = document.body.style.overflow; document.body.style.overflow = 'hidden';
  let closed = false, raf = 0;
// ===== CORE =====
const TAU=Math.PI*2,rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+1)),pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>v<a?a:v>b?b:v,dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angTo=(a,b)=>Math.atan2(b.y-a.y,b.x-a.x);
const RW=9,RH=13;
const $=id=>root.querySelector('#'+id);
const L=[];const on=(t,e,f,o)=>{t.addEventListener(e,f,o);L.push(()=>t.removeEventListener(e,f,o))};
const cv=$('c'),cx=cv.getContext('2d');
let W=400,H=800,DPR=1,T=36,RX=0,RY=0;
let S={auto:true,shake:1,flash:true,shapes:false,sound:true,hap:true};
try{Object.assign(S,JSON.parse(localStorage.getItem('abyss.s')||'{}'))}catch(e){}
function saveS(){try{localStorage.setItem('abyss.s',JSON.stringify(S))}catch(e){}}
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,3);W=window.innerWidth;H=window.innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  const top=Math.max(58,H*.075);
  T=Math.min(W/11,(H-top)*.76/15);
  measureSafe();
  RX=(W-11*T)/2+T;RY=top+T+Math.max(0,((H-top)*.76-15*T)/2);
}
on(window,'resize',resize);
// 곡선 적응형 분할: 화면 오차(sagitta) 0.08px 이하가 되도록 변 수를 결정
const segFor=rpx=>clamp(Math.ceil(TAU/Math.acos(1-.08/Math.max(rpx,.5))),12,512);
// ===== AUDIO =====
let AC=null,master=null,lastSfx={};
function audioInit(){
  if(AC){if(AC.state==='suspended')AC.resume();return}
  try{AC=new(window.AudioContext||window.webkitAudioContext)();master=AC.createGain();master.gain.value=.55;master.connect(AC.destination);musicStart()}catch(e){AC=null}
}
function tone(f,d,type='square',vol=.12,slide=0,delay=0){
  if(!AC||!S.sound)return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+d);
  g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(master);o.start(t);o.stop(t+d+.03);
}
let nbuf=null;
function noise(d,vol=.2,lp=2000){
  if(!AC||!S.sound)return;
  if(!nbuf){nbuf=AC.createBuffer(1,AC.sampleRate,AC.sampleRate);const a=nbuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1}
  const s=AC.createBufferSource();s.buffer=nbuf;const f=AC.createBiquadFilter();f.type='lowpass';f.frequency.value=lp;const g=AC.createGain();
  g.gain.setValueAtTime(vol,AC.currentTime);g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+d);s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(AC.currentTime+d);
}
function sfx(n){
  const now=performance.now();if(lastSfx[n]&&now-lastSfx[n]<(n==='shoot'?60:40))return;lastSfx[n]=now;
  switch(n){
   case'shoot':tone(560,.07,'square',.04,-260);break;
   case'hit':tone(200,.05,'sawtooth',.05,-80);break;
   case'kill':noise(.16,.12,1400);tone(240,.16,'triangle',.08,-170);break;
   case'hurt':tone(120,.35,'sawtooth',.18,-70);noise(.25,.18,700);break;
   case'pick':tone(660,.09,'sine',.12);tone(990,.14,'sine',.12,0,.08);break;
   case'coin':tone(1180,.06,'square',.05);tone(1580,.08,'square',.05,0,.05);break;
   case'door':noise(.35,.1,420);tone(80,.3,'sine',.12,-30);break;
   case'warn':tone(90,.9,'sawtooth',.12,40);tone(135,.9,'sawtooth',.08,60);break;
   case'boom':noise(.5,.28,600);tone(80,.4,'sine',.25,-50);break;
   case'beam':tone(300,.25,'sawtooth',.08,500);break;
   case'rewind':tone(900,.6,'sine',.12,-700);tone(450,.6,'triangle',.1,-300);break;
   case'phase':tone(70,.8,'sawtooth',.2,-30);noise(.7,.2,300);break;
   case'win':[523,659,784,1046].forEach((f,i)=>tone(f,.4,'triangle',.12,0,i*.15));break;
   case'tele':tone(1200,.12,'sine',.07,-900);break;
  }
}
let musT=null,musStep=0;
function musicStart(){
  if(musT)return;
  musT=setInterval(()=>{
    if(!AC||!S.sound||document.hidden||typeof G==='undefined'||G.scr!=='play')return;
    const fl=FLOORS[G.floor-1],sc=fl.bgm,boss=G.room&&G.room.type==='boss'&&G.boss;
    musStep++;
    if(musStep%2===0)tone(sc[0]/2,.9,'sine',.08);
    if(boss||musStep%4===1)tone(sc[musStep%3]*(boss?1:2),.5,'triangle',boss?.05:.025);
    if(boss&&musStep%2===1)noise(.08,.05,200);
  },boss_dummy());
}
function boss_dummy(){return 380}

// ===== DATA (기획서 9~12장) =====
// id,이름,체력,피해,이동,반지름,색,모양,등장층[a,b],그룹
const M=[
[1,'붉은 좀비',12,1,2.2,.4,'#b8403a','blob',1,3,1],
[2,'해골 병사',16,1,2.0,.4,'#d8d2bf','skull',1,3,1],
[3,'돌진 벌레',10,1,3.8,.38,'#a07a48','bug',1,2,1],
[4,'유충 떼',6,1,1.0,.26,'#d9c88a','bug',1,2,1],
[5,'맹독 슬라임',20,1,1.4,.45,'#5fc24a','slime',1,3,1],
[6,'철퇴 갑옷',40,2,.9,.55,'#7d8794','armor',2,4,1],
[7,'그림자 수인',18,1,2.0,.4,'#5a3a86','blob',3,5,1],
[8,'그림자 개',14,1,3.2,.36,'#3b2a55','dog',2,4,1],
[9,'가시 구체',25,1,3.0,.42,'#8b95a3','spike',2,5,1],
[10,'방패 해골',24,1,3.4,.45,'#c9c2a8','shield',3,5,1],
[11,'외눈박이 사수',14,2,.8,.42,'#c4564b','eye',1,3,2],
[12,'쌍둥이 주술사',20,2,1.0,.42,'#8a4fd0','mage',2,4,2],
[13,'삼중 조준기',24,2,.7,.45,'#d9b93a','turret',3,5,2],
[14,'독침 벌',8,2,2.6,.3,'#9ad23a','bat',1,3,2],
[15,'음영 소환사',18,2,.9,.42,'#33284d','mage',3,5,2],
[16,'스나이퍼 고블린',16,3,.8,.38,'#6e9a3a','blob',4,5,2],
[17,'산성 박쥐',12,2,1.8,.34,'#6bd05a','bat',2,4,2],
[18,'빙결 마법사',20,1,.9,.42,'#66c4e8','mage',4,5,2],
[19,'화염 박쥐',22,3,1.6,.4,'#f0702a','bat',3,5,2],
[20,'석상 사수',45,2,0,.55,'#8d8b86','turret',2,4,2],
[21,'화염 거미',18,1,2.4,.36,'#e8501e','bug',3,4,3],
[22,'독포자 버섯',30,1,0,.5,'#7aa83a','mush',2,3,3],
[23,'번개 정령',22,2,1.0,.38,'#f2e04a','ghost',3,5,3],
[24,'용암 슬라임',28,1,1.2,.46,'#e0481a','slime',3,4,3],
[25,'얼음 정령',20,2,.9,.4,'#9fe0f5','ghost',4,5,3],
[26,'중력 주술사',26,0,0,.45,'#6a4aa8','mage',4,5,3],
[27,'저주받은 나무',50,1,0,.6,'#5a4630','tree',2,3,3],
[28,'산성 애벌레',24,1,.8,.4,'#a8d03a','bug',2,4,3],
[29,'모래 소용돌이',35,0,.6,.55,'#d6b678','swirl',3,5,3],
[30,'심연의 눈',30,3,0,.5,'#b05ad8','eye',5,5,3],
[31,'네크로맨서',40,0,.8,.45,'#4a3a5c','mage',2,5,4],
[32,'알 둥지',30,0,0,.5,'#c9b890','egg',2,4,4],
[33,'위장 형태의 돌',40,2,0,.5,'#8d8b86','rock',3,5,4],
[34,'유령',20,1,1.6,.4,'#cfd8f0','ghost',4,5,4],
[35,'미러 나이트',45,1,1.3,.5,'#b6c4d4','armor',4,5,4],
[36,'시한 폭탄',16,1,2.0,.4,'#3a3a3a','bomb',3,5,4],
[37,'흡혈 박쥐',12,1,2.8,.32,'#a02848','bat',2,4,4],
[38,'시공간 변형자',28,0,.7,.42,'#a070e0','mage',5,5,4],
[39,'환영 마법사',24,2,.9,.42,'#7a5ac8','mage',4,5,4],
[40,'마그넷 가고일',55,1,0,.55,'#6e7c92','turret',4,5,4],
[41,'분열 아메바',24,1,1.4,.45,'#7ac8a0','slime',2,4,5],
[42,'시체 자폭병',8,3,3.6,.34,'#d86a3a','blob',1,5,5],
[43,'가시 슬라임',30,1,1.2,.46,'#6aa05a','spike',3,5,5],
[44,'혈액 연금술사',40,3,.8,.45,'#a01e2c','mage',4,5,5],
[45,'충격파 소환사',32,2,.7,.45,'#d89a3a','mage',3,5,5],
[46,'쌍두 거인',70,2,.9,.7,'#9a6a4a','armor',4,5,5],
[47,'기생충 좀비',20,1,1.8,.4,'#7a9a6a','blob',2,4,5],
[48,'마력 폭주자',36,1,.6,.45,'#f2d23a','mage',5,5,5],
[49,'산성 해파리',20,1,.7,.4,'#7ae0c0','ghost',3,5,5],
[50,'혼돈의 종복',26,1,1.6,.4,'#201020','blob',5,5,5],
].map(a=>({id:a[0],n:a[1],hp:a[2],d:a[3],sp:a[4],r:a[5],c:a[6],sh:a[7],f0:a[8],f1:a[9],g:a[10]}));
// 보조 몬스터(소환체 등) — 기획서 9장 본문 수치
const MX={
 skel:{id:101,n:'미니 해골',hp:6,d:1,sp:2.4,r:.26,c:'#d8d2bf',sh:'skull'},
 spider:{id:102,n:'새끼 거미',hp:5,d:1,sp:3.0,r:.24,c:'#7a2a2a',sh:'bug'},
 amoeba:{id:103,n:'작은 아메바',hp:10,d:1,sp:1.4,r:.3,c:'#7ac8a0',sh:'slime'},
 head:{id:104,n:'거인의 머리',hp:12,d:1,sp:2.5,r:.34,c:'#9a6a4a',sh:'skull'},
 worm:{id:105,n:'벌레',hp:4,d:1,sp:3.0,r:.2,c:'#7a9a6a',sh:'bug'},
 rat:{id:106,n:'자폭 쥐',hp:6,d:2,sp:2.6,r:.3,c:'#8a7a6a',sh:'bug'},
 decoy:{id:107,n:'분신',hp:1,d:0,sp:0,r:.5,c:'#c8a050',sh:'mage'},
 ill:{id:108,n:'환영',hp:1,d:0,sp:0,r:.4,c:'#a070e0',sh:'mage'},
};
const FLOORS=[
 {n:'지하 참호',rooms:10,hpm:1,dm:1,cnt:[3,5],pal:['#2b2219','#14100b','#8a6a3e','#d9a85a'],bgm:[110,131,147]},
 {n:'독기 늪지',rooms:12,hpm:1.35,dm:1,cnt:[4,6],pal:['#1f2a1c','#0e150d','#4f7a38','#a8e060'],bgm:[98,117,131]},
 {n:'화염 용광로',rooms:14,hpm:1.8,dm:1.25,cnt:[4,7],pal:['#33201a','#180d0a','#a84a22','#ff8a3a'],bgm:[82,98,123]},
 {n:'빙결 심연',rooms:16,hpm:2.4,dm:1.25,cnt:[5,8],pal:['#1b2733','#0a1119','#4a86a8','#9fe0f5'],bgm:[87,104,131]},
 {n:'종말의 심연',rooms:18,hpm:3.2,dm:1.5,cnt:[5,9],pal:['#231a33','#0c0714','#7a4ab0','#d08aff'],bgm:[73,87,110]},
];
const MID=[ // 중간 보스 10종
 [1,'처형자 미노타우로스',200,.95,'#8a4a3a'],[2,'부패한 식인꽃',220,.9,'#a03a6a'],[3,'마그마 골렘',300,1.05,'#d0501e'],
 [4,'역병의 왕',320,.95,'#6a6a3a'],[5,'사막의 환영 사제',380,.6,'#d6b060'],[6,'어둠의 기사',420,.7,'#2a2a4a'],
 [7,'기계 태엽 구체',480,.85,'#a08a5a'],[8,'고대의 붉은 지네',500,.8,'#b02a1a'],[9,'영혼 수확자',600,.7,'#4a5a7a'],[10,'서리 거인',650,1.1,'#8ac8e8']
].map(a=>({id:a[0],n:a[1],hp:a[2],r:a[3],c:a[4],boss:1}));
const ITEMS=[
 {id:1,n:'피의 눈물',t:'p',c:'#c02a3a',d:'공격력 +1.5, 눈물 크기 +25%'},
 {id:2,n:'유령 유충',t:'p',c:'#9ad0e0',d:'유도 탄환(탄속 -10%)'},
 {id:3,n:'혈사포 레이저',t:'p',c:'#ff3a3a',d:'발사속도 ×0.5, 빔 발사(피해 ×1.6)'},
 {id:4,n:'황금 수호석',t:'p',c:'#e8c040',d:'회전 위성: 접촉 피해, 적 탄환 1발 방어'},
 {id:5,n:'천사의 날개',t:'p',c:'#f4f4ff',d:'비행(구덩이·장애물 통과), 이동속도 +0.3'},
 {id:6,n:'악마의 계약서',t:'p',c:'#6a1a2a',d:'최대 체력 1칸 소비, 공격력 ×2'},
 {id:7,n:'폭발성 눈물',t:'p',c:'#ff8a2a',d:'적중 시 폭발(피해 ×0.5)'},
 {id:8,n:'독성 포자',t:'p',c:'#7ad03a',d:'적중 시 중독 3초(초당 ×0.3)'},
 {id:9,n:'삼중 눈물',t:'p',c:'#c0a0ff',d:'3갈래 ±15°(발당 ×0.7)'},
 {id:10,n:'시간의 모래시계',t:'a',c:'#e8d8a0',d:'3초 전으로 복귀(쿨 90초, 방 클리어 -20초)'},
];

// ===== STATE / WORLD =====
const G={scr:'select',floor:1,rooms:[],room:null,en:[],eb:[],pb:[],zn:[],fx:[],pk:[],time:0,kills:0,runT:0,boss:null,shake:0,flash:0,vig:0,slow:1,tr:null,msg:null,msgT:0,intro:0,warnT:0,finalKind:0,dead:0,hist:[],paused:false,over:null,coinsGot:0,darkR:0,seed:0};
let R=null,P=null;
const DIRS=[['N',0,-1],['E',1,0],['S',0,1],['W',-1,0]];
function newPlayer(){
  return {x:4.5,y:6.5,r:.3,vx:0,vy:0,hp:6,maxhp:6,coins:0,dmg:3.5,fr:2.7,rng:6.5,sp:4,bsp:9,items:[],active:0,acd:0,acdMax:90,inv:.2,cd:0,tgt:null,tgtT:0,aim:0,face:0,
    slowT:0,slowM:1,rootT:0,erodeT:0,erodeTk:0,sandT:0,bonus:0,orb:0,orbCd:0,orbHit:new Map(),flash:0,dmgBonus:0,fly:false,lastHit:0};
}
const has=id=>P.items.includes(id);
function recalc(){
  const p=P;p.dmg=(3.5+(has(1)?1.5:0)+p.dmgBonus)*(has(6)?2:1);
  p.fr=2.7*(has(3)?.5:1);p.sp=4+(has(5)?.3:0);p.fly=has(5);p.bsp=has(2)?8.1:9;
}
// ---- 맵 생성 (5.3) ----
function genFloor(f){
  const n=Math.min(20,8+f*2),g=Array.from({length:7},()=>Array(7).fill(null)),list=[];
  const mk=(x,y,type)=>{const r={gx:x,gy:y,type,d:{N:null,E:null,S:null,W:null},cleared:false,visited:false,seen:false,g:null,sp:null};g[y][x]=r;list.push(r);return r};
  const nb=(x,y)=>DIRS.map(d=>[x+d[1],y+d[2]]).filter(c=>c[0]>=0&&c[0]<7&&c[1]>=0&&c[1]<7&&g[c[1]][c[0]]);
  const add=()=>{for(let t=0;t<400;t++){const r=pick(list),d=pick(DIRS),x=r.gx+d[1],y=r.gy+d[2];
    if(x<0||x>=7||y<0||y>=7||g[y][x])continue;if(nb(x,y).length>1)continue;mk(x,y,'normal');return true}return false};
  mk(3,3,'start');
  let guard=0;while(list.length<n&&guard++<3000)add();
  const link=()=>{list.forEach(r=>DIRS.forEach(d=>{const o=g[r.gy+d[2]]?.[r.gx+d[1]];r.d[d[0]]=o||null}))};
  link();
  const dead=()=>list.filter(r=>r.type==='normal'&&DIRS.filter(d=>r.d[d[0]]).length===1);
  guard=0;while(dead().length<3&&guard++<50){add();link()}
  // 시작방에서 가장 먼 막다른 방 = 보스방
  const dd=new Map([[list[0],0]]),q=[list[0]];
  while(q.length){const a=q.shift();DIRS.forEach(d=>{const b=a.d[d[0]];if(b&&!dd.has(b)){dd.set(b,dd.get(a)+1);q.push(b)}})}
  let de=dead().sort((a,b)=>dd.get(b)-dd.get(a));
  de[0].type='boss';
  const rest=de.slice(1).sort(()=>Math.random()-.5);
  rest[0].type='treasure';rest[1].type='shop';
  list.forEach(r=>{r.g=genTpl(r);r.cleared=['start','treasure','shop'].includes(r.type)});
  return {list,start:list[0],boss:de[0],grid:g};
}
function genTpl(r){
  const g=Array.from({length:RH},()=>Array(RW).fill(0));
  if(r.type!=='normal'&&r.type!=='boss')return g;
  if(r.type==='boss'){return g}
  const set=(x,y,v=1)=>{if(x>=0&&x<RW&&y>=0&&y<RH)g[y][x]=v};
  const T=ri(0,9);
  switch(T){
   case 1:[[2,3],[6,3],[2,9],[6,9]].forEach(c=>set(c[0],c[1]));break;
   case 2:for(let y=5;y<=7;y++)for(let x=3;x<=5;x++)if(!(x==4&&y==6))set(x,y);break;
   case 3:for(let x=1;x<=7;x++)if(x!==4)set(x,6,2);break;
   case 4:for(let i=0;i<5;i++){set(1+i,2+i);set(7-i,2+i)}break;
   case 5:[[1,1],[2,1],[1,2],[7,1],[6,1],[7,2],[1,11],[2,11],[1,10],[7,11],[6,11],[7,10]].forEach(c=>set(c[0],c[1]));break;
   case 6:[[3,4],[5,4],[3,8],[5,8],[3,6],[5,6]].forEach(c=>set(c[0],c[1]));break;
   case 7:for(let i=0;i<4;i++){set(2,3+i*2,2);set(6,3+i*2,2)}break;
   case 8:for(let i=0;i<6;i++)set(ri(1,7),ri(2,10),Math.random()<.5?1:2);break;
  }
  // 문 앞 통로 확보 + 연결성 검사
  const clear=[[4,0],[4,1],[4,12],[4,11],[0,6],[1,6],[8,6],[7,6]];clear.forEach(c=>g[c[1]][c[0]]=0);
  const seen=new Set(),st=[[4,6]];let cnt=0,free=0;
  for(let y=0;y<RH;y++)for(let x=0;x<RW;x++)if(!g[y][x])free++;
  if(g[6][4])g[6][4]=0;
  while(st.length){const [x,y]=st.pop(),k=x+','+y;if(seen.has(k)||x<0||y<0||x>=RW||y>=RH||g[y][x])continue;seen.add(k);cnt++;st.push([x+1,y],[x-1,y],[x,y+1],[x,y-1])}
  free=0;for(let y=0;y<RH;y++)for(let x=0;x<RW;x++)if(!g[y][x])free++;
  if(cnt<free)return Array.from({length:RH},()=>Array(RW).fill(0));
  return g;
}
// ---- 충돌 ----
function doorCell(cx,cy){
  if(cx===4&&cy===-1)return 'N';if(cx===4&&cy===RH)return 'S';if(cy===6&&cx===-1)return 'W';if(cy===6&&cx===RW)return 'E';return null;
}
function doorOpen(d){return !!R.d[d]&&R.open}
function solid(cx,cy,fl){
  if(cx>=0&&cx<RW&&cy>=0&&cy<RH){const v=R.g[cy][cx];return v?!fl:false}
  const d=doorCell(cx,cy);if(d)return !doorOpen(d);return true;
}
function collide(o,fl){
  let hit=false;const r=o.r,x0=Math.floor(o.x-r),x1=Math.floor(o.x+r),y0=Math.floor(o.y-r),y1=Math.floor(o.y+r);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
    if(!solid(cx,cy,fl))continue;
    const nx=clamp(o.x,cx,cx+1),ny=clamp(o.y,cy,cy+1),dx=o.x-nx,dy=o.y-ny,d2=dx*dx+dy*dy;
    if(d2>=r*r)continue;hit=true;
    if(d2<1e-9){const l=o.x-cx,rr=cx+1-o.x,t=o.y-cy,b=cy+1-o.y,m=Math.min(l,rr,t,b);
      if(m===l)o.x=cx-r;else if(m===rr)o.x=cx+1+r;else if(m===t)o.y=cy-r;else o.y=cy+1+r}
    else{const d=Math.sqrt(d2);o.x=nx+dx/d*r;o.y=ny+dy/d*r}
  }
  return hit;
}
function moveC(o,dx,dy,fl){
  const n=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.2));let hit=false;
  for(let i=0;i<n;i++){o.x+=dx/n;o.y+=dy/n;if(collide(o,fl))hit=true}
  return hit;
}
function bulletWall(b){
  const cx=Math.floor(b.x),cy=Math.floor(b.y);
  if(b.x<0||b.y<0||b.x>RW||b.y>RH)return true;
  return R.g[cy][cx]===1;
}
function freeSpot(minD=3,r=.5,fl){
  for(let i=0;i<60;i++){const x=rnd(1,RW-1),y=rnd(1,RH-1);const o={x,y,r};
    if(solid(Math.floor(x),Math.floor(y),fl))continue;
    let ok=true;for(let dy=-1;dy<=1&&ok;dy++)for(let dx=-1;dx<=1;dx++)if(solid(Math.floor(x)+dx,Math.floor(y)+dy,fl)){ok=false;break}
    if(!ok)continue;if(P&&Math.hypot(x-P.x,y-P.y)<minD)continue;return {x,y}}
  return {x:rnd(2,RW-2),y:rnd(2,6)};
}

// ===== COMBAT ENGINE =====
const AI={},BAI={};
const scd=b=>Math.min(4,Math.ceil(b*FLOORS[G.floor-1].dm));
function mkE(def,x,y,o={}){
  const fl=FLOORS[G.floor-1],boss=!!def.boss;
  const hp=boss?def.hp:def.hp*fl.hpm;
  const e=Object.assign({d:def,x,y,r:def.r,hp,mhp:hp,age:0,vx:0,vy:0,mode:'stop',sp:def.sp||0,spm:1,g:null,wait:.3,flash:0,inv:0,spawn:boss?0:.7,vuln:1,
    contact:(def.d>0&&!boss)?scd(Math.min(def.d,2)):0,face:0,ph:0,boss,dead:false,stun:0,pz:null,slowT:0,hits:0,fly:false,ghost:false},o);
  if(o.hpMul){e.hp*=o.hpMul;e.mhp=e.hp}
  const ai=boss?BAI[def.key]:AI[def.id];
  if(ai)e.g=ai(e);
  G.en.push(e);return e;
}
function ebul(e,a,spd,dmg,o={}){
  const b={x:o.x??e.x,y:o.y??e.y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:o.r||.15,dmg:o.raw?dmg:scd(dmg),life:o.life||6,hom:o.hom||0,col:o.col||(e&&e.d.c)||'#f55',fx:o.fx||null,sq:o.sq||0,src:e,refl:o.refl||0};
  if(b.dmg>0||o.zero)G.eb.push(b);else G.eb.push(b);return b;
}
function zone(o){const z=Object.assign({x:0,y:0,r:1,warn:.8,life:.25,dmg:1,tick:.5,tk:0,col:'#ff5a3a',sh:'c',t:0,once:false,hit:false,raw:false},o);
  if(!z.raw)z.dmg=z.dmg>0?scd(z.dmg):0;if(z.once)z.tick=999;G.zn.push(z);return z}
const beam=(o)=>zone(Object.assign({sh:'b',len:20,w:.6,r:0,once:true,life:.3},o));
function fxP(x,y,col,n=8,sp=3,life=.5,sz=.08){for(let i=0;i<n;i++){const a=rnd(0,TAU),s=rnd(.3,1)*sp;G.fx.push({k:'p',x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,t:0,col,sz})}}
function fxRing(x,y,r,col,life=.4){G.fx.push({k:'ring',x,y,r,life,t:0,col})}
function msg(t,d=2.2){G.msg=t;G.msgT=d}
function shake(a){if(S.shake>0)G.shake=Math.max(G.shake,a*S.shake)}
function flashW(a){if(!S.flash){G.vig=Math.max(G.vig,.4);return}if(G.flashCool>0)return;G.flash=Math.max(G.flash,a);G.flashCool=.34}
// ---- 플레이어 피해 ----
function hurtP(dmg,src,fx){
  if(P.inv>0||G.dead||dmg<=0)return false;
  P.hp-=dmg;P.inv=1.0;P.lastHit=G.time;shake(.35);G.vig=.5;sfx('hurt');
  if(S.hap&&navigator.vibrate)try{navigator.vibrate(40)}catch(e){}
  if(src&&!(src.boss)){const a=Math.atan2(P.y-src.y,P.x-src.x);P.kbT=.15;P.kbx=Math.cos(a)*10;P.kby=Math.sin(a)*10}
  if(fx)applyFx(fx);
  if(src&&src.onHit)src.onHit(src);
  if(P.hp<=0){P.hp=0;G.dead=1;G.deadT=0;G.slow=.2;fxP(P.x,P.y,'#aaa',30,4,1)}
  return true;
}
function applyFx(fx){
  if(fx.slow){P.slowT=Math.max(P.slowT,fx.t||2);P.slowM=Math.min(P.slowM,1-fx.slow)}
  if(fx.root)P.rootT=Math.max(P.rootT,fx.root);
  if(fx.erode){P.erodeT=Math.max(P.erodeT,fx.erode)}
}
// ---- 적 피해 ----
function inSafe(){return G.zn.some(z=>z.safe&&z.t>=z.warn&&Math.hypot(P.x-z.x,P.y-z.y)<z.r)}
function hurtE(e,dmg,o={}){
  if(e.dead||e.inv>0||(e.spawn>0&&!e.boss)||e.intang)return 0;
  if(e.decoy){fxP(o.x??e.x,o.y??e.y,'#fff',3,2,.2);return 0}
  if(e.immune){fxP(e.x,e.y,'#888',3,2,.2);return 0}
  let m=e.vuln||1;
  if(e.wk)m*=e.wk(o)||1;
  if(e.shield&&o.bvx!==undefined&&!o.dot){
    const inc=Math.atan2(-o.bvy,-o.bvx);let df=Math.abs(((inc-e.face+Math.PI*3)%TAU)-Math.PI);
    if(df<Math.PI/3){ // 정면(120도) 방어
      if(e.shield==='reflect')ebul(e,Math.atan2(o.bvy,o.bvx)+Math.PI+rnd(-.1,.1),7,2,{col:'#9fe',r:.16,x:o.x,y:o.y});
      fxP(o.x??e.x,o.y??e.y,'#bcd',4,3,.25);sfx('hit');return 0}
  }
  if(e.ghostHalf&&e.alpha<.9)m*=.5;
  if(e.needSafe&&!inSafe())m=0;
  const v=dmg*m;if(v<=0){fxP(e.x,e.y,'#666',2,2,.2);return 0}
  e.hp-=v;e.flash=.09;if(!o.dot){sfx('hit');e.hits++}
  if(e.onHurt)e.onHurt(e,v,o);
  if(e.hp<=0&&!e.dead)killE(e);
  return v;
}
function aliveCount(){return G.en.filter(e=>!e.dead&&!e.decoy&&!e.noClear).length}
function killE(e){
  if(e.d.id===36&&!e.fuse){e.fuse=2;e.hp=1;e.inv=99;e.mode='stop';return}
  if(e.dead)return;
  e.dead=true;
  const i=G.en.indexOf(e);if(i>=0)G.en.splice(i,1);
  if(!e.decoy&&!e.ill)G.kills++;
  if(e.die)e.die(e);
  sfx('kill');fxP(e.x,e.y,e.d.c,e.boss?40:12,e.boss?6:3.5,e.boss?1:.5,e.boss?.14:.08);
  if(!e.boss&&!e.decoy&&!e.noDrop){
    if(Math.random()<.25)G.pk.push({t:'coin',x:e.x,y:e.y,vx:rnd(-1,1),vy:rnd(-1,1)});
    if(Math.random()<.08)G.pk.push({t:'half',x:e.x,y:e.y,vx:rnd(-1,1),vy:rnd(-1,1)});
  }
  if(e.boss&&!e.ill&&!e.noBossEnd)bossDown(e);
  else if(!e.boss||e.ill){if(e.d.id===undefined)return}
  // 방 클리어는 업데이트 루프에서 판정
}
// ---- 아이템 ----
function poolItems(){
  const own=P.items,ok=ITEMS.filter(it=>!own.includes(it.id)&&!(it.id===6&&P.maxhp<4)&&!(it.t==='a'&&P.active));
  return ok;
}
function giveItem(id){
  const it=ITEMS[id-1];P.items.push(id);
  if(id===6){P.maxhp-=2;P.hp=Math.min(P.hp,P.maxhp)}
  if(id===10){P.active=10;P.acd=0}
  if(id===4){P.orbCd=0}
  recalc();sfx('pick');G.flashItem={it,t:2.4};
  msg(it.n+' — '+it.d,3);
}
// ---- 방 클리어/보상 ----
function roomCleared(){
  R.cleared=true;R.open=true;sfx('door');
  if(P.active===10)P.acd=Math.max(0,P.acd-20);
  if(R.type==='normal'&&Math.random()<.4){
    const x=4.5,y=6.5;
    if(Math.random()<.5){for(let i=0,n=ri(1,3);i<n;i++)G.pk.push({t:'coin',x:x+rnd(-.5,.5),y:y+rnd(-.5,.5),vx:0,vy:0})}
    else G.pk.push({t:'heart',x,y,vx:0,vy:0});
  }
}
function bossDown(e){
  G.boss=null;G.eb.length=0;G.zn.length=0;G.darkR=0;G.ice=false;
  for(const x of G.en.slice()){if(x!==e){x.dead=true;fxP(x.x,x.y,'#fff',8,3,.5)}}G.en.length=0;
  // 5층 중간 보스 → 최종 보스
  if(R.stage==='mid5'){R.stage='final';G.warnT=1.5;sfx('warn');R.bossPending=true;R.bd=pickBossDef('final');G.warnName=R.bd.n;flashW(.5);G.eb.length=0;G.zn.length=0;return}
  if(R.stage==='final'){finalClear();return}
  if(R.stage==='angel'||R.stage==='devil'){
    const it=pick(poolItems());
    G.pk.push({t:'item',id:it?it.id:0,x:4.5,y:5,price:0});
    if(R.stage==='angel'){P.hp=Math.min(P.maxhp,P.hp+2);msg('세라핌의 축복: 체력 1칸 회복')}else{P.dmgBonus+=.5;recalc();msg('벨리알의 계약: 공격력 +0.5')}
    R.cleared=true;R.open=true;sfx('door');return;
  }
  R.cleared=true;R.open=true;sfx('door');flashW(.35);
  const pool=poolItems();
  if(pool.length)G.pk.push({t:'item',id:pick(pool).id,x:4.5,y:5.3,price:0});
  G.pk.push({t:'stairs',x:4.5,y:8});
  if(G.floor>=3&&!G.angelUsed&&Math.random()<.25)openSpecialRoom();
}
function openSpecialRoom(){
  const free=DIRS.filter(d=>{const x=R.gx+d[1],y=R.gy+d[2];return x>=0&&x<7&&y>=0&&y<7&&!G.grid[y][x]&&!R.d[d[0]]});
  if(!free.length)return;
  const d=pick(free),opp={N:'S',S:'N',E:'W',W:'E'}[d[0]],type=Math.random()<.5?'angel':'devil';
  const r={gx:R.gx+d[1],gy:R.gy+d[2],type,d:{N:null,E:null,S:null,W:null},cleared:false,visited:false,seen:true,g:Array.from({length:RH},()=>Array(RW).fill(0))};
  G.grid[r.gy][r.gx]=r;G.rooms.push(r);R.d[d[0]]=r;r.d[opp]=R;G.angelUsed=true;
  msg(type==='angel'?'천사의 문이 열렸다':'악마의 문이 열렸다',3);
}
function finalClear(){
  flashW(.5);sfx('win');
  fxP(R.fx||4.5,R.fy||3,'#fff',60,8,1.5,.15);
  G.pk.push({t:'portal',x:4.5,y:7});
  G.pk.push({t:'chest',x:4.5,y:4.2});
  G.scr='play';G.finalDone=true;R.cleared=true;R.open=true;
}
// ---- 방 진입/스폰 ----
function pickMon(f,cnt){
  const main={1:[1,2],2:[1,2],3:[2,3],4:[3,4],5:[4,5]}[f];
  const c=M.filter(m=>f>=m.f0&&f<=m.f1);
  const cap=m=>{
    if(m.g===3&&cnt.g3>=2)return false;if(m.g===4&&cnt.g4>=2)return false;
    if(m.id===42&&cnt.b>=4)return false;if(m.id===29&&(cnt.sand>=1||cnt.g2>=2))return false;
    if(m.id===38&&cnt.tp>=1)return false;if(m.id===48&&cnt.mb>=1)return false;if(m.id===26&&cnt.grav>=1)return false;
    return true};
  const cand=c.filter(cap);if(!cand.length)return M[0];
  const w=cand.map(m=>main.includes(m.g)?3:.7),s=w.reduce((a,b)=>a+b,0);let r=Math.random()*s;
  for(let i=0;i<cand.length;i++){r-=w[i];if(r<=0)return cand[i]}return cand[0];
}
function spawnRoom(){
  const fl=FLOORS[G.floor-1],n=ri(fl.cnt[0],fl.cnt[1]);
  const cnt={g2:0,g3:0,g4:0,b:0,sand:0,tp:0,mb:0,grav:0};
  for(let i=0;i<n;i++){
    const m=pickMon(G.floor,cnt);
    if(m.g===2)cnt.g2++;if(m.g===3)cnt.g3++;if(m.g===4)cnt.g4++;if(m.id===42)cnt.b++;if(m.id===29)cnt.sand++;if(m.id===38)cnt.tp++;if(m.id===48)cnt.mb++;if(m.id===26)cnt.grav++;
    spawnMon(m);
  }
}
function spawnMon(m,pos){
  const fl=m.id===14||m.id===17||m.id===19||m.id===37||m.id===49||m.id===34;
  const p=pos||freeSpot(3.2,m.r,fl);
  if(m.id===4){let l;for(let i=0;i<4;i++){l=mkE(m,p.x+rnd(-.5,.5),p.y+rnd(-.5,.5));initE(l)}return l}
  const e=mkE(m,p.x,p.y);initE(e);return e;
}
function initE(e){
  const id=e.d.id;
  if([14,17,19,37,49].includes(id))e.fly=true;
  if(id===34){e.ghost=true;e.fly=true}
  e.pd=rnd(3.5,5);
}
function enterRoom(next,dir){
  const old=R;
  R=next;G.room=R;R.visited=true;R.seen=true;
  DIRS.forEach(d=>{const o=R.d[d[0]];if(o)o.seen=true});
  G.en.length=0;G.eb.length=0;G.pb.length=0;G.zn.length=0;G.fx.length=0;G.boss=null;if(!R.pk)R.pk=[];G.pk=R.pk;
  // 위치
  const pos={N:[4.5,RH-.7],S:[4.5,.7],W:[RW-.7,6.5],E:[.7,6.5]}[dir]||[4.5,6.5];
  P.x=pos[0];P.y=pos[1];P.vx=P.vy=0;P.inv=Math.max(P.inv,.2);
  G.tr=dir&&old?{t:0,dir,old}:null;
  P.slowT=0;P.slowM=1;P.rootT=0;P.sandT=0;P.erodeT=0;G.hist.length=0;G.darkR=0;
  R.open=R.cleared;
  if(!R.cleared)beginRoom();
  else R.open=true;
  if(R.type==='shop'&&!R.stocked)stockShop();
  if(R.type==='treasure'&&!R.stocked){R.stocked=true;const p=poolItems();if(p.length)R.pk.push({t:'item',id:pick(p).id,x:4.5,y:6,price:0})}
}
function pickBossDef(stage){
  if(stage==='mid'||stage==='mid5'){const idx=G.floor===5?pick([8,9]):(G.floor-1)*2+ri(0,1);return Object.assign({key:'m'+(idx+1)},MID[idx])}
  if(stage==='final'){return G.finalKind?{key:'creator',n:'원초의 창조주',hp:1800,r:1,c:'#fff8e8',boss:1}:{key:'void',n:'종말의 공허',hp:1800,r:1,c:'#2a0a4a',boss:1}}
  return stage==='angel'?{key:'sera',n:'세라핌',hp:800,r:.9,c:'#f4e090',boss:1}:{key:'belial',n:'벨리알',hp:800,r:.95,c:'#8a1a1a',boss:1};
}
function beginRoom(){
  if(R.type==='boss'||R.type==='angel'||R.type==='devil'){
    G.warnT=1.5;G.boss=null;sfx('warn');
    R.stage=R.type==='boss'?(G.floor===5?'mid5':'mid'):R.type;
    R.bossPending=true;R.bd=pickBossDef(R.stage);
    G.warnName=R.bd.n;
  }else if(R.type==='normal'){
    spawnRoom();
  }
}
function spawnBoss(){
  R.bossPending=false;
  const d=R.bd||pickBossDef(R.stage);
  const e=mkE(d,4.5,d.key==='void'||d.key==='creator'?3.5:3.2);
  G.warnName=d.n;e.bossBar=true;G.boss=e;R.open=false;
  e.phaseT=(d.key==='void'||d.key==='creator')?[.66,.33]:[.6,.3];
}
function stockShop(){
  R.stocked=true;const p=poolItems().sort(()=>Math.random()-.5);
  if(p[0])R.pk.push({t:'item',id:p[0].id,x:2.5,y:5,price:15});
  if(p[1])R.pk.push({t:'item',id:p[1].id,x:6.5,y:5,price:15});
  R.pk.push({t:'heart',x:3.5,y:8,price:3});R.pk.push({t:'heart',x:5.5,y:8,price:3});
}

// ===== UPDATE LOOPS =====
const In={mx:0,my:0,ax:0,ay:0,key:{},act:false};
function los(x0,y0,x1,y1){
  const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/.25);
  for(let i=1;i<n;i++){const x=x0+(x1-x0)*i/n,y=y0+(y1-y0)*i/n;if(x<0||y<0||x>=RW||y>=RH)continue;if(R.g[Math.floor(y)][Math.floor(x)]===1)return false}
  return true;
}
function nearestEnemy(range){
  let b=null,bd=1e9,bv=null,bvd=1e9;
  for(const e of G.en){if(e.dead||e.intang||e.hidden||(e.spawn>0&&!e.boss))continue;const d=Math.hypot(e.x-P.x,e.y-P.y)-e.r;if(d>=range)continue;
    if(d<bd){bd=d;b=e}
    if(d<bvd&&los(P.x,P.y,e.x,e.y)){bvd=d;bv=e}}
  return bv||b; // 시야가 트인 적을 우선 조준
}
function updatePlayer(dt){
  const p=P;
  p.inv=Math.max(0,p.inv-dt);p.cd-=dt;p.acd=Math.max(0,p.acd-dt);p.flash+=dt;
  if(p.slowT>0){p.slowT-=dt;if(p.slowT<=0)p.slowM=1}
  p.rootT=Math.max(0,p.rootT-dt);p.sandT=Math.max(0,p.sandT-dt);
  if(p.erodeT>0){p.erodeT-=dt;p.erodeTk-=dt;if(p.erodeTk<=0){p.erodeTk=.5;hurtP(scd(1),null)}}
  let mx=In.mx,my=In.my;
  const k=In.key;if(k.a||k.d||k.w||k.s){mx=(k.d?1:0)-(k.a?1:0);my=(k.s?1:0)-(k.w?1:0);const l=Math.hypot(mx,my)||1;mx/=l;my/=l}
  let spd=p.sp*(p.slowT>0?p.slowM:1)*(p.sandT>0?.75:1);if(p.rootT>0)spd=0;
  const tau=G.ice?.6:.08;
  p.vx+=(mx*spd-p.vx)*Math.min(1,dt/tau);p.vy+=(my*spd-p.vy)*Math.min(1,dt/tau);
  let vx=p.vx,vy=p.vy;
  if(p.kbT>0){p.kbT-=dt;vx=p.kbx;vy=p.kby}
  vx+=p.px||0;vy+=p.py||0;p.px=0;p.py=0;
  moveC(p,vx*dt,vy*dt,p.fly);
  if(Math.hypot(mx,my)>.05)p.face=Math.atan2(my,mx);
  // 문 이동
  if(R.open&&!G.tr&&!G.dead){
    let go=null;
    if(p.y<-.15&&R.d.N)go='N';else if(p.y>RH+.15&&R.d.S)go='S';else if(p.x<-.15&&R.d.W)go='W';else if(p.x>RW+.15&&R.d.E)go='E';
    if(go){G.go=go}
  }
  // 조준/발사
  let fire=false,a=p.aim;
  if(!S.auto||In.ax||In.ay||k.up||k.down||k.left||k.right){
    let ax=In.ax,ay=In.ay;if(k.up||k.down||k.left||k.right){ax=(k.right?1:0)-(k.left?1:0);ay=(k.down?1:0)-(k.up?1:0)}
    if(Math.hypot(ax,ay)>.25){a=Math.atan2(ay,ax);fire=true}
  }
  if(!fire&&S.auto){
    p.tgtT-=dt;if(p.tgtT<=0||!p.tgt||p.tgt.dead){p.tgt=nearestEnemy(p.rng);p.tgtT=.15}
    if(p.tgt&&!p.tgt.dead){a=Math.atan2(p.tgt.y-p.y,p.tgt.x-p.x);fire=true}
  }
  p.aim=a;
  if(fire&&p.cd<=0&&!G.dead){shootP(a);p.cd=1/p.fr}
  if(In.act){In.act=false;useActive()}
  // 위성
  if(has(4)){
    p.orb+=dt*Math.PI;p.orbCd=Math.max(0,p.orbCd-dt);
    const ox=p.x+Math.cos(p.orb)*1.4,oy=p.y+Math.sin(p.orb)*1.4;p.ox=ox;p.oy=oy;
    for(const e of G.en){if(e.dead||e.intang||e.decoy)continue;
      if(Math.hypot(e.x-ox,e.y-oy)<e.r+.25){const t=p.orbHit.get(e)||0;if(G.time>t){p.orbHit.set(e,G.time+.35);hurtE(e,p.dmg*.5,{x:ox,y:oy})}}}
  }
}
function shootP(a){
  if(has(3)){laserShot(a);return}
  const bsp=P.bsp,mk=(aa,dm)=>G.pb.push({x:P.x+Math.cos(aa)*.3,y:P.y+Math.sin(aa)*.3,vx:Math.cos(aa)*bsp,vy:Math.sin(aa)*bsp,r:.14*(has(1)?1.25:1),dmg:P.dmg*dm,life:P.rng/bsp,hom:has(2)?2.094:0,expl:has(7),poi:has(8)});
  if(has(9)){mk(a-.2618,.7);mk(a,.7);mk(a+.2618,.7)}else mk(a,1);
  sfx('shoot');
}
function segDist(px,py,x,y,a,len){
  const dx=Math.cos(a),dy=Math.sin(a),t=clamp((px-x)*dx+(py-y)*dy,0,len);return Math.hypot(px-(x+dx*t),py-(y+dy*t));
}
function laserShot(a){
  const dx=Math.cos(a),dy=Math.sin(a);let len=0;
  while(len<14){const x=P.x+dx*len,y=P.y+dy*len;if(bulletWall({x,y}))break;len+=.1}
  G.fx.push({k:'beam',x:P.x,y:P.y,a,len,life:.25,t:0,w:.6,col:'#ff3a3a'});
  let first=null,fd=1e9;
  for(const e of G.en.slice()){if(e.dead||e.intang)continue;
    const t=(e.x-P.x)*dx+(e.y-P.y)*dy;if(t<0||t>len+e.r)continue;
    if(segDist(e.x,e.y,P.x,P.y,a,len)<.3+e.r){
      const v=hurtE(e,P.dmg*1.6,{x:e.x,y:e.y,bvx:dx,bvy:dy});
      if(v>0){if(has(8))e.pz={t:3,dps:P.dmg*.3};if(t<fd){fd=t;first=e}}}}
  if(has(7)&&first)explode(first.x,first.y);
  sfx('beam');shake(.05);
}
function explode(x,y){
  fxRing(x,y,1.2,'#ff9a3a',.35);sfx('boom');
  for(const e of G.en.slice()){if(!e.dead&&!e.intang&&Math.hypot(e.x-x,e.y-y)<1.2+e.r)hurtE(e,P.dmg*.5,{x,y,dot:1})}
}
function useActive(){
  if(P.active!==10||P.acd>0||G.dead)return;
  const h=G.hist;if(!h.length)return;
  const s=h[0];sfx('rewind');
  P.x=s.x;P.y=s.y;P.hp=Math.max(P.hp,Math.min(P.maxhp,s.hp));P.vx=P.vy=0;P.inv=Math.max(P.inv,1);
  for(const r of s.en){
    const e=r[0];if(e.boss&&e.d.key&&!e.ill){e.x=r[1];e.y=r[2];continue}
    if(e.dead){e.dead=false;e.hp=r[3];G.en.push(e)}
    e.x=r[1];e.y=r[2];e.hp=r[3];
  }
  G.eb.length=0;G.zn=G.zn.filter(z=>z.own);
  P.acd=P.acdMax;G.flashRew=.6;h.length=0;
}
function updateHist(dt){
  G.histT=(G.histT||0)+dt;if(G.histT<.05)return;G.histT=0;
  G.hist.push({x:P.x,y:P.y,hp:P.hp,en:G.en.map(e=>[e,e.x,e.y,e.hp])});
  if(G.hist.length>60)G.hist.shift();
}
function updateBullets(dt){
  for(let i=G.pb.length-1;i>=0;i--){
    const b=G.pb[i];b.life-=dt;
    if(b.hom){let t=null,bd=9;for(const e of G.en){if(e.dead||e.intang||e.decoy)continue;const d=Math.hypot(e.x-b.x,e.y-b.y);if(d<bd){bd=d;t=e}}
      if(t&&bd<3){const sp=Math.hypot(b.vx,b.vy),ca=Math.atan2(b.vy,b.vx),ta=Math.atan2(t.y-b.y,t.x-b.x);let df=((ta-ca+Math.PI*3)%TAU)-Math.PI;df=clamp(df,-b.hom*dt,b.hom*dt);b.vx=Math.cos(ca+df)*sp;b.vy=Math.sin(ca+df)*sp}}
    for(const e of G.en){if(e.magnet&&!e.dead&&Math.hypot(e.x-b.x,e.y-b.y)<3.5){const a=Math.atan2(e.y-b.y,e.x-b.x);b.vx+=Math.cos(a)*30*dt;b.vy+=Math.sin(a)*30*dt}}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    let dead=b.life<=0||bulletWall(b);
    if(!dead)for(const z of G.zn){if(z.aura&&z.t>=z.warn&&Math.hypot(b.x-z.x,b.y-z.y)<z.r){
      let blk=true;const o=z.own;if(o&&o.face!==undefined){const l=Math.hypot(b.vx,b.vy)||1;blk=(b.vx*Math.cos(o.face)+b.vy*Math.sin(o.face))/l<.2} // 정면에서 오는 탄만 무력화, 등 뒤는 뚫린다
      if(blk){dead=true;fxP(b.x,b.y,'#66a',2,2,.2);break}}}
    if(!dead)for(const e of G.en){
      if(e.dead||e.intang)continue;
      if(Math.hypot(e.x-b.x,e.y-b.y)<e.r+b.r){
        const v=hurtE(e,b.dmg,{x:b.x,y:b.y,bvx:b.vx,bvy:b.vy});
        if(v>0){if(b.poi)e.pz={t:3,dps:P.dmg*.3};if(b.expl)explode(b.x,b.y)}
        dead=true;break}
    }
    if(dead){fxP(b.x,b.y,'#9ad',2,2,.2,.05);G.pb.splice(i,1)}
  }
  for(let i=G.eb.length-1;i>=0;i--){
    const b=G.eb[i];b.life-=dt;
    if(b.hom){const sp=Math.hypot(b.vx,b.vy),ca=Math.atan2(b.vy,b.vx),ta=Math.atan2(P.y-b.y,P.x-b.x);let df=((ta-ca+Math.PI*3)%TAU)-Math.PI;df=clamp(df,-b.hom*dt,b.hom*dt);b.vx=Math.cos(ca+df)*sp;b.vy=Math.sin(ca+df)*sp}
    b.x+=b.vx*dt;b.y+=b.vy*dt;
    let dead=b.life<=0||bulletWall(b);
    if(!dead&&has(4)&&P.orbCd<=0&&P.ox!==undefined&&Math.hypot(b.x-P.ox,b.y-P.oy)<.4){dead=true;P.orbCd=1.5;fxP(P.ox,P.oy,'#ec4',6,3,.3)}
    if(!dead&&b.dmg>=0&&Math.hypot(b.x-P.x,b.y-P.y)<b.r+P.r*.8){if(b.dmg>0){hurtP(b.dmg,b.src,b.fx);dead=true}else if(!b.harm){dead=true}}
    if(dead)G.eb.splice(i,1);
  }
}
function updateZones(dt){
  for(let i=G.zn.length-1;i>=0;i--){
    const z=G.zn[i];
    if(z.own){if(z.own.dead){G.zn.splice(i,1);continue}if(z.follow){z.x=z.own.x+(z.ox||0);z.y=z.own.y+(z.oy||0)}}
    z.t+=dt;
    if(z.rot)z.a+=z.rot*dt;
    if(z.shr)z.r=z.shr[0]+(z.shr[1]-z.shr[0])*Math.min(1,z.t/z.shr[2]);
    if(z.t>=z.warn+z.life&&!z.inf){G.zn.splice(i,1);continue}
    if(z.t<z.warn)continue;
    if(!z.fired){z.fired=true;if(z.onFire)z.onFire(z)}
    let inside=false;
    const pr=P.r*.6;
    switch(z.sh){
      case'c':inside=Math.hypot(P.x-z.x,P.y-z.y)<z.r+pr;break;
      case'ring':{const rad=(z.t-z.warn)*z.sp;z.rad=rad;if(rad>z.max){G.zn.splice(i,1);continue}const d=Math.hypot(P.x-z.x,P.y-z.y);inside=Math.abs(d-rad)<z.th/2+pr&&!z.hit;break}
      case'cone':{const d=Math.hypot(P.x-z.x,P.y-z.y);if(d<z.len+pr){let df=Math.abs(((Math.atan2(P.y-z.y,P.x-z.x)-z.a+Math.PI*3)%TAU)-Math.PI);inside=df<z.spread/2}break}
      case'b':inside=segDist(P.x,P.y,z.x,z.y,z.a,z.len)<z.w/2+pr;break;
      case'void':inside=Math.hypot(P.x-z.x,P.y-z.y)>z.r;break;
      case'rect':inside=P.x>z.x-pr&&P.x<z.x+z.w+pr&&P.y>z.y-pr&&P.y<z.y+z.h+pr;break;
    }
    if(z.pull&&Math.hypot(P.x-z.x,P.y-z.y)<z.r){const a=Math.atan2(z.y-P.y,z.x-P.x);P.px+=Math.cos(a)*z.pull;P.py+=Math.sin(a)*z.pull}
    if(z.sand&&Math.hypot(P.x-z.x,P.y-z.y)<z.r)P.sandT=.3;
    if(inside){
      if(z.fx&&!(z.dmg>0&&z.tk>0))applyFx(z.fx);
      if(z.dmg>0){if(z.tk<=0){if(hurtP(z.dmg,z.own,z.fx)||z.once){z.tk=z.tick;if(z.sh==='ring')z.hit=true}}}
      if(z.core&&Math.hypot(P.x-z.x,P.y-z.y)<z.core){hurtP(scd(3),null)}
    }
    z.tk-=dt;
    if(z.sh==='c'&&z.pullB){} 
  }
}
function updatePickups(dt){
  for(let i=G.pk.length-1;i>=0;i--){
    const k=G.pk[i];k.age=(k.age||0)+dt;
    if(k.vx||k.vy){k.x=clamp(k.x+k.vx*dt,.5,RW-.5);k.y=clamp(k.y+k.vy*dt,.5,RH-.5);k.vx*=.9;k.vy*=.9}
    if(k.t==='coin'&&Math.hypot(P.x-k.x,P.y-k.y)<2){const a=Math.atan2(P.y-k.y,P.x-k.x);k.x+=Math.cos(a)*4*dt;k.y+=Math.sin(a)*4*dt}
    const d=Math.hypot(P.x-k.x,P.y-k.y),rad=(k.t==='item'||k.t==='stairs'||k.t==='portal'||k.t==='chest')?.6:.4;
    if(d>=rad)continue;
    if(k.age<.4&&k.t!=='coin')continue;
    if(k.price){if(P.coins<k.price){if(!k.warned||G.time-k.warned>2){k.warned=G.time;msg('코인이 부족하다 ('+k.price+')',1.4)}continue}}
    switch(k.t){
      case'coin':P.coins++;G.coinsGot++;sfx('coin');break;
      case'half':if(P.hp>=P.maxhp)continue;P.hp=Math.min(P.maxhp,P.hp+1);sfx('pick');break;
      case'heart':if(P.hp>=P.maxhp)continue;P.hp=Math.min(P.maxhp,P.hp+2);sfx('pick');break;
      case'item':if(k.id===6&&P.maxhp<4){continue}if(k.id===10&&P.active)continue;giveItem(k.id);break;
      case'stairs':if(aliveCount()===0)G.nextFloor=true;continue;
      case'portal':G.win=true;continue;
      case'chest':P.coins+=ri(5,9);sfx('pick');msg('보물 상자: 코인 획득');break;
    }
    if(k.price)P.coins-=k.price;
    G.pk.splice(i,1);
  }
}
function moveE(e,dt){
  if(e.fixed)return;
  let vx=0,vy=0;const sp=e.sp*e.spm*(e.slowT>0?.6:1);
  const a=Math.atan2(P.y-e.y,P.x-e.x);
  switch(e.mode){
    case'chase':vx=Math.cos(a)*sp;vy=Math.sin(a)*sp;break;
    case'zig':{const b=a+Math.sin(e.age*7)*.9;vx=Math.cos(b)*sp;vy=Math.sin(b)*sp;break}
    case'flee':vx=-Math.cos(a)*sp;vy=-Math.sin(a)*sp;break;
    case'strafe':{const d=Math.hypot(P.x-e.x,P.y-e.y);let b=a;
      if(d>e.pd+.8)b=a;else if(d<e.pd-.8)b=a+Math.PI;else b=a+Math.PI/2*(e.dir||1);
      vx=Math.cos(b)*sp;vy=Math.sin(b)*sp;break}
    case'wander':{e.wt=(e.wt||0)-dt;if(e.wt<=0){e.wa=rnd(0,TAU);e.wt=rnd(1,2.2)}vx=Math.cos(e.wa)*sp;vy=Math.sin(e.wa)*sp;break}
    case'vec':case'bounce':vx=e.vx;vy=e.vy;break;
    default:break;
  }
  if(e.stun>0||e.spawn>0&&!e.boss){return}
  if(e.ghost){e.x=clamp(e.x+vx*dt,-.4,RW+.4);e.y=clamp(e.y+vy*dt,-.4,RH+.4);return}
  const ox=e.x,oy=e.y;
  const hx=moveC(e,vx*dt,0,e.fly),x1=e.x;
  const hy=moveC(e,0,vy*dt,e.fly);
  const bx=hx&&Math.abs(vx)>.01,by=hy&&Math.abs(vy)>.01;
  if(bx||by){e.wallHit=true;if(e.mode==='bounce'){if(bx)e.vx*=-1;if(by)e.vy*=-1}}
  if(e.boss||e.fly)return;
}
function updateEnemies(dt){
  for(let i=G.en.length-1;i>=0;i--){
    const e=G.en[i];if(!e||e.dead)continue;
    if(e.alphaCycle)e.alpha=.3+.7*(.5+.5*Math.cos(e.age*Math.PI));
    if(e.wn>0)e.wn-=dt;
    if(e.ttl&&(e.ttl-=dt)<=0){e.dead=true;G.en.splice(G.en.indexOf(e),1);fxP(e.x,e.y,'#fff',12,3,.5);continue}
    if(e.shield){e.face=e.mode==='vec'?Math.atan2(e.vy,e.vx):Math.atan2(P.y-e.y,P.x-e.x)}
    e.age+=dt;e.flash=Math.max(0,e.flash-dt);e.inv=Math.max(0,e.inv-dt);e.stun=Math.max(0,e.stun-dt);e.slowT=Math.max(0,e.slowT-dt);
    if(e.spawn>0){e.spawn-=dt;if(e.boss)e.spawn=0;continue}
    if(e.pz){e.pz.t-=dt;hurtE(e,e.pz.dps*dt,{dot:1});if(e.pz.t<=0)e.pz=null;if(e.dead)continue}
    if(e.fuse){e.fuse-=dt;if(e.fuse<=0){e.fuse=0;e.dead=true;const k=G.en.indexOf(e);if(k>=0)G.en.splice(k,1);
      zone({x:e.x,y:e.y,r:2,warn:0,life:.2,dmg:3,once:true,col:'#ff8a2a'});fxRing(e.x,e.y,2,'#f82',.4);sfx('boom');shake(.3);G.kills++;continue}}
    if(e.stun<=0&&e.g){e.wait-=dt;let guard=0;while(e.wait<=0&&guard++<4&&e.g){const r=e.g.next();if(r.done){e.g=null;break}e.wait=Math.max(.001,r.value||0)}}
    if(e.dead)continue;
    // 보스 페이즈
    if(e.boss&&e.phaseT&&!e.lockPh){
      const ratio=e.hp/e.mhp;let ph=0;for(const t of e.phaseT)if(ratio<=t)ph++;
      if(ph>e.ph){e.ph=ph;e.inv=1.5;sfx('phase');shake(.5);flashW(.3);G.eb.length=0;G.zn=G.zn.filter(z=>z.keep);const ai=BAI[e.d.key];if(ai){e.g=ai(e);e.wait=1.2}e.mode='stop';e.vuln=1}
    }
    moveE(e,dt);
    // 분리
    if(!e.boss&&!e.ghost&&!e.fixed)for(let j=i-1;j>=0;j--){const o=G.en[j];if(!o||o.dead||o.boss||o.ghost||o.fixed)continue;
      const dx=e.x-o.x,dy=e.y-o.y,d=Math.hypot(dx,dy),m=e.r+o.r;if(d<m&&d>.001){const p=(m-d)*.5;e.x+=dx/d*p*.5;e.y+=dy/d*p*.5;o.x-=dx/d*p*.5;o.y-=dy/d*p*.5}}
    if(!e.ghost)collide(e,e.fly);
    // 접촉 피해
    if(e.contact>0&&!e.hidden&&e.spawn<=0&&!e.fuse&&Math.hypot(P.x-e.x,P.y-e.y)<e.r+P.r*.85){
      if(hurtP(e.contact,e)){e.hitP=true;if(e.onContact)e.onContact(e)}}
  }
}
function updateFx(dt){
  for(let i=G.fx.length-1;i>=0;i--){const f=G.fx[i];f.t+=dt;if(f.t>=f.life){G.fx.splice(i,1);continue}if(f.k==='p'){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vx*=.94;f.vy*=.94}}
}

// ===== MONSTER AI (generators) =====
const aimA=e=>Math.atan2(P.y-e.y,P.x-e.x),dP=e=>Math.hypot(P.x-e.x,P.y-e.y);
const sh=(e,a,sp,d,o)=>ebul(e,a,sp,d,o);
function spawnMini(def,x,y,o={}){const e=mkE(def,x,y,Object.assign({},o));e.spawn=.4;return e}
function countOwned(o,id){return G.en.filter(e=>e.owner===o&&!e.dead&&(!id||e.d.id===id)).length}
const chase=function*(e){e.mode='chase';yield 99999};
AI[1]=function*(e){for(;;){e.mode='chase';yield rnd(1.2,2.2);e.mode='stop';e.wn=.6;yield .6;const a=aimA(e);e.mode='vec';e.vx=Math.cos(a)*e.sp*1.8;e.vy=Math.sin(a)*e.sp*1.8;yield .9}};
AI[2]=function*(e){for(;;){e.mode='chase';while(dP(e)>1.3)yield .1;e.mode='stop';e.wn=.4;const a=aimA(e);zone({x:e.x,y:e.y,sh:'cone',a,spread:1.8,len:1.3,warn:.4,life:.15,dmg:e.d.d,once:true,col:'#ffffff',own:e});yield .6;yield 1}};
AI[3]=function*(e){for(;;){e.mode='stop';e.wn=.5;yield .5;const a=aimA(e);e.mode='vec';e.vx=Math.cos(a)*e.sp;e.vy=Math.sin(a)*e.sp;e.wallHit=false;e.hitP=false;let t=0;while(!e.wallHit&&!e.hitP&&t<3){t+=.05;yield .05}e.mode='stop';yield 1}};
AI[4]=chase;
AI[5]=function*(e){for(;;){e.mode='chase';zone({x:e.x,y:e.y,r:.38,warn:0,life:4,dmg:0,fx:{slow:.3,t:2},col:'#5fc24a66'});yield .8}};
AI[6]=function*(e){for(;;){e.mode='chase';while(dP(e)>2.3)yield .1;e.mode='stop';e.wn=.8;zone({x:e.x,y:e.y,r:2,warn:.8,life:.2,dmg:e.d.d,once:true,col:'#c8b090',own:e});yield 1;yield 1.4}};
AI[7]=function*(e){for(;;){e.mode='chase';yield 1.5;if(dP(e)<2.5){sfx('tele');fxP(e.x,e.y,'#a070e0',8,3,.4);const a=rnd(0,TAU);e.x=clamp(P.x+Math.cos(a)*.9,1,RW-1);e.y=clamp(P.y+Math.sin(a)*.9,1,RH-1);fxP(e.x,e.y,'#a070e0',8,3,.4);e.mode='stop';yield .5}}};
AI[8]=function*(e){for(;;){e.mode='zig';let t=0;while(dP(e)>1.1&&t<4){t+=.1;yield .1}e.mode='flee';yield .8}};
AI[9]=function*(e){const a=rnd(0,TAU);e.mode='bounce';e.vx=Math.cos(a)*e.sp;e.vy=Math.sin(a)*e.sp;yield 99999};
AI[10]=function*(e){e.shield='block';for(;;){e.mode='chase';yield 1.6;e.mode='stop';e.wn=.4;yield .4;const a=aimA(e);e.mode='vec';e.vx=Math.cos(a)*e.sp*1.4;e.vy=Math.sin(a)*e.sp*1.4;e.dashA=a;yield .8}};
AI[11]=function*(e){e.mode='strafe';e.dir=Math.random()<.5?1:-1;for(;;){yield 2;sh(e,aimA(e),5,2)}};
AI[12]=function*(e){e.mode='strafe';for(;;){yield 2.5;for(let i=0;i<2;i++){sh(e,aimA(e),5,2,{col:'#b070ff'});yield .2}}};
AI[13]=function*(e){e.mode='strafe';for(;;){yield 3;const a=aimA(e);for(const o of[-.35,0,.35])sh(e,a+o,5,2,{col:'#ffe040'})}};
AI[14]=function*(e){e.mode='wander';for(;;){yield 2;sh(e,aimA(e),9,2,{r:.1,col:'#9ad23a'})}};
AI[15]=function*(e){e.mode='strafe';for(;;){yield 3.5;sh(e,aimA(e),3.5,2,{hom:1.396,life:4,r:.2,col:'#6a50a0'})}};
AI[16]=function*(e){e.mode='strafe';for(;;){yield 2.6;e.mode='stop';e.wn=1.2;const a=aimA(e);beam({x:e.x,y:e.y,a,w:.5,warn:1.2,life:.25,dmg:3,col:'#ff4a3a'});sfx('beam');yield 1.5;e.mode='strafe'}};
AI[17]=function*(e){e.mode='wander';for(;;){yield 4;zone({x:P.x,y:P.y,r:1,warn:1,life:.2,dmg:2,once:true,col:'#7ad05a'})}};
AI[18]=function*(e){e.mode='strafe';for(;;){yield 3;sh(e,aimA(e),5,1,{fx:{slow:.35,t:2.5},col:'#66c4e8'})}};
AI[19]=function*(e){e.mode='wander';for(;;){yield 4.5;sh(e,aimA(e),3,3,{r:.6,col:'#f0702a'})}};
AI[20]=function*(e){e.fixed=true;let o=0;for(;;){yield 3;for(let i=0;i<4;i++)sh(e,o+i*Math.PI/2,5,2,{col:'#c8c0a8'});o+=Math.PI/4}};
AI[21]=function*(e){e.die=e=>zone({x:e.x,y:e.y,r:1.2,warn:0,life:5,dmg:1,tick:.75,col:'#ff5a1a88'});e.mode='chase';yield 99999};
AI[22]=function*(e){e.fixed=true;zone({x:e.x,y:e.y,r:2,warn:0,life:1,dmg:1,tick:1,col:'#7ad03a55',own:e,inf:true});yield 99999};
AI[23]=function*(e){e.mode='wander';for(;;){yield 2.5;for(let i=0;i<3;i++){const p=i?freeSpot(0,.3):{x:P.x,y:P.y};zone({x:p.x,y:p.y,r:.8,warn:.8,life:.2,dmg:2,once:true,col:'#ffee55'})}}};
AI[24]=function*(e){e.mode='chase';for(;;){zone({x:e.x,y:e.y,r:.5,warn:0,life:4,dmg:1,tick:.5,col:'#e0481a88'});yield .45}};
AI[25]=function*(e){e.mode='strafe';for(;;){yield 4;zone({x:P.x,y:P.y,r:.9,warn:.7,life:.2,dmg:2,once:true,fx:{slow:.5,t:1.5},col:'#9fe0f5'})}};
AI[26]=function*(e){e.fixed=true;for(;;){yield 8;zone({x:e.x,y:e.y,r:3,warn:.3,life:4,dmg:0,pull:2.2,col:'#6a4aa855',own:e})}};
AI[27]=function*(e){e.fixed=true;for(;;){yield 6;zone({x:P.x,y:P.y,r:.8,warn:.6,life:1.2,dmg:1,once:true,fx:{root:1.2},col:'#6a5030'})}};
AI[28]=function*(e){e.mode='chase';for(;;){yield 5;e.mode='stop';const a=aimA(e);zone({x:e.x,y:e.y,sh:'cone',a,spread:.52,len:7,warn:.5,life:1,dmg:1,tick:.5,fx:{erode:3},col:'#a8d03a'});yield 1.6;e.mode='chase'}};
AI[29]=function*(e){e.mode='chase';zone({x:e.x,y:e.y,r:2.5,warn:0,life:1,dmg:0,fx:{slow:.25,t:.3},sand:true,own:e,follow:true,inf:true,col:'#d6b67855'});yield 99999};
AI[30]=function*(e){e.fixed=true;for(;;){yield 4;zone({x:P.x,y:P.y,r:1.4,warn:1,life:.2,dmg:3,once:true,col:'#b05ad8'})}};
AI[31]=function*(e){e.mode='strafe';for(;;){yield 8;if(countOwned(e)<=2)for(let i=0;i<2;i++){const m=spawnMini(MX.skel,e.x+rnd(-.6,.6),e.y+rnd(-.6,.6));m.owner=e}}};
AI[32]=function*(e){e.fixed=true;for(;;){yield 6;if(countOwned(e)<5){const m=spawnMini(MX.spider,e.x+rnd(-.5,.5),e.y+rnd(-.5,.5));m.owner=e}}};
AI[33]=function*(e){e.immune=true;e.contact=0;e.mode='stop';while(dP(e)>2)yield .1;e.immune=false;e.contact=scd(2);e.sp=3;e.mode='chase';fxP(e.x,e.y,'#999',14,4,.5);yield 99999};
AI[34]=function*(e){e.ghostHalf=true;e.alphaCycle=true;e.mode='chase';yield 99999};
AI[35]=function*(e){e.shield='reflect';e.mode='chase';yield 99999};
AI[36]=function*(e){e.mode='chase';yield 99999};
AI[37]=function*(e){e.mode='zig';e.onHit=x=>{e.hp=Math.min(e.mhp,e.hp+4)};yield 99999};
AI[38]=function*(e){e.mode='strafe';for(;;){yield 8;const s=freeSpot(0,.35);zone({x:s.x,y:s.y,r:.6,warn:.6,life:.1,dmg:0,col:'#a070e0'});yield .6;sfx('tele');fxP(P.x,P.y,'#a070e0',10,3,.4);P.x=s.x;P.y=s.y;fxP(s.x,s.y,'#a070e0',10,3,.4)}};
AI[39]=function*(e){e.mode='strafe';const cl=[];for(let i=0;i<2;i++){const m=spawnMini(MX.ill,e.x+rnd(-1,1),e.y+rnd(-1,1),{decoy:true,noClear:true,noDrop:true,hpMul:1});m.owner=e;m.mode='wander';m.sp=.9;cl.push(m);m.hue=e.d.c}
  e.die=e=>cl.forEach(c=>{c.dead=true;const k=G.en.indexOf(c);if(k>=0)G.en.splice(k,1)});
  let t=0;for(;;){yield 2.5;t++;sh(e,aimA(e),5,2,{col:'#9a7ae8'});for(const c of cl)if(!c.dead)sh(c,aimA(c),5,0,{raw:true,col:'#9a7ae888',zero:true});if(t%2===0){const all=[e,...cl.filter(c=>!c.dead)],pos=all.map(o=>({x:o.x,y:o.y})).sort(()=>Math.random()-.5);all.forEach((o,i)=>{fxP(o.x,o.y,'#a8f',6,2,.4);o.x=pos[i].x;o.y=pos[i].y})}}};
AI[40]=function*(e){e.fixed=true;e.magnet=true;yield 99999};
AI[41]=function*(e){e.die=e=>{for(let i=0;i<2;i++)spawnMini(MX.amoeba,e.x+rnd(-.4,.4),e.y+rnd(-.4,.4))};e.mode='chase';yield 99999};
AI[42]=function*(e){e.contact=0;e.mode='chase';while(dP(e)>e.r+P.r+.1)yield .04;zone({x:e.x,y:e.y,r:1.5,warn:0,life:.2,dmg:3,once:true,col:'#ff8a2a'});fxRing(e.x,e.y,1.5,'#f82',.4);sfx('boom');shake(.25);e.noDrop=true;killE(e)};
AI[43]=function*(e){e.mode='chase';e.onHurt=()=>{if(G.time>(e.spk||0)){e.spk=G.time+1;for(let i=0;i<4;i++)sh(e,i*Math.PI/2+Math.PI/4,5,1,{col:'#9ad05a',r:.12})}};yield 99999};
AI[44]=function*(e){e.mode='strafe';for(;;){yield 5;if(e.hp>20){e.hp-=10;e.flash=.15;sh(e,aimA(e),3.5,3,{r:.5,col:'#a01e2c'})}}};
AI[45]=function*(e){e.mode='strafe';for(;;){yield 4;e.wn=.7;zone({x:e.x,y:e.y,sh:'ring',sp:5,th:.4,max:10,warn:.7,life:3,dmg:2,once:true,col:'#e8a03a'});yield .8}};
AI[46]=function*(e){e.die=e=>{for(let i=0;i<2;i++)spawnMini(MX.head,e.x+(i?.5:-.5),e.y)};e.mode='chase';yield 99999};
AI[47]=function*(e){e.die=e=>{for(let i=0;i<3;i++)spawnMini(MX.worm,e.x+rnd(-.5,.5),e.y+rnd(-.5,.5))};e.mode='chase';yield 99999};
AI[48]=function*(e){e.mode='strafe';for(;;){yield 10;e.wn=3;for(let i=0;i<24;i++){sh(e,rnd(0,TAU),4,1,{col:'#ffe03a',r:.12});yield .125}}};
AI[49]=function*(e){e.mode='wander';e.onHurt=()=>{if(G.time>(e.spk||0)){e.spk=G.time+1;for(let i=0;i<6;i++)sh(e,i*Math.PI/3,3.2,1,{col:'#7ae0c0',r:.12})}};yield 99999};
AI[50]=function*(e){e.mode='chase';e.die=e=>{if(e.noRebirth)return;const c=M.filter(m=>G.floor>=m.f0&&G.floor<=m.f1&&![36,42,50].includes(m.id)),m=pick(c);const n=spawnMon(m,{x:e.x,y:e.y});if(n){n.hp*=.5;n.mhp=n.hp;n.spawn=.5}};yield 99999};
// 소환체
AI[101]=chase;AI[102]=chase;AI[103]=chase;AI[104]=chase;AI[105]=chase;
AI[106]=function*(e){e.contact=0;e.mode='chase';e.die=e=>{const b=G.boss;if(b&&!b.dead&&Math.hypot(b.x-e.x,b.y-e.y)<2.4){hurtE(b,40,{dot:1});fxRing(b.x,b.y,1.5,'#fa4',.4);msg('쥐 폭발! 보스에게 40 피해',1.6)}};
  while(dP(e)>e.r+P.r+.1)yield .04;zone({x:e.x,y:e.y,r:1.2,warn:0,life:.2,dmg:2,once:true,col:'#ff8a2a'});fxRing(e.x,e.y,1.2,'#f82',.3);e.ratBlew=true;e.noDrop=true;e.die=null;killE(e)};

// ===== BOSS AI =====
const BC={x:4.5,y:6.5};
function turnFace(e,rate,dt=.05){const t=aimA(e);let df=((t-e.face+Math.PI*3)%TAU)-Math.PI;e.face+=clamp(df,-rate*dt,rate*dt)}
const tele0=(x,y,a,w,warn)=>beam({x,y,a,w,len:20,warn,life:.05,dmg:0,col:'#ff5a4a'});
// 1 미노타우로스
BAI.m1=function*(e){
  e.mode='stop';
  const dash=function*(){
    const a=aimA(e);e.mode='stop';e.wn=.8;tele0(e.x,e.y,a,.9,.8);sfx('warn');yield .8;
    e.mode='vec';e.vx=Math.cos(a)*7;e.vy=Math.sin(a)*7;e.wallHit=false;e.contact=scd(2);e.face=a;
    let t=0;while(!e.wallHit&&t<2.5){t+=.03;yield .03}
    e.mode='stop';e.contact=0;shake(.5);sfx('boom');
    if(e.ph>=1)for(let i=0;i<8;i++)sh(e,i*Math.PI/4+.2,5,2,{col:'#a89070',r:.2});
  };
  for(;;){
    e.vuln=1;e.mode='chase';e.sp=.9;yield 1.2;
    const n=e.ph>=2?3:1;
    for(let i=0;i<n;i++){yield*dash();if(i<n-1)yield .5}
    e.stun=2;e.vuln=1.5;e.wn=0;yield .01;
  }
};
// 2 식인꽃
BAI.m2=function*(e){
  e.fixed=true;e.wk=o=>Math.hypot((o.x??e.x)-e.x,(o.y??e.y)-e.y)<.4?1.3:1;
  for(;;){
    const n=e.ph>=1?3:1;
    for(let i=0;i<n;i++){const p=i?freeSpot(0,1):{x:P.x,y:P.y};zone({x:p.x,y:p.y,r:2,warn:.8,life:5,dmg:1,tick:.6,col:'#7a4a8a77'})}
    yield 1.5;
    if(e.ph<2){for(let i=0;i<2;i++){zone({x:P.x,y:P.y,r:.8,warn:.6,life:.2,dmg:2,once:true,col:'#3a8a3a'});yield .9}yield 1}
    else{const o=rnd(0,TAU);for(let k=0;k<4;k++)beam({x:e.x,y:e.y,a:o+k*Math.PI/2,rot:.8,w:.7,warn:.6,life:4,dmg:2,once:false,tick:.5,col:'#3a8a3a'});yield 5.2}
  }
};
// 3 마그마 골렘
BAI.m3=function*(e){
  for(;;){
    e.mode='chase';e.sp=.6;yield 1.5;e.mode='stop';
    const n=e.ph>=1?2:1;
    for(let i=0;i<n;i++){e.wn=1;sfx('warn');zone({x:e.x,y:e.y,sh:'ring',sp:10,th:.7,max:4,warn:1,life:2,dmg:2,once:true,col:'#ff6a2a'});yield 1.5;shake(.5);sfx('boom')}
    if(e.ph>=2){for(let i=0;i<12;i++)sh(e,i*TAU/12,4.5,2,{col:'#ff7a2a',r:.18})}
    else{const a=aimA(e);for(let i=-2;i<=2;i++)sh(e,a+i*.22,5,2,{col:'#ff7a2a',r:.18})}
    e.vuln=1.3;e.chest=true;yield 1.2;e.vuln=1;e.chest=false;
  }
};
// 4 역병의 왕
BAI.m4=function*(e){
  for(;;){
    e.mode='chase';e.sp=.9;
    const n=e.ph>=1?3:2;
    for(let i=0;i<n;i++){const m=spawnMini(MX.rat,e.x+rnd(-1.2,1.2),e.y+rnd(-.5,1.5));m.owner=e}
    yield 1;
    for(let i=0;i<3;i++){sh(e,aimA(e),5,1,{col:'#8ab03a',fx:{erode:2}});yield .3}
    if(e.ph>=2){yield 1;const a=aimA(e);e.mode='stop';tele0(e.x,e.y,a,1,.7);yield .7;e.mode='vec';e.vx=Math.cos(a)*6;e.vy=Math.sin(a)*6;e.wallHit=false;e.contact=scd(2);let t=0;while(!e.wallHit&&t<2){t+=.03;yield .03}e.contact=0;e.mode='stop';yield 1}
    else yield 3;
  }
};
// 5 환영 사제
BAI.m5=function*(e){
  e.real=true;e.mode='stop';
  const n=e.ph>=1?4:2,dec=[];
  for(let i=0;i<n;i++){const m=spawnMini(MX.decoy,e.x+(i-n/2)*1.2,e.y+1,{decoy:true,noClear:true,noDrop:true});m.owner=e;m.hue=['#6ac8d8','#d86a8a','#8ad86a','#d8a86a'][i];m.spawn=0;dec.push(m)}
  e.die=e=>dec.forEach(c=>{c.dead=true;const k=G.en.indexOf(c);if(k>=0)G.en.splice(k,1)});
  let t=0;
  for(;;){
    yield 4;
    const all=[e,...dec.filter(c=>!c.dead)],pos=all.map(o=>({x:o.x,y:o.y})).sort(()=>Math.random()-.5);
    all.forEach((o,i)=>{fxP(o.x,o.y,'#fd8',8,3,.5);o.x=pos[i].x;o.y=pos[i].y;o.afterimg=.8});
    sfx('tele');
    for(let i=0;i<3;i++){const a=aimA(e);sh(e,a,5,2,{col:'#d6b060'});if(e.ph>=2)dec.forEach(c=>{if(!c.dead)sh(c,aimA(c),5,2,{col:'#d6b060'})});yield .35}
  }
};
// 6 어둠의 기사
BAI.m6=function*(e){
  e.face=0;e.wk=o=>{if(o.bvx===undefined)return 1;const l=Math.hypot(o.bvx,o.bvy)||1;return (o.bvx*Math.cos(e.face)+o.bvy*Math.sin(e.face))/l>.5?1.5:1};
  if(e.ph>=2)zone({x:e.x,y:e.y,r:2.5,warn:.3,life:1,inf:true,dmg:0,own:e,follow:true,aura:true,col:'#5a4a9a66',keep:true});
  for(;;){
    e.mode='strafe';e.pd=3.5;e.dir=Math.random()<.5?1:-1;
    for(let i=0;i<3;i++){turnFace(e,2.2,.25);yield .25}
    const n=e.ph>=1?5:3,a=aimA(e);
    for(let i=0;i<n;i++)sh(e,a+(i-(n-1)/2)*.28,8,2,{r:.4,col:'#9a8aff',life:3});
    sfx('beam');
    if(e.ph<2){zone({x:e.x,y:e.y,r:2.5,warn:.3,life:3,dmg:0,own:e,follow:true,aura:true,col:'#5a4a9a66'})}
    for(let i=0;i<8;i++){turnFace(e,1.2,.4);yield .4}
    // 돌진: 정면을 고정한 채 플레이어를 지나침
    if(Math.random()<.6){const b=aimA(e);e.mode='vec';e.vx=Math.cos(b)*5;e.vy=Math.sin(b)*5;e.face=b;e.contact=scd(1);yield .9;e.contact=0;e.mode='stop';yield .6}
  }
};
// 7 태엽 구체
BAI.m7=function*(e){
  e.wk=o=>Math.hypot((o.x??e.x)-e.x,(o.y??e.y)-e.y)<.35?1.3:1;
  const spd=3*(e.ph>=1?1.3:1),a=rnd(0,TAU);e.mode='bounce';e.vx=Math.cos(a)*spd;e.vy=Math.sin(a)*spd;
  for(;;){
    yield 3;
    const o=e.ph>=2?rnd(0,TAU):0,k=e.ph>=2?3:2;
    sfx('warn');
    for(let i=0;i<(e.ph>=2?6:4);i++){
      if(e.ph<2&&i>=4)break;
      const ang=e.ph>=2?o+i*Math.PI/3:i*Math.PI/2;
      beam({x:e.x,y:e.y,a:ang,w:.5,warn:1,life:.4,dmg:2,col:'#ffd04a'})
    }
    yield 1.5;
  }
};
// 8 붉은 지네
BAI.m8=function*(e){
  e.contact=0;
  for(;;){
    e.intang=true;e.hidden=true;e.vuln=1;e.mode='stop';
    const sp=[{x:P.x,y:P.y}];if(e.ph>=1){const f=freeSpot(0,1);sp.push(f)}
    sp.forEach(s=>zone({x:s.x,y:s.y,r:1.2,warn:1,life:.2,dmg:2,once:true,col:'#b02a1a'}));
    yield 1;
    e.x=sp[0].x;e.y=sp[0].y;e.intang=false;e.hidden=false;e.vuln=1.5;shake(.3);sfx('boom');
    if(e.ph>=2)for(let i=0;i<6;i++)sh(e,i*TAU/6,5,2,{col:'#d04a2a'});
    yield 1;
    e.intang=true;e.hidden=true;e.vuln=1;yield .8;
  }
};
// 9 영혼 수확자
BAI.m9=function*(e){
  e.mode='stop';
  for(;;){
    if(!e.ill)G.darkR=e.ph>=1?4:7;
    const n=e.ph>=2?3:1;
    for(let i=0;i<n;i++){
      const s={x:P.x,y:P.y};zone({x:s.x,y:s.y,r:1.2,warn:.5,life:.2,dmg:2,once:true,col:'#6a8aff'});sfx('tele');
      yield .5;fxP(e.x,e.y,'#6a8aff',10,3,.4);e.x=s.x;e.y=s.y-.8;fxP(e.x,e.y,'#6a8aff',10,3,.4);e.vuln=1;yield .25;
    }
    yield 1.6;
  }
};
// 10 서리 거인
BAI.m10=function*(e){
  if(!e.ill)G.ice=true;
  e.mode='chase';e.sp=.6;
  for(;;){
    e.mode='chase';yield 1.3;e.mode='stop';
    const n=e.ph>=1?3:1;
    for(let i=0;i<n;i++){const p=i?{x:clamp(P.x+rnd(-2,2),1,RW-1),y:clamp(P.y+rnd(-2,2),1,RH-1)}:{x:P.x,y:P.y};zone({x:p.x,y:p.y,r:1,warn:.7,life:.2,dmg:2,once:true,col:'#9fe0f5'})}
    if(e.ph>=2)for(let i=0;i<4;i++){const p=freeSpot(0,.5);zone({x:p.x,y:p.y,r:1,warn:.9,life:.2,dmg:2,once:true,col:'#9fe0f5'})}
    yield 1.0;sfx('boom');e.vuln=1.5;yield 1.5;e.vuln=1;
  }
};
// 세라핌
BAI.sera=function*(e){
  e.fixed=true;e.x=4.5;e.y=3;
  e.wk=o=>Math.hypot((o.x??e.x)-e.x,(o.y??e.y)-e.y)<.4?1.5:1;
  for(;;){
    const sg=Math.random()<.5?1:-1,rot=[.52,.65,.785][e.ph]*sg,o=rnd(0,TAU);
    sfx('warn');
    for(let k=0;k<4;k++)beam({x:e.x,y:e.y,a:o+k*Math.PI/2,rot,w:.8,warn:1,life:6,dmg:2,once:false,tick:.5,col:'#ffe28a'});
    if(e.ph>=1){yield 2.5;for(let i=0;i<24;i++)sh(e,i*TAU/24,4,2,{hom:1.047,life:3,col:'#ffffff',r:.16})}
    if(e.ph>=2){yield 1.5;const p={x:P.x,y:P.y};
      beam({x:p.x,y:p.y,a:0,w:1,len:12,warn:1.2,life:.3,dmg:3,col:'#fff2a0',once:true,cross:1});
      beam({x:p.x,y:p.y,a:Math.PI,w:1,len:12,warn:1.2,life:.3,dmg:3,col:'#fff2a0',once:true});
      beam({x:p.x,y:p.y,a:Math.PI/2,w:1,len:14,warn:1.2,life:.3,dmg:3,col:'#fff2a0',once:true});
      beam({x:p.x,y:p.y,a:-Math.PI/2,w:1,len:14,warn:1.2,life:.3,dmg:3,col:'#fff2a0',once:true})}
    yield 4.5;
  }
};
// 벨리알
BAI.belial=function*(e){
  e.y=3;e.mode='bounce';const s=e.ph>=0?2:2;e.vx=s;e.vy=0;
  e.wk=o=>(e.horn&&0)||1;
  for(;;){
    yield 2;
    // 지옥의 화염
    const sf=freeSpot(0,1.5);sf.x=clamp(sf.x,2,RW-2);sf.y=clamp(sf.y,4,RH-2);
    sfx('warn');zone({x:sf.x,y:sf.y,r:1.5,warn:0,life:5.5,dmg:0,safe:true,col:'#4aff8a55'});
    zone({x:sf.x,y:sf.y,sh:'void',r:1.5,warn:1.5,life:4,dmg:1,tick:.5,col:'#ff3a1a',own:null});
    e.needSafe=true;yield 5.5;e.needSafe=false;
    if(e.ph>=1){ // 잔혹한 사슬
      e.wn=.7;tele0(e.x,e.y,aimA(e),.3,.7);yield .7;
      if(!e.dead){const a=Math.atan2(e.y-P.y,e.x-P.x),d=Math.min(3,Math.hypot(e.x-P.x,e.y-P.y)-1);P.kbT=.2;P.kbx=Math.cos(a)*d/.2;P.kby=Math.sin(a)*d/.2;hurtP(scd(1),null)}
      yield 1;
    }
    if(e.ph>=2){e.wn=5;for(let i=0;i<50;i++){sh(e,rnd(0,TAU),5,1,{col:'#ff4a3a',r:.14});yield .1}}
    yield 1.5;
  }
};
// 종말의 공허
BAI.void=function*(e){
  e.fixed=true;e.x=4.5;e.y=3.2;
  if(e.ph>=2&&!G.voidShr){G.voidShr=true;zone({x:4.5,y:6.5,sh:'void',r:6,warn:0,life:1,inf:true,shr:[6,3.5,20],dmg:1,tick:.5,col:'#6a1ab0',keep:true})}
  let t=0;
  for(;;){
    const nh=e.ph>=1?2:1;
    for(let i=0;i<nh;i++){const p=i?{x:rnd(2,7),y:rnd(5,11)}:{x:4.5,y:7};zone({x:p.x,y:p.y,r:5,warn:.8,life:5,dmg:0,pull:2.5,core:1.2,col:'#20083a66'})}
    yield 1;
    const nr=e.ph>=1?3:1;
    for(let i=0;i<nr;i++){const p=freeSpot(0,.5);const o=rnd(0,TAU);
      for(let k=0;k<2;k++)beam({x:p.x,y:p.y,a:o+k*Math.PI,rot:.9,w:.5,warn:1,life:4,dmg:2,once:false,tick:.5,col:'#c06aff'})}
    yield 5;
    // 분열: 핵 노출
    e.vuln=1.5;e.core=true;yield 3;e.vuln=1;e.core=false;
    yield 4;
  }
};
// 원초의 창조주
BAI.creator=function*(e){
  e.fixed=true;e.x=4.5;e.y=3.2;let n=0;
  const quads=[[0,0],[4.5,0],[0,6.5],[4.5,6.5]];
  for(;;){
    const gaps=[1.2,.9,.6][e.ph];let ord=[0,1,2,3];
    if(e.ph>=1)ord.sort(()=>Math.random()-.5);
    sfx('warn');
    for(const q of ord){const [x,y]=quads[q];zone({sh:'rect',x,y,w:4.5,h:6.5,warn:1,life:.4,dmg:3,once:true,col:'#fff2c0'});yield gaps}
    yield 1;
    e.open=true;e.vuln=1.5;yield 1;e.open=false;e.vuln=1;
    if(e.ph>=1&&!e.ill){
      const have=G.en.filter(x=>x.ill).length,want=e.ph>=2?3:2;
      for(let i=have;i<want;i++){const mi=ri(0,9),d=Object.assign({key:'m'+(mi+1)},MID[mi]);
        const m=mkE(d,rnd(1.5,7.5),rnd(5,10),{hpMul:.2,ill:true,noClear:true,lockPh:true,ttl:60,noDrop:true});m.owner=e;m.spawn=0;m.bossBar=false;fxRing(m.x,m.y,1,'#fff',.5)}
      yield 1;
    }
    yield 2;
  }
};

// ===== RENDER (모두 벡터 경로, 곡선은 적응형 분할) =====
const px=x=>RX+x*T,py=y=>RY+y*T;
function circ(x,y,r){cx.beginPath();cx.arc(x,y,Math.max(r,.1),0,TAU)}
function rr(x,y,w,h,r){cx.beginPath();cx.moveTo(x+r,y);cx.arcTo(x+w,y,x+w,y+h,r);cx.arcTo(x+w,y+h,x,y+h,r);cx.arcTo(x,y+h,x,y,r);cx.arcTo(x,y,x+w,y,r);cx.closePath()}
function blobPath(x,y,r,n,wob,ph){ // 적응형 분할로 부드러운 윤곽
  const seg=segFor(r),pts=[];
  cx.beginPath();
  for(let i=0;i<=seg;i++){const a=i/seg*TAU,k=1+wob*(Math.sin(a*n+ph)*.6+Math.sin(a*(n+2)-ph*1.3)*.4);const X=x+Math.cos(a)*r*k,Y=y+Math.sin(a)*r*k;i?cx.lineTo(X,Y):cx.moveTo(X,Y)}
  cx.closePath();
}
function hash(a,b){const s=Math.sin(a*127.1+b*311.7)*43758.5453;return s-Math.floor(s)}
function eyes(x,y,r,tx,ty,col='#fff',pup='#111',sp=.38,sz=.2){
  const a=Math.atan2(ty-y,tx-x);
  for(const s of[-1,1]){const ex=x+s*r*sp,ey=y-r*.12;circ(ex,ey,r*sz);cx.fillStyle=col;cx.fill();circ(ex+Math.cos(a)*r*sz*.4,ey+Math.sin(a)*r*sz*.4,r*sz*.5);cx.fillStyle=pup;cx.fill()}
}
const PAL=()=>FLOORS[G.floor-1].pal;
function drawRoom(ro,ox,oy){
  const p=PAL(),w=RW*T,h=RH*T;
  cx.save();cx.translate(ox,oy);
  // 벽
  rr(RX-T,RY-T,w+2*T,h+2*T,T*.55);cx.fillStyle=p[1];cx.fill();
  cx.lineWidth=2;cx.strokeStyle=p[2]+'66';cx.stroke();
  // 벽 장식(돌 이음)
  cx.strokeStyle=p[2]+'33';cx.lineWidth=1;
  for(let i=0;i<RW+2;i++){for(const yy of[RY-T*.5,RY+h+T*.5]){cx.beginPath();cx.moveTo(RX-T+i*T,yy-T*.5);cx.lineTo(RX-T+i*T,yy+T*.5);cx.stroke()}}
  for(let i=0;i<RH+2;i++){for(const xx of[RX-T*.5,RX+w+T*.5]){cx.beginPath();cx.moveTo(xx-T*.5,RY-T+i*T);cx.lineTo(xx+T*.5,RY-T+i*T);cx.stroke()}}
  // 바닥
  rr(RX,RY,w,h,T*.25);
  const g=cx.createRadialGradient(RX+w/2,RY+h/2,T,RX+w/2,RY+h/2,h*.75);g.addColorStop(0,shade(p[0],.18));g.addColorStop(1,shade(p[0],-.2));
  cx.fillStyle=g;cx.fill();
  cx.save();cx.clip();
  const sd=(ro.gx*7+ro.gy*13)|0;
  for(let i=0;i<18;i++){const bx=RX+hash(i,sd)*w,by=RY+hash(i+50,sd)*h,br=T*(.4+hash(i+9,sd)*.9);blobPath(bx,by,br,3,.25,i);cx.fillStyle=hash(i+3,sd)>.5?'#ffffff06':'#0000000c';cx.fill()}
  cx.strokeStyle='#ffffff0a';cx.lineWidth=1;
  for(let i=1;i<RW;i++){cx.beginPath();cx.moveTo(RX+i*T,RY);cx.lineTo(RX+i*T,RY+h);cx.stroke()}
  for(let i=1;i<RH;i++){cx.beginPath();cx.moveTo(RX,RY+i*T);cx.lineTo(RX+w,RY+i*T);cx.stroke()}
  if(G.ice&&ro===R){cx.fillStyle='#9fe0f522';cx.fillRect(RX,RY,w,h);cx.strokeStyle='#ffffff40';for(let i=0;i<10;i++){cx.beginPath();const bx=RX+hash(i,1)*w,by=RY+hash(i,2)*h;cx.moveTo(bx,by);cx.lineTo(bx+T*(hash(i,3)-.5)*2,by+T*(hash(i,4)-.5)*2);cx.stroke()}}
  cx.restore();
  // 장애물
  for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){const v=ro.g[y][x];if(!v)continue;
    const X=RX+(x+.5)*T,Y=RY+(y+.5)*T;
    if(v===1){blobPath(X,Y+T*.05,T*.52,4,.12,hash(x,y)*6);cx.fillStyle='#00000055';cx.fill();
      blobPath(X,Y-T*.03,T*.5,4,.12,hash(x,y)*6);const gg=cx.createRadialGradient(X-T*.15,Y-T*.2,T*.05,X,Y,T*.55);gg.addColorStop(0,shade(p[2],.1));gg.addColorStop(1,shade(p[2],-.55));cx.fillStyle=gg;cx.fill();cx.strokeStyle='#00000066';cx.lineWidth=1.5;cx.stroke()}
    else{rr(RX+x*T+T*.06,RY+y*T+T*.06,T*.88,T*.88,T*.3);const gg=cx.createRadialGradient(X,Y,T*.1,X,Y,T*.5);gg.addColorStop(0,'#000');gg.addColorStop(1,shade(p[1],-.2));cx.fillStyle=gg;cx.fill();cx.strokeStyle=p[2]+'55';cx.lineWidth=1.5;cx.stroke()}
  }
  // 문
  for(const d of DIRS){const nb=ro.d[d[0]];if(!nb)continue;
    const open=ro===R?R.open:ro.cleared,hor=d[0]==='N'||d[0]==='S';
    const X=hor?RX+4.5*T:(d[0]==='W'?RX-T*.5:RX+w+T*.5),Y=hor?(d[0]==='N'?RY-T*.5:RY+h+T*.5):RY+6.5*T;
    const col={boss:'#d03a30',treasure:'#e0b050',shop:'#5ad07a',angel:'#fff2b0',devil:'#c01a3a'}[nb.type]||p[3];
    cx.save();cx.translate(X,Y);if(!hor)cx.rotate(Math.PI/2);if(d[0]==='S'||d[0]==='W')cx.rotate(Math.PI);
    rr(-T*.52,-T*.5,T*1.04,T,T*.18);cx.fillStyle=open?'#05030a':'#3a2a1a';cx.fill();cx.strokeStyle=col;cx.lineWidth=2.5;cx.stroke();
    if(!open){cx.strokeStyle='#1a1008';cx.lineWidth=2;for(let i=-1;i<=1;i++){cx.beginPath();cx.moveTo(i*T*.28,-T*.45);cx.lineTo(i*T*.28,T*.45);cx.stroke()}}
    else{const gg=cx.createRadialGradient(0,0,0,0,0,T*.6);gg.addColorStop(0,col+'88');gg.addColorStop(1,col+'00');cx.fillStyle=gg;cx.fillRect(-T*.6,-T*.6,T*1.2,T*1.2)}
    cx.restore();
  }
  cx.restore();
}
function shade(hex,k){ // hex #rrggbb → lighten/darken
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  const f=k<0?0:255,a=Math.abs(k);r=Math.round(r+(f-r)*a);g=Math.round(g+(f-g)*a);b=Math.round(b+(f-b)*a);
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function shadow(x,y,r){cx.beginPath();cx.ellipse(x,y+r*.85,r*.9,r*.35,0,0,TAU);cx.fillStyle='#00000055';cx.fill()}
// ---- 몬스터 ----
function drawEnemy(e){
  const x=px(e.x),y=py(e.y),r=e.r*T,d=e.d;
  if(e.hidden){ // 땅속: 그림자만
    cx.beginPath();cx.ellipse(x,y,r*1.1,r*.5,0,0,TAU);cx.fillStyle='#00000066';cx.fill();return}
  cx.save();
  let al=1;if(e.spawn>0&&!e.boss)al=.35+.4*Math.sin(e.age*20);
  if(e.alpha!==undefined)al*=e.alpha;
  cx.globalAlpha=al;
  if(!e.fly&&!e.ghost)shadow(x,y,r);
  const fl=e.flash>0,base=fl?'#ffffff':(e.d.c||'#888');
  if(e.wn>0){circ(x,y,r*1.5+Math.sin(G.time*30)*2);cx.strokeStyle='#ff4a3a';cx.lineWidth=2.5;cx.stroke()}
  const tx=px(P.x),ty=py(P.y);
  if(e.boss&&BDRAW[e.d.key]){BDRAW[e.d.key](e,x,y,r,base,tx,ty)}
  else if(e.decoy){drawMage(x,y,r,e.hue||'#c8a050',tx,ty,e)}
  else if(e.d.sh==='rock'&&e.immune){blobPath(x,y,r*1.05,4,.12,3);cx.fillStyle='#8a847a';cx.fill();cx.strokeStyle='#00000066';cx.lineWidth=1.5;cx.stroke()}
  else (SHP[e.d.sh]||SHP.blob)(e,x,y,r,base,tx,ty);
  if(e.shield){const f=e.face;cx.beginPath();cx.arc(x,y,r*1.3,f-Math.PI/3,f+Math.PI/3);cx.strokeStyle=e.shield==='reflect'?'#9fe8ff':'#b8c0cc';cx.lineWidth=Math.max(3,r*.22);cx.lineCap='round';cx.stroke()}
  if(e.fuse){circ(x,y,r*(1.1+.2*Math.sin(G.time*30)));cx.fillStyle='#ff2a1a55';cx.fill()}
  if(e.pz){circ(x,y-r*1.2,r*.18);cx.fillStyle='#7ad03a';cx.fill()}
  if(e.stun>0){for(let i=0;i<3;i++){const a=G.time*5+i*2.1;circ(x+Math.cos(a)*r*.8,y-r*1.1+Math.sin(a)*r*.2,r*.1);cx.fillStyle='#ffe040';cx.fill()}}
  cx.restore();
  // HP 바(일반 몬스터, 피해 입은 경우)
  if(!e.boss&&!e.decoy&&e.hp<e.mhp&&!e.immune){const w=r*1.6;cx.fillStyle='#000a';cx.fillRect(x-w/2,y-r*1.45,w,3);cx.fillStyle='#d44';cx.fillRect(x-w/2,y-r*1.45,w*clamp(e.hp/e.mhp,0,1),3)}
}
function drawMage(x,y,r,c,tx,ty,e){
  cx.beginPath();cx.moveTo(x,y-r*1.2);cx.quadraticCurveTo(x+r*1.1,y+r*.2,x+r*.9,y+r);cx.lineTo(x-r*.9,y+r);cx.quadraticCurveTo(x-r*1.1,y+r*.2,x,y-r*1.2);cx.fillStyle=c;cx.fill();
  circ(x,y-r*.35,r*.5);cx.fillStyle=shade(c,.35);cx.fill();eyes(x,y-r*.35,r*.9,tx,ty,'#fff','#222',.3,.18);
  circ(x+r*.95,y+r*.1+Math.sin(G.time*4)*r*.1,r*.22);cx.fillStyle='#ffffffcc';cx.fill();
}
const SHP={
 blob(e,x,y,r,c,tx,ty){blobPath(x,y,r,3,.06,e.age*3);cx.fillStyle=c;cx.fill();cx.strokeStyle='#00000066';cx.lineWidth=1.5;cx.stroke();eyes(x,y,r,tx,ty);
   cx.beginPath();cx.arc(x,y+r*.35,r*.3,.1,Math.PI-.1);cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke()},
 skull(e,x,y,r,c,tx,ty){blobPath(x,y-r*.1,r*.9,2,.03,0);cx.fillStyle=c;cx.fill();rr(x-r*.5,y+r*.4,r,r*.55,r*.15);cx.fill();
   for(const s of[-1,1]){circ(x+s*r*.35,y-r*.1,r*.24);cx.fillStyle='#111';cx.fill()}
   for(let i=-1;i<=1;i++){cx.beginPath();cx.moveTo(x+i*r*.25,y+r*.45);cx.lineTo(x+i*r*.25,y+r*.9);cx.strokeStyle='#0008';cx.lineWidth=1;cx.stroke()}},
 bug(e,x,y,r,c,tx,ty){const a=Math.atan2(ty-y,tx-x);cx.save();cx.translate(x,y);cx.rotate(a);
   cx.strokeStyle='#000a';cx.lineWidth=Math.max(1.5,r*.12);for(let i=-1;i<=1;i++)for(const s of[-1,1]){cx.beginPath();cx.moveTo(i*r*.4,0);cx.lineTo(i*r*.5+s*0,s*r*1.1+Math.sin(e.age*12+i)*r*.2);cx.stroke()}
   cx.beginPath();cx.ellipse(-r*.15,0,r*.95,r*.7,0,0,TAU);cx.fillStyle=c;cx.fill();cx.beginPath();cx.ellipse(r*.65,0,r*.45,r*.4,0,0,TAU);cx.fill();
   cx.strokeStyle='#0006';cx.beginPath();cx.moveTo(-r*.2,-r*.65);cx.lineTo(-r*.2,r*.65);cx.moveTo(-r*.55,-r*.55);cx.lineTo(-r*.55,r*.55);cx.stroke();
   circ(r*.85,-r*.15,r*.1);cx.fillStyle='#f33';cx.fill();circ(r*.85,r*.15,r*.1);cx.fill();cx.restore()},
 slime(e,x,y,r,c,tx,ty){const q=1+.07*Math.sin(e.age*5);cx.beginPath();const seg=segFor(r);for(let i=0;i<=seg;i++){const a=i/seg*TAU;let X=Math.cos(a)*r*q,Y=Math.sin(a)*r/q;if(Y>0)Y*=.55;i?cx.lineTo(x+X,y+Y+r*.2):cx.moveTo(x+X,y+Y+r*.2)}cx.closePath();cx.fillStyle=c;cx.fill();cx.strokeStyle='#00000055';cx.lineWidth=1.5;cx.stroke();
   circ(x-r*.3,y-r*.3,r*.18);cx.fillStyle='#ffffff55';cx.fill();eyes(x,y,r*.9,tx,ty,'#fff','#111',.35,.18)},
 armor(e,x,y,r,c,tx,ty){rr(x-r,y-r*.8,r*2,r*1.8,r*.35);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.8;cx.stroke();
   rr(x-r*.55,y-r*1.1,r*1.1,r*.7,r*.3);cx.fillStyle=shade(c,.15);cx.fill();cx.stroke();rr(x-r*.4,y-r*.85,r*.8,r*.14,r*.05);cx.fillStyle='#f33';cx.fill();
   circ(x-r*1.05,y-r*.3,r*.3);cx.fillStyle=shade(c,-.1);cx.fill();circ(x+r*1.05,y-r*.3,r*.3);cx.fill()},
 dog(e,x,y,r,c,tx,ty){const a=Math.atan2(ty-y,tx-x);cx.save();cx.translate(x,y);cx.rotate(a);cx.beginPath();cx.ellipse(0,0,r*1.15,r*.7,0,0,TAU);cx.fillStyle=c;cx.fill();
   cx.beginPath();cx.moveTo(r*.7,-r*.5);cx.lineTo(r*.9,-r*1.05);cx.lineTo(r*.45,-r*.65);cx.moveTo(r*.7,r*.5);cx.lineTo(r*.9,r*1.05);cx.lineTo(r*.45,r*.65);cx.fill();
   circ(r*.75,-r*.2,r*.12);cx.fillStyle='#f22';cx.fill();circ(r*.75,r*.2,r*.12);cx.fill();cx.restore()},
 spike(e,x,y,r,c,tx,ty){const n=12;cx.save();cx.translate(x,y);cx.rotate(e.age*2);cx.beginPath();for(let i=0;i<n*2;i++){const a=i/(n*2)*TAU,k=i%2?.78:1.15;cx.lineTo(Math.cos(a)*r*k,Math.sin(a)*r*k)}cx.closePath();cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke();cx.restore();
   circ(x,y,r*.5);cx.fillStyle=shade(c,-.35);cx.fill();eyes(x,y,r*.8,tx,ty,'#fe8','#400',.3,.16)},
 shield(e,x,y,r,c,tx,ty){SHP.skull(e,x,y,r,c,tx,ty)},
 eye(e,x,y,r,c,tx,ty){circ(x,y,r);cx.fillStyle='#f4f0e8';cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke();const a=Math.atan2(ty-y,tx-x);
   circ(x+Math.cos(a)*r*.35,y+Math.sin(a)*r*.35,r*.5);cx.fillStyle=c;cx.fill();circ(x+Math.cos(a)*r*.45,y+Math.sin(a)*r*.45,r*.22);cx.fillStyle='#000';cx.fill();
   cx.strokeStyle=shade(c,-.4);cx.lineWidth=1.5;for(let i=0;i<7;i++){const b=-Math.PI*.9+i*.25*Math.PI/1.4;cx.beginPath();cx.moveTo(x+Math.cos(b)*r,y+Math.sin(b)*r);cx.lineTo(x+Math.cos(b)*r*1.3,y+Math.sin(b)*r*1.3);cx.stroke()}},
 mage(e,x,y,r,c,tx,ty){drawMage(x,y,r,c,tx,ty,e)},
 turret(e,x,y,r,c,tx,ty){rr(x-r,y-r,r*2,r*2,r*.3);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=2;cx.stroke();
   cx.fillStyle=shade(c,-.4);for(let i=0;i<4;i++){const a=i*Math.PI/2+(e.d.id===20&&0);cx.save();cx.translate(x,y);cx.rotate(a);rr(r*.55,-r*.18,r*.6,r*.36,r*.1);cx.fill();cx.restore()}
   circ(x,y,r*.4);cx.fillStyle=shade(c,.2);cx.fill();eyes(x,y,r*.6,tx,ty,'#fe8','#400',.3,.2)},
 bat(e,x,y,r,c,tx,ty){const f=Math.sin(e.age*14)*.5;cx.fillStyle=shade(c,-.25);
   for(const s of[-1,1]){cx.beginPath();cx.moveTo(x+s*r*.3,y);cx.quadraticCurveTo(x+s*r*1.4,y-r*(1+f),x+s*r*1.7,y+r*.1);cx.quadraticCurveTo(x+s*r*1.1,y+r*.2,x+s*r*.9,y+r*.6);cx.quadraticCurveTo(x+s*r*.6,y+r*.3,x+s*r*.3,y+r*.5);cx.fill()}
   circ(x,y,r*.7);cx.fillStyle=c;cx.fill();eyes(x,y,r*.9,tx,ty,'#fe8','#400',.3,.16)},
 mush(e,x,y,r,c,tx,ty){rr(x-r*.3,y,r*.6,r*.9,r*.2);cx.fillStyle='#d8d0b0';cx.fill();cx.beginPath();cx.ellipse(x,y,r*1.1,r*.8,0,Math.PI,TAU);cx.closePath();cx.fillStyle=c;cx.fill();cx.strokeStyle='#0006';cx.lineWidth=1.5;cx.stroke();
   for(const [a,b] of[[-.5,-.3],[.3,-.5],[.6,-.1]]){circ(x+a*r,y+b*r,r*.14);cx.fillStyle='#fff8';cx.fill()}},
 tree(e,x,y,r,c,tx,ty){rr(x-r*.35,y-r*.2,r*.7,r*1.2,r*.15);cx.fillStyle='#4a3622';cx.fill();blobPath(x,y-r*.5,r*1.1,5,.15,1);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke();
   eyes(x,y-r*.35,r*.9,tx,ty,'#f64','#200',.3,.16)},
 ghost(e,x,y,r,c,tx,ty){cx.beginPath();cx.moveTo(x-r,y+r*.9);cx.lineTo(x-r,y);cx.arc(x,y,r,Math.PI,0);cx.lineTo(x+r,y+r*.9);const w=4;for(let i=w;i>=0;i--){const X=x-r+i*(2*r/w);cx.quadraticCurveTo(X+r/w*.5,y+r*(.9+(i%2?.3:-.1)+Math.sin(e.age*6+i)*.1),X,y+r*.9)}cx.closePath();cx.fillStyle=c;cx.fill();eyes(x,y,r,tx,ty,'#fff','#112',.38,.2)},
 swirl(e,x,y,r,c,tx,ty){cx.save();cx.translate(x,y);cx.rotate(e.age*3);cx.strokeStyle=c;cx.lineWidth=Math.max(2,r*.18);cx.lineCap='round';for(let k=0;k<3;k++){cx.beginPath();for(let i=0;i<40;i++){const t=i/40,a=t*Math.PI*2.4+k*2.09,rd=t*r*1.3;i?cx.lineTo(Math.cos(a)*rd,Math.sin(a)*rd):cx.moveTo(0,0)}cx.stroke()}cx.restore()},
 egg(e,x,y,r,c,tx,ty){cx.beginPath();cx.ellipse(x,y,r*.85,r,0,0,TAU);cx.fillStyle=c;cx.fill();cx.strokeStyle='#4a3a2a';cx.lineWidth=2;cx.stroke();cx.beginPath();cx.moveTo(x-r*.5,y);cx.lineTo(x-r*.15,y-r*.2);cx.lineTo(x+r*.15,y+r*.15);cx.lineTo(x+r*.5,y-r*.1);cx.stroke()},
 rock(e,x,y,r,c,tx,ty){blobPath(x,y,r*1.05,4,.12,3);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke();eyes(x,y,r,tx,ty,'#f64','#200',.3,.16)},
 bomb(e,x,y,r,c,tx,ty){circ(x,y,r);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000';cx.lineWidth=2;cx.stroke();cx.beginPath();cx.moveTo(x,y-r);cx.quadraticCurveTo(x+r*.4,y-r*1.5,x+r*.7,y-r*1.3);cx.strokeStyle='#a86';cx.stroke();circ(x+r*.7,y-r*1.3,r*.15+Math.abs(Math.sin(G.time*12))*r*.1);cx.fillStyle='#fa3';cx.fill();eyes(x,y,r,tx,ty,'#fff','#c00')},
};
// ---- 보스 ----
const BDRAW={
 m1(e,x,y,r,c,tx,ty){circ(x,y,r);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=2.5;cx.stroke();
   for(const s of[-1,1]){cx.beginPath();cx.moveTo(x+s*r*.5,y-r*.7);cx.quadraticCurveTo(x+s*r*1.5,y-r*.8,x+s*r*1.3,y-r*1.5);cx.quadraticCurveTo(x+s*r*1.1,y-r*.95,x+s*r*.3,y-r*.95);cx.fillStyle='#e8e0c8';cx.fill()}
   eyes(x,y,r,tx,ty,'#fe8','#400',.4,.2);circ(x,y+r*.4,r*.18);cx.fillStyle='#111';cx.fill();circ(x-r*.15,y+r*.4,r*.04);circ(x+r*.15,y+r*.4,r*.04);cx.fillStyle='#e8c';cx.fill()},
 m2(e,x,y,r,c,tx,ty){for(let i=0;i<8;i++){const a=i/8*TAU+e.age*.4;cx.save();cx.translate(x,y);cx.rotate(a);cx.beginPath();cx.ellipse(r*.85,0,r*.6,r*.3,0,0,TAU);cx.fillStyle=i%2?c:shade(c,.15);cx.fill();cx.restore()}
   circ(x,y,r*.55);cx.fillStyle='#d8d03a';cx.fill();cx.strokeStyle='#000a';cx.lineWidth=2;cx.stroke();circ(x,y,r*.28);cx.fillStyle=e.flash>0?'#fff':'#a01a3a';cx.fill();eyes(x,y-r*.02,r*.75,tx,ty,'#fff','#000',.3,.15)},
 m3(e,x,y,r,c,tx,ty){rr(x-r,y-r*.8,r*2,r*1.8,r*.3);cx.fillStyle=e.flash>0?'#fff':'#3a2a26';cx.fill();cx.strokeStyle='#000a';cx.lineWidth=2.5;cx.stroke();
   for(const s of[-1,1]){circ(x+s*r*1.1,y-r*.2,r*.45);cx.fillStyle='#4a3630';cx.fill()}
   circ(x,y+r*.1,r*(e.chest?.7:.45));const g=cx.createRadialGradient(x,y,0,x,y,r*.7);g.addColorStop(0,'#ffe080');g.addColorStop(1,'#ff4a1a');cx.fillStyle=g;cx.fill();rr(x-r*.5,y-r*.95,r,r*.45,r*.15);cx.fillStyle='#2a1a16';cx.fill();eyes(x,y-r*.72,r*.8,tx,ty,'#ffa030','#f00',.3,.12)},
 m4(e,x,y,r,c,tx,ty){const a=Math.atan2(ty-y,tx-x);cx.save();cx.translate(x,y);cx.rotate(a);cx.beginPath();cx.ellipse(0,0,r*1.2,r*.95,0,0,TAU);cx.fillStyle=c;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=2.5;cx.stroke();
   circ(r*.7,-r*.7,r*.35);cx.fillStyle=shade(c,.2);cx.fill();circ(r*.7,r*.7,r*.35);cx.fill();cx.beginPath();cx.moveTo(-r*1.1,0);cx.quadraticCurveTo(-r*2,r*.5,-r*2.2,-r*.4);cx.strokeStyle='#d8a0a0';cx.lineWidth=r*.12;cx.stroke();
   circ(r*.95,-r*.25,r*.14);cx.fillStyle='#f33';cx.fill();circ(r*.95,r*.25,r*.14);cx.fill();for(const s of[-1,1]){cx.beginPath();cx.moveTo(r*1.1,s*r*.1);cx.lineTo(r*1.45,s*r*.35);cx.strokeStyle='#eee';cx.lineWidth=2;cx.stroke()}cx.restore()},
 m5(e,x,y,r,c,tx,ty){if(e.afterimg>0){e.afterimg-=.016;circ(x,y,r*1.4);cx.fillStyle='#ffe08044';cx.fill()}
   if(e.real){cx.beginPath();cx.ellipse(x,y+r*1.05,r*1.1,r*.35,0,0,TAU);cx.fillStyle='#000a';cx.fill()}drawMage(x,y,r,c,tx,ty,e)},
 m6(e,x,y,r,c,tx,ty){cx.save();cx.translate(x,y);rr(-r,-r*.8,r*2,r*1.8,r*.4);cx.fillStyle=e.flash>0?'#fff':'#23233a';cx.fill();cx.strokeStyle='#8a8aff';cx.lineWidth=2;cx.stroke();rr(-r*.6,-r*1.25,r*1.2,r*.8,r*.35);cx.fillStyle='#2e2e4c';cx.fill();cx.stroke();
   cx.fillStyle='#9a8aff';rr(-r*.45,-r*.95,r*.9,r*.12,r*.04);cx.fill();cx.beginPath();cx.moveTo(0,-r*1.25);cx.quadraticCurveTo(r*.5,-r*1.9,r*.9,-r*1.5);cx.strokeStyle='#c03a5a';cx.lineWidth=r*.18;cx.stroke();
   cx.rotate(e.face);cx.beginPath();cx.moveTo(r*.9,-r*.1);cx.lineTo(r*2.1,-r*.1);cx.lineTo(r*2.3,0);cx.lineTo(r*2.1,r*.1);cx.lineTo(r*.9,r*.1);cx.fillStyle='#b8c4ff';cx.fill();cx.restore()},
 m7(e,x,y,r,c,tx,ty){cx.save();cx.translate(x,y);cx.rotate(e.age*1.2);cx.beginPath();const n=14;for(let i=0;i<n*2;i++){const a=i/(n*2)*TAU,k=i%2?.9:1.12;cx.lineTo(Math.cos(a)*r*k,Math.sin(a)*r*k)}cx.closePath();cx.fillStyle=e.flash>0?'#fff':'#8a7a4a';cx.fill();cx.strokeStyle='#000a';cx.lineWidth=2;cx.stroke();cx.restore();
   circ(x,y,r*.5);cx.fillStyle='#2a2418';cx.fill();circ(x,y,r*.3);const g=cx.createRadialGradient(x,y,0,x,y,r*.3);g.addColorStop(0,'#fff0a0');g.addColorStop(1,'#ff9a2a');cx.fillStyle=g;cx.fill();
   cx.strokeStyle='#ffd04a';cx.lineWidth=2;for(let i=0;i<4;i++){const a=i*Math.PI/2;cx.beginPath();cx.moveTo(x+Math.cos(a)*r*.55,y+Math.sin(a)*r*.55);cx.lineTo(x+Math.cos(a)*r*.8,y+Math.sin(a)*r*.8);cx.stroke()}},
 m8(e,x,y,r,c,tx,ty){const a=e.age*3;for(let i=6;i>=0;i--){const k=i/6;circ(x-Math.cos(a)*i*r*.35,y-r*.2*i+Math.sin(a+i)*r*.3,r*(1-k*.4));cx.fillStyle=i%2?c:shade(c,.15);cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke()}
   eyes(x,y,r,tx,ty,'#fe8','#400',.4,.18);for(const s of[-1,1]){cx.beginPath();cx.moveTo(x+s*r*.4,y+r*.7);cx.lineTo(x+s*r*.15,y+r*1.2);cx.strokeStyle='#e8e0c0';cx.lineWidth=3;cx.stroke()}},
 m9(e,x,y,r,c,tx,ty){cx.beginPath();cx.moveTo(x,y-r*1.3);cx.quadraticCurveTo(x+r*1.4,y,x+r*1.1,y+r*1.1);for(let i=4;i>=-4;i--)cx.lineTo(x+i*r*.27,y+r*(1.1+(i%2?.25:0)));cx.quadraticCurveTo(x-r*1.4,y,x,y-r*1.3);cx.fillStyle=e.flash>0?'#fff':'#14182a';cx.fill();cx.strokeStyle='#4a5a9a';cx.lineWidth=2;cx.stroke();
   circ(x,y-r*.3,r*.5);cx.fillStyle='#05060c';cx.fill();for(const s of[-1,1]){circ(x+s*r*.2,y-r*.32,r*.08);cx.fillStyle='#6a8aff';cx.fill()}
   cx.strokeStyle='#9a9aaa';cx.lineWidth=3;cx.beginPath();cx.moveTo(x+r*1.4,y-r*1.4);cx.lineTo(x+r*1.1,y+r*1.1);cx.stroke();cx.beginPath();cx.arc(x+r*.5,y-r*1.4,r*.9,Math.PI*1.05,Math.PI*1.9);cx.stroke();
   const lg=cx.createRadialGradient(x-r*.9,y-r*.2,0,x-r*.9,y-r*.2,r*1.2);lg.addColorStop(0,'#ffe090cc');lg.addColorStop(1,'#ffe09000');cx.fillStyle=lg;cx.fillRect(x-r*2.2,y-r*1.4,r*2.6,r*2.4);circ(x-r*.9,y-r*.2,r*.14);cx.fillStyle='#fff6c0';cx.fill()},
 m10(e,x,y,r,c,tx,ty){rr(x-r*.95,y-r*.7,r*1.9,r*1.7,r*.5);cx.fillStyle=e.flash>0?'#fff':c;cx.fill();cx.strokeStyle='#2a5a7a';cx.lineWidth=2.5;cx.stroke();circ(x,y-r*.8,r*.6);cx.fillStyle=shade(c,.2);cx.fill();cx.stroke();
   cx.fillStyle='#dff6ff';for(let i=-2;i<=2;i++){cx.beginPath();cx.moveTo(x+i*r*.22-r*.1,y-r*1.3);cx.lineTo(x+i*r*.22,y-r*(1.75-Math.abs(i)*.12));cx.lineTo(x+i*r*.22+r*.1,y-r*1.3);cx.fill()}
   eyes(x,y-r*.8,r*.85,tx,ty,'#9ff','#036',.35,.17);for(const s of[-1,1]){circ(x+s*r*1.2,y,r*.45);cx.fillStyle=shade(c,-.1);cx.fill();cx.stroke()}},
 sera(e,x,y,r,c,tx,ty){const bob=Math.sin(e.age*2)*r*.12;y+=bob;
   for(let k=0;k<3;k++)for(const s of[-1,1]){cx.save();cx.translate(x,y);cx.rotate(s*(.3+k*.45)+Math.sin(e.age*2+k)*.08*s);cx.beginPath();cx.moveTo(0,0);cx.quadraticCurveTo(s*r*1.2,-r*1.8,s*r*2.2,-r*.2);cx.quadraticCurveTo(s*r*1.2,-r*.5,0,0);cx.fillStyle=['#fff8d8','#ffeaa0','#ffe070'][k];cx.globalAlpha=.9;cx.fill();cx.restore()}
   const g=cx.createRadialGradient(x,y,0,x,y,r*1.6);g.addColorStop(0,'#fff8c0cc');g.addColorStop(1,'#fff8c000');cx.fillStyle=g;cx.fillRect(x-r*2,y-r*2,r*4,r*4);
   circ(x,y,r*.7);cx.fillStyle=e.flash>0?'#fff':'#fff4d0';cx.fill();cx.strokeStyle='#e0b050';cx.lineWidth=2.5;cx.stroke();circ(x,y,r*.2);cx.fillStyle='#ff9ac0';cx.fill();
   circ(x,y-r*1.05,r*.55);cx.strokeStyle='#ffe070';cx.lineWidth=3;cx.stroke()},
 belial(e,x,y,r,c,tx,ty){for(const s of[-1,1]){cx.beginPath();cx.moveTo(x+s*r*.5,y-r*.3);cx.quadraticCurveTo(x+s*r*2,y-r*1.6,x+s*r*2.4,y+r*.4);cx.quadraticCurveTo(x+s*r*1.6,y+r*.1,x+s*r*1.3,y+r*.7);cx.quadraticCurveTo(x+s*r*.9,y+r*.3,x+s*r*.5,y+r*.6);cx.fillStyle='#4a0a14';cx.fill();cx.strokeStyle='#c01a3a';cx.lineWidth=2;cx.stroke()}
   circ(x,y,r);cx.fillStyle=e.flash>0?'#fff':'#5a0e16';cx.fill();cx.strokeStyle='#ff3a2a';cx.lineWidth=2.5;cx.stroke();
   for(const s of[-1,1]){cx.beginPath();cx.moveTo(x+s*r*.45,y-r*.8);cx.quadraticCurveTo(x+s*r*1.3,y-r*1.1,x+s*r*1.0,y-r*1.9);cx.quadraticCurveTo(x+s*r*.75,y-r*1.2,x+s*r*.25,y-r*.95);cx.fillStyle='#1a0a0a';cx.fill()}
   eyes(x,y-r*.1,r*1.1,tx,ty,'#ff6a3a','#200',.4,.18);cx.beginPath();cx.arc(x,y+r*.35,r*.35,.2,Math.PI-.2);cx.strokeStyle='#ff9a6a';cx.lineWidth=2;cx.stroke()},
 void(e,x,y,r,c,tx,ty){for(let i=0;i<4;i++){cx.save();cx.translate(x,y);cx.rotate(e.age*(.5+i*.3));const g=cx.createLinearGradient(-r*2,0,r*2,0);g.addColorStop(0,'#6a1ab000');g.addColorStop(.5,'#8a3ad0aa');g.addColorStop(1,'#c07aff00');cx.fillStyle=g;cx.beginPath();cx.ellipse(0,0,r*(2.4-i*.35),r*(.5+i*.15),i*.7,0,TAU);cx.fill();cx.restore()}
   circ(x,y,r);cx.fillStyle='#000';cx.fill();cx.strokeStyle=e.core?'#fff':'#a05aff';cx.lineWidth=e.core?4:2;cx.stroke();if(e.core){circ(x,y,r*.35);cx.fillStyle='#d09aff';cx.fill()}},
 creator(e,x,y,r,c,tx,ty){cx.save();cx.translate(x,y);for(let i=0;i<3;i++){cx.rotate(e.age*.3*(i%2?-1:1)+i);cx.beginPath();for(let k=0;k<6;k++){const a=k/6*TAU;cx.lineTo(Math.cos(a)*r*(1.9-i*.3),Math.sin(a)*r*(1.9-i*.3))}cx.closePath();cx.strokeStyle=['#ffd0a0','#a0e0ff','#ffa0ff'][i]+'aa';cx.lineWidth=2;cx.stroke()}cx.restore();
   cx.beginPath();cx.ellipse(x,y,r*1.2,r*(e.open?.95:.35),0,0,TAU);cx.fillStyle=e.flash>0?'#fff':'#fffaf0';cx.fill();cx.strokeStyle='#e0c080';cx.lineWidth=3;cx.stroke();
   const a=Math.atan2(ty-y,tx-x);circ(x+Math.cos(a)*r*.3,y+Math.sin(a)*r*.15,r*.35*(e.open?1:.5));const g=cx.createRadialGradient(x,y,0,x,y,r*.4);g.addColorStop(0,'#fff');g.addColorStop(.5,'#6ad0ff');g.addColorStop(1,'#a06aff');cx.fillStyle=g;cx.fill();circ(x+Math.cos(a)*r*.3,y+Math.sin(a)*r*.15,r*.12);cx.fillStyle='#000';cx.fill()},
};
// ---- 플레이어 ----
function drawPlayer(){
  const x=px(P.x),y=py(P.y),r=T*.36;
  if(G.dead&&G.deadT>1)return;
  cx.save();
  if(P.inv>0&&((P.inv*14)|0)%2===0)cx.globalAlpha=.4;
  shadow(x,y,r);
  const a=P.aim;
  // 몸
  cx.beginPath();cx.moveTo(x-r*.85,y+r*.9);cx.quadraticCurveTo(x-r*1.1,y-r*.1,x,y-r*.5);cx.quadraticCurveTo(x+r*1.1,y-r*.1,x+r*.85,y+r*.9);cx.closePath();cx.fillStyle='#4a5a7a';cx.fill();cx.strokeStyle='#0008';cx.lineWidth=1.5;cx.stroke();
  if(has(5)){const f=Math.sin(G.time*8)*.15;for(const s of[-1,1]){cx.beginPath();cx.moveTo(x+s*r*.5,y);cx.quadraticCurveTo(x+s*r*2,y-r*(1.4+f),x+s*r*1.8,y+r*.3);cx.quadraticCurveTo(x+s*r*1.1,y+r*.1,x+s*r*.5,y+r*.5);cx.fillStyle='#fffffff0';cx.fill()}}
  // 머리
  circ(x,y-r*.45,r*.85);cx.fillStyle=G.flashP?'#fff':'#f0d0b0';cx.fill();cx.strokeStyle='#0008';cx.stroke();
  cx.beginPath();cx.arc(x,y-r*.6,r*.88,Math.PI*1.02,Math.PI*1.98);cx.fillStyle='#3a2a20';cx.fill();
  // 눈 (조준 방향)
  for(const s of[-1,1]){const ex=x+s*r*.32,ey=y-r*.4;circ(ex,ey,r*.2);cx.fillStyle='#fff';cx.fill();circ(ex+Math.cos(a)*r*.09,ey+Math.sin(a)*r*.09,r*.1);cx.fillStyle='#134';cx.fill()}
  cx.beginPath();cx.arc(x,y-r*.1,r*.2,.2,Math.PI-.2);cx.strokeStyle='#7a3a3a';cx.lineWidth=1.5;cx.stroke();
  if(P.hp<=2&&!G.dead){cx.fillStyle='#4af';circ(x+r*.6,y-r*.1+((G.time*2)%1)*r,r*.1);cx.fill()}
  cx.restore();
  if(has(4)&&P.ox!==undefined){const ox=px(P.ox),oy=py(P.oy);circ(ox,oy,T*.2);cx.fillStyle=P.orbCd>0?'#777':'#e8c040';cx.fill();cx.strokeStyle='#fff8';cx.lineWidth=1.5;cx.stroke();if(P.orbCd<=0){circ(ox,oy,T*.3);cx.strokeStyle='#e8c04066';cx.stroke()}}
}
// ---- 탄/장판/이펙트 ----
function drawBullets(){
  for(const b of G.pb){const x=px(b.x),y=py(b.y),r=b.r*T;
    circ(x,y,r*1.9);cx.fillStyle=has(3)?'#f00':'#6ac4ff44';cx.fill();circ(x,y,r);cx.fillStyle='#e8f6ff';cx.fill();cx.strokeStyle='#2a6aa8';cx.lineWidth=1.2;cx.stroke()}
  for(const b of G.eb){const x=px(b.x),y=py(b.y),r=b.r*T;
    circ(x,y,r*1.6);cx.fillStyle=b.col+'44';cx.fill();
    if(S.shapes){cx.save();cx.translate(x,y);cx.rotate(Math.PI/4);cx.fillStyle=b.col;cx.fillRect(-r,-r,r*2,r*2);cx.strokeStyle='#000';cx.lineWidth=1.5;cx.strokeRect(-r,-r,r*2,r*2);cx.restore()}
    else{circ(x,y,r);cx.fillStyle=b.col;cx.fill();cx.strokeStyle='#000a';cx.lineWidth=1.5;cx.stroke();circ(x-r*.25,y-r*.25,r*.3);cx.fillStyle='#fff8';cx.fill()}
    if(b.dmg===0){circ(x,y,r);cx.strokeStyle='#fff6';cx.stroke()}}
}
function drawZones(top){
  for(const z of G.zn){
    if(!!z.top!==top&&z.sh!=='b')continue;
    if((z.sh==='b')!==top)continue;
    const warn=z.t<z.warn,x=px(z.x),y=py(z.y);
    const k=warn?clamp(z.t/z.warn,0,1):1;
    cx.save();
    switch(z.sh){
     case'c':case'void':{
       const R_=z.r*T;
       if(z.safe){circ(x,y,R_);cx.fillStyle='#4aff8a22';cx.fill();cx.setLineDash([6,5]);cx.strokeStyle='#6aff9a';cx.lineWidth=2;cx.stroke();break}
       if(z.sh==='void'){ // 바깥 영역 위험
         const g=!warn;cx.beginPath();cx.rect(0,0,W,H);cx.arc(x,y,R_,0,TAU,true);cx.fillStyle=g?z.col+'44':z.col+'18';cx.fill('evenodd');cx.beginPath();cx.arc(x,y,R_,0,TAU);cx.strokeStyle=z.col;cx.lineWidth=3;cx.stroke();break}
       if(warn){circ(x,y,R_);cx.fillStyle=z.col+'22';cx.fill();cx.setLineDash([5,4]);cx.strokeStyle=z.col;cx.lineWidth=2;cx.stroke();circ(x,y,R_*k);cx.fillStyle=z.col+'44';cx.fill()}
       else{const g=cx.createRadialGradient(x,y,R_*.1,x,y,R_);g.addColorStop(0,z.col+(z.col.length>7?'':'cc'));g.addColorStop(1,z.col+(z.col.length>7?'':'55'));circ(x,y,R_);cx.fillStyle=z.col.length>7?z.col:g;cx.fill();if(z.dmg>0||z.pull||z.aura){cx.strokeStyle=z.col.slice(0,7);cx.lineWidth=2;cx.stroke()}}
       break}
     case'ring':{const mx=z.max*T;if(warn){circ(x,y,mx);cx.setLineDash([5,5]);cx.strokeStyle=z.col+'aa';cx.lineWidth=2;cx.stroke();circ(x,y,mx*k);cx.strokeStyle=z.col;cx.stroke()}
       else{const rad=(z.rad||0)*T;circ(x,y,rad);cx.strokeStyle=z.col;cx.lineWidth=z.th*T;cx.stroke();circ(x,y,rad);cx.strokeStyle='#fff8';cx.lineWidth=z.th*T*.3;cx.stroke()}break}
     case'cone':{const len=z.len*T;cx.beginPath();cx.moveTo(x,y);cx.arc(x,y,len,z.a-z.spread/2,z.a+z.spread/2);cx.closePath();cx.fillStyle=warn?z.col+'33':z.col+'88';cx.fill();if(warn){cx.setLineDash([5,4]);cx.strokeStyle=z.col;cx.lineWidth=2;cx.stroke()}break}
     case'rect':{const X=px(z.x),Y=py(z.y);cx.fillStyle=warn?z.col+'30':z.col+'cc';cx.fillRect(X,Y,z.w*T,z.h*T);if(warn){cx.setLineDash([6,5]);cx.strokeStyle=z.col;cx.lineWidth=2;cx.strokeRect(X,Y,z.w*T,z.h*T);cx.fillStyle=z.col+'44';cx.fillRect(X,Y,z.w*T*k,z.h*T)}break}
     case'b':{const len=z.len*T,w=z.w*T;cx.translate(x,y);cx.rotate(z.a);
       if(warn){if(z.dmg>0||z.w>0){cx.fillStyle=z.col+'22';cx.fillRect(0,-w/2,len,w);cx.fillStyle=z.col+'55';cx.fillRect(0,-w/2*k,len,w*k);cx.setLineDash([8,6]);cx.strokeStyle=z.col;cx.lineWidth=1.5;cx.strokeRect(0,-w/2,len,w)}}
       else{const g=cx.createLinearGradient(0,-w/2,0,w/2);g.addColorStop(0,z.col+'00');g.addColorStop(.5,'#ffffff');g.addColorStop(1,z.col+'00');cx.fillStyle=z.col+'aa';cx.fillRect(0,-w/2,len,w);cx.fillStyle=g;cx.fillRect(0,-w*.3,len,w*.6)}
       break}
    }
    cx.restore();
  }
}
function drawFx(){
  for(const f of G.fx){const k=f.t/f.life;
    if(f.k==='p'){circ(px(f.x),py(f.y),f.sz*T*(1-k*.6));cx.fillStyle=f.col;cx.globalAlpha=1-k;cx.fill();cx.globalAlpha=1}
    else if(f.k==='ring'){circ(px(f.x),py(f.y),f.r*T*(.3+k*.7));cx.strokeStyle=f.col;cx.globalAlpha=1-k;cx.lineWidth=4*(1-k)+1;cx.stroke();cx.globalAlpha=1}
    else if(f.k==='beam'){cx.save();cx.translate(px(f.x),py(f.y));cx.rotate(f.a);const w=f.w*T*(1-k);cx.fillStyle='#ff3a3acc';cx.fillRect(0,-w/2,f.len*T,w);cx.fillStyle='#fff';cx.fillRect(0,-w*.2,f.len*T,w*.4);cx.restore()}
  }
}
function drawPickup(k){
  const x=px(k.x),y=py(k.y)+Math.sin((k.age||0)*3)*2;
  if(k.t==='coin'){circ(x,y,T*.17);cx.fillStyle='#f0c040';cx.fill();cx.strokeStyle='#8a6a10';cx.lineWidth=1.5;cx.stroke();cx.fillStyle='#8a6a10';cx.font='700 '+(T*.2)+'px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('$',x,y+1)}
  else if(k.t==='heart'||k.t==='half'){heart(x,y,T*(k.t==='half'?.2:.28),'#e03a4a',k.t==='half'?.5:1);if(k.price)priceTag(x,y,k.price)}
  else if(k.t==='item'){
    const it=ITEMS[k.id-1];if(!it)return;
    rr(x-T*.45,y+T*.1,T*.9,T*.3,T*.1);cx.fillStyle='#3a3030';cx.fill();cx.strokeStyle='#8a7a6a';cx.lineWidth=1.5;cx.stroke();
    const g=cx.createRadialGradient(x,y-T*.2,0,x,y-T*.2,T*.6);g.addColorStop(0,it.c+'aa');g.addColorStop(1,it.c+'00');cx.fillStyle=g;cx.fillRect(x-T,y-T,T*2,T*1.6);
    itemIcon(it.id,x,y-T*.2,T*.32);
    if(k.price)priceTag(x,y+T*.35,k.price);
    cx.fillStyle='#eadfc8';cx.font='700 '+Math.max(10,T*.28)+'px "Noto Sans KR",sans-serif';cx.textAlign='center';cx.textBaseline='bottom';cx.fillText(it.n,x,y-T*.6);
  }
  else if(k.t==='stairs'){const ok=aliveCount()===0;rr(x-T*.55,y-T*.45,T*1.1,T*.9,T*.2);cx.fillStyle='#000';cx.fill();cx.strokeStyle=ok?'#e0b050':'#555';cx.lineWidth=3;cx.stroke();for(let i=0;i<4;i++){rr(x-T*.4+i*T*.05,y-T*.3+i*T*.15,T*.8-i*T*.1,T*.1,T*.03);cx.fillStyle=ok?'#e0b05088':'#55555588';cx.fill()}}
  else if(k.t==='portal'){for(let i=0;i<4;i++){circ(x,y,T*(.9-i*.17));cx.strokeStyle=['#a06aff','#6ad0ff','#fff','#ffd0a0'][i];cx.lineWidth=3;cx.globalAlpha=.8;cx.stroke()}cx.globalAlpha=1;circ(x,y,T*.4);const g=cx.createRadialGradient(x,y,0,x,y,T*.5);g.addColorStop(0,'#fff');g.addColorStop(1,'#a06aff00');cx.fillStyle=g;cx.fill()}
  else if(k.t==='chest'){rr(x-T*.5,y-T*.3,T,T*.6,T*.1);cx.fillStyle='#8a5a2a';cx.fill();cx.strokeStyle='#e0b050';cx.lineWidth=2.5;cx.stroke();cx.fillStyle='#e0b050';cx.fillRect(x-T*.06,y-T*.1,T*.12,T*.2)}
}
function priceTag(x,y,p){cx.fillStyle='#f0c040';cx.font='700 '+Math.max(10,T*.3)+'px sans-serif';cx.textAlign='center';cx.textBaseline='top';cx.fillText('$'+p,x,y+T*.15)}
function heart(x,y,s,c,frac=1){
  const path=()=>{cx.beginPath();cx.moveTo(x,y+s*.9);cx.bezierCurveTo(x-s*1.5,y-s*.1,x-s*.7,y-s*1.1,x,y-s*.35);cx.bezierCurveTo(x+s*.7,y-s*1.1,x+s*1.5,y-s*.1,x,y+s*.9);cx.closePath()};
  cx.save();path();cx.fillStyle='#2a1018';cx.fill();cx.restore();
  if(frac>0){cx.save();path();cx.clip();cx.fillStyle=c;cx.fillRect(x-s*1.6,y-s*1.2,s*3.2*frac,s*2.4);cx.restore()}
  path();cx.strokeStyle='#000b';cx.lineWidth=1.5;cx.stroke();
}
function itemIcon(id,x,y,s){
  const it=ITEMS[id-1];cx.save();cx.translate(x,y);
  switch(id){
   case 1:cx.beginPath();cx.moveTo(0,-s);cx.quadraticCurveTo(s*1.1,s*.2,0,s);cx.quadraticCurveTo(-s*1.1,s*.2,0,-s);cx.fillStyle=it.c;cx.fill();break;
   case 2:cx.beginPath();cx.ellipse(0,0,s*.7,s,0,0,TAU);cx.fillStyle=it.c;cx.fill();circ(-s*.25,-s*.2,s*.15);cx.fillStyle='#000';cx.fill();circ(s*.25,-s*.2,s*.15);cx.fill();break;
   case 3:cx.fillStyle=it.c;cx.fillRect(-s,-s*.22,s*2,s*.44);cx.fillStyle='#fff';cx.fillRect(-s,-s*.08,s*2,s*.16);break;
   case 4:circ(0,0,s*.8);cx.fillStyle=it.c;cx.fill();cx.strokeStyle='#fff';cx.lineWidth=2;cx.stroke();circ(0,0,s*.35);cx.fillStyle='#fff8';cx.fill();break;
   case 5:for(const q of[-1,1]){cx.beginPath();cx.moveTo(0,s*.5);cx.quadraticCurveTo(q*s*1.4,-s*1.3,q*s*1.1,s*.2);cx.fillStyle=it.c;cx.fill()}break;
   case 6:cx.fillStyle='#e8d8b0';cx.fillRect(-s*.7,-s,s*1.4,s*2);cx.fillStyle='#a01a3a';for(let i=0;i<4;i++)cx.fillRect(-s*.5,-s*.7+i*s*.45,s,s*.1);break;
   case 7:cx.beginPath();for(let i=0;i<16;i++){const a=i/16*TAU,k=i%2?.55:1;cx.lineTo(Math.cos(a)*s*k,Math.sin(a)*s*k)}cx.closePath();cx.fillStyle=it.c;cx.fill();break;
   case 8:circ(0,0,s*.8);cx.fillStyle=it.c;cx.fill();for(let i=0;i<5;i++){circ(Math.cos(i*1.26)*s*.9,Math.sin(i*1.26)*s*.9,s*.2);cx.fill()}break;
   case 9:for(const q of[-1,0,1]){circ(q*s*.7,Math.abs(q)*s*.3,s*.35);cx.fillStyle=it.c;cx.fill()}break;
   case 10:cx.beginPath();cx.moveTo(-s*.7,-s);cx.lineTo(s*.7,-s);cx.lineTo(0,0);cx.lineTo(s*.7,s);cx.lineTo(-s*.7,s);cx.lineTo(0,0);cx.closePath();cx.strokeStyle=it.c;cx.lineWidth=2.5;cx.stroke();cx.fillStyle=it.c+'99';cx.beginPath();cx.moveTo(-s*.4,s);cx.lineTo(s*.4,s);cx.lineTo(0,s*.3);cx.fill();break;
  }
  cx.restore();
}

// ===== HUD / INPUT / FLOW / LOOP =====
const SAFE={t:0,r:0,b:0,l:0};
function measureSafe(){const pr=$('probe'),cs=getComputedStyle(pr);SAFE.t=parseFloat(cs.paddingTop)||0;SAFE.r=parseFloat(cs.paddingRight)||0;SAFE.b=parseFloat(cs.paddingBottom)||0;SAFE.l=parseFloat(cs.paddingLeft)||0}
const BTN=[];
let stick=null,aimst=null;
function drawHUD(){
  BTN.length=0;
  const L=SAFE.l+10,Tp=SAFE.t+8;
  // 일시정지 (48dp)
  const pb={x:L,y:Tp,w:48,h:48,fn:()=>setPause(true)};BTN.push(pb);
  rr(pb.x,pb.y,48,48,12);cx.fillStyle='#1a1424cc';cx.fill();cx.strokeStyle='#4a3a5a';cx.lineWidth=1.5;cx.stroke();cx.fillStyle='#eadfc8';cx.fillRect(pb.x+16,pb.y+14,5,20);cx.fillRect(pb.x+27,pb.y+14,5,20);
  // 하트 (1칸=HP2, 반칸 표시)
  const n=P.maxhp/2,hs=9.5;
  for(let i=0;i<n;i++){const row=(i/6)|0,col=i%6;heart(L+48+16+col*24,Tp+14+row*22,hs,'#e03a4a',clamp((P.hp-i*2)/2,0,1))}
  // 미니맵
  drawMinimap();
  // 보스 HP바
  if(G.boss&&!G.boss.dead&&G.boss.bossBar&&G.warnT<=0){
    const b=G.boss,w=RW*T,x=RX,y=RY-T*.62,h=Math.max(10,T*.28);
    rr(x-2,y-2,w+4,h+4,h/2+2);cx.fillStyle='#000b';cx.fill();
    rr(x,y,w*clamp(b.hp/b.mhp,0,1),h,h/2);const g=cx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#a8201a');g.addColorStop(1,'#ff5a3a');cx.fillStyle=g;cx.fill();
    for(const t of(b.phaseT||[])){cx.fillStyle='#fff9';cx.fillRect(x+w*t-1,y,2,h)}
    cx.fillStyle='#fff';cx.font='700 '+Math.max(10,T*.26)+'px "Noto Sans KR",sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(b.d.n,x+w/2,y+h/2+1);
  }
  // 하단: 코인, 소지품, 액티브, 조준 전환
  const by=H-SAFE.b-16;
  cx.textAlign='left';cx.textBaseline='middle';circ(L+10,by-4,9);cx.fillStyle='#f0c040';cx.fill();cx.strokeStyle='#8a6a10';cx.lineWidth=1.5;cx.stroke();
  cx.fillStyle='#eadfc8';cx.font='800 18px "Noto Sans KR",sans-serif';cx.fillText('× '+P.coins,L+26,by-3);
  // 아이템 목록
  const its=P.items.filter(i=>i!==10);const iy=RY+RH*T+T*1.0+6;
  its.forEach((id,i)=>{const col=i%10,row=(i/10)|0;const sx=W/2-(Math.min(its.length,10)*20)/2+col*20+10;if(iy+row*20<H-60){itemIcon(id,sx,iy+row*20,7)}});
  // 액티브 버튼 72dp
  const ar=36,ax=W-SAFE.r-14-ar,ay=H-SAFE.b-14-ar-10;
  if(P.active){
    BTN.push({x:ax-ar,y:ay-ar,w:ar*2,h:ar*2,fn:()=>{In.act=true}});
    circ(ax,ay,ar);cx.fillStyle='#1a1424dd';cx.fill();
    const rdy=P.acd<=0;cx.strokeStyle=rdy?'#e8d8a0':'#4a3a5a';cx.lineWidth=4;cx.stroke();
    if(!rdy){cx.beginPath();cx.moveTo(ax,ay);cx.arc(ax,ay,ar-2,-Math.PI/2,-Math.PI/2+TAU*(1-P.acd/P.acdMax));cx.closePath();cx.fillStyle='#e8d8a033';cx.fill();cx.fillStyle='#eadfc8';cx.font='700 13px sans-serif';cx.textAlign='center';cx.fillText(Math.ceil(P.acd)+'s',ax,ay+ar*.62)}
    itemIcon(P.active,ax,ay-4,13);
  }
  // 자동/수동
  const mx=ax-ar-12-24,my=ay+ar-24;
  BTN.push({x:mx-24,y:my-24,w:48,h:48,fn:()=>{S.auto=!S.auto;saveS();msg(S.auto?'자동 조준':'수동 조준 (오른쪽 화면 드래그)',1.4)}});
  circ(mx,my,24);cx.fillStyle='#1a1424dd';cx.fill();cx.strokeStyle='#4a3a5a';cx.lineWidth=2;cx.stroke();cx.fillStyle=S.auto?'#9ad0ff':'#ffb070';cx.font='700 13px "Noto Sans KR",sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(S.auto?'자동':'수동',mx,my);
  // 스틱
  for(const s of[stick,aimst]){if(!s)continue;circ(s.x0,s.y0,64);cx.strokeStyle='#ffffff30';cx.lineWidth=2;cx.stroke();circ(s.x0,s.y0,64);cx.fillStyle='#ffffff0a';cx.fill();
    const dx=s.x-s.x0,dy=s.y-s.y0,l=Math.hypot(dx,dy),k=l>64?64/l:1;circ(s.x0+dx*k,s.y0+dy*k,26);cx.fillStyle=s.role==='move'?'#9ad0ff55':'#ffb07055';cx.fill()}
  // 메시지
  if(G.msgT>0&&G.msg){cx.globalAlpha=clamp(G.msgT,0,1);cx.font='700 '+Math.max(13,T*.38)+'px "Noto Sans KR",sans-serif';cx.textAlign='center';cx.textBaseline='middle';
    const ty=RY+RH*T-T*.9,tw=cx.measureText(G.msg).width+24;rr(W/2-tw/2,ty-T*.4,tw,T*.8,T*.3);cx.fillStyle='#000c';cx.fill();cx.fillStyle='#f4ead0';cx.fillText(G.msg,W/2,ty);cx.globalAlpha=1}
}
function drawMinimap(){
  const rooms=G.rooms.filter(r=>r.visited||r.seen);if(!rooms.length)return;
  const cs=10,gap=2,u=cs+gap;let x0=9,y0=9,x1=0,y1=0;rooms.forEach(r=>{x0=Math.min(x0,r.gx);x1=Math.max(x1,r.gx);y0=Math.min(y0,r.gy);y1=Math.max(y1,r.gy)});
  const w=(x1-x0+1)*u,h=(y1-y0+1)*u,ox=W-SAFE.r-10-w,oy=SAFE.t+8;
  rr(ox-4,oy-4,w+8,h+8,6);cx.fillStyle='#0a0810bb';cx.fill();
  for(const r of rooms){
    const X=ox+(r.gx-x0)*u,Y=oy+(r.gy-y0)*u,cur=r===R;
    let c=r.visited?'#6a5a7a':'#2e2638';
    const ic={boss:'#d03a30',treasure:'#e0b050',shop:'#5ad07a',angel:'#fff2b0',devil:'#c01a3a'}[r.type];
    if(ic&&(r.seen||r.visited))c=r.visited?ic:ic+'88';
    if(r.type==='start'&&r.visited&&!cur)c='#8a7a9a';
    rr(X,Y,cs,cs,2);cx.fillStyle=c;cx.fill();
    if(r.visited&&!r.cleared&&!cur){cx.fillStyle='#000a';cx.fillRect(X+3,Y+3,cs-6,cs-6)}
    if(cur){cx.strokeStyle='#fff';cx.lineWidth=2;cx.stroke()}
  }
}
function drawOverlays(){
  // 어둠 (영혼 수확자)
  if(G.darkR>0&&G.boss&&!G.boss.dead){
    const x=px(P.x),y=py(P.y),r=G.darkR*T;const g=cx.createRadialGradient(x,y,r*.45,x,y,r);g.addColorStop(0,'#00000000');g.addColorStop(1,'#000000f2');
    cx.fillStyle=g;cx.fillRect(0,0,W,H);
    const b=G.boss;const bx=px(b.x-.9*b.r),by=py(b.y-.2*b.r),lg=cx.createRadialGradient(bx,by,0,bx,by,T*1.2);lg.addColorStop(0,'#ffe090aa');lg.addColorStop(1,'#ffe09000');cx.fillStyle=lg;cx.fillRect(bx-T*2,by-T*2,T*4,T*4);
  }
  if(P.sandT>0){cx.fillStyle='#d6b67866';cx.fillRect(0,0,W,H)}
  if(G.vig>0){const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.75);g.addColorStop(0,'#ff000000');g.addColorStop(1,'#ff1a1a'+Math.round(clamp(G.vig,0,1)*180).toString(16).padStart(2,'0'));cx.fillStyle=g;cx.fillRect(0,0,W,H)}
  if(P.hp<=2&&!G.dead){const a=.15+.1*Math.sin(G.time*5);const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.4,W/2,H/2,Math.max(W,H)*.8);g.addColorStop(0,'#ff000000');g.addColorStop(1,'#ff0000'+Math.round(a*255).toString(16).padStart(2,'0'));cx.fillStyle=g;cx.fillRect(0,0,W,H)}
  if(G.warnT>0){
    const k=G.warnT/1.5,a=.5+.3*Math.sin(G.time*14);
    const g=cx.createRadialGradient(W/2,H/2,Math.min(W,H)*.15,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'#aa000000');g.addColorStop(1,'#cc0000'+Math.round(a*200).toString(16).padStart(2,'0'));cx.fillStyle=g;cx.fillRect(0,0,W,H);
    // 보스 실루엣
    cx.globalAlpha=.8;circ(W/2,RY+4.5*T,T*(1.6+Math.sin(G.time*6)*.05));cx.fillStyle='#000';cx.fill();cx.globalAlpha=1;
    cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#ff4a3a';cx.font='800 '+Math.min(48,W*.11)+'px "Noto Serif KR",serif';cx.shadowColor='#f00';cx.shadowBlur=20;cx.fillText('WARNING',W/2,H*.36);
    cx.font='700 '+Math.min(22,W*.055)+'px "Noto Serif KR",serif';cx.fillStyle='#ffd0c0';cx.fillText(G.warnName||'',W/2,H*.36+Math.min(48,W*.11)*.9);cx.shadowBlur=0;
  }
  if(G.flashRew>0){cx.fillStyle='#9ad0ff'+Math.round(clamp(G.flashRew,0,1)*90).toString(16).padStart(2,'0');cx.fillRect(0,0,W,H)}
  if(G.flash>0){cx.fillStyle='#ffffff';cx.globalAlpha=clamp(G.flash,0,.9);cx.fillRect(0,0,W,H);cx.globalAlpha=1}
  if(G.flashItem){const f=G.flashItem;cx.globalAlpha=clamp(f.t,0,1);const y=RY+4*T;circ(W/2,y,T*1.1);cx.fillStyle=f.it.c+'44';cx.fill();itemIcon(f.it.id,W/2,y,T*.7);cx.globalAlpha=1}
  if(G.fade>0){cx.fillStyle='#000';cx.globalAlpha=clamp(G.fade,0,1);cx.fillRect(0,0,W,H);cx.globalAlpha=1}
}
function drawIntro(){
  const t=G.intro,k=clamp(t/.7,0,1),e=1-Math.pow(1-k,3);
  cx.fillStyle='#0a0810';cx.fillRect(0,0,W,H);
  const w=Math.min(W-30,420),h=Math.min(H-60,560)*e,x=(W-w)/2,y=(H-h)/2;
  rr(x,y,w,h,14);const g=cx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#c4975e');g.addColorStop(.5,'#a9763e');g.addColorStop(1,'#8a5a2a');cx.fillStyle=g;cx.fill();cx.strokeStyle='#4a2a14';cx.lineWidth=3;cx.stroke();
  const gv=cx.createRadialGradient(W/2,H/2,Math.min(w,h)*.3,W/2,H/2,Math.max(w,h)*.7);gv.addColorStop(0,'#00000000');gv.addColorStop(1,'#5a000040');cx.save();rr(x,y,w,h,14);cx.clip();cx.fillStyle=gv;cx.fillRect(x,y,w,h);
  // 잉크 지도
  if(G.rooms.length&&k>.6){
    let x0=9,y0=9,x1=0,y1=0;G.rooms.forEach(r=>{x0=Math.min(x0,r.gx);x1=Math.max(x1,r.gx);y0=Math.min(y0,r.gy);y1=Math.max(y1,r.gy)});
    const cw=Math.min(40,(w-80)/(x1-x0+1)),mw=(x1-x0+1)*cw,mh=(y1-y0+1)*cw,mx=W/2-mw/2,my=H/2-mh/2+10;
    const reveal=clamp((t-.5)/1.2,0,1),vis=G.rooms.slice(0,Math.ceil(G.rooms.length*reveal));
    cx.strokeStyle='#4a0e0a';cx.lineWidth=2.5;
    vis.forEach(r=>{const X=mx+(r.gx-x0+.5)*cw,Y=my+(r.gy-y0+.5)*cw;for(const d of[['E',1,0],['S',0,1]]){const o=r.d[d[0]];if(o&&vis.includes(o)){cx.beginPath();cx.moveTo(X,Y);cx.lineTo(X+d[1]*cw,Y+d[2]*cw);cx.stroke()}}});
    vis.forEach(r=>{const X=mx+(r.gx-x0+.5)*cw,Y=my+(r.gy-y0+.5)*cw,s=cw*.34;rr(X-s,Y-s,s*2,s*2,3);cx.fillStyle=r.type==='boss'?'#8a1010':'#d4aa72';cx.fill();cx.stroke();if(r.type==='boss'){cx.fillStyle='#e8d0a0';cx.font='700 '+s+'px serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('☠',X,Y+1)}})
  }
  cx.restore();
  if(k>.7){const a=clamp((t-.5)/.4,0,1);cx.globalAlpha=a;cx.textAlign='center';cx.textBaseline='middle';cx.fillStyle='#3a0a06';cx.font='800 '+Math.min(30,W*.075)+'px "Noto Serif KR",serif';cx.fillText('Floor '+G.floor+': '+FLOORS[G.floor-1].n,W/2,y+46);
    const cd=Math.max(1,Math.ceil(2.6-t));cx.font='800 '+Math.min(64,W*.16)+'px "Noto Serif KR",serif';cx.fillStyle='#5a0e0a';if(t<2.6)cx.fillText(String(cd),W/2,y+h-52);cx.globalAlpha=1}
}
function render(){
  cx.setTransform(DPR,0,0,DPR,0,0);cx.clearRect(0,0,W,H);cx.fillStyle='#0a0810';cx.fillRect(0,0,W,H);
  if(G.scr==='intro'){drawIntro();return}
  if(G.scr!=='play'&&G.scr!=='dead')return;
  cx.save();
  if(G.shake>0){cx.translate(rnd(-1,1)*G.shake*T*.25,rnd(-1,1)*G.shake*T*.25)}
  if(G.tr){const k=clamp(G.tr.t/.3,0,1),e=k*k*(3-2*k),d=G.tr.dir,vx=d==='E'?1:d==='W'?-1:0,vy=d==='S'?1:d==='N'?-1:0,ow=(RW+2)*T,oh=(RH+2)*T;
    drawRoom(G.tr.old,-vx*ow*e,-vy*oh*e);drawRoom(R,vx*ow*(1-e),vy*oh*(1-e));
    cx.restore();drawOverlays();drawHUD();return}
  drawRoom(R,0,0);
  drawZones(false);
  for(const k of G.pk)drawPickup(k);
  const list=[...G.en].sort((a,b)=>a.y-b.y);
  for(const e of list)drawEnemy(e);
  drawPlayer();
  drawBullets();drawFx();drawZones(true);
  if(G.scr==='play'&&R.type==='start'&&G.time<4&&G.floor===1){cx.fillStyle='#eadfc8cc';cx.font='700 '+Math.max(12,T*.34)+'px "Noto Sans KR",sans-serif';cx.textAlign='center';cx.fillText('왼쪽 화면을 드래그해 이동',W/2,RY+3*T);cx.fillText('가까운 적을 향해 자동으로 발사합니다',W/2,RY+3.8*T)}
  cx.restore();
  drawOverlays();drawHUD();
}
// ===== 입력 =====
function stickVec(s){const dx=s.x-s.x0,dy=s.y-s.y0,l=Math.hypot(dx,dy),m=Math.min(1,l/64);if(m<.12)return[0,0];const k=((m-.12)/.88)/(l||1);return[dx*k,dy*k]}
cv.addEventListener('pointerdown',ev=>{
  audioInit();if(G.scr!=='play'||G.paused||G.dead)return;ev.preventDefault();
  const x=ev.clientX,y=ev.clientY;
  for(const b of BTN){if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){b.fn();return}}
  const s={id:ev.pointerId,x0:x,y0:y,x,y,role:x<W/2?'move':'aim'};
  if(s.role==='move'){if(!stick)stick=s;else return}else{if(!aimst)aimst=s;else return}
  try{cv.setPointerCapture(ev.pointerId)}catch(e){}
});
cv.addEventListener('pointermove',ev=>{
  for(const s of[stick,aimst]){if(s&&s.id===ev.pointerId){s.x=ev.clientX;s.y=ev.clientY}}
  upInput();
});
function endPtr(ev){if(stick&&stick.id===ev.pointerId)stick=null;if(aimst&&aimst.id===ev.pointerId)aimst=null;upInput()}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
function upInput(){
  if(stick){const v=stickVec(stick);In.mx=v[0];In.my=v[1]}else{In.mx=0;In.my=0}
  if(aimst){const v=stickVec(aimst);In.ax=v[0];In.ay=v[1]}else{In.ax=0;In.ay=0}
}
const KM={KeyW:'w',KeyA:'a',KeyS:'s',KeyD:'d',ArrowUp:'up',ArrowDown:'down',ArrowLeft:'left',ArrowRight:'right'};
on(window,'keydown',e=>{audioInit();if(KM[e.code]){In.key[KM[e.code]]=true;e.preventDefault()}
  if(e.code==='Space'){In.act=true;e.preventDefault()}
  if(e.code==='KeyP'||e.code==='Escape'){if(G.scr==='play')setPause(!G.paused)}});
on(window,'keyup',e=>{if(KM[e.code])In.key[KM[e.code]]=false});
on(document,'contextmenu',e=>{if(root.contains(e.target))e.preventDefault()});
on(document,'visibilitychange',()=>{if(document.hidden&&G.scr==='play'&&!G.dead)setPause(true)});
// ===== UI =====
const show=(id,on)=>$(id).classList.toggle('on',!!on);
function setPause(v){if(G.scr!=='play'||G.dead)return;G.paused=v;show('pause',v);if(v){stick=null;aimst=null;upInput()}}
function renderSettings(){
  const L=$('setList');L.innerHTML='';
  const rows=[
   ['조준 방식',S.auto?'자동':'수동',()=>{S.auto=!S.auto}],
   ['화면 흔들림',['끔','약','강'][S.shake===0?0:S.shake<1?1:2],()=>{S.shake=S.shake===0?.5:S.shake<1?1:0}],
   ['백색 플래시',S.flash?'켜짐':'꺼짐 (붉은 테두리로 대체)',()=>{S.flash=!S.flash}],
   ['탄막 모양 구분 (색약)',S.shapes?'켜짐':'꺼짐',()=>{S.shapes=!S.shapes}],
   ['효과음·배경음',S.sound?'켜짐':'꺼짐',()=>{S.sound=!S.sound}],
   ['진동',S.hap?'켜짐':'꺼짐',()=>{S.hap=!S.hap}],
  ];
  rows.forEach(r=>{const d=document.createElement('div');d.className='tog';d.innerHTML='<span>'+r[0]+'</span>';const b=document.createElement('button');b.textContent=r[1];b.onclick=()=>{r[2]();saveS();renderSettings()};d.appendChild(b);L.appendChild(d)});
}
let setFrom='sel';
function openSet(from){setFrom=from;renderSettings();show('set',1)}
$('bSet1').onclick=()=>{audioInit();openSet('sel')};$('bSet2').onclick=()=>openSet('pause');
$('bSetBack').onclick=()=>show('set',0);
$('bResume').onclick=()=>setPause(false);
$('bGiveup').onclick=()=>{setPause(false);showResults(false,true)};
$('bExit1').onclick=$('bExit2').onclick=$('bExit3').onclick=()=>close();
$('bMain').onclick=()=>{show('res',0);show('sel',1);G.scr='select'};
$('bStart').onclick=()=>{
  audioInit();const sp=$('spot');sp.style.display='block';const t0=performance.now();show('sel',0);
  (function f(){const k=clamp((performance.now()-t0)/500,0,1);sp.style.background='radial-gradient(circle at 50% 42%,transparent '+(70*(1-k))+'%,#000 '+(70*(1-k)+.5)+'%)';
    if(k<1)requestAnimationFrame(f);else{sp.style.display='none';startRun()}})();
};
function fmtT(s){s=Math.floor(s);return Math.floor(s/60)+'분 '+(s%60)+'초'}
function showResults(win,giveup){
  G.scr='results';G.paused=false;show('pause',0);
  $('resT').textContent=win?'어비스를 정복했다':(giveup?'탐험 종료':'사망');
  $('resT').style.color=win?'var(--gold)':'var(--blood)';
  $('resS').textContent=win?'원초의 존재가 사라지고 포탈이 열렸다.':'죽으면 처음부터 다시 시작합니다.';
  $('resList').innerHTML=[['도달한 층','Floor '+G.floor+' · '+FLOORS[G.floor-1].n],['처치한 몬스터',G.kills+'마리'],['플레이 시간',fmtT(G.runT)],['획득한 코인',G.coinsGot+'개']].map(r=>'<div class="stat"><span>'+r[0]+'</span><b>'+r[1]+'</b></div>').join('');
  $('resItems').innerHTML=P.items.length?P.items.map(i=>'<span style="border-color:'+ITEMS[i-1].c+'88">'+ITEMS[i-1].n+'</span>').join(''):'<span>획득한 아이템 없음</span>';
  show('res',1);
}
// ===== 흐름 =====
let realDead=0;
function startRun(){
  cv.style.filter='';G.dust=0;realDead=0;P=newPlayer();recalc();G.kills=0;G.runT=0;G.coinsGot=0;G.dead=0;G.win=false;G.slow=1;G.finalDone=false;G.time=0;G.fade=0;G.paused=false;
  startFloor(1);
}
function startFloor(f){
  G.floor=f;const m=genFloor(f);G.rooms=m.list;G.grid=m.grid;G.angelUsed=false;G.scr='intro';G.intro=0;G.pendingStart=m.start;G.nextFloor=false;
  if(f===5)G.finalKind=ri(0,1);
  R=m.start;G.room=R;G.pk=[];G.en.length=0;G.eb.length=0;G.pb.length=0;G.zn.length=0;G.fx.length=0;G.boss=null;G.ice=false;G.darkR=0;G.voidShr=false;G.warnT=0;
  stick=null;aimst=null;upInput();
}
function begin(){ // 인트로 종료 → 시작방
  G.scr='play';G.fade=1.2;const s=G.pendingStart;R=s;R.visited=true;enterRoom(s,null);P.x=4.5;P.y=6.5;P.inv=.2;
  if(G.floor===1)msg('Floor 1: 지하 참호',3);else msg('Floor '+G.floor+': '+FLOORS[G.floor-1].n,3);
}
function step(dt){
  if(G.scr==='intro'){G.intro+=dt;if(G.intro>=2.6+1.0&&!G.begun){G.begun=true}if(G.intro>=3.6){G.begun=false;begin()}return}
  if(G.scr!=='play')return;
  if(G.msgT>0)G.msgT-=dt;if(G.fade>0)G.fade-=dt/1.2;
  G.time+=dt;if(!G.dead)G.runT+=dt;
  G.shake=Math.max(0,G.shake-dt*2.2);G.flash=Math.max(0,G.flash-dt*3);G.vig=Math.max(0,G.vig-dt*1.5);G.flashCool=Math.max(0,(G.flashCool||0)-dt);G.flashRew=Math.max(0,(G.flashRew||0)-dt);
  if(G.flashItem){G.flashItem.t-=dt;if(G.flashItem.t<=0)G.flashItem=null}
  if(G.dead){updateFx(dt);return}
  if(G.tr){G.tr.t+=dt;if(G.tr.t>=.3){G.tr=null}return}
  if(G.go){const d=G.go;G.go=null;const nx=R.d[d];if(nx){enterRoom(nx,d)}return}
  if(G.nextFloor){startFloor(G.floor+1);return}
  if(G.win){G.win=false;showResults(true);return}
  updatePlayer(dt);
  if(G.warnT>0){G.warnT-=dt;if(G.warnT<=0&&R.bossPending)spawnBoss();updatePickups(dt);updateFx(dt);return}
  updateHist(dt);
  updateEnemies(dt);updateBullets(dt);updateZones(dt);updatePickups(dt);updateFx(dt);
  if(!R.cleared&&!R.bossPending&&G.warnT<=0&&aliveCount()===0&&!G.boss){roomCleared()}
}
let last=performance.now(),acc=0;
function frame(now){
  if(closed)return;
  const real=Math.min(.05,(now-last)/1000);last=now;
  if(!G.paused){
    if(G.dead){ // 사망 연출: 0.2배속 1초 후 가루로 소멸 → 결과
      realDead+=real;G.slow=realDead<1?.2:1;
      if(realDead>2.4&&G.scr==='play'){G.scr='dead';showResults(false)}
    }else realDead=0;
    acc+=real*G.slow;let n=0;
    while(acc>=1/60&&n++<6){step(1/60);acc-=1/60}
    if(G.dead){G.deadT=realDead;cv.style.filter='grayscale(1)';if(realDead>1&&!G.dust){G.dust=1;fxP(P.x,P.y,'#9a9a9a',70,3,1.4,.1)}}
  }
  render();
  raf=requestAnimationFrame(frame);
}
resize();
raf=requestAnimationFrame(frame);
// ===== 테스트용 디버그 API =====
if(window.__ABYSS_DEBUG)window.__A={G,get P(){return P},get R(){return R},In,S,
  start(){show('sel',0);startRun();G.intro=3.55;step(.1);step(.1)},
  step(n=1,dt=1/60){for(let i=0;i<n;i++){step(dt);}},
  mon(id,x,y){const m=M[id-1];return spawnMon(m,x!==undefined?{x,y}:undefined)},
  bossKey(key){const idx=key.startsWith('m')?+key.slice(1)-1:-1;const d=idx>=0?Object.assign({key},MID[idx]):pickBossDef(key==='sera'?'angel':key==='belial'?'devil':'final');if(key==='void')G.finalKind=0;if(key==='creator')G.finalKind=1;
    const dd=key==='void'||key==='creator'?pickBossDef('final'):(key==='sera'||key==='belial'?pickBossDef(key==='sera'?'angel':'devil'):d);
    G.en.length=0;R.open=false;R.cleared=false;R.stage=idx>=0?'mid':(key==='sera'?'angel':key==='belial'?'devil':'final');
    const e=mkE(dd,4.5,3.3);e.bossBar=true;G.boss=e;e.phaseT=(dd.key==='void'||dd.key==='creator')?[.66,.33]:[.6,.3];R.bd=dd;return e},
  god(v=true){G.god=v},
  setFloor(f){startFloor(f);G.intro=3.55;step(.1);step(.1)},
  go(room){enterRoom(room,null)},
  give(id){giveItem(id)},
  M,MID,ITEMS,FLOORS,render,
};
const _hp=hurtP;hurtP=function(d,s,f){if(G.god)return false;return _hp(d,s,f)};
function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);if(musT){clearInterval(musT);musT=null}L.forEach(f=>f());try{if(AC)AC.close()}catch(e){}AC=null;root.remove();st.remove();document.body.style.overflow=prevOv;ctx&&ctx.onClose&&ctx.onClose()}
return {close};


}
