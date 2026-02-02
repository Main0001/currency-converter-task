import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UserAuthGuard } from '../../common/guards/user-auth.guard';
import { UserId } from '../../common/decorators/user-id.decorator';
import { UpdateUserDto } from './dto/user.dto';
import type { UserSettings } from './dto/user.dto';


@ApiTags('user')
@Controller('api/user')
@UseGuards(UserAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Получить настройки пользователя' })
  @ApiResponse({
    status: 200,
    description: 'Настройки пользователя успешно получены',
    schema: {
      example: {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        base_currency: 'USD',
        favorites: ['EUR', 'GBP'],
        created_at: '2026-01-22T10:00:00.000Z',
        updated_at: '2026-01-22T10:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Cookie user_id отсутствует' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 429, description: 'Слишком много запросов (лимит: 20/мин)' })
  @ApiResponse({ status: 500, description: 'Ошибка сервера' })
  async getUserSettings(@UserId() userId: string): Promise<UserSettings> {
    return this.userService.getUserSettings(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Обновить настройки пользователя' })
  @ApiBody({
    description: 'Данные для обновления (все поля опциональные)',
    schema: {
      type: 'object',
      properties: {
        base_currency: {
          type: 'string',
          example: 'EUR',
          description: 'Новая базовая валюта',
        },
        favorites: {
          type: 'array',
          items: { type: 'string' },
          example: ['USD', 'GBP', 'JPY'],
          description: 'Новый список избранных валют',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Настройки успешно обновлены',
    schema: {
      example: {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        base_currency: 'EUR',
        favorites: ['USD', 'GBP', 'JPY'],
        created_at: '2026-01-22T10:00:00.000Z',
        updated_at: '2026-01-22T15:30:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiResponse({ status: 401, description: 'Cookie user_id отсутствует' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  @ApiResponse({ status: 429, description: 'Слишком много запросов (лимит: 20/мин)' })
  @ApiResponse({ status: 500, description: 'Ошибка сервера' })
  async updateUserSettings(
    @UserId() userId: string,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserSettings> {
    return this.userService.updateUserSettings(userId, updateDto);
  }
}
