import mongoose from 'mongoose'

const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    source: { type: String, enum: ['manual', 'csv', 'demo'], default: 'manual' },
    note: { type: String, maxlength: 300, default: '' },
  },
  { timestamps: true, minimize: false }
)

schema.index({ user: 1, date: 1 }, { unique: true })

export const LogEntry = mongoose.model('LogEntry', schema)
