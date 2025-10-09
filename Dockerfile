# Stage 1: Build the Angular application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps || npm install
COPY . .
RUN npm run build

# Stage 2: Serve the application with nginx
FROM nginx:alpine
COPY --from=builder /app/dist/angular-admin-template/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
