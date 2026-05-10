const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");

const getAuthToken = () => localStorage.getItem("ces_auth_token");
const setAuthToken = (token) => localStorage.setItem("ces_auth_token", token);
const clearAuthToken = () => localStorage.removeItem("ces_auth_token");

const apiCall = async (endpoint, method = "GET", body = null) => {
  const token = getAuthToken();
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) {
    let errorMessage = "API request failed";
    const rawBody = await response.text();

    try {
      const error = JSON.parse(rawBody);
      errorMessage = error.error || error.message || errorMessage;
    } catch {
      if (rawBody.startsWith("<!DOCTYPE")) {
        errorMessage = "Backend API is not reachable. Check VITE_API_BASE in Vercel settings.";
      }
    }

    throw new Error(errorMessage);
  }
  return await response.json();
};

export const authAPI = {
  register: (email, password, name) =>
    apiCall("/auth/register", "POST", { email, password, name }),
  login: (email, password) =>
    apiCall("/auth/login", "POST", { email, password }),
};

export const applicantAPI = {
  getProfile: () => apiCall("/applicants/profile"),
  submitApplication: (data) =>
    apiCall("/applicants/submit", "POST", data),
};

export const adminAPI = {
  getApplicants: () => apiCall("/admin/applicants"),
  updateStatus: (id, status) =>
    apiCall(`/admin/applicants/${id}/status`, "PATCH", { status }),
  updateServiceStatus: (id, serviceStatus) =>
    apiCall(`/admin/applicants/${id}/service-status`, "PATCH", {
      serviceStatus,
    }),
  scanQr: (qrPayload) =>
    apiCall("/admin/scan-qr", "POST", { qrPayload }),
  getStats: () => apiCall("/admin/stats"),
};

export const tokenManager = {
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,
  isLoggedIn: () => !!getAuthToken(),
};
