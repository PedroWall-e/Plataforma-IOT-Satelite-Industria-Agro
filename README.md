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

O processo de deploy para produção consiste em transferir o seu código atualizado para a Máquina Virtual (VM) no Google Cloud, recompilar o servidor Backend (Go) e gerar a build de produção do Frontend (React). Siga as etapas rigorosamente:

### Passo 1: Transferir/Clonar os arquivos mais recentes para a VM
Primeiro garanta que as novas alterações estejam na VM. Você pode fazer isso puxando de um repositório git (`git pull`), ou fazendo upload via `scp`/Rsync direto para o diretório de destino na nuvem.

### Passo 2: Atualização e Compilação do Backend (Golang)
O servidor Go compila em um único código executável binário.

1. Acesse o servidor via SSH e navegue até a raiz do backend:
   ```bash
   cd /caminho/do/projeto/na/vm/Globalstar_GO
   ```

2. Certifique-se de que o arquivo `.env` para as variáveis do Banco e de Email existe e está atualizado. Caso tenha implementado ou alterado algo com o JWT e o disparo de E-mails com chaves novas, confira as seguintes variáveis essenciais:
   ```env
   # Banco
   DB_USER=root
   DB_PASS=sua-senha
   DB_HOST=127.0.0.1
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

3. Baixe possíveis dependências novas e recompile:
   ```bash
   go mod tidy
   # Comando para buidar, recriando o executável 'server'
   go build -o server main.go
   ```

4. **Reinicie o serviço do Backend**:
   Se estiver encapsulado num serviço (`systemctl`) do Linux:
   ```bash
   sudo systemctl restart nome-do-servico-go
   ```
   *Se estiver executando no Docker, use: `docker-compose up -d --build`*

### Passo 3: Build do Frontend (React)
Diferente do Backend, o frontend não roda ativamente (como Node.js). O react é compilado e servido por um servidor estático como o Apache ou Nginx.

1. Entre na pasta do Frontend:
   ```bash
   cd /caminho/do/projeto/na/vm/Globalstar_GO/globalstar-front
   ```

2. Instale novas dependências caso hajam e faça o build de produção:
   ```bash
   npm install
   npm run build
   ```

3. Este comando gera ou sobrescreve a pasta `dist/`. Tudo o site precisa para rodar estará ali. O ambiente Nginx/Apache já deve estar apontado para ler a pasta `dist`.
   
   ⚠️ **Aviso Importante do Nginx:** 
   Como o sistema usa navegação interna client-side pelo `react-router-dom` (Páginas como Login e Esqueci a Senha), a configuração (`/etc/nginx/sites-available/meusite`) do seu servidor precisa possuir o recarregador fallback habilitado para não dar erro 404 quando alguém acessar uma aba direta:
   ```nginx
   location / {
       try_files $uri $uri/ /index.html;
   }
   ```

4. Reinicie o servidor Web:
   ```bash
   sudo systemctl restart nginx
   # ou apache2
   ```

Pronto. Após o reinício, os usuários ao acessarem a plataforma web verão as telas mais recentes já perfeitamente conectadas com o Go atualizado rodando em background!
