import { getStore } from '@netlify/blobs'
import { handle } from '../lib/api.mjs'

export default async (req) =>
  handle(req, {
    store: getStore({ name: 'signups', consistency: 'strong' }),
    limits: getStore({ name: 'limits', consistency: 'strong' }),
    env: process.env,
  })
