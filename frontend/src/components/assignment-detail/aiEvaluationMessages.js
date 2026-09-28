export function formatAiEvaluationError(error = {}) {
  const messages = {
    RAG_INDEX_FAILED: 'Không thể lập chỉ mục bài mẫu. Kiểm tra ảnh tham chiếu và Ollama rồi thử lại.',
    RAG_RETRIEVAL_FAILED: 'Không thể truy hồi ngữ cảnh bài mẫu. Kiểm tra dịch vụ embedding local rồi thử lại.',
    RAG_CONTEXT_EMPTY: 'Chưa tìm thấy đoạn bài mẫu phù hợp để đối chiếu. Giáo viên có thể kiểm tra lại ảnh tham chiếu.',
    AI_EMBEDDING_TIMEOUT: 'Embedding local phản hồi quá lâu. Kiểm tra Ollama đang chạy rồi thử lại.',
    AI_EMBEDDING_FAILED: 'Embedding local chưa xử lý được bài mẫu. Kiểm tra Ollama rồi thử lại.',
    AI_PROVIDER_FAILED: 'Mô hình AI (Ollama hoặc Gemini) tạm thời không xử lý được ảnh. Vui lòng thử lại.',
  }

  return messages[error?.code]
    ?? error?.message
    ?? 'Không thể phân tích bài nộp lúc này. Vui lòng thử lại.'
}
