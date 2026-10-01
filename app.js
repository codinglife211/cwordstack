'use strict';
const $=id=>document.getElementById(id);
const STORAGE_KEY='cwordstack_state_v1';
const SETTINGS_KEY='cwordstack_settings_v1';
const KOREAN_WEEKDAYS=['일','월','화','수','목','금','토'];
const todayISO=()=>{const d=new Date(),y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`};
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+Number(n||0));return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const uid=()=>crypto?.randomUUID?.()||('c'+Date.now()+Math.random().toString(16).slice(2));
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
function toast(msg){const el=$('toast');el.textContent=msg;el.classList.remove('hidden');clearTimeout(toast.t);toast.t=setTimeout(()=>el.classList.add('hidden'),2400)}

const FIELD_DEFS={
  chineseWord:{label:'중국어 단어',lang:'zh'},pinyin:{label:'병음',lang:'zh'},partOfSpeech:{label:'품사',lang:'meta'},chineseExample:{label:'중국어 예문',lang:'zh'},
  koreanMeaning:{label:'한국어 뜻',lang:'ko'},koreanExample:{label:'한국어 예문',lang:'ko'},category:{label:'Category',lang:'meta'},chapter:{label:'Chapter',lang:'meta'},tags:{label:'Tags',lang:'meta'}
};
const DEFAULT_FRONT=['koreanMeaning','koreanExample','category','chapter','tags'];
const DEFAULT_BACK=['chineseWord','pinyin','partOfSpeech','chineseExample','category','chapter','tags'];

function seedCards(){return [
  {id:uid(),chineseWord:'你好',pinyin:'nǐ hǎo',partOfSpeech:'interjection',chineseExample:'你好，很高兴认识你。',koreanMeaning:'안녕하세요',koreanExample:'안녕하세요, 만나서 반갑습니다.',category:'기본 단어장',chapter:'1과',tags:'기초',due:todayISO(),interval:0,ease:2.5,reps:0,lapses:0,reviews:0,wrongCount:0,memoryUnknown:true},
  {id:uid(),chineseWord:'学习',pinyin:'xuéxí',partOfSpeech:'verb',chineseExample:'我每天学习汉语。',koreanMeaning:'공부하다, 배우다',koreanExample:'나는 매일 중국어를 공부한다.',category:'기본 단어장',chapter:'1과',tags:'기초',due:todayISO(),interval:0,ease:2.5,reps:0,lapses:0,reviews:0,wrongCount:0,memoryUnknown:true},
  {id:uid(),chineseWord:'愿意',pinyin:'yuànyì',partOfSpeech:'verb',chineseExample:'只要愿意，什么时候都可以开始。',koreanMeaning:'원하다, 기꺼이 ~하다',koreanExample:'원하기만 하면 언제든 시작할 수 있다.',category:'기본 단어장',chapter:'2과',tags:'중요',due:todayISO(),interval:0,ease:2.5,reps:0,lapses:0,reviews:0,wrongCount:0,memoryUnknown:true}
]}
function defaultState(){return {cards:seedCards(),reviewHistory:[],quizHistory:[],studySeconds:{},deckMeta:{},deletedKeys:[],dirtyKeys:[]}}
function defaultSettings(){return {ttsEnabled:true,ttsLocale:'zh-CN',ttsRate:1,frontFields:[...DEFAULT_FRONT],backFields:[...DEFAULT_BACK],memoryInterval:5,googleClientId:'',googleSheetUrl:'',memoryQuizLanguage:'kr'}}
let state=(()=>{try{return {...defaultState(),...JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}')}}catch{return defaultState()}})();
let settings=(()=>{try{return {...defaultSettings(),...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')}}catch{return defaultSettings()}})();
function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function normalizeCard(c){return {id:c.id||uid(),chineseWord:String(c.chineseWord||'').trim(),pinyin:String(c.pinyin||'').trim(),partOfSpeech:String(c.partOfSpeech||'').trim(),chineseExample:String(c.chineseExample||'').trim(),koreanMeaning:String(c.koreanMeaning||'').trim(),koreanExample:String(c.koreanExample||'').trim(),category:String(c.category||'기본 단어장').trim()||'기본 단어장',chapter:String(c.chapter||'').trim(),tags:String(c.tags||'').trim(),due:c.due||todayISO(),interval:Number(c.interval)||0,ease:Number(c.ease)||2.5,reps:Number(c.reps)||0,lapses:Number(c.lapses)||0,reviews:Number(c.reviews)||0,wrongCount:Number(c.wrongCount)||0,memoryUnknown:c.memoryUnknown!==false}}
state.cards=(state.cards||[]).map(normalizeCard);
persist();

function cardKey(c){return [c.chineseWord.trim().toLowerCase(),c.category.trim().toLowerCase(),c.chapter.trim().toLowerCase()].join('||')}
function markDirty(c){const k=cardKey(c);if(!state.dirtyKeys.includes(k))state.dirtyKeys.push(k)}
function formatLocalStudyDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} (${KOREAN_WEEKDAYS[d.getDay()]})`}
function updateStudyActualDate(){if($('studyActualDate'))$('studyActualDate').textContent=formatLocalStudyDate()}
setInterval(()=>{const v=formatLocalStudyDate();if($('studyActualDate')?.textContent!==v)updateStudyActualDate()},60000);

function decks(){return [...new Set(state.cards.map(c=>c.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}))}
function chaptersFor(deck){return [...new Set(state.cards.filter(c=>!deck||c.category===deck).map(c=>c.chapter).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko',{numeric:true}))}
function parseStudyFilter(v){if(v==='__all')return {deck:null,chapter:null};const [deck,chapter]=v.split('|||');return {deck,chapter:chapter||null}}
function inStudyFilter(c,v){const f=parseStudyFilter(v);return (!f.deck||c.category===f.deck)&&(!f.chapter||c.chapter===f.chapter)}
function dueCards(filter='__all'){return state.cards.filter(c=>inStudyFilter(c,filter)&&(!c.due||c.due<=todayISO()))}

function renderStudyFilter(){const el=$('studyDeckFilter');if(!el)return;const prev=el.value||'__all';let html=`<option value="__all">전체 단어장 (${state.cards.length})</option>`;for(const d of decks()){const dc=state.cards.filter(c=>c.category===d).length;html+=`<option value="${esc(d)}">${esc(d)} (${dc})</option>`;for(const ch of chaptersFor(d)){const cc=state.cards.filter(c=>c.category===d&&c.chapter===ch).length;html+=`<option value="${esc(d)}|||${esc(ch)}">↳ ${esc(ch)} (${cc})</option>`}}el.innerHTML=html;if([...el.options].some(o=>o.value===prev))el.value=prev}

function fieldValue(c,k){return c?.[k]??''}
function sideFields(side){return side==='front'?settings.frontFields:settings.backFields}
function renderCardSide(c,side){
  const fields=sideFields(side),out=[],metaKeys=['category','chapter','tags'];
  let metaRendered=false;
  for(const k of fields){
    if(metaKeys.includes(k)){
      if(!metaRendered){
        const metaItems=metaKeys
          .filter(m=>fields.includes(m))
          .map(m=>({key:m,value:String(fieldValue(c,m)||'').trim()}))
          .filter(x=>x.value);
        if(metaItems.length){
          const chips=metaItems.map(x=>`<span class="face-meta-chip meta-${x.key}" title="${esc(x.value)}">${esc(x.value)}</span>`).join('');
          out.push(`<div class="face-meta-row">${chips}</div>`);
        }
        metaRendered=true;
      }
      continue;
    }
    const v=fieldValue(c,k);if(!String(v).trim())continue;
    if(k==='chineseWord'||k==='koreanMeaning')out.push(`<div class="face-primary ${k==='chineseWord'?'zh':'ko'}">${esc(v)}</div>`);
    else if(k==='pinyin')out.push(`<div class="face-pinyin">${esc(v)}</div>`);
    else if(k==='chineseExample'||k==='koreanExample')out.push(`<div class="face-example ${k==='chineseExample'?'zh':'ko'}">${esc(v)}</div>`);
    else out.push(`<span class="face-meta">${esc(v)}</span>`);
  }
  return out.join('')||'<div class="muted">표시할 정보가 없습니다. 설정에서 필드를 선택하세요.</div>';
}
function currentStudySide(){return studyFlipped?'back':'front'}
function studySpeechTarget(c,kind){const fields=sideFields(currentStudySide());if(kind==='word'){if(fields.includes('koreanMeaning')&&c.koreanMeaning)return{text:c.koreanMeaning,lang:'ko-KR'};if(fields.includes('chineseWord')&&c.chineseWord)return{text:c.chineseWord,lang:settings.ttsLocale};if(c.chineseWord)return{text:c.chineseWord,lang:settings.ttsLocale};if(c.koreanMeaning)return{text:c.koreanMeaning,lang:'ko-KR'}}else{if(fields.includes('koreanExample')&&c.koreanExample)return{text:c.koreanExample,lang:'ko-KR'};if(fields.includes('chineseExample')&&c.chineseExample)return{text:c.chineseExample,lang:settings.ttsLocale};if(c.chineseExample)return{text:c.chineseExample,lang:settings.ttsLocale};if(c.koreanExample)return{text:c.koreanExample,lang:'ko-KR'}}return{text:'',lang:'zh-CN'}}
function chooseVoice(lang){const vs=speechSynthesis?.getVoices?.()||[];return vs.find(v=>v.lang.toLowerCase()===String(lang).toLowerCase())||vs.find(v=>v.lang.toLowerCase().startsWith(String(lang).slice(0,2).toLowerCase()))||null}
function speakByLang(text,lang,opts={}){if(!settings.ttsEnabled||!text||!('speechSynthesis'in window))return null;if(opts.cancel!==false)speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.rate=Number(settings.ttsRate)||1;const v=chooseVoice(lang);if(v)u.voice=v;if(opts.onend)u.onend=opts.onend;if(opts.onerror)u.onerror=opts.onerror;speechSynthesis.speak(u);return u}

let studyQueue=[],studyIndex=0,studyFlipped=false,studyRepeatEnabled=false,studyRepeatKind=null,studyRepeatTimer=null,studyRepeatRunId=0;const STUDY_REPEAT_INTERVAL_MS=3000;
function syncStudyRepeatUI(){const wordActive=studyRepeatKind==='word',exampleActive=studyRepeatKind==='example';$('repeatStatusToggle').checked=studyRepeatEnabled;for(const [kind,active] of [['Word',wordActive],['Example',exampleActive]]){const icon=$(`speak${kind}Icon`),label=$(`speak${kind}Label`),btn=$(`speak${kind}Btn`);if(icon){icon.textContent=active?'':(kind==='Word'?'🔊':'▶');icon.classList.toggle('pause-like',active)}if(label)label.textContent=active?(kind==='Word'?'단어 재생중':'예문 재생중'):(kind==='Word'?'단어 듣기':'예문 듣기');if(btn)btn.classList.toggle('is-repeating',active)}}
function stopStudyRepeat(cancel=true){studyRepeatRunId++;studyRepeatKind=null;clearTimeout(studyRepeatTimer);studyRepeatTimer=null;if(cancel&&'speechSynthesis'in window)speechSynthesis.cancel();syncStudyRepeatUI()}
function startStudyRepeat(kind){if(!studyRepeatEnabled)return;const c=studyQueue[studyIndex];if(!c)return;const target=studySpeechTarget(c,kind);if(!target.text)return toast('읽을 내용이 없습니다.');stopStudyRepeat(true);studyRepeatKind=kind;const run=++studyRepeatRunId;syncStudyRepeatUI();const cycle=()=>{if(!studyRepeatEnabled||studyRepeatKind!==kind||run!==studyRepeatRunId)return;speakByLang(target.text,target.lang,{cancel:false,onend:()=>{if(studyRepeatEnabled&&studyRepeatKind===kind&&run===studyRepeatRunId)studyRepeatTimer=setTimeout(cycle,STUDY_REPEAT_INTERVAL_MS)}})};cycle()}
function playStudy(kind){if(studyRepeatKind===kind)return stopStudyRepeat(true);const c=studyQueue[studyIndex];if(!c)return;const target=studySpeechTarget(c,kind);if(!target.text)return toast('읽을 내용이 없습니다.');if(studyRepeatEnabled)startStudyRepeat(kind);else speakByLang(target.text,target.lang)}

function showStudyCard(){const c=studyQueue[studyIndex];if(!c)return;$('cardSideLabel').textContent=studyFlipped?'뒷면':'앞면';$('cardMain').innerHTML=renderCardSide(c,currentStudySide());$('studyPosition').textContent=`${studyIndex+1} / ${studyQueue.length}`;$('ratingBtns').classList.toggle('hidden',!studyFlipped);$('memoryStatusToggle').checked=c.memoryUnknown!==false;$('memoryStatusText').textContent=c.memoryUnknown!==false?'모름':'암기완료';const w=studySpeechTarget(c,'word'),e=studySpeechTarget(c,'example');$('speakWordBtn').disabled=!w.text;$('speakExampleBtn').disabled=!e.text;syncStudyRepeatUI()}
function refreshStudy(force=true){renderStudyFilter();const filter=$('studyDeckFilter')?.value||'__all',due=dueCards(filter);$('dueSummary').textContent=`오늘복습 ${due.length}장 · 전체 ${state.cards.filter(c=>inStudyFilter(c,filter)).length}장`;$('heroDue').textContent=due.length;$('studyEmpty').classList.toggle('hidden',due.length>0);$('studyArea').classList.toggle('hidden',due.length===0);if(force||!studyQueue.length)studyQueue=shuffle(due);studyIndex=Math.min(studyIndex,Math.max(0,studyQueue.length-1));studyFlipped=false;if(studyQueue.length)showStudyCard()}
function navigateStudyCard(dir){stopStudyRepeat(true);if(!studyQueue.length)return;const ni=studyIndex+(dir==='next'?1:-1);if(ni<0)return toast('첫 번째 카드입니다.');if(ni>=studyQueue.length)return toast('마지막 카드입니다.');studyIndex=ni;studyFlipped=false;showStudyCard()}
function schedule(c,rate){let interval=Math.max(0,c.interval||0),ease=Math.max(1.3,c.ease||2.5),reps=c.reps||0;if(rate==='again'){interval=0;c.lapses=(c.lapses||0)+1;ease=Math.max(1.3,ease-.2);c.wrongCount=(c.wrongCount||0)+1;c.memoryUnknown=true}else if(rate==='hard'){interval=reps===0?1:Math.max(1,interval*1.2);ease=Math.max(1.3,ease-.15);reps++}else if(rate==='good'){interval=reps===0?1:reps===1?3:Math.max(2,interval*ease);reps++}else{interval=reps===0?3:reps===1?6:Math.max(4,interval*ease*1.3);ease+=.15;reps++;c.memoryUnknown=false}c.ease=+ease.toFixed(2);c.interval=Math.round(interval);c.reps=reps;c.reviews=(c.reviews||0)+1;c.lastReviewed=todayISO();c.due=rate==='again'?todayISO():addDays(c.interval);state.reviewHistory.push({date:new Date().toISOString(),cardId:c.id,rate});persist()}

let swipe={active:false,pointerId:null,x:0,y:0,lastX:0,lastY:0,axis:null,suppress:false,startedAt:0};const cardEl=$('flashcard');
const SWIPE_DISTANCE_PX=35;
const SWIPE_FAST_DISTANCE_PX=22;
const SWIPE_VELOCITY_PX_MS=.45;
function resetSwipeVisual(){
  cardEl.classList.remove('swiping');
  cardEl.style.transform='';
}
function suppressCardClick(ms=320){
  swipe.suppress=true;
  clearTimeout(suppressCardClick._t);
  suppressCardClick._t=setTimeout(()=>{swipe.suppress=false},ms);
}
function swipeStartPointer(e){
  if(e.isPrimary===false)return;
  if(e.pointerType==='mouse'&&e.button!==0)return;
  swipe.active=true;
  swipe.pointerId=e.pointerId;
  swipe.x=swipe.lastX=e.clientX;
  swipe.y=swipe.lastY=e.clientY;
  swipe.axis=null;
  swipe.startedAt=performance.now();
  cardEl.classList.add('swiping');
  try{cardEl.setPointerCapture(e.pointerId)}catch(_){ }
}
function swipeMovePointer(e){
  if(!swipe.active||e.pointerId!==swipe.pointerId)return;
  const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;
  swipe.lastX=e.clientX;swipe.lastY=e.clientY;
  const ax=Math.abs(dx),ay=Math.abs(dy);
  if(!swipe.axis){
    if(ax<6&&ay<6)return;
    swipe.axis=ax>=ay?'x':'y';
  }
  if(swipe.axis!=='x')return;
  if(e.cancelable)e.preventDefault();
  const limit=Math.min(150,Math.max(95,cardEl.clientWidth*.42));
  const d=Math.max(-limit,Math.min(limit,dx));
  cardEl.style.transform=`translate3d(${d}px,0,0) rotate(${d/42}deg)`;
}
function swipeEndPointer(e){
  if(!swipe.active||e.pointerId!==swipe.pointerId)return;
  const endX=Number.isFinite(e.clientX)?e.clientX:swipe.lastX;
  const endY=Number.isFinite(e.clientY)?e.clientY:swipe.lastY;
  const dx=endX-swipe.x,dy=endY-swipe.y;
  const elapsed=Math.max(1,performance.now()-swipe.startedAt);
  const velocity=dx/elapsed;
  const horizontalEnough=Math.abs(dx)>=Math.abs(dy)*.8;
  const farEnough=Math.abs(dx)>=SWIPE_DISTANCE_PX;
  const fastEnough=Math.abs(dx)>=SWIPE_FAST_DISTANCE_PX&&Math.abs(velocity)>=SWIPE_VELOCITY_PX_MS;
  const shouldNavigate=swipe.axis==='x'&&horizontalEnough&&(farEnough||fastEnough);
  if(Math.abs(dx)>10)suppressCardClick();
  swipe.active=false;
  swipe.pointerId=null;
  resetSwipeVisual();
  if(shouldNavigate)navigateStudyCard(dx<0?'next':'prev');
  try{if(cardEl.hasPointerCapture?.(e.pointerId))cardEl.releasePointerCapture(e.pointerId)}catch(_){ }
}
function swipeCancelPointer(e){
  if(!swipe.active)return;
  if(e&&swipe.pointerId!==null&&e.pointerId!==swipe.pointerId)return;
  swipe.active=false;
  swipe.pointerId=null;
  resetSwipeVisual();
}
if(window.PointerEvent){
  cardEl.addEventListener('pointerdown',swipeStartPointer);
  cardEl.addEventListener('pointermove',swipeMovePointer,{passive:false});
  cardEl.addEventListener('pointerup',swipeEndPointer);
  cardEl.addEventListener('pointercancel',swipeCancelPointer);
  cardEl.addEventListener('lostpointercapture',e=>{if(swipe.active&&e.pointerId===swipe.pointerId)swipeCancelPointer(e)});
}else{
  /* Fallback for older WebViews */
  cardEl.addEventListener('touchstart',e=>{const t=e.touches[0];if(!t)return;swipeStartPointer({isPrimary:true,pointerType:'touch',pointerId:1,clientX:t.clientX,clientY:t.clientY,button:0})},{passive:true});
  cardEl.addEventListener('touchmove',e=>{const t=e.touches[0];if(!t)return;swipeMovePointer({pointerId:1,clientX:t.clientX,clientY:t.clientY,cancelable:e.cancelable,preventDefault:()=>e.preventDefault()})},{passive:false});
  cardEl.addEventListener('touchend',e=>{const t=e.changedTouches[0];if(!t)return;swipeEndPointer({pointerId:1,clientX:t.clientX,clientY:t.clientY})},{passive:true});
  cardEl.addEventListener('touchcancel',()=>swipeCancelPointer({pointerId:1}),{passive:true});
}
cardEl.addEventListener('click',()=>{if(swipe.suppress)return;stopStudyRepeat(true);studyFlipped=!studyFlipped;showStudyCard()});
cardEl.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();cardEl.click()}if(e.key==='ArrowLeft')navigateStudyCard('prev');if(e.key==='ArrowRight')navigateStudyCard('next')});

$('repeatStatusToggle').addEventListener('change',e=>{studyRepeatEnabled=e.target.checked;if(!studyRepeatEnabled)stopStudyRepeat(true);else syncStudyRepeatUI();toast(studyRepeatEnabled?'반복 재생 ON — 3초 간격':'반복 재생 OFF')});$('memoryStatusToggle').addEventListener('change',e=>{const c=studyQueue[studyIndex];if(!c)return;c.memoryUnknown=e.target.checked;$('memoryStatusText').textContent=c.memoryUnknown?'모름':'암기완료';markDirty(c);persist();renderWeakList()});$('speakWordBtn').onclick=()=>playStudy('word');$('speakExampleBtn').onclick=()=>playStudy('example');$('shuffleStudy').onclick=()=>{stopStudyRepeat(true);studyQueue=shuffle(studyQueue);studyIndex=0;studyFlipped=false;showStudyCard()};$('reverseStudy').onclick=()=>{stopStudyRepeat(true);const a=settings.frontFields;settings.frontFields=[...settings.backFields];settings.backFields=[...a];saveSettings();renderFieldOptions();studyFlipped=false;showStudyCard();toast('앞/뒤 구성을 바꿨습니다.')};$('studyDeckFilter').onchange=()=>{stopStudyRepeat(true);studyQueue=[];studyIndex=0;refreshStudy(true)};$('ratingBtns').onclick=e=>{const b=e.target.closest('button[data-rate]');if(!b)return;const c=studyQueue[studyIndex];schedule(c,b.dataset.rate);markDirty(c);if(b.dataset.rate==='again')studyQueue.push(c);studyIndex++;if(studyIndex>=studyQueue.length){toast('오늘의 학습을 마쳤습니다.');studyQueue=[];studyIndex=0;refreshStudy(true)}else{studyFlipped=false;showStudyCard()}renderAll()};

const PAGE_TITLES={study:'오늘의 중국어',weak:'취약단어',quiz:'퀴즈',stats:'통계',settings:'설정',decks:'단어장 · 카드'};
let studyTimerStart=Date.now();
function recordStudyTime(){if(!document.body.classList.contains('study-mode'))return;const sec=Math.max(0,Math.round((Date.now()-studyTimerStart)/1000));state.studySeconds[todayISO()]=(state.studySeconds[todayISO()]||0)+sec;studyTimerStart=Date.now();persist()}
setInterval(recordStudyTime,60000);
function navigate(id){recordStudyTime();stopStudyRepeat(true);stopMemoryQuiz(true);document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));$(id)?.classList.add('active');document.body.classList.toggle('study-mode',id==='study');document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));$('pageTitle').textContent=PAGE_TITLES[id]||'CWordStack';if(id==='study'){studyTimerStart=Date.now();refreshStudy(true)}if(id==='weak')renderWeakList();if(id==='quiz')renderQuizSelectors();if(id==='stats')renderStats();if(id==='decks')renderDeckPanel();window.scrollTo({top:0,behavior:'auto'})}
document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>navigate(b.dataset.tab));document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));$('openDecks').onclick=()=>navigate('decks');$('backToStudy').onclick=()=>navigate('study');

function renderWeakList(){const arr=state.cards.filter(c=>c.memoryUnknown!==false||(c.wrongCount||0)>0);$('weakCount').innerHTML=`<strong>${arr.length}</strong><span>cards</span>`;$('weakList').innerHTML=arr.length?arr.map(c=>`<div class="weak-item"><div><strong>${esc(c.chineseWord)} <small>${esc(c.pinyin)}</small></strong><div><small>${esc(c.koreanMeaning)}</small></div></div><div><small>오답 ${c.wrongCount||0}회</small></div></div>`).join(''):'<div class="empty-state">취약단어가 없습니다.</div>'}

function renderDeckSelectors(){const ds=decks();const opts='<option value="__all">전체 단어장</option>'+ds.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');['deckFilter','quizDeck'].forEach(id=>{const el=$(id);if(!el)return;const prev=el.value;el.innerHTML=opts;if([...el.options].some(o=>o.value===prev))el.value=prev});const mem=$('memoryQuizDeck');if(mem){const p=mem.value;mem.innerHTML=ds.map(d=>`<option value="${esc(d)}">${esc(d)}</option>`).join('');if([...mem.options].some(o=>o.value===p))mem.value=p}}
function updateChapterFilter(){const deck=$('deckFilter').value;const chs=chaptersFor(deck==='__all'?null:deck);$('chapterFilter').innerHTML='<option value="__all">전체 챕터</option>'+chs.map(c=>`<option>${esc(c)}</option>`).join('')}
function filteredCards(){const q=$('searchCards').value.trim().toLowerCase(),deck=$('deckFilter').value,ch=$('chapterFilter').value;return state.cards.filter(c=>(deck==='__all'||c.category===deck)&&(ch==='__all'||c.chapter===ch)&&(!q||[c.chineseWord,c.pinyin,c.partOfSpeech,c.chineseExample,c.koreanMeaning,c.koreanExample,c.tags].join(' ').toLowerCase().includes(q)))}
function renderCards(){const arr=filteredCards();$('cardsTable').innerHTML=arr.map(c=>`<tr><td>${esc(c.chineseWord)}</td><td>${esc(c.pinyin)}</td><td>${esc(c.koreanMeaning)}</td><td>${esc(c.category)}</td><td>${esc(c.chapter)}</td><td><button class="secondary" data-edit="${c.id}">수정</button> <button class="danger" data-del="${c.id}">삭제</button></td></tr>`).join('');$('cardsMobileList').innerHTML=arr.map(c=>`<div class="card-list-item"><strong>${esc(c.chineseWord)} · ${esc(c.pinyin)}</strong><p>${esc(c.koreanMeaning)}</p><small>${esc(c.category)} / ${esc(c.chapter)}</small><div class="row"><button class="secondary" data-edit="${c.id}">수정</button><button class="danger" data-del="${c.id}">삭제</button></div></div>`).join('')}
function renderDeckLibrary(){const ds=decks();$('deckLibrary').innerHTML=ds.length?ds.map(d=>{const arr=state.cards.filter(c=>c.category===d),learned=arr.filter(c=>c.memoryUnknown===false).length;return `<div class="deck-item"><div><strong>📘 ${esc(d)}</strong><small>${arr.length}장 · 암기완료 ${learned}장</small></div><strong>${arr.length}</strong></div>`}).join(''):'<div class="empty-state">단어장이 없습니다.</div>'}
function renderDeckPanel(){renderDeckSelectors();updateChapterFilter();renderCards();renderDeckLibrary()}
['searchCards','deckFilter','chapterFilter'].forEach(id=>$(id).addEventListener(id==='searchCards'?'input':'change',()=>{if(id==='deckFilter')updateChapterFilter();renderCards()}));
function editCard(id){const c=state.cards.find(x=>x.id===id);if(!c)return;$('editCardId').value=id;$('chineseWordInput').value=c.chineseWord;$('pinyinInput').value=c.pinyin;$('partOfSpeechInput').value=c.partOfSpeech;$('chineseExampleInput').value=c.chineseExample;$('koreanMeaningInput').value=c.koreanMeaning;$('koreanExampleInput').value=c.koreanExample;$('deckInput').value=c.category;$('chapterInput').value=c.chapter;$('tagsInput').value=c.tags;$('cardFormTitle').textContent='카드 수정';$('cancelEdit').classList.remove('hidden');window.scrollTo({top:0,behavior:'smooth'})}
function deleteCard(id){const c=state.cards.find(x=>x.id===id);if(!c||!confirm(`'${c.chineseWord}' 카드를 삭제할까요?`))return;state.deletedKeys.push(cardKey(c));state.cards=state.cards.filter(x=>x.id!==id);persist();renderAll();renderDeckPanel()}
$('cardsTable').onclick=$('cardsMobileList').onclick=e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-del]');if(edit)editCard(edit.dataset.edit);if(del)deleteCard(del.dataset.del)};
$('cardForm').onsubmit=e=>{e.preventDefault();const id=$('editCardId').value;const old=state.cards.find(c=>c.id===id);const c=normalizeCard({...(old||{}),id:id||uid(),chineseWord:$('chineseWordInput').value,pinyin:$('pinyinInput').value,partOfSpeech:$('partOfSpeechInput').value,chineseExample:$('chineseExampleInput').value,koreanMeaning:$('koreanMeaningInput').value,koreanExample:$('koreanExampleInput').value,category:$('deckInput').value,chapter:$('chapterInput').value,tags:$('tagsInput').value});if(!c.chineseWord||!c.koreanMeaning)return toast('중국어 단어와 한국어 뜻은 필수입니다.');if(old)Object.assign(old,c);else state.cards.push(c);markDirty(c);persist();resetCardForm();renderAll();renderDeckPanel();toast(id?'카드를 수정했습니다.':'카드를 추가했습니다.')};
function resetCardForm(){$('cardForm').reset();$('editCardId').value='';$('deckInput').value='기본 단어장';$('cardFormTitle').textContent='카드 추가';$('cancelEdit').classList.add('hidden')}$('cancelEdit').onclick=resetCardForm;

function rowsForExport(cards){return cards.map(c=>({ChineseWord:c.chineseWord,Pinyin:c.pinyin,PartOfSpeech:c.partOfSpeech,ChineseExample:c.chineseExample,KoreanMeaning:c.koreanMeaning,KoreanExample:c.koreanExample,Category:c.category,Chapter:c.chapter,Tags:c.tags}))}
function exportCardsExcel(cards,filename){if(!window.XLSX)return toast('Excel 모듈을 불러오지 못했습니다.');const wb=XLSX.utils.book_new(),ws=XLSX.utils.json_to_sheet(rowsForExport(cards));XLSX.utils.book_append_sheet(wb,ws,'Flashcards');XLSX.writeFile(wb,filename)}
$('exportExcel').onclick=()=>exportCardsExcel(filteredCards(),'cwordstack_filtered.xlsx');$('exportDbExcel').onclick=$('exportDbExcelSettings').onclick=()=>exportCardsExcel(state.cards,'cwordstack_word_db.xlsx');
$('importExcel').onclick=async()=>{const f=$('excelInput').files[0];if(!f)return toast('Excel 파일을 선택하세요.');if(!window.XLSX)return toast('Excel 모듈을 불러오지 못했습니다.');const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(ws,{defval:''});let added=0;for(const r of rows){const c=normalizeCard({chineseWord:r.ChineseWord||r['중국어단어']||r['중국어 단어'],pinyin:r.Pinyin||r['병음'],partOfSpeech:r.PartOfSpeech||r.POS||r['품사'],chineseExample:r.ChineseExample||r['중국어예문']||r['중국어 예문'],koreanMeaning:r.KoreanMeaning||r['한국어뜻']||r['한국어 뜻'],koreanExample:r.KoreanExample||r['한국어예문']||r['한국어 예문'],category:r.Category||r['단어장']||'기본 단어장',chapter:r.Chapter||r['챕터']||'',tags:r.Tags||r['태그']||''});if(!c.chineseWord||!c.koreanMeaning)continue;const ex=state.cards.find(x=>cardKey(x)===cardKey(c));if(ex)Object.assign(ex,c);else state.cards.push(c);markDirty(c);added++}persist();renderAll();renderDeckPanel();toast(`${added}개 행을 반영했습니다.`)};

function renderQuizSelectors(){renderDeckSelectors();updateQuizChapters();renderMemoryQuizFilters()}
function updateQuizChapters(){const d=$('quizDeck').value,chs=chaptersFor(d==='__all'?null:d);$('quizChapter').innerHTML='<option value="__all">전체 챕터</option>'+chs.map(c=>`<option>${esc(c)}</option>`).join('')}
$('quizDeck').onchange=updateQuizChapters;
let quizQueue=[],quizIndex=0,quizScore=0,quizAnswered=false;
function quizSource(){const d=$('quizDeck').value,ch=$('quizChapter').value;return state.cards.filter(c=>(d==='__all'||c.category===d)&&(ch==='__all'||c.chapter===ch))}
function makeQuestion(c){let direction=$('quizDirection').value;if(direction==='mixed')direction=Math.random()<.5?'cn-ko':'ko-cn';let type=$('quizType').value;if(type==='mixed')type=Math.random()<.5?'mcq':'subjective';const prompt=direction==='cn-ko'?c.chineseWord:c.koreanMeaning,answer=direction==='cn-ko'?c.koreanMeaning:c.chineseWord;return {card:c,direction,type,prompt,answer}}
function renderQuestion(){const q=quizQueue[quizIndex];if(!q)return;$('quizProgress').textContent=`${quizIndex+1} / ${quizQueue.length}`;$('quizScore').textContent=`${quizScore}점`;$('quizPrompt').innerHTML=`${esc(q.prompt)}${q.direction==='cn-ko'&&q.card.pinyin?`<div class="face-pinyin">${esc(q.card.pinyin)}</div>`:''}`;$('quizFeedback').textContent='';$('quizNext').classList.add('hidden');quizAnswered=false;if(q.type==='mcq'){const pool=quizSource().map(c=>q.direction==='cn-ko'?c.koreanMeaning:c.chineseWord).filter(x=>x&&x!==q.answer);const opts=shuffle([q.answer,...shuffle(pool).slice(0,3)]);$('quizAnswerArea').innerHTML=`<div class="quiz-options">${opts.map(o=>`<button data-answer="${esc(o)}">${esc(o)}</button>`).join('')}</div>`}else $('quizAnswerArea').innerHTML='<div class="row"><input id="subjectiveAnswer" placeholder="정답 입력"><button id="submitSubjective" class="primary" type="button">확인</button></div>';}
function gradeQuiz(ans){if(quizAnswered)return;quizAnswered=true;const q=quizQueue[quizIndex],ok=String(ans).trim().toLowerCase()===String(q.answer).trim().toLowerCase();if(ok){quizScore++;$('quizFeedback').textContent='정답입니다.'}else{q.card.wrongCount=(q.card.wrongCount||0)+1;q.card.memoryUnknown=true;markDirty(q.card);$('quizFeedback').textContent=`정답: ${q.answer}`}persist();$('quizNext').classList.remove('hidden')}
$('startQuiz').onclick=()=>{const src=quizSource();if(src.length<2)return toast('퀴즈용 카드가 2장 이상 필요합니다.');quizQueue=shuffle(src).slice(0,Math.min(Number($('quizCount').value)||20,src.length)).map(makeQuestion);quizIndex=0;quizScore=0;$('quizSetup').classList.add('hidden');$('quizResult').classList.add('hidden');$('quizRun').classList.remove('hidden');renderQuestion()};$('quizAnswerArea').onclick=e=>{const b=e.target.closest('[data-answer]');if(b)gradeQuiz(b.dataset.answer);if(e.target.id==='submitSubjective')gradeQuiz($('subjectiveAnswer').value)};$('quizAnswerArea').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='subjectiveAnswer')gradeQuiz(e.target.value)});$('quizNext').onclick=()=>{quizIndex++;if(quizIndex>=quizQueue.length){const pct=Math.round(quizScore/quizQueue.length*100);state.quizHistory.push({date:new Date().toISOString(),score:pct,count:quizQueue.length});persist();$('quizRun').classList.add('hidden');$('quizResult').classList.remove('hidden');$('quizResult').innerHTML=`<h3>퀴즈 완료</h3><p><strong>${quizScore} / ${quizQueue.length}</strong> · ${pct}점</p><button id="quizRestart" class="primary" type="button">다시 하기</button>`;$('quizRestart').onclick=()=>{$('quizResult').classList.add('hidden');$('quizSetup').classList.remove('hidden')};renderAll()}else renderQuestion()};

$('normalQuizTab').onclick=()=>{$('normalQuizTab').classList.add('active');$('memoryQuizTab').classList.remove('active');$('normalQuizPanel').classList.remove('hidden');$('memoryQuizPanel').classList.add('hidden');stopMemoryQuiz(true)};$('memoryQuizTab').onclick=()=>{$('memoryQuizTab').classList.add('active');$('normalQuizTab').classList.remove('active');$('memoryQuizPanel').classList.remove('hidden');$('normalQuizPanel').classList.add('hidden');renderMemoryQuizFilters()};
let memoryListMode='word',memoryLanguageMode=settings.memoryQuizLanguage==='cn'?'cn':'kr',memoryQuizRunning=false,memoryQuizTimer=null,memoryQuizRunId=0;
function memoryChapterOptions(){const d=$('memoryQuizDeck').value,chs=chaptersFor(d);const p=$('memoryQuizChapter').value;$('memoryQuizChapter').innerHTML='<option value="__all">전체 챕터</option>'+chs.map(c=>`<option>${esc(c)}</option>`).join('');if([...$('memoryQuizChapter').options].some(o=>o.value===p))$('memoryQuizChapter').value=p}
function memoryCards(){const d=$('memoryQuizDeck').value,ch=$('memoryQuizChapter').value;return state.cards.filter(c=>c.category===d&&(ch==='__all'||c.chapter===ch))}
function memoryField(){if(memoryLanguageMode==='cn')return memoryListMode==='word'?'chineseWord':'chineseExample';return memoryListMode==='word'?'koreanMeaning':'koreanExample'}
function memoryItems(){const f=memoryField();return memoryCards().map(c=>String(c[f]||'').trim()).filter(Boolean)}
function renderMemoryLanguage(){const cn=memoryLanguageMode==='cn';$('memoryKrMode').classList.toggle('active',!cn);$('memoryCnMode').classList.toggle('active',cn);$('memoryQuizDescription').textContent=cn?'중국어를 듣고 한국어 뜻이나 문장으로 즉시 답하는 훈련입니다.':'한국어를 듣고 중국어 단어나 문장으로 즉시 답하는 훈련입니다.';$('memoryWordListTab').textContent=cn?'중국어 단어 목록':'한국어 단어 목록';$('memoryExampleListTab').textContent=cn?'중국어 예문 목록':'한국어 예문 목록';$('memoryTableHeading').textContent=cn?(memoryListMode==='word'?'중국어 단어':'중국어 예문'):(memoryListMode==='word'?'한국어 단어':'한국어 예문')}
function renderMemoryTable(){renderMemoryLanguage();const items=memoryItems();$('memoryQuizTable').innerHTML=items.map((t,i)=>`<tr><td class="num-col">${i+1}</td><td>${esc(t)}</td></tr>`).join('')||'<tr><td colspan="2">표시할 데이터가 없습니다.</td></tr>'}
function renderMemoryQuizFilters(){renderDeckSelectors();memoryChapterOptions();renderMemoryTable();$('memoryQuizStatus').textContent=`대기 중 · 발화간격 ${settings.memoryInterval}초`}
function setMemoryLanguage(m){stopMemoryQuiz(true);memoryLanguageMode=m;settings.memoryQuizLanguage=m;saveSettings();renderMemoryTable()}
$('memoryKrMode').onclick=()=>setMemoryLanguage('kr');$('memoryCnMode').onclick=()=>setMemoryLanguage('cn');$('memoryWordListTab').onclick=()=>{stopMemoryQuiz(true);memoryListMode='word';$('memoryWordListTab').classList.add('active');$('memoryExampleListTab').classList.remove('active');renderMemoryTable()};$('memoryExampleListTab').onclick=()=>{stopMemoryQuiz(true);memoryListMode='example';$('memoryExampleListTab').classList.add('active');$('memoryWordListTab').classList.remove('active');renderMemoryTable()};$('memoryQuizDeck').onchange=()=>{stopMemoryQuiz(true);memoryChapterOptions();renderMemoryTable()};$('memoryQuizChapter').onchange=()=>{stopMemoryQuiz(true);renderMemoryTable()};
function stopMemoryQuiz(cancel=true){memoryQuizRunId++;memoryQuizRunning=false;clearTimeout(memoryQuizTimer);memoryQuizTimer=null;if(cancel&&'speechSynthesis'in window)speechSynthesis.cancel();if($('memoryQuizStatus'))$('memoryQuizStatus').textContent=`대기 중 · 발화간격 ${settings.memoryInterval}초`}
function startMemory(mode){stopMemoryQuiz(true);memoryListMode=mode;renderMemoryTable();const items=memoryItems();if(!items.length)return toast('읽을 항목이 없습니다.');memoryQuizRunning=true;const run=++memoryQuizRunId;let i=0;const next=()=>{if(!memoryQuizRunning||run!==memoryQuizRunId)return;if(i>=items.length){memoryQuizRunning=false;$('memoryQuizStatus').textContent='전체 목록 발화 완료';return}const text=items[i],prefix=memoryLanguageMode==='cn'?`第${i+1}个。`:`${i+1}번. `;$('memoryQuizStatus').textContent=`재생 중 ${i+1} / ${items.length}`;speakByLang(prefix+text,memoryLanguageMode==='cn'?settings.ttsLocale:'ko-KR',{onend:()=>{i++;if(memoryQuizRunning&&run===memoryQuizRunId)memoryQuizTimer=setTimeout(next,(Number(settings.memoryInterval)||5)*1000)}})};next()}
$('startMemoryWord').onclick=()=>startMemory('word');$('startMemoryExample').onclick=()=>startMemory('example');$('stopMemoryQuiz').onclick=()=>stopMemoryQuiz(true);

function renderFieldOptions(){for(const [side,id] of [['front','frontFields'],['back','backFields']]){const chosen=sideFields(side);$(id).innerHTML=Object.entries(FIELD_DEFS).map(([k,d])=>`<label class="field-check"><input type="checkbox" value="${k}" ${chosen.includes(k)?'checked':''}><span>${d.label}</span></label>`).join('');$(id).querySelectorAll('input').forEach(inp=>inp.onchange=()=>{const vals=[...$(id).querySelectorAll('input:checked')].map(x=>x.value);if(!vals.length){inp.checked=true;return toast('최소 1개 필드는 선택해야 합니다.')}if(side==='front')settings.frontFields=vals;else settings.backFields=vals;saveSettings();if(studyQueue.length)showStudyCard()})}}
function renderSettings(){$('ttsEnabled').checked=settings.ttsEnabled;$('ttsLocale').value=settings.ttsLocale;$('ttsRate').value=String(settings.ttsRate);$('googleClientId').value=settings.googleClientId;$('googleSheetUrl').value=settings.googleSheetUrl;$('memoryInterval').innerHTML=Array.from({length:9},(_,i)=>i+2).map(n=>`<option value="${n}" ${n===Number(settings.memoryInterval)?'selected':''}>${n}초</option>`).join('');renderFieldOptions()}
$('ttsEnabled').onchange=e=>{settings.ttsEnabled=e.target.checked;saveSettings()};$('ttsLocale').onchange=e=>{settings.ttsLocale=e.target.value;saveSettings()};$('ttsRate').onchange=e=>{settings.ttsRate=Number(e.target.value);saveSettings()};$('memoryInterval').onchange=e=>{settings.memoryInterval=Number(e.target.value);saveSettings();stopMemoryQuiz(true)};$('saveGoogleSettings').onclick=()=>{settings.googleClientId=$('googleClientId').value.trim();settings.googleSheetUrl=$('googleSheetUrl').value.trim();saveSettings();toast('Google 연결 정보를 저장했습니다.')};$('openGoogleSheet').onclick=()=>{if(!settings.googleSheetUrl)return toast('Google Sheet URL을 입력하세요.');window.open(settings.googleSheetUrl,'_blank','noopener')};

function renderStats(){const today=todayISO(),todayReviews=state.reviewHistory.filter(r=>String(r.date).slice(0,10)===today).length,learned=state.cards.filter(c=>c.memoryUnknown===false).length,weak=state.cards.filter(c=>c.memoryUnknown!==false||(c.wrongCount||0)>0).length,days=Object.keys(state.studySeconds).filter(k=>(state.studySeconds[k]||0)>0).length;$('statsGrid').innerHTML=[['전체 카드',state.cards.length],['암기완료',learned],['취약단어',weak],['오늘 복습',todayReviews],['학습일',days],['오늘 학습',Math.round((state.studySeconds[today]||0)/60)+'분']].map(([a,b])=>`<div class="stat"><span>${a}</span><strong>${b}</strong></div>`).join('');const years=[...new Set([new Date().getFullYear(),...Object.keys(state.studySeconds).map(k=>Number(k.slice(0,4)))])].sort((a,b)=>b-a);$('statsYear').innerHTML=years.map(y=>`<option>${y}</option>`).join('');renderMonthChart();$('statsYear').onchange=renderMonthChart;$('deckStats').innerHTML=decks().map(d=>{const arr=state.cards.filter(c=>c.category===d),done=arr.filter(c=>c.memoryUnknown===false).length;return `<div class="deck-item"><div><strong>${esc(d)}</strong><small>${done}/${arr.length} 암기완료</small></div><strong>${arr.length?Math.round(done/arr.length*100):0}%</strong></div>`}).join('')}
function renderMonthChart(){const y=Number($('statsYear').value)||new Date().getFullYear();const vals=Array.from({length:12},(_,m)=>Object.entries(state.studySeconds).filter(([d])=>Number(d.slice(0,4))===y&&Number(d.slice(5,7))===m+1).reduce((s,[,v])=>s+v,0)/60);const max=Math.max(1,...vals);$('monthChart').innerHTML=vals.map((v,i)=>`<div class="month-col"><small>${Math.round(v)}</small><div class="month-bar" style="height:${Math.max(2,v/max*130)}px"></div><small>${i+1}월</small></div>`).join('')}

$('backupJson').onclick=()=>{const blob=new Blob([JSON.stringify({state,settings},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='cwordstack_backup.json';a.click();URL.revokeObjectURL(a.href)};$('restoreJson').onchange=async e=>{try{const data=JSON.parse(await e.target.files[0].text());if(!data.state?.cards)throw new Error();state={...defaultState(),...data.state};settings={...defaultSettings(),...(data.settings||{})};state.cards=state.cards.map(normalizeCard);persist();saveSettings();renderAll();toast('백업을 복원했습니다.')}catch{toast('올바른 백업 파일이 아닙니다.')}};$('resetData').onclick=()=>{if(!confirm('CWordStack의 모든 로컬 데이터를 초기화할까요?'))return;localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(SETTINGS_KEY);location.reload()};

function renderAll(){updateStudyActualDate();renderStudyFilter();renderDeckSelectors();renderWeakList();renderSettings();if(document.body.classList.contains('study-mode'))refreshStudy(false)}
window.CWordStack={state:()=>state,settings:()=>settings,setState:s=>{state=s;persist();renderAll()},persist,normalizeCard,cardKey,markDirty,renderAll,rowsForExport,toast};

if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
renderAll();refreshStudy(true);
