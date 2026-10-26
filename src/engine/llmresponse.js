export function extractRunAIText(value, depth = 0) {
  if (typeof value === "string") return value.trim() || null;
  if (!value || typeof value !== "object" || depth > 5) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractRunAIText(item, depth + 1);
      if (found) return found;
    }
    return null;
  }
  const direct = ["result", "text", "content", "output", "output_text", "response", "generatedText"];
  for (const key of direct) {
    const found = extractRunAIText(value[key], depth + 1);
    if (found) return found;
  }
  const choices = value.choices ?? value.data?.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      const found = extractRunAIText(choice?.message?.content ?? choice?.text ?? choice?.delta?.content, depth + 1);
      if (found) return found;
    }
  }
  if (value.message && typeof value.message === "object") return extractRunAIText(value.message.content ?? value.message.text, depth + 1);
  if (value.data && typeof value.data === "object") return extractRunAIText(value.data, depth + 1);
  return null;
}
