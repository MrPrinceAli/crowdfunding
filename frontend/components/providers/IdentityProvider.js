import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBlockRefresh } from "../../hooks/useBlockRefresh";
import { loadDisplayNames } from "../../lib/contracts";
import { isEnsEnabled, lookupEns, readEnsCache, writeEnsCache } from "../../lib/ens";
import { shortAddress } from "../../lib/format";
import { onError } from "../../lib/log";

const IdentityContext = createContext(null);

const key = (address) => address?.toLowerCase();

/**
 * Nama tampilan untuk alamat dompet: nama profil (on-chain) -> nama ENS -> 0x1234...abcd.
 * Nama profil dimuat sekali dari event lalu diperbarui tiap blok baru; ENS dicari hanya untuk alamat yang tampil.
 */
export const IdentityProvider = ({ children }) => {
  const [names, setNames] = useState(() => new Map());
  const [ens, setEns] = useState({});
  const requested = useRef(new Set());

  const refreshNames = useCallback(() => loadDisplayNames().then(setNames).catch(onError("Memuat nama profil")), []);

  useEffect(() => {
    refreshNames();
    setEns(readEnsCache());
  }, [refreshNames]);

  useBlockRefresh(refreshNames, 5000);

  const requestEns = useCallback((addresses) => {
    if (!isEnsEnabled()) return;
    const cache = readEnsCache();
    const missing = [...new Set(addresses.filter(Boolean).map(key))].filter(
      (address) => !(address in cache) && !requested.current.has(address),
    );
    missing.forEach((address) => {
      requested.current.add(address);
      lookupEns(address).then((result) => {
        const next = { ...readEnsCache(), [address]: result };
        writeEnsCache(next);
        setEns(next);
      });
    });
  }, []);

  const value = useMemo(() => {
    const identityOf = (address) => {
      const profileName = names.get(key(address)) || null;
      const ensRecord = ens[key(address)] || null;
      return {
        address,
        short: shortAddress(address),
        profileName,
        ensName: ensRecord?.name || null,
        avatar: ensRecord?.avatar || null,
        name: profileName || ensRecord?.name || null,
      };
    };
    return {
      identityOf,
      label: (address) => identityOf(address).name || shortAddress(address),
      requestEns,
      refreshNames,
    };
  }, [names, ens, requestEns, refreshNames]);

  return <IdentityContext.Provider value={value}>{children}</IdentityContext.Provider>;
};

const FALLBACK = {
  identityOf: (address) => ({
    address,
    short: shortAddress(address),
    profileName: null,
    ensName: null,
    avatar: null,
    name: null,
  }),
  label: shortAddress,
  requestEns: () => {},
  refreshNames: () => Promise.resolve(),
};

/**
 * Akses nama tampilan. `addresses` (opsional) = alamat yang sedang tampil, agar ENS-nya dicari.
 * const { label, identityOf } = useIdentity([campaign.creator])
 */
export const useIdentity = (addresses = []) => {
  const context = useContext(IdentityContext) || FALLBACK;
  const { requestEns } = context;
  const addressKey = addresses.filter(Boolean).join(",");

  useEffect(() => {
    if (addressKey) requestEns(addressKey.split(","));
  }, [addressKey, requestEns]);

  return context;
};
