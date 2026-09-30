# -*- coding: utf-8 -*-
"""
Script tự động tạo:
1. File Word: Bao_Cao_Sprint_1_Smart_Bus_Ticketing_System.docx
2. File Slide PowerPoint: Slide_Thuyet_Trinh_Sprint_1_Smart_Bus.pptx (Khung thời gian 15 phút)
Dự án: Smart Bus Ticketing System - ICTU 2026
Nhóm 5 - N5 Innovators
"""

import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

from pptx import Presentation
from pptx.util import Inches as PptxInches, Pt as PptxPt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor as PptxRGBColor
from pptx.enum.shapes import MSO_SHAPE

def set_cell_background(cell, fill_hex):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def create_word_report(output_path):
    doc = Document()

    # Cấu hình lề trang (1 inch = 2.54 cm)
    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1)
        section.right_margin = Inches(1)

    # Header trường & đồ án
    p_top = doc.add_paragraph()
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_uni = p_top.add_run("BỘ GIÁO DỤC VÀ ĐÀO TẠO — ĐẠI HỌC THÁI NGUYÊN\nTRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN & TRUYỀN THÔNG (ICTU)\nKHOA CÔNG NGHỆ THÔNG TIN\n")
    r_uni.font.name = "Calibri"
    r_uni.font.size = Pt(11)
    r_uni.font.bold = True
    r_uni.font.color.rgb = RGBColor(70, 70, 70)

    # Đường kẻ ngang
    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_line = p_line.add_run("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    r_line.font.color.rgb = RGBColor(14, 116, 144)

    # Tiêu đề báo cáo
    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_title = p_title.add_run("BÁO CÁO TỔNG KẾT & NGHIỆM THU SPRINT 1\n")
    r_title.font.name = "Calibri"
    r_title.font.size = Pt(22)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(15, 23, 42) # Slate 900

    r_sub = p_title.add_run("DỰ ÁN: SMART BUS TICKETING SYSTEM (HỆ THỐNG VÉ XE BUÝT THÔNG MINH)\n")
    r_sub.font.name = "Calibri"
    r_sub.font.size = Pt(14)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(2, 132, 199) # Sky 600

    r_meta = p_title.add_run("Học phần: Thực tập Cơ sở 2026 | Nhóm thực hiện: Nhóm 5 (N5 Innovators)\n")
    r_meta.font.name = "Calibri"
    r_meta.font.size = Pt(11)
    r_meta.font.italic = True
    r_meta.font.color.rgb = RGBColor(100, 116, 139)

    doc.add_paragraph()

    # 1. THÔNG TIN CHUNG VỀ SPRINT 1
    h1 = doc.add_heading("1. THÔNG TIN TỔNG QUAN VỀ SPRINT 1", level=1)
    h1.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    p1 = doc.add_paragraph()
    p1.paragraph_format.line_spacing = 1.2
    p1.add_run("• Tên dự án: ").bold = True
    p1.add_run("Smart Bus Ticketing System — Hệ thống điều hành & bán vé xe buýt thông minh đô thị.\n")
    p1.add_run("• Đơn vị bảo trợ: ").bold = True
    p1.add_run("Khoa Công nghệ Thông tin — Trường Đại học Công nghệ Thông tin & Truyền thông (ICTU).\n")
    p1.add_run("• Mục tiêu cốt lõi của Sprint 1: ").bold = True
    p1.add_run("Xây dựng trọn vẹn hạ tầng Docker đa dịch vụ, thiết kế cơ sở dữ liệu quan hệ MySQL 8.0, triển khai Backend REST API và Frontend React SPA hoàn chỉnh, đáp ứng 100% tiêu chí ")
    r_zero = p1.add_run("ZERO MOCK DATA (Không dùng dữ liệu giả lập, toàn bộ thao tác kết nối CSDL MySQL thật).\n")
    r_zero.bold = True

    # Bảng phân công 10 thành viên
    doc.add_paragraph().add_run("Bảng 1: Phân công nhiệm vụ các thành viên Nhóm 5 (N5 Innovators):").italic = True
    table_team = doc.add_table(rows=1, cols=4)
    table_team.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr_cells = table_team.rows[0].cells
    headers = ["STT", "Họ và tên", "Vai trò (Role)", "Phân hệ phụ trách chính"]
    for i, h in enumerate(headers):
        hdr_cells[i].text = h
        hdr_cells[i].paragraphs[0].runs[0].font.bold = True
        hdr_cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(hdr_cells[i], "0F172A")
        set_cell_margins(hdr_cells[i], 120, 120, 150, 150)

    team_data = [
        ("1", "Trần Đặng Công Tâm", "Scrum Master kiêm Leader", "Quản lý dự án, Điều phối Sprint, Kiến trúc Docker, Review PR"),
        ("2", "Nguyễn Hoàng Đức", "Frontend Developer", "Layout Auth, State Management (AuthContext), UI Đăng nhập & RBAC"),
        ("3", "Hà Quang Vinh", "Frontend Developer", "Quản trị tuyến & Sắp xếp trạm dừng xe buýt kéo thả (@dnd-kit)"),
        ("4", "Triệu Văn Thiệp", "Frontend Developer", "Giao diện Trang chủ, Tra cứu thông tin tuyến xe & Kết quả tìm kiếm"),
        ("5", "La Công Tuấn", "Backend Developer", "Kiến trúc Backend API, Xử lý Đặt vé, Sơ đồ ghế & Sinh mã QR"),
        ("6", "Tào Hoàng Minh Vũ", "Backend Developer", "Thiết kế CSDL MySQL 8.0, Bảng mã tiếng Việt utf8mb4"),
        ("7", "Nguyễn Minh Đức", "Backend Developer", "API Tìm kiếm chuyến xe (US 01) & Tối ưu hóa truy vấn CSDL"),
        ("8", "Mạch Thị Ngọc Ánh", "Quality Assurance (QA)", "Kiểm thử chất lượng phần mềm, lập Test Case, soát vé QR"),
        ("9", "Đinh Hữu Phúc", "Quality Assurance (QA)", "Kiểm thử chức năng (Functional Testing), luồng API & UI"),
        ("10", "Hoàng Quốc Toản", "Quality Assurance (QA)", "Kiểm thử hiệu năng, bảo mật và nghiệm thu tiêu chuẩn DoD")
    ]

    for row_idx, member in enumerate(team_data):
        row_cells = table_team.add_row().cells
        bg_color = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, text in enumerate(member):
            row_cells[col_idx].text = text
            set_cell_background(row_cells[col_idx], bg_color)
            set_cell_margins(row_cells[col_idx], 80, 80, 120, 120)
            if col_idx == 0:
                row_cells[col_idx].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.CENTER

    doc.add_paragraph()

    # 2. KIẾN TRÚC HỆ THỐNG & HẠ TẦNG DOCKER
    h2 = doc.add_heading("2. KIẾN TRÚC HỆ THỐNG & HẠ TẦNG DOCKER", level=1)
    h2.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    p2 = doc.add_paragraph()
    p2.paragraph_format.line_spacing = 1.2
    p2.add_run("Hệ thống được đóng gói tự động hóa 100% qua file ")
    p2.add_run("docker-compose.yml").bold = True
    p2.add_run(", gồm 4 dịch vụ container chuyên biệt:\n")
    p2.add_run("1. Container smartbus_frontend (Cổng 3000): ").bold = True
    p2.add_run("Chạy Nginx Alpine phục vụ giao diện React 19 SPA, tích hợp Reverse Proxy chuyển tiếp an toàn các request /api/ sang backend, loại bỏ hoàn toàn lỗi CORS và lỗi sập màn hình đen.\n")
    p2.add_run("2. Container smartbus_backend (Cổng 5000): ").bold = True
    p2.add_run("Chạy Node.js 20, TypeScript, Express, kết nối MySQL Connection Pool, mã hóa mật khẩu bcrypt, phát hành token JWT có thời hạn 24 giờ.\n")
    p2.add_run("3. Container smartbus_mysql (Cổng Host 3308 -> Cổng Container 3306): ").bold = True
    p2.add_run("MySQL 8.0 chuẩn bảng mã tiếng Việt utf8mb4_unicode_ci, lưu trữ dữ liệu thực tế về người dùng, phân quyền RBAC, tuyến buýt, trạm dừng, chuyến xe, vé và sự cố.\n")
    p2.add_run("4. Container smartbus_phpmyadmin (Cổng 8080): ").bold = True
    p2.add_run("Giao diện quản trị cơ sở dữ liệu trực quan bằng trình duyệt web, cho phép giám sát trực tiếp các bảng dữ liệu mà không cần phần mềm cài đặt riêng.")

    # Bảng cổng dịch vụ
    doc.add_paragraph().add_run("Bảng 2: Danh mục dịch vụ và đường dẫn truy cập kiểm thử:").italic = True
    t_svc = doc.add_table(rows=1, cols=4)
    t_svc.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(["Tên dịch vụ", "Cổng Host", "Địa chỉ URL", "Mục đích"]):
        t_svc.rows[0].cells[i].text = h
        t_svc.rows[0].cells[i].paragraphs[0].runs[0].font.bold = True
        t_svc.rows[0].cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(t_svc.rows[0].cells[i], "0F172A")
        set_cell_margins(t_svc.rows[0].cells[i], 120, 120, 150, 150)

    svc_data = [
        ("Web Frontend SPA", "3000", "http://localhost:3000", "Giao diện chính cho Admin, Tài xế và Hành khách"),
        ("Backend RESTful API", "5000", "http://localhost:5000/api/health", "API kiểm tra trạng thái sức khỏe và kết nối MySQL"),
        ("phpMyAdmin GUI", "8080", "http://localhost:8080", "Quản trị CSDL (User: root / Pass: root_pass)"),
        ("MySQL 8.0 Server", "3308", "localhost:3308", "Kết nối trực tiếp CSDL qua TCP (Database: smartbus_db)")
    ]
    for row_idx, s in enumerate(svc_data):
        r_c = t_svc.add_row().cells
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, txt in enumerate(s):
            r_c[col_idx].text = txt
            set_cell_background(r_c[col_idx], bg)
            set_cell_margins(r_c[col_idx], 80, 80, 120, 120)

    doc.add_paragraph()

    # 3. KẾT QUẢ TRIỂN KHAI THEO CÁC USER STORY CỦA SPRINT 1
    h3 = doc.add_heading("3. KẾT QUẢ TRIỂN KHAI THEO CÁC USER STORY SPRINT 1", level=1)
    h3.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    us_list = [
        ("US 22: Xác thực tài khoản & Phân quyền RBAC đa cấp",
         "100% ĐẠT",
         "• Hỗ trợ đăng ký và đăng nhập linh hoạt bằng Email hoặc Số điện thoại.\n• Mật khẩu được mã hóa an toàn bằng thư viện bcrypt (Salt rounds = 10).\n• Cấp phát JWT Bearer Token lưu tại localStorage, tích hợp Route Guards bảo vệ các đường dẫn nhạy cảm.\n• Cung cấp sẵn 4 nút bấm chọn nhanh tài khoản mẫu (Admin, Manager, Driver, Passenger) tại trang /login."),

        ("US 12: Quản lý Tuyến xe & Sắp xếp Trạm dừng đón trả",
         "100% ĐẠT",
         "• Xem danh sách các tuyến xe buýt kèm cự ly km, thời gian giãn cách, giá vé cơ sở.\n• Cho phép kéo thả (Drag and Drop bằng @dnd-kit) sắp xếp lại thứ tự đón trả của các trạm dừng.\n• Cập nhật thứ bậc lộ trình và thời gian ước lượng lưu trực tiếp vào bảng route_stops trong MySQL."),

        ("US 01: Tra cứu lộ trình & Tìm kiếm Chuyến xe buýt",
         "100% ĐẠT",
         "• Hành khách tra cứu lộ trình xuất phát và điểm đến trực quan trên giao diện.\n• API tìm kiếm chuyến xe theo trạm khởi hành, trạm đến và ngày đi, truy vấn tối ưu thời gian thực từ bảng trips."),

        ("US 02, 03, 04, 06: Đặt vé, Sơ đồ 40 ghế & Mã QR Điện tử",
         "100% ĐẠT",
         "• Hiển thị trực quan sơ đồ 40 chỗ ngồi trên xe (Phân biệt rõ: Ghế trống, Ghế đang chọn, Ghế đã bán).\n• Cơ chế giữ chỗ 10 phút, tự động tạo mã vé điện tử và lưu trữ vào CSDL MySQL.\n• Sinh mã QR trực quan nét cao (140x140px) có thể quét được qua camera hoặc nhập chuỗi ký tự định danh."),

        ("US 15: Cổng thông tin Tài xế — Soát vé QR thời gian thực",
         "100% ĐẠT",
         "• Cho phép tài xế quét hoặc dán chuỗi mã QR / mã vé để đối soát trực tiếp trong CSDL MySQL.\n• Tự động đổi trạng thái vé sang CHECKED_IN, ngăn chặn hoàn toàn việc tái sử dụng vé nhiều lần."),

        ("US 11: Cổng thông tin Tài xế — Báo cáo sự cố đường sá",
         "100% ĐẠT",
         "• Tài xế gửi báo cáo ùn tắc, hỏng xe hoặc thời tiết xấu kèm số phút trễ dự kiến.\n• Lưu trữ sự cố vào bảng incidents và tự động cập nhật lên hệ thống điều hành trung tâm."),

        ("US 24: Cổng thông tin Hành khách — Đánh giá dịch vụ",
         "100% ĐẠT",
         "• Hành khách gửi đánh giá sao (1 - 5 sao) và nhận xét thái độ phục vụ của bác tài.\n• Phản hồi được lưu trữ minh bạch vào bảng feedbacks trong CSDL MySQL."),

        ("US 17: Cổng thông tin Hành khách — Hồ sơ trợ giá HSSV",
         "100% ĐẠT",
         "• Hành khách gửi hồ sơ thẻ sinh viên để nhận chính sách trợ giá 50% vé xe buýt toàn hệ thống.")
    ]

    for title, status, details in us_list:
        p_us = doc.add_paragraph()
        r_ust = p_us.add_run(f"✔ {title} — ")
        r_ust.bold = True
        r_ust.font.color.rgb = RGBColor(2, 132, 199)
        r_stat = p_us.add_run(f"[{status}]\n")
        r_stat.bold = True
        r_stat.font.color.rgb = RGBColor(16, 185, 129)
        p_us.add_run(details)

    doc.add_paragraph()

    # 4. THÁCH THỨC KỸ THUẬT & GIẢI PHÁP ĐÃ XỬ LÝ
    h4 = doc.add_heading("4. CÁC THÁCH THỨC KỸ THUẬT TIÊU BIỂU ĐÃ VƯỢT QUA", level=1)
    h4.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    challenges = [
        ("Xử lý lỗi sập màn hình đen trên cổng 3000",
         "Ban đầu Frontend chạy lệnh serve -s không có cơ chế reverse proxy nên các request API nhận về mã HTML index.html, làm React component unmount sập màn hình đen. Nhóm đã chuyển đổi sang Nginx Alpine Reverse Proxy, cấu hình try_files và bọc thẻ ErrorBoundary chuẩn React 18, đảm bảo hệ thống không bao giờ bị gián đoạn giao diện."),

        ("Khắc phục triệt để lỗi phông chữ tiếng Việt (dấu ???) trong MySQL",
         "Khi import CSDL ban đầu, kết nối client bị mặc định là latin1 khiến các ký tự có dấu bị biến thành 0x3F. Nhóm đã cấu hình bổ sung SET NAMES utf8mb4; SET CHARACTER SET utf8mb4; trong init.sql và thiết lập charset: 'utf8mb4' trong Connection Pool Node.js, giúp 100% dữ liệu tiếng Việt hiển thị sắc nét."),

        ("Khắc phục lỗi không hiển thị hình ảnh mã QR và ngày hết hạn Invalid Date",
         "Dữ liệu phản hồi từ backend bị lệch cấu trúc so với frontend component. Nhóm đã chuẩn hóa cấu trúc JSON payload trả về đầy đủ cả dạng nested (ticket, payment, qrCode, qrCodeUrl) và flat, đồng thời render thẻ hình ảnh <img> mã QR độ nét cao giúp tài xế và hành khách dễ dàng quét trên màn hình điện thoại.")
    ]

    for title, desc in challenges:
        p_ch = doc.add_paragraph()
        p_ch.add_run(f"• {title}: ").bold = True
        p_ch.add_run(desc)

    doc.add_paragraph()

    # 5. TÀI KHOẢN DEMO KIỂM THỬ
    h5 = doc.add_heading("5. DANH SÁCH TÀI KHOẢN MẪU KIỂM THỬ HỆ THỐNG", level=1)
    h5.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    t_acc = doc.add_table(rows=1, cols=4)
    t_acc.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(["Vai trò (Role)", "Tài khoản (Email / SĐT)", "Mật khẩu", "Phân hệ mặc định"]):
        t_acc.rows[0].cells[i].text = h
        t_acc.rows[0].cells[i].paragraphs[0].runs[0].font.bold = True
        t_acc.rows[0].cells[i].paragraphs[0].runs[0].font.color.rgb = RGBColor(255, 255, 255)
        set_cell_background(t_acc.rows[0].cells[i], "0F172A")
        set_cell_margins(t_acc.rows[0].cells[i], 120, 120, 150, 150)

    acc_data = [
        ("Quản trị viên (Admin)", "admin@smartbus.ictu.vn", "Admin@12345", "/admin/routes (Toàn quyền hệ thống)"),
        ("Quản lý điều phối (Manager)", "manager@smartbus.ictu.vn", "Manager@123", "/admin/routes (Điều độ tuyến/chuyến)"),
        ("Tài xế (Driver)", "driver@smartbus.ictu.vn (hoặc 0987654321)", "Driver@123", "/driver/portal (Soát vé QR & Báo sự cố)"),
        ("Hành khách (Passenger)", "khachhang@gmail.com", "User@123", "/passenger/booking (Đặt vé & Đánh giá)")
    ]
    for row_idx, a in enumerate(acc_data):
        r_c = t_acc.add_row().cells
        bg = "F8FAFC" if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, txt in enumerate(a):
            r_c[col_idx].text = txt
            set_cell_background(r_c[col_idx], bg)
            set_cell_margins(r_c[col_idx], 80, 80, 120, 120)

    doc.add_paragraph()

    # 6. KẾ HOẠCH CHO SPRINT 2
    h6 = doc.add_heading("6. KẾ HOẠCH & ĐỊNH HƯỚNG TRIỂN KHAI SPRINT 2", level=1)
    h6.runs[0].font.color.rgb = RGBColor(15, 23, 42)

    p6 = doc.add_paragraph()
    p6.add_run("1. Tích hợp Cổng thanh toán trực tuyến: ").bold = True
    p6.add_run("Tích hợp VNPay Sandbox và ví điện tử MoMo cho quy trình thanh toán vé xe tức thì.\n")
    p6.add_run("2. Giám sát hành trình xe buýt thời gian thực (Live GPS Tracking): ").bold = True
    p6.add_run("Sử dụng bản đồ số tương tác (Leaflet / Mapbox) và giao thức WebSocket hiển thị vị trí xe đang lăn bánh.\n")
    p6.add_run("3. Ứng dụng Di động PWA / Mobile App: ").bold = True
    p6.add_run("Đóng gói ứng dụng Progressive Web App (PWA) để hành khách lưu vé offline ngay trên màn hình chính của điện thoại.")

    # Chữ ký nghiệm thu
    p_sign = doc.add_paragraph()
    p_sign.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sign.add_run("\nThái Nguyên, ngày 29 tháng 09 năm 2026\n").italic = True
    p_sign.add_run("TM. NHÓM PHÁT TRIỂN — NHÓM 5 (N5 INNOVATORS)\n").bold = True
    p_sign.add_run("Scrum Master / Trưởng nhóm\n\n\n").italic = True
    p_sign.add_run("Trần Đặng Công Tâm").bold = True

    doc.save(output_path)
    print(f"Đã tạo thành công file Word: {output_path}")

def create_presentation_slides(output_path):
    prs = Presentation()
    # Kích thước 16:9 Widescreen (13.333 x 7.5 inch)
    prs.slide_width = PptxInches(13.333)
    prs.slide_height = PptxInches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Bảng màu thiết kế chuyên nghiệp
    BG_DARK = PptxRGBColor(11, 19, 43)       # #0B132B (Deep Navy)
    CARD_BG = PptxRGBColor(28, 37, 65)       # #1C2541
    ACCENT_CYAN = PptxRGBColor(74, 144, 226)  # #4A90E2
    ACCENT_SKY = PptxRGBColor(56, 189, 248)   # #38BDF8
    TEXT_WHITE = PptxRGBColor(248, 250, 252) # #F8FAFC
    TEXT_MUTED = PptxRGBColor(148, 163, 184) # #94A3B8
    ACCENT_GREEN = PptxRGBColor(52, 211, 153)# #34D399

    def add_header(slide, time_tag, title):
        # Time tag
        tb_tag = slide.shapes.add_textbox(PptxInches(0.8), PptxInches(0.4), PptxInches(11.7), PptxInches(0.35))
        tf_tag = tb_tag.text_frame
        tf_tag.word_wrap = True
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = time_tag.upper()
        p_tag.font.size = PptxPt(11)
        p_tag.font.bold = True
        p_tag.font.color.rgb = ACCENT_SKY

        # Title
        tb_title = slide.shapes.add_textbox(PptxInches(0.8), PptxInches(0.75), PptxInches(11.7), PptxInches(0.7))
        tf_title = tb_title.text_frame
        tf_title.word_wrap = True
        p_title = tf_title.paragraphs[0]
        p_title.text = title
        p_title.font.size = PptxPt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

    def add_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.color.rgb = BG_DARK
        return bg

    # =========================================================================
    # SLIDE 1: TRANG TIÊU ĐỀ (01 PHÚT)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_background(s1)

    tb_s1 = s1.shapes.add_textbox(PptxInches(1.0), PptxInches(1.8), PptxInches(11.3), PptxInches(3.8))
    tf1 = tb_s1.text_frame
    tf1.word_wrap = True

    p_badge = tf1.paragraphs[0]
    p_badge.text = "ĐỒ ÁN THỰC TẬP CƠ SỞ 2026 — ĐẠI HỌC CNTT & TT (ICTU)"
    p_badge.font.size = PptxPt(13)
    p_badge.font.bold = True
    p_badge.font.color.rgb = ACCENT_SKY
    p_badge.space_after = PptxPt(14)

    p_main = tf1.add_paragraph()
    p_main.text = "SMART BUS TICKETING SYSTEM\nBÁO CÁO NGHIỆM THU SPRINT 1"
    p_main.font.size = PptxPt(36)
    p_main.font.bold = True
    p_main.font.color.rgb = TEXT_WHITE
    p_main.space_after = PptxPt(16)

    p_sub = tf1.add_paragraph()
    p_sub.text = "Hệ thống vé xe buýt thông minh • 100% Zero Mock Data (MySQL 8.0) • Đóng gói trọn vẹn Docker Compose"
    p_sub.font.size = PptxPt(15)
    p_sub.font.color.rgb = TEXT_MUTED
    p_sub.space_after = PptxPt(28)

    p_auth = tf1.add_paragraph()
    p_auth.text = "Nhóm thực hiện: Nhóm 5 (N5 Innovators) | Scrum Master: Trần Đặng Công Tâm\nThời lượng báo cáo: 15 Phút"
    p_auth.font.size = PptxPt(13)
    p_auth.font.bold = True
    p_auth.font.color.rgb = ACCENT_GREEN

    s1.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (00:00 - 01:00):\n"
        "Kính chào Thầy Cô và các bạn sinh viên trong hội đồng nghiệm thu. Hôm nay, đại diện cho Nhóm 5 (N5 Innovators), "
        "em xin phép được trình bày báo cáo nghiệm thu Sprint 1 của dự án 'Smart Bus Ticketing System' - Hệ thống đặt vé và điều hành xe buýt thông minh. "
        "Trong Sprint 1, nhóm đặt ra mục tiêu cốt lõi là xây dựng nền tảng hạ tầng vững chắc, hoàn thành toàn bộ CSDL MySQL thật 100% không dùng mock data, "
        "đóng gói Docker hoàn chỉnh và triển khai trọn vẹn các phân hệ người dùng từ Admin, Tài xế đến Hành khách."
    )

    # =========================================================================
    # SLIDE 2: MỤC TIÊU & CAM KẾT CỐT LÕI (01.5 PHÚT)
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_background(s2)
    add_header(s2, "Phút 01:00 - 02:30 | Đặt vấn đề & Mục tiêu", "MỤC TIÊU CỐT LÕI CỦA SPRINT 1 (DEFINITION OF DONE)")

    # 3 Cards
    card_width = PptxInches(3.6)
    card_height = PptxInches(4.8)
    card_top = PptxInches(1.8)

    cards_data = [
        ("1. ZERO MOCK DATA",
         "Cam kết 100% CSDL Thật",
         [
             "Tuyệt đối không dùng dữ liệu giả lập (mock data / mock test).",
             "Mọi thao tác đọc, ghi, truy vấn đều kết nối trực tiếp vào MySQL 8.0 thật.",
             "Bảo toàn nguyên vẹn tính toàn vẹn khóa ngoại (Foreign Keys) và ACID."
         ],
         ACCENT_GREEN),
        ("2. DOCKER ĐA DỊCH VỤ",
         "Khởi chạy 1 lệnh duy nhất",
         [
             "4 Containers liên kết qua mạng nội bộ Docker Network.",
             "Nginx Alpine Reverse Proxy phục vụ SPA cổng 3000.",
             "Backend Express cổng 5000 và phpMyAdmin cổng 8080.",
             "Đảm bảo môi trường chạy nhất quán trên mọi hệ điều hành."
         ],
         ACCENT_SKY),
        ("3. TRẢI NGHIỆM LIQUID GLASS",
         "Thiết kế UI/UX Đẳng cấp",
         [
             "Phong cách thiết kế Liquid Glass kính mờ hiện đại.",
             "Đầy đủ 4 phân hệ vai trò RBAC: Admin, Manager, Driver, Passenger.",
             "Tích hợp mã QR nét cao cho quy trình vé điện tử thông minh."
         ],
         ACCENT_CYAN)
    ]

    for i, (tag, ctitle, points, color) in enumerate(cards_data):
        left = PptxInches(0.8 + i * 4.0)
        card = s2.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, card_top, card_width, card_height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = color
        card.line.width = PptxPt(1.5)

        tf = card.text_frame
        tf.word_wrap = True
        p0 = tf.paragraphs[0]
        p0.text = tag
        p0.font.size = PptxPt(12)
        p0.font.bold = True
        p0.font.color.rgb = color

        p1 = tf.add_paragraph()
        p1.text = ctitle
        p1.font.size = PptxPt(16)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_WHITE
        p1.space_after = PptxPt(14)

        for pt in points:
            p = tf.add_paragraph()
            p.text = f"• {pt}"
            p.font.size = PptxPt(12)
            p.font.color.rgb = TEXT_MUTED
            p.space_after = PptxPt(8)

    s2.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (01:00 - 02:30):\n"
        "Bước vào Sprint 1, nhóm quán triệt 3 tiêu chí cốt lõi: "
        "Thứ nhất, 'Zero Mock Data' - tất cả dữ liệu từ danh mục tuyến, trạm xe, tài khoản người dùng, đơn đặt vé cho đến phản ánh sự cố đều được ghi và đọc trực tiếp từ MySQL 8.0. "
        "Thứ hai, tính sẵn sàng cao với Docker Compose - chỉ cần chạy lệnh 'docker compose up -d', 4 dịch vụ độc lập sẽ tự động kết nối và cấu hình hoàn tất. "
        "Thứ ba, giao diện đạt chuẩn thẩm mỹ cao cấp với phong cách Liquid Glass và hỗ trợ đầy đủ luồng nghiệp vụ cho mọi tác nhân."
    )

    # =========================================================================
    # SLIDE 3: ĐỘI NGŨ PHÁT TRIỂN & PHÂN CÔNG (01.5 PHÚT)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_background(s3)
    add_header(s3, "Phút 02:30 - 04:00 | Đội ngũ dự án", "ĐỘI NGŨ THỰC HIỆN — NHÓM 5 (N5 INNOVATORS)")

    # 3 Cột: Frontend (3), Backend (3), QA + Leader (4)
    cols_team = [
        ("QUẢN LÝ & KIỂM THỬ (QA)", ACCENT_GREEN, [
            ("Trần Đặng Công Tâm", "Scrum Master & Trưởng nhóm: Kiến trúc Docker, Điều phối Sprint, Review PR"),
            ("Mạch Thị Ngọc Ánh", "QA: Lập Test Case, kiểm thử chức năng soát vé QR và giao diện người dùng"),
            ("Đinh Hữu Phúc", "QA: Kiểm thử luồng tích hợp API - Frontend, bảo mật đăng nhập"),
            ("Hoàng Quốc Toản", "QA: Kiểm thử hiệu năng truy vấn CSDL, kiểm tra tiêu chuẩn nghiệm thu DoD")
        ]),
        ("FRONTEND TEAM (UI/UX)", ACCENT_SKY, [
            ("Nguyễn Hoàng Đức", "FE Dev: Xây dựng Layout Auth, Quản lý State AuthContext, Phân quyền RBAC"),
            ("Hà Quang Vinh", "FE Dev: Quản trị tuyến xe buýt, Sắp xếp thứ tự trạm kéo thả (@dnd-kit)"),
            ("Triệu Văn Thiệp", "FE Dev: Xây dựng Trang chủ tra cứu, Tìm kiếm chuyến xe & Kết quả tra cứu")
        ]),
        ("BACKEND TEAM (API & CSDL)", ACCENT_CYAN, [
            ("La Công Tuấn", "BE Dev: Thiết kế kiến trúc Backend API, Xử lý Sơ đồ ghế, Đặt vé & Sinh mã QR"),
            ("Tào Hoàng Minh Vũ", "BE Dev: Thiết kế CSDL MySQL 8.0, Migration, Bảng mã tiếng Việt utf8mb4"),
            ("Nguyễn Minh Đức", "BE Dev: Xây dựng thuật toán API tra cứu chuyến xe (US 01) tối ưu hiệu năng")
        ])
    ]

    for i, (col_title, color, members) in enumerate(cols_team):
        left = PptxInches(0.8 + i * 4.0)
        cbox = s3.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, PptxInches(1.8), PptxInches(3.6), PptxInches(4.8))
        cbox.fill.solid()
        cbox.fill.fore_color.rgb = CARD_BG
        cbox.line.color.rgb = color

        tf = cbox.text_frame
        tf.word_wrap = True
        p_c = tf.paragraphs[0]
        p_c.text = col_title
        p_c.font.size = PptxPt(13)
        p_c.font.bold = True
        p_c.font.color.rgb = color
        p_c.space_after = PptxPt(12)

        for name, role in members:
            p_n = tf.add_paragraph()
            p_n.text = name
            p_n.font.size = PptxPt(13)
            p_n.font.bold = True
            p_n.font.color.rgb = TEXT_WHITE

            p_r = tf.add_paragraph()
            p_r.text = role
            p_r.font.size = PptxPt(10.5)
            p_r.font.color.rgb = TEXT_MUTED
            p_r.space_after = PptxPt(8)

    s3.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (02:30 - 04:00):\n"
        "Nhóm 5 gồm 10 thành viên phối hợp chặt chẽ theo mô hình Agile Scrum: "
        "Em là Trần Đặng Công Tâm đảm nhiệm vai trò Scrum Master kiêm Leader điều phối dự án. "
        "Bộ phận Frontend gồm 3 bạn Đức, Vinh, Thiệp đảm nhiệm xây dựng giao diện người dùng mượt mà bằng React 19 và Vite. "
        "Bộ phận Backend gồm 3 bạn Tuấn, Vũ, Đức đảm nhiệm kiến trúc API Express, CSDL MySQL 8.0 và thuật toán tìm kiếm chuyến. "
        "Cùng với 3 bạn QA Ánh, Phúc, Toản liên tục kiểm thử hồi quy, đảm bảo chất lượng phần mềm tốt nhất trước khi xuất xưởng."
    )

    # =========================================================================
    # SLIDE 4: KIẾN TRÚC HẠ TẦNG DOCKER COMPOSE (02 PHÚT)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_background(s4)
    add_header(s4, "Phút 04:00 - 06:00 | Hạ tầng & Kỹ thuật", "KIẾN TRÚC DOCKER COMPOSE & CƠ SỞ DỮ LIỆU MYSQL 8.0")

    # 4 Ô Container
    grid = [
        ("smartbus_frontend", "Cổng 3000", "Nginx:alpine + React 19 SPA",
         "• Nginx phục vụ SPA mượt mà qua try_files.\n• Tự động Reverse Proxy /api/ -> backend:5000.\n• Tích hợp ErrorBoundary loại bỏ lỗi màn hình đen."),
        ("smartbus_backend", "Cổng 5000", "Node.js 20 + Express TypeScript",
         "• REST API kết nối MySQL Connection Pool.\n• Xác thực phân quyền JWT Bearer Token.\n• Thuật toán sinh mã QR và quản trị đặt vé."),
        ("smartbus_mysql", "Cổng 3308", "MySQL 8.0 Engine",
         "• Chuẩn bảng mã tiếng Việt utf8mb4_unicode_ci.\n• Ràng buộc toàn vẹn khóa ngoại (Foreign Keys).\n• 9 bảng dữ liệu quan hệ hoàn chỉnh."),
        ("smartbus_phpmyadmin", "Cổng 8080", "phpMyAdmin Web GUI",
         "• Quản trị CSDL trực quan trên trình duyệt.\n• Đăng nhập tự động kết nối tài khoản root.\n• Cho phép giám sát dữ liệu realtime dễ dàng.")
    ]

    for idx, (cname, cport, ctech, cdesc) in enumerate(grid):
        col = idx % 2
        row = idx // 2
        left = PptxInches(0.8 + col * 6.0)
        top = PptxInches(1.8 + row * 2.5)

        box = s4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, PptxInches(5.6), PptxInches(2.2))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = ACCENT_SKY if idx == 0 else ACCENT_GREEN if idx == 2 else ACCENT_CYAN

        tf = box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = f"📦 {cname}  [{cport}]"
        p0.font.size = PptxPt(14)
        p0.font.bold = True
        p0.font.color.rgb = TEXT_WHITE

        p1 = tf.add_paragraph()
        p1.text = ctech
        p1.font.size = PptxPt(11)
        p1.font.bold = True
        p1.font.color.rgb = ACCENT_SKY
        p1.space_after = PptxPt(4)

        for line in cdesc.split("\n"):
            p = tf.add_paragraph()
            p.text = line
            p.font.size = PptxPt(10.5)
            p.font.color.rgb = TEXT_MUTED

    s4.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (04:00 - 06:00):\n"
        "Về kiến trúc hạ tầng: Toàn bộ hệ thống chạy trên nền Docker Compose với 4 container biệt lập: "
        "Container Frontend ở cổng 3000 sử dụng image Nginx Alpine, đóng vai trò Reverse Proxy chuyển tiếp các request /api sang Backend cổng 5000. "
        "Nhờ cấu hình này, Frontend không bao giờ bị lỗi CORS hay xung đột origin. "
        "Container CSDL MySQL 8.0 được cấu hình mở cổng 3308 trên máy host để tránh xung đột với MySQL 3306 cài sẵn trên Windows của người dùng. "
        "Đồng thời, phpMyAdmin ở cổng 8080 cho phép hội đồng kiểm tra trực quan các bản ghi trong CSDL bất cứ lúc nào."
    )

    # =========================================================================
    # SLIDE 5: XÁC THỰC & PHÂN QUYỀN RBAC (US 22) (02 PHÚT)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_background(s5)
    add_header(s5, "Phút 06:00 - 08:00 | Tính năng lõi", "PHÂN HỆ XÁC THỰC & PHÂN QUYỀN RBAC (US 22)")

    # 4 Tài khoản mẫu
    roles_box = [
        ("👑 ADMIN (Quản trị viên)", "admin@smartbus.ictu.vn", "Admin@12345", "/admin/routes",
         "Toàn quyền quản trị hệ thống: Thống kê doanh thu, quản lý danh mục tuyến, kéo thả trạm dừng và giám sát vận hành."),
        ("👔 MANAGER (Điều phối viên)", "manager@smartbus.ictu.vn", "Manager@123", "/admin/routes",
         "Quản lý điều độ mạng lưới tuyến xe buýt, phân công phương tiện và tài xế cho các khung giờ xuất bến."),
        ("🚌 DRIVER (Tài xế lái xe)", "driver@smartbus.ictu.vn", "Driver@123 (hoặc 0987654321)", "/driver/portal",
         "Giao diện tối ưu di động: Soát vé bằng camera quét mã QR, đối soát tính hợp lệ và gửi báo cáo sự cố đường sá."),
        ("🎒 PASSENGER (Hành khách)", "khachhang@gmail.com", "User@123", "/passenger/booking",
         "Tra cứu tuyến xe, đặt vé trực tuyến chọn vị trí ghế, nhận vé điện tử mã QR và gửi đánh giá dịch vụ.")
    ]

    for idx, (rtitle, remail, rpass, rroute, rdesc) in enumerate(roles_box):
        top = PptxInches(1.8 + idx * 1.25)
        box = s5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(0.8), top, PptxInches(11.7), PptxInches(1.1))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = ACCENT_SKY if idx == 0 else ACCENT_GREEN if idx == 2 else ACCENT_CYAN

        tf = box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = f"{rtitle}  |  Tài khoản: {remail}  |  Mật khẩu: {rpass}  |  Điều hướng: {rroute}"
        p0.font.size = PptxPt(12.5)
        p0.font.bold = True
        p0.font.color.rgb = TEXT_WHITE

        p1 = tf.add_paragraph()
        p1.text = f"➤ {rdesc}"
        p1.font.size = PptxPt(11)
        p1.font.color.rgb = TEXT_MUTED

    s5.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (06:00 - 08:00):\n"
        "Tiếp theo là phân hệ Xác thực và Phân quyền RBAC (US 22): "
        "Mật khẩu của tất cả người dùng được mã hóa bằng thuật toán băm bcrypt 10 rounds trước khi lưu vào MySQL. "
        "Hệ thống phân chia rõ 4 vai trò với bảng quyền hạn chặt chẽ: "
        "Admin và Manager có toàn quyền điều hành tuyến và biểu phí; "
        "Tài xế chỉ truy cập cổng Driver Portal để soát vé và báo cáo sự cố; "
        "Hành khách sử dụng Passenger Portal để đặt vé và nhận ưu đãi HSSV. "
        "Đặc biệt tại trang đăng nhập, nhóm đã tích hợp sẵn 4 nút chọn nhanh tài khoản mẫu giúp kiểm thử viên không mất thời gian gõ phím."
    )

    # =========================================================================
    # SLIDE 6: QUẢN TRỊ TUYẾN & KÉO THẢ TRẠM DÙNG (US 12) (02 PHÚT)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_background(s6)
    add_header(s6, "Phút 08:00 - 10:00 | Quản trị vận hành", "QUẢN LÝ TUYẾN XE & KÉO THẢ TRẠM DỪNG (US 12)")

    # 2 Cột lớn
    col_left = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(0.8), PptxInches(1.8), PptxInches(5.7), PptxInches(4.8))
    col_left.fill.solid()
    col_left.fill.fore_color.rgb = CARD_BG
    col_left.line.color.rgb = ACCENT_CYAN

    tf_l = col_left.text_frame
    tf_l.word_wrap = True
    p_lt = tf_l.paragraphs[0]
    p_lt.text = "QUẢN LÝ DANH MỤC TUYẾN & BIỂU PHÍ"
    p_lt.font.size = PptxPt(14)
    p_lt.font.bold = True
    p_lt.font.color.rgb = ACCENT_SKY
    p_lt.space_after = PptxPt(12)

    l_points = [
        "Hiển thị danh sách các tuyến xe buýt đang hoạt động (ACTIVE).",
        "Thông số đầy đủ: Mã tuyến (R01, R02), cự ly hành trình (km), biểu phí gốc và thời gian ước lượng.",
        "Bộ lọc tìm kiếm tức thì theo mã tuyến hoặc tên hành trình.",
        "Dữ liệu mẫu thực tế: Tuyến R01 (Mỹ Đình - Long Biên), Tuyến R02 (Yên Nghĩa - Nội Bài)."
    ]
    for pt in l_points:
        p = tf_l.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = PptxPt(8)

    col_right = s6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(6.8), PptxInches(1.8), PptxInches(5.7), PptxInches(4.8))
    col_right.fill.solid()
    col_right.fill.fore_color.rgb = CARD_BG
    col_right.line.color.rgb = ACCENT_GREEN

    tf_r = col_right.text_frame
    tf_r.word_wrap = True
    p_rt = tf_r.paragraphs[0]
    p_rt.text = "SẮP XẾP TRẠM KÉO THẢ (@dnd-kit)"
    p_rt.font.size = PptxPt(14)
    p_rt.font.bold = True
    p_rt.font.color.rgb = ACCENT_GREEN
    p_rt.space_after = PptxPt(12)

    r_points = [
        "Sử dụng công nghệ Drag & Drop hiện đại nhất với thư viện @dnd-kit.",
        "Điều phối viên có thể nắm kéo thay đổi thứ tự đón/trả khách giữa các trạm dừng.",
        "Tự động tính toán lại khoảng cách từ trạm đầu và thời gian dự kiến (phút).",
        "Lưu đồng bộ tức thì vào bảng route_stops trong MySQL, đảm bảo lộ trình luôn chính xác."
    ]
    for pt in r_points:
        p = tf_r.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = PptxPt(8)

    s6.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (08:00 - 10:00):\n"
        "Phân hệ tiếp theo là US 12: Quản trị tuyến và trạm dừng xe buýt. "
        "Một trong những điểm nhấn kỹ thuật của nhóm là tính năng sắp xếp thứ tự trạm bằng thao tác kéo thả Drag & Drop. "
        "Thay vì phải nhập số thứ tự thủ công dễ nhầm lẫn, ban quản lý chỉ cần kéo trạm thả vào vị trí mong muốn. "
        "Thư viện @dnd-kit xử lý chuyển động mượt mà, sau đó Backend tự động cập nhật lại toàn bộ thứ tự stop_order trong CSDL MySQL."
    )

    # =========================================================================
    # SLIDE 7: ĐẶT VÉ, SƠ ĐỒ GHẾ & MÃ QR (US 02, 03, 04, 06) (02 PHÚT)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_background(s7)
    add_header(s7, "Phút 10:00 - 12:00 | Tính năng cốt lõi", "ĐẶT VÉ TRỰC TUYẾN, SƠ ĐỒ 40 GHẾ & MÃ QR ĐIỆN TỬ")

    # 3 Cards
    cards_ticket = [
        ("SƠ ĐỒ 40 CHỖ NGỒI", ACCENT_GREEN,
         "• Mô phỏng trực quan 40 ghế trên xe buýt.\n• Phân loại trạng thái ghế:\n  + Xanh lá: Ghế trống sẵn sàng\n  + Xanh dương: Ghế đang chọn\n  + Xám mờ: Ghế đã có người đặt\n• Chống xung đột đặt trùng ghế realtime."),
        ("CƠ CHẾ GIỮ CHỖ 10 PHÚT", ACCENT_SKY,
         "• Hành khách giữ chỗ trong 10 phút để hoàn tất giao dịch.\n• Đếm ngược thời gian hạn thanh toán.\n• Tự động giải phóng ghế nếu quá hạn mà chưa xác nhận.\n• Tích hợp mã giảm giá Voucher sinh viên."),
        ("MÃ QR SOÁT VÉ NÉT CAO", ACCENT_CYAN,
         "• Tự động tạo mã vé chuẩn định dạng:\n  Ví dụ: TKT-B05-8199\n• Sinh hình ảnh mã QR scannable tương thích camera quét của tài xế.\n• Hiển thị đầy đủ thông tin: Tên khách, Tuyến buýt, Số ghế và Giá vé.")
    ]

    for i, (ctitle, color, ccontent) in enumerate(cards_ticket):
        left = PptxInches(0.8 + i * 4.0)
        card = s7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, PptxInches(1.8), PptxInches(3.6), PptxInches(4.8))
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = color

        tf = card.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = ctitle
        p0.font.size = PptxPt(13)
        p0.font.bold = True
        p0.font.color.rgb = color
        p0.space_after = PptxPt(12)

        for line in ccontent.split("\n"):
            p = tf.add_paragraph()
            p.text = line
            p.font.size = PptxPt(11)
            p.font.color.rgb = TEXT_MUTED if not line.startswith("•") else TEXT_WHITE
            p.space_after = PptxPt(6)

    s7.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (10:00 - 12:00):\n"
        "Phân hệ trung tâm phục vụ hành khách là Đặt vé trực quan và Sinh mã QR (US 02, 03, 04, 06). "
        "Hành khách được quan sát sơ đồ 40 chỗ ngồi của xe, chọn vị trí ghế yêu thích chỉ với một cú nhấp chuột. "
        "Hệ thống sẽ giữ chỗ 10 phút, ghi nhận vào bảng tickets và sinh mã QR điện tử độ nét cao ngay trên màn hình. "
        "Mã QR này chứa chuỗi định danh vé duy nhất và có thể xuất trình trực tiếp cho tài xế quét khi lên xe buýt."
    )

    # =========================================================================
    # SLIDE 8: CỔNG TÀI XẾ & HÀNH KHÁCH (01.5 PHÚT)
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_background(s8)
    add_header(s8, "Phút 12:00 - 13:30 | Nghiệp vụ người dùng", "CỔNG THÔNG TIN TÀI XẾ & CỔNG HÀNH KHÁCH")

    # 2 Cột
    left_p = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(0.8), PptxInches(1.8), PptxInches(5.7), PptxInches(4.8))
    left_p.fill.solid()
    left_p.fill.fore_color.rgb = CARD_BG
    left_p.line.color.rgb = ACCENT_GREEN

    tf_lp = left_p.text_frame
    tf_lp.word_wrap = True
    p_lpt = tf_lp.paragraphs[0]
    p_lpt.text = "CỔNG THÔNG TIN TÀI XẾ (DRIVER PORTAL)"
    p_lpt.font.size = PptxPt(14)
    p_lpt.font.bold = True
    p_lpt.font.color.rgb = ACCENT_GREEN
    p_lpt.space_after = PptxPt(12)

    lp_points = [
        "Soát vé QR thời gian thực (US 15): Tài xế quét camera hoặc dán chuỗi QR để kiểm tra tính hợp lệ.",
        "Chống tái sử dụng vé: Tự động đổi trạng thái sang CHECKED_IN trong MySQL ngay khi quét thành công.",
        "Báo cáo sự cố đường sá (US 11): Báo tắc đường, thời tiết xấu hoặc tai nạn kèm số phút trễ dự kiến.",
        "Xem danh sách chuyến phân công và số lượng hành khách đã lên xe."
    ]
    for pt in lp_points:
        p = tf_lp.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = PptxPt(8)

    right_p = s8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(6.8), PptxInches(1.8), PptxInches(5.7), PptxInches(4.8))
    right_p.fill.solid()
    right_p.fill.fore_color.rgb = CARD_BG
    right_p.line.color.rgb = ACCENT_SKY

    tf_rp = right_p.text_frame
    tf_rp.word_wrap = True
    p_rpt = tf_rp.paragraphs[0]
    p_rpt.text = "CỔNG HÀNH KHÁCH (PASSENGER PORTAL)"
    p_rpt.font.size = PptxPt(14)
    p_rpt.font.bold = True
    p_rpt.font.color.rgb = ACCENT_SKY
    p_rpt.space_after = PptxPt(12)

    rp_points = [
        "Tra cứu chuyến xe theo ngày (US 01): Tìm chuyến hôm nay và tương lai, xem giờ xuất bến và ghế trống.",
        "Đặt vé chọn ghế & nhận vé QR điện tử có hỗ trợ chính sách trợ giá sinh viên ICTU.",
        "Đánh giá & Phản ánh (US 24): Gửi đánh giá sao (1–5 sao) và nhận xét thái độ phục vụ của bác tài.",
        "Hồ sơ ưu đãi HSSV (US 17): Đăng ký thẻ sinh viên để nhận giảm giá 50% vé lượt."
    ]
    for pt in rp_points:
        p = tf_rp.add_paragraph()
        p.text = f"• {pt}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = TEXT_MUTED
        p.space_after = PptxPt(8)

    s8.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (12:00 - 13:30):\n"
        "Hệ thống cung cấp trải nghiệm chuyên biệt cho từng đối tượng: "
        "Tại Driver Portal, bác tài có công cụ soát vé cực kỳ nhanh chóng. Khi quét mã QR của khách, hệ thống kiểm tra ngay trong CSDL và đổi trạng thái vé sang CHECKED_IN, tránh vé bị quét 2 lần. "
        "Bác tài cũng có thể chủ động báo cáo sự cố đường sá để trung tâm điều độ nắm bắt. "
        "Tại Passenger Portal, hành khách có thể xem lại vé điện tử, đăng ký gói ưu đãi sinh viên và đánh giá sao chất lượng dịch vụ của từng chuyến xe."
    )

    # =========================================================================
    # SLIDE 9: CÁC THÁCH THỨC ĐÃ GIẢI QUYẾT (01 PHÚT)
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_background(s9)
    add_header(s9, "Phút 13:30 - 14:30 | Bài học kinh nghiệm", "CÁC THÁCH THỨC KỸ THUẬT TIÊU BIỂU ĐÃ VƯỢT QUA")

    ch_cards = [
        ("LỖI SẬP MÀN HÌNH ĐEN (CỔNG 3000)", ACCENT_CYAN,
         "• Nguyên nhân: Công cụ serve -s không proxy API làm React unmount toàn bộ DOM tree.\n• Giải pháp: Xây dựng Nginx Reverse Proxy, chuyển hướng /api/ về Backend và bọc thẻ ErrorBoundary."),
        ("LỖI PHÔNG TIẾNG VIỆT TRONG MYSQL", ACCENT_SKY,
         "• Nguyên nhân: Kết nối client mặc định latin1 làm ký tự có dấu biến thành dấu ???.\n• Giải pháp: Ép chuẩn SET NAMES utf8mb4; trong init.sql và cấu hình charset utf8mb4 cho Connection Pool."),
        ("LỖI KHÔNG HIỂN THỊ MÃ QR & INVALID DATE", ACCENT_GREEN,
         "• Nguyên nhân: Payload Backend bị lệch cấu trúc so với kỳ vọng của component Frontend.\n• Giải pháp: Chuẩn hóa payload trả về đầy đủ cả dạng lồng nhau và phẳng, render ảnh QR nét cao.")
    ]

    for i, (title, color, desc) in enumerate(ch_cards):
        top = PptxInches(1.8 + i * 1.7)
        box = s9.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(0.8), top, PptxInches(11.7), PptxInches(1.45))
        box.fill.solid()
        box.fill.fore_color.rgb = CARD_BG
        box.line.color.rgb = color

        tf = box.text_frame
        tf.word_wrap = True

        p0 = tf.paragraphs[0]
        p0.text = f"🛠️ {title}"
        p0.font.size = PptxPt(13.5)
        p0.font.bold = True
        p0.font.color.rgb = color

        for line in desc.split("\n"):
            p = tf.add_paragraph()
            p.text = line
            p.font.size = PptxPt(11)
            p.font.color.rgb = TEXT_MUTED

    s9.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (13:30 - 14:30):\n"
        "Trong quá trình triển khai Sprint 1, nhóm đã vượt qua 3 thử thách kỹ thuật quan trọng: "
        "Thứ nhất là triệt tiêu hoàn toàn lỗi màn hình đen bằng Nginx Reverse Proxy và React ErrorBoundary; "
        "Thứ hai là xử lý triệt để bảng mã tiếng Việt utf8mb4 trong MySQL; "
        "Thứ ba là chuẩn hóa luồng trả về mã QR trực quan giúp trải nghiệm đặt vé và soát vé diễn ra trơn tru nhất."
    )

    # =========================================================================
    # SLIDE 10: TỔNG KẾT & KẾ HOẠCH SPRINT 2 (01 PHÚT)
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_background(s10)
    add_header(s10, "Phút 14:30 - 15:00 | Nghiệm thu & Lộ trình", "TỔNG KẾT SPRINT 1 & KẾ HOẠCH SPRINT 2")

    # 2 Cột
    s10_l = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(0.8), PptxInches(1.8), PptxInches(5.7), PptxInches(4.8))
    s10_l.fill.solid()
    s10_l.fill.fore_color.rgb = CARD_BG
    s10_l.line.color.rgb = ACCENT_GREEN

    tf_10l = s10_l.text_frame
    tf_10l.word_wrap = True
    p10lt = tf_10l.paragraphs[0]
    p10lt.text = "KẾT QUẢ NGHIỆM THU SPRINT 1 (100% ĐẠT)"
    p10lt.font.size = PptxPt(14)
    p10lt.font.bold = True
    p10lt.font.color.rgb = ACCENT_GREEN
    p10lt.space_after = PptxPt(12)

    res_pts = [
        "100% Zero Mock Data: Kết nối trực tiếp CSDL MySQL 8.0 thật.",
        "Hạ tầng Docker Compose 4 containers chạy mượt mà bằng 1 câu lệnh.",
        "Hoàn thành trọn vẹn 8 User Stories cam kết trong Sprint 1.",
        "Hệ thống đã kiểm thử tích hợp (Integration Test) thành công tất cả vai trò.",
        "Mã nguồn đã được đẩy lên GitHub và sẵn sàng bàn giao."
    ]
    for pt in res_pts:
        p = tf_10l.add_paragraph()
        p.text = f"✔ {pt}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = PptxPt(8)

    s10_r = s10.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, PptxInches(6.8), PptxInches(1.8), PptxInches(5.7), PptxInches(4.8))
    s10_r.fill.solid()
    s10_r.fill.fore_color.rgb = CARD_BG
    s10_r.line.color.rgb = ACCENT_SKY

    tf_10r = s10_r.text_frame
    tf_10r.word_wrap = True
    p10rt = tf_10r.paragraphs[0]
    p10rt.text = "LỘ TRÌNH PHÁT TRIỂN SPRINT 2"
    p10rt.font.size = PptxPt(14)
    p10rt.font.bold = True
    p10rt.font.color.rgb = ACCENT_SKY
    p10rt.space_after = PptxPt(12)

    s2_pts = [
        "Tích hợp cổng thanh toán trực tuyến: VNPay Sandbox & Ví điện tử MoMo.",
        "Giám sát xe buýt thời gian thực (Live GPS Tracking) trên bản đồ số Mapbox / Leaflet.",
        "Xây dựng phiên bản PWA (Progressive Web App) lưu trữ vé điện tử offline.",
        "Hệ thống thông báo đẩy (Push Notifications) khi xe sắp đến trạm."
    ]
    for pt in s2_pts:
        p = tf_10r.add_paragraph()
        p.text = f"🚀 {pt}"
        p.font.size = PptxPt(12)
        p.font.color.rgb = TEXT_WHITE
        p.space_after = PptxPt(8)

    s10.notes_slide.notes_text_frame.text = (
        "KỊCH BẢN NÓI (14:30 - 15:00):\n"
        "Tổng kết lại, Sprint 1 đã hoàn thành xuất sắc 100% mục tiêu đề ra theo tiêu chí Definition of Done. "
        "Mã nguồn đã được đẩy lên GitHub sẵn sàng cho các bước tiếp theo. "
        "Trong Sprint 2, nhóm sẽ tiếp tục phát triển tính năng thanh toán VNPay trực tuyến và bản đồ theo dõi xe buýt GPS thời gian thực. "
        "Nhóm 5 xin chân thành cảm ơn Thầy Cô và các bạn đã lắng nghe. Xin mời Thầy Cô đặt câu hỏi cho nhóm!"
    )

    # =========================================================================
    # SLIDE 11: Q&A / CẢM ƠN (KẾT THÚC)
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    add_background(s11)

    tb_s11 = s11.shapes.add_textbox(PptxInches(1.0), PptxInches(2.2), PptxInches(11.3), PptxInches(3.2))
    tf11 = tb_s11.text_frame
    tf11.word_wrap = True

    p_thx = tf11.paragraphs[0]
    p_thx.alignment = PP_ALIGN.CENTER
    p_thx.text = "XIN TRÂN TRỌNG CẢM ƠN!\nTHẦY CÔ & HỘI ĐỒNG THẨM ĐỊNH"
    p_thx.font.size = PptxPt(36)
    p_thx.font.bold = True
    p_thx.font.color.rgb = TEXT_WHITE
    p_thx.space_after = PptxPt(16)

    p_qa = tf11.add_paragraph()
    p_qa.alignment = PP_ALIGN.CENTER
    p_qa.text = "Q & A — PHIÊN HỎI ĐÁP & ĐÓNG GÓP Ý KIẾN"
    p_qa.font.size = PptxPt(18)
    p_qa.font.bold = True
    p_qa.font.color.rgb = ACCENT_SKY
    p_qa.space_after = PptxPt(20)

    p_git = tf11.add_paragraph()
    p_git.alignment = PP_ALIGN.CENTER
    p_git.text = "Kho lưu trữ GitHub: github.com/tamtran2k6zz/Project_Smart_Bus_Ticketing_System_ictu"
    p_git.font.size = PptxPt(13)
    p_git.font.color.rgb = TEXT_MUTED

    prs.save(output_path)
    print(f"Đã tạo thành công file Slide PowerPoint: {output_path}")

if __name__ == "__main__":
    docs_dir = os.path.join(os.path.dirname(__file__), "docs")
    os.makedirs(docs_dir, exist_ok=True)

    word_file = os.path.join(docs_dir, "Bao_Cao_Sprint_1_Smart_Bus_Ticketing_System.docx")
    pptx_file = os.path.join(docs_dir, "Slide_Thuyet_Trinh_Sprint_1_Smart_Bus.pptx")

    create_word_report(word_file)
    create_presentation_slides(pptx_file)
