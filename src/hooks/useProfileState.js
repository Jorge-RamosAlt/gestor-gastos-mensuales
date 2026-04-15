import { useCallback } from "react";
import { updateProfile } from "firebase/auth";
import { saveUserProfile } from "../lib/firestoreService.js";

const PROFILE_KEY = "gastos_perfil_v1";

/**
 * useProfileState
 * Manages profile loading/saving and synchronization:
 * - Saves profile to localStorage (always)
 * - Saves profile to Firestore (if authenticated)
 * - Updates Firebase user displayName
 * - Handles profile reset
 *
 * @param {object} profile - Current profile state
 * @param {function} setProfile - Function to update profile state
 * @param {object} authUser - Current authenticated user (optional)
 *
 * Returns {
 *   handleSetup,  // Function to save profile: (profileData) => Promise
 *   handleReset,  // Function to reset profile
 * }
 */
export function useProfileState(profile, setProfile, authUser) {
  const handleSetup = useCallback(async (profileData) => {
    // Save to localStorage
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData));
    } catch {
      /* ignore */
    }

    // Save to Firestore if authenticated
    if (authUser) {
      saveUserProfile(authUser.uid, profileData).catch((e) => {
        if (import.meta.env.DEV) console.warn('[Firestore/saveProfile]', e);
      });
    }

    // Update Firebase user displayName
    if (authUser && profileData.name) {
      try {
        await updateProfile(authUser, { displayName: profileData.name });
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[Auth/displayName]', e);
      }
    }

    setProfile(profileData);
  }, [authUser, setProfile]);

  const handleReset = useCallback(() => {
    try {
      localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* ignore */
    }
    setProfile(null);
  }, [setProfile]);

  return {
    handleSetup,
    handleReset,
  };
}
