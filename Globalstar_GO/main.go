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

	_ "github.com/go-sql-driver/mysql" // Driver MySQL
)

// --- Estruturas XML ---
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

// --- Estrutura JSON para o Frontend ---
type MessageDisplay struct {
	ID         int    `json:"id"`
	ESN        string `json:"esn"`
	Payload    string `json:"payload"`
	ReceivedAt string `json:"received_at"`
}

var db *sql.DB

func initDB() {
	var err error
	// Usuário: root, Senha: (vazio), Host: localhost, Banco: globalstar_db
	dsn := "root:@tcp(127.0.0.1:3306)/globalstar_db?parseTime=true"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}

	// Configuração do Pool de Conexões do MySQL
	db.SetMaxOpenConns(25) // Máximo de conexões abertas (deve ser >= numWorkers)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatal("Não foi possível conectar ao MySQL:", err)
	}
	fmt.Println("Conectado ao MySQL com sucesso!")
}

// --- WORKER: Persistência no Banco ---
func worker(id int, jobs <-chan StuMessage, wg *sync.WaitGroup) {
	defer wg.Done()

	// Prepara a query uma vez para reutilizar (Performance)
	stmt, err := db.Prepare("INSERT INTO messages(esn, payload, received_at) VALUES(?, ?, ?)")
	if err != nil {
		log.Printf("Erro ao preparar query: %v", err)
		return
	}
	defer stmt.Close()

	for msg := range jobs {
		// Insere no banco
		_, err := stmt.Exec(msg.ESN, msg.Payload, time.Now())
		if err != nil {
			log.Printf("[Worker %d] Erro ao salvar ESN %s: %v", id, msg.ESN, err)
		} else {
			// log.Printf("[Worker %d] Salvo ESN: %s", id, msg.ESN) // Opcional: Logar sucesso
		}
	}
}

// --- Handler de Recebimento XML (Listener) ---
func globalstarStreamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	const numWorkers = 10
	jobs := make(chan StuMessage, 100)
	var wg sync.WaitGroup

	// Inicia Workers
	for i := 0; i < numWorkers; i++ {
		wg.Add(1)
		go worker(i, jobs, &wg)
	}

	decoder := xml.NewDecoder(r.Body)
	var incomingID, rootTag, correlationID string
	var parseError error

	// Loop de Leitura
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
					jobs <- msg // Envia para o banco via channel
				}
			}
		}
	}

	close(jobs)
	wg.Wait()

	// Resposta XML
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

// --- Handler da API (Para o Frontend) ---
func apiMessagesHandler(w http.ResponseWriter, r *http.Request) {
	// Busca as últimas 500 mensagens ordenadas por data
	rows, err := db.Query("SELECT id, esn, payload, received_at FROM messages ORDER BY received_at DESC LIMIT 500")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var messages []MessageDisplay
	for rows.Next() {
		var m MessageDisplay
		var t time.Time // Variavel temporaria para formatar a data
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

	// Endpoint para receber o XML da Globalstar
	http.HandleFunc("/globalstar/listener", globalstarStreamHandler)

	// Endpoint para o Frontend consumir os dados
	http.HandleFunc("/api/messages", apiMessagesHandler)

	// Serve os arquivos HTML/CSS/JS da pasta "static"
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	server := &http.Server{
		Addr:         ":5000",
		ReadTimeout:  0,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	fmt.Println("--- Servidor Full Stack Rodando na porta 5000 ---")
	fmt.Println("-> Listener XML: http://localhost:5000/globalstar/listener")
	fmt.Println("-> Dashboard (Frontend): http://localhost:5000/")

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
