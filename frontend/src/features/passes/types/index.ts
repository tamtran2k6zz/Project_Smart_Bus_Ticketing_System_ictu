export interface Pass {
  id: string;
  userId: string;
  routeId: string;
  expiresAt: string;
  price: number;
  status: 'active' | 'pending';
}

export interface Eligibility {
  id: string;
  userId: string;
  fullName: string;
  category: string;
  document: string; // Mã SV / Mã HS / CCCD
  schoolName?: string;
  facultyOrClass?: string;
  birthDate?: string;
  expiryDate?: string;
  cardFrontUrl?: string; // Ảnh mặt trước thẻ HSSV
  cardBackUrl?: string; // Ảnh mặt sau thẻ HSSV
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface CreateEligibilityInput {
  fullName: string;
  category: string;
  document: string;
  schoolName?: string;
  facultyOrClass?: string;
  birthDate?: string;
  expiryDate?: string;
  cardFrontUrl?: string;
  cardBackUrl?: string;
}
