const $ = (selector) => document.querySelector(selector);

function send(message) {
  return chrome.runtime.sendMessage(message).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "Extension action failed");
    return response.result;
  });
}

async function refresh() {
  const state = await send({ type: "GET_STATE" });
  $("#consent").checked = Boolean(state.consent.codeforces);
  $("#pause").textContent = state.paused ? "Resume" : "Pause";
  $("#sync").disabled = state.syncing;
  if (state.progress?.total) {
    $("#progress").max = state.progress.total;
    $("#progress").value = state.progress.current;
    $("#sync-status").textContent = `${state.progress.current}/${state.progress.total} submissions processed`;
  }
  $("#pair-status").textContent = state.uploadToken ? "Paired to local AlgoRise" : "Create a code from AlgoRise settings.";
}

$("#pair").addEventListener("click", async () => {
  try {
    await send({ type: "PAIR", code: $("#pairing").value.trim() });
    $("#pair-status").textContent = "Paired successfully";
  } catch (error) {
    $("#pair-status").textContent = error.message;
  }
});

$("#connect").addEventListener("click", () => chrome.tabs.create({ url: "https://codeforces.com/enter" }));

$("#consent").addEventListener("change", async (event) => {
  await send({ type: "SET_CONSENT", platform: "codeforces", value: event.target.checked });
});

$("#sync").addEventListener("click", async () => {
  try {
    $("#sync-status").textContent = "Verifying account and collecting…";
    const result = await send({ type: "START_CODEFORCES_SYNC", handle: $("#handle").value.trim() });
    $("#sync-status").textContent = `Uploaded ${result.accepted}; skipped ${result.duplicates} duplicates.`;
  } catch (error) {
    $("#sync-status").textContent = error.message;
  } finally {
    await refresh();
  }
});

$("#pause").addEventListener("click", async () => {
  const state = await send({ type: "GET_STATE" });
  await send({ type: state.paused ? "RESUME" : "PAUSE" });
  await refresh();
});

$("#cancel").addEventListener("click", async () => {
  await send({ type: "CANCEL" });
  $("#sync-status").textContent = "Sync cancellation requested.";
  await refresh();
});

refresh().catch((error) => { $("#sync-status").textContent = error.message; });
