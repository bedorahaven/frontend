"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

interface AddressSelection {
  address: string;
  country: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (selection: AddressSelection) => void;
}

type SearchStatus = "idle" | "loading" | "results" | "empty" | "error" | "selecting";

let placesLibraryPromise: Promise<google.maps.PlacesLibrary> | null = null;

function loadPlacesLibrary() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(new Error("Google Maps API key is not configured."));
  }

  if (!placesLibraryPromise) {
    setOptions({ key: apiKey, v: "weekly" });
    placesLibraryPromise = importLibrary("places").catch((error: unknown) => {
      placesLibraryPromise = null;
      throw error;
    });
  }

  return placesLibraryPromise;
}

function getAddressComponent(
  components: google.maps.places.AddressComponent[],
  ...types: string[]
) {
  return components.find((component) =>
    types.some((type) => component.types.includes(type))
  )?.longText ?? "";
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [activeIndex, setActiveIndex] = useState(-1);
  const requestIdRef = useRef(0);
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const ignoredValueRef = useRef<string | null>(null);

  useEffect(() => {
    const input = value.trim();
    const requestId = ++requestIdRef.current;

    if (input.length < 3) {
      const timeout = window.setTimeout(() => {
        setSuggestions([]);
        setStatus("idle");
        setActiveIndex(-1);
        sessionTokenRef.current = null;
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    if (ignoredValueRef.current === input) {
      return;
    }

    const timeout = window.setTimeout(async () => {
      setStatus("loading");

      try {
        const places = await loadPlacesLibrary();
        if (requestId !== requestIdRef.current) return;

        sessionTokenRef.current ??= new places.AutocompleteSessionToken();
        const response = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input,
          language: "en",
          sessionToken: sessionTokenRef.current,
        });

        if (requestId !== requestIdRef.current) return;

        const addressSuggestions = response.suggestions.filter(
          (suggestion) => suggestion.placePrediction !== null
        );
        setSuggestions(addressSuggestions);
        setActiveIndex(-1);
        setStatus(addressSuggestions.length > 0 ? "results" : "empty");
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        console.error("Google Places autocomplete failed:", error);
        setSuggestions([]);
        setStatus("error");
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [value]);

  const selectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    const requestId = ++requestIdRef.current;
    setSuggestions([]);
    setStatus("selecting");

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: [
          "addressComponents",
          "formattedAddress",
          "googleMapsURI",
          "location",
        ],
      });
      if (requestId !== requestIdRef.current) return;

      const components = place.addressComponents ?? [];
      const location = place.location;
      const formattedAddress =
        place.formattedAddress ?? prediction.text.toString();

      ignoredValueRef.current = formattedAddress.trim();
      onChange(formattedAddress);
      onSelect({
        address: formattedAddress,
        country: getAddressComponent(components, "country"),
        city: getAddressComponent(
          components,
          "locality",
          "postal_town",
          "sublocality_level_1",
          "administrative_area_level_2"
        ),
        state: getAddressComponent(components, "administrative_area_level_1"),
        latitude: location?.lat(),
        longitude: location?.lng(),
        googleMapsUrl: place.googleMapsURI ?? undefined,
      });
      sessionTokenRef.current = null;
      setStatus("idle");
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error("Google Places address details failed:", error);
      sessionTokenRef.current = null;
      setStatus("error");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp" && suggestions.length > 0) {
      event.preventDefault();
      setActiveIndex(
        (index) => (index <= 0 ? suggestions.length - 1 : index - 1)
      );
    } else if (
      event.key === "Enter" &&
      activeIndex >= 0 &&
      suggestions[activeIndex]
    ) {
      event.preventDefault();
      void selectSuggestion(suggestions[activeIndex]);
    } else if (event.key === "Escape") {
      setSuggestions([]);
      setStatus("idle");
    }
  };

  const handleChange = (nextValue: string) => {
    ignoredValueRef.current = null;
    setSuggestions([]);
    setActiveIndex(-1);
    setStatus(nextValue.trim().length >= 3 ? "loading" : "idle");
    onChange(nextValue);
  };

  const statusMessage =
    status === "loading"
      ? "Searching addresses..."
      : status === "selecting"
        ? "Loading address details..."
        : status === "empty"
          ? "No matching addresses. You can keep entering the address manually."
          : status === "error"
            ? "Address search is unavailable. You can enter the location manually."
            : "";

  return (
    <div className="relative">
      <Input
        id="property-address"
        name="address"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={suggestions.length > 0}
        aria-controls="property-address-suggestions"
        aria-activedescendant={
          activeIndex >= 0
            ? `property-address-option-${activeIndex}`
            : undefined
        }
        autoComplete="street-address"
        placeholder="Start typing a property address or building name"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          requestIdRef.current += 1;
          setSuggestions([]);
          setActiveIndex(-1);
          sessionTokenRef.current = null;
          setStatus("idle");
        }}
        required
        className="text-xs"
      />

      {statusMessage && (
        <p
          role="status"
          className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {(status === "loading" || status === "selecting") && (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          )}
          {statusMessage}
        </p>
      )}

      {suggestions.length > 0 && (
        <div
          id="property-address-suggestions"
          role="listbox"
          aria-label="Address suggestions"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {suggestions.map((suggestion, index) => {
            const prediction = suggestion.placePrediction;
            if (!prediction) return null;

            return (
              <div
                id={`property-address-option-${index}`}
                key={prediction.placeId}
                role="option"
                aria-selected={activeIndex === index}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void selectSuggestion(suggestion)}
                className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2.5 text-left text-sm ${
                  activeIndex === index
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {prediction.mainText?.toString() ?? prediction.text.toString()}
                  </span>
                  {prediction.secondaryText && (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {prediction.secondaryText.toString()}
                    </span>
                  )}
                </span>
              </div>
            );
          })}
          <div className="flex justify-end border-t border-border px-2 pt-2">
            <span
              role="img"
              aria-label="Google Maps"
              translate="no"
              className="whitespace-nowrap text-xs font-normal leading-4 tracking-normal text-[#5e5e5e] dark:text-white"
            >
              Google Maps
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
