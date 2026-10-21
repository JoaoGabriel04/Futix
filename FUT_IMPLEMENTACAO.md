# Fut: Plano de Implementação para o Claude Code

Plataforma web para organizar um racha de futebol local e gratuito. Este documento é a fonte única de verdade. Leia inteiro antes de qualquer ação.

---

## 0. REGRAS DE OURO (leia primeiro)

1. **Nada é escrito sem aprovação explícita.** O projeto é dividido em fases. Cada fase termina em um **PORTÃO DE APROVAÇÃO**. Ao chegar nele, pare, apresente o relatório pedido e espere o humano responder exatamente `APROVADO FASE N`. Qualquer outra resposta significa ajustar, não avançar.
2. **Antes de cada fase**, apresente um plano curto (arquivos que vai criar/alterar, comandos que vai rodar) e espere `APROVADO PLANO FASE N`. Só então escreva código.
3. **Auditar antes de consertar.** Se algo quebrar, primeiro documente o achado (arquivo, linha, causa), proponha a correção, espere aprovação e só então aplique. Nada de patch às cegas.
4. **Sem emojis** na interface, nos commits de UI ou nos textos de tela. Ícones apenas via **Lucide React**.
5. **SWR** para todo GET no frontend. **Não use TanStack Query**, nem sugira.
6. **Não invente escopo.** O que está em "Fora do escopo do MVP" (seção 13) não deve ser feito nem preparado.
7. **Não instale bibliotecas fora da seção 2** sem pedir aprovação com justificativa.
8. Todo texto visível ao usuário em **português do Brasil**. Código, nomes de variáveis, rotas e commits em **inglês**.
9. Nunca commitar segredos. Use `.env` e mantenha `.env.example` atualizado.
10. Ao final de cada fase, rode lint, typecheck e testes e inclua o resultado no relatório.

---

## 1. Contexto do produto

Racha gratuito da comunidade (Grajaú, MA). Cerca de 16 jogadores de linha por jogo. O objetivo é organizar quem joga, sem entrada de pessoas não autorizadas e sem depender de o organizador estar online o tempo todo.

### Conceitos
- **Conta:** cadastro 100% livre (Google ou Discord), com avatar opcional. Ter conta não dá acesso a nenhuma partida.
- **Sala:** uma partida agendada (data, hora, local). A aprovação acontece **só na hora de entrar na sala**.
- **Organizador:** quem cria a sala. Pode nomear **até 2 co-organizadores** por sala. Todos os três aprovam pedidos.
- **Função na sala:** ao pedir entrada, o jogador escolhe **Jogador de linha** ou **Goleiro**. Uma função por sala.
- **Fluxo de entrada:** Pede para entrar -> escolhe a função -> organizador (ou co-organizador) aceita ou recusa.
- **Vagas:** o organizador define (a) vagas de linha, (b) jogadores por time (geralmente 4) e (c) vagas de goleiro.
- **Vagas cheias:** se a função escolhida está lotada, o pedido vai para a **lista de espera** daquela função.
- **Sorteio:** aleatório, só com jogadores de linha confirmados (sem "time panela"). Goleiros são fixos, ficam **fora do sorteio** e são definidos em quadra.
- **Times que não fecham:** o que fazer com quem sobra é decidido em quadra pela organização. O sistema **não** cria regra de reserva nem trata sobras.
- **Convite:** link de uso único, expira em 24h. Quem entra por convite ainda precisa de aprovação.
- Sem pagamentos no MVP. Notificações por WhatsApp não são prioridade (existe apenas um botão que abre o WhatsApp com mensagem pronta).

---

## 2. Stack definida

### Frontend (`/web`)
| Área | Escolha |
|---|---|
| Framework | Next.js (App Router) + TypeScript (strict) |
| Estilo | Tailwind CSS v4, tokens como variáveis CSS |
| Dados (GET) | SWR |
| Mutations | `fetch` através de um cliente HTTP próprio (`lib/api.ts`) + `mutate` do SWR |
| Formulários | React Hook Form + `@hookform/resolvers` |
| Validação | Zod (schemas vindos de `/shared`) |
| Ícones | Lucide React |
| Tempo real | `socket.io-client` |
| Datas | date-fns com locale `pt-BR` |
| Toasts | sonner |
| Fonte | Inter via `next/font/google` |
| Primitivos acessíveis | Radix UI, somente Dialog, Tabs e Switch |

### Backend (`/api`)
| Área | Escolha |
|---|---|
| Servidor | Node.js + Express + TypeScript |
| Banco | PostgreSQL + Prisma |
| Validação | Zod (de `/shared`) |
| Auth | Passport (`passport-google-oauth20`, `passport-discord`) + JWT em **cookie httpOnly** |
| Tempo real | Socket.IO (uma room por sala de partida) |
| Segurança | helmet, cors (origem restrita), `express-rate-limit`, `cookie-parser` |
| Upload | multer (memória) + Cloudinary |
| Convite | token aleatório via `crypto`, salvo como hash SHA-256 |
| Sorteio | Fisher-Yates com `crypto.randomInt`, no servidor |
| Logs | pino |

### Workspace e qualidade
- **pnpm** workspaces: `web`, `api`, `shared`.
- ESLint + Prettier, configuração única na raiz.
- **Vitest** para regras de negócio (vagas, lista de espera, promoção, sorteio, convite). Playwright fica para depois do MVP.
- Commits no padrão Conventional Commits (`feat:`, `fix:`, `chore:`).

### Hospedagem
- Web: Vercel. API: Render. Banco: Neon (PostgreSQL). Imagens: Cloudinary.

### Decisões assumidas (humano pode revogar no portão da Fase 0)
- Login **somente Google e Discord** (sem e-mail e senha).
- Hospedagem como listada acima.

---

## 3. Estrutura de pastas

```
fut/
  package.json              (workspaces)
  pnpm-workspace.yaml
  .eslintrc / prettier config
  shared/
    src/schemas/*.ts        (Zod: user, room, member, invite, draw)
    src/types.ts
    src/constants.ts        (status, funções, limites)
  api/
    prisma/schema.prisma
    src/
      server.ts  app.ts  socket.ts  env.ts
      middlewares/ (auth, roomRole, validate, rateLimit, error)
      modules/
        auth/  users/  rooms/  members/  invites/  draws/
        (cada módulo: routes, controller, service, tests)
      lib/ (prisma, jwt, cloudinary, hash)
  web/
    app/
      (auth)/entrar/  (auth)/cadastro/
      (app)/layout.tsx           (AppShell: TabBar mobile, Sidebar desktop)
      (app)/inicio/  (app)/partidas/  (app)/perfil/
      (app)/salas/[id]/  /entrar  /pedido  /gestao  /sorteio  /ajustes
      convite/[token]/
    components/ui/      (Button, Badge, Avatar, Input, Progress, RoleChip, ...)
    components/domain/  (MatchCard, PlayerRow, ApprovalCard, StepperRow, ...)
    components/layout/  (TabBar, Sidebar, AppShell)
    hooks/              (useRoom, useMembers, useSocket, ...)
    lib/ (api.ts, socket.ts, format.ts)
    styles/globals.css  (tokens)
```

---

## 4. Design system (fonte: Figma)

Arquivo Figma: **chave `0321OSdaqpTOfpi4Rh0Mec`**. Use o MCP do Figma (`get_design_context`, `get_variable_defs`, `get_screenshot`) para ler valores exatos. **Não adivinhe cores nem medidas.**

Tema único no MVP: **escuro com acento amarelo**. Simples, sem exageros.

### Tokens
- **Cores** (coleção "Cores", modo "Escuro"). Os nomes no Figma seguem o padrão `grupo/nome` e o code syntax já é `var(--color-...)`. Grupos: `bg/*` (app, surface, raised), `text/*` (primary, secondary, muted, on-accent), `accent/*` (default, subtle), `border/*` (default, strong), além de cores de status (sucesso, aviso, erro, perigo). Gere `globals.css` lendo a lista completa do Figma e mapeie para `@theme` do Tailwind v4.
- **Espaçamento:** `space/xs..3xl` = 4, 8, 12, 16, 20, 24, 32 px.
- **Raio:** `radius/sm..full` = 8, 12, 16, 24, 999 px.
- **Tipografia (Inter):** Display/H1, Heading/H2, Heading/H3, Body/Regular, Body/Strong, Caption/Regular, Caption/Strong, Overline. Crie utilitários/classes equivalentes.

### Componentes (página "Componentes" do Figma)
| Componente | Node | Variantes e props |
|---|---|---|
| Button | 2:18 | Variant: Primary, Secondary, Ghost, Danger. Size: Large, Small. Label |
| Badge | 2:30 | Status: Confirmado, Pendente, Espera, Recusado, Organizador |
| Avatar | 2:36 | Size: MD, LG. Iniciais (fallback quando não há foto) |
| Input | 2:46 | State: Default, Focus. Label, Placeholder |
| Match Card | 3:2 | Titulo, Quando, Local, Vagas (usa Badge e Progress) |
| Player Row | 3:25 | Nome, Posicao (usa Avatar e Badge) |
| Approval Card | 3:34 | Nome, Detalhe, Role Chip, botões Aprovar e Recusar |
| Tab Bar | 3:155 | Aba: Início, Partidas, Gestão, Perfil |
| Sidebar | 3:329 | Item: Início, Partidas, Gestão, Perfil (248 px de largura) |
| Progress | 6:237 | Valor: Baixo, Médio, Alto, Cheio |
| Stepper Row | 12:17 | Titulo, Dica, Valor (botões menos e mais) |
| Role Chip | 14:31 | Funcao: Linha (neutro, ícone users), Goleiro (acento, ícone hand) |

### Ícones (Lucide React)
`arrow-left`, `users`, `hand`, `check`, `info`, `home`, `calendar`, `shield`, `user`, `map-pin`, `clock`, `plus`, `minus`, `share-2`, `link`, `shuffle`, `lock`. Confirme cada um no Figma e use `lucide-react`, nunca emoji.

### Responsividade
- Mobile-first (390 px de referência). TabBar fixa embaixo.
- Desktop (1440 px de referência): Sidebar à esquerda, conteúdo em grid de duas colunas na Gestão.
- Breakpoint de troca de navegação: `lg` (1024 px).

---

## 5. Mapa de telas (Figma -> rota)

**Página Mobile (390x844):**
| Tela | Node | Rota |
|---|---|---|
| 01 Entrar | 5:29 | `/entrar` |
| 02 Cadastro (nome, apelido, celular, posição preferida, foto opcional) | 11:168 | `/cadastro` |
| 04 Início | 6:21 | `/inicio` |
| 05 Sala (abas Linha, Goleiros, Espera) | 6:129 | `/salas/[id]` |
| 05b Escolher função | 15:234 | `/salas/[id]/entrar` |
| 05c Função lotada (lista de espera) | 17:269 | mesmo estado da 05b quando a função está cheia |
| 03 Pedido enviado | 11:213 | `/salas/[id]/pedido` |
| 06 Gestão da sala | 7:124 | `/salas/[id]/gestao` |
| 06b Ajustes da sala | 13:178 | `/salas/[id]/ajustes` |
| 07 Sorteio de times | 13:260 | `/salas/[id]/sorteio` |
| 08 Convidar amigo | 7:315 | modal/página em `/salas/[id]/convidar` |

**Página Desktop (1440x900):** D1 Início (8:168), D2 Gestão da sala (8:404, inclui "Formato da partida" com 3 steppers, regras da sala e co-organizadores).

Telas ainda **não desenhadas** (fazer simples, no mesmo design system, e mostrar ao humano antes de fechar a fase): Perfil, Partidas (lista), Criar sala, Entrada por convite (`/convidar/[token]`), estados vazios e de erro.

---

## 6. Modelo de dados (Prisma, ponto de partida)

```prisma
enum Provider { GOOGLE DISCORD }
enum RoomStatus { OPEN LOCKED DRAWN CANCELED FINISHED }
enum MemberRole { PLAYER CO_ORGANIZER ORGANIZER }
enum PlayRole { LINE GOALKEEPER }
enum MemberStatus { PENDING CONFIRMED WAITLIST REJECTED LEFT }

model User {
  id          String   @id @default(cuid())
  provider    Provider
  providerId  String
  email       String?
  name        String
  nickname    String?
  phone       String?
  preferredPosition String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  members     RoomMember[]
  roomsOwned  Room[]   @relation("Owner")
  @@unique([provider, providerId])
}

model Room {
  id            String     @id @default(cuid())
  title         String
  location      String
  startsAt      DateTime
  lineSlots     Int        // vagas de jogadores de linha
  teamSize      Int        @default(4) // jogadores de linha por time
  goalkeeperSlots Int      @default(2)
  requireApproval Boolean  @default(true)
  status        RoomStatus @default(OPEN)
  ownerId       String
  owner         User       @relation("Owner", fields: [ownerId], references: [id])
  members       RoomMember[]
  invites       Invite[]
  draws         Draw[]
  createdAt     DateTime   @default(now())
}

model RoomMember {
  id        String       @id @default(cuid())
  roomId    String
  userId    String
  role      MemberRole   @default(PLAYER)
  playRole  PlayRole
  status    MemberStatus @default(PENDING)
  waitlistPosition Int?  // ordem de chegada na espera
  requestedAt DateTime   @default(now())
  decidedAt DateTime?
  decidedById String?
  invitedById String?
  room      Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id])
  @@unique([roomId, userId])
  @@index([roomId, status, playRole])
}

model Invite {
  id        String   @id @default(cuid())
  roomId    String
  tokenHash String   @unique
  createdById String
  expiresAt DateTime
  usedAt    DateTime?
  usedById  String?
  room      Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model Draw {
  id        String   @id @default(cuid())
  roomId    String
  createdAt DateTime @default(now())
  createdById String
  teams     DrawTeam[]
  room      Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
}

model DrawTeam {
  id      String @id @default(cuid())
  drawId  String
  name    String   // "Time 1", "Time 2"...
  playerIds String[] // userIds de jogadores de linha
  draw    Draw @relation(fields: [drawId], references: [id], onDelete: Cascade)
}
```

Ajuste o schema se encontrar um problema real, mas **mostre a mudança no portão da fase** antes de migrar.

---

## 7. Regras de negócio (testar todas com Vitest)

1. **Cadastro livre.** Login Google/Discord cria o usuário automaticamente. Nome é obrigatório. Apelido, celular, posição e foto são opcionais. Avatar: jpg/png/webp, até 2 MB.
2. **Criar sala:** qualquer usuário logado cria. Ele vira `ORGANIZER` e `CONFIRMED` (como linha ou goleiro, a escolha dele na criação). Validar: `lineSlots >= 2`, `teamSize >= 1`, `goalkeeperSlots >= 0`, `startsAt` no futuro.
3. **Pedir entrada:** exige `playRole` (LINE ou GOALKEEPER). Um pedido por usuário por sala. Sala `LOCKED`, `DRAWN`, `CANCELED` ou `FINISHED` não aceita pedidos.
4. **Aprovar:** só `ORGANIZER` ou `CO_ORGANIZER` da sala. Ao aprovar:
   - se há vaga na função escolhida: `CONFIRMED`;
   - se não há: `WAITLIST` com `waitlistPosition` (por ordem de chegada, por função).
   - A checagem de vaga e a gravação acontecem **em transação** com lock da linha da sala para evitar corrida (dois aprovando ao mesmo tempo).
5. **Recusar:** `REJECTED`. O usuário pode pedir de novo somente se o organizador reabrir (MVP: não pode pedir de novo; mostrar mensagem clara).
6. **Vagas ocupadas** contam apenas `CONFIRMED`. Mostrar "11/16 na linha" e "1/2 goleiros".
7. **Pedido já nasce em espera?** Não. Todo pedido nasce `PENDING`. A tela 05c é só um aviso informativo ao usuário de que a função está lotada e que, se aprovado, ficará na espera.
8. **Promoção da espera:** quando um `CONFIRMED` sai (`LEFT`) ou o organizador remove, o primeiro da espera **da mesma função** pode ser promovido. No MVP o **organizador escolhe** promover (botão), não é automático.
9. **Sair da sala:** o jogador pode sair enquanto a sala está `OPEN` ou `LOCKED`. Libera a vaga. O organizador não pode sair, precisa transferir ou cancelar a sala.
10. **Co-organizadores:** o organizador nomeia até **2** por sala, entre membros `CONFIRMED`. Remover é permitido. Co-organizador aprova e recusa, mas **não** altera co-organizadores nem cancela a sala.
11. **Alterar formato da partida** (vagas, jogadores por time): só organizador, só com sala `OPEN`. Não pode reduzir vagas abaixo do número de confirmados daquela função.
12. **Travar sala:** impede novos pedidos e saídas livres. É pré-requisito para sortear. Organizador e co-organizadores podem travar e destravar.
13. **Sorteio:**
    - exige sala `LOCKED`;
    - usa só jogadores de linha `CONFIRMED`;
    - número de times = `floor(confirmadosLinha / teamSize)`; embaralha com Fisher-Yates (`crypto.randomInt`) e distribui em ordem;
    - **sobras sem tratamento especial**: os times são montados completos (de `teamSize` jogadores) e quem sobra aparece apenas em uma lista informativa "Sem time", **sem regra de reserva ou rodízio**, pois a decisão é feita em quadra;
    - goleiros aparecem em um bloco à parte, **fora do sorteio**;
    - "Sortear de novo" gera um novo `Draw` (guarda histórico); o último é o válido;
    - após sortear, a sala vira `DRAWN`.
14. **Convite:** o organizador (ou co-organizador) gera um link. Token com 32 bytes aleatórios, salvo só o hash. Validade 24h, **uso único**. Quem abre o link logado cai na tela 05b (escolher função) da sala; o pedido ainda passa por aprovação. Se expirado ou usado, mostrar mensagem clara.
15. **Cancelar sala:** só organizador. Muda para `CANCELED` e notifica membros em tempo real.
16. **Autorização:** toda rota de sala valida o papel do usuário no banco, nunca confia só em dado do cliente.

---

## 8. API REST (prefixo `/api`)

Auth
- `GET /auth/google` e `GET /auth/google/callback`
- `GET /auth/discord` e `GET /auth/discord/callback`
- `POST /auth/logout`
- `GET /me` (usuário atual)
- `PATCH /me` (nome, apelido, celular, posição)
- `POST /me/avatar` (multipart)

Salas
- `POST /rooms`
- `GET /rooms` (minhas salas e salas das quais participo)
- `GET /rooms/:id` (dados da sala, contagem de vagas, meu status)
- `PATCH /rooms/:id` (formato, regras, título, local, horário)
- `POST /rooms/:id/lock` e `POST /rooms/:id/unlock`
- `POST /rooms/:id/cancel`

Membros
- `GET /rooms/:id/members?status=&playRole=`
- `POST /rooms/:id/join` body `{ playRole }`
- `DELETE /rooms/:id/join` (cancelar pedido ou sair)
- `POST /rooms/:id/members/:memberId/approve`
- `POST /rooms/:id/members/:memberId/reject`
- `POST /rooms/:id/members/:memberId/promote` (espera -> confirmado)
- `POST /rooms/:id/members/:memberId/remove`
- `PUT /rooms/:id/co-organizers/:userId` e `DELETE /rooms/:id/co-organizers/:userId`

Convites
- `POST /rooms/:id/invites` (retorna URL com o token uma única vez)
- `GET /invites/:token` (valida e retorna dados básicos da sala)
- `POST /invites/:token/accept` (leva à criação do pedido)

Sorteio
- `POST /rooms/:id/draw`
- `GET /rooms/:id/draw` (último sorteio)

Padrão de resposta de erro: `{ error: { code, message, details? } }`. Códigos estáveis (`ROOM_LOCKED`, `ROLE_FULL`, `INVITE_EXPIRED`, `NOT_ORGANIZER` etc.) para o front mapear mensagens em português.

---

## 9. Tempo real (Socket.IO)

- Conexão autenticada pelo mesmo cookie JWT.
- Ao abrir uma sala, o cliente entra na room `room:{id}` (o servidor valida que o usuário é membro ou organizador).
- Eventos servidor -> cliente: `member:requested`, `member:updated`, `room:updated`, `room:locked`, `room:drawn`, `room:canceled`.
- No front, cada evento chama `mutate()` das chaves SWR correspondentes. **Os dados continuam vindo do REST**, o socket apenas avisa que mudou.
- Se o socket cair, o app continua funcionando por revalidação do SWR (`refreshInterval` moderado na Gestão).

---

## 10. FASES E PORTÕES DE APROVAÇÃO

Formato de cada fase: **Objetivo, Tarefas, Critérios de aceite, Relatório do portão.**

### Fase 0: Fundação
**Objetivo:** monorepo rodando, tokens do design system prontos, banco conectado.
**Tarefas:**
1. Criar workspace pnpm com `web`, `api`, `shared`; ESLint, Prettier, tsconfig base.
2. `web`: Next.js + Tailwind v4; `globals.css` com **todos os tokens lidos do Figma**; Inter via `next/font`; página de teste de tokens.
3. `api`: Express + Prisma, `env.ts` com validação Zod, `/health`, CORS, helmet, rate limit, tratamento de erro.
4. Prisma: schema da seção 6, primeira migration, conexão com Neon (ou Postgres local via Docker para dev).
5. `.env.example` completo (ver seção 12).
**Critérios:** `pnpm dev` sobe web e api; `/health` responde; migration aplicada; lint e typecheck verdes.
**Relatório do portão:** árvore de pastas, tokens gerados (tabela), schema final, comandos para rodar, pendências.
**PARE e espere `APROVADO FASE 0`.**

### Fase 1: Biblioteca de componentes
**Objetivo:** todos os componentes da seção 4 fiéis ao Figma.
**Tarefas:** implementar os 12 componentes com as mesmas variantes e props do Figma, mais AppShell (TabBar no mobile, Sidebar no desktop). Criar rota interna `/ui` (apenas em dev) mostrando todos os componentes e variantes para comparação visual.
**Critérios:** cada componente confere com o Figma (cor, raio, espaçamento, tipografia) usando só tokens, sem valor mágico em hex ou px; acessível por teclado; ícones só Lucide.
**Relatório:** captura de tela de `/ui` em 390 px e 1440 px, lista de divergências conhecidas.
**PARE e espere `APROVADO FASE 1`.**

### Fase 2: Autenticação e perfil
**Objetivo:** entrar com Google/Discord e completar o cadastro.
**Tarefas:** OAuth Google e Discord (Passport), JWT em cookie httpOnly (SameSite e Secure corretos por ambiente), `GET /me`, `PATCH /me`, upload de avatar para Cloudinary, telas `/entrar` e `/cadastro`, guard de rota no front (redireciona para `/entrar`), logout, tela de perfil simples.
**Critérios:** primeiro login leva a `/cadastro` para completar nome, apelido, celular, posição e foto opcional; logins seguintes vão direto a `/inicio`; token nunca fica em localStorage; testes de auth passando.
**Relatório:** fluxo testado com os dois provedores, prints das telas, política de cookies adotada.
**PARE e espere `APROVADO FASE 2`.**

### Fase 3: Salas e início
**Objetivo:** criar, listar e ver salas.
**Tarefas:** `POST/GET/PATCH /rooms`, tela Criar sala (título, local, data e hora, vagas de linha, jogadores por time, vagas de goleiro, exigir aprovação), tela Início (D1/04), tela Partidas, tela Sala (abas Linha, Goleiros, Espera), Match Card com Progress de vagas. SWR com chaves padronizadas (`/rooms`, `/rooms/:id`).
**Critérios:** validações da regra 2; contagem de vagas correta; estados vazios e de carregamento.
**Relatório:** prints, endpoints testados, testes Vitest da regra 2 e 6.
**PARE e espere `APROVADO FASE 3`.**

### Fase 4: Entrada por função e aprovação
**Objetivo:** o coração do produto.
**Tarefas:** tela 05b (escolher função, com vagas restantes) e variante 05c (função lotada), `POST /join`, tela 03 (pedido enviado, com "Você entra como" e Role Chip), cancelar pedido, tela Gestão (04/06 mobile e D2 desktop) com resumo de vagas, fila de Approval Cards (Role Chip visível), aprovar/recusar com transação e lock, lista de espera, promoção manual, sair da sala, Socket.IO para fila e vagas ao vivo.
**Critérios:** regras 3 a 9 cobertas por testes, incluindo **corrida de dois aprovadores**; co-organizador consegue aprovar; jogador comum recebe 403; fila atualiza sem recarregar.
**Relatório:** matriz de permissões testada, resultado dos testes de concorrência, prints mobile e desktop.
**PARE e espere `APROVADO FASE 4`.**

### Fase 5: Ajustes da sala e co-organizadores
**Objetivo:** configuração do organizador.
**Tarefas:** tela 06b e bloco "Formato da partida" com Stepper Row, regras da sala (Switches), travar e destravar, cancelar sala, nomear e remover co-organizadores (máx. 2), validações da regra 11.
**Critérios:** não permite reduzir vagas abaixo dos confirmados; terceiro co-organizador é rejeitado com mensagem clara; co-organizador não altera co-organizadores.
**Relatório:** testes das regras 10, 11, 12 e 15, prints.
**PARE e espere `APROVADO FASE 5`.**

### Fase 6: Convite e sorteio
**Objetivo:** convite seguro e sorteio de times.
**Tarefas:** convite (tela 08, gerar link, copiar, compartilhar via `navigator.share` com fallback), página `/convite/[token]` com estados (válido, expirado, usado, sala travada), sorteio no servidor (regra 13), tela 07 (cartões de times, bloco de goleiros, seção "Sem time" apenas informativa, "Sortear de novo", "Compartilhar" com texto pronto para WhatsApp), histórico de sorteios.
**Critérios:** token com hash, uso único e expiração testados; sorteio só com sala `LOCKED`; só jogadores de linha confirmados entram; distribuição testada (sem repetidos, sem faltantes); teste estatístico simples de que o embaralhamento não é viciado.
**Relatório:** testes, prints, exemplo de sorteio com 16 e 18 jogadores.
**PARE e espere `APROVADO FASE 6`.**

### Fase 7: Acabamento e deploy
**Objetivo:** colocar no ar.
**Tarefas:** revisão de acessibilidade e contraste, estados de erro e offline, mensagens de erro mapeadas para português, meta tags e favicon, deploy (Vercel, Render, Neon), variáveis de ambiente de produção, CORS e cookies de produção (domínios, `SameSite`, `Secure`), README com instruções.
**Critérios:** fluxo completo funcionando em produção, em celular real; checklist de segurança da seção 11 cumprido.
**Relatório:** URLs, checklist, pendências conhecidas.
**PARE e espere `APROVADO FASE 7`.** Projeto concluído.

---

## 11. Segurança (checklist obrigatório)

- JWT assinado, expiração curta com renovação, cookie `httpOnly`, `Secure` em produção, `SameSite` adequado.
- Proteção contra CSRF nas mutations (SameSite estrito ou token CSRF se o domínio de web e api for diferente; decidir e documentar na Fase 2).
- CORS com lista fixa de origens.
- Rate limit em login, `join` e criação de convite.
- Validação Zod em toda entrada (body, params, query).
- Autorização por papel verificada **no servidor** em toda rota de sala.
- Convites: token só em hash no banco, retornado uma vez, uso único, 24h.
- Upload: validar tipo e tamanho, nunca confiar na extensão.
- Dados sensíveis: celular visível apenas para organizador e co-organizadores da sala em que a pessoa está.
- Sem segredo no repositório, `.env.example` sem valores reais.
- Mensagens de erro não vazam detalhes internos.

---

## 12. Variáveis de ambiente (`.env.example`)

```
# api
NODE_ENV=development
PORT=4000
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=15m
REFRESH_EXPIRES_IN=30d
WEB_URL=http://localhost:3000
API_URL=http://localhost:4000
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# web
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
```

---

## 13. Fora do escopo do MVP (não fazer)

Pagamentos, notificações automáticas por WhatsApp, "time panela" ou balanceamento por nível, ranking e estatísticas de jogadores, chat, tema claro, app nativo, regra de reserva para sobras de times, promoção automática da lista de espera, login por e-mail e senha.

---

## 14. Convenções

- TypeScript `strict`. Sem `any` (use `unknown` e Zod).
- Componentes de UI **sem lógica de negócio**; dados via hooks SWR em `hooks/`.
- Chaves SWR centralizadas em um único arquivo.
- Services no backend concentram regra de negócio; controllers só traduzem HTTP.
- Datas sempre em UTC no banco e formatadas em `America/Sao_Paulo` na tela.
- Commits pequenos e em inglês, um por tarefa concluída.
- Cada regra da seção 7 deve ter pelo menos um teste nomeado com o número da regra.
- **Tailwind v4 — namespace `--spacing-*`:** tokens de espaçamento e raio ficam **somente no `:root`** (ex.: `--space-lg`, `--radius-md`). **Nunca declará-los no `@theme` como `--spacing-xs`…`--spacing-3xl`**, pois o Tailwind v4 usa esse namespace para gerar *todas* as utilities de dimensão (`max-w-*`, `w-*`, `h-*`, `p-*`, `gap-*` etc.) — nomear `--spacing-2xl: 24px` faz `max-w-2xl` resolver para 24 px em vez de 42 rem. Nos componentes, referencie espaçamentos sempre como valores arbitrários: `px-[var(--space-lg)]`.

---

## 15. Como começar

1. Leia este documento inteiro.
2. Confirme ao humano que entendeu, em **no máximo 10 linhas**, listando as decisões assumidas da seção 2.
3. Apresente o **plano da Fase 0** e espere `APROVADO PLANO FASE 0`.
4. Não escreva nada antes disso.
