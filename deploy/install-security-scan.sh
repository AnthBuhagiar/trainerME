#!/usr/bin/env bash
# Install the weekly security check (run as root):
#   curl -fsSL https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy/install-security-scan.sh -o install-security-scan.sh \
#     && bash install-security-scan.sh AnthBuhagiar/server-security-log
# The argument is the GitHub repository the reports go to: make it PRIVATE.
# You'll be asked for a GitHub token that can write to that repository only
# (fine-grained token: Repository access = that repo, Permissions > Contents = Read and write).
set -euo pipefail
REPO="${1:?Usage: bash install-security-scan.sh OWNER/REPO}"
BRANCH="${2:-main}"
RAW="https://raw.githubusercontent.com/AnthBuhagiar/trainerME/main/deploy"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq && apt-get install -y -qq lynis curl python3 >/dev/null

read -rsp "GitHub token for $REPO (hidden): " TOKEN; echo
# Check the token can see the repository, and warn if the repository is public.
VIS=$(curl -fsS -H "Authorization: Bearer $TOKEN" "https://api.github.com/repos/$REPO" | python3 -c 'import json,sys; print("private" if json.load(sys.stdin)["private"] else "public")') \
  || { echo "That token can't reach $REPO. Check the repository name and the token's access." >&2; exit 1; }
if [[ "$VIS" == "public" ]]; then
  echo "WARNING: $REPO is public. Reports describe this server's weak spots; use a private repository." >&2
  read -rp "Continue anyway? (type yes): " OK
  [[ "$OK" == "yes" ]] || exit 1
fi

umask 077
cat > /etc/security-scan.env <<ENV
LOG_REPO=$REPO
LOG_BRANCH=$BRANCH
GITHUB_TOKEN=$TOKEN
ENV
unset TOKEN

mkdir -p /opt/security-scan
curl -fsSL -o /opt/security-scan/scan.sh "$RAW/security-scan.sh" && chmod 700 /opt/security-scan/scan.sh
curl -fsSL -o /etc/systemd/system/security-scan.service "$RAW/security-scan.service"
curl -fsSL -o /etc/systemd/system/security-scan.timer "$RAW/security-scan.timer"
systemctl daemon-reload
systemctl enable --now security-scan.timer >/dev/null

echo "Running the first check now (Lynis takes a minute or two)..."
/opt/security-scan/scan.sh
echo
echo "Scheduled weekly: $(systemctl list-timers security-scan.timer --no-pager | sed -n 2p | awk '{print $1, $2, $3}')"
