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
} from '../Controller/accountController.js';

const app = express();
const TARIFA_SAQUE = 1;
const TARIFA_TRASFERENCIA_OUTRA_AGENCIA = 8;

app.get('/', async (_, res) => {
  try {
    const account = await searchAll();
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint get: ' + error);
  }
});

app.get('/consulta/:agencia/:conta', async (req, res) => {
  const agencia = req.params.agencia;
  const conta = req.params.conta;
  try {
    const account = await consultAccount(agencia, conta);
    res.send(`Saldo: $${account.balance}`);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endpoint consulta:  ' + error);
  }
});

app.get('/menorSaldo/:tamanho', async (req, res) => {
  const tamanho = req.params.tamanho;
  try {
    const account = await smallerBalance(tamanho);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint menorSaldo: ' + error);
  }
});

app.get('/maiorSaldo/:tamanho', async (req, res) => {
  const tamanho = req.params.tamanho;
  try {
    const account = await biggerBalance(tamanho);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint menorSaldo: ' + error);
  }
});

app.get('/avg/:agencia', async (req, res) => {
  let agencia = Number(req.params.agencia);
  try {
    const account = await avgAccounts(agencia);
    res.send(account);
  } catch (error) {
    res.status(500).send('Erro de acesso ao endPoint avg: ' + error);
  }
});

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

app.get('/private', async (req, res) => {
  try {
    /**Buscando CLientes */
    const accounts = await accountModel.aggregate([
      {
        $group: { _id: '$agencia', balance: { $max: '$balance' } },
      },
    ]);
    contaInexistente(res, accounts);

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
});

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
