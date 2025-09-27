Write-Host "Atualizando backend com Docker Compose..."

# 1. Rebuild da imagem sem cache
docker-compose build --no-cache

# 2. Derrubar containers antigos
docker-compose down

# 3. Subir novamente em modo detached
docker-compose up -d

Write-Host "✅ Backend atualizado e rodando!"
