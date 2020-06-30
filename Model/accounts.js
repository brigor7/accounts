import mongoose from 'mongoose';

const uri =
  'mongodb+srv://brigor_m0ng0:B@nc0_m0ng0@cluster0-fi27e.gcp.mongodb.net/grades?retryWrites=true&w=majority';

function conectarBD() {
  try {
    mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Conexão com BD feita com sucesso!');
  } catch (err) {
    throw new Error('Falha ao se comunicar com o banco de dados: ' + err);
  }
}

const accountSchema = mongoose.Schema({
  conta: {
    type: Number,
    required: true,
  },
  agencia: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    validate(value) {
      if (value < 0) throw new Error('Saldo não pode ser negativo!');
    },
  },
});

const accountModel = mongoose.model('accounts', accountSchema, 'accounts');
export { conectarBD, accountModel };
