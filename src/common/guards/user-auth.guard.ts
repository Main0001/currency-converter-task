import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FirebaseService } from '../../modules/firebase/firebase.service';

//UserAuthGuard - Guard для аутентификации пользователей через cookies
@Injectable()
export class UserAuthGuard implements CanActivate {
  private readonly logger = new Logger(UserAuthGuard.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response: Response = context.switchToHttp().getResponse();

    // Получаем userId из cookie
    let userId: string | undefined = request.cookies?.user_id;

    // Если cookie нет - создаем нового пользователя
    if (!userId) {
      this.logger.log('No user_id cookie found, creating new user');

      // Генерируем новый UUID
      userId = uuidv4();

      try {
        // Создаем пользователя в Firebase
        await this.firebaseService.createUser(userId);
        this.logger.log(`New user created: ${userId}`);

        // Устанавливаем httpOnly cookie
        const maxAgeDays =
          this.configService.get<number>('cookie.maxAgeDays') || 365;
        const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

        response.cookie('user_id', userId, {
          httpOnly: true,
          maxAge: maxAgeMs,
          sameSite: 'strict',
          secure: this.configService.get('nodeEnv') === 'production',
        });

        // Добавляем userId в request для использования в контроллерах
        request.userId = userId;
        return true;
      } catch (error) {
        this.logger.error(`Error creating new user ${userId}:`, error);
        throw new UnauthorizedException('Failed to create user');
      }
    }

    // Cookie есть - проверяем существование пользователя в БД
    try {
      const user = await this.firebaseService.getUser(userId);

      if (!user) {
        // Пользователь не найден - создаем его с текущим userId
        this.logger.log(`User ${userId} not found in DB, creating`);
        await this.firebaseService.createUser(userId);
      }

      // Пользователь существует или был создан - добавляем userId в request
      request.userId = userId;
      this.logger.debug(`User authenticated: ${userId}`);
      return true;
    } catch (error) {
      // Ошибка при получении/создании пользователя
      this.logger.error(`Error authenticating user ${userId}:`, error);
      throw new UnauthorizedException('Failed to authenticate user');
    }
  }
}
