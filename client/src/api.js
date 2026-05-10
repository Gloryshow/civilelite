const API_BASE = "http://localhost:5000/api";

const getAuthToken = () => localStorage.getItem("ces_auth_token");
const setAuthToken = (token) => localStorage.setItem("ces_auth_token", token);
const clearAuthToken = () => localStorage.removeItem("ces_auth_token");

const apiCall = async (endpoint, method = "GET", body = null) => {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "API request failed");
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
