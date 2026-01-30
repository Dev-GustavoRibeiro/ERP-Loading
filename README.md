# Template ZED - Next.js 15 + Supabase Auth

Um template limpo e funcional com autenticação completa, design system moderno e estrutura pronta para desenvolvimento.

## Stack

- **Framework**: Next.js 15 (App Router com Turbopack)
- **Auth**: Supabase Auth (@supabase/ssr)
- **Banco de Dados**: Supabase (PostgreSQL)
- **UI**: Tailwind CSS 4 + Framer Motion
- **Toast**: react-hot-toast
- **Ícones**: Lucide React
- **Background Animado**: thpace

## Funcionalidades do Template

### ✅ Autenticação Completa
- Login com email/senha
- Cadastro de novos usuários
- Recuperação de senha
- Redefinição de senha
- Exclusão de conta
- Proteção de rotas via middleware

### ✅ Design System
- Tema dark moderno com gradientes e efeitos glass
- Componentes reutilizáveis (Button, Input, Card, Avatar, etc.)
- Layout responsivo (Mobile-first)
- Sidebar colapsável
- Header com busca e notificações
- Bottom Navigation para mobile

### ✅ Estrutura de Projeto
- Arquitetura organizada com atomic design
- Hooks reutilizáveis
- Tipagem TypeScript completa
- Configuração de PWA

## Começando

### 1. Clonar e Instalar

```bash
git clone <repo-url> meu-projeto
cd meu-projeto
npm install
```

### 2. Configurar Supabase

1. Crie um projeto no [Supabase](https://supabase.com/dashboard)
2. Copie o arquivo `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
3. Preencha com suas credenciais do Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
   SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
   ```

### 3. Configurar Banco de Dados

Execute as migrations no Supabase SQL Editor:

```bash
# No Supabase Dashboard > SQL Editor
# Execute o arquivo: supabase/migrations/001_initial_schema.sql
```

### 4. Rodar o Projeto

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/              # Rotas públicas de autenticação
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (dashboard)/         # Rotas protegidas
│   │   └── dashboard/
│   │       ├── page.tsx     # Dashboard principal
│   │       └── settings/    # Configurações
│   ├── api/                 # API Routes
│   │   └── account/delete/  # Exclusão de conta
│   └── layout.tsx           # Layout raiz
├── shared/
│   ├── components/
│   │   ├── atoms/           # Button, Input, Avatar, etc.
│   │   ├── molecules/       # Card, Modal
│   │   ├── organisms/       # Header, Sidebar, BottomNav
│   │   └── ui/              # Componentes especiais
│   ├── hooks/               # Hooks reutilizáveis
│   ├── lib/                 # Utilitários e Supabase client
│   ├── styles/              # CSS global
│   └── types/               # Tipos TypeScript
└── public/                  # Assets estáticos
```

## Criando Novos Módulos

### 1. Criar Nova Página

```tsx
// src/app/(dashboard)/dashboard/meu-modulo/page.tsx
'use client'

import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/molecules/Card'

export default function MeuModuloPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Meu Novo Módulo</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Seu conteúdo aqui */}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 2. Adicionar ao Menu

Edite `src/shared/components/organisms/Sidebar.tsx`:

```tsx
const menuItems = [
  {
    section: 'PRINCIPAL',
    items: [
      { title: 'Dashboard', icon: <LayoutDashboard size={iconSize} />, link: '/dashboard', color: 'blue' },
      { title: 'Meu Módulo', icon: <Star size={iconSize} />, link: '/dashboard/meu-modulo', color: 'purple' },
    ],
  },
  // ...
]
```

### 3. Criar Hook (opcional)

```tsx
// src/shared/hooks/useMeuModulo.ts
'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/shared/lib/supabase/client';

export const useMeuModulo = () => {
  const [dados, setDados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Suas funções aqui...

  return {
    dados,
    isLoading,
    // ...
  };
};
```

## Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do seu projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave de serviço (apenas para APIs server-side) |
| `NEXT_PUBLIC_SITE_URL` | URL do site (para redirecionamentos de auth) |

## Segurança

### Middleware de Autenticação

O arquivo `middleware.ts` protege automaticamente as rotas:

- Rotas públicas: `/`, `/login`, `/signup`, `/forgot-password`, `/reset-password`
- Rotas protegidas: `/dashboard/*`

### Row Level Security (RLS)

Configure RLS no Supabase para suas tabelas:

```sql
-- Exemplo: Usuários só veem seus próprios dados
CREATE POLICY "Users can view own data" ON sua_tabela
  FOR SELECT USING (auth.uid() = user_id);
```

## Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Iniciar produção
npm start

# Lint
npm run lint
```

## Customização do Visual

### Cores e Tema

Edite `src/shared/styles/globals.css`:

```css
@theme {
  /* Suas cores customizadas */
  --color-primary: oklch(0.55 0.20 250);
  --color-accent: oklch(0.72 0.18 85);
}
```

### Componentes

Todos os componentes estão em `src/shared/components/` e podem ser customizados:

- **atoms**: Componentes básicos (Button, Input, etc.)
- **molecules**: Composições simples (Card, Modal)
- **organisms**: Composições complexas (Header, Sidebar)

## Licença

MIT
# DASHBOARD-MODULAR-LOADING
