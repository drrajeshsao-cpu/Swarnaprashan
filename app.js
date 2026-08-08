
const app=(()=>{
const KEY='mahamaya_swarnaprashan_v7';
const defaults={clinicName:'MAHAMAYA CLINIC',prescriptionTitle:'Swarnaprashan Digital Prescription',doctor:'Dr. Rajesh Sao, M.D. (Ayurveda)',designation:'Consultant Physician • Ayurveda',doctor2:'Dr. Ravi Chandrakar, B.A.M.S.',designation2:'Consultant Physician • Ayurveda',phone:'',address:'In front of India 1 ATM, Sheetla Chowk, Bhatagaon, Raipur',footer:'Clinical follow-up record and parent education. Seek urgent medical care for emergency symptoms.'};
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{children:[],cases:[],followups:[],vaccines:[],plans:[],settings:defaults};
db.settings={...defaults,...(db.settings||{})};db.children=db.children||[];db.cases=db.cases||[];db.followups=db.followups||[];db.vaccines=db.vaccines||[];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>(s??'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),save=()=>localStorage.setItem(KEY,JSON.stringify(db));
const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'-';
const child=id=>db.children.find(x=>x.id===id),fups=id=>db.followups.filter(x=>x.childId===id).sort((a,b)=>new Date(a.date)-new Date(b.date));
const age=dob=>{if(!dob)return'-';const b=new Date(dob),n=new Date();let y=n.getFullYear()-b.getFullYear(),m=n.getMonth()-b.getMonth();if(m<0){y--;m+=12}return`${y}y ${m}m`};
const scoreLabel=n=>['Poor','Reduced','Stable/Normal','Improved','Best'][Number(n)]||'-';
const avg=o=>{const a=Object.values(o||{}).map(Number).filter(x=>!isNaN(x));return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
const trend=(a,b)=>a==null||b==null?'<span class="stable">No baseline</span>':(+b>+a?'<span class="good">Improved ↑</span>':+b<+a?'<span class="bad">Reduced ↓</span>':'<span class="stable">Stable →</span>');
const titles={dashboard:['Dashboard','Premium longitudinal Swarnaprashan clinical tracking'],clinical:['Clinical Workspace','Guided Save & Next workflow from profile to prescription'],children:['Children','Registry, baby photo, profile and clinical access'],followup:['Monthly Follow-up','Dose, growth, vitals, health, development and Ayurveda tracking'],analytics:['Growth & Analytics','Automatic visual longitudinal analysis'],vaccination:['Vaccination & Schedule','Vaccination record and upcoming session tracking'],documents:['Documents & Camera','Camera, gallery, file, PDF and manual card storage'],reports:['Reports & Prescription','Print, Save PDF, Share and WhatsApp'],education:['Diet • Pathya • Lifestyle','Individualized parent guidance'],backup:['Backup / Restore','Data portability and export'],settings:['Settings','Clinic identity and prescription details']};
const tpl=id=>document.getElementById(id).content.cloneNode(true);

// IndexedDB file store
let idb;
function openIDB(){return new Promise((res,rej)=>{const r=indexedDB.open('swarnaprashan_docs_v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('docs',{keyPath:'id'});r.onsuccess=()=>{idb=r.result;res(idb)};r.onerror=()=>rej(r.error)})}
async function putDoc(d){if(!idb)await openIDB();return new Promise((res,rej)=>{const tx=idb.transaction('docs','readwrite');tx.objectStore('docs').put(d);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function getDocs(){if(!idb)await openIDB();return new Promise((res,rej)=>{const r=idb.transaction('docs').objectStore('docs').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
async function delDoc(id){if(!idb)await openIDB();return new Promise((res,rej)=>{const tx=idb.transaction('docs','readwrite');tx.objectStore('docs').delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
async function docById(id){return (await getDocs()).find(d=>d.id===id)}
async function avatarUrl(c){if(!c?.photoDocId)return'';const d=await docById(c.photoDocId);return d?URL.createObjectURL(d.blob):''}

function options(sel,blank=true){sel.innerHTML=(blank?'<option value="">Select child</option>':'')+db.children.map(c=>`<option value="${c.id}">${esc(c.name)} • ${esc(c.regId||c.id.slice(-5).toUpperCase())}</option>`).join('')}

function letterhead(dateText='', rightHtml=''){
 return `<div class="letterhead">
   <div class="letterhead-top">
     <div class="clinic-identity">
       <div class="letter-logo">स्व</div>
       <div>
         <div class="clinic-name">${esc(db.settings.clinicName||'MAHAMAYA CLINIC')}</div>
         <div class="rx-title">${esc(db.settings.prescriptionTitle||'Swarnaprashan Digital Prescription')}</div>
       </div>
     </div>
     <div class="letter-date">${rightHtml||esc(dateText||'')}</div>
   </div>
   <div class="doctor-strip">
     <div class="doctor-card"><b>${esc(db.settings.doctor||'')}</b><span>${esc(db.settings.designation||'')}</span></div>
     <div class="doctor-card"><b>${esc(db.settings.doctor2||'')}</b><span>${esc(db.settings.designation2||'')}</span></div>
   </div>
   <div class="clinic-address">${esc(db.settings.address||'')}</div>
 </div>`;
}

function showView(name){
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('#pageTitle').textContent=titles[name][0];$('#pageSubtitle').textContent=titles[name][1];
  const v=$('#view');v.innerHTML='';v.appendChild(tpl(name+'Tpl'));
  ({dashboard:renderDashboard,clinical:renderClinical,children:renderChildren,followup:renderFollowup,analytics:renderAnalytics,vaccination:renderVaccination,documents:renderDocuments,reports:renderReports,education:renderEducation,backup:renderBackup,settings:renderSettings}[name]||(()=>{}))();
}

async function renderDashboard(){
  let docs=[];try{docs=await getDocs()}catch{}
  const thisMonth=db.followups.filter(v=>new Date(v.date).getMonth()===new Date().getMonth()&&new Date(v.date).getFullYear()===new Date().getFullYear()).length;
  $('#kpis').innerHTML=[['Registered Children',db.children.length],['Clinical Entries',db.cases.length],['Visits This Month',thisMonth],['Saved Documents',docs.length]].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  $('#recentChildren').innerHTML=db.children.slice(-6).reverse().map(c=>`<div class="docitem"><b>${esc(c.name)}</b><div class="docmeta">${age(c.dob)} • ${esc(c.mobile||'')}</div></div>`).join('')||'<p class="muted">No child registered.</p>';
  $('#dueChildren').innerHTML=db.children.slice(0,7).map(c=>{const f=fups(c.id).at(-1);return`<div class="docitem"><b>${esc(c.name)}</b><div class="docmeta">Last follow-up: ${f?fmt(f.date):'Not recorded'}</div></div>`}).join('')||'<p class="muted">Register a child to begin.</p>';
  options($('#dashChild'));$('#dashChild').onchange=()=>drawSnapshot($('#dashChild').value);$('#dashSnapshot').innerHTML='<p class="muted">Select a child for baseline-to-latest analysis.</p>';
  $('#dashDocs').innerHTML=docs.slice(-5).reverse().map(d=>`<div class="docitem"><b>${esc(d.name)}</b><div class="docmeta">${esc(d.type)} • ${fmt(d.date)}</div></div>`).join('')||'<p class="muted">No documents uploaded.</p>';
}
function drawSnapshot(id){const fs=fups(id);if(fs.length<2){$('#dashSnapshot').innerHTML='<p class="muted">At least 2 follow-ups required.</p>';return}const a=fs[0],b=fs.at(-1);$('#dashSnapshot').innerHTML=`<div class="metricrow">${['Learning','Memory','Playing','School Performance'].map(k=>`<div class="metric"><span>${k}</span><b>${scoreLabel(b.scores?.[k])}</b>${trend(a.scores?.[k],b.scores?.[k])}</div>`).join('')}</div>`}


// Direct in-browser camera capture using getUserMedia
let cameraStream=null, cameraFacing='environment', cameraTargetCallback=null;
async function startDirectCamera(title='Take Photo', onCaptured=null){
  cameraTargetCallback=onCaptured;
  const modal=$('#cameraModal'),video=$('#cameraVideo'),msg=$('#cameraMessage');
  $('#cameraModalTitle').textContent=title;
  modal.classList.add('open');modal.setAttribute('aria-hidden','false');
  msg.textContent='Starting camera…';msg.style.display='grid';
  try{
    if(cameraStream)cameraStream.getTracks().forEach(t=>t.stop());
    cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:cameraFacing}},audio:false});
    video.srcObject=cameraStream;
    await video.play();
    msg.style.display='none';
  }catch(err){
    msg.innerHTML='Camera access is unavailable or blocked.<br><small>Please allow camera permission in the browser, or use Gallery/File.</small>';
  }
}
function stopDirectCamera(){
  if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}
  const modal=$('#cameraModal');if(modal){modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}
}
async function switchDirectCamera(){
  cameraFacing=cameraFacing==='environment'?'user':'environment';
  await startDirectCamera($('#cameraModalTitle')?.textContent||'Take Photo',cameraTargetCallback);
}
async function captureDirectCamera(){
  const video=$('#cameraVideo'),canvas=$('#cameraCanvas');
  if(!video?.videoWidth){alert('Camera is not ready yet.');return}
  const maxW=1280,scale=Math.min(1,maxW/video.videoWidth);
  canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
  canvas.getContext('2d').drawImage(video,0,0,canvas.width,canvas.height);
  const blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',0.9));
  if(!blob)return;
  const file=new File([blob],`camera_${new Date().toISOString().replace(/[:.]/g,'-')}.jpg`,{type:'image/jpeg'});
  const cb=cameraTargetCallback;stopDirectCamera();
  if(cb)await cb(file);
}
function bindCameraModal(){
  $('#cameraCloseBtn').onclick=stopDirectCamera;
  $('#cameraCancelBtn').onclick=stopDirectCamera;
  $('#cameraSwitchBtn').onclick=switchDirectCamera;
  $('#cameraCaptureBtn').onclick=captureDirectCamera;
}
// Guided clinical workflow
const STEPS=['Profile','Examination','Investigations','Treatment','Prescription','Review & Share'];
let wiz={step:0,caseId:null,data:{}};let wizardCameraFile=null;
function startClinical(childId=''){showView('clinical');wiz={step:0,caseId:null,data:{childId,date:new Date().toISOString().slice(0,10)}};renderWizard()}
function renderClinical(){if(!wiz.data||!Object.keys(wiz.data).length)wiz={step:0,caseId:null,data:{date:new Date().toISOString().slice(0,10)}};renderWizard()}
function renderWizard(){
 $('#wizardSteps').innerHTML=STEPS.map((s,i)=>`<div class="step ${i===wiz.step?'active':i<wiz.step?'done':''}">${i+1}. ${s}</div>`).join('');
 $('#prevStepBtn').disabled=wiz.step===0;$('#prevStepBtn').onclick=()=>{collectWizard();wiz.step=Math.max(0,wiz.step-1);renderWizard()};
 $('#saveDraftBtn').onclick=saveDraft;$('#saveNextBtn').textContent=wiz.step===5?'Save & Finish':'Save & Next →';
 $('#saveNextBtn').onclick=async()=>{await collectWizard();saveDraft();if(wiz.step<5){wiz.step++;renderWizard()}else{alert('Clinical entry saved');showView('reports')}};
 $('#wizardBody').innerHTML=wizardHtml(wiz.step);bindWizard();
}
function scaleOptions(v=2){return[0,1,2,3,4].map(n=>`<option value="${n}" ${Number(v)===n?'selected':''}>${n} - ${scoreLabel(n)}</option>`).join('')}
function wizardHtml(i){
 const d=wiz.data,scale=(name,val=2)=>`<label>${name}<select data-w="${name}">${scaleOptions(val)}</select></label>`;
 if(i===0)return`<div class="card"><h3>1. Patient Profile</h3><div class="formgrid"><label>Existing Child<select id="w_child"></select></label><label>Date<input id="w_date" type="date" value="${d.date||''}"></label><label>Visit Type<select id="w_type"><option>Initial Swarnaprashan</option><option>Monthly Follow-up</option><option>Clinical Review</option></select></label><label>Present Complaint<input id="w_complaint" value="${esc(d.complaint||'')}"></label><label>Allergy / Sensitivity<input id="w_allergy" value="${esc(d.allergy||'')}"></label><label>Current Medication<input id="w_currentMeds" value="${esc(d.currentMeds||'')}"></label></div><label>Relevant History<textarea id="w_history">${esc(d.history||'')}</textarea></label></div>`;
 if(i===1)return`<div class="card"><h3>2. Examination</h3><div class="formgrid"><label>Height cm<input id="w_height" type="number" step=".1" value="${d.height||''}"></label><label>Weight kg<input id="w_weight" type="number" step=".1" value="${d.weight||''}"></label><label>Temperature °F<input id="w_temp" type="number" step=".1" value="${d.temp||''}"></label><label>Pulse /min<input id="w_pulse" type="number" value="${d.pulse||''}"></label><label>RR /min<input id="w_rr" type="number" value="${d.rr||''}"></label><label>SpO₂ %<input id="w_spo2" type="number" value="${d.spo2||''}"></label><label>BP Systolic<input id="w_sys" type="number" value="${d.sys||''}"></label><label>BP Diastolic<input id="w_dia" type="number" value="${d.dia||''}"></label><label>General Appearance<input id="w_ga" value="${esc(d.ga||'')}"></label></div><div class="section"><h4>Functional Grading 0–4</h4><div class="scalegrid">${['Appetite','Bladder','Bowel','Sleep','Learning','Memory','Playing','School Performance','Energy'].map(x=>scale(x,d.examScores?.[x]??2)).join('')}</div></div><div class="section"><h4>Ashtavidha Pariksha</h4><div class="scalegrid">${['Nadi','Mala','Mutra','Jihva','Shabda','Sparsha','Drik','Akruti'].map(x=>scale('A:'+x,d.examScores?.['A:'+x]??2)).join('')}</div></div><div class="section"><h4>Dashavidha Pariksha</h4><div class="scalegrid">${['Prakriti','Vikriti','Sara','Samhanana','Pramana','Satmya','Satva','Ahara Shakti','Vyayama Shakti','Vaya'].map(x=>scale('D:'+x,d.examScores?.['D:'+x]??2)).join('')}</div></div><label>Examination Notes<textarea id="w_examNotes">${esc(d.examNotes||'')}</textarea></label></div>`;
 if(i===2)return`<div class="card"><h3>3. Investigations & Clinical Attachments</h3><div class="formgrid"><label>Investigation Summary<textarea id="w_invest">${esc(d.invest||'')}</textarea></label><label>Clinical Impression<textarea id="w_impression">${esc(d.impression||'')}</textarea></label><label>Red Flags / Safety Notes<textarea id="w_redflags">${esc(d.redflags||'')}</textarea></label></div><div class="upload-grid"><button type="button" id="w_direct_camera" class="uploadbox direct-camera-btn">📷 Open Camera Now<br><span>Live camera preview → Capture</span></button><label class="uploadbox">🖼 Gallery / 📎 File / PDF<input id="w_files" type="file" multiple accept="image/*,.pdf,.doc,.docx"></label></div><div id="w_camera_capture_name" class="selected-files"></div><p class="tiny muted">Files will be linked to this clinical entry when you press Save & Next.</p></div>`;
 if(i===3)return`<div class="card"><h3>4. Treatment Plan</h3><div class="formgrid"><label>Swarnaprashan Dose<input id="w_dose" value="${esc(d.dose||'')}"></label><label>Preparation / Batch<input id="w_batch" value="${esc(d.batch||'')}"></label><label>Next Follow-up<input id="w_next" type="date" value="${d.next||''}"></label><label>Other Medicines<textarea id="w_medicines">${esc(d.medicines||'')}</textarea></label><label>Diet / Pathya<textarea id="w_pathya">${esc(d.pathya||'')}</textarea></label><label>Apathya / Avoid<textarea id="w_apathya">${esc(d.apathya||'')}</textarea></label><label>Activity / Lifestyle<textarea id="w_lifestyle">${esc(d.lifestyle||'')}</textarea></label><label>School / Cognitive Advice<textarea id="w_cognitive">${esc(d.cognitive||'')}</textarea></label><label>Safety / Referral Advice<textarea id="w_safety">${esc(d.safety||'')}</textarea></label></div></div>`;
 if(i===4)return`<div class="card"><h3>5. Prescription Builder</h3><div class="formgrid"><label>Prescription Title<input id="w_rxTitle" value="${esc(d.rxTitle||'Digital Swarnaprashan Prescription')}"></label><label>Special Instructions<textarea id="w_rxInstructions">${esc(d.rxInstructions||'')}</textarea></label><label>Parent Message<textarea id="w_parentMsg">${esc(d.parentMsg||'')}</textarea></label></div><div class="section"><h4>Print Options</h4><label><input id="w_printGrowth" type="checkbox" ${d.printGrowth!==false?'checked':''}> Include growth summary</label><br><label><input id="w_printAssessment" type="checkbox" ${d.printAssessment!==false?'checked':''}> Include assessment summary</label><br><label><input id="w_printDocs" type="checkbox" ${d.printDocs!==false?'checked':''}> Include uploaded-document list</label></div></div>`;
 return`<div class="card"><h3>6. Review, Save, Print & Share</h3><div id="wizardReview"></div><div class="actionrow"><button onclick="app.generateCaseReport()">Generate Prescription</button><button class="ghost" onclick="app.printCaseReport()">Print / Save PDF</button><button class="ghost" onclick="app.shareCurrent()">Share</button><button class="ghost" onclick="app.whatsappCurrent()">WhatsApp</button></div></div><div id="caseReportPreview" class="reportpaper"></div>`;
}
function bindWizard(){
 const c=$('#w_child');if(c){options(c);c.value=wiz.data.childId||''}
 if(wiz.step===2 && $('#w_direct_camera')){
   $('#w_direct_camera').onclick=()=>startDirectCamera('Investigation / Clinical Photo',async(file)=>{
     wizardCameraFile=file;
     $('#w_camera_capture_name').innerHTML=`<span class="file-chip">📷 ${esc(file.name)} captured</span>`;
   });
 }
 if(wiz.step===5){$('#wizardReview').innerHTML=reviewHtml();generateCaseReport(false)}
}
async function collectWizard(){
 const d=wiz.data;
 if(wiz.step===0){d.childId=$('#w_child')?.value||d.childId;d.date=$('#w_date')?.value;d.type=$('#w_type')?.value;d.complaint=$('#w_complaint')?.value;d.allergy=$('#w_allergy')?.value;d.currentMeds=$('#w_currentMeds')?.value;d.history=$('#w_history')?.value}
 if(wiz.step===1){['height','weight','temp','pulse','rr','spo2','sys','dia','ga','examNotes'].forEach(k=>d[k]=$('#w_'+k)?.value);d.examScores={};$$('[data-w]').forEach(e=>d.examScores[e.dataset.w]=Number(e.value));d.bmi=d.height&&d.weight?(+d.weight/((+d.height/100)**2)).toFixed(2):''}
 if(wiz.step===2){d.invest=$('#w_invest')?.value;d.impression=$('#w_impression')?.value;d.redflags=$('#w_redflags')?.value;if(!wiz.caseId)wiz.caseId=uid();const arr=[];if(wizardCameraFile)arr.push(wizardCameraFile);if($('#w_files')?.files?.length)arr.push(...$('#w_files').files);for(const f of arr)await putDoc({id:uid(),childId:d.childId||'',caseId:wiz.caseId,type:'Investigation / Clinical Attachment',date:d.date||new Date().toISOString().slice(0,10),name:f.name,mime:f.type,size:f.size,blob:f,note:''});wizardCameraFile=null}
 if(wiz.step===3)['dose','batch','next','medicines','pathya','apathya','lifestyle','cognitive','safety'].forEach(k=>d[k]=$('#w_'+k)?.value);
 if(wiz.step===4){['rxTitle','rxInstructions','parentMsg'].forEach(k=>d[k]=$('#w_'+k)?.value);d.printGrowth=$('#w_printGrowth')?.checked;d.printAssessment=$('#w_printAssessment')?.checked;d.printDocs=$('#w_printDocs')?.checked}
}
function saveDraft(){if(!wiz.data.childId&&wiz.step>0){alert('Please select a child in Patient Profile');return}if(!wiz.caseId)wiz.caseId=uid();const item={id:wiz.caseId,...wiz.data,updatedAt:new Date().toISOString(),status:wiz.step===5?'Complete':'Draft'};const i=db.cases.findIndex(x=>x.id===item.id);i>=0?db.cases[i]=item:db.cases.push(item);save();if($('#draftStatus'))$('#draftStatus').textContent='Saved '+new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
function reviewHtml(){const d=wiz.data,c=child(d.childId)||{};return`<div class="metricrow"><div class="metric"><span>Child</span><b>${esc(c.name||'-')}</b></div><div class="metric"><span>Date</span><b>${fmt(d.date)}</b></div><div class="metric"><span>Dose</span><b>${esc(d.dose||'-')}</b></div><div class="metric"><span>BMI</span><b>${d.bmi||'-'}</b></div></div><div class="section"><h4>Clinical Impression</h4><p>${esc(d.impression||'-')}</p></div>`}
async function generateCaseReport(scroll=true){
 const d=wiz.data,c=child(d.childId)||{},docs=(await getDocs()).filter(x=>x.childId===d.childId),el=$('#caseReportPreview')||$('#reportPaper');if(!el)return;
 let photo='';if(c.photoDocId){const pd=await docById(c.photoDocId);if(pd)photo=URL.createObjectURL(pd.blob)}
 el.innerHTML=`${letterhead(fmt(d.date), `${photo?`<img src="${photo}" class="avatar-lg">`:''}<div class="patient-head-id">${esc(c.regId||'')}<br>${fmt(d.date)}</div>`)}
 <div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name||'-')}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Height / Weight</span><b>${d.height||'-'} cm / ${d.weight||'-'} kg</b></div><div class="metric"><span>BMI</span><b>${d.bmi||'-'}</b></div></div></div>
 <div class="reportsection"><h3>Clinical Assessment</h3><p><b>Complaint:</b> ${esc(d.complaint||'-')}</p><p><b>Impression:</b> ${esc(d.impression||'-')}</p><p><b>Vitals:</b> Pulse ${d.pulse||'-'} • RR ${d.rr||'-'} • SpO₂ ${d.spo2||'-'}% • BP ${d.sys||'-'}/${d.dia||'-'}</p><p><b>Safety / Red flags:</b> ${esc(d.redflags||'None recorded')}</p></div>
 <div class="reportsection"><h3>Swarnaprashan & Treatment</h3><p><b>Swarnaprashan Dose:</b> ${esc(d.dose||'-')} &nbsp; <b>Preparation/Batch:</b> ${esc(d.batch||'-')}</p><p><b>Other medicines:</b> ${esc(d.medicines||'-')}</p><p><b>Next follow-up:</b> ${fmt(d.next)}</p></div>
 <div class="reportsection"><h3>Diet • Pathya • Lifestyle</h3><p><b>Pathya:</b> ${esc(d.pathya||'-')}</p><p><b>Apathya:</b> ${esc(d.apathya||'-')}</p><p><b>Activity/Lifestyle:</b> ${esc(d.lifestyle||'-')}</p><p><b>Learning/School advice:</b> ${esc(d.cognitive||'-')}</p></div>
 <div class="reportsection"><h3>Instructions</h3><p>${esc(d.rxInstructions||'-')}</p><p><b>Parent message:</b> ${esc(d.parentMsg||'-')}</p></div>
 ${d.printDocs!==false?`<div class="reportsection"><h3>Attached Clinical Documents</h3><ul>${docs.map(x=>`<li>${esc(x.type)} — ${esc(x.name)} (${fmt(x.date)})</li>`).join('')||'<li>No document attached</li>'}</ul></div>`:''}
 <div class="signature"><div class="signature-grid"><div><b>${esc(db.settings.doctor)}</b><br><span>${esc(db.settings.designation)}</span></div><div><b>${esc(db.settings.doctor2)}</b><br><span>${esc(db.settings.designation2)}</span></div></div><div class="signature-address">${esc(db.settings.address)} ${db.settings.phone?'• '+esc(db.settings.phone):''}<br>${esc(db.settings.footer)}</div></div>`;
 if(scroll)el.scrollIntoView({behavior:'smooth'});
}
function currentText(){const e=$('#caseReportPreview')||$('#reportPaper');return e?.innerText.trim()||''}
async function shareCurrent(){const t=currentText();if(!t){alert('Generate report first');return}if(navigator.share)await navigator.share({title:'Mahamaya Clinic Swarnaprashan',text:t});else{await navigator.clipboard.writeText(t);alert('Copied to clipboard')}}
function whatsappCurrent(){const t=currentText();if(!t){alert('Generate report first');return}window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}

// children & baby photo
function renderChildren(){$('#registerChildBtn').onclick=()=>editChild();$('#childSearch').oninput=()=>drawChildren($('#childSearch').value);drawChildren('')}
async function editChild(id=''){
 const c=id?child(id):{};let photo='';if(c?.photoDocId){const pd=await docById(c.photoDocId);if(pd)photo=URL.createObjectURL(pd.blob)}
 $('#childEditor').innerHTML=`<div class="card profile-editor">
   <div class="cardhead">
     <div><span class="eyebrow">CHILD IDENTITY PROFILE</span><h3>${id?'Edit':'Register'} Child</h3><p class="muted">Baby identity photo is kept with the profile so the child can be recognized quickly in the registry.</p></div>
     <div class="profile-photo-panel">
       ${photo?`<img id="photoPreview" src="${photo}" class="avatar-xl">`:`<div id="photoPreviewPlaceholder" class="avatar-xl avatar-placeholder">👶<span>Photo required</span></div><img id="photoPreview" class="avatar-xl" style="display:none">`}
       <span class="photo-status ${c.photoDocId?'ok':'pending'}">${c.photoDocId?'Identity photo saved':'Identity photo pending'}</span>
     </div>
   </div>
   <div class="section profile-section">
     <h4>Identity & Contact</h4>
     <div class="formgrid">
       <label>Child Name *<input id="c_name" value="${esc(c.name||'')}" placeholder="Full name"></label>
       <label>Date of Birth *<input id="c_dob" type="date" value="${c.dob||''}"></label>
       <label>Sex<select id="c_sex"><option ${c.sex==='Male'?'selected':''}>Male</option><option ${c.sex==='Female'?'selected':''}>Female</option><option>Other</option></select></label>
       <label>Parent / Guardian<input id="c_parent" value="${esc(c.parent||'')}"></label>
       <label>Mobile / WhatsApp<input id="c_mobile" value="${esc(c.mobile||'')}"></label>
       <label>Registration ID<input id="c_reg" value="${esc(c.regId||('SW'+String(db.children.length+1).padStart(4,'0')))}"></label>
       <label>School / Class<input id="c_school" value="${esc(c.school||'')}"></label>
       <label>Address<input id="c_address" value="${esc(c.address||'')}"></label>
       <label>Allergies<input id="c_allergy" value="${esc(c.allergies||'')}"></label>
     </div>
   </div>
   <div class="section photo-section">
     <h4>Baby Identity Photo *</h4>
     <div class="upload-grid">
       <label class="uploadbox camera-box">📷 Take Photo Now<input id="c_photo_camera" type="file" accept="image/*" capture="environment"></label>
       <label class="uploadbox gallery-box">🖼 Choose from Gallery<input id="c_photo_gallery" type="file" accept="image/*"></label>
     </div>
     <p class="tiny muted">For a new child, please add one clear face/profile photograph. Existing records without a photo will show “Photo pending”.</p>
   </div>
   <label>Birth / Medical / Developmental History<textarea id="c_history">${esc(c.history||'')}</textarea></label>
   <div class="actionrow"><button id="saveChild">Save Child Profile</button><button class="ghost" id="cancelChild">Cancel</button></div>
 </div>`;
 const preview=(input)=>{
   const f=input.files?.[0];if(!f)return;
   const url=URL.createObjectURL(f),img=$('#photoPreview');img.src=url;img.style.display='block';
   const ph=$('#photoPreviewPlaceholder');if(ph)ph.style.display='none';
 };
 let directCameraFile=null;
 $('#c_direct_camera').onclick=()=>startDirectCamera('Baby Identity Photo',async(file)=>{
   directCameraFile=file;
   const url=URL.createObjectURL(file),img=$('#photoPreview');img.src=url;img.style.display='block';
   const ph=$('#photoPreviewPlaceholder');if(ph)ph.style.display='none';
   $('#cameraCapturedName').innerHTML=`<span class="file-chip">📷 ${esc(file.name)} captured</span>`;
 });
 $('#c_photo_gallery').onchange=e=>preview(e.target);
 $('#saveChild').onclick=async()=>{
   const x={id:id||uid(),name:$('#c_name').value.trim(),dob:$('#c_dob').value,sex:$('#c_sex').value,parent:$('#c_parent').value,mobile:$('#c_mobile').value,regId:$('#c_reg').value,school:$('#c_school').value,address:$('#c_address').value,allergies:$('#c_allergy').value,history:$('#c_history').value,photoDocId:c.photoDocId||''};
   if(!x.name){alert('Child name is required');return}
   if(!x.dob){alert('Date of birth is required');return}
   const f=directCameraFile||$('#c_photo_gallery').files[0];
   if(!id && !f){alert('Please add the baby identity photo using Camera or Gallery.');return}
   if(f){const doc={id:uid(),childId:x.id,type:'Baby Profile Photo',date:new Date().toISOString().slice(0,10),name:f.name,mime:f.type,size:f.size,blob:f,note:'Identity profile photo'};await putDoc(doc);x.photoDocId=doc.id}
   if(id)db.children=db.children.map(y=>y.id===id?x:y);else db.children.push(x);
   save();$('#childEditor').innerHTML='';drawChildren('');
 };
 $('#cancelChild').onclick=()=>$('#childEditor').innerHTML='';
}
async function drawChildren(q){
 q=(q||'').toLowerCase();
 const num=s=>Number((String(s||'').match(/\d+/)||['999999'])[0]);
 const arr=db.children
   .filter(c=>[c.name,c.mobile,c.regId,c.parent].join(' ').toLowerCase().includes(q))
   .sort((a,b)=>num(a.regId)-num(b.regId)||String(a.name).localeCompare(String(b.name)));
 const rows=[];
 for(let idx=0;idx<arr.length;idx++){
   const c=arr[idx];let p='';
   if(c.photoDocId){const d=await docById(c.photoDocId);if(d)p=URL.createObjectURL(d.blob)}
   rows.push(`<tr>
     <td class="seqcell"><span class="seqno">${idx+1}</span></td>
     <td>${p?`<img src="${p}" class="avatar">`:`<div class="avatar avatar-placeholder mini">👶</div>`}</td>
     <td><span class="id-badge">${esc(c.regId||'-')}</span></td>
     <td><div class="child-name">${esc(c.name)}</div><div class="muted child-sub">${age(c.dob)} • ${esc(c.sex||'-')} ${c.school?'• '+esc(c.school):''}</div>${!p?'<span class="photo-pending">Photo pending</span>':''}</td>
     <td><b>${esc(c.parent||'-')}</b><div class="muted">${esc(c.mobile||'')}</div></td>
     <td><span class="followup-count">${fups(c.id).length}</span></td>
     <td><div class="row-actions"><button onclick="app.editChild('${c.id}')">Edit</button><button class="ghost" onclick="app.startClinical('${c.id}')">Clinical</button><button class="ghost" onclick="app.quickReport('${c.id}')">Report</button></div></td>
   </tr>`);
 }
 $('#childrenList').innerHTML=`<div class="registry-summary"><b>${arr.length}</b> child${arr.length===1?'':'ren'} shown • sorted by Registration ID</div>
 <table class="children-table"><thead><tr><th>No.</th><th>Photo</th><th>ID</th><th>Child Identity</th><th>Parent / Contact</th><th>Visits</th><th>Quick Actions</th></tr></thead><tbody>${rows.join('')||'<tr><td colspan="7" class="muted">No child found.</td></tr>'}</tbody></table>`;
}
// Followup
const scales=['Appetite','Bladder','Bowel','Sleep','Learning','Memory','Playing','School Performance','Energy','Illness Frequency'];
let followupCameraFile=null;
function renderFollowup(){
 options($('#followupChild'));$('#followupChild').onchange=()=>drawTimeline($('#followupChild').value);
 $('#followupForm').innerHTML=`<div class="formgrid"><label>Child<select id="f_child"></select></label><label>Date<input id="f_date" type="date"></label><label>Swarnaprashan Dose<input id="f_dose"></label><label>Batch/Preparation<input id="f_batch"></label><label>Height cm<input id="f_height" type="number" step=".1"></label><label>Weight kg<input id="f_weight" type="number" step=".1"></label><label>Pulse<input id="f_pulse" type="number"></label><label>RR<input id="f_rr" type="number"></label><label>SpO₂<input id="f_spo2" type="number"></label><label>BP<input id="f_bp" placeholder="e.g. 100/60"></label></div>
 <div class="section"><h4>Health & Functional Grading 0–4</h4><div class="scalegrid">${scales.map(x=>`<div class="scalebox"><b>${x}</b><select data-fscore="${x}">${scaleOptions()}</select></div>`).join('')}</div></div>
 <div class="formgrid"><label>Current Health Issue<textarea id="f_issue"></textarea></label><label>Medical / Treatment Notes<textarea id="f_med"></textarea></label><label>Parent Observation<textarea id="f_parent"></textarea></label></div>
 <div class="upload-grid"><button type="button" id="f_direct_camera" class="uploadbox direct-camera-btn">📷 Open Camera Now<br><span>Live camera preview → Capture</span></button><label class="uploadbox">📎 Follow-up File / PDF<input id="f_files" type="file" multiple accept="image/*,.pdf,.doc,.docx"></label></div><div id="f_camera_capture_name" class="selected-files"></div><button id="saveFollow">Save Follow-up</button>`;
 options($('#f_child'));$('#f_date').value=new Date().toISOString().slice(0,10);
 $('#f_direct_camera').onclick=()=>startDirectCamera('Follow-up Clinical Photo',async(file)=>{followupCameraFile=file;$('#f_camera_capture_name').innerHTML=`<span class="file-chip">📷 ${esc(file.name)} captured</span>`});
 $('#saveFollow').onclick=saveFollow;
}
async function saveFollow(){const id=$('#f_child').value;if(!id){alert('Select child');return}const s={};$$('[data-fscore]').forEach(e=>s[e.dataset.fscore]=Number(e.value));const h=+$('#f_height').value||0,w=+$('#f_weight').value||0,followId=uid();db.followups.push({id:followId,childId:id,date:$('#f_date').value,dose:$('#f_dose').value,batch:$('#f_batch').value,height:h,weight:w,bmi:h&&w?(w/((h/100)**2)).toFixed(2):'',pulse:$('#f_pulse').value,rr:$('#f_rr').value,spo2:$('#f_spo2').value,bp:$('#f_bp').value,scores:s,issue:$('#f_issue').value,med:$('#f_med').value,parent:$('#f_parent').value});const arr=[];if(followupCameraFile)arr.push(followupCameraFile);if($('#f_files').files.length)arr.push(...$('#f_files').files);for(const f of arr)await putDoc({id:uid(),childId:id,followupId:followId,type:'Follow-up Attachment',date:$('#f_date').value,name:f.name,mime:f.type,size:f.size,blob:f,note:''});followupCameraFile=null;save();alert('Follow-up saved');showView('followup');$('#followupChild').value=id;drawTimeline(id)}
function drawTimeline(id){const fs=fups(id);$('#followupTimeline').innerHTML=!id?'<p class="muted">Select a child.</p>':`<table><thead><tr><th>Date</th><th>Dose</th><th>Growth</th><th>Vitals</th><th>Health</th><th>Overall</th></tr></thead><tbody>${fs.map((f,i)=>`<tr><td>${fmt(f.date)}</td><td>${esc(f.dose||'-')}</td><td>${f.height||'-'} cm • ${f.weight||'-'} kg<br>BMI ${f.bmi||'-'}</td><td>P ${f.pulse||'-'} • SpO₂ ${f.spo2||'-'}<br>BP ${esc(f.bp||'-')}</td><td>${esc(f.issue||'No issue')}</td><td>${i?trend(avg(fs[i-1].scores),avg(f.scores)):'Baseline'}</td></tr>`).join('')}</tbody></table>`}

// Analytics
function renderAnalytics(){options($('#analyticsChild'));$('#analyticsChild').onchange=()=>drawAnalytics($('#analyticsChild').value);$('#analyticSummary').innerHTML='<p class="muted">Select a child.</p>'}
function drawAnalytics(id){const fs=fups(id);if(!fs.length){$('#analyticSummary').innerHTML='<p class="muted">No follow-up data.</p>';return}const a=fs[0],b=fs.at(-1);$('#analyticSummary').innerHTML=`<div class="metric"><span>Visits</span><b>${fs.length}</b></div><div class="metric"><span>Latest Height</span><b>${b.height||'-'} cm</b></div><div class="metric"><span>Latest Weight</span><b>${b.weight||'-'} kg</b></div><div class="metric"><span>Functional Avg</span><b>${(avg(b.scores)||0).toFixed(1)}/4</b></div>`;drawLine($('#lineChart'),fs);drawBars($('#barChart'),a,b);drawPie($('#pieChart'),b);$('#baselineLatest').innerHTML=`<table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(a.scores?.[k])}</td><td>${scoreLabel(b.scores?.[k])}</td><td>${trend(a.scores?.[k],b.scores?.[k])}</td></tr>`).join('')}</tbody></table>`}
function drawLine(c,fs){const ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);ctx.strokeStyle='#e5e5e5';for(let i=1;i<6;i++){let y=i*H/6;ctx.beginPath();ctx.moveTo(50,y);ctx.lineTo(W-20,y);ctx.stroke()}[['weight','#2d7755'],['height','#b68733'],['bmi','#3f6d9c']].forEach(([k,col])=>{const vals=fs.map(f=>+f[k]).filter(Boolean);if(!vals.length)return;const min=Math.min(...vals),max=Math.max(...vals);ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();fs.forEach((f,i)=>{let v=+f[k];if(!v)return;let x=55+i*(W-90)/Math.max(1,fs.length-1),y=H-35-(v-min)/Math.max(1,max-min)*(H-75);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()})}
function drawBars(c,a,b){const ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const keys=['Learning','Memory','Playing','School Performance','Appetite','Sleep'],bw=(W-80)/(keys.length*2.4);keys.forEach((k,i)=>{const x=45+i*(W-80)/keys.length,va=+a.scores?.[k]||0,vb=+b.scores?.[k]||0;ctx.fillStyle='#d7c6aa';ctx.fillRect(x,H-35-va*(H-80)/4,bw,va*(H-80)/4);ctx.fillStyle='#5f4327';ctx.fillRect(x+bw+5,H-35-vb*(H-80)/4,bw,vb*(H-80)/4);ctx.fillStyle='#555';ctx.font='12px sans-serif';ctx.fillText(k.slice(0,8),x,H-12)})}
function drawPie(c,b){const ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const vals=Object.values(b.scores||{}).map(Number),counts=[0,0,0,0,0],cols=['#b14f4f','#d58b55','#d4b25c','#5f9d78','#2d7755'];vals.forEach(v=>counts[v]++);let start=-Math.PI/2,total=Math.max(1,vals.length);counts.forEach((n,i)=>{const ang=2*Math.PI*n/total;ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.fillStyle=cols[i];ctx.arc(W/2,H/2,120,start,start+ang);ctx.fill();start+=ang});ctx.fillStyle='#555';ctx.font='13px sans-serif';counts.forEach((n,i)=>ctx.fillText(`${scoreLabel(i)}: ${n}`,20,28+i*22))}

// Vaccination & schedule
function renderVaccination(){options($('#vaxChild'));options($('#vaxFilter'));$('#vaxDate').value=new Date().toISOString().slice(0,10);$('#saveVax').onclick=()=>{if(!$('#vaxChild').value){alert('Select child');return}db.vaccines.push({id:uid(),childId:$('#vaxChild').value,name:$('#vaxName').value,date:$('#vaxDate').value,status:$('#vaxStatus').value,note:$('#vaxNote').value});save();drawVax()};$('#vaxFilter').onchange=drawVax;drawVax()}
function drawVax(){const id=$('#vaxFilter')?.value||'';const a=db.vaccines.filter(v=>!id||v.childId===id).sort((x,y)=>String(y.date).localeCompare(String(x.date)));$('#vaxList').innerHTML=a.map(v=>{const c=child(v.childId)||{};return`<div class="docitem"><b>${esc(v.name||'Vaccine')}</b><div>${esc(c.name||'')} • ${fmt(v.date)} • ${esc(v.status)}</div><div class="docmeta">${esc(v.note||'')}</div></div>`}).join('')||'<p class="muted">No vaccination entries.</p>'}

// Documents
let pickedFiles=[];
async function renderDocuments(){options($('#docChild'));options($('#docFilterChild'));$('#docDate').value=new Date().toISOString().slice(0,10);pickedFiles=[];
 $('#directDocCamera').onclick=()=>startDirectCamera('Document / Manual Card Photo',async(file)=>{pickedFiles.push(file);renderPicked()});
 $('#fileInput').onchange=e=>{pickedFiles.push(...e.target.files);renderPicked()};$('#saveDocs').onclick=saveDocs;$('#docFilterChild').onchange=drawDocs;await drawDocs()}
function renderPicked(){$('#selectedFiles').innerHTML=pickedFiles.map(f=>`<span class="file-chip">${esc(f.name)} • ${(f.size/1024).toFixed(0)} KB</span>`).join('')}
async function saveDocs(){const id=$('#docChild').value;if(!id){alert('Select child');return}if(!pickedFiles.length){alert('Capture or select at least one file');return}for(const f of pickedFiles)await putDoc({id:uid(),childId:id,type:$('#docType').value,date:$('#docDate').value,note:$('#docNote').value,name:f.name,mime:f.type,size:f.size,blob:f});pickedFiles=[];renderPicked();alert('Document(s) saved');drawDocs()}
async function drawDocs(){const filter=$('#docFilterChild')?.value||'',docs=(await getDocs()).filter(d=>!filter||d.childId===filter).sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('#docList').innerHTML=docs.map(d=>{const c=child(d.childId)||{};return`<div class="docitem"><b>${esc(d.type)}</b><div>${esc(d.name)}</div><div class="docmeta">${esc(c.name||'')} • ${fmt(d.date)} • ${(d.size/1024).toFixed(0)} KB</div><div class="actionrow"><button class="ghost" onclick="app.openDoc('${d.id}')">Open</button><button class="ghost" onclick="app.downloadDoc('${d.id}')">Download</button><button class="ghost" onclick="app.removeDoc('${d.id}')">Delete</button></div></div>`}).join('')||'<p class="muted">No documents saved.</p>'}
async function openDoc(id){const d=await docById(id);if(d)window.open(URL.createObjectURL(d.blob),'_blank')}
async function downloadDoc(id){const d=await docById(id);if(!d)return;const a=document.createElement('a');a.href=URL.createObjectURL(d.blob);a.download=d.name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
async function removeDoc(id){if(confirm('Delete this document?')){await delDoc(id);drawDocs()}}
function openQuickUpload(){showView('documents')}

// Reports
function renderReports(){options($('#reportChild'));$('#generateReport').onclick=generateSelectedReport;$('#printReport').onclick=printParentReport;$('#shareReport').onclick=shareReport;$('#waReport').onclick=waReport}
async function generateSelectedReport(){const id=$('#reportChild').value;if(!id){alert('Select child');return}const c=child(id),fs=fups(id),latest=fs.at(-1),cases=db.cases.filter(x=>x.childId===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))),cs=cases.at(-1),docs=(await getDocs()).filter(x=>x.childId===id),first=fs[0];let photo='';if(c.photoDocId){const pd=await docById(c.photoDocId);if(pd)photo=URL.createObjectURL(pd.blob)}
$('#reportPaper').innerHTML=`${letterhead(fmt(latest?.date||cs?.date), `${photo?`<img src="${photo}" class="avatar-lg">`:''}<div class="patient-head-id">${esc(c.regId||'')}<br>${fmt(latest?.date||cs?.date)}</div>`)}
<div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name)}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Follow-ups</span><b>${fs.length}</b></div><div class="metric"><span>Clinical Entries</span><b>${cases.length}</b></div></div></div>
${latest?`<div class="reportsection"><h3>Latest Growth & Vitals</h3><p>Height ${latest.height||'-'} cm • Weight ${latest.weight||'-'} kg • BMI ${latest.bmi||'-'} • Pulse ${latest.pulse||'-'} • RR ${latest.rr||'-'} • SpO₂ ${latest.spo2||'-'}% • BP ${esc(latest.bp||'-')}</p><p><b>Latest dose:</b> ${esc(latest.dose||'-')}</p></div>`:''}
${first&&latest?`<div class="reportsection"><h3>Baseline vs Latest Functional Progress</h3><table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(first.scores?.[k])}</td><td>${scoreLabel(latest.scores?.[k])}</td><td>${trend(first.scores?.[k],latest.scores?.[k])}</td></tr>`).join('')}</tbody></table></div>`:''}
${cs?`<div class="reportsection"><h3>Latest Clinical Assessment & Prescription</h3><p><b>Impression:</b> ${esc(cs.impression||'-')}</p><p><b>Swarnaprashan:</b> ${esc(cs.dose||'-')} • ${esc(cs.batch||'')}</p><p><b>Other medicines:</b> ${esc(cs.medicines||'-')}</p><p><b>Pathya:</b> ${esc(cs.pathya||'-')}</p><p><b>Apathya:</b> ${esc(cs.apathya||'-')}</p><p><b>Lifestyle:</b> ${esc(cs.lifestyle||'-')}</p><p><b>Instructions:</b> ${esc(cs.rxInstructions||'-')}</p></div>`:''}
${$('#incDocs').checked?`<div class="reportsection"><h3>Documents</h3><ul>${docs.map(d=>`<li>${esc(d.type)} — ${esc(d.name)} — ${fmt(d.date)}</li>`).join('')||'<li>No attachment</li>'}</ul></div>`:''}
<div class="signature"><div class="signature-grid"><div><b>${esc(db.settings.doctor)}</b><br><span>${esc(db.settings.designation)}</span></div><div><b>${esc(db.settings.doctor2)}</b><br><span>${esc(db.settings.designation2)}</span></div></div><div class="signature-address">${esc(db.settings.address)} ${db.settings.phone?'• '+esc(db.settings.phone):''}<br>${esc(db.settings.footer)}</div></div>`}
async function shareReport(){const t=$('#reportPaper').innerText.trim();if(!t){alert('Generate report first');return}if(navigator.share)await navigator.share({title:'Swarnaprashan Report',text:t});else{await navigator.clipboard.writeText(t);alert('Copied')}}
function waReport(){const t=$('#reportPaper').innerText.trim();if(!t){alert('Generate report first');return}window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}
function quickReport(id){showView('reports');$('#reportChild').value=id;generateSelectedReport()}

// Education
function renderEducation(){options($('#eduChild'));$('#buildPlan').onclick=buildPlan}
function buildPlan(){const id=$('#eduChild').value;if(!id){alert('Select child');return}const c=child(id),focus=$('#eduFocus').value,map={'General Swarnaprashan Support':['Balanced age-appropriate meals','Regular sleep-wake timing','Daily outdoor play and physical activity','Adequate hydration','Limit excessive packaged foods and late-night screen exposure'],'Low Appetite':['Small frequent nutritious meals','Avoid grazing/snacks just before meals','Track weight and growth trend','Clinical review if persistent appetite loss or weight loss'],'Constipation':['Adequate fluids','Fiber-rich fruits/vegetables','Regular toilet routine','Daily physical activity','Medical review for pain, blood, vomiting or persistent symptoms'],'Poor Sleep':['Consistent sleep routine','Reduce evening screen exposure','Quiet bedtime routine','Avoid heavy late meals','Assess persistent snoring/breathing difficulty'],'Frequent Illness':['Hand hygiene','Adequate sleep','Balanced diet','Vaccination review','Clinical review for recurrent severe infections or poor growth'],'Learning / Memory Support':['Adequate sleep','Structured study-play balance','Reading/recall exercises','Healthy nutrition/hydration','School or developmental assessment if persistent difficulty'],'Underweight / Poor Growth':['Track serial height/weight','Energy and protein adequacy','Review feeding pattern','Assess recurrent illness/GI symptoms','Pediatric/nutrition review when clinically indicated']};$('#planPaper').innerHTML=`<div class="reporthead"><div><h2>${esc(db.settings.clinicName)}</h2><b>Parent Diet • Pathya • Lifestyle Plan</b></div><div>${esc(c.name)}</div></div><div class="reportsection"><h3>${esc(focus)}</h3><ul>${map[focus].map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="reportsection"><h3>Pathya</h3><p>Fresh, simple, seasonal, well-tolerated food; regular routine; adequate hydration, sleep and play.</p><h3>Apathya</h3><p>Excess junk food, irregular meals, chronic sleep deprivation, excessive screen exposure and unnecessary self-medication.</p></div><div class="signature">${esc(db.settings.doctor)}</div>`}

// Backup / Settings
function renderBackup(){$('#backupBtn').onclick=()=>download('swarnaprashan-v7-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(db,null,2),'application/json');$('#restoreInput').onchange=async e=>{try{db=JSON.parse(await e.target.files[0].text());db.settings={...defaults,...(db.settings||{})};save();alert('Restored');showView('dashboard')}catch{alert('Invalid backup')}};$('#csvBtn').onclick=exportCSV}
function exportCSV(){const head=['Child','RegID','Date','Dose','Height','Weight','BMI','Pulse','RR','SpO2','BP','Issue',...scales],rows=db.followups.map(f=>{const c=child(f.childId)||{};return[c.name,c.regId,f.date,f.dose,f.height,f.weight,f.bmi,f.pulse,f.rr,f.spo2,f.bp,f.issue,...scales.map(k=>f.scores?.[k])]});download('swarnaprashan-followups.csv',[head,...rows].map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv')}
function download(n,t,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function renderSettings(){
 $('#settingsForm').innerHTML=`<div class="section"><h4>Prescription Letterhead</h4><div class="formgrid">
 <label>Clinic Name<input id="s_clinic" value="${esc(db.settings.clinicName)}"></label>
 <label>Prescription Title<input id="s_rxTitle" value="${esc(db.settings.prescriptionTitle||'Swarnaprashan Digital Prescription')}"></label>
 <label>Phone<input id="s_phone" value="${esc(db.settings.phone)}"></label>
 </div></div>
 <div class="section"><h4>Doctor 1</h4><div class="formgrid">
 <label>Name & Degree<input id="s_doctor" value="${esc(db.settings.doctor)}"></label>
 <label>Designation<input id="s_desig" value="${esc(db.settings.designation)}"></label>
 </div></div>
 <div class="section"><h4>Doctor 2</h4><div class="formgrid">
 <label>Name & Degree<input id="s_doctor2" value="${esc(db.settings.doctor2||'Dr. Ravi Chandrakar, B.A.M.S.')}"></label>
 <label>Designation<input id="s_desig2" value="${esc(db.settings.designation2||'Consultant Physician • Ayurveda')}"></label>
 </div></div>
 <div class="section"><h4>Clinic Address & Footer</h4>
 <label>Address<input id="s_address" value="${esc(db.settings.address)}"></label>
 <label>Report Footer<textarea id="s_footer">${esc(db.settings.footer)}</textarea></label></div>
 <div class="actionrow"><button id="saveSettings">Save Letterhead Settings</button></div>`;
 $('#saveSettings').onclick=()=>{
   db.settings={...db.settings,clinicName:$('#s_clinic').value,prescriptionTitle:$('#s_rxTitle').value,doctor:$('#s_doctor').value,designation:$('#s_desig').value,doctor2:$('#s_doctor2').value,designation2:$('#s_desig2').value,phone:$('#s_phone').value,address:$('#s_address').value,footer:$('#s_footer').value};
   save();alert('Letterhead and clinic settings saved');
 };
}

function printHtmlContent(html, title='Mahamaya Clinic Swarnaprashan'){
  if(!html || !html.trim()){
    alert('Please generate the prescription/report first.');
    return;
  }
  const w=window.open('','_blank','width=1000,height=800');
  if(!w){alert('Pop-up blocked. Please allow pop-ups for this site and try again.');return}
  const printCss=`
    @page{size:A4 portrait;margin:12mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Segoe UI,sans-serif;color:#172033;margin:0;background:#fff;font-size:12px;line-height:1.45}
    .reportpaper{padding:0;margin:0;border:0;box-shadow:none}
    .letterhead{border-bottom:2px solid #c79a45;padding-bottom:10px;margin-bottom:14px}
    .letterhead-top{display:flex;justify-content:space-between;gap:16px;align-items:flex-start}
    .clinic-identity{display:flex;gap:12px;align-items:center}
    .letter-logo{width:48px;height:48px;border-radius:12px;background:#6a431c;color:#fff;display:grid;place-items:center;font-size:23px;font-weight:900}
    .clinic-name{font-size:24px;font-weight:900;color:#6a431c}
    .rx-title{font-size:15px;font-weight:800;margin-top:3px}
    .letter-date{text-align:right;font-size:11px}
    .doctor-strip{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:9px}
    .doctor-card{padding:8px 10px;border:1px solid #e8dfd1;border-radius:9px}
    .doctor-card b{display:block;font-size:12px}
    .doctor-card span{display:block;font-size:10px;color:#666;margin-top:2px}
    .clinic-address{font-size:10px;font-weight:700;color:#5f5f5f;margin-top:7px}
    .avatar-lg{width:82px;height:82px;object-fit:cover;border-radius:12px;border:1px solid #ddd}
    .patient-head-id{font-weight:800;margin-top:3px}
    .reportsection{margin:14px 0;break-inside:avoid}
    .reportsection h3{font-size:14px;color:#6a431c;border-bottom:1px solid #e6e0d8;padding-bottom:5px;margin:0 0 8px}
    .metricrow{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
    .metric{border:1px solid #e5e0d8;border-radius:8px;padding:8px}
    .metric span{display:block;font-size:9px;color:#777}
    .metric b{display:block;font-size:14px;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    th,td{border-bottom:1px solid #e8e8e8;padding:6px;text-align:left;font-size:10px}
    th{background:#faf7f2}
    .good{color:#2d7755;font-weight:700}.bad{color:#b14f4f;font-weight:700}.stable{color:#3f6d9c;font-weight:700}
    .signature{margin-top:22px;border-top:1px solid #ddd;padding-top:9px}
    .signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
    .signature-grid span,.signature-address{font-size:9px;color:#666}
    ul{margin:5px 0 5px 18px;padding:0}
  `;
  w.document.open();
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${printCss}</style></head><body><div class="reportpaper">${html}</div><script>window.onload=()=>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  w.document.close();
}
function printCaseReport(){
  const el=$('#caseReportPreview');
  if(!el || !el.innerHTML.trim()){alert('Please generate the prescription first.');return}
  printHtmlContent(el.innerHTML,'Mahamaya Clinic - Swarnaprashan Digital Prescription');
}
function printParentReport(){
  const el=$('#reportPaper');
  if(!el || !el.innerHTML.trim()){alert('Please generate the report first.');return}
  printHtmlContent(el.innerHTML,'Mahamaya Clinic - Swarnaprashan Progress Report');
}

function init(){openIDB().catch(()=>{});bindCameraModal();$$('#nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('#topNewChild').onclick=()=>{showView('children');editChild()};$('#topNewCase').onclick=()=>startClinical();$('#globalSearch').oninput=e=>{const q=e.target.value.trim();if(!q)return;showView('children');$('#childSearch').value=q;drawChildren(q)};showView('dashboard')}
return{init,showView,startClinical,editChild,quickReport,openQuickUpload,openDoc,downloadDoc,removeDoc,generateCaseReport,shareCurrent,whatsappCurrent,printCaseReport,printParentReport,startDirectCamera};
})();
document.addEventListener('DOMContentLoaded',app.init);
