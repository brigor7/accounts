import express from 'express';
import { accountModel } from '../Model/accounts.js';

const app = express();
const TARIFA_SAQUE = 1;

app.get('/', async (_, res) => {
  try {
    const account = await accountModel.find({});
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro ao acessar Get(): ' + error);
  }
});

app.get('/consulta/:agencia/:conta', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });
    if (!account) {
      res.status(404).send('Conta e Agencia não encontrados.');
      return;
    }
    res.send(`saldo: $${account.balance}`);
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
    if (account.balance - (Number(req.params.value) + TARIFA_SAQUE) < 0) {
      res
        .status(404)
        .send('Conta com saldo negativo. Não é possivel fazer saque.');
      return;
    }

    account.balance -= Number(req.params.value) + TARIFA_SAQUE;
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

app.delete('/remover/:agencia/:conta', async (req, res) => {
  const agencia = req.params.agencia;
  const cont = req.params.conta;

  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });
    if (!account) {
      res.status(404).send('Conta e Agencia não encontrados no sistema.');
      return;
    }
    //Realiza a exclusão do registro
    const retorno = await accountModel.findOneAndDelete({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });

    /**Retornar o número de contas ativas para esta agência. */
    const agenciasAtivas = await accountModel.find({
      agencia: req.params.agencia,
    });
    res.send(agenciasAtivas);
  } catch (error) {
    res.status(500).send('Erro ao acessar Get(): ' + error);
  }
});

export { app as router };
