# Caça a Jatos — deploy na Vercel (com amigos + duelo online)

Esse projeto é um único `index.html` estático + uma Vercel Function
(`/api/kv.js`) que serve de banco de dados compartilhado (usando o
Vercel KV / Redis) para o sistema de amigos e duelos.

## 1. Suba os arquivos para um repositório Git

Crie um repositório (GitHub, GitLab ou Bitbucket) com esta estrutura:

```
/
├── index.html
├── package.json
└── api/
    └── kv.js
```

## 2. Importe o projeto na Vercel

1. Acesse https://vercel.com/new
2. Importe o repositório
3. Framework Preset: **Other** (é só HTML estático + 1 function, não precisa de build step)
4. Clique em **Deploy**

Nesse primeiro deploy o site já vai no ar, mas o sistema de amigos
ainda não vai funcionar porque falta o banco.

## 3. Crie e conecte um banco Vercel KV

1. No painel do seu projeto na Vercel, vá em **Storage**
2. Clique em **Create Database** → escolha **KV** (Redis, via Upstash)
3. Depois de criado, clique em **Connect Project** e selecione este projeto
4. Isso adiciona automaticamente as variáveis de ambiente
   `KV_REST_API_URL`, `KV_REST_API_TOKEN` (e afins) ao projeto
5. Vá em **Deployments** e clique em **Redeploy** no último deploy
   (as env vars só passam a valer depois de um novo deploy)

## 4. Teste

Abra o site em duas abas anônimas diferentes (ou dois dispositivos),
crie duas contas de piloto diferentes, adicione uma como amiga da
outra pelo nome de usuário na aba **👥 Amigos**, aceite o pedido e
clique em **⚔ DUELO** para convidar para uma partida.

## Como funciona por baixo dos panos

- **Contas de jogador, hangar e progresso (XP, naves, baús)**
  continuam salvos no `localStorage` do navegador — são "locais",
  como já eram antes.
- **Amigos, status online e duelos** ficam no Vercel KV, acessado
  pela function `/api/kv`, que só aceita chaves com os prefixos
  `friends:`, `presence:`, `duelinvite:` e `duelroom:` (protegendo
  o banco de virar um KV público genérico).
- O duelo sincroniza a posição/vida dos jogadores a cada ~180ms
  (polling), então é "quase tempo real" — bom o suficiente para um
  duelo casual, mas não é netcode de jogo competitivo profissional.
- Registros de convite/partida expiram sozinhos depois de 24h.

## Limitações a saber

- Como o nome de piloto é só um cadastro local (sem verificação de
  e-mail/servidor central de contas), duas pessoas em navegadores
  diferentes podem, em teoria, escolher o mesmo nome — o sistema de
  amigos usa esse nome como identificador único.
- No duelo, o combate foi simplificado para só o canhão (sem
  mísseis/habilidades), para manter a sincronização simples e
  confiável.
- O plano gratuito do Vercel KV tem limite de requisições — com
  poucos jogadores simultâneos não é problema, mas se o jogo bombar
  vale a pena aumentar os intervalos de polling no código
  (`heartbeat`, `checkForInvite`, `duelSync` no `index.html`).
