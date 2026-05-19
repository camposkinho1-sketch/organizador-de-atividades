import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const createTaskTool: FunctionDeclaration = {
  name: "create_task",
  description: "Cria uma nova tarefa no Google Tasks para o usuário.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "Título da tarefa, no formato '[MATÉRIA] - [NOME DA ATIVIDADE]'",
      },
      date: {
        type: Type.STRING,
        description: "Data da tarefa no formato YYYY-MM-DD",
      },
      time: {
        type: Type.STRING,
        description: "Horário da tarefa no formato HH:MM (ex: 20:00 ou 13:00)",
      },
    },
    required: ["title", "date", "time"],
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

    if (!process.env.GEMINI_API_KEY) {
       return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [...history, message],
      config: {
        systemInstruction: getSystemInstruction(schedule),
        tools: [{ functionDeclarations: [createTaskTool] }],
        temperature: 0.2,
      }
    });

    res.json({
        text: response.text,
        functionCalls: response.functionCalls,
    });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
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
