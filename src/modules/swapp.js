/*
The primitive object that will be passed around the framework.
Contain the metadata (i.e., HTTP headers) and content (HTTP body).
The decision can be set so that the framework can reject a request/response.
The execution and priority orders are specified later when adding apps using eOrder/pLevel.
*/
function fProto(initdecision) {
  let decision = initdecision || 'dirty';
  let metadata = {};
  let body = '';
  let headers = {};
  let curr_pLevel = 0;
  let orig_metadata = {};
  let orig_body = '';
  let orig_headers = {};

  function updateIfHigher(givenDecision, pLevel) {
    if (!pLevel || curr_pLevel < pLevel) {
      decision = givenDecision;
      curr_pLevel = pLevel || curr_pLevel + 1;
    }
  }

  this.setDecision = updateIfHigher;

  this.updateMeta = function (update) {
    if (metadata.constructor === Request) {
      const mObj = {
        cache: update.cache || metadata.cache,
        context: update.context || metadata.context,
        credentials: update.credentials || metadata.credentials,
        destination: update.destination || metadata.destination,
        headers: update.headers || metadata.headers,
        integrity: update.integrity || metadata.integrity,
        method: update.method || metadata.method,
        // mode: update.mode || metadata.mode,
        redirect: update.redirect || metadata.redirect,
        referrer: update.referrer || metadata.referrer,
        referrerPolicy: update.referrerPolicy || metadata.referrerPolicy,
        body: update.body || metadata.body,
        bodyUsed: update.bodyUsed || metadata.bodyUsed,
      };

      metadata = new Request(update.url || metadata.url, mObj);
    } else if (metadata.constructor === Response) {
      console.log('Response metadata not allowed to be modified');
    } else {
      console.log('Error metadata type detected');
    }
  };

  this.setMeta = function (givenMetadata) {
    if (Object.keys(metadata).length === 0) {
      orig_metadata = givenMetadata;
    }
    metadata = givenMetadata;
  };

  this.setBody = function (givenBody) {
    if (body === '') {
      orig_body = givenBody;
    }
    body = givenBody;
  };

  this.setHeaders = function (givenHeaders) {
    if (Object.keys(headers).length === 0) {
      orig_headers = givenHeaders;
    }
    headers = givenHeaders;
  };

  this.getDecision = function () {
    return decision;
  };
  this.getMetadata = function () {
    return metadata;
  };
  this.getOrigMetadata = function () {
    return orig_metadata;
  };
  this.getHeaders = function () {
    return headers;
  };
  this.getBody = function () {
    return body;
  };
  this.getOrigBody = function () {
    return orig_body;
  };
}

//
// The main SWAPP framework object.
//
function swapp() {
  let apps = []; // List of registered normal apps

  let reqOrder = []; // List of the execution order of request handlers
  let respOrder = []; // List of the execution order of response handlers
  let tcbOrder = []; // List of the execution order of tcb handlers

  let secret = makeid(128); // Randomized secret code for postMessage
  let msgChannel = []; // List of dedicated message channels established

  let totalAppTime = 0; // For evaluation
  let currentFetchID = 0; // For evaluation

  // Internal state variables
  this.storage = new Storage();

  // Generate secret code
  function makeid(length) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charactersLength);
      result += characters.charAt(randomIndex);
    }

    return result;
  }

  // Helper function
  function intersect(a, b) {
    var setB = new Set(b);
    return [...new Set(a)].filter((x) => setB.has(x));
  }

  // Reorder the app execution order upon adding new apps
  function reorder(arr, app, mProp, eOrder) {
    if (!Object.prototype.hasOwnProperty.call(app, mProp)) {
      return; // Exit early if the required property is missing in 'app'
    }

    let o = {
      pos: arr.length - 1,
      orderLevel: app[eOrder] || 50, // Default order level is 50 if 'eOrder' property is missing
    };

    if (arr.length === 0 || o.orderLevel >= arr[arr.length - 1].orderLevel) {
      arr.push(o); // Add the new object to the end if it's higher in order or the array is empty
    } else {
      for (let i = 0; i < arr.length; i++) {
        if (arr[i].orderLevel > o.orderLevel) {
          arr.splice(i, 0, o); // Insert the object at the correct position based on order level
          break;
        }
      }
    }
  }

  // External API for adding new SWAPP apps
  this.addApp = function (app) {
    if (!app.appname) {
      app.appname = 'App' + apps.length.toString();
    }

    apps.push(app);

    reorder(reqOrder, app, 'reqMatch', 'reqOrder');
    reorder(respOrder, app, 'respMatch', 'respOrder');
    reorder(tcbOrder, app, 'tcbMatch', 'tcbOrder');
  };

  // Internal function to check if a response is a web page. Used to check before injecting TCB.
  function isWebpage(contentType) {
    // This list is temporary. Will be improved upon release for more robust detection
    let list = ['application/x-httpd-php', 'text/html'];

    for (let i = 0; i < list.length; i++) {
      if (contentType && contentType.includes(list[i])) {
        return true;
      }
    }

    return false;
  }

  // External helper function to check if a response is a web page.
  this.isWebpage = function (contentType) {
    // This list is temporary. Will be improved upon release for more robust detection
    let list = ['application/x-httpd-php', 'text/html'];

    for (let i = 0; i < list.length; i++) {
      if (contentType && contentType.includes(list[i])) {
        return true;
      }
    }

    return false;
  };

  // Internal function to check if a request is for the trusted code block script, so we can skip processing it.
  function isTCB(reqURL) {
    var re = /\/tcb\/[^\\/]*.js/;
    if (re.test(reqURL)) {
      return true;
    }

    return false;
  }

  // Internal helper function to insert text into the body
  function writeAfterMatchInternal(targetString, appendingString, matchString) {
    const matchIndex = targetString.indexOf(matchString);

    if (matchIndex !== -1) {
      return (
        targetString.slice(0, matchIndex + matchString.length) +
        appendingString +
        targetString.slice(matchIndex + matchString.length)
      );
    }

    return targetString;
  }

  writeBeforeMatchInternal = function (
    targetString,
    appendingString,
    matchString
  ) {
    let p = targetString.search(matchString);

    if (p > -1) {
      return (
        targetString.substring(0, p) +
        appendingString +
        targetString.substring(p)
      );
    }

    return targetString;
  };

  // External helper function to insert text into the body
  this.writeAfterMatch = function (targetString, appendingString, matchString) {
    return writeAfterMatchInternal(targetString, appendingString, matchString);
  };

  this.writeBeforeMatch = function (
    targetString,
    appendingString,
    matchString
  ) {
    return writeBeforeMatchInternal(targetString, appendingString, matchString);
  };

  // Internal function to handle requests
  async function CEGRequest(req) {
    let fObject = new fProto();
    fObject.setMeta(req);
    fObject.setHeaders(req.headers);

    for (const { pos } of reqOrder) {
      const app = apps[pos];

      if (app.reqMatch && (await app.reqMatch(fObject))) {
        fObject = await app.reqAction(fObject);
      }
    }

    return fObject;
  }

  // Internal function to handle responses
  async function processResponse(resp, body, decision) {
    const fObject = new fProto(decision);
    fObject.setMeta(resp);
    fObject.setBody(body);

    if (isTCB(resp.url)) {
      for (const { pos } of tcbOrder) {
        const app = apps[pos];

        if (app.tcbMatch) {
          fObject.setBody(
            writeBeforeMatchInternal(
              fObject.getBody(),
              app.tcbAction,
              '//__EOF__'
            )
          );
        }
      }

      fObject.setBody(
        writeBeforeMatchInternal(
          fObject.getBody(),
          `var secret = "${secret}";`,
          '//__SECRET__'
        )
      );
    } else {
      for (const { pos } of respOrder) {
        const app = apps[pos];

        if (app.respMatch && (await app.respMatch(fObject))) {
          fObject = await app.respAction(fObject);
        }
      }

      const contentType = fObject.getMetadata().headers.get('Content-Type');
      if (isWebpage(contentType)) {
        fObject.setBody(initDocumentContext(fObject));
      }
    }

    return fObject;
  }

  // Internal function to inject the TCB into pages
  function initDocumentContext(fObject) {
    return writeAfterMatchInternal(
      fObject.getBody(),
      '\n\t<script src="./tcb/init.js"></script>',
      '<head>'
    );
  }

  // External function to handle requests
  this.fetchSupervisor = async function (req) {
    currentFetchID += 1;
    const localID = currentFetchID;
    req.id = localID;

    const fObject = await CEGRequest(req);
    const decision = fObject.getDecision();

    switch (decision) {
      case 'original': {
        const resp = await fetch(req);
        resp.id = localID;
        return await CEGResponse(resp, 'original');
      }
      case 'dirty': {
        const meta = fObject.getMetadata();
        const resp = await fetch(new Request(meta));
        resp.id = localID;
        return await CEGResponse(resp, 'dirty');
      }
      case 'cache': {
        const r = new Response(fObject.getBody(), fObject.getMetadata());
        Object.defineProperty(r, 'type', { value: fObject.getMetadata().type });
        Object.defineProperty(r, 'url', { value: fObject.getMetadata().url });
        r.id = localID;
        return await CEGResponse(r, 'cache');
      }
      case 'drop':
        return null;
      default:
        // Handle error or unexpected decision
        throw new Error(`Invalid decision: ${decision}`);
    }
  };

  // Internal function to handle responses
  async function CEGResponse(resp, decision) {
    const contentType = resp.headers.get('Content-Type');
    const isFont =
      contentType &&
      (contentType.includes('font') ||
        resp.url.includes('.woff') ||
        resp.url.includes('.eot') ||
        resp.url.includes('.otf') ||
        resp.url.includes('.ttf'));

    if (
      resp.type === 'opaqueredirect' ||
      resp.type === 'error' ||
      resp.type === 'opaque' ||
      isFont ||
      contentType === 'image/gif' ||
      contentType === 'text/css'
    ) {
      return resp; // Return the original response without processing
    }

    const body = await resp.text();
    const fObject = await processResponse(resp, body, decision);

    let ret;
    const fDecision = fObject.getDecision();
    if (fDecision === 'original') {
      ret = new Response(fObject.getOrigBody(), fObject.getOrigMetadata());
    } else if (fDecision === 'dirty' || fDecision === 'cache') {
      ret = new Response(fObject.getBody(), fObject.getMetadata());
    } else if (fDecision === 'drop') {
      // Handle drop decision (e.g., return error page)
    }

    return ret;
  }

  // External function to handle activate event
  this.activateSupervisor = function () {
    appCount = apps.length;
    for (let i = 0; i < appCount; i++) {
      let app = apps[i];

      if (Object.prototype.hasOwnProperty.call(app, 'onswactivate')) {
        app.onswactivate();
      }
    }
  };

  // External function to handle and dispatch postMessage
  this.messageManager = function (event) {
    let label = event.data.label;
    let msg = event.data.msg;
    let sender = event.ports[0];

    if (event.data.secret != secret) {
      console.log('[Error] Incorrect secret code');
      return;
    }

    if (intersect(label, ['SWAPP_INIT']).length > 0) {
      msgChannel.push(sender);
      return;
    }

    for (let i = 0; i < apps.length; i++) {
      let app = apps[i];

      if (Object.prototype.hasOwnProperty.call(app, 'msgLabel')) {
        let matchedLabel = intersect(app.msgLabel, label);

        if (matchedLabel.length > 0) {
          app.msgHandler(matchedLabel, msg);
        }
      }
    }
  };

  // Broadcast to dedicated channels
  this.broadcastMsg = function (label, msg) {
    for (let i = 0; i < msgChannel.length; i++) {
      msgChannel[i].postMessage({ label: label, msg: msg, secret: secret });
    }
  };
}

var swappInst = new swapp();
