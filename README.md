# ILM College website

Static ILM College concept with an Asad Bhutta popup on each refresh. Edit the source in `site/`; Docker builds versioned CSS/JS into `dist/` and serves it with Nginx.

Production: [lunphudi.com](https://lunphudi.com), EC2 `54.81.201.196`. Host Nginx handles the valid Let's Encrypt certificate and proxies to Docker on `127.0.0.1:8080`. The GitHub Actions deployment workflow validates the built container and verifies the live revision; check the latest result in [Actions](https://github.com/kaleem78786/ilm-college/actions). `www` needs its DNS record and certificate expansion. Cloudflare **Full (strict)** setting has not been verified.

## Run locally

Docker Engine/Desktop must be running; having the Docker CLI alone is insufficient.

```bash
docker info
docker compose up --build -d
```

Open **http://localhost:8080**. Logs: `docker compose logs -f`; stop: `docker compose down`.

For a quick source preview without Docker:

```bash
python3 -m http.server 4173 --bind 127.0.0.1 --directory site
```

Open http://localhost:4173. Production uses the Docker build.

## Test and publish changes

Node.js 22+ is required for local test/build tooling; CI selects its own pinned setup.

```bash
npm ci
npm run test:static
npx playwright install chromium
BASE_URL=http://127.0.0.1:8080 npm run test:browser
```

Keep the Docker site running during the browser check. After editing, rebuild it with `docker compose up --build -d` before testing. `npm run build` creates `dist/` with hashed assets and `version.txt`; `dist/` is generated and ignored by Git.

```bash
git status
git add site/ scripts/ tests/ deploy/ Dockerfile docker-compose.yml package.json package-lock.json README.md docs/ .github/
git commit -m "Update college website"
git push origin main
```

GitHub Actions checks every push/PR. Successful checks on the current `main` commit deploy the **same tested Docker image** to EC2 using SSH, artifact checksums, container health checks and rollback on deployment failure. Other branches/PRs run validation. Check the run at [GitHub Actions](https://github.com/kaleem78786/ilm-college/actions); a Git push alone does not prove deployment succeeded. Production `/version.txt` must match the deployed commit.

## GitHub repository settings

Settings → Secrets and variables → Actions → Repository secrets:

| Secret | Value |
| --- | --- |
| `EC2_HOST` | `54.81.201.196` |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Complete private key, saved only as an Actions secret |
| `EC2_KNOWN_HOSTS` | Verified SSH host-key entry matching `54.81.201.196` |

Optional repository variable: `SITE_URL=https://lunphudi.com`. EC2 SSH must permit the runner's network source, and `ubuntu` needs passwordless sudo for deployment. This workflow uses SSH; AWS access-key secrets are not required. Existing unrelated secrets can remain in the account. Keep keys and `.env` files out of Git and release archives.

## Files

| File | Purpose |
| --- | --- |
| `site/index.html` | College content and popup markup |
| `site/style.css`, `site/script.js` | Design and interactions |
| `scripts/build-site.mjs` | Hashed assets and commit revision |
| `Dockerfile`, `docker-compose.yml` | Container build/local run |
| `.github/workflows/deploy.yml` | Validation and main deployment |
| `deploy/deploy-image.sh` | Checksum, health checks and rollback |
| `deploy/nginx-container-proxy.conf` | Host HTTP/TLS proxy to localhost Docker |

[EC2/CI guide](docs/EC2-GUIDE.md) includes current Docker deployment and archived manual instructions. [Content sources/licenses](docs/CONTENT-SOURCES.md) documents college information and assets. Applications remain with the college; this static site does not submit admissions to a backend. Confirm official campus details before institutional use.
