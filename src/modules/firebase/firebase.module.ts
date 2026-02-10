import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { CronModule } from '../cron/cron.module';

@Global()
@Module({
  imports: [CronModule],
  providers: [FirebaseService],
  exports: [FirebaseService],
})
export class FirebaseModule {}
