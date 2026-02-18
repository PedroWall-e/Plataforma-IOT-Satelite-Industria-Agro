package globalstar

import (
	"database/sql"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// --- ESTRUTURAS XML ---
type StuMessage struct {
	ESN     string `xml:"esn"`
	Payload string `xml:"payload"`
}

// --- SERVIÇO GLOBALSTAR ---
type Service struct {
	DB          *sql.DB
	DeviceCache map[string]int
	CacheMutex  sync.RWMutex
	// Canal para enviar atualizações em tempo real (apenas escrita)
	Broadcast chan<- interface{}
}

// Construtor: Cria uma nova instância do serviço
func NewService(db *sql.DB, broadcast chan<- interface{}) *Service {
	return &Service{
		DB:          db,
		DeviceCache: make(map[string]int),
		Broadcast:   broadcast,
	}
}

// --- MÉTODOS DO SERVIÇO ---

// 1. GetDeviceID
func (s *Service) getDeviceID(esn string) (int, error) {
	s.CacheMutex.RLock()
	id, exists := s.DeviceCache[esn]
	s.CacheMutex.RUnlock()
	if exists {
		return id, nil
	}

	s.CacheMutex.Lock()
	defer s.CacheMutex.Unlock()

	// Double check
	if id, exists = s.DeviceCache[esn]; exists {
		return id, nil
	}

	// Busca no banco
	err := s.DB.QueryRow("SELECT id FROM devices WHERE esn = ?", esn).Scan(&id)
	if err == nil {
		s.DeviceCache[esn] = id
		return id, nil
	}

	// Cria novo
	res, err := s.DB.Exec("INSERT INTO devices (esn) VALUES (?)", esn)
	if err != nil {
		return 0, err
	}
	lid, _ := res.LastInsertId()
	id = int(lid)
	s.DeviceCache[esn] = id
	return id, nil
}

// 2. Worker (Processamento e Envio WebSocket)
func (s *Service) worker(id int, jobs <-chan StuMessage, wg *sync.WaitGroup) {
	defer wg.Done()

	// Prepara a query
	stmt, err := s.DB.Prepare("INSERT INTO messages(device_id, payload, received_at) VALUES(?, ?, ?)")
	if err != nil {
		log.Printf("Erro prepare worker: %v", err)
		return
	}
	defer stmt.Close()

	for msg := range jobs {
		deviceID, err := s.getDeviceID(msg.ESN)
		if err != nil {
			log.Printf("Erro device ID: %v", err)
			continue
		}

		// 1. Executa a inserção no banco
		now := time.Now()
		_, err = stmt.Exec(deviceID, msg.Payload, now)
		if err != nil {
			log.Printf("Erro ao salvar mensagem: %v", err)
			continue
		}

		// 2. Envia para o WebSocket (Tempo Real) se o canal estiver disponível
		if s.Broadcast != nil {
			updateMsg := map[string]interface{}{
				"type":        "NEW_MESSAGE",
				"id":          0,
				"esn":         msg.ESN,
				"payload":     msg.Payload,
				"received_at": now.Format("02/01/2006 15:04:05"),
				"device_id":   deviceID,
			}

			// Envia sem bloquear
			select {
			case s.Broadcast <- updateMsg:
			default:
			}
		}
	}
}

// 3. Handler HTTP (Público) - Recebe requisições da Globalstar
func (s *Service) StreamHandler(w http.ResponseWriter, r *http.Request) {
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
		go s.worker(i, jobs, &wg)
	}

	decoder := xml.NewDecoder(r.Body)
	var incomingID, rootTag string

	// Loop de Leitura XML (Streaming leve para a memória)
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
				// Extrai o ID da mensagem para responder depois
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

	// =========================================================================
	// RESPOSTA FORMATADA EXATAMENTE COMO A GLOBALSTAR EXIGE
	// =========================================================================
	w.Header().Set("Content-Type", "text/xml")

	// Prevenção caso venha vazio
	if incomingID == "" {
		incomingID = "00000000000000000000000000000000"
	}

	// Formato exigido: dd/MM/yyyy hh:mm:ss GMT
	timestamp := time.Now().UTC().Format("02/01/2006 15:04:05 GMT")

	responseXML := fmt.Sprintf(`<?xml version="1.0" encoding="UTF-8"?>
<stuResponseMsg xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://cody.glpconnect.com/XSD/StuResponse_Rev1_0.xsd" deliveryTimeStamp="%s" messageID="%s" correlationID="%s">
    <state>pass</state>
    <stateMessage>Store OK</stateMessage>
</stuResponseMsg>`, timestamp, incomingID, incomingID)

	fmt.Fprint(w, responseXML)
}
