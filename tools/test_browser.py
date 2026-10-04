#!/usr/bin/env python3
"""Drive the site in a real browser (headless Chrome over the DevTools protocol) and check
what a render sweep cannot: every page and every listed lesson works with no network,
M1 Understanding's flashcards, timed self-test and ledger, the lasair section working
offline, and the shared top bar at phone width.

    python3 tools/test_browser.py        # builds the site (tools/build.sh) and serves the
                                         # build under /jam-learning/, as Pages does

Needs Google Chrome (set CHROME to its path if it is not in the usual place). Chrome runs
as if on a plane: no host but 127.0.0.1 resolves, so a page that needs the internet fails
here. The offline check stops the local server and reloads pages, which only the service
worker can then answer. Stdlib only. One line per check; exit 0 when every check passes.
"""
import base64
import functools
import glob
import http.server
import json
import os
import socket
import struct
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
CHROME = os.environ.get("CHROME") or next(
    (p for p in ("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
                 "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser")
     if os.path.exists(p)), "google-chrome")

failures = []


def check(name, ok, detail=""):
    print("%s  %s%s" % ("ok  " if ok else "FAIL", name, ("  (%s)" % detail) if detail else ""))
    if not ok:
        failures.append(name)


# ---- a minimal RFC 6455 client, enough for the DevTools protocol ------------------
class WS:
    def __init__(self, url):
        host, rest = url.split("://", 1)[1].split("/", 1)
        h, p = host.split(":")
        self.s = socket.create_connection((h, int(p)), timeout=60)
        key = base64.b64encode(os.urandom(16)).decode()
        self.s.sendall(("GET /%s HTTP/1.1\r\nHost: %s\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
                        "Sec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n" % (rest, host, key)).encode())
        buf = b""
        while b"\r\n\r\n" not in buf:
            buf += self.s.recv(4096)
        self.buf = buf.split(b"\r\n\r\n", 1)[1]

    def _take(self, n):
        while len(self.buf) < n:
            self.buf += self.s.recv(1 << 16)
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def send(self, text):
        data, mask = text.encode(), os.urandom(4)
        n = len(data)
        head = bytes([0x81]) + (bytes([0x80 | n]) if n < 126 else
                                bytes([0x80 | 126]) + struct.pack(">H", n) if n < 65536 else
                                bytes([0x80 | 127]) + struct.pack(">Q", n))
        self.s.sendall(head + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        msg = b""
        while True:
            b0, b1 = self._take(2)
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack(">H", self._take(2))[0]
            elif n == 127:
                n = struct.unpack(">Q", self._take(8))[0]
            payload = self._take(n)
            op = b0 & 0x0F
            if op == 0x9:                       # ping: pong not needed by Chrome; skip
                continue
            msg += payload
            if b0 & 0x80:
                return msg.decode()


class Browser:
    def __init__(self):
        self.prof = tempfile.mkdtemp()
        with socket.socket() as s:
            s.bind(("127.0.0.1", 0))
            self.port = s.getsockname()[1]
        self.proc = subprocess.Popen(
            [CHROME, "--headless=new", "--use-mock-keychain", "--password-store=basic",
             "--disable-gpu", "--no-first-run", "--no-default-browser-check",
             "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1",     # no network
             "--user-data-dir=" + self.prof, "--remote-debugging-port=%d" % self.port, "about:blank"],
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        for _ in range(100):
            try:
                tabs = json.load(urllib.request.urlopen("http://127.0.0.1:%d/json" % self.port))
                self.ws = WS([t for t in tabs if t.get("type") == "page"][0]["webSocketDebuggerUrl"])
                break
            except Exception:
                time.sleep(0.2)
        self.n = 0
        self.events = []        # what the page reported since the last go()
        self.cdp("Page.enable")
        self.cdp("Runtime.enable")

    def cdp(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            m = json.loads(self.ws.recv())
            if "method" in m:
                self.events.append(m)
            if m.get("id") == self.n:
                if "error" in m:
                    raise RuntimeError("%s: %s" % (method, m["error"]))
                return m.get("result", {})

    def js(self, expr):
        r = self.cdp("Runtime.evaluate", expression=expr, awaitPromise=True, returnByValue=True)
        if "exceptionDetails" in r:
            raise RuntimeError(r["exceptionDetails"].get("exception", {}).get("description", "js error"))
        return r["result"].get("value")

    def wait(self, expr, secs=15):
        end = time.time() + secs
        while time.time() < end:
            try:
                if self.js(expr):
                    return True
            except RuntimeError:
                pass
            time.sleep(0.2)
        return False

    def go(self, url):
        self.events = []
        self.cdp("Page.navigate", url=url)
        return self.wait("document.readyState === 'complete'")

    def close(self):
        self.proc.kill()


class Quiet(http.server.SimpleHTTPRequestHandler):
    served = 0                      # responses sent: what a page view costs the host
    lock = threading.Lock()

    def send_response(self, *args, **kwargs):
        with Quiet.lock:
            Quiet.served += 1
        super().send_response(*args, **kwargs)

    def log_message(self, *args):
        pass


def serve():
    # test what readers get: the build, under the same sub-path as the Pages site
    out = tempfile.mkdtemp(prefix="jam-learning-test-")
    subprocess.run([os.path.join(ROOT, "tools", "build.sh"), os.path.join(out, "jam-learning")],
                   check=True, stdout=subprocess.DEVNULL)
    handler = functools.partial(Quiet, directory=out)
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, "http://127.0.0.1:%d/jam-learning/" % httpd.server_address[1]


# ---- the checks ------------------------------------------------------------------
def listed(section):
    course = json.load(open(os.path.join(SITE, section, "data", "course.json")))
    return ["%s/%s" % (t["id"], l["id"]) for t in course["tracks"]
            for l in t.get("lessons", []) + [l for s in t.get("sections", []) for l in s["lessons"]]]


def pages(b, base):
    # Every page as a reader on a plane gets it: no script error, no failed request, and no
    # request to another host. The one exception: a lecture's YouTube video, which needs
    # the internet by nature (its written notes must still load).
    local = (base.split("/jam-learning/")[0] + "/", "data:", "blob:")
    video = ("https://www.youtube.com/embed/",)
    b.cdp("Network.enable")                 # only here: it reports every request
    urls = ["lasair/lesson.html?lesson=011-graypaper-lectures/03-size-synchrony"]   # a lecture
    for path in sorted(glob.glob(os.path.join(SITE, "**", "*.html"), recursive=True)):
        page = os.path.relpath(path, SITE)
        urls.append(page + ("?lesson=" + listed(os.path.dirname(page))[0] if page.endswith("lesson.html") else ""))
    for page in urls:
        b.go(base + page)
        time.sleep(1.5)
        b.js("0")                           # collect what the page reported meanwhile
        sent = {e["params"]["requestId"]: e["params"]["request"]["url"]
                for e in b.events if e["method"] == "Network.requestWillBeSent"}
        problems = (["outside: " + u for u in sorted(set(sent.values()))
                     if not u.startswith(local + video)]
                    + ["failed: %s (%s)" % (sent.get(e["params"]["requestId"], "?"), e["params"]["errorText"])
                       for e in b.events if e["method"] == "Network.loadingFailed"
                       and not sent.get(e["params"]["requestId"], "").startswith(video)]
                    + ["error: " + e["params"]["exceptionDetails"].get("exception", {}).get(
                        "description", e["params"]["exceptionDetails"].get("text", "")).splitlines()[0]
                       for e in b.events if e["method"] == "Runtime.exceptionThrown"])
        check("no network: %s" % page, not problems, "; ".join(problems[:3]))
    b.cdp("Network.disable")


def lessons(b, base):
    # A lesson that fails to load says so in a warning callout; a rendered one has a body.
    rendered = """(() => { const b = document.getElementById('lesson-body');
                   if (!b) return null; if (b.querySelector('.callout-warning .callout-title') &&
                   /did not load|not found/i.test(b.innerText.slice(0, 300))) return 'failed';
                   return b.innerText.trim().length > 200 ? 'ok' : null; })()"""
    for section in ("lasair", "observability", "mixed-testnet"):
        paths = listed(section)
        bad = []
        for path in paths:
            b.go(base + section + "/lesson.html?lesson=" + path)
            b.wait("(%s) !== null" % rendered, 10)
            if b.js(rendered) != "ok":
                bad.append(path)
        check("every listed lesson renders: %s" % section, not bad,
              "%d lessons%s" % (len(paths), "; failed: " + ", ".join(bad[:5]) if bad else ""))
    # the sweep filled the worker's runtime cache: clear it so the offline check sees only
    # what the worker precaches
    b.go("about:blank")
    b.cdp("Storage.clearDataForOrigin", origin=base.split("/jam-learning/")[0],
          storageTypes="service_workers,cache_storage")
def flashcards(b, base):
    b.go(base + "lasair/exam.html")
    check("M1 Understanding loads its chapters",
          b.wait("document.querySelectorAll('#flash-chapter option').length > 5"))
    # each level, on the first chapter that has questions at that level (as a reader would)
    for level in (1, 2, 3, 4, 5):
        found = b.js("""(async () => {
            const c = document.getElementById('flash-chapter'), l = document.getElementById('flash-level');
            const card = document.getElementById('flash-card');
            for (const o of [...c.options]) {
                c.value = o.value; c.dispatchEvent(new Event('change', {bubbles: true}));
                l.value = '%d'; l.dispatchEvent(new Event('input', {bubbles: true}));
                l.dispatchEvent(new Event('change', {bubbles: true}));
                document.getElementById('flash-read').checked = %s;
                document.getElementById('flash-start').click();
                await new Promise(r => setTimeout(r, 150));
                if (!card.classList.contains('hidden') && card.textContent.trim().length > 20) return o.value;
            }
            return null; })()""" % (level, "true" if level == 1 else "false"))
        check("flashcards level %d: a card appears" % level, bool(found), "chapter %s" % found)
    # level 2 (multiple choice) with the keyboard: A answers, Enter moves on
    b.js("""(() => { const l = document.getElementById('flash-level'); l.value = '2';
             l.dispatchEvent(new Event('input', {bubbles: true})); l.dispatchEvent(new Event('change', {bubbles: true}));
             document.getElementById('flash-read').checked = false;
             document.getElementById('flash-start').click(); })()""")
    b.wait("document.querySelectorAll('#flash-card .exam-option').length > 0")
    before = b.js("document.querySelector('#flash-card .exam-card-count') ? "
                  "document.querySelector('#flash-card .exam-card-count').textContent : ''")
    b.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'a', bubbles: true}))")
    check("key A answers a multiple-choice card",
          b.wait("!!document.querySelector('#flash-card .exam-a:not(.hidden)')", 5))
    b.js("document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}))")
    check("Enter moves to the next card",
          b.wait("(document.querySelector('#flash-card .exam-card-count') || {}).textContent !== %s" % json.dumps(before), 5))


def run_through(b):
    b.js("document.querySelector('.exam-tab[data-tab=\"mock\"]').click()")
    b.js("window.confirm = () => true; window.alert = () => {};")
    b.js("document.getElementById('mock-timer') && (document.getElementById('mock-timer').checked = false);"
         "document.getElementById('mock-draw').click()")
    check("a run-through starts", b.wait("!document.getElementById('mock-run').classList.contains('hidden')"))
    for _ in range(400):
        if b.js("!document.getElementById('mock-result').classList.contains('hidden')"):
            break
        b.js("""(() => { const c = document.getElementById('mock-card');
                 const skip = document.getElementById('mock-skip'); if (skip) return skip.click();
                 const r = c.querySelector('[data-act="reveal"]:not([disabled])'); if (r) r.click();
                 const g = [...c.querySelectorAll('.grade-btn')].find(x => x.dataset.grade === 'P' && x.offsetParent !== null);
                 if (g) g.click(); })()""")
    check("a run-through finishes and says so",
          b.js("document.getElementById('mock-result').textContent.includes('Run-through complete')"))
    b.js("document.getElementById('mock-again').click(); document.getElementById('mock-draw').click()")
    b.wait("!document.getElementById('mock-run').classList.contains('hidden')")
    b.js("document.getElementById('mock-abort').click()")
    check("a run-through can be stopped",
          b.wait("!document.getElementById('mock-setup').classList.contains('hidden')", 5))


def ledger(b):
    b.js("document.querySelector('.exam-tab[data-tab=\"ledger\"]').click()")
    b.js("""window.__blobs = []; const B = window.Blob;
            window.Blob = function (parts, opts) { window.__blobs.push(parts.join('')); return new B(parts, opts); };
            window.__copied = null;
            Object.defineProperty(navigator, 'clipboard', {configurable: true,
              value: {writeText: (t) => { window.__copied = t; return Promise.resolve(); }}});
            window.confirm = () => true;""")
    b.js("document.getElementById('ledger-export').click()")
    md = b.js("window.__blobs[0] || ''")
    check("export writes the ledger as markdown",
          "Run-throughs" in md and "| " in md, "%d characters" % len(md))
    b.js("document.getElementById('ledger-copy').click()")
    check("copy puts the same markdown on the clipboard",
          b.wait("window.__copied !== null", 5) and b.js("window.__copied") == md)
    b.js("document.getElementById('ledger-clear').click()")
    check("clear empties the ledger",
          b.wait("!localStorage.getItem('examLedger') || JSON.parse(localStorage.getItem('examLedger')).length === 0", 5))


def offline(b, base, httpd):
    b.go(base + "lasair/index.html")
    course = json.load(open(os.path.join(SITE, "lasair", "data", "course.json")))
    lessons = sum(len(t.get("lessons") or [l for s in t.get("sections", []) for l in s["lessons"]])
                  for t in course["tracks"])
    cached = """(async () => { if (!navigator.serviceWorker.controller) {
                   await navigator.serviceWorker.ready; }
                 let n = 0; for (const k of await caches.keys()) n += (await (await caches.open(k)).keys()).length;
                 return n; })()"""
    ok = b.wait("(%s).then(n => n >= %d)" % (cached, lessons), 60)
    check("the service worker caches the shell and every lesson", ok, "%s cached, %d lessons" % (b.js(cached), lessons))
    # Online, a lesson costs a handful of requests: the worker re-downloads the course
    # (about 125 requests) at most once a day, not on every page view (GitHub Pages
    # rate-limits a reader who does).
    views, before = listed("lasair")[:5], Quiet.served
    for path in views:
        b.go(base + "lasair/lesson.html?lesson=" + path)
        b.wait("(document.getElementById('lesson-body') || {innerText: ''}).innerText.length > 200", 10)
        time.sleep(1)
    time.sleep(2)
    per_view = (Quiet.served - before) / len(views)
    check("reading a lesson online costs a handful of requests", per_view < 40, "%.0f per page view" % per_view)
    httpd.shutdown()
    httpd.server_close()
    b.go(base + "lasair/lesson.html?lesson=02-lasair-core/03-serialization")
    check("offline: a lesson still opens",
          b.wait("(document.getElementById('lesson-body') || {}).innerText && "
                 "document.getElementById('lesson-body').innerText.length > 1000", 20))
    b.go(base + "lasair/exam.html")
    check("offline: M1 Understanding still opens",
          b.wait("document.querySelectorAll('#flash-chapter option').length > 5", 20))


def phone(b, base):
    b.cdp("Emulation.setDeviceMetricsOverride", width=390, height=844, deviceScaleFactor=2, mobile=True)
    for page in ("index.html", "mixed-testnet/index.html", "lasair/lesson.html?lesson=01-jam-protocol/01-what-is-jam",
                 "observability/index.html", "lasair/exam.html"):
        b.go(base + page)
        b.wait("!!document.querySelector('.nav-menu')", 5)
        fits = b.js("document.documentElement.scrollWidth <= innerWidth")
        b.js("document.querySelector('.nav-menu').click()")
        opens = b.wait("document.getElementById('site-nav').classList.contains('open')", 3)
        check("phone width: %s fits and its menu opens" % page, bool(fits) and opens,
              "scrollWidth %s, innerWidth %s" % (b.js("document.documentElement.scrollWidth"), b.js("innerWidth")))
    b.cdp("Emulation.clearDeviceMetricsOverride")


def main():
    httpd, base = serve()
    b = Browser()
    try:
        pages(b, base)
        lessons(b, base)
        flashcards(b, base)
        run_through(b)
        ledger(b)
        phone(b, base)
        offline(b, base, httpd)             # last: it stops the server
    finally:
        b.close()
    print("%d check(s) failed" % len(failures) if failures else "all checks passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
