# Exemplos de Cálculo de Financiamentos/Empréstimos

## Novos Campos Adicionados

- `installmentAmount`: Valor da parcela (em centavos)
- `totalWithInterest`: Valor total com juros (em centavos)
- `principalAmount`: Valor principal sem juros (em centavos)

## Cenários de Uso

### Cenário 1: Usuário informa valor da parcela e número de parcelas

```json
{
    "name": "Financiamento Carro",
    "type": "LOAN",
    "installmentAmount": 151966, // R$ 1.519,66
    "installments": 12,
    "startDate": "2024-01-01",
    "dueDay": 15
}
```

**Resultado automático:**

- `totalAmount`: 1823592 (R$ 18.235,92)
- `totalWithInterest`: 1823592 (R$ 18.235,92)
- `principalAmount`: 1823592 (R$ 18.235,92)

### Cenário 2: Usuário informa valor principal e total com juros

```json
{
    "name": "Empréstimo Pessoal",
    "type": "LOAN",
    "principalAmount": 1500000, // R$ 15.000,00
    "totalWithInterest": 1800000, // R$ 18.000,00
    "installments": 12,
    "startDate": "2024-01-01",
    "dueDay": 15
}
```

**Resultado automático:**

- `totalAmount`: 1800000 (R$ 18.000,00)
- `installmentAmount`: 150000 (R$ 1.500,00)

### Cenário 3: Usuário informa valor principal, parcela e número de parcelas

```json
{
    "name": "Financiamento Casa",
    "type": "LOAN",
    "principalAmount": 1500000, // R$ 15.000,00
    "installmentAmount": 151966, // R$ 1.519,66
    "installments": 12,
    "startDate": "2024-01-01",
    "dueDay": 15
}
```

**Resultado automático:**

- `totalAmount`: 1823592 (R$ 18.235,92)
- `totalWithInterest`: 1823592 (R$ 18.235,92)

### Cenário 4: Comportamento original (apenas valor total)

```json
{
    "name": "Conta Fixa",
    "type": "FIXED",
    "totalAmount": 50000, // R$ 500,00
    "startDate": "2024-01-01",
    "dueDay": 15
}
```

**Resultado:** Mantém comportamento original

## Cálculos Automáticos

O sistema agora calcula automaticamente:

1. **Total com juros** = Valor da parcela × Número de parcelas
2. **Valor da parcela** = Total com juros ÷ Número de parcelas
3. **Valor principal** = Pode ser informado separadamente ou assumido como igual ao total

## Benefícios

- ✅ **Facilita o input**: Usuário pode informar apenas o valor da parcela
- ✅ **Transparência**: Mostra claramente o custo total do financiamento
- ✅ **Flexibilidade**: Suporta diferentes cenários de input
- ✅ **Compatibilidade**: Mantém funcionamento original para outros tipos de conta
