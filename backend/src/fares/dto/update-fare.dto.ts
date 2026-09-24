import { PartialType } from '@nestjs/swagger';
import { CreateFareDto } from './create-fare.dto';

export class UpdateFareDto extends PartialType(CreateFareDto) {}
