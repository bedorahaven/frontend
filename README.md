This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Google Places address autocomplete

Host listing address suggestions use the Google Maps JavaScript API Places library. Configure `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and enable the Maps JavaScript API and Places API (New) in the associated Google Cloud project. Restrict the browser key by HTTP referrer and API before deploying.

Google Maps Platform usage requires billing and compliance with its attribution, terms-of-use, privacy-policy, and Places content storage requirements. Review the [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies) before persisting or reusing data returned by Places.

## Listing media uploads

Listing media uploads use the configured Cloudinary unsigned upload preset for both `image/upload` and `video/upload`. Configure the preset and Cloudinary account to permit the supported image formats (including AVIF and HEIC/HEIF) and video formats (including MOV, MP4, and 3GP), and set upload limits appropriate for your account and hosting plan. Video thumbnails/previews and HEIC/HEIF image previews depend on Cloudinary accepting and transforming the uploaded assets.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
