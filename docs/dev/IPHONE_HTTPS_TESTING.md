# Testing IQDI Wallet on an iPhone over a temporary HTTPS link

**TEST ONLY.** Synthetic data. A Cloudflare Quick Tunnel URL is temporary and public. It is **not** a deployment and not fit for production: anyone who has the URL can open the demo while the tunnel runs.

## What was wrong

1. **«تعذّر عرض البيانات — حدث خطأ غير متوقع» on the requests page.**
   - Cause: every API call created its `X-Request-Id` with `crypto.randomUUID()`. Browsers only provide that in a secure context (HTTPS or localhost), and Safari only from 15.4. Over `http://192.168.0.186:5173` it is `undefined`, so each request threw before being sent.
   - Fix: `randomRequestId()` in `packages/api-client/src/transport.ts` falls back to `crypto.getRandomValues`, which exists in every context.
2. **Approve/reject would be refused behind a tunnel or on the LAN.**
   - Cause: the demo API refuses POSTs whose `Origin` is not loopback (TASK-12 cross-site protection). The Vite proxy forwarded the phone's Origin unchanged.
   - Fix: the wallet's proxy now presents **same-origin** requests (Origin host = Host header) to the API as loopback. A foreign Origin is still forwarded and refused.
3. **Vite blocks unknown host names**, such as `*.trycloudflare.com` («Blocked request»).
   - Fix: hosts are allowed only when you opt in with `IQDI_ALLOWED_HOSTS`. Unlisted hosts stay blocked.

## Steps on Windows (PowerShell, in the project folder)

**Terminal 1: demo API**
```powershell
npm run dev:mock
```

**Terminal 2: wallet, allowing the tunnel host name**
```powershell
$env:IQDI_ALLOWED_HOSTS = ".trycloudflare.com"
npm run dev:wallet
```

**Terminal 3: temporary HTTPS tunnel** (no account needed). Install the Cloudflare tunnel tool once with `winget install --id Cloudflare.cloudflared`, then:
```powershell
cloudflared tunnel --url http://127.0.0.1:5173
```
It prints a line like `https://<random-words>.trycloudflare.com`. Open that URL in Safari on the iPhone. The certificate is Cloudflare's and is trusted, so nothing needs installing on the phone.

**Check from the PC first:**
- `https://<random-words>.trycloudflare.com/` should show the wallet;
- `https://<random-words>.trycloudflare.com/demo-api/v1/health` should return `{"status":"ok","environment":"DEMO",...}`.

**LAN alternative without a tunnel** (plain HTTP; works after fix 1):
```powershell
$env:IQDI_DEV_HOST = "0.0.0.0"
npm run dev:wallet
```
Then open `http://192.168.0.186:5173`. Windows Firewall may ask once to allow Node.js on private networks.

## Stopping the temporary link

1. In Terminal 3, press **Ctrl+C**. The `trycloudflare.com` URL stops working immediately; a new run gets a new random URL.
2. Stop the wallet and the API the same way (Ctrl+C in Terminals 2 and 1).
3. Remove the environment variables (they only last for that PowerShell window):
   ```powershell
   Remove-Item Env:IQDI_ALLOWED_HOSTS, Env:IQDI_DEV_HOST -ErrorAction SilentlyContinue
   ```

Never put real personal data into the demo while a tunnel is open.
