
// V11.17 Panchang engine loader.
// Uses MIT-licensed @ishubhamx/panchangam-js v3.0.0 through jsDelivr ESM.
// Clinical/Firebase data is independent of this module.
window.PanchangEngine = {ready:false, loading:null, lib:null, observer:null, error:null};

window.PanchangEngine.loading = (async()=>{
  try{
    const lib = await import('https://cdn.jsdelivr.net/npm/@ishubhamx/panchangam-js@3.0.0/+esm');
    const observer = new lib.Observer(21.211605,81.659075,249);
    window.PanchangEngine.lib=lib;
    window.PanchangEngine.observer=observer;
    window.PanchangEngine.ready=true;
    return window.PanchangEngine;
  }catch(error){
    console.error('Panchang engine load failed',error);
    window.PanchangEngine.error=error;
    throw error;
  }
})();
