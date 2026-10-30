# Hour Power website

The public website at www.hourpowerapp.cc. It is separate from the app: one self-contained page (`index.html`), served as a static file by Caddy on the Droplet. Nothing here is part of the Next.js build.

Publish or update it on the Droplet:

```bash
curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/site/install-site.sh | sudo bash
```

The first run adds a `www.hourpowerapp.cc` block to `/etc/caddy/Caddyfile` (backed up first) and turns on auto-update.

## Auto-update

A systemd timer (`hour-power-site-update.timer`) checks GitHub every 15 minutes. When `site/index.html` on `main` has changed, the Droplet downloads it and replaces the live page. It only copies the HTML page; it never runs code from GitHub. Merge a change to `site/index.html` and it is live within about 20 minutes (GitHub's raw file cache adds up to 5).

- Update now: `sudo hour-power-site-update`
- Last check: `journalctl -u hour-power-site-update -n 5`
- Turn it off: `sudo systemctl disable --now hour-power-site-update.timer` Cloudflare needs a `www` DNS record matching the main one.
