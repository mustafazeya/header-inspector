# Header Inspector

A tiny Express service to inspect common and custom HTTP headers. Useful for debugging proxies, load balancers, and CDNs.

## Features
- Collects common headers like `x-forwarded-for`, `x-forwarded-host`, `x-real-ip`, `forwarded`, `user-agent`, etc.
- Parses `x-forwarded-for` and `forwarded` (RFC 7239) into structured lists.
- Allows capturing any custom headers via `?include=header1,header2`.
- Simple echo endpoint to see request body and headers.
- Containerized with a small Docker image.

## Endpoints
- `GET /` – health check.
- `GET /headers?include=x-custom-1,x-custom-2` – returns common + listed custom headers.
- `POST /echo?include=...` – same as above and includes the request body.
- `ANY /*` – catch-all that returns the same header report.

## Quick start

### Local
```bash
# Install deps
npm install

# Run
npm start
# -> http://localhost:3000/headers
```

Optional dev mode with autoreload:
```bash
npm run dev
```

### Docker
```bash
# Build
docker build -t header-inspector .

# Run
docker run --rm -p 3000:3000 header-inspector
# -> http://localhost:3000/headers
```

Multi-arch (linux/amd64 + linux/arm64) publish to Docker Hub:
```bash
# Set your image (defaults to theflawedwarrior/header-inspector via package.json config)
export DOCKER_IMAGE=theflawedwarrior/header-inspector

# One command to build and push both platforms
npm run docker:publish
```

CI/CD: A GitHub Actions workflow `.github/workflows/docker-publish.yml` is included to build and push multi-arch images on push to main/master. Set repository secrets `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`.

### Include custom headers
```bash
curl -s "http://localhost:3000/headers?include=x-foo,x-bar" \
  -H 'X-Foo: 123' -H 'X-Bar: abc'
```

To include certain headers by default without adding `?include=...` each time, set `DEFAULT_COMMON_HEADERS` (comma-separated, case-insensitive). Example:

```bash
DEFAULT_COMMON_HEADERS=sec-ch-ua,sec-ch-ua-mobile,sec-ch-ua-platform npm start
```

## Configuration
- `PORT` – Port to listen on (default 3000)
- `TRUST_PROXY` – Express trust proxy setting (default `loopback`). Set to `true` or a subnet like `10.0.0.0/8` if behind a proxy to populate `req.ips`.
- `DEFAULT_COMMON_HEADERS` – Comma-separated list of extra header names to include in `commonHeaders` automatically.

## Notes
- The service lower-cases header names in outputs for consistency.
- Common header keys are surfaced in `commonHeaders`. Everything received is in `allHeaders`.
- If you don’t see `x-forwarded-*` or `forwarded` headers locally, it’s expected: your browser doesn’t send them; proxies/load balancers add them. Use a proxy/CDN or set them manually with curl when testing.

## License
MIT
