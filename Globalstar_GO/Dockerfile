# Etapa 1: Build
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Instalar dependências necessárias para compilação (se houver CGO)
RUN apk add --no-cache git

# Copiar arquivos de dependência
COPY go.mod go.sum ./
RUN go mod download

# Copiar o código fonte
COPY . .

# Compilar o binário (Desativar CGO para garantir portabilidade no Alpine)
RUN CGO_ENABLED=0 GOOS=linux go build -o api-server .

# Etapa 2: Runtime (Imagem leve)
FROM alpine:latest

WORKDIR /root/

# Instalar certificados CA (necessário para HTTPS/Satelite)
RUN apk --no-cache add ca-certificates

# Copiar o binário da etapa anterior
COPY --from=builder /app/api-server .

# Expor a porta definida no código
EXPOSE 5000

# Comando de inicialização
CMD ["./api-server"]