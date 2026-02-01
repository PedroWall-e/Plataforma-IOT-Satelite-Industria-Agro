from flask import Flask, request, Response
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import logging

app = Flask(__name__)

# Configura logs para ver o que está acontecendo no terminal
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

def get_current_timestamp():
    """
    Gera timestamp no formato exigido pela Globalstar: dd/MM/yyyy hh:mm:ss GMT
    Usa UTC explicitamente.
    """
    now = datetime.now(timezone.utc)
    return now.strftime("%d/%m/%Y %H:%M:%S GMT")

def generate_response(root_tag, message_id, state="pass", message="Message received"):
    """
    Gera o XML de resposta.
    O correlationID DEVE ser igual ao messageID recebido.
    """
    # Define a tag de resposta baseada no tipo de mensagem
    response_tag = "stuResponseMsg" if "stuMessages" in root_tag else "prvResponseMsg"
    
    xml_response = f"""<?xml version="1.0" encoding="UTF-8"?>
<{response_tag} 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    deliveryTimeStamp="{get_current_timestamp()}" 
    messageID="{message_id}" 
    correlationID="{message_id}">
    <state>{state}</state>
    <stateMessage>{message}</stateMessage>
</{response_tag}>"""
    
    return xml_response

@app.route('/globalstar/listener', methods=['POST'])
def globalstar_listener():
    try:
        xml_data = request.data
        if not xml_data:
            return "No Data", 400

        # Faz o parse do XML
        root = ET.fromstring(xml_data)
        root_tag = root.tag
        
        # Limpeza de namespace (remove coisas como {http://...})
        if '}' in root_tag:
            root_tag = root_tag.split('}', 1)[1]

        incoming_id = ""
        
        # Lógica para Mensagens de Telemetria (STU)
        if "stuMessages" in root_tag:
            incoming_id = root.attrib.get('messageID')
            logging.info(f"Recebido STU Message. ID: {incoming_id}")
            
            # Exemplo de como ler os dados
            for msg in root.findall('.//stuMessage'): # o .// ajuda a achar mesmo com namespace
                esn = msg.find('.//esn')
                payload = msg.find('.//payload')
                esn_txt = esn.text if esn is not None else "N/A"
                payload_txt = payload.text if payload is not None else "N/A"
                
                logging.info(f"--> ESN: {esn_txt} | Payload: {payload_txt}")

        # Lógica para Mensagens de Provisionamento (PRV)
        elif "prvmsgs" in root_tag:
            incoming_id = root.attrib.get('prvMessageID')
            logging.info(f"Recebido Provisioning Message. ID: {incoming_id}")

        else:
            logging.warning(f"Formato desconhecido: {root_tag}")
            return "Unknown Format", 400

        # Gera resposta de sucesso
        response_xml = generate_response(root_tag, incoming_id, state="pass")
        return Response(response_xml, status=200, mimetype='text/xml')

    except Exception as e:
        logging.error(f"ERRO CRÍTICO: {str(e)}")
        # Em caso de erro, tenta avisar a Globalstar que falhou
        fail_xml = generate_response("stuMessages", "0", state="fail", message="Internal Server Error")
        return Response(fail_xml, status=200, mimetype='text/xml')

if __name__ == '__main__':
    # Roda o servidor acessível na porta 5000
    print("--- Servidor Iniciado. Aguardando dados da Globalstar... ---")
    app.run(host='0.0.0.0', port=5000, debug=True)