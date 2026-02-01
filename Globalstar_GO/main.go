package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	// IMPORTANTE: Mude 'meuprojeto' para o nome que está no seu go.mod
	"iot_modulo1.0/pkg/globalstar"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
)

// --- CONFIGURAÇÕES ---
var jwtKey = []byte("minha_chave_secreta_super_segura")
var db *sql.DB

// --- ESTRUTURAS AUTH/API ---
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type UserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type PermissionRequest struct {
	UserID   int `json:"user_id"`
	DeviceID int `json:"device_id"`
}

// --- INIT DB ---
func initDB() {
	var err error
	dsn := "root:@tcp(127.0.0.1:3306)/globalstar_db?parseTime=true"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatal("ERRO CRÍTICO: MySQL Offline.", err)
	}
	fmt.Println("Conectado ao MySQL com sucesso!")
}

// --- HANDLERS AUTH ---
func loginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var creds Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "JSON Inválido", http.StatusBadRequest)
		return
	}

	var storedHash, role string
	var userID int

	err := db.QueryRow("SELECT id, password_hash, role FROM users WHERE username = ?", creds.Username).Scan(&userID, &storedHash, &role)
	if err != nil {
		if err == sql.ErrNoRows {
			http.Error(w, "Usuário não encontrado", http.StatusUnauthorized)
		} else {
			log.Printf("ERRO BANCO: %v", err)
			http.Error(w, "Erro de Conexão", http.StatusInternalServerError)
		}
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(creds.Password)); err != nil {
		http.Error(w, "Senha incorreta", http.StatusUnauthorized)
		return
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:           userID,
		Role:             role,
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(expirationTime)},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(jwtKey)

	json.NewEncoder(w).Encode(map[string]string{
		"token": tokenString, "role": role, "username": creds.Username,
	})
}

// --- HANDLERS API ---
func apiMessagesHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	role := r.Header.Get("X-User-Role")

	var query string
	var rows *sql.Rows
	var err error

	if role == "admin" {
		query = `SELECT m.id, d.esn, m.payload, m.received_at 
		         FROM messages m JOIN devices d ON m.device_id = d.id 
		         ORDER BY m.received_at DESC LIMIT 500`
		rows, err = db.Query(query)
	} else {
		query = `SELECT m.id, d.esn, m.payload, m.received_at 
		         FROM messages m 
		         JOIN devices d ON m.device_id = d.id 
		         JOIN user_permissions up ON up.device_id = d.id
		         WHERE up.user_id = ?
		         ORDER BY m.received_at DESC LIMIT 500`
		rows, err = db.Query(query, userID)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	messages := make([]map[string]interface{}, 0)
	for rows.Next() {
		var id int
		var esn, payload string
		var t time.Time
		rows.Scan(&id, &esn, &payload, &t)
		messages = append(messages, map[string]interface{}{
			"id": id, "esn": esn, "payload": payload, "received_at": t.Format("02/01/2006 15:04:05"),
		})
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func adminDataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "admin" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	uRows, _ := db.Query("SELECT id, username FROM users WHERE role != 'admin'")
	defer uRows.Close()
	users := make([]map[string]interface{}, 0)
	for uRows.Next() {
		var id int
		var name string
		uRows.Scan(&id, &name)
		users = append(users, map[string]interface{}{"id": id, "username": name})
	}
	dRows, _ := db.Query("SELECT id, esn FROM devices")
	defer dRows.Close()
	devices := make([]map[string]interface{}, 0)
	for dRows.Next() {
		var id int
		var esn string
		dRows.Scan(&id, &esn)
		devices = append(devices, map[string]interface{}{"id": id, "esn": esn})
	}
	json.NewEncoder(w).Encode(map[string]interface{}{"users": users, "devices": devices})
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "admin" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	var u UserRequest
	json.NewDecoder(r.Body).Decode(&u)
	hash, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 14)
	db.Exec("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", u.Username, hash, u.Role)
	w.WriteHeader(http.StatusCreated)
}

func grantPermissionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "admin" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	var p PermissionRequest
	json.NewDecoder(r.Body).Decode(&p)
	db.Exec("INSERT IGNORE INTO user_permissions (user_id, device_id) VALUES (?, ?)", p.UserID, p.DeviceID)
	w.WriteHeader(http.StatusOK)
}

// --- MIDDLEWARE ---
func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.Header.Get("Authorization")
		if tokenStr == "" {
			http.Error(w, "No Token", http.StatusUnauthorized)
			return
		}
		tokenStr = strings.Replace(tokenStr, "Bearer ", "", 1)
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) { return jwtKey, nil })
		if err != nil || !token.Valid {
			http.Error(w, "Invalid Token", http.StatusUnauthorized)
			return
		}
		r.Header.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
		r.Header.Set("X-User-Role", claims.Role)
		next(w, r)
	}
}

func main() {
	initDB()

	// --- AQUI A MÁGICA ---
	// Iniciamos o serviço Globalstar passando a conexão do banco
	gsService := globalstar.NewService(db)

	mux := http.NewServeMux()
	mux.HandleFunc("/login", loginHandler)

	// Usamos o método do novo pacote
	mux.HandleFunc("/globalstar/listener", gsService.StreamHandler)

	mux.HandleFunc("/api/messages", authMiddleware(apiMessagesHandler))
	mux.HandleFunc("/api/admin/data", authMiddleware(adminDataHandler))
	mux.HandleFunc("/api/admin/create-user", authMiddleware(createUserHandler))
	mux.HandleFunc("/api/admin/grant", authMiddleware(grantPermissionHandler))

	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	}).Handler(mux)

	server := &http.Server{
		Addr: ":5000", Handler: handler,
		ReadTimeout: 0, WriteTimeout: 30 * time.Second, IdleTimeout: 120 * time.Second,
	}

	fmt.Println("--- SERVIDOR (Refatorado) RODANDO NA PORTA 5000 ---")
	log.Fatal(server.ListenAndServe())
}
