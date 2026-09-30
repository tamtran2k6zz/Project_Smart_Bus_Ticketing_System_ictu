export interface DefaultStopItem {
  id: number;
  code: string;
  name: string;
  address: string;
}

export interface DefaultRouteItem {
  id: number;
  code: string;
  name: string;
  distanceKm: number;
  basePrice: number;
  status: 'ACTIVE' | 'INACTIVE';
  stops: Array<{
    stopId: number;
    code?: string;
    name: string;
    address?: string;
    stopOrder?: number;
    distanceFromStartKm?: number;
    estimatedMinutes?: number;
  }>;
}

export const DEFAULT_STOPS: DefaultStopItem[] = [
  {
    id: 1,
    code: 'BS-01',
    name: 'Bến xe Mỹ Đình',
    address: 'Số 20 Phạm Hùng, Mỹ Đình 2, Nam Từ Liêm, Hà Nội',
  },
  {
    id: 2,
    code: 'BS-02',
    name: 'Đại học Quốc gia Hà Nội',
    address: '144 Xuân Thủy, Cầu Giấy, Hà Nội',
  },
  {
    id: 3,
    code: 'BS-03',
    name: 'Trạm Cầu Giấy',
    address: 'Điểm trung chuyển xe buýt Cầu Giấy, Ngọc Khánh, Ba Đình, Hà Nội',
  },
  {
    id: 4,
    code: 'BS-04',
    name: 'Trạm Kim Mã',
    address: 'Số 1 Kim Mã, Giảng Võ, Ba Đình, Hà Nội',
  },
  {
    id: 5,
    code: 'BS-05',
    name: 'Bến xe Long Biên',
    address: 'Đường Yên Phụ, Phường Đồng Xuân, Hoàn Kiếm, Hà Nội',
  },
  {
    id: 6,
    code: 'BS-06',
    name: 'Sân bay Quốc tế Nội Bài',
    address: 'Nhà ga hành khách T1 & T2, Phú Minh, Sóc Sơn, Hà Nội',
  },
];

export const DEFAULT_ROUTES: DefaultRouteItem[] = [
  {
    id: 1,
    code: 'R01',
    name: 'Bến xe Mỹ Đình - Bến xe Long Biên',
    distanceKm: 18.5,
    basePrice: 10000,
    status: 'ACTIVE',
    stops: [
      { stopId: 1, code: 'BS-01', name: 'Bến xe Mỹ Đình', address: 'Số 20 Phạm Hùng, Mỹ Đình 2, Nam Từ Liêm, Hà Nội', stopOrder: 1 },
      { stopId: 2, code: 'BS-02', name: 'Đại học Quốc gia Hà Nội', address: '144 Xuân Thủy, Cầu Giấy, Hà Nội', stopOrder: 2 },
      { stopId: 3, code: 'BS-03', name: 'Trạm Cầu Giấy', address: 'Điểm trung chuyển xe buýt Cầu Giấy, Ba Đình, Hà Nội', stopOrder: 3 },
      { stopId: 4, code: 'BS-04', name: 'Trạm Kim Mã', address: 'Số 1 Kim Mã, Giảng Võ, Ba Đình, Hà Nội', stopOrder: 4 },
      { stopId: 5, code: 'BS-05', name: 'Bến xe Long Biên', address: 'Đường Yên Phụ, Đồng Xuân, Hoàn Kiếm, Hà Nội', stopOrder: 5 },
    ],
  },
  {
    id: 2,
    code: 'R02',
    name: 'Bến xe Yên Nghĩa - Sân bay Nội Bài',
    distanceKm: 38.0,
    basePrice: 35000,
    status: 'ACTIVE',
    stops: [
      { stopId: 3, code: 'BS-03', name: 'Trạm Cầu Giấy', address: 'Điểm trung chuyển xe buýt Cầu Giấy, Ba Đình, Hà Nội', stopOrder: 1 },
      { stopId: 4, code: 'BS-04', name: 'Trạm Kim Mã', address: 'Số 1 Kim Mã, Giảng Võ, Ba Đình, Hà Nội', stopOrder: 2 },
      { stopId: 6, code: 'BS-06', name: 'Sân bay Quốc tế Nội Bài', address: 'Nhà ga T1 & T2, Phú Minh, Sóc Sơn, Hà Nội', stopOrder: 3 },
    ],
  },
];
