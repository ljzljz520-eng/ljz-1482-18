FROM node:20-alpine
WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN npx tsc --noEmit

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "--import", "tsx/esm", "src/index.ts"]
