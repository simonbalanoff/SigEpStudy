import { Router } from "express";
import rateLimit from "express-rate-limit";

import { requireAuth } from "../../middleware/auth.js";
import {
  changePassword,
  forgotPassword,
  getCurrentUser,
  login,
  logout,
  logoutAll,
  register,
  resetPassword,
  updateProfile
} from "./auth.controller.js";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

export const authRouter = Router();

authRouter.post("/register", authLimiter, register);
authRouter.post("/login", authLimiter, login);
authRouter.post("/forgot-password", authLimiter, forgotPassword);
authRouter.post("/reset-password", authLimiter, resetPassword);
authRouter.get("/me", requireAuth, getCurrentUser);
authRouter.patch("/me", requireAuth, updateProfile);
authRouter.post("/logout", requireAuth, logout);
authRouter.post("/logout-all", requireAuth, logoutAll);
authRouter.post("/change-password", requireAuth, changePassword);
