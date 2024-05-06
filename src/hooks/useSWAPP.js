import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { protectedRoutes } from '../utils/constants';
import { getIndexedDBInstance } from '../utils/helpers/getIndexedDBInstance';
import { initializeIndexedDBInstance } from '../utils/helpers/initializeIndexedDBInstance';
import sw from '../modules/sw';

const idb = getIndexedDBInstance();

export const useSWAPP = ({ isDataGuardEnabled = false }) => {
  const [hashProtectedRouteIds, setHashProtectedRouteIds] =
    useState(protectedRoutes);
  const [isAuthorized, setIsAuthorized] = useState(false);

  const getDataByKey = (key) => {
    if (!isDataGuardEnabled) return setIsAuthorized(true);
    const dbPromise = idb.open('SWAPP', 1);
    dbPromise.onsuccess = () => {
      const db = dbPromise.result;

      var tx = db.transaction('dataGuard', 'readonly');
      var dataGuard = tx.objectStore('dataGuard');
      const hashedURLSlug = dataGuard.get(key);

      hashedURLSlug.onsuccess = (query) => {
        const indexedDBMapping = query.srcElement.result?.data;
        if (protectedRoutes.includes(indexedDBMapping)) {
          return setIsAuthorized(true);
        } else {
          return setIsAuthorized(false);
        }
      };

      tx.oncomplete = function () {
        db.close();
      };
    };
  };

  useEffect(() => {
    sw();
    if (!isDataGuardEnabled) return;
    const hashedIds = [];
    for (let i = 0; i < protectedRoutes.length; i++) {
      const newId = nanoid();
      initializeIndexedDBInstance({ id: newId, data: protectedRoutes[i] }, idb);
      hashedIds.push(newId);
    }
    setHashProtectedRouteIds(hashedIds);
  }, []);

  return { hashProtectedRouteIds, getDataByKey, isAuthorized };
};

export default useSWAPP;
