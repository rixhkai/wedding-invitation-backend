import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from '@hono/node-server/serve-static';
import { env } from 'hono/adapter';
import "dotenv/config";
import { prettyJSON } from 'hono/pretty-json';
import gift from './api/gift/gift.js';
import rsvp from './api/rsvp/rsvp.js';
import user from './api/user/user.js';
import r2Cloudflare from './api/r2-cloudflare/r2-cloudflare.js';
import comments from './api/comments/comments.js';
import WebSocket, { WebSocketServer } from 'ws';
import { sql } from './helper/utility.js';


// const require = createRequire(import.meta.url);
// const multer = require("multer");
// const path = require("path");
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

export const wss = new WebSocketServer({
  port: 3070,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
});

// export const connection: WebSocket[] = [];
wss.on('connection', (stream) => {
  console.log('someone connect', stream);
  // connection.push(stream);
})

wss.on('close', (ws: WebSocket) => {
  console.log('disconnect connection', ws)
})

// const { unsubscribe } = await sql.subscribe('insert:comment',
//   (row) => {
//     // Callback function for each row change
//     // tell about new event row over eg. websockets or do something else
//     console.log('subscribe insert comment ', row);
//     wss.on('listening', (ws: WebSocket) => {
//       ws.send(JSON.stringify({data: row && row[0] ? row : null}));
//     })
//   },
//   () => {
//     // Callback on initial connect and potential reconnects
//   }
// )


const app = new Hono()
const parentRouteAPI = '/api/v1/';
app.use(prettyJSON());
app.use(`${ parentRouteAPI }*`, cors());
app.route(`${ parentRouteAPI }gift`, gift);
app.route(`${ parentRouteAPI }user`, user);
app.route(`${ parentRouteAPI }rsvp`, rsvp);
app.route(`${ parentRouteAPI }r2`, r2Cloudflare);
app.route(`${ parentRouteAPI }comment`, comments);

// const upload = multer({ storage: multer.memoryStorage() });

app.get("/", serveStatic({
  root: './',
  rewriteRequestPath: (path) => {
    return path.replace('/', 'src/templates')
  }
    
  })
);

// app.get('/env', (c) => {
//   // NAME is process.env.NAME on Node.js or Bun
//   // NAME is the value written in `wrangler.toml` on Cloudflare
//   const res = env<{ NAME: string }>(c, 'node')
//   console.log('check name ', res.NAME, process.env.PORT)
//   return c.text('what')
// })

serve({
  fetch: app.fetch,
  port: +process.env.PORT! || 3000
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
