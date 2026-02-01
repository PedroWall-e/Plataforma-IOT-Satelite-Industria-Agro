package main

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
)

// --- CONFIGURAÇÕES ---
var jwtKey = []byte("minha_chave_secreta_super_segura") // Em produção, use variáveis de ambiente!
var db *sql.DB

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

type UserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Role     string `json:"role"`
}

type PermissionRequest struct {
	UserID   int `json:"user_id"`
	DeviceID int `json:"device_id"`
}

// Estruturas XML
type StuMessage struct {
	ESN     string `xml:"esn"`
	Payload string `xml:"payload"`
}

type ResponseXML struct {
	XMLName           xml.Name `xml:""`
	DeliveryTimeStamp string   `xml:"deliveryTimeStamp,attr"`
	MessageID         string   `xml:"messageID,attr"`
	CorrelationID     string   `xml:"correlationID,attr"`
	State             string   `xml:"state"`
	StateMessage      string   `xml:"stateMessage"`
	Xmlns             string   `xml:"xmlns:xsi,attr"`
}

// --- CACHE DE DISPOSITIVOS ---
var (
	deviceCache = make(map[string]int)
	cacheMutex  sync.RWMutex
)

// --- INICIALIZAÇÃO DO BANCO ---
func initDB() {
	var err error
	// Ajuste a string abaixo se sua senha do root não for vazia
	dsn := "root:@tcp(127.0.0.1:3306)/globalstar_db?parseTime=true"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatal("ERRO CRÍTICO: MySQL não está acessível. Verifique se o XAMPP está rodando.", err)
	}
	fmt.Println("Conectado ao MySQL com sucesso!")
}

// --- FUNÇÕES AUXILIARES ---
func getDeviceID(esn string) (int, error) {
	// 1. Busca no Cache
	cacheMutex.RLock()
	id, exists := deviceCache[esn]
	cacheMutex.RUnlock()
	if exists {
		return id, nil
	}

	// 2. Busca ou Cria no Banco
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	// Double check
	if id, exists = deviceCache[esn]; exists {
		return id, nil
	}

	err := db.QueryRow("SELECT id FROM devices WHERE esn = ?", esn).Scan(&id)
	if err == nil {
		deviceCache[esn] = id
		return id, nil
	}

	res, err := db.Exec("INSERT INTO devices (esn) VALUES (?)", esn)
	if err != nil {
		return 0, err
	}
	lid, _ := res.LastInsertId()
	id = int(lid)
	deviceCache[esn] = id
	return id, nil
}

// --- WORKER POOL ---
func worker(id int, jobs <-chan StuMessage, wg *sync.WaitGroup) {
	defer wg.Done()
	stmt, err := db.Prepare("INSERT INTO messages(device_id, payload, received_at) VALUES(?, ?, ?)")
	if err != nil {
		log.Printf("Erro prepare worker: %v", err)
		return
	}
	defer stmt.Close()

	for msg := range jobs {
		deviceID, err := getDeviceID(msg.ESN)
		if err != nil {
			log.Printf("Erro device ID: %v", err)
			continue
		}
		stmt.Exec(deviceID, msg.Payload, time.Now())
	}
}

// --- HANDLERS ---

// 1. Login
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
			http.Error(w, "Erro de Conexão com Banco", http.StatusInternalServerError)
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

// 2. Recebimento de XML (Globalstar)
func globalstarStreamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	const numWorkers = 10
	jobs := make(chan StuMessage, 100)
	var wg sync.WaitGroup

	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go worker(i, jobs, &wg)
	}

	decoder := xml.NewDecoder(r.Body)
	var incomingID, rootTag string

	for {
		t, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			break
		}

		switch se := t.(type) {
		case xml.StartElement:
			if rootTag == "" {
				rootTag = se.Name.Local
				for _, attr := range se.Attr {
					if attr.Name.Local == "messageID" {
						incomingID = attr.Value
					}
				}
			}
			if se.Name.Local == "stuMessage" {
				var msg StuMessage
				if err := decoder.DecodeElement(&msg, &se); err == nil {
					jobs <- msg
				}
			}
		}
	}

	close(jobs)
	wg.Wait()

	w.Header().Set("Content-Type", "text/xml")
	// Resposta simplificada para sucesso
	fmt.Fprintf(w, `<?xml version="1.0" encoding="UTF-8"?><stuResponseMsg deliveryTimeStamp="%s" messageID="%s" state="pass" stateMessage="OK" />`,
		time.Now().UTC().Format("02/01/2006 15:04:05 GMT"), incomingID)
}

// 3. API Listar Mensagens
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

	// IMPORTANTE: Inicializar com make(..., 0) para retornar [] no JSON e não null
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

// 4. API Admin
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
	mux := http.NewServeMux()

	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/globalstar/listener", globalstarStreamHandler)

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

	fmt.Println("--- SERVIDOR RODANDO NA PORTA 5000 ---")
	log.Fatal(server.ListenAndServe())
}
