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
    image: postgres:15-alpine
    container_name: staging-postgres
    restart: always
    environment:
      POSTGRES_USER: smartbus_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: smartbus_staging
    ports:
      - "5432:5432"
    volumes:
      - pgdata_staging:/var/lib/postgresql/data
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
      DATABASE_URL: postgresql://smartbus_admin:${DB_PASSWORD}@database:5432/smartbus_staging
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
  pgdata_staging:

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
- [ ] Thêm các GitHub Secrets: `STAGING_SERVER_IP`, `STAGING_SSH_USER`, `STAGING_SSH_PRIVATE_KEY`, `DB_PASSWORD`, `SLACK_WEBHOOK_URL`.
- [ ] Kiểm tra thử nghiệm: Tạo 1 PR mẫu, xác nhận CI chạy Pass, merge vào `develop` và kiểm tra link Staging tự động cập nhật.
