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

/**
 * UserAuthGuard - Guard for authenticating users via cookies
 */
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

    // Get userId from cookie
    let userId: string | undefined = request.cookies?.user_id;

    // If no cookie exists - create new user
    if (!userId) {
      this.logger.log('No user_id cookie found, creating new user');

      // Generate new UUID
      userId = uuidv4();

      try {
        // Create user in Firebase
        await this.firebaseService.createUser(userId);
        this.logger.log(`New user created: ${userId}`);

        // Set httpOnly cookie
        const maxAgeDays =
          this.configService.get<number>('cookie.maxAgeDays') || 365;
        const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;

        response.cookie('user_id', userId, {
          httpOnly: true,
          maxAge: maxAgeMs,
          sameSite: 'strict',
          secure: this.configService.get('nodeEnv') === 'production',
        });

        // Add userId to request for use in controllers
        request.userId = userId;
        return true;
      } catch (error) {
        this.logger.error(`Error creating new user ${userId}:`, error);
        throw new UnauthorizedException('Failed to create user');
      }
    }

    // Cookie exists - check if user exists in DB
    try {
      const user = await this.firebaseService.getUser(userId);

      if (!user) {
        // User not found - create it with current userId
        this.logger.log(`User ${userId} not found in DB, creating`);
        await this.firebaseService.createUser(userId);
      }

      // User exists or was created - add userId to request
      request.userId = userId;
      this.logger.debug(`User authenticated: ${userId}`);
      return true;
    } catch (error) {
      // Error getting/creating user
      this.logger.error(`Error authenticating user ${userId}:`, error);
      throw new UnauthorizedException('Failed to authenticate user');
    }
  }
}
