import { PartialType } from '@nestjs/swagger';
import { CreateBusStopDto } from './create-bus-stop.dto';

export class UpdateBusStopDto extends PartialType(CreateBusStopDto) {}
