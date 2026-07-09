const API='https://nexa-backend-p2u0.onrender.com/api/v1';
let tab='ops', data={}, selectedClientId='';
const $=id=>document.getElementById(id);
const token=()=>localStorage.getItem('nexa_token')||'';
const setToken=t=>localStorage.setItem('nexa_token',t||'');
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=(v,d=2)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const digits=v=>String(v||'').replace(/\D/g,'');
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
    setToken(j.accessToken); $('status').textContent='Login OK. Carregando...'; await refresh();
  }catch(e){$('status').textContent='Erro: '+e.message; alert(e.message)}
}
function logout(){setToken('');data={};$('status').textContent='Sessão encerrada';render()}
async function refresh(){
  try{
    $('status').textContent='Carregando...';
    const [ops,users,treasury,clientsFull,proof,dash,deposits,knowledge,playbooks]=await Promise.all([
      call('/admin/ops-center'),call('/admin/users'),call('/treasury-admin/dashboard'),call('/treasury-admin/clients-full'),
      call('/admin/proof-of-reserves'),call('/admin/dashboard'),call('/admin/deposits'),call('/admin/knowledge'),call('/admin/knowledge/playbooks')
    ]);
    data={ops,users,treasury,clientsFull,proof,dash,deposits,knowledge,playbooks};
    $('status').textContent='Painel carregado'; render();
  }catch(e){$('status').textContent='Erro: '+e.message; $('content').innerHTML='<div class="card"><h3>Erro</h3><pre>'+esc(e.message)+'</pre></div>'}
}
function setTab(t){tab=t;document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));render()}
function card(label,value,cls=''){return '<div class="card"><div class="muted">'+label+'</div><div class="kpi '+cls+'">'+value+'</div></div>'}
function clients(){return data.clientsFull?.clients || data.users || []}
function clientById(id){return clients().find(c=>c.id===id)||{} }
function depositsByUser(id){return (data.deposits||[]).filter(d=>d.userId===id)}
function hasDeposit(id){return depositsByUser(id).some(d=>String(d.status).toLowerCase()==='completed')}
function hasPendingPix(id){return depositsByUser(id).some(d=>String(d.status).toLowerCase()==='pending')}
function balanceUsdc(c){return Number(c.balances?.USDC ?? c.availableBalanceUsdc ?? 0)}
function playbookMessage(kind,c={}){
  const name=(c.fullName||'cliente').split(' ')[0];
  const map={
    signup:'Olá, '+name+'! Vi que sua conta Nexa já foi criada. Posso te ajudar a fazer o primeiro Pix e receber saldo em USDC?',
    pendingPix:'Olá, '+name+'! Seu Pix Nexa foi gerado, mas ainda não identificamos o pagamento. Quer ajuda para concluir?',
    firstDeposit:'Olá, '+name+'! Seu depósito foi confirmado e seu saldo já está em USDC na Nexa. Posso te mostrar como usar transferência por @user, Premium ou Rewards?',
    premium:'Olá, '+name+'! Com Nexa Premium você libera PAXG e WBTC, taxa reduzida e atendimento prioritário. Quer conhecer?',
    kyc:'Olá, '+name+'! Para liberar todos os recursos da Nexa, conclua sua verificação de identidade. É rápido e aumenta sua segurança.',
    treasury:'Alerta interno Nexa: há USDC a comprar/reservar para manter o lastro dos clientes.'
  };
  return map[kind]||map.signup;
}
function segment(kind){
  const cs=clients();
  if(kind==='signup') return cs.filter(c=>c.isActive && !hasDeposit(c.id));
  if(kind==='pendingPix') return cs.filter(c=>hasPendingPix(c.id));
  if(kind==='firstDeposit') return cs.filter(c=>hasDeposit(c.id));
  if(kind==='premium') return cs.filter(c=>balanceUsdc(c)>0 && !c.isPremium);
  if(kind==='kyc') return cs.filter(c=>c.kycStatus==='pending');
  return cs;
}
function render(){
  $('title').textContent={ops:'Operations',clientes:'Clientes',financeiro:'Financeiro',tesouraria:'Tesouraria',crm:'CRM / SmartBots',conhecimento:'Conhecimento',raw:'Debug'}[tab]||tab;
  if(!token()){ $('content').innerHTML='<div class="card"><h3>Faça login</h3><p class="muted">Use o mesmo e-mail/senha do admin Nexa.</p></div>'; return; }
  if(tab==='ops') return renderOps(); if(tab==='clientes') return renderClientes(); if(tab==='financeiro') return renderFinanceiro(); if(tab==='tesouraria') return renderTesouraria(); if(tab==='crm') return renderCrm(); if(tab==='conhecimento') return renderConhecimento(); $('content').innerHTML='<pre>'+esc(JSON.stringify(data,null,2))+'</pre>';
}
function renderOps(){
  const o=data.ops||{}, f=o.commercialFunnel||{}, t=o.treasury||{};
  $('content').innerHTML='<div class="grid">'+card('Status',esc(o.health?.status||'-'),o.health?.status==='ok'?'ok':'warn')+card('Alertas',esc(o.health?.alertsCount||0))+card('Clientes',esc(f.totalUsers||0))+card('USDC clientes',n(t.liabilities?.clientUsdcLiability,8))+'</div><h3>Alertas Operacionais</h3><div class="grid2">'+((o.alerts||[]).map(a=>'<div class="card"><b>'+esc(a.title)+'</b><p>'+esc(a.message)+'</p><p class="muted">'+esc(a.action)+'</p><button onclick="setTab(\'tesouraria\')">Abrir área</button></div>').join('')||'<div class="card">Sem alertas críticos.</div>')+'</div>';
}
function renderClientes(){
  const rows=clients();
  $('content').innerHTML='<div class="grid">'+card('Total',rows.length)+card('KYC aprovado',rows.filter(u=>u.kycStatus==='approved').length,'ok')+card('Wallet 0x',rows.filter(u=>String(u.walletAddress||'').startsWith('0x')).length)+card('Premium',rows.filter(u=>u.isPremium).length)+'</div><div class="card"><table><thead><tr><th>Nome</th><th>Contato</th><th>KYC</th><th>Saldo</th><th>Wallet</th><th>Ações</th></tr></thead><tbody>'+rows.map(u=>'<tr><td><b>'+esc(u.fullName)+'</b><br><span class="muted">'+esc(u.cpfCnpj||u.cpf||'-')+' @'+esc(u.username||'-')+'</span></td><td>'+esc(u.email)+'<br>'+esc(u.phone||'-')+'</td><td>'+esc(u.kycStatus)+'</td><td>'+n(balanceUsdc(u),8)+' USDC<br><span class="muted">'+brl(u.balances?.BRL||0)+'</span></td><td>'+esc(u.walletAddress||'-')+'</td><td><button onclick="openClientCrm(\''+u.id+'\')">CRM</button><button onclick="createWallet(\''+u.id+'\')">Wallet</button><button onclick="report(\''+u.id+'\')">Relatório</button><button onclick="delUser(\''+u.id+'\')">Excluir teste</button></td></tr>').join('')+'</tbody></table></div>';
}
function renderFinanceiro(){
  const d=data.dash||{}, deps=data.deposits||[];
  $('content').innerHTML='<div class="grid">'+card('Pix In',brl(d.money?.pixInTotalBrl))+card('Pix Out',brl(d.money?.pixOutTotalBrl))+card('Net Pix',brl(d.money?.netPixBrl))+card('USDC clientes',n(data.treasury?.liabilities?.clientUsdcLiability ?? d.money?.clientUsdcLiability,8))+'</div><div class="card"><table><thead><tr><th>Data</th><th>User</th><th>BRL</th><th>USDC</th><th>Status</th></tr></thead><tbody>'+deps.map(x=>'<tr><td>'+esc(x.createdAt)+'</td><td>'+esc(x.userId)+'</td><td>'+brl(x.amountBrl)+'</td><td>'+n(x.amountUsdc,8)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderTesouraria(){
  const t=data.treasury||{}, r=t.reserves||{}, l=t.liabilities||{}, q=t.purchaseQueue||{}, breakdown=l.breakdown||[];
  const status=Number(r.reserveGapUsdc)>=0?'ok':'bad';
  $('content').innerHTML='<div class="grid">'+card('Treasury USDC',n(r.treasuryUsdc,8),'ok')+card('USDC clientes',n(l.clientUsdcLiability,8))+card('Gap clientes',n(r.reserveGapUsdc,8),status)+card('Fila compra',n(q.usdcToBuy,8))+'</div><div class="card"><p><b>Resumo:</b> fila de compra '+n(q.usdcToBuy,8)+' USDC. O número de clientes exclui admin, usuários teste/app e bloqueados.</p><p class="muted">Contábil bruto: '+n(l.accountingUsdcLiability,8)+' USDC · Excluído admin/testes: '+n(l.excludedAdminOrTestUsdc,8)+' USDC</p><button onclick="confirmPurchase()">Confirmar compra pendente</button></div><h3>Breakdown por cliente/saldo</h3><div class="card"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>USDC</th><th>BRL</th><th>KYC</th></tr></thead><tbody>'+breakdown.map(b=>'<tr><td><b>'+esc(b.fullName)+'</b><br><span class="muted">'+esc(b.email)+'</span></td><td>'+(b.isClientLiability?'Cliente':'Admin/teste/auditoria')+'</td><td>'+n(b.balances?.USDC,8)+'</td><td>'+brl(b.balances?.BRL)+'</td><td>'+esc(b.kycStatus)+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderCrm(){
  const all=clients(); const chosen=selectedClientId?clientById(selectedClientId):null;
  const options=all.map(c=>'<option value="'+c.id+'" '+(c.id===selectedClientId?'selected':'')+'>'+esc(c.fullName||c.email)+' · '+esc(c.phone||'sem telefone')+'</option>').join('');
  $('content').innerHTML='<div class="card"><h3>Enviar Para</h3><select id="crmClient" style="width:100%;padding:10px;border-radius:10px;background:#081827;color:white;border:1px solid #1d3858"><option value="">Escolha um cliente...</option>'+options+'</select><div id="crmOne" style="margin-top:10px"></div></div><div class="grid2">'+crmSegmentCard('signup','Cadastro sem depósito')+crmSegmentCard('pendingPix','Pix pendente')+crmSegmentCard('firstDeposit','Primeiro depósito / ativação')+crmSegmentCard('premium','Saldo USDC sem Premium')+crmSegmentCard('kyc','KYC pendente')+'</div>';
  $('crmClient').onchange=e=>{selectedClientId=e.target.value;renderCrm()};
  if(chosen) $('crmOne').innerHTML=clientComms(chosen,'signup');
}
function crmSegmentCard(kind,title){const list=segment(kind);return '<div class="card"><h3>'+title+'</h3><p class="muted">'+list.length+' cliente(s) nesta situação.</p><div style="max-height:220px;overflow:auto">'+(list.map(c=>'<div style="border-top:1px solid #1d3858;padding:8px 0"><b>'+esc(c.fullName||c.email)+'</b><br><span class="muted">'+esc(c.email)+' · '+esc(c.phone||'sem telefone')+'</span><br>'+clientButtons(c,kind)+'</div>').join('')||'<span class="muted">Nenhum cliente agora.</span>')+'</div></div>'}
function clientComms(c,kind){return '<h4>'+esc(c.fullName||c.email)+'</h4><p class="muted">Últimas comunicações: em breve vamos gravar histórico no backend. Por enquanto, use os botões abaixo e registre no CRM.</p>'+clientButtons(c,kind)+'<pre>'+esc(playbookMessage(kind,c))+'</pre>'}
function clientButtons(c,kind){return '<button onclick="copyMsg(\''+c.id+'\',\''+kind+'\')">Copiar msg</button><button onclick="sendWhats(\''+c.id+'\',\''+kind+'\')">WhatsApp</button><button onclick="sendEmail(\''+c.id+'\',\''+kind+'\')">E-mail</button><button onclick="fakeInApp(\''+c.id+'\',\''+kind+'\')">Área logada</button>'}
async function copyMsg(id,kind){const c=clientById(id), msg=playbookMessage(kind,c); await navigator.clipboard.writeText(msg); alert('Mensagem copiada.');}
function sendWhats(id,kind){const c=clientById(id), phone=digits(c.phone); if(!phone){alert('Cliente sem telefone cadastrado.');return} window.open('https://wa.me/55'+phone.replace(/^55/,'')+'?text='+encodeURIComponent(playbookMessage(kind,c)),'_blank')}
function sendEmail(id,kind){const c=clientById(id); if(!c.email){alert('Cliente sem e-mail.');return} location.href='mailto:'+c.email+'?subject='+encodeURIComponent('Nexa')+'&body='+encodeURIComponent(playbookMessage(kind,c))}
function fakeInApp(id,kind){copyMsg(id,kind); alert('Mensagem pronta para área logada. Próximo passo técnico: criar endpoint de notificações in-app para gravar e exibir no app.')}
function openClientCrm(id){selectedClientId=id;setTab('crm')}
function renderConhecimento(){const items=data.knowledge?.items||[];$('content').innerHTML='<div class="grid2">'+items.map(i=>'<div class="card"><h3>'+esc(i.title)+'</h3><p>'+esc(i.summary)+'</p><p><b>Regra:</b> '+esc(i.rule)+'</p><details><summary>Condições</summary><ul>'+(i.conditions||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details><details><summary>Procedimento</summary><ol>'+(i.steps||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></details></div>').join('')+'</div>'}
async function report(id){alert(JSON.stringify(await call('/admin/clients/'+id+'/report'),null,2).slice(0,4000))}
async function createWallet(id){if(confirm('Criar/sincronizar wallet?')){alert(JSON.stringify(await call('/admin/users/'+id+'/create-wallet',{method:'POST'}),null,2).slice(0,4000));refresh()}}
async function delUser(id){if(confirm('Excluir usuário de teste com hard=true?')){alert(JSON.stringify(await call('/admin/users/'+id+'?hard=true',{method:'DELETE'}),null,2).slice(0,4000));refresh()}}
async function confirmPurchase(){const purchasedUsdc=prompt('USDC comprado/reservado?'); if(!purchasedUsdc)return; const brlSpent=prompt('BRL gasto?'); alert(JSON.stringify(await call('/treasury-admin/purchases/confirm-all-pending',{method:'POST',body:JSON.stringify({purchasedUsdc:Number(purchasedUsdc),brlSpent:Number(brlSpent||0),provider:'manual_admin',note:'Confirmado pelo Admin'})}),null,2).slice(0,4000)); refresh()}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('refreshBtn').onclick=refresh;$('password').onkeydown=e=>{if(e.key==='Enter')login()};setTab('ops');if(token())refresh();});
