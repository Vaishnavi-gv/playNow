const BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

async function readResponseBody(res) {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return await res.json().catch(() => ({}));
  }
  return await res.text().catch(() => "");
}

export async function apiRequest(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include", // send cookies
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await readResponseBody(res);
  if (!res.ok) {
    throw new Error(
      (typeof data === "object" && data?.message) ||
        (typeof data === "string" && data) ||
        "Request failed"
    );
  }
  return data;
}

export async function apiFormRequest(path, formData, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    body: formData,
    ...options,
  });

  const data = await readResponseBody(res);
  if (!res.ok) {
    throw new Error(
      (typeof data === "object" && data?.message) ||
        (typeof data === "string" && data) ||
        "Request failed"
    );
  }
  return data;
}