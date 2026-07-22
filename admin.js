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
    const accessToken=j.accessToken||j.access_token||j.token;
    if(!r.ok||!accessToken){throw new Error(j.message||j.error||txt||'Login falhou')}
    setToken(accessToken); $('status').textContent='Login OK. Carregando...'; await refresh();
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
    data={ops:val(ops)||{},users:val(users)||[],treasury:val(treasury)||{},clientsFull:val(clientsFull)||{},proof:val(proof)||{},dash:val(dash)||{},deposits:val(deposits)||[],knowledge:val(knowledge)||{},playbooks:val(playbooks)||{},ledgerBalances:{}};
    const rows=clients();
    await Promise.all(rows.map(async c=>{
      try{const b=await call('/ledger/balance?userId='+encodeURIComponent(c.id)+'&mode=real');data.ledgerBalances[c.id]=b.balances||{}}
      catch(e){data.ledgerBalances[c.id]={error:e.message}}
    }));
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
function ledgerOf(c){return data.ledgerBalances?.[c.id]||{}}
function balanceUsdc(c){const b=ledgerOf(c);return Number(b.USDC ?? c.balances?.USDC ?? c.availableBalanceUsdc ?? 0)}
function cacheUsdc(c){return Number(c.availableBalanceUsdc||0)}
function isRealClient(c){const e=String(c.email||'').toLowerCase(), nme=String(c.fullName||'').toLowerCase();return c.isActive!==false&&!c.isBlocked&&!e.includes('test')&&!e.includes('teste')&&!nme.includes('test')&&!nme.includes('teste')&&e!=='app@nexa.com'}
function payments(){return data.dash?.latest?.payments||[]}
function playbookMessage(kind,c={}){
  const name=(c.fullName||'cliente').split(' ')[0];
  const map={signup:'Olá, '+name+'! Vi que sua conta Nexa já foi criada. Posso te ajudar a fazer o primeiro Pix e receber saldo em USDC?',pendingPix:'Olá, '+name+'! Seu Pix Nexa foi gerado, mas ainda não identificamos o pagamento. Quer ajuda para concluir?',firstDeposit:'Olá, '+name+'! Seu depósito foi confirmado e seu saldo já está em USDC na Nexa. Posso te mostrar como usar transferência por @user, Premium ou Rewards?',premium:'Olá, '+name+'! Com Nexa Premium você libera PAXG e WBTC, taxa reduzida e atendimento prioritário. Quer conhecer?',kyc:'Olá, '+name+'! Para liberar todos os recursos da Nexa, conclua sua verificação de identidade. É rápido e aumenta sua segurança.',treasury:'Alerta interno Nexa: há USDC a comprar/reservar para manter o lastro dos clientes.',generic:'Olá, '+name+'! Aqui é a Nexa. Posso te ajudar com sua conta?'};
  return map[kind]||map.generic;
}
function segment(kind){const cs=clients().filter(isRealClient);if(kind==='signup')return cs.filter(c=>!hasDeposit(c.id));if(kind==='pendingPix')return cs.filter(c=>hasPendingPix(c.id));if(kind==='firstDeposit')return cs.filter(c=>hasDeposit(c.id));if(kind==='premium')return cs.filter(c=>balanceUsdc(c)>0&&!c.isPremium);if(kind==='kyc')return cs.filter(c=>String(c.kycStatus).toLowerCase()==='pending');return cs}
function render(){
  $('title').textContent={ops:'Operations',clientes:'Clientes',financeiro:'Financeiro / Pix',tesouraria:'Tesouraria',custodia:'Custódia Inteligente',crm:'CRM / SmartBots',conhecimento:'Conhecimento',raw:'Debug'}[tab]||tab;
  if(!token()){$('content').innerHTML='<div class="card"><h3>Faça login</h3><p class="muted">Use o mesmo e-mail/senha do admin Nexa.</p></div>';return}
  if(tab==='ops')return renderOps();if(tab==='clientes')return renderClientes();if(tab==='financeiro')return renderFinanceiro();if(tab==='tesouraria')return renderTesouraria();if(tab==='crm')return renderCrm();if(tab==='conhecimento')return renderConhecimento();if(tab==='custodia'&&typeof window.renderCustodyAdmin==='function')return window.renderCustodyAdmin(data);$('content').innerHTML='<pre>'+esc(JSON.stringify(data,null,2))+'</pre>';
}
function renderOps(){
  const o=data.ops||{},f=o.commercialFunnel||{},t=o.treasury||{},r=t.reserves||{},q=t.purchaseQueue||{};const gap=Number(r.reserveGapUsdc||0),queue=Number(q.usdcToBuy||0),open=payments().filter(p=>['pending','processing'].includes(String(p.status).toLowerCase())).length;
  $('content').innerHTML='<div class="grid">'+card('Status',esc(o.health?.status||'-'),o.health?.status==='ok'?'ok':'warn')+card('Fila compra',n(queue,8))+card('Clientes',esc(f.totalUsers||clients().length))+card('Pix Out abertos',open,open?'warn':'ok')+'</div><div class="card notice"><b>Automação Pix Out</b><p>Pedidos pending/processing são conciliados com a Woovi. Falha confirmada devolve a reserva automaticamente; pagamento confirmado encerra sem novo débito.</p><button class="green" onclick="reconcileAll()">Reconciliar agora</button><button onclick="setTab(\'financeiro\')">Abrir Pix Out</button></div>';
}
function renderClientes(){
  const rows=clients();
  $('content').innerHTML='<div class="grid">'+card('Total',rows.length)+card('KYC aprovado',rows.filter(u=>u.kycStatus==='approved').length,'ok')+card('Divergências',rows.filter(u=>Math.abs(balanceUsdc(u)-cacheUsdc(u))>=0.00000001).length,'warn')+card('Premium',rows.filter(u=>u.isPremium).length)+'</div><div class="card notice"><b>Regra:</b> Ledger real é o saldo oficial. Para correções históricas use somente “Definir saldo correto”.</div><div class="card scroll"><table><thead><tr><th>Nome</th><th>Contato</th><th>KYC</th><th>Ledger</th><th>Cache</th><th>Ações</th></tr></thead><tbody>'+rows.map(u=>{const ledger=balanceUsdc(u),cache=cacheUsdc(u),diff=Math.abs(ledger-cache)>=0.00000001,b=ledgerOf(u);return '<tr><td><b>'+esc(u.fullName)+'</b><br><span class="muted">'+esc(u.cpfCnpj||u.cpf||'-')+' @'+esc(u.username||'-')+'</span></td><td>'+esc(u.email)+'<br>'+esc(u.phone||'-')+'</td><td>'+pill(u.kycStatus,u.kycStatus==='approved'?'green':'yellow')+'</td><td><b>'+n(ledger,8)+' USDC</b><br><span class="muted">'+brl(b.BRL||u.balances?.BRL||0)+'</span></td><td>'+n(cache,8)+' USDC<br>'+(diff?pill('DIVERGENTE','red'):pill('OK','green'))+'</td><td><button class="yellow" onclick="setUsdcTarget(\''+u.id+'\',\''+esc(u.fullName||u.email||u.id)+'\')">Definir saldo correto</button><button class="green" onclick="openClientCrm(\''+u.id+'\')">CRM</button><button onclick="report(\''+u.id+'\')">Relatório</button></td></tr>'}).join('')+'</tbody></table></div>';
}
function renderFinanceiro(){
  const d=data.dash||{},deps=data.deposits||[],pays=payments(),open=pays.filter(x=>['pending','processing'].includes(String(x.status).toLowerCase()));
  const procedure='<div class="card notice"><h3>Procedimento Pix Out / devolução</h3><ol><li><b>processing/pending:</b> clique Consultar Woovi ou Reconciliar todos.</li><li><b>Woovi confirmou falha:</b> o backend marca failed e credita a reserva USDC automaticamente.</li><li><b>Pix não foi pago e não há confirmação do provedor:</b> use Cancelar/devolver; isso devolve a reserva uma única vez.</li><li><b>Pix liquidado:</b> use Confirmar pago somente com comprovante/EndToEndId; não há novo débito.</li><li><b>Sem correlationID:</b> não recrie automaticamente, para evitar Pix duplicado. Faça validação manual.</li></ol><button class="green" onclick="reconcileAll()">Reconciliar todos agora</button></div>';
  const pixRows=pays.map(x=>{const s=String(x.status||'').toLowerCase(),closed=['completed','failed'].includes(s),kind=s==='completed'?'green':s==='failed'?'red':'yellow';const c=clientById(x.userId);const actions=closed?'<span class="muted">Encerrado</span>':'<button onclick="retryPayment(\''+x.id+'\')">Consultar Woovi</button><button class="green" onclick="finishPayment(\''+x.id+'\',\'completed\')">Confirmar pago</button><button class="red" onclick="finishPayment(\''+x.id+'\',\'failed\')">Cancelar/devolver</button>';return '<tr><td>'+esc(x.createdAt||'-')+'</td><td><b>'+esc(c.fullName||x.userId)+'</b><br><span class="muted">'+esc(c.email||'')+'</span></td><td>'+esc(x.pixKey||'-')+'</td><td>'+brl(x.amountBrl)+'</td><td>'+n(x.amountUsdc,8)+'</td><td>'+pill(s,kind)+'<br><span class="muted">'+esc(x.failureReason||'')+'</span></td><td>'+actions+'</td></tr>'}).join('');
  $('content').innerHTML='<div class="grid">'+card('Pix In',brl(d.money?.pixInTotalBrl))+card('Pix Out',brl(d.money?.pixOutTotalBrl))+card('Pix Out abertos',open.length,open.length?'warn':'ok')+card('USDC clientes',n(data.treasury?.liabilities?.clientUsdcLiability??d.money?.clientUsdcLiability,8))+'</div>'+procedure+'<h3>Solicitações Pix Out</h3><div class="card scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>Chave Pix</th><th>BRL</th><th>USDC reservado</th><th>Status</th><th>Ações</th></tr></thead><tbody>'+pixRows+'</tbody></table></div><h3>Depósitos Pix In</h3><div class="card scroll"><table><thead><tr><th>Data</th><th>User</th><th>BRL</th><th>USDC</th><th>Status</th></tr></thead><tbody>'+deps.map(x=>'<tr><td>'+esc(x.createdAt)+'</td><td>'+esc(x.userId)+'</td><td>'+brl(x.amountBrl)+'</td><td>'+n(x.amountUsdc,8)+'</td><td>'+esc(x.status)+'</td></tr>').join('')+'</tbody></table></div>';
}
function renderTesouraria(){const t=data.treasury||{},r=t.reserves||{},l=t.liabilities||{},q=t.purchaseQueue||{},breakdown=l.breakdown||[];const gap=Number(r.reserveGapUsdc||0),queue=Number(q.usdcToBuy||0);const box=gap<0&&queue===0?'<div class="card notice"><b>Gap negativo, mas fila de compra zerada.</b><p>Investigue saldos legados antes de comprar USDC.</p></div>':gap<0?'<div class="card critical"><b>Há compra/lastro pendente.</b></div>':'<div class="card goodbox"><b>Reserva operacional OK.</b></div>';$('content').innerHTML='<div class="grid">'+card('Treasury USDC',n(r.treasuryUsdc,8),'ok')+card('USDC clientes',n(l.clientUsdcLiability,8))+card('Gap clientes',n(gap,8),gap>=0?'ok':'bad')+card('Fila compra',n(queue,8))+'</div>'+box+'<div class="card"><button onclick="confirmPurchase()">Confirmar compra pendente</button></div><div class="card scroll"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>USDC</th><th>BRL</th><th>KYC</th></tr></thead><tbody>'+breakdown.map(b=>'<tr><td><b>'+esc(b.fullName)+'</b><br>'+esc(b.email)+'</td><td>'+(b.isClientLiability?pill('Cliente','green'):pill('Admin/teste','yellow'))+'</td><td>'+n(b.balances?.USDC,8)+'</td><td>'+brl(b.balances?.BRL)+'</td><td>'+esc(b.kycStatus)+'</td></tr>').join('')+'</tbody></table></div>'}
function renderCrm(){const all=clients().filter(isRealClient),chosen=selectedClientId?clientById(selectedClientId):null;const options=all.map(c=>'<option value="'+c.id+'" '+(c.id===selectedClientId?'selected':'')+'>'+esc(c.fullName||c.email)+'</option>').join('');$('content').innerHTML='<div class="card"><h3>Enviar Para</h3><select id="crmClient"><option value="">Escolha um cliente...</option>'+options+'</select><select id="crmKind"><option value="signup">Cadastro sem depósito</option><option value="pendingPix">Pix pendente</option><option value="firstDeposit">Ativação pós-depósito</option><option value="premium">Premium</option><option value="kyc">KYC pendente</option><option value="generic">Mensagem geral</option></select><div id="crmOne"></div></div>';$('crmClient').onchange=e=>{selectedClientId=e.target.value;renderCrm()};$('crmKind').value=selectedKind;$('crmKind').onchange=e=>{selectedKind=e.target.value;renderCrm()};if(chosen)$('crmOne').innerHTML=clientComms(chosen,selectedKind)}
function clientComms(c,kind){return '<h4>'+esc(c.fullName||c.email)+'</h4><textarea id="crmMsg" rows="5">'+esc(playbookMessage(kind,c))+'</textarea>'+clientButtons(c,kind,true)}
function clientButtons(c,kind,fromTextarea=false){return '<button onclick="copyMsg(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">Copiar msg</button><button class="green" onclick="sendWhats(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">WhatsApp</button><button onclick="sendEmail(\''+c.id+'\',\''+kind+'\','+fromTextarea+')">E-mail</button>'}
function msgFor(id,kind,fromTextarea){return fromTextarea&&$('crmMsg')?$('crmMsg').value:playbookMessage(kind,clientById(id))}
async function copyMsg(id,kind,fromTextarea=false){await navigator.clipboard.writeText(msgFor(id,kind,fromTextarea));alert('Mensagem copiada.')}
function sendWhats(id,kind,fromTextarea=false){const c=clientById(id),phone=digits(c.phone);if(!phone){alert('Cliente sem telefone.');return}window.open('https://wa.me/55'+phone.replace(/^55/,'')+'?text='+encodeURIComponent(msgFor(id,kind,fromTextarea)),'_blank')}
function sendEmail(id,kind,fromTextarea=false){const c=clientById(id);if(!c.email){alert('Cliente sem e-mail.');return}location.href='mailto:'+c.email+'?subject='+encodeURIComponent('Nexa')+'&body='+encodeURIComponent(msgFor(id,kind,fromTextarea))}
function openClientCrm(id){selectedClientId=id;selectedKind='generic';setTab('crm')}
function renderConhecimento(){const items=data.knowledge?.items||[];$('content').innerHTML='<div class="grid2">'+items.map(i=>'<div class="card"><h3>'+esc(i.title)+'</h3><p>'+esc(i.summary)+'</p><p><b>Regra:</b> '+esc(i.rule)+'</p><ol>'+(i.steps||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>').join('')+'</div>'}
async function setUsdcTarget(id,name){try{const raw=prompt('Saldo USDC correto para '+name+':','0.74229591');if(raw===null)return;const target=Number(String(raw).replace(',','.'));if(!Number.isFinite(target)||target<0){alert('Saldo inválido');return}const reason=prompt('Motivo obrigatório:','Correção definitiva de lançamentos históricos indevidos');if(!reason||!reason.trim())return;if(!confirm('Ajustar Ledger e cache para '+target.toFixed(8)+' USDC?'))return;const r=await call('/admin/ledger/set-usdc-target/'+id,{method:'POST',body:JSON.stringify({targetUsdc:target,reason:reason.trim()})});if(!r.verified||Math.abs(Number(r.after)-target)>=0.00000001)throw new Error('Backend não confirmou o saldo-alvo. Nenhuma ação adicional foi feita.');alert('Saldo corrigido e verificado: '+n(r.after,8)+' USDC');await refresh()}catch(e){alert(e.message||e)}}
async function reconcileAll(){try{if(!confirm('Consultar e reconciliar todos os Pix Out pendentes?'))return;$('status').textContent='Reconciliando Pix Out...';const r=await call('/payment/reconcile-pending',{method:'POST'});alert(JSON.stringify(r,null,2).slice(0,5000));await refresh()}catch(e){alert(e.message||e)}}
async function retryPayment(id){try{const r=await call('/payment/retry/'+id,{method:'POST'});alert(JSON.stringify(r,null,2).slice(0,5000));await refresh()}catch(e){alert(e.message||e)}}
async function finishPayment(id,status){try{const text=status==='completed'?'CONFIRMAR que o Pix foi realmente liquidado? Nenhum novo débito será feito.':'CANCELAR e DEVOLVER a reserva USDC ao cliente?';if(!confirm(text))return;const r=await call('/payment/confirm',{method:'POST',body:JSON.stringify({paymentId:id,status})});alert(JSON.stringify(r,null,2).slice(0,5000));await refresh()}catch(e){alert(e.message||e)}}
async function report(id){alert(JSON.stringify(await call('/admin/clients/'+id+'/report'),null,2).slice(0,4000))}
async function confirmPurchase(){const purchasedUsdc=prompt('USDC comprado/reservado?');if(!purchasedUsdc)return;const brlSpent=prompt('BRL gasto?');alert(JSON.stringify(await call('/treasury-admin/purchases/confirm-all-pending',{method:'POST',body:JSON.stringify({purchasedUsdc:Number(purchasedUsdc),brlSpent:Number(brlSpent||0),provider:'manual_admin',note:'Confirmado pelo Admin'})}),null,2).slice(0,4000));refresh()}
document.addEventListener('DOMContentLoaded',()=>{document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>setTab(b.dataset.tab));$('loginBtn').onclick=login;$('logoutBtn').onclick=logout;$('refreshBtn').onclick=refresh;$('password').onkeydown=e=>{if(e.key==='Enter')login()};setTab('ops');if(token())refresh()});