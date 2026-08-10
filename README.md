# Caça a Jatos — deploy na Vercel (com amigos + duelo online)

Esse projeto é um único `index.html` estático + uma Vercel Function
(`/api/kv.js`) que serve de banco de dados compartilhado (usando
Postgres via a integração Neon) para o sistema de amigos e duelos.

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

## 3. Crie e conecte um banco Postgres (via Neon, no Marketplace)

1. Acesse https://vercel.com/marketplace/neon diretamente (logado na
   sua conta Vercel) — caminho mais direto. Se preferir, dentro do
   seu projeto: aba **Storage** → **Create Database** / **Browse
   Marketplace** → procure por **Neon**
2. Clique em **Install** / **Add Integration**
3. Você pode deixar a Vercel gerenciar a conta Neon pra você (mais
   simples) ou conectar uma conta Neon já existente
4. Escolha o plano gratuito e dê um nome ao banco/projeto
5. No final do assistente, selecione o **projeto do jogo** pra
   conectar o banco a ele
6. Isso adiciona automaticamente a variável de ambiente de conexão
   (normalmente `DATABASE_URL`, às vezes `POSTGRES_URL` dependendo
   da versão da integração — o código em `api/kv.js` já aceita
   qualquer uma delas)
7. Vá em **Deployments** → três pontinhos no último deploy →
   **Redeploy** (a env var só passa a valer depois de um novo deploy)

Não precisa criar tabela manualmente: a function cria sozinha uma
tabela `kv_store` (chave/valor genérico) na primeira vez que rodar.

## 4. Teste

Abra o site em duas abas anônimas diferentes (ou dois dispositivos),
crie duas contas de piloto diferentes, adicione uma como amiga da
outra pelo nome de usuário na aba **👥 Amigos**, aceite o pedido e
clique em **⚔ DUELO** para convidar para uma partida.

## Como funciona por baixo dos panos

- **Contas de jogador, hangar e progresso (XP, naves, baús)**
  continuam salvos no `localStorage` do navegador — são "locais",
  como já eram antes.
- **Amigos, status online e duelos** ficam num banco Postgres
  (Neon), numa tabela `kv_store` simples, acessada pela function
  `/api/kv`, que só aceita chaves com os prefixos `friends:`,
  `presence:`, `duelinvite:` e `duelroom:` (protegendo o banco de
  virar um KV público genérico).
- O duelo sincroniza a posição/vida dos jogadores a cada ~180ms
  (polling), então é "quase tempo real" — bom o suficiente para um
  duelo casual, mas não é netcode de jogo competitivo profissional.
- Registros de convite/partida são tratados como expirados depois
  de 24h (checado na leitura — não há um job de limpeza automática
  rodando sozinho; linhas antigas só são removidas quando alguém
  tenta ler aquela chave de novo).

## Limitações a saber

- Como o nome de piloto é só um cadastro local (sem verificação de
  e-mail/servidor central de contas), duas pessoas em navegadores
  diferentes podem, em teoria, escolher o mesmo nome — o sistema de
  amigos usa esse nome como identificador único.
- No duelo, o combate foi simplificado para só o canhão (sem
  mísseis/habilidades), para manter a sincronização simples e
  confiável.
- O plano gratuito do Neon tem limite de armazenamento e de tempo de
  computação — com poucos jogadores simultâneos não é problema, mas
  se o jogo bombar vale a pena aumentar os intervalos de polling no
  código (`heartbeat`, `checkForInvite`, `duelSync` no `index.html`)
  e/ou adicionar um job de limpeza periódica na tabela `kv_store`.
