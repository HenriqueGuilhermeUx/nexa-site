(function(){
  const API_BASE='https://nexa-backend-p2u0.onrender.com/api/v1';
  const auth=()=>localStorage.getItem('nexa_token')||'';
  const fmt=(v,d=8)=>Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:d});
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const safe=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  async function request(path,opt={}){
    const response=await fetch(API_BASE+path,{
      ...opt,
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+auth(),...(opt.headers||{})},
    });
    const text=await response.text();
    let json={}; try{json=JSON.parse(text)}catch{json={raw:text}}
    if(!response.ok) throw new Error(json.message||json.error||text||('HTTP '+response.status));
    return json;
  }

  async function renderCustody(){
    const content=document.getElementById('content');
    const title=document.getElementById('title');
    if(title) title.textContent='Custódia Inteligente Nexa™';
    content.innerHTML='<div class="card"><h3>Carregando Centro de Custódia...</h3></div>';

    try{
      const [accounts,clientsResponse]=await Promise.all([
        request('/treasury-admin/accounts'),
        request('/treasury-admin/clients-full'),
      ]);
      const operational=accounts.byType?.operational||{};
      const revenue=accounts.byType?.revenue||{};
      const reserve=accounts.byType?.reserve||{};
      const clients=clientsResponse.clients||[];
      const real=clients.filter(c=>c.isActive!==false&&!String(c.email||'').toLowerCase().includes('test'));
      const liabilities=real.reduce((sum,c)=>sum+Number(c.balances?.USDC||c.availableBalanceUsdc||0),0);
      const reserveUsdc=Number(reserve.USDC||0);
      const coverage=liabilities>0?(reserveUsdc/liabilities)*100:0;

      content.innerHTML=
        '<div class="grid">'+
          '<div class="card"><div class="muted">Operacional BRL</div><div class="kpi">'+money(operational.BRL)+'</div></div>'+
          '<div class="card"><div class="muted">Receita Nexa BRL</div><div class="kpi ok">'+money(revenue.BRL)+'</div></div>'+
          '<div class="card"><div class="muted">Reserva USDC</div><div class="kpi">'+fmt(reserveUsdc)+'</div></div>'+
          '<div class="card"><div class="muted">Cobertura</div><div class="kpi '+(coverage>=100?'ok':'bad')+'">'+fmt(coverage,2)+'%</div></div>'+
        '</div>'+
        '<div class="grid2">'+
          '<div class="card"><h3>Modo Nexa</h3><p>Saldo interno disponível para Pix, @username, Rewards, Premium e pagamentos instantâneos.</p><p><b>Passivo estimado:</b> '+fmt(liabilities)+' USDC</p></div>'+
          '<div class="card"><h3>Carteira Própria</h3><p>USDC enviado on-chain para a carteira individual do cliente na Polygon. Fora do passivo custodial da Nexa.</p><p class="muted">O detalhamento on-chain por cliente será consultado pelo endpoint /custody/overview.</p></div>'+
        '</div>'+
        '<div class="card"><h3>Contas segregadas</h3><table><thead><tr><th>Conta</th><th>BRL</th><th>USDC</th><th>Finalidade</th></tr></thead><tbody>'+
          '<tr><td>Operacional</td><td>'+money(operational.BRL)+'</td><td>'+fmt(operational.USDC)+'</td><td>Recebimentos, liquidação e custos operacionais</td></tr>'+
          '<tr><td>Receita</td><td>'+money(revenue.BRL)+'</td><td>'+fmt(revenue.USDC)+'</td><td>Fees e spreads efetivamente apropriados pela Nexa</td></tr>'+
          '<tr><td>Reserva</td><td>'+money(reserve.BRL)+'</td><td>'+fmt(reserve.USDC)+'</td><td>Lastro dos saldos mantidos no Modo Nexa</td></tr>'+
        '</tbody></table></div>'+
        '<div class="card"><h3>Inicialização controlada</h3><p class="muted">Use uma única vez para registrar os saldos iniciais. Não inclui automaticamente valores históricos.</p><input id="seedOperational" placeholder="Operacional BRL. Ex: 30,61"><input id="seedRevenue" placeholder="Receita BRL. Ex: 0"><input id="seedReserve" placeholder="Reserva USDC. Ex: 16,942121"><button id="seedTreasury">Salvar saldos iniciais</button></div>'+
        '<div class="card"><h3>Clientes e custódia</h3><table><thead><tr><th>Cliente</th><th>Saldo Nexa</th><th>Wallet</th><th>Ação</th></tr></thead><tbody>'+
          real.map(c=>'<tr><td><b>'+safe(c.fullName||c.email)+'</b><br><span class="muted">'+safe(c.email)+'</span></td><td>'+fmt(c.balances?.USDC||c.availableBalanceUsdc||0)+' USDC</td><td>'+safe(c.walletAddress||'-')+'</td><td><button onclick="window.open(\''+API_BASE+'/custody/overview?userId='+c.id+'\',\'_blank\')">Ver custódia</button></td></tr>').join('')+
        '</tbody></table></div>';

      document.getElementById('seedTreasury').onclick=async()=>{
        const parse=v=>Number(String(v||'0').replace('.','').replace(',','.'));
        try{
          const result=await request('/treasury-admin/accounts/seed',{
            method:'POST',
            body:JSON.stringify({
              operationalBrl:parse(document.getElementById('seedOperational').value),
              revenueBrl:parse(document.getElementById('seedRevenue').value),
              reserveUsdc:parse(document.getElementById('seedReserve').value),
              source:'admin_custody_center_seed',
            }),
          });
          alert('Contas atualizadas: '+JSON.stringify(result.byType||{}));
          renderCustody();
        }catch(error){alert(error.message)}
      };
    }catch(error){
      content.innerHTML='<div class="card critical"><h3>Centro de Custódia indisponível</h3><pre>'+safe(error.message)+'</pre></div>';
    }
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const button=document.querySelector('button[data-tab="custodia"]');
    if(button) button.addEventListener('click',()=>setTimeout(renderCustody,0));
    window.renderCustodyAdmin=renderCustody;
  });
})();
