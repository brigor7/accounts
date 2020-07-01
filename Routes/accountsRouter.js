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

app.put(
  '/transferencia/:agOrigem/:ctOrigem/:valor/:agDestino/:ctDestino',
  async (req, res) => {
    try {
      const valorTransferencia = Number(req.params.valor);

      /**Buscar dados da agencia de origem */
      const contaOrigem = await accountModel.findOne({
        agencia: req.params.agOrigem,
        conta: req.params.ctOrigem,
      });

      /**Verificando a existencia da conta de origem */

      if (!contaOrigem) {
        res.status(404).send('Conta de origem não encontrada.');
        return;
      }

      /**Buscar dados da agencia de destino */
      const contaDestino = await accountModel.findOne({
        agencia: req.params.agDestino,
        conta: req.params.ctDestino,
      });

      /**Verificando a existencia da conta de destino */

      if (!contaDestino) {
        res.status(404).send('Conta de destino não encontrada.');
        return;
      }

      /**Verificando se as contas são da mesma agencia */
      if (contaOrigem.agencia === contaDestino.agencia) {
        res.send('contas são da mesma agencia');
      } else {
        /**Verificar se saldo da conta ficará negativo */
        let saldo = valorTransferencia + TARIFA_TRASFERENCIA_OUTRA_AGENCIA;
        if (contaOrigem.balance - saldo < 0) {
          res
            .status(203)
            .send('Saldo insuficiente para realizar transferencia.');
        } else {
          res.send('constas são de outra agencia - com saldo suficiente');
        }
      }
    } catch (error) {
      res.status(500).send('Erro ao realizar a Transferencia: ' + error);
    }
  }
);

export { app as router };
