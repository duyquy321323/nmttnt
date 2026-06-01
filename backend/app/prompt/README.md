# Quản lý Prompt

Mọi hướng dẫn cho AI nằm trong file `.md` ở đây. **Không** hardcode instruction trong Python.

## Luồng chat RAG

1. Truy vấn Qdrant → lấy `chunks` (hiển thị cho client).
2. Ghép `context` từ chunks.
3. Gọi Gemini:
   - **System:** `chat/rag_system_instruction.md` (có ví dụ mẫu trong file)
   - **User:** `chat/rag_user_template.md` (`{context}`, `{question}`)

## File

| File | Vai trò |
|------|---------|
| `chat/rag_system_instruction.md` | System prompt RAG + ví dụ phong cách |
| `chat/rag_user_template.md` | User message |
| `chat/general_instruction.md` | Chat không RAG (nếu dùng) |
| `chat/fairness_guidelines.md` | Nguyên tắc công bằng — tự ghép vào mọi system prompt |
| `chat/robustness_guidelines.md` | Robustness lớp học thật — tự ghép |
| `chat/explainability_guidelines.md` | Giải thích từng bước như gia sư — tự ghép |

## Sửa prompt

```python
from app.prompt import get_prompt

text = get_prompt("chat/rag_system_instruction.md")
```

Sửa file `.md` → khởi động lại server.
