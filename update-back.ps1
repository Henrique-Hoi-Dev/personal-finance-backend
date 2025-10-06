Write-Host "Atualizando backend com Docker Compose..."

# 1. Rebuild da imagem sem cache
docker-compose build --no-cache

# 2. Derrubar containers antigos
docker-compose down

# 3. Subir novamente em modo detached
docker-compose up -d

Write-Host "✅ Backend atualizado e rodando!"

# 4. Aguardar o container estar pronto
Write-Host "Aguardando container estar pronto..."
Start-Sleep -Seconds 10

# 5. Executar migrations
Write-Host "Executando migrations..."
docker-compose exec -T app npm run migrate

# 6. Executar seeds
Write-Host "Executando seeds..."
docker-compose exec -T app npm run seed

Write-Host "🎉 Backend completamente atualizado com migrations e seeds aplicados!"