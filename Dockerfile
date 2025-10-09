# Stage 1: Build Angular app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* .npmrc* ./
RUN npm install
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve with Nginx
FROM nginx:alpine
COPY --from=build /app/dist/gestion-academico-admin /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
