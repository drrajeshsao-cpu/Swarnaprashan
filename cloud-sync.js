import { initializeApp } from "https://www.gstatic.com/firebasejs/12.17.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, setPersistence, browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-auth.js";
import {
  getFirestore, collection, doc, getDocs, getDocFromServer, setDoc, deleteDoc,
  onSnapshot, enableMultiTabIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/12.17.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDt5DVFRp9v9ZyaoWSy_LG7bw-b3w38AyU",
  authDomain: "mahamaya-swarnaprashan-cloud.firebaseapp.com",
  projectId: "mahamaya-swarnaprashan-cloud",
  storageBucket: "mahamaya-swarnaprashan-cloud.firebasestorage.app",
  messagingSenderId: "669931973964",
  appId: "1:669931973964:web:cf4fc401e2d70ec58c33e9"
};

const fbApp=initializeApp(firebaseConfig);
const auth=getAuth(fbApp);
const firestore=getFirestore(fbApp);

setPersistence(auth,browserLocalPersistence).catch(()=>{});
enableMultiTabIndexedDbPersistence(firestore).catch(e=>console.warn('Firestore persistence fallback',e?.code||e));

const COLLECTIONS={
  children:'children',
  cases:'cases',
  followups:'followups',
  vaccines:'vaccines',
  plans:'plans'
};

let currentUser=null;
let listeners=[];
let cloudState={children:[],cases:[],followups:[],vaccines:[],plans:[],settings:null};
let readyCollections=new Set();
let applyingRemote=false;
let writeTimer=null;
let popover=null;

const gate=document.getElementById('firebaseAuthGate');
const emailEl=document.getElementById('firebaseEmail');
const passwordEl=document.getElementById('firebasePassword');
const loginBtn=document.getElementById('firebaseLoginBtn');
const forgotBtn=document.getElementById('firebaseForgotBtn');
const messageEl=document.getElementById('firebaseLoginMessage');
const cloudBtn=document.getElementById('cloudAccountBtn');

function setMessage(text,type=''){
  if(!messageEl)return;
  messageEl.textContent=text;
  messageEl.className='firebase-login-message '+type;
}
function setStatus(state,text){
  const el=document.getElementById('cloudStatus');
  if(!el)return;
  el.className='cloud-status cloud-'+state;
  const b=el.querySelector('b'); if(b)b.textContent=text;
}
function meaningful(data){
  if(!data)return false;
  return ['children','cases','followups','vaccines','plans'].some(k=>(data[k]?.length||0)>0);
}
function clone(x){return JSON.parse(JSON.stringify(x))}
function currentLocal(){
  try{return window.app?.getCloudSnapshot?.()||null}catch(e){return null}
}
async function waitForAppBridge(timeout=5000){
  const started=Date.now();
  while(Date.now()-started<timeout){
    if(window.app?.getCloudSnapshot && window.app?.applyCloudSnapshot)return true;
    await new Promise(r=>setTimeout(r,100));
  }
  return false;
}
function normalizeRecordForCloud(record){
  return clone(record);
}
function arraysToMap(arr){return new Map((arr||[]).map(x=>[String(x.id),x]))}
function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}

async function uploadCollectionDiff(localArr, cloudArr, collectionName){
  const lm=arraysToMap(localArr), cm=arraysToMap(cloudArr);
  const jobs=[];
  for(const [id,item] of lm){
    if(!cm.has(id) || !same(item,cm.get(id))){
      jobs.push(setDoc(doc(firestore,collectionName,id),normalizeRecordForCloud(item),{merge:false}));
    }
  }
  for(const [id] of cm){
    if(!lm.has(id)) jobs.push(deleteDoc(doc(firestore,collectionName,id)));
  }
  if(jobs.length) await Promise.all(jobs);
}

async function syncLocalToCloud(reason='save'){
  if(!currentUser || applyingRemote || !navigator.onLine)return;
  const local=currentLocal(); if(!local)return;
  setStatus('syncing','Syncing…');
  try{
    for(const [key,col] of Object.entries(COLLECTIONS)){
      await uploadCollectionDiff(local[key]||[],cloudState[key]||[],col);
    }
    if(!same(local.settings||{},cloudState.settings||{})){
      await setDoc(doc(firestore,'clinicSettings','main'),clone(local.settings||{}),{merge:false});
    }
    setStatus('synced','☁ Synced');
  }catch(e){
    console.error('Cloud write failed',e);
    setStatus(navigator.onLine?'error':'offline',navigator.onLine?'⚠ Sync error':'● Offline • queued');
  }
}
function scheduleSync(reason='local-save'){
  if(applyingRemote || !currentUser)return;
  clearTimeout(writeTimer);
  writeTimer=setTimeout(()=>syncLocalToCloud(reason),600);
}

function applyComposedCloud(){
  if(readyCollections.size<6)return;
  const composed={
    children:clone(cloudState.children||[]),
    cases:clone(cloudState.cases||[]),
    followups:clone(cloudState.followups||[]),
    vaccines:clone(cloudState.vaccines||[]),
    plans:clone(cloudState.plans||[]),
    settings:clone(cloudState.settings||{})
  };
  applyingRemote=true;
  try{
    window.app?.applyCloudSnapshot?.(composed);
  }finally{
    setTimeout(()=>{applyingRemote=false},0);
  }
  setStatus('synced','☁ Synced');
}

async function initialCloudEmpty(){
  let total=0;
  for(const col of Object.values(COLLECTIONS)){
    const s=await getDocs(collection(firestore,col));
    total+=s.size;
  }
  const settingsSnap=await getDocFromServer(doc(firestore,'clinicSettings','main')).catch(()=>null);
  if(settingsSnap?.exists())total++;
  return total===0;
}

async function seedCloudFromLocal(local){
  setStatus('syncing','Uploading existing clinic data…');
  for(const [key,col] of Object.entries(COLLECTIONS)){
    for(const item of (local[key]||[])){
      await setDoc(doc(firestore,col,String(item.id)),clone(item),{merge:false});
    }
  }
  await setDoc(doc(firestore,'clinicSettings','main'),clone(local.settings||{}),{merge:false});
}

function clearListeners(){
  listeners.forEach(fn=>{try{fn()}catch{}});
  listeners=[];readyCollections.clear();
}
function startListeners(){
  clearListeners();
  for(const [key,col] of Object.entries(COLLECTIONS)){
    listeners.push(onSnapshot(collection(firestore,col),{includeMetadataChanges:true},snap=>{
      if(snap.metadata.hasPendingWrites){
        setStatus(navigator.onLine?'syncing':'offline',navigator.onLine?'Syncing…':'● Offline • queued');
        return;
      }
      cloudState[key]=snap.docs.map(d=>({id:d.id,...d.data()}));
      readyCollections.add(key);
      applyComposedCloud();
    },e=>{
      console.error(col+' listener error',e);
      setStatus(navigator.onLine?'error':'offline',navigator.onLine?'⚠ Sync error':'● Offline');
    }));
  }
  listeners.push(onSnapshot(doc(firestore,'clinicSettings','main'),{includeMetadataChanges:true},snap=>{
    if(snap.metadata.hasPendingWrites)return;
    cloudState.settings=snap.exists()?snap.data():{};
    readyCollections.add('settings');
    applyComposedCloud();
  },e=>{
    console.error('settings listener error',e);
    setStatus(navigator.onLine?'error':'offline',navigator.onLine?'⚠ Sync error':'● Offline');
  }));
}

function openLocalSession(user){
  try{
    localStorage.setItem('mahamaya_swarnaprashan_session_v1',JSON.stringify({
      id:user.uid,
      name:'Dr Rajesh Sao',
      loginId:user.email||'drrajesh',
      role:'Super Admin',
      at:Date.now(),
      firebase:true
    }));
  }catch{}
  document.getElementById('authGate')?.style.setProperty('display','none');
  document.getElementById('appShell')?.classList.remove('auth-hidden');
  const badge=document.getElementById('currentUserBadge');
  if(badge)badge.textContent='Dr Rajesh Sao • Super Admin';
  try{window.app?.showView?.('dashboard')}catch{}
}

async function initializeCloudUser(user){
  currentUser=user;
  setStatus(navigator.onLine?'syncing':'offline',navigator.onLine?'Connecting cloud…':'● Offline');
  const bridge=await waitForAppBridge();
  if(!bridge){
    setStatus('error','⚠ App sync bridge unavailable');return;
  }
  openLocalSession(user);

  try{
    const empty=await initialCloudEmpty();
    const local=currentLocal();
    if(empty && meaningful(local)){
      await seedCloudFromLocal(local);
    }
    startListeners();
  }catch(e){
    console.error('Initial cloud setup failed',e);
    startListeners();
    setStatus(navigator.onLine?'error':'offline',navigator.onLine?'⚠ Cloud connection problem':'● Offline');
  }
}

window.addEventListener('swarnaprashan-local-save',()=>scheduleSync());
window.addEventListener('online',()=>{if(currentUser){setStatus('syncing','Reconnecting…');scheduleSync('reconnect')}});
window.addEventListener('offline',()=>setStatus('offline','● Offline • changes stay local'));

loginBtn?.addEventListener('click',async()=>{
  const email=(emailEl?.value||'').trim(),pw=passwordEl?.value||'';
  if(!email||!pw){setMessage('Enter email and password.','error');return}
  loginBtn.disabled=true;setMessage('Signing in securely…');
  try{
    await signInWithEmailAndPassword(auth,email,pw);
    passwordEl.value='';
  }catch(e){
    console.error(e);
    setMessage(e?.code==='auth/invalid-credential'?'Email or password is incorrect.':'Sign-in failed: '+(e?.code||'error'),'error');
  }finally{loginBtn.disabled=false}
});
passwordEl?.addEventListener('keydown',e=>{if(e.key==='Enter')loginBtn.click()});
forgotBtn?.addEventListener('click',async()=>{
  const email=(emailEl?.value||'').trim();
  if(!email){setMessage('Enter your email first.','error');return}
  try{await sendPasswordResetEmail(auth,email);setMessage('Password reset email sent. Check Inbox and Spam.','ok')}
  catch(e){setMessage('Could not send reset email: '+(e?.code||'error'),'error')}
});

function closePopover(){popover?.remove();popover=null}
cloudBtn?.addEventListener('click',()=>{
  if(popover){closePopover();return}
  popover=document.createElement('div');popover.className='cloud-popover';
  popover.innerHTML=currentUser?`
    <h4>☁ Mahamaya Swarnaprashan Cloud</h4>
    <p><b>${currentUser.email||'Signed in'}</b></p>
    <div class="cloud-scope-note">
      Synced now: children, clinical cases, monthly follow-ups, vaccination/schedule, plans and clinic settings.<br><br>
      Device-local in Phase 1: baby photos, investigation images, PDFs and manual-card file blobs.
    </div>
    <div class="actionrow">
      <button id="cloudSyncNow">Sync Now</button>
      <button id="cloudSignOut" class="ghost">Sign Out</button>
    </div>`:`<h4>Cloud account</h4><p>Not signed in.</p>`;
  document.body.appendChild(popover);
  document.getElementById('cloudSyncNow')?.addEventListener('click',()=>{syncLocalToCloud('manual');closePopover()});
  document.getElementById('cloudSignOut')?.addEventListener('click',async()=>{closePopover();await signOut(auth)});
});

onAuthStateChanged(auth,async user=>{
  if(user){
    gate?.classList.add('hidden');
    setMessage('Signed in. Synchronizing clinic records…','ok');
    await initializeCloudUser(user);
  }else{
    currentUser=null;clearListeners();
    gate?.classList.remove('hidden');
    setStatus('offline','Cloud sign-in required');
    setMessage('Sign in to synchronize laptop and mobile records.');
  }
});
