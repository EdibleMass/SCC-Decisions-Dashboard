# Stage 1: build the static site with Vite
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
# npm ci installs exactly what package-lock.json pins, so every build matches
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Stage 2: serve the built files with nginx on Cloud Run's $PORT
FROM nginx:1.27-alpine
ENV PORT=8080
# The nginx image fills ${PORT} into this template when the container starts
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
