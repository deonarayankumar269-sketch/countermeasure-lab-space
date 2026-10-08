import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    callsign: { type: String, trim: true, maxlength: 24, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
  },
  { timestamps: true }
)

schema.methods.toPublic = function () {
  return { id: this._id.toString(), name: this.name, callsign: this.callsign, email: this.email, createdAt: this.createdAt }
}

export const User = mongoose.model('User', schema)
