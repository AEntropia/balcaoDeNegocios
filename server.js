require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.FRONTEND_URL 
    : 'http://localhost:3000',
  credentials: true
}));

// Swagger UI com CSS e JS via CDN
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'API Docs',
  swaggerOptions: {
    persistAuthorization: true
  },
  // Usar CDN para os assets
  customCssUrl: 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css',
  customJs: [
    'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js',
    'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js'
  ]
};

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, swaggerOptions));

// Log de requisições em desenvolvimento
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Importar rotas
const contatosRoutes = require('./routes/contatos');
const empresasRoutes = require('./routes/empresas');
const authRoutes = require('./routes/auth');

// Usar rotas
app.use('/api/contatos', contatosRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/auth', authRoutes);

// Rota raiz - Documentação básica da API
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API funcionando! 🚀',
    versao: '1.0.0',
    documentacao: '/api-docs',
    endpoints: {
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
    uptime: process.uptime()
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

// Iniciar servidor
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`🔗 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📚 Documentação: http://localhost:${PORT}/api-docs`);
  console.log('═══════════════════════════════════════');
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Erro não tratado:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Exceção não capturada:', err);
  process.exit(1);
});

module.exports = app;