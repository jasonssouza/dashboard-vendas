# Solicitação de acesso — banco thonus01_sistema_cambai

Olá! Preciso que seja concedido `SELECT` para o usuário `thonus01_cliente_cambai`, que hoje só tem os privilégios `USAGE` e `SHOW VIEW` (não consegue ler nenhum dado, só listar os nomes das tabelas).

## Prioridade — a view de BI já pronta

```sql
GRANT SELECT ON thonus01_sistema_cambai.vw_bi_cambai TO 'thonus01_cliente_cambai'@'%';
```

## Caso a view não cubra tudo que precisamos, liberar também estas tabelas

```sql
GRANT SELECT ON thonus01_sistema_cambai.cota           TO 'thonus01_cliente_cambai'@'%';
GRANT SELECT ON thonus01_sistema_cambai.historico_cota  TO 'thonus01_cliente_cambai'@'%';
GRANT SELECT ON thonus01_sistema_cambai.meta_cota       TO 'thonus01_cliente_cambai'@'%';
GRANT SELECT ON thonus01_sistema_cambai.usuario         TO 'thonus01_cliente_cambai'@'%';
GRANT SELECT ON thonus01_sistema_cambai.cliente         TO 'thonus01_cliente_cambai'@'%';
```

## Aplicar

```sql
FLUSH PRIVILEGES;
```

Motivo: vamos usar esse acesso (somente leitura) para alimentar um dashboard de acompanhamento de vendas por vendedor. Não é necessário nenhum privilégio de escrita (`INSERT`/`UPDATE`/`DELETE`).
