import { IsNotEmpty, IsString } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @IsNotEmpty()
  note!: string;
}
