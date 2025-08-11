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
## Rules
- Since I am asking, you should not make any edit.

## Question to ask:


- Create the sql to create the current database schema and functions in supabase and add the guide to run it in the readme file.