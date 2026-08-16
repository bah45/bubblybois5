"use client";

export {
  getUser,
  isAuthenticated,
  login,
  signup,
  logout,
  oauthLogin,
  handleAuthCallback,
  onAuthChange,
  getSettings,
  AuthError,
  MissingIdentityError,
  type User,
} from "@netlify/identity";
