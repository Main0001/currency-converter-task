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
  @ApiOperation({ summary: 'Get user settings' })
  @ApiResponse({
    status: 200,
    description: 'User settings successfully retrieved',
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
  @ApiResponse({ status: 401, description: 'Cookie user_id is missing' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests (limit: 20/min)' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async getUserSettings(@UserId() userId: string): Promise<UserSettings> {
    return this.userService.getUserSettings(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Update user settings' })
  @ApiBody({
    description: 'Data to update (all fields are optional)',
    schema: {
      type: 'object',
      properties: {
        base_currency: {
          type: 'string',
          example: 'EUR',
          description: 'New base currency',
        },
        favorites: {
          type: 'array',
          items: { type: 'string' },
          example: ['USD', 'GBP', 'JPY'],
          description: 'New list of favorite currencies',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Settings successfully updated',
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
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Cookie user_id is missing' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 429, description: 'Too many requests (limit: 20/min)' })
  @ApiResponse({ status: 500, description: 'Server error' })
  async updateUserSettings(
    @UserId() userId: string,
    @Body() updateDto: UpdateUserDto,
  ): Promise<UserSettings> {
    return this.userService.updateUserSettings(userId, updateDto);
  }
}
