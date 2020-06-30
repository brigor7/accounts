import express from 'express';
import { accountModel } from '../Model/accounts.js';

const app = express();

app.get('/', async (_, res) => {
  try {
    const account = await accountModel.find({});
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro ao acessar Get(): ' + error);
  }
});

app.put('/deposito/:agencia/:conta/:value', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });

    if (!account) {
      res.status(404).send('Conta e Agencia não encontrados.');
      return;
    }
    //Atualizando valor do saldo
    account.balance += Number(req.params.value);

    const newAccount = await accountModel.findOneAndUpdate(
      { agencia: req.params.agencia, conta: req.params.conta },
      account,
      { new: true }
    );
    res.send(newAccount);
  } catch (error) {
    res.status(500).send('Erro ao acessar Get(): ' + error);
  }
});

app.put('/saque/:agencia/:conta/:value', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });

    if (!account) {
      res.status(404).send('Conta e Agencia não encontrados.');
      return;
    }
    //Atualizando valor do saldo
    if (account.balance - Number(req.params.value) < 0) {
      res
        .status(404)
        .send('Conta com saldo negativo. Não é possivel fazer saque.');
      return;
    }

    account.balance -= Number(req.params.value);
    const newAccount = await accountModel.findOneAndUpdate(
      { agencia: req.params.agencia, conta: req.params.conta },
      account,
      { new: true }
    );
    res.send(newAccount);
  } catch (error) {
    res.status(500).send('Erro ao acessar Get(): ' + error);
  }
});

export { app as router };
