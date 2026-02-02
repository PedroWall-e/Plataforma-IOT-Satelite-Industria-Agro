package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"iot_modulo1.0/pkg/globalstar" // Mantenha seu import correto aqui

	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"github.com/rs/cors"
	"golang.org/x/crypto/bcrypt"
)

// --- CONFIGURAÇÕES ---
var jwtKey = []byte("minha_chave_secreta_super_segura")
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

// NOVO: Estrutura para atualizar o nome do device
type DeviceUpdate struct {
	ESN  string `json:"esn"`
	Name string `json:"name"`
}

func initDB() {
	var err error
	dsn := "root:@tcp(127.0.0.1:3306)/globalstar_db?parseTime=true"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	db.SetMaxOpenConns(25)
	if err := db.Ping(); err != nil {
		log.Fatal("MySQL Offline", err)
	}
	fmt.Println("Conectado ao MySQL!")
}

// --- HANDLERS AUTH ---
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
		http.Error(w, "Credenciais inválidas", http.StatusUnauthorized)
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
		"token": tokenString, "role": role, "username": creds.Username, "full_name": fullName,
	})
}

// --- HANDLERS MENSAGENS ---
func apiMessagesHandler(w http.ResponseWriter, r *http.Request) {
	userID := r.Header.Get("X-User-ID")
	role := r.Header.Get("X-User-Role")

	var query string
	var rows *sql.Rows
	var err error

	// ATUALIZADO: Agora buscamos também o 'd.name'
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
		DeviceName string   `json:"device_name"` // NOVO CAMPO
		Payload    string   `json:"payload"`
		ReceivedAt string   `json:"received_at"`
		DeviceID   int      `json:"-"`
		SharedWith []string `json:"shared_with"`
	}

	messages := make([]MsgResponse, 0)

	for rows.Next() {
		var m MsgResponse
		var t time.Time
		// Scan atualizado com d.name
		rows.Scan(&m.ID, &m.ESN, &m.DeviceName, &m.Payload, &t, &m.DeviceID)
		m.ReceivedAt = t.Format("02/01/2006 15:04:05")
		m.SharedWith = []string{}
		messages = append(messages, m)
	}

	// Lógica de Compartilhamento (igual ao anterior)
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

// --- NOVO: Handler para Atualizar Nome do Dispositivo ---
func updateDeviceNameHandler(w http.ResponseWriter, r *http.Request) {
	// Qualquer usuário logado pode alterar o nome (conforme pedido)
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
	w.WriteHeader(http.StatusOK)
}

// --- HANDLERS MASTER ---
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

	// ATUALIZADO: Buscar também o nome no painel master
	dRows, _ := db.Query("SELECT id, esn, name FROM devices")
	type DeviceData struct {
		ID    int      `json:"id"`
		ESN   string   `json:"esn"`
		Name  string   `json:"name"` // NOVO
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

	if u.ID > 0 {
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
	initDB()
	gsService := globalstar.NewService(db)
	mux := http.NewServeMux()

	mux.HandleFunc("/login", loginHandler)
	mux.HandleFunc("/globalstar/listener", gsService.StreamHandler)

	mux.HandleFunc("/api/messages", authMiddleware(apiMessagesHandler))

	// NOVA ROTA PARA RENOMEAR
	mux.HandleFunc("/api/device/update", authMiddleware(updateDeviceNameHandler))

	mux.HandleFunc("/api/master/data", authMiddleware(masterDataHandler))
	mux.HandleFunc("/api/master/user", authMiddleware(upsertUserHandler))
	mux.HandleFunc("/api/master/user/delete", authMiddleware(deleteUserHandler))
	mux.HandleFunc("/api/master/permission", authMiddleware(permissionHandler))

	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:5173", "http://localhost:3000"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS", "PUT", "DELETE"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	}).Handler(mux)

	server := &http.Server{Addr: ":5000", Handler: handler, ReadTimeout: 0, WriteTimeout: 30 * time.Second}
	fmt.Println("--- SERVIDOR V3 (COM NOMES PERSONALIZADOS) ---")
	log.Fatal(server.ListenAndServe())
}
