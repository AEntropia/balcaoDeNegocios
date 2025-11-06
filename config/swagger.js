//swagger.js
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Gestão Empresarial',
      version: '1.0.0',
      description: 'API REST completa com autenticação JWT, CRUD de empresas e gestão de contatos',
      contact: {
        name: 'Suporte API',
        email: 'suporte@exemplo.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      },
      {
        url: 'https://sua-api.com',
        description: 'Servidor de Produção'
      }
    ],
    components: {
      securitySchemes: {
        // Autenticação via Bearer Token (para desenvolvimento/Swagger)
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insira o token JWT obtido no login (cole apenas o token, sem "Bearer")'
        },
        // Autenticação via Cookie (produção)
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'accessToken',
          description: 'Token JWT armazenado em HttpOnly cookie (enviado automaticamente pelo navegador)'
        }
      },
      schemas: {
        Usuario: {
          type: 'object',
          required: ['nome', 'email', 'senha'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID do usuário'
            },
            nome: {
              type: 'string',
              description: 'Nome completo do usuário',
              example: 'João Silva'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do usuário',
              example: 'joao@exemplo.com'
            },
            senha: {
              type: 'string',
              format: 'password',
              description: 'Senha do usuário (mínimo 6 caracteres)',
              example: 'senha123'
            },
            ativo: {
              type: 'boolean',
              description: 'Status do usuário',
              example: true
            }
          }
        },
        Contato: {
          type: 'object',
          required: ['nome', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID do contato'
            },
            nome: {
              type: 'string',
              description: 'Nome do contato',
              example: 'Maria Santos'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do contato',
              example: 'maria@exemplo.com'
            },
            telefone: {
              type: 'string',
              description: 'Telefone do contato',
              example: '(15) 99999-9999'
            },
            cidade: {
              type: 'string',
              description: 'Cidade do contato',
              example: 'Sorocaba'
            },
            tipo: {
              type: 'string',
              enum: ['cliente', 'fornecedor', 'parceiro'],
              description: 'Tipo do contato',
              example: 'cliente'
            }
          }
        },
        Empresa: {
          type: 'object',
          required: ['nome', 'cnpj', 'email'],
          properties: {
            id: {
              type: 'integer',
              description: 'ID da empresa'
            },
            nome: {
              type: 'string',
              description: 'Nome fantasia da empresa',
              example: 'Tech Solutions LTDA'
            },
            cnpj: {
              type: 'string',
              description: 'CNPJ da empresa (14 dígitos)',
              example: '12345678000190'
            },
            razao_social: {
              type: 'string',
              description: 'Razão social da empresa',
              example: 'Tech Solutions Tecnologia LTDA'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email da empresa',
              example: 'contato@techsolutions.com'
            },
            telefone: {
              type: 'string',
              description: 'Telefone da empresa',
              example: '(15) 3333-4444'
            },
            endereco: {
              type: 'string',
              description: 'Endereço completo',
              example: 'Rua das Flores, 123'
            },
            cidade: {
              type: 'string',
              description: 'Cidade',
              example: 'Sorocaba'
            },
            estado: {
              type: 'string',
              description: 'Sigla do estado',
              example: 'SP'
            },
            cep: {
              type: 'string',
              description: 'CEP',
              example: '18000-000'
            },
            valor: {
              type: 'number',
              format: 'float',
              description: 'Valor em reais',
              example: 50000.00
            },
            faturamento: {
              type: 'number',
              format: 'float',
              description: 'Faturamento em reais',
              example: 1500000.00
            },
            tipo: {
              type: 'string',
              enum: ['cliente', 'fornecedor', 'parceiro'],
              description: 'Tipo da empresa',
              example: 'cliente'
            },
            descricao: {
              type: 'string',
              description: 'Descrição detalhada da empresa',
              example: 'Empresa de tecnologia especializada em desenvolvimento de software'
            },
            ativo: {
              type: 'boolean',
              description: 'Status da empresa',
              example: true
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            sucesso: {
              type: 'boolean',
              example: false
            },
            mensagem: {
              type: 'string',
              example: 'Mensagem de erro'
            }
          }
        },
        Success: {
          type: 'object',
          properties: {
            sucesso: {
              type: 'boolean',
              example: true
            },
            mensagem: {
              type: 'string',
              example: 'Operação realizada com sucesso'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Token de autenticação ausente ou inválido',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                sucesso: false,
                mensagem: 'Token inválido ou expirado'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Recurso não encontrado',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                sucesso: false,
                mensagem: 'Recurso não encontrado'
              }
            }
          }
        },
        ValidationError: {
          description: 'Erro de validação',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error'
              },
              example: {
                sucesso: false,
                mensagem: 'Dados inválidos'
              }
            }
          }
        }
      }
    },
    // Security global - aceita tanto Bearer quanto Cookie
    security: [
      {
        bearerAuth: []
      },
      {
        cookieAuth: []
      }
    ],
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints de autenticação e gestão de usuários'
      },
      {
        name: 'Contatos',
        description: 'Gestão de contatos'
      },
      {
        name: 'Empresas',
        description: 'CRUD de empresas'
      }
    ]
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;