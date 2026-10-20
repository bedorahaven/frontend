export interface HostReservationProperty {
  id: string;
  title: string;
  city: string | null;
  country: string | null;
  property_media: { media_url: string }[] | null;
}

export interface HostReservationGuest {
  id: string;
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  avatar_url: string | null;
}

export interface HostReservation extends Record<string, unknown> {
  id: string;
  property_id: string;
  status: string | null;
  total_price: number | string | null;
  property: HostReservationProperty | null;
  guest: HostReservationGuest | null;
}
