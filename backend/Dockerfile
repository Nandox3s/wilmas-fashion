FROM node:20-alpine AS dependencies
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

FROM node:20-alpine
RUN apk add --no-cache openssl && addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies --chown=nodeapp:nodeapp /app/node_modules ./node_modules
COPY --chown=nodeapp:nodeapp package*.json ./
COPY --chown=nodeapp:nodeapp prisma ./prisma
COPY --chown=nodeapp:nodeapp src ./src
USER nodeapp
EXPOSE 4000
CMD ["node", "src/server.js"]
