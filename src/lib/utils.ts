import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTokenNumber(tokenRaw: string | number): string {
  if (!tokenRaw) return '';
  const token = parseInt(String(tokenRaw), 10);
  if (isNaN(token) || token < 1) return String(tokenRaw);
  
  const groupIndex = Math.floor((token - 1) / 30);
  const prefix = String.fromCharCode(65 + groupIndex); // 65 is 'A'
  const num = ((token - 1) % 30) + 1;
  return `${prefix}-${num}`;
}
