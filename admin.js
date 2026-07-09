const API='https://nexa-backend-p2u0.onrender.com/api/v1';
let tab='ops', data={}, selectedClientId='', selectedKind='signup';
const $=id=>document.getElementById(id);
const token=()=>localStorage.getItem('nexa_token')||'';
const setToken=t=>localStorage.setItem('nexa_token',t||'');
const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const n=(v,d=2)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
const brl=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const digits=v=>String(v||'').replace(/\D/g,'');
const short=v=>{v=String(v||'-');return v.length>18?v.slice(0,8)+'...'+v.slice(-6):v};
const pill=(v,t='')=>'<span class="pill '+t+'">'+esc(v||'-')+'</span>';
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
    const [ops,users,treasury,clientsFull,proof,dash,deposits,knowledge,playbooks]=await Promise.allSettled([
      call('/admin/ops-center'),call('/admin/users'),call('/treasury-admin/dashboard'),call('/treasury-admin/clients-full'),
      call('/admin/proof-of-reserves'),call('/admin/dashboard'),call('/admin/deposits'),call('/admin/knowledge'),call('/admin/knowledge/playbooks')
    ]);
    const val=x=>x.status==='fulfilled'?x.value:null;
    data={ops:val(ops)||{},users:val(users)||[],treasury:val(treasury)||{},clientsFull:val(clientsFull)||{},proof:val(proof)||{},dash:val(dash)||{},deposits:val(deposits)||[],knowledge:val(knowledge)||{},playbooks:val(playbooks)||{}};
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
function isRealClient(c){const e=String(c.email||'').toLowerCase(), nme=String(c.fullName||'').toLowerCase();return c.isActive!==false&&!c.isBlocked&&!e.includes('test')&&!e.includes('teste')&&!nme.includes('test')&&!nme.includes('teste')&&e!=='app@nexa.com'}
function playbookMessage(kind,c={}){
  const name=(c.fullName||'cliente').split(' ')[0];
  const map={
    signup:'Olá, '+name+'! Vi que sua conta Nexa já foi criada. Posso te ajudar a fazer o primeiro Pix e receber saldo em USDC?',
    pendingPix:'Olá, '+name+'! Seu Pix Nexa foi gerado, mas ainda não identificamos o pagamento. Quer ajuda para concluir?',
    firstDeposit:'Olá, '+name+'! Seu depósito foi confirmado e seu saldo já está em USDC na Nexa. Posso te mostrar como usar transferência por @user, Premium ou Rewards?',
    premium:'Olá, '+name+'! Com Nexa Premium você libera PAXG e WBTC, taxa reduzida e atendimento prioritário. Quer conhecer?',
    kyc:'Olá, '+name+'! Para liberar todos os recursos da Nexa, conclua sua verificação de identidade. É rápido e aumenta sua segurança.',
    treasury:'Alerta interno Nexa: há USDC a comprar/reservar para manter o lastro dos clientes.',
    generic:'Olá, '+name+'! Aqui é a Nexa. Posso te ajudar com sua conta?'
  };
  return map[kind]||map.generic;
}
function segment(kind){
  const cs=clients().filter(isRealClient);
  if(kind==='signup') return cs.filter(c=>!hasDeposit(c.id));
  if(kind==='pendingPix') return cs.filter(c=>hasPendingPix(c.id));
  if(kind==='firstDeposit') return cs.filter(c=>hasDeposit(c.id));
  if(kind==='premium') return cs.filter(c=>balanceUsdc(c)>0 && !c.isPremium);
  if(kind==='kyc') return cs.filter(c=>String(c.kycStatus).toLowerCase()==='pending');
  return cs;
}
function render(){
  $('title').textContent={ops:'Operations',clientes:'Clientes',financeiro:'Financeiro',tesouraria:'Tesouraria',crm:'CRM / SmartBots',conhecimento:'Conhecimento',raw:'Debug'}[tab]||tab;
  if(!token()){ $('content').innerHTML='<div class="card"><h3>Faça login</h3><p class="muted">Use o mesmo e-mail/senha do admin Nexa.</p></div>'; return; }
  if(tab==='ops') return renderOps(); if(tab==='clientes') return renderClientes(); if(tab==='financeiro') return renderFinanceiro(); if(tab==='tesouraria') return renderTesouraria(); if(tab==='crm') return renderCrm(); if(tab==='conhecimento') return renderConhecimento(); $('content').innerHTML='<pre>'+esc(JSON.stringify(data,null,2))+'</pre>';
}
function renderOps(){
  const o=data.ops||{}, f=o.commercialFunnel||{}, t=o.treasury||{}, r=t.reserves||{}, q=t.purchaseQueue||{};
  const gap=Number(r.reserveGapUsdc||0), queue=Number(q.usdcToBuy||0);
  const msg=gap<0&&queue===0?'Gap contábil: não é fila de compra. Abra Tesouraria para ver de qual cliente/saldo vem.':(gap<0?'Gap de reserva com compra pendente.':'Reservas OK.');
  $('content').innerHTML='<div class="grid">'+card('Status',esc(o.health?.status||'-'),o.health?.status==='ok'?'ok':'warn')+card('Fila compra',n(queue,8))+card('Clientes',esc(f.totalUsers||clients().length))+card('Gap reserva',n(gap,8),gap>=0?'ok':'bad')+'</div><div class="card notice"><b>'+esc(msg)+'</b><p class="muted">O anexo/print mostra Tesouraria: Treasury USDC é o saldo real on-chain; USDC devido vem do ledger interno; Gap é a diferença. Se fila compra = 0 e gap negativo, é conciliação/lançamento legado, não compra automática nova.</p><button onclick="setTab(\'tesouraria\')">Ver origem do gap</button></div><h3>Alertas Operacionais</h3><div class="grid2">'+((o.alerts||[]).map(a=>'<div class="card"><b>'+esc(a.title)+'</b><p>'+esc(a.message)+'</p><p class="muted">'+esc(a.action)+'</p><button onclick="setTab(\''+(a.area==='kyc'?'crm':'tesouraria')+'\')">Abrir área</button></div>').join('')||'<div class="card">Sem alertas críticos.</div>')+'</div>';
}
function renderClientes(){
  const rows=clients();
  $('content').innerHTML='<div class="grid">'+card('Total',rows.length)+card('KYC aprovado',rows.filter(u=>u.kycStatus==='approved').length,'ok')+card('Wallet 0x',rows.filter(u=>String(u.walletAddress||'').startsWith('0x')).length)+card('Premium',rows.filter(u=>u.isPremium).length)+'</div><div class="card"><table><thead><tr><th>Nome</th><th>Contato</th><th>KYC</th><th>Saldo</th><th>Wallet</th><th>Ações</th></tr></thead><tbody>'+rows.map(u=>'<tr><td><b>'+esc(u.fullName)+'</b><br><span class="muted">'+esc(u.cpfCnpj||u.cpf||'-')+' @'+esc(u.username||'-')+'</span></td><td>'+esc(u.email)+'<br>'+esc(u.phone||'-')+'</td><td>'+pill(u.kycStatus,u.kycStatus==='approved'?'green':'yellow')+'</td><td>'+n(balanceUsdc(u),8)+' USDC<br><span class="muted">'+brl(u.balances?.BRL||0)+'</span></td><td>'+esc(short(u.walletAddress||'-'))+'</td><td><button class="green" onclick="openClientCrm(\''+u.id+'\')">CRM</button><button onclick="createWallet(\''+u.id+'\')">Wallet</button><button onclick="report(\''+u.id+'\')">Relatório</button><button class="red" onclick="delUser(\''+u.id+'\')">Excluir teste</button></td></tr>').join('')+'</tbody></table></div>';
}
function renderFinanceiro(){
  const d=data.dash||{}, deps=data.deposits||[];
  $('content').innerHTML='<div class="grid">'+card('Pix In',brl(d.money?.pixInTotalBrl))+card('Pix Out',brl(d.money?.pixOutTotalBrl))+card('Net Pix',brl(d.money?.netPixBrl))+card('USDC clientes',n(data.treasury?.liabilities?.clientUsdcLiability ?? d.money?.clientUsdcLiability,8))+'</div><div class="card"><table><thead><tr><th>Data</th><th>User</th><th>BRL</th><th>USDC</th><th>Status</th></tr></thead><tbody>'+deps.map(x=>'<tr><td>'+esc(x.createdAt)+'</td><td>'+esc(x.userId)+'</td><td>'+brl(x.amountBrl)+'</td><td>'+n(x.amountUsdc,8)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderTesouraria(){
  const t=data.treasury||{}, r=t.reserves||{}, l=t.liabilities||{}, q=t.purchaseQueue||{}, breakdown=l.breakdown||[];
  const gap=Number(r.reserveGapUsdc||0), queue=Number(q.usdcToBuy||0);
  const box=gap<0&&queue===0?'<div class="card notice"><b>Gap negativo, mas fila de compra zerada.</b><p>Isso normalmente significa saldo legado, ajuste manual ou cliente/teste entrando na liability. Use o breakdown abaixo para achar a origem antes de comprar mais USDC.</p></div>':gap<0?'<div class="card critical"><b>Há compra/lastro pendente.</b><p>Com fila positiva, compre/reserve USDC ou bloqueie saques externos até regularizar.</p></div>':'<div class="card goodbox"><b>Reserva operacional OK.</b></div>';
  $('content').innerHTML='<div class="grid">'+card('Treasury USDC',n(r.treasuryUsdc,8),'ok')+card('USDC clientes',n(l.clientUsdcLiability,8))+card('Gap clientes',n(gap,8),gap>=0?'ok':'bad')+card('Fila compra',n(queue,8))+'</div>'+box+'<div class="card"><p><b>Como ler:</b> Treasury USDC = MetaMask/Alchemy real. USDC clientes = soma do ledger dos clientes reais. Gap = Treasury - Clientes.</p><p class="muted">Contábil bruto: '+n(l.accountingUsdcLiability,8)+' USDC · Excluído admin/testes: '+n(l.excludedAdminOrTestUsdc,8)+' USDC · '+esc(l.explanation||'')+'</p><button onclick="confirmPurchase()">Confirmar compra pendente</button></div><h3>Origem do saldo / breakdown</h3><div class="card scroll"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>USDC</th><th>BRL</th><th>KYC</th><th>Ação</th></tr></thead><tbody>'+breakdown.map(b=>'<tr><td><b>'+esc(b.fullName)+'</b><br><span class="muted">'+esc(b.email)+'</span></td><td>'+(b.isClientLiability?pill('Cliente','green'):pill('Admin/teste/auditoria','yellow'))+'</td><td>'+n(b.balances?.USDC,8)+'</td><td>'+brl(b.balances?.BRL)+'</td><td>'+esc(b.kycStatus)+'</td><td><button onclick="openClientCrm(\''+b.userId+'\')">CRM</button></td></tr>').join('')+'</tbody></table></div>';
}
function renderCrm(){
  const all=clients().filter(isRealClient); const chosen=selectedClientId?clientById(selectedClientId):null;
  const options=all.map(c=>'<option value="'+c.id+'" '+(c.id===selectedClientId?'selected':'')+'>'+esc(c.fullName||c.email)+' · '+esc(c.phone||'sem telefone')+'</option>').join('');
  $('content').innerHTML='<div class="card"><h3>Enviar Para</h3><select id="crmClient"><option value="">Escolha um cliente...</option>'+options+'</select><select id="crmKind"><option value="signup">Cadastro sem depósito</option><option value="pendingPix">Pix pendente</option><option value="firstDeposit">Ativação pós-depósito</option><option value="premium">Premium</option><option value="kyc">KYC pendente</option><option value="generic">Mensagem geral</option></select><div id="crmOne" style="margin-top:10px"></div></div><h3>Listas prontas por situação</h3><div class="grid2">'+crmSegmentCard('signup','Cadastro sem depósito')+crmSegmentCard('pendingPix','Pix pendente')+crmSegmentCard('firstDeposit','Cliente com depósito')+crmSegmentCard('premium','Saldo USDC sem Premium')+crmSegmentCard('kyc','KYC pendente')+'</div>';
  $('crmClient').onchange=e=>{selectedClientId=e.target.value;renderCrm()}; $('crmKind').value=selectedKind; $('crmKind').onchange=e=>{selectedKind=e.target.value;renderCrm()};
  if(chosen) $('crmOne').innerHTML=clientComms(chosen,selectedKind);
}
function crmSegmentCard(kind,title){const list=segment(kind);return '<div class="card"><h3>'+title+'</h3><p class="muted">'+list.length+' cliente(s) nesta situação.</p><div class="scroll">'+(list.map(c=>'<div class="rowline"><b>'+esc(c.fullName||c.email)+'</b><br><span class="muted small">'+esc(c.email)+' · '+esc(c.phone||'sem telefone')+'</span><br>'+clientButtons(c,kind)+'</div>').join('')||'<span class="muted">Nenhum cliente agora.</span>')+'</div></div>'}
function clientComms(c,kind){return '<h4>'+esc(c.fullName||c.email)+'</h4><p class="muted">Últimas comunicações: ainda não há histórico gravado. As ações abaixo já deixam a mensagem pronta para WhatsApp/e-mail/cópia. O próximo passo técnico é criar armazenamento de comunicação in-app.</p><textarea id="crmMsg" rows="5">'+esc(playbookMessage(kind,c))+'</textarea>'+clientButtons(c,kind,true)}
function clientButtons(c,kind,fromTextarea=false){return '<button onclick="copyMsg(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">Copiar msg</button><button class="green" onclick="sendWhats(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">Enviar WhatsApp</button><button onclick="sendEmail(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">Enviar e-mail</button><button class="yellow" onclick="fakeInApp(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">Área logada Nexa</button>'}
function msgFor(id,kind,fromTextarea){return fromTextarea&&$('crmMsg')?$('crmMsg').value:playbookMessage(kind,clientById(id))}
async function copyMsg(id,kind,fromTextarea=false){await navigator.clipboard.writeText(msgFor(id,kind,fromTextarea)); alert('Mensagem copiada.');}
function sendWhats(id,kind,fromTextarea=false){const c=clientById(id), phone=digits(c.phone); if(!phone){alert('Cliente sem telefone cadastrado.');return} window.open('https://wa.me/55'+phone.replace(/^55/,'')+'?text='+encodeURIComponent(msgFor(id,kind,fromTextarea)),'_blank')}
function sendEmail(id,kind,fromTextarea=false){const c=clientById(id); if(!c.email){alert('Cliente sem e-mail.');return} location.href='mailto:'+c.email+'?subject='+encodeURIComponent('Nexa')+'&body='+encodeURIComponent(msgFor(id,kind,fromTextarea))}
function fakeInApp(id,kind,fromTextarea=false){copyMsg(id,kind,fromTextarea); alert('Mensagem copiada para área logada. Para envio real dentro do app, vamos criar endpoint de notificações in-app no backend.');}
function openClientCrm(id){selectedClientId=id;selectedKind='generic';setTab('crm')}
function renderConhecimento(){const items=data.knowledge?.items||[];$('content').innerHTML='<div class="grid2">'+items.map(i=>'<div class="card"><h3>'+esc(i.title)+'</h3><p>'+esc(i.summary)+'</p><p><b>Regra:</b> '+esc(i.rule)+'</p><details><summary>Condições</summary><ul>'+(i.conditions||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></details><details><summary>Procedimento</summary><ol>'+(i.steps||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></details></div>').join('')+'</div>'}
async function report(id){alert(JSON.stringify(await call('/admin/clients/'+id+'/report'),null,2).slice(0,4000))}
async function createWallet(id){if(confirm('Criar/sincronizar wallet?')){alert(JSON.stringify(await call('/admin/users/'+id+'/create-wallet',{method:'POST'}),null,2).slice(0,4000));refresh()}}
async function delUser(id){if(confirm('Excluir usuário de teste com hard=true?')){alert(JSON.stringify(await call('/admin/users/'+id+'?hard=true',{method:'DELETE'}),null,2).slice(0,4000));refresh()}}
async function confirmPurchase(){const purchasedUsdc=prompt('USDC comprado/reservado?'); if(!purchasedUsdc)return; const brlSpent=prompt('BRL gasto?'); alert(JSON.stringify(await call('/treasury-admin/purchases/confirm-all-pending',{method:'POST',body:JSON.stringify({purchasedUsdc:Number(purchasedUsdc),brlSpent:Number(brlSpent||0),provider:'manual_admin',note:'Confirmado pelo Admin'})}),null,2).slice(0,4000)); refresh()}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('refreshBtn').onclick=refresh;$('password').onkeydown=e=>{if(e.key==='Enter')login()};setTab('ops');if(token())refresh();});
