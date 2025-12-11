const axios = require('axios');
require('dotenv').config({ path: "../../.env" });
const asaas_key = ("$aact_hmlg_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OjBiOTAxZTk2LWY1NTktNGIwOC1iMzlmLWYxZDM5NmQyNWIxNTo6JGFhY2hfMTYxMDQwNWUtZDhkZi00Mzc0LTg3OTAtN2E3NjM2ZjVjMDZl");

/*

CLIENTE CRIADO EM AMBIENTE SANDBOX DO ASAAS

{
  object: 'customer',
  id: 'cus_000006781945',
  dateCreated: '2025-06-17',
  name: 'Cliente Teste',
  email: 'clienteteste@gmail.com',
  company: 'Empresa Teste',
  phone: '4738010919',
  mobilePhone: '47999376637',
  address: 'Av. Paulista',
  addressNumber: '150',
  complement: 'Sala 201',
  province: 'Centro',
  postalCode: '01310000',
  cpfCnpj: '24971563792',
  personType: 'FISICA',
  deleted: false,
  additionalEmails: null,
  externalReference: '12987382',
  notificationDisabled: true,
  observations: null,
  municipalInscription: null,
  stateInscription: null,
  canDelete: true,
  cannotBeDeletedReason: null,
  canEdit: true,
  cannotEditReason: null,
  city: 15873,
  cityName: 'São Paulo',
  state: 'SP',
  country: 'Brasil',
  groups: [ { name: 'Grupo Teste' } ]
}

*/

// Criação de Cliente
async function criarClienteAsaas(dadosCliente) {
    const options = {
    method: 'POST',
    url: 'https://api-sandbox.asaas.com/v3/customers',
    headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: asaas_key
    },
    data: {
        name: dadosCliente.name,
        cpfCnpj: dadosCliente.cpfCnpj,
        email: dadosCliente.email,
        phone: dadosCliente.phone,
        mobilePhone: dadosCliente.mobilePhone,
        address: dadosCliente.address,
        addressNumber: dadosCliente.addressNumber,
        complement: dadosCliente.complement,
        province: dadosCliente.province,
        postalCode: dadosCliente.postalCode,
        externalReference: Math.floor(Math.random() * 999) + 1,
        notificationDisabled: true,
        groupName: 'Grupo DOUTOR BEER',
        company: 'DOUTOR BEER'
    }
    };

    try {
        const res = await axios.request(options);
        console.log(res.data);
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

// criarClienteAsaas();

// Consultar um único cliente
async function consultarClienteAsaas() {
    const options = {
        method: 'GET',
        url: 'https://api.asaas.com/v3/customers/cus_000006781945',
        headers: {
            accept: 'application/json',
            access_token: asaas_key
        }
    };
    
    axios
    .request(options)
    .then(res => console.log(res.data))
    .catch(err => console.error(err));
};

// consultarClienteAsaas();

async function removerClienteAsaas() {
    const options = {
        method: 'DELETE',
        url: 'https://api.asaas.com/v3/customers/cus_000123749298',
        headers: {accept: 'application/json', access_token: asaas_key}
    };

    axios
    .request(options)
    .then(res => console.log(res.data))
    .catch(err => console.error(err));
}

// removerClienteAsaas();

// Cobranças via boleto
async function cobrancaBoletoAsaas(dadosCliente) {
    const options = {
        method: 'POST',
        url: 'https://api.asaas.com/v3/payments',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            access_token: asaas_key
        },
        data: {
            billingType: 'BOLETO',
            customer: dadosCliente.customer,
            value: dadosCliente.value,
            dueDate: dadosCliente.dueDate,
            description: 'Pedido Boleto DOUTOR BEER',
            daysAfterDueDateToRegistrationCancellation: 1
        }
    };
    
    try {
        const res = await axios.request(options);
        console.log(res.data)
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// cobrancaBoletoAsaas();

async function obterLinhaBoleto(id) {
    const options = {
        method: 'GET',
        url: `https://api.asaas.com/v3/payments/${id}/identificationField`,
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            access_token: asaas_key
        },
    };

    try {
        const res = await axios.request(options);
        console.log(res.data)
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

// obterLinhaBoleto(id)

// Cobranças via Pix
async function cobrancaPixAsaas(dadosCliente) {
    const options = {
        method: 'POST',
        url: 'https://api.asaas.com/v3/payments',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            access_token: asaas_key
        },
        data: {
            billingType: 'PIX',
            customer: dadosCliente.customer,
            value: dadosCliente.value,
            dueDate: dadosCliente.dueDate,
            description: 'Pedido PIX BALCÃO E BANDEJA',
            externalReference: dadosCliente.externalReference
        }
    };

    try {
        const res = await axios.request(options);
        return res.data;
    } catch (err) {
        console.error(err.response?.data || err.message);
        throw err;
    }
}

// cobrancaPixAsaas();

async function obterCodPix(id) {
    const options = {
    method: 'GET',
    url: `https://api.asaas.com/v3/payments/${id}/pixQrCode`,
    headers: {accept: 'application/json', access_token: asaas_key}
    };

    try {
        const res = await axios.request(options);
        console.log(res);
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// obterCodPix();

// Cobrança via Cartão de Crédito
async function cobrancaCartaoAsaas(dadosCliente) {
  const options = {
    method: "POST",
    url: "https://api-sandbox.asaas.com/v3/payments",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: asaas_key
    },
    data: {
      billingType: "CREDIT_CARD",
      value: dadosCliente.value,
      dueDate: new Date().toISOString().split("T")[0], // ✅ adiciona data de vencimento obrigatória
      description: "Pedido pago com Cartão - DOUTOR BEER",
      remoteIp: "10.0.0.118",
      customer: dadosCliente.customer,
      installmentCount: dadosCliente.installmentCount,
      installmentValue: dadosCliente.installmentValue,
      creditCard: {
        holderName: dadosCliente.holderName,
        number: dadosCliente.number,
        expiryMonth: dadosCliente.expiryMonth,
        expiryYear: dadosCliente.expiryYear,
        ccv: dadosCliente.ccv
      },
      creditCardHolderInfo: {
        name: dadosCliente.holderName,
        email: dadosCliente.email,
        cpfCnpj: dadosCliente.cpfCnpj,
        postalCode: dadosCliente.postalCode,
        addressNumber: dadosCliente.addressNumber,
        addressComplement: dadosCliente.addressComplement || "",
        phone: dadosCliente.phone
      }
    }
  };

  try {
    const res = await axios.request(options);
    return res.data;
  } catch (err) {
    console.error("Erro ASAAS cartão:", err.response?.data || err.message);
    throw err;
  }
}

// cobrancaCartaoAsaas();

// Consultar status da cobrança Asaas
async function consultarCobranca(payment_id) {
    const options = {
    method: 'GET',
    url: `https://api-sandbox.asaas.com/v3/payments/${payment_id}/status`,
    headers: {
        accept: 'application/json',
        access_token: asaas_key
    }
    };

    try {
        const res = await axios.request(options);
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

// Agendar NFS-e
async function agendarNfsAsaas(dadosNfs) {
    const options = {
        method: 'POST',
        url: 'https://api.asaas.com/v3/invoices',
        headers: {
            accept: 'application/json',
            'content-type': 'application/json',
            access_token: asaas_key
        },
        data: {
            taxes: {retainIss: false, cofins: 0, csll: 0, inss: 0, ir: 0, pis: 0, iss: 5},
            payment: dadosNfs.payment,
            installment: null,
            customer: dadosNfs.customer,
            serviceDescription: 'Prestação de Serviços Gráficos IMPRIMEAI',
            observations: 'Prestação de Serviços Gráficos IMPRIMEAI',
            externalReference: dadosNfs.externalReference,
            value: dadosNfs.value,
            deductions: 0,
            effectiveDate: dadosNfs.effectiveDate,
            municipalServiceId: 242344,
            municipalServiceCode: '13.05',
            municipalServiceName: 'SEVICOS DE ACABAMENTOS GRAFICOS',
            updatePayment: null
        }
    };
    
    try {
        const res = await axios.request(options);
        console.log(res.data);  
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
};

// Emitir NFS-e
async function emitirNfs(invoice) {
    const options = {
    method: 'POST',
    url: `https://api.asaas.com/v3/invoices/${invoice}/authorize`,
    headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: asaas_key
    }
    };

    try {
        const res = await axios.request(options);
        console.log(res.data);  
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
};
// Listar NFS-e
async function listarNfs(externalReference) {
    const options = {
    method: 'GET',
    url: `https://api.asaas.com/v3/invoices?externalReference=${externalReference}`,
    headers: {
        accept: 'application/json',
        access_token: asaas_key
    }
    };

    try {
        const res = await axios.request(options);
        console.log(res.data);  
        return res.data;
    } catch (err) {
        console.error(err);
        throw err;
    }
}
// Loop para consulta de NF
async function consultarNf(externalReference) {
  while (true) {
    const response = await listarNfs(externalReference);

    if (Array.isArray(response.data)) {
      const nota = response.data.find(nf => nf.status === 'AUTHORIZED');
      if (nota) return nota;
    }

    await new Promise(resolve => setTimeout(resolve, 1000)); // aguarda 1s antes de tentar novamente
  }
}
// Transferências
async function transferenciasAsaas() {
    const options = {
        method: 'POST',
        url: 'https://api.asaas.com/v3/transfers',
        headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        access_token: asaas_key
    },
    data: {
        value: 1,
        bankAccount: {
            ownerName: 'Joao Silva',
            cpfCnpj: '99991111140',
            agency: '0001',
            account: '1234567',
            accountDigit: '8',
            bankAccountType: 'CONTA_CORRENTE',
            ispb: '99999004' // Identificador no Sistema de Pagamentos Brasileiro
        }
    }
    };

    axios
    .request(options)
    .then(res => console.log(res.data))
    .catch(err => console.error(err));
}

module.exports = { criarClienteAsaas, cobrancaPixAsaas, obterCodPix, cobrancaBoletoAsaas, obterLinhaBoleto, cobrancaCartaoAsaas, consultarCobranca, agendarNfsAsaas, emitirNfs, consultarNf };