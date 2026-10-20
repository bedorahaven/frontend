"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Upload,
  X,
  Loader2,
  Building2,
  MapPin,
  DollarSign,
  ListPlus,
  Check,
  HandCoinsIcon,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AddressAutocomplete } from "@/components/host/AddressAutocomplete";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import toast from "react-hot-toast";
import type { MediaType, PropertyCategory } from "@/types/properties";
import { createProperty } from "@/lib/api/properties";

const CATEGORIES: { label: string; value: PropertyCategory }[] = [
  { label: "Trending", value: "trending" },
  { label: "Beachfront", value: "beachfront" },
  { label: "Cabins", value: "cabins" },
  { label: "Luxury", value: "luxury" },
  { label: "Countryside", value: "countryside" },
  { label: "Amazing Views", value: "amazing_views" },
];

const COMMON_AMENITIES = [
  "WiFi (High-Speed Fiber)",
  "Fully Equipped Gym",
  "Rooftop Terrace / Chill Area",
  "Backup Generator",
  "24/7 CCTV & Security Guard",
  "Free Parking",
  "Swimming Pool",
  "Borehole Water Supply",
  "Elevator / Lift",
  "Laundromat / Washer",
  "On-site Minimart / Store",
  "Hot Shower",
  "Smart TV / Netflix",
  "Air Conditioning",
  "Kitchen & Refrigerator",
  "Balcony / City View",
  "Dedicated Workspace",
  "BBQ Grill",
];

interface UploadedMedia {
  url: string;
  publicId: string;
  type: MediaType;
}

const IMAGE_EXTENSIONS = new Set([
  "avif",
  "heic",
  "heics",
  "heif",
  "heifs",
  "jpeg",
  "jpg",
  "png",
  "webp",
]);
const VIDEO_EXTENSIONS = new Set([
  "3gp",
  "3g2",
  "avi",
  "m4v",
  "mkv",
  "mov",
  "mp4",
  "webm",
]);
const GENERIC_FILE_TYPES = new Set(["", "application/octet-stream"]);

function isPropertyCategory(value: string | null): value is PropertyCategory {
  return CATEGORIES.some((category) => category.value === value);
}

function getMediaType(file: File): MediaType | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = file.type.toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return GENERIC_FILE_TYPES.has(mimeType) || mimeType.startsWith("image/")
      ? "image"
      : null;
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return GENERIC_FILE_TYPES.has(mimeType) || mimeType.startsWith("video/")
      ? "video"
      : null;
  }

  return null;
}

export default function NewListingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<PropertyCategory>("trending");
  const [pricePerNight, setPricePerNight] = useState("");
  const [cleaningFee, setCleaningFee] = useState("");
  const [maxGuests, setMaxGuests] = useState("2");
  const [bedrooms, setBedrooms] = useState("1");
  const [beds, setBeds] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [country, setCountry] = useState("Kenya");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [media, setMedia] = useState<UploadedMedia[]>([]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Image upload is unavailable. Please contact support.");
      return;
    }

    setUploadingMedia(true);
    const newMedia: UploadedMedia[] = [];
    let failedUploads = 0;

    try {
      for (const file of files) {
        const mediaType = getMediaType(file);
        if (!mediaType) {
          failedUploads += 1;
          console.error(
            `Unsupported media type for ${file.name}: ${file.type}`,
          );
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        try {
          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType}/upload`,
            { method: "POST", body: formData },
          );
          const data: unknown = await response.json();

          if (
            !response.ok ||
            typeof data !== "object" ||
            data === null ||
            !("secure_url" in data) ||
            typeof data.secure_url !== "string" ||
            !("public_id" in data) ||
            typeof data.public_id !== "string" ||
            !("resource_type" in data) ||
            data.resource_type !== mediaType
          ) {
            throw new Error(`Cloudinary rejected ${file.name}.`);
          }

          newMedia.push({
            url: data.secure_url,
            publicId: data.public_id,
            type: mediaType,
          });
        } catch (error) {
          failedUploads += 1;
          console.error(`Cloudinary upload failed for ${file.name}:`, error);
        }
      }

      if (newMedia.length > 0) {
        setMedia((prev) => [...prev, ...newMedia]);
      }

      if (failedUploads > 0) {
        toast.error(
          newMedia.length > 0
            ? `${newMedia.length} file(s) uploaded; ${failedUploads} could not be uploaded.`
            : "No files could be uploaded. Check the supported formats and try again.",
        );
      } else {
        toast.success("Photos and videos uploaded successfully!");
      }
    } finally {
      setUploadingMedia(false);
    }
  };

  const removeMedia = (publicId: string) => {
    setMedia((prev) => prev.filter((item) => item.publicId !== publicId));
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const trimmedCountry = country.trim();
    const trimmedState = state.trim();
    const trimmedCity = city.trim();
    const trimmedAddress = address.trim();
    const price = Number(pricePerNight);
    const fee = cleaningFee === "" ? 0 : Number(cleaningFee);
    const guestCount = Number(maxGuests);
    const bedroomCount = Number(bedrooms);
    const bedCount = Number(beds);
    const bathroomCount = Number(bathrooms);
    const parsedLatitude = latitude === "" ? undefined : Number(latitude);
    const parsedLongitude = longitude === "" ? undefined : Number(longitude);

    if (
      !trimmedTitle ||
      !trimmedDescription ||
      !trimmedCountry ||
      !trimmedCity ||
      !trimmedAddress
    ) {
      toast.error("Please fill in all required fields.");
      return;
    }

    if (
      (parsedLatitude === undefined) !== (parsedLongitude === undefined) ||
      (parsedLatitude !== undefined &&
        (!Number.isFinite(parsedLatitude) ||
          parsedLatitude < -90 ||
          parsedLatitude > 90)) ||
      (parsedLongitude !== undefined &&
        (!Number.isFinite(parsedLongitude) ||
          parsedLongitude < -180 ||
          parsedLongitude > 180))
    ) {
      toast.error("Enter valid latitude and longitude coordinates together.");
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      !Number.isFinite(fee) ||
      fee < 0 ||
      !Number.isInteger(guestCount) ||
      guestCount < 1 ||
      !Number.isInteger(bedroomCount) ||
      bedroomCount < 0 ||
      !Number.isInteger(bedCount) ||
      bedCount < 0 ||
      !Number.isFinite(bathroomCount) ||
      bathroomCount < 0.5 ||
      bathroomCount * 2 !== Math.floor(bathroomCount * 2)
    ) {
      toast.error("Please enter valid pricing and capacity values.");
      return;
    }

    if (media.length === 0) {
      toast.error("Please upload at least one property photo or video.");
      return;
    }

    setLoading(true);

    try {
      const propertyInput = {
        host_id: "",
        title: trimmedTitle,
        description: trimmedDescription,
        category,
        price_per_night: price,
        max_guests: guestCount,
        bedrooms: bedroomCount,
        beds: bedCount,
        bathrooms: bathroomCount,
        country: trimmedCountry,
        city: trimmedCity,
        state: trimmedState,
        address: trimmedAddress,
        latitude: parsedLatitude,
        longitude: parsedLongitude,
        google_maps_url: googleMapsUrl.trim() || undefined,
        amenities: selectedAmenities,
        is_active: true,
      };

      const mediaInput = media.map((img, index) => ({
        media_url: img.url,
        media_public_id: img.publicId,
        media_type: img.type,
        display_order: index,
      }));

      const result = await createProperty(propertyInput, mediaInput);

      if (result.success) {
        toast.success("Property created successfully!");
        router.push("/host/listings");
        router.refresh();
      } else {
        toast.error(result.error || "Failed to create property.");
      }
    } catch (error) {
      console.error("Property creation failed:", error);
      toast.error("Failed to create property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/host/listings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Add New Property
          </h1>
          <p className="text-xs text-muted-foreground">
            Create a new listing to start hosting guests on Bedora Haven.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Building2 className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">Basic Information</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="property-title"
                className="mb-1 block text-xs font-semibold"
              >
                Property Title *
              </label>
              <Input
                id="property-title"
                name="title"
                placeholder="e.g., Luxury Oceanview Villa with Private Pool"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={120}
                className="text-xs"
              />
            </div>

            <div>
              <label
                htmlFor="property-description"
                className="mb-1 block text-xs font-semibold"
              >
                Description *
              </label>
              <Textarea
                id="property-description"
                name="description"
                placeholder="Describe what makes your place special, neighborhood vibe..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={5000}
                className="text-xs min-h-32 resize-y"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
              <div>
                <label
                  htmlFor="property-category"
                  className="mb-1 block text-xs font-semibold"
                >
                  Category *
                </label>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    if (isPropertyCategory(value)) setCategory(value);
                  }}
                  name="category"
                  required
                >
                  <SelectTrigger
                    id="property-category"
                    className="w-full text-xs"
                  >
                    <SelectValue placeholder="Choose a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem
                        key={cat.value}
                        value={cat.value}
                        className="text-xs"
                      >
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <MapPin className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">Location & Coordinates</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="property-address"
                className="mb-1 block text-xs font-semibold"
              >
                Street Address / Building Name *
              </label>
              <AddressAutocomplete
                value={address}
                onChange={(value) => {
                  setAddress(value);
                  setLatitude("");
                  setLongitude("");
                  setGoogleMapsUrl("");
                }}
                onSelect={(selection) => {
                  setAddress(selection.address);
                  setCountry(selection.country);
                  setCity(selection.city);
                  setState(selection.state);
                  setLatitude(
                    selection.latitude === undefined
                      ? ""
                      : String(selection.latitude),
                  );
                  setLongitude(
                    selection.longitude === undefined
                      ? ""
                      : String(selection.longitude),
                  );
                  setGoogleMapsUrl(selection.googleMapsUrl ?? "");
                }}
              />
              <p className="mt-1 text-[10px] text-muted-foreground">
                Choose a suggestion to fill in the city, region, country, and
                map coordinates automatically.
              </p>
            </div>
            <div>
              <label
                htmlFor="property-address"
                className="mb-1 block text-xs font-semibold"
              >
                Address *
              </label>
              <Input
                id="property-address"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                className="text-xs"
                placeholder="e.g., 123 Ocean Drive, Apt 4B"
              />
            </div>

            <div>
              <label
                htmlFor="property-city"
                className="mb-1 block text-xs font-semibold"
              >
                City / Town *
              </label>
              <Input
                id="property-city"
                name="city"
                placeholder="e.g., Nairobi, Mombasa, Diani"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="property-state"
                className="mb-1 block text-xs font-semibold"
              >
                State / Province *
              </label>
              <Input
                id="property-state"
                name="state"
                placeholder="e.g., Nairobi, Mombasa, Diani"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="property-country"
                className="mb-1 block text-xs font-semibold"
              >
                Country *
              </label>
              <Input
                id="property-country"
                name="country"
                placeholder="e.g., Kenya"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                required
                className="text-xs"
              />
            </div>

            {/* Latitude & Longitude inputs for precise Google Maps placement */}
            <div>
              <label
                htmlFor="property-latitude"
                className="mb-1 block text-xs font-semibold"
              >
                Latitude (Optional)
              </label>
              <Input
                id="property-latitude"
                name="latitude"
                type="number"
                step="any"
                placeholder="-1.2921"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="property-longitude"
                className="mb-1 block text-xs font-semibold"
              >
                Longitude (Optional)
              </label>
              <Input
                id="property-longitude"
                name="longitude"
                type="number"
                step="any"
                placeholder="36.8219"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="property-maps-url"
                className="mb-1 block text-xs font-semibold"
              >
                Google Maps Share Link (Optional)
              </label>
              <Input
                id="property-maps-url"
                name="google_maps_url"
                type="url"
                placeholder="https://maps.app.goo.gl/..."
                value={googleMapsUrl}
                onChange={(e) => setGoogleMapsUrl(e.target.value)}
                className="text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Tip: You can paste your Google Maps dropped pin link here or
                fill in the latitude/longitude above.
              </p>
            </div>
          </div>
        </div>

        {/* Pricing & Capacity */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <HandCoinsIcon className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">Pricing & Capacity</h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label
                htmlFor="price-per-night"
                className="mb-1 block text-xs font-semibold"
              >
                Price per Night (Ksh) *
              </label>
              <Input
                id="price-per-night"
                name="price_per_night"
                type="number"
                min="0"
                step="0.01"
                placeholder="1500"
                value={pricePerNight}
                onChange={(e) => setPricePerNight(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="max-guests"
                className="mb-1 block text-xs font-semibold"
              >
                Max Guests
              </label>
              <Input
                id="max-guests"
                name="max_guests"
                type="number"
                min="1"
                step="1"
                value={maxGuests}
                onChange={(e) => setMaxGuests(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="bedrooms"
                className="mb-1 block text-xs font-semibold"
              >
                Bedrooms
              </label>
              <Input
                id="bedrooms"
                name="bedrooms"
                type="number"
                min="0"
                step="1"
                value={bedrooms}
                onChange={(e) => setBedrooms(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="beds"
                className="mb-1 block text-xs font-semibold"
              >
                Beds
              </label>
              <Input
                id="beds"
                name="beds"
                type="number"
                min="0"
                step="1"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label
                htmlFor="bathrooms"
                className="mb-1 block text-xs font-semibold"
              >
                Bathrooms
              </label>
              <Input
                id="bathrooms"
                name="bathrooms"
                type="number"
                min="0.5"
                step="0.5"
                value={bathrooms}
                onChange={(e) => setBathrooms(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <ListPlus className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">Amenities</h2>
            <span
              aria-live="polite"
              className="ml-auto rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground"
            >
              {selectedAmenities.length} selected
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {COMMON_AMENITIES.map((amenity) => {
              const isSelected = selectedAmenities.includes(amenity);
              return (
                <button
                  key={amenity}
                  type="button"
                  onClick={() => toggleAmenity(amenity)}
                  aria-pressed={isSelected}
                  className={`flex min-h-11 items-center justify-between gap-2 rounded-xl border p-3 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-card text-muted-foreground hover:border-accent/50 hover:bg-muted/50"
                  }`}
                >
                  <span>{amenity}</span>
                  <span
                    aria-hidden="true"
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-input bg-background"
                    }`}
                  >
                    {isSelected && <Check className="size-3" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Photos & Media (Cloudinary) */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Upload className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">
              Property Photos and Videos *
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {media.map((img) => (
              <div
                key={img.publicId}
                className="relative aspect-video overflow-hidden rounded-xl border border-border bg-muted"
              >
                {img.type === "video" ? (
                  <video
                    src={img.url}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label="Property video preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={
                      /\.(heic|heics|heif|heifs)(?:$|\?)/i.test(img.url)
                        ? img.url.replace("/upload/", "/upload/f_jpg/")
                        : img.url
                    }
                    alt="Property photo"
                    fill
                    className="object-cover"
                  />
                )}
                <button
                  type="button"
                  title={`Remove property ${img.type}`}
                  onClick={() => removeMedia(img.publicId)}
                  aria-label={`Remove property ${img.type}`}
                  className="absolute right-2 top-2 rounded-full bg-red-500/90 p-1 text-white hover:bg-black"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center transition-colors hover:bg-muted/50 focus-within:ring-2 focus-within:ring-ring">
              {uploadingMedia ? (
                <span
                  role="status"
                  className="flex flex-col items-center gap-1"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <span className="text-xs font-semibold">
                    Uploading media...
                  </span>
                </span>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-xs font-semibold text-foreground">
                    Upload Photos or Videos
                  </span>
                </>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.avif,.heic,.heics,.heif,.heifs,.mp4,.mov,.m4v,.3gp,.3g2,.mkv,.webm,.avi,image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif,video/mp4,video/quicktime,video/x-m4v,video/3gpp,video/3gpp2,video/x-matroska,video/webm,video/x-msvideo"
                multiple
                onChange={handleImageUpload}
                disabled={uploadingMedia || loading}
                aria-label="Upload property photos and videos"
                className="sr-only"
              />
            </label>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Link
            href="/host/listings"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-5 text-xs font-semibold shadow-sm transition-colors hover:bg-muted"
          >
            Cancel
          </Link>
          <Button
            type="submit"
            disabled={loading || uploadingMedia}
            className="h-10 px-6 text-xs font-semibold"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Property...
              </>
            ) : (
              "Publish Listing"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
