import { C, sans } from './theme'

export const label = {
  display: 'block',
  fontFamily: sans,
  fontSize: 12,
  fontWeight: 600,
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  color: C.mute,
  marginBottom: 6,
}

export const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 12px',
  border: `1.5px solid ${C.line}`,
  borderRadius: 10,
  fontSize: 16,
  fontFamily: sans,
  color: C.ink,
  background: '#fff',
  outline: 'none',
}

export const field = { marginBottom: 16 }
