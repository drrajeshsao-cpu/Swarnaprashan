
const app=(()=>{
const KEY='mahamaya_swarnaprashan_v7';
const defaults={swarnaprashanRate:250,clinicName:'MAHAMAYA CLINIC',prescriptionTitle:'Swarnaprashan Digital Prescription',doctor:'Dr. Rajesh Sao, M.D. (Ayurveda)',designation:'Consultant Physician • Ayurveda',doctor2:'Dr. Ravi Chandrakar, B.A.M.S.',designation2:'Consultant Physician • Ayurveda',phone:'',address:'In front of India 1 ATM, Sheetla Chowk, Bhatagaon, Raipur',footer:'Clinical follow-up record and parent education. Seek urgent medical care for emergency symptoms.'};
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{children:[],cases:[],followups:[],vaccines:[],plans:[],settings:defaults};
let currentView='dashboard';
let suppressCloudEvent=false;
db.settings={...defaults,...(db.settings||{})};db.children=db.children||[];db.cases=db.cases||[];db.followups=db.followups||[];db.vaccines=db.vaccines||[];db.payments=db.payments||[];db.inventory=db.inventory||[];
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=s=>(s??'').toString().replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),
save=()=>{
  localStorage.setItem(KEY,JSON.stringify(db));
  if(!suppressCloudEvent){
    window.dispatchEvent(new CustomEvent('swarnaprashan-local-save',{detail:{at:Date.now()}}));
  }
};
const fmt=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'-';
const child=id=>db.children.find(x=>x.id===id),fups=id=>db.followups.filter(x=>x.childId===id).sort((a,b)=>new Date(a.date)-new Date(b.date));

const CHILD_STATUSES=[
  'Active',
  'Ready for Swarnaprashan',
  "Today's Dose Taken",
  'Appointment Fixed',
  'Out of City',
  'Temporarily Hold - Health Issue',
  'Swarnaprashan Stopped',
  'Home Use Medicine'
];
const TASK_STATUSES=['Pending','Done','Waiting','Not Done'];
function isoToday(){return new Date().toISOString().slice(0,10)}
function normalizeChild(c){
  return {
    currentStatus:'Active',
    taskStatus:'Pending',
    appointmentDate:'',
    reminderDate:'',
    nextAction:'',
    homeMedicineQty:'',
    lastContactDate:'',
    statusNote:'',
    ...c
  };
}
function normalizedChildren(){return db.children.map(normalizeChild)}
function statusClass(status){
  const m={
    'Active':'st-active',
    'Ready for Swarnaprashan':'st-ready',
    "Today's Dose Taken":'st-done',
    'Appointment Fixed':'st-appt',
    'Out of City':'st-away',
    'Temporarily Hold - Health Issue':'st-hold',
    'Swarnaprashan Stopped':'st-stop',
    'Home Use Medicine':'st-home'
  };
  return m[status]||'st-active';
}
function taskClass(status){
  return {'Done':'task-done','Pending':'task-pending','Waiting':'task-waiting','Not Done':'task-notdone'}[status]||'task-pending';
}
function childOperationalCounts(){
  const arr=normalizedChildren(), today=isoToday();
  return {
    total:arr.length,
    active:arr.filter(c=>['Active','Ready for Swarnaprashan','Appointment Fixed',"Today's Dose Taken",'Home Use Medicine'].includes(c.currentStatus)).length,
    ready:arr.filter(c=>c.currentStatus==='Ready for Swarnaprashan').length,
    doseToday:arr.filter(c=>c.currentStatus==="Today's Dose Taken").length,
    apptToday:arr.filter(c=>c.appointmentDate===today).length,
    remindersToday:arr.filter(c=>c.reminderDate===today && c.taskStatus!=='Done').length,
    stopped:arr.filter(c=>c.currentStatus==='Swarnaprashan Stopped').length,
    hold:arr.filter(c=>c.currentStatus==='Temporarily Hold - Health Issue').length,
    home:arr.filter(c=>c.currentStatus==='Home Use Medicine').length
  };
}
function callLink(mobile){return mobile?`tel:${String(mobile).replace(/\D/g,'')}`:'#'}
function waLink(mobile,name=''){
  const n=String(mobile||'').replace(/\D/g,'');
  if(!n)return'#';
  const withCountry=n.length===10?'91'+n:n;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent('Namaste. Mahamaya Clinic Swarnaprashan follow-up reminder for '+name+'.')}`;
}

const age=dob=>{if(!dob)return'-';const b=new Date(dob),n=new Date();let y=n.getFullYear()-b.getFullYear(),m=n.getMonth()-b.getMonth();if(m<0){y--;m+=12}return`${y}y ${m}m`};
const scoreLabel=n=>['Poor','Reduced','Stable/Normal','Improved','Best'][Number(n)]||'-';
const avg=o=>{const a=Object.values(o||{}).map(Number).filter(x=>!isNaN(x));return a.length?a.reduce((x,y)=>x+y,0)/a.length:null};
const trend=(a,b)=>a==null||b==null?'<span class="stable">No baseline</span>':(+b>+a?'<span class="good">Improved ↑</span>':+b<+a?'<span class="bad">Reduced ↓</span>':'<span class="stable">Stable →</span>');
const titles={dashboard:['Dashboard','Premium longitudinal Swarnaprashan clinical tracking'],clinical:['Clinical Workspace','Guided Save & Next workflow from profile to prescription'],children:['Children','Registry, baby photo, profile and clinical access'],followup:['Monthly Follow-up','Dose, growth, vitals, health, development and Ayurveda tracking'],analytics:['Growth & Analytics','Automatic visual longitudinal analysis'],vaccination:['Vaccination & Schedule','Vaccination record and upcoming session tracking'],documents:['Documents & Camera','Camera, gallery, file, PDF and manual card storage'],reports:['Reports & Prescription','Complete clinical printout, PDF, Share and WhatsApp'],knowledge:['Swarnaprashan Guide','Bilingual parent education, Pushya calendar, safety and evidence'],education:['Diet • Pathya • Lifestyle','Individualized parent guidance'],inventory:['Inventory & Stock','Procurement, stock, usage and consumable tracking'],backup:['Backup / Restore','Data portability and export'],settings:['Settings','Clinic identity and prescription details']};
const tpl=id=>document.getElementById(id).content.cloneNode(true);

const AUTH_KEY='mahamaya_swarnaprashan_users_v1';
const SESSION_KEY='mahamaya_swarnaprashan_session_v1';
let MEMORY_SESSION=null;
function getUsers(){
  try{
    const raw=localStorage.getItem(AUTH_KEY);
    if(!raw) return [];
    const parsed=JSON.parse(raw);
    return Array.isArray(parsed)?parsed:[];
  }catch(e){ return []; }
}
function saveUsers(users){
  try{ localStorage.setItem(AUTH_KEY,JSON.stringify(users)); }catch(e){}
}
const DEFAULT_AUTH_USERS=[];
function seedUsers(){
  let users=getUsers();
  let changed=false;
  for(const d of DEFAULT_AUTH_USERS){
    const idx=users.findIndex(u=>String(u.loginId||'').toLowerCase()===d.loginId.toLowerCase());
    if(idx<0){users.push({id:uid(),...d});changed=true}
    else{
      // Repair incomplete/corrupted default login records while preserving user-added recovery fields where possible.
      const repaired={...d,...users[idx],loginId:d.loginId,name:users[idx].name||d.name,role:users[idx].role||d.role};
      if(!repaired.password) repaired.password=d.password;
      if(!repaired.mobile) repaired.mobile=d.mobile;
      if(d.loginId==='drrajesh' && !repaired.email) repaired.email=d.email;
      if(d.loginId==='drrajesh' && !repaired.recoveryEmail) repaired.recoveryEmail=d.recoveryEmail;
      if(JSON.stringify(repaired)!==JSON.stringify(users[idx])){users[idx]=repaired;changed=true}
    }
  }
  if(changed || !localStorage.getItem(AUTH_KEY)) saveUsers(users);
}
function resetLoginAccess(){
  clearSession();
  setLoginStatus('Use your registered Firebase email and password.',true);
}
function currentSession(){
  if(MEMORY_SESSION) return MEMORY_SESSION;
  try{
    const raw=localStorage.getItem(SESSION_KEY);
    if(!raw) return null;
    const parsed=JSON.parse(raw);
    MEMORY_SESSION=parsed;
    return parsed;
  }catch(e){return null}
}
function setSession(user){
  MEMORY_SESSION={id:user.id||'failsafe',name:user.name,loginId:user.loginId,role:user.role,at:Date.now()};
  try{localStorage.setItem(SESSION_KEY,JSON.stringify(MEMORY_SESSION));}catch(e){}
}
function clearSession(){
  MEMORY_SESSION=null;
  try{localStorage.removeItem(SESSION_KEY);}catch(e){}
}
function findUser(identifier){identifier=(identifier||'').trim().toLowerCase();return getUsers().find(u=>[u.loginId,u.mobile,u.email].filter(Boolean).map(v=>String(v).trim().toLowerCase()).includes(identifier))}
function ensureAuthUI(){
  const ses=currentSession();
  const gate=$('#authGate'),appShell=$('#appShell');
  if(!gate||!appShell)return;
  if(ses){
    gate.style.display='none';
    appShell.classList.remove('auth-hidden');
    if($('#currentUserBadge')) $('#currentUserBadge').textContent=`${ses.name} • ${ses.role}`;
    showView('dashboard');
  }else{
    gate.style.display='grid';
    appShell.classList.add('auth-hidden');
  }
}
function bindAuth(){
  seedUsers();
  $('#loginBtn').onclick=loginUser;
  $('#oneTapRajeshBtn').onclick=()=>setLoginStatus('Quick login is disabled. Use your registered Firebase email.',false);
  $('#demoUsersBtn').onclick=toggleDemoUsers;
  $('#forgotBtn').onclick=()=>{
    const email=$('#loginIdentifier').value.trim();
    if(!email || !email.includes('@')){setLoginStatus('Enter your registered email address first.',false);return}
    const firebaseEmail=document.getElementById('firebaseEmail');
    const firebaseForgotBtn=document.getElementById('firebaseForgotBtn');
    if(!firebaseEmail || !firebaseForgotBtn){setLoginStatus('Firebase password reset is unavailable. Please refresh.',false);return}
    firebaseEmail.value=email;
    firebaseForgotBtn.click();
    setLoginStatus('Password reset request sent. Check Inbox and Spam.',true);
  };
  $('#resetLoginBtn').onclick=resetLoginAccess;
  $('#forgotCloseBtn').onclick=()=>$('#forgotModal').classList.remove('open');
  $('#forgotCancelBtn').onclick=()=>$('#forgotModal').classList.remove('open');
  $('#recoverBtn').onclick=recoverPassword;
  $('#logoutBtn').onclick=()=>{if(confirm('Logout current user?')){clearSession();ensureAuthUI()}};
  $('#loginPassword').addEventListener('keydown',e=>{if(e.key==='Enter')loginUser()});
}
function toggleDemoUsers(){
  const box=$('#demoUsersBox');
  box.style.display=box.style.display==='none'?'block':'none';
  if(box.style.display==='none') return;
  const users=getUsers();
  box.innerHTML=`<b>Available login accounts</b><div class="small-note">You can use Login ID, Mobile or Email shown below.</div>`+users.map(u=>`<div class="docitem"><b>${esc(u.name)}</b><div class="docmeta">Login ID: ${esc(u.loginId)} • Mobile: ${esc(u.mobile||'-')} • Role: ${esc(u.role)} • Password: ${esc(u.password)}</div></div>`).join('');
}

function setLoginStatus(text,ok=false){
  const el=$('#loginStatus'); if(!el)return;
  el.textContent=text;
  el.classList.toggle('ok',ok);
  el.classList.toggle('error',!ok);
}

async function loginUser(){
  const identifier=$("#loginIdentifier").value.trim();
  const password=$("#loginPassword").value;

  if(!identifier || !password){
    setLoginStatus("Please enter email and password.",false);
    return;
  }

  if(!identifier.includes("@")){
    setLoginStatus("Please use your registered email address for secure login.",false);
    return;
  }

  const firebaseEmail=document.getElementById("firebaseEmail");
  const firebasePassword=document.getElementById("firebasePassword");
  const firebaseLoginBtn=document.getElementById("firebaseLoginBtn");

  if(!firebaseEmail || !firebasePassword || !firebaseLoginBtn){
    setLoginStatus("Secure Firebase login is unavailable. Please refresh the page.",false);
    return;
  }

  firebaseEmail.value=identifier;
  firebasePassword.value=password;

  setLoginStatus("Signing in securely with Firebase...",true);
  firebaseLoginBtn.click();
}
function recoverPassword(){
  const identifier=$('#fpIdentifier').value.trim();
  const recoveryEmail=$('#fpRecoveryEmail').value.trim().toLowerCase();
  const newPassword=$('#fpNewPassword').value;
  const confirmPassword=$('#fpConfirmPassword').value;
  const users=getUsers();
  const idx=users.findIndex(u=>[u.loginId,u.mobile,u.email].filter(Boolean).map(v=>String(v).trim().toLowerCase()).includes(identifier.toLowerCase()));
  if(idx<0){alert('User not found.');return}
  if(!newPassword || newPassword.length<4){alert('New password should be at least 4 characters.');return}
  if(newPassword!==confirmPassword){alert('Password confirmation does not match.');return}
  const savedRecovery=(users[idx].recoveryEmail||'').trim().toLowerCase();
  if(savedRecovery && recoveryEmail!==savedRecovery){alert('Recovery email does not match this user record.');return}
  if(!savedRecovery && !recoveryEmail){alert('This user has no recovery email yet. Ask admin to update it in Settings → User Management.');return}
  users[idx].recoveryEmail=recoveryEmail||savedRecovery;
  users[idx].password=newPassword;
  saveUsers(users);
  alert('Password reset successful. Please login with the new password.');
  $('#forgotModal').classList.remove('open');
  ['#fpIdentifier','#fpRecoveryEmail','#fpNewPassword','#fpConfirmPassword'].forEach(s=>$(s).value='');
}
function usersHtml(){
  const users=getUsers();
  return `<table class="user-table"><thead><tr><th>Name</th><th>Login</th><th>Mobile</th><th>Recovery</th><th>Role</th><th>Actions</th></tr></thead><tbody>${users.map(u=>`<tr><td>${esc(u.name)}</td><td>${esc(u.loginId)}${u.email?`<div class="small-note">${esc(u.email)}</div>`:''}</td><td>${esc(u.mobile||'-')}</td><td>${esc(u.recoveryEmail||'-')}</td><td>${esc(u.role||'-')}</td><td><button class="ghost" onclick="app.prefillUser('${u.id}')">Edit</button> <button class="ghost" onclick="app.deleteUser('${u.id}')">Delete</button></td></tr>`).join('')}</tbody></table>`;
}
function prefillUser(id){
  const u=getUsers().find(x=>x.id===id); if(!u) return;
  $('#u_id').value=u.id||''; $('#u_name').value=u.name||''; $('#u_login').value=u.loginId||''; $('#u_mobile').value=u.mobile||''; $('#u_email').value=u.email||''; $('#u_role').value=u.role||'Doctor'; $('#u_password').value=u.password||''; $('#u_recovery').value=u.recoveryEmail||'';
}
function deleteUser(id){
  const users=getUsers(); const u=users.find(x=>x.id===id); if(!u) return; if(!confirm(`Delete user ${u.name}?`)) return;
  saveUsers(users.filter(x=>x.id!==id));
  if($('#usersList')) $('#usersList').innerHTML=usersHtml();
}
function saveUserFromSettings(){
  const name=$('#u_name').value.trim(), loginId=$('#u_login').value.trim(), mobile=$('#u_mobile').value.trim(), email=$('#u_email').value.trim(), role=$('#u_role').value, password=$('#u_password').value, recoveryEmail=$('#u_recovery').value.trim(), id=$('#u_id').value;
  if(!name || !loginId || !password){alert('Name, login ID and password are required.');return}
  const users=getUsers();
  if(users.some(u=>u.id!==id && String(u.loginId).toLowerCase()===loginId.toLowerCase())){alert('Login ID already exists.');return}
  if(mobile && users.some(u=>u.id!==id && String(u.mobile)===mobile)){alert('Mobile already exists.');return}
  if(email && users.some(u=>u.id!==id && String(u.email).toLowerCase()===email.toLowerCase())){alert('Email already exists.');return}
  const obj={id:id||uid(),name,loginId,mobile,email,password,recoveryEmail,role};
  const idx=users.findIndex(u=>u.id===obj.id);
  if(idx>=0) users[idx]=obj; else users.push(obj);
  saveUsers(users);
  ['#u_id','#u_name','#u_login','#u_mobile','#u_email','#u_password','#u_recovery'].forEach(s=>$(s).value=''); $('#u_role').value='Doctor';
  $('#usersList').innerHTML=usersHtml();
  alert('User saved successfully.');
}


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
       <div class="letter-logo sparkle-mark">✨</div>
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

function showView(name){ if(!currentSession()) return; currentView=name; 
  $$('#nav button').forEach(b=>b.classList.toggle('active',b.dataset.view===name));
  $('#pageTitle').textContent=titles[name][0];$('#pageSubtitle').textContent=titles[name][1];
  const v=$('#view');v.innerHTML='';v.appendChild(tpl(name+'Tpl'));
  ({dashboard:renderDashboard,clinical:renderClinical,children:renderChildren,followup:renderFollowup,analytics:renderAnalytics,vaccination:renderVaccination,documents:renderDocuments,reports:renderReports,knowledge:renderKnowledge,education:renderEducation,inventory:renderInventory,backup:renderBackup,settings:renderSettings}[name]||(()=>{}))();
}



const DEFAULT_SALES_STAFF=['Dr Rajesh Sao','Dr Ravi Chandrakar','Miss Mansi','Other'];
function salesStaffList(){
  const raw=Array.isArray(db?.settings?.salesStaff)?db.settings.salesStaff:[];
  return [...new Set([...DEFAULT_SALES_STAFF,...raw].filter(Boolean))];
}
function staffOptions(selected=''){
  return salesStaffList().map(s=>`<option ${s===selected?'selected':''}>${esc(s)}</option>`).join('');
}
function paymentStaff(p){return p?.soldBy||p?.recordedBy||'Unassigned'}
function staffFinanceSummary(scope='month'){
  const now=new Date();
  const list=(db.payments||[]).filter(p=>{
    if(scope!=='month')return true;
    const d=new Date((p.date||'')+'T00:00:00');
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const map={};
  for(const p of list){
    const name=paymentStaff(p); map[name] ||= {count:0,billed:0,collected:0,cash:0,upi:0,credit:0,pending:0};
    const x=map[name],bal=paymentBalance(p),st=paymentStatus(p);
    x.count++;x.billed+=Number(p.amount)||0;x.collected+=Number(p.paid)||0;
    if(p.method==='Cash')x.cash+=Number(p.paid)||0;
    if(p.method==='UPI')x.upi+=Number(p.paid)||0;
    if(['Credit / Udhari','Pay Later'].includes(st))x.credit+=bal;
    if(['Pending','Part Paid'].includes(st))x.pending+=bal;
  }
  return map;
}

const INVENTORY_ITEMS=['Swarnabrahma Yog Tablet','Cow Ghee','Honey','Feeding Spoon','Other'];
const INVENTORY_ACTIONS=['Purchase','Clinic Use','Home Use / Sale','Self Use','Family / Relative Free','Wastage / Damage','Adjustment +','Adjustment -'];
function inventoryEntries(){return db.inventory||[]}
function inventoryBaseQty(e){
  const q=Number(e.qty)||0;
  if(e.item==='Swarnabrahma Yog Tablet'){
    if(e.unit==='Box (150 tablets)')return q*150;
    if(e.unit==='Strip (30 tablets)')return q*30;
    return q;
  }
  if(['Cow Ghee','Honey'].includes(e.item)){
    if(e.unit==='kg')return q*1000;
    if(e.unit==='L')return q*1000;
    return q; // g or ml
  }
  return q;
}
function inventoryDelta(e){
  const base=inventoryBaseQty(e);
  return ['Purchase','Adjustment +'].includes(e.action)?base:-base;
}
function inventoryStock(item){
  return inventoryEntries().filter(e=>e.item===item).reduce((s,e)=>s+inventoryDelta(e),0);
}
function inventoryUnitLabel(item){
  if(item==='Swarnabrahma Yog Tablet')return 'tablets';
  if(item==='Cow Ghee')return 'g/ml';
  if(item==='Honey')return 'g/ml';
  if(item==='Feeding Spoon')return 'pieces';
  return 'units';
}
function inventoryPurchaseValue(){
  return inventoryEntries().filter(e=>e.action==='Purchase').reduce((s,e)=>s+(Number(e.totalCost)||0),0)
}
function inventoryUsageCount(action,item=''){
  return inventoryEntries().filter(e=>e.action===action&&(!item||e.item===item)).reduce((s,e)=>s+inventoryBaseQty(e),0)
}
function renderStaffFinanceDashboard(){
  const el=$('#staffFinancePanel');if(!el)return;
  const m=staffFinanceSummary('month'),rows=Object.entries(m).sort((a,b)=>b[1].collected-a[1].collected);
  el.innerHTML=`<div class="card staff-finance-card">
    <div class="cardhead"><div><span class="eyebrow">STAFF-WISE COLLECTION</span><h3>Who handled the Swarnaprashan sale?</h3></div><button class="linkbtn" onclick="app.showView('inventory')">Inventory</button></div>
    ${rows.length?`<div class="staff-finance-table"><div class="staff-finance-head"><span>Staff</span><span>Collected</span><span>Cash</span><span>UPI</span><span>Pending</span><span>Credit/Udhari</span></div>
    ${rows.map(([n,x])=>`<div class="staff-finance-row"><b>${esc(n)}</b><strong>${money(x.collected)}</strong><span>${money(x.cash)}</span><span>${money(x.upi)}</span><span>${money(x.pending)}</span><span>${money(x.credit)}</span></div>`).join('')}</div>`:'<p class="muted">No payment transactions this month.</p>'}
  </div>`;
}
function renderInventoryDashboard(){
  const el=$('#inventoryDash');if(!el)return;
  const tab=inventoryStock('Swarnabrahma Yog Tablet'),ghee=inventoryStock('Cow Ghee'),honey=inventoryStock('Honey'),spoons=inventoryStock('Feeding Spoon');
  el.innerHTML=`<div class="inventory-dash-strip">
    <div><span>Swarnabrahma Stock</span><b>${Math.max(0,tab)} tablets</b></div>
    <div><span>Cow Ghee Stock</span><b>${Math.max(0,ghee)} g/ml</b></div>
    <div><span>Honey Stock</span><b>${Math.max(0,honey)} g/ml</b></div>
    <div><span>Feeding Spoons</span><b>${Math.max(0,spoons)} pcs</b></div>
    <button class="ghost" onclick="app.showView('inventory')">Open Stock Ledger</button>
  </div>`;
}

const PAYMENT_STATUSES=['Paid','Part Paid','Pending','Credit / Udhari','Pay Later','Home Use - Already Paid','Complimentary / Free','Waived / No Charge'];
const PAYMENT_METHODS=['Cash','UPI','Card','Bank Transfer','Credit / Udhari','Pay Later','Home Use Prepaid','Complimentary / Free','Other'];

function childPayments(childId){
  return (db.payments||[]).filter(p=>p.childId===childId).sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))||String(a.createdAt||'').localeCompare(String(b.createdAt||'')));
}
function latestPayment(childId){return childPayments(childId).at(-1)||null}
function paymentBalance(p){return Math.max(0,(Number(p?.amount)||0)-(Number(p?.paid)||0))}
function paymentStatus(p){
  if(!p)return 'No Entry';
  if(p.status)return p.status;
  const amt=Number(p.amount)||0, paid=Number(p.paid)||0;
  if(amt<=0)return 'Complimentary / Free';
  if(paid>=amt)return 'Paid';
  if(paid>0)return 'Part Paid';
  return 'Pending';
}
function paymentStatusClass(s){
  if(['Paid','Home Use - Already Paid'].includes(s))return 'pay-paid';
  if(['Part Paid'].includes(s))return 'pay-part';
  if(['Pending','Pay Later'].includes(s))return 'pay-pending';
  if(['Credit / Udhari'].includes(s))return 'pay-credit';
  if(['Complimentary / Free','Waived / No Charge'].includes(s))return 'pay-free';
  return 'pay-none';
}
function money(n){return '₹'+(Number(n)||0).toLocaleString('en-IN',{maximumFractionDigits:2})}

function currentSwarnaprashanRate(){
  const r=Number(db?.settings?.swarnaprashanRate);
  return Number.isFinite(r)&&r>=0?r:250;
}
function expectedDoseBilling(scope='month'){
  const now=new Date();
  const entries=(db.payments||[]).filter(p=>{
    if(scope!=='month')return true;
    const d=new Date((p.date||'')+'T00:00:00');
    return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
  });
  const doseEntries=entries.filter(p=>String(p.purpose||'').toLowerCase().includes('swarnaprashan'));
  const expected=doseEntries.reduce((s,p)=>s+(Number(p.amount)||currentSwarnaprashanRate()),0);
  return {count:doseEntries.length,expected};
}

function paymentSummary(scope='all'){
  const list=(db.payments||[]).filter(p=>{
    if(scope==='month'){
      const d=new Date((p.date||'')+'T00:00:00'),now=new Date();
      return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    }
    return true;
  });
  const billed=list.reduce((s,p)=>s+(Number(p.amount)||0),0);
  const collected=list.reduce((s,p)=>s+(Number(p.paid)||0),0);
  const due=list.reduce((s,p)=>s+paymentBalance(p),0);
  const dueChildren=new Set(list.filter(p=>paymentBalance(p)>0).map(p=>p.childId)).size;
  const cash=list.filter(p=>p.method==='Cash').reduce((s,p)=>s+(Number(p.paid)||0),0);
  const upi=list.filter(p=>p.method==='UPI').reduce((s,p)=>s+(Number(p.paid)||0),0);
  const card=list.filter(p=>p.method==='Card').reduce((s,p)=>s+(Number(p.paid)||0),0);
  const bank=list.filter(p=>p.method==='Bank Transfer').reduce((s,p)=>s+(Number(p.paid)||0),0);
  const credit=list.filter(p=>['Credit / Udhari','Pay Later'].includes(paymentStatus(p))).reduce((s,p)=>s+paymentBalance(p),0);
  const pending=list.filter(p=>['Pending','Part Paid'].includes(paymentStatus(p))).reduce((s,p)=>s+paymentBalance(p),0);
  const prepaid=list.filter(p=>paymentStatus(p)==='Home Use - Already Paid').reduce((s,p)=>s+(Number(p.paid)||0),0);
  return {billed,collected,due,dueChildren,cash,upi,card,bank,credit,pending,prepaid,count:list.length};
}
function renderPaymentKpis(){
  const el=$('#paymentKpis');if(!el)return;
  const m=paymentSummary('month'),all=paymentSummary('all'),exp=expectedDoseBilling('month');
  const rate=currentSwarnaprashanRate();
  el.innerHTML=`
    <div class="billing-rate-banner">
      <div><span>Current Swarnaprashan Rate</span><b>${money(rate)} / dose</b></div>
      <button class="ghost" onclick="app.showView('settings')">Change Rate</button>
    </div>
    <div class="finance-grid">
      ${[
        ['Expected Billing This Month',money(exp.expected),'gold',`${exp.count} recorded dose${exp.count===1?'':'s'}`],
        ['Collected This Month',money(m.collected),'green','All received payments'],
        ['Cash Collection',money(m.cash),'gold','This month'],
        ['UPI Collection',money(m.upi),'blue','This month'],
        ['Card / Bank',money(m.card+m.bank),'violet','This month'],
        ['Pending Balance',money(m.pending),'orange','Pending + part-paid'],
        ['Credit / Udhari',money(m.credit),'red','Outstanding credit'],
        ['Total Outstanding',money(all.due),'red',`${all.dueChildren} children with due`],
        ['Home-use Prepaid',money(m.prepaid),'teal','Already paid home-use'],
        ['Payment Entries',all.count,'neutral','All-time ledger entries']
      ].map(x=>`<div class="finance-kpi ${x[2]}"><span>${x[0]}</span><b>${x[1]}</b><small>${x[3]}</small></div>`).join('')}
    </div>`;
}
async function renderDashboard(){
  let docs=[];try{docs=await getDocs()}catch{}
  const now=new Date(),thisMonth=db.followups.filter(v=>new Date(v.date).getMonth()===now.getMonth()&&new Date(v.date).getFullYear()===now.getFullYear()).length;
  $('#kpis').innerHTML=[['Registered Children',db.children.length],['Clinical Entries',db.cases.length],['Visits This Month',thisMonth],['Saved Documents',docs.length]].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  renderPaymentKpis();
  renderStaffFinanceDashboard();
  renderInventoryDashboard();
  const oc=childOperationalCounts();
  if($('#opsKpis')) $('#opsKpis').innerHTML=[
    ['Active',oc.active,'green'],['Ready',oc.ready,'gold'],['Appointments Today',oc.apptToday,'blue'],['Dose Taken Today',oc.doseToday,'green'],
    ['Reminders Today',oc.remindersToday,'orange'],['Home Use',oc.home,'violet'],['Health Hold',oc.hold,'red'],['Stopped',oc.stopped,'gray']
  ].map(x=>`<button class="ops-kpi ${x[2]}" onclick="app.openChildrenStatus('${x[0]}')"><b>${x[1]}</b><span>${x[0]}</span></button>`).join('');

  const sorted=[...db.children].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));
  $('#recentChildren').innerHTML=sorted.slice(0,8).map(c=>`<div class="docitem child-dashboard-row" onclick="app.openChildFromDashboard('${c.id}')"><b>${esc(c.name)}</b><div class="docmeta"><span class="id-badge">${esc(c.regId||'-')}</span> • ${age(c.dob)} • ${esc(c.mobile||'')}</div></div>`).join('')||'<p class="muted">No child registered.</p>';
  $('#dueChildren').innerHTML=sorted.slice(0,8).map(c=>{const f=fups(c.id).at(-1);return`<div class="docitem"><b>${esc(c.name)}</b><div class="docmeta">${esc(c.regId||'-')} • Last follow-up: ${f?fmt(f.date):'Not recorded'}</div></div>`}).join('')||'<p class="muted">Register a child to begin.</p>';

  const today=new Date(); today.setHours(0,0,0,0);
  const upcoming=PUSHYA_DATES.filter(x=>new Date(x.date+'T00:00:00')>=today);
  const next=upcoming[0]||PUSHYA_DATES[0];
  if($('#pushyaNext')) $('#pushyaNext').innerHTML=next?`<div class="next-pushya"><span>Next Pushya</span><b>${esc(next.label)}</b><small>Reference date • verify local Raipur Panchang timing</small></div>`:'<p class="muted">Update Pushya calendar.</p>';
  if($('#pushyaYear')) $('#pushyaYear').innerHTML=upcoming.slice(0,13).map((x,i)=>`<span class="pushya-chip ${i===0?'next':''}">${esc(x.label.split(' • ')[0])}</span>`).join('');
  if($('#dashboardAlpha')) $('#dashboardAlpha').innerHTML='<button class="alpha-btn active" onclick="app.openAlpha(\'ALL\')">ALL</button>'+Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).map(l=>`<button class="alpha-btn" onclick="app.openAlpha('${l}')">${l}</button>`).join('');

  options($('#dashChild'));$('#dashChild').onchange=()=>drawSnapshot($('#dashChild').value);$('#dashSnapshot').innerHTML='<p class="muted">Select a child for baseline-to-latest analysis.</p>';
  $('#dashDocs').innerHTML=docs.slice(-5).reverse().map(d=>`<div class="docitem"><b>${esc(d.name)}</b><div class="docmeta">${esc(d.type)} • ${fmt(d.date)}</div></div>`).join('')||'<p class="muted">No documents uploaded.</p>';
}
function openChildFromDashboard(id){showView('children');setTimeout(()=>openChildDetails(id),80)}
function openAlpha(letter){showView('children');setTimeout(()=>{childAlpha=letter==='ALL'?'':letter;drawChildren($('#childSearch')?.value||'')},80)}
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

// Classical Ayurveda examination choices. Numeric 0–4 grading is reserved for longitudinal functional outcomes only.
const ASHTAVIDHA_OPTIONS={
  Nadi:['Not assessed','Vataja','Pittaja','Kaphaja','Vata-Pittaja','Vata-Kaphaja','Pitta-Kaphaja','Tridoshaja / Sannipataja','Sama / Prakrita'],
  Mala:['Not assessed','Samanya','Vibandha / Baddha','Mridu','Drava / Atisara','Picchila','Ama-yukta','Rakta-yukta','Krimi-yukta','Durgandhita','Other'],
  Mutra:['Not assessed','Samanya','Alpamutrata','Bahumutrata','Peeta','Shweta','Rakta-varna','Avila / Turbid','Daha-yukta','Krichchhra','Other'],
  Jihva:['Not assessed','Nirama / Shuddha','Sama / Coated','Shweta-lepa','Peeta-lepa','Ruksha','Snigdha','Rakta','Vivarna','Other'],
  Shabda:['Not assessed','Samanya','Manda','Karkasha','Bhinna / Hoarse','Uchcha','Aspashta','Other'],
  Sparsha:['Not assessed','Samanya','Sheeta','Ushna','Ruksha','Snigdha','Mridu','Kathina','Khara','Other'],
  Drik:['Not assessed','Samanya / Prasanna','Shweta','Peeta','Rakta','Ruksha / Shushka','Malina','Other'],
  Akruti:['Not assessed','Samanya','Krisha','Madhyama','Sthula','Hrasva','Dirgha','Other']
};

const DASHAVIDHA_OPTIONS={
  Prakriti:['Not assessed','Vataja','Pittaja','Kaphaja','Vata-Pittaja','Vata-Kaphaja','Pitta-Kaphaja','Sama / Tridoshaja'],
  Vikriti:['Not assessed','No evident dosha vikriti','Vataja','Pittaja','Kaphaja','Vata-Pittaja','Vata-Kaphaja','Pitta-Kaphaja','Tridoshaja / Sannipataja'],
  Sara:['Not assessed','Tvak Sara','Rakta Sara','Mamsa Sara','Meda Sara','Asthi Sara','Majja Sara','Shukra Sara','Satva Sara','Mixed / Multiple Sara'],
  Samhanana:['Not assessed','Pravara','Madhyama','Avara'],
  Pramana:['Not assessed','Sama / Pramana-sampat','Adhika','Hina','Measured separately'],
  Satmya:['Not assessed','Sarvarasa Satmya / Pravara','Madhyama Satmya','Avara / Ekarasa Satmya'],
  Satva:['Not assessed','Pravara','Madhyama','Avara'],
  'Ahara Shakti — Abhyavaharana':['Not assessed','Pravara','Madhyama','Avara'],
  'Ahara Shakti — Jarana':['Not assessed','Pravara','Madhyama','Avara'],
  'Vyayama Shakti':['Not assessed','Pravara','Madhyama','Avara'],
  Vaya:['Not assessed','Bala','Madhyama','Jirna / Vriddha']
};


const PUSHYA_DATES=[
  {date:'2026-08-11',label:'11 Aug 2026 • Tuesday'},
  {date:'2026-09-07',label:'07 Sep 2026 • Monday'},
  {date:'2026-10-05',label:'05 Oct 2026 • Monday'},
  {date:'2026-11-01',label:'01 Nov 2026 • Sunday'},
  {date:'2026-11-28',label:'28 Nov 2026 • Saturday'},
  {date:'2026-12-25',label:'25 Dec 2026 • Friday'},
  {date:'2027-01-22',label:'22 Jan 2027 • Friday'},
  {date:'2027-02-18',label:'18 Feb 2027 • Thursday'},
  {date:'2027-03-18',label:'18 Mar 2027 • Thursday'},
  {date:'2027-04-14',label:'14 Apr 2027 • Wednesday'},
  {date:'2027-05-11',label:'11 May 2027 • Tuesday'},
  {date:'2027-06-07',label:'07 Jun 2027 • Monday'},
  {date:'2027-07-05',label:'05 Jul 2027 • Monday'},
  {date:'2027-08-01',label:'01 Aug 2027 • Sunday'},
  {date:'2027-08-29',label:'29 Aug 2027 • Sunday'}
];

const SWARNA_GUIDE={
en:{
 title:'Swarnaprashan — Parent Information Guide',
 intro:'Swarnaprashan (Suvarna Prashana) is a traditional Ayurvedic pediatric practice described in the context of Lehana/Jatakarma. Classical descriptions use processed gold (Swarna/Swarna Bhasma) with suitable vehicles such as ghrita and madhu; contemporary formulations vary and may also contain Medhya/Rasayana herbs. The exact formulation and dose should therefore be documented product-wise and prescribed by a qualified Ayurvedic physician.',
 sections:[
  ['What is Swarnaprashan?','A physician-supervised Ayurvedic child-health practice intended as supportive preventive care. It should not be presented as a replacement for vaccination, balanced nutrition, breastfeeding/complementary feeding, hygiene, sleep, developmental surveillance or indicated pediatric treatment.'],
  ['Ingredients','Commonly described core ingredients include properly prepared/standardized Swarna Bhasma, Ghrita and Madhu. Some contemporary formulations add Brahmi, Shankhapushpi, Guduchi, Yashtimadhu, Vacha, Ashwagandha or other herbs. Record the exact clinic formulation, manufacturer/batch, quality documentation and dose in every visit.'],
  ['Dose','There is no single universal dose that should be copied across all products or ages. Dose depends on the formulation, concentration, age/weight and physician assessment. One published randomized infant trial used a specific study formulation and age-based drops for 28 days; that study dose should not be generalized to every commercial or clinic preparation.'],
  ['Timing & Pushya Nakshatra','Many contemporary Swarnaprashan programmes schedule administration on Pushya Nakshatra, traditionally associated with nourishment. Pushya recurs roughly every 27 days. The dashboard provides the upcoming reference dates; exact Raipur start/end timings should be verified from a local Panchang before announcing clinic hours.'],
  ['Pathya / Practical advice','Keep the child’s regular age-appropriate nutritious diet, adequate hydration, sleep, play and hygiene. Follow the prescribing physician’s product-specific fasting/food-gap instructions. Avoid unnecessary self-medication and do not delay evaluation of fever, dehydration, breathing difficulty, persistent vomiting/diarrhoea, poor feeding, lethargy, seizures or other red flags.'],
  ['Important safety note for infants','Modern pediatric guidance advises that honey should not be given to children younger than 12 months because of infant botulism risk. If a Swarnaprashan preparation contains honey, the physician must explicitly reconcile the classical formulation with current infant-safety guidance and use an age-appropriate alternative protocol where required.'],
  ['Quality & metal safety','Use only appropriately manufactured, quality-tested preparations from a reliable regulated source. Products containing metals require particular attention to identity, processing, batch documentation and contamination testing.'],
  ['What does modern evidence say?','A randomized controlled infant study of a specific Swarna Bhasma + Ghrita + honey formulation reported tolerability and exploratory immunological findings, but between-group IgG differences were not statistically significant and larger, standardized studies are still needed. Claims of guaranteed immunity, IQ enhancement or prevention/cure of specific diseases should therefore be avoided.'],
  ['Growth & development tracking','Serial height/length, weight and BMI should be interpreted using age- and sex-specific pediatric growth standards. For children 0–5 years, WHO Child Growth Standards are appropriate; for 5–19 years, WHO Growth Reference 2007 applies. The trend over time is more clinically useful than a single isolated number.']
 ]
},
hi:{
 title:'स्वर्णप्राशन — अभिभावक जानकारी',
 intro:'स्वर्णप्राशन आयुर्वेद में बाल-स्वास्थ्य से संबंधित एक पारंपरिक अभ्यास है, जिसका वर्णन लेहन/जातकर्म के संदर्भ में मिलता है। शास्त्रीय वर्णनों में सुवर्ण/स्वर्ण भस्म को घृत तथा मधु जैसे अनुपान के साथ दिया जाता है; आधुनिक formulations अलग-अलग हो सकती हैं और उनमें मेध्य/रसायन द्रव्य भी जोड़े जा सकते हैं। इसलिए formulation और dose को उत्पाद व बच्चे के अनुसार योग्य आयुर्वेद चिकित्सक द्वारा तय व दर्ज किया जाना चाहिए।',
 sections:[
  ['स्वर्णप्राशन क्या है?','यह चिकित्सकीय देखरेख में किया जाने वाला आयुर्वेदिक बाल-स्वास्थ्य कार्यक्रम है। इसे vaccination, संतुलित आहार, breastfeeding/complementary feeding, hygiene, sleep, developmental surveillance या आवश्यक pediatric treatment का विकल्प नहीं बताना चाहिए।'],
  ['मुख्य ingredients','सामान्यतः उचित रूप से तैयार/standardized स्वर्ण भस्म, घृत और मधु का उल्लेख मिलता है। कुछ आधुनिक formulations में ब्राह्मी, शंखपुष्पी, गुडूची, यष्टिमधु, वचा, अश्वगंधा आदि जोड़े जाते हैं। हर visit में exact formulation, manufacturer/batch, quality details और dose दर्ज करें।'],
  ['Dose / मात्रा','सभी products और सभी आयु के लिए एक ही universal dose सही नहीं है। Dose formulation concentration, age/weight और physician assessment पर निर्भर होनी चाहिए। किसी research trial की dose को हर clinic/product पर सीधे लागू नहीं करना चाहिए।'],
  ['समय एवं पुष्य नक्षत्र','कई वर्तमान Swarnaprashan programmes पुष्य नक्षत्र के दिन administration करते हैं। पुष्य लगभग प्रत्येक 27 दिन में आता है। Dashboard में आने वाली reference dates दी गई हैं; clinic timing प्रकाशित करने से पहले Raipur के local Panchang से exact start/end time verify करें।'],
  ['पथ्य / practical advice','बच्चे का आयु-अनुसार पौष्टिक आहार, पर्याप्त hydration, नींद, खेल और hygiene नियमित रखें। Product-specific food-gap/fasting instructions केवल prescribing physician के अनुसार रखें। तेज बुखार, dehydration, breathing difficulty, लगातार vomiting/diarrhoea, poor feeding, अत्यधिक सुस्ती, seizure आदि में medical evaluation delay न करें।'],
  ['12 माह से कम शिशु के लिए महत्वपूर्ण safety note','आधुनिक pediatric guidance के अनुसार 12 माह से कम आयु के शिशु को honey नहीं देना चाहिए क्योंकि infant botulism का जोखिम होता है। यदि formulation में मधु है तो physician को classical formulation और वर्तमान infant-safety guidance का स्पष्ट समन्वय करना चाहिए तथा आवश्यकतानुसार age-appropriate alternative protocol चुनना चाहिए।'],
  ['Quality एवं metal safety','केवल विश्वसनीय regulated source से properly manufactured और quality-tested preparation का उपयोग करें। Metal-containing products में identity, processing, batch documentation और contamination testing पर विशेष ध्यान रखें।'],
  ['आधुनिक evidence क्या कहता है?','एक randomized infant study में specific Swarna Bhasma + Ghrita + honey formulation की tolerability और exploratory immunological findings देखी गईं; लेकिन between-group IgG difference statistically significant नहीं था और बड़े standardized studies अभी भी आवश्यक हैं। इसलिए guaranteed immunity, IQ increase या specific diseases की prevention/cure जैसे अतिशयोक्त claims से बचें।'],
  ['Growth और development tracking','Height/length, weight और BMI को age- तथा sex-specific pediatric growth standards के अनुसार serially interpret करना चाहिए। 0–5 वर्ष में WHO Child Growth Standards तथा 5–19 वर्ष में WHO Growth Reference 2007 उपयोगी हैं। एक single value से अधिक महत्वपूर्ण उसका longitudinal trend है।']
 ]
}
};

function ayurOptions(options,value){
  const current=(typeof value==='string'&&options.includes(value))?value:'Not assessed';
  return options.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('');
}
function ayurSelect(prefix,name,options,value){
  const key=prefix+name;
  return `<label>${name}<select data-w="${esc(key)}" data-ayur="1">${ayurOptions(options,value)}</select></label>`;
}
function wizardHtml(i){
 const d=wiz.data,scale=(name,val=2)=>`<label>${name}<select data-w="${name}">${scaleOptions(val)}</select></label>`;
 if(i===0)return`<div class="card"><h3>1. Patient Profile</h3><div class="formgrid"><label>Existing Child<select id="w_child"></select></label><label>Date<input id="w_date" type="date" value="${d.date||''}"></label><label>Visit Type<select id="w_type"><option>Initial Swarnaprashan</option><option>Monthly Follow-up</option><option>Clinical Review</option></select></label><label>Present Complaint<input id="w_complaint" value="${esc(d.complaint||'')}"></label><label>Allergy / Sensitivity<input id="w_allergy" value="${esc(d.allergy||'')}"></label><label>Current Medication<input id="w_currentMeds" value="${esc(d.currentMeds||'')}"></label></div><label>Relevant History<textarea id="w_history">${esc(d.history||'')}</textarea></label></div>`;
 if(i===1)return`<div class="card"><h3>2. Examination</h3><div class="formgrid"><label>Height cm<input id="w_height" type="number" step=".1" value="${d.height||''}"></label><label>Weight kg<input id="w_weight" type="number" step=".1" value="${d.weight||''}"></label><label>Temperature °F<input id="w_temp" type="number" step=".1" value="${d.temp||''}"></label><label>Pulse /min<input id="w_pulse" type="number" value="${d.pulse||''}"></label><label>RR /min<input id="w_rr" type="number" value="${d.rr||''}"></label><label>SpO₂ %<input id="w_spo2" type="number" value="${d.spo2||''}"></label><label>BP Systolic<input id="w_sys" type="number" value="${d.sys||''}"></label><label>BP Diastolic<input id="w_dia" type="number" value="${d.dia||''}"></label><label>General Appearance<input id="w_ga" value="${esc(d.ga||'')}"></label></div><div class="section"><h4>Functional Grading 0–4</h4><div class="scalegrid">${['Appetite','Bladder','Bowel','Sleep','Learning','Memory','Playing','School Performance','Energy'].map(x=>scale(x,d.examScores?.[x]??2)).join('')}</div></div><div class="section"><h4>Ashtavidha Pariksha — Ayurveda-specific findings</h4><div class="scalegrid">${Object.entries(ASHTAVIDHA_OPTIONS).map(([x,opts])=>ayurSelect('A:',x,opts,d.examScores?.['A:'+x])).join('')}</div></div><div class="section"><h4>Dashavidha Atura Pariksha — Ayurveda-specific assessment</h4><div class="scalegrid">${Object.entries(DASHAVIDHA_OPTIONS).map(([x,opts])=>ayurSelect('D:',x,opts,d.examScores?.['D:'+x])).join('')}</div><p class="tiny muted">Ahara Shakti is documented through Abhyavaharana Shakti and Jarana Shakti.</p></div><label>Examination Notes<textarea id="w_examNotes">${esc(d.examNotes||'')}</textarea></label></div>`;
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
 if(wiz.step===1){['height','weight','temp','pulse','rr','spo2','sys','dia','ga','examNotes'].forEach(k=>d[k]=$('#w_'+k)?.value);d.examScores={};$$('[data-w]').forEach(e=>d.examScores[e.dataset.w]=e.dataset.ayur==='1'?e.value:Number(e.value));d.bmi=d.height&&d.weight?(+d.weight/((+d.height/100)**2)).toFixed(2):''}
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
let childAlpha='';

function renderChildren(){
  db.children=db.children.map(normalizeChild);
  save();
  $('#registerChildBtn').onclick=()=>editChild();
  $('#showAllChildrenBtn').onclick=()=>{ $('#childStatusFilter').value=''; $('#childTaskFilter').value=''; if($('#childPaymentFilter'))$('#childPaymentFilter').value=''; $('#childSearch').value=''; drawChildren(''); };
  $('#childSearch').oninput=()=>drawChildren($('#childSearch').value);
  $('#childStatusFilter').onchange=()=>drawChildren($('#childSearch').value);
  $('#childTaskFilter').onchange=()=>drawChildren($('#childSearch').value);
  $('#childPaymentFilter').onchange=()=>drawChildren($('#childSearch').value);
  if($('#childAlphaBar')) $('#childAlphaBar').innerHTML='<button class="alpha-btn active" data-alpha="">ALL</button>'+Array.from({length:26},(_,i)=>String.fromCharCode(65+i)).map(l=>`<button class="alpha-btn" data-alpha="${l}">${l}</button>`).join('');
  $$('#childAlphaBar .alpha-btn').forEach(b=>b.onclick=()=>{childAlpha=b.dataset.alpha||'';$$('#childAlphaBar .alpha-btn').forEach(x=>x.classList.toggle('active',x===b));drawChildren($('#childSearch').value)});
  renderRegistryKpis();
  renderTodayPanel();
  drawChildren('');
}
function renderRegistryKpis(){
  const c=childOperationalCounts();
  $('#registryKpis').innerHTML=[
    ['Total Saved',c.total,'neutral'],
    ['Active',c.active,'green'],
    ['Ready',c.ready,'gold'],
    ['Appointment Today',c.apptToday,'blue'],
    ['Dose Taken Today',c.doseToday,'green'],
    ['Reminder Today',c.remindersToday,'orange'],
    ['Health Hold',c.hold,'red'],
    ['Stopped',c.stopped,'gray'],
    ['Payment Due',paymentSummary('all').dueChildren,'red']
  ].map(x=>`<div class="ops-kpi ${x[2]}"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
}
function renderTodayPanel(){
  const today=isoToday();
  const arr=normalizedChildren().filter(c=>c.appointmentDate===today || c.reminderDate===today || c.currentStatus==='Ready for Swarnaprashan');
  $('#todayRegistryPanel').innerHTML=`<div class="today-head"><div><b>Today / Next Action Board</b><span>${fmt(today)}</span></div><span class="pill">${arr.length} child${arr.length===1?'':'ren'}</span></div>
  <div class="today-grid">${arr.map(c=>`<div class="today-child">
    <div class="today-contact-block">
      <b>${esc(c.name)}</b>
      <span><strong>Guardian:</strong> ${esc(c.parent||'Not entered')}</span>
      <span><strong>Mobile:</strong> ${esc(c.mobile||'Not entered')}</span>
      ${c.address?`<span><strong>Address:</strong> ${esc(c.address)}</span>`:''}
    </div>
    <span class="status-badge2 ${statusClass(c.currentStatus)}">${esc(c.currentStatus)}</span>
    <div class="today-actions">
      ${c.mobile?`<a href="${callLink(c.mobile)}" class="mini-action call-action">📞 Call ${esc(c.mobile)}</a><a href="${waLink(c.mobile,c.name)}" target="_blank" class="mini-action wa-action">WhatsApp</a>`:'<span class="missing-contact">Mobile not entered</span>'}
      <button class="mini-action" onclick="app.openChildDetails('${c.id}')">Open Profile</button>
    </div>
  </div>`).join('')||'<p class="muted">No child is due today. Use Appointment / Reminder dates in child profiles.</p>'}</div>`;
}
async function editChild(id=''){
  const c=normalizeChild(id?child(id):{});
  let photo='';
  if(c?.photoDocId){
    try{ const pd=await docById(c.photoDocId); if(pd?.blob) photo=URL.createObjectURL(pd.blob); }catch(e){}
  }
  const regDefault=c.regId||('SW'+String(db.children.length+1).padStart(4,'0'));

  $('#childEditor').innerHTML=`<div class="card profile-editor">
    <div class="cardhead">
      <div><span class="eyebrow">CHILD PROFILE + SWARNAPRASHAN STATUS</span><h3>${id?'Edit':'Register'} Child</h3><p class="muted">Profile saves first. Photo is recommended but does not block saving.</p></div>
      <div class="profile-photo-panel">
        ${photo?`<img id="photoPreview" src="${photo}" class="avatar-xl">`:`<div id="photoPreviewPlaceholder" class="avatar-xl avatar-placeholder">👶<span>Photo optional</span></div><img id="photoPreview" class="avatar-xl" style="display:none">`}
        <span id="photoStatus" class="photo-status ${c.photoDocId?'ok':'pending'}">${c.photoDocId?'Identity photo saved':'Photo can be added now or later'}</span>
      </div>
    </div>

    <div class="section profile-section">
      <h4>Identity & Contact</h4>
      <div class="formgrid">
        <label>Child Name *<input id="c_name" value="${esc(c.name||'')}" placeholder="Full name"></label>
        <label>Date of Birth<input id="c_dob" type="date" value="${c.dob||''}"></label>
        <label>Sex<select id="c_sex"><option ${c.sex==='Male'?'selected':''}>Male</option><option ${c.sex==='Female'?'selected':''}>Female</option><option ${c.sex==='Other'?'selected':''}>Other</option></select></label>
        <label>Parent / Guardian<input id="c_parent" value="${esc(c.parent||'')}"></label>
        <label>Mobile / WhatsApp *<input id="c_mobile" inputmode="tel" value="${esc(c.mobile||'')}" placeholder="Guardian contact for reminders"></label>
        <label>Registration ID<input id="c_reg" value="${esc(regDefault)}"></label>
        <label>School / Class<input id="c_school" value="${esc(c.school||'')}"></label>
        <label>Short Address<input id="c_address" value="${esc(c.address||'')}"></label>
        <label>Allergies<input id="c_allergy" value="${esc(c.allergies||'')}"></label>
      </div>
    </div>

    <div class="section ops-section">
      <h4>Swarnaprashan Current Status & Checklist</h4>
      <div class="formgrid">
        <label>Current Status<select id="c_status">${CHILD_STATUSES.map(s=>`<option ${c.currentStatus===s?'selected':''}>${s}</option>`).join('')}</select></label>
        <label>Checklist<select id="c_task">${TASK_STATUSES.map(s=>`<option ${c.taskStatus===s?'selected':''}>${s}</option>`).join('')}</select></label>
        <label>Appointment Date<input id="c_appointment" type="date" value="${c.appointmentDate||''}"></label>
        <label>Reminder Date<input id="c_reminder" type="date" value="${c.reminderDate||''}"></label>
        <label>Last Contact Date<input id="c_lastcontact" type="date" value="${c.lastContactDate||''}"></label>
        <label>Home Medicine Qty<input id="c_homeqty" value="${esc(c.homeMedicineQty||'')}" placeholder="e.g. 5 tablets / 2 doses"></label>
        <label>Next Action<input id="c_nextaction" value="${esc(c.nextAction||'')}" placeholder="Call / visit / dose / review"></label>
        <label>Status Note<input id="c_statusnote" value="${esc(c.statusNote||'')}" placeholder="Reason / short note"></label>
      </div>
    </div>

    <div class="section photo-section">
      <h4>Baby Identity Photo</h4>
      <div class="upload-grid">
        <button type="button" id="c_direct_camera" class="uploadbox camera-box direct-camera-btn">📷 Open Camera Now<br><span>Live preview → Capture Photo</span></button>
        <label class="uploadbox gallery-box">🖼 Choose from Gallery<input id="c_photo_gallery" type="file" accept="image/*"></label>
      </div>
      <div id="cameraCapturedName" class="selected-files"></div>
    </div>

    <label>Birth / Medical / Developmental History<textarea id="c_history">${esc(c.history||'')}</textarea></label>

    <div id="childSaveStatus" class="login-status">Ready to save child profile.</div>
    <div class="actionrow sticky-save-actions">
      <button id="saveChild">Save Child Profile</button>
      <button class="ghost" id="cancelChild">Cancel</button>
    </div>
  </div>`;

  let selectedPhoto=null;
  const showPreview=file=>{
    if(!file)return;
    selectedPhoto=file;
    const u=URL.createObjectURL(file);
    if($('#photoPreview')){ $('#photoPreview').src=u; $('#photoPreview').style.display='block'; }
    if($('#photoPreviewPlaceholder')) $('#photoPreviewPlaceholder').style.display='none';
    if($('#photoStatus')){ $('#photoStatus').textContent='Photo selected • will save with profile'; $('#photoStatus').className='photo-status ok'; }
    $('#cameraCapturedName').innerHTML=`<span class="file-chip">📷 ${esc(file.name||'photo.jpg')}</span>`;
  };

  $('#c_direct_camera').onclick=()=>startDirectCamera('Baby Identity Photo',file=>showPreview(file));
  $('#c_photo_gallery').onchange=e=>showPreview(e.target.files?.[0]);

  $('#saveChild').onclick=async()=>{
    const status=$('#childSaveStatus');
    const mark=(t,ok=true)=>{if(status){status.textContent=t;status.className='login-status '+(ok?'ok':'error')}};
    try{
      mark('Saving profile…');
      const x=normalizeChild({
        ...c,
        id:id||uid(),
        name:($('#c_name').value||'').trim(),
        dob:$('#c_dob').value||'',
        sex:$('#c_sex').value||'',
        parent:$('#c_parent').value||'',
        mobile:$('#c_mobile').value||'',
        regId:($('#c_reg').value||regDefault).trim(),
        school:$('#c_school').value||'',
        address:$('#c_address').value||'',
        allergies:$('#c_allergy').value||'',
        history:$('#c_history').value||'',
        currentStatus:$('#c_status').value||'Active',
        taskStatus:$('#c_task').value||'Pending',
        appointmentDate:$('#c_appointment').value||'',
        reminderDate:$('#c_reminder').value||'',
        lastContactDate:$('#c_lastcontact').value||'',
        homeMedicineQty:$('#c_homeqty').value||'',
        nextAction:$('#c_nextaction').value||'',
        statusNote:$('#c_statusnote').value||'',
        photoDocId:c.photoDocId||''
      });

      if(!x.name){mark('Child name is required.',false);alert('Child name is required.');return}
      if(x.mobile && String(x.mobile).replace(/\D/g,'').length < 10){
        mark('Please enter a valid guardian mobile number.',false);
        alert('Guardian mobile number should contain at least 10 digits.');
        return;
      }
      if(!x.mobile){
        const continueWithout=confirm('Guardian mobile is blank. Without it, direct call/WhatsApp reminders will not be available. Save anyway?');
        if(!continueWithout){mark('Please enter guardian mobile number.',false);return}
      }

      const duplicate=db.children.find(y=>y.id!==x.id && String(y.regId||'').toLowerCase()===x.regId.toLowerCase());
      if(duplicate){mark('Registration ID already exists.',false);alert('Registration ID already exists.');return}

      // IMPORTANT: save structured profile FIRST so photo storage can never block child registration.
      const oldChildren=[...db.children];
      if(id) db.children=db.children.map(y=>y.id===id?x:y); else db.children.push(x);
      try{ save(); }
      catch(e){ db.children=oldChildren; mark('Browser could not store this profile.',false); alert('Profile storage failed on this browser.'); return; }

      // Photo is secondary; if it fails, profile remains saved.
      if(selectedPhoto){
        try{
          const doc={id:uid(),childId:x.id,type:'Baby Profile Photo',date:isoToday(),name:selectedPhoto.name||'baby-photo.jpg',mime:selectedPhoto.type||'image/jpeg',size:selectedPhoto.size||0,blob:selectedPhoto,note:'Identity profile photo'};
          await putDoc(doc);
          x.photoDocId=doc.id;
          db.children=db.children.map(y=>y.id===x.id?x:y);
          save();
        }catch(photoErr){
          console.warn('Profile saved; photo save failed',photoErr);
          alert('Child profile is saved. Photo could not be stored; you can add it later.');
        }
      }

      mark(`Saved • ${x.name} • ${x.regId}`);
      alert(`Saved successfully: ${x.name} (${x.regId})`);
      $('#childEditor').innerHTML='';
      renderRegistryKpis();
      renderTodayPanel();
      await drawChildren('');
      $('#childrenList')?.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(err){
      console.error(err);
      mark('Unexpected save error.',false);
      alert('Unexpected error while saving. Please retry.');
    }
  };

  $('#cancelChild').onclick=()=>$('#childEditor').innerHTML='';
}
async function drawChildren(q=''){
  const statusFilter=$('#childStatusFilter')?.value||'';
  const taskFilter=$('#childTaskFilter')?.value||'';
  const paymentFilter=$('#childPaymentFilter')?.value||'';
  q=(q||'').toLowerCase();

  const num=s=>Number((String(s||'').match(/\d+/)||['999999'])[0]);
  const arr=normalizedChildren()
    .filter(c=>[c.name,c.parent,c.mobile,c.regId,c.address].join(' ').toLowerCase().includes(q))
    .filter(c=>!statusFilter||c.currentStatus===statusFilter)
    .filter(c=>!taskFilter||c.taskStatus===taskFilter)
    .filter(c=>!paymentFilter||paymentStatus(latestPayment(c.id))===paymentFilter)
    .filter(c=>!childAlpha||String(c.name||'').trim().toUpperCase().startsWith(childAlpha))
    .sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'})||num(a.regId)-num(b.regId));

  const rows=[];
  for(let idx=0;idx<arr.length;idx++){
    const c=arr[idx]; let p='';
    if(c.photoDocId){ try{const d=await docById(c.photoDocId);if(d?.blob)p=URL.createObjectURL(d.blob)}catch(e){} }

    rows.push(`<tr>
      <td><span class="seqno">${idx+1}</span></td>
      <td>${p?`<img src="${p}" class="avatar">`:`<div class="avatar avatar-placeholder mini">👶</div>`}</td>
      <td><span class="id-badge">${esc(c.regId||'-')}</span></td>
      <td><div class="child-name">${esc(c.name)}</div><div class="muted child-sub">${age(c.dob)} • ${esc(c.sex||'-')}</div></td>
      <td class="guardian-contact-cell">
        <div class="guardian-name"><span>Guardian</span><b>${esc(c.parent||'Not entered')}</b></div>
        <div class="mobile-display"><span>Mobile</span><b>${esc(c.mobile||'Not entered')}</b></div>
        ${c.address?`<div class="short-address">${esc(c.address)}</div>`:''}
        <div class="contact-inline-actions">
          ${c.mobile?`<a class="contact-call-btn" href="${callLink(c.mobile)}">📞 Call</a><a class="contact-wa-btn" target="_blank" href="${waLink(c.mobile,c.name)}">WhatsApp</a>`:'<button class="contact-missing-btn" onclick="app.editChild(\'${c.id}\')">+ Add Mobile</button>'}
        </div>
      </td>
      <td><span class="status-badge2 ${statusClass(c.currentStatus)}">${esc(c.currentStatus)}</span><br><span class="task-badge ${taskClass(c.taskStatus)}">${esc(c.taskStatus)}</span></td>
      <td>${(()=>{const p=latestPayment(c.id),s=paymentStatus(p),bal=paymentBalance(p);return `<span class="payment-badge ${paymentStatusClass(s)}">${esc(s)}</span>${p?`<div class="payment-mini">${money(p.amount)} billed • ${esc(p.method||'-')}<br>${money(p.paid)} paid${bal?` • <b>${money(bal)} due</b>`:''}</div>`:'<div class="payment-mini muted">No payment entry</div>'}`})()}</td>
      <td>${c.appointmentDate?`<b>${fmt(c.appointmentDate)}</b>`:'-'}<div class="muted">${c.reminderDate?'Reminder '+fmt(c.reminderDate):''}</div></td>
      <td><div class="row-actions">
        <button onclick="app.openChildDetails('${c.id}')">Open</button>
        <button class="ghost" onclick="app.editChild('${c.id}')">Edit</button>
        <button class="ghost" onclick="app.startClinical('${c.id}')">Clinical</button>
        ${c.mobile?`<a class="button-anchor" href="${callLink(c.mobile)}">Call</a>`:''}
        ${c.mobile?`<a class="button-anchor" target="_blank" href="${waLink(c.mobile,c.name)}">WhatsApp</a>`:''}
      </div></td>
    </tr>`);
  }

  $('#childrenList').innerHTML=`<div class="registry-summary"><b>${arr.length}</b> shown • <b>${db.children.length}</b> total saved</div>
  <table class="children-table operations-table">
    <thead><tr><th>No.</th><th>Photo</th><th>ID</th><th>Child</th><th>Guardian / Contact</th><th>Status</th><th>Payment</th><th>Appointment</th><th>Actions</th></tr></thead>
    <tbody>${rows.join('')||'<tr><td colspan="9" class="muted">No saved child matches this filter.</td></tr>'}</tbody>
  </table>`;
}
async function openChildDetails(id){
  const c=normalizeChild(child(id));
  if(!c)return;
  let p='';
  if(c.photoDocId){try{const d=await docById(c.photoDocId);if(d?.blob)p=URL.createObjectURL(d.blob)}catch(e){}}
  const visits=fups(id);
  $('#childDetailsPanel').innerHTML=`<div class="card child-detail-card">
    <div class="cardhead">
      <div class="profile-row">${p?`<img src="${p}" class="avatar-xl">`:`<div class="avatar-xl avatar-placeholder">👶</div>`}
        <div><span class="eyebrow">SAVED CHILD PROFILE</span><h3>${esc(c.name)}</h3><p class="muted">${esc(c.regId||'-')} • ${age(c.dob)} • ${esc(c.sex||'-')}</p></div>
      </div>
      <button class="ghost" onclick="document.getElementById('childDetailsPanel').innerHTML=''">Close</button>
    </div>
    <div class="detail-grid">
      <div><span>Guardian</span><b>${esc(c.parent||'-')}</b></div>
      <div><span>Mobile / WhatsApp</span>${c.mobile?`<b class="detail-mobile">${esc(c.mobile)}</b><div class="contact-inline-actions"><a class="contact-call-btn" href="${callLink(c.mobile)}">📞 Call</a><a class="contact-wa-btn" target="_blank" href="${waLink(c.mobile,c.name)}">WhatsApp</a></div>`:'<b>Not entered</b>'}</div>
      <div><span>Address</span><b>${esc(c.address||'-')}</b></div>
      <div><span>Current Status</span><b class="status-badge2 ${statusClass(c.currentStatus)}">${esc(c.currentStatus)}</b></div>
      <div><span>Checklist</span><b class="task-badge ${taskClass(c.taskStatus)}">${esc(c.taskStatus)}</b></div>
      <div><span>Appointment</span><b>${c.appointmentDate?fmt(c.appointmentDate):'-'}</b></div>
      <div><span>Reminder</span><b>${c.reminderDate?fmt(c.reminderDate):'-'}</b></div>
      <div><span>Home Medicine</span><b>${esc(c.homeMedicineQty||'-')}</b></div>
      <div><span>Payment Status</span>${(()=>{const p=latestPayment(c.id),s=paymentStatus(p);return `<b class="payment-badge ${paymentStatusClass(s)}">${esc(s)}</b>${p?`<small>${money(p.paid)} paid • ${money(paymentBalance(p))} due</small>`:''}`})()}</div>
      <div><span>Total Follow-ups</span><b>${visits.length}</b></div>
      <div><span>Next Action</span><b>${esc(c.nextAction||'-')}</b></div>
      <div><span>Status Note</span><b>${esc(c.statusNote||'-')}</b></div>
      <div><span>Last Contact</span><b>${c.lastContactDate?fmt(c.lastContactDate):'-'}</b></div>
    </div>
    <div class="actionrow">
      <button onclick="app.editChild('${c.id}')">Edit Profile</button>
      <button class="payment-action-btn" onclick="app.recordPayment('${c.id}')">₹ Record Payment</button>
      <button class="ghost" onclick="app.startClinical('${c.id}')">Clinical Entry</button>
      <button class="ghost" onclick="app.quickReport('${c.id}')">Report / Print</button>
      <button class="ghost" onclick="app.shareChildProfile('${c.id}')">Share</button>
      ${c.mobile?`<a class="button-anchor" href="${callLink(c.mobile)}">Call Guardian</a><a class="button-anchor" target="_blank" href="${waLink(c.mobile,c.name)}">WhatsApp Reminder</a>`:''}
      <button class="danger-btn" onclick="app.deleteChild('${c.id}')">Delete</button>
    </div>
    <div class="section payment-history-section"><h4>Swarnaprashan Payment Ledger</h4><div id="childPaymentHistory">${paymentHistoryHtml(c.id)}</div></div>
  </div>`;
  $('#childDetailsPanel').scrollIntoView({behavior:'smooth',block:'start'});
}

function paymentHistoryHtml(childId){
  const ps=childPayments(childId).slice().reverse();
  if(!ps.length)return '<p class="muted">No payment transaction recorded yet.</p>';
  return `<div class="payment-history-list">${ps.map(p=>`<div class="payment-history-row">
    <div><b>${fmt(p.date)}</b><span>${esc(p.purpose||'Swarnaprashan')}</span></div>
    <div><span class="payment-badge ${paymentStatusClass(paymentStatus(p))}">${esc(paymentStatus(p))}</span><small>${esc(p.method||'-')}</small></div>
    <div><span>Billed</span><b>${money(p.amount)}</b><small>${p.quantity?`${p.quantity} × ${money(p.rate||currentSwarnaprashanRate())}`:''}</small></div>
    <div><span>Paid</span><b>${money(p.paid)}</b></div>
    <div><span>Due</span><b class="${paymentBalance(p)>0?'due-money':''}">${money(paymentBalance(p))}</b></div>
    <div><small><b>${esc(paymentStaff(p))}</b><br>${esc(p.reference||p.note||'')}</small></div>
  </div>`).join('')}</div>`;
}
function recordPayment(childId){
  const c=child(childId);if(!c)return;
  const last=latestPayment(childId);
  $('#childDetailsPanel').insertAdjacentHTML('afterbegin',`<div id="paymentEditorCard" class="card payment-editor-card">
    <div class="cardhead"><div><span class="eyebrow">PAYMENT / COLLECTION</span><h3>Record Swarnaprashan Payment — ${esc(c.name)}</h3><p class="muted">${esc(c.regId||'-')} • ${age(c.dob)}</p></div><button class="ghost" onclick="document.getElementById('paymentEditorCard')?.remove()">Close</button></div>
    <div class="formgrid payment-formgrid">
      <label>Date<input id="pay_date" type="date" value="${isoToday()}"></label>
      <label>Purpose<select id="pay_purpose">
        <option>Clinic Swarnaprashan Dose</option>
        <option>Home Use Medicine / Doses</option>
        <option>Registration / Package</option>
        <option>Previous Due Collection</option>
        <option>Other</option>
      </select></label>
      <label>Quantity / Doses<input id="pay_qty" type="number" min="1" step="1" value="1"></label>
      <label>Rate per Dose ₹<input id="pay_rate" type="number" min="0" step="1" value="${currentSwarnaprashanRate()}"></label>
      <label>Payment Status<select id="pay_status">${PAYMENT_STATUSES.map(s=>`<option>${s}</option>`).join('')}</select></label>
      <label>Payment Method<select id="pay_method">${PAYMENT_METHODS.map(s=>`<option>${s}</option>`).join('')}</select></label>
      <label>Sale / Dose Handled By<select id="pay_soldBy">${staffOptions(currentSession()?.name||'Dr Rajesh Sao')}</select></label>
      <label>Total Amount ₹<input id="pay_amount" type="number" min="0" step="1" value="${currentSwarnaprashanRate()}"></label>
      <label>Amount Received ₹<input id="pay_paid" type="number" min="0" step="1" value=""></label>
      <label>Balance Due ₹<input id="pay_due" type="number" readonly value="0"></label>
      <label>UPI / Receipt / Reference<input id="pay_ref" placeholder="Optional transaction / receipt reference"></label>
      <label class="wide">Payment Note<input id="pay_note" placeholder="e.g. balance next Pushya, paid at reception, home-use prepaid"></label>
    </div>
    <div class="payment-quick-status">
      <button class="ghost" type="button" onclick="app.setPaymentPreset('Paid')">Paid in Full</button>
      <button class="ghost" type="button" onclick="app.setPaymentPreset('Pending')">Pending</button>
      <button class="ghost" type="button" onclick="app.setPaymentPreset('Credit / Udhari')">Credit / Udhari</button>
      <button class="ghost" type="button" onclick="app.setPaymentPreset('Home Use - Already Paid')">Home Use Already Paid</button>
      <button class="ghost" type="button" onclick="app.setPaymentPreset('Complimentary / Free')">Complimentary / Free</button>
    </div>
    <div class="actionrow"><button id="savePaymentBtn">Save Payment Transaction</button></div>
  </div>`);
  const recalcBill=()=>{
    const purpose=$('#pay_purpose').value;
    const qty=Math.max(1,Number($('#pay_qty').value)||1);
    const rate=Math.max(0,Number($('#pay_rate').value)||0);
    if(['Clinic Swarnaprashan Dose','Home Use Medicine / Doses'].includes(purpose)){
      $('#pay_amount').value=(qty*rate).toFixed(0);
    }
    const a=Number($('#pay_amount').value)||0,p=Number($('#pay_paid').value)||0;
    $('#pay_due').value=Math.max(0,a-p);
  };
  $('#pay_qty').oninput=recalcBill;$('#pay_rate').oninput=recalcBill;$('#pay_purpose').onchange=recalcBill;
  $('#pay_amount').oninput=recalcBill;$('#pay_paid').oninput=recalcBill;
  recalcBill();
  $('#pay_status').onchange=()=>{const s=$('#pay_status').value;if(['Paid','Home Use - Already Paid'].includes(s)){const a=Number($('#pay_amount').value)||0;$('#pay_paid').value=a}else if(['Pending','Credit / Udhari','Pay Later'].includes(s)){$('#pay_paid').value=0}else if(['Complimentary / Free','Waived / No Charge'].includes(s)){if(!$('#pay_amount').value)$('#pay_amount').value=0;$('#pay_paid').value=0}calc()};
  $('#savePaymentBtn').onclick=()=>savePaymentTransaction(childId);
  $('#paymentEditorCard').scrollIntoView({behavior:'smooth',block:'start'});
}
function setPaymentPreset(status){
  const s=$('#pay_status');if(!s)return;s.value=status;
  const method=$('#pay_method');
  if(status==='Credit / Udhari')method.value='Credit / Udhari';
  if(status==='Pay Later')method.value='Pay Later';
  if(status==='Home Use - Already Paid'){method.value='Home Use Prepaid';$('#pay_purpose').value='Home Use Medicine / Doses'}
  if(status==='Complimentary / Free')method.value='Complimentary / Free';
  s.dispatchEvent(new Event('change'));
}
function savePaymentTransaction(childId){
  const amount=Number($('#pay_amount').value)||0, paid=Number($('#pay_paid').value)||0;
  let status=$('#pay_status').value;
  if(status==='Paid' && amount>0 && paid<amount)status=paid>0?'Part Paid':'Pending';
  if(status==='Part Paid' && paid>=amount && amount>0)status='Paid';
  const p={
    id:uid(),childId,date:$('#pay_date').value||isoToday(),purpose:$('#pay_purpose').value,
    status,method:$('#pay_method').value,soldBy:$('#pay_soldBy')?.value||currentSession()?.name||'Unassigned',amount,paid,
    quantity:Number($('#pay_qty')?.value)||1,rate:Number($('#pay_rate')?.value)||currentSwarnaprashanRate(),
    reference:$('#pay_ref').value||'',note:$('#pay_note').value||'',createdAt:new Date().toISOString(),
    recordedBy:currentSession()?.name||currentSession()?.loginId||'Clinic User'
  };
  db.payments=db.payments||[];db.payments.push(p);save();
  alert(`Payment saved • ${money(paid)} received • ${money(paymentBalance(p))} due`);
  $('#paymentEditorCard')?.remove();
  openChildDetails(childId);
}

async function shareChildProfile(id){
  const c=normalizeChild(child(id));if(!c)return;
  const text=`Mahamaya Clinic • Swarnaprashan Child Profile
Child: ${c.name}
ID: ${c.regId||'-'}
Age: ${age(c.dob)} • ${c.sex||'-'}
Guardian: ${c.parent||'-'}
Mobile: ${c.mobile||'-'}
Address: ${c.address||'-'}
Status: ${c.currentStatus}
Checklist: ${c.taskStatus}
Appointment: ${c.appointmentDate?fmt(c.appointmentDate):'-'}
Reminder: ${c.reminderDate?fmt(c.reminderDate):'-'}
Next Action: ${c.nextAction||'-'}`;
  if(navigator.share) await navigator.share({title:'Swarnaprashan Child Profile',text});
  else {await navigator.clipboard.writeText(text);alert('Child profile copied to clipboard.')}
}
async function deleteChild(id){
  const c=child(id);if(!c)return;
  if(!confirm(`Delete ${c.name}? This removes the child profile and linked structured follow-up entries.`))return;
  db.children=db.children.filter(x=>x.id!==id);
  db.followups=db.followups.filter(x=>x.childId!==id);
  db.cases=db.cases.filter(x=>x.childId!==id);
  db.vaccines=db.vaccines.filter(x=>x.childId!==id);
  db.payments=(db.payments||[]).filter(x=>x.childId!==id);
  save();
  $('#childDetailsPanel').innerHTML='';
  renderRegistryKpis();renderTodayPanel();drawChildren('');
}
function openChildrenStatus(label){
  showView('children');
  setTimeout(()=>{
    const map={
      'Active':'Active',
      'Ready':'Ready for Swarnaprashan',
      'Dose Taken Today':"Today's Dose Taken",
      'Home Use':'Home Use Medicine',
      'Health Hold':'Temporarily Hold - Health Issue',
      'Stopped':'Swarnaprashan Stopped'
    };
    if(map[label]) $('#childStatusFilter').value=map[label];
    drawChildren('');
  },50);
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
function drawAnalytics(id){
 const fs=fups(id);if(!fs.length){$('#analyticSummary').innerHTML='<p class="muted">No follow-up data.</p>';if($('#growthInterpretation'))$('#growthInterpretation').innerHTML='';return}
 const a=fs[0],b=fs.at(-1);
 let months=0;if(a.date&&b.date)months=Math.max(0,(new Date(b.date)-new Date(a.date))/(1000*60*60*24*30.4375));
 const hv=(months&&a.height&&b.height)?((+b.height-+a.height)/months).toFixed(2):'';
 const wv=(months&&a.weight&&b.weight)?((+b.weight-+a.weight)/months).toFixed(2):'';
 $('#analyticSummary').innerHTML=`<div class="metric"><span>Visits</span><b>${fs.length}</b></div><div class="metric"><span>Latest Height</span><b>${b.height||'-'} cm</b></div><div class="metric"><span>Latest Weight</span><b>${b.weight||'-'} kg</b></div><div class="metric"><span>Latest BMI</span><b>${b.bmi||'-'}</b></div><div class="metric"><span>Height Velocity</span><b>${hv?hv+' cm/month':'-'}</b></div><div class="metric"><span>Weight Velocity</span><b>${wv?wv+' kg/month':'-'}</b></div>`;
 if($('#growthInterpretation'))$('#growthInterpretation').innerHTML='<b>Clinical interpretation:</b> Plot serial values against age- and sex-specific pediatric standards. WHO Child Growth Standards apply to 0–5 years and WHO Growth Reference 2007 to 5–19 years. Do not interpret a child using adult BMI cut-offs; trend and z-score/percentile trajectory matter.';
 drawLine($('#lineChart'),fs);drawBars($('#barChart'),a,b);drawPie($('#pieChart'),b);
 $('#baselineLatest').innerHTML=`<table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(a.scores?.[k])}</td><td>${scoreLabel(b.scores?.[k])}</td><td>${trend(a.scores?.[k],b.scores?.[k])}</td></tr>`).join('')}</tbody></table>`;
}
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
let rxPickedFiles=[];
function renderReports(){
  options($('#reportChild'));
  $('#generateReport').onclick=generateSelectedReport;
  $('#printReport').onclick=printParentReport;
  $('#shareReport').onclick=shareReport;
  $('#waReport').onclick=waReport;
  rxPickedFiles=[];
  $('#rxDirectCamera').onclick=()=>startDirectCamera('Manual Prescription / Card Photo',async(file)=>{rxPickedFiles.push(file);renderRxPicked()});
  $('#rxFileInput').onchange=e=>{rxPickedFiles.push(...e.target.files);renderRxPicked()};
  $('#saveRxAttachments').onclick=saveRxAttachments;
  $('#reportChild').onchange=drawRxAttachments;
  drawRxAttachments();
}
function renderRxPicked(){
  $('#rxPickedFiles').innerHTML=rxPickedFiles.map(f=>`<span class="file-chip">${esc(f.name)} • ${(f.size/1024).toFixed(0)} KB</span>`).join('');
}
async function saveRxAttachments(){
  const childId=$('#reportChild').value;
  if(!childId){alert('Please select a child first.');return}
  if(!rxPickedFiles.length){alert('Capture or select at least one prescription file.');return}
  const note=$('#rxAttachNote').value;
  for(const f of rxPickedFiles){
    await putDoc({id:uid(),childId,type:'Manual / Previous Prescription',date:new Date().toISOString().slice(0,10),note,name:f.name,mime:f.type,size:f.size,blob:f});
  }
  rxPickedFiles=[];renderRxPicked();$('#rxFileInput').value='';$('#rxAttachNote').value='';
  alert('Prescription attachment(s) saved.');
  drawRxAttachments();
}
async function drawRxAttachments(){
  const childId=$('#reportChild')?.value||'';
  if(!$('#rxSavedAttachments'))return;
  const docs=(await getDocs()).filter(d=>(!childId||d.childId===childId)&&d.type==='Manual / Previous Prescription').sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  $('#rxSavedAttachments').innerHTML=docs.map(d=>`<div class="docitem"><b>${esc(d.name)}</b><div class="docmeta">${fmt(d.date)} ${d.note?'• '+esc(d.note):''}</div><div class="actionrow"><button class="ghost" onclick="app.openDoc('${d.id}')">Open</button><button class="ghost" onclick="app.downloadDoc('${d.id}')">Download</button></div></div>`).join('')||'<p class="muted">No manual prescription attachment saved for the selected child.</p>';
}
async function generateSelectedReport(){
 const id=$('#reportChild').value;if(!id){alert('Select child');return}
 const c=child(id),fs=fups(id),latest=fs.at(-1),cases=db.cases.filter(x=>x.childId===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))),cs=cases.at(-1),docs=(await getDocs()).filter(x=>x.childId===id),first=fs[0];
 let photo='';if(c.photoDocId){const pd=await docById(c.photoDocId);if(pd)photo=URL.createObjectURL(pd.blob)}
 const functional=cs?.examScores?Object.entries(cs.examScores).filter(([k,v])=>!k.startsWith('A:')&&!k.startsWith('D:')):[];
 const ashta=cs?.examScores?Object.entries(cs.examScores).filter(([k,v])=>k.startsWith('A:')):[];
 const dasha=cs?.examScores?Object.entries(cs.examScores).filter(([k,v])=>k.startsWith('D:')):[];
 const table=(rows)=>rows.length?`<table><tbody>${rows.map(([k,v])=>`<tr><td>${esc(k.replace(/^[AD]:/,''))}</td><td><b>${esc(String(v))}</b></td></tr>`).join('')}</tbody></table>`:'<p class="muted">Not recorded.</p>';
 $('#reportPaper').innerHTML=`${letterhead(fmt(latest?.date||cs?.date), `${photo?`<img src="${photo}" class="avatar-lg">`:''}<div class="patient-head-id">${esc(c.regId||'')}<br>${fmt(latest?.date||cs?.date)}</div>`)}
 <div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name)}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Follow-ups</span><b>${fs.length}</b></div><div class="metric"><span>Clinical Entries</span><b>${cases.length}</b></div></div><p><b>Allergies:</b> ${esc(c.allergies||cs?.allergy||'-')} &nbsp; <b>School/Class:</b> ${esc(c.school||'-')}</p><p><b>Relevant history:</b> ${esc(cs?.history||c.history||'-')}</p></div>
 ${latest?`<div class="reportsection"><h3>Latest Growth & Vitals</h3><p>Height ${latest.height||'-'} cm • Weight ${latest.weight||'-'} kg • BMI ${latest.bmi||'-'} • Pulse ${latest.pulse||'-'} • RR ${latest.rr||'-'} • SpO₂ ${latest.spo2||'-'}% • BP ${esc(latest.bp||'-')}</p><p><b>Latest dose:</b> ${esc(latest.dose||'-')} &nbsp; <b>Health issue:</b> ${esc(latest.issue||'None recorded')}</p></div>`:''}
 ${cs?`<div class="reportsection"><h3>Complete Latest Clinical Entry</h3><p><b>Date / Visit:</b> ${fmt(cs.date)} • ${esc(cs.type||'-')}</p><p><b>Present complaint:</b> ${esc(cs.complaint||'-')}</p><p><b>Current medicines:</b> ${esc(cs.currentMeds||'-')}</p><p><b>General appearance:</b> ${esc(cs.ga||'-')}</p><p><b>Examination notes:</b> ${esc(cs.examNotes||'-')}</p><p><b>Investigation summary:</b> ${esc(cs.invest||'-')}</p><p><b>Clinical impression:</b> ${esc(cs.impression||'-')}</p><p><b>Red flags / safety:</b> ${esc(cs.redflags||'None recorded')}</p></div>
 <div class="reportsection"><h3>Functional Assessment</h3>${table(functional)}</div>
 <div class="reportsection"><h3>Ashtavidha Pariksha</h3>${table(ashta)}</div>
 <div class="reportsection"><h3>Dashavidha Atura Pariksha</h3>${table(dasha)}</div>
 <div class="reportsection"><h3>Treatment & Prescription</h3><p><b>Swarnaprashan:</b> ${esc(cs.dose||'-')} • ${esc(cs.batch||'-')}</p><p><b>Other medicines:</b> ${esc(cs.medicines||'-')}</p><p><b>Pathya:</b> ${esc(cs.pathya||'-')}</p><p><b>Apathya:</b> ${esc(cs.apathya||'-')}</p><p><b>Lifestyle:</b> ${esc(cs.lifestyle||'-')}</p><p><b>Cognitive/School advice:</b> ${esc(cs.cognitive||'-')}</p><p><b>Safety/Referral advice:</b> ${esc(cs.safety||'-')}</p><p><b>Special instructions:</b> ${esc(cs.rxInstructions||'-')}</p><p><b>Parent message:</b> ${esc(cs.parentMsg||'-')}</p><p><b>Next follow-up:</b> ${fmt(cs.next)}</p></div>`:''}
 ${first&&latest?`<div class="reportsection"><h3>Baseline vs Latest Functional Progress</h3><table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(first.scores?.[k])}</td><td>${scoreLabel(latest.scores?.[k])}</td><td>${trend(first.scores?.[k],latest.scores?.[k])}</td></tr>`).join('')}</tbody></table></div>`:''}
 ${$('#incDocs').checked?`<div class="reportsection"><h3>Documents</h3><ul>${docs.map(d=>`<li>${esc(d.type)} — ${esc(d.name)} — ${fmt(d.date)}</li>`).join('')||'<li>No attachment</li>'}</ul></div>`:''}
 <div class="signature"><div class="signature-grid"><div><b>${esc(db.settings.doctor)}</b><br><span>${esc(db.settings.designation)}</span></div><div><b>${esc(db.settings.doctor2)}</b><br><span>${esc(db.settings.designation2)}</span></div></div><div class="signature-address">${esc(db.settings.address)} ${db.settings.phone?'• '+esc(db.settings.phone):''}<br>${esc(db.settings.footer)}</div></div>`;
}
async function shareReport(){const t=$('#reportPaper').innerText.trim();if(!t){alert('Generate report first');return}if(navigator.share)await navigator.share({title:'Swarnaprashan Report',text:t});else{await navigator.clipboard.writeText(t);alert('Copied')}}
function waReport(){const t=$('#reportPaper').innerText.trim();if(!t){alert('Generate report first');return}window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}
function quickReport(id){showView('reports');$('#reportChild').value=id;generateSelectedReport()}

// Swarnaprashan Knowledge Centre
function knowledgeHtml(lang='en'){
 const g=SWARNA_GUIDE[lang]||SWARNA_GUIDE.en;
 const upcoming=PUSHYA_DATES.filter(x=>new Date(x.date+'T00:00:00')>=new Date(new Date().toISOString().slice(0,10)+'T00:00:00')).slice(0,13);
 return `${letterhead(new Date().toLocaleDateString('en-IN'),'<div class="patient-head-id">Parent Education</div>')}
 <div class="reportsection"><h2>${esc(g.title)}</h2><p>${esc(g.intro)}</p></div>
 ${g.sections.map(([h,p])=>`<div class="reportsection"><h3>${esc(h)}</h3><p>${esc(p)}</p></div>`).join('')}
 <div class="reportsection"><h3>${lang==='hi'?'आगामी पुष्य नक्षत्र reference dates':'Upcoming Pushya Nakshatra reference dates'}</h3><div class="pushya-year">${upcoming.map(x=>`<span class="pushya-chip">${esc(x.label)}</span>`).join('')}</div><p class="tiny">Exact local Raipur timings should be verified before clinic publication.</p></div>
 <div class="reportsection evidence-box"><h3>${lang==='hi'?'साक्ष्य एवं सुरक्षा':'Evidence & Safety'}</h3><p>${lang==='hi'?'यह जानकारी parent education के लिए है और individual prescription का विकल्प नहीं है। Vaccination और आवश्यक pediatric care जारी रखें।':'This information is for parent education and is not a substitute for an individual prescription. Continue vaccination and indicated pediatric care.'}</p></div>`;
}
function renderKnowledge(){
 const lang=$('#knowledgeLang');const paper=$('#knowledgePaper');
 const draw=()=>paper.innerHTML=knowledgeHtml(lang.value);
 lang.onchange=draw;draw();
 $('#knowledgeShare').onclick=async()=>{const t=paper.innerText.trim();if(navigator.share)await navigator.share({title:'Swarnaprashan Parent Guide',text:t});else{await navigator.clipboard.writeText(t);alert('Guide copied to clipboard')}};
 $('#knowledgeWA').onclick=()=>{const t=paper.innerText.trim();window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')};
 $('#knowledgePrint').onclick=()=>printHtmlContent(paper.innerHTML,'Mahamaya Clinic - Swarnaprashan Parent Guide');
}

// Education
function renderEducation(){options($('#eduChild'));$('#buildPlan').onclick=buildPlan}
function buildPlan(){const id=$('#eduChild').value;if(!id){alert('Select child');return}const c=child(id),focus=$('#eduFocus').value,map={'General Swarnaprashan Support':['Balanced age-appropriate meals','Regular sleep-wake timing','Daily outdoor play and physical activity','Adequate hydration','Limit excessive packaged foods and late-night screen exposure'],'Low Appetite':['Small frequent nutritious meals','Avoid grazing/snacks just before meals','Track weight and growth trend','Clinical review if persistent appetite loss or weight loss'],'Constipation':['Adequate fluids','Fiber-rich fruits/vegetables','Regular toilet routine','Daily physical activity','Medical review for pain, blood, vomiting or persistent symptoms'],'Poor Sleep':['Consistent sleep routine','Reduce evening screen exposure','Quiet bedtime routine','Avoid heavy late meals','Assess persistent snoring/breathing difficulty'],'Frequent Illness':['Hand hygiene','Adequate sleep','Balanced diet','Vaccination review','Clinical review for recurrent severe infections or poor growth'],'Learning / Memory Support':['Adequate sleep','Structured study-play balance','Reading/recall exercises','Healthy nutrition/hydration','School or developmental assessment if persistent difficulty'],'Underweight / Poor Growth':['Track serial height/weight','Energy and protein adequacy','Review feeding pattern','Assess recurrent illness/GI symptoms','Pediatric/nutrition review when clinically indicated']};$('#planPaper').innerHTML=`<div class="reporthead"><div><h2>${esc(db.settings.clinicName)}</h2><b>Parent Diet • Pathya • Lifestyle Plan</b></div><div>${esc(c.name)}</div></div><div class="reportsection"><h3>${esc(focus)}</h3><ul>${map[focus].map(x=>`<li>${x}</li>`).join('')}</ul></div><div class="reportsection"><h3>Pathya</h3><p>Fresh, simple, seasonal, well-tolerated food; regular routine; adequate hydration, sleep and play.</p><h3>Apathya</h3><p>Excess junk food, irregular meals, chronic sleep deprivation, excessive screen exposure and unnecessary self-medication.</p></div><div class="signature">${esc(db.settings.doctor)}</div>`}


// Inventory & stock
function renderInventory(){
  drawInventoryDashboard();
  $('#newPurchaseBtn').onclick=()=>openInventoryEditor('Purchase');
  $('#newUsageBtn').onclick=()=>openInventoryEditor('Clinic Use');
  $('#inventoryFilter').onchange=drawInventoryLedger;
}
function drawInventoryDashboard(){
  const k=$('#inventoryKpis'),stock=$('#stockSummary'),sum=$('#inventorySummary');
  if(k)k.innerHTML=[
    ['Tablet Stock',Math.max(0,inventoryStock('Swarnabrahma Yog Tablet'))+' tabs'],
    ['Ghee Stock',Math.max(0,inventoryStock('Cow Ghee'))+' g/ml'],
    ['Honey Stock',Math.max(0,inventoryStock('Honey'))+' g/ml'],
    ['Spoons',Math.max(0,inventoryStock('Feeding Spoon'))+' pcs'],
    ['Purchase Value',money(inventoryPurchaseValue())],
    ['Free/Family Tablet Use',inventoryUsageCount('Family / Relative Free','Swarnabrahma Yog Tablet')+' tabs']
  ].map(x=>`<div class="inventory-kpi"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  if(stock)stock.innerHTML=INVENTORY_ITEMS.slice(0,4).map(i=>`<div class="stock-row"><b>${i}</b><span>${Math.max(0,inventoryStock(i)).toLocaleString('en-IN')} ${inventoryUnitLabel(i)}</span></div>`).join('');
  if(sum){
    const acts=['Purchase','Clinic Use','Home Use / Sale','Self Use','Family / Relative Free','Wastage / Damage'];
    sum.innerHTML=acts.map(a=>`<div class="stock-row"><b>${a}</b><span>${inventoryEntries().filter(e=>e.action===a).length} entries</span></div>`).join('');
  }
  drawInventoryLedger();
}
function inventoryUnitOptions(item){
  if(item==='Swarnabrahma Yog Tablet')return ['Tablet','Strip (30 tablets)','Box (150 tablets)'];
  if(['Cow Ghee','Honey'].includes(item))return ['g','ml','kg','L','Pack'];
  if(item==='Feeding Spoon')return ['Piece','Pack'];
  return ['Unit','Pack'];
}
function openInventoryEditor(action='Purchase'){
  const el=$('#inventoryEditor');if(!el)return;
  el.innerHTML=`<div class="card inventory-editor-card"><div class="cardhead"><div><span class="eyebrow">STOCK TRANSACTION</span><h3>${esc(action)}</h3></div><button class="ghost" onclick="document.getElementById('inventoryEditor').innerHTML=''">Close</button></div>
  <div class="formgrid inventory-formgrid">
    <label>Date<input id="inv_date" type="date" value="${isoToday()}"></label>
    <label>Item<select id="inv_item">${INVENTORY_ITEMS.map(i=>`<option>${i}</option>`).join('')}</select></label>
    <label>Action<select id="inv_action">${INVENTORY_ACTIONS.map(a=>`<option ${a===action?'selected':''}>${a}</option>`).join('')}</select></label>
    <label>Quantity<input id="inv_qty" type="number" min="0" step="0.01" value="1"></label>
    <label>Unit<select id="inv_unit"></select></label>
    <label>Pack / Brand / Batch<input id="inv_batch" placeholder="Brand, batch, pack size"></label>
    <label>MRP per strip/pack ₹<input id="inv_mrp" type="number" min="0" step="0.01"></label>
    <label>Purchase price per strip/pack ₹<input id="inv_purchasePrice" type="number" min="0" step="0.01"></label>
    <label>Total Purchase Cost ₹<input id="inv_totalCost" type="number" min="0" step="0.01"></label>
    <label>Purchased From / Vendor<input id="inv_vendor" placeholder="Supplier / pharmacy / company"></label>
    <label>Paid By<select id="inv_paidBy"><option>Cash</option><option>UPI</option><option>Card</option><option>Bank Transfer</option><option>Credit / Udhari</option><option>Other</option></select></label>
    <label>Handled By<select id="inv_handledBy">${staffOptions(currentSession()?.name||'Dr Rajesh Sao')}</select></label>
    <label class="wide">Purpose / Recipient / Note<input id="inv_note" placeholder="e.g. clinic use, Dr Rajesh self use, family free, home-use sale"></label>
  </div>
  <div class="inventory-pack-hint" id="inv_hint"></div>
  <div class="actionrow"><button id="saveInventoryBtn">Save Stock Transaction</button></div></div>`;
  const syncUnits=()=>{const item=$('#inv_item').value;$('#inv_unit').innerHTML=inventoryUnitOptions(item).map(u=>`<option>${u}</option>`).join('');$('#inv_hint').textContent=item==='Swarnabrahma Yog Tablet'?'1 strip = 30 tablets • 1 box = 5 strips = 150 tablets':(['Cow Ghee','Honey'].includes(item)?'Record quantity as g/ml, kg/L or pack size; mention exact pack size in Brand/Batch field.':'Record actual purchase/use quantity.')};
  $('#inv_item').onchange=syncUnits;syncUnits();
  $('#saveInventoryBtn').onclick=saveInventoryEntry;
  el.scrollIntoView({behavior:'smooth',block:'start'});
}
function saveInventoryEntry(){
  const e={
    id:uid(),date:$('#inv_date').value||isoToday(),item:$('#inv_item').value,action:$('#inv_action').value,
    qty:Number($('#inv_qty').value)||0,unit:$('#inv_unit').value,batch:$('#inv_batch').value||'',
    mrp:Number($('#inv_mrp').value)||0,purchasePrice:Number($('#inv_purchasePrice').value)||0,totalCost:Number($('#inv_totalCost').value)||0,
    vendor:$('#inv_vendor').value||'',paidBy:$('#inv_paidBy').value,handledBy:$('#inv_handledBy').value,
    note:$('#inv_note').value||'',createdAt:new Date().toISOString()
  };
  if(!e.qty){alert('Please enter quantity.');return}
  db.inventory=db.inventory||[];db.inventory.push(e);save();
  $('#inventoryEditor').innerHTML='';drawInventoryDashboard();
  alert('Inventory transaction saved.');
}
function drawInventoryLedger(){
  const el=$('#inventoryLedger');if(!el)return;
  const f=$('#inventoryFilter')?.value||'';
  const rows=inventoryEntries().filter(e=>!f||e.item===f).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
  el.innerHTML=rows.length?`<div class="inventory-ledger-table"><div class="inventory-ledger-head"><span>Date</span><span>Item</span><span>Action</span><span>Qty</span><span>MRP / Purchase</span><span>Vendor / Paid</span><span>Handled By</span><span>Note</span></div>
  ${rows.map(e=>`<div class="inventory-ledger-row"><span>${fmt(e.date)}</span><b>${esc(e.item)}</b><span class="inventory-action ${e.action==='Purchase'?'in':'out'}">${esc(e.action)}</span><span>${e.qty} ${esc(e.unit)}</span><span>${e.mrp?money(e.mrp):'-'} / ${e.purchasePrice?money(e.purchasePrice):'-'}${e.totalCost?`<small>Total ${money(e.totalCost)}</small>`:''}</span><span>${esc(e.vendor||'-')}<small>${esc(e.paidBy||'')}</small></span><span>${esc(e.handledBy||'-')}</span><span>${esc(e.note||'-')}</span></div>`).join('')}</div>`:'<p class="muted">No inventory entries yet.</p>';
}

// Backup / Settings
function renderBackup(){$('#backupBtn').onclick=()=>download('swarnaprashan-v7-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(db,null,2),'application/json');$('#restoreInput').onchange=async e=>{try{db=JSON.parse(await e.target.files[0].text());db.settings={...defaults,...(db.settings||{})};save();alert('Restored');showView('dashboard')}catch{alert('Invalid backup')}};$('#csvBtn').onclick=exportCSV}
function exportCSV(){const head=['Child','RegID','Date','Dose','Height','Weight','BMI','Pulse','RR','SpO2','BP','Issue',...scales],rows=db.followups.map(f=>{const c=child(f.childId)||{};return[c.name,c.regId,f.date,f.dose,f.height,f.weight,f.bmi,f.pulse,f.rr,f.spo2,f.bp,f.issue,...scales.map(k=>f.scores?.[k])]});download('swarnaprashan-followups.csv',[head,...rows].map(r=>r.map(x=>`"${String(x??'').replaceAll('"','""')}"`).join(',')).join('\n'),'text/csv')}
function download(n,t,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([t],{type}));a.download=n;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function renderSettings(){
  setTimeout(()=>{const e=$('#s_swarnaprashanRate');if(e)e.value=currentSwarnaprashanRate()},0);
 $('#settingsForm').innerHTML=`<div class="section"><h4>Prescription Letterhead</h4><div class="formgrid">
 <label>Clinic Name<input id="s_clinic" value="${esc(db.settings.clinicName)}"></label>
 <label>Swarnaprashan Rate / Dose ₹<input id="s_swarnaprashanRate" type="number" min="0" step="1" value="${currentSwarnaprashanRate()}"></label>
 <label>Sales / Clinic Staff Names<input id="s_salesStaff" value="${esc(salesStaffList().join(', '))}" placeholder="Comma separated names"></label>
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
 <div class="actionrow"><button id="saveSettings">Save Letterhead Settings</button></div>
 <div class="section"><h4>Multi Login User Management</h4><p class="muted">Create multiple users. Login is possible via login ID, mobile number or email. Recovery email is used by the local forgot-password workflow.</p>
 <input id="u_id" type="hidden">
 <div class="formgrid">
 <label>Full Name<input id="u_name" placeholder="User full name"></label>
 <label>Role<select id="u_role"><option>Super Admin</option><option>Doctor</option><option>Assistant</option><option>Reception</option></select></label>
 <label>Login ID<input id="u_login" placeholder="Unique login ID"></label>
 <label>Mobile<input id="u_mobile" placeholder="Optional unique mobile"></label>
 <label>Email<input id="u_email" placeholder="Optional login email"></label>
 <label>Password<input id="u_password" type="password" placeholder="Create password"></label>
 <label>Recovery Email<input id="u_recovery" placeholder="Gmail / recovery email"></label>
 </div>
 <div class="actionrow"><button id="saveUserBtn">Save User</button></div>
 <div id="usersList"></div></div>`;
 $('#saveSettings').onclick=()=>{
   db.settings={...db.settings,
      clinicName:$('#s_clinic').value,
      swarnaprashanRate:Number($('#s_swarnaprashanRate').value)||250,
      salesStaff:($('#s_salesStaff')?.value||'').split(',').map(x=>x.trim()).filter(Boolean),
      prescriptionTitle:$('#s_rxTitle').value,
      doctor:$('#s_doctor').value,
      designation:$('#s_desig').value,
      doctor2:$('#s_doctor2').value,
      designation2:$('#s_desig2').value,
      phone:$('#s_phone').value,
      address:$('#s_address').value,
      footer:$('#s_footer').value
    };
   save();alert('Letterhead and clinic settings saved');
 };
 $('#saveUserBtn').onclick=saveUserFromSettings;
 $('#usersList').innerHTML=usersHtml();
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


function normalizeCloudDb(incoming){
  incoming=incoming||{};
  return {
    children:(incoming.children||[]).map(normalizeChild),
    cases:incoming.cases||[],
    followups:incoming.followups||[],
    vaccines:incoming.vaccines||[],
    plans:incoming.plans||[],
    payments:incoming.payments||[],
    inventory:incoming.inventory||[],
    settings:{...defaults,...(incoming.settings||{})}
  };
}
function getCloudSnapshot(){
  return JSON.parse(JSON.stringify(db));
}
function applyCloudSnapshot(incoming){
  if(!incoming || typeof incoming!=='object') return false;
  suppressCloudEvent=true;
  try{
    db=normalizeCloudDb(incoming);
    localStorage.setItem(KEY,JSON.stringify(db));
    try{ showView(currentView||'dashboard'); }catch(e){ console.warn('Cloud render refresh',e); }
  } finally {
    setTimeout(()=>{suppressCloudEvent=false},0);
  }
  return true;
}

function init(){db.children=db.children.map(normalizeChild);save();openIDB().catch(()=>{});bindCameraModal();bindAuth();$$('#nav button').forEach(b=>b.onclick=()=>showView(b.dataset.view));$('#topNewChild').onclick=()=>{showView('children');editChild()};$('#topNewCase').onclick=()=>startClinical();$('#globalSearch').oninput=e=>{const q=e.target.value.trim();if(!q)return;showView('children');if($('#childSearch'))$('#childSearch').value=q;drawChildren(q)};ensureAuthUI()}
return{init,showView,startClinical,editChild,quickReport,openQuickUpload,openDoc,downloadDoc,removeDoc,generateCaseReport,shareCurrent,whatsappCurrent,printCaseReport,printParentReport,startDirectCamera,prefillUser,deleteUser,resetLoginAccess,openChildDetails,shareChildProfile,deleteChild,openChildrenStatus,openChildFromDashboard,openAlpha,recordPayment,setPaymentPreset,showView,openInventoryEditor,getCloudSnapshot,applyCloudSnapshot};
})();
window.app=app;
document.addEventListener('DOMContentLoaded',app.init);
