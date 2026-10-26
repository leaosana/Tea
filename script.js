const $ = (s, root=document)=>root.querySelector(s);
const $$ = (s, root=document)=>[...root.querySelectorAll(s)];
const val = id => ($(("#"+id))?.value || "").trim();

const state={
  editingId:null, photo:"",
  ratings:{aromaIntensity:0,sweet:0,bitter:0,astringency:0,umami:0,nutty:0,tasteIntensity:0,overall:0},
  tags:{aroma:[],firstAroma:[],coolAroma:[],afterAroma:[],afterTaste:[],situations:[]},
  choices:{afterLength:"보통",preference:"○",again:"보통"},
  sliders:{body:50,texture:50,finish:50}
};

const aromaOptions=["풀향","꽃향","과일향","달콤한 향","구수한 향","고소한 향","나무향","허브향","바다향","스모키향","향신료향","견과류향","곡물향","꿀향","건초향","기타"];
const tasteOptions=["단맛","쌉쌀함","떫은맛","감칠맛","고소함","과일맛","꽃맛","구수함","나무맛","향신료","꿀맛","곡물맛","기타"];
const situationOptions=["아침","공부할 때","식후","밤","손님과 함께","여행 중","혼자 쉬는 시간","디저트와 함께","비 오는 날","기타"];

function getRecords(){return JSON.parse(localStorage.getItem("teaRecords")||"[]")}
function setRecords(x){localStorage.setItem("teaRecords",JSON.stringify(x))}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

function renderTags(id,items,key){
  const box=$("#"+id);
  box.innerHTML=items.map(x=>`<button type="button" class="tag ${state.tags[key].includes(x)?"selected":""}" data-tag="${esc(x)}">${esc(x)}</button>`).join("");
  $$(".tag",box).forEach(b=>b.addEventListener("click",()=>{
    const t=b.dataset.tag, arr=state.tags[key];
    if(arr.includes(t)) state.tags[key]=arr.filter(x=>x!==t); else arr.push(t);
    b.classList.toggle("selected");
  }));
}
renderTags("aromaTags",aromaOptions,"aroma");
renderTags("firstAromaTags",aromaOptions,"firstAroma");
renderTags("coolAromaTags",aromaOptions,"coolAroma");
renderTags("afterAromaTags",aromaOptions,"afterAroma");
renderTags("afterTasteTags",tasteOptions,"afterTaste");
renderTags("situations",situationOptions,"situations");

function renderStars(el,key){
  const rating=state.ratings[key]||0;
  el.innerHTML="";
  for(let i=1;i<=5;i++){
    const s=document.createElement("span");
    s.className="star "+(rating>=i?"full":rating>=i-.5?"half":"");
    s.textContent="★";
    s.title=`${Math.max(0,Math.min(5,i-.5))}점 또는 ${i}점`;
    s.addEventListener("click",e=>{
      const rect=s.getBoundingClientRect();
      const half=e.clientX-rect.left<rect.width/2;
      state.ratings[key]=half?i-.5:i;
      renderStars(el,key);
    });
    el.appendChild(s);
  }
}
$$(".stars").forEach(x=>renderStars(x,x.dataset.rating));

$$(".choices").forEach(box=>{
  $$(".choices button",box).forEach(b=>b.addEventListener("click",()=>{
    state.choices[box.dataset.choice]=b.dataset.value||b.textContent.trim();
    $$(".choices button",box).forEach(x=>x.classList.remove("selected"));
    b.classList.add("selected");
  }));
});
$$("[data-slider]").forEach(s=>s.addEventListener("input",()=>state.sliders[s.dataset.slider]=Number(s.value)));

const photoInput=$("#teaPhoto"), preview=$("#photoPreview"), placeholder=$("#photoPlaceholder"), removePhoto=$("#removePhoto");
$("#photoDrop").addEventListener("click",e=>{if(e.target.closest("#removePhoto"))return;photoInput.click()});
photoInput.addEventListener("change",()=>{
  const f=photoInput.files?.[0]; if(!f)return;
  const reader=new FileReader();
  reader.onload=()=>{state.photo=reader.result;preview.src=state.photo;preview.hidden=false;placeholder.hidden=true;removePhoto.hidden=false};
  reader.readAsDataURL(f);
});
removePhoto.addEventListener("click",e=>{e.stopPropagation();state.photo="";photoInput.value="";preview.hidden=true;placeholder.hidden=false;removePhoto.hidden=true});

function collect(){
  return {
    id:state.editingId||crypto.randomUUID(), name:val("teaName"), type:val("teaType"),
    form:$('input[name="form"]:checked')?.value||"잎차", price:val("price"), totalPrice:val("totalPrice"),
    store:val("store"), date:val("date"), photo:state.photo, ratings:{...state.ratings},
    tags:JSON.parse(JSON.stringify(state.tags)), choices:{...state.choices}, sliders:{...state.sliders},
    oneLine:val("oneLine"), memo:val("memo")
  };
}

$("#saveRecord").addEventListener("click",()=>{
  const r=collect();
  if(!r.name){alert("차 이름을 입력해주세요.");$("#teaName").focus();return}
  const all=getRecords(), idx=all.findIndex(x=>x.id===r.id);
  if(idx>=0)all[idx]=r;else all.unshift(r);
  setRecords(all); alert("차 기록이 저장되었습니다."); resetForm(); state.editingId=null; renderAll(); switchView("records");
});

function resetForm(){
  ["teaName","store","price","totalPrice","oneLine","memo"].forEach(id=>$("#"+id).value="");
  $("#teaType").value=""; $("#date").value=new Date().toISOString().slice(0,10);
  $('input[name="form"][value="잎차"]').checked=true;
  state.ratings=Object.fromEntries(Object.keys(state.ratings).map(k=>[k,0]));
  Object.keys(state.tags).forEach(k=>state.tags[k]=[]);
  state.choices={afterLength:"보통",preference:"○",again:"보통"};
  state.sliders={body:50,texture:50,finish:50};state.photo="";
  preview.hidden=true;placeholder.hidden=false;removePhoto.hidden=true;photoInput.value="";
  $$(".stars").forEach(el=>renderStars(el,el.dataset.rating));
  renderTags("aromaTags",aromaOptions,"aroma");renderTags("firstAromaTags",aromaOptions,"firstAroma");renderTags("coolAromaTags",aromaOptions,"coolAroma");renderTags("afterAromaTags",aromaOptions,"afterAroma");renderTags("afterTasteTags",tasteOptions,"afterTaste");renderTags("situations",situationOptions,"situations");
  $$(".choices").forEach(box=>$$("button",box).forEach(b=>b.classList.toggle("selected",(box.dataset.choice==="afterLength"&&b.textContent==="보통")||(box.dataset.choice==="again"&&b.textContent==="보통")||(box.dataset.choice==="preference"&&b.textContent==="○"))));
  $$("[data-slider]").forEach(s=>s.value=50);
}

function renderRecent(){
  const all=getRecords().slice(0,6), box=$("#recordList");
  if(!all.length){box.innerHTML='<div class="empty">아직 기록이 없습니다. 첫 번째 차를 기록해보세요.</div>';return}
  box.innerHTML=all.map(r=>`
    <article class="record-card">
      <img src="${r.photo||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23ece9dc'/%3E%3C/svg%3E"}" alt="">
      <div><h3>${esc(r.name)}</h3><p>${esc(r.form||"")} · ${esc(r.date||"날짜 없음")}</p><p>★ ${Number(r.ratings?.overall||0).toFixed(1)} · ${esc(r.type||"종류 미입력")}</p><p>${esc(r.oneLine||"한 줄 감상 없음")}</p></div>
      <div class="record-actions"><button onclick="editRecord('${r.id}')">수정</button><button onclick="deleteRecord('${r.id}')">삭제</button></div>
    </article>`).join("");
}

window.editRecord=function(id){
  const r=getRecords().find(x=>x.id===id);if(!r)return;
  state.editingId=id;state.photo=r.photo||"";
  state.ratings={...state.ratings,...(r.ratings||{})};state.tags={...state.tags,...(r.tags||{})};state.choices={...state.choices,...(r.choices||{})};state.sliders={...state.sliders,...(r.sliders||{})};
  $("#teaName").value=r.name||"";$("#teaType").value=r.type||"";$(`input[name="form"][value="${r.form||"잎차"}"]`)?.setAttribute("checked","checked");
  $$('input[name="form"]').forEach(x=>x.checked=x.value===(r.form||"잎차"));
  $("#store").value=r.store||"";$("#price").value=r.price||"";$("#totalPrice").value=r.totalPrice||"";$("#date").value=r.date||"";$("#oneLine").value=r.oneLine||"";$("#memo").value=r.memo||"";
  if(state.photo){preview.src=state.photo;preview.hidden=false;placeholder.hidden=true;removePhoto.hidden=false}
  else{preview.hidden=true;placeholder.hidden=false;removePhoto.hidden=true}
  $$(".stars").forEach(el=>renderStars(el,el.dataset.rating));
  renderTags("aromaTags",aromaOptions,"aroma");renderTags("firstAromaTags",aromaOptions,"firstAroma");renderTags("coolAromaTags",aromaOptions,"coolAroma");renderTags("afterAromaTags",aromaOptions,"afterAroma");renderTags("afterTasteTags",tasteOptions,"afterTaste");renderTags("situations",situationOptions,"situations");
  $$("[data-slider]").forEach(s=>s.value=state.sliders[s.dataset.slider]??50);
  $$(".choices").forEach(box=>$$("button",box).forEach(b=>b.classList.toggle("selected",(b.dataset.value||b.textContent.trim())===state.choices[box.dataset.choice])));
  switchView("new");
};

window.deleteRecord=function(id){if(confirm("이 기록을 삭제할까요?")){setRecords(getRecords().filter(x=>x.id!==id));renderAll()}};

function renderStats(){
  const all=getRecords(), box=$("#fullStats");
  if(!all.length){box.innerHTML='<div class="empty">차를 기록하면 통계가 자동으로 만들어집니다.</div>';return}
  const avg=all.reduce((s,r)=>s+Number(r.ratings?.overall||0),0)/all.length;
  const counts={};all.forEach(r=>counts[r.type||"기타"]=(counts[r.type||"기타"]||0)+1);
  const top=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  const favorite=all.slice().sort((a,b)=>Number(b.ratings?.overall||0)-Number(a.ratings?.overall||0))[0];
  const formCounts={};all.forEach(r=>formCounts[r.form||"잎차"]=(formCounts[r.form||"잎차"]||0)+1);
  const maxCount=Math.max(...Object.values(counts));
  box.innerHTML=`
    <div class="stat-big"><h3>기록한 차</h3><div class="stat-number">${all.length}</div><p>종 / 기록</p></div>
    <div class="stat-big"><h3>평균 평점</h3><div class="stat-number">${avg.toFixed(1)}</div><p>5점 만점</p></div>
    <div class="stat-big"><h3>가장 높은 평점</h3><div class="stat-number">${Number(favorite.ratings?.overall||0).toFixed(1)}</div><p>${esc(favorite.name)}</p></div>
    <div class="stat-big"><h3>가장 많이 기록한 종류</h3><div class="stat-number">${esc(top?.[0]||"-")}</div><p>${top?.[1]||0}회 · ${Math.round((top?.[1]||0)/all.length*100)}%</p></div>
    <div class="stat-wide"><h3>차 종류별 기록</h3>${Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div><i style="width:${v/maxCount*100}%"></i></div><b>${v}</b></div>`).join("")}</div>
    <div class="stat-wide"><h3>형태별 기록</h3>${Object.entries(formCounts).map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div><i style="width:${v/all.length*100}%"></i></div><b>${Math.round(v/all.length*100)}%</b></div>`).join("")}</div>`;
}

function brewAdvice(name,type){
  const n=(name||"").toLowerCase();
  const map={
    "녹차":{temp:"70–80°C",time:"60–90초",ratio:"찻잎 3g : 물 150ml",note:"온도가 너무 높거나 시간이 길면 쓴맛과 떫은맛이 강해질 수 있습니다."},
    "황차":{temp:"75–85°C",time:"90–120초",ratio:"찻잎 3g : 물 150ml",note:"낮은 온도로 천천히 우리면 부드러운 단맛과 곡물 향을 살리기 좋습니다."},
    "백차":{temp:"80–90°C",time:"2–3분",ratio:"찻잎 3g : 물 150ml",note:"처음에는 짧게 우리고 필요하면 시간을 늘려보세요."},
    "청차":{temp:"90–95°C",time:"40–60초",ratio:"찻잎 5g : 물 120ml",note:"짧게 여러 번 우리면 향의 변화를 보기 좋습니다."},
    "홍차":{temp:"90–95°C",time:"2–3분",ratio:"찻잎 3g : 물 200ml",note:"떫은맛이 강하면 온도와 시간을 조금 낮춰보세요."},
    "흑차":{temp:"95°C 전후",time:"2–3분",ratio:"찻잎 5g : 물 150ml",note:"처음에는 가볍게 세차하고 농도를 조절해보세요."},
    "보이차":{temp:"95°C 전후",time:"20–40초부터",ratio:"찻잎 5g : 물 120ml",note:"여러 탕에 걸쳐 시간을 조금씩 늘려보세요."},
    "허브차":{temp:"90–95°C",time:"4–6분",ratio:"재료 3–5g : 물 250ml",note:"향을 충분히 끌어내려면 조금 오래 우리어도 좋습니다."},
    "꽃차":{temp:"80–90°C",time:"2–4분",ratio:"재료 2–3g : 물 250ml",note:"팔팔 끓는 물보다는 한 김 식힌 물이 좋습니다."},
    "기타":{temp:"80–95°C",time:"1–3분",ratio:"찻잎 3g : 물 150–200ml",note:"차 종류를 확인하면 더 정확한 온도와 시간을 정할 수 있습니다."}
  };
  let a=map[type]||map["기타"];
  if(/세작|우전|첫물|어린잎/.test(n)) a={temp:"70–75°C",time:"60–75초",ratio:"찻잎 3g : 물 150ml",note:"어린잎 녹차는 낮은 온도로 시작하면 감칠맛과 단맛을 살리고 떫은맛을 줄이기 좋습니다."};
  return `추천 온도 ${a.temp}\n추천 시간 ${a.time}\n권장 비율 ${a.ratio}\n\n${a.note}`;
}

const aiPhotoInput=$("#aiTeaPhoto"), aiPhotoPreview=$("#aiPhotoPreview"), aiPhotoPlaceholder=$("#aiPhotoPlaceholder"), removeAIPhoto=$("#removeAIPhoto");
let aiPhotoData="";

$("#aiPhotoDrop").addEventListener("click",e=>{if(e.target.closest("#removeAIPhoto"))return;aiPhotoInput.click()});
aiPhotoInput.addEventListener("change",()=>{
  const f=aiPhotoInput.files?.[0]; if(!f)return;
  if(f.size>8*1024*1024){alert("사진은 8MB 이하로 올려주세요.");aiPhotoInput.value="";return}
  const reader=new FileReader();
  reader.onload=()=>compressImage(reader.result,1200,.78).then(data=>{
    aiPhotoData=data;aiPhotoPreview.src=data;aiPhotoPreview.hidden=false;aiPhotoPlaceholder.hidden=true;removeAIPhoto.hidden=false;
  });
  reader.readAsDataURL(f);
});
removeAIPhoto.addEventListener("click",e=>{
  e.stopPropagation();aiPhotoData="";aiPhotoInput.value="";aiPhotoPreview.hidden=true;aiPhotoPlaceholder.hidden=false;removeAIPhoto.hidden=true;
});

function compressImage(dataUrl,maxSize=1200,quality=.78){
  return new Promise(resolve=>{
    const img=new Image();
    img.onload=()=>{
      const scale=Math.min(1,maxSize/Math.max(img.width,img.height));
      const canvas=document.createElement("canvas");
      canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
      const ctx=canvas.getContext("2d");ctx.drawImage(img,0,0,canvas.width,canvas.height);
      resolve(canvas.toDataURL("image/jpeg",quality));
    };
    img.src=dataUrl;
  });
}

$("#askAI").addEventListener("click",async()=>{
  const name=($("#aiTeaName").value||"").trim();
  const out=$("#aiResult"), sources=$("#aiSources"), loading=$("#aiLoading"), badge=$("#aiSearchBadge");
  if(!name && !aiPhotoData){alert("차 이름이나 사진을 하나 이상 추가해주세요.");return}
  loading.hidden=false;out.textContent="";sources.innerHTML="";badge.textContent="검색 중";
  try{
    const res=await fetch("/.netlify/functions/brew",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({name,image:aiPhotoData})
    });
    const data=await res.json();
    if(!res.ok)throw new Error(data.error||"AI 요청에 실패했습니다.");
    out.textContent=data.answer||"추천 결과가 없습니다.";
    badge.textContent=data.searched?"웹 검색 완료":"기본 정보로 추천";
    (data.sources||[]).slice(0,5).forEach(s=>{
      const a=document.createElement("a");a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=s.title||s.url;sources.appendChild(a);
    });
  }catch(e){
    out.textContent="AI 추천을 불러오지 못했습니다.\n\n"+e.message;
    badge.textContent="오류";
  }finally{loading.hidden=true}
});

function switchView(view){
  $$(".view").forEach(x=>x.classList.remove("active"));
  $("#"+view+"View").classList.add("active");
  $$(".nav-item").forEach(x=>x.classList.toggle("active",x.dataset.view===view));
  $("#pageTitle").textContent={new:"차 기록하기",ai:"AI 우리는 법",records:"최근 기록",stats:"차 통계",settings:"설정"}[view];
  closeDrawer();renderAll();window.scrollTo({top:0,behavior:"smooth"});
}
$$("[data-view]").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));

function openDrawer(){ $("#drawer").classList.add("open");$("#drawerBackdrop").classList.add("open") }
function closeDrawer(){ $("#drawer").classList.remove("open");$("#drawerBackdrop").classList.remove("open") }
$("#mobileMenu").addEventListener("click",openDrawer);
$("#drawerBackdrop").addEventListener("click",closeDrawer);

$("#searchRecords").addEventListener("input",renderRecords);
$("#filterType").addEventListener("change",renderRecords);
$("#clearAll").addEventListener("click",()=>{if(confirm("모든 차 기록을 삭제할까요?")){localStorage.removeItem("teaRecords");renderAll()}});

function renderRecords(){
  const q=($("#searchRecords")?.value||"").toLowerCase(), type=$("#filterType")?.value||"";
  const all=getRecords().filter(r=>(!q||`${r.name} ${r.type}`.toLowerCase().includes(q))&&(!type||r.type===type));
  const box=$("#recordList");
  if(!all.length){box.innerHTML='<div class="empty">조건에 맞는 기록이 없습니다.</div>';return}
  box.innerHTML=all.map(r=>`
    <article class="record-card">
      <img src="${r.photo||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23ece9dc'/%3E%3C/svg%3E"}" alt="">
      <div><h3>${esc(r.name)}</h3><p>${esc(r.type||"종류 미입력")} · ${esc(r.form||"")} · ${esc(r.date||"")}</p><p>★ ${Number(r.ratings?.overall||0).toFixed(1)} · ${esc(r.oneLine||"한 줄 감상 없음")}</p></div>
      <div class="record-actions"><button onclick="editRecord('${r.id}')">수정</button><button onclick="deleteRecord('${r.id}')">삭제</button></div>
    </article>`).join("");
}

function renderAll(){
  renderRecords();renderStats();
  const select=$("#filterType"), current=select.value;
  const types=[...new Set(getRecords().map(r=>r.type).filter(Boolean))];
  select.innerHTML='<option value="">전체 종류</option>'+types.map(t=>`<option>${esc(t)}</option>`).join("");
  select.value=current;
}

$("#date").value=new Date().toISOString().slice(0,10);
renderAll();
