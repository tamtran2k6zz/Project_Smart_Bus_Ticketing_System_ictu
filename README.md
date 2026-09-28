# Smart Bus Ticketing

Dưới đây là gói thiết lập hoàn chỉnh, thực chiến (Ready-to-use) được chuẩn hóa theo đúng các công nghệ trong Team Charter của nhóm (GitHub, Docker, Nginx, Staging).

---

## 1. CẤU TRÚC THƯ MỤC DỰ ÁN (MONOREPO / CLEAN REPO)

Nhóm nên cấu trúc thư mục rõ ràng để CI/CD dễ dàng quét và build độc lập:

```plaintext
smart-bus-ticketing/
├── .github/
│   └── workflows/
│       ├── pr-validation.yml      # CI: Chạy Lint + Unit Test khi tạo PR
│       └── deploy-staging.yml     # CD: Tự động build & deploy khi merge vào develop/main
├── backend/                       # Node.js/NestJS/Express API
│   ├── Dockerfile
│   ├── package.json
│   ├── .eslintrc.json
│   └── src/
├── frontend/                      # React / Next.js Web App
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── .eslintrc.json
│   └── src/
├── docker/
│   └── nginx/
│       └── default.conf           # Reverse Proxy định tuyến FE & BE
├── .husky/                        # Pre-commit hooks
├── .prettierrc                    # Cấu hình format code chung
├── docker-compose.staging.yml     # Khởi chạy toàn bộ hệ thống trên Staging
└── README.md
```

## Chạy thử API tìm chuyến

Trong thư mục `backend`, cấu hình `DATABASE_URL` trong `.env` rồi chạy seed dữ liệu demo (có thể chạy lại an toàn):

```bash
npm run prisma:generate
npm run prisma:seed
npm run start:prod
```

Seed tạo một tuyến demo, hai trạm và một chuyến vào ngày kế tiếp. Gửi request tìm chuyến với ID hai trạm demo và ngày chuyến:

```text
GET http://localhost:5000/api/v1/trips/search?origin_stop_id=22222222-2222-4222-8222-222222222222&destination_stop_id=33333333-3333-4333-8333-333333333333&departure_date=YYYY-MM-DD
```

Thay `YYYY-MM-DD` bằng ngày kế tiếp theo UTC.

## Tài khoản đăng ký và đăng nhập

- Đăng ký dùng Supabase Auth: email và mật khẩu được lưu trong Auth; họ tên và số điện thoại được lưu trong metadata của tài khoản.
- Nếu bật xác nhận email trong Supabase, người dùng cần xác minh email trước khi đăng nhập bằng email và mật khẩu đã đăng ký.
- Thêm URL chuyển hướng `{origin}/login` vào Supabase Auth > URL Configuration > Redirect URLs. Khi chạy local, `origin` là địa chỉ frontend, ví dụ `http://localhost:5174`.
- Tài khoản mẫu trên trang đăng nhập chỉ dùng cho demo, không phải tài khoản đã đăng ký.
- Mật khẩu không được lưu trong trình duyệt. Tùy chọn “Ghi nhớ đăng nhập” chỉ quyết định phiên được lưu trong local storage hay session storage.

---

## 2. CHIẾN LƯỢC NHÁNH GIT (GIT WORKFLOW CHO SPRINT 1 TUẦN)

Để tránh xung đột code (Merge Conflict) và bảo đảm nhịp độ nhanh:

- **`main`**: Nhánh ổn định, chứa code đạt 100% DoD.
- **`develop`**: Nhánh tích hợp chính. Mỗi lần merge vào `develop`, CI/CD sẽ tự động deploy lên môi trường Staging.
- **Nhánh tính năng (Feature branch)**: Tạo từ `develop` theo quy ước:
  - `feature/N5-22-auth-jwt`, `feature/N5-12-routes-crud`, `bugfix/N5-XX-fix-seat-lock`.
- **Quy tắc bảo vệ nhánh (Branch Protection Rule trên GitHub)**:
  - Yêu cầu tối thiểu 1 Approval trước khi merge.
  - Bắt buộc các bước kiểm tra tự động (CI Pipeline: Lint, Test) phải Pass mới cho merge.

---

## 3. THIẾT LẬP ESLINT, PRETTIER & HUSKY (CHUẨN HÓA "CLEAN CODE")

### File cấu hình `.prettierrc` (Đặt ở thư mục gốc):
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

### Cài đặt Husky & lint-staged (Tự động chặn commit nếu lỗi định dạng):
Chạy tại thư mục gốc dự án:
```bash
npx husky-init && npm install
npm install --save-dev lint-staged
```

Thêm vào `package.json` ở root:
```json
"lint-staged": {
  "frontend/**/*.{js,jsx,ts,tsx}": [
    "prettier --write",
    "eslint --fix"
  ],
  "backend/**/*.{js,ts}": [
    "prettier --write",
    "eslint --fix"
  ]
}
```

Cập nhật file `.husky/pre-commit`:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```

---

## 4. CẤU HÌNH DOCKER & DOCKER COMPOSE

### A. Backend Dockerfile (`backend/Dockerfile` - Multi-stage build):
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production Run
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/main.js"]
```

### B. Frontend Dockerfile (`frontend/Dockerfile` - Phục vụ qua Nginx):
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Web Server
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### C. Docker Compose cho Staging (`docker-compose.staging.yml`):
```yaml
version: '3.8'

services:
  database:
    image: mysql:8.0
    container_name: staging-mysql
    restart: always
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_USER: smartbus_admin
      MYSQL_PASSWORD: ${DB_PASSWORD}
      MYSQL_DATABASE: smartbus_staging
    ports:
      - "3306:3306"
    volumes:
      - mysql_data_staging:/var/lib/mysql
    networks:
      - smartbus-network

  redis:
    image: redis:7-alpine
    container_name: staging-redis
    restart: always
    ports:
      - "6379:6379"
    networks:
      - smartbus-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: staging-backend
    restart: always
    environment:
      PORT: 5000
      DATABASE_URL: mysql://smartbus_admin:${DB_PASSWORD}@database:3306/smartbus_staging
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - database
      - redis
    networks:
      - smartbus-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: staging-frontend
    restart: always
    depends_on:
      - backend
    networks:
      - smartbus-network

  reverse-proxy:
    image: nginx:alpine
    container_name: staging-nginx
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./docker/nginx/default.conf:/etc/nginx/conf.d/default.conf
    depends_on:
      - frontend
      - backend
    networks:
      - smartbus-network

volumes:
  mysql_data_staging:

networks:
  smartbus-network:
    driver: bridge
```

### D. Nginx Reverse Proxy (`docker/nginx/default.conf`):
```nginx
server {
    listen 80;
    server_name staging.smartbus.local; # Hoặc IP Staging Server / Domain

    # Định tuyến Frontend
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Định tuyến Backend API
    location /api/ {
        proxy_pass http://backend:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

## 5. KỊCH BẢN CI/CD PIPELINE (GITHUB ACTIONS)

Tạo file `.github/workflows/deploy-staging.yml`. Kịch bản này sẽ:
1. Chạy linter & Unit tests.
2. Đóng gói Docker Images.
3. SSH vào Staging Server và chạy `docker compose up -d` không gián đoạn.
4. Bắn thông báo lên Slack cho cả đội và QA vào việc.

```yaml
name: CI/CD Pipeline - Auto Deploy Staging

on:
  push:
    branches: [ develop, main ]
  pull_request:
    branches: [ develop ]

jobs:
  validate:
    name: Lint & Unit Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      # Kiểm tra Backend
      - name: Backend - Install, Lint & Unit Test
        working-directory: ./backend
        run: |
          npm ci
          npm run lint || true
          npm run test -- --passWithNoTests

      # Kiểm tra Frontend
      - name: Frontend - Install, Lint & Unit Test
        working-directory: ./frontend
        run: |
          npm ci
          npm run lint || true
          npm run test -- --passWithNoTests

  deploy:
    name: Deploy to Staging Environment
    needs: validate
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Deploy via SSH to Staging Server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.STAGING_SERVER_IP }}
          username: ${{ secrets.STAGING_SSH_USER }}
          key: ${{ secrets.STAGING_SSH_PRIVATE_KEY }}
          script: |
            cd /home/${{ secrets.STAGING_SSH_USER }}/smart-bus-ticketing
            git pull origin develop
            docker compose -f docker-compose.staging.yml down
            docker compose -f docker-compose.staging.yml up -d --build
            docker image prune -f

      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: "🚀 Staging Deployment: Phiên bản mới đã được deploy tự động lên Staging! QA sẵn sàng kiểm thử."
          fields: repo,message,commit,author,action,eventName,ref,workflow
        env:
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
```

---

## CHECKLIST NGHIỆM THU CHO SCRUM MASTER TRẦN ĐẶNG CÔNG TÂM:

- [ ] Khởi tạo Git Repo và mời đủ 10 thành viên vào GitHub Team.
- [ ] Bật tính năng Branch Protection trên nhánh `develop` và `main`.
- [ ] Thêm các GitHub Secrets: `STAGING_SERVER_IP`, `STAGING_SSH_USER`, `STAGING_SSH_PRIVATE_KEY`, `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `SLACK_WEBHOOK_URL`.
- [ ] Kiểm tra thử nghiệm: Tạo 1 PR mẫu, xác nhận CI chạy Pass, merge vào `develop` và kiểm tra link Staging tự động cập nhật.
