/**
 * DrBank AFF Scout v2.7.1 — Page MAIN World XHR & Fetch Bridge
 * Runs inside the page's MAIN JS world on affiliate.shopee.co.th so that
 * Shopee's own anti-bot SDK (af-ac-enc-dat / x-sap-ri) automatically signs
 * every XMLHttpRequest and fetch call, preventing HTTP 403 Forbidden errors.
 */
(function () {
  if (window.__drbMainBridgeLoaded) return;
  window.__drbMainBridgeLoaded = true;

  function getCsrfToken() {
    const match = document.cookie.split('; ').find((r) => r.startsWith('csrftoken='));
    return match ? match.split('=')[1] : '';
  }

  function runPageXhr({ url, method = 'GET', headers = {}, body = null, useFetch = false }) {
    if (useFetch) {
      return window
        .fetch(url, {
          method,
          credentials: 'include',
          mode: 'cors',
          headers,
          body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined
        })
        .then(async (res) => {
          const text = await res.text();
          let data = null;
          try {
            data = JSON.parse(text);
          } catch (_e) {
            data = text;
          }
          return { ok: res.ok, status: res.status, data };
        });
    }

    return new Promise((resolve) => {
      try {
        const xhr = new window.XMLHttpRequest();
        xhr.open(method, url, true);
        xhr.withCredentials = true;

        if (headers && typeof headers === 'object') {
          Object.keys(headers).forEach((k) => {
            if (headers[k] !== undefined && headers[k] !== null) {
              xhr.setRequestHeader(k, headers[k]);
            }
          });
        }

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            let parsed = null;
            try {
              parsed = JSON.parse(xhr.responseText);
            } catch (_e) {
              parsed = xhr.responseText;
            }
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              data: parsed
            });
          }
        };

        xhr.onerror = function () {
          resolve({ ok: false, status: xhr.status || 0, error: 'XHR Network Error', data: null });
        };

        if (body && typeof body === 'object') {
          xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
          xhr.send(JSON.stringify(body));
        } else if (typeof body === 'string') {
          xhr.send(body);
        } else {
          xhr.send();
        }
      } catch (err) {
        resolve({ ok: false, status: 0, error: err?.message || String(err), data: null });
      }
    });
  }

  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const msg = event.data;
    if (!msg || msg.type !== 'DRB_MAIN_WORLD_REQ' || !msg.reqId) return;

    try {
      const headers = { ...(msg.headers || {}) };
      if (msg.attachCsrf) {
        headers['csrf-token'] = getCsrfToken();
      }
      const result = await runPageXhr({
        url: msg.url,
        method: msg.method || 'GET',
        headers,
        body: msg.body || null,
        useFetch: Boolean(msg.useFetch)
      });
      window.postMessage(
        {
          type: 'DRB_MAIN_WORLD_RES',
          reqId: msg.reqId,
          ...result
        },
        '*'
      );
    } catch (err) {
      window.postMessage(
        {
          type: 'DRB_MAIN_WORLD_RES',
          reqId: msg.reqId,
          ok: false,
          status: 0,
          error: err?.message || String(err)
        },
        '*'
      );
    }
  });
})();

