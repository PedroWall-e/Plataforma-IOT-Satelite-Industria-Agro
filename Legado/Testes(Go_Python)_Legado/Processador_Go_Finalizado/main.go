package main

import (
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// --- Estruturas (Iguais) ---
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

func getGlobalstarTime() string {
	return time.Now().UTC().Format("02/01/2006 15:04:05 GMT")
}

// --- WORKER: O Trabalhador ---
// Esta função fica "ouvindo" o canal de jobs. Ela nunca para até o canal fechar.
func worker(id int, jobs <-chan StuMessage, wg *sync.WaitGroup) {
	defer wg.Done()

	for msg := range jobs {
		// AQUI ENTRA O PROCESSAMENTO PESADO (Banco de Dados)
		// Como temos um número fixo de workers, nunca vamos estourar o banco.

		// Simulação:
		// time.Sleep(50 * time.Millisecond)
		_ = msg // O "truque" para usar a variável sem logar e sem erro

		// Se quiser debugar (use com moderação em produção):
		// log.Printf("[Worker %d] Processou ESN: %s", id, msg.ESN)
	}
}

func globalstarStreamHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// 1. CONFIGURAÇÃO DO POOL
	const numWorkers = 20              // Apenas 20 mensagens processadas simultaneamente
	jobs := make(chan StuMessage, 100) // Buffer de 100 mensagens na memória RAM
	var wg sync.WaitGroup

	// Inicia os Workers (Eles ficam parados esperando trabalho)
	for w := 1; w <= numWorkers; w++ {
		wg.Add(1)
		go worker(w, jobs, &wg)
	}

	decoder := xml.NewDecoder(r.Body)
	var incomingID, rootTag, correlationID string
	var parseError error

	// 2. LEITURA (PRODUCER)
	// O loop lê o XML e joga as mensagens no canal 'jobs'
	for {
		t, err := decoder.Token()
		if err == io.EOF {
			break
		}
		if err != nil {
			log.Printf("Erro XML: %v", err)
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
					// ENVIA PARA O POOL
					// Se os workers estiverem ocupados e o buffer cheio,
					// essa linha bloqueia e espera liberar vaga.
					jobs <- msg
				}
			}
		}
	}

	// 3. FINALIZAÇÃO
	close(jobs) // Avisa aos workers que não tem mais mensagens chegando
	wg.Wait()   // Espera os workers terminarem o que já estava na fila

	// 4. RESPOSTA
	respTagName := "stuResponseMsg"
	if rootTag == "prvmsgs" {
		respTagName = "prvResponseMsg"
	}

	respState := "pass"
	respMsg := "Message received"
	if parseError != nil {
		respState = "fail"
		respMsg = "Error parsing XML"
		w.WriteHeader(http.StatusBadRequest)
	} else {
		w.WriteHeader(http.StatusOK)
	}

	respObj := ResponseXML{
		XMLName:           xml.Name{Local: respTagName},
		DeliveryTimeStamp: getGlobalstarTime(),
		MessageID:         incomingID,
		CorrelationID:     correlationID,
		State:             respState,
		StateMessage:      respMsg,
		Xmlns:             "http://www.w3.org/2001/XMLSchema-instance",
	}

	w.Header().Set("Content-Type", "text/xml")
	w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>` + "\n"))
	xml.NewEncoder(w).Encode(respObj)
}

func main() {
	http.HandleFunc("/globalstar/listener", globalstarStreamHandler)

	server := &http.Server{
		Addr:         ":5000",
		Handler:      nil,
		ReadTimeout:  0, // Importante para Streaming
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	fmt.Println("--- Servidor com Worker Pool (Alta Carga Segura) ---")
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
