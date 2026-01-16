const Cupom = require("./src/models/Cupom");
const sequelize = require("./src/config/database");

async function seed() {
    try {
        console.log("Iniciando seeding...");
        await sequelize.authenticate();
        console.log("✅ Conectado ao banco.");

        const cupons = [
            {
                codigo: "NHGSYS150S",
                tipo: "fixo",
                valor: 150.00,
                minimo: 500.00,
                ativo: true
            },
            {
                codigo: "DBFRETEGRATIS",
                tipo: "frete_gratis",
                valor: 0,
                minimo: 200.00,
                ativo: true
            }
        ];

        for (const c of cupons) {
            console.log(`Buscando/Criando cupom: ${c.codigo}`);
            const [cupom, created] = await Cupom.findOrCreate({
                where: { codigo: c.codigo },
                defaults: c
            });

            if (created) {
                console.log(`✅ Cupom ${c.codigo} criado.`);
            } else {
                console.log(`ℹ️ Cupom ${c.codigo} já existe.`);
            }
        }

        console.log("Seeding finalizado com sucesso!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Erro fatal no seeding:");
        console.error(error);
        process.exit(1);
    }
}

seed();
