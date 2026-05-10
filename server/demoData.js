// In-memory demo database for fallback when MongoDB is unavailable
export const demoDatabase = {
  users: [
    {
      id: "admin-001",
      email: "admin@ces.gov.ng",
      password: "$2a$10$koUlLqJ2yzu0IdZK0ot/j.A9Sa/VZRomcm6DDWAuGZq52nJzKe1dC", // bcrypt hash of "password123"
      name: "Admin Officer",
      role: "admin",
      applicantId: null,
      serviceStatus: "active",
      registrationStatus: "approved",
      createdAt: new Date(),
    },
    {
      id: "user-001",
      email: "applicant@example.com",
      password: "$2a$10$koUlLqJ2yzu0IdZK0ot/j.A9Sa/VZRomcm6DDWAuGZq52nJzKe1dC", // bcrypt hash of "password123"
      name: "John Adebayo",
      role: "applicant",
      applicantId: "CES-2025-000001",
      serviceStatus: "active",
      registrationStatus: "approved",
      createdAt: new Date(),
    },
  ],
  applicants: [
    {
      id: "app-001",
      userId: "user-001",
      applicantId: "CES-2025-000001",
      fullName: "John Adebayo",
      email: "applicant@example.com",
      phone: "08012345678",
      gender: "Male",
      dob: "1990-05-15",
      state: "Lagos",
      lga: "Ikeja",
      address: "123 Main Street, Lagos",
      qualification: "B.Sc. Computer Science",
      kinName: "Mary Adebayo",
      kinPhone: "08087654321",
      medInfo: "No medical conditions",
      whyJoin: "I want to serve my country",
      status: "pending",
      serviceStatus: "active",
      submitted: true,
      submittedAt: new Date(),
      createdAt: new Date(),
    },
  ],
  nextUserId: 2,
  nextAppId: 2,
};

// Helper functions for demo database operations
export const demoDb = {
  // User operations
  findUserByEmail(email) {
    return demoDatabase.users.find((u) => u.email === email);
  },

  findUserById(id) {
    return demoDatabase.users.find((u) => u.id === id);
  },

  createUser(userData) {
    const newUser = {
      id: `user-${demoDatabase.nextUserId++}`,
      ...userData,
      registrationStatus: userData.registrationStatus || 'pending',
      createdAt: new Date(),
    };
    demoDatabase.users.push(newUser);
    return newUser;
  },

  getPendingUsers() {
    return demoDatabase.users.filter(u => u.registrationStatus === 'pending');
  },

  approveUser(id) {
    const user = demoDatabase.users.find(u => u.id === id || u.id === String(id));
    if (!user) return null;
    user.registrationStatus = 'approved';
    return user;
  },

  rejectUser(id) {
    const user = demoDatabase.users.find(u => u.id === id || u.id === String(id));
    if (!user) return null;
    user.registrationStatus = 'rejected';
    return user;
  },

  // Applicant operations
  findApplicantByUserId(userId) {
    return demoDatabase.applicants.find((a) => a.userId === userId);
  },

  findApplicantByApplicantId(applicantId) {
    return demoDatabase.applicants.find((a) => a.applicantId === applicantId);
  },

  createOrUpdateApplicant(applicantData) {
    const existing = demoDatabase.applicants.find(
      (a) => a.userId === applicantData.userId
    );
    if (existing) {
      Object.assign(existing, applicantData);
      return existing;
    }
    const newApp = {
      id: `app-${demoDatabase.nextAppId++}`,
      ...applicantData,
      createdAt: new Date(),
    };
    demoDatabase.applicants.push(newApp);
    return newApp;
  },

  getAllApplicants() {
    return demoDatabase.applicants.map((app) => {
      const user = demoDatabase.users.find((u) => u.id === app.userId);
      return { ...app, user };
    });
  },

  updateApplicantStatus(applicantId, status) {
    const app = demoDatabase.applicants.find((a) => a.applicantId === applicantId);
    if (app) {
      app.status = status;
    }
    return app;
  },

  updateServiceStatus(applicantId, serviceStatus) {
    const app = demoDatabase.applicants.find((a) => a.applicantId === applicantId);
    if (app) {
      app.serviceStatus = serviceStatus;
      const user = demoDatabase.users.find((u) => u.id === app.userId);
      if (user) {
        user.serviceStatus = serviceStatus;
      }
    }
    return app;
  },

  getStats() {
    const statuses = {};
    demoDatabase.applicants.forEach((app) => {
      statuses[app.status] = (statuses[app.status] || 0) + 1;
    });
    return statuses;
  },
};
