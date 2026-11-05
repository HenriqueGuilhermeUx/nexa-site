/* Nexa activation guide: verified lifecycle milestones, explicit consent and no outbound sends. */
(() => {
  'use strict';
  const root = 'https://nexa-backend-p2u0.onrender.com/api/v1';
  const $ = (id) => document.getElementById(id);
  const authToken = () => localStorage.getItem('nexa_access_token') || localStorage.getItem('nexa_token') || '';
  const safeInternal = (value) => {
    try {
      const url = new URL(String(value || ''), 'https://trynexa.com.br');
      return url.protocol === 'https:' && url.hostname === 'trynexa.com.br' ? url.href : '';
    } catch { return ''; }
  };
  const diditLink = (value) => {
    try {
      const url = new URL(String(value || ''));
      return url.protocol === 'https:' &&
        (url.hostname === 'didit.me' || url.hostname.endsWith('.didit.me')) ? url.href : '';
    } catch { return ''; }
  };
  async function call(path, options = {}) {
    const token = authToken();
    if (!token) throw new Error('Faça login para continuar');
    const response = await fetch(root + path, {
      ...options,
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer ' + token,
        ...(options.body ? {'Content-Type': 'application/json'} : {})
      },
      cache: 'no-store',
      credentials: 'omit'
    });
    let body = {};
    try { body = await response.json(); } catch {}
    if (!response.ok || body.success === false) throw new Error(body.message || 'Não foi possível consultar a Nexa');
    return body;
  }

  let lifecycle = null;
  let kyc = null;
  let busy = false;

  async function loadKyc() {
    try { kyc = await call('/kyc/didit/me'); } catch { kyc = null; }
  }

  function render() {
    if (!lifecycle || !$('nexaLifecycleCoach')) return;
    const stage = String(lifecycle.stage || '');
    const next = lifecycle.nextAction || {};
    $('nexaCoachTitle').textContent = next.title || 'Seu próximo passo';
    $('nexaCoachCopy').textContent = next.description || 'Acompanhe sua jornada na Nexa.';
    const action = $('nexaCoachAction');
    const kycStep = stage === 'kyc';
    const needsKycReview = stage === 'kyc_assistance' || stage === 'kyc_review';
    const providerAction = String(kyc?.nextAction || '');
    const blockedByProvider = ['manual_review','wait','document_fallback'].includes(providerAction);
    action.disabled = busy || (kycStep && blockedByProvider);
    action.textContent = kycStep
      ? (blockedByProvider ? 'Acompanhar verificação com suporte' :
          kyc?.verificationUrl ? 'Continuar verificação' : 'Iniciar verificação')
      : needsKycReview ? 'Ver meus dados' :
          stage === 'next_deposit' ? 'Consultar opções para outra entrada' :
          next.actionLabel || 'Abrir minha conta';
    $('nexaKycConsentWrap').hidden = !kycStep || Boolean(kyc?.verificationUrl) || blockedByProvider;
    const pref = lifecycle.educationalEmail || {};
    $('nexaEducationalEmail').checked = pref.optedIn === true;
    $('nexaCoachEmailState').textContent = pref.optedIn
      ? 'Orientações educativas autorizadas. Você pode desativar quando quiser.'
      : 'Nenhuma comunicação educativa por e-mail está autorizada.';
    $('nexaLifecycleCoach').hidden = false;
  }

  async function refresh() {
    if (!authToken() || !$('nexaLifecycleCoach')) return;
    try {
      lifecycle = await call('/lifecycle/me');
      if (lifecycle.stage === 'kyc' || lifecycle.stage === 'kyc_assistance' || lifecycle.stage === 'kyc_review')
        await loadKyc();
      render();
    } catch {
      $('nexaLifecycleCoach').hidden = true;
    }
  }

  async function doNext() {
    if (busy || !lifecycle) return;
    const stage = String(lifecycle.stage || '');
    if (stage === 'kyc') {
      const existing = diditLink(kyc?.verificationUrl);
      if (existing) { window.location.assign(existing); return; }
      if ($('nexaKycBiometricConsent').checked !== true) {
        $('nexaCoachNotice').textContent = 'Para iniciar, confirme o consentimento para verificação biométrica.';
        return;
      }
      busy = true;
      $('nexaCoachAction').disabled = true;
      $('nexaCoachNotice').textContent = 'Criando sua sessão segura de verificação...';
      try {
        const result = await call('/kyc/didit/brazil/start', {
          method: 'POST', body: JSON.stringify({ consent: true })
        });
        const url = diditLink(result.verificationUrl);
        if (!url) throw new Error('A sessão não retornou um endereço seguro válido');
        window.location.assign(url);
      } catch (error) {
        $('nexaCoachNotice').textContent = error.message || 'Não foi possível iniciar agora.';
      } finally { busy = false; render(); }
      return;
    }
    if (stage === 'first_deposit') {
      window.location.assign('/app.html'); return;
    }
    if (stage === 'next_deposit' || stage === 'ongoing' || stage === 'recurring') {
      const historyTab = document.querySelector('[data-tab="historico"]');
      if (historyTab) historyTab.click();
      return;
    }
    window.location.assign(safeInternal(lifecycle.nextAction?.destination) || '/suporte.html');
  }

  async function updatePreference() {
    if (busy || !lifecycle) return;
    const checkbox = $('nexaEducationalEmail');
    const next = checkbox.checked === true;
    const prior = lifecycle.educationalEmail?.optedIn === true;
    busy = true; checkbox.disabled = true;
    $('nexaCoachNotice').textContent = 'Salvando preferência...';
    try {
      await call('/lifecycle/preferences', {
        method: 'POST', body: JSON.stringify({ educationalEmailOptIn:next, emailFrequency:'weekly' })
      });
      $('nexaCoachNotice').textContent = next ? 'Preferência ativada.' : 'Preferência desativada.';
      await refresh();
    } catch (error) {
      checkbox.checked = prior;
      $('nexaCoachNotice').textContent = error.message || 'Não foi possível salvar sua preferência.';
    } finally { busy = false; checkbox.disabled = false; }
  }

  function init() {
    const panel = $('panel-resumo');
    if (!panel || $('nexaLifecycleCoach')) return;
    const section = document.createElement('section');
    section.id = 'nexaLifecycleCoach';
    section.className = 'glass rounded-[2rem] p-6 mb-6';
    section.hidden = true;
    section.innerHTML =
      '<p class="text-cyan-300 text-xs font-black mb-2">NEXA · PRÓXIMO PASSO</p>' +
      '<h2 id="nexaCoachTitle" class="text-2xl font-black mb-2"></h2>' +
      '<p id="nexaCoachCopy" class="text-slate-300 text-sm mb-4"></p>' +
      '<label id="nexaKycConsentWrap" class="flex items-start gap-3 text-sm text-slate-300 mb-4" hidden>' +
      '<input id="nexaKycBiometricConsent" type="checkbox" class="mt-1">' +
      '<span>Autorizo o uso dos dados necessários, incluindo dados biométricos, para verificar minha identidade com o provedor indicado pela Nexa.</span></label>' +
      '<button id="nexaCoachAction" type="button" class="bg-indigo-500 hover:bg-indigo-600 px-5 py-3 rounded-2xl font-black mb-4">Continuar</button>' +
      '<div class="border-t border-white/10 pt-4 mt-2">' +
      '<label class="flex items-start gap-3 text-sm text-slate-300">' +
      '<input id="nexaEducationalEmail" type="checkbox" class="mt-1">' +
      '<span>Desejo receber até um e-mail educativo por semana sobre verificação, Pix e uso da Nexa. Posso desativar a qualquer momento. Não autorizo mensagens comerciais de WhatsApp com esta escolha.</span>' +
      '</label><p id="nexaCoachEmailState" class="text-xs text-slate-400 mt-2"></p>' +
      '<p id="nexaCoachNotice" role="status" class="text-xs text-cyan-300 mt-2"></p>' +
      '</div>';
    panel.prepend(section);
    $('nexaCoachAction').addEventListener('click', doNext);
    $('nexaEducationalEmail').addEventListener('change', updatePreference);
    const refreshButton = $('refreshBtn');
    if (refreshButton) refreshButton.addEventListener('click', () => { setTimeout(refresh, 100); });
    const app = $('appArea');
    if (app && typeof MutationObserver !== 'undefined') {
      new MutationObserver(() => {
        if (!app.classList.contains('hidden') && authToken()) refresh();
      }).observe(app,{attributes:true,attributeFilter:['class']});
    }
    if (authToken()) refresh();
  }
  document.addEventListener('DOMContentLoaded', init);
})();
