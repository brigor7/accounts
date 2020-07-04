import express from 'express';
import { accountModel } from '../Model/accounts.js';
import {
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
} from '../Controller/accountController.js';

const app = express();

app.get('/', searchAll);
app.get('/consulta/:agencia/:conta', consultAccount);
app.get('/menorSaldo/:tamanho', smallerBalance);
app.get('/maiorSaldo/:tamanho', biggerBalance);
app.get('/avg/:agencia', avgAccounts);
app.put('/deposito/:agencia/:conta/:value', deposit);
app.put('/saque/:agencia/:conta/:value', withdraw);

app.put(
  '/transferencia/:agOrigem/:ctOrigem/:valor/:agDestino/:ctDestino',
  transfer
);
app.delete('/remover/:agencia/:conta', deleteAccount);

app.get('/vip', async (req, res) => {
  try {
    const accounts = await vipAccounts();
    res.send(accounts);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint private: ' + error);
  }
});

export { app as router };
