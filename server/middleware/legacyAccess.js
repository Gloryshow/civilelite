// Middleware to restrict pending legacy users to the application form only
export const restrictPendingLegacy = (req, res, next) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ error: "No user in session" });

    // If an applicant is still pending approval and not yet granted legacy access,
    // only allow form/profile submission endpoints. Block other features.
    if (
      user.role === "applicant" &&
      String(user.registrationStatus || "").toLowerCase() === "pending" &&
      !user.legacyApproved
    ) {
      return res.status(403).json({ error: "Pending accounts can only access the application form until approved." });
    }

    next();
  } catch (err) {
    console.error("restrictPendingLegacy error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
