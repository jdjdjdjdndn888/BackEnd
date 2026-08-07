export function createNativeSocket({ url, tokenProvider, reconnectDelay = 500, reconnectDelayMax = 10000 }) {
  const listeners = new Map();
  const pending = new Map();
  const emitted = new Map();
  let ws = null;
  let reconnectTimer = null;
  let attempts = 0;
  let manuallyClosed = false;

  const add = (event, handler) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(handler);
  };
  const remove = (event, handler) => {
    if (!listeners.has(event)) return;
    if (handler) listeners.get(event).delete(handler);
    else listeners.delete(event);
  };
  const dispatch = (event, payload) => {
    const set = listeners.get(event);
    if (set) set.forEach((fn) => fn(payload));
  };
  const send = (payload) => {
    const data = JSON.stringify(payload);
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(data);
  };

  const connect = () => {
    manuallyClosed = false;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
    const target = typeof url === "function" ? url() : url;
    ws = new WebSocket(target);
    ws.onopen = () => {
      attempts = 0;
      send({ type: "auth", token: tokenProvider?.() || "" });
      emitted.forEach((payload, event) => send({ type: "event", event, payload }));
    };
    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
         if (msg?.event) dispatch(msg.event, msg.payload ?? msg.data);
        if (msg?.type === "connected") dispatch("connect");
      } catch {}
    };
    ws.onclose = () => {
      if (manuallyClosed) return;
      const delay = Math.min(reconnectDelayMax, reconnectDelay * 2 ** attempts++);
      reconnectTimer = setTimeout(connect, delay);
    };
    ws.onerror = () => {};
  };

  const socket = {
    get connected() {
      return ws?.readyState === WebSocket.OPEN;
    },
    auth: {},
    connect,
    disconnect() {
      manuallyClosed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
    emit(event, payload) {
      emitted.set(event, payload);
      send({ type: "event", event, payload });
    },
    on(event, handler) {
      add(event, handler);
      return socket;
    },
    off(event, handler) {
      remove(event, handler);
      return socket;
    },
  };

  connect();
  return socket;
}