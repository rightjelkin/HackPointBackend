import { IsBoolean, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { JSONSchema } from 'class-validator-jsonschema';

import { IsCorrectCredentials } from '../../validators/IsCorrectCredentials';

export class RefereeLoginRequest {

    @JSONSchema({ example: 'admin' })
    @IsCorrectCredentials()
    @IsNotEmpty()
    @MaxLength(150)
    public login: string;

    @JSONSchema({ example: 'pass' })
    @IsNotEmpty()
    @MaxLength(150)
    public password: string;

    @IsOptional()
    @IsBoolean()
    public isMobile: boolean;

}
