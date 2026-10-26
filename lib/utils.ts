export { cn } from "cn"

export function formatJoinedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "date unavailable";

  const time = date
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
    .replace(/\s/g, " ");
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return `Today, ${time}`;
  }

  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday, ${time}`;
  }

  const dateLabel = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
  return `${dateLabel}, ${time}`;
}


export function formatAmount(amount: number, currency: string): string {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount)) return "—";
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency || "KSh",
    maximumFractionDigits: 0,
  }).format(numericAmount);
}


// export function formatDate(value: string): string {
//   const date = new Date(`${value.slice(0, 10)}T12:00:00`);
//   if (Number.isNaN(date.getTime())) return "Date unavailable";
//   return new Intl.DateTimeFormat("en-KE", {
//     day: "numeric",
//     month: "short",
//     year: "numeric",
//   }).format(date);
// }

export function formatStatus(status: string): string {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatKes(amount: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KSh",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
