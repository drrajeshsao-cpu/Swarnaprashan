
const app=(()=>{
const KEY='mahamaya_swarnaprashan_v7';
const defaults={clinicName:'MAHAMAYA CLINIC',prescriptionTitle:'Swarnaprashan Digital Prescription',doctor:'Dr. Rajesh Sao, M.D. (Ayurveda)',designation:'Consultant Physician • Ayurveda',doctor2:'Dr. Ravi Chandrakar, B.A.M.S.',designation2:'Consultant Physician • Ayurveda',phone:'',address:'In front of India 1 ATM, Sheetla Chowk, Bhatagaon, Raipur',footer:'Clinical follow-up record and parent education. Seek urgent medical care for emergency symptoms.'};
let db=JSON.parse(localStorage.getItem(KEY)||'null')||{children:[],cases:[],followups:[],vaccines:[],plans:[],settings:defaults};
let currentView='dashboard';
let suppressCloudEvent=false;
db.settings={...defaults,...(db.settings||{})};db.children=db.children||[];db.cases=db.cases||[];db.followups=db.followups||[];db.vaccines=db.vaccines||[];
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
const titles={dashboard:['Dashboard','Premium longitudinal Swarnaprashan clinical tracking'],clinical:['Clinical Workspace','Guided Save & Next workflow from profile to prescription'],children:['Children','A–Z registry, ID search, child profile and clinical access'],followup:['Monthly Follow-up','Dose, growth, vitals, health, development and Ayurveda tracking'],analytics:['Growth & Analytics','Longitudinal growth velocity, functional outcomes and clinical trends'],vaccination:['Vaccination & Schedule','Vaccination record and upcoming session tracking'],documents:['Documents & Camera','Camera, gallery, file, PDF and manual card storage'],reports:['Reports & Prescription','Complete clinical printout, PDF, Share and WhatsApp'],education:['Swarnaprashan Guide & Parent Education','Bilingual information, Pushya timing, Pathya and shareable handouts'],backup:['Backup / Restore','Data portability and export'],settings:['Settings','Clinic identity and prescription details']};
const tpl=id=>document.getElementById(id).content.cloneNode(true);

// Clinic reference calendar: Pushya Nakshatra transitions in India Standard Time.
// Verify local Panchang before publishing patient-facing clinic session hours.
const PUSHYA_DATES=[
 {start:'2026-08-11T10:09:00+05:30',end:'2026-08-12T07:59:00+05:30'},{start:'2026-09-07T18:14:00+05:30',end:'2026-09-08T16:39:00+05:30'},{start:'2026-10-05T00:13:00+05:30',end:'2026-10-05T23:09:00+05:30'},{start:'2026-11-01T05:39:00+05:30',end:'2026-11-02T04:30:00+05:30'},{start:'2026-11-28T12:50:00+05:30',end:'2026-11-29T10:59:00+05:30'},{start:'2026-12-25T22:50:00+05:30',end:'2026-12-26T20:12:00+05:30'},{start:'2027-01-22T10:24:00+05:30',end:'2027-01-23T07:31:00+05:30'},{start:'2027-02-18T21:05:00+05:30',end:'2027-02-19T18:35:00+05:30'},{start:'2027-03-18T05:07:00+05:30',end:'2027-03-19T03:21:00+05:30'},{start:'2027-04-14T10:52:00+05:30',end:'2027-04-15T09:33:00+05:30'},{start:'2027-05-11T16:25:00+05:30',end:'2027-05-12T14:55:00+05:30'},{start:'2027-06-07T23:45:00+05:30',end:'2027-06-08T21:36:00+05:30'},{start:'2027-07-05T09:19:00+05:30',end:'2027-07-06T06:33:00+05:30'},{start:'2027-08-01T20:04:00+05:30',end:'2027-08-02T17:09:00+05:30'},{start:'2027-08-29T06:17:00+05:30',end:'2027-08-30T03:44:00+05:30'}
];
const GUIDE_SOURCES='Classical context: Kashyapa Samhita (Lehana/Swarnaprashana). Evidence note: modern clinical evidence remains limited; a randomized infant trial evaluated Swarna Bhasma + honey + Ghrita and reported tolerability with preliminary immunomodulatory findings. Swarnaprashan is not a replacement for routine vaccination, nutrition, sleep, hygiene or indicated pediatric care.';
const GUIDE_REFERENCES=[['PubMed: randomized Swarna Prashana infant trial','https://pubmed.ncbi.nlm.nih.gov/33935440/'],['PubMed: critical appraisal of Swarnaprashana','https://pubmed.ncbi.nlm.nih.gov/26195896/'],['WHO Child Growth Standards 0–5 years','https://www.who.int/tools/child-growth-standards'],['WHO Growth Reference 5–19 years','https://www.who.int/tools/growth-reference-data-for-5to19-years'],['Pushya Nakshatra reference calendar','https://www.drikpanchang.com/panchang/nakshatra/daily/pushya-nakshatra-date-time.html']];
const SWARNA_GUIDE={
 intro:{en:['Swarnaprashan is an Ayurvedic pediatric practice described in the context of Lehana, traditionally using properly processed gold with vehicles such as Ghrita and Madhu.','Classical descriptions attribute Medha, Agni and Bala-supporting roles. These traditional claims should be presented as Ayurvedic concepts rather than guaranteed modern clinical outcomes.','At Mahamaya Clinic, each administration can be linked with the child’s growth, health, development, vaccination and follow-up record.'],hi:['स्वर्णप्राशन आयुर्वेद के कौमारभृत्य में वर्णित लेहन परंपरा से जुड़ी बाल-स्वास्थ्य प्रक्रिया है, जिसमें शास्त्रोक्त रूप से संसाधित स्वर्ण के साथ घृत एवं मधु जैसे अनुपान का वर्णन मिलता है।','शास्त्रीय ग्रंथों में मेधा, अग्नि और बल से संबंधित लाभों का वर्णन है; इन्हें निश्चित आधुनिक चिकित्सकीय परिणाम के रूप में प्रस्तुत नहीं करना चाहिए।','महमाया क्लिनिक में प्रत्येक स्वर्णप्राशन को बच्चे की वृद्धि, स्वास्थ्य, विकास, टीकाकरण और फॉलो-अप रिकॉर्ड से जोड़ा जा सकता है।']},
 ingredients:{en:['Core classical/research formulation context includes properly processed Swarna/Swarna Bhasma, Ghrita and Madhu; exact clinic formulation may vary according to physician protocol and licensed product specifications.','Only quality-assured, appropriately processed Ayurvedic medicines should be used. Raw/unprocessed gold is not for oral administration.','Record manufacturer/source, batch number, preparation date and dose in every child’s clinical entry.'],hi:['मुख्य शास्त्रीय/अनुसंधान संदर्भ में शुद्ध-संसाधित स्वर्ण/स्वर्ण भस्म, घृत और मधु का वर्णन मिलता है; क्लिनिक की वास्तविक औषधि चिकित्सकीय प्रोटोकॉल और अधिकृत उत्पाद के अनुसार अलग हो सकती है।','केवल गुणवत्ता-नियंत्रित एवं उचित रूप से संसाधित आयुर्वेदिक औषधि का उपयोग करें। कच्चा/असंसाधित सोना सेवन के लिए नहीं है।','हर बच्चे के रिकॉर्ड में निर्माता/स्रोत, बैच नंबर, तैयारी की तारीख और मात्रा दर्ज करें।']},
 dose:{en:['Dose should be individualized by a qualified Ayurveda physician according to age, formulation, concentration, clinical status and product instructions.','Do not copy a generic internet dose across different products; Swarna content can differ between preparations.','Document dose, route, batch, date/time, tolerance and any adverse event at every administration.'],hi:['मात्रा आयु, औषधि की संरचना/सांद्रता, बच्चे की चिकित्सकीय स्थिति और उत्पाद निर्देश के अनुसार योग्य आयुर्वेद चिकित्सक तय करें।','अलग-अलग उत्पादों में स्वर्ण की मात्रा अलग हो सकती है, इसलिए इंटरनेट की सामान्य मात्रा को सीधे लागू न करें।','हर बार मात्रा, बैच, तारीख/समय, सहनशीलता और किसी भी प्रतिकूल घटना को दर्ज करें।']},
 pushya:{en:['Many contemporary Swarnaprashan clinics schedule administration on Pushya Nakshatra as a traditional practice. Classical Swarnaprashan is not limited to a single monthly day in all textual contexts.','The dashboard shows a one-year Pushya reference calendar in IST. Local Panchang should be rechecked before publishing final clinic timings.','Clinic timing, registration window and next session can be shared separately from the astronomical start/end time.'],hi:['आज कई स्वर्णप्राशन केंद्र परंपरागत रूप से पुष्य नक्षत्र के दिन आयोजन करते हैं। सभी शास्त्रीय संदर्भों में स्वर्णप्राशन को केवल महीने के एक दिन तक सीमित नहीं बताया गया है।','डैशबोर्ड में एक वर्ष का पुष्य नक्षत्र संदर्भ कैलेंडर IST में दिया गया है। अंतिम क्लिनिक समय प्रकाशित करने से पहले स्थानीय पंचांग से पुनः पुष्टि करें।','नक्षत्र के आरंभ-अंत समय से अलग क्लिनिक का पंजीकरण और औषधि-प्रदान समय साझा किया जा सकता है।']},
 pathya:{en:['Continue age-appropriate normal feeding and hydration unless the treating physician advises otherwise.','Support regular sleep, outdoor play, hygiene, balanced nutrition and routine vaccination.','Avoid unnecessary fasting, over-restrictive diets and unsupervised supplements/medicines in children.'],hi:['चिकित्सक की विशेष सलाह न हो तो आयु-अनुसार सामान्य भोजन और पर्याप्त द्रव जारी रखें।','नियमित नींद, आउटडोर खेल, स्वच्छता, संतुलित पोषण और नियमित टीकाकरण पर ध्यान दें।','बच्चों में अनावश्यक उपवास, अत्यधिक परहेज़ और बिना सलाह के सप्लीमेंट/दवाएँ न दें।']},
 safety:{en:['Defer and clinically review if the child is acutely unwell, vomiting repeatedly, dehydrated, has significant breathing difficulty, altered sensorium, severe allergy symptoms or another condition needing urgent medical care.','Check known allergies, current medicines, liver/kidney disease and prior adverse reactions before administration.','Use only physician-approved, quality-assured preparation; document adverse events and refer when indicated.'],hi:['यदि बच्चा तीव्र रूप से बीमार हो, बार-बार उल्टी, निर्जलीकरण, सांस में गंभीर कठिनाई, चेतना में बदलाव, गंभीर एलर्जी या आपात स्थिति हो तो पहले चिकित्सकीय मूल्यांकन करें।','एलर्जी, चल रही दवाएँ, यकृत/वृक्क रोग और पूर्व प्रतिकूल प्रतिक्रिया की जानकारी लें।','केवल चिकित्सक-अनुमोदित गुणवत्ता-नियंत्रित औषधि दें; प्रतिकूल घटना दर्ज करें और आवश्यकता पर रेफर करें।']},
 evidence:{en:['Modern evidence is still limited and heterogeneous. A randomized controlled infant study of Swarna Bhasma, honey and Ghrita reported no adverse effect on normal growth during the study and suggested preliminary immunomodulatory activity, but larger studies are needed.','Do not promise prevention of all infections, higher IQ, or replacement of vaccines/standard pediatric care.','Best practice is longitudinal documentation: growth, illness frequency, development, school functioning, adverse events and concurrent care.'],hi:['आधुनिक वैज्ञानिक प्रमाण अभी सीमित और विविध हैं। शिशुओं में स्वर्ण भस्म, मधु और घृत के एक नियंत्रित अध्ययन में सामान्य वृद्धि पर प्रतिकूल प्रभाव नहीं मिला और प्रारंभिक प्रतिरक्षा-संबंधी संकेत मिले, पर बड़े अध्ययन आवश्यक हैं।','सभी संक्रमणों से सुरक्षा, निश्चित IQ वृद्धि या टीकाकरण/मानक बाल-चिकित्सा के विकल्प का दावा न करें।','सर्वोत्तम अभ्यास है दीर्घकालिक रिकॉर्ड: वृद्धि, बीमारी की आवृत्ति, विकास, स्कूल-कार्य, प्रतिकूल घटनाएँ और साथ चल रही चिकित्सा।']}
};


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
  $('#logoutBtn').onclick=async()=>{if(confirm('Logout current user?')){try{await window.mahamayaFirebaseSignOut?.()}catch{} clearSession();ensureAuthUI()}};
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
  const identifier=$("#loginIdentifier").value.trim().toLowerCase();
  const password=$("#loginPassword").value;

  if(!identifier || !password){
    setLoginStatus("Please enter email and password.",false);
    return;
  }
  if(!identifier.includes("@")){
    setLoginStatus("Please use your registered email address for secure login.",false);
    return;
  }

  setLoginStatus("Signing in securely…",true);
  const started=Date.now();
  while(typeof window.mahamayaFirebaseLogin!=="function" && Date.now()-started<5000){
    await new Promise(r=>setTimeout(r,100));
  }
  if(typeof window.mahamayaFirebaseLogin!=="function"){
    setLoginStatus("Secure login module did not load. Please refresh once and try again.",false);
    return;
  }
  const result=await window.mahamayaFirebaseLogin(identifier,password);
  if(result?.ok){
    $("#loginPassword").value="";
    setLoginStatus("Login successful. Opening dashboard…",true);
  }else{
    setLoginStatus(result?.message||"Unable to login.",false);
  }
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

function options(sel,blank=true){const sorted=[...db.children].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'})||String(a.regId||'').localeCompare(String(b.regId||'')));sel.innerHTML=(blank?'<option value="">Select child</option>':'')+sorted.map(c=>`<option value="${c.id}">${esc(c.regId||c.id.slice(-5).toUpperCase())} • ${esc(c.name)}</option>`).join('')}

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
  ({dashboard:renderDashboard,clinical:renderClinical,children:renderChildren,followup:renderFollowup,analytics:renderAnalytics,vaccination:renderVaccination,documents:renderDocuments,reports:renderReports,education:renderEducation,backup:renderBackup,settings:renderSettings}[name]||(()=>{}))();
}

async function renderDashboard(){
  let docs=[];try{docs=await getDocs()}catch{}
  const now=new Date(),thisMonth=db.followups.filter(v=>new Date(v.date).getMonth()===now.getMonth()&&new Date(v.date).getFullYear()===now.getFullYear()).length;
  $('#kpis').innerHTML=[['Registered Children',db.children.length],['Clinical Entries',db.cases.length],['Visits This Month',thisMonth],['Saved Documents',docs.length]].map(x=>`<div class="kpi"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');
  const oc=childOperationalCounts();if($('#opsKpis'))$('#opsKpis').innerHTML=[['Active',oc.active,'green'],['Ready',oc.ready,'gold'],['Appointments Today',oc.apptToday,'blue'],['Dose Taken Today',oc.doseToday,'green'],['Reminders Today',oc.remindersToday,'orange'],['Home Use',oc.home,'violet'],['Health Hold',oc.hold,'red'],['Stopped',oc.stopped,'gray']].map(x=>`<button class="ops-kpi ${x[2]}" onclick="app.openChildrenStatus('${x[0]}')"><b>${x[1]}</b><span>${x[0]}</span></button>`).join('');
  const alpha=[...db.children].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),undefined,{sensitivity:'base'}));
  $('#recentChildren').innerHTML=alpha.slice(0,8).map(c=>`<div class="docitem dashboard-child-row"><div><b>${esc(c.name)}</b><div class="docmeta"><span class="id-badge">${esc(c.regId||'-')}</span> • ${age(c.dob)} • ${esc(c.mobile||'')}</div></div><div class="actionrow"><button class="ghost" onclick="app.openChildFromDashboard('${c.id}')">Open</button><button class="ghost" onclick="app.startClinical('${c.id}')">Clinical</button></div></div>`).join('')||'<p class="muted">No child registered.</p>';
  $('#dueChildren').innerHTML=alpha.slice(0,7).map(c=>{const f=fups(c.id).at(-1);return`<div class="docitem"><b>${esc(c.name)}</b><div class="docmeta">${esc(c.regId||'-')} • Last follow-up: ${f?fmt(f.date):'Not recorded'}</div></div>`}).join('')||'<p class="muted">Register a child to begin.</p>';
  const upcoming=PUSHYA_DATES.filter(x=>new Date(x.end)>=now).slice(0,14),dateFmt=d=>new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
  if($('#pushyaCalendar'))$('#pushyaCalendar').innerHTML=upcoming.map((x,i)=>`<div class="pushya-row ${i===0?'next':''}"><div><b>${i===0?'Next • ':''}${new Date(x.start).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</b><span>${dateFmt(x.start)} → ${dateFmt(x.end)}</span></div><span>${i===0?'Upcoming':'Pushya'}</span></div>`).join('');
  if($('#nextPushyaBadge'))$('#nextPushyaBadge').textContent=upcoming[0]?`Next: ${fmt(upcoming[0].start)}`:'Calendar update due';
  const quick=(q='')=>{const qq=String(q).trim().toLowerCase(),arr=alpha.filter(c=>!qq||[c.name,c.regId,c.mobile,c.parent].join(' ').toLowerCase().includes(qq)).slice(0,8);if($('#dashRegistryResults'))$('#dashRegistryResults').innerHTML=arr.map(c=>`<button class="mini-child-result" onclick="app.openChildFromDashboard('${c.id}')"><span><b>${esc(c.name)}</b><small>${esc(c.regId||'-')} • ${esc(c.parent||'')}</small></span><strong>Open →</strong></button>`).join('')||'<p class="muted">No matching child.</p>'};
  if($('#dashRegistrySearch')){$('#dashRegistrySearch').oninput=e=>quick(e.target.value);quick('')}
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
function ayurvedaSummary(scores={}){const a=Object.entries(ASHTAVIDHA_OPTIONS).map(([k])=>[k,scores['A:'+k]]).filter(x=>x[1]&&x[1]!=='Not assessed'),d=Object.entries(DASHAVIDHA_OPTIONS).map(([k])=>[k,scores['D:'+k]]).filter(x=>x[1]&&x[1]!=='Not assessed');const block=(title,arr)=>arr.length?`<div class="reportsection"><h3>${title}</h3><table><tbody>${arr.map(([k,v])=>`<tr><td><b>${esc(k)}</b></td><td>${esc(v)}</td></tr>`).join('')}</tbody></table></div>`:'';return block('Ashtavidha Pariksha',a)+block('Dashavidha Atura Pariksha',d)}
function completeClinicalHtml(d={}){return `<div class="reportsection"><h3>Complete Latest Clinical Entry</h3><p><b>Visit type:</b> ${esc(d.type||'-')} &nbsp; <b>Date:</b> ${fmt(d.date)}</p><p><b>Present complaint:</b> ${esc(d.complaint||'-')}</p><p><b>History:</b> ${esc(d.history||'-')}</p><p><b>Allergy:</b> ${esc(d.allergy||'-')} &nbsp; <b>Current medicines:</b> ${esc(d.currentMeds||'-')}</p><p><b>General appearance:</b> ${esc(d.ga||'-')} &nbsp; <b>Temperature:</b> ${esc(d.temp||'-')} °F</p><p><b>Vitals:</b> Pulse ${esc(d.pulse||'-')} • RR ${esc(d.rr||'-')} • SpO₂ ${esc(d.spo2||'-')}% • BP ${esc(d.sys||'-')}/${esc(d.dia||'-')}</p><p><b>Examination notes:</b> ${esc(d.examNotes||'-')}</p><p><b>Investigations:</b> ${esc(d.invest||'-')}</p><p><b>Clinical impression:</b> ${esc(d.impression||'-')}</p><p><b>Red flags / safety:</b> ${esc(d.redflags||'None recorded')}</p><p><b>Swarnaprashan dose:</b> ${esc(d.dose||'-')} &nbsp; <b>Batch:</b> ${esc(d.batch||'-')}</p><p><b>Other medicines:</b> ${esc(d.medicines||'-')}</p><p><b>Pathya:</b> ${esc(d.pathya||'-')}</p><p><b>Apathya:</b> ${esc(d.apathya||'-')}</p><p><b>Lifestyle:</b> ${esc(d.lifestyle||'-')}</p><p><b>Cognitive/school advice:</b> ${esc(d.cognitive||'-')}</p><p><b>Safety/referral advice:</b> ${esc(d.safety||'-')}</p><p><b>Special instructions:</b> ${esc(d.rxInstructions||'-')}</p><p><b>Parent message:</b> ${esc(d.parentMsg||'-')}</p><p><b>Next follow-up:</b> ${fmt(d.next)}</p></div>`}
async function generateCaseReport(scroll=true){
 const d=wiz.data,c=child(d.childId)||{},docs=(await getDocs()).filter(x=>x.childId===d.childId),el=$('#caseReportPreview')||$('#reportPaper');if(!el)return;
 let photo='';if(c.photoDocId){const pd=await docById(c.photoDocId);if(pd)photo=URL.createObjectURL(pd.blob)}
 el.innerHTML=`${letterhead(fmt(d.date), `${photo?`<img src="${photo}" class="avatar-lg">`:''}<div class="patient-head-id">${esc(c.regId||'')}<br>${fmt(d.date)}</div>`)}
 <div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name||'-')}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Height / Weight</span><b>${d.height||'-'} cm / ${d.weight||'-'} kg</b></div><div class="metric"><span>BMI</span><b>${d.bmi||'-'}</b></div></div></div>
 <div class="reportsection"><h3>Clinical Assessment</h3><p><b>Complaint:</b> ${esc(d.complaint||'-')}</p><p><b>History:</b> ${esc(d.history||'-')}</p><p><b>Allergy:</b> ${esc(d.allergy||'-')} &nbsp; <b>Current medicines:</b> ${esc(d.currentMeds||'-')}</p><p><b>General appearance:</b> ${esc(d.ga||'-')} &nbsp; <b>Temperature:</b> ${esc(d.temp||'-')} °F</p><p><b>Vitals:</b> Pulse ${d.pulse||'-'} • RR ${d.rr||'-'} • SpO₂ ${d.spo2||'-'}% • BP ${d.sys||'-'}/${d.dia||'-'}</p><p><b>Examination notes:</b> ${esc(d.examNotes||'-')}</p><p><b>Investigations:</b> ${esc(d.invest||'-')}</p><p><b>Impression:</b> ${esc(d.impression||'-')}</p><p><b>Safety / Red flags:</b> ${esc(d.redflags||'None recorded')}</p></div>
 <div class="reportsection"><h3>Swarnaprashan & Treatment</h3><p><b>Swarnaprashan Dose:</b> ${esc(d.dose||'-')} &nbsp; <b>Preparation/Batch:</b> ${esc(d.batch||'-')}</p><p><b>Other medicines:</b> ${esc(d.medicines||'-')}</p><p><b>Next follow-up:</b> ${fmt(d.next)}</p></div>
 <div class="reportsection"><h3>Diet • Pathya • Lifestyle</h3><p><b>Pathya:</b> ${esc(d.pathya||'-')}</p><p><b>Apathya:</b> ${esc(d.apathya||'-')}</p><p><b>Activity/Lifestyle:</b> ${esc(d.lifestyle||'-')}</p><p><b>Learning/School advice:</b> ${esc(d.cognitive||'-')}</p></div>
 ${d.printAssessment!==false?ayurvedaSummary(d.examScores||{}):''}<div class="reportsection"><h3>Instructions</h3><p>${esc(d.rxInstructions||'-')}</p><p><b>Parent message:</b> ${esc(d.parentMsg||'-')}</p></div>
 ${d.printDocs!==false?`<div class="reportsection"><h3>Attached Clinical Documents</h3><ul>${docs.map(x=>`<li>${esc(x.type)} — ${esc(x.name)} (${fmt(x.date)})</li>`).join('')||'<li>No document attached</li>'}</ul></div>`:''}
 <div class="signature"><div class="signature-grid"><div><b>${esc(db.settings.doctor)}</b><br><span>${esc(db.settings.designation)}</span></div><div><b>${esc(db.settings.doctor2)}</b><br><span>${esc(db.settings.designation2)}</span></div></div><div class="signature-address">${esc(db.settings.address)} ${db.settings.phone?'• '+esc(db.settings.phone):''}<br>${esc(db.settings.footer)}</div></div>`;
 if(scroll)el.scrollIntoView({behavior:'smooth'});
}
function currentText(){const e=$('#caseReportPreview')||$('#reportPaper');return e?.innerText.trim()||''}
async function shareCurrent(){const t=currentText();if(!t){alert('Generate report first');return}if(navigator.share)await navigator.share({title:'Mahamaya Clinic Swarnaprashan',text:t});else{await navigator.clipboard.writeText(t);alert('Copied to clipboard')}}
function whatsappCurrent(){const t=currentText();if(!t){alert('Generate report first');return}window.open('https://wa.me/?text='+encodeURIComponent(t),'_blank')}

// children & baby photo
function openChildFromDashboard(id){showView('children');setTimeout(()=>openChildDetails(id),40)}

function renderChildren(){
  db.children=db.children.map(normalizeChild);
  save();
  $('#registerChildBtn').onclick=()=>editChild();
  $('#showAllChildrenBtn').onclick=()=>{ $('#childStatusFilter').value=''; $('#childTaskFilter').value=''; $('#childSearch').value=''; drawChildren(''); };
  $('#childSearch').oninput=()=>drawChildren($('#childSearch').value);
  $('#childStatusFilter').onchange=()=>drawChildren($('#childSearch').value);
  $('#childTaskFilter').onchange=()=>drawChildren($('#childSearch').value);
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
    ['Stopped',c.stopped,'gray']
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
  q=(q||'').toLowerCase();

  const num=s=>Number((String(s||'').match(/\d+/)||['999999'])[0]);
  const arr=normalizedChildren()
    .filter(c=>[c.name,c.parent,c.mobile,c.regId,c.address].join(' ').toLowerCase().includes(q))
    .filter(c=>!statusFilter||c.currentStatus===statusFilter)
    .filter(c=>!taskFilter||c.taskStatus===taskFilter)
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
    <thead><tr><th>No.</th><th>Photo</th><th>ID</th><th>Child</th><th>Guardian / Contact</th><th>Status</th><th>Appointment</th><th>Actions</th></tr></thead>
    <tbody>${rows.join('')||'<tr><td colspan="8" class="muted">No saved child matches this filter.</td></tr>'}</tbody>
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
      <div><span>Total Follow-ups</span><b>${visits.length}</b></div>
      <div><span>Next Action</span><b>${esc(c.nextAction||'-')}</b></div>
      <div><span>Status Note</span><b>${esc(c.statusNote||'-')}</b></div>
      <div><span>Last Contact</span><b>${c.lastContactDate?fmt(c.lastContactDate):'-'}</b></div>
    </div>
    <div class="actionrow">
      <button onclick="app.editChild('${c.id}')">Edit Profile</button>
      <button class="ghost" onclick="app.startClinical('${c.id}')">Clinical Entry</button>
      <button class="ghost" onclick="app.quickReport('${c.id}')">Report / Print</button>
      <button class="ghost" onclick="app.shareChildProfile('${c.id}')">Share</button>
      ${c.mobile?`<a class="button-anchor" href="${callLink(c.mobile)}">Call Guardian</a><a class="button-anchor" target="_blank" href="${waLink(c.mobile,c.name)}">WhatsApp Reminder</a>`:''}
      <button class="danger-btn" onclick="app.deleteChild('${c.id}')">Delete</button>
    </div>
  </div>`;
  $('#childDetailsPanel').scrollIntoView({behavior:'smooth',block:'start'});
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
function drawAnalytics(id){const fs=fups(id),c=child(id)||{};if(!fs.length){$('#analyticSummary').innerHTML='<p class="muted">No follow-up data.</p>';$('#growthInterpretation').innerHTML='';return}const a=fs[0],b=fs.at(-1),prev=fs.length>1?fs.at(-2):null,days=prev?Math.max(1,(new Date(b.date)-new Date(prev.date))/86400000):null,hVel=days&&b.height&&prev.height?((+b.height-+prev.height)*365.25/days):null,wVel=days&&b.weight&&prev.weight?((+b.weight-+prev.weight)*365.25/days):null;$('#analyticSummary').innerHTML=`<div class="metric"><span>Visits</span><b>${fs.length}</b></div><div class="metric"><span>Latest Height</span><b>${b.height||'-'} cm</b></div><div class="metric"><span>Latest Weight</span><b>${b.weight||'-'} kg</b></div><div class="metric"><span>BMI</span><b>${b.bmi||'-'}</b></div><div class="metric"><span>Functional Avg</span><b>${(avg(b.scores)||0).toFixed(1)}/4</b></div>`;$('#growthInterpretation').innerHTML=`<div class="growth-note"><b>Longitudinal interpretation</b><span>${esc(c.name||'Child')} • ${age(c.dob)} • ${esc(c.sex||'')}</span><div class="metricrow"><div class="metric"><span>Height velocity*</span><b>${hVel==null?'-':hVel.toFixed(1)+' cm/year'}</b></div><div class="metric"><span>Weight velocity*</span><b>${wVel==null?'-':wVel.toFixed(1)+' kg/year'}</b></div><div class="metric"><span>Latest interval</span><b>${days?Math.round(days)+' days':'-'}</b></div></div><small>*Calculated from the latest two measurements; interpret with age/sex-specific WHO growth standards. Child BMI should not use adult cut-offs.</small></div>`;drawLine($('#lineChart'),fs);drawBars($('#barChart'),a,b);drawPie($('#pieChart'),b);$('#baselineLatest').innerHTML=`<table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(a.scores?.[k])}</td><td>${scoreLabel(b.scores?.[k])}</td><td>${trend(a.scores?.[k],b.scores?.[k])}</td></tr>`).join('')}</tbody></table>`}
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
async function generateSelectedReport(){const id=$('#reportChild').value;if(!id){alert('Select child');return}const c=child(id),fs=fups(id),latest=fs.at(-1),cases=db.cases.filter(x=>x.childId===id).sort((a,b)=>String(a.date).localeCompare(String(b.date))),cs=cases.at(-1),docs=(await getDocs()).filter(x=>x.childId===id),first=fs[0],reportType=$('#reportType')?.value||'Latest Visit + Longitudinal Progress';let photo='';if(c.photoDocId){const pd=await docById(c.photoDocId);if(pd)photo=URL.createObjectURL(pd.blob)}const profile=`<div class="reportsection"><h3>Child Profile</h3><div class="metricrow"><div class="metric"><span>Name</span><b>${esc(c.name)}</b><small>${age(c.dob)} • ${esc(c.sex||'')}</small></div><div class="metric"><span>ID</span><b>${esc(c.regId||'-')}</b><small>${esc(c.school||'')}</small></div><div class="metric"><span>Parent</span><b>${esc(c.parent||'-')}</b><small>${esc(c.mobile||'')}</small></div><div class="metric"><span>Allergies</span><b>${esc(c.allergies||'-')}</b></div></div></div>`,growth=latest?`<div class="reportsection"><h3>Latest Growth & Vitals</h3><p>Height ${latest.height||'-'} cm • Weight ${latest.weight||'-'} kg • BMI ${latest.bmi||'-'} • Pulse ${latest.pulse||'-'} • RR ${latest.rr||'-'} • SpO₂ ${latest.spo2||'-'}% • BP ${esc(latest.bp||'-')}</p><p><b>Latest dose:</b> ${esc(latest.dose||'-')} • <b>Health issue:</b> ${esc(latest.issue||'No issue recorded')}</p><p><b>Parent observation:</b> ${esc(latest.parent||'-')}</p></div>`:'',progress=first&&latest?`<div class="reportsection"><h3>Baseline vs Latest Functional Progress</h3><table><thead><tr><th>Parameter</th><th>Baseline</th><th>Latest</th><th>Trend</th></tr></thead><tbody>${scales.map(k=>`<tr><td>${k}</td><td>${scoreLabel(first.scores?.[k])}</td><td>${scoreLabel(latest.scores?.[k])}</td><td>${trend(first.scores?.[k],latest.scores?.[k])}</td></tr>`).join('')}</tbody></table></div>`:'',rx=cs?`<div class="reportsection"><h3>Prescription & Treatment</h3><p><b>Clinical impression:</b> ${esc(cs.impression||'-')}</p><p><b>Swarnaprashan:</b> ${esc(cs.dose||'-')} • ${esc(cs.batch||'')}</p><p><b>Other medicines:</b> ${esc(cs.medicines||'-')}</p><p><b>Pathya:</b> ${esc(cs.pathya||'-')}</p><p><b>Apathya:</b> ${esc(cs.apathya||'-')}</p><p><b>Lifestyle:</b> ${esc(cs.lifestyle||'-')}</p><p><b>Instructions:</b> ${esc(cs.rxInstructions||'-')}</p><p><b>Next follow-up:</b> ${fmt(cs.next)}</p></div>`:'';let body=profile;if(reportType==='Prescription Only')body+=rx+(cs&&$('#incAyurveda')?.checked?ayurvedaSummary(cs.examScores||{}):'');else if(reportType==='Complete Clinical Summary')body+=growth+progress+(cs&&$('#incFullClinical')?.checked?completeClinicalHtml(cs):rx)+(cs&&$('#incAyurveda')?.checked?ayurvedaSummary(cs.examScores||{}):'');else body+=growth+progress+rx+(cs&&$('#incAyurveda')?.checked?ayurvedaSummary(cs.examScores||{}):'');if($('#incDocs').checked)body+=`<div class="reportsection"><h3>Documents</h3><ul>${docs.map(d=>`<li>${esc(d.type)} — ${esc(d.name)} — ${fmt(d.date)}</li>`).join('')||'<li>No attachment</li>'}</ul></div>`;$('#reportPaper').innerHTML=`${letterhead(fmt(latest?.date||cs?.date),`${photo?`<img src="${photo}" class="avatar-lg">`:''}<div class="patient-head-id">${esc(c.regId||'')}<br>${fmt(latest?.date||cs?.date)}</div>`)}${body}<div class="signature"><div class="signature-grid"><div><b>${esc(db.settings.doctor)}</b><br><span>${esc(db.settings.designation)}</span></div><div><b>${esc(db.settings.doctor2)}</b><br><span>${esc(db.settings.designation2)}</span></div></div><div class="signature-address">${esc(db.settings.address)} ${db.settings.phone?'• '+esc(db.settings.phone):''}<br>${esc(db.settings.footer)}</div></div>`}

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
return{init,showView,startClinical,editChild,quickReport,openQuickUpload,openDoc,downloadDoc,removeDoc,generateCaseReport,shareCurrent,whatsappCurrent,printCaseReport,printParentReport,startDirectCamera,prefillUser,deleteUser,resetLoginAccess,openChildDetails,shareChildProfile,deleteChild,openChildrenStatus,openChildFromDashboard,getCloudSnapshot,applyCloudSnapshot};
})();
window.app=app;
document.addEventListener('DOMContentLoaded',app.init);
