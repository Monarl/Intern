# Mô tả hệ thống Chatbot tư vấn doanh nghiệp (Intern)

Hệ thống chatbot tư vấn doanh nghiệp được thiết kế để cung cấp một giải pháp toàn diện, tự động hóa và tối ưu hóa quy trình hỗ trợ khách hàng, đồng thời nâng cao hiệu quả quản lý thông tin và tương tác trên nhiều nền tảng. Hệ thống này bao gồm hai module chính: Module Admin và Module Chatbot.

## 1. Module Admin

Module Admin là trung tâm quản lý và cấu hình toàn bộ hệ thống, cho phép người dùng có quyền kiểm soát linh hoạt các khía cạnh của chatbot và dữ liệu liên quan.

### 1.1 Phân quyền người dùng theo vai trò (role) và chức năng

Hệ thống sẽ có một cơ chế phân quyền mạnh mẽ, đảm bảo rằng mỗi người dùng trong module Admin chỉ có thể truy cập và thực hiện các chức năng phù hợp với vai trò của họ.

#### Các vai trò điển hình:

- **Super Admin**: Toàn quyền truy cập và quản lý tất cả các chức năng, bao gồm quản lý người dùng, vai trò, cấu hình hệ thống.
- **Knowledge Manager**: Có quyền tạo, chỉnh sửa, xóa và quản lý các nguồn tri thức (knowledge base).
- **Chatbot Manager**: Có quyền tạo, cấu hình, quản lý các chatbot, tích hợp chatbot vào các kênh khác.
- **Analyst/Reporter**: Chỉ có quyền xem báo cáo, lịch sử chat, và các thông tin phân tích.
- **Support Agent**: Có quyền can thiệp vào các cuộc trò chuyện của chatbot khi cần thiết (chức năng tạm ngưng bot).

#### Chức năng phân quyền:

- Giao diện trực quan để gán vai trò cho người dùng.
- Kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC) cho từng chức năng (ví dụ: chỉ Knowledge Manager mới có thể upload file, chỉ Chatbot Manager mới có thể tạo chatbot mới).
- Khả năng tạo và tùy chỉnh các vai trò mới nếu cần.

### 1.2 Tạo và quản lý các nguồn tri thức (Knowledge Base)

Đây là nơi quản lý dữ liệu mà chatbot sẽ sử dụng để trả lời các câu hỏi. Hệ thống cho phép tạo nhiều nguồn tri thức riêng biệt để phục vụ các mục đích khác nhau hoặc các chatbot khác nhau.

#### Tạo dữ liệu embedding từ file:

- **Chức năng Upload File**: Giao diện cho phép người dùng tải lên các loại file phổ biến như PDF, DOCX, TXT, CSV, PPTX, HTML, JSON.
- **Xử lý Data Embedding**: Khi một file được tải lên, hệ thống sẽ tự động trích xuất nội dung, làm sạch dữ liệu và tạo ra các vector embedding (biểu diễn số hóa) của nội dung đó. Các embedding này sẽ được lưu trữ trong một cơ sở dữ liệu vector (ví dụ: Pinecone, Weaviate, ChromaDB) để phục vụ cho việc tìm kiếm ngữ nghĩa (semantic search) của chatbot.
- **Quản lý File**: Danh sách các file đã upload, hiển thị trạng thái xử lý (đang xử lý, hoàn thành, lỗi).

#### Xóa file đã upload và data embedding tương ứng:

- **Chức năng Xóa**: Người dùng có thể chọn một hoặc nhiều file đã tải lên để xóa.
- **Đồng bộ hóa**: Khi một file bị xóa, hệ thống sẽ tự động xóa các vector embedding tương ứng trong cơ sở dữ liệu vector, đảm bảo tính nhất quán của dữ liệu và giải phóng không gian lưu trữ.

#### Upload bằng URL web:

- **Chức năng Thêm URL**: Người dùng có thể nhập một URL của trang web.
- **Trích xuất và Embedding**: Hệ thống sẽ tự động thu thập nội dung từ URL đó (ví dụ: sử dụng web scraping), sau đó xử lý và tạo embedding tương tự như khi upload file.
- **Hỗ trợ Sitemap**: Có thể hỗ trợ nhập Sitemap để thu thập toàn bộ nội dung của một website lớn.

#### Tích hợp với n8n:

- **Kết nối linh hoạt**: Module Admin sẽ có khả năng tích hợp với nền tảng tự động hóa n8n. Điều này cho phép người dùng cấu hình các workflow trong n8n để tự động hóa việc thu thập dữ liệu (ví dụ: lấy dữ liệu từ cơ sở dữ liệu nội bộ, API của bên thứ ba, email, v.v.) và đẩy chúng vào hệ thống knowledge base của chatbot.
- **Webhook/API**: Cung cấp các endpoint API hoặc webhook để n8n có thể gửi dữ liệu tới hệ thống để tạo hoặc cập nhật knowledge.

### 1.3 Tạo và quản lý Chatbot

Module này cho phép tạo và tùy chỉnh nhiều chatbot khác nhau, mỗi chatbot có thể phục vụ một mục đích cụ thể hoặc một phòng ban trong doanh nghiệp.

#### Tích hợp với workflow n8n:

- **Logic tùy chỉnh**: Mỗi chatbot có thể được cấu hình để sử dụng một hoặc nhiều nguồn tri thức đã tạo. Quan trọng hơn, mỗi chatbot sẽ được liên kết với một workflow cụ thể trong n8n.
- **Xử lý nâng cao**: Khi chatbot không thể trả lời dựa trên knowledge base hoặc cần thực hiện một hành động cụ thể (ví dụ: đặt lịch hẹn, kiểm tra trạng thái đơn hàng, gửi email thông báo), nó sẽ kích hoạt workflow n8n tương ứng. Workflow n8n này sẽ xử lý logic phức tạp, gọi API bên ngoài, tương tác với các hệ thống khác và trả về kết quả cho chatbot để phản hồi người dùng.

#### Nhúng vào website:

- **Mã nhúng**: Hệ thống sẽ cung cấp một đoạn mã JavaScript/HTML đơn giản mà doanh nghiệp có thể dán vào website của mình.
- **Giao diện tùy chỉnh**: Cho phép tùy chỉnh giao diện của widget chatbot (màu sắc, biểu tượng, vị trí trên trang).
- **Tương thích**: Đảm bảo tương thích với các trình duyệt và thiết bị khác nhau (responsive design).

#### Tích hợp với các nền tảng nhắn tin:

- **Facebook Messenger, Instagram Messenger, WhatsApp, Viber, Zalo (cá nhân), Zalo OA**: Cung cấp các công cụ và hướng dẫn để tích hợp chatbot với các nền tảng này thông qua API của từng nền tảng.
- **Quản lý kênh**: Giao diện để quản lý các kết nối kênh, bao gồm xác thực (token, app ID, secret key) và trạng thái kết nối.

#### Ghi log chat:

- **Lịch sử cuộc trò chuyện**: Hệ thống sẽ ghi lại toàn bộ lịch sử các cuộc trò chuyện của chatbot, bao gồm thời gian, người dùng, câu hỏi, câu trả lời của bot, và các hành động được thực hiện (ví dụ: kích hoạt n8n workflow).
- **Tìm kiếm và lọc**: Chức năng tìm kiếm và lọc lịch sử chat để dễ dàng phân tích và kiểm tra.
- **Phân tích**: Cung cấp các số liệu thống kê cơ bản về hiệu suất của chatbot (số lượng cuộc trò chuyện, tỷ lệ giải quyết, v.v.).

#### Chức năng cho chatbot tạm ngưng để CS vào tự tư vấn (Human Handoff):

- **Kích hoạt thủ công/tự động**: Người dùng có thể yêu cầu chuyển cuộc trò chuyện sang nhân viên hỗ trợ khách hàng (CS) bất cứ lúc nào. Ngoài ra, hệ thống có thể cấu hình để tự động chuyển giao khi bot không thể hiểu câu hỏi hoặc phát hiện ý định cần sự can thiệp của con người.
- **Giao diện CS**: Cung cấp một giao diện riêng cho nhân viên CS để tiếp nhận các cuộc trò chuyện được chuyển giao, xem lịch sử chat trước đó và tương tác trực tiếp với khách hàng.
- **Thông báo**: Gửi thông báo đến nhân viên CS khi có cuộc trò chuyện cần được tiếp quản.
- **Chuyển giao lại bot**: Sau khi nhân viên CS hoàn tất hỗ trợ, họ có thể chuyển cuộc trò chuyện trở lại cho chatbot nếu phù hợp.

### 1.4 Tạo Bot Facebook

Module này tập trung vào việc quản lý và tự động hóa tương tác trên nền tảng Facebook.

#### Tự động trả lời comment trên Facebook:

- **Kết nối Page**: Cho phép kết nối với các trang Facebook (Fanpage) của doanh nghiệp.
- **Cấu hình quy tắc**: Người dùng có thể cấu hình các quy tắc để bot tự động trả lời các bình luận trên bài viết hoặc quảng cáo của trang. Các quy tắc có thể dựa trên từ khóa, ý định của bình luận, hoặc các điều kiện khác.
- **Tích hợp Knowledge Base**: Bot có thể sử dụng knowledge base đã tạo để trả lời các bình luận phổ biến.

#### Theo dõi comment tiêu cực và thông báo cho admin:

- **Phân tích cảm xúc/Từ khóa**: Hệ thống sẽ sử dụng các thuật toán xử lý ngôn ngữ tự nhiên (NLP) để phân tích cảm xúc của các bình luận hoặc phát hiện các từ khóa/cụm từ tiêu cực đã được định nghĩa trước.
- **Hệ thống cảnh báo**: Khi phát hiện một bình luận tiêu cực, hệ thống sẽ ngay lập tức gửi thông báo đến admin hoặc các vai trò được chỉ định (ví dụ: qua email, tin nhắn nội bộ, hoặc hiển thị trên dashboard admin).
- **Dashboard theo dõi**: Cung cấp một bảng điều khiển để admin có thể xem danh sách các bình luận tiêu cực, trạng thái xử lý và thực hiện các hành động cần thiết.

---

Hệ thống này cung cấp một giải pháp mạnh mẽ và linh hoạt để doanh nghiệp có thể tự động hóa và nâng cao trải nghiệm hỗ trợ khách hàng, đồng thời tối ưu hóa quy trình quản lý nội dung và tương tác trên các kênh truyền thông.



