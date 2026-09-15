import { timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_BYTES = 100000000
const MIN_BYTES = 1000000
const MAX_BYTES = 1000000000

function isAuthorized(request) {
  const expected = String(process.env.NEXAWI_SPEEDTEST_TOKEN || '').trim()
  const received = String(new URL(request.url).searchParams.get('token') || '').trim()
  const left = Buffer.from(received, 'utf8')
  const right = Buffer.from(expected, 'utf8')

  if (!left.length || left.length !== right.length) return false

  return timingSafeEqual(left, right)
}

function clampBytes(value) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return DEFAULT_BYTES
  return Math.max(MIN_BYTES, Math.min(bytes, MAX_BYTES))
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ ok: false, error: 'Nao autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const totalBytes = clampBytes(searchParams.get('bytes'))
  const chunkSize = 64 * 1024
  const chunk = new Uint8Array(chunkSize)
  let sent = 0

  for (let index = 0; index < chunk.length; index += 1) {
    chunk[index] = index % 251
  }

  const stream = new ReadableStream({
    pull(controller) {
      if (sent >= totalBytes) {
        controller.close()
        return
      }

      const remaining = totalBytes - sent
      const size = Math.min(chunkSize, remaining)
      controller.enqueue(size === chunkSize ? chunk : chunk.slice(0, size))
      sent += size
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(totalBytes),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-NexaWi-Speedtest-Bytes': String(totalBytes),
    },
  })
}
