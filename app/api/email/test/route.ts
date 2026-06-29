import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Socket } from 'net'
import type { TLSSocket } from 'tls'

// ── SMTP ──────────────────────────────────────────────────────────────────────

async function testSmtp(host: string, port: number, ssl: boolean, user: string, pass: string) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: ssl,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  })
  await transporter.verify()
}

// ── IMAP (raw TCP) ────────────────────────────────────────────────────────────
// Implements just enough of IMAP4rev1 (RFC 3501) to authenticate and logout.

async function testImap(host: string, port: number, ssl: boolean, user: string, pass: string) {
  const net  = await import('net')
  const tls  = await import('tls')

  return new Promise<void>((resolve, reject) => {
    const TIMEOUT = 12_000
    let buffer = ''
    let step: 'greeting' | 'login' = 'greeting'

    // Escape IMAP string literal: wrap in quotes, escape \ and "
    const q = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`

    const onSocket = (socket: Socket | TLSSocket) => {
      socket.setTimeout(TIMEOUT)
      socket.on('timeout', () => { socket.destroy(); reject(new Error('Connection timed out')) })
      socket.on('error', reject)
      socket.on('data', (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\r\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (step === 'greeting') {
            // Server greeting is an untagged response: "* OK ..."
            if (line.startsWith('* OK') || line.startsWith('* PREAUTH')) {
              step = 'login'
              socket.write(`a001 LOGIN ${q(user)} ${q(pass)}\r\n`)
            }
            // Ignore capability lines and anything else during greeting
            continue
          }

          if (step === 'login') {
            // Skip untagged responses
            if (line.startsWith('*') || line.startsWith('+')) continue
            // Tagged response for a001
            if (line.startsWith('a001 OK')) {
              socket.write('a002 LOGOUT\r\n')
              socket.destroy()
              resolve()
              return
            }
            if (line.startsWith('a001 ')) {
              // NO or BAD
              const msg = line.replace(/^a001 (NO|BAD)\s*/i, '').trim()
              socket.destroy()
              reject(new Error(msg || 'Authentication failed'))
              return
            }
          }
        }
      })
    }

    if (ssl) {
      const socket = tls.connect({ host, port, rejectUnauthorized: false }, () => onSocket(socket))
      socket.on('error', reject)
    } else {
      const socket = net.createConnection({ host, port }, () => onSocket(socket))
      socket.on('error', reject)
    }
  })
}

// ── POP3 (raw TCP) ────────────────────────────────────────────────────────────
// Implements POP3 (RFC 1939): greeting → USER → PASS, then resolves immediately.
// Splits on \n and strips trailing \r so both \r\n and bare-\n servers work
// (Gmail sends bare-\n endings which broke the old \r\n split).

async function testPop3(host: string, port: number, ssl: boolean, user: string, pass: string) {
  const net = await import('net')
  const tls = await import('tls')

  return new Promise<void>((resolve, reject) => {
    const TIMEOUT = 5_000
    let buffer = ''
    let step: 'greeting' | 'user' | 'pass' = 'greeting'
    let settled = false

    const fail = (msg: string) => {
      if (settled) return
      settled = true
      reject(new Error(msg))
    }
    const succeed = () => {
      if (settled) return
      settled = true
      resolve()
    }

    const onLine = (line: string, socket: Socket | TLSSocket) => {
      console.log(`[POP3] step=${step} raw_line=${JSON.stringify(line)}`)

      if (line.startsWith('-ERR')) {
        const detail = line.slice(4).trim()
        socket.destroy()
        if (step === 'greeting') {
          console.log(`[POP3] FAIL at greeting: ${detail}`)
          fail(`Server refused connection: ${detail}`)
        } else if (step === 'user') {
          console.log(`[POP3] FAIL at USER: ${detail}`)
          fail(`Username rejected: ${detail}`)
        } else {
          console.log(`[POP3] FAIL at PASS: ${detail}`)
          fail(`Authentication failed: ${detail || 'wrong password or App Password required'}`)
        }
        return
      }

      // Accept any response that begins with "+OK", regardless of trailing text
      if (!line.startsWith('+OK')) {
        console.log(`[POP3] Ignoring unrecognised line: ${JSON.stringify(line)}`)
        return
      }

      if (step === 'greeting') {
        console.log(`[POP3] Greeting OK — sending USER command`)
        step = 'user'
        socket.write(`USER ${user}\r\n`)
      } else if (step === 'user') {
        console.log(`[POP3] USER OK — sending PASS command`)
        step = 'pass'
        socket.write(`PASS ${pass}\r\n`)
      } else {
        console.log(`[POP3] PASS OK — authenticated, resolving`)
        // Resolve before destroy so the 'close' event cannot race ahead and call fail()
        succeed()
        socket.destroy()
      }
    }

    const attach = (socket: Socket | TLSSocket) => {
      console.log(`[POP3] Socket connected to ${host}:${port} (ssl=${ssl})`)
      socket.setTimeout(TIMEOUT)
      socket.on('timeout', () => {
        console.log(`[POP3] Timed out at step=${step}`)
        socket.destroy()
        fail('Connection timed out after 5 s')
      })
      socket.on('error', (e: Error) => {
        console.log(`[POP3] Socket error at step=${step}: ${e.message}`)
        fail(e.message)
      })
      socket.on('close', () => {
        console.log(`[POP3] Socket closed, settled=${settled}, step=${step}`)
        if (!settled) fail('Connection closed unexpectedly')
      })
      socket.on('data', (chunk: Buffer) => {
        const raw_chunk = chunk.toString()
        console.log(`[POP3] Data chunk received (${raw_chunk.length} bytes): ${JSON.stringify(raw_chunk)}`)
        buffer += raw_chunk
        // Split on \n; strip trailing \r so \r\n and bare-\n both work
        let nl: number
        while ((nl = buffer.indexOf('\n')) !== -1) {
          const raw  = buffer.slice(0, nl)
          buffer     = buffer.slice(nl + 1)
          const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw
          if (line) onLine(line, socket)
          if (settled) break
        }
      })
    }

    if (ssl) {
      console.log(`[POP3] Opening TLS connection to ${host}:${port}`)
      const s = tls.connect({ host, port, rejectUnauthorized: false }, () => attach(s))
      s.on('error', (e: Error) => {
        console.log(`[POP3] TLS connect error: ${e.message}`)
        fail(e.message)
      })
    } else {
      console.log(`[POP3] Opening plain TCP connection to ${host}:${port}`)
      const s = net.createConnection({ host, port }, () => attach(s))
      s.on('error', (e: Error) => {
        console.log(`[POP3] TCP connect error: ${e.message}`)
        fail(e.message)
      })
    }
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, host, port, user: mailUser, pass, ssl } = body as {
    type: 'smtp' | 'imap' | 'pop3'
    host: string
    port: number
    user: string
    pass: string
    ssl: boolean
  }

  if (!host || !mailUser || !pass) {
    return NextResponse.json({ error: 'Host, username and password are required' }, { status: 400 })
  }

  try {
    if (type === 'smtp')  await testSmtp(host, Number(port), !!ssl, mailUser, pass)
    else if (type === 'imap')  await testImap(host, Number(port), !!ssl, mailUser, pass)
    else if (type === 'pop3')  await testPop3(host, Number(port), !!ssl, mailUser, pass)
    else return NextResponse.json({ error: 'Unknown type' }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
