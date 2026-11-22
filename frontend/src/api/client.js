import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

// The API's error message, or a fallback when the request never got one
// (network down, server asleep).
export function errorMessage(err, fallback = "Something went wrong") {
  return err?.response?.data?.error || fallback;
}

// Fetch a file through the API (so the auth cookie is sent) and hand it to
// the browser as a download, using the filename the server suggests.
export async function downloadFile(url) {
  const res = await api.get(url, { responseType: "blob" });
  const disposition = res.headers["content-disposition"] || "";
  const name = /filename="?([^"]+)"?/.exec(disposition)?.[1] || "download";
  const href = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
  URL.revokeObjectURL(href);
}

export default api;
