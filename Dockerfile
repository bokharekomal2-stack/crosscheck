FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package.json server/
RUN npm install --omit=dev --prefix server
COPY server/ server/
COPY --from=client /app/client/dist client/dist
EXPOSE 8080
CMD ["node", "server/index.js"]
