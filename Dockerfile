# syntax=docker/dockerfile:1

FROM node:20 AS build
WORKDIR /workspace
COPY package*.json ./
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /usr/share/nginx/html
COPY --from=build /workspace/dist/angular-admin-template/browser ./
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost/health || exit 1
CMD ["nginx", "-g", "daemon off;"]
