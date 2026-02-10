import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type { UserSettings, UpdateUserDto } from './dto/user.dto';


@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  /**
   * Get user settings
   * @param {string} userId - User ID
   * @returns {Promise<UserSettings>} User settings
   * @throws {NotFoundException} If user not found
   */
  async getUserSettings(userId: string): Promise<UserSettings> {
    this.logger.debug(`Getting settings for user: ${userId}`);

    // Get user data from Firebase
    const user = await this.firebaseService.getUser(userId);

    // If user not found - throw 404 error
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Return user settings
    return {
      user_id: user.user_id,
      base_currency: user.base_currency,
      favorites: user.favorites,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {UpdateUserDto} updateDto - Update data
   * @returns {Promise<UserSettings>} Updated user settings
   * @throws {NotFoundException} If user not found
   */
  async updateUserSettings(
    userId: string,
    updateDto: UpdateUserDto,
  ): Promise<UserSettings> {
    this.logger.debug(`Updating settings for user: ${userId}`);

    // Check if user exists
    const existingUser = await this.firebaseService.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Update data in Firebase
    // FirebaseService.updateUser will update updated_at automatically
    await this.firebaseService.updateUser(userId, updateDto);

    // Get updated data and return
    const updatedUser = await this.firebaseService.getUser(userId);

    return {
      user_id: updatedUser!.user_id,
      base_currency: updatedUser!.base_currency,
      favorites: updatedUser!.favorites,
      created_at: updatedUser!.created_at,
      updated_at: updatedUser!.updated_at,
    };
  }
}
