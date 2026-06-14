TURN Server Setup (coturn)

This project supports TURN servers for WebRTC traversal. Provide TURN credentials via environment variables:

- `NEXT_PUBLIC_TURN_URL` - TURN server URL, e.g. `turn:your.turn.server:3478`
- `NEXT_PUBLIC_TURN_USER` - TURN username
- `NEXT_PUBLIC_TURN_PASS` - TURN password

Recommended steps to deploy coturn on a Linux server:

1. Install coturn:

```bash
sudo apt update
sudo apt install coturn
```

2. Configure `/etc/turnserver.conf` with your realm, listening IP, and credentials. Example additions:

```
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=<YOUR_SECRET>
realm=yourdomain.com
cert=/path/to/fullchain.pem
pkey=/path/to/privkey.pem
no-multicast-peers

# optional: limit users or integrate with DB
```

3. Start coturn as a service:

```bash
sudo systemctl enable coturn
sudo systemctl start coturn
```

4. Generate TURN credentials and set the env vars in your frontend build or runtime environment, for example in `.env` or your hosting provider's env configuration.

Notes:
- Using a TURN server is required for reliable connections across symmetric NATs.
- Do not expose TURN credentials in public client-side code; provide them via secure runtime config or use short-lived credentials.
