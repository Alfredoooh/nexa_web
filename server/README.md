# Angola News API

Servidor Node.js/Express pronto para Render Free, usando a GDELT DOC 2.0 API como fonte de notícias.

## 1. Instalar

```bash
npm install
```

## 2. Rodar localmente

```bash
npm start
```

Servidor:

```text
http://localhost:3000
```

Teste:

```text
http://localhost:3000/health
```

Notícias:

```text
http://localhost:3000/api/news?category=geral&limit=50&timespan=15min
```

Categorias:

```text
http://localhost:3000/api/categories
```

## 3. Deploy no Render

### Opção A — usando GitHub

```bash
git init
git add .
git commit -m "Initial Angola News API"
git branch -M main
git remote add origin SEU_REPOSITORIO_GITHUB
git push -u origin main
```

Depois, no Render, crie um **Web Service** apontando para esse repositório.

### Opção B — Blueprint

O arquivo `render.yaml` já contém a configuração do serviço.

## 4. Endpoints

### Saúde

```http
GET /health
```

### Notícias gerais

```http
GET /api/news?category=geral&limit=50&timespan=15min
```

### Política

```http
GET /api/news?category=politica&limit=50&timespan=15min
```

### Economia

```http
GET /api/news?category=economia&limit=50&timespan=15min
```

### Desporto

```http
GET /api/news?category=desporto&limit=50&timespan=15min
```

### Tecnologia

```http
GET /api/news?category=tecnologia&limit=50&timespan=15min
```

### Sociedade

```http
GET /api/news?category=sociedade&limit=50&timespan=15min
```

### Entretenimento

```http
GET /api/news?category=entretenimento&limit=50&timespan=15min
```

### Consulta personalizada

```http
GET /api/news?query=Angola%20Luanda&limit=50&timespan=15min
```

## 5. Formato da resposta

```json
{
  "success": true,
  "source": "GDELT DOC 2.0",
  "category": "geral",
  "timespan": "15min",
  "count": 2,
  "fetchedAt": "2026-09-29T00:00:00.000Z",
  "cached": false,
  "articles": [
    {
      "id": "example.com-20260929T000000Z-0",
      "title": "Título da notícia",
      "url": "https://example.com/article",
      "mobileUrl": null,
      "source": "example.com",
      "sourceCountry": "Angola",
      "language": "Portuguese",
      "publishedAt": "2026-09-29T00:00:00Z",
      "image": "https://example.com/image.jpg"
    }
  ]
}
```

## 6. Observações

- O servidor não precisa de API key do GDELT.
- O GDELT retorna metadados e URLs dos artigos; o aplicativo pode abrir a URL original da fonte.
- O cache é em memória neste primeiro estágio. Em uma instância Free da Render, ele é perdido quando o serviço reinicia ou entra em suspensão.
- O endpoint usa `sourcecountry:angola` nas consultas das categorias para priorizar fontes classificadas pelo GDELT como sendo de Angola.
- O GDELT limita `maxrecords` da DOC ArticleList a 250.
