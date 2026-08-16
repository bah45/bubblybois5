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
  AuthError,
  MissingIdentityError,
  type User,
} from "@netlify/identity";
