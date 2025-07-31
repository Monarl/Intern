** Later
Rules:
+ Check the ui/components for the shadcn components. If you want another components then instlal it using shadcn not shadcn/ui.
+ When import, always check the path to make sure the import is correct. 
+ Before moving on to another file, you have to make sure the current file is error-free.
+ Do not make any unneccesary files and folders.
+ Do not run npm run dev and npm run build to check for errors.
---
In the current dashboard layout.tsx there is the options titled Documents. Now i want to replace this with Chatbots for creating, managing and deleting chatbots. The page implemetation will be done in the chatbots folder and integrated the chatbot widget from the chat-widgets folder.
+ This page is only for super admin and chatbot manager so remember to do RBAC. You can reference the RBAC from the chats folder.
+ A chatbot can has the styling, position, knowledge base,... that is listed from the chat-widget README.md configured. Read it and provide an interface to set these parameters when create the chatbot. The default for supabase and n8n related parameter should be set to our current env.local, use the name not the direct api values.
+ The integrated chat widget should work exactly like when i run the chat-widget folder on localhost:3001 to chat using the widget.

Later:
### Coding Rules (apply to all changes)
1. Use only shadcn components in ui/components; if a component is missing, install it with `shadcn add`, **not** `@shadcn/ui`.
2. Always confirm import paths are correct.
3. Finish one file without TypeScript errors before editing the next.
4. Do not create unnecessary files or folders.
5. Do not run `npm run dev` or `npm run build`.
## Implement task 4.2 in TASKS.md:
- Build on the exisiting chat dashboard with specialized UI for Support Agent to satisfy the task 4.2 TASKS.md and the project requirements below. Remember to add RBAC for these UI to Super Admin and Support Agent only.
- Add manual switch to human handoff in chat-widget so users can request for CS (Support Agent).
- Give a readme to explain your implementation and what the n8n needs to do and webhooks to expose so I can implement task 4.1 in TASKS.md.
### Project requirements in Chatbot_DoanhNghiep.md:
    + **Kích hoạt thủ công**: Người dùng có thể yêu cầu chuyển cuộc trò chuyện sang nhân viên hỗ trợ khách hàng (CS) bất cứ lúc nào.
    + **Giao diện CS**: Cung cấp một giao diện riêng cho nhân viên CS để tiếp nhận các cuộc trò chuyện được chuyển giao, xem lịch sử chat trước đó và tương tác trực tiếp với khách hàng.
    + **Thông báo**: Gửi thông báo đến nhân viên CS khi có cuộc trò chuyện cần được tiếp quản.
    + **Chuyển giao lại bot**: Sau khi nhân viên CS hoàn tất hỗ trợ, họ có thể chuyển cuộc trò chuyện trở lại cho chatbot nếu phù hợp.
### Future:
- When the agent use hand back to bot, the user chatbot should regain the manual handoff button to request human support again.
- The metadata in the chat session when chat widget request for handoff should add the field instead of replacing the existing metadata.
- When i first open the chat widget and chat, the bot respond get duplicated. But when i close and reopen the chat widget, there is only one message like normal. Fix this issue.
- Write a README to give the code snippets and locations that require the n8n workflow in human-handoff-implementation.md and how can I implement that n8n workflow.
