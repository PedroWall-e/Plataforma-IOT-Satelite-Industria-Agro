package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"iot_modulo1.0/pkg/globalstar"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
)

// --- CONFIGURAÇÕES GLOBAIS ---
var jwtKey []byte
var db *sql.DB

// --- CONFIGURAÇÕES WEBSOCKET ---
var upgrader = websocket.Upgrader{
	// Isso garante que o WebSocket funcione vindo de qualquer IP
	CheckOrigin: func(r *http.Request) bool { return true },
}

// Canal para broadcast de mensagens (usado pelo pacote globalstar e handlers)
var broadcast = make(chan interface{})
var clients = make(map[*websocket.Conn]bool)

// --- ESTRUTURAS ---
type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type UserData struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Password string `json:"password,omitempty"`
	Role     string `json:"role"`
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
	City     string `json:"city"`
	State    string `json:"state"`
}

type PermissionRequest struct {
	UserID   int    `json:"user_id"`
	DeviceID int    `json:"device_id"`
	Action   string `json:"action"`
}

type DeviceUpdate struct {
	ESN  string `json:"esn"`
	Name string `json:"name"`
}

// Estrutura para Logs de Auditoria
type AuditLog struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Action    string `json:"action"`
	Details   string `json:"details"`
	IP        string `json:"ip_address"`
	CreatedAt string `json:"created_at"`
}

// --- FUNÇÕES AUXILIARES ---

// createAuditLog: Grava logs de segurança no banco de dados
func createAuditLog(userID int, username, action, details, ip string) {
	log.Printf("[AUDIT] User: %s | Action: %s | Det: %s", username, action, details)

	go func() {
		// Tenta gravar no banco (assume que userID pode ser 0 ou NULL dependendo do schema)
		_, err := db.Exec("INSERT INTO audit_logs (user_id, username, action, details, ip_address) VALUES (?, ?, ?, ?, ?)",
			userID, username, action, details, ip)
		if err != nil {
			log.Printf("ERRO CRÍTICO AO GRAVAR LOG: %v", err)
		}
	}()
}

func initDB() {
	_ = godotenv.Load()

	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASS")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser, dbPass, dbHost, dbPort, dbName)

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal("Erro driver MySQL:", err)
	}
	db.SetMaxOpenConns(25)

	if err := db.Ping(); err != nil {
		log.Fatal("MySQL Offline:", err)
	}
	fmt.Println("Conectado ao MySQL!")
}

// --- WEBSOCKET HANDLERS ---

// handleConnections: Gerencia novas conexões WebSocket
func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Erro WS Upgrade: %v", err)
		return
	}
	defer ws.Close()

	clients[ws] = true

	// Loop para manter conexão ativa
	for {
		var msg map[string]interface{}
		// Lê mensagens do cliente (ping/pong ou comandos)
		err := ws.ReadJSON(&msg)
		if err != nil {
			delete(clients, ws)
			break
		}
	}
}

// handleMessages: Goroutine que distribui mensagens para todos os clientes conectados
func handleMessages() {
	for {
		msg := <-broadcast
		for client := range clients {
			err := client.WriteJSON(msg)
			if err != nil {
				log.Printf("Erro WS Write: %v", err)
				client.Close()
				delete(clients, client)
			}
		}
	}
}

// --- API HANDLERS ---

func loginHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var creds Credentials
	json.NewDecoder(r.Body).Decode(&creds)

	var storedHash, role, fullName string
	var userID int

	err := db.QueryRow("SELECT id, password_hash, role, full_name FROM users WHERE username = ?", creds.Username).Scan(&userID, &storedHash, &role, &fullName)
	if err != nil {
		http.Error(w, "Credenciais inválidas", http.StatusUnauthorized)
		return
	}

	if err = bcrypt.CompareHashAndPassword([]byte(storedHash), []byte(creds.Password)); err != nil {
		createAuditLog(userID, creds.Username, "LOGIN_FAILED", "Senha incorreta", r.RemoteAddr)
		http.Error(w, "Credenciais inválidas", http.StatusUnauthorized)
		return
	}

	createAuditLog(userID, creds.Username, "LOGIN", "Login realizado com sucesso", r.RemoteAddr)

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &Claims{
		UserID:           userID,
		Role:             role,
		RegisteredClaims: jwt.RegisteredClaims{ExpiresAt: jwt.NewNumericDate(expirationTime)},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(jwtKey)

	json.NewEncoder(w).Encode(map[string]string{
		"token": tokenString, "role": role, "username": creds.Username, "full_name": fullName,
	})
}

func apiMessagesHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	role := r.Header.Get("X-User-Role")

	var query string
	var rows *sql.Rows
	var err error

	if role == "master" {
		query = `SELECT m.id, d.esn, d.name, m.payload, m.received_at, d.id 
		         FROM messages m JOIN devices d ON m.device_id = d.id 
		         ORDER BY m.received_at DESC LIMIT 500`
		rows, err = db.Query(query)
	} else {
		query = `SELECT m.id, d.esn, d.name, m.payload, m.received_at, d.id 
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

	type MsgResponse struct {
		ID         int      `json:"id"`
		ESN        string   `json:"esn"`
		DeviceName string   `json:"device_name"`
		Payload    string   `json:"payload"`
		ReceivedAt string   `json:"received_at"`
		DeviceID   int      `json:"-"`
		SharedWith []string `json:"shared_with"`
	}

	messages := make([]MsgResponse, 0)

	for rows.Next() {
		var m MsgResponse
		var t time.Time
		rows.Scan(&m.ID, &m.ESN, &m.DeviceName, &m.Payload, &t, &m.DeviceID)
		m.ReceivedAt = t.Format("02/01/2006 15:04:05")
		m.SharedWith = []string{}
		messages = append(messages, m)
	}

	if len(messages) > 0 && role != "master" {
		for i := range messages {
			devID := messages[i].DeviceID
			shareRows, _ := db.Query(`
				SELECT u.full_name FROM users u
				JOIN user_permissions up ON up.user_id = u.id
				WHERE up.device_id = ? AND u.id != ?`, devID, userID)

			var sharers []string
			if shareRows != nil {
				for shareRows.Next() {
					var name string
					shareRows.Scan(&name)
					if name != "" {
						sharers = append(sharers, name)
					}
				}
				shareRows.Close()
			}
			messages[i].SharedWith = sharers
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

// apiAuditLogsHandler: Retorna os logs para o frontend
func apiAuditLogsHandler(w http.ResponseWriter, r *http.Request) {
	role := r.Header.Get("X-User-Role")
	if role != "master" && role != "support" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	rows, err := db.Query("SELECT id, username, action, details, ip_address, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 100")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	logs := make([]AuditLog, 0)
	for rows.Next() {
		var l AuditLog
		var t time.Time
		rows.Scan(&l.ID, &l.Username, &l.Action, &l.Details, &l.IP, &t)
		l.CreatedAt = t.Format("02/01/2006 15:04:05")
		logs = append(logs, l)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}

func updateDeviceNameHandler(w http.ResponseWriter, r *http.Request) {
	var d DeviceUpdate
	if err := json.NewDecoder(r.Body).Decode(&d); err != nil {
		http.Error(w, "JSON inválido", 400)
		return
	}

	_, err := db.Exec("UPDATE devices SET name = ? WHERE esn = ?", d.Name, d.ESN)
	if err != nil {
		http.Error(w, "Erro ao atualizar nome", 500)
		return
	}

	// 1. Auditoria
	userID, _ := strconv.Atoi(r.Header.Get("X-User-ID"))
	createAuditLog(userID, "User:"+r.Header.Get("X-User-ID"), "UPDATE_DEVICE", fmt.Sprintf("ESN %s renomeado para %s", d.ESN, d.Name), r.RemoteAddr)

	// 2. Broadcast WebSocket
	broadcast <- map[string]string{
		"type": "DEVICE_UPDATE",
		"esn":  d.ESN,
		"name": d.Name,
	}

	w.WriteHeader(http.StatusOK)
}

func masterDataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "master" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	uRows, _ := db.Query("SELECT id, username, role, full_name, email, phone, address, city, state FROM users ORDER BY id DESC")
	users := make([]UserData, 0)
	defer uRows.Close()
	for uRows.Next() {
		var u UserData
		uRows.Scan(&u.ID, &u.Username, &u.Role, &u.FullName, &u.Email, &u.Phone, &u.Address, &u.City, &u.State)
		users = append(users, u)
	}

	dRows, _ := db.Query("SELECT id, esn, name FROM devices")
	type DeviceData struct {
		ID    int      `json:"id"`
		ESN   string   `json:"esn"`
		Name  string   `json:"name"`
		Users []string `json:"users"`
	}
	devices := make([]DeviceData, 0)
	defer dRows.Close()

	for dRows.Next() {
		var d DeviceData
		dRows.Scan(&d.ID, &d.ESN, &d.Name)

		pRows, _ := db.Query("SELECT u.username FROM users u JOIN user_permissions up ON up.user_id = u.id WHERE up.device_id = ?", d.ID)
		usersLinked := []string{}
		for pRows.Next() {
			var uname string
			pRows.Scan(&uname)
			usersLinked = append(usersLinked, uname)
		}
		pRows.Close()
		d.Users = usersLinked
		devices = append(devices, d)
	}

	json.NewEncoder(w).Encode(map[string]interface{}{"users": users, "devices": devices})
}

func upsertUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "master" {
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}
	var u UserData
	json.NewDecoder(r.Body).Decode(&u)

	actorID, _ := strconv.Atoi(r.Header.Get("X-User-ID"))
	actionType := "CREATE_USER"
	details := fmt.Sprintf("Criou usuário %s", u.Username)

	if u.ID > 0 {
		actionType = "UPDATE_USER"
		details = fmt.Sprintf("Atualizou usuário ID %d (%s)", u.ID, u.Username)
		if u.Password != "" {
			hash, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 14)
			db.Exec(`UPDATE users SET username=?, password_hash=?, role=?, full_name=?, email=?, phone=?, address=?, city=?, state=? WHERE id=?`,
				u.Username, hash, u.Role, u.FullName, u.Email, u.Phone, u.Address, u.City, u.State, u.ID)
		} else {
			db.Exec(`UPDATE users SET username=?, role=?, full_name=?, email=?, phone=?, address=?, city=?, state=? WHERE id=?`,
				u.Username, u.Role, u.FullName, u.Email, u.Phone, u.Address, u.City, u.State, u.ID)
		}
	} else {
		hash, _ := bcrypt.GenerateFromPassword([]byte(u.Password), 14)
		db.Exec(`INSERT INTO users (username, password_hash, role, full_name, email, phone, address, city, state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			u.Username, hash, u.Role, u.FullName, u.Email, u.Phone, u.Address, u.City, u.State)
	}

	createAuditLog(actorID, "Master", actionType, details, r.RemoteAddr)
	w.WriteHeader(http.StatusOK)
}

func deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "master" {
		http.Error(w, "Forbidden", 403)
		return
	}
	var u UserData
	json.NewDecoder(r.Body).Decode(&u)
	db.Exec("DELETE FROM users WHERE id = ?", u.ID)

	actorID, _ := strconv.Atoi(r.Header.Get("X-User-ID"))
	createAuditLog(actorID, "Master", "DELETE_USER", fmt.Sprintf("Deletou usuário ID %d", u.ID), r.RemoteAddr)

	w.WriteHeader(http.StatusOK)
}

func permissionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Header.Get("X-User-Role") != "master" {
		http.Error(w, "Forbidden", 403)
		return
	}
	var p PermissionRequest
	json.NewDecoder(r.Body).Decode(&p)

	if p.Action == "grant" {
		db.Exec("INSERT IGNORE INTO user_permissions (user_id, device_id) VALUES (?, ?)", p.UserID, p.DeviceID)
	} else if p.Action == "revoke" {
		db.Exec("DELETE FROM user_permissions WHERE user_id = ? AND device_id = ?", p.UserID, p.DeviceID)
	}

	actorID, _ := strconv.Atoi(r.Header.Get("X-User-ID"))
	createAuditLog(actorID, "Master", "PERMISSION_CHANGE", fmt.Sprintf("%s device %d para user %d", p.Action, p.DeviceID, p.UserID), r.RemoteAddr)

	w.WriteHeader(http.StatusOK)
}

func authMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		tokenStr := r.Header.Get("Authorization")
		if tokenStr == "" {
			http.Error(w, "No Token", 401)
			return
		}
		tokenStr = strings.Replace(tokenStr, "Bearer ", "", 1)
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) { return jwtKey, nil })
		if err != nil || !token.Valid {
			http.Error(w, "Invalid Token", 401)
			return
		}
		r.Header.Set("X-User-ID", fmt.Sprintf("%d", claims.UserID))
		r.Header.Set("X-User-Role", claims.Role)
		next(w, r)
	}
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Aviso: .env não encontrado, usando variáveis de ambiente.")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("ERRO: JWT_SECRET obrigatório.")
	}
	jwtKey = []byte(jwtSecret)

	initDB()

	// Inicia o "carteiro" do WebSocket em background
	go handleMessages()

	// Serviço para processar XML da Globalstar (AGORA RECEBE O BROADCAST)
	gsService := globalstar.NewService(db, broadcast)

	mux := http.NewServeMux()

	// Rotas
	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/globalstar/listener", gsService.StreamHandler)
	mux.HandleFunc("/ws", handleConnections) // Endpoint WebSocket

	// API Protegida
	mux.HandleFunc("/api/messages", authMiddleware(apiMessagesHandler))
	mux.HandleFunc("/api/device/update", authMiddleware(updateDeviceNameHandler))
	mux.HandleFunc("/api/audit", authMiddleware(apiAuditLogsHandler))

	// Master
	mux.HandleFunc("/api/master/data", authMiddleware(masterDataHandler))
	mux.HandleFunc("/api/master/user", authMiddleware(upsertUserHandler))
	mux.HandleFunc("/api/master/user/delete", authMiddleware(deleteUserHandler))
	mux.HandleFunc("/api/master/permission", authMiddleware(permissionHandler))

	// ============================================================
	// CORREÇÃO DO CORS: Adicionando os IPs permitidos (Frontend)
	// ============================================================
	handler := cors.New(cors.Options{
		// Permite acessos de qualquer IP (Resolve o problema de rodar local vs nuvem)
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS", "PUT", "DELETE"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "Accept", "X-Requested-With"},
		AllowCredentials: true,
		Debug:            false, // Pode colocar false agora para limpar os logs
	}).Handler(mux)

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = ":5000"
	}

	server := &http.Server{
		Addr:         port,
		Handler:      handler,
		ReadTimeout:  0, // Necessário para WS e Streaming
		WriteTimeout: 30 * time.Second,
	}

	fmt.Printf("--- SERVIDOR (WS + AUDIT) A CORRER NA PORTA %s ---\n", port)
	log.Fatal(server.ListenAndServe())
}
