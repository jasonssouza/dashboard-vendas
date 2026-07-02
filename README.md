# Dashboard de Evolução das Vendas por Vendedor

Dashboard para visualizar a evolução das vendas de sementes de soja por vendedor. Valores em Sacas 125K. Aceita importação manual (CSV / colar / exemplo) e também busca ao vivo direto do CRM Thonus via um pequeno backend Node/Express.

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com as credenciais do Thonus
npm start
```

Acesse `http://localhost:3000`.

Sem backend/banco configurado, o dashboard ainda funciona normalmente pelas abas "Importar arquivo", "Colar dados" e "Dados de exemplo" — só a aba "Thonus (ao vivo)" depende da API.

## Variáveis de ambiente

| Variável | Descrição |
|---|---|
| `DB_HOST` | Host do MySQL do Thonus |
| `DB_PORT` | Porta (padrão 3306) |
| `DB_USER` | Usuário (somente leitura) |
| `DB_PASSWORD` | Senha |
| `DB_NAME` | Nome do banco (`thonus01_sistema_cambai`) |
| `PORT` | Porta em que o servidor Node escuta (padrão 3000) |

## Deploy com Docker

```bash
docker build -t dashboard-vendas .
docker run -p 8080:3000 \
  -e DB_HOST=... -e DB_PORT=3306 -e DB_USER=... -e DB_PASSWORD=... -e DB_NAME=thonus01_sistema_cambai \
  dashboard-vendas
```

Acesse em `http://localhost:8080`.

## Deploy no EasyPanel

1. Crie um novo serviço do tipo **App**, fonte **GitHub**, apontando para este repositório.
2. Build method: **Dockerfile** (raiz do repositório).
3. Porta interna do container: **3000**.
4. Em **Environment Variables**, configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (nunca commitadas no repositório — ficam só na configuração do serviço no EasyPanel).
5. Deploy.

⚠️ O banco do Thonus provavelmente só libera conexão remota para IPs autorizados (ex: seção "Remote MySQL" do cPanel). Antes do primeiro deploy, libere o IP de saída do seu VPS lá.
