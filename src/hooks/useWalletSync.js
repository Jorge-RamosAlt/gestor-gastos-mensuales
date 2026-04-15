import { useState, useEffect, useCallback, useRef } from "react";
import {
  subscribeToCategories,
  subscribeToWallet,
  saveCategories,
  subscribeToHistorial,
  registerWalletForUser,
} from "../lib/firestoreService.js";
import { useToast } from "./useToast.js";

/**
 * useWalletSync
 * Manages Firestore wallet subscriptions and sync logic:
 * - Subscribes to wallet metadata
 * - Subscribes to categories with real-time updates
 * - Handles debounced saving of categories back to Firestore
 * - Manages external update detection (changes from other users)
 * - Subscribes to wallet history
 *
 * @param {string} walletId - The wallet ID to sync (null to disable)
 * @param {boolean} soloMode - Whether in solo mode (disables sync)
 * @param {object} authUser - Current authenticated user
 * @param {array} categories - Current categories (for debounced saves)
 * @param {function} setCategories - Function to update categories state
 *
 * Returns {
 *   walletData,       // Wallet metadata { id, name, code, members, etc }
 *   setWalletData,    // Function to set wallet data
 *   walletLoading,    // Boolean: whether wallet is loading
 *   setWalletLoading, // Function to set loading state
 *   syncedSetCategories, // Wrapped setCategories that triggers Firestore sync
 *   firestoreHistory, // Historical data from Firestore [ { id, yearMonth, total, ... } ]
 *   setFirestoreHistory, // Function to set history
 * }
 */
export function useWalletSync(walletId, soloMode, authUser, categories, setCategories) {
  const toast = useToast();

  const [walletData, setWalletData] = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [externalUpdate, setExternalUpdate] = useState(null);
  const [firestoreHistory, setFirestoreHistory] = useState(null);

  // Refs for debounced save logic
  const syncTimerRef = useRef(null);
  const lastSyncedRef = useRef(null);
  const isLocalChange = useRef(false);

  // Subscribe to wallet and categories
  useEffect(() => {
    if (!walletId || soloMode) {
      return;
    }

    let unsubWallet = null;
    let unsubCats = null;
    let cancelled = false;

    // Subscribe to wallet data
    unsubWallet = subscribeToWallet(
      walletId,
      (data) => {
        if (!cancelled) {
          setWalletData(data);
          if (authUser?.uid && data?.name) {
            registerWalletForUser(authUser.uid, walletId, data.name).catch(() => {});
          }
        }
      },
      () => {}
    );

    let firstLoad = true;
    // Subscribe to categories
    unsubCats = subscribeToCategories(
      walletId,
      (data) => {
        if (!cancelled) {
          setWalletLoading(false);
          if (firstLoad) {
            setCategories(data.categories ?? []);
            firstLoad = false;
          } else {
            setExternalUpdate(data);
            if (data.updatedBy !== authUser?.uid) {
              const name = data.updatedByName ?? 'Alguien';
              toast.info(`${name} actualizó los gastos`);
            }
          }
        }
      },
      (err) => {
        if (!cancelled) {
          if (import.meta.env.DEV) console.error('[Firestore/categories]', err);
          setWalletLoading(false);
        }
      }
    );

    // Set loading state (this will be async and not cause cascade)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWalletLoading(true);

    return () => {
      cancelled = true;
      unsubCats?.();
      unsubWallet?.();
    };
  }, [walletId, soloMode, toast, setCategories, authUser?.uid]);

  // Subscribe to wallet history
  useEffect(() => {
    if (!walletData?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirestoreHistory(null);
      return;
    }
    const unsub = subscribeToHistorial(
      walletData.id,
      (entries) => setFirestoreHistory(entries),
      (err) => {
        if (import.meta.env.DEV) console.warn("[useWalletSync] historial error", err);
      }
    );
    return unsub;
  }, [walletData?.id]);

  // Handle external updates (from other users)
  useEffect(() => {
    if (!externalUpdate) return;
     
    setCategories(externalUpdate.categories ?? []);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExternalUpdate(null);
  }, [externalUpdate, setCategories]);

  // Wrapped setCategories that marks local changes for sync
  const syncedSetCategories = useCallback((updater) => {
    isLocalChange.current = true;
    setCategories(updater);
  }, [setCategories]);

  // Debounced save to Firestore
  useEffect(() => {
    if (!walletId || soloMode || !authUser || !isLocalChange.current) return;
    isLocalChange.current = false;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      const key = JSON.stringify(categories);
      if (key === lastSyncedRef.current) return;
      lastSyncedRef.current = key;
      try {
        await saveCategories(walletId, categories, authUser);
      } catch (e) {
        if (import.meta.env.DEV) console.error('[Firestore/save]', e);
        toast.error('Error al sincronizar');
      }
    }, 800);
  }, [categories, walletId, soloMode, authUser, toast]);

  return {
    walletData,
    setWalletData,
    walletLoading,
    setWalletLoading,
    syncedSetCategories,
    firestoreHistory,
    setFirestoreHistory,
  };
}
