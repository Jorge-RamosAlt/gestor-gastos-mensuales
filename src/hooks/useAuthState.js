import { useState, useEffect } from "react";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import { auth } from "../lib/firebase.js";
import {
  getSoloMode,
  getUserWallets,
  getUserProfile,
} from "../lib/firestoreService.js";

const PROFILE_KEY = "gastos_perfil_v1";

/**
 * useAuthState
 * Manages authentication state and effects:
 * - Listens to Firebase auth state changes
 * - Loads user profile from Firestore/localStorage
 * - Handles solo mode state
 * - Manages user wallets loading
 *
 * Returns {
 *   authUser,           // Current authenticated Firebase user or null
 *   soloMode,           // Boolean: whether in solo (no-auth) mode
 *   setSoloModeLocal,   // Function to set solo mode
 *   profile,            // User profile object or null
 *   setProfile,         // Function to update profile
 *   userWallets,        // Array of user's wallets or null
 *   setUserWallets,     // Function to set user wallets
 *   walletsLoading,     // Boolean: whether wallets are loading
 *   setWalletsLoading,  // Function to set loading state
 *   setAuthUser,        // Function to set auth user
 * }
 */
export function useAuthState() {
  const [authUser, setAuthUser] = useState(undefined);
  const [soloMode, setSoloModeLocal] = useState(getSoloMode);
  const [userWallets, setUserWallets] = useState(null);
  const [walletsLoading, setWalletsLoading] = useState(false);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed?.name || !parsed?.salaryActual || !parsed?.salaryTarget) return null;
      return parsed;
    } catch {
      return null;
    }
  });

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthUser(null);
        setUserWallets(null);
        setProfile(null);
        return;
      }

      setAuthUser(user);

      try {
        const firestoreProfile = await getUserProfile(user.uid);
        if (firestoreProfile) {
          setProfile(firestoreProfile);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(firestoreProfile));
          if (firestoreProfile.name && firestoreProfile.name !== user.displayName) {
            updateProfile(user, { displayName: firestoreProfile.name }).catch(() => {});
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Auth] No se pudo cargar el perfil:', err);
      }

      if (!getSoloMode()) {
        setWalletsLoading(true);
        try {
          const wallets = await getUserWallets(user.uid);
          setUserWallets(wallets);
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[Auth] No se pudo cargar carteras:', err);
          setUserWallets([]);
        } finally {
          setWalletsLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  return {
    authUser,
    setAuthUser,
    soloMode,
    setSoloModeLocal,
    profile,
    setProfile,
    userWallets,
    setUserWallets,
    walletsLoading,
    setWalletsLoading,
  };
}
