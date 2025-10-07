FROM node:18-alpine

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

RUN apk add --no-cache dumb-init

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production && npm cache clean --force

# Copiar código fonte
COPY . .

# Criar diretórios para logs e uploads
RUN mkdir -p /app/logs /app/uploads/avatars && chown -R nodejs:nodejs /app

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 8081

ENV NODE_ENV=production
ENV TZ="America/Sao_Paulo"
ENV PORT=8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8081/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Iniciar aplicação com dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
