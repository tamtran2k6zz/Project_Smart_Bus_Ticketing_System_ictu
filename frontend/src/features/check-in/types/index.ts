export interface ValidationResult {
  valid: boolean;
  message: string;
  ticketId?: string;
  ticketCode?: string;
  passengerName?: string;
  seatNumbers?: string[];
  quantity?: number;
  checkedInAt?: string;
}

export interface CheckedInPassenger {
  ticketId: string;
  ticketCode: string;
  passengerName: string;
  seatNumbers: string[];
  quantity: number;
  checkedInAt: string;
}
