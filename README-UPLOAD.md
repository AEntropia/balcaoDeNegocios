# 📸 Tutorial: Upload de Imagens de Empresas

Este guia explica como fazer upload de imagens ao criar ou atualizar empresas usando Postman, Insomnia ou outras ferramentas similares.

## 📋 Índice

- [Requisitos](#requisitos)
- [Tutorial Postman](#tutorial-postman)
- [Tutorial Insomnia](#tutorial-insomnia)
- [Tutorial cURL](#tutorial-curl)
- [Limitações e Boas Práticas](#limitações-e-boas-práticas)
- [Troubleshooting](#troubleshooting)

---

## ✅ Requisitos

- **Tamanho máximo**: 5MB por imagem
- **Formatos aceitos**: JPG, JPEG, PNG, GIF, WEBP
- **Autenticação**: Token JWT válido
- **Campos obrigatórios**: nome, setor, cnpj, email

---

## 🔵 Tutorial Postman

### 1️⃣ Obter o Token de Autenticação

Primeiro, você precisa fazer login para obter o token:

1. Crie uma nova requisição **POST**
2. URL: `http://localhost:3000/api/auth/login`
3. Vá em **Body** → **raw** → **JSON**
4. Cole o JSON:
```json
{
  "email": "seu@email.com",
  "senha": "suasenha"
}
```
5. Clique em **Send**
6. **Copie o token** retornado na resposta

---

### 2️⃣ Criar Empresa COM Imagem

#### Passo 1: Configurar a Requisição

1. Crie uma nova requisição **POST**
2. URL: `http://localhost:3000/api/empresas`

#### Passo 2: Adicionar Autenticação

1. Vá na aba **Authorization**
2. Type: **Bearer Token**
3. Token: Cole o token que você copiou

#### Passo 3: Configurar o Body

1. Vá na aba **Body**
2. Selecione **form-data** (IMPORTANTE!)
3. Adicione os seguintes campos:

| Key | Type | Value |
|-----|------|-------|
| nome | Text | Tech Solutions LTDA |
| setor | Text | Tecnologia |
| cnpj | Text | 12345678000190 |
| email | Text | contato@techsolutions.com |
| telefone | Text | (15) 3333-4444 |
| localizacao | Text | Sorocaba - SP |
| info | Text | Empresa consolidada no mercado |
| lucro | Text | 500000 |
| valor | Text | 2000000 |
| faturamento | Text | 1500000 |
| tipo | Text | Desenvolvimento de Software |
| ano_fundacao | Text | 2010 |
| assinatura | Text | 365 |
| funcionarios | Text | 50 |
| tipo_imovel | Text | Comercial |
| dif | Text | Carteira de clientes consolidada |
| **imagem** | **File** | [Selecionar arquivo] |

#### Passo 4: Selecionar a Imagem

1. Na linha `imagem`, **clique no dropdown "Text"**
2. Selecione **"File"**
3. Clique no botão **"Select Files"** que aparece
4. Escolha sua imagem (max 5MB)

#### Passo 5: Enviar

1. Clique em **Send**
2. Você receberá uma resposta como:

```json
{
  "sucesso": true,
  "mensagem": "Empresa criada com sucesso",
  "id": 1,
  "imagem_url": "https://xyz.supabase.co/storage/v1/object/public/empresas-imagens/empresas/1234567890-abc123.jpg"
}
```

---

### 3️⃣ Atualizar Empresa COM Nova Imagem

#### Configuração

1. Método: **PUT**
2. URL: `http://localhost:3000/api/empresas/{id}` (substitua `{id}` pelo ID da empresa)
3. **Authorization**: Bearer Token (mesmo processo)
4. **Body**: form-data (mesmos campos do POST)

#### Para trocar a imagem:

- Adicione o campo `imagem` (tipo **File**)
- Selecione a nova imagem
- A imagem antiga será **automaticamente deletada**

#### Para atualizar SEM trocar a imagem:

- Simplesmente **não inclua** o campo `imagem`
- A imagem antiga será mantida

---

## 🟣 Tutorial Insomnia

### 1️⃣ Obter o Token

1. Nova requisição → **POST**
2. URL: `http://localhost:3000/api/auth/login`
3. Body → **JSON**:
```json
{
  "email": "seu@email.com",
  "senha": "suasenha"
}
```
4. Send → Copie o token

---

### 2️⃣ Criar Empresa COM Imagem

#### Configuração Básica

1. Nova requisição → **POST**
2. URL: `http://localhost:3000/api/empresas`

#### Autenticação

1. Aba **Auth** → **Bearer Token**
2. Cole o token

#### Body com Imagem

1. Aba **Body** → **Multipart Form**
2. Adicione os campos (clique em **+ Add**)
3. Para a imagem:
   - Name: `imagem`
   - **Clique no dropdown ao lado**
   - Selecione **"File"**
   - Escolha o arquivo

#### Campos do Formulário

```
nome: Tech Solutions LTDA
setor: Tecnologia
cnpj: 12345678000190
email: contato@techsolutions.com
telefone: (15) 3333-4444
localizacao: Sorocaba - SP
... (outros campos opcionais)
imagem: [Selecionar arquivo]
```

#### Enviar

Clique em **Send**

---

## 💻 Tutorial cURL

### Criar Empresa com Imagem

```bash
curl -X POST http://localhost:3000/api/empresas \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "nome=Tech Solutions LTDA" \
  -F "setor=Tecnologia" \
  -F "cnpj=12345678000190" \
  -F "email=contato@techsolutions.com" \
  -F "telefone=(15) 3333-4444" \
  -F "localizacao=Sorocaba - SP" \
  -F "info=Empresa consolidada no mercado" \
  -F "lucro=500000" \
  -F "valor=2000000" \
  -F "faturamento=1500000" \
  -F "tipo=Desenvolvimento de Software" \
  -F "ano_fundacao=2010" \
  -F "assinatura=365" \
  -F "funcionarios=50" \
  -F "tipo_imovel=Comercial" \
  -F "dif=Carteira de clientes consolidada" \
  -F "imagem=@/caminho/para/sua/imagem.jpg"
```

### Atualizar Empresa com Nova Imagem

```bash
curl -X PUT http://localhost:3000/api/empresas/1 \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -F "nome=Tech Solutions Atualizada" \
  -F "setor=Tecnologia" \
  -F "email=novo@email.com" \
  -F "imagem=@/caminho/para/nova/imagem.jpg"
```

---

## ⚙️ Limitações e Boas Práticas

### Limitações

| Item | Limite |
|------|--------|
| Tamanho máximo | 5MB |
| Formatos | JPG, JPEG, PNG, GIF, WEBP |
| Imagens por empresa | 1 |

### Boas Práticas

✅ **Recomendações de Tamanho**
- Largura: 800-1200px
- Altura: 600-800px
- Formato: JPG ou PNG

✅ **Otimização**
- Comprima imagens antes do upload
- Use ferramentas: TinyPNG, ImageOptim, Squoosh

✅ **Nomenclatura**
- Use nomes descritivos
- Evite caracteres especiais
- Exemplo: `empresa-tech-solutions.jpg`

❌ **Evite**
- Imagens maiores que 5MB
- Formatos não suportados (BMP, TIFF)
- Imagens corrompidas

---

## 🔧 Troubleshooting

### Erro: "File too large"

**Problema**: Imagem maior que 5MB

**Solução**:
1. Comprima a imagem usando [TinyPNG](https://tinypng.com/)
2. Ou redimensione para dimensões menores

---

### Erro: "Apenas imagens são permitidas"

**Problema**: Arquivo enviado não é uma imagem

**Solução**:
- Verifique a extensão do arquivo
- Formatos aceitos: JPG, JPEG, PNG, GIF, WEBP

---

### Erro: "Token inválido ou expirado"

**Problema**: Token JWT expirado ou incorreto

**Solução**:
1. Faça login novamente: `POST /api/auth/login`
2. Copie o novo token
3. Atualize no campo Authorization

---

### Erro: "CNPJ já cadastrado"

**Problema**: Já existe uma empresa com este CNPJ

**Solução**:
- Use um CNPJ diferente
- Ou atualize a empresa existente com PUT

---

### Erro: "Cannot destructure property 'nome'"

**Problema**: Body não está como `form-data`

**Solução**:
1. No Postman/Insomnia: Selecione **form-data** (não raw/JSON)
2. Adicione todos os campos como Text
3. Campo `imagem` deve ser tipo **File**

---

### Imagem não aparece após upload

**Problema**: URL retornada mas imagem não carrega

**Solução**:
1. Verifique se o bucket `empresas-imagens` existe no Supabase
2. Confirme que as permissões públicas estão ativas
3. Teste a URL diretamente no navegador

---

## 📞 Suporte

Problemas ou dúvidas? Entre em contato:
- **Email**: suporte@exemplo.com
- **Slack**: #api-suporte
- **Documentação API**: http://localhost:3000/api-docs

---

## 📚 Recursos Adicionais

- [Documentação Swagger](http://localhost:3000/api-docs)
- [Postman Collection](./postman_collection.json)
- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)

---

## 🎯 Exemplos Rápidos

### Criar empresa SEM imagem (Swagger/JSON)

```json
POST /api/empresas
{
  "nome": "Tech Solutions",
  "setor": "Tecnologia",
  "cnpj": "12345678000190",
  "email": "contato@tech.com"
}
```

### Criar empresa COM imagem (Postman/form-data)

```
POST /api/empresas
Content-Type: multipart/form-data

nome: Tech Solutions
setor: Tecnologia
cnpj: 12345678000190
email: contato@tech.com
imagem: [arquivo.jpg]
```

---

**Última atualização**: Dezembro 2024  
**Versão**: 1.0.0