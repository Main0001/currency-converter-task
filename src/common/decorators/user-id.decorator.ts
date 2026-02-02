import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Декоратор для получения userId из запроса
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Возвращаем userId, который был установлен в UserAuthGuard
    return request.userId;
  },
);
