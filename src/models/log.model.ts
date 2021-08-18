import mongoose from 'mongoose';
const { Schema } = mongoose;

const logSchema = new Schema({
  action: String,
  rs: String,
  account: Object,
  payload: Object,
}, {
  timestamps: true
});

module.exports =
  mongoose.models.Log || mongoose.model('Log', logSchema);
