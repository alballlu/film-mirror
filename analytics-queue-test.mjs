const values = new Map();
const listeners = new Map();

globalThis.sessionStorage = {
  getItem(key) { return values.get(key) ?? null; },
  setItem(key, value) { values.set(key, String(value)); },
};

globalThis.document = {
  visibilityState: 'visible',
  addEventListener(name, handler) { listeners.set(`document:${name}`, handler); },
};

globalThis.window = {
  location: { pathname: '/flow-a/recommendations', search: '?utm_source=queue_test' },
  setTimeout,
  addEventListener(name, handler) { listeners.set(`window:${name}`, handler); },
};

const { trackEventOnce } = await import('./src/utils/analytics.js');

trackEventOnce('recommendation_view', { flow: 'a' }, 'recommendation_view:a');
trackEventOnce('flow_complete', { flow: 'a' }, 'flow_complete:a');
trackEventOnce('flow_complete', { flow: 'a' }, 'flow_complete:a');

await new Promise(resolve => setTimeout(resolve, 350));
const received = [];
window.umami = { track(name, properties) { received.push({ name, properties }); } };
await new Promise(resolve => setTimeout(resolve, 1000));

const names = received.map(event => event.name);
if (names.join(',') !== 'recommendation_view,flow_complete') {
  throw new Error(`Queued events were missing or duplicated: ${names.join(',')}`);
}
if (!received.every(event => event.properties.app_version === 'p4.1')) {
  throw new Error('Queued events did not use the P4.1 analytics version');
}
if (!values.has('filmmirror_event_once:recommendation_view:a') || !values.has('filmmirror_event_once:flow_complete:a')) {
  throw new Error('Once markers were not written after successful delivery');
}

trackEventOnce('flow_complete', { flow: 'a' }, 'flow_complete:a');
await new Promise(resolve => setTimeout(resolve, 50));
if (received.length !== 2) throw new Error('A delivered once-event was sent again');

console.log(JSON.stringify({ names, version: received[0].properties.app_version, duplicateCount: received.length - 2 }, null, 2));
