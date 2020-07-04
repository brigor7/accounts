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



app.put('/deposito/:agencia/:conta/:value', async (req, res) => {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  const balance = req.params.value;
  try {
    const account = await deposit(agencia, conta, balance);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint deposito: ' + error);
  }
});

app.put('/saque/:agencia/:conta/:value', async (req, res) => {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  const balance = req.params.value;
  try {
    const account = await withdraw(agencia, conta, balance);
    res.send(`Saldo atual da conta: $${account.balance}`);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.delete('/remover/:agencia/:conta', async (req, res, next) => {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  try {
    await deleteAccount(agencia, conta);
    const agenciasAtivas = await searchAgencias(agencia);
    res.send(
      'Conta desativada. Total de contas ativas na agência: ' +
        agenciasAtivas.length
    );
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put(
  '/transferencia/:agOrigem/:ctOrigem/:valor/:agDestino/:ctDestino',
  async (req, res) => {
    try {
      const valorTransferencia = req.params.valor;
      const contaDestino = await buscarConta(req, 'destino');
      const contaOrigem = await buscarConta(req, 'origem');
      const balance = transfer(contaOrigem, contaDestino, valorTransferencia);
      res.send(`Saldo da conta de origem: $${balance}`);
    } catch (error) {
      res
        .status(500)
        .send('Erro de acesso ao endpoint transferencia: ' + error);
    }
  }
);

app.get('/vip', async (req, res) => {
  try {
    const accounts = await vipAccounts();
    res.send(accounts);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint private: ' + error);
  }
});

export { app as router };
