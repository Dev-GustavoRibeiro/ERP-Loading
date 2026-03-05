# PRD - Product Requirements Document
## ZED ERP - Sistema de Gestao Empresarial Modular

**Versao:** 1.0.0
**Data:** 10 de Fevereiro de 2026
**Status:** Em Desenvolvimento
**Autor:** Equipe ZED

---

## 1. Visao Geral do Produto

### 1.1 O que e o ZED ERP?

O **ZED ERP** e um sistema de gestao empresarial (ERP) modular, construido como uma aplicacao web progressiva (PWA), voltado para pequenas e medias empresas brasileiras. Ele centraliza a gestao de vendas, financeiro, estoque, fiscal, ordens de servico, CRM e recursos humanos em uma unica plataforma intuitiva e moderna.

### 1.2 Proposta de Valor

- **Modular:** Cada modulo do ERP funciona de forma independente, permitindo que a empresa utilize apenas o que precisa.
- **Multi-empresa:** Suporte nativo a multiplas empresas e filiais com isolamento completo de dados via Row Level Security (RLS).
- **PWA:** Instalavel como aplicativo nativo em dispositivos moveis e desktops, com experiencia offline-first.
- **Responsivo:** Interface adaptativa mobile-first com navegacao otimizada para todos os tamanhos de tela.
- **IA Integrada:** Assistente virtual ZED com inteligencia artificial do Google Generative AI para suporte operacional.
- **Controle de Acesso Granular (RBAC):** Sistema de permissoes por modulo, acao e nivel hierarquico.

### 1.3 Publico-Alvo

| Segmento | Descricao |
|---|---|
| **Microempresas** | Comercios locais, prestadores de servico, MEIs |
| **Pequenas Empresas** | Lojas, oficinas, escritorios com ate 50 funcionarios |
| **Medias Empresas** | Empresas com multiplas filiais e equipes distribuidas |

### 1.4 Problema que Resolve

Pequenas e medias empresas brasileiras frequentemente utilizam planilhas, cadernos ou multiplos sistemas desconectados para gerir suas operacoes. O ZED ERP resolve isso ao oferecer:

- Uma plataforma unica e acessivel (web + PWA)
- Custo acessivel comparado a ERPs tradicionais
- Interface moderna e intuitiva (sem curva de aprendizado complexa)
- Adequacao a legislacao fiscal brasileira (NF-e, NFC-e, SPED)

---

## 2. Stack Tecnologica

### 2.1 Frontend

| Tecnologia | Versao | Funcao |
|---|---|---|
| **Next.js** | 15.0.3 | Framework React com App Router e SSR |
| **React** | 19.0.0 | Biblioteca de UI |
| **TypeScript** | 5.7.2 | Tipagem estatica |
| **Tailwind CSS** | 4.0.0 | Estilizacao utility-first |
| **Framer Motion** | 11.11.17 | Animacoes e transicoes |
| **Zustand** | 5.0.1 | Gerenciamento de estado global |
| **Recharts** | 2.14.1 | Graficos e visualizacoes de dados |
| **Lucide React** | 0.460.0 | Biblioteca de icones |

### 2.2 Backend

| Tecnologia | Funcao |
|---|---|
| **Supabase** | Backend-as-a-Service (PostgreSQL, Auth, Storage, RLS) |
| **Next.js API Routes** | Endpoints REST para operacoes administrativas |
| **Google Generative AI** | Motor de IA para o assistente virtual ZED |

### 2.3 Infraestrutura

| Tecnologia | Funcao |
|---|---|
| **Supabase Cloud** | Banco de dados, autenticacao, storage |
| **Vercel** (planejado) | Hospedagem e deploy da aplicacao Next.js |
| **Turbopack** | Bundler para desenvolvimento |

---

## 3. Arquitetura do Sistema

### 3.1 Padrao Arquitetural

O projeto segue a arquitetura **Atomic Design** combinada com **Modular Domain Architecture**:

```
src/
├── app/                    # Rotas e paginas (Next.js App Router)
│   ├── (auth)/             # Rotas publicas de autenticacao
│   ├── (dashboard)/        # Rotas protegidas do dashboard
│   └── api/                # API Routes (REST)
├── modules/                # Modulos de negocio (dominio)
│   ├── core/               # Nucleo: empresas, permissoes, auditoria
│   ├── cadastros/          # Clientes, fornecedores, produtos
│   ├── vendas/             # Pedidos de venda, orcamentos
│   ├── compras/            # Pedidos de compra, cotacoes
│   ├── estoque/            # Movimentacoes, saldos, inventarios
│   ├── financeiro/         # Contas a pagar/receber, fluxo de caixa
│   ├── fiscal/             # NF-e, NFC-e, SPED
│   ├── pdv/                # Ponto de venda
│   └── os/                 # Ordens de servico
└── shared/                 # Codigo compartilhado
    ├── components/         # Componentes UI (Atomic Design)
    │   ├── atoms/          # Botoes, inputs, badges
    │   ├── molecules/      # Cards, modais, toasts
    │   ├── organisms/      # Sidebar, header, seletores
    │   ├── templates/      # Templates de pagina reutilizaveis
    │   └── ui/             # Componentes de efeitos visuais
    ├── hooks/              # Hooks reutilizaveis
    ├── lib/                # Bibliotecas e clientes
    └── types/              # Tipos TypeScript globais
```

### 3.2 Isolamento Multi-Empresa

Todos os dados sao isolados por `empresa_id` usando Row Level Security (RLS) do PostgreSQL/Supabase:

- Cada tabela operacional possui `empresa_id` como chave estrangeira obrigatoria
- Politicas RLS garantem que usuarios so acessem dados de empresas vinculadas
- A troca de empresa ativa e feita via `EmpresaSelector` e persiste em `localStorage`

### 3.3 Middleware e Protecao de Rotas

```
Middleware (src/middleware.ts)
├── Rotas Publicas: /login, /signup, /forgot-password, /reset-password
├── Rotas Protegidas: /dashboard/* (requer autenticacao)
├── Redirecionamentos:
│   ├── Nao autenticado em rota protegida → /login?next=...
│   ├── Autenticado em rota de auth → /dashboard
│   └── Raiz (/) para autenticado → /dashboard
└── Bypass: API routes, arquivos estaticos, internos do Next.js
```

---

## 4. Modulos Funcionais

### 4.1 Dashboard Principal (`/dashboard`)

**Descricao:** Tela inicial com visao geral da empresa em tempo real.

**Funcionalidades:**
- Saudacao personalizada com nome do usuario e data atual
- KPIs em tempo real:
  - Vendas do dia (R$)
  - Vendas do mes (R$)
  - Ticket medio (R$)
  - Clientes ativos (quantidade)
  - OS em aberto (quantidade)
- Card financeiro com contas a receber e a pagar do dia
- Painel de alertas:
  - Produtos com estoque baixo
  - Ordens de servico em aberto
  - Contas a pagar vencendo hoje
- Acesso rapido aos modulos principais (PDV, Vendas, Clientes, Fiscal, Estoque, Relatorios)

---

### 4.2 Modulo de Autenticacao (`/login`, `/signup`, `/forgot-password`, `/reset-password`)

**Descricao:** Sistema completo de autenticacao e gerenciamento de conta.

**Funcionalidades:**
- Login com email/senha via Supabase Auth
- Cadastro de novos usuarios
- Recuperacao de senha por email
- Redefinicao de senha com token seguro
- Gerenciamento de perfil (nome, avatar)
- Upload de avatar com preview
- Exclusao de conta (com cascade cleanup)

---

### 4.3 Modulo Core - Empresas e Permissoes

**Descricao:** Nucleo do sistema responsavel pela gestao multi-empresa e controle de acesso.

**4.3.1 Gestao de Empresas**
- Cadastro de empresas com CNPJ, razao social, nome fantasia
- Gestao de filiais vinculadas
- Configuracoes por empresa (moeda, fuso horario, formato de data)
- Ativacao/desativacao de empresas
- Provisionamento automatico (API admin)

**4.3.2 Controle de Acesso (RBAC)**
- Definicao de modulos e acoes (visualizar, criar, editar, excluir, exportar)
- Perfis de acesso com niveis hierarquicos:
  - **Nivel 1:** Operador
  - **Nivel 2:** Supervisor
  - **Nivel 3:** Gerente
  - **Nivel 4:** Administrador
  - **Nivel 5:** Super Administrador
- Vinculacao usuario-empresa-perfil
- Hooks de contexto para verificacao de permissoes (`usePermissaoContext`)

**4.3.3 Auditoria**
- Log completo de todas as alteracoes no sistema
- Registro de: tabela, registro, acao, dados antes/depois, usuario, IP, user-agent
- Rastreabilidade completa para compliance

---

### 4.4 Modulo de Cadastros (`/dashboard/clientes`)

**Descricao:** Gestao centralizada de entidades cadastrais do sistema.

**4.4.1 Clientes**
- Cadastro completo (PF/PJ): nome, CPF/CNPJ, endereco, contatos
- Status ativo/inativo
- Historico de interacoes
- Busca e filtros avancados

**4.4.2 Fornecedores**
- Cadastro com dados fiscais (IE, IM, CNPJ)
- Gestao de contatos
- Vinculacao com pedidos de compra

**4.4.3 Produtos**
- Cadastro com codigo, descricao, categoria (hierarquica)
- Dados fiscais: NCM, CFOP, CSOSN/CST
- Unidades de medida
- Controle de precos (custo, venda, margem)
- Formulario dedicado (`ProdutoForm`)

**4.4.4 Servicos**
- Cadastro de servicos prestados
- Codigo de servico municipal
- Aliquota ISS

**4.4.5 Entidades Auxiliares**
- Categorias de produto (hierarquicas/arvore)
- Unidades de medida
- Formas de pagamento
- Condicoes de pagamento
- Transportadoras
- Vendedores (com comissao)
- Codigos NCM e CFOP

---

### 4.5 Modulo de Vendas (`/dashboard/vendas`)

**Descricao:** Gestao completa do ciclo de vendas.

**Funcionalidades:**
- Orcamentos (cotacao para cliente)
  - Criacao, edicao, aprovacao, recusa
  - Conversao de orcamento em pedido
- Pedidos de venda
  - Status: rascunho, confirmado, em separacao, faturado, cancelado
  - Itens com quantidade, preco, descontos
  - Calculo automatico de impostos
- Comissoes de vendedores
  - Calculo automatico por percentual
  - Status: pendente, aprovada, paga

---

### 4.6 Modulo Financeiro (`/dashboard/financeiro`)

**Descricao:** Controle financeiro completo da empresa.

**Funcionalidades:**
- **Contas a Pagar**
  - Cadastro de titulos (fornecedores, despesas)
  - Controle de vencimentos
  - Baixa parcial/total
  - Alertas de vencimento
- **Contas a Receber**
  - Titulos gerados por vendas
  - Controle de recebimentos
  - Inadimplencia
- **Plano de Contas**
  - Estrutura hierarquica (ativo, passivo, receita, despesa)
  - Centros de custo
- **Contas Bancarias**
  - Cadastro de contas (corrente, poupanca, caixa)
  - Movimentacoes bancarias (credito/debito)
  - Conciliacao bancaria
- **Fluxo de Caixa**
  - Projecao de entradas e saidas
  - Saldo projetado por periodo
- **Boletos**
  - Geracao e controle de boletos bancarios

---

### 4.7 Modulo de Estoque/Inventario (`/dashboard/inventario`)

**Descricao:** Controle completo de estoque e movimentacoes.

**Funcionalidades:**
- **Almoxarifados**
  - Cadastro de depositos/locais de armazenamento
- **Movimentacoes de Estoque**
  - Entrada, saida, transferencia, ajuste, devolucao
  - Formulario dedicado (`MovimentacaoForm`)
  - Vinculacao com documentos (NF, pedido, OS)
- **Saldos de Estoque** (tabela desnormalizada para performance)
  - Quantidade atual por produto/almoxarifado
  - Alertas de estoque minimo
- **Inventarios**
  - Criacao de inventario periodico
  - Contagem por itens
  - Ajustes automaticos de saldo

---

### 4.8 Modulo de Compras

**Descricao:** Gestao do ciclo de compras.

**Funcionalidades:**
- **Requisicoes de Compra**
  - Solicitacao interna de materiais
  - Aprovacao por niveis hierarquicos
- **Cotacoes**
  - Envio para multiplos fornecedores
  - Comparacao de precos e condicoes
  - Selecao do fornecedor vencedor
- **Pedidos de Compra**
  - Geracao a partir de cotacoes
  - Acompanhamento de entrega
  - Vinculacao com entrada de estoque e NF

---

### 4.9 Modulo Fiscal (`/dashboard/fiscal`)

**Descricao:** Emissao e gestao de documentos fiscais eletronicos.

**Funcionalidades:**
- **NF-e (Nota Fiscal Eletronica)**
  - Emissao de notas de venda
  - Cancelamento e carta de correcao
  - Inutilizacao de numeracao
- **NFC-e (Nota Fiscal do Consumidor)**
  - Emissao para consumidor final (PDV)
- **Gestao de XML**
  - Armazenamento e consulta de XMLs
  - Download e exportacao
- **SPED**
  - Geracao de arquivos SPED Fiscal
  - Configuracoes de escrituracao
- **Dados Fiscais**
  - Tabela NCM
  - Tabela CFOP
  - Regras tributarias por produto/operacao

---

### 4.10 Modulo PDV - Ponto de Venda (`/dashboard/pdv`)

**Descricao:** Frente de caixa para vendas diretas ao consumidor.

**Funcionalidades:**
- Interface otimizada para operacao rapida
- Busca de produtos por codigo/nome
- Lancamento de itens
- Formas de pagamento multiplas
- Emissao de NFC-e integrada
- Abertura e fechamento de caixa
- Registro de operacoes

---

### 4.11 Modulo OS - Ordens de Servico (`/dashboard/os`)

**Descricao:** Gestao de ordens de servico para prestadores.

**Funcionalidades:**
- Abertura de OS vinculada a cliente
- Status: aberta, em andamento, aguardando, concluida, cancelada
- Lancamento de servicos e pecas
- Controle de tempo e custos
- Acompanhamento em tempo real
- Historico por cliente

---

### 4.12 Modulo CRM (`/dashboard/crm`)

**Descricao:** Gestao de relacionamento com o cliente.

**Funcionalidades:**
- Pipeline de vendas visual
- Registro de interacoes e atividades
- Acompanhamento de leads
- Funil de conversao
- Historico de contatos

---

### 4.13 Modulo Kanban (`/dashboard/kanban`)

**Descricao:** Quadro Kanban para gestao visual de tarefas e projetos.

**Funcionalidades:**
- Colunas customizaveis
- Cards com prioridade e responsavel
- Drag and drop
- Filtros e busca
- Vinculacao com OS e vendas

---

### 4.14 Modulo RH - Recursos Humanos (`/dashboard/rh`)

**Descricao:** Gestao basica de recursos humanos.

**Funcionalidades:**
- Cadastro de funcionarios
- Controle de departamentos
- Gestao de cargos e salarios
- Controle de frequencia
- Ferias e afastamentos

---

### 4.15 Modulo de Relatorios (`/dashboard/relatorios`)

**Descricao:** Central de relatorios e business intelligence.

**Funcionalidades:**
- Relatorios financeiros (DRE, balancete)
- Relatorios de vendas (por periodo, vendedor, produto)
- Relatorios de estoque (posicao, movimentacao, curva ABC)
- Relatorios fiscais (livros fiscais, apuracoes)
- Exportacao em PDF e Excel
- Graficos interativos (Recharts)

---

### 4.16 Configuracoes (`/dashboard/settings`)

**Descricao:** Painel de configuracoes do sistema e perfil.

**Funcionalidades:**
- Edicao de perfil (nome, email, avatar)
- Configuracoes de empresa
- Gestao de usuarios e permissoes
- Preferencias de notificacao
- Exclusao de conta

---

## 5. Componentes Compartilhados

### 5.1 Design System

| Nivel | Componentes |
|---|---|
| **Atoms** | Avatar, Badge, Button, Input, Spinner, Typography, ZedLogo |
| **Molecules** | Card, Modal, Toast, ConfirmationModal |
| **Organisms** | Sidebar, Header, MobileHeader, BottomNav, BackgroundGradient, EmpresaSelector, ZedAssistant |
| **Templates** | PageTemplate (template reutilizavel com stats, modulos e acoes) |
| **UI** | AnimatedGradientText, BorderBeam, MagicCard |

### 5.2 Design Visual

- **Tema:** Dark mode com gradientes e efeitos glass
- **Cores Primarias:** Azul (#3B82F6), Roxo (#8B5CF6), Esmeralda (#10B981), Ambar (#F59E0B)
- **Background:** #0A101F (escuro profundo)
- **Tipografia:** Inter (font-family padrao)
- **Efeitos:** Backdrop blur, gradientes multicoloridos, sombras com cor
- **Animacoes:** Transicoes suaves com Framer Motion (hover, entrada, saida)

### 5.3 Hooks Compartilhados

| Hook | Funcao |
|---|---|
| `useSupabaseAuth` | Login, signup, logout, delete account |
| `useUserProfile` | Perfil do usuario, upload de avatar |
| `useEmpresaId` | Obtem empresa ativa do localStorage |
| `useResponsiveScreen` | Detecta tamanho de tela e breakpoints |
| `useNotifications` | Gerencia notificacoes do sistema |
| `useLocalStorage` | Utilitarios de localStorage |
| `useMediaUpload` | Upload de midias |
| `useEmpresaContext` | Contexto da empresa ativa (modulo core) |
| `usePermissaoContext` | Contexto de permissoes RBAC (modulo core) |

---

## 6. API Routes

### 6.1 Rotas Administrativas (requerem `x-provisioning-secret`)

| Metodo | Rota | Descricao |
|---|---|---|
| `GET` | `/api/admin/companies` | Lista empresas do usuario |
| `POST` | `/api/admin/companies` | Cria empresa e vincula usuario |
| `PUT` | `/api/admin/companies` | Atualiza dados da empresa |
| `DELETE` | `/api/admin/companies` | Remove empresa |
| `PATCH` | `/api/admin/companies` | Ativa/desativa empresa |
| `POST` | `/api/admin/create-user` | Cria usuario admin (teste) |
| `POST` | `/api/admin/provision` | Provisiona empresa com admin |

### 6.2 Rotas de Conta

| Metodo | Rota | Descricao |
|---|---|---|
| `DELETE` | `/api/account/delete` | Exclui conta com cascade cleanup |

---

## 7. Banco de Dados

### 7.1 Visao Geral

O banco de dados PostgreSQL (Supabase) possui **60+ tabelas** organizadas em 8 migrations:

### 7.2 Tabelas por Dominio

**Core (Migration 001-004):**
- `profiles` - Perfis de usuario
- `admin_users` - Usuarios administradores (super_admin, admin, moderator, support)

**ERP Core (Migration 005):**
- `empresas` - Empresas
- `filiais` - Filiais
- `empresa_configuracoes` - Configuracoes por empresa
- `modulos` - Modulos do sistema
- `modulo_acoes` - Acoes por modulo
- `perfis_acesso` - Perfis de acesso (RBAC)
- `perfil_permissoes` - Permissoes por perfil
- `usuario_empresas` - Vinculacao usuario-empresa
- `audit_log` - Log de auditoria

**Cadastros (Migration 006):**
- `unidades_medida`, `formas_pagamento`, `condicoes_pagamento`
- `categorias_produto` (hierarquica com parent_id)
- `ncms`, `cfops`
- `clientes`, `fornecedores`, `transportadoras`, `vendedores`
- `produtos`, `servicos`

**Operacional (Migration 007):**
- `almoxarifados` - Depositos
- `movimentacoes_estoque`, `saldos_estoque` - Estoque
- `inventarios`, `inventario_itens` - Inventario
- `requisicoes_compra`, `requisicao_itens` - Requisicoes
- `cotacoes`, `cotacao_fornecedores`, `cotacao_itens` - Cotacoes
- `pedidos_compra`, `pedido_compra_itens` - Compras
- `orcamentos`, `orcamento_itens` - Orcamentos
- `pedidos_venda`, `pedido_venda_itens` - Vendas
- `comissoes` - Comissoes

**Fiscal e Financeiro (Migration 008):**
- `notas_fiscais`, `nota_fiscal_itens` - Notas fiscais
- `nfe_inutilizacoes`, `nfe_cartas_correcao` - Complementos fiscais
- `plano_contas`, `centros_custo` - Plano de contas
- `contas_bancarias`, `movimentacoes_bancarias` - Bancos
- `contas_pagar`, `contas_receber` - Financeiro

### 7.3 Seguranca dos Dados

- **RLS (Row Level Security)** habilitado em TODAS as tabelas
- Politicas baseadas em `empresa_id` e `user_id`
- Isolamento completo entre empresas
- Service Role Key usada apenas em API Routes server-side

---

## 8. Seguranca

### 8.1 Autenticacao
- Supabase Auth com JWT
- Middleware de protecao de rotas
- Tokens de sessao gerenciados pelo `@supabase/ssr`

### 8.2 Autorizacao
- RBAC com 5 niveis hierarquicos
- Permissoes granulares por modulo e acao
- Verificacao client-side via hooks de contexto
- Verificacao server-side via RLS

### 8.3 Protecao de API
- Header `x-provisioning-secret` para rotas admin
- `SUPABASE_SERVICE_ROLE_KEY` apenas no server
- Validacao de sessao em todas as API Routes

### 8.4 Dados
- Row Level Security em todas as tabelas
- Auditoria completa (audit_log)
- Soft-delete (campo `ativo` em entidades principais)

---

## 9. Experiencia do Usuario (UX)

### 9.1 Desktop
- Sidebar colapsavel com animacoes suaves
- Logo expandida/compacta conforme estado
- Navegacao organizada por secoes (Principal, Gestao, Operacoes, Sistema)
- Seletor de empresa no sidebar
- Header com notificacoes e perfil

### 9.2 Mobile (PWA)
- Header fixo com logo, seletor de empresa, notificacoes e avatar
- Bottom navigation com 5 abas (Inicio, Gestao, Operacoes, Ajustes, Sair)
- Bottom sheets para sub-menus (expansao de secoes)
- Bottom sheet de notificacoes com contagem de nao lidas
- Bottom sheet de perfil com edicao de avatar
- Safe areas para dispositivos com notch/barra de gestos

### 9.3 Animacoes e Feedback
- Transicoes de entrada com Framer Motion (fade + slide)
- Hover effects com scale e translate
- Loading states com Spinner
- Toasts para feedback de acoes (react-hot-toast)
- Modais de confirmacao para acoes destrutivas

---

## 10. PWA (Progressive Web App)

### 10.1 Caracteristicas
- Instalavel em dispositivos moveis e desktops
- Manifest.json configurado para standalone display
- Icones otimizados para todas as plataformas
- Orientacao portrait-primary
- Shortcuts de acesso rapido (Dashboard, PDV, Vendas)
- Background e theme colors consistentes com o design

### 10.2 Categorias
- Negocios (business)
- Produtividade (productivity)
- Financas (finance)

---

## 11. Variaveis de Ambiente

| Variavel | Tipo | Descricao |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Publica | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publica | Chave anonima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Privada | Chave de servico (server-side) |
| `PROVISIONING_SECRET` | Privada | Segredo para API admin |

---

## 12. Roadmap e Proximas Etapas

### Fase Atual (v1.0) - MVP
- [x] Autenticacao completa (login, signup, recuperacao)
- [x] Dashboard com KPIs em tempo real
- [x] Sistema multi-empresa com RBAC
- [x] Modulo de Cadastros (clientes, fornecedores, produtos)
- [x] Modulo Financeiro (contas a pagar/receber, fluxo de caixa)
- [x] Modulo de Vendas (orcamentos, pedidos)
- [x] Modulo de Estoque (movimentacoes, saldos)
- [x] Modulo Fiscal (NF-e, NFC-e)
- [x] Interface responsiva (desktop + mobile PWA)
- [x] Sidebar adaptativa com bottom navigation mobile

### Fase 2 (v1.1) - Expansao
- [ ] Modulo PDV completo com frente de caixa
- [ ] Modulo OS com acompanhamento em tempo real
- [ ] Modulo CRM com pipeline visual
- [ ] Kanban com drag and drop
- [ ] Notificacoes push (PWA)
- [ ] Relatorios avancados com exportacao

### Fase 3 (v1.2) - Integracao e IA
- [ ] Assistente ZED com IA generativa
- [ ] Integracao bancaria (Open Finance)
- [ ] Emissao real de NF-e via SEFAZ
- [ ] Dashboard analitico com BI
- [ ] Modulo RH completo
- [ ] API publica para integracoes

### Fase 4 (v2.0) - Escala
- [ ] Multi-tenant SaaS com planos
- [ ] Marketplace de modulos
- [ ] White-label para revendedores
- [ ] App nativo (React Native)
- [ ] Offline-first com sync
- [ ] Integracao com marketplaces (Mercado Livre, Shopee)

---

## 13. Metricas de Sucesso

| Metrica | Meta v1.0 |
|---|---|
| Tempo de carregamento (LCP) | < 2.5s |
| Usuarios ativos mensais | 100+ |
| Uptime | 99.5% |
| Score Lighthouse (Performance) | > 85 |
| Score Lighthouse (Acessibilidade) | > 90 |
| NPS (Net Promoter Score) | > 40 |

---

*Documento gerado em 10/02/2026. Sujeito a atualizacoes conforme evolucao do produto.*
