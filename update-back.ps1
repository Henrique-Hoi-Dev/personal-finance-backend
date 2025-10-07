Write-Host "Atualizando backend com Docker Compose..." -ForegroundColor Yellow

# 1. Derrubar containers existentes
Write-Host "Parando containers existentes..." -ForegroundColor Yellow
docker-compose down

# 2. Remover containers antigos
Write-Host "Removendo containers antigos..." -ForegroundColor Yellow
docker-compose rm -f

# 3. Rebuild da imagem sem cache
Write-Host "Reconstruindo imagem da aplicação..." -ForegroundColor Yellow
docker-compose build --no-cache

# 4. Subir novamente em modo detached
Write-Host "Iniciando containers..." -ForegroundColor Yellow
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

Write-Host "🎉 Backend completamente atualizado com migrations e seeds aplicados!" -ForegroundColor Green

# 7. Verificar status dos containers
Write-Host "`nVerificando status dos containers..." -ForegroundColor Yellow
docker-compose ps

# 8. Mostrar logs da aplicação
Write-Host "`nLogs da aplicação (últimas 30 linhas):" -ForegroundColor Yellow
docker-compose logs --tail=30 app

Write-Host "`nComandos uteis:" -ForegroundColor Cyan
Write-Host "- Ver logs em tempo real: docker-compose logs -f app" -ForegroundColor Green
Write-Host "- Acessar container: docker exec -it finance_app sh" -ForegroundColor Green
Write-Host "- Verificar volumes: docker volume ls" -ForegroundColor Green