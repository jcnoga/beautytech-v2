content = open('C:/projetos/beautytech-v2/frontend/src/App.tsx', encoding='utf-8').read()

old = """const MENU = [
  { id:"dashboard",     label:"Dashboard",    icon:"*" },
  { id:"agenda",        label:"Agenda",        icon:"o" },
  { id:"clients",       label:"Clientes",      icon:"o" },
  { id:"professionals", label:"Profissionais", icon:"*" },
  { id:"services",      label:"Servicos",      icon:"*" },
  { id:"packages",      label:"Pacotes",       icon:"o" },
  { id:"financial",     label:"Financeiro",    icon:"o" },
  { id:"commissions",   label:"Comissoes",     icon:"o" },
  { id:"crm",           label:"CRM",           icon:"o" },
  { id:"fidelity",      label:"Fidelidade",    icon:"o" },
  { id:"automations",   label:"Automacoes",    icon:"!" },
  { id:"notifications", label:"Notificacoes",  icon:"!" },
  { id:"whatsapp", label:"WhatsApp", icon:"W" },
];"""

new = """const MENU = [
  { id:"dashboard",     label:"Dashboard",    icon:"*", premium:false },
  { id:"agenda",        label:"Agenda",        icon:"o", premium:false },
  { id:"clients",       label:"Clientes",      icon:"o", premium:false },
  { id:"professionals", label:"Profissionais", icon:"*", premium:false },
  { id:"services",      label:"Servicos",      icon:"*", premium:false },
  { id:"packages",      label:"Pacotes",       icon:"o", premium:false },
  { id:"financial",     label:"Financeiro",    icon:"o", premium:false },
  { id:"commissions",   label:"Comissoes",     icon:"o", premium:true },
  { id:"crm",           label:"CRM",           icon:"o", premium:true },
  { id:"fidelity",      label:"Fidelidade",    icon:"o", premium:true },
  { id:"automations",   label:"Automacoes",    icon:"!", premium:true },
  { id:"notifications", label:"Notificacoes",  icon:"!", premium:true },
  { id:"whatsapp",      label:"WhatsApp",      icon:"W", premium:true },
];"""

if old in content:
    open('C:/projetos/beautytech-v2/frontend/src/App.tsx', 'w', encoding='utf-8').write(content.replace(old, new, 1))
    print('CORRIGIDO')
else:
    print('TRECHO NAO ENCONTRADO')
