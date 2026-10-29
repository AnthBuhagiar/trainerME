# Hour Power website

The public website at www.hourpowerapp.cc. It is separate from the app: one self-contained page (`index.html`), served as a static file by Caddy on the Droplet. Nothing here is part of the Next.js build.

Publish or update it on the Droplet:

```bash
curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/site/install-site.sh | sudo bash
```

The first run adds a `www.hourpowerapp.cc` block to `/etc/caddy/Caddyfile` (backed up first). Later runs just replace the page. Cloudflare needs a `www` DNS record matching the main one.
