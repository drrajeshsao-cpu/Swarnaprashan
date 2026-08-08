
const app = (() => {
  const KEY='mahamaya_swarnaprashan_v6';
  const defaultSettings={
    clinicName:'Mahamaya Clinic',
    appName:'Swarnaprashan Pro',
    doctor:'Dr. Rajesh Sao, M.D. (Ayurveda)',
    designation:'Consultant Physician • Ayurveda',
    phone:'',address:'Bhatagaon, Raipur',
    footer:'Clinical follow-up record and parent education. Seek urgent medical care for emergency symptoms.'
  };
  let db=JSON.parse(localStorage.getItem(KEY)||'null')||{children:[],cases:[],followups:[],plans:[],settings:defaultSettings};
  db.settings={...defaultSettings,...(db.settings||{})}; db.cases=db.cases||[]; db.followups=db.followups||[];
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const esc=s=>(s??'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const save=()=>localStorage.setItem(KEY,JSON.stringify(db));
  const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'-';
  const child=id=>db.children.find(x=>x.id===id); const followups=id=>db.followups.filter(x=>x.childId===id).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const age=dob=>{if(!dob)return'-';const b=new Date(dob),n=new Date();let y=n.getFullYear()-b.getFullYear(),m=n.getMonth()-b.getMonth();if(m<0){y--;m+=12}return`${y}y ${m}m`};
  const scoreLabel=n=>['Poor','Reduced','Stable/Normal','Improved','Best'][Number(n)]||'-';
  const avg=o=>{const a=Object.values(o||{}).map(Number).filter(x=>!isNaN(x));return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
  const trend=(a,b)=>{if(a==null||b==null)return'<span class="stable">No baseline</span>';if(+b>+a)return'<span class="good">Improved ↑</span>';if(+b<+a)return'<span class="bad">Reduced ↓</span>';return'<span class="stable">Stable →</span>'};
  const viewTitles={
    dashboard:['Dashboard','Premium longitudinal Swarnaprashan clinical tracking'],
    clinical:['Clinical Workspace','Guided Save & Next workflow from profile to prescription'],
    children:['Children','Registry, profile and clinical access'],
    followup:['Monthly Follow-up','Dose, growth, vitals, health, development and Ayurveda tracking'],
    analytics:['Growth & Analytics','Automatic visual longitudinal analysis'],
    documents:['Documents / Manual Card','Camera, gallery, file and PDF attachment workflow'],
    reports:['Reports & Prescription','Print, Save PDF, Share and WhatsApp'],
    education:['Diet • Pathya • Lifestyle','Individualized parent guidance'],
    backup:['Backup / Restore','Data portability and export'],
    settings:['Settings','Clinic identity and prescription details']
  };
  const template=id=>document.getElementById(id).content.cloneNode(true);

  // IndexedDB document store
  let idb;
  function openIDB(){return new Promise((res,rej)=>{const r=indexedDB.open('swarnaprashan_docs_v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('docs',{keyPath:'id'});r.onsuccess=()=>{idb=r.result;res(idb)};r.onerror=()=>rej(r.error)})}
  async function putDoc(d){if(!idb)await openIDB();return new Promise((res,rej)=>{const tx=idb.transaction('docs','readwrite');tx.objectStore('docs').put(d);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}
  async function allDocs(){if(!idb)await openIDB();return new Promise((res,rej)=>{const r=idb.transaction('docs').objectStore('docs').getAll();r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function deleteDoc(id){if(!idb)await openIDB();return new Promise((res,rej)=>{const tx=idb.transaction('docs','readwrite');tx.objectStore('docs').delete(id);tx.oncomplete=res;tx.onerror=()=>rej(tx.error)})}

  function options(sel,blank=true){sel.innerHTML=(blank?'<option value="">Select child</option>':'')+db.children.map(c=>`<option value="${c.id}">${esc(c.name)} • ${esc(c.regId||c.id.slice(-5).toUpperCase())}</option>`).join('')}

  function showView(name){
    $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    $('#pageTitle').textContent=viewTitles[name][0]; $('#pageSubtitle').textContent=viewTitles[name][1];
    const v=$('#view');v.innerHTML='';v.appendChild(template(name+'Tpl'));
    ({dashboard:renderDashboard,clinical:renderClinical,children:renderChildren,followup:renderFollowup,analytics:renderAnalytics,documents:renderDocuments,reports:renderReports,education:renderEducation,backup:renderBackup,settings:renderSettings}[name]||(()=>{}))();
  }

  async function renderDashboard(){
    const thisMonth=db.followups.filter(v=>new Date(v.date).getMonth()===new Date().getMonth()&&new Date(v.date).getFullYear()===new Date().getFullYear()).length;
    let docs=[];try{docs=await allDocs()}catch{}
    $('#kpis').innerHTML=[['Registered Children',db.children.length],['Clinical Entries',db.cases.length],['Visits This Month',thisMonth],['Saved Documents',docs.length]].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
    $('#recentChildren').innerHTML=db.children.slice(-6).reverse().map(c=>`<div class="docitem"><b>${esc(c.name)}</b><div class="docmeta">${age(c.dob)} • ${esc(c.mobile||'')}</div></div>`).join('')||'<p class="muted">No child registered.</p>';
    $('#dueChildren').innerHTML=db.children.slice(0,7).map(c=>{const f=followups(c.id).at(-1);return`<div class="docitem"><b>${esc(c.name)}</b><div class="docmeta">Last follow-up: ${f?fmt(f.date):'Not recorded'}</div></div>`}).join('')||'<p class="muted">Register a child to begin.</p>';
    options($('#dashChild'));$('#dashChild').onchange=()=>drawSnapshot($('#dashChild').value);$('#dashSnapshot').innerHTML='<p class="muted">Select a child for baseline-to-latest analysis.</p>';
    $('#dashDocs').innerHTML=docs.slice(-5).reverse().map(d=>`<div class="docitem"><b>${esc(d.name)}</b><div class="docmeta">${esc(d.type)} • ${fmt(d.date)}</div></div>`).join('')||'<p class="muted">No documents uploaded.</p>';
  }
  function drawSnapshot(id){const fs=followups(id);if(fs.length<2){$('#dashSnapshot').innerHTML='<p class="muted">At least 2 follow-ups required.</p>';return}const a=fs[0],b=fs.at(-1);$('#dashSnapshot').innerHTML=`<div class="metricrow">${['Learning','Memory','Playing','School Performance'].map(k=>`<div class="metric"><span>${k}</span><b>${scoreLabel(b.scores?.[k])}</b>${trend(a.scores?.[k],b.scores?.[k])}</div>`).join('')}</div>`}

  // clinical wizard
  const WSTEPS=['Profile','Examination','Investigations','Treatment','Prescription','Review & Share'];
  let wizard={step:0,caseId:null,data:{}};
  function startClinical(childId=''){showView('clinical');wizard={step:0,caseId:null,data:{childId,date:new Date().toISOString().slice(0,10)}};renderWizard();if(childId){setTimeout(()=>{const e=$('#w_child');if(e)e.value=childId},0)}}
  function renderClinical(){if(!wizard.data||!Object.keys(wizard.data).length)wizard={step:0,caseId:null,data:{date:new Date().toISOString().slice(0,10)}};renderWizard()}
  function renderWizard(){
    $('#wizardSteps').innerHTML=WSTEPS.map((s,i)=>`<div class="step ${i===wizard.step?'active':i<wizard.step?'done':''}">${i+1}. ${s}</div>`).join('');
    $('#prevStepBtn').disabled=wizard.step===0; $('#prevStepBtn').onclick=()=>{collectWizard();wizard.step=Math.max(0,wizard.step-1);renderWizard()};
    $('#saveDraftBtn').onclick=saveDraft; $('#saveNextBtn').textContent=wizard.step===WSTEPS.length-1?'Save & Finish':'Save & Next →';
    $('#saveNextBtn').onclick=()=>{collectWizard();saveDraft();if(wizard.step<WSTEPS.length-1){wizard.step++;renderWizard()}else{alert('Clinical entry saved');showView('reports')}};
    const body=$('#wizardBody'); body.innerHTML=wizardStepHtml(wizard.step); bindWizardFields();
  }
  function wizardStepHtml(i){
    const d=wizard.data;
    const scale=(name,val=2)=>`<label>${name}<select data-w="${name}">${[0,1,2,3,4].map(n=>`<option value="${n}" ${Number(val)===n?'selected':''}>${n} - ${scoreLabel(n)}</option>`).join('')}</select></label>`;
    if(i===0)return`<div class="card"><h3>1. Patient Profile</h3><div class="formgrid">
      <label>Existing Child<select id="w_child"></select></label><label>Visit Date<input id="w_date" type="date" value="${d.date||''}"></label><label>Reason / Visit Type<select id="w_type"><option>Initial Swarnaprashan</option><option>Monthly Follow-up</option><option>Clinical Review</option></select></label>
      <label>Present Complaint<input id="w_complaint" value="${esc(d.complaint||'')}"></label><label>Allergy / Sensitivity<input id="w_allergy" value="${esc(d.allergy||'')}"></label><label>Current Medication<input id="w_currentMeds" value="${esc(d.currentMeds||'')}"></label>
    </div><label>Relevant History<textarea id="w_history">${esc(d.history||'')}</textarea></label></div>`;
    if(i===1)return`<div class="card"><h3>2. Examination</h3><div class="formgrid">
      <label>Height cm<input id="w_height" type="number" step=".1" value="${d.height||''}"></label><label>Weight kg<input id="w_weight" type="number" step=".1" value="${d.weight||''}"></label><label>Temperature °F<input id="w_temp" type="number" step=".1" value="${d.temp||''}"></label>
      <label>Pulse /min<input id="w_pulse" type="number" value="${d.pulse||''}"></label><label>RR /min<input id="w_rr" type="number" value="${d.rr||''}"></label><label>SpO₂ %<input id="w_spo2" type="number" value="${d.spo2||''}"></label>
      <label>BP Systolic<input id="w_sys" type="number" value="${d.sys||''}"></label><label>BP Diastolic<input id="w_dia" type="number" value="${d.dia||''}"></label><label>General Appearance<input id="w_ga" value="${esc(d.ga||'')}"></label>
    </div><div class="section"><h4>Functional Grading 0–4</h4><div class="scalegrid">${['Appetite','Bladder','Bowel','Sleep','Learning','Memory','Playing','School Performance','Energy'].map(x=>scale(x,d.examScores?.[x]??2)).join('')}</div></div>
    <div class="section"><h4>Ashtavidha Pariksha</h4><div class="scalegrid">${['Nadi','Mala','Mutra','Jihva','Shabda','Sparsha','Drik','Akruti'].map(x=>scale('A:'+x,d.examScores?.['A:'+x]??2)).join('')}</div></div>
    <div class="section"><h4>Dashavidha Pariksha</h4><div class="scalegrid">${['Prakriti','Vikriti','Sara','Samhanana','Pramana','Satmya','Satva','Ahara Shakti','Vyayama Shakti','Vaya'].map(x=>scale('D:'+x,d.examScores?.['D:'+x]??2)).join('')}</div></div>
    <label>Examination Notes<textarea id="w_examNotes">${esc(d.examNotes||'')}</textarea></label></div>`;
    if(i===2)return`<div class="card"><h3>3. Investigations & Attachments</h3><div class="formgrid">
      <label>Investigation Summary<textarea id="w_invest">${esc(d.invest||'')}</textarea></label><label>Clinical Impression<textarea id="w_impression">${esc(d.impression||'')}</textarea></label><label>Red Flags / Safety Notes<textarea id="w_redflags">${esc(d.redflags||'')}</textarea></label>
    </div><label class="uploadbox">📷 Add investigation photo / gallery image / file / PDF<input id="w_files" type="file" multiple accept="image/*,.pdf,.doc,.docx" capture="environment"></label><p class="tiny muted">Selected files are saved when you press Save & Next.</p></div>`;
    if(i===3)return`<div class="card"><h3>4. Treatment Plan</h3><div class="formgrid">
      <label>Swarnaprashan Dose<input id="w_dose" value="${esc(d.dose||'')}"></label><label>Preparation / Batch<input id="w_batch" value="${esc(d.batch||'')}"></label><label>Next Follow-up<input id="w_next" type="date" value="${d.next||''}"></label>
      <label>Other Medicines<textarea id="w_medicines">${esc(d.medicines||'')}</textarea></label><label>Diet / Pathya<textarea id="w_pathya">${esc(d.pathya||'')}</textarea></label><label>Apathya / Avoid<textarea id="w_apathya">${esc(d.apathya||'')}</textarea></label>
      <label>Activity / Lifestyle<textarea id="w_lifestyle">${esc(d.lifestyle||'')}</textarea></label><label>School / Cognitive Advice<textarea id="w_cognitive">${esc(d.cognitive||'')}</textarea></label><label>Safety / Referral Advice<textarea id="w_safety">${esc(d.safety||'')}</textarea></label>
    </div></div>`;
    if(i===4)return`<div class="card"><h3>5. Prescription Builder</h3><div class="formgrid">
      <label>Prescription Title<input id="w_rxTitle" value="${esc(d.rxTitle||'Digital Swarnaprashan Prescription')}"></label><label>Special Instructions<textarea id="w_rxInstructions">${esc(d.rxInstructions||'')}</textarea></label><label>Parent Message<textarea id="w_parentMsg">${esc(d.parentMsg||'')}</textarea></label>
    </div><div class="section"><h4>Print Options</h4><label><input id="w_printGrowth" type="checkbox" ${d.printGrowth!==false?'checked':''}> Include growth summary</label><br><label><input id="w_printAssessment" type="checkbox" ${d.printAssessment!==false?'checked':''}> Include assessment summary</label><br><label><input id="w_printDocs" type="checkbox" ${d.printDocs!==false?'checked':''}> Include uploaded-document list</label></div></div>`;
    return`<div class="card"><h3>6. Review, Save, Print & Share</h3><div id="wizardReview"></div><div class="actionrow"><button onclick="app.generateCaseReport()">Generate Prescription</button><button class="ghost" onclick="window.print()">Print / Save PDF</button><button class="ghost" onclick="app.shareCurrent()">Share</button><button class="ghost" onclick="app.whatsappCurrent()">WhatsApp</button></div></div><div id="caseReportPreview" class="reportpaper"></div>`;
  }
  function bindWizardFields(){const c=$('#w_child');if(c){options(c);c.value=wizard.data.childId||''} if(wizard.step===5){$('#wizardReview').innerHTML=reviewHtml();generateCaseReport(false)}}
  function collectWizard(){
    const d=wizard.data;
    if(wizard.step===0){d.childId=$('#w_child')?.value||d.childId;d.date=$('#w_date')?.value;d.type=$('#w_type')?.value;d.complaint=$('#w_complaint')?.value;d.allergy=$('#w_allergy')?.value;d.currentMeds=$('#w_currentMeds')?.value;d.history=$('#w_history')?.value}
    if(wizard.step===1){['height','weight','temp','pulse','rr','spo2','sys','dia','ga','examNotes'].forEach(k=>d[k]=$('#w_'+k)?.value);d.examScores={};$$('[data-w]').forEach(e=>d.examScores[e.dataset.w]=Number(e.value));d.bmi=d.height&&d.weight?(+d.weight/((+d.height/100)**2)).toFixed(2):''}
    if(wizard.step===2){d.invest=$('#w_invest')?.value;d.impression=$('#w_impression')?.value;d.redflags=$('#w_redflags')?.value;const files=$('#w_files')?.files;if(files?.length)saveCaseFiles(files)}
    if(wizard.step===3){['dose','batch','next','medicines','pathya','apathya','lifestyle','cognitive','safety'].forEach(k=>d[k]=$('#w_'+k)?.value)}
    if(wizard.step===4){['rxTitle','rxInstructions','parentMsg'].forEach(k=>d[k]=$('#w_'+k)?.value);d.printGrowth=$('#w_printGrowth')?.checked;d.printAssessment=$('#w_printAssessment')?.checked;d.printDocs=$('#w_printDocs')?.checked}
  }
  async function saveCaseFiles(files){if(!wizard.caseId)wizard.caseId=uid();for(const f of files){await putDoc({id:uid(),childId:wizard.data.childId||'',caseId:wizard.caseId,type:'Investigation / Clinical Attachment',date:wizard.data.date||new Date().toISOString().slice(0,10),name:f.name,mime:f.type,size:f.size,blob:f,note:''})}}
  function saveDraft(){if(!wizard.data.childId&&wizard.step>0){alert('Please select a child in Patient Profile');return}if(!wizard.caseId)wizard.caseId=uid();const item={id:wizard.caseId,...wizard.data,updatedAt:new Date().toISOString(),status:wizard.step===5?'Complete':'Draft'};const ix=db.cases.findIndex(x=>x.id===item.id);if(ix>=0)db.cases[ix]=item;else db.cases.push(item);save();const s=$('#draftStatus');if(s)s.textContent='Saved '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
  function reviewHtml(){const d=wizard.data,c=child(d.childId)||{};return`<div class="metricrow"><div class="metric"><span>Child</span><b>${esc(c.name||'-')}</b></div><div class="metric"><span>Date</span><b>${fmt(d.date)}</b></div><div class="metric"><span>Dose</span><b>${esc(d.dose||'-')}</b></div><div class="metric"><span>BMI</span><b>${d.bmi||'-'}</b></div></div><div class="section"><h4>Clinical Impression</h4><p>${esc(d.impression||'-')}</p></div>`}
  async function generateCaseReport(scroll=true){
    const d=wizard.data,c=child(d.childId)||{}, docs=(await allDocs()).filter(x=>x.childId===d.childId);
    const el=$('#caseReportPreview')||$('#reportPaper'); if(!el)return;
    el.innerHTML=`<div class="reporthead"><div><h2>${esc(db.settings.clinicName)}</h2><b>${esc(d.rxTitle||'Digital Swarnaprashan Prescription')}</b><div class="muted">${esc(db.settings.doctor)} • ${esc(db.settings.designation)}</div></div><div><b>${esc(c.regId||'')}</b><br>${fmt(d.date)}</div></div>
    <div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name||'-')}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Height / Weight</span><b>${d.height||'-'} cm / ${d.weight||'-'} kg</b></div><div class="metric"><span>BMI</span><b>${d.bmi||'-'}</b></div></div></div>
    <div class="reportsection"><h3>Clinical Assessment</h3><p><b>Complaint:</b> ${esc(d.complaint||'-')}</p><p><b>Impression:</b> ${esc(d.impression||'-')}</p><p><b>Vitals:</b> Pulse ${d.pulse||'-'} • RR ${d.rr||'-'} • SpO₂ ${d.spo2||'-'}% • BP ${d.sys||'-'}/${d.dia||'-'}</p><p><b>Safety / Red flags:</b> ${esc(d.redflags||'None recorded')}</p></div>
    <div class="reportsection"><h3>Swarnaprashan & Treatment</h3><p><b>Swarnaprashan Dose:</b> ${esc(d.dose||'-')} &nbsp; <b>Preparation/Batch:</b> ${esc(d.batch||'-')}</p><p><b>Other medicines:</b> ${esc(d.medicines||'-')}</p><p><b>Next follow-up:</b> ${fmt(d.next)}</p></div>
    <div class="reportsection"><h3>Diet • Pathya • Lifestyle</h3><p><b>Pathya:</b> ${esc(d.pathya||'-')}</p><p><b>Apathya:</b> ${esc(d.apathya||'-')}</p><p><b>Activity/Lifestyle:</b> ${esc(d.lifestyle||'-')}</p><p><b>Learning/School advice:</b> ${esc(d.cognitive||'-')}</p></div>
    <div class="reportsection"><h3>Instructions</h3><p>${esc(d.rxInstructions||'-')}</p><p><b>Parent message:</b> ${esc(d.parentMsg||'-')}</p></div>
    ${d.printDocs!==false?`<div class="reportsection"><h3>Attached Clinical Documents</h3><ul>${docs.map(x=>`<li>${esc(x.type)} — ${esc(x.name)} (${fmt(x.date)})</li>`).join('')||'<li>No document attached</li>'}</ul></div>`:''}
    <div class="signature"><b>${esc(db.settings.doctor)}</b><br><span class="muted">${esc(db.settings.address)} • ${esc(db.settings.phone)}<br>${esc(db.settings.footer)}</span></div>`;
    if(scroll)el.scrollIntoView({behavior:'smooth'});
  }
  function currentText(){const el=$('#caseReportPreview')||$('#reportPaper');return el?.innerText.trim()||''}
  async function shareCurrent(){const text=currentText();if(!text){alert('Generate report first');return}if(navigator.share)await navigator.share({title:'Mahamaya Clinic Swarnaprashan',text});else{await navigator.clipboard.writeText(text);alert('Copied to clipboard')}}
  function whatsappCurrent(){const text=currentText();if(!text){alert('Generate report first');return}window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank')}

  // children
  function renderChildren(){$('#registerChildBtn').onclick=()=>editChild();$('#childSearch').oninput=()=>drawChildren($('#childSearch').value);drawChildren('')}
  function editChild(id=''){const c=id?child(id):{};$('#childEditor').innerHTML=`<div class="card"><h3>${id?'Edit':'Register'} Child</h3><div class="formgrid">
    <label>Name<input id="c_name" value="${esc(c.name||'')}"></label><label>Date of Birth<input id="c_dob" type="date" value="${c.dob||''}"></label><label>Sex<select id="c_sex"><option ${c.sex==='Male'?'selected':''}>Male</option><option ${c.sex==='Female'?'selected':''}>Female</option><option>Other</option></select></label>
    <label>Parent / Guardian<input id="c_parent" value="${esc(c.parent||'')}"></label><label>Mobile / WhatsApp<input id="c_mobile" value="${esc(c.mobile||'')}"></label><label>Registration ID<input id="c_reg" value="${esc(c.regId||('SW'+String(db.children.length+1).padStart(4,'0')))}"></label>
    <label>School / Class<input id="c_school" value="${esc(c.school||'')}"></label><label>Address<input id="c_address" value="${esc(c.address||'')}"></label><label>Allergies<input id="c_allergy" value="${esc(c.allergies||'')}"></label></div><label>Birth / Medical / Developmental History<textarea id="c_history">${esc(c.history||'')}</textarea></label><div class="actionrow"><button id="saveChild">Save Child</button><button class="ghost" id="cancelChild">Cancel</button></div></div>`;
    $('#saveChild').onclick=()=>{const x={id:id||uid(),name:$('#c_name').value.trim(),dob:$('#c_dob').value,sex:$('#c_sex').value,parent:$('#c_parent').value,mobile:$('#c_mobile').value,regId:$('#c_reg').value,school:$('#c_school').value,address:$('#c_address').value,allergies:$('#c_allergy').value,history:$('#c_history').value};if(!x.name){alert('Name required');return}if(id)db.children=db.children.map(y=>y.id===id?x:y);else db.children.push(x);save();$('#childEditor').innerHTML='';drawChildren('')};$('#cancelChild').onclick=()=>$('#childEditor').innerHTML=''
  }
  function drawChildren(q){q=(q||'').toLowerCase();const arr=db.children.filter(c=>[c.name,c.mobile,c.regId].join(' ').toLowerCase().includes(q));$('#childrenList').innerHTML=`<table><thead><tr><th>ID</th><th>Child</th><th>Age/Sex</th><th>Parent</th><th>Follow-ups</th><th>Actions</th></tr></thead><tbody>${arr.map(c=>`<tr><td>${esc(c.regId||'-')}</td><td><b>${esc(c.name)}</b><div class="muted">${esc(c.school||'')}</div></td><td>${age(c.dob)} / ${esc(c.sex||'-')}</td><td>${esc(c.parent||'-')}<div class="muted">${esc(c.mobile||'')}</div></td><td>${followups(c.id).length}</td><td><button onclick="app.editChild('${c.id}')">Edit</button> <button class="ghost" onclick="app.startClinical('${c.id}')">Clinical</button> <button class="ghost" onclick="app.quickReport('${c.id}')">Report</button></td></tr>`).join('')}</tbody></table>`}

  // follow-up
  const scales=['Appetite','Bladder','Bowel','Sleep','Learning','Memory','Playing','School Performance','Energy','Illness Frequency'];
  function scaleOptions(v=2){return[0,1,2,3,4].map(n=>`<option value="${n}" ${Number(v)===n?'selected':''}>${n} - ${scoreLabel(n)}</option>`).join('')}
  function renderFollowup(){options($('#followupChild'));$('#followupChild').onchange=()=>drawTimeline($('#followupChild').value);$('#followupForm').innerHTML=`<div class="formgrid">
    <label>Child<select id="f_child"></select></label><label>Date<input id="f_date" type="date"></label><label>Swarnaprashan Dose<input id="f_dose"></label><label>Batch/Preparation<input id="f_batch"></label>
    <label>Height cm<input id="f_height" type="number" step=".1"></label><label>Weight kg<input id="f_weight" type="number" step=".1"></label><label>Pulse<input id="f_pulse" type="number"></label><label>RR<input id="f_rr" type="number"></label><label>SpO₂<input id="f_spo2" type="number"></label><label>BP<input id="f_bp" placeholder="e.g. 100/60"></label>
  </div><div class="section"><h4>Health & Functional Grading 0–4</h4><div class="scalegrid">${scales.map(x=>`<div class="scalebox"><b>${x}</b><select data-fscore="${x}">${scaleOptions()}</select></div>`).join('')}</div></div>
  <div class="formgrid"><label>Current Health Issue<textarea id="f_issue"></textarea></label><label>Medical / Treatment Notes<textarea id="f_med"></textarea></label><label>Parent Observation<textarea id="f_parent"></textarea></label></div>
  <button id="saveFollow">Save Follow-up</button>`;options($('#f_child'));$('#f_date').value=new Date().toISOString().slice(0,10);$('#saveFollow').onclick=saveFollow}
  function saveFollow(){const id=$('#f_child').value;if(!id){alert('Select child');return}const s={};$$('[data-fscore]').forEach(e=>s[e.dataset.fscore]=Number(e.value));const h=+$('#f_height').value||0,w=+$('#f_weight').value||0;db.followups.push({id:uid(),childId:id,date:$('#f_date').value,dose:$('#f_dose').value,batch:$('#f_batch').value,height:h,weight:w,bmi:h&&w?(w/((h/100)**2)).toFixed(2):'',pulse:$('#f_pulse').value,rr:$('#f_rr').value,spo2:$('#f_spo2').value,bp:$('#f_bp').value,scores:s,issue:$('#f_issue').value,med:$('#f_med').value,parent:$('#f_parent').value});save();alert('Follow-up saved');showView('followup');$('#followupChild').value=id;drawTimeline(id)}
  function drawTimeline(id){const fs=followups(id);$('#followupTimeline').innerHTML=!id?'<p class="muted">Select a child.</p>':`<table><thead><tr><th>Date</th><th>Dose</th><th>Growth</th><th>Vitals</th><th>Health</th><th>Overall</th></tr></thead><tbody>${fs.map((f,i)=>`<tr><td>${fmt(f.date)}</td><td>${esc(f.dose||'-')}</td><td>${f.height||'-'} cm • ${f.weight||'-'} kg<br>BMI ${f.bmi||'-'}</td><td>P ${f.pulse||'-'} • SpO₂ ${f.spo2||'-'}<br>BP ${esc(f.bp||'-')}</td><td>${esc(f.issue||'No issue')}</td><td>${i?trend(avg(fs[i-1].scores),avg(f.scores)):'Baseline'}</td></tr>`).join('')}</tbody></table>`}

  // analytics
  function renderAnalytics(){options($('#analyticsChild'));$('#analyticsChild').onchange=()=>drawAnalytics($('#analyticsChild').value);$('#analyticSummary').innerHTML='<p class="muted">Select a child.</p>'}
  function drawAnalytics(id){const fs=followups(id);if(!fs.length){$('#analyticSummary').innerHTML='<p class="muted">No follow-up data.</p>';clearCanvases();return}const a=fs[0],b=fs.at(-1);$('#analyticSummary').innerHTML=`<div class="metric"><span>Visits</span><b>${fs.length}</b></div><div class="metric"><span>Latest Height</span><b>${b.height||'-'} cm</b></div><div class="metric"><span>Latest Weight</span><b>${b.weight||'-'} kg</b></div><div class="metric"><span>Functional Avg</span><b>${(avg(b.scores)||0).toFixed(1)}/4</b></div>`;
    drawLine($('#lineChart'),fs);drawBars($('#barChart'),a,b);drawPie($('#pieChart'),b);$('#baselineLatest').innerHTML=`<table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(a.scores?.[k])}</td><td>${scoreLabel(b.scores?.[k])}</td><td>${trend(a.scores?.[k],b.scores?.[k])}</td></tr>`).join('')}</tbody></table>`}
  function clearCanvases(){['lineChart','barChart','pieChart'].forEach(id=>{const c=$('#'+id);if(c)c.getContext('2d').clearRect(0,0,c.width,c.height)})}
  function drawLine(c,fs){const ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);ctx.strokeStyle='#e5e5e5';for(let i=1;i<6;i++){let y=i*H/6;ctx.beginPath();ctx.moveTo(50,y);ctx.lineTo(W-20,y);ctx.stroke()}const series=[['weight','#2d7755'],['height','#b68733'],['bmi','#3f6d9c']];series.forEach(([k,col])=>{const vals=fs.map(f=>+f[k]).filter(Boolean);if(!vals.length)return;const min=Math.min(...vals),max=Math.max(...vals);ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();fs.forEach((f,i)=>{let v=+f[k];if(!v)return;let x=55+i*(W-90)/Math.max(1,fs.length-1),y=H-35-(v-min)/Math.max(1,max-min)*(H-75);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()})}
  function drawBars(c,a,b){const ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const keys=['Learning','Memory','Playing','School Performance','Appetite','Sleep'];const bw=(W-80)/(keys.length*2.4);keys.forEach((k,i)=>{const x=45+i*(W-80)/keys.length;const va=+a.scores?.[k]||0,vb=+b.scores?.[k]||0;ctx.fillStyle='#d7c6aa';ctx.fillRect(x,H-35-va*(H-80)/4,bw,va*(H-80)/4);ctx.fillStyle='#6a4928';ctx.fillRect(x+bw+5,H-35-vb*(H-80)/4,bw,vb*(H-80)/4);ctx.fillStyle='#555';ctx.font='12px sans-serif';ctx.fillText(k.slice(0,8),x,H-12)})}
  function drawPie(c,b){const ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);const vals=Object.values(b.scores||{}).map(Number),counts=[0,0,0,0,0];vals.forEach(v=>counts[v]++);const total=Math.max(1,vals.length),cols=['#b14f4f','#d58b55','#d4b25c','#5f9d78','#2d7755'];let start=-Math.PI/2;counts.forEach((n,i)=>{const ang=2*Math.PI*n/total;ctx.beginPath();ctx.moveTo(W/2,H/2);ctx.fillStyle=cols[i];ctx.arc(W/2,H/2,120,start,start+ang);ctx.fill();start+=ang});ctx.fillStyle='#555';ctx.font='13px sans-serif';counts.forEach((n,i)=>ctx.fillText(`${scoreLabel(i)}: ${n}`,20,28+i*22))}

  // documents
  async function renderDocuments(){options($('#docChild'));options($('#docFilterChild'));$('#docDate').value=new Date().toISOString().slice(0,10);$('#saveDocs').onclick=saveDocs;$('#docFilterChild').onchange=drawDocs;await drawDocs()}
  async function saveDocs(){const childId=$('#docChild').value,files=$('#docFiles').files;if(!childId){alert('Select child');return}if(!files.length){alert('Choose at least one file');return}for(const f of files){await putDoc({id:uid(),childId,type:$('#docType').value,date:$('#docDate').value,note:$('#docNote').value,name:f.name,mime:f.type,size:f.size,blob:f})}alert('Document(s) saved');$('#docFiles').value='';drawDocs()}
  async function drawDocs(){const filter=$('#docFilterChild')?.value||'';const docs=(await allDocs()).filter(d=>!filter||d.childId===filter).sort((a,b)=>String(b.date).localeCompare(String(a.date)));$('#docList').innerHTML=docs.map(d=>{const c=child(d.childId)||{};return`<div class="docitem"><b>${esc(d.type)}</b><div>${esc(d.name)}</div><div class="docmeta">${esc(c.name||'')} • ${fmt(d.date)} • ${(d.size/1024).toFixed(0)} KB</div><div class="actionrow"><button class="ghost" onclick="app.openDoc('${d.id}')">Open</button><button class="ghost" onclick="app.removeDoc('${d.id}')">Delete</button></div></div>`}).join('')||'<p class="muted">No documents saved.</p>'}
  async function openDoc(id){const d=(await allDocs()).find(x=>x.id===id);if(!d)return;window.open(URL.createObjectURL(d.blob),'_blank')}
  async function removeDoc(id){if(confirm('Delete this document?')){await deleteDoc(id);drawDocs()}}
  function openQuickUpload(){showView('documents')}

  // reports
  function renderReports(){options($('#reportChild'));$('#generateReport').onclick=generateSelectedReport;$('#printReport').onclick=()=>window.print();$('#shareReport').onclick=shareReport;$('#waReport').onclick=waReport}
  async function generateSelectedReport(){const id=$('#reportChild').value;if(!id){alert('Select child');return}const c=child(id),fs=followups(id),latest=fs.at(-1),cases=db.cases.filter(x=>x.childId===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))),cs=cases.at(-1),docs=(await allDocs()).filter(x=>x.childId===id);const first=fs[0];$('#reportPaper').innerHTML=`<div class="reporthead"><div><h2>${esc(db.settings.clinicName)}</h2><b>Swarnaprashan Progress Report & Digital Prescription</b><div class="muted">${esc(db.settings.doctor)} • ${esc(db.settings.designation)}</div></div><div><b>${esc(c.regId||'')}</b><br>${fmt(latest?.date||cs?.date)}</div></div>
  <div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name)}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Follow-ups</span><b>${fs.length}</b></div><div class="metric"><span>Clinical Entries</span><b>${cases.length}</b></div></div></div>
  ${latest?`<div class="reportsection"><h3>Latest Growth & Vitals</h3><p>Height ${latest.height||'-'} cm • Weight ${latest.weight||'-'} kg • BMI ${latest.bmi||'-'} • Pulse ${latest.pulse||'-'} • RR ${latest.rr||'-'} • SpO₂ ${latest.spo2||'-'}% • BP ${esc(latest.bp||'-')}</p><p><b>Latest dose:</b> ${esc(latest.dose||'-')}</p></div>`:''}
  ${first&&latest?`<div class="reportsection"><h3>Baseline vs Latest Functional Progress</h3><table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(first.scores?.[k])}</td><td>${scoreLabel(latest.scores?.[k])}</td><td>${trend(first.scores?.[k],latest.scores?.[k])}</td></tr>`).join('')}</tbody></table></div>`:''}
  ${cs?`<div class="reportsection"><h3>Latest Clinical Assessment & Prescription</h3><p><b>Impression:</b> ${esc(cs.impression||'-')}</p><p><b>Swarnaprashan:</b> ${esc(cs.dose||'-')} • ${esc(cs.batch||'')}</p><p><b>Other medicines:</b> ${esc(cs.medicines||'-')}</p><p><b>Pathya:</b> ${esc(cs.pathya||'-')}</p><p><b>Apathya:</b> ${esc(cs.apathya||'-')}</p><p><b>Lifestyle:</b> ${esc(cs.lifestyle||'-')}</p><p><b>Instructions:</b> ${esc(cs.rxInstructions||'-')}</p></div>`:''}
  ${$('#incDocs').checked?`<div class="reportsection"><h3>Documents</h3><ul>${docs.map(d=>`<li>${esc(d.type)} — ${esc(d.name)} — ${fmt(d.date)}</li>`).join('')||'<li>No attachment</li>'}</ul></div>`:''}
  <div class="signature"><b>${esc(db.settings.doctor)}</b><br><span class="muted">${esc(db.settings.address)} • ${esc(db.settings.phone)}<br>${esc(db.settings.footer)}</span></div>`}
  async function shareReport(){const t=$('#reportPaper').innerText.trim();if(!t){alert('Generate report first');return}if(navigator.share)await navigator.share({title:'Swarnaprashan Report',text:t});else{await navigator.clipboard.writeText(t);alert('Copied')}}
  function waReport(){const t=$('#reportPaper').innerText.trim();if(!t){alert('Generate report first');return}window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}
  function quickReport(id){showView('reports');$('#reportChild').value=id;generateSelectedReport()}

  // education
  function renderEducation(){options($('#eduChild'));$('#buildPlan').onclick=buildPlan}
  function buildPlan(){const id=$('#eduChild').value;if(!id){alert('Select child');return}const c=child(id),focus=$('#eduFocus').value;const map={
   'General Swarnaprashan Support':['Balanced age-appropriate meals','Regular sleep-wake timing','Daily outdoor play and physical activity','Adequate hydration','Limit excessive packaged foods and late-night screen exposure'],
   'Low Appetite':['Small frequent nutritious meals','Avoid grazing/snacks just before meals','Track weight and growth trend','Clinical review if persistent appetite loss, weight loss or red flags'],
   'Constipation':['Adequate fluids','Fiber-rich fruits/vegetables','Regular toilet routine','Daily physical activity','Medical review for pain, blood, vomiting or persistent symptoms'],
   'Poor Sleep':['Consistent sleep routine','Reduce evening screen exposure','Quiet bedtime routine','Avoid heavy late meals','Assess persistent snoring/breathing difficulty'],
   'Frequent Illness':['Hand hygiene','Adequate sleep','Balanced diet','Vaccination review','Clinical review for recurrent severe infections or poor growth'],
   'Learning / Memory Support':['Adequate sleep','Structured study-play balance','Reading/recall exercises','Healthy nutrition/hydration','School or developmental assessment if persistent difficulty'],
   'Underweight / Poor Growth':['Track serial height/weight','Energy and protein adequacy','Review feeding pattern','Assess recurrent illness/GI symptoms','Pediatric/nutrition review when clinically indicated']
  };$('#planPaper').innerHTML=`<div class="reporthead"><div><h2>${esc(db.settings.clinicName)}</h2><b>Parent Diet • Pathya • Lifestyle Plan</b></div><div>${esc(c.name)}</div></div><div class="reportsection"><h3>${esc(focus)}</h3><ul>${map[focus].map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="reportsection"><h3>Pathya</h3><p>Fresh, simple, seasonal, well-tolerated food; regular routine; adequate hydration, sleep and play.</p><h3>Apathya</h3><p>Excess junk food, irregular meals, chronic sleep deprivation, excessive screen exposure and unnecessary self-medication.</p></div><div class="signature">${esc(db.settings.doctor)}</div>`}

  // backup/settings
  function renderBackup(){$('#backupBtn').onclick=()=>download('swarnaprashan-v6-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(db,null,2),'application/json');$('#restoreInput').onchange=async e=>{try{db=JSON.parse(await e.target.files[0].text());db.settings={...defaultSettings,...(db.settings||{})};save();alert('Restored');showView('dashboard')}catch{alert('Invalid backup')}};$('#csvBtn').onclick=exportCSV}
  function exportCSV(){const head=['Child','RegID','Date','Dose','Height','Weight','BMI','Pulse','RR','SpO2','BP','Issue',...scales];const rows=db.followups.map(f=>{const c=child(f.childId)||{};return[c.name,c.regId,f.date,f.dose,f.height,f.weight,f.bmi,f.pulse,f.rr,f.spo2,f.bp,f.issue,...scales.map(k=>f.scores?.[k])]});download('swarnaprashan-followups.csv',[head,...rows].map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv')}
  function download(n,t,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
  function renderSettings(){$('#settingsForm').innerHTML=`<div class="formgrid"><label>Clinic Name<input id="s_clinic" value="${esc(db.settings.clinicName)}"></label><label>Doctor<input id="s_doctor" value="${esc(db.settings.doctor)}"></label><label>Designation<input id="s_desig" value="${esc(db.settings.designation)}"></label><label>Phone<input id="s_phone" value="${esc(db.settings.phone)}"></label><label>Address<input id="s_address" value="${esc(db.settings.address)}"></label></div><label>Report Footer<textarea id="s_footer">${esc(db.settings.footer)}</textarea></label><div class="actionrow"><button id="saveSettings">Save Settings</button></div>`;$('#saveSettings').onclick=()=>{db.settings={...db.settings,clinicName:$('#s_clinic').value,doctor:$('#s_doctor').value,designation:$('#s_desig').value,phone:$('#s_phone').value,address:$('#s_address').value,footer:$('#s_footer').value};save();alert('Settings saved')}}

  function init(){openIDB().catch(()=>{});$$('#nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('#topNewChild').onclick=()=>{showView('children');editChild()};$('#topNewCase').onclick=()=>startClinical();$('#globalSearch').oninput=e=>{const q=e.target.value.trim();if(!q)return;showView('children');$('#childSearch').value=q;drawChildren(q)};showView('dashboard')}
  return {init,showView,startClinical,editChild,quickReport,openQuickUpload,openDoc,removeDoc,generateCaseReport,shareCurrent,whatsappCurrent};
})();
document.addEventListener('DOMContentLoaded',app.init);
