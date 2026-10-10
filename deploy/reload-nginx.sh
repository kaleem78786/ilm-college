#!/usr/bin/env bash
# Install as /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh (mode 755).
set -euo pipefail
/usr/sbin/nginx -t
/usr/bin/systemctl reload nginx
