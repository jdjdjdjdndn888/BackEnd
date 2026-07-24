const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

const routes = require("./routes/routes");
const socketHandler = require("./socket/handler");
const { startup } = require("./startup");
const {
  ipBlocklist,
  corsOptions,
  isAllowedOrigin,
  originGuard,
  globalLimiter,
  speedLimiter,
} = require("./middleware/security");

const app = express();
const server = http.createServer(app);

// ── Connection-level timeouts ────────────────────────────────────────────────
// Node's defaults leave connections open indefinitely, which lets slowloris-
// style attacks hold sockets open forever. These cut off stragglers:
//   headersTimeout  – drop connections that never finish sending their headers
//   requestTimeout  – drop connections that never finish sending the body
//   keepAliveTimeout – close idle keep-alive connections sooner (default 5 s is
//                      fine here; Cloudflare/Render proxies add their own idle
//                      timeouts on top of this)
server.headersTimeout  = 15_000;  // 15 s to complete headers
server.requestTimeout  = 30_000;  // 30 s to complete the full request
server.keepAliveTimeout = 65_000; // slightly above Cloudflare's 60 s idle close

const io = new Server(server, {
  cors: {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"],
  },
  // Volumetric protection for the realtime layer: cap payload size, force
  // clients to complete the handshake quickly, and drop long-idle sockets.
  maxHttpBufferSize: 1e5, // 100kb — no reason a client should send more
  pingTimeout: 20000,
  pingInterval: 25000,
  connectTimeout: 10000,
});

app.set("io", io);
// Behind two reverse proxies in production (Cloudflare → Render), so
// req.ip reflects the real client IP for rate limiting — required for
// express-rate-limit / express-slow-down to key on the right address.
// If Cloudflare is ever removed, drop this back to 1.
app.set("trust proxy", 2);

// Blocklist first — reject known-bad IPs before spending any more work on them.
app.use(ipBlocklist);

// Security headers (hides framework fingerprint, sets HSTS, disables sniffing, etc.)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  // Disable helmet's CSP defaults so our explicit directives are the only ones set
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:     ["'none'"],
      scriptSrc:      ["'none'"],
      styleSrc:       ["'none'"],
      imgSrc:         ["'none'"],
      connectSrc:     ["'self'"],
      frameAncestors: ["'none'"],
      formAction:     ["'none'"],
      baseUri:        ["'none'"],
    },
  },
}));
// Helmet v8 hard-sets X-XSS-Protection: 0 — override to 1; mode=block so
// older browsers activate their built-in XSS filter instead of disabling it.
app.use((_req, res, next) => {
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(cors(corsOptions));

// Static SAB pet images — served publicly so the frontend can load them in <img> tags.
// Must be registered BEFORE originGuard so image requests (which don't carry an Origin
// header) are served without being caught by the auth gate.
const path = require("path");
app.use("/sab-images", express.static(path.join(__dirname, "public", "sab-images"), {
  maxAge: "7d",
  setHeaders(res) {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  },
}));

// Image proxy — fetches item images from petsimulatorvalues.com with the
// correct browser headers to bypass their hotlink protection, then streams
// the result to the client. Registered before originGuard so the frontend
// can load images without carrying an auth header.
app.get("/img-proxy", async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith("https://petsimulatorvalues.com/")) {
    return res.status(400).send("Bad request");
  }
  try {
    const https = require("https");
    const proxyReq = https.get(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Referer": "https://petsimulatorvalues.com/",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    }, (imgRes) => {
      if (imgRes.statusCode !== 200) {
        res.status(imgRes.statusCode || 502).send("Upstream error");
        imgRes.resume();
        return;
      }
      res.setHeader("Content-Type", imgRes.headers["content-type"] || "image/png");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      imgRes.pipe(res);
    });
    proxyReq.on("error", () => res.status(502).send("Proxy error"));
    proxyReq.on("timeout", () => { proxyReq.destroy(); res.status(504).send("Proxy timeout"); });
  } catch {
    res.status(500).send("Internal error");
  }
});

// Hard origin guard — blocks any request that isn't from the approved frontend
// origin, the Roblox bot scripts (Bearer JWT), or the Discord bot announce path.
app.use(originGuard);

// Cap request body size so someone can't DoS the process with huge payloads.
app.use(express.json({ limit: "256kb" }));

// Collapse double (or triple) leading slashes in the path so bot scripts that
// concatenate a trailing-slash base URL with a leading-slash route segment
// (e.g. "https://api.gemtide.win/" + "/trading/items/check-pending") still
// match the registered routes correctly.
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/\/+/g, '/');
  next();
});

app.use((req, _res, next) => {
  req.startTime = Date.now();
  next();
});

// Progressive slow-down first (adds latency to abusive IPs), then a hard
// ceiling that actually rejects requests once they go too far.
app.use(speedLimiter);
app.use(globalLimiter);

app.use("/", routes);

socketHandler(io);

const { mongoUri, port: PORT } = require("./config.js");

if (!mongoUri) {
  console.error("MONGODB_URI environment variable is not set.");
  process.exit(1);
}

mongoose
  .connect(mongoUri, { dbName: "petflippy" })
  .then(() => {
    console.log("Connected to MongoDB");

    try {
      startup(io).catch((err) =>
        console.error("Startup error (non-fatal):", err)
      );
    } catch (err) {
      console.error("Startup invocation error (non-fatal):", err);
    }

    try {
      require("./bot");
      console.log("Discord bot loaded");
    } catch (err) {
      console.error("Discord bot failed to load:", err.message);
    }

    server.listen(PORT, "0.0.0.0", () => {
      console.log(`BloxySpin API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
    process.exit(1);
  });
