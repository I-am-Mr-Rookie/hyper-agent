import { collectOwnCodeforcesSubmissions } from "./collectors/codeforces.js";
import { exchangePairingCode, uploadBatch } from "./lib/uploader.js";

let controlSignal = null;

function waitForControlChange() {
  if (!controlSignal) {
    let resolve;
    const promise = new Promise((next) => { resolve = next; });
    controlSignal = { promise, resolve };
  }
  return controlSignal.promise;
}

function signalControlChange() {
  controlSignal?.resolve();
  controlSignal = null;
}

const DEFAULT_STATE = {
  baseUrl: "http://localhost:3000",
  uploadToken: "",
  paused: false,
  cancelled: false,
  syncing: false,
  progress: null,
  consent: { codeforces: false, leetcode: false, atcoder: false, codechef: false },
  cursor: { codeforces: "" },
  featureFlags: { codeforces: true, leetcode: false, atcoder: false, codechef: false },
};

async function state() {
  const stored = await chrome.storage.local.get(DEFAULT_STATE);
  return { ...DEFAULT_STATE, ...stored };
}

async function patch(values) {
  await chrome.storage.local.set(values);
  return state();
}

async function pair(code) {
  const current = await state();
  const uploadToken = await exchangePairingCode(current.baseUrl, code);
  await patch({ uploadToken });
  return { paired: true };
}

async function syncCodeforces(confirmedHandle) {
  const current = await state();
  if (!current.featureFlags.codeforces) throw new Error("Codeforces collector is disabled");
  if (!current.consent.codeforces) throw new Error("Explicit Codeforces consent is required before sync");
  if (!current.uploadToken) throw new Error("Pair this extension with AlgoRise first");

  await patch({ syncing: true, cancelled: false, progress: { current: 0, total: 0 } });
  try {
    const payload = await collectOwnCodeforcesSubmissions({
      confirmedHandle,
      cursor: current.cursor.codeforces || "",
      onProgress: async (progress) => {
        let latest = await state();
        if (latest.cancelled) throw new Error("Sync cancelled by user");
        while (latest.paused) {
          await waitForControlChange();
          latest = await state();
          if (latest.cancelled) throw new Error("Sync cancelled by user");
        }
        await patch({ progress });
      },
    });

    const result = payload.batch.length
      ? await uploadBatch(current.baseUrl, current.uploadToken, payload)
      : { accepted: 0, duplicates: 0 };
    await patch({ cursor: { ...current.cursor, codeforces: payload.cursor }, progress: { current: payload.batch.length, total: payload.batch.length } });
    return result;
  } finally {
    await patch({ syncing: false });
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_STATE": return state();
      case "PAIR": return pair(message.code);
      case "SET_CONSENT": {
        const current = await state();
        return patch({ consent: { ...current.consent, [message.platform]: Boolean(message.value) } });
      }
      case "START_CODEFORCES_SYNC": return syncCodeforces(message.handle);
      case "PAUSE": return patch({ paused: true });
      case "RESUME": {
        const next = await patch({ paused: false });
        signalControlChange();
        return next;
      }
      case "CANCEL": {
        const next = await patch({ cancelled: true, paused: false });
        signalControlChange();
        return next;
      }
      default: throw new Error("Unknown extension message");
    }
  })().then((result) => sendResponse({ ok: true, result })).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});
