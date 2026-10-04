import axios from "axios";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("erp_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const currentToken = localStorage.getItem("erp_token");
    if (
      error.response?.status === 401 &&
      currentToken &&
      error.config?.headers?.Authorization === `Bearer ${currentToken}` &&
      error.config?.url !== "/auth/login"
    ) {
      window.dispatchEvent(new Event("erp:unauthorized"));
    }
    return Promise.reject(error);
  },
);
