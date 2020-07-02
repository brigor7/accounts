import mongoose from 'mongoose';
import { accountModel } from '../Model/accounts.js';

const URI = 'mongodb://localhost:27017/account?retryWrites=true';
const TARIFA_SAQUE = 1;
const TARIFA_TRASFERENCIA_OUTRA_AGENCIA = 8;

//'mongodb+srv://brigor_m0ng0:B@nc0_m0ng0@cluster0-fi27e.gcp.mongodb.net/account?retryWrites=true&w=majority';

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

async function searchAll() {
  const account = await accountModel.find({});
  return account;
}

async function consultAccount(agencia, conta) {
  const account = await accountModel.findOne({
    agencia: agencia,
    conta: conta,
  });
  contaInexistente(account);
  return account;
}

async function smallerBalance(tamanho) {
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
  return account;
}

async function biggerBalance(tamanho) {
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
  return account;
}

async function avgAccounts(agencia) {
  const account = await accountModel.aggregate([
    { $group: { _id: '$agencia', media: { $avg: '$balance' } } },
    { $match: { _id: agencia } },
  ]);
  contaInexistente(account);
  return account;
}

async function deposit(agencia, conta, balance) {
  const account = await searchAccount(agencia, conta);

  contaInexistente(account);
  //Atualizando valor do saldo
  account.balance += Number(balance);

  const newAccount = await accountModel.findOneAndUpdate(
    { agencia: agencia, conta: conta },
    account,
    { new: true }
  );
  return newAccount;
}

async function withdraw(agencia, conta, balance, res) {
  let saque_e_tarifa = Number(balance) + TARIFA_SAQUE;

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
  return newAccount;
}

async function transfer(contaOrigem, contaDestino, valorTransferencia) {
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
    let valorComTarifa = valorTransferencia + TARIFA_TRASFERENCIA_OUTRA_AGENCIA;
    saldoInsuficiente(contaOrigem, valorComTarifa);
    contaOrigem.balance -= valorComTarifa;
    contaDestino.balance += valorTransferencia;
    await transferirValores(contaOrigem, contaDestino);
  }
}

async function deleteAccount(agencia, conta) {
  contaInexistente(await searchAccount(agencia, conta));
  await desativarConta(agencia, conta);
}

async function searchAgencias(agencia) {
  const agenciasAtivas = await accountModel.find({
    agencia: agencia,
  });
  return agenciasAtivas;
}

async function vipAccounts() {
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
  return accounts;
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
