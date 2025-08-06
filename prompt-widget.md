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
#### Coding Rules (apply to all changes)
1. Use only shadcn components in ui/components; if a component is missing, install it with `shadcn add`, **not** `@shadcn/ui`.
2. Always confirm import paths are correct.
3. Finish one file without TypeScript errors before editing the next.
4. Do not run `npm run dev` or `npm run build`.

### Implement above requirements
- Read the section 1.3 Tạo và quản lý Chatbot in chatbot-enterprise/Chatbot_DoanhNghiep.md.
- Now i want to implement the functionality listed in "Tích hợp với các nền tảng nhắn tin" in section 1.3 but only for Facebook Messenger. Read the codebase and use brave mcp to check for the api documentation and supabase mcp to check our database
- Remember to give documentation explain in detail what you have implemented.
#codebase #supabase #brave-search

