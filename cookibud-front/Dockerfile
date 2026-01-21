### Stage 1: build the app
FROM node:22-alpine AS builder
WORKDIR /app

# Copy only package files first so the install layer is cached if lockfile didn't change
COPY cookibud-front/package*.json ./
COPY cookibud-front/.npmrc ./
RUN npm i

COPY cookibud-front/ ./
RUN npm run build

### Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html

# Fix permissions so Nginx can actually read the files
# 644 for files (rw-r--r--) and 755 for directories (rwxr-xr-x)
RUN chmod -R 755 /usr/share/nginx/html && \
    find /usr/share/nginx/html -type f -exec chmod 644 {} +

COPY cookibud-front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
