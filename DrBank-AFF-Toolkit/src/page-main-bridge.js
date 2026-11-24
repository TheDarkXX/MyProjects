/**
 * DrBank AFF Scout v2.7.1 — Page MAIN World XHR & Fetch Bridge
 * Runs inside the page's MAIN JS world on affiliate.shopee.co.th so that
 * Shopee's own anti-bot SDK (af-ac-enc-dat / x-sap-ri) automatically signs
 * every XMLHttpRequest and fetch call, preventing HTTP 403 Forbidden errors.
 */
(function () {
  if (window.__drbMainBridgeLoaded) return;
  window.__drbMainBridgeLoaded = true;

  function isOfferDetailApiUrl(urlStr) {
    const s = String(urlStr || '');
    return s.includes('api/v3/offer/product') && !s.includes('api/v3/offer/product/list');
  }

  function isReportApiUrl(urlStr) {
    const s = String(urlStr || '').toLowerCase();
    if (!s.includes('/api/')) return false;
    if (s.includes('/offer/product') || s.includes('batchcustomlink') || s.includes('/account/')) return false;
    return (
      s.includes('/report') ||
      s.includes('/dashboard') ||
      s.includes('/conversion') ||
      s.includes('/click') ||
      s.includes('/order') ||
      s.includes('/gql') ||
      s.includes('/performance') ||
      s.includes('/commission')
    );
  }

  function emitInterceptedOffer(url, parsed) {
    if (!parsed || typeof parsed !== 'object') return;
    if (parsed.data || typeof parsed.error === 'number') {
      window.postMessage(
        {
          type: 'DRB_AFF_OFFER_INTERCEPTED',
          url: String(url || ''),
          data: parsed
        },
        '*'
      );
    }
  }

  window.__drbCapturedReportReqs = window.__drbCapturedReportReqs || [];

  function emitInterceptedReport(url, parsed, reqMeta = {}) {
    if (!parsed || typeof parsed !== 'object') return;
    if (parsed.data || Array.isArray(parsed.list) || typeof parsed.code === 'number') {
      const urlStr = String(url || '');
      const fullUrl = urlStr.startsWith('http')
        ? urlStr
        : `${location.origin}${urlStr.startsWith('/') ? '' : '/'}${urlStr}`;
      const rec = {
        url: fullUrl,
        method: reqMeta.method || 'GET',
        reqBody: reqMeta.body || null,
        capturedAt: Date.now()
      };
      window.__drbCapturedReportReqs = [
        rec,
        ...window.__drbCapturedReportReqs.filter((r) => r.url !== fullUrl || r.reqBody !== rec.reqBody)
      ].slice(0, 10);

      window.postMessage(
        {
          type: 'DRB_AFF_REPORT_INTERCEPTED',
          url: urlStr,
          method: rec.method,
          reqBody: rec.reqBody,
          data: parsed,
          capturedAt: rec.capturedAt
        },
        '*'
      );
    }
  }

  // Intercept native page XHR & fetch calls to api/v3/offer/product and ALL report/dashboard/gql APIs
  const origXhrOpen = window.XMLHttpRequest.prototype.open;
  const origXhrSend = window.XMLHttpRequest.prototype.send;
  window.XMLHttpRequest.prototype.open = function (method, url) {
    this.__drbReqMethod = String(method || 'GET').toUpperCase();
    this.__drbReqUrl = url;
    return origXhrOpen.apply(this, arguments);
  };
  window.XMLHttpRequest.prototype.send = function (body) {
    const urlStr = String(this.__drbReqUrl || '');
    const reqMethod = this.__drbReqMethod || 'GET';
    const reqBody = typeof body === 'string' ? body : null;
    const isOffer = isOfferDetailApiUrl(urlStr);
    const isReport = !isOffer && isReportApiUrl(urlStr);
    if (isOffer || isReport) {
      this.addEventListener('load', () => {
        if (this.status >= 200 && this.status < 300) {
          try {
            const parsed =
              this.responseType && this.responseType !== 'text' && typeof this.response === 'object'
                ? this.response
                : JSON.parse(this.responseText);
            if (isOffer) emitInterceptedOffer(urlStr, parsed);
            else emitInterceptedReport(urlStr, parsed, { method: reqMethod, body: reqBody });
          } catch (_e) {}
        }
      });
    }
    return origXhrSend.apply(this, arguments);
  };

  const origFetch = window.fetch;
  if (typeof origFetch === 'function') {
    window.fetch = async function (input, init) {
      const resp = await origFetch.apply(this, arguments);
      try {
        const reqUrl = typeof input === 'string' ? input : input?.url || '';
        const reqMethod = String(init?.method || (typeof input === 'object' && input?.method) || 'GET').toUpperCase();
        const reqBody = typeof init?.body === 'string' ? init.body : null;
        const isOffer = resp && resp.ok && isOfferDetailApiUrl(reqUrl);
        const isReport = resp && resp.ok && !isOffer && isReportApiUrl(reqUrl);
        if (isOffer || isReport) {
          resp
            .clone()
            .json()
            .then((parsed) => {
              if (isOffer) emitInterceptedOffer(reqUrl, parsed);
              else emitInterceptedReport(reqUrl, parsed, { method: reqMethod, body: reqBody });
            })
            .catch(() => {});
        }
      } catch (_e) {}
      return resp;
    };
  }

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
    if (!msg) return;
    if (msg.type === 'DRB_GET_CAPTURED_REQS' && msg.reqId) {
      window.postMessage(
        {
          type: 'DRB_GET_CAPTURED_REQS_RES',
          reqId: msg.reqId,
          requests: window.__drbCapturedReportReqs || []
        },
        '*'
      );
      return;
    }
    if (msg.type !== 'DRB_MAIN_WORLD_REQ' || !msg.reqId) return;

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

