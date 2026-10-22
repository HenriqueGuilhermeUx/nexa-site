/* Nexa PJ manual reviews. Admin JWT required by EVERY data and document URL. */
(() => {
  'use strict';
  const validId = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value || '');
  const kindNames = {
    contrato_social:'Contrato social',
    ato_constitutivo:'Ato constitutivo',
    ccmei:'CCMEI',
    comprovante_cnpj:'Comprovante do CNPJ',
  };
  const statusNames = {
    pending_manual:'Aguardando sua decisão',documents_pending:'Documentação incompleta',
    approved:'Aprovada manualmente',rejected:'Rejeitada — pode reenviar',
  };
  const emailNames = {
    pending:'E-mail a enviar',sending:'Envio de e-mail em andamento',
    sent:'E-mail enviado',uncertain:'Entrega de e-mail incerta — conferir',
    not_configured:'E-mail não configurado — confira fila',
    not_requested:'Ainda não notificado',
  };
  let reviewRows = [];
  const readinessNames={
    PJ_DATABASE_MIGRATIONS_MISSING:'Migrações PJ não confirmadas no banco',
    PJ_REVIEW_SCHEMA_FIELDS_MISSING:'Campos de revisão e criptografia indisponíveis',
    PJ_DOCUMENT_ENCRYPTION_KEY_MISSING:'Chave de criptografia dos documentos pendente',
    PJ_MANUAL_INTAKE_OFF:'Abertura PJ ainda desativada',
    DIDIT_PF_WEBHOOK_SIGNATURE_NOT_CONFIGURED:'Assinatura do webhook Didit PF pendente',
    PJ_ADMIN_ALERT_EMAIL_NOT_MATCHED:'E-mail de aviso não coincide com ADMIN_EMAIL',
    PJ_EMAIL_PROVIDER_NOT_CONFIGURED:'Remetente ou Resend não configurado',
  };
  function readinessPanel(value){
    const issues=Array.isArray(value?.issues)?value.issues:[];
    const ok=value?.infrastructureChecksComplete===true;
    const body=issues.length
      ? '<ul>'+issues.map(code=>'<li>'+clean(readinessNames[code]||'Verificação pendente')+'</li>').join('')+'</ul>'
      :'<p class="muted">Configurações estruturais conferidas. Ainda faltam DNS verificado, provedores e teste ponta a ponta.</p>';
    return '<div class="card"><h3>Prontidão operacional PJ</h3>'+
      '<p class="'+(ok?'muted':'warn')+'">'+
      (ok?'Verificações internas concluídas; produção permanece bloqueada.'
         :'Homologação incompleta — nenhuma liberação automática permitida.')+'</p>'+
      body+
      '<p class="muted">DNS do remetente: verificação externa não realizada aqui. Didit Business não é exigida nesta fase. Seu aceite documental não libera Pix nem USDC.</p>'+
      '</div>';
  }
  const clean = x => esc(x ?? '');
  const fmt = x => x ? new Date(x).toLocaleString('pt-BR') : '—';
  const due = row => {
    if(row.status!=='pending_manual')return '—';
    if(!row.review_due_at)return 'Prazo não informado';
    const late=Date.now()>new Date(row.review_due_at).getTime();
    return '<span class="'+(late?'bad':'warn')+'">'+
      (late?'Prazo vencido: ':'Até: ')+clean(fmt(row.review_due_at))+'</span>';
  };
  function table(rows) {
    if(!rows.length)return '<div class="card"><h3>Sem pendências PJ</h3><p class="muted">Nenhuma empresa encontrada nesta fila.</p></div>';
    const pending=rows.filter(row=>row.status==='pending_manual');
    const overdue=pending.filter(row=>row.review_due_at&&Date.now()>new Date(row.review_due_at).getTime());
    const badges='<div class="grid3"><div class="card"><small class="muted">Para analisar</small><div class="kpi">'+pending.length+'</div></div><div class="card"><small class="muted">Vencidas</small><div class="kpi">'+overdue.length+'</div></div><div class="card"><small class="muted">Prazo</small><div class="kpi">2 dias úteis</div></div></div>';
    const tbody=rows.map(r=>{
      if(!validId(r.merchant_id))return '';
      const docs=Array.isArray(r.document_kinds)?r.document_kinds:[];
      const actions=docs.filter(k=>kindNames[k]).map(k=>
        '<button class="small-btn ghost" data-pj-doc="'+clean(r.merchant_id)+'" data-kind="'+clean(k)+'">Ver '+clean(kindNames[k])+'</button>'
      ).join(' ');
      return '<tr><td><b>'+clean(r.business_name||'Empresa')+'</b><div class="muted">CNPJ: '+clean(r.cnpj||'—')+'</div>'+
        '<small>Responsável: '+clean(r.representative_name||'—')+'</small></td>'+
        '<td>'+clean(statusNames[r.status]||r.status)+'<br><small>Didit PF: '+
        clean(r.pf_status==='approved'&&r.pf_verified_at&&r.didit_linked?'aprovada':'não confirmada')+'</small></td>'+
        '<td>'+due(r)+'<br><small>Enviado: '+clean(fmt(r.submitted_at))+'</small></td>'+
        '<td>'+clean(emailNames[r.email_status]||r.email_status||'—')+
        (r.status==='pending_manual'&&r.email_status==='not_configured'
          ? '<div class="actions"><button class="small-btn ghost" data-pj-notify="'+clean(r.merchant_id)+'">Solicitar aviso</button></div>'
          : '')+'</td>'+
        '<td><div class="actions">'+actions+'</div></td>'+
        '<td>'+(r.status==='pending_manual'
          ? '<div class="actions"><button class="green small-btn" data-pj-decision="approved" data-merchant="'+clean(r.merchant_id)+'">Aprovar</button>'+
            '<button class="red small-btn" data-pj-decision="rejected" data-merchant="'+clean(r.merchant_id)+'">Rejeitar</button></div>'
          :clean(r.review_note||'—'))+'</td></tr>';
    }).join('');
    return badges+'<div class="card"><h3>Verificação Didit PF + sua conferência documental</h3>'+
      '<p class="muted">Antes de aprovar, verifique CNPJ, instrumento societário, poderes do representante e coerência com o titular aprovado pela Didit. Aprovação documental não libera carteiras ou Pix automaticamente.</p>'+
      '<div class="scroll"><table><thead><tr><th>Empresa / CNPJ</th><th>Etapa</th><th>Prazo</th><th>Aviso</th><th>Documentos privados</th><th>Sua decisão</th></tr></thead><tbody>'+
      tbody+'</tbody></table></div></div>';
  }
  window.renderPjReviews=async function renderPjReviews() {
    const root=document.getElementById('content');
    if(!token()){root.innerHTML='<div class="card">Acesso restrito</div>';return;}
    root.innerHTML='<div class="card">Carregando pendências PJ…</div>';
    try{
      const [queueResult,preflightResult]=await Promise.allSettled([
        call('/merchant-admin/pj-manual-reviews'),
        call('/merchant-admin/pj-operational-preflight'),
      ]);
      if(document.getElementById('title')?.textContent!=='Liberação manual PJ')return;
      if(queueResult.status!=='fulfilled')throw queueResult.reason;
      reviewRows=Array.isArray(queueResult.value.items)?queueResult.value.items:[];
      const readiness=preflightResult.status==='fulfilled'
        ? readinessPanel(preflightResult.value)
        :'<div class="card"><h3>Prontidão operacional PJ</h3><p class="warn">Não foi possível conferir a configuração de homologação. Nenhuma liberação foi efetuada.</p></div>';
      root.innerHTML=readiness+table(reviewRows);
    }catch(error){
      root.innerHTML='<div class="card"><h3>Não foi possível carregar a fila PJ</h3><p class="bad">'+clean(error.message)+'</p>'+
        '<p class="muted">Confira o token admin e a migração do banco; nenhuma solicitação foi aprovada.</p></div>';
    }
  };
  async function download(merchantId,kind){
    if(!validId(merchantId)||!kindNames[kind])throw Error('Documento inválido');
    const response=await fetch(API+'/merchant-admin/pj-applications/'+merchantId+
      '/manual-document/'+encodeURIComponent(kind),{
      headers:{Authorization:'Bearer '+token()},cache:'no-store',
    });
    if(!response.ok)throw Error('Documento indisponível. Atualize a sessão.');
    const body=await response.blob();
    if(body.size>7*1024*1024)throw Error('Documento excede o limite de segurança');
    const match=String(response.headers.get('Content-Disposition')||'').match(/filename="([a-zA-Z0-9._-]+)"/);
    const extension=body.type.includes('pdf')?'.pdf':body.type.includes('png')?'.png':'.jpg';
    const name=match?match[1]:'documento-pj'+extension;
    const url=URL.createObjectURL(body);
    const a=document.createElement('a');a.href=url;a.download=name;
    document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  async function notifyUnconfigured(merchantId){
    if(!validId(merchantId))throw Error('Empresa inválida');
    const row=reviewRows.find(x=>x.merchant_id===merchantId);
    if(!row||row.status!=='pending_manual'||row.email_status!=='not_configured')
      throw Error('Aviso indisponível ou com envio já tentado.');
    const approved=window.confirm(
      'Solicitar o aviso PJ somente se o e-mail ainda NÃO foi tentado? '+
      'Em situações de entrega incerta não é permitido repetir o envio.'
    );
    if(!approved)return;
    const result=await call('/merchant-admin/pj-applications/'+merchantId+
      '/notify-unconfigured',{method:'POST',body:'{}'});
    if(result.retryEligible===false){
      toast('Aviso não elegível para reenvio. Confira o status e os logs.',true);
    }else{
      toast('Solicitação de aviso processada. Confira o status de envio atualizado.');
    }
    await window.renderPjReviews();
  }
  function confirmReview(id,decision){
    if(!validId(id)||!['approved','rejected'].includes(decision))return;
    const row=reviewRows.find(x=>x.merchant_id===id);
    if(!row||row.status!=='pending_manual')return;
    openModal('<h2>'+(decision==='approved'?'Aprovar':'Rejeitar')+' Nexa PJ</h2>'+
      '<p><b>'+clean(row.business_name)+'</b><br>CNPJ: '+clean(row.cnpj)+'</p>'+
      '<p class="muted">O KYC Didit é da PF. Sua confirmação atesta a análise dos documentos, do CNPJ e dos poderes de representação. O acesso financeiro permanece sujeito a verificação própria.</p>'+
      '<div class="form-field"><label>Justificativa obrigatória</label><textarea id="pj-review-reason" minlength="12" maxlength="1000" placeholder="O que foi conferido? Há divergências?"></textarea></div>'+
      '<label style="display:flex;gap:10px;align-items:flex-start;margin:16px 0"><input type="checkbox" id="pj-review-ack" style="width:auto">'+
      '<span>Confirmo que revisei pessoalmente o CNPJ, o instrumento da empresa, os poderes de representação e a identidade PF.</span></label>'+
      '<button class="'+(decision==='approved'?'green':'red')+'" id="pj-review-confirm">Confirmar '+
      (decision==='approved'?'aprovação':'rejeição')+'</button>');
    document.getElementById('pj-review-confirm').onclick=async()=>{
      const button=document.getElementById('pj-review-confirm');
      const reason=document.getElementById('pj-review-reason').value.trim();
      const confirmation=document.getElementById('pj-review-ack').checked;
      if(reason.length<12||!confirmation){toast('Descreva a análise e marque a confirmação.',true);return;}
      button.disabled=true;
      try{
        await call('/merchant-admin/pj-applications/'+id+'/manual-decision',{
          method:'POST',body:JSON.stringify({decision,confirmation,reason}),
        });
        closeModal();toast('Decisão PJ registrada e auditada. Acesso financeiro não é liberado por esta decisão.');
        await window.renderPjReviews();
      }catch(error){toast(error.message,true);button.disabled=false;}
    };
  }
  document.addEventListener('click',event=>{
    const el=event.target.closest?.('[data-pj-doc],[data-pj-decision],[data-pj-notify]');
    if(!el||!token())return;
    if(el.dataset.pjDoc){download(el.dataset.pjDoc,el.dataset.kind).catch(err=>toast(err.message,true));}
    if(el.dataset.pjNotify){
      el.disabled=true;
      notifyUnconfigured(el.dataset.pjNotify)
        .catch(err=>toast(err.message,true))
        .finally(()=>{if(el.isConnected)el.disabled=false;});
    }
    if(el.dataset.pjDecision)confirmReview(el.dataset.merchant,el.dataset.pjDecision);
  });
})();
