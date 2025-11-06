//middleware/auth.js
const jwt = require('jsonwebtoken');

/**
 * Middleware de autenticação JWT
 * Verifica o token via HttpOnly cookie (prioridade) ou Authorization header (fallback para dev/Swagger)
 * Adiciona os dados do usuário na requisição
 */
const autenticar = (req, res, next) => {
  try {
    let token;
    
    // PRIORIDADE 1: Tentar pegar do HttpOnly cookie
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    
    // PRIORIDADE 2: Fallback para Authorization header (desenvolvimento/Swagger)
    if (!token) {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    // Se não encontrou token em nenhum lugar
    if (!token) {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token não fornecido'
      });
    }

    // Verificar e decodificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Adicionar dados do usuário na requisição
    req.usuario = decoded;
    
    // Continuar para a próxima função
    next();

  } catch (erro) {
    if (erro.name === 'JsonWebTokenError') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token inválido'
      });
    }
    
    if (erro.name === 'TokenExpiredError') {
      return res.status(401).json({
        sucesso: false,
        mensagem: 'Token expirado'
      });
    }

    return res.status(401).json({
      sucesso: false,
      mensagem: 'Erro ao autenticar token'
    });
  }
};

module.exports = autenticar;