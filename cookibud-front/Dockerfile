### Stage 1: build the app
FROM node:22-alpine AS builder
WORKDIR /app

# Copy only package files first so the install layer is cached if lockfile didn't change
COPY cookibud-front/package*.json ./
RUN npm ci --prefer-offline --no-audit --progress=false

# Now copy the rest of your app and build
COPY cookibud-front/ ./
RUN npm run build

### Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY cookibud-front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
