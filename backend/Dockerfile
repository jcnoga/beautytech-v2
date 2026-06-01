FROM node:20-alpine
ARG CACHE_BUST=1
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]