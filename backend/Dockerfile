FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# cache-bust: 2026-06-01
EXPOSE 3000
CMD ["npm", "start"]