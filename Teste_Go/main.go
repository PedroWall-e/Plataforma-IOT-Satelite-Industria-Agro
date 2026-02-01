package main

import (
	"bytes"
	"encoding/xml"
	"fmt"
	"io"
	"log"
	"net/http"
	"time"
)

// --- Estruturas (Structs) para ler o XML da Globalstar ---

// Estrutura para mensagens de Telemetria (stuMessages)
type StuMessages struct {
	XMLName   xml.Name     `xml:"stuMessages"`
	MessageID string       `xml:"messageID,attr"`
	Messages  []StuMessage `xml:"stuMessage"`
}

type StuMessage struct {
	ESN     string `xml:"esn"`
	Payload string `xml:"payload"`
}

// Estrutura para mensagens de Provisionamento (prvmsgs)
type PrvMsgs struct {
	XMLName      xml.Name `xml:"prvmsgs"`
	PrvMessageID string   `xml:"prvMessageID,attr"`
}

// --- Estrutura para gerar a Resposta XML ---

type ResponseXML struct {
	XMLName           xml.Name `xml:""` // Nome definido dinamicamente
	DeliveryTimeStamp string   `xml:"deliveryTimeStamp,attr"`
	MessageID         string   `xml:"messageID,attr"`
	CorrelationID     string   `xml:"correlationID,attr"`
	State             string   `xml:"state"`
	StateMessage      string   `xml:"stateMessage"`
	Xmlns             string   `xml:"xmlns:xsi,attr"`
}

// Gera a data no formato Globalstar: dd/MM/yyyy hh:mm:ss GMT
func getGlobalstarTime() string {
	return time.Now().UTC().Format("02/01/2006 15:04:05 GMT")
}

// Função principal que recebe a requisição
func globalstarHandler(w http.ResponseWriter, r *http.Request) {
	// Verifica se é POST
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Lê os dados brutos
	bodyBytes, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Erro ao ler dados", http.StatusInternalServerError)
		return
	}
	defer r.Body.Close()

	// Identifica a tag raiz "espiando" o XML
	decoder := xml.NewDecoder(bytes.NewReader(bodyBytes))
	var rootTag string
	var incomingID string

	// Loop para achar a primeira tag (raiz)
	for {
		token, _ := decoder.Token()
		if token == nil {
			break
		}
		if startElement, ok := token.(xml.StartElement); ok {
			rootTag = startElement.Name.Local // Pega o nome sem namespace
			break
		}
	}

	// Processa de acordo com o tipo (STU ou PRV)
	switch rootTag {
	case "stuMessages":
		var msg StuMessages
		// Transforma XML em Objeto Go
		if err := xml.Unmarshal(bodyBytes, &msg); err == nil {
			incomingID = msg.MessageID
			log.Printf("Recebido STU Message. ID: %s", incomingID)

			// Exemplo: Imprimir no terminal cada mensagem recebida
			for _, m := range msg.Messages {
				log.Printf("--> ESN: %s | Payload: %s", m.ESN, m.Payload)
			}
		}

	case "prvmsgs":
		var msg PrvMsgs
		if err := xml.Unmarshal(bodyBytes, &msg); err == nil {
			incomingID = msg.PrvMessageID
			log.Printf("Recebido Provisioning. ID: %s", incomingID)
		}

	default:
		log.Printf("Tag desconhecida recebida: %s", rootTag)
	}

	// Define o nome da tag de resposta
	respTagName := "stuResponseMsg"
	if rootTag == "prvmsgs" {
		respTagName = "prvResponseMsg"
	}

	// Monta o objeto de resposta
	respObj := ResponseXML{
		XMLName:           xml.Name{Local: respTagName},
		DeliveryTimeStamp: getGlobalstarTime(),
		MessageID:         incomingID,
		CorrelationID:     incomingID, // OBRIGATÓRIO SER IGUAL AO ID RECEBIDO
		State:             "pass",
		StateMessage:      "Message received",
		Xmlns:             "http://www.w3.org/2001/XMLSchema-instance",
	}

	// Envia a resposta de volta
	w.Header().Set("Content-Type", "text/xml")
	w.WriteHeader(http.StatusOK)

	w.Write([]byte(`<?xml version="1.0" encoding="UTF-8"?>` + "\n"))
	xml.NewEncoder(w).Encode(respObj)
}

func main() {
	// Define a rota (endpoint)
	http.HandleFunc("/globalstar/listener", globalstarHandler)

	port := ":5000"
	fmt.Println("--- Servidor Go Iniciado na porta 5000 ---")
	fmt.Println("Aguardando dados...")

	// Inicia o servidor
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatal(err)
	}
}
