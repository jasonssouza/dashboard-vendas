# Dashboard de Evolução das Vendas por Vendedor

Dashboard HTML single-file (sem backend, sem build) para visualizar a evolução das vendas de sementes de soja por vendedor. Valores em Sacas 125K.

## Rodar localmente

Abra `dashboard_vendas.html` diretamente no navegador.

## Deploy com Docker

```bash
docker build -t dashboard-vendas .
docker run -p 8080:80 dashboard-vendas
```

Acesse em `http://localhost:8080`.

## Deploy no EasyPanel

1. Crie um novo serviço do tipo **App**, fonte **GitHub**, apontando para este repositório.
2. Build method: **Dockerfile** (raiz do repositório).
3. Porta interna do container: **80**.
4. Deploy.
