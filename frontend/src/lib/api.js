import axios from "axios";

const API_BASE_PATH = "/_/backend";

axios.defaults.withCredentials = true;

export function buildApiUrl(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_PATH}${normalizedPath}`;
}
