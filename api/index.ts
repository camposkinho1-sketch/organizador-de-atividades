import express from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const createTaskTool = {
  type: "function" as const,
  function: {
    name: "create_task",
    description: "Cria uma nova tarefa no Google Tasks para o usuário.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Título da tarefa, no formato '[MATÉRIA] - [NOME DA ATIVIDADE]'",
        },
        date: {
          type: "string",
          description: "Data da tarefa no formato YYYY-MM-DD",
        },
        time: {
          type: "string",
          description: "Horário da tarefa no formato HH:MM (ex: 20:00 ou 13:00)",
        },
        notes: {
          type: "string",
          description: "Detalhes adicionais ou complemento da tarefa, se fornecido.",
        }
      },
      required: ["title", "date", "time"],
    },
  },
};

const getSystemInstruction = (schedule: any[]) => {
  const now = new Date();
  const timeZone = 'America/Sao_Paulo';
  const currentDay = now.toLocaleDateString('pt-BR', { timeZone, weekday: 'long' });
  const currentDate = now.toLocaleDateString('pt-BR', { timeZone });
  const currentTime = now.toLocaleTimeString('pt-BR', { timeZone });

  const scheduleStr = schedule?.map(day => `${day.short}: ${day.classes.length > 0 ? day.classes.join(', ') : 'Sem aulas'}`).join('\n') || '';

  return `Você é o Guardião da Segurança do Trabalho, um assistente acadêmico de alta performance e gestor de produtividade. Seu objetivo é organizar a rotina do usuário, garantindo que ele nunca perca uma aula ou o prazo de uma atividade. Você deve ser proativo, organizado e utilizar as ferramentas do Google Workspace (simuladas aqui por suas ferramentas integradas) para suporte total.

[CONTEXTO TEMPORAL ATUAL]
Hoje é ${currentDay}, ${currentDate}. O horário atual é ${currentTime}. Use isso para calcular "próximas aulas" corretamente.
[/CONTEXTO TEMPORAL]

1. Base de Conhecimento (Grade Horária)
Utilize esta grade como base padrão para o planejamento:
${scheduleStr}

2. Flexibilidade e Mudanças de Horário
Aviso de Mudança: Sempre informe que os horários podem mudar.
Se o usuário informar mudança de cronograma, priorize a nova informação.

3. Protocolo de Atividades (Ação Automática com Horários de Entrega)
Sempre que o usuário mencionar uma atividade e uma matéria, você deve executar este fluxo obrigatoriamente:
- Identificar a Próxima Aula: Veja na grade qual é o próximo dia que essa matéria acontece, a partir de hoje.
- Cálculo da Data: Defina o prazo para 1 dia antes dessa aula.
- Definição do Horário (Regra de Notificação):
  - Se o dia anterior cair de Segunda a Sexta: Defina o horário da tarefa para as 20:00.
  - Se o dia anterior cair no Sábado ou Domingo: Defina o horário da tarefa para as 13:00.
- CRIAR TAREFA: VOCÊ DEVE OBRIGATORIAMENTE CHAMAR A FUNÇÃO \`create_task\` com o título "[MATÉRIA] - [NOME DA ATIVIDADE]" e data/hora calculados.
- Confirmação: Informe ao usuário: "Tarefa salva! Como sua próxima aula de [Matéria] é na [Dia], defini o lembrete no seu Tasks para [Data] às [Horário]."`;
};

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, schedule, attachments } = req.body;
    
    // Check if the user provided a custom API key via the request headers
    const customApiKey = req.headers['x-api-key'] as string;
    const apiKeyToUse = customApiKey || process.env.OPENROUTER_API_KEY;

    if (!apiKeyToUse) {
       return res.status(500).json({ error: "Nenhuma chave de API configurada. Por favor adicione uma nas configurações (ícone de Chave)." });
    }

    const openai = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: apiKeyToUse, 
    });

    const openaiMessages: any[] = [
      {
        role: "system",
        content: getSystemInstruction(schedule),
      }
    ];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'model') {
          if (msg.parts && msg.parts[0].functionCall) {
             const fc = msg.parts[0].functionCall;
             openaiMessages.push({
               role: "assistant",
               content: null,
               tool_calls: [{
                 id: fc.id || 'call_1',
                 type: "function",
                 function: {
                   name: fc.name,
                   arguments: JSON.stringify(fc.args)
                 }
               }]
             });
          } else {
             openaiMessages.push({
               role: "assistant",
               content: msg.parts[0].text
             });
          }
        } else {
          openaiMessages.push({
            role: "user",
            content: msg.parts[0].text
          });
        }
      }
    }

    if (Array.isArray(message)) {
      for (const part of message) {
        if (part.functionResponse) {
          openaiMessages.push({
            role: "tool",
            tool_call_id: part.functionResponse.id || 'call_1',
            name: part.functionResponse.name,
            content: JSON.stringify(part.functionResponse.response)
          });
        }
      }
    } else {
      let textContent = message;
      const contentArr: any[] = [];

      if (attachments && Array.isArray(attachments) && attachments.length > 0) {
        for (const attachment of attachments) {
          if (attachment.type === "application/pdf") {
            try {
              const pdfParse = (await import("pdf-parse")).default;
              const base64Data = attachment.data.split(',')[1] || attachment.data;
              const buffer = Buffer.from(base64Data, "base64");
              const pdfData = await pdfParse(buffer);
              textContent += `\n\n[Conteúdo Extraído do PDF "${attachment.name}"]:\n${pdfData.text}`;
            } catch (e) {
              console.error("PDF Parsing error:", e);
              textContent += `\n\n[Erro ao tentar ler o PDF "${attachment.name}"]`;
            }
          } else if (attachment.type.startsWith("image/")) {
            contentArr.push({ type: "image_url", image_url: { url: attachment.data } });
          }
        }

        contentArr.unshift({ type: "text", text: textContent });
        
        openaiMessages.push({
          role: "user",
          content: contentArr
        });
      } else {
        openaiMessages.push({
          role: "user",
          content: message
        });
      }
    }

    const response = await openai.chat.completions.create({
      model: "google/gemini-3.1-flash-lite",
      messages: openaiMessages,
      tools: [createTaskTool],
      temperature: 0.2,
      max_tokens: 4096,
    });

    const choice = response.choices[0];
    
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      const functionCalls = choice.message.tool_calls.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments)
      }));
      res.json({ functionCalls });
    } else {
      res.json({ text: choice.message.content });
    }
  } catch (error: any) {
    console.error("OpenRouter API Error:", error);
    let message = "Falha ao gerar conteúdo.";
    if (error.status === 402 || (error.message && error.message.includes("402"))) {
      message = "Créditos insuficientes. Sua chave de API configurada não possui saldo para gerar a resposta. Por favor, acesse as configurações (ícone de Chave) e insira uma chave válida com créditos, ou adicione créditos à sua conta.";
    } else if (error.message) {
      if (error.message.includes("401") || error.message.includes("Incorrect API key")) {
        message = "Chave de API inválida. Por favor, verifique a chave inserida nas configurações (ícone de Chave).";
      } else {
        message = error.message;
      }
    }
    res.status(error.status || 500).json({ error: message });
  }
});

export default app;
