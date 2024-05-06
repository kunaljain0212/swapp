self.importScripts('./apps/tXml.min.js');

const appObj = {
  appname: 'Data Guard',
  storageTable: 'data_guard',
};

function dg_init() {
  swappInst.storage.createTable(appObj.storageTable, 'entry', ['value']);
}

async function traverse(root, callback) {
  async function traverseNode(node) {
    await callback(node);
    if (node.children && node.children.length) {
      for (const child of node.children) {
        await traverseNode(child);
      }
    }
  }
  await traverseNode(root);
  return root;
}

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex;
}

function isCurrentDomainURL(url) {
  const urlObj = new URL(url);
  return urlObj.hostname === domain;
}

async function generateDGTokenForURL(url) {
  if (!isCurrentDomainURL(url)) return url;
  const transaction = swappInst.storage.db.transaction(
    appObj.storageTable,
    'readwrite'
  );
  const store = transaction.objectStore(appObj.storageTable);
  const req = store.get(url);
  const token = await sha256(url);
  req.onsuccess = function (event) {
    if (!req.result) {
      store.put({ entry: url, value: token });
    }
  };
  return token;
}

async function replaceURIs(text) {
  const htmlDOM = txml.parse(text);
  const transaction = swappInst.storage.db.transaction(
    appObj.storageTable,
    'readwrite'
  );
  const store = transaction.objectStore(appObj.storageTable);
  await traverse(htmlDOM, async function (node) {
    if (
      ['a', 'link', 'img', 'video', 'audio', 'source', 'object'].includes(
        node.tagname
      )
    ) {
      for (const attribute in node.attributes) {
        if (
          ['href', 'src', 'data'].includes(attribute) &&
          (node.attributes[attribute].startsWith('/') ||
            node.attributes[attribute].startsWith('.'))
        ) {
          const dgtoken = await generateDGTokenForURL(
            node.attributes[attribute]
          );
          const req = store.get(node.attributes[attribute]);
          req.onsuccess = function (event) {
            if (!req.result) {
              store.put({
                entry: node.attributes[attribute].substring(1),
                value: dgtoken,
              });
            }
          };
          node.attributes[attribute] = dgtoken;
        }
      }
    }
  });
  return txml.stringify(htmlDOM);
}

appObj.respAction = async function (fObject) {
  const transaction = swappInst.storage.db.transaction(
    appObj.storageTable,
    'readwrite'
  );
  const store = transaction.objectStore(appObj.storageTable);

  const newF2FHeader = fObject.getMetadata().headers.get('F2F');
  if (newF2FHeader) {
    const req = store.get('F2F');
    req.onsuccess = function (event) {
      if (req.result) {
        store.put({
          entry: 'F2F',
          value: `${req.result['value']};${newF2FHeader}`,
        });
      } else {
        store.put({ entry: 'F2F', value: newF2FHeader });
      }
    };
  }

  const headers = fObject.getHeaders();
  headers.delete('F2F');
  fObject.setHeaders(headers);

  let body = await fObject.getBody();
  body = await replaceURIs(body);

  fObject.setBody(body);
  fObject.setDecision('dirty');
  return fObject;
};

appObj.reqAction = async function (fObject) {
  const transaction = swappInst.storage.db.transaction(
    appObj.storageTable,
    'readwrite'
  );
  const store = transaction.objectStore(appObj.storageTable);

  const cookiesReq = store.get('Cookies');
  const f2fReq = store.get('F2F');

  await new Promise((resolve) => {
    cookiesReq.onsuccess = function (event) {
      if (cookiesReq.result) {
        fObject.getHeaders().append('Cookies', cookiesReq.result['value']);
      }
      resolve();
    };
  });

  await new Promise((resolve) => {
    f2fReq.onsuccess = function (event) {
      if (f2fReq.result) {
        fObject.getHeaders().append('F2F', f2fReq.result['value']);
      }
      resolve();
    };
  });

  const metadata = fObject.getMetadata();
  const targetURL = metadata.url;
  const allKeys = store.getAll();
  let decision = 'dirty';

  await new Promise((resolve) => {
    allKeys.onsuccess = async function (event) {
      const cursor = event.target.result;
      for (const v of cursor) {
        if (targetURL.match(v.value) !== null) {
          const actualURL = targetURL.replace(v.value, v.entry);
          fObject.setMeta(new Request(actualURL));
          break;
        }
      }
      resolve();
    };
  });

  fObject.setDecision(decision);
  return fObject;
};

dg_init();
setTimeout(() => {
  swappInst.addApp(appObj);
}, 500);
