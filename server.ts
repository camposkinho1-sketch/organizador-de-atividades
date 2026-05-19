import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import OpenAI from "openai";

const app = express();
const PORT = 3000;

app.use(express.json());

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY || "dummy", 
});

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
      },
      required: ["title", "date", "time"],
    },
  },
};

const getSystemInstruction = (schedule: any[]) => {
  const now = new Date();
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const currentDay = days[now.getDay()];
  const currentDate = now.toLocaleDateString('pt-BR');
  const currentTime = now.toLocaleTimeString('pt-BR');

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

// API routes FIRST
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, schedule } = req.body;

    if (!process.env.OPENROUTER_API_KEY) {
       return res.status(500).json({ error: "OPENROUTER_API_KEY is not configured on the server." });
    }

    const openaiMessages: any[] = [
      {
        role: "system",
        content: getSystemInstruction(schedule),
      }
    ];

    // Convert history
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

    // Now handle the current message
    if (Array.isArray(message)) {
      // It's a function response
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
      // It's a regular user message
      openaiMessages.push({
        role: "user",
        content: message
      });
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
      // Map to Gemini format for frontend
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
    res.status(500).json({ error: error.message || "Failed to generate content" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
