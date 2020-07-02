import mongoose from 'mongoose';

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
export { accountModel };
