import { IsOptional, IsString, IsArray, Length, Matches } from 'class-validator';

/**
 * UserSettings - user settings (response for GET /api/user)
 */
export interface UserSettings {
  user_id: string;
  base_currency: string;
  favorites: string[];
  created_at: string;
  updated_at: string;
}

/**
 * UpdateUserDto - data for updating settings (body for POST /api/user)
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Length(3, 3, { message: 'base_currency must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { message: 'base_currency must be 3 uppercase letters (ISO 4217)' })
  base_currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Length(3, 3, { each: true, message: 'Each currency code must be exactly 3 characters' })
  @Matches(/^[A-Z]{3}$/, { each: true, message: 'Each currency code must be 3 uppercase letters (ISO 4217)' })
  favorites?: string[];
}

/**
 * FirestoreUpdateData - data for updating in Firestore
 */
export type FirestoreUpdateData = {
  base_currency?: string;
  favorites?: string[];
  updated_at: string;
} & Record<string, any>;
