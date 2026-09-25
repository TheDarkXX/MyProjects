"""
Laya Fast Gatekeeper Daemon (Tier-1 Binary Triage)
Listens on http://127.0.0.1:5055/triage
Provides non-autoregressive signal vs noise screening before LLM synthesis.
"""

import sys
import io
import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

PORT = 5055

print("=" * 65)
print("🚀 [Laya Gatekeeper] Loading Laya Agent into memory...")
print("=" * 65)

from laya import Agent

t0 = time.time()
agent = Agent()
init_ms = (time.time() - t0) * 1000
device = getattr(agent, "device", "cpu")
print(f"✅ Laya Agent ready in {init_ms:.1f}ms on device: {device}")

# Define Tier-1 Binary Triage Questions
TRIAGE_QUESTIONS = {
    "is_noise": {
        "type": "noul",
        "instructions": "Is this article clickbait, retail hype, technical analysis charting, or 13F whale gossip without hard factual corporate actions?"
    },
    "is_macro": {
        "type": "noul",
        "instructions": "Is this headline about macroeconomic events such as Federal Reserve, interest rates, inflation, yields, tariffs, or broad economic shocks?"
    }
}

# Warm up
try:
    _ = agent.predict("Fed announces rate cut", TRIAGE_QUESTIONS)
    print("✅ Model warm-up completed successfully.")
except Exception as e:
    print(f"⚠️ Warm-up warning: {e}")


class LayaRequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("/health", "/status"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            resp = {
                "status": "ok",
                "model": "laya-rl-agent",
                "device": str(device),
                "port": PORT
            }
            self.wfile.write(json.dumps(resp).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == "/triage":
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)

            try:
                payload = json.loads(post_data.decode("utf-8"))
                items = payload.get("items", [])
                if not items:
                    self._send_json({"results": []})
                    return

                t_start = time.perf_counter()
                
                # Format texts for batching: "[TICKER] Headline"
                texts = [f"[{it.get('ticker', 'MKT')}] {it.get('title', '')}" for it in items]

                # Run parallel forward pass
                batch_res = agent.predict_batch(texts, TRIAGE_QUESTIONS)
                elapsed_ms = (time.perf_counter() - t_start) * 1000

                results = []
                for it, res in zip(items, batch_res):
                    ans = res.get("answers", {})
                    noise_ans = ans.get("is_noise", {})
                    macro_ans = ans.get("is_macro", {})

                    noise_prob = noise_ans.get("noul", 0.0)
                    macro_prob = macro_ans.get("noul", 0.0)

                    is_noise = noise_prob >= 0.50
                    is_macro = macro_prob >= 0.50

                    results.append({
                        "id": it.get("id"),
                        "ticker": it.get("ticker"),
                        "title": it.get("title"),
                        "is_noise": is_noise,
                        "noise_prob": round(float(noise_prob), 4),
                        "is_macro": is_macro,
                        "macro_prob": round(float(macro_prob), 4),
                        "triage_verdict": "NOISE" if is_noise else ("MACRO" if is_macro else "SIGNAL")
                    })

                self._send_json({
                    "success": True,
                    "count": len(results),
                    "elapsed_ms": round(elapsed_ms, 2),
                    "avg_ms_per_item": round(elapsed_ms / max(1, len(results)), 2),
                    "results": results
                })

            except Exception as ex:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                err_resp = {"success": False, "error": str(ex)}
                self.wfile.write(json.dumps(err_resp).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode("utf-8"))

    def log_message(self, format, *args):
        # Concise logging
        sys.stderr.write(f"[LayaServer] {self.address_string()} - {args[0]} - {args[1]}\n")


def run_server():
    server_address = ("127.0.0.1", PORT)
    httpd = HTTPServer(server_address, LayaRequestHandler)
    print(f"📡 [Laya Gatekeeper] Server running on http://127.0.0.1:{PORT}/triage")
    print("Press Ctrl+C to stop.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down Laya Gatekeeper...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
