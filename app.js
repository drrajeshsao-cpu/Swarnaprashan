
const app = (() => {
  const KEY = 'mahamaya_swarnaprashan_v5';
  const defaultSettings = {
    clinicName:'Mahamaya Clinic',
    subtitle:'Swarnaprashan Clinical Tracker',
    doctor:'Dr. Rajesh Sao, M.D. (Ayurveda)',
    designation:'Consultant Physician • Ayurveda',
    phone:'',
    address:'Bhatagaon, Raipur',
    footer:'For clinical follow-up and parent education. Not a substitute for emergency care.'
  };
  let db = JSON.parse(localStorage.getItem(KEY) || 'null') || {children:[], visits:[], settings:defaultSettings, plans:[]};
  db.settings = {...defaultSettings, ...(db.settings||{})};

  const $ = s => document.querySelector(s);
  const esc = s => (s??'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const uid = () => Date.now().toString(36)+Math.random().toString(36).slice(2,7);
  const save = () => localStorage.setItem(KEY, JSON.stringify(db));
  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}) : '-';
  const ageText = dob => {
    if(!dob) return '-';
    const b=new Date(dob), n=new Date(); let y=n.getFullYear()-b.getFullYear(), m=n.getMonth()-b.getMonth();
    if(m<0){y--;m+=12} return `${y}y ${m}m`;
  };
  const childById = id => db.children.find(x=>x.id===id);
  const visitsOf = id => db.visits.filter(v=>v.childId===id).sort((a,b)=>new Date(a.date)-new Date(b.date));
  const scoreLabel = v => ['Poor','Reduced','Stable/Normal','Improved','Best'][Number(v)||0] || '-';
  const trendLabel = (a,b) => {
    if(a==null||b==null||a==='') return '<span class="trend-stable">No baseline</span>';
    const x=Number(a),y=Number(b); if(y>x) return '<span class="trend-up">Improved ↑</span>';
    if(y<x) return '<span class="trend-down">Reduced ↓</span>';
    return '<span class="trend-stable">Stable →</span>';
  };
  const navTitles = {
    dashboard:['Dashboard','Longitudinal child development, Swarnaprashan and parent-ready reporting'],
    children:['Children','Registration, contact details and clinical profile'],
    monthly:['Monthly Follow-up','Dose, growth, vitals, health and developmental monitoring'],
    growth:['Growth & BMI','Track height, weight and BMI across visits'],
    assessment:['Clinical Assessment','Ashtavidha, Dashavidha and functional grading analysis'],
    reports:['Reports & Prescription','Generate, print, save as PDF and share parent-ready records'],
    education:['Diet • Pathya • Lifestyle','Personalized parent guidance and supportive care'],
    backup:['Backup / Restore','Portable local data backup and CSV export'],
    settings:['Settings','Clinic identity and prescription footer']
  };
  const tpl = id => document.getElementById(id).content.cloneNode(true);

  function showView(name){
    document.querySelectorAll('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
    $('#pageTitle').textContent = navTitles[name][0]; $('#pageSubtitle').textContent = navTitles[name][1];
    const view=$('#view'); view.innerHTML=''; view.appendChild(tpl(name+'Tpl'));
    ({dashboard:renderDashboard,children:renderChildren,monthly:renderMonthly,growth:renderGrowth,assessment:renderAssessment,reports:renderReports,education:renderEducation,backup:renderBackup,settings:renderSettings}[name]||(()=>{}))();
  }

  function childOptions(sel, includeBlank=true){
    sel.innerHTML=(includeBlank?'<option value="">Select child</option>':'')+db.children.map(c=>`<option value="${c.id}">${esc(c.name)} • ${esc(c.regId||c.id.slice(-5).toUpperCase())}</option>`).join('');
  }

  function renderDashboard(){
    const c=db.children.length,v=db.visits.length;
    const thisMonth=db.visits.filter(x=>new Date(x.date).getMonth()===new Date().getMonth()&&new Date(x.date).getFullYear()===new Date().getFullYear()).length;
    const with2=db.children.filter(ch=>visitsOf(ch.id).length>=2).length;
    $('#kpis').innerHTML=[
      ['Registered Children',c],['Total Swarnaprashan Visits',v],['Visits This Month',thisMonth],['Children With Trend Data',with2]
    ].map(x=>`<div class="kpi"><div class="num">${x[1]}</div><div class="lbl">${x[0]}</div></div>`).join('');
    $('#recentChildren').innerHTML=db.children.slice(-6).reverse().map(ch=>`<div style="padding:9px 0;border-bottom:1px solid #eee"><b>${esc(ch.name)}</b><div class="muted">${ageText(ch.dob)} • ${esc(ch.mobile||'')}</div></div>`).join('')||'<p class="muted">No children registered yet.</p>';
    $('#dueList').innerHTML=db.children.slice(0,8).map(ch=>{
      const vs=visitsOf(ch.id); const last=vs.at(-1);
      return `<div style="padding:9px 0;border-bottom:1px solid #eee"><b>${esc(ch.name)}</b><div class="muted">Last visit: ${last?fmtDate(last.date):'No visit yet'}</div></div>`;
    }).join('')||'<p class="muted">Register a child to begin.</p>';
    const eligible=db.children.find(ch=>visitsOf(ch.id).length>=2);
    $('#dashboardTrend').innerHTML=eligible?buildMiniTrend(eligible.id):'<p class="muted">At least 2 monthly visits are required for improvement analysis.</p>';
  }

  function renderChildren(){
    $('#addChildBtn').onclick=()=>showChildForm();
    $('#childSearch').oninput=()=>drawChildrenTable($('#childSearch').value);
    drawChildrenTable('');
  }
  function showChildForm(editId=''){
    const ch=editId?childById(editId):{};
    $('#childFormWrap').innerHTML=`<div class="card">
      <h4>${editId?'Edit':'Register'} Child</h4>
      <div class="form-grid">
        <label>Child Name<input id="f_name" value="${esc(ch.name||'')}"></label>
        <label>Date of Birth<input id="f_dob" type="date" value="${ch.dob||''}"></label>
        <label>Sex<select id="f_sex"><option ${ch.sex==='Male'?'selected':''}>Male</option><option ${ch.sex==='Female'?'selected':''}>Female</option><option ${ch.sex==='Other'?'selected':''}>Other</option></select></label>
        <label>Parent / Guardian<input id="f_parent" value="${esc(ch.parent||'')}"></label>
        <label>Mobile / WhatsApp<input id="f_mobile" value="${esc(ch.mobile||'')}"></label>
        <label>Registration ID<input id="f_reg" value="${esc(ch.regId||('SW'+String(db.children.length+1).padStart(4,'0')))}"></label>
        <label>School / Class<input id="f_school" value="${esc(ch.school||'')}"></label>
        <label>Address<input id="f_address" value="${esc(ch.address||'')}"></label>
        <label>Allergies<input id="f_allergy" value="${esc(ch.allergies||'')}"></label>
      </div>
      <label>Medical / Birth / Developmental History<textarea id="f_history">${esc(ch.history||'')}</textarea></label>
      <div class="section-actions"><button id="saveChild">Save Child</button><button class="secondary" id="cancelChild">Cancel</button></div>
    </div>`;
    $('#saveChild').onclick=()=>{
      const item={id:editId||uid(),name:$('#f_name').value.trim(),dob:$('#f_dob').value,sex:$('#f_sex').value,parent:$('#f_parent').value,mobile:$('#f_mobile').value,regId:$('#f_reg').value,school:$('#f_school').value,address:$('#f_address').value,allergies:$('#f_allergy').value,history:$('#f_history').value};
      if(!item.name){alert('Child name is required');return}
      if(editId) db.children=db.children.map(x=>x.id===editId?item:x); else db.children.push(item);
      save(); $('#childFormWrap').innerHTML=''; drawChildrenTable('');
    };
    $('#cancelChild').onclick=()=>$('#childFormWrap').innerHTML='';
  }
  function drawChildrenTable(q=''){
    q=q.toLowerCase();
    const rows=db.children.filter(c=>[c.name,c.mobile,c.regId].join(' ').toLowerCase().includes(q));
    $('#childrenTable').innerHTML=`<table><thead><tr><th>ID</th><th>Child</th><th>Age / Sex</th><th>Parent</th><th>Visits</th><th>Actions</th></tr></thead><tbody>${rows.map(c=>`<tr>
      <td>${esc(c.regId||'-')}</td><td><b>${esc(c.name)}</b><div class="muted">${esc(c.school||'')}</div></td><td>${ageText(c.dob)} / ${esc(c.sex||'-')}</td>
      <td>${esc(c.parent||'-')}<div class="muted">${esc(c.mobile||'')}</div></td><td>${visitsOf(c.id).length}</td>
      <td><button onclick="app.editChild('${c.id}')">Edit</button> <button class="secondary" onclick="app.quickReport('${c.id}')">Report</button></td></tr>`).join('')}</tbody></table>`;
  }

  const scaleOptions = (selected=2)=>[0,1,2,3,4].map(n=>`<option value="${n}" ${Number(selected)===n?'selected':''}>${n} - ${scoreLabel(n)}</option>`).join('');
  function renderMonthly(){
    childOptions($('#timelineChild'));
    $('#timelineChild').onchange=()=>drawTimeline($('#timelineChild').value);
    $('#monthlyForm').innerHTML = monthlyFormHtml();
    childOptions($('#m_child'));
    $('#m_date').value=new Date().toISOString().slice(0,10);
    $('#m_child').onchange=()=>prefillPrev($('#m_child').value);
    $('#saveVisit').onclick=saveMonthlyVisit;
    drawTimeline('');
  }
  function monthlyFormHtml(){
    const scoreFields=['Appetite','Bladder','Bowel','Sleep','Learning','Memory','Playing','School Performance','Energy','Immunity / Illness Frequency'];
    const ashta=['Nadi','Mala','Mutra','Jihva','Shabda','Sparsha','Drik','Akruti'];
    const dasha=['Prakriti','Vikriti','Sara','Samhanana','Pramana','Satmya','Satva','Ahara Shakti','Vyayama Shakti','Vaya'];
    return `
    <div class="form-grid">
      <label>Child<select id="m_child"></select></label>
      <label>Visit Date<input id="m_date" type="date"></label>
      <label>Swarnaprashan Dose<input id="m_dose" placeholder="e.g. 2 drops / 4 drops / prescribed dose"></label>
      <label>Batch / Preparation<input id="m_batch" placeholder="Optional"></label>
      <label>Height (cm)<input id="m_height" type="number" step="0.1"></label>
      <label>Weight (kg)<input id="m_weight" type="number" step="0.1"></label>
      <label>Temperature °F<input id="m_temp" type="number" step="0.1"></label>
      <label>Pulse /min<input id="m_pulse" type="number"></label>
      <label>Respiratory Rate /min<input id="m_rr" type="number"></label>
      <label>SpO₂ %<input id="m_spo2" type="number"></label>
      <label>BP Systolic<input id="m_sys" type="number"></label>
      <label>BP Diastolic<input id="m_dia" type="number"></label>
    </div>
    <fieldset><legend>Medical Health at This Visit</legend>
      <div class="form-grid">
        <label>Current Illness / Complaint<textarea id="m_issue"></textarea></label>
        <label>Medication / Treatment<textarea id="m_meds"></textarea></label>
        <label>Adverse Event / Reaction<textarea id="m_ae"></textarea></label>
      </div>
    </fieldset>
    <fieldset><legend>Functional & Developmental Grading (0–4)</legend>
      <div class="scale-grid">${scoreFields.map(f=>`<div class="scale-card"><b>${f}</b><select data-score="${f}">${scaleOptions()}</select></div>`).join('')}</div>
      <p class="muted">0 Poor • 1 Reduced • 2 Stable/Normal • 3 Improved • 4 Best</p>
    </fieldset>
    <fieldset><legend>Ashtavidha Pariksha Grading (0–4)</legend>
      <div class="scale-grid">${ashta.map(f=>`<div class="scale-card"><b>${f}</b><select data-ashta="${f}">${scaleOptions()}</select></div>`).join('')}</div>
    </fieldset>
    <fieldset><legend>Dashavidha Pariksha Grading (0–4)</legend>
      <div class="scale-grid">${dasha.map(f=>`<div class="scale-card"><b>${f}</b><select data-dasha="${f}">${scaleOptions()}</select></div>`).join('')}</div>
    </fieldset>
    <div class="form-grid">
      <label>Diet / Pathya Adherence<select id="m_pathya">${scaleOptions()}</select></label>
      <label>Activity / Lifestyle Adherence<select id="m_life">${scaleOptions()}</select></label>
      <label>Parent Global Impression<select id="m_parentimpr">${scaleOptions()}</select></label>
    </div>
    <label>Clinical Notes<textarea id="m_notes" placeholder="Important change from previous month, physician observation, parent concerns..."></textarea></label>
    <div class="section-actions"><button id="saveVisit">Save Monthly Visit</button></div>`;
  }
  function prefillPrev(id){
    const prev=visitsOf(id).at(-1); if(!prev) return;
    ['dose','batch'].forEach(k=>$('#m_'+k).value=prev[k]||'');
  }
  function saveMonthlyVisit(){
    const id=$('#m_child').value; if(!id){alert('Select child');return}
    const scores={},ashta={},dasha={};
    document.querySelectorAll('[data-score]').forEach(e=>scores[e.dataset.score]=Number(e.value));
    document.querySelectorAll('[data-ashta]').forEach(e=>ashta[e.dataset.ashta]=Number(e.value));
    document.querySelectorAll('[data-dasha]').forEach(e=>dasha[e.dataset.dasha]=Number(e.value));
    const height=Number($('#m_height').value||0), weight=Number($('#m_weight').value||0);
    const bmi=height&&weight? +(weight/((height/100)**2)).toFixed(2):'';
    db.visits.push({
      id:uid(),childId:id,date:$('#m_date').value,dose:$('#m_dose').value,batch:$('#m_batch').value,
      height,weight,bmi,temp:$('#m_temp').value,pulse:$('#m_pulse').value,rr:$('#m_rr').value,spo2:$('#m_spo2').value,sys:$('#m_sys').value,dia:$('#m_dia').value,
      issue:$('#m_issue').value,meds:$('#m_meds').value,ae:$('#m_ae').value,scores,ashta,dasha,
      pathya:Number($('#m_pathya').value),life:Number($('#m_life').value),parentImpression:Number($('#m_parentimpr').value),notes:$('#m_notes').value
    });
    save(); alert('Monthly Swarnaprashan follow-up saved'); showView('monthly'); $('#timelineChild').value=id; drawTimeline(id);
  }
  function drawTimeline(id){
    if(!id){$('#timelineTable').innerHTML='<p class="muted">Select a child to view month-by-month records.</p>';return}
    const vs=visitsOf(id);
    $('#timelineTable').innerHTML=`<table><thead><tr><th>Date</th><th>Dose</th><th>Ht / Wt / BMI</th><th>Vitals</th><th>Health</th><th>Overall Change</th></tr></thead><tbody>${vs.map((v,i)=>{
      const prev=vs[i-1]; const curAvg=avgScore(v.scores), prevAvg=prev?avgScore(prev.scores):null;
      return `<tr><td>${fmtDate(v.date)}</td><td>${esc(v.dose||'-')}</td><td>${v.height||'-'} cm<br>${v.weight||'-'} kg<br>BMI ${v.bmi||'-'}</td>
      <td>P ${v.pulse||'-'} • SpO₂ ${v.spo2||'-'}<br>BP ${v.sys||'-'}/${v.dia||'-'}</td><td>${esc(v.issue||'No issue recorded')}</td><td>${trendLabel(prevAvg,curAvg)}</td></tr>`}).join('')}</tbody></table>`;
  }
  const avgScore = obj => {
    const vals=Object.values(obj||{}).map(Number).filter(x=>!isNaN(x)); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
  };

  function renderGrowth(){
    childOptions($('#growthChild')); $('#growthChild').onchange=()=>drawGrowth($('#growthChild').value); $('#growthSummary').innerHTML='<p class="muted">Select a child.</p>';
  }
  function drawGrowth(id){
    const vs=visitsOf(id); if(!id||!vs.length){$('#growthSummary').innerHTML='<p class="muted">No growth records yet.</p>';return}
    const first=vs[0],last=vs.at(-1);
    $('#growthSummary').innerHTML=`<div class="metric-row">
      <div class="metric"><span>Height</span><strong>${last.height||'-'} cm</strong><small>${first.height&&last.height?((last.height-first.height)>=0?'+':'')+(last.height-first.height).toFixed(1)+' cm':''}</small></div>
      <div class="metric"><span>Weight</span><strong>${last.weight||'-'} kg</strong><small>${first.weight&&last.weight?((last.weight-first.weight)>=0?'+':'')+(last.weight-first.weight).toFixed(1)+' kg':''}</small></div>
      <div class="metric"><span>BMI</span><strong>${last.bmi||'-'}</strong><small>Latest recorded</small></div>
      <div class="metric"><span>Visits</span><strong>${vs.length}</strong><small>${fmtDate(first.date)} → ${fmtDate(last.date)}</small></div>
    </div>`;
    drawChart(vs);
  }
  function drawChart(vs){
    const c=$('#growthChart'),ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='#ddd';ctx.lineWidth=1;for(let i=1;i<6;i++){let y=i*H/6;ctx.beginPath();ctx.moveTo(45,y);ctx.lineTo(W-20,y);ctx.stroke()}
    const series=[['height','#9b7a3c'],['weight','#2f7d5c'],['bmi','#446a93']];
    series.forEach(([key,color])=>{
      const vals=vs.map(v=>Number(v[key])).filter(Boolean); if(vals.length<1)return; const max=Math.max(...vals),min=Math.min(...vals);
      ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();
      vs.forEach((v,i)=>{const val=Number(v[key]); if(!val)return; const x=50+i*(W-80)/Math.max(1,vs.length-1), y=H-35-((val-min)/Math.max(1,max-min))*(H-70); i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
      ctx.stroke();
    });
  }

  function renderAssessment(){
    childOptions($('#assessmentChild')); $('#assessmentChild').onchange=()=>drawAssessment($('#assessmentChild').value); $('#assessmentPanel').innerHTML='<p class="muted">Select a child.</p>';
  }
  function drawAssessment(id){
    const vs=visitsOf(id); if(!vs.length){$('#assessmentPanel').innerHTML='<p class="muted">No assessment data yet.</p>';return}
    const first=vs[0],last=vs.at(-1);
    const rows=Object.keys(last.scores||{}).map(k=>`<tr><td>${k}</td><td>${scoreLabel(first.scores?.[k])}</td><td>${scoreLabel(last.scores?.[k])}</td><td>${trendLabel(first.scores?.[k],last.scores?.[k])}</td></tr>`).join('');
    $('#assessmentPanel').innerHTML=`<div class="metric-row">
      <div class="metric"><span>Functional Score</span><strong>${(avgScore(last.scores)||0).toFixed(1)}/4</strong></div>
      <div class="metric"><span>Ashtavidha</span><strong>${(avgScore(last.ashta)||0).toFixed(1)}/4</strong></div>
      <div class="metric"><span>Dashavidha</span><strong>${(avgScore(last.dasha)||0).toFixed(1)}/4</strong></div>
      <div class="metric"><span>Parent Impression</span><strong>${scoreLabel(last.parentImpression)}</strong></div>
    </div>
    <h4 style="margin-top:18px">Baseline vs Latest Functional Change</h4>
    <table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${rows}</tbody></table>`;
  }

  function renderReports(){
    childOptions($('#reportChild')); $('#reportChild').onchange=()=>populateReportVisits($('#reportChild').value);
    $('#buildReport').onclick=buildReport; $('#printReport').onclick=()=>window.print(); $('#shareReport').onclick=shareReport; $('#whatsappReport').onclick=whatsappReport;
  }
  function populateReportVisits(id){
    const sel=$('#reportVisit'); const vs=visitsOf(id); sel.innerHTML='<option value="latest">Latest / Longitudinal Report</option>'+vs.map(v=>`<option value="${v.id}">${fmtDate(v.date)} • ${esc(v.dose||'Visit')}</option>`).join('');
  }
  function buildMiniTrend(id){
    const vs=visitsOf(id),first=vs[0],last=vs.at(-1),ch=childById(id);
    return `<div><b>${esc(ch.name)}</b> • ${vs.length} visits • ${fmtDate(first.date)} → ${fmtDate(last.date)}</div>
    <div class="metric-row" style="margin-top:10px">
      ${['Learning','Memory','Playing','School Performance'].map(k=>`<div class="metric"><span>${k}</span><strong>${scoreLabel(last.scores?.[k])}</strong><small>${trendLabel(first.scores?.[k],last.scores?.[k])}</small></div>`).join('')}
    </div>`;
  }
  function buildReport(){
    const id=$('#reportChild').value;if(!id){alert('Select child');return}
    const ch=childById(id),vs=visitsOf(id); if(!vs.length){$('#reportOutput').innerHTML='<p>No visit recorded.</p>';return}
    const visitId=$('#reportVisit').value; const v=visitId==='latest'?vs.at(-1):vs.find(x=>x.id===visitId); const first=vs[0];
    const functionalRows=Object.keys(v.scores||{}).map(k=>`<tr><td>${k}</td><td>${scoreLabel(first.scores?.[k])}</td><td>${scoreLabel(v.scores?.[k])}</td><td>${trendLabel(first.scores?.[k],v.scores?.[k])}</td></tr>`).join('');
    const ashtaRows=Object.entries(v.ashta||{}).map(([k,val])=>`<tr><td>${k}</td><td>${scoreLabel(val)}</td></tr>`).join('');
    const dashaRows=Object.entries(v.dasha||{}).map(([k,val])=>`<tr><td>${k}</td><td>${scoreLabel(val)}</td></tr>`).join('');
    $('#reportOutput').innerHTML=`<div class="report-head"><div><h2>${esc(db.settings.clinicName)}</h2><b>Digital Swarnaprashan Prescription & Progress Report</b><div class="muted">${esc(db.settings.doctor)} • ${esc(db.settings.designation)}</div></div><div><b>${esc(ch.regId||'')}</b><br>${fmtDate(v.date)}</div></div>
    <div class="report-section"><h3>Child Details</h3><div class="metric-row">
      <div class="metric"><span>Name</span><strong>${esc(ch.name)}</strong><small>${ageText(ch.dob)} • ${esc(ch.sex)}</small></div>
      <div class="metric"><span>Parent</span><strong>${esc(ch.parent||'-')}</strong><small>${esc(ch.mobile||'')}</small></div>
      <div class="metric"><span>School</span><strong>${esc(ch.school||'-')}</strong></div>
      <div class="metric"><span>Total Visits</span><strong>${vs.length}</strong><small>${fmtDate(vs[0].date)} → ${fmtDate(vs.at(-1).date)}</small></div>
    </div></div>
    <div class="report-section"><h3>Swarnaprashan Administration</h3><p><b>Dose:</b> ${esc(v.dose||'-')} &nbsp; <b>Batch/Preparation:</b> ${esc(v.batch||'-')}</p></div>
    <div class="report-section"><h3>Growth & Vitals</h3><div class="metric-row">
      <div class="metric"><span>Height</span><strong>${v.height||'-'} cm</strong></div><div class="metric"><span>Weight</span><strong>${v.weight||'-'} kg</strong></div>
      <div class="metric"><span>BMI</span><strong>${v.bmi||'-'}</strong></div><div class="metric"><span>Vitals</span><strong>P ${v.pulse||'-'} • SpO₂ ${v.spo2||'-'}</strong><small>BP ${v.sys||'-'}/${v.dia||'-'} • RR ${v.rr||'-'}</small></div>
    </div></div>
    <div class="report-section"><h3>Medical Health at Visit</h3><p><b>Current issue:</b> ${esc(v.issue||'No significant issue recorded')}</p><p><b>Medication:</b> ${esc(v.meds||'-')}</p><p><b>Adverse event:</b> ${esc(v.ae||'None recorded')}</p></div>
    <div class="report-section"><h3>Month-by-Month Functional Progress</h3><table><thead><tr><th>Parameter</th><th>Baseline</th><th>Current</th><th>Change</th></tr></thead><tbody>${functionalRows}</tbody></table></div>
    <div class="report-section"><h3>Ashtavidha Pariksha</h3><table><tbody>${ashtaRows}</tbody></table></div>
    <div class="report-section"><h3>Dashavidha Pariksha</h3><table><tbody>${dashaRows}</tbody></table></div>
    <div class="report-section"><h3>Diet • Pathya • Lifestyle</h3><p><b>Pathya adherence:</b> ${scoreLabel(v.pathya)} &nbsp; <b>Lifestyle adherence:</b> ${scoreLabel(v.life)}</p>
    <p>Maintain age-appropriate balanced diet, adequate hydration, regular sleep-wake schedule, active outdoor play, limited excessive screen time, hygiene, and individualized physician-advised Pathya/Apathya based on clinical need.</p></div>
    <div class="report-section"><h3>Physician Notes</h3><p>${esc(v.notes||'-')}</p></div>
    <div class="report-section"><h3>Digital Swarnaprashan Prescription</h3><p><b>Swarnaprashan:</b> ${esc(v.dose||'As advised')} on the scheduled clinic date / as clinically advised.</p><p><b>Follow-up:</b> Continue monthly longitudinal review of growth, health, cognition, activity and Ayurvedic assessment.</p></div>
    <div style="border-top:1px solid #ddd;padding-top:12px;margin-top:18px"><b>${esc(db.settings.doctor)}</b><br><span class="muted">${esc(db.settings.address)} • ${esc(db.settings.phone)}<br>${esc(db.settings.footer)}</span></div>`;
  }
  function reportText(){
    const el=$('#reportOutput'); return el.innerText.trim();
  }
  async function shareReport(){
    const text=reportText(); if(!text){alert('Generate report first');return}
    if(navigator.share){await navigator.share({title:'Mahamaya Clinic Swarnaprashan Report',text});}
    else {await navigator.clipboard.writeText(text);alert('Report copied to clipboard');}
  }
  function whatsappReport(){
    const text=reportText(); if(!text){alert('Generate report first');return}
    window.open('https://wa.me/?text='+encodeURIComponent(text),'_blank');
  }
  function quickReport(id){showView('reports');$('#reportChild').value=id;populateReportVisits(id);}

  function renderEducation(){
    childOptions($('#eduChild')); $('#generatePlan').onclick=()=>{
      const id=$('#eduChild').value;if(!id){alert('Select child');return} const ch=childById(id),type=$('#planType').value;
      const plans={
        'General Swarnaprashan Support':[
          'Fresh, age-appropriate, balanced meals with adequate protein, fruits, vegetables and healthy fats.',
          'Regular meal timing; avoid force-feeding and excessive packaged foods.',
          'Adequate hydration and age-appropriate physical activity/outdoor play.',
          'Consistent bedtime and wake time; reduce late-night screen exposure.',
          'Maintain vaccination and routine pediatric care as advised.'
        ],
        'Low Appetite':['Small frequent nutritious meals','Avoid excessive snacking before meals','Assess persistent poor appetite, weight loss or red flags clinically','Use individualized Ayurveda dietary advice only after assessment'],
        'Constipation':['Adequate water','Fiber-rich fruits and vegetables','Regular toilet routine','Outdoor activity','Seek medical review for pain, blood, vomiting or persistent constipation'],
        'Poor Sleep':['Regular sleep schedule','Reduce evening screens','Quiet bedtime routine','Avoid heavy late meals','Assess snoring, breathing difficulty or persistent daytime sleepiness'],
        'Frequent Illness':['Hand hygiene and sleep adequacy','Balanced diet and hydration','Avoid unnecessary antibiotics','Review vaccination status','Medical review for recurrent/severe infections or poor growth'],
        'Learning & Memory Support':['Regular sleep','Structured study-play balance','Reading and recall activities','Adequate nutrition and hydration','Discuss persistent school difficulty with pediatric/educational professional when needed']
      };
      $('#planOutput').innerHTML=`<div class="report-head"><div><h2>${esc(db.settings.clinicName)}</h2><b>Parent Guidance Plan</b></div><div>${esc(ch.name)}</div></div><h3>${esc(type)}</h3><ul>${plans[type].map(x=>`<li>${x}</li>`).join('')}</ul><h3>Pathya</h3><p>Fresh, simple, seasonal, well-tolerated food; regular routine; adequate rest and play.</p><h3>Apathya</h3><p>Excess junk food, irregular meals, excessive screen time, chronic sleep deprivation, and unnecessary self-medication.</p><p class="muted">Individual advice should be modified according to age, constitution, diagnosis, allergies, nutritional status and treating physician assessment.</p>`;
    };
  }

  function renderBackup(){
    $('#downloadBackup').onclick=()=>download('swarnaprashan-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(db,null,2),'application/json');
    $('#restoreBackup').onchange=async e=>{
      const f=e.target.files[0];if(!f)return; try{const d=JSON.parse(await f.text()); if(!d.children||!d.visits)throw 0; db=d; db.settings={...defaultSettings,...(db.settings||{})};save();alert('Backup restored');showView('dashboard')}catch{alert('Invalid backup file')}
    };
    $('#exportCsv').onclick=()=>{
      const head=['Child','RegID','Date','Dose','Height','Weight','BMI','Pulse','SpO2','BP','Issue','Learning','Memory','Playing','SchoolPerformance'];
      const rows=db.visits.map(v=>{const ch=childById(v.childId)||{};return [ch.name,ch.regId,v.date,v.dose,v.height,v.weight,v.bmi,v.pulse,v.spo2,`${v.sys||''}/${v.dia||''}`,v.issue,v.scores?.Learning,v.scores?.Memory,v.scores?.Playing,v.scores?.['School Performance']]});
      download('swarnaprashan-visits.csv',[head,...rows].map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv');
    };
  }
  function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}

  function renderSettings(){
    $('#settingsForm').innerHTML=`<div class="form-grid">
      <label>Clinic Name<input id="s_clinic" value="${esc(db.settings.clinicName)}"></label>
      <label>Doctor<input id="s_doctor" value="${esc(db.settings.doctor)}"></label>
      <label>Designation<input id="s_designation" value="${esc(db.settings.designation)}"></label>
      <label>Phone<input id="s_phone" value="${esc(db.settings.phone)}"></label>
      <label>Address<input id="s_address" value="${esc(db.settings.address)}"></label>
    </div><label>Footer<textarea id="s_footer">${esc(db.settings.footer)}</textarea></label><div class="section-actions"><button id="saveSettings">Save Settings</button></div>`;
    $('#saveSettings').onclick=()=>{db.settings={...db.settings,clinicName:$('#s_clinic').value,doctor:$('#s_doctor').value,designation:$('#s_designation').value,phone:$('#s_phone').value,address:$('#s_address').value,footer:$('#s_footer').value};save();alert('Settings saved')}
  }

  function init(){
    document.querySelectorAll('#nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));
    $('#quickAddChild').onclick=()=>{showView('children');showChildForm()};
    $('#quickVisit').onclick=()=>showView('monthly');
    $('#globalSearch').oninput=e=>{
      if(!e.target.value)return;
      const q=e.target.value.toLowerCase(),hit=db.children.find(c=>[c.name,c.mobile,c.regId].join(' ').toLowerCase().includes(q));
      if(hit){showView('children');$('#childSearch').value=e.target.value;drawChildrenTable(e.target.value)}
    };
    showView('dashboard');
  }
  return {init,showView,editChild:(id)=>{showView('children');showChildForm(id)},quickReport};
})();
document.addEventListener('DOMContentLoaded',app.init);
