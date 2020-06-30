import express from 'express';
import { conectarBD, accountModel } from './Model/accounts.js';

const app = new express();
const port = 3000;

app.use(express.json());
conectarBD();
app.listen(port, () => {
  console.log('server started!');
});
