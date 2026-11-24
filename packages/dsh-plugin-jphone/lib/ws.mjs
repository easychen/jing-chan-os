import { createHash } from 'node:crypto'

const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

export function encodeWsFrame(opcode, payloadBuf) {
  const payload = Buffer.isBuffer(payloadBuf) ? payloadBuf : Buffer.from(payloadBuf)
  const len = payload.length
  let header
  if (len < 126) {
    header = Buffer.alloc(2)
    header[0] = 0x80 | (opcode & 0x0f)
    header[1] = len
  } else if (len < 65536) {
    header = Buffer.alloc(4)
    header[0] = 0x80 | (opcode & 0x0f)
    header[1] = 126
    header.writeUInt16BE(len, 2)
  } else {
    header = Buffer.alloc(10)
    header[0] = 0x80 | (opcode & 0x0f)
    header[1] = 127
    header.writeBigUInt64BE(BigInt(len), 2)
  }
  return Buffer.concat([header, payload])
}

export function encodeWsTextFrame(text) {
  return encodeWsFrame(0x1, Buffer.from(String(text), 'utf8'))
}

export function decodeWsFrames(buffer) {
  const frames = []
  let offset = 0
  while (offset + 2 <= buffer.length) {
    const b0 = buffer[offset]
    const b1 = buffer[offset + 1]
    const opcode = b0 & 0x0f
    const masked = (b1 & 0x80) !== 0
    let payloadLen = b1 & 0x7f
    let headerLen = 2
    if (payloadLen === 126) {
      if (offset + 4 > buffer.length) break
      payloadLen = buffer.readUInt16BE(offset + 2)
      headerLen = 4
    } else if (payloadLen === 127) {
      if (offset + 10 > buffer.length) break
      payloadLen = Number(buffer.readBigUInt64BE(offset + 2))
      headerLen = 10
    }
    const maskLen = masked ? 4 : 0
    const totalLen = headerLen + maskLen + payloadLen
    if (offset + totalLen > buffer.length) break

    const payloadStart = offset + headerLen + maskLen
    const payload = Buffer.alloc(payloadLen)
    if (masked) {
      const mask = buffer.subarray(offset + headerLen, payloadStart)
      for (let i = 0; i < payloadLen; i++) {
        payload[i] = buffer[payloadStart + i] ^ mask[i & 3]
      }
    } else {
      buffer.copy(payload, 0, payloadStart, payloadStart + payloadLen)
    }
    frames.push({ opcode, payload })
    offset += totalLen
  }
  return { frames, remaining: buffer.subarray(offset) }
}

export class JPhoneWsHub {
  constructor() {
    this.clients = new Set()
  }

  handleUpgrade(req, socket, head, onMessage) {
    const key = req.headers['sec-websocket-key']
    if (!key) {
      socket.write('HTTP/1.1 400 Bad Request\r\n\r\n')
      socket.destroy()
      return
    }
    const accept = createHash('sha1').update(key + WS_GUID).digest('base64')
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n'
      + 'Upgrade: websocket\r\n'
      + 'Connection: Upgrade\r\n'
      + `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    )

    const client = {
      socket,
      send(obj) {
        if (socket.destroyed) return
        try {
          socket.write(encodeWsTextFrame(JSON.stringify(obj)))
        } catch {
          // ignore broken pipe on closing client
        }
      },
      close() {
        if (!socket.destroyed) {
          try { socket.write(encodeWsFrame(0x8, Buffer.alloc(0))) } catch {}
          socket.destroy()
        }
      },
    }

    this.clients.add(client)
    let buf = head && head.length > 0 ? Buffer.from(head) : Buffer.alloc(0)

    const processBuf = () => {
      const { frames, remaining } = decodeWsFrames(buf)
      buf = Buffer.from(remaining)
      for (const frame of frames) {
        if (frame.opcode === 0x8) {
          this.clients.delete(client)
          client.close()
          return
        }
        if (frame.opcode === 0x9) {
          if (!socket.destroyed) socket.write(encodeWsFrame(0xa, frame.payload))
          continue
        }
        if (frame.opcode === 0x1 && onMessage) {
          try {
            onMessage(JSON.parse(frame.payload.toString('utf8')), client)
          } catch {
            // ignore malformed JSON
          }
        }
      }
    }

    if (buf.length > 0) processBuf()
    socket.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      processBuf()
    })
    const cleanup = () => { this.clients.delete(client) }
    socket.on('close', cleanup)
    socket.on('error', cleanup)
    return client
  }

  broadcast(event) {
    for (const client of this.clients) {
      client.send(event)
    }
  }

  closeAll() {
    for (const client of [...this.clients]) {
      client.close()
    }
    this.clients.clear()
  }
}
