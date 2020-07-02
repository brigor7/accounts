import mongoose from 'mongoose';
import { accountModel } from '../Model/accounts.js';

const URI = 'mongodb://localhost:27017/account?retryWrites=true';

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

/**Suport functions */
function contaInexistente(res, conta) {
  if (!conta || conta.length === 0) {
    res.status(404).send('Account not found with informed parameters.');
    return;
  }
}

export { conectarBD, searchAll, consultAccount, smallerBalance, biggerBalance };
