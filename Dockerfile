FROM node:22-alpine

WORKDIR /app

COPY packages/mvr-mcp-bridge/package.json packages/mvr-mcp-bridge/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY packages/mvr-mcp-bridge/src ./src

ENV NODE_ENV=production
ENV MVR_REMOTE_MCP_URL=https://africanmarketos.com/mcp/preflight

USER node

ENTRYPOINT ["node", "src/index.mjs"]
