# ✝️ YouthConnect AI

Plataforma de gestão de jovens para líderes de igreja — Ficha Cadastral Dinâmica, Banco de Talentos e Inteligência Artificial integrada.

## 🚀 Funcionalidades

- **Dashboard** com métricas em tempo real e matriz de disponibilidade
- **Auto-Cadastro** via link público para os próprios jovens preencherem
- **Aprovações** — líder revisa e aprova cadastros com 1 clique
- **Fichas Dinâmicas** com timeline e campos customizáveis
- **Banco de Talentos** com filtros avançados e cruzamento com vagas
- **Chat IA** integrado com Claude (Anthropic) para análise e planejamento

## 🛠 Tecnologias

- React 18 + Vite
- Recharts (gráficos)
- localStorage (persistência local)
- Anthropic API (IA)

## ▶️ Como rodar localmente

```bash
npm install
npm run dev
```

## 🌐 Deploy na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Faça fork/clone deste repositório
2. Importe no [vercel.com](https://vercel.com)
3. Framework: **Vite** (detectado automaticamente)
4. Clique em **Deploy**

## 🔑 Variável de Ambiente (opcional)

Para o Chat IA funcionar em produção, a API key do Claude é injetada automaticamente pelo claude.ai. Em deploy próprio, adicione na Vercel:

```
VITE_ANTHROPIC_API_KEY=sua_chave_aqui
```

## 📁 Estrutura

```
youthconnect-ai/
├── src/
│   ├── App.jsx       # Aplicação completa (SPA)
│   └── main.jsx      # Entry point
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.js
└── package.json
```
