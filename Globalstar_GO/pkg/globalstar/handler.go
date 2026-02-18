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

type ResponseXML struct {
	XMLName           xml.Name `xml:""`
	DeliveryTimeStamp string   `xml:"deliveryTimeStamp,attr"`
	MessageID         string   `xml:"messageID,attr"`
	CorrelationID     string   `xml:"correlationID,attr"`
	State             string   `xml:"state"`
	StateMessage      string   `xml:"stateMessage"`
	Xmlns             string   `xml:"xmlns:xsi,attr"`
}

// --- SERVIÇO GLOBALSTAR ---
type Service struct {
	DB          *sql.DB
	DeviceCache map[string]int
	CacheMutex  sync.RWMutex
	// NOVO: Canal para enviar atualizações em tempo real (apenas escrita)
	Broadcast chan<- interface{}
}

// Construtor: Cria uma nova instância do serviço (agora recebe o broadcast)
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
			// Cria o objeto JSON que o frontend espera
			updateMsg := map[string]interface{}{
				"type":        "NEW_MESSAGE", // Identificador opcional
				"id":          0,             // ID omitido ou temporário
				"esn":         msg.ESN,
				"payload":     msg.Payload,
				"received_at": now.Format("02/01/2006 15:04:05"),
				"device_id":   deviceID,
			}

			// Envia sem bloquear (select default evita travar se ninguém estiver a ouvir)
			select {
			case s.Broadcast <- updateMsg:
			default:
				// Canal cheio ou bloqueado, descarta para não afetar a receção do satélite
			}
		}
	}
}

// 3. Handler HTTP (Público)
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

	// Loop de Leitura XML
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

	// Resposta
	w.Header().Set("Content-Type", "text/xml")
	fmt.Fprintf(w, `<?xml version="1.0" encoding="UTF-8"?><stuResponseMsg deliveryTimeStamp="%s" messageID="%s" state="pass" stateMessage="OK" />`,
		time.Now().UTC().Format("02/01/2006 15:04:05 GMT"), incomingID)
}
