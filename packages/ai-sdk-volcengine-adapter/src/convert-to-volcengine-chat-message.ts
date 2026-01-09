import {
  InvalidPromptError,
  LanguageModelV3Prompt,
  UnsupportedFunctionalityError
} from "@ai-sdk/provider";
import {
  VolcengineChatMessage,
  VolcengineChatPrompt,
  VolcengineChatUserMessageContent
} from "./volcengine-chat-prompt";

export function convertToVolcengineChatMessages(
  prompt: LanguageModelV3Prompt
): VolcengineChatPrompt {
  const messages: VolcengineChatPrompt = [];

  for (const message of prompt) {
    switch (message.role) {
      case "system": {
        messages.push({
          role: "system",
          content: message.content
        });
        break;
      }

      case "user": {
        const content: VolcengineChatUserMessageContent[] = [];

        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              content.push({ type: "text", text: part.text });
              break;
            }
            case "file": {
              const mediaType = part.mediaType;

              if (mediaType.startsWith("image/")) {
                // Handle image files
                if (part.data instanceof URL) {
                  content.push({
                    type: "image_url",
                    image_url: { url: part.data.toString() }
                  });
                } else {
                  const base64Data =
                    typeof part.data === "string"
                      ? part.data
                      : Buffer.from(part.data).toString("base64");
                  content.push({
                    type: "image_url",
                    image_url: { url: `data:${mediaType};base64,${base64Data}` }
                  });
                }
              } else if (mediaType.startsWith("video/")) {
                // Handle video files
                if (part.data instanceof URL) {
                  content.push({
                    type: "video_url",
                    video_url: { url: part.data.toString() }
                  });
                } else {
                  const base64Data =
                    typeof part.data === "string"
                      ? part.data
                      : Buffer.from(part.data).toString("base64");
                  content.push({
                    type: "video_url",
                    video_url: { url: `data:${mediaType};base64,${base64Data}` }
                  });
                }
              } else {
                throw new UnsupportedFunctionalityError({
                  functionality: `File type: ${mediaType}`
                });
              }
              break;
            }
            default: {
              throw new UnsupportedFunctionalityError({
                functionality: `User message part type: ${(part as any).type}`
              });
            }
          }
        }

        messages.push({ role: "user", content });
        break;
      }

      case "assistant": {
        let textContent = "";
        let reasoningContent: string | undefined;
        const toolCalls: Array<{
          id: string;
          type: "function";
          function: { name: string; arguments: string };
        }> = [];

        for (const part of message.content) {
          switch (part.type) {
            case "text": {
              textContent += part.text;
              break;
            }
            case "reasoning": {
              reasoningContent = (reasoningContent ?? "") + part.text;
              break;
            }
            case "tool-call": {
              toolCalls.push({
                id: part.toolCallId,
                type: "function",
                function: {
                  name: part.toolName,
                  arguments:
                    typeof part.input === "string"
                      ? part.input
                      : JSON.stringify(part.input)
                }
              });
              break;
            }
            case "file":
            case "tool-result": {
              // Skip these in assistant messages
              break;
            }
            default: {
              throw new UnsupportedFunctionalityError({
                functionality: `Assistant message part type: ${(part as any).type}`
              });
            }
          }
        }

        const assistantMessage: VolcengineChatMessage = {
          role: "assistant",
          content: textContent
        };

        if (reasoningContent) {
          (assistantMessage as any).reasoning_content = reasoningContent;
        }

        if (toolCalls.length > 0) {
          (assistantMessage as any).tool_calls = toolCalls;
        }

        messages.push(assistantMessage);
        break;
      }

      case "tool": {
        for (const toolResult of message.content) {
          if (toolResult.type === "tool-result") {
            const output = toolResult.output;
            let contentString: string;

            switch (output.type) {
              case "text":
              case "error-text":
                contentString = output.value;
                break;
              case "json":
              case "error-json":
                contentString = JSON.stringify(output.value);
                break;
              case "execution-denied":
                contentString = output.reason ?? "Execution denied";
                break;
              case "content":
                contentString = output.value
                  .map((v) => {
                    if (v.type === "text") return v.text;
                    return JSON.stringify(v);
                  })
                  .join("\n");
                break;
              default:
                contentString = JSON.stringify(output);
            }

            messages.push({
              role: "tool",
              tool_call_id: toolResult.toolCallId,
              content: contentString
            });
          }
          // Skip tool-approval-response parts
        }
        break;
      }

      default: {
        throw new InvalidPromptError({
          prompt,
          message: `Unsupported message role: ${(message as any).role}`
        });
      }
    }
  }

  return messages;
}
