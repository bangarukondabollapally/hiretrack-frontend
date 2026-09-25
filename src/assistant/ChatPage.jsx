import { useState, useEffect, useRef } from 'react';
import axiosInstance from '../api/axiosInstance';
import './ChatPage.css';

const SUGGESTED_PROMPTS = [
  'What applications need follow-up?',
  'Summarize my interview preparation notes',
  'Show applications in Interview stage'
];

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello! I am your HireTrack assistant. Ask me anything about your job applications, interview prep, or resume tailoring.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [applications, setApplications] = useState([]);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const fetchApplications = async () => {
    try {
      const response = await axiosInstance.get('/api/applications');
      setApplications(response.data);
    } catch (err) {
      console.error('Failed to fetch applications for assistant:', err);
    }
  };

  const handleSendMessage = async (textToSend = inputText) => {
    const messageText = textToSend.trim();
    if (!messageText || isLoading) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: messageText,
      applicationId: selectedAppId || null
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        message: messageText,
        applicationId: selectedAppId ? Number(selectedAppId) : null
      };

      const response = await axiosInstance.post('/api/assistant/chat', payload);

      const assistantMsg = {
        id: Date.now() + 1,
        sender: 'assistant',
        text: response.data.reply
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Failed to get a response from AI assistant.';
      setError(errMsg);
      setMessages(prev => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: `[Error: ${errMsg}]`,
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedClick = (promptText) => {
    handleSendMessage(promptText);
  };

  const selectedApp = applications.find(a => String(a.id) === String(selectedAppId));

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1 className="page-title">AI Assistant</h1>
          <p className="chat-subtitle">Grounded in your resume and active application records</p>
        </div>
        <div className="chat-app-selector">
          <label htmlFor="app-select" className="selector-label">Target application:</label>
          <select
            id="app-select"
            value={selectedAppId}
            onChange={(e) => setSelectedAppId(e.target.value)}
            className="app-select-dropdown"
          >
            <option value="">General (All Applications)</option>
            {applications.map(app => (
              <option key={app.id} value={app.id}>
                {app.companyName} — {app.jobRole}
              </option>
            ))}
          </select>
        </div>
      </div>

      {selectedApp && (
        <div className="app-ref-banner">
          <span className="ref-pill">
            Context: <strong>{selectedApp.companyName}</strong> ({selectedApp.jobRole})
          </span>
          <button onClick={() => setSelectedAppId('')} className="ref-clear-btn">Clear context</button>
        </div>
      )}

      {/* Message List */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-row message-row--${msg.sender}`}
          >
            {msg.sender === 'assistant' && (
              <div className="assistant-badge">AI</div>
            )}
            <div className={`message-bubble message-bubble--${msg.sender} ${msg.isError ? 'message-bubble--error' : ''}`}>
              <div className="message-text">{msg.text}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-row message-row--assistant">
            <div className="assistant-badge">AI</div>
            <div className="message-bubble message-bubble--assistant message-bubble--loading">
              <span className="loading-dots">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts & Input Area */}
      <div className="chat-input-area">
        <div className="suggested-prompts">
          {SUGGESTED_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSuggestedClick(prompt)}
              className="suggested-btn"
              disabled={isLoading}
            >
              {prompt}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="chat-form"
        >
          <input
            type="text"
            placeholder="Ask a question about your job search or applications..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="chat-input"
          />
          <button type="submit" disabled={isLoading || !inputText.trim()} className="btn-primary">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
