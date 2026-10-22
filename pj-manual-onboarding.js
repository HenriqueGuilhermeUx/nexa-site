/* PJ document intake: uses the EXISTING Nexa PF session/Didit outcome. */
(() => {
  'use strict';
  const allowed = ['contrato_social','ato_constitutivo','ccmei','comprovante_cnpj'];
  const label = {contrato_social:'Contrato social',ato_constitutivo:'Ato constitutivo',
    ccmei:'CCMEI',comprovante_cnpj:'Comprovante CNPJ'};
  const root=()=>document.getElementById('pjManualOnboarding');
  let submissionAttemptedForThisPage=false;
  const escaping=v=>String(v??'').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;',
  })[c]);
  const when=v=>v?new Date(v).toLocaleString('pt-BR'):'—';
  async function jsonResponse(response){
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(
      Array.isArray(data.message)?data.message.join(', '):
      data.message||'Não foi possível processar esta etapa PJ'
    );
    return data;
  }
  window.loadPjManualOnboarding=async function(){
    const el=root();
    if(!el||!token)return;
    try{
      const response=await fetch(API+'/merchant/pj-manual-review',{headers:headers(false),cache:'no-store'});
      const state=await jsonResponse(response);
      if(!token)return;
      const docs=Array.isArray(state.documents)?state.documents:[];
      const applied=['pending_manual','approved'].includes(state.reviewStatus);
      const businessName=escaping(state.businessName||'Sua empresa');
      const types='<option value="contrato_social">Contrato social</option>'+
        '<option value="ato_constitutivo">Ato constitutivo</option>'+
        '<option value="ccmei">CCMEI (MEI)</option>'+
        '<option value="comprovante_cnpj">Comprovante de inscrição no CNPJ (opcional)</option>';
      const uploaded=docs.length?docs.map(d=>'<div class="text-xs text-emerald-200">✓ '+escaping(label[d.kind]||d.kind)+': '+escaping(d.filename)+'</div>').join(''):
        '<p class="text-sm text-amber-200">Documento empresarial ainda não enviado.</p>';
      el.innerHTML='<div class="flex flex-wrap justify-between items-start gap-4">'+
        '<div><p class="text-xs font-black text-cyan-300 uppercase tracking-widest">Abertura e liberação PJ</p>'+
        '<h2 class="font-extrabold text-2xl mt-2">'+businessName+'</h2>'+
        '<p class="text-sm text-slate-300 mt-2">CNPJ cadastrado · final '+escaping(state.cnpjSuffix||'—')+
        ' · Prazo de análise manual de até 2 dias úteis após o envio completo.</p></div>'+
        '<span class="pill '+(state.diditPfApproved?'ok':'wait')+'">'+
        (state.diditPfApproved?'Didit PF aprovada':'Didit PF pendente')+'</span></div>'+
        '<div class="grid lg:grid-cols-2 gap-6 mt-6"><div class="card rounded-2xl p-5">'+
          '<h3 class="font-bold">1. Documentos da empresa</h3>'+
          '<p class="text-sm text-slate-300 my-3">Envie o contrato social ou equivalente em PDF, PNG ou JPEG (até 6 MB). O CNPJ é conferido por você e pela Nexa na etapa manual.</p>'+
          uploaded+
          (!applied?'<form id="pjUploadForm" class="grid gap-3 mt-4">'+
            '<select id="pjDocumentKind" class="w-full p-3 rounded-xl">'+types+'</select>'+
            '<input type="file" id="pjDocumentFile" accept="application/pdf,image/jpeg,image/png" required class="w-full p-3 rounded-xl">'+
            '<button type="submit" class="bg-indigo-600 p-3 rounded-xl font-bold">Enviar documento protegido</button>'+
            '</form>':'<p class="text-sm text-emerald-200 mt-3">Documentos bloqueados para edição durante a análise.</p>')+
        '</div><div class="card rounded-2xl p-5"><h3 class="font-bold">2. Didit PF + análise manual</h3>'+
        '<p class="text-sm text-slate-300 my-3">A identidade da pessoa física usa a verificação Didit já existente. A aprovação PF não libera automaticamente o CNPJ.</p>'+
        '<div class="text-sm text-slate-200 mt-4">Situação: <b>'+escaping(
          state.reviewStatus==='pending_manual'?'Aguardando avaliação administrativa':
          state.reviewStatus==='approved'?'Revisão documental aprovada':
          state.reviewStatus==='rejected'?'Documentos recusados: reenvie o arquivo':
          'Aguardando envio e/ou Didit PF')+'</b></div>'+
        (state.dueAt?'<div class="text-sm text-amber-200 mt-2">Previsão de análise: '+escaping(when(state.dueAt))+'</div>':'')+
        (state.reviewStatus==='pending_manual'&&state.notificationStatus!=='sent'
          ?'<div class="text-xs text-amber-200 mt-2">A solicitação consta na fila, mas a entrega do aviso por e-mail ainda precisa ser confirmada.</div>':'')+
        (state.canSubmit?'<button type="button" id="pjSubmitReview" class="w-full bg-emerald-700 p-3 rounded-xl font-black mt-5">Enviar para aprovação PJ</button>':
          '<p class="text-xs text-slate-400 mt-4">Para enviar à análise: CPF com Didit aprovada, CNPJ válido e instrumento empresarial anexado.</p>')+
        '</div></div><p class="text-xs text-slate-400 mt-5">Somente o administrador autoriza a análise documental PJ. Carteira, Pix, USDC e entrada integrada do NexOffice dependem de suas permissões específicas.</p>'+
        '<div id="pjManualMessage" class="text-sm mt-3" aria-live="polite"></div>';
      const form=document.getElementById('pjUploadForm');
      if(form)form.onsubmit=async event=>{
        event.preventDefault();
        const file=document.getElementById('pjDocumentFile')?.files?.[0];
        const kind=document.getElementById('pjDocumentKind').value;
        if(!file||!allowed.includes(kind)||file.size>6*1024*1024){
          document.getElementById('pjManualMessage').textContent='Escolha documento válido de até 6 MB.';return;
        }
        const submit=form.querySelector('button');submit.disabled=true;
        const body=new FormData();body.append('kind',kind);body.append('document',file);
        try{
          await jsonResponse(await fetch(API+'/merchant/pj-manual-review/document',{
            method:'POST',headers:{Authorization:'Bearer '+token},body,
          }));
          await window.loadPjManualOnboarding();
        }catch(e){document.getElementById('pjManualMessage').textContent=e.message;submit.disabled=false;}
      };
      // A PF Didit approval completed after documents were uploaded is
      // picked up when the client returns to the portal. The server
      // transaction is idempotent; the email is never retried blindly.
      if(state.canSubmit && !submissionAttemptedForThisPage){
        submissionAttemptedForThisPage=true;
        void fetch(API+'/merchant/pj-manual-review/submit',{
          method:'POST',headers:headers(),body:'{}',
        }).then(jsonResponse).then(()=>window.loadPjManualOnboarding())
          .catch(()=>{const m=document.getElementById('pjManualMessage');
            if(m)m.textContent='O envio automático não foi confirmado. Use o botão para tentar a solicitação.'});
      }
      const submit=document.getElementById('pjSubmitReview');
      if(submit)submit.onclick=async()=>{
        submit.disabled=true;
        try{
          await jsonResponse(await fetch(API+'/merchant/pj-manual-review/submit',{
            method:'POST',headers:headers(),body:'{}',
          }));
          await window.loadPjManualOnboarding();
        }catch(e){document.getElementById('pjManualMessage').textContent=e.message;submit.disabled=false;}
      };
    }catch(e) {
      el.innerHTML='<p class="text-amber-200">A abertura PJ não está pronta para análise nesta conta. '+escaping(e.message)+'</p>'+
        '<p class="text-xs text-slate-400 mt-2">Conclua primeiro os dados da empresa e confirme sua autenticação Nexa.</p>';
    }
  };
  // Recheck Didit PF while the onboarding portal is open. No new Didit
  // session or paid KYB request is created by this polling.
  setInterval(()=>{
    const app=document.getElementById('appArea');
    if(token && app && !app.classList.contains('hidden') && !document.hidden){
      void window.loadPjManualOnboarding();
    }
  },90_000);
  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden && token && !document.getElementById('appArea').classList.contains('hidden')){
      void window.loadPjManualOnboarding();
    }
  });
})();
