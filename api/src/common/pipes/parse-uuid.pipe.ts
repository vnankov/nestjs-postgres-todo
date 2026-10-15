import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
      throw new BadRequestException('id must be a UUID');
    }
    return value;
  }
}
