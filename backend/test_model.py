

SYS_INSTRUCT = """
    Bạn là chatbot giáo dục dành cho trẻ em dân tộc thiểu số.
    Hãy trả lời bằng tiếng Việt đơn giản, dễ hiểu, ngắn gọn.
    Giải thích từng bước nếu cần.
    Dùng ví dụ gần gũi với học sinh.
    Không đưa nội dung không phù hợp với trẻ em.
    Nếu học sinh chưa hiểu, hãy giải thích lại bằng cách đơn giản hơn.
"""

prompt = [
    {
        "role": "system",
        "content": SYS_INSTRUCT
    },
    {
        "role": "user",
        "content": (
            "Em là học sinh lớp 3. "
            "Em chưa hiểu phép tính 12 + 5. "
            "Cô/chú hãy giải thích thật dễ hiểu cho em."
        )
    }
]

chat_text = tokenizer.apply_chat_template(
    prompt,
    add_generation_prompt=True,
    tokenize=False
)

inputs = tokenizer(
    chat_text,
    return_tensors="pt"
).to(model.device)

with torch.no_grad():
    outputs = model.generate(
        input_ids=inputs["input_ids"],
        attention_mask=inputs["attention_mask"],
        generation_config=generation_config,
    )

output_text = tokenizer.decode(outputs[0], skip_special_tokens=True)

if "assistant\n" in output_text:
    answer = output_text.split("assistant\n")[-1].strip()
elif "<|start_header_id|>assistant<|end_header_id|>" in output_text:
    answer = output_text.split("<|start_header_id|>assistant<|end_header_id|>")[-1].strip()
else:
    answer = output_text.strip()

print("Câu trả lời của chatbot:")
print(answer)