import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import type { UserSettings, UpdateUserDto } from './dto/user.dto';


@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly firebaseService: FirebaseService) {}

  //Получить настройки пользователя
  async getUserSettings(userId: string): Promise<UserSettings> {
    this.logger.debug(`Getting settings for user: ${userId}`);

    // Получаем данные пользователя из Firebase
    const user = await this.firebaseService.getUser(userId);

    // Если пользователь не найден - выбрасываем ошибку 404
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Возвращаем настройки пользователя
    return {
      user_id: user.user_id,
      base_currency: user.base_currency,
      favorites: user.favorites,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  //Обновить настройки пользователя
  async updateUserSettings(
    userId: string,
    updateDto: UpdateUserDto,
  ): Promise<UserSettings> {
    this.logger.debug(`Updating settings for user: ${userId}`);

    // Проверяем, существует ли пользователь
    const existingUser = await this.firebaseService.getUser(userId);
    if (!existingUser) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Обновляем данные в Firebase
    // FirebaseService.updateUser сам обновит updated_at
    await this.firebaseService.updateUser(userId, updateDto);

    // Получаем обновленные данные и возвращаем
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
