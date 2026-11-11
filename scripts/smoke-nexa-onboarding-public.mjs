// Read-only production smoke for the Nexa onboarding entry points.
// No account is created, no credentials are supplied, and no Didit session is started.
const ORIGIN='https://trynexa.com.br';
const ALIASES=['/login','/login/','/login.html','/portal.html'];
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function get(path) {
  const res=await fetch(ORIGIN+path,{
    method:'GET',redirect:'manual',
    headers:{'accept':'text/html','cache-control':'no-cache'},
    signal:AbortSignal.timeout(10000)
  });
  let snippet='';
  if(path==='/portal/' && res.ok) snippet=(await res.text()).slice(0,30000);
  return {status:res.status,location:res.headers.get('location')||'',snippet};
}
async function check() {
  const results=await Promise.all([...ALIASES,'/portal/'].map(get));
  const failures=[];
  ALIASES.forEach((path,i)=>{
    const item=results[i];
    if(![301,302,307,308].includes(item.status)) {
      failures.push(path+' is not a redirect ('+item.status+')');
      return;
    }
    let destination=null;
    try{destination=new URL(item.location,ORIGIN+path);}catch{}
    if(destination?.origin!==ORIGIN || destination?.pathname!=='/portal/')
      failures.push(path+' does not resolve to original-domain /portal/');
  });
  const portal=results.at(-1);
  if(portal.status!==200 || !/<div id=["']root["']/.test(portal.snippet) ||
     !/Nexa Wallet|NEXA/i.test(portal.snippet)){
    failures.push('/portal/ does not return the React entry point ('+portal.status+')');
  }
  return {ok:failures.length===0,failures,summary:results.map((r,i)=>({
    path:[...ALIASES,'/portal/'][i],status:r.status,
    destination:r.location?new URL(r.location,ORIGIN).pathname:''
  }))};
}
let result;
for(let attempt=1;attempt<=16;attempt++){
  try{result=await check();}catch(error){
    result={ok:false,failures:['Network/timeout: '+String(error?.name||'unknown')]};
  }
  if(result.ok){
    console.info('Nexa public onboarding smoke PASS',JSON.stringify(result.summary));
    process.exit(0);
  }
  console.warn('Nexa public onboarding smoke attempt '+attempt+' failed:',result.failures.join('; '));
  if(attempt<16)await sleep(20000);
}
console.error('BLOCKER: one or more Nexa public onboarding routes are not entering /portal/.');
process.exit(1);
