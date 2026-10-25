"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Upload,
  Loader2,
  Building2,
  MapPin,
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
import toast from "react-hot-toast";
import type {
  MediaType,
  PropertyCategory,
  PropertyWithMedia,
} from "@/types/properties";
import { createProperty, updateProperty } from "@/lib/api/properties";
import { RichTextEditor } from "../ui/rich-text-editor";

export const CATEGORIES: { label: string; value: PropertyCategory }[] = [
  { label: "Trending", value: "trending" },
  { label: "Beachfront (Coast & Diani)", value: "beachfront" },
  { label: "Bush & Safari Cabins", value: "cabins" },
  { label: "Luxury Villas", value: "luxury" },
  { label: "Upcountry & Rift Valley", value: "countryside" },
  { label: "Nairobi Skyline Views", value: "amazing_views" },
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
  id?: string;
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
const MIN_IMAGES = 4;
const MAX_IMAGES = 8;
const MIN_VIDEOS = 1;
const MAX_VIDEOS = 3;

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

function getMediaCounts(items: Pick<UploadedMedia, "type">[]) {
  return items.reduce(
    (counts, item) => {
      counts[item.type] += 1;
      return counts;
    },
    { image: 0, video: 0 },
  );
}

export function ListingForm({
  initialProperty,
}: {
  initialProperty?: PropertyWithMedia;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const [title, setTitle] = useState(initialProperty?.title ?? "");
  const [description, setDescription] = useState(
    initialProperty?.description ?? "",
  );
  const [category, setCategory] = useState<PropertyCategory>(
    initialProperty?.category ?? "trending",
  );
  const [pricePerNight, setPricePerNight] = useState(
    initialProperty ? String(initialProperty.price_per_night) : "",
  );
  const [maxGuests, setMaxGuests] = useState(
    String(initialProperty?.max_guests ?? 2),
  );
  const [bedrooms, setBedrooms] = useState(
    String(initialProperty?.bedrooms ?? 1),
  );
  const [beds, setBeds] = useState(String(initialProperty?.beds ?? 1));
  const [bathrooms, setBathrooms] = useState(
    String(initialProperty?.bathrooms ?? 1),
  );
  const [country, setCountry] = useState(initialProperty?.country ?? "Kenya");
  const [state, setState] = useState(initialProperty?.state ?? "");
  const [city, setCity] = useState(initialProperty?.city ?? "");
  const [address, setAddress] = useState(initialProperty?.address ?? "");
  const [latitude, setLatitude] = useState(
    initialProperty?.latitude == null ? "" : String(initialProperty.latitude),
  );
  const [longitude, setLongitude] = useState(
    initialProperty?.longitude == null ? "" : String(initialProperty.longitude),
  );
  const [googleMapsUrl, setGoogleMapsUrl] = useState(
    initialProperty?.google_maps_url ?? "",
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(
    Array.isArray(initialProperty?.amenities) ? initialProperty.amenities : [],
  );
  const [media, setMedia] = useState<UploadedMedia[]>(
    initialProperty?.property_media?.map((item) => ({
      id: item.id,
      url: item.media_url,
      publicId: item.media_public_id,
      type: item.media_type,
    })) ?? [],
  );
  const mediaCounts = getMediaCounts(media);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const counts = getMediaCounts(media);
    const filesToUpload: { file: File; type: MediaType }[] = [];
    let skippedByLimit = 0;
    let failedUploads = 0;

    for (const file of files) {
      const mediaType = getMediaType(file);
      if (!mediaType) {
        failedUploads += 1;
        console.error(`Unsupported media type for ${file.name}: ${file.type}`);
        continue;
      }

      const maximum = mediaType === "image" ? MAX_IMAGES : MAX_VIDEOS;
      if (counts[mediaType] >= maximum) {
        skippedByLimit += 1;
        continue;
      }

      counts[mediaType] += 1;
      filesToUpload.push({ file, type: mediaType });
    }

    if (filesToUpload.length === 0) {
      if (skippedByLimit > 0) {
        toast.error(`A listing can have up to ${MAX_IMAGES} photos and ${MAX_VIDEOS} videos.`);
      } else {
        toast.error("Choose supported photo or video files.");
      }
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast.error("Image upload is unavailable. Please contact support.");
      return;
    }

    setUploadingMedia(true);
    const newMedia: UploadedMedia[] = [];

    try {
      for (const { file, type: mediaType } of filesToUpload) {
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
            ? `${newMedia.length} file(s) uploaded; ${failedUploads} could not be uploaded.${skippedByLimit > 0 ? ` ${skippedByLimit} skipped due to media limits.` : ""}`
            : "No files could be uploaded. Check the supported formats and try again.",
        );
      } else if (skippedByLimit > 0) {
        toast.error(`${newMedia.length} file(s) uploaded; ${skippedByLimit} skipped. A listing can have up to ${MAX_IMAGES} photos and ${MAX_VIDEOS} videos.`);
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
    const guestCount = Number(maxGuests);
    const bedroomCount = Number(bedrooms);
    const bedCount = Number(beds);
    const bathroomCount = Number(bathrooms);
    const parsedLatitude = latitude === "" ? undefined : Number(latitude);
    const parsedLongitude = longitude === "" ? undefined : Number(longitude);
    const descriptionText = trimmedDescription
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
      .replace(/\u00a0/g, " ")
      .trim();

    if (
      !trimmedTitle ||
      !descriptionText ||
      !isPropertyCategory(category) ||
      !trimmedCountry ||
      !trimmedState ||
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

    if (selectedAmenities.length === 0) {
      toast.error("Select at least one amenity.");
      return;
    }

    if (
      mediaCounts.image < MIN_IMAGES ||
      mediaCounts.image > MAX_IMAGES ||
      mediaCounts.video < MIN_VIDEOS ||
      mediaCounts.video > MAX_VIDEOS
    ) {
      toast.error(
        `Add ${MIN_IMAGES}-${MAX_IMAGES} photos and ${MIN_VIDEOS}-${MAX_VIDEOS} videos before saving.`,
      );
      return;
    }

    setLoading(true);

    try {
      const propertyInput = {
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
        ...(img.id ? { id: img.id } : {}),
        media_url: img.url,
        media_public_id: img.publicId,
        media_type: img.type,
        display_order: index,
      }));

      const result = initialProperty
        ? await updateProperty(initialProperty.id, propertyInput, mediaInput)
        : await createProperty(propertyInput, mediaInput);

      if (result.success) {
        toast.success(
          initialProperty
            ? "Property updated successfully!"
            : "Property created successfully!",
        );
        router.push("/host/listings");
        router.refresh();
      } else {
        toast.error(
          result.error ||
            `Failed to ${initialProperty ? "update" : "create"} property.`,
        );
      }
    } catch (error) {
      console.error("Property save failed:", error);
      toast.error("Failed to save property. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
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
            {initialProperty ? "Edit Property" : "Add New Property"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {initialProperty
              ? "Update your listing details and media."
              : "Create a new listing to start hosting guests on Bedora Haven."}
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
              <RichTextEditor
                id="property-description"
                required
                placeholder="Describe what makes your place special, neighborhood vibe..."
                value={description}
                onChange={setDescription}
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label
                htmlFor="property-address-search"
                className="mb-1 block text-xs font-semibold"
              >
                Search for an address (optional)
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
                readOnly
                className="text-xs"
              />
            </div>

            {/* Latitude & Longitude inputs for precise Google Maps placement */}
            <div hidden>
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
            <div hidden>
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

            <div hidden className="sm:col-span-2">
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
                Max Guests *
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
                Bedrooms *
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
                Beds *
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
                Bathrooms *
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
            <h2 className="text-base font-bold">Amenities *</h2>
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
          <p className="text-xs text-muted-foreground">
            Add {MIN_IMAGES}-{MAX_IMAGES} photos and {MIN_VIDEOS}-{MAX_VIDEOS} videos.{" "}
            {mediaCounts.image} / {MAX_IMAGES} photos · {mediaCounts.video} / {MAX_VIDEOS} videos
          </p>

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

            <label
              className={`flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center transition-colors focus-within:ring-2 focus-within:ring-ring ${
                mediaCounts.image >= MAX_IMAGES &&
                mediaCounts.video >= MAX_VIDEOS
                  ? "cursor-not-allowed opacity-50"
                  : "cursor-pointer hover:bg-muted/50"
              }`}
            >
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
                disabled={
                  uploadingMedia ||
                  loading ||
                  (mediaCounts.image >= MAX_IMAGES &&
                    mediaCounts.video >= MAX_VIDEOS)
                }
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
                {initialProperty ? "Saving Changes..." : "Creating Property..."}
              </>
            ) : initialProperty ? (
              "Save Changes"
            ) : (
              "Publish Listing"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
