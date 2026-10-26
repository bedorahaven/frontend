const HEIC_EXTENSIONS = /\.(?:heic|heics|heif|heifs)$/i;

export function getBrowserImageUrl(mediaUrl: string): string {
  let url: URL;
  try {
    url = new URL(mediaUrl);
  } catch {
    return mediaUrl;
  }

  if (
    url.protocol !== "https:" ||
    url.hostname !== "res.cloudinary.com" ||
    !HEIC_EXTENSIONS.test(url.pathname)
  ) {
    return mediaUrl;
  }

  const pathSegments = url.pathname.split("/");
  const uploadIndex = pathSegments.indexOf("upload");
  if (uploadIndex < 0) return mediaUrl;

  const transformationIndex = uploadIndex + 1;
  const transformation = "f_webp,q_auto,w_2400,c_limit";
  if (pathSegments[transformationIndex]?.includes(",")) {
    pathSegments[transformationIndex] += `,${transformation}`;
  } else {
    pathSegments.splice(transformationIndex, 0, transformation);
  }

  url.pathname = pathSegments.join("/");
  return url.toString();
}
