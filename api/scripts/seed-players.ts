import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TOKEN = "4cf37529b1848d65b5d02130c5962d5ed4a982a9d067e6243da5444781a05ebf";

const NAMES = [
  "Carlos Silva", "Marcos Oliveira", "Bruno Santos", "Diego Ferreira",
  "Rafael Costa", "Thiago Almeida", "Leandro Souza", "Rodrigo Lima",
  "Felipe Rocha", "Anderson Gomes", "Fábio Mendes", "Gustavo Nunes",
  "Henrique Carvalho", "Igor Martins", "Jonas Ribeiro", "Lucas Barbosa",
];

const POSITIONS = ["FORWARD", "MIDFIELDER", "DEFENDER"];

async function main() {
  const tokenHash = crypto.createHash("sha256").update(TOKEN).digest("hex");

  const invite = await prisma.invite.findUnique({ where: { tokenHash } });
  if (!invite) {
    console.error("Convite não encontrado. Token inválido ou expirado.");
    process.exit(1);
  }

  const roomId = invite.roomId;
  console.log("Sala:", roomId);

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: { where: { status: "CONFIRMED", playRole: "LINE" } },
    },
  });
  if (!room) {
    console.error("Sala não encontrada.");
    process.exit(1);
  }

  const confirmedLine = room.members.length;
  const need = room.lineSlots - confirmedLine;
  console.log(`Linha: ${confirmedLine}/${room.lineSlots} confirmados. Adicionando ${need} jogadores.`);

  if (need <= 0) {
    console.log("Sala já está cheia.");
    process.exit(0);
  }

  for (let i = 0; i < need; i++) {
    const name = NAMES[i % NAMES.length];
    const uid = `seed-${Date.now()}-${i}`;

    const user = await prisma.user.create({
      data: {
        name,
        email: `${uid}@seed.local`,
        preferredPosition: POSITIONS[i % POSITIONS.length],
      },
    });

    await prisma.roomMember.create({
      data: {
        roomId,
        userId: user.id,
        role: "PLAYER",
        playRole: "LINE",
        status: "CONFIRMED",
        decidedAt: new Date(),
      },
    });

    console.log(`  ✓ ${name} (${user.id})`);
  }

  console.log(`\nPronto! ${need} jogadores adicionados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
