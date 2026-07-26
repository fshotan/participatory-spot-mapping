import { z } from "zod";

export const MAX_PLACES_PER_USER = 3;

export interface Place {
  id: string;
  name: string;
  reason: string;
  latitude: number;
  longitude: number;
  createdAt: string;
}

export const placeInputSchema = z.object({
  name: z.string().trim().min(1, "場所の名前を入力してください").max(120),
  reason: z.string().trim().min(1, "理由を入力してください").max(1000),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export const placeUpdateSchema = z.object({
  name: z.string().trim().min(1, "場所の名前を入力してください").max(120),
  reason: z.string().trim().min(1, "理由を入力してください").max(1000),
});

export type PlaceInput = z.infer<typeof placeInputSchema>;
