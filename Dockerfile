FROM node:22.14.0-alpine AS base

RUN apk add --no-cache libc6-compat \
	&& corepack enable \
	&& corepack prepare yarn@4.9.1 --activate

WORKDIR /app

FROM base AS dependencies

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn

RUN yarn install --immutable

FROM dependencies AS build

COPY . .

RUN yarn prisma generate --schema ./prisma \
	&& yarn build

FROM base AS production

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs \
	&& adduser --system --uid 1001 bot

RUN chown -R bot:nodejs /app

COPY --from=build --chown=bot:nodejs /app/package.json /app/jsconfig.json /app/tsconfig.json /app/yarn.lock /app/.yarnrc.yml ./
COPY --from=build --chown=bot:nodejs /app/.yarn ./.yarn

COPY --from=build --chown=bot:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=bot:nodejs /app/dist ./dist
COPY --from=build --chown=bot:nodejs /app/prisma ./prisma

USER bot

CMD ["sh", "-c", "yarn deploy && yarn start"]
