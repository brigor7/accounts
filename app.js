import express from 'express';
import { conectarBD } from './Controller/accountController.js';
import { router } from './Routes/accountsRouter.js';

const app = new express();
const port = 3000;

app.use(express.json());
app.use('/account', router);
conectarBD();
app.listen(port, () => {
  console.log('server started!');
});
