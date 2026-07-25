const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const db={
  children:JSON.parse(localStorage.getItem('sp_children')||'[]'),
  growth:JSON.parse(localStorage.getItem('sp_growth')||'[]'),
  appointments:JSON.parse(localStorage.getItem('sp_appointments')||'[]')
};
function save(){localStorage.setItem('sp_children',JSON.stringify(db.children));localStorage.setItem('sp_growth',JSON.stringify(db.growth));localStorage.setItem('sp_appointments',JSON.stringify(db.appointments))}
function showToast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
window.showToast=showToast;
function openPage(id){$$('.page').forEach(p=>p.classList.remove('active'));$$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.page===id));$('#'+id).classList.add('active');if(id==='growth')renderGrowth();if(id==='children')renderChildren();if(id==='appointments')renderAppointments()}
window.openPage=openPage;

$('#loginBtn').onclick=()=>{
  if($('#userId').value==='demo'&&$('#password').value==='1234'){
    $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');$('#logoutBtn').classList.remove('hidden');
    $('#welcomeText').textContent='Welcome, '+$('#role').selectedOptions[0].text;
    renderAll();showToast('Login successful');
  } else showToast('Use demo / 1234 for this prototype');
};
$('#logoutBtn').onclick=()=>location.reload();
$$('.tab').forEach(t=>t.onclick=()=>openPage(t.dataset.page));

function updateStats(){
  $('#childCount').textContent=db.children.length;
  $('#appointmentCount').textContent=db.appointments.length;
  $('#growthCount').textContent=db.growth.length;
}
function childOptions(){
  const opts=db.children.length?db.children.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''):'<option value="">Register a child first</option>';
  $('#growthChild').innerHTML=opts;$('#chartChild').innerHTML=opts;$('#appointmentChild').innerHTML=opts;
}
$('#childForm').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target);const obj=Object.fromEntries(f.entries());
  obj.id='MMC-SP-'+new Date().getFullYear()+'-'+String(db.children.length+1).padStart(4,'0');
  db.children.push(obj);save();e.target.reset();renderAll();showToast('Child profile saved');
};
function renderChildren(){
  $('#childrenList').innerHTML=db.children.length?db.children.map(c=>`<div class="list-item"><h4>${c.name} <span class="badge">${c.id}</span></h4><p>${c.sex} • DOB: ${c.dob||'-'} • Guardian: ${c.guardian||'-'}</p><p>Vaccination: ${c.vaccination||'-'} • Allergy: ${c.allergy||'None reported'}</p></div>`).join(''):'<div class="list-item">No child registered yet.</div>';
}
function calcBMI(){
  const h=parseFloat($('[name=height]').value),w=parseFloat($('[name=weight]').value);
  $('#bmiPreview').value=h&&w?(w/((h/100)**2)).toFixed(2):'';
}
$('[name=height]').oninput=calcBMI;$('[name=weight]').oninput=calcBMI;
$('#growthForm').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target);const obj=Object.fromEntries(f.entries());
  obj.id=Date.now();db.growth.push(obj);save();e.target.reset();$('#bmiPreview').value='';renderAll();openPage('growth');showToast('Growth record added');
};
$('#chartChild').onchange=renderGrowth;
function renderGrowth(){
  childOptions();const cid=$('#chartChild').value||db.children[0]?.id||'';const rows=db.growth.filter(g=>g.childId===cid).sort((a,b)=>a.date.localeCompare(b.date));
  $('#growthTableWrap').innerHTML=`<h3>Measurement History</h3>${rows.length?`<table class="table"><thead><tr><th>Date</th><th>Height</th><th>Weight</th><th>BMI</th><th>Remarks</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.date}</td><td>${r.height} cm</td><td>${r.weight} kg</td><td>${r.bmi}</td><td>${r.remarks||'-'}</td></tr>`).join('')}</tbody></table>`:'<p>No growth records for this child.</p>'}`;
  drawChart(rows);
}
function drawChart(rows){
  const c=$('#growthChart'),ctx=c.getContext('2d');ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.strokeStyle='#e3dacb';ctx.lineWidth=1;
  for(let y=40;y<c.height-30;y+=50){ctx.beginPath();ctx.moveTo(55,y);ctx.lineTo(c.width-20,y);ctx.stroke()}
  if(!rows.length){ctx.fillStyle='#756b60';ctx.font='20px Arial';ctx.fillText('Add growth records to view the trend.',250,180);return}
  const series=[['height','#8a5a20'],['weight','#3d6f67'],['bmi','#8a3f54']];
  const vals=rows.flatMap(r=>series.map(s=>parseFloat(r[s[0]])||0));const max=Math.max(...vals,10);
  series.forEach(([key,color])=>{ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();rows.forEach((r,i)=>{const x=60+i*((c.width-100)/Math.max(rows.length-1,1));const y=c.height-40-(parseFloat(r[key])||0)/(max*1.1)*(c.height-80);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke()});
  rows.forEach((r,i)=>{const x=60+i*((c.width-100)/Math.max(rows.length-1,1));ctx.fillStyle='#665b4f';ctx.font='12px Arial';ctx.fillText(r.date.slice(5),x-18,c.height-15)});
}
$('#shareGrowthBtn').onclick=()=>showToast('Growth summary is ready for WhatsApp sharing in the production integration.');

$('#appointmentForm').onsubmit=e=>{
  e.preventDefault();if(!db.children.length){showToast('Register a child first');return}
  const obj=Object.fromEntries(new FormData(e.target).entries());obj.id=Date.now();obj.status='Confirmed';db.appointments.push(obj);save();e.target.reset();renderAll();openPage('appointments');showToast('Appointment confirmed');
};
function renderAppointments(){
  $('#appointmentList').innerHTML=db.appointments.length?db.appointments.map(a=>{const c=db.children.find(x=>x.id===a.childId);return `<div class="list-item"><h4>${a.service} <span class="badge">${a.status}</span></h4><p>${c?.name||'Child'} • ${a.date} at ${a.time}</p><p>${a.doctor} • ${a.concern||'No concern added'}</p></div>`}).join(''):'<div class="list-item">No appointments booked.</div>';
}
function renderAll(){updateStats();childOptions();renderChildren();renderAppointments();renderGrowth()}
