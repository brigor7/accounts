import express from 'express';
import { accountModel } from '../Model/accounts.js';

const app = express();
const TARIFA_SAQUE = 1;
const TARIFA_TRASFERENCIA_OUTRA_AGENCIA = 8;

app.get('/', async (_, res) => {
  try {
    const account = await accountModel.find({});
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint get: ' + error);
  }
});

app.get('/consulta/:agencia/:conta', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });
    contaInexistente(res, account);
    res.send(`saldo: $${account.balance}`);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint consulta:  ' + error);
  }
});

app.get('/avg/:agencia', async (req, res) => {
  try {
    const account = await accountModel.find({
      agencia: req.params.agencia,
    });
    contaInexistente(res, account);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint avg: ' + error);
  }
});

app.put('/deposito/:agencia/:conta/:value', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });

    contaInexistente(res, account);
    //Atualizando valor do saldo
    account.balance += Number(req.params.value);

    const newAccount = await accountModel.findOneAndUpdate(
      { agencia: req.params.agencia, conta: req.params.conta },
      account,
      { new: true }
    );
    res.send(newAccount);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint deposito: ' + error);
  }
});

app.put('/saque/:agencia/:conta/:value', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });

    contaInexistente(res, account);
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
    res.send(`Saldo atual da conta: $${newAccount.balance}`);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint saque: ' + error);
  }
});

app.delete('/remover/:agencia/:conta', async (req, res) => {
  try {
    const account = await accountModel.findOne({
      agencia: req.params.agencia,
      conta: req.params.conta,
    });
    contaInexistente(res, account);
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
    res.status(500).send('Erro de acesso ao endpoint remover: ' + error);
  }
});

app.put(
  '/transferencia/:agOrigem/:ctOrigem/:valor/:agDestino/:ctDestino',
  async (req, res) => {
    try {
      const valorTransferencia = Number(req.params.valor);

      const contaOrigem = await buscarConta(req, 'origem');
      const contaDestino = await buscarConta(req, 'destino');
      contaInexistente(res, contaOrigem);
      contaInexistente(res, contaDestino);

      /**Verificando se as contas são da mesma agencia */
      if (contaOrigem.agencia === contaDestino.agencia) {
        saldoInsuficiente(res, contaOrigem, valorTransferencia);
        contaOrigem.balance -= valorTransferencia;
        contaDestino.balance += valorTransferencia;
        await transferirValores(contaOrigem, contaDestino);
      } else {
        /**Verificar se saldo da conta ficará negativo */
        let valorComTarifa =
          valorTransferencia + TARIFA_TRASFERENCIA_OUTRA_AGENCIA;
        saldoInsuficiente(res, contaOrigem, valorComTarifa);
        contaOrigem.balance -= valorComTarifa;
        contaDestino.balance += valorTransferencia;
        await transferirValores(contaOrigem, contaDestino);
      }
      res.send(`Saldo da conta de origem: $${contaOrigem.balance}`);
    } catch (error) {
      res
        .status(500)
        .send('Erro de acesso ao endpoint transferencia: ' + error);
    }
  }
);

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

function contaInexistente(res, conta) {
  if (!conta || conta.length === 0) {
    res.status(404).send('Conta não encontrada.');
    return;
  }
}

function saldoInsuficiente(res, conta, valor) {
  if (conta.balance - valor < 0) {
    res
      .status(203)
      .send('Saldo insuficiente para realizar transferencia na mesma agência.');
    return;
  }
}

export { app as router };
