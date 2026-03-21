require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerSpecs = require('./config/swagger');
const cookieParser = require('cookie-parser');
const { iniciarCronJob } = require('./jobs/verificarAssinaturas')

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json({ limit: '50mb' })); // Para aceitar JSONs grandes (imagens Base64)
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS - Permissivo para testes
const corsOptions = {
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
};

app.use(cors(corsOptions));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Log de requisições em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Swagger UI customizado para Vercel com CDN
app.get('/api-docs', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API de Gestão Empresarial - Documentação</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; padding: 0; }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'none',
        filter: true,
        tryItOutEnabled: true
      });
      window.ui = ui;
    };
  </script>
</body>
</html>
  `;
  res.send(html);
});

// Endpoint do JSON do Swagger
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpecs);
});

// Importar rotas
const contatosRoutes = require('./routes/contatos');
const empresasRoutes = require('./routes/empresas');
const authRoutes = require('./routes/auth');
const empresasTokenRoutes = require('./routes/empresas_token_routes');
const pagamentosRouter = require('./routes/pagamentos');

// Usar rotas
app.use('/api/contatos', contatosRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasTokenRoutes);
app.use('/api/pagamentos', pagamentosRouter);

// Rota raiz
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API funcionando! 🚀',
    versao: '1.0.0',
    documentacao: '/api-docs',
    endpoints: {
      swagger: {
        ui: '/api-docs',
        json: '/api-docs.json'
      },
      contatos: {
        descricao: 'Gerenciamento de contatos',
        rotas: {
          'POST /api/contatos': 'Enviar novo contato (público)',
          'GET /api/contatos': 'Listar contatos (protegido)',
          'PATCH /api/contatos/:id/lido': 'Marcar contato como lido (protegido)'
        }
      },
      empresas: {
        descricao: 'CRUD de empresas',
        rotas: {
          'POST /api/empresas': 'Criar empresa (protegido)',
          'GET /api/empresas': 'Listar empresas (protegido)',
          'GET /api/empresas/:id': 'Buscar empresa (protegido)',
          'PUT /api/empresas/:id': 'Atualizar empresa (protegido)',
          'DELETE /api/empresas/:id': 'Deletar empresa (protegido)'
        }
      },
      auth: {
        descricao: 'Autenticação e autorização',
        rotas: {
          'POST /api/auth/registro': 'Registrar novo usuário',
          'POST /api/auth/login': 'Fazer login',
          'GET /api/auth/perfil': 'Ver perfil (protegido)',
          'PUT /api/auth/alterar-senha': 'Alterar senha (protegido)',
          'POST /api/auth/verificar-token': 'Verificar validade do token'
        }
      }
    },
    nota: 'Para rotas protegidas, envie o token JWT no header: Authorization: Bearer {token}'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Tratamento de erros 404
app.use((req, res) => {
  res.status(404).json({
    sucesso: false,
    mensagem: 'Endpoint não encontrado',
    path: req.path
  });
});

// Tratamento de erros gerais
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  
  res.status(err.status || 500).json({
    sucesso: false,
    mensagem: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});
iniciarCronJob()
// Iniciar servidor apenas se não for Vercel
if (require.main === module) {
  app.listen(PORT, () => {
    console.log('═══════════════════════════════════════');
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 URL: http://localhost:${PORT}`);
    console.log(`🔗 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 Documentação: http://localhost:${PORT}/api-docs`);
    console.log('═══════════════════════════════════════');
  });
}

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Erro não tratado:', err);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  console.error('Exceção não capturada:', err);
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

module.exports = app;