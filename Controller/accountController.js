import mongoose from 'mongoose';
import { accountModel } from '../Model/accounts.js';

const URI = 'mongodb://localhost:27017/account?retryWrites=true';

//'mongodb+srv://brigor_m0ng0:B@nc0_m0ng0@cluster0-fi27e.gcp.mongodb.net/account?retryWrites=true&w=majority';

function conectarBD() {
  try {
    mongoose.connect(URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conexão com BD feita com sucesso!');
  } catch (err) {
    throw new Error('Falha ao se comunicar com o banco de dados: ' + err);
  }
}

async function searchAll() {
  const account = await accountModel.find({});
  return account;
}

export { conectarBD, searchAll };
