# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate && npm run build
# Izmišljeni podatki za prvi zagon: seme prevedemo v navaden JS (v sliki ni tsx).
RUN node_modules/.bin/esbuild prisma/seed.ts --bundle --platform=node --format=cjs       --packages=external --outfile=prisma/seed.cjs

FROM node:22-alpine AS runner
WORKDIR /app
# sqlite: za konsistentne varnostne kopije (.backup), ne za delovanje aplikacije
RUN apk add --no-cache openssl sqlite
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/data/helpdesk.db
ENV UPLOAD_DIR=/data/uploads
# Kopija za faks: vedno izolirana od produkcije (glej src/lib/sandbox.ts).
ENV DESK_SANDBOX=1

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI (uskladitev sheme ob zagonu) živi ločeno s celotnim drevesom
# odvisnosti. Izbiranje posameznih paketov se ne obnese — CLI ima svoje
# tranzitivne odvisnosti in vsaka manjkajoča ustavi zagon.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules /cli/node_modules

# Baza in priloge živijo na trajnem volumnu.
RUN mkdir -p /data/uploads && chown -R nextjs:nodejs /data
VOLUME /data

USER nextjs
EXPOSE 3000

# Ob zagonu: uskladi shemo, v prazno bazo zasadi izmišljene podatke, zaženi strežnik.
# CLI kličemo neposredno prek vstopne datoteke — v sliki ni node_modules/.bin,
# zato `npx prisma` ne bi našel ukaza.
CMD ["sh", "-c", "node prisma/prepare-order-number-schema.mjs && node /cli/node_modules/prisma/build/index.js db push --skip-generate --schema /app/prisma/schema.prisma && node prisma/seed.cjs --if-empty && node prisma/backfill-items.mjs && node prisma/backfill-order-numbers.mjs && node server.js"]
