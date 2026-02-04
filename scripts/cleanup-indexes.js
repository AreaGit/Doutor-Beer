const sequelize = require("../src/config/database");

async function cleanupIndexes() {
    try {
        console.log("🔍 Buscando índices na tabela 'Cupoms'...");

        // Lista os índices da tabela
        const [results] = await sequelize.query("SHOW INDEX FROM Cupoms");

        // Agrupa os índices por nome
        const indexes = results.reduce((acc, index) => {
            if (!acc[index.Key_name]) {
                acc[index.Key_name] = [];
            }
            acc[index.Key_name].push(index.Column_name);
            return acc;
        }, {});

        console.log(`📊 Total de índices encontrados: ${Object.keys(indexes).length}`);

        const toDrop = [];
        let hasUniqueCodigo = false;

        for (const keyName of Object.keys(indexes)) {
            // Ignora a chave primária
            if (keyName === "PRIMARY") continue;

            const columns = indexes[keyName];

            // Se o índice for na coluna 'codigo'
            if (columns.length === 1 && columns[0] === "codigo") {
                if (!hasUniqueCodigo) {
                    // Mantém o primeiro que encontrar (ou um com nome padrão se preferir)
                    console.log(`✅ Mantendo índice: ${keyName}`);
                    hasUniqueCodigo = true;
                } else {
                    // Marca os outros para exclusão
                    toDrop.push(keyName);
                }
            }
        }

        if (toDrop.length === 0) {
            console.log("✨ Nenhum índice redundante encontrado para limpar.");
            return;
        }

        console.log(`🧹 Removendo ${toDrop.length} índices redundantes...`);

        for (const keyName of toDrop) {
            try {
                await sequelize.query(`ALTER TABLE Cupoms DROP INDEX \`${keyName}\``);
                console.log(`  - Removido: ${keyName}`);
            } catch (err) {
                console.error(`  - Erro ao remover ${keyName}: ${err.message}`);
            }
        }

        console.log("🚀 Limpeza concluída com sucesso!");
    } catch (err) {
        console.error("❌ Erro fatal durante a limpeza:", err);
    } finally {
        await sequelize.close();
    }
}

cleanupIndexes();
