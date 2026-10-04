// Connection to the live proxy on the home machine (see server/proxy.py).
//
// The endpoint comes from the URL fragment: #live=wss://host/ws&token=...
// Without it the site runs entirely on its recorded images.

export type LiveStatus = 'off' | 'connecting' | 'ready'

export interface RunHandlers {
  /** The run was accepted; `total` frames will follow. */
  onStart(total: number): void
  onFrame(index: number, image: ImageBitmap): void
  onDone(): void
  onError(message: string): void
}

const params = new URLSearchParams(location.hash.slice(1))
const endpoint = params.get('live')
const token = params.get('token') ?? ''

let socket: WebSocket | null = null
let status: LiveStatus = endpoint ? 'connecting' : 'off'
let handlers: RunHandlers | null = null
/** Index announced for the next binary message. */
let nextIndex = 0
const listeners = new Set<(status: LiveStatus) => void>()

function setStatus(next: LiveStatus) {
  if (next === status) return
  status = next
  listeners.forEach((listener) => listener(status))
}

function connect() {
  if (!endpoint) return
  socket = new WebSocket(`${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`)
  socket.binaryType = 'arraybuffer'
  socket.onopen = () => setStatus('ready')
  socket.onclose = () => {
    setStatus('connecting')
    handlers?.onError('connection lost')
    handlers = null
    window.setTimeout(connect, 3000)
  }
  socket.onmessage = async (event) => {
    if (typeof event.data !== 'string') {
      const index = nextIndex
      const run = handlers
      const image = await createImageBitmap(new Blob([event.data], { type: 'image/jpeg' }))
      if (run === handlers) run?.onFrame(index, image)
      return
    }
    const message = JSON.parse(event.data)
    if (message.type === 'start') handlers?.onStart(message.total)
    else if (message.type === 'frame') nextIndex = message.index
    else if (message.type === 'done') handlers?.onDone()
    else if (message.type === 'error') handlers?.onError(message.message)
  }
}

connect()

export const live = {
  status: () => status,
  onStatus(listener: (status: LiveStatus) => void) {
    listeners.add(listener)
  },
  /** Ask the home machine to generate; frames arrive through `run`. */
  generate(prompt: string, run: RunHandlers) {
    handlers = run
    socket?.send(JSON.stringify({ type: 'generate', prompt }))
  },
  /** Stop listening to the current run. */
  cancel() {
    handlers = null
  },
}
