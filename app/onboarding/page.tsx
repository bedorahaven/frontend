"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { completeOnboarding } from "@/lib/api/onboarding";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";
import {
  Loader2,
  UserCheck,
  Home,
  Store,
  Phone,
  MapPin,
  Upload,
  CheckCircle2,
  User,
  Navigation,
  X,
} from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ReverseGeocodeResponse {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    county?: string;
    state_district?: string;
    country?: string;
  };
}

function OnboardingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") === "host" ? "host" : "guest";

  const [loading, setLoading] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationNotice, setLocationNotice] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const autoLocationRequested = useRef(false);

  const [selectedRole, setSelectedRole] = useState<"guest" | "host">(
    initialRole,
  );

  const [hostData, setHostData] = useState({
    fullName: "",
    businessName: "",
    phoneNumber: "",
    city: "",
    state: "",
    country: "Kenya",
    bio: "",
    logoUrl: "",
    logoPublicId: "",
    bannerUrl: "",
    bannerPublicId: "",
  });

  // Auto-detect location via browser Geolocation + OpenStreetMap Reverse Geocoding
  const handleAutoDetectLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationNotice(
        "Geolocation is not supported by your browser. Enter your location manually.",
      );
      return;
    }

    setLocationNotice("");
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
          );
          if (!response.ok)
            throw new Error(`Location lookup failed (${response.status})`);

          const data = (await response.json()) as ReverseGeocodeResponse;
          const address = data.address;

          const detectedCity =
            address?.city ||
            address?.town ||
            address?.village ||
            address?.municipality ||
            "";
          const detectedState =
            address?.state || address?.county || address?.state_district || "";
          const detectedCountry = address?.country || "Kenya";

          setHostData((prev) => ({
            ...prev,
            city: detectedCity,
            state: detectedState,
            country: detectedCountry,
          }));
          const detectedLocation = [
            detectedCity,
            detectedState,
            detectedCountry,
          ]
            .filter(Boolean)
            .join(", ");
          setLocationNotice(
            detectedLocation
              ? `Location detected: ${detectedLocation}`
              : "Location detected, but address details were unavailable. Enter them manually.",
          );
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setLocationNotice(
            err instanceof Error
              ? `${err.message}. Enter your location manually.`
              : "Could not resolve your location. Enter it manually.",
          );
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.warn("Geolocation request failed", {
          code: error.code,
          message: error.message,
        });
        const message =
          error.code === 1
            ? "Location permission was denied. Allow location access or enter your location manually."
            : error.code === 2
              ? "Your location is unavailable. Enter your location manually."
              : error.code === 3
                ? "Location detection timed out. Try again or enter your location manually."
                : "Could not detect your location. Enter it manually.";
        setLocationNotice(message);
        setDetectingLocation(false);
      },
      { timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (selectedRole !== "host" || autoLocationRequested.current) return;

    autoLocationRequested.current = true;
    handleAutoDetectLocation();
  }, [handleAutoDetectLocation, selectedRole]);

  // Cloudinary direct upload helper
  const handleCloudinaryUpload = async (
    file: File,
    type: "logo" | "banner",
  ) => {
    if (type === "logo") setUploadingLogo(true);
    else setUploadingBanner(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "upload_preset",
        process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "bedora_preset",
      );

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || "Upload failed");

      if (type === "logo") {
        setHostData((prev) => ({
          ...prev,
          logoUrl: data.secure_url,
          logoPublicId: data.public_id,
        }));
      } else {
        setHostData((prev) => ({
          ...prev,
          bannerUrl: data.secure_url,
          bannerPublicId: data.public_id,
        }));
      }
    } catch (err: unknown) {
      alert(
        err instanceof Error
          ? err.message
          : "Error uploading image to Cloudinary",
      );
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingBanner(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    const result = await completeOnboarding({
      selectedRole,
      fullName: hostData.fullName,
      businessName: hostData.businessName,
      phoneNumber: hostData.phoneNumber,
      city: hostData.city,
      state: hostData.state,
      country: hostData.country,
      logoUrl: hostData.logoUrl,
      logoPublicId: hostData.logoPublicId,
      bannerUrl: hostData.bannerUrl,
      bannerPublicId: hostData.bannerPublicId,
      bio: hostData.bio,
    });

    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? "Failed to complete onboarding.");
      return;
    }

    router.push(result.redirectPath!);
    router.refresh();
  };

  return (
    <div className="max-w-lg w-full p-8 bg-card border border-border rounded-3xl shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-xl font-bold">Welcome to Bedora Haven</h1>
        <p className="text-xs text-muted-foreground">
          How would you like to set up your account?
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => setSelectedRole("guest")}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all text-center ${
            selectedRole === "guest"
              ? "border-accent bg-accent/10 text-foreground shadow-sm"
              : "border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          <UserCheck className="w-5 h-5 text-accent" />
          <div>
            <p className="text-xs font-bold">Guest Account</p>
            <p className="text-[10px] text-muted-foreground">
              Book stays easily
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setSelectedRole("host")}
          className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all text-center ${
            selectedRole === "host"
              ? "border-accent bg-accent/10 text-foreground shadow-sm"
              : "border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground"
          }`}
        >
          <Home className="w-5 h-5 text-accent" />
          <div>
            <p className="text-xs font-bold">Host Brand</p>
            <p className="text-[10px] text-muted-foreground">
              List & rent properties
            </p>
          </div>
        </button>
      </div>

      {/* Host Brand & Shop Setup Fields */}
      {selectedRole === "host" && (
        <div className="space-y-4 pt-2 border-t border-border animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Your Personal Name
              </label>
              <InputGroup className="h-11 rounded-xl">
                <InputGroupAddon align="inline-start">
                  <User className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder=" Chloe Marcus"
                  value={hostData.fullName}
                  onChange={(e) =>
                    setHostData({ ...hostData, fullName: e.target.value })
                  }
                  className="text-xs"
                />
              </InputGroup>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Business Name
              </label>
              <InputGroup className="h-11 rounded-xl">
                <InputGroupAddon align="inline-start">
                  <Store className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder=" Savannah Homes Ke"
                  value={hostData.businessName}
                  onChange={(e) =>
                    setHostData({ ...hostData, businessName: e.target.value })
                  }
                  className="text-xs"
                />
              </InputGroup>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Contact Phone
              </label>
              <InputGroup className="h-11 rounded-xl">
                <InputGroupAddon align="inline-start">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">
                    +254
                  </span>
                </InputGroupAddon>
                <InputGroupInput
                  type="tel"
                  autoComplete="tel-national"
                  inputMode="numeric"
                  maxLength={9}
                  placeholder="712 345 678"
                  value={hostData.phoneNumber}
                  onChange={(e) =>
                    setHostData({
                      ...hostData,
                      phoneNumber: e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 9),
                    })
                  }
                  className="text-xs"
                />
              </InputGroup>
            </div>

            <div className="space-y-1 flex flex-col justify-end">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-muted-foreground">
                  Primary City
                </label>
                <Popover
                  open={Boolean(locationNotice)}
                  onOpenChange={(open) => {
                    if (!open) setLocationNotice("");
                  }}
                >
                  <PopoverTrigger
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={detectingLocation}
                    className="text-[10px] text-accent font-bold hover:underline flex items-center gap-1"
                  >
                    {detectingLocation ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Navigation className="w-3 h-3" />
                    )}
                    Auto-detect GPS
                  </PopoverTrigger>
                  <PopoverContent
                    side="top"
                    align="end"
                    className="w-80 p-3 bg-card border border-border shadow-lg"
                  >
                    <div className="flex items-start gap-2">
                      <p className="flex-1 text-xs">{locationNotice}</p>
                      <button
                        type="button"
                        onClick={() => setLocationNotice("")}
                        aria-label="Dismiss location message"
                        className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <InputGroup className="h-11 rounded-xl">
                <InputGroupAddon align="inline-start">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                </InputGroupAddon>
                <InputGroupInput
                  type="text"
                  placeholder=" Nairobi, Diani"
                  value={hostData.city}
                  onChange={(e) =>
                    setHostData({ ...hostData, city: e.target.value })
                  }
                  className="text-xs"
                />
              </InputGroup>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              County / State
            </label>
            <InputGroup className="h-11 rounded-xl">
              <InputGroupAddon align="inline-start">
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </InputGroupAddon>
              <InputGroupInput
                type="text"
                placeholder=" Mombasa County"
                value={hostData.state}
                onChange={(e) =>
                  setHostData({ ...hostData, state: e.target.value })
                }
                className="text-xs"
              />
            </InputGroup>
          </div>

          {/* Cloudinary Image Uploaders for Logo and Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Brand Logo
              </label>
              <label className="border border-dashed border-border rounded-xl px-3 py-2 flex items-center justify-between gap-3 cursor-pointer hover:border-accent transition-colors bg-muted/10 h-14">
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  {hostData.logoUrl ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {hostData.logoUrl ? "Logo Uploaded" : "Upload Logo"}
                </span>
                {uploadingLogo ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-accent" />
                ) : hostData.logoUrl ? (
                  <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                    <Image
                      src={hostData.logoUrl}
                      alt="Brand logo preview"
                      fill
                      sizes="36px"
                      unoptimized
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleCloudinaryUpload(e.target.files[0], "logo")
                  }
                />
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Cover Banner
              </label>
              <label className="border border-dashed border-border rounded-xl px-3 py-2 flex items-center justify-between gap-3 cursor-pointer hover:border-accent transition-colors bg-muted/10 h-14">
                <span className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  {hostData.bannerUrl ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  {hostData.bannerUrl ? "Banner Uploaded" : "Upload Banner"}
                </span>
                {uploadingBanner ? (
                  <Loader2 className="w-4 h-4 shrink-0 animate-spin text-accent" />
                ) : hostData.bannerUrl ? (
                  <span className="relative h-9 w-16 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <Image
                      src={hostData.bannerUrl}
                      alt="Cover banner preview"
                      fill
                      sizes="64px"
                      unoptimized
                      className="object-cover"
                    />
                  </span>
                ) : null}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    e.target.files?.[0] &&
                    handleCloudinaryUpload(e.target.files[0], "banner")
                  }
                />
              </label>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">
              Business Description
            </label>
            <Textarea
              id="host-bio"
              rows={3}
              maxLength={1000}
              aria-describedby="host-bio-counter"
              placeholder="Tell guests a bit about your hospitality standards..."
              value={hostData.bio}
              onChange={(e) =>
                setHostData({ ...hostData, bio: e.target.value })
              }
              className="min-h-24 resize-none rounded-xl bg-background text-xs focus-visible:ring-accent"
            />
            <p
              id="host-bio-counter"
              className="text-right text-[10px] text-muted-foreground"
            >
              {hostData.bio.length}/1000
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={handleComplete}
        disabled={
          loading || uploadingLogo || uploadingBanner || detectingLocation
        }
        className="w-full h-11 rounded-xl bg-accent text-accent-foreground font-bold text-xs"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : selectedRole === "host" ? (
          "Launch Host Dashboard"
        ) : (
          "Start Exploring"
        )}
      </Button>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Suspense
        fallback={
          <div className="text-xs text-muted-foreground">
            Loading onboarding...
          </div>
        }
      >
        <OnboardingForm />
      </Suspense>
    </div>
  );
}
