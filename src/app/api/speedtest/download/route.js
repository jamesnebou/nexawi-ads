export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clampBytes(value) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return 50000000
  return Math.max(1000000, Math.min(bytes, 250000000))
}

export async function GET(request) {
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
