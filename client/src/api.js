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
  submitLegacyClaim: (payload) =>
    apiCall("/auth/legacy-claim", "POST", payload),
  login: (email, password) =>
    apiCall("/auth/login", "POST", { email, password }),
  me: () => apiCall("/auth/me"),
  getPushPublicKey: () => apiCall("/auth/push/public-key"),
  subscribePush: (subscription) =>
    apiCall("/auth/push/subscribe", "POST", { subscription }),
  unsubscribePush: (endpoint) =>
    apiCall("/auth/push/unsubscribe", "POST", { endpoint }),
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
  getAnnouncements: () => apiCall("/applicants/public/announcements"),
};

export const adminAPI = {
  getApplicants: () => apiCall("/admin/applicants"),
  updateStatus: (id, status, extra = {}) =>
    apiCall(`/admin/applicants/${id}/status`, "PATCH", { status, ...extra }),
  updateServiceStatus: (id, serviceStatus) =>
    apiCall(`/admin/applicants/${id}/service-status`, "PATCH", {
      serviceStatus,
    }),
  updateAssessment: (id, assessment) =>
    apiCall(`/admin/applicants/${id}/assessment`, "PATCH", assessment),
  getSettings: () => apiCall(`/admin/settings`),
  updateSettings: (payload) => apiCall(`/admin/settings`, "PATCH", payload),
  getAuditLogs: (limit = 50) => apiCall(`/admin/audit-logs?limit=${limit}`),
  exportApplicants: () => apiCall(`/admin/export`, "POST", {}, { raw: true }),
  scanQr: (qrPayload) =>
    apiCall("/admin/scan-qr", "POST", { qrPayload }),
  getStats: () => apiCall("/admin/stats"),
  getAnnouncements: () => apiCall("/admin/announcements"),
  // Admin user management
  getAdmins: () => apiCall(`/admin/admins`),
  updateAdmin: (id, payload) => apiCall(`/admin/admins/${id}`, "PATCH", payload),
  deleteAdmin: (id) => apiCall(`/admin/admins/${id}`, "DELETE"),
  createAdmin: (email, name, password) => apiCall(`/admin/admins`, "POST", { email, name, password }),
  createAnnouncement: (title, body) =>
    apiCall("/admin/announcements", "POST", { title, body }),
  updateAnnouncement: (id, title, body) =>
    apiCall(`/admin/announcements/${id}`, "PATCH", { title, body }),
  deleteAnnouncement: (id) =>
    apiCall(`/admin/announcements/${id}`, "DELETE"),
  deleteApplicant: (id) =>
    apiCall(`/admin/applicants/${id}`, "DELETE"),
  getRegistrations: () => apiCall("/admin/registrations"),
  approveRegistration: (id) => apiCall(`/admin/registrations/${id}/approve`, "POST"),
  rejectRegistration: (id) => apiCall(`/admin/registrations/${id}/reject`, "POST"),
  getLegacyClaims: (status = "") => apiCall(`/admin/legacy-claims${status ? `?status=${encodeURIComponent(status)}` : ""}`),
  getLegacyClaim: (id) => apiCall(`/admin/legacy-claims/${id}`),
  approveLegacyClaim: (id, note = "") => apiCall(`/admin/legacy-claims/${id}/approve`, "POST", { note }),
  rejectLegacyClaim: (id, note = "") => apiCall(`/admin/legacy-claims/${id}/reject`, "POST", { note }),
  updateLegacyClaimServiceNumber: (id, legacyServiceNumber = "") =>
    apiCall(`/admin/legacy-claims/${id}/service-number`, "POST", { legacyServiceNumber }),
  updateLegacyClaim: (id, payload) => apiCall(`/admin/legacy-claims/${id}`, "PATCH", payload),
};

export const tokenManager = {
  getToken: getAuthToken,
  setToken: setAuthToken,
  clearToken: clearAuthToken,
  isLoggedIn: () => !!getAuthToken(),
};
