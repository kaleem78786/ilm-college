#!/usr/bin/env bash
# Deploy the exact Docker artifact already built and browser-tested by CI.
set -Eeuo pipefail
fail() { printf 'Error: %s\n' "$*" >&2; exit 1; }
[[ $# -eq 3 ]] || fail 'Usage: deploy-image.sh IMAGE_ARCHIVE IMAGE_TAG COMMIT'
archive="$1"
image="$2"
commit="$3"
[[ "$commit" =~ ^[a-f0-9]{40}$ && "$image" == "ilm-college:$commit" ]] || fail 'Invalid commit/image tag.'
[[ "$archive" == /* && -f "$archive" && ! -L "$archive" ]] || fail 'An absolute, regular image archive is required.'
[[ "$(basename -- "$archive")" == image.tar ]] || fail 'Expected image.tar.'
command -v docker >/dev/null || fail 'Install Docker Engine on EC2 first; see docs/EC2-GUIDE.md.'
sudo -n true || fail 'This deployment requires passwordless sudo.'
exec 9>"$HOME/.ilm-college-deploy.lock"
flock -w 120 9 || fail 'Another deployment is still running.'
release_dir="$(dirname -- "$archive")"
script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
proxy_source="$script_dir/nginx-container-proxy.conf"
proxy_target=/etc/nginx/sites-available/ilm-college
[[ -f "$proxy_source" ]] || fail 'Missing companion nginx-container-proxy.conf.'
sudo -n test -f "$proxy_target" || fail 'Bootstrap host Nginx/TLS before container deployment.'
[[ -f "$release_dir/image.tar.sha256" ]] || fail 'Missing artifact checksum.'
(cd -- "$release_dir" && sha256sum --check image.tar.sha256)
sudo -n docker load --input "$archive"
sudo -n docker image inspect "$image" >/dev/null

current=ilm-college-web
backup=ilm-college-rollback
candidate="ilm-college-check-${commit:0:12}"
switched=0
finished=0
created_candidate=0
had_previous=0
proxy_changed=0
scratch="$(mktemp -d)"
cleanup() {
    if [[ "$created_candidate" == 1 ]]; then sudo -n docker rm -f "$candidate" >/dev/null 2>&1 || true; fi
    if [[ "$finished" != 1 && "$switched" == 1 ]]; then
        sudo -n docker rm -f "$current" >/dev/null 2>&1 || true
        if [[ "$had_previous" == 1 ]]; then
            sudo -n docker rename "$backup" "$current"
            sudo -n docker start "$current" >/dev/null
            printf 'Restored the previous website container.\n' >&2
        fi
    fi
    if [[ "$finished" != 1 && "$proxy_changed" == 1 ]]; then
        sudo -n install -m 644 "$scratch/previous.conf" "$proxy_target"
        sudo -n nginx -t && sudo -n systemctl reload nginx
        printf 'Restored the previous Nginx configuration.\n' >&2
    fi
    rm -rf -- "$scratch"
}
trap cleanup EXIT
sudo -n cp "$proxy_target" "$scratch/previous.conf"
printf 'events {}\nhttp { include %s; }\n' "$proxy_source" > "$scratch/check.conf"
sudo -n nginx -t -c "$scratch/check.conf"
options=(--read-only --tmpfs /var/cache/nginx --tmpfs /var/run --tmpfs /tmp
    --security-opt no-new-privileges:true --memory 192m --pids-limit 100
    --log-opt max-size=10m --log-opt max-file=3 --label app=ilm-college
    --label "revision=$commit")
sudo -n docker run -d --name "$candidate" -p 127.0.0.1::80 "${options[@]}" "$image" >/dev/null
created_candidate=1
port="$(sudo -n docker inspect --format '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}' "$candidate")"

healthy() {
    local base="$1" html revision
    shift
    local curl_options=("$@")
    for attempt in {1..20}; do
        if revision="$(curl "${curl_options[@]}" --fail --silent --max-time 3 "$base/version.txt")" &&
            [[ "$revision" == "$commit" ]] &&
            html="$(curl "${curl_options[@]}" --fail --silent --max-time 3 "$base/")" &&
            [[ "$html" == *'id="creatorPopup"'* && "$html" == *'ASAD BHUTTA'* ]]; then
            return 0
        fi
        sleep 1
    done
    return 1
}
healthy "http://127.0.0.1:$port" || { sudo -n docker logs "$candidate"; fail 'Candidate container failed health checks; production was untouched.'; }
sudo -n docker rm -f "$candidate" >/dev/null
created_candidate=0

if sudo -n docker container inspect "$current" >/dev/null 2>&1; then
    [[ "$(sudo -n docker inspect --format '{{index .Config.Labels "app"}}' "$current")" == ilm-college ]] ||
        fail 'Existing container name is not managed by this deployment.'
    if sudo -n docker container inspect "$backup" >/dev/null 2>&1; then
        [[ "$(sudo -n docker inspect --format '{{index .Config.Labels "app"}}' "$backup")" == ilm-college ]] || fail 'Unexpected rollback container.'
        sudo -n docker rm -f "$backup" >/dev/null
    fi
    sudo -n docker rename "$current" "$backup"
    had_previous=1
    switched=1
    sudo -n docker stop "$backup" >/dev/null
fi
switched=1
sudo -n docker run -d --name "$current" --restart unless-stopped -p 127.0.0.1:8080:80 "${options[@]}" "$image" >/dev/null
healthy http://127.0.0.1:8080 || { sudo -n docker logs "$current"; fail 'Production health check failed.'; }
proxy_changed=1
sudo -n install -m 644 "$proxy_source" "$proxy_target"
sudo -n nginx -t
sudo -n systemctl reload nginx
healthy https://lunphudi.com --resolve lunphudi.com:443:127.0.0.1 || fail 'HTTPS proxy failed the release check.'
finished=1
# Retain one stopped rollback container and its image; do not prune unrelated images.
previous_image=''
if [[ "$had_previous" == 1 ]]; then
    previous_image="$(sudo -n docker inspect --format '{{.Config.Image}}' "$backup")"
fi
while IFS= read -r tag; do
    if [[ "$tag" =~ ^ilm-college:[a-f0-9]{40}$ && "$tag" != "$image" && "$tag" != "$previous_image" ]]; then
        sudo -n docker image rm "$tag" >/dev/null 2>&1 || true
    fi
done < <(sudo -n docker image ls ilm-college --format '{{.Repository}}:{{.Tag}}')
# The loaded archive is reproducible from GitHub's retained CI artifact.
rm -f -- "$archive" "$release_dir/image.tar.sha256"
printf 'Deployed %s; container verified at localhost:8080.\n' "$commit"
