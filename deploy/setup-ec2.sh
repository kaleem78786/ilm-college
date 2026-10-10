#!/usr/bin/env bash
# Run on the Ubuntu EC2 instance, from the uploaded project.
set -Eeuo pipefail

fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
host="${1:-}"
[[ $# -eq 1 && "$host" =~ ^[A-Za-z0-9][A-Za-z0-9.-]*[A-Za-z0-9]$ ]] ||
    fail 'Usage: bash deploy/setup-ec2.sh PUBLIC_IPV4_OR_DOMAIN (no http:// or /).'

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
site_dir="$(dirname -- "$script_dir")/site"
target=/var/www/ilm-college
available=/etc/nginx/sites-available/ilm-college
enabled=/etc/nginx/sites-enabled/ilm-college

for asset in index.html style.css script.js; do
    [[ -f "$site_dir/$asset" ]] || fail "Missing $site_dir/$asset"
done
[[ -f "$script_dir/nginx.conf" ]] || fail 'Missing deploy/nginx.conf.'
[[ -z "$(find "$site_dir" -type l -print -quit)" ]] || fail 'site/ must not contain symbolic links.'
command -v sudo >/dev/null || fail 'Run this on Ubuntu with sudo installed.'
# EC2 can have mixed sudoers entries: sudo -v asks for a password even when
# individual commands are permitted with NOPASSWD. Probe a command first.
if ! sudo -n true 2>/dev/null; then
    [[ -t 0 ]] || fail 'Passwordless sudo is required over noninteractive SSH; run interactively with a sudo-enabled account.'
    sudo -v
fi
sudo apt-get update
sudo apt-get install -y nginx rsync curl

[[ ! -L "$target" ]] || fail "$target is a symbolic link; check it manually."
if sudo test -e "$target"; then
    sudo test -d "$target" || fail "$target is not a directory."
    sudo test -f "$target/.ilm-college-managed" ||
        fail "$target already exists and was not created by this script."
fi
if sudo test -e "$enabled" || sudo test -L "$enabled"; then
    [[ "$(sudo readlink "$enabled")" == "$available" ]] ||
        fail "$enabled already exists with an unexpected target."
fi

# Validate the existing server and the proposed virtual host before enabling it.
sudo nginx -t
scratch="$(mktemp -d)"
trap 'rm -rf -- "$scratch"' EXIT
sed "s/__SERVER_HOST__/$host/g" "$script_dir/nginx.conf" > "$scratch/site.conf"
cat > "$scratch/check.conf" <<EOF
events {}
http {
    include /etc/nginx/mime.types;
    include $scratch/site.conf;
}
EOF
sudo nginx -t -c "$scratch/check.conf"

# Only this dedicated, script-managed website directory is synchronised.
sudo install -d -m 755 "$target"
sudo touch "$target/.ilm-college-managed"
sudo rsync -a --delete --exclude=.ilm-college-managed --chown=root:root \
    "$site_dir/" "$target/"
sudo find "$target" -type d -exec chmod 755 {} +
sudo find "$target" -type f -exec chmod 644 {} +

created_config=0
created_link=0
if ! sudo test -e "$available"; then
    sudo install -m 644 "$scratch/site.conf" "$available"
    created_config=1
else
    printf 'Keeping existing Nginx configuration (domain/HTTPS edits preserved).\n'
fi
if ! sudo test -L "$enabled"; then
    sudo ln -s "$available" "$enabled"
    created_link=1
fi
if ! sudo nginx -t; then
    [[ "$created_link" -eq 0 ]] || sudo rm -- "$enabled"
    [[ "$created_config" -eq 0 ]] || sudo rm -- "$available"
    fail 'Nginx validation failed; new configuration was rolled back.'
fi
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl reload nginx
# Reload is asynchronous; confirm this site's content, not just any 200 page.
verified=0
for attempt in {1..10}; do
    if curl --fail --silent --show-error --max-time 5 -H "Host: $host" \
        http://127.0.0.1/ > "$scratch/page.html" &&
        cmp --silent "$site_dir/index.html" "$scratch/page.html"; then
        verified=1
        break
    fi
    sleep 1
done
[[ "$verified" -eq 1 ]] || fail 'Nginx responded, but the expected ILM page was not served; check server_name.'
printf '\nDeployment applied. Local HTTP response:\n'
curl --fail --silent --show-error --head -H "Host: $host" http://127.0.0.1/
printf '\nOpen http://%s/ in your browser and verify ILM College appears.\n' "$host"
printf 'If your public IP changed, update server_name in %s first.\n' "$available"
