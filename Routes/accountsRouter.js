import express from 'express';
import { accountModel } from '../Model/accounts.js';

const app = express();

app.get('/', (_, res) => {
  const account = accountModel.find({});
  res.send(account);
});

export { app as router };
