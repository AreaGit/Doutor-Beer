require("dotenv").config({ path: "../../.env" });
const axios = require("axios");

const token = process.env.MELHOR_ENVIO_TOKEN;

async function calcularFrete({ toPostalCode, products }) {
  try {
    if (!products || !products.length) throw new Error("Nenhum produto fornecido");

    // Normaliza e valida os produtos
    const produtosFormatados = products.map((p, idx) => {
      const width = Math.max(parseFloat(p.width) || 10, 10);
      const height = Math.max(parseFloat(p.height) || 10, 10);
      const length = Math.max(parseFloat(p.length) || 10, 10);
      const weight = Math.max(parseFloat(p.weight) || 0.3, 0.3);
      const insurance_value = parseFloat(p.insurance_value) || 0;
      const quantity = parseInt(p.quantity) || 1;

      console.log(`[MelhorEnvio] Produto ${idx + 1}:`, { width, height, length, weight, insurance_value, quantity });

      return { width, height, length, weight, insurance_value, quantity };
    });

    if (!toPostalCode || !/^\d{8}$/.test(toPostalCode)) {
      throw new Error(`CEP inválido: ${toPostalCode}`);
    }

    const options = {
      method: "POST",
      url: "https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "Aplicação contato@doutorbeer.com.br",
      },
      data: {
        from: { postal_code: "09560101" }, // CEP de origem
        to: { postal_code: toPostalCode },
        products: produtosFormatados,
      },
    };

    console.log("[MelhorEnvio] Chamando API com:", JSON.stringify(options.data, null, 2));

    const response = await axios.request(options);

    console.log("[MelhorEnvio] Resposta API:", response.data);

    // Retorna apenas opções válidas
    const opcoesValidas = (response.data || []).filter(o => o.price && !o.error);
    if (!opcoesValidas.length) {
      console.warn("[MelhorEnvio] Nenhuma opção de frete válida retornada");
    }

    return opcoesValidas;

  } catch (err) {
    console.error("❌ Erro ao calcular frete:", err.response?.data || err.message);
    throw err; // repassa para o frontend
  }
}

module.exports = { calcularFrete };