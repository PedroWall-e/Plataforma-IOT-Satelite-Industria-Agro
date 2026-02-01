package main

import (
	"database/sql"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

// --- Estruturas ---
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

// JSON para o Frontend (A estrutura de saída continua a mesma para não quebrar o front)
type MessageDisplay struct {
	ID         int    `json:"id"`
	ESN        string `json:"esn"`
	Payload    string `json:"payload"`
	ReceivedAt string `json:"received_at"`
}

var db *sql.DB

// --- CACHE DE DISPOSITIVOS ---
// Evita consultar a tabela 'devices' a todo momento.
var (
	deviceCache = make(map[string]int) // Mapa: "0-123456" -> ID 1
	cacheMutex  sync.RWMutex           // Protege o mapa contra acesso simultâneo
)

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
		log.Fatal("Erro no MySQL:", err)
	}
	fmt.Println("Conectado ao MySQL com sucesso!")
}

// --- FUNÇÃO AUXILIAR INTELIGENTE ---
// Busca o ID do ESN. Se não existir, cria no banco.
func getDeviceID(esn string) (int, error) {
	// 1. Tenta ler do Cache (Rápido)
	cacheMutex.RLock()
	id, exists := deviceCache[esn]
	cacheMutex.RUnlock()
	if exists {
		return id, nil
	}

	// 2. Se não está no cache, bloqueia para escrita/banco
	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	// Checa novamente (double-check) pois outra goroutine pode ter criado enquanto esperávamos
	if id, exists = deviceCache[esn]; exists {
		return id, nil
	}

	// 3. Tenta buscar no Banco (caso tenha reiniciado o servidor)
	err := db.QueryRow("SELECT id FROM devices WHERE esn = ?", esn).Scan(&id)
	if err == nil {
		deviceCache[esn] = id // Atualiza cache
		return id, nil
	}

	// 4. Se não existe no banco, INSERE NOVO DISPOSITIVO
	res, err := db.Exec("INSERT INTO devices (esn) VALUES (?)", esn)
	if err != nil {
		return 0, err
	}
	lid, _ := res.LastInsertId()
	id = int(lid)

	// 5. Salva no cache
	deviceCache[esn] = id
	return id, nil
}

// --- WORKER ---
func worker(id int, jobs <-chan StuMessage, wg *sync.WaitGroup) {
	defer wg.Done()

	// Prepara query de inserção na tabela RELACIONAL
	stmt, err := db.Prepare("INSERT INTO messages(device_id, payload, received_at) VALUES(?, ?, ?)")
	if err != nil {
		log.Printf("Erro prepare: %v", err)
		return
	}
	defer stmt.Close()

	for msg := range jobs {
		// Pega o ID Relacional (Pode criar o device se for novo)
		deviceID, err := getDeviceID(msg.ESN)
		if err != nil {
			log.Printf("Erro ao processar ID do dispositivo %s: %v", msg.ESN, err)
			continue
		}

		// Insere a mensagem vinculada ao ID
		_, err = stmt.Exec(deviceID, msg.Payload, time.Now())
		if err != nil {
			log.Printf("Erro insert msg: %v", err)
		}
	}
}

// --- HANDLER RECEBIMENTO XML ---
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
	var incomingID, rootTag, correlationID string
	var parseError error

	for {
		t, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			parseError = err
			break
		}

		switch se := t.(type) {
		case xml.StartElement:
			if rootTag == "" {
				rootTag = se.Name.Local
				for _, attr := range se.Attr {
					if attr.Name.Local == "messageID" || attr.Name.Local == "prvMessageID" {
						incomingID = attr.Value
						correlationID = attr.Value
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

	// Resposta
	respTagName := "stuResponseMsg"
	if rootTag == "prvmsgs" {
		respTagName = "prvResponseMsg"
	}

	respState := "pass"
	if parseError != nil {
		respState = "fail"
		w.WriteHeader(http.StatusBadRequest)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	respObj := ResponseXML{
		XMLName:           xml.Name{Local: respTagName},
		DeliveryTimeStamp: time.Now().UTC().Format("02/01/2006 15:04:05 GMT"),
		MessageID:         incomingID,
		CorrelationID:     correlationID,
		State:             respState,
		StateMessage:      "Message processed",
		Xmlns:             "http://www.w3.org/2001/XMLSchema-instance",
	}

	w.Header().Set("Content-Type", "text/xml")
	w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>` + "\n"))
	xml.NewEncoder(w).Encode(respObj)
}

// --- HANDLER API (COM JOIN) ---
func apiMessagesHandler(w http.ResponseWriter, r *http.Request) {
	// AQUI ESTÁ A MÁGICA: O JOIN
	// Nós buscamos os dados cruzando as tabelas 'messages' e 'devices'
	query := `
		SELECT m.id, d.esn, m.payload, m.received_at 
		FROM messages m
		JOIN devices d ON m.device_id = d.id
		ORDER BY m.received_at DESC 
		LIMIT 500
	`

	rows, err := db.Query(query)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []MessageDisplay
	for rows.Next() {
		var m MessageDisplay
		var t time.Time
		if err := rows.Scan(&m.ID, &m.ESN, &m.Payload, &t); err != nil {
			continue
		}
		m.ReceivedAt = t.Format("02/01/2006 15:04:05")
		messages = append(messages, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(messages)
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/globalstar/listener", globalstarStreamHandler)
	http.HandleFunc("/api/messages", apiMessagesHandler)
	http.Handle("/", http.FileServer(http.Dir("./static")))

	server := &http.Server{
		Addr:         ":5000",
		ReadTimeout:  0,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	fmt.Println("--- Servidor Go Relacional (JOINs) Rodando na porta 5000 ---")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
