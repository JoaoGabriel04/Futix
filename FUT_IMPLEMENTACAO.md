# Futix: Plano de Implementação para o Claude Code

Plataforma web para organizar um racha de futebol local e gratuito. O produto se chama **Futix** (nas versões antigas deste documento aparece como "Fut"). Este documento é a fonte única de verdade. Leia inteiro antes de qualquer ação.

> ## ATUALIZAÇÃO v2: LEIA ANTES DO RESTO
> Este documento recebeu uma atualização (seção 16) com **modo de sessão ao vivo**: botão "Iniciar sala", sorteio equilibrado por peso dos jogadores, partidas com cronômetro, gols e assistências, rodízio automático de times e resumo da sala.
> 1. **Fases 0 a 6 já foram implementadas ou estão em fechamento. NÃO refaça nem reescreva nada delas.** Termine a Fase 6 e espere `APROVADO FASE 6` do humano antes de tocar em qualquer item da seção 16.
> 2. A seção 16 diz exatamente o que **muda** em comportamentos já existentes (16.1) e o que é **novo** (16.2 em diante). Alterações em código existente ficam restritas ao que a seção 16.1 lista. Qualquer outra alteração em código já aprovado exige pedido ao humano.
> 3. A antiga **Fase 7 (acabamento e deploy) agora é a Fase 15** e acontece por último. As novas fases são 7 a 11 (sessão ao vivo, seção 16) e 12 a 14 (marca, homepage, cadastro, login por e-mail e perfil, seção 17).
> 4. A marca agora é **Futix** e a cor principal é o verde da logo (`#9EF224`, hover `#B6F65A`, pressed `#7DCC12`). Os tokens de acento (`accent/*`) usam esse verde no lugar do amarelo. Se isso ainda não foi aplicado, verifique com o humano antes de mexer.

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
- ~~Login somente Google e Discord~~ **Revogado na v3:** o login tem três métodos (Google, Discord e e-mail com senha). Ver seção 17.
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
12. **Travar sala:** impede novos pedidos e saídas livres. É pré-requisito para sortear. Organizador e co-organizadores podem travar e destravar. **(ALTERADA NA v2: ver seção 16.1. "Iniciar sala" passa a travar e sortear no mesmo passo.)**
13. **Sorteio (SUBSTITUÍDA NA v2 pelo sorteio equilibrado da seção 16.4; o texto abaixo vale só como histórico das Fases 0 a 6):**
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

### Fase 7: Pesos, regras da partida, "Iniciar sala" e sorteio equilibrado
**Pré-requisito:** `APROVADO FASE 6`. Leia a seção 16 inteira.
**Objetivo:** o organizador define o peso dos jogadores e as regras da partida, e inicia a sala, que trava e sorteia os times de forma equilibrada.
**Tarefas:**
1. Migrations **aditivas** (seção 16.2): `WeightLevel`, `PlayerWeight`, campos novos em `Room` e `DrawTeam`, `LIVE` em `RoomStatus`. Nenhuma coluna existente é removida ou renomeada.
2. Schemas Zod e constantes em `/shared` (16.2 e 16.9).
3. API de pesos e atualização do `PATCH /rooms/:id` (16.6). Garantir que **nenhum endpoint público ou de jogador retorne peso** (16.8).
4. `POST /rooms/:id/start` e sorteio equilibrado (16.3 e 16.4), com ajuste de `POST /rooms/:id/draw` (16.1).
5. Telas: 06c Gestão com "Iniciar sala", 06d Confirmar início, 07b Sorteio antes da partida (visão do organizador) com a visão do jogador sem pesos e sem botões, 06e Regras da partida, 13 Pesos dos jogadores (seção 16.10). Componentes novos: Peso Chip, SegmentedControl, BottomSheet.
6. Remover da interface o botão e o switch "Travar sala" (os endpoints de lock e unlock continuam existindo, marcados como deprecated).
**Critérios:** testes do sorteio (16.4) passando; peso nunca vaza para quem não é organizador ou co-organizador; sortear de novo só funciona em `DRAWN`; fluxos das Fases 0 a 6 continuam passando nos testes existentes.
**Relatório do portão:** migrations, testes, prints mobile e desktop, exemplo de sorteio com 16 jogadores e com 18 jogadores (2 sem time).
**PARE e espere `APROVADO FASE 7`.**

### Fase 8: Motor de partida e rodízio (backend)
**Objetivo:** partidas com cronômetro no servidor, gols, assistências, encerramento automático e rodízio de times.
**Tarefas:** modelos `Match` e `MatchEvent`, campos de rodízio, endpoints e eventos Socket.IO da seção 16.6 e 16.7, regras das seções 16.5 e 16.5.1 (rodízio), recuperação de partidas ao reiniciar o servidor.
**Critérios:** todas as regras R22 a R35 com teste; teste de rodízio com 3, 4 e 5 times, vitória, empate, limite de 2 vitórias e fila vazia; teste de concorrência (dois gols simultâneos não ultrapassam 2 gols nem registram partida encerrada).
**Relatório:** matriz de transições de estado testada, tabela de exemplos de rodízio, resultado dos testes.
**PARE e espere `APROVADO FASE 8`.**

### Fase 9: Telas da partida ao vivo
**Objetivo:** operar a partida pelo celular.
**Tarefas:** telas 10 Partida ao vivo, 11 Registrar gol, 12 Fim da partida e trocas (seção 16.10), cronômetro no cliente calculado a partir de timestamps do servidor (16.7), atualização em tempo real para quem assiste (jogadores confirmados), botões Desfazer, Pausar, Encerrar partida e Iniciar próxima partida.
**Critérios:** cronômetro não se desincroniza ao recarregar a página; jogador comum vê a partida mas não vê botões de controle nem pesos; gol contra credita o time certo; desfazer só atua em partida em andamento.
**Relatório:** prints em 390 px e 1440 px, vídeo curto ou descrição de um fluxo completo (iniciar, gol, gol, fim, trocas, próxima).
**PARE e espere `APROVADO FASE 9`.**

### Fase 10: Encerrar sala e resumo
**Objetivo:** fechar a sessão e mostrar estatísticas da sala.
**Tarefas:** `POST /rooms/:id/finish`, `GET /rooms/:id/summary`, tela 14 Resumo da sala, compartilhar resumo (texto pronto para WhatsApp, via `navigator.share` com fallback de copiar).
**Critérios:** regras R36 e R37 com teste; gol contra não conta como gol do jogador; artilharia e assistências batem com os eventos.
**Relatório:** testes, prints, exemplo de resumo.
**PARE e espere `APROVADO FASE 10`.**

### Fase 11: Regressão e consistência
**Objetivo:** garantir que nada antigo quebrou e que o sistema está coerente.
**Tarefas:** rodar toda a suíte; auditar as telas das Fases 3 a 6 com os novos estados (`DRAWN`, `LIVE`, `FINISHED`); conferir permissões de co-organizador (16.8); atualizar README e este documento com o que foi de fato implementado.
**Critérios:** nenhuma regressão; lista de divergências entre o que foi implementado e este documento, sem corrigir nada sem aprovação.
**Relatório:** resultado da suíte, matriz de permissões final, divergências.
**PARE e espere `APROVADO FASE 11`.**

### Fase 12: Marca Futix e homepage pública
**Pré-requisito:** `APROVADO FASE 11`. Leia a seção 17.
**Objetivo:** identidade visual final e página inicial pública.
**Tarefas:** logo e favicon (seção 17.6), rota `/` com a homepage (telas L1 e L2, seção 17.4), metadados de SEO e Open Graph, redirecionamento de usuário logado, tokens `accent/*` no verde da marca (se ainda não aplicados).
**Critérios:** homepage fiel ao Figma em 390 px e 1440 px, sem chamadas de API, sem emojis, ícones só Lucide, Lighthouse de acessibilidade e SEO acima de 90.
**Relatório:** prints, métricas do Lighthouse, lista de divergências com o Figma.
**PARE e espere `APROVADO FASE 12`.**

### Fase 13: Cadastro, login por e-mail e senha e contas
**Objetivo:** os três métodos de login (Google, Discord, e-mail e senha) e a criação de conta.
**Tarefas:** migrations aditivas da seção 17.2, endpoints 17.3 (registro, login, contas), telas Entrar mobile e desktop, Criar conta mobile e desktop, renomear a rota atual de completar perfil (seção 17.4), regras R38 a R44.
**Critérios:** testes das regras R38 a R44; senha nunca em texto puro nem em log; mensagens de erro sem enumerar usuários; usuários antigos (login social) continuam entrando normalmente após a migration.
**Relatório:** migrations, testes, prints, fluxo testado com os três métodos.
**PARE e espere `APROVADO FASE 13`.**

### Fase 14: Perfil e foto
**Objetivo:** perfil bonito, edição de dados, troca e remoção de foto, contas conectadas.
**Tarefas:** telas Perfil, Alterar foto, Editar perfil (mobile) e Perfil (desktop), upload e remoção de avatar (R45 a R47), conectar e desconectar contas, alterar ou criar senha (R42 e R43).
**Critérios:** regras R45 a R47 com teste; trocar foto apaga a anterior no Cloudinary; avatar com iniciais quando não há foto; usuário não consegue remover o último método de login.
**Relatório:** prints mobile e desktop, testes.
**PARE e espere `APROVADO FASE 14`.**

### Fase 15: Acabamento e deploy (antiga Fase 7)
**Objetivo:** colocar no ar.
**Tarefas:** revisão de acessibilidade e contraste, estados de erro e offline, mensagens de erro mapeadas para português, meta tags e favicon, deploy (Vercel, Render, Neon), variáveis de ambiente de produção, CORS e cookies de produção (domínios, `SameSite`, `Secure`), README com instruções.
**Critérios:** fluxo completo funcionando em produção, em celular real; checklist de segurança da seção 11 cumprido.
**Relatório:** URLs, checklist, pendências conhecidas.
**PARE e espere `APROVADO FASE 15`.** Projeto concluído.

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

Pagamentos, notificações automáticas por WhatsApp, "time panela" ou balanceamento por nível, ranking global e estatísticas históricas entre salas (o resumo **por sala** da Fase 10 é permitido), chat, tema claro, app nativo, regra de reserva para sobras de times, promoção automática da lista de espera, ~~login por e-mail e senha~~ (agora faz parte do escopo, seção 17), recuperação de senha por e-mail, verificação de e-mail e autenticação em dois fatores.

---

## 14. Convenções

- TypeScript `strict`. Sem `any` (use `unknown` e Zod).
- Componentes de UI **sem lógica de negócio**; dados via hooks SWR em `hooks/`.
- Chaves SWR centralizadas em um único arquivo.
- Services no backend concentram regra de negócio; controllers só traduzem HTTP.
- Datas sempre em UTC no banco e formatadas em `America/Sao_Paulo` na tela.
- Commits pequenos e em inglês, um por tarefa concluída.
- Cada regra da seção 7 deve ter pelo menos um teste nomeado com o número da regra.

---

## 15. Como começar (válido para o início do projeto; as Fases 0 a 6 já foram feitas. Para a atualização v2 siga a seção 16.12)

1. Leia este documento inteiro.
2. Confirme ao humano que entendeu, em **no máximo 10 linhas**, listando as decisões assumidas da seção 2.
3. Apresente o **plano da Fase 0** e espere `APROVADO PLANO FASE 0`.
4. Não escreva nada antes disso.

---

## 16. ATUALIZAÇÃO v2: SESSÃO AO VIVO (fases 7 a 11)

Esta seção tem prioridade sobre qualquer trecho anterior que a contradiga. Tudo o que não está listado em 16.1 como "muda" continua exatamente como está.

### 16.0 Resumo do fluxo novo

1. Organizador ou co-organizador toca em **Iniciar sala**. A sala trava e os times são sorteados de forma equilibrada pelo peso dos jogadores. Status: `DRAWN`.
2. Até iniciar a 1ª partida, ele pode **sortear de novo** quantas vezes quiser.
3. Ao **iniciar a partida 1**, o sorteio fica bloqueado para sempre nesta sala. Status: `LIVE`.
4. A partida tem cronômetro, placar, gols e assistências. Termina com **2 gols** ou ao fim do **tempo configurado**.
5. Ao terminar, o sistema faz o **rodízio automático** (trocas de jogadores e fila de times). O organizador só inicia a próxima partida.
6. No fim, **Encerrar sala** mostra o resumo (artilharia, assistências, partidas).

### 16.1 O que MUDA no que já existe

| Item existente | Mudança |
|---|---|
| Regra 12 (travar sala) | "Iniciar sala" passa a travar e sortear no mesmo passo. O botão e o switch "Travar sala" saem da interface. Os endpoints `POST /rooms/:id/lock` e `/unlock` **continuam funcionando** (deprecated), sem uso na interface. |
| Regra 13 (sorteio) | Substituída pelo sorteio equilibrado (16.4). |
| `RoomStatus` | Ganha o valor `LIVE`. Significados: `OPEN` aberta; `LOCKED` (legado, travada manualmente); `DRAWN` iniciada e sorteada, aguardando a partida 1; `LIVE` com partidas em andamento; `FINISHED` encerrada; `CANCELED` cancelada. |
| `POST /rooms/:id/draw` | Só funciona em `DRAWN` (sortear de novo). Em `OPEN` ou `LOCKED` retorna `ROOM_NOT_STARTED`. Em `LIVE` ou `FINISHED` retorna `DRAW_LOCKED`. O primeiro sorteio passa a ser feito por `POST /rooms/:id/start`. |
| Regra 3 (pedir entrada) | Em `DRAWN`, `LIVE` e `FINISHED` retorna `ROOM_STARTED`. |
| Regra 9 (sair da sala) | Após `DRAWN` o jogador não pode mais sair pela plataforma (`LEAVE_BLOCKED`). Situações no meio da sessão são resolvidas em quadra (fora do escopo). |
| Regras 4 e 8 (aprovar e promover) | Após `DRAWN`, aprovar, recusar e promover retornam `ROOM_STARTED`. Pedidos pendentes e a lista de espera ficam congelados e somente leitura. |
| Regra 11 (alterar formato) | Formato (vagas, jogadores por time) continua só em `OPEN`. As **regras da partida** novas (16.4, R21) podem ser editadas em `OPEN`, `LOCKED` e `DRAWN`. |
| Cancelar sala (regra 15) | Continua só do organizador, permitido em `OPEN`, `LOCKED` e `DRAWN`. Em `LIVE` retorna `ROOM_LIVE` (use "Encerrar sala"). |
| Tela Sorteio (07) | Vira a 07b para organizador e co-organizador (com pesos e botões). Jogador comum vê os times, **sem pesos e sem botões**. |
| Co-organizador | Pode iniciar sala, sortear de novo, operar partidas, editar pesos e encerrar sala. **Não** pode cancelar sala, nem editar formato e regras da partida, nem nomear co-organizadores (como já era). |

Nada mais do código existente deve ser alterado. Se achar que algo mais precisa mudar, pare e peça aprovação.

### 16.2 Modelo de dados (somente adições, via migration aditiva)

```prisma
enum WeightLevel   { REGULAR GOOD STAR }        // Regular, Bom, Craque
enum WinnerRule    { ALWAYS MAX_2_WINS }        // Fica sempre | Até 2 vitórias seguidas
enum MatchStatus   { LIVE PAUSED FINISHED }
enum MatchEndReason { GOALS TIME MANUAL }
enum MatchEventType { GOAL OWN_GOAL }

// RoomStatus: acrescentar LIVE (os demais valores permanecem)

// Room: novos campos, todos com default
//   matchMinutes    Int        @default(10)
//   winnerRule      WinnerRule @default(MAX_2_WINS)
//   maxStarsPerTeam Int        @default(3)
//   startedAt       DateTime?
//   finishedAt      DateTime?
//   matches         Match[]

// DrawTeam: novos campos
//   queuePosition   Int?            // null = em quadra; 1 = próximo da fila; n = última barreira
//   consecutiveWins Int @default(0)

model PlayerWeight {
  id        String      @id @default(cuid())
  ownerId   String      // organizador dono da sala (Room.ownerId)
  playerId  String
  level     WeightLevel @default(GOOD)
  updatedAt DateTime    @updatedAt
  owner     User @relation("WeightOwner", fields: [ownerId], references: [id])
  player    User @relation("WeightPlayer", fields: [playerId], references: [id])
  @@unique([ownerId, playerId])
}

model Match {
  id             String         @id @default(cuid())
  roomId         String
  number         Int
  teamAId        String         // DrawTeam
  teamBId        String
  teamAPlayerIds String[]       // escalação no início da partida
  teamBPlayerIds String[]
  limitSeconds   Int            // matchMinutes * 60 no início da partida
  status         MatchStatus    @default(LIVE)
  startedAt      DateTime       // início do trecho atual de contagem
  elapsedSeconds Int            @default(0) // acumulado até a última pausa
  scoreA         Int            @default(0)
  scoreB         Int            @default(0)
  winnerTeamId   String?        // null = empate (quando FINISHED)
  endReason      MatchEndReason?
  endedAt        DateTime?
  createdById    String
  events         MatchEvent[]
  rotation       Rotation?
  room           Room @relation(fields: [roomId], references: [id], onDelete: Cascade)
  @@unique([roomId, number])
}

model MatchEvent {
  id          String         @id @default(cuid())
  matchId     String
  type        MatchEventType
  teamId      String         // time que PONTUOU
  scorerId    String?
  assistId    String?
  atSecond    Int            // segundo da partida em que ocorreu
  undoneAt    DateTime?
  createdById String
  createdAt   DateTime       @default(now())
  match       Match @relation(fields: [matchId], references: [id], onDelete: Cascade)
  @@index([matchId, undoneAt])
}

model Rotation {
  id      String @id @default(cuid())
  matchId String @unique
  kind    String // "WIN" | "DRAW" | "WIN_LIMIT" | "NONE"
  swaps   Json   // [{ teamId, withTeamId, outPlayerIds: [], inPlayerIds: [] }]
  courtAfter Json // [teamId, teamId]
  queueAfter Json // [teamId, ...] na ordem da fila
  match   Match @relation(fields: [matchId], references: [id], onDelete: Cascade)
}
```

Observações:
- Adicione os campos de relação inversa no `User` (`weightsGiven`, `weightsReceived`) e no `Room`.
- **Não remova nem renomeie nada existente.** Mostre a migration no portão antes de aplicar.
- Peso nunca é guardado em `RoomMember` nem em qualquer tabela retornada a jogadores.

### 16.3 Iniciar sala

**R17. Iniciar sala** (`POST /rooms/:id/start`):
- Quem: organizador ou co-organizador. Pré-condição: status `OPEN` ou `LOCKED`.
- Exige pelo menos `2 x teamSize` jogadores de linha `CONFIRMED`. Senão retorna `NOT_ENOUGH_PLAYERS` com a mensagem "São necessários pelo menos N jogadores de linha confirmados para iniciar".
- Em uma **única transação**: trava a sala, executa o sorteio equilibrado (R18), cria o `Draw` e inicializa quadra e fila, define `startedAt` e muda o status para `DRAWN`.
- Pedidos `PENDING` e lista de espera **não entram**. Se houver pedidos pendentes, o sheet de confirmação mostra uma linha extra: "N pedidos pendentes não entram nesta sala." (mesmo estilo das outras linhas do sheet).
- Evento `room:started`.

**R19. Sortear de novo** (`POST /rooms/:id/draw`): só em `DRAWN`. Cria um novo `Draw` com o mesmo algoritmo, reinicializa quadra e fila. O sorteio anterior fica guardado como histórico. O último `Draw` é o válido. Evento `room:redrawn`.

### 16.4 Pesos e sorteio equilibrado

**R20. Pesos:**
- Três níveis: `REGULAR` (1), `GOOD` (2), `STAR` (3, "Craque"). Jogador sem peso definido vale `GOOD`.
- O peso é do **organizador dono da sala** (`PlayerWeight.ownerId = room.ownerId`) e vale para as próximas salas dele. Organizador e co-organizadores editam e enxergam.
- Edição em `OPEN`, `LOCKED` e `DRAWN`. Em `LIVE` e `FINISHED` retorna `WEIGHTS_LOCKED`.
- Editar peso em `DRAWN` não altera times já sorteados. A tela mostra a dica "Sorteie de novo para aplicar os pesos".

**R21. Regras da partida** (`PATCH /rooms/:id`, só organizador, em `OPEN`, `LOCKED` ou `DRAWN`):
- `matchMinutes`: inteiro de 3 a 30 (padrão 10).
- `winnerRule`: `ALWAYS` ou `MAX_2_WINS` (padrão `MAX_2_WINS`).
- `maxStarsPerTeam`: inteiro de 1 a `teamSize` (padrão 3).
- O número de gols para encerrar é **fixo em 2** (constante `GOALS_TO_WIN`, sem campo no banco e sem opção na tela).

**R18. Sorteio equilibrado:**
1. `n` = jogadores de linha `CONFIRMED`. `numTeams = floor(n / teamSize)`, no mínimo 2.
2. Sobras `n - numTeams*teamSize`: escolhidas **ao acaso** (`crypto.randomInt`) e ficam em "Sem time" (lista informativa, **sem regra de reserva nem rodízio**, decisão em quadra).
3. Para cada nível, na ordem `STAR`, `GOOD`, `REGULAR`: embaralhe os jogadores do nível e atribua cada um ao time que tiver **menos jogadores daquele nível** e ainda tiver vaga. Empate: menor soma de pesos. Novo empate: ao acaso.
4. Limite `maxStarsPerTeam`: um time que já tem esse número de craques não recebe outro. Se for impossível cumprir (craques > `maxStarsPerTeam x numTeams`), relaxe o limite para `ceil(craques / numTeams)` e retorne `capRelaxed: true` (o organizador vê o aviso "Limite de craques por time relaxado").
5. Embaralhe a ordem final dos times e nomeie "Time 1" a "Time N".
6. Quadra inicial: Time 1 e Time 2 (`queuePosition = null`). Fila: Time 3 em diante, `queuePosition` 1, 2, 3...
7. Resposta ao organizador inclui o peso total de cada time. Jogador comum **nunca** recebe pesos.

**Testes obrigatórios do sorteio:** (a) todos os times com `teamSize` jogadores; (b) nenhum jogador repetido ou faltando; (c) por nível, a diferença entre quaisquer dois times é de no máximo 1; (d) limite de craques respeitado ou `capRelaxed`; (e) com 18 jogadores e `teamSize` 4: 4 times e 2 em "Sem time"; (f) em 1000 sorteios, cada jogador cai em cada time com frequência aproximadamente uniforme.

### 16.5 Partida

Quem opera (iniciar, pausar, gol, desfazer, encerrar): organizador e co-organizadores. Quem assiste: membros `CONFIRMED` da sala.

**R22. Iniciar partida** (`POST /rooms/:id/matches`): status `DRAWN` ou `LIVE`, nenhuma partida `LIVE` ou `PAUSED` na sala, dois times em quadra. `number` = último + 1. Guarda a escalação dos dois times e `limitSeconds = matchMinutes x 60` (mudanças posteriores nas regras não afetam a partida em andamento). Se a sala estava em `DRAWN`, passa a `LIVE` (a partir daqui `DRAW_LOCKED`). Evento `match:started`.

**R23. Cronômetro:** a verdade é o servidor. `elapsed = elapsedSeconds + (status == LIVE ? agora - startedAt : 0)`. O cliente calcula a partir de timestamps (16.7), sem tick por segundo.

**R24. Gol** (`POST /matches/:id/goals` com `{ teamId, scorerId, assistId?, ownGoal? }`): só com a partida `LIVE` (`MATCH_PAUSED` se pausada). `teamId` é um dos dois times. `scorerId` é obrigatório e deve estar na escalação do `teamId`. `assistId` é opcional, da mesma escalação e diferente do autor. Placar do `teamId` +1. `atSecond` = `elapsed` no momento.

**R25. Gol contra** (`ownGoal: true`): `teamId` é o time que **ganha o ponto**. `scorerId` é opcional e, se informado, deve estar na escalação do **outro** time. Não tem assistência e **não conta** como gol do jogador nas estatísticas.

**R26. Consistência:** registrar gol, desfazer e encerrar rodam em transação com lock da partida. O placar é sempre recalculado a partir dos eventos não desfeitos (`undoneAt` nulo).

**R27. Fim por gols:** quando um placar chega a `GOALS_TO_WIN` (2), a partida encerra na mesma transação. `endReason = GOALS`, vencedor é o time que chegou a 2.

**R28. Fim por tempo:** quando `elapsed >= limitSeconds`, encerra. Maior placar vence. Placar igual é **empate** (`winnerTeamId = null`). `endReason = TIME`. O encerramento é **idempotente** e tem dupla garantia: (1) timer no processo da API (`setTimeout` pelo tempo restante, cancelado ao pausar ou encerrar e recriado ao retomar); (2) verificação preguiçosa em qualquer leitura ou escrita da partida. Ao subir o servidor, partidas `LIVE` são reavaliadas (expiradas encerram, as demais reagendam).

**R29. Encerrar manualmente** (`POST /matches/:id/end`): resultado pelo placar atual, igual é empate. `endReason = MANUAL`. A tela pede confirmação.

**R30. Pausar e retomar:** `LIVE -> PAUSED -> LIVE`. Ao pausar, `elapsedSeconds` recebe o acumulado. Ao retomar, `startedAt = agora`. Pausada não aceita gol.

**R31. Desfazer** (`DELETE /matches/:id/goals/last`): marca `undoneAt` no evento mais recente ainda ativo e recalcula o placar. Só em partida `LIVE` ou `PAUSED`. **Partida encerrada não pode ser editada no MVP.**

### 16.5.1 Rodízio automático (executa no mesmo instante em que a partida encerra, na mesma transação)

Definições: "quadra" são os dois times com `queuePosition = null`. "Fila" são os demais times ordenados por `queuePosition` (1 é o próximo, `n` é a última barreira). Goleiros e jogadores "Sem time" **nunca** entram no rodízio. Se a fila estiver vazia (`n = 0`), não há rodízio (`kind = "NONE"`, os mesmos dois times jogam de novo).

**R32. Houve vencedor e ele fica** (`ALWAYS`, ou `MAX_2_WINS` com menos de 2 vitórias seguidas):
1. Vencedor: `consecutiveWins + 1`. Perdedor: `consecutiveWins = 0`.
2. O perdedor troca **2 jogadores** com o time da **última barreira** (`Q_n`), conforme R35.
3. `Q_1` (já com a troca, se ele era o `Q_n`) entra em quadra.
4. O perdedor vai para o **fim da fila** (posição `n`). Os demais sobem uma posição.
`kind = "WIN"`.

**R33. Limite de vitórias** (`winnerRule = MAX_2_WINS`): se o vencedor chegar a `consecutiveWins >= 2`, ele **também sai**, e a partida é tratada como R34 (os dois times saem). `consecutiveWins` dos dois volta a 0. `kind = "WIN_LIMIT"`.

**R34. Empate (ou saída dos dois times):** os dois times saem.
- **`n >= 2`:** as duas últimas barreiras são `Q_(n-1)` e `Q_n`. Sorteie qual dos dois times que saem troca com qual. Cada um troca 2 jogadores (R35). Depois, `Q_1` e `Q_2` (já com as trocas) entram em quadra. A fila restante (`Q_3` em diante) sobe, e os dois times que saíram vão para o fim, em ordem sorteada.
- **`n = 1`:** sorteie qual dos dois times fica em quadra. O outro troca 2 jogadores com `Q_1` (R35), que entra, e vai para a fila.
`kind = "DRAW"` (ou `"WIN_LIMIT"` conforme R33).

**R35. Escolha das trocas:**
1. Do time que sai, sorteie 2 jogadores ao acaso (`crypto.randomInt`).
2. No time parceiro, para cada um deles, escolha ao acaso um jogador **do mesmo nível de peso**. Se não houver, use o nível mais próximo (empate de proximidade: ao acaso). Os 2 escolhidos são diferentes.
3. Se, depois da troca, algum dos dois times passar de `maxStarsPerTeam` craques, refaça o sorteio (até 20 tentativas). Se ainda assim passar, aceite (só pode acontecer com `capRelaxed`).
4. Atualize `DrawTeam.playerIds` dos dois times e grave a `Rotation` com `swaps`, `courtAfter` e `queueAfter`.
5. O organizador **não ajusta** as trocas no MVP. A tela 12 só mostra o resultado e libera "Iniciar partida N+1".

**Exemplo (4 times, `ALWAYS`):** quadra T1 x T2, fila [T3, T4].
- T1 vence. T2 troca 2 jogadores com T4 (a última), T3 entra. Quadra T1 x T3, fila [T4', T2'].
- Empate em T1 x T3: `n = 2`, as duas últimas são T4' e T2'. Cada um dos dois que saem troca com um deles, T4'' e T2'' entram, fila [T1', T3'] em ordem sorteada.

**Testes obrigatórios do rodízio:** vitória, empate, limite de 2 vitórias, `ALWAYS` com várias vitórias, `n = 0`, `n = 1` (empate), `n = 2`, `n = 3`, trocas por nível equivalente, nenhum jogador duplicado ou perdido depois de 20 partidas seguidas, `maxStarsPerTeam` respeitado.

### 16.5.2 Encerrar sala e resumo

**R36. Encerrar sala** (`POST /rooms/:id/finish`): organizador ou co-organizador, status `DRAWN` ou `LIVE`, sem partida `LIVE` ou `PAUSED` (`MATCH_IN_PROGRESS`). Status `FINISHED`, `finishedAt = agora`. Evento `room:finished`.

**R37. Resumo** (`GET /rooms/:id/summary`, só `FINISHED`, para membros confirmados e organizadores): total de partidas, total de gols (incluindo gols contra), tempo total de jogo (soma de `elapsedSeconds`), artilharia e assistências (eventos não desfeitos, gol contra **excluído** do autor), partidas jogadas por jogador (pelas escalações guardadas), lista das partidas com placar. Ordene por quantidade e depois por nome.

### 16.6 API nova (todas sob `/api`, resposta de erro no padrão da seção 8)

Sala e sessão
- `POST /rooms/:id/start` (R17)
- `GET /rooms/:id/session`: estado atual (status, times com `queuePosition`, partida atual, última rotação). Pesos **só** para organizador e co-organizador.
- `POST /rooms/:id/finish` (R36)
- `GET /rooms/:id/summary` (R37)
- `PATCH /rooms/:id`: passa a aceitar `matchMinutes`, `winnerRule`, `maxStarsPerTeam` (R21)

Pesos (só organizador e co-organizador)
- `GET /rooms/:id/weights`: lista dos membros `CONFIRMED` de linha com o nível.
- `PUT /rooms/:id/weights` body `{ items: [{ playerId, level }] }` (em lote).

Partidas
- `POST /rooms/:id/matches` (R22)
- `GET /rooms/:id/matches` e `GET /matches/:matchId`
- `POST /matches/:id/pause`, `/resume`, `/end`
- `POST /matches/:id/goals` e `DELETE /matches/:id/goals/last`

Códigos de erro novos (estáveis): `NOT_ENOUGH_PLAYERS`, `ROOM_NOT_STARTED`, `ROOM_STARTED`, `ROOM_LIVE`, `DRAW_LOCKED`, `WEIGHTS_LOCKED`, `LEAVE_BLOCKED`, `MATCH_IN_PROGRESS`, `MATCH_NOT_FOUND`, `MATCH_PAUSED`, `MATCH_FINISHED`, `INVALID_SCORER`, `INVALID_ASSIST`.

### 16.7 Tempo real e cronômetro

- Mesma sala `room:{id}` da seção 9. Eventos novos: `room:started`, `room:redrawn`, `match:started`, `match:paused`, `match:resumed`, `match:goal`, `match:goal-undone`, `match:ended` (inclui a rotação), `room:finished`.
- Todo evento de partida carrega `{ matchId, status, elapsedSeconds, startedAt, limitSeconds, serverNow, scoreA, scoreB }`.
- O cliente calcula `offset = serverNow - Date.now()` uma vez e exibe `elapsedSeconds + (status === 'LIVE' ? (Date.now() + offset - startedAt) : 0)`. **Não há tick por segundo** vindo do servidor.
- Como na seção 9, os dados continuam vindo do REST e o socket só avisa. Recarregar a página reconstrói o cronômetro pelo `GET /rooms/:id/session`.
- **Nenhum evento carrega pesos.**

### 16.8 Permissões e privacidade

| Ação | Organizador | Co-organizador | Jogador confirmado | Outros |
|---|---|---|---|---|
| Iniciar sala, sortear de novo | sim | sim | não | não |
| Ver e editar pesos | sim | sim | não | não |
| Editar formato e regras da partida | sim | não | não | não |
| Iniciar, pausar, encerrar partida, gol, desfazer | sim | sim | não | não |
| Encerrar sala | sim | sim | não | não |
| Cancelar sala | sim | não | não | não |
| Ver times, partida ao vivo, resumo | sim | sim | sim | não |

Regras de privacidade:
- Pesos e soma de peso por time **jamais** aparecem em resposta, evento ou tela para quem não for organizador ou co-organizador da sala. Tenha um teste automatizado que chama todos os endpoints como jogador comum e falha se encontrar `level`, `weight` ou `weightTotal`.
- Gol, assistência e escalações são visíveis para os membros confirmados.

### 16.9 Constantes e validações compartilhadas (`/shared`)

```ts
export const GOALS_TO_WIN = 2;
export const MATCH_MINUTES = { min: 3, max: 30, default: 10 };
export const MAX_STARS_DEFAULT = 3;
export const WEIGHT_VALUE = { REGULAR: 1, GOOD: 2, STAR: 3 } as const;
export const WEIGHT_LABEL_PT = { REGULAR: 'Regular', GOOD: 'Bom', STAR: 'Craque' } as const;
```
Schemas Zod novos: `weightLevel`, `updateRoomRules`, `putWeights`, `createGoal`, `matchState`, `rotation`, `summary`.

### 16.10 Mapa de telas novas (Figma, arquivo `0321OSdaqpTOfpi4Rh0Mec`, página Mobile)

Leia cada nó com `get_design_context`. Textos e estrutura dos nós valem. Não invente.

| Tela | Node | Rota ou uso |
|---|---|---|
| 06c Gestão com Iniciar sala | 32:321 | `/salas/[id]/gestao`. O botão aparece em `OPEN` ou `LOCKED`. Desabilitado, com dica, se faltar jogador. |
| 06d Confirmar início | 32:399 | Bottom sheet sobre a gestão. |
| 07b Sorteio antes da partida | 32:432 | `/salas/[id]/sorteio`. Visão do organizador. Jogador comum vê os times sem pesos e sem botões. |
| 06e Regras da partida | 32:551 | `/salas/[id]/regras`. |
| 13 Pesos dos jogadores | 33:604 | `/salas/[id]/pesos`. |
| 10 Partida ao vivo | 33:396 | `/salas/[id]/partida`. |
| 11 Registrar gol | 33:450 | Bottom sheet sobre a 10. |
| 12 Fim da partida e trocas | 33:536 | Estado `FINISHED` da partida em `/salas/[id]/partida`. |
| 14 Resumo da sala | 33:716 | `/salas/[id]/resumo`. |

Componentes novos: **Peso Chip** (página Componentes do Figma, variantes `Nivel=Regular|Bom|Craque`), **SegmentedControl** (usado em 06e e 13), **BottomSheet** (06d e 11), **Scoreboard/Timer** (10). Reaproveite Button, Badge, Avatar, StepperRow, Switch, TabBar e AppHeader. Badge ganha o estado "Ao vivo" (fundo `status/danger-subtle`) usado no Match Card e na tela 10.

Pontos de integração com telas existentes:
- Tela Sala (05): mostra "Times sorteados" quando `DRAWN` e "Partida N ao vivo" quando `LIVE`, com link para as telas correspondentes.
- Início e Partidas: o Match Card mostra o badge "Ao vivo" quando `LIVE`.
- Desktop: não há layouts desenhados. Use o mesmo padrão do D2 (Sidebar, conteúdo na largura útil, duas colunas onde fizer sentido). Na tela ao vivo, coluna esquerda com cronômetro, placar e ações e coluna direita com lances e fila. **Nunca** um cartão estreito colado à esquerda. Mostre ao humano antes de fechar a fase.
- Textos: use os do Figma, sem emojis, ícones só Lucide (`shuffle`, `swap`/`arrow-left-right`, `undo-2`, `pause`, `play`, `eye-off`, `lock`).

### 16.11 Fora do escopo desta atualização (não fazer)

Jogador ausente, lesionado ou que sai no meio da sessão; edição de partida já encerrada; tempo extra, gol de ouro e pênaltis; ajuste manual das trocas; estatísticas de goleiros; ranking global entre salas; notificações; desfazer de rodízio; transferência de papel de organizador durante a sessão.

### 16.12 Como começar a atualização

1. Termine a Fase 6 e espere `APROVADO FASE 6`.
2. Confirme ao humano, em no máximo 10 linhas, que leu a seção 16 e liste as **três** ações que alteram código existente (16.1: sortear de novo só em `DRAWN`, remover "Travar sala" da interface, bloqueios após `DRAWN`).
3. Apresente o plano da Fase 7 e espere `APROVADO PLANO FASE 7`.

---

## 17. ATUALIZAÇÃO v3: MARCA, HOMEPAGE, CADASTRO, LOGIN E PERFIL (fases 12 a 14)

Esta seção só vale **depois** de `APROVADO FASE 11`. Mesma regra da v2: tudo o que não está em 17.1 como "muda" permanece como está, e nada fora da seção 17 é alterado sem pedir aprovação.

### 17.1 O que MUDA no que já existe

| Item existente | Mudança |
|---|---|
| Decisão da seção 2 (login só social) | Revogada. O login tem **3 métodos**: Google, Discord e e-mail com senha. |
| Seção 13 (login por e-mail fora do escopo) | Removido do "fora do escopo". Recuperação de senha, verificação de e-mail e 2FA continuam fora. |
| `User.provider` e `User.providerId` | Passam a ser **legado**. A identidade de login vai para a nova tabela `AuthIdentity` (17.2). As colunas antigas **não são removidas** nesta atualização. |
| Rota `/cadastro` (hoje completar perfil) | Passa a ser `/cadastro/perfil`. A rota `/cadastro` vira a tela **Criar conta**. Os redirecionamentos de "perfil incompleto" apontam para `/cadastro/perfil`. |
| Tela de perfil existente | Substituída pelo novo Perfil (17.4). |
| Tela Entrar | Mantém os 3 métodos e ganha a versão desktop (painel da marca + formulário). |
| `POST /me/avatar` | Passa a apagar o avatar anterior no Cloudinary ao trocar (R45). |
| Cor principal | Verde da marca no lugar do amarelo (seção 16, nota do topo). |

### 17.2 Modelo de dados (somente adições, migration aditiva)

```prisma
enum AuthProvider { GOOGLE DISCORD }

model AuthIdentity {
  id         String       @id @default(cuid())
  userId     String
  provider   AuthProvider
  providerId String
  createdAt  DateTime     @default(now())
  user       User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerId])
  @@index([userId])
}

// User: novos campos
//   passwordHash   String?   // null = conta sem login por e-mail e senha
//   avatarPublicId String?   // id do Cloudinary, para apagar ao trocar
//   (email continua opcional na coluna, mas é obrigatório para contas criadas por e-mail e senha;
//    criar índice único parcial em lower(email) quando não nulo)
```

- **Backfill obrigatório na mesma migration:** para cada `User` existente com `provider` e `providerId`, criar um `AuthIdentity` equivalente. Mostre a contagem antes e depois no relatório.
- Se já existirem e-mails duplicados (ignorando maiúsculas e minúsculas), **pare e relate** antes de criar o índice único.
- O código de login social passa a ler e gravar em `AuthIdentity`. As colunas antigas ficam intactas.

### 17.3 Regras de autenticação (R38 a R44)

**R38. Cadastro por e-mail** (`POST /auth/register` com `{ name, email, password }`): normaliza o e-mail (minúsculas, sem espaços nas pontas). Senha de 8 a 72 caracteres (limite do bcrypt), com pelo menos uma letra e um número (`WEAK_PASSWORD`). E-mail já existente retorna `EMAIL_TAKEN`. Cria o usuário com `passwordHash` (bcryptjs, custo 12) e inicia a sessão (cookie httpOnly, como no login social). Em seguida o front leva para `/cadastro/perfil`.

**R39. Login por e-mail** (`POST /auth/login` com `{ email, password }`): erro único e genérico `INVALID_CREDENTIALS` ("E-mail ou senha incorretos") tanto para e-mail inexistente quanto para senha errada. Mesmo tempo de resposta aproximado nos dois casos (compare contra um hash falso quando o usuário não existir). Rate limit: 5 tentativas a cada 15 minutos por combinação de IP e e-mail.

**R40. Login social:** continua como está, lendo `AuthIdentity`. Se o e-mail do provedor já pertencer a **outra conta** sem aquela identidade, **não vincule automaticamente** (evita tomada de conta). Retorne `EMAIL_IN_USE_OTHER_METHOD` com a mensagem "Esse e-mail já tem conta. Entre com o método original e conecte este em Perfil".

**R41. Contas conectadas** (`GET /me` passa a retornar `connections: { google: boolean, discord: boolean, password: boolean }`): conectar Google ou Discord é um fluxo OAuth iniciado **logado** (`GET /auth/google?link=1`, idem Discord), com `state` assinado e ligado à sessão. Desconectar: `DELETE /me/connections/:provider`.

**R42. Último método:** o usuário nunca pode ficar sem nenhum método de login. Remover o último retorna `LAST_LOGIN_METHOD`.

**R43. Senha:** `POST /me/password`. Se a conta já tem senha, exige `currentPassword` e `newPassword`. Se a conta é só social (sem senha), `newPassword` basta e passa a habilitar o login por e-mail e senha **no e-mail da conta** (a conta precisa ter e-mail, senão `EMAIL_REQUIRED`). Mesmas regras de força de R38. Trocar a senha invalida as demais sessões (campo `sessionVersion` ou equivalente, **mostrar a abordagem no portão** antes de migrar).

**R44. "Esqueci minha senha":** **não implementar** nesta atualização. O link aparece no Figma (desktop), mas no código fica **oculto** até existir envio de e-mail. Registre como pendência no relatório.

### 17.3.1 Perfil e foto (R45 a R47)

**R45. Trocar foto** (`POST /me/avatar`, multipart): aceita `image/jpeg`, `image/png`, `image/webp`, no máximo 2 MB, **validando o conteúdo e não só a extensão** (`INVALID_IMAGE`, `IMAGE_TOO_LARGE`). Envia ao Cloudinary com transformação quadrada (`c_fill,g_face,w_256,h_256`), salva `avatarUrl` e `avatarPublicId`, e **apaga a imagem anterior** do Cloudinary. No cliente, antes de enviar, recorte quadrado central e redução (canvas, até 512 px) para economizar dados no celular.

**R46. Remover foto** (`DELETE /me/avatar`): apaga no Cloudinary, zera `avatarUrl` e `avatarPublicId`. A interface volta a mostrar as **iniciais** (componente Avatar existente).

**R47. Editar perfil** (`PATCH /me`): nome (obrigatório, 2 a 80 caracteres), apelido (opcional, até 30), celular (opcional, formato brasileiro, validado), posição preferida (`Goleiro`, `Defensor`, `Meia`, `Atacante`, opcional). O celular continua visível **apenas** para organizador e co-organizadores das salas em que a pessoa está.

Códigos de erro novos (estáveis): `EMAIL_TAKEN`, `INVALID_CREDENTIALS`, `WEAK_PASSWORD`, `EMAIL_IN_USE_OTHER_METHOD`, `LAST_LOGIN_METHOD`, `EMAIL_REQUIRED`, `INVALID_IMAGE`, `IMAGE_TOO_LARGE`, `INVALID_PHONE`.

Biblioteca nova permitida (única): **`bcryptjs`** (em `/api`). Nenhuma outra sem aprovação.

### 17.4 Mapa de telas (Figma, arquivo `0321OSdaqpTOfpi4Rh0Mec`)

| Tela | Página | Node | Rota |
|---|---|---|---|
| L1 Landing desktop | Landing | 37:3 | `/` |
| L2 Landing mobile | Landing | 37:202 | `/` |
| 01 Entrar (mobile) | Mobile | 5:29 | `/entrar` |
| D3 Entrar desktop | Desktop | 37:888 | `/entrar` |
| 02a Criar conta (mobile) | Mobile | 39:423 | `/cadastro` |
| D4 Criar conta desktop | Desktop | 40:860 | `/cadastro` |
| 02b Completar perfil | Mobile | 11:168 | `/cadastro/perfil` |
| 09 Perfil (mobile) | Mobile | 39:462 | `/perfil` |
| 09b Alterar foto | Mobile | 39:586 | bottom sheet sobre `/perfil` |
| 09c Editar perfil (mobile) | Mobile | 39:702 | `/perfil/editar` |
| D5 Perfil desktop | Desktop | 40:950 | `/perfil` (edição na própria página) |

Regras de interface:
- Entrar e Criar conta no desktop: layout dividido, painel da marca à esquerda (some abaixo de `lg`) e formulário à direita. No mobile, tela única, como no Figma.
- Perfil mobile: sheet "Foto de perfil" com Tirar foto (`<input type="file" accept="image/*" capture="user">`), Escolher da galeria, Remover foto e Cancelar. No desktop, "Alterar foto" abre o seletor de arquivos.
- Perfil desktop: duas colunas na largura útil (cartão da pessoa à esquerda, dados e contas à direita). **Nunca** um cartão estreito colado à esquerda.
- "Contas conectadas": Google e Discord mostram "Conectado" ou "Conectar". "E-mail e senha" mostra "Alterar senha" (ou "Criar senha" se a conta é só social).
- Pop-ups e sheets seguem o componente BottomSheet já criado na Fase 7.
- Textos: use os do Figma. Sem emojis. Ícones Lucide (`camera`, `image`, `trash-2`, `log-out`, `mail`, `pencil`).

### 17.5 Homepage pública (`/`)

- Página estática (SSG), sem chamadas de API, acessível sem login. Usuário logado que abre `/` é redirecionado para `/inicio`.
- Seções, na ordem do Figma: navegação (logo, "Como funciona", "Recursos", "Para quem organiza", Entrar, Criar conta), hero com o celular de demonstração, "Do pedido ao apito final" (4 passos), "Tudo o que um racha precisa" (6 recursos), faixa final "Bora organizar o próximo racha?" e rodapé.
- O celular do hero é um **componente de demonstração** montado com os componentes reais e dados fictícios (não é imagem). Os dois cartões flutuantes (placar ao vivo e pedido aprovado) também são estáticos.
- Âncoras: "Como funciona" vai para `#como-funciona`, "Recursos" e "Para quem organiza" vão para `#recursos`. "Criar conta" leva a `/cadastro` e "Entrar" a `/entrar`.
- SEO: `title` "Futix | Seu racha, organizado", `description` curta, Open Graph com a logo, `lang="pt-BR"`.
- Responsivo: layout de 390 px (L2) até 1440 px (L1), com os 4 passos e os 6 recursos em colunas no desktop e empilhados no mobile.

### 17.6 Marca

- Nome do produto: **Futix**. Substituir "Fut" nos textos visíveis, no `<title>` e no manifest.
- A logo está no Figma no node `25:312` (página Mobile). Exporte em PNG e SVG se possível, salve em `web/public/` e gere o favicon a partir dela.
- Cor da marca: `#9EF224` (padrão), `#B6F65A` (hover), `#7DCC12` (pressed). Texto sobre a cor da marca usa o tom escuro `text/on-accent`.
- Os nomes técnicos do repositório (pastas, pacote) **não precisam** mudar.

### 17.7 Fora do escopo desta atualização

Recuperação de senha, verificação de e-mail, autenticação em dois fatores, exclusão de conta, troca de e-mail, login com outros provedores, edição de perfil de outra pessoa, estatísticas pessoais entre salas.

### 17.8 Como começar a atualização v3

1. Só depois de `APROVADO FASE 11`.
2. Confirme ao humano, em no máximo 10 linhas, que leu a seção 17 e liste as alterações em código existente (17.1).
3. Apresente o plano da Fase 12 e espere `APROVADO PLANO FASE 12`.