# IoTData Cloud by Data Frontier

Plataforma unificada para comunicação e controle de dispositivos IoT e telemetria satelital de precisão. O sistema é desenhado principalmente para o **Agronegócio** em áreas sem conectividade (utilizando hardware Globalstar satelital) e para **Monitoramento Fabril** na Indústria 4.0.

## 🏗️ Arquitetura do Projeto

A solução é dividida em duas partes principais:

1. **Frontend (React com Vite + TailwindCSS):** 
   - Fica na pasta `Globalstar_GO/globalstar-front`.
   - Responsável pelas Landing Pages públicas (Home e IGAM), pelo Painel de Controle de Dispositivos (Dashboard) e pelas interfaces de login e recuperação de senha.
   - Comunicação via API e envio de logs em tempo real (previsto WebSocket).

2. **Backend (Golang):**
   - Fica na pasta `Globalstar_GO/` (Raiz onde reside `main.go`).
   - Gerencia a conexão com o banco de dados MySQL, fornece os endpoints de autenticação, reset de senha (com geração de token via E-mail Seguro com SMTP) e APIs para recebimento de dados satelitais.

---

## 🚀 Como fazer o Upload e Deploy de Novas Versões para o Google Cloud (VM)

O processo de deploy para produção foi simplificado utilizando **Git** e **Docker**. Isso garante que o ambiente de produção rodará instâncias idênticas através de contêineres, sem a necessidade de instalar compiladores localmente na VM. Siga os passos:

### Passo 1: Atualizar o Repositório via GitHub
Acesse sua VM do Google Cloud via SSH, navegue até a pasta do projeto e baixe as atualizações mais recentes direitas da branch principal mantida no GitHub:

```bash
cd /caminho/do/projeto/na/vm/Plataforma-IOT-Satelite-Industria-Agro
git pull origin main
```
*(Caso haja conflitos ou seja sua primeira clonagem, use `git status` para verificar e resolver pendencias locais).*

### Passo 2: Configuração das Variáveis (Se necessário)
Certifique-se de que o arquivo `.env` para as variáveis essenciais do sistema na raiz do projeto (ou no backend) está configurado com as chaves corretas:
```env
# Banco
DB_USER=root
DB_PASS=sua-senha
DB_HOST=db-container
DB_PORT=3306
DB_NAME=iot_db

# E-mail e Autenticação
JWT_SECRET=chave_secreta_segura
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email-envio@gmail.com
SMTP_PASS=senha-do-app-ou-smtp
SMTP_FROM=nao-responda@datafrontier.com.br
FRONTEND_URL=https://app.datafrontier.com.br
```

### Passo 3: Recriar e Levantar os Contêineres (Docker)
Com o Git Pull feito, basta instruir o Docker Compose a regerar as imagens do Backend e Frontend, parando a versão antiga e injetando a nova silenciosamente.

Na pasta raiz onde se encontra o seu `docker-compose.yml`, execute:
```bash
docker compose up -d --build
# ou docker-compose up -d --build (em versões mais antigas do docker)
```

**Pronto!** 
O Docker cuidará de baixar os pacotes do Node.js, empacotar os asests estáticos do Vite para o Nginx e compilar o executável binário do Golang em containeres isolados.

Quando o processo finalizar, a plataforma web exibirá as telas mais recentes já perfeitamente conectadas com o Go atualizado rodando em background.
