(function(){
  function safe(v){return typeof esc==='function'?esc(v):String(v??'')}
  function num(v,d=2){return Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d})}
  function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}
  function kpi(label,value,meta,cls=''){
    return '<div class="cc-card '+cls+'"><div class="cc-label">'+safe(label)+'</div><div class="cc-value">'+safe(value)+'</div><div class="cc-meta">'+safe(meta||'')+'</div></div>'
  }
  function realClients(){
    const list=(typeof clients==='function'?clients():[])||[];
    return list.filter(c=>typeof isRealClient==='function'?isRealClient(c):true)
  }
  function liability(){return Number(data?.treasury?.liabilities?.clientUsdcLiability||0)}
  function reserve(){return Number(data?.treasury?.reserves?.treasuryUsdc||0)}
  function gap(){return Number(data?.treasury?.reserves?.reserveGapUsdc||reserve()-liability())}
  function premiumCount(){return realClients().filter(c=>c.isPremium).length}
  function totalClients(){return realClients().length}
  function deposits(){return Array.isArray(data?.deposits)?data.deposits:[]}
  function revenueEstimate(){
    const gross=deposits().filter(d=>String(d.status).toLowerCase()==='completed').reduce((s,d)=>s+Number(d.amountBrl||0),0)
    return gross*0.015
  }
  function controlOverview(){
    const total=totalClients(); const premium=premiumCount(); const conversion=total?premium/total*100:0;
    const g=gap(); const queue=Number(data?.treasury?.purchaseQueue?.usdcToBuy||0);
    const proofStatus=g>=0?'Cobertura saudável':'Atenção operacional';
    const proofClass=g>=0?'cc-good':'cc-bad';
    const alerts=(data?.ops?.alerts||[]);
    return '<div class="cc-hero">'
      +'<div><div class="cc-kicker">NEXA CONTROL CENTER</div><h2>Operação em tempo real</h2><p>Clientes, receita, reservas, liquidez, CRM e custódia em um só lugar.</p></div>'
      +'<div class="cc-live"><span></span> AO VIVO</div></div>'
      +'<div class="cc-grid">'
      +kpi('Patrimônio sob custódia',num(liability(),8)+' USDC','Passivo real de clientes')
      +kpi('Reserva on-chain',num(reserve(),8)+' USDC','Polygon · Alchemy',proofClass)
      +kpi('Receita estimada',money(revenueEstimate()),'Spread estimado de 1,5%')
      +kpi('Clientes Premium',premium+' / '+total,num(conversion,1)+'% de conversão')
      +'</div>'
      +'<div class="cc-grid cc-grid-small">'
      +kpi('Proof of Reserves',proofStatus,'Gap: '+num(g,8)+' USDC',proofClass)
      +kpi('Fila de compra',num(queue,8)+' USDC',queue>0?'Ação necessária':'Sem pendências',queue>0?'cc-warn':'cc-good')
      +kpi('Clientes ativos',String(total),'KYC, saldo e wallet')
      +kpi('Alertas',String(alerts.length),alerts.length?'Revisar agora':'Operação normal',alerts.length?'cc-warn':'cc-good')
      +'</div>'
      +'<div class="cc-split">'
      +'<div class="cc-panel"><div class="cc-panel-head"><h3>Prioridades de hoje</h3><button onclick="setTab(\'tesouraria\')">Abrir Tesouraria</button></div>'
      +(alerts.length?alerts.slice(0,5).map(a=>'<div class="cc-alert"><b>'+safe(a.title||'Alerta')+'</b><p>'+safe(a.message||'')+'</p><small>'+safe(a.action||'')+'</small></div>').join(''):'<div class="cc-empty">Nenhum alerta crítico. Operação dentro dos parâmetros.</div>')
      +'</div>'
      +'<div class="cc-panel"><div class="cc-panel-head"><h3>Atalhos operacionais</h3></div>'
      +'<div class="cc-actions">'
      +'<button onclick="setTab(\'clientes\')">Clientes</button><button onclick="setTab(\'crm\')">CRM inteligente</button><button onclick="setTab(\'custodia\')">Centro de Custódia</button><button onclick="setTab(\'financeiro\')">Financeiro</button><button onclick="setTab(\'conhecimento\')">Procedimentos</button><button onclick="refresh()">Atualizar tudo</button>'
      +'</div></div></div>'
  }
  window.renderOps=function(){ $('content').innerHTML=controlOverview() }
  window.renderFinanceiro=function(){
    const deps=deposits(); const completed=deps.filter(d=>String(d.status).toLowerCase()==='completed');
    const gross=completed.reduce((s,d)=>s+Number(d.amountBrl||0),0);
    const usdc=completed.reduce((s,d)=>s+Number(d.amountUsdc||0),0);
    $('content').innerHTML='<div class="cc-hero compact"><div><div class="cc-kicker">FINANCEIRO</div><h2>Receita e movimentação</h2><p>Visão simples do que entrou, foi convertido e virou receita.</p></div></div>'
      +'<div class="cc-grid">'+kpi('Pix confirmado',money(gross),completed.length+' depósitos')+kpi('USDC entregue',num(usdc,8)+' USDC','Saldo creditado aos clientes')+kpi('Receita estimada',money(gross*0.015),'Spread de 1,5%')+kpi('Ticket médio',money(completed.length?gross/completed.length:0),'Por depósito confirmado')+'</div>'
      +'<div class="cc-panel"><div class="cc-panel-head"><h3>Últimas movimentações</h3></div><div class="scroll"><table><thead><tr><th>Data</th><th>Cliente</th><th>BRL</th><th>USDC</th><th>Status</th></tr></thead><tbody>'
      +deps.slice(0,40).map(x=>'<tr><td>'+safe(x.createdAt||'-')+'</td><td>'+safe(x.userId||'-')+'</td><td>'+money(x.amountBrl)+'</td><td>'+num(x.amountUsdc,8)+'</td><td><span class="pill '+(String(x.status).toLowerCase()==='completed'?'green':'yellow')+'">'+safe(x.status)+'</span></td></tr>').join('')
      +'</tbody></table></div></div>'
  }
  window.renderTesouraria=function(){
    const t=data?.treasury||{}, r=t.reserves||{}, l=t.liabilities||{}, q=t.purchaseQueue||{}, accounts=t.segregatedAccounts||t.accounts||[];
    const g=Number(r.reserveGapUsdc||0); const coverage=Number(l.clientUsdcLiability||0)>0?Number(r.treasuryUsdc||0)/Number(l.clientUsdcLiability||1)*100:100;
    $('content').innerHTML='<div class="cc-hero compact"><div><div class="cc-kicker">TESOURARIA</div><h2>Liquidez e reservas</h2><p>BRL operacional, receita, reserva on-chain e passivo dos clientes.</p></div><div class="cc-live"><span></span> POLYGON</div></div>'
      +'<div class="cc-grid">'+kpi('Reserva USDC',num(r.treasuryUsdc,8)+' USDC','Saldo real on-chain',g>=0?'cc-good':'cc-bad')+kpi('USDC clientes',num(l.clientUsdcLiability,8)+' USDC','Passivo do ledger')+kpi('Cobertura',num(coverage,1)+'%','Meta mínima: 100%',coverage>=100?'cc-good':'cc-bad')+kpi('Fila de compra',num(q.usdcToBuy,8)+' USDC',Number(q.usdcToBuy||0)>0?'Comprar agora':'Sem pendências',Number(q.usdcToBuy||0)>0?'cc-warn':'cc-good')+'</div>'
      +'<div class="cc-panel"><div class="cc-panel-head"><h3>Contas segregadas</h3><button onclick="confirmPurchase()">Confirmar compra</button></div><div class="cc-account-grid">'
      +(Array.isArray(accounts)&&accounts.length?accounts.map(a=>'<div class="cc-account"><span>'+safe(a.accountType||a.type||'Conta')+'</span><b>'+num(a.balance,8)+' '+safe(a.asset||'')+'</b><small>'+safe(a.source||'')+'</small></div>').join(''):'<div class="cc-empty">Contas segregadas serão exibidas aqui conforme o backend retornar os saldos.</div>')
      +'</div></div>'
      +'<div class="cc-panel"><div class="cc-panel-head"><h3>Regra operacional</h3></div><div class="cc-flow"><span>Pix entra</span><i>→</i><span>Taxa Woovi</span><i>→</i><span>Receita Nexa</span><i>→</i><span>Compra USDC</span><i>→</i><span>Reserva</span></div></div>'
  }
  const oldSetTab=window.setTab;
  window.setTab=function(t){ oldSetTab(t); if(t==='ops') setTimeout(()=>window.renderOps(),0) }
})();