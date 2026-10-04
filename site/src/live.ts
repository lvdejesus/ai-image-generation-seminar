// Connection to the live proxy on the home machine (see server/proxy.py).
//
// The endpoint and token come from the address the launcher prints. It can
// be given in the URL fragment (#live=wss://host/ws&token=...) or pasted
// into the setup field on the first slide, which remembers it in this
// browser. Without one the site runs entirely on its recorded images.

export type LiveStatus = 'off' | 'connecting' | 'ready'

export interface RunHandlers {
  /** The run was accepted; `total` frames will follow. */
  onStart(total: number): void
  onFrame(index: number, image: ImageBitmap): void
  onDone(): void
  onError(message: string): void
}

interface Target {
  endpoint: string
  token: string
}

const STORE = 'seminar.live'

let target: Target | null = null
let socket: WebSocket | null = null
let status: LiveStatus = 'off'
let handlers: RunHandlers | null = null
/** Index announced for the next binary message. */
let nextIndex = 0
/** Bumped on every (re)configuration, so an old socket's events are ignored. */
let generation = 0
const listeners = new Set<(status: LiveStatus) => void>()

function setStatus(next: LiveStatus) {
  if (next === status) return
  status = next
  listeners.forEach((listener) => listener(status))
}

/**
 * Read an endpoint and token out of what the launcher prints: its full
 * address, just the fragment, or a bare ws(s):// address with ?token=.
 */
function parse(text: string): Target | null {
  text = text.trim()
  const params = new URLSearchParams(text.includes('#') ? text.slice(text.indexOf('#') + 1) : text)
  const endpoint = params.get('live')
  if (endpoint) return { endpoint, token: params.get('token') ?? '' }
  try {
    const url = new URL(text)
    if (url.protocol !== 'ws:' && url.protocol !== 'wss:') return null
    return { endpoint: url.origin + url.pathname, token: url.searchParams.get('token') ?? '' }
  } catch {
    return null
  }
}

function connect() {
  const mine = ++generation
  socket?.close()
  socket = null
  handlers = null
  if (!target) return setStatus('off')

  setStatus('connecting')
  const { endpoint, token } = target
  const ws = new WebSocket(`${endpoint}${endpoint.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`)
  ws.binaryType = 'arraybuffer'
  socket = ws
  ws.onopen = () => mine === generation && setStatus('ready')
  ws.onclose = () => {
    if (mine !== generation) return
    setStatus('connecting')
    handlers?.onError('connection lost')
    handlers = null
    window.setTimeout(() => mine === generation && connect(), 3000)
  }
  ws.onmessage = async (event) => {
    if (mine !== generation) return
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

function remember(next: Target | null) {
  target = next
  try {
    if (next) localStorage.setItem(STORE, JSON.stringify(next))
    else localStorage.removeItem(STORE)
  } catch {
    // Storage can be unavailable (private windows); the setup then lasts until reload.
  }
  connect()
}

// An address in the URL wins; otherwise use what was pasted here before.
const fromUrl = parse(location.hash)
if (fromUrl) {
  remember(fromUrl)
} else {
  try {
    target = JSON.parse(localStorage.getItem(STORE) ?? 'null')
  } catch {
    target = null
  }
  connect()
}

export const live = {
  status: () => status,
  onStatus(listener: (status: LiveStatus) => void) {
    listeners.add(listener)
  },
  /** The host being used, or null when the live demo is not set up. */
  host: () => (target ? new URL(target.endpoint).host : null),
  /** Set up the live demo from pasted text. Returns false if no address could be read from it. */
  configure(text: string) {
    const next = parse(text)
    if (next) remember(next)
    return next !== null
  },
  /** Forget the live demo; the site goes back to its recording. */
  clear() {
    remember(null)
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
