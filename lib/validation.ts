import { z } from "zod";
import { ITEM_TYPES, STATUSES } from "./constants";

const ratingSchema = z
  .union([
    z
      .string()
      .trim()
      .length(0)
      .transform(() => undefined),
    z.coerce.number().int().min(0, "Min 0").max(10, "Max 10"),
  ])
  .optional();

const baseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(256),
  type: z.enum(ITEM_TYPES),
  status: z.enum(STATUSES),
  rating: ratingSchema,
  tags: z
    .string()
    .trim()
    .max(256, "Too many characters in tags")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
});

export const createItemSchema = baseSchema;

export const updateItemSchema = baseSchema.extend({
  id: z.coerce.number().int().positive("Missing item id"),
});

export const deleteItemSchema = z.object({
  id: z.coerce.number().int().positive("Missing item id"),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
