export interface ApiRouteStop {
  id?: string | number;
  stopId?: string | number;
  stopOrder?: number;
  name?: string;
  address?: string;
  stop?: ApiRouteStop;
}

export interface ApiRoute {
  id: string | number;
  code: string;
  name: string;
  status?: string;
  stops?: ApiRouteStop[];
  routeStops?: ApiRouteStop[];
}

export interface TripOccupancy {
  id: string | number;
  routeCode?: string;
  routeName?: string;
  busPlate?: string;
  departureTime?: string;
  basePrice?: number;
}

export interface IncidentRecord {
  id: string;
  incidentType: string;
  delayMinutes: number;
  description: string;
  reportedAt: string;
  driver?: { fullName?: string };
  trip?: {
    route?: { name?: string };
    bus?: { plateNumber?: string };
  };
}

export interface FeedbackRecord {
  id: string;
  ratingStars: number;
  content: string;
  responseFromStaff?: string | null;
  user?: { fullName?: string };
}

export interface TicketVerificationResult {
  isAlreadyCheckedIn: boolean;
  message: string;
  ticket?: {
    ticketCode?: string;
    seatNumber?: string;
    status?: string;
    user?: { fullName?: string };
    trip?: { route?: { name?: string } };
  };
}
