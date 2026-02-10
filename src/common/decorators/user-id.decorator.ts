import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract userId from request
 * @returns {string} User ID that was set in UserAuthGuard
 */
export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();

    // Return userId that was set in UserAuthGuard
    return request.userId;
  },
);
