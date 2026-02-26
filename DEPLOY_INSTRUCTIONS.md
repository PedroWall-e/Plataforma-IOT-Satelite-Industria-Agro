# Instruções de Deploy - Google Cloud VM (Plataforma IoT)

Este documento contém o passo a passo para colocar em produção as novas funcionalidades desenvolvidas:
1. **Landing Pages** (Frontend integrado)
2. **Recuperação de Senha Segura via E-mail** (Backend em Go + Painel React)

## 1. Configurar Variáveis de Ambiente no Backend (Golang)
Antes de iniciar o serviço, é fundamental atualizar o arquivo `.env` na raiz do projeto Go (`Globalstar_GO/.env`). 

Adicione as credenciais do seu provedor de e-mail (ex: Gmail, SendGrid, Amazon SES, ou SMTP próprio) e a URL correta do Front-End para onde o link de "Redefinir Senha" deve apontar.

Abra ou crie o `.env`:
```env
# Configurações do Banco de Dados (Já existentes)
DB_USER=root
DB_PASS=sua-senha
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=iot_db

# Chave do JWT (Já existente)
JWT_SECRET=sua_chave_secreta_super_segura

# ==========================================
# NOVAS CONFIGURAÇÕES PARA ENVIO DE E-MAIL
# ==========================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
# E-mail que autentica no servidor SMTP
SMTP_USER=seu-email-de-envio@gmail.com
# Senha ou App Password (se usar Gmail)
SMTP_PASS=sua-senha-de-app
# E-mail remetente que aparecerá para o usuário
SMTP_FROM=nao-responda@datafrontier.com.br
# A URL pública real do seu frontend (Sem a barra no final)
# O e-mail de recuperação usará isso para criar o link: FRONTEND_URL/reset-password?token=XYZ
FRONTEND_URL=https://app.datafrontier.com.br
```

## 2. Recompilar o Backend (Go)
Após ajustar o `.env`, você deve recompilar o arquivo binário executável na sua VM.
Navegue até o diretório do servidor Go e rode a compilação:

```bash
cd /caminho/para/seu/Globalstar_GO

# Baixar pacotes atualizados (UUID para gerar o token e SMTP)
go mod tidy
go get github.com/google/uuid

# Compilar novo executável
go build -o server main.go
```

## 3. Realizar o Build do Frontend (React/Vite)
Navegue até a raiz do seu aplicativo frontend onde fica o `package.json` para gerar a versão estática otimizada do projeto (incluindo as rotas `/` e `/agro-igam` novas).

```bash
cd /caminho/para/seu/Globalstar_GO/globalstar-front

# Instalar possíveis dependências faltantes
npm install

# Gerar o bundle de produção
npm run build
```
Esse comando vai criar / atualizar a pasta `dist/` com os arquivos em HTML, CSS e JS puros. 
Aponte o seu Nginx, Apache ou provedor de hospedagem para servir a raiz desta pasta `dist`.

> **Importante:** Se você usa o Nginx para servir o React com `react-router-dom`, certifique-se de que o bloco Nginx contém o `try_files $uri $uri/ /index.html;` para que as novas rotas como `/forgot-password` funcionem ao invés de darem "404 Not Found" no recarregamento.

## 4. Reiniciar os Serviços em Produção
Seu servidor backend pode estar rodando como um serviço do Systemd (Linux). Se for o caso, reinicie-o:
```bash
sudo systemctl restart meu-servico-go
```

Se você roda tudo usando Docker (por exemplo com um `docker-compose.yml`), será necessário refazer o build da imagem do Go e reiniciar:
```bash
docker-compose up -d --build
```
