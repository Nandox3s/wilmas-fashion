FROM node:18-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm install

RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production
ENV DATABASE_URL="file:./dev.db"
ENV JWT_SECRET="wilmas_dev_secret_2026"
ENV PORT=4000

EXPOSE 4000

CMD sh -c "npx prisma db push --skip-generate && node src/index.js"
