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

export { app as router };
