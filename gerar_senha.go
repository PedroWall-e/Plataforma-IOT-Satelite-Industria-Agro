package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Uso: go run gerar_senha.go <sua_senha>")
		return
	}

	password := os.Args[1]

	// Gera o hash com custo 14 (o mesmo que usamos no main.go)
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		panic(err)
	}

	fmt.Println("--- COPIE O HASH ABAIXO PARA O BANCO DE DADOS ---")
	fmt.Println(string(bytes))
	fmt.Println("-------------------------------------------------")
}
