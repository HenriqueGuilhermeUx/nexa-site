const API='https://nexa-backend-p2u0.onrender.com/api/v1';
let tab='ops', data={};
const $=id=>document.getElementById(id);
const token=()=>localStorage.getItem('nexa_token')||'';
const setToken=t=>localStorage.setItem('nexa_token',t||'');
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=(v,d=2)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
async function call(path,opt={}){
  const r=await fetch(API+path,{...opt,headers:{'Content-Type':'application/json','Authorization':'Bearer '+token(),...(opt.headers||{})}});
  const txt=await r.text(); let j; try{j=JSON.parse(txt)}catch{j={raw:txt,status:r.status}}
  if(!r.ok) throw new Error(j.message||j.error||txt||('HTTP '+r.status));
  return j;
}
async function login(){
  try{
    $('status').textContent='Entrando...';
    const email=$('email').value.trim(), password=$('password').value;
    if(!email||!password){alert('Informe e-mail e senha');$('status').textContent='Informe e-mail e senha.';return}
    const r=await fetch(API+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const txt=await r.text(); let j; try{j=JSON.parse(txt)}catch{j={raw:txt}}
    if(!r.ok||!j.accessToken){throw new Error(j.message||j.error||txt||'Login falhou')}
    setToken(j.accessToken);
    $('status').textContent='Login OK. Carregando...';
    await refresh();
  }catch(e){$('status').textContent='Erro: '+e.message; alert(e.message)}
}
function logout(){setToken('');data={};$('status').textContent='Sessão encerrada';render()}
async function refresh(){
  try{
    $('status').textContent='Carregando...';
    const [ops,users,treasury,proof,dash,deposits,knowledge,playbooks]=await Promise.all([
      call('/admin/ops-center'),call('/admin/users'),call('/treasury-admin/dashboard'),
      call('/admin/proof-of-reserves'),call('/admin/dashboard'),call('/admin/deposits'),
      call('/admin/knowledge'),call('/admin/knowledge/playbooks')
    ]);
    data={ops,users,treasury,proof,dash,deposits,knowledge,playbooks};
    $('status').textContent='Painel carregado';
    render();
  }catch(e){$('status').textContent='Erro: '+e.message; $('content').innerHTML='<div class="card"><h3>Erro</h3><pre>'+esc(e.message)+'</pre></div>'}
}
function setTab(t){tab=t;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));render()}
function card(label,value,cls=''){return '<div class="card"><div class="muted">'+label+'</div><div class="kpi '+cls+'">'+value+'</div></div>'}
function render(){
  $('title').textContent={ops:'Operations',clientes:'Clientes',financeiro:'Financeiro',tesouraria:'Tesouraria',crm:'CRM / SmartBots',conhecimento:'Conhecimento',raw:'Debug'}[tab]||tab;
  if(!token()){ $('content').innerHTML='<div class="card"><h3>Faça login</h3><p class="muted">Use o mesmo e-mail/senha do admin Nexa.</p></div>'; return; }
  if(tab==='ops') return renderOps();
  if(tab==='clientes') return renderClientes();
  if(tab==='financeiro') return renderFinanceiro();
  if(tab==='tesouraria') return renderTesouraria();
  if(tab==='crm') return renderCrm();
  if(tab==='conhecimento') return renderConhecimento();
  $('content').innerHTML='<pre>'+esc(JSON.stringify(data,null,2))+'</pre>';
}
function renderOps(){
  const o=data.ops||{}, f=o.commercialFunnel||{}, t=o.treasury||{};
  $('content').innerHTML='<div class="grid">'+
    card('Status',esc(o.health?.status||'-'),o.health?.status==='ok'?'ok':'warn')+
    card('Alertas',esc(o.health?.alertsCount||0))+
    card('Clientes',esc(f.totalUsers||0))+
    card('USDC devido',n(t.liabilities?.clientUsdcLiability,8))+
    '</div><h3>Alertas</h3><div class="grid2">'+((o.alerts||[]).map(a=>'<div class="card"><b>'+esc(a.title)+'</b><p>'+esc(a.message)+'</p><p class="muted">'+esc(a.action)+'</p></div>').join('')||'<div class="card">Sem alertas críticos.</div>')+'</div>';
}
function renderClientes(){
  const rows=data.users||[];
  $('content').innerHTML='<div class="grid">'+card('Total',rows.length)+card('KYC aprovado',rows.filter(u=>u.kycStatus==='approved').length,'ok')+card('Wallet 0x',rows.filter(u=>String(u.walletAddress||'').startsWith('0x')).length)+card('Premium',rows.filter(u=>u.isPremium).length)+'</div>'+ '<div class="card"><table><thead><tr><th>Nome</th><th>Contato</th><th>KYC</th><th>Wallet</th><th>Ações</th></tr></thead><tbody>'+ rows.map(u=>'<tr><td><b>'+esc(u.fullName)+'</b><br><span class="muted">'+esc(u.cpfCnpj||u.cpf||'-')+' @'+esc(u.username||'-')+'</span></td><td>'+esc(u.email)+'<br>'+esc(u.phone||'-')+'</td><td>'+esc(u.kycStatus)+'</td><td>'+esc(u.walletAddress||'-')+'</td><td><button onclick="createWallet(\''+u.id+'\')">Wallet</button><button onclick="report(\''+u.id+'\')">Relatório</button><button onclick="delUser(\''+u.id+'\')">Excluir teste</button></td></tr>').join('')+ '</tbody></table></div>';
}
function renderFinanceiro(){
  const d=data.dash||{}, deps=data.deposits||[];
  $('content').innerHTML='<div class="grid">'+card('Pix In',brl(d.money?.pixInTotalBrl))+card('Pix Out',brl(d.money?.pixOutTotalBrl))+card('Net Pix',brl(d.money?.netPixBrl))+card('USDC clientes',n(d.money?.clientUsdcLiability,8))+'</div>'+ '<div class="card"><table><thead><tr><th>Data</th><th>User</th><th>BRL</th><th>USDC</th><th>Status</th></tr></thead><tbody>'+ deps.map(x=>'<tr><td>'+esc(x.createdAt)+'</td><td>'+esc(x.userId)+'</td><td>'+brl(x.amountBrl)+'</td><td>'+n(x.amountUsdc,8)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderTesouraria(){
  const t=data.treasury||{}, r=t.reserves||{}, l=t.liabilities||{}, q=t.purchaseQueue||{};
  $('content').innerHTML='<div class="grid">'+card('Treasury USDC',n(r.treasuryUsdc,8),'ok')+card('USDC devido',n(l.clientUsdcLiability,8))+card('Gap reserva',n(r.reserveGapUsdc,8),Number(r.reserveGapUsdc)>=0?'ok':'bad')+card('Fila compra',n(q.usdcToBuy,8))+'</div><div class="card"><button onclick="confirmPurchase()">Confirmar compra pendente</button></div><pre>'+esc(JSON.stringify({reserves:r,liabilities:l,queue:q},null,2))+'</pre>';
}
function renderCrm(){
  const ps=data.playbooks?.playbooks||[];
  $('content').innerHTML='<div class="grid2">'+ps.map(p=>'<div class="card"><h3>'+esc(p.id)+'</h3><p><b>Gatilho:</b> '+esc(p.trigger)+'</p><p>'+esc(p.message)+'</p><p class="muted">'+esc(p.goal)+'</p></div>').join('')+'</div>';
}
function renderConhecimento(){
  const items=data.knowledge?.items||[];
  $('content').innerHTML='<div class="grid2">'+items.map(i=>'<div class="card"><h3>'+esc(i.title)+'</h3><p>'+esc(i.summary)+'</p><p><b>Regra:</b> '+esc(i.rule)+'</p><details><summary>Condições</summary><ul>'+(i.conditions||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details><details><summary>Procedimento</summary><ol>'+(i.steps||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></details></div>').join('')+'</div>';
}
async function report(id){alert(JSON.stringify(await call('/admin/clients/'+id+'/report'),null,2).slice(0,4000))}
async function createWallet(id){if(confirm('Criar/sincronizar wallet?')){alert(JSON.stringify(await call('/admin/users/'+id+'/create-wallet',{method:'POST'}),null,2).slice(0,4000));refresh()}}
async function delUser(id){if(confirm('Excluir usuário de teste com hard=true?')){alert(JSON.stringify(await call('/admin/users/'+id+'?hard=true',{method:'DELETE'}),null,2).slice(0,4000));refresh()}}
async function confirmPurchase(){const purchasedUsdc=prompt('USDC comprado/reservado?'); if(!purchasedUsdc)return; const brlSpent=prompt('BRL gasto?'); alert(JSON.stringify(await call('/treasury-admin/purchases/confirm-all-pending',{method:'POST',body:JSON.stringify({purchasedUsdc:Number(purchasedUsdc),brlSpent:Number(brlSpent||0),provider:'manual_admin',note:'Confirmado pelo Admin'})}),null,2).slice(0,4000)); refresh()}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('refreshBtn').onclick=refresh;$('password').onkeydown=e=>{if(e.key==='Enter')login()};setTab('ops');if(token())refresh();});
