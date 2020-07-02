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

async function consultAccount(req, res) {
  const account = await accountModel.findOne({
    agencia: req.params.agencia,
    conta: req.params.conta,
  });
  contaInexistente(res, account);
  res.send(`Saldo: $${account.balance}`);
}

async function smallerBalance(req, res) {
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
    { $limit: Number(req.params.tamanho) },
  ]);
  contaInexistente(res, account);
  res.send(account);
}

async function biggerBalance(req, res) {
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
    { $limit: Number(req.params.tamanho) },
  ]);
  contaInexistente(res, account);
  res.send(account);
}

async function avgAccounts(agencia, res) {
  const account = await accountModel.aggregate([
    { $group: { _id: '$agencia', media: { $avg: '$balance' } } },
    { $match: { _id: agencia } },
  ]);
  contaInexistente(res, account);
  res.send(account);
}

async function deposit(agencia, conta, balance, res) {
  const account = await searchAccount(agencia, conta);

  contaInexistente(res, account);
  //Atualizando valor do saldo
  account.balance += Number(balance);

  const newAccount = await accountModel.findOneAndUpdate(
    { agencia: agencia, conta: conta },
    account,
    { new: true }
  );
  res.send(newAccount);
}

async function withdraw(agencia, conta, balance, res) {
  let saque_e_tarifa = Number(balance) + TARIFA_SAQUE;

  const account = await searchAccount(agencia, conta);
  contaInexistente(res, account);
  saldoInsuficiente(res, account, saque_e_tarifa);

  //Atualizando valor do saldo
  account.balance -= saque_e_tarifa;
  const newAccount = await accountModel.findOneAndUpdate(
    { agencia: agencia, conta: conta },
    account,
    { new: true }
  );
  res.send(`Saldo atual da conta: $${newAccount.balance}`);
}

async function deleteAccount(agencia, conta) {
  contaInexistenteN(await searchAccount(agencia, conta));
  await desativarConta(agencia, conta);
}

/**Suport functions */

async function searchAgencias(agencia) {
  const agenciasAtivas = await accountModel.find({
    agencia: agencia,
  });
  return agenciasAtivas;
}

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

function contaInexistente(res, account) {
  if (!account || account.length === 0) {
    res.status(404).send('Conta não encontrada.');
    return;
  }
}

function contaInexistenteN(account) {
  if (!account || account.length === 0) {
    throw new Error('Conta não encontrada.');
  }
}

function saldoInsuficiente(res, conta, valor) {
  if (conta.balance - valor < 0) {
    res.status(203).send('Saldo insuficiente para realizar esta operação.');
    return;
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
};
