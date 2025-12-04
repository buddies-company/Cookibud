### Stage 1: build the app
FROM node:22-alpine AS builder
WORKDIR /app

# copy source, install and build
# COPY cookibud-front/package.json ./package.json
COPY cookibud-front/ ./
RUN npm i
RUN npm run build

### Stage 2: serve with nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY cookibud-front/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
