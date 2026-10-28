/**
 * Maya pública Nexa — guia local de funcionalidades.
 * Não recebe dados bancários, tokens, histórico nem instruções de agentes.
 * Nenhuma requisição HTTP, armazenamento ou modelo de IA é utilizado aqui.
 */
export const MAYA_PUBLIC_TOPICS=Object.freeze([
 {id:'expenses',name:'Mila',label:'Meus gastos',keywords:['gasto','despesa','orcamento','orçamento','economiz','conta do mes','conta do mês'],summary:'Organize gastos antes de tomar decisões.',steps:['Separe despesas fixas, variáveis e eventuais.','Confira os últimos lançamentos que você declarou ou importou.','Defina um limite mensal por categoria e revise semanalmente.'],note:'Na beta Nexa PF, Mila analisa os registros do seu próprio espaço, quando fornecidos.'},
 {id:'planning',name:'Liz',label:'Metas e planejamento',keywords:['meta','objetivo','planej','poupar','guardar dinheiro','viagem','reserva'],summary:'Transforme objetivos em etapas possíveis.',steps:['Descreva uma meta clara com valor e data.','Divida o valor desejado pelo número de meses disponíveis.','Registre o progresso e ajuste o plano quando sua realidade mudar.'],note:'Liz acompanha metas cadastradas na Nexa PF beta.'},
 {id:'financial',name:'Nina',label:'Minhas finanças',keywords:['financeir','renda','saldo','patrimonio','patrimônio','extrato','receita','dinheiro'],summary:'Comece com uma visão realista do seu dinheiro.',steps:['Identifique suas contas e a origem de cada saldo.','Separe valores declarados daqueles comprovados por instituições.','Compare entradas, saídas e compromissos sem somar valores duplicados.'],note:'Sem Open Finance ativo, os saldos manuais não são verificados.'},
 {id:'investments',name:'Léo',label:'Investimentos',keywords:['invest','cdb','tesouro','rendimento','ações','acoes','bolsa','fundo imobiliário','fii'],summary:'Entenda sua carteira antes de investir.',steps:['Liste os ativos que você possui e os respectivos valores informados.','Analise prazo, liquidez, risco e concentração por emissor.','Verifique dados e taxas em fontes oficiais antes de decidir.'],note:'Pesquisa informativa: não é recomendação personalizada nem oferta de investimento.'},
 {id:'shopping',name:'Bia',label:'Compras',keywords:['compr','preço','preco','parcela','celular','notebook','cartão de crédito','cartao de credito'],summary:'Considere o custo total de cada compra.',steps:['Compare preço à vista e total parcelado.','Inclua frete, juros, tarifas e garantia na comparação.','Veja quanto as parcelas afetariam seu orçamento mensal.'],note:'A beta inclui avaliação inicial de compras; ofertas de parceiros ainda não estão conectadas.'},
 {id:'simulations',name:'Ben',label:'Simulações',keywords:['simul','cenário','cenario','projeção','projecao','quanto guardar'],summary:'Simule cenários sem prometer rendimento.',steps:['Defina o valor inicial e o prazo.','Use valores conservadores e revise os compromissos assumidos.','Compare possibilidades sem tratar estimativas como resultados garantidos.'],note:'Ben oferece simulações explicáveis na beta, sem execução financeira.'},
 {id:'payments',name:'Ravi',label:'Contas a vencer',keywords:['boleto','vencimento','contas a pagar','conta a pagar','pagamento'],summary:'Organize vencimentos sem iniciar pagamentos.',steps:['Liste contas recorrentes e datas de vencimento.','Separe prioridades e confira o valor atualizado de cada cobrança.','Ative seus próprios lembretes para evitar atrasos.'],note:'Ravi não paga Pix ou boletos automaticamente.'},
 {id:'contracts',name:'Mel',label:'Contratos',keywords:['contrato','documento','cláusula','clausula','assinatura'],summary:'Revise pontos essenciais de um contrato.',steps:['Confira objeto, partes, prazos e penalidades.','Identifique condições de cancelamento e reajuste.','Procure auxílio profissional quando houver consequências jurídicas relevantes.'],note:'Checklist informativo; não substitui assessoria jurídica.'},
 {id:'public_services',name:'Theo',label:'Serviços públicos',keywords:['iptu','detran','cin','rg','licença','licenca','serviço público','servico publico'],summary:'Organize os documentos antes de abrir um serviço.',steps:['Identifique o órgão competente e o serviço exato.','Confira exigências no portal oficial do órgão.','Guarde protocolo, prazo e comprovantes em local seguro.'],note:'Theo orienta o caminho; não protocola pedidos em seu nome.'},
 {id:'debt_review',name:'Joca',label:'Dívidas',keywords:['dívida','divida','renegoci','acordo','inadimpl','serasa','cobrança','cobranca'],summary:'Avalie acordos pelo custo total.',steps:['Confirme a origem e o valor atualizado da dívida.','Compare valor final, juros, parcelas e condições de quitação.','Exija confirmação por canal oficial antes de realizar qualquer pagamento.'],note:'Não consulta CPF nem negocia com credores automaticamente.'},
 {id:'legal_support',name:'Bella',label:'Meus direitos',keywords:['direito','lei','judicial','justiça','justica','advogado','consumidor','procon'],summary:'Entenda o problema antes de escolher o próximo passo.',steps:['Organize fatos, datas e documentos.','Procure fontes oficiais sobre o assunto.','Quando necessário, consulte um profissional habilitado.'],note:'Orientações gerais não substituem parecer jurídico.'},
 {id:'crypto',name:'Assistente Nexa',label:'Cripto & Wallet',keywords:['cripto','wallet','usdc','btc','bitcoin','metamask','pix','transfer','sacar','conectar carteira'],summary:'A Wallet é separada da Maya pessoal.',steps:['Entre na Nexa Wallet usando seu acesso original.','Confira saldos e redes exclusivamente na carteira autenticada.','Autorize cada transação no fluxo da Wallet; nenhum agente movimenta fundos por esta página.'],note:'O Assistente da Wallet e os Agentics Premium permanecem em homologação independente.'}
]);
export function publicMayaFindTopic(query){
 const normalized=String(query??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 if(normalized.length<3||normalized.length>200)return null;
 return MAYA_PUBLIC_TOPICS.find(topic=>topic.keywords.some(keyword=>normalized.includes(keyword.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase())))??null;
}
export function publicMayaTopicById(id){return MAYA_PUBLIC_TOPICS.find(topic=>topic.id===id)??null;}
function mountPublicMaya(){
 const form=document.getElementById('maya-public-form');
 const input=document.getElementById('maya-public-topic');
 const result=document.getElementById('maya-public-result');
 const shortcuts=document.getElementById('maya-public-shortcuts');
 if(!form||!input||!result||!shortcuts)return;
 const add=(parent,tag,content,cls)=>{
  const node=document.createElement(tag);if(cls)node.className=cls;
  if(content)node.textContent=content;parent.append(node);return node;
 };
 function show(topic){
  result.replaceChildren();
  if(!topic){
   add(result,'h2','Não identifiquei o assunto.');
   add(result,'p','Experimente uma das opções abaixo. Não informe dados bancários, CPF, senhas ou chaves.');
   result.hidden=false;return;
  }
  add(result,'div','ESPECIALISTA NEXA · GUIA PÚBLICO','maya-result-kicker');
  add(result,'h2',topic.name+' · '+topic.label);
  add(result,'p',topic.summary,'maya-result-summary');
  const list=add(result,'ol',null,'maya-result-steps');
  for(const step of topic.steps)add(list,'li',step);
  add(result,'p',topic.note,'maya-result-note');
  const actions=add(result,'div',null,'maya-result-actions');
  const link=add(actions,'a',topic.id==='crypto'?'Abrir a Nexa Wallet':'Conhecer a beta da Nexa PF','maya-button maya-button-primary');
  link.href=topic.id==='crypto'?'/wallet':'/meu-espaco';
  const invite=add(actions,'a','Solicitar convite para a Nexa PF','maya-button maya-button-secondary');
  invite.href='/meu-espaco#pedir-acesso';
  result.hidden=false;
  result.focus({preventScroll:false});
 }
 for(const topic of MAYA_PUBLIC_TOPICS){
  const button=add(shortcuts,'button',topic.label,'maya-chip');
  button.type='button';
  button.addEventListener('click',()=>{input.value='';show(topic);});
 }
 form.addEventListener('submit',event=>{
  event.preventDefault();
  show(publicMayaFindTopic(input.value));
  // Clear immediately: no prompts persist in browser storage or network.
  input.value='';
 });
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountPublicMaya,{once:true});
 else mountPublicMaya();
}
