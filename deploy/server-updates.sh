#!/usr/bin/env bash
# Keep this Ubuntu server patched automatically.
#
#   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy/server-updates.sh -o server-updates.sh && bash server-updates.sh
#
# What it sets up (safe to run again; it only rewrites its own files):
#  - unattended-upgrades installs ALL Ubuntu security and regular updates, plus updates from
#    the Node.js (NodeSource) and Caddy repositories, every 6 hours.
#    New Ubuntu releases and new Node major versions are never installed automatically.
#  - Services using an updated library are restarted automatically (needrestart).
#  - If an update needs a reboot (e.g. a new kernel), the server reboots at 3:30 am Sydney time.
#  - Old kernels and unused packages are cleaned up.
# This applies to everything on the server (every app and site), which is the point.
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
echo "Installing the update tools..."
apt-get update -qq
apt-get install -y -qq unattended-upgrades apt-listchanges needrestart >/dev/null

# Reboot window: 3:30 am in Sydney, expressed in this server's own clock (handles daylight saving at install time).
REBOOT_AT=$(TZ="$(cat /etc/timezone 2>/dev/null || timedatectl show -p Timezone --value 2>/dev/null || echo UTC)" date -d "TZ=\"Australia/Sydney\" 03:30" +%H:%M 2>/dev/null || echo "16:30")

# 1. Turn on automatic updates.
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
CONF

# 2. What to install and how. (Loaded after Ubuntu's 50unattended-upgrades, so these settings win.)
cat > /etc/apt/apt.conf.d/52auto-updates-local <<CONF
// Written by server-updates.sh. Edit that script and re-run it rather than this file.
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}";
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}:\${distro_codename}-updates";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
// Third-party repositories already on this server: Node.js (NodeSource) and Caddy.
Unattended-Upgrade::Origins-Pattern {
    "site=deb.nodesource.com";
    "site=dl.cloudsmith.io";
};
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-New-Unused-Dependencies "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-WithUsers "true";
Unattended-Upgrade::Automatic-Reboot-Time "${REBOOT_AT}";
Unattended-Upgrade::SyslogEnable "true";
// Keep config files you've changed when a package ships a new one.
Dpkg::Options {
    "--force-confdef";
    "--force-confold";
};
CONF

# 3. Restart services that use an updated library, without asking.
mkdir -p /etc/needrestart/conf.d
cat > /etc/needrestart/conf.d/auto-updates.conf <<'CONF'
# Written by server-updates.sh
$nrconf{restart} = 'a';
CONF

# 4. Check every 6 hours instead of Ubuntu's roughly-daily default (each with up to 30 minutes' jitter).
mkdir -p /etc/systemd/system/apt-daily.timer.d /etc/systemd/system/apt-daily-upgrade.timer.d
cat > /etc/systemd/system/apt-daily.timer.d/every-6-hours.conf <<'CONF'
[Timer]
OnCalendar=
OnCalendar=*-*-* 00,06,12,18:00
RandomizedDelaySec=30m
Persistent=true
CONF
cat > /etc/systemd/system/apt-daily-upgrade.timer.d/every-6-hours.conf <<'CONF'
[Timer]
OnCalendar=
OnCalendar=*-*-* 00,06,12,18:45
RandomizedDelaySec=30m
Persistent=true
CONF
systemctl daemon-reload
systemctl enable --now apt-daily.timer apt-daily-upgrade.timer unattended-upgrades >/dev/null 2>&1

# 5. Check the configuration, then install what's waiting now.
if ! unattended-upgrade --dry-run >/dev/null 2>&1; then
  echo "The update configuration didn't pass its check; see: unattended-upgrade --dry-run -d" >&2
  exit 1
fi
echo "Installing waiting updates now (this can take a few minutes)..."
unattended-upgrade -v || true

echo
echo "Done. Updates are checked every 6 hours and installed automatically."
echo "Reboots (only when an update needs one) happen at ${REBOOT_AT} server time = 3:30 am Sydney."
[[ -f /var/run/reboot-required ]] && echo "A reboot is already pending for earlier updates; it will happen at that time (or run: reboot)."
echo "Next checks:"
systemctl list-timers apt-daily.timer apt-daily-upgrade.timer --no-pager | head -4
echo "History: /var/log/unattended-upgrades/unattended-upgrades.log"
