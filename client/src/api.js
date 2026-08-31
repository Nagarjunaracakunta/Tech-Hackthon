const BASE = "/api";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  listCases: () => fetch(`${BASE}/cases`).then(handle),

  getCase: (id) => fetch(`${BASE}/cases/${id}`).then(handle),

  createCase: (payload) =>
    fetch(`${BASE}/cases`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(handle),

  uploadDocument: (caseId, docType, file) => {
    const form = new FormData();
    form.append("doc_type", docType);
    form.append("file", file);
    return fetch(`${BASE}/cases/${caseId}/documents`, {
      method: "POST",
      body: form,
    }).then(handle);
  },

  scoreCase: (caseId) =>
    fetch(`${BASE}/cases/${caseId}/score`, { method: "POST" }).then(handle),
};
