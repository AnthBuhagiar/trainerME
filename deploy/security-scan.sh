#!/usr/bin/env bash
# Weekly security check of this server. Writes a Markdown report and commits it to a
# GitHub repository (use a PRIVATE one: the report describes the server's weak spots).
# Installed and scheduled by install-security-scan.sh; settings in /etc/security-scan.env.
set -uo pipefail
source /etc/security-scan.env # LOG_REPO, LOG_BRANCH, GITHUB_TOKEN

DATE=$(date +%F)
HOST=$(hostname)
OUT=$(mktemp)
ATTENTION=()
add() { printf '%s\n' "$*" >>"$OUT"; }

add "# Server security check · $HOST · $DATE"
add ""
add "- **When:** $(date '+%a %d %b %Y %H:%M %Z')"
add "- **System:** $(. /etc/os-release && echo "$PRETTY_NAME") · kernel $(uname -r) · up $(uptime -p | sed 's/^up //')"

# 1. Updates
apt-get update -qq >/dev/null 2>&1
UPGRADABLE=$(apt-get -s -o Debug::NoLocking=1 dist-upgrade 2>/dev/null | grep -c '^Inst ')
SECURITY=$(apt-get -s -o Debug::NoLocking=1 dist-upgrade 2>/dev/null | grep '^Inst ' | grep -ci 'security')
add ""
add "## Updates"
add "- Waiting to install: **$UPGRADABLE** package(s), **$SECURITY** of them security fixes."
(( SECURITY > 0 )) && ATTENTION+=("$SECURITY security update(s) not yet installed")
LAST_RUN=$(grep -h 'Packages that will be upgraded\|No packages found that can be upgraded' /var/log/unattended-upgrades/unattended-upgrades.log 2>/dev/null | tail -1 | cut -c1-19)
add "- Automatic updates last ran: ${LAST_RUN:-never (run server-updates.sh)}"
if [[ -f /var/run/reboot-required ]]; then
  AGE_DAYS=$(( ($(date +%s) - $(stat -c %Y /var/run/reboot-required)) / 86400 ))
  add "- **Reboot pending** for $AGE_DAYS day(s): $(tr '\n' ' ' </var/run/reboot-required.pkgs 2>/dev/null | cut -c1-200)"
  (( AGE_DAYS >= 3 )) && ATTENTION+=("reboot pending for $AGE_DAYS days")
else
  add "- No reboot pending."
fi
if command -v pro >/dev/null; then
  add ""
  add "<details><summary>Ubuntu security status (pro security-status)</summary>"
  add ""
  add '```'
  pro security-status 2>/dev/null | head -40 >>"$OUT"
  add '```'
  add "</details>"
fi

# 2. What's listening to the internet
add ""
add "## Open ports (listening on all addresses)"
PUBLIC=$(ss -ltnupH 2>/dev/null | awk '{print $1, $5, $7}' | grep -vE ' (127\.0\.0\.1|\[::1\]|127\.0\.0\.53[0-9.]*|\[::ffff:127)' || true)
if [[ -n "$PUBLIC" ]]; then
  add '```'
  add "$PUBLIC"
  add '```'
  UNEXPECTED=$(echo "$PUBLIC" | awk '{print $2}' | sed -E 's/.*:([0-9]+)$/\1/' | grep -vxE '22|80|443' | sort -u | tr '\n' ' ')
  [[ -n "${UNEXPECTED// }" ]] && ATTENTION+=("open ports besides 22/80/443: $UNEXPECTED")
else
  add "None besides local-only services."
fi

# 3. Firewall and SSH
add ""
add "## Firewall and SSH"
if command -v ufw >/dev/null; then add "- Firewall (ufw): $(ufw status | head -1 | sed 's/Status: //')"; else add "- Firewall (ufw): not installed"; fi
SSHD=$(sshd -T 2>/dev/null)
PASS=$(echo "$SSHD" | awk '/^passwordauthentication/{print $2}')
ROOT=$(echo "$SSHD" | awk '/^permitrootlogin/{print $2}')
add "- SSH password logins: ${PASS:-unknown} · root login: ${ROOT:-unknown}"
[[ "$PASS" == "yes" ]] && ATTENTION+=("SSH accepts passwords (keys only is safer)")
FAILED=$(journalctl -u ssh -u sshd --since "-7 days" --no-pager 2>/dev/null | grep -c 'Failed password\|Invalid user' || true)
add "- Failed SSH login attempts in the last 7 days: $FAILED"

# 4. Hardening audit (Lynis)
add ""
add "## Hardening audit (Lynis)"
if command -v lynis >/dev/null; then
  lynis audit system --quick --no-colors --cronjob >/dev/null 2>&1
  R=/var/log/lynis-report.dat
  INDEX=$(grep '^hardening_index=' $R | cut -d= -f2)
  WARN=$(grep -c '^warning\[\]=' $R)
  SUGG=$(grep -c '^suggestion\[\]=' $R)
  add "- Hardening index: **${INDEX:-?}/100** · warnings: **$WARN** · suggestions: $SUGG"
  if (( WARN > 0 )); then
    add ""
    grep '^warning\[\]=' $R | cut -d= -f2 | awk -F'|' '{print "- " $1 ": " $2}' >>"$OUT"
    ATTENTION+=("$WARN Lynis warning(s)")
  fi
  add ""
  add "<details><summary>Suggestions</summary>"
  add ""
  grep '^suggestion\[\]=' $R | cut -d= -f2 | awk -F'|' '{print "- " $1 ": " $2}' | head -40 >>"$OUT"
  add "</details>"
else
  add "Lynis not installed."
fi

# 5. Disk
add ""
add "## Disk"
add "- Root filesystem: $(df -h / | awk 'NR==2{print $3 " used of " $2 " (" $5 ")"}')"
USE=$(df / | awk 'NR==2{gsub("%","",$5); print $5}')
(( USE >= 85 )) && ATTENTION+=("disk ${USE}% full")

# Summary at the top
if (( ${#ATTENTION[@]} )); then
  STATUS="⚠️ Needs attention: $(IFS='; '; echo "${ATTENTION[*]}")"
else
  STATUS="✅ All clear"
fi
sed -i "2i\\
\\
**$STATUS**" "$OUT"

# Commit the report and a line in the index, through the GitHub API (no git needed on the server).
api() { curl -fsS -H "Authorization: Bearer $GITHUB_TOKEN" -H "Accept: application/vnd.github+json" "$@"; }
put() { # path, file, message
  local sha
  sha=$(api "https://api.github.com/repos/$LOG_REPO/contents/$1?ref=$LOG_BRANCH" 2>/dev/null | python3 -c 'import json,sys; print(json.load(sys.stdin).get("sha",""))' 2>/dev/null || true)
  python3 - "$2" "$3" "$LOG_BRANCH" "$sha" >"$OUT.json" <<'PY'
import base64, json, sys
path, msg, branch, sha = sys.argv[1:5]
body = {"message": msg, "content": base64.b64encode(open(path, "rb").read()).decode(), "branch": branch}
if sha: body["sha"] = sha
print(json.dumps(body))
PY
  api -X PUT "https://api.github.com/repos/$LOG_REPO/contents/$1" -d @"$OUT.json" >/dev/null
}
REPORT_PATH="reports/$HOST/$DATE.md"
put "$REPORT_PATH" "$OUT" "Security check $HOST $DATE: $STATUS"
INDEX_FILE=$(mktemp)
api "https://api.github.com/repos/$LOG_REPO/contents/reports/$HOST/README.md?ref=$LOG_BRANCH" 2>/dev/null \
  | python3 -c 'import base64,json,sys; print(base64.b64decode(json.load(sys.stdin)["content"]).decode(), end="")' >"$INDEX_FILE" 2>/dev/null \
  || printf '# Security checks · %s\n\n| Date | Result |\n|---|---|\n' "$HOST" >"$INDEX_FILE"
printf '| [%s](%s.md) | %s |\n' "$DATE" "$DATE" "$STATUS" >>"$INDEX_FILE"
put "reports/$HOST/README.md" "$INDEX_FILE" "Security check index: $DATE"
echo "$STATUS → https://github.com/$LOG_REPO/blob/$LOG_BRANCH/$REPORT_PATH"
rm -f "$OUT" "$OUT.json" "$INDEX_FILE"
