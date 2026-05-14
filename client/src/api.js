const configuredBase = (import.meta.env.VITE_API_BASE || "http://localhost:5000/api").replace(/\/+$/, "");
const API_BASE = /\/api$/i.test(configuredBase)
  ? configuredBase
  : `${configuredBase}/api`;

const getAuthToken = () => localStorage.getItem("ces_auth_token");
const setAuthToken = (token) => localStorage.setItem("ces_auth_token", token);
const clearAuthToken = () => localStorage.removeItem("ces_auth_token");

const apiCall = async (endpoint, method = "GET", body = null, opts = {}) => {
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
  if (opts.raw) return response;
  return await response.json();
};

export const authAPI = {
  register: (email, password, name, role = "applicant") =>
    apiCall("/auth/register", "POST", { email, password, name, role }),
  login: (email, password) =>
    apiCall("/auth/login", "POST", { email, password }),
  me: () => apiCall("/auth/me"),
  forgotPassword: (email, applicantId, phone, newPassword) =>
    apiCall("/auth/forgot", "POST", { email, applicantId, phone, newPassword }),
};

export const applicantAPI = {
  getProfile: () => apiCall("/applicants/profile"),
  getAnnouncements: () => apiCall("/applicants/announcements"),
  submitApplication: (data) =>
    apiCall("/applicants/submit", "POST", data),
};

export const publicAPI = {
  getVerification: (applicantId) =>
    apiCall(`/applicants/verify/${encodeURIComponent(applicantId)}`),
  getSettings: () => apiCall("/applicants/settings"),
};

export const adminAPI = {
  getApplicants: () => apiCall("/admin/applicants"),
  updateStatus: (id, status) =>
    apiCall(`/admin/applicants/${id}/status`, "PATCH", { status }),
  updateServiceStatus: (id, serviceStatus) =>
    apiCall(`/admin/applicants/${id}/service-status`, "PATCH", {
      serviceStatus,
    }),
  updateAssessment: (id, assessment) =>
    apiCall(`/admin/applicants/${id}/assessment`, "PATCH", assessment),
  getSettings: () => apiCall(`/admin/settings`),
  updateSettings: (payload) => apiCall(`/admin/settings`, "PATCH", payload),
  getAuditLogs: (limit = 50) => apiCall(`/admin/audit-logs?limit=${limit}`),
  getQRCode: (applicantId) =>
    apiCall(`/applicants/admin/qr-code/${encodeURIComponent(applicantId)}`),
  downloadAllQRCodes: async () => {
    const token = getAuthToken();
    try {
      const response = await fetch(`${API_BASE}/applicants/admin/qr-codes/download`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text.includes("<") ? "Backend API failed" : text);
      }
      return response;
    } catch (err) {
      throw new Error(err.message || "Failed to download QR codes");
    }
  },
  exportApplicants: () => apiCall(`/admin/export`, "POST", {}, { raw: true }),
  scanQr: (qrPayload) =>
    apiCall("/admin/scan-qr", "POST", { qrPayload }),
  getStats: () => apiCall("/admin/stats"),
  getAnnouncements: () => apiCall("/admin/announcements"),
  createAnnouncement: (title, body) =>
    apiCall("/admin/announcements", "POST", { title, body }),
  updateAnnouncement: (id, title, body) =>
    apiCall(`/admin/announcements/${id}`, "PATCH", { title, body }),
  deleteAnnouncement: (id) =>
    apiCall(`/admin/announcements/${id}`, "DELETE"),
  getRegistrations: () => apiCall("/admin/registrations"),
  approveRegistration: (id) => apiCall(`/admin/registrations/${id}/approve`, "POST"),
  rejectRegistration: (id) => apiCall(`/admin/registrations/${id}/reject`, "POST"),
};

export const tokenManager = {
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,
  isLoggedIn: () => !!getAuthToken(),
};
