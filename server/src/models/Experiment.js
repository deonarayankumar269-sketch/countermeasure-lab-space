import mongoose from 'mongoose'

const day = new mongoose.Schema(
  {
    date: { type: String, required: true },
    phase: { type: String, enum: ['A', 'B', 'W'], required: true },
    period: { type: Number, required: true },
  },
  { _id: false }
)

const schema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 90 },
    hypothesis: { type: String, trim: true, maxlength: 400, default: '' },
    intervention: {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      protocol: { type: String, trim: true, maxlength: 500, default: '' },
    },
    outcome: {
      metric: { type: String, required: true },
      label: { type: String, required: true, maxlength: 40 },
      unit: { type: String, default: '', maxlength: 12 },
      higherIsBetter: { type: Boolean, required: true },
    },
    minEffect: { type: Number, required: true, min: 0 },
    design: {
      blockDays: { type: Number, required: true },
      pairs: { type: Number, required: true },
      washoutDays: { type: Number, required: true },
      startDate: { type: String, required: true },
      seed: { type: Number, required: true },
      extendedDays: { type: Number, default: 0 },
    },
    schedule: { type: [day], default: [] },
    status: { type: String, enum: ['active', 'kept', 'dropped'], default: 'active' },
    decision: {
      action: String,
      note: { type: String, default: '' },
      at: Date,
      snapshot: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
)

schema.methods.toClient = function () {
  const o = this.toObject({ versionKey: false })
  o.id = o._id.toString()
  delete o._id
  delete o.owner
  return o
}

export const Experiment = mongoose.model('Experiment', schema)
