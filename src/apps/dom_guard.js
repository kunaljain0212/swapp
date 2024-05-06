self.importScripts('./apps/he.js');

const USE_HE = true; // Consider making this a constant
let DG_ENABLED = true; // Renamed to be more consistent

function getLocation(href) {
  const match = href.match(
    /^(https?:)\/\/(([^:/?#]*)(?::([0-9]+))?)([\/]{0,1}[^?#]*)(\?[^#]*|)(#.*)$/
  );
  return (
    match && {
      href: href,
      protocol: match[1],
      host: match[2],
      hostname: match[3],
      port: match[4],
      pathname: match[5],
      search: match[6],
      hash: match[7],
    }
  );
}

const domguard = {
  appname: 'DOMGUARD',
  reqMatch(fObj) {
    if (DG_ENABLED) {
      const metadataUrl = fObj.getMetadata().url;
      if (!metadataUrl) return false;

      const url = getLocation(metadataUrl);

      return url.hash || url.search;
    }
    return false;
  },
  async reqAction(fObj) {
    if (DG_ENABLED) {
      const metadataUrl = fObj.getMetadata().url;
      if (!metadataUrl) return fObj;

      const url = getLocation(metadataUrl);
      const encodedHash = he.encode(decodeURIComponent(url.hash));
      const encodedSearch = he.encode(decodeURIComponent(url.search));

      if (
        encodedHash !== decodeURIComponent(url.hash) ||
        encodedSearch !== decodeURIComponent(url.search)
      ) {
        fObj.setMeta({
          status: 200,
          url: metadataUrl.toString(),
          statusText: 'OK',
          headers: { 'Content-Type': 'text/html' },
        });
        fObj.setBody('[DG] Potential DOM-XSS payload detected');
        fObj.setDecision('cache');

        // Add to whitelist if needed
      }
    }

    return fObj;
  },
  msgLabel: ['domguard'],
  msgHandler(label, msg) {
    if (msg === 'enable') {
      DG_ENABLED = true;
    } else if (msg === 'disable') {
      DG_ENABLED = false;
    }
  },
  tcbMatch: true,
  tcbAction: `
    document.addEventListener("enableDOMGuard", () => { 
      sendMsg(["domguard"], "enable");
    });
    document.addEventListener("disableDOMGuard", () => {
      sendMsg(["domguard"], "disable");
    });
  `,
};

console.log('[D]OM[G]uard activated');
swappInst.addApp(domguard);
