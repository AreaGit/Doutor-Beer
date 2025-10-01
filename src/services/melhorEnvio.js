require("dotenv").config({ path: "../../.env" });
const axios = require("axios");

const token = process.env.MELHOR_ENVIO_TOKEN;

async function calcularFrete({ toPostalCode, products }) {
  try {
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
        from: { postal_code: "09560101" }, // seu CEP de origem fixo
        to: { postal_code: toPostalCode }, // CEP de destino recebido
        products, // lista de produtos recebida
      },
    };

    const response = await axios.request(options);
    return response.data;
  } catch (err) {
    console.error("❌ Erro ao calcular frete:", err.response?.data || err.message);
    throw new Error("Falha ao calcular frete");
  }
}

module.exports = { calcularFrete };