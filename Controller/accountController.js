import mongoose from 'mongoose';
import { accountModel } from '../Model/accounts.js';

const URI = 'mongodb://localhost:27017/account?retryWrites=true';
const TARIFA_SAQUE = 1;
const TARIFA_TRASFERENCIA_OUTRA_AGENCIA = 8;

function conectarBD() {
  try {
    mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conexão com BD feita com sucesso!');
  } catch (err) {
    throw new Error('Falha ao se comunicar com o banco de dados: ' + err);
  }
}

async function searchAll(_, res) {
  try {
    const account = await accountModel.find({});
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint get: ' + error);
  }
}

async function consultAccount(req, res) {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  try {
    const account = await accountModel.findOne({
      agencia: agencia,
      conta: conta,
    });
    contaInexistente(account);
    res.send(`Saldo: $${account.balance}`);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint consulta:  ' + error);
  }
}

async function smallerBalance(req, res) {
  try {
    const tamanho = req.params.tamanho;
    const account = await accountModel.aggregate([
      {
        $project: {
          name: '$name',
          agencia: '$agencia',
          conta: '$conta',
          balance: '$balance',
        },
      },
      { $sort: { balance: 1 } },
      { $limit: Number(tamanho) },
    ]);
    contaInexistente(account);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint menorSaldo: ' + error);
  }
}

async function biggerBalance(req, res) {
  const tamanho = req.params.tamanho;
  try {
    const account = await accountModel.aggregate([
      {
        $project: {
          agencia: '$agencia',
          conta: '$conta',
          name: '$name',
          balance: '$balance',
        },
      },
      { $sort: { balance: -1, name: 1 } },
      { $limit: Number(tamanho) },
    ]);
    contaInexistente(account);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint menorSaldo: ' + error);
  }
}

async function avgAccounts(req, res) {
  let agencia = Number(req.params.agencia);
  try {
    const account = await accountModel.aggregate([
      { $group: { _id: '$agencia', media: { $avg: '$balance' } } },
      { $match: { _id: agencia } },
    ]);
    contaInexistente(account);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint avg: ' + error);
  }
}

async function deposit(req, res) {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  const balance = req.params.value;
  try {
    const account = await searchAccount(agencia, conta);
    contaInexistente(account);
    //Atualizando valor do saldo
    account.balance += Number(balance);

    const newAccount = await accountModel.findOneAndUpdate(
      { agencia: agencia, conta: conta },
      account,
      { new: true }
    );
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint deposito: ' + error);
  }
}

async function withdraw(req, res) {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  const balance = req.params.value;
  let saque_e_tarifa = Number(balance) + TARIFA_SAQUE;

  try {
    const account = await searchAccount(agencia, conta);
    contaInexistente(account);
    saldoInsuficiente(account, saque_e_tarifa);

    //Atualizando valor do saldo
    account.balance -= saque_e_tarifa;
    const newAccount = await accountModel.findOneAndUpdate(
      { agencia: agencia, conta: conta },
      account,
      { new: true }
    );
    res.send(`Saldo atual da conta: $${account.balance}`);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint saque: ' + error);
  }
}

async function transfer(req, res) {
  const valorTransferencia = req.params.valor;
  try {
    const contaDestino = await buscarConta(req, 'destino');
    const contaOrigem = await buscarConta(req, 'origem');

    contaInexistente(contaOrigem);
    contaInexistente(contaDestino);

    /**Verificando se as contas são da mesma agencia */
    if (contaOrigem.agencia === contaDestino.agencia) {
      saldoInsuficiente(contaOrigem, valorTransferencia);
      contaOrigem.balance -= valorTransferencia;
      contaDestino.balance += valorTransferencia;
      await transferirValores(contaOrigem, contaDestino);
    } else {
      /**Verificar se saldo da conta ficará negativo */
      let valorComTarifa =
        valorTransferencia + TARIFA_TRASFERENCIA_OUTRA_AGENCIA;
      saldoInsuficiente(contaOrigem, valorComTarifa);
      contaOrigem.balance -= valorComTarifa;
      contaDestino.balance += valorTransferencia;
      await transferirValores(contaOrigem, contaDestino);
    }
    res.send(`Saldo da conta de origem: $${contaOrigem.balance}`);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint transferencia: ' + error);
  }
}

async function deleteAccount(req, res) {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  try {
    contaInexistente(await searchAccount(agencia, conta));
    await desativarConta(agencia, conta);
    const agenciasAtivas = await searchAgencias(agencia);
    res.send(
      'Conta desativada. Total de contas ativas na agência: ' +
        agenciasAtivas.length
    );
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint delete: ' + error);
  }
}

async function searchAgencias(agencia) {
  const agenciasAtivas = await accountModel.find({
    agencia: agencia,
  });
  return agenciasAtivas;
}

async function vipAccounts(_, res) {
  try {
    /**Buscando CLientes */
    const accounts = await accountModel.aggregate([
      {
        $group: { _id: '$agencia', balance: { $max: '$balance' } },
      },
    ]);

    // /**Transferindo clientes */
    // let pvtAccount = null;
    // let pvtAccounts = [];
    // accounts.forEach(async (account) => {
    //   pvtAccount = await accountModel.findOne({
    //     agencia: account._id,
    //     balance: account.balance,
    //   });
    //   pvtAccount.agencia = 99;
    //   console.log(pvtAccount);
    //   pvtAccounts.push(pvtAccount);
    //   //await accountModel.findOneAndUpdate({ _id: pvtAccount._id,  });
    // });
    //let biggersAccounts = await accountModel.find({ agencia: 99 });
    res.send(accounts);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint private: ' + error);
  }
}

/**Suport functions */
async function desativarConta(agencia, conta) {
  await accountModel.findOneAndDelete({
    agencia: agencia,
    conta: conta,
  });
}

async function searchAccount(agencia, conta) {
  const account = await accountModel.findOne({
    agencia: agencia,
    conta: conta,
  });
  return account;
}

async function transferirValores(contaOrigem, contaDestino) {
  /**Atualizando a conta de origem */
  await accountModel.findOneAndUpdate(
    { agencia: contaOrigem.agencia, conta: contaOrigem.conta },
    contaOrigem
  );
  /**Atualizando a conta de destino */
  await accountModel.findOneAndUpdate(
    { agencia: contaDestino.agencia, conta: contaDestino.conta },
    contaDestino
  );
}

async function buscarConta(req, fonte) {
  let conta = null;
  if (fonte == 'origem') {
    conta = await accountModel.findOne({
      agencia: req.params.agOrigem,
      conta: req.params.ctOrigem,
    });
  } else {
    conta = await accountModel.findOne({
      agencia: req.params.agDestino,
      conta: req.params.ctDestino,
    });
  }
  return conta;
}

function contaInexistente(account) {
  if (!account || account.length === 0) {
    throw new Error('Conta não encontrada.');
  }
}

function saldoInsuficiente(account, valor) {
  if (account.balance - valor < 0) {
    throw new Error('Saldo insuficiente para realizar esta operação.');
  }
}

export {
  conectarBD,
  searchAll,
  consultAccount,
  smallerBalance,
  biggerBalance,
  avgAccounts,
  deposit,
  withdraw,
  deleteAccount,
  searchAgencias,
  transfer,
  buscarConta,
  vipAccounts,
};
