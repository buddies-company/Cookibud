# Deploy Cookibud with Docker Compose

This guide shows how to build and deploy the Cookibud stack (API, frontend, and MongoDB) using Docker and Docker Compose. It focuses on a production-oriented workflow where application images can be updated while MongoDB data is preserved across deployments.

Contents
- What you get
- Files added
- Quick start (local)
- Build and push images (CI / production)
- Rolling updates while preserving database data
- Backups and restores
- Notes & troubleshooting

What you get
- `docker-compose.yml` — orchestrates three services: `mongo`, `api`, `front`.
- `cookibud-api/Dockerfile` — builds the FastAPI backend and runs uvicorn.
- `cookibud-front/Dockerfile` + `nginx.conf` — builds the SPA and serves it with nginx; nginx proxies `/api/` to the backend in the compose network.

Important design decision: persistent MongoDB data
- The compose file uses a named volume `cookibud-mongo-data` mounted at `/data/db` inside the MongoDB container. A Docker volume lives outside the container lifecycle, so recreating or updating images will not remove your database contents.

Quick start (local development / testing)
1. Build and start the stack (from repository root):
Make sure you added `.npmrc` file based on template inside `cookibud-front`
```powershell
# Windows (cmd/powershell)
docker compose up --build -d
```

2. Open the frontend in your browser at:
- http://localhost:5173

3. API will be reachable at:
- http://localhost:8000 (and OpenAPI docs at http://localhost:8000/docs)

4. MongoDB will be exposed on port 27017 (only recommended for local dev):
- mongodb://localhost:27017

Build and push images (CI / production)
- In production you typically build artifacts in CI and push to a registry (Docker Hub, AWS ECR, GCR, etc.). Then the server pulls the new images and restarts services.

Example CI steps (high-level):
- Build `cookibud-api` image and tag `registry.example.com/cookibud-api:sha-...`
- Build `cookibud-front` image and tag `registry.example.com/cookibud-front:sha-...`
- Push images to registry.
- On the server, update a `docker-compose.prod.yml` that references the pushed images (instead of building locally), then `docker compose pull && docker compose up -d`.

A minimal `docker-compose.prod.yml` could look like:

```yaml
version: '3.8'
services:
  mongo:
    image: mongo:6.0
    volumes:
      - cookibud-mongo-data:/data/db
  api:
    image: registry.example.com/cookibud-api:sha-...
    environment:
      - MONGO_URI=mongodb://mongo:27017/cookibud
    depends_on: [mongo]
  front:
    image: registry.example.com/cookibud-front:sha-...
    depends_on: [api]
volumes:
  cookibud-mongo-data:
```

Rolling updates while keeping MongoDB data
- Do NOT remove the `cookibud-mongo-data` volume. Volumes are persistent and can be reused by new containers. Updating the `api` or `front` service images will not touch this data.

Recommended update flow (zero/minimal downtime):
1. Build and push new images in CI.
2. On the server: `docker compose -f docker-compose.prod.yml pull` to fetch new images.
3. `docker compose -f docker-compose.prod.yml up -d --no-deps --build api` (or front) to recreate only that service.
4. Alternatively, `docker compose -f docker-compose.prod.yml up -d` will recreate changed services; `mongo` will not be recreated because its image hasn't changed and volume persists.

If you must replace the mongo image (rare), make sure to create a backup with `mongodump` first (see below).

Backups and restores
- Backup with `mongodump` (runs inside a mongo helper container or from host if mongod tools installed):

```powershell
# create a dump to ./backup
docker run --rm --network host -v %cd%/backup:/backup mongo:6.0 bash -c "mongodump --host mongodb://localhost:27017 --out /backup/$(date +%F)"
```

- Restore with `mongorestore`:

```powershell
docker run --rm --network host -v %cd%/backup:/backup mongo:6.0 bash -c "mongorestore --host mongodb://localhost:27017 /backup/<date>/"
```

If you're using a remote server where Docker Compose services are on a user-defined network (not host), replace `--network host` and `localhost` with the compose network and container name (e.g., `mongodb://mongo:27017`).

Preloading data into the image (not recommended for ongoing data)
- If you want an image that already contains initial seed data, you can bake a `mongorestore` into an image build. This is useful for initial demo images but not for production data you intend to update. Prefer using volumes and separate backup/restore instead.

Production best practices
- Use a managed MongoDB (Atlas, DocumentDB) for high availability in production, or run a MongoDB replica set with separate data volumes and proper backup schedule.
- Don't expose MongoDB on the public interface (avoid mapping port 27017 on prod). Keep it on an internal network and restrict access via firewall/security groups.
- Set environment variables via an env file or orchestrator (do not commit secrets to repo).
- Run health checks (docker-compose supports `healthcheck`) and consider using a process manager (systemd) or orchestration platform (Kubernetes, ECS) for greater control in production.

Troubleshooting
- If the frontend can't reach the API, ensure nginx proxy is configured (we proxy `/api` to `api:8000`). On local dev you may need to call the backend directly.
- If containers fail on startup, view logs:

```powershell
docker compose logs -f api
```

Wrap-up
- With the provided `docker-compose.yml` and `Dockerfile`s, you can build and run the entire stack locally.
- For production, build images in CI and use a `docker-compose.prod.yml` that references image tags. Keep MongoDB data on a named volume (`cookibud-mongo-data`) and back it up regularly.

If you want, I can:
- Create a `docker-compose.prod.yml` that references registry images.
- Add small healthchecks to the services.
- Add a simple systemd unit or a deploy script that performs zero-downtime updates on the server.

