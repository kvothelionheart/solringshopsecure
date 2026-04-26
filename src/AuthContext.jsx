import { createContext, useContext, useState, useEffect } from "react";
import * as db from "./supabase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = db.supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (session?.user) {
        const profile = await db.getCurrentUser();
        setUser(profile);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSession = async () => {
    console.log("AuthContext: Checking session...");
    try {
      const profile = await db.getCurrentUser();
      console.log("AuthContext: Got profile:", profile);
      setUser(profile);
    } catch (err) {
      console.error("AuthContext: Session check error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const result = await db.signInWithEmail(email, password);
    if (result.success) {
      setUser(result.profile);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const signup = async (email, password, username) => {
    const result = await db.signUpWithEmail(email, password, username);
    if (result.success) {
      return { 
        success: true, 
        needsEmailConfirmation: result.needsEmailConfirmation,
        message: result.message 
      };
    }
    return { success: false, error: result.error };
  };

  const loginWithMagicLink = async (email) => {
    const result = await db.signInWithMagicLink(email);
    return result;
  };

  const resetPassword = async (email) => {
    const result = await db.resetPassword(email);
    return result;
  };

  const updatePassword = async (newPassword) => {
    const result = await db.updatePassword(newPassword);
    return result;
  };

  const logout = async () => {
    await db.signOut();
    setUser(null);
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false };
    const success = await db.updateProfile(user.id, updates);
    if (success) {
      const updated = { ...user, ...updates };
      setUser(updated);
      return { success: true };
    }
    return { success: false };
  };

  const loginWithWallet = async (walletAddress) => {
    const profile = await db.loginWithWallet(walletAddress);
    if (profile) {
      setUser(profile);
      return { success: true };
    }
    return { success: false, error: "Wallet not found" };
  };

  const signupWithWallet = async (walletAddress, username) => {
    const result = await db.signupWithWallet(walletAddress, username);
    if (result.success) {
      setUser(result.profile);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const linkWallet = async (walletAddress) => {
    if (!user) return { success: false, error: "Not logged in" };
    const result = await db.linkWalletToProfile(user.id, walletAddress);
    if (result.success) {
      const updated = { ...user, wallet_address: walletAddress };
      setUser(updated);
      return { success: true };
    }
    return { success: false, error: result.error };
  };

  const value = {
    user,
    loading,
    login,
    signup,
    loginWithMagicLink,
    resetPassword,
    updatePassword,
    logout,
    updateProfile,
    loginWithWallet,
    signupWithWallet,
    linkWallet,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
