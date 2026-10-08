import bcrypt from 'bcryptjs'
import { connectDb, closeDb } from './db.js'
import { User } from './models/User.js'
import { loadDemo } from './lib/demo.js'
import { log } from './lib/logger.js'

const email = 'demo@n1lab.space'
const password = 'orbit-demo-1'

await connectDb()
let user = await User.findOne({ email })
if (!user) {
  user = await User.create({ name: 'Mara Okonkwo', callsign: 'Kestrel', email, passwordHash: await bcrypt.hash(password, 11) })
  log.info('created demo user')
}
await loadDemo(user._id)
log.info(`done. sign in with ${email} / ${password}`)
await closeDb()
