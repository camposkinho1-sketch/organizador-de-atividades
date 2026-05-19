# Guardião da Segurança do Trabalho 🛡️🎓

**O seu assistente acadêmico de alta performance, alimentado por IA.**

O **Guardião da Segurança do Trabalho** é uma aplicação web inteligente projetada para ajudar estudantes a organizarem sua rotina escolar/acadêmica com facilidade. Utilizando o poder do **Google Gemini**, o assistente gerencia sua grade horária, notas e tarefas de forma proativa.

## ✨ Funcionalidades

- **🤖 Assistente IA Proativo**: Converse com o "Guardião" para agendar tarefas automaticamente com base na sua próxima aula.
- **📅 Gestão de Grade Horária**: Visualize e edite seu cronograma semanal de aulas.
- **📊 Controle de Notas (Boletim)**: Acompanhe seu desempenho acadêmico em cada matéria.
- **✅ Integração com Google Tasks**: Sincronize suas atividades diretamente com sua conta do Google (requer login).
- **🔄 Sincronização em Tempo Real**: Seus dados são salvos de forma segura usando Firebase.

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 19 + Vite + Tailwind CSS 4
- **Animações**: Motion (Framer Motion)
- **IA**: Google Gemini API (@google/genai)
- **Banco de Dados & Auth**: Firebase (Firestore & Google Auth)
- **Icons**: Lucide React
- **Estilização**: Tailwind CSS (design moderno e responsivo)

## 🛠️ Configuração e Instalação

Para rodar este projeto localmente, siga os passos abaixo:

1. **Clone o repositório**:
   ```bash
   git clone https://github.com/seu-usuario/guardiao-seguranca.git
   cd guardiao-seguranca
   ```

2. **Instale as dependências**:
   ```bash
   npm install
   ```

3. **Configuração de Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto (use o `.env.example` como base) e adicione suas chaves:
   - `GEMINI_API_KEY`: Sua chave de API do Google AI Studio.
   - Configurações do Firebase (disponíveis no console do Firebase).

4. **Inicie o servidor de desenvolvimento**:
   ```bash
   npm run dev
   ```

## 📱 Uso do Assistente

Você pode dizer coisas como:
- *"Tenho um trabalho de Química para semana que vem"*
- *"Quando é minha próxima aula de Matemática?"*
- *"Como estão minhas notas em Física?"*

O Guardião calculará automaticamente a data de entrega (baseado na sua grade) e oferecerá para salvar no seu Google Tasks.

## 📄 Licença

Este projeto está sob a licença MIT. Consulte o arquivo [LICENSE](LICENSE) para mais detalhes.

---
Desenvolvido com ❤️ usando Google AI Studio.
