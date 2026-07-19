export async function exchangePairingCode(baseUrl, code) {
  const response = await fetch(`${baseUrl}/api/import/extension/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "exchange", code }),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Pairing failed");
  return payload.uploadToken;
}

export async function uploadBatch(baseUrl, uploadToken, payload) {
  const response = await fetch(`${baseUrl}/api/import/extension`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${uploadToken}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Upload failed");
  return result;
}
