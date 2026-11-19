/* Maya + Agentics benefit presentation for the Nexa PWA.
 * No customer data, token, network requests, storage, or financial execution.
 * Preview and all real user capabilities remain disabled until the backend
 * release has passed its independent end-to-end authorization review.
 */
(function (root) {
  'use strict';
  const pilot = Object.freeze({
    title: 'Maya + Agentics: da pergunta ao plano',
    status: 'under_homologation',
    premiumBenefit: true,
    previewAvailable: false,
    externalEffects: false,
    financialExecution: false
  });
  function safeBenefits(raw, authenticatedUserId) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) ||
        !authenticatedUserId || typeof authenticatedUserId !== 'string' ||
        raw.contract !== 'nexa-maya-agentics-benefits-v1' ||
        raw.actorUserId !== authenticatedUserId ||
        raw.mayaGeneralAccess !== true ||
        raw.mayaAgenticsPremiumBenefit !== true ||
        typeof raw.premiumActive !== 'boolean' ||
        raw.agenticsPilotStatus !== 'under_homologation' ||
        raw.previewAvailable !== false ||
        raw.externalEffects !== false ||
        raw.financialExecution !== false ||
        raw.reviewRequired !== true) {
      return { ...pilot, premiumActive: null, verified: false };
    }
    return { ...pilot, premiumActive: raw.premiumActive, verified: true };
  }
  function renderBenefits(rootElement, result) {
    if (!rootElement) return;
    const status = rootElement.querySelector('[data-maya-agentics-status]');
    const entitlement = rootElement.querySelector('[data-maya-agentics-entitlement]');
    if (status) status.textContent = 'Planejamento avançado em homologação — ainda não disponível para uso real.';
    if (entitlement) entitlement.textContent =
      result && result.verified && result.premiumActive === true
        ? 'Assinatura Premium reconhecida. O recurso Agentics ainda está em piloto.'
        : result && result.verified && result.premiumActive === false
          ? 'Benefício planejado para Nexa Premium. A Maya atual continua disponível.'
          : 'Disponibilidade Premium não verificada. Conheça a novidade sem ativar nada.';
    const actions = rootElement.querySelectorAll('[data-maya-agentics-action]');
    actions.forEach(function (action) {
      // No customer-side action may enable the review bridge.
      action.disabled = true;
    });
  }
  root.NexaMayaAgenticsBenefits = Object.freeze({ safeBenefits, renderBenefits, pilot });
  if (typeof document !== 'undefined') {
    const mount = function () {
      renderBenefits(document.getElementById('mayaAgenticsBenefitsCard'), null);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else mount();
  }
})(typeof window === 'undefined' ? globalThis : window);
