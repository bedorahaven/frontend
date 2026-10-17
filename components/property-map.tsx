import React from 'react';
import { MapPin } from 'lucide-react';

interface PropertyMapProps {
  lat?: number;
  lng?: number;
  city: string;
  country: string;
  address?: string;
}

export function PropertyMap({ lat, lng, city, country, address }: PropertyMapProps) {
  const query = address ? `${address}, ${city}, ${country}` : `${city}, ${country}`;
  const mapSrc = lat && lng
    ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`
    : `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-accent" />
        <h3 className="text-base font-bold">Where you’ll be</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {address ? `${address}, ` : ''}{city}, {country}
      </p>

      {/* Embedded Map */}
      <div className="w-full h-[350px] rounded-3xl overflow-hidden border border-border shadow-md bg-muted">
        <iframe
          title="Property Location Map"
          src={mapSrc}
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full grayscale-[20%] contrast-[110%]"
        />
      </div>
    </div>
  );
}
