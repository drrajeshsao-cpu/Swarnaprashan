const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);

const defaultSettings={
  whatsapp:'918770143788',
  phone:'918770143788',
  locationUrl:'',
  mainAppUrl:'',
  nextDate:'',
  nextTime:'',
  nakshatraStart:'',
  nakshatraEnd:'',
  appointmentMessage:'Namaste Mahamaya Clinic, mujhe apne bachche ke liye Swarnaprashan appointment book karna hai.'
};

const db={
  children:JSON.parse(localStorage.getItem('sp_children')||'[]'),
  growth:JSON.parse(localStorage.getItem('sp_growth')||'[]'),
  appointments:JSON.parse(localStorage.getItem('sp_appointments')||'[]'),
  vaccines:JSON.parse(localStorage.getItem('sp_vaccines')||'[]'),
  settings:{...defaultSettings,...JSON.parse(localStorage.getItem('sp_settings')||'{}')}
};

let currentRole='admin';

function save(){
  localStorage.setItem('sp_children',JSON.stringify(db.children));
  localStorage.setItem('sp_growth',JSON.stringify(db.growth));
  localStorage.setItem('sp_appointments',JSON.stringify(db.appointments));
  localStorage.setItem('sp_vaccines',JSON.stringify(db.vaccines));
  localStorage.setItem('sp_settings',JSON.stringify(db.settings));
}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2800)}
window.showToast=showToast;

function openPage(id){
  $$('.page').forEach(p=>p.classList.remove('active'));
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.page===id));
  $('#'+id).classList.add('active');
  if(id==='growth')renderGrowth();
  if(id==='children')renderChildren();
  if(id==='appointments')renderAppointments();
  if(id==='vaccination')renderVaccinations();
  if(id==='settings')loadSettingsForm();
}
window.openPage=openPage;

$('#loginBtn').onclick=()=>{
  if($('#userId').value==='demo'&&$('#password').value==='1234'){
    currentRole=$('#role').value;
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    $('#logoutBtn').classList.remove('hidden');
    $('#welcomeText').textContent='Welcome, '+$('#role').selectedOptions[0].text;
    $$('.admin-only').forEach(el=>el.classList.toggle('hidden',currentRole!=='admin'));
    renderAll();showToast('Login successful');
  } else showToast('Use demo / 1234 for this prototype');
};
$('#logoutBtn').onclick=()=>location.reload();
$$('.tab').forEach(t=>t.onclick=()=>openPage(t.dataset.page));

function updateStats(){
  $('#childCount').textContent=db.children.length;
  $('#appointmentCount').textContent=db.appointments.length;
  $('#growthCount').textContent=db.growth.length;
  $('#vaccineCount').textContent=db.vaccines.length;
}
function childOptions(){
  const opts=db.children.length?db.children.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''):'<option value="">Register a child first</option>';
  ['#growthChild','#chartChild','#appointmentChild','#vaccineChild'].forEach(id=>$(id).innerHTML=opts);
}
function formatDate(dateStr){
  if(!dateStr)return 'Not configured';
  return new Date(dateStr+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
}
function renderSettings(){
  $('#nextDate').textContent=formatDate(db.settings.nextDate);
  const n=db.settings.nakshatraStart||db.settings.nakshatraEnd?` • Nakshatra ${db.settings.nakshatraStart||'?'}–${db.settings.nakshatraEnd||'?'}`:'';
  $('#nextTime').textContent='Clinic timing: '+(db.settings.nextTime||'not configured')+n;
}

function openConfigured(url,missingMsg){
  if(!url){showToast(missingMsg);return}
  window.open(url,'_blank','noopener');
}
$('#whatsappBtn').onclick=()=>{
  const num=(db.settings.whatsapp||'').replace(/\D/g,'');
  if(!num){showToast('Add WhatsApp number in Settings.');return}
  window.open(`https://wa.me/${num}?text=${encodeURIComponent(db.settings.appointmentMessage)}`,'_blank','noopener');
};
$('#locationBtn').onclick=()=>openConfigured(db.settings.locationUrl,'Add Google Maps URL in Settings.');
$('#mainAppBtn').onclick=()=>openConfigured(db.settings.mainAppUrl,'Add main clinic app/website URL in Settings.');
$('#callBtn').onclick=()=>{
  const num=(db.settings.phone||'').replace(/[^\d+]/g,'');
  if(!num){showToast('Add clinic phone number in Settings.');return}
  location.href='tel:'+num;
};
$('#calendarBtn').onclick=()=>{
  if(!db.settings.nextDate){showToast('Configure next Swarnaprashan date first.');return}
  const date=db.settings.nextDate.replaceAll('-','');
  const title=encodeURIComponent('Swarnaprashan @ Mahamaya Clinic');
  const details=encodeURIComponent('Swarnaprashan appointment at Mahamaya Clinic');
  window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${date}/${date}&details=${details}`,'_blank','noopener');
};

$('#childForm').onsubmit=e=>{
  e.preventDefault();
  const obj=Object.fromEntries(new FormData(e.target).entries());
  obj.id='MMC-SP-'+new Date().getFullYear()+'-'+String(db.children.length+1).padStart(4,'0');
  db.children.push(obj);save();e.target.reset();renderAll();showToast('Child profile saved');
};

function renderChildren(){
  $('#childrenList').innerHTML=db.children.length?db.children.map(c=>`
  <div class="list-item">
    <h4>${c.name} <span class="badge">${c.id}</span></h4>
    <p>${c.sex} • DOB: ${c.dob||'-'} • Guardian: ${c.guardian||'-'}</p>
    <p>Vaccination: ${c.vaccination||'-'} • Allergy: ${c.allergy||'None reported'}</p>
    <div class="button-row">
      <button class="secondary" onclick="shareChild('${c.id}')">WhatsApp Summary</button>
    </div>
  </div>`).join(''):'<div class="list-item">No child registered yet.</div>';
}
window.shareChild=id=>{
  const c=db.children.find(x=>x.id===id); if(!c)return;
  const num=(c.contact||db.settings.whatsapp||'').replace(/\D/g,'');
  const text=`Mahamaya Clinic Child Summary%0AChild: ${c.name}%0ADOB: ${c.dob||'-'}%0AVaccination: ${c.vaccination||'-'}%0AAllergy: ${c.allergy||'None reported'}`;
  window.open(`https://wa.me/${num}?text=${text}`,'_blank','noopener');
};

function calcBMI(){
  const h=parseFloat($('#heightInput').value),w=parseFloat($('#weightInput').value);
  $('#bmiPreview').value=h&&w?(w/((h/100)**2)).toFixed(2):'';
}
$('#heightInput').oninput=calcBMI;$('#weightInput').oninput=calcBMI;

$('#growthForm').onsubmit=e=>{
  e.preventDefault();const obj=Object.fromEntries(new FormData(e.target).entries());
  obj.id=Date.now();db.growth.push(obj);save();e.target.reset();$('#bmiPreview').value='';renderAll();openPage('growth');showToast('Growth record added');
};
$('#chartChild').onchange=renderGrowth;

function renderGrowth(){
  childOptions();
  const cid=$('#chartChild').value||db.children[0]?.id||'';
  const rows=db.growth.filter(g=>g.childId===cid).sort((a,b)=>a.date.localeCompare(b.date));
  $('#growthTableWrap').innerHTML=`<h3>Measurement History</h3>${rows.length?`<table class="table"><thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Remarks</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date}</td><td>${r.height} cm</td><td>${r.weight} kg</td><td>${r.bmi}</td><td>${r.remarks||'-'}</td></tr>`).join('')}</tbody></table>`:'<p>No growth records for this child.</p>'}`;
  drawChart(rows);
}
function drawChart(rows){
  const c=$('#growthChart'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);
  ctx.strokeStyle='#e3dacb';ctx.lineWidth=1;
  for(let y=40;y<c.height-30;y+=50){ctx.beginPath();ctx.moveTo(55,y);ctx.lineTo(c.width-20,y);ctx.stroke()}
  if(!rows.length){ctx.fillStyle='#756b60';ctx.font='20px Arial';ctx.fillText('Add growth records to view the trend.',250,180);return}
  const series=[['height','#8a5a20'],['weight','#3d6f67'],['bmi','#8a3f54']];
  const vals=rows.flatMap(r=>series.map(s=>parseFloat(r[s[0]])||0));const max=Math.max(...vals,10);
  series.forEach(([key,color])=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();rows.forEach((r,i)=>{const x=60+i*((c.width-100)/Math.max(rows.length-1,1));const y=c.height-40-(parseFloat(r[key])||0)/(max*1.1)*(c.height-80);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()});
}
$('#shareGrowthBtn').onclick=()=>{
  const cid=$('#chartChild').value; const c=db.children.find(x=>x.id===cid); if(!c){showToast('Select a child.');return}
  const rows=db.growth.filter(g=>g.childId===cid).sort((a,b)=>a.date.localeCompare(b.date));
  if(!rows.length){showToast('No growth record available.');return}
  const latest=rows[rows.length-1],num=(c.contact||db.settings.whatsapp||'').replace(/\D/g,'');
  const text=`Growth Summary - ${c.name}%0ADate: ${latest.date}%0AHeight: ${latest.height} cm%0AWeight: ${latest.weight} kg%0ABMI: ${latest.bmi}%0AFrom Mahamaya Clinic`;
  window.open(`https://wa.me/${num}?text=${text}`,'_blank','noopener');
};

$('#vaccinationForm').onsubmit=e=>{
  e.preventDefault();const obj=Object.fromEntries(new FormData(e.target).entries());
  obj.id=Date.now();db.vaccines.push(obj);save();e.target.reset();renderAll();openPage('vaccination');showToast('Vaccination record saved');
};
function renderVaccinations(){
  const sorted=[...db.vaccines].sort((a,b)=>(a.dueDate||'').localeCompare(b.dueDate||''));
  $('#vaccinationList').innerHTML=sorted.length?sorted.map(v=>{const c=db.children.find(x=>x.id===v.childId);return `<div class="list-item"><h4>${v.vaccineName} <span class="badge">${v.status}</span></h4><p>${c?.name||'Child'} • Due: ${v.dueDate||'-'} • Given: ${v.givenDate||'-'}</p><p>Batch: ${v.batch||'-'} • Centre: ${v.centre||'-'}</p></div>`}).join(''):'<div class="list-item">No vaccination records yet.</div>';
}

$('#appointmentForm').onsubmit=e=>{
  e.preventDefault();if(!db.children.length){showToast('Register a child first');return}
  const obj=Object.fromEntries(new FormData(e.target).entries());obj.id=Date.now();obj.status='Confirmed';db.appointments.push(obj);save();e.target.reset();renderAll();openPage('appointments');showToast('Appointment confirmed');
};
function renderAppointments(){
  $('#appointmentList').innerHTML=db.appointments.length?db.appointments.map(a=>{const c=db.children.find(x=>x.id===a.childId);return `<div class="list-item"><h4>${a.service} <span class="badge">${a.status}</span></h4><p>${c?.name||'Child'} • ${a.date} at ${a.time}</p><p>${a.doctor} • ${a.concern||'No concern added'}</p><button class="secondary" onclick="shareAppointment('${a.id}')">Share on WhatsApp</button></div>`}).join(''):'<div class="list-item">No appointments booked.</div>';
}
window.shareAppointment=id=>{
  const a=db.appointments.find(x=>String(x.id)===String(id)),c=db.children.find(x=>x.id===a?.childId);if(!a||!c)return;
  const num=(c.contact||db.settings.whatsapp||'').replace(/\D/g,'');
  const text=`Appointment Confirmed%0AChild: ${c.name}%0AService: ${a.service}%0ADate: ${a.date}%0ATime: ${a.time}%0ADoctor: ${a.doctor}%0AMahamaya Clinic`;
  window.open(`https://wa.me/${num}?text=${text}`,'_blank','noopener');
};

function loadSettingsForm(){
  const f=$('#settingsForm');
  Object.entries(db.settings).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v||''});
}
$('#settingsForm').onsubmit=e=>{
  e.preventDefault();
  db.settings={...db.settings,...Object.fromEntries(new FormData(e.target).entries())};
  save();renderSettings();showToast('Settings saved successfully');
};

function renderAll(){updateStats();childOptions();renderChildren();renderAppointments();renderGrowth();renderVaccinations();renderSettings()}


const learnContent = {
  swarnaprashan: {
    title: 'Swarnaprashan क्या है?',
    body: `
      <h3>परिचय</h3>
      <p>Swarnaprashan आयुर्वेद में वर्णित बाल स्वास्थ्य से संबंधित एक पारंपरिक प्रक्रिया है। इसे प्रशिक्षित आयुर्वेद चिकित्सक की देखरेख में, बच्चे की आयु, स्वास्थ्य स्थिति और उपयुक्तता का मूल्यांकन करके दिया जाना चाहिए।</p>

      <h3>इसका उद्देश्य</h3>
      <ul>
        <li>बालक के समग्र स्वास्थ्य की देखभाल में सहायक पारंपरिक आयुर्वेदिक समर्थन</li>
        <li>स्वस्थ दिनचर्या, पोषण और नियमित स्वास्थ्य निगरानी को बढ़ावा देना</li>
        <li>Parents को growth, development और preventive child care के प्रति जागरूक करना</li>
      </ul>

      <h3>कब दिया जाता है?</h3>
      <p>कई संस्थान इसे Pushya Nakshatra के दिन देते हैं। वास्तविक तिथि और clinic timing dashboard पर admin द्वारा update की जाएगी।</p>

      <h3>कैसे दिया जाता है?</h3>
      <p>यह केवल registered medical practitioner की सलाह और supervision में दिया जाना चाहिए। Dose बच्चे की आयु, वजन, formulation और clinical judgement पर निर्भर करती है।</p>

      <h3>कब टालना चाहिए?</h3>
      <ul>
        <li>तेज बुखार या acute illness</li>
        <li>बार-बार vomiting या severe diarrhoea</li>
        <li>ज्ञात गंभीर allergy</li>
        <li>Doctor द्वारा postponement की सलाह</li>
      </ul>

      <h3>महत्वपूर्ण</h3>
      <p>यह routine vaccination, पौष्टिक भोजन, sleep, hygiene या आवश्यक medical treatment का विकल्प नहीं है।</p>
    `
  },
  healthTips: {
    title: 'Healthy Child Tips',
    body: `
      <h3>Daily Health Routine</h3>
      <ul>
        <li>आयु-अनुसार संतुलित भोजन</li>
        <li>पर्याप्त पानी और नियमित नींद</li>
        <li>प्रतिदिन outdoor physical activity</li>
        <li>Screen time पर नियंत्रण</li>
        <li>हाथ धोना और dental hygiene</li>
      </ul>
      <h3>Parent Monitoring</h3>
      <p>Height, weight, BMI, vaccination, school performance और behavioural changes का समय-समय पर record रखें।</p>
    `
  },
  habits: {
    title: 'Good Habits & Sanskar',
    body: `
      <h3>अच्छी आदतें</h3>
      <ul>
        <li>समय पर उठना और सोना</li>
        <li>माता-पिता और बड़ों का सम्मान</li>
        <li>दैनिक प्रार्थना या शांत बैठना</li>
        <li>Reading habit</li>
        <li>कृतज्ञता और दयालुता</li>
        <li>अपना सामान व्यवस्थित रखना</li>
      </ul>
      <h3>बचने योग्य आदतें</h3>
      <ul>
        <li>अत्यधिक mobile और television</li>
        <li>अनियमित भोजन</li>
        <li>देर रात तक जागना</li>
        <li>बिना supervision के internet use</li>
      </ul>
    `
  },
  stories: {
    title: 'Stories & Activities',
    body: `
      <h3>Age 3–6 years</h3>
      <p>छोटी नैतिक कहानियाँ, colouring, picture matching और gratitude activity.</p>
      <h3>Age 7–10 years</h3>
      <p>Panchatantra, Krishna stories, healthy food quiz और memory games.</p>
      <h3>Age 11–14 years</h3>
      <p>Historical personalities, discipline stories, journaling और yoga challenge.</p>
      <h3>Age 15–18 years</h3>
      <p>Self-discipline, digital wellbeing, goal setting और responsibility activities.</p>
    `
  }
};

window.openLearnTopic = key => {
  const item = learnContent[key];
  if (!item) return;
  $('#learnModalTitle').textContent = item.title;
  $('#learnModalBody').innerHTML = item.body;
  $('#learnModal').classList.remove('hidden');
};

window.closeLearnModal = () => {
  $('#learnModal').classList.add('hidden');
};

$('#learnModal').addEventListener('click', e => {
  if (e.target.id === 'learnModal') closeLearnModal();
});
