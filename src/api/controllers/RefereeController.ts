import crypto from 'crypto';
import * as express from 'express';
import {
    Authorized, Body, Delete, Get, JsonController, OnUndefined, Param, Post, Put, QueryParam, Res
} from 'routing-controllers';
import { OpenAPI, ResponseSchema } from 'routing-controllers-openapi';

import { AccessCookie } from '../../decorators/AccessCookie';
import { env } from '../../env';
import { RefereeNotFoundError } from '../errors/RefereeNotFoundError';
import { RefereeService } from '../services/RefereeService';
import { CreationRefereeRequest } from './requests/CreationRefereeRequest';
import { RefereeLoginRequest } from './requests/RefereeLoginRequest';
import { UpdationRefereeRequest } from './requests/UpdationRefereeRequest';
import { ErrorResponse } from './responses/ErrorResponse';
import { RefereeResponse } from './responses/RefereeResponse';
import { SuccessResponse } from './responses/SuccessResponse';

@JsonController()
@OpenAPI({
    tags: ['Referee'],
})
export class RefereeController {

    public constructor(
        private refereeService: RefereeService
    ) { }

    @Authorized(['referee'])
    @Get('/admin/referee')
    @OpenAPI({
        summary: 'get referees', description: 'Referees', security: [{ CookieAuth: [] }],
    })
    @ResponseSchema(RefereeResponse, { description: 'Referees', isArray: true })
    @ResponseSchema(ErrorResponse, { description: 'Unauthorized', statusCode: '401' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied', statusCode: '401' })
    public getReferees(
        @QueryParam('skip') skip: number, @QueryParam('take') take: number
    ): Promise<RefereeResponse[]> {
        return this.refereeService.getReferees(skip, take);
    }

    @Authorized(['referee'])
    @Post('/admin/referee')
    @OpenAPI({
        summary: 'create referee', security: [{ CookieAuth: [] }],
    })
    @ResponseSchema(RefereeResponse, { description: 'referees' })
    @ResponseSchema(ErrorResponse, { description: 'Unauthorized', statusCode: '401' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied', statusCode: '403' })
    public createReferee(
        @Body({ required: true, validate: true }) body: CreationRefereeRequest
    ): Promise<RefereeResponse> {
        return this.refereeService.createReferee(body);
    }

    @Authorized(['referee'])
    @Get('/admin/referee/:id')
    @OpenAPI({
        summary: 'get referee by id', security: [{ CookieAuth: [] }],
    })
    @OnUndefined(RefereeNotFoundError)
    @ResponseSchema(RefereeResponse, { description: 'referee' })
    @ResponseSchema(ErrorResponse, { description: 'Unauthorized', statusCode: '401' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied', statusCode: '403' })
    public getRefereeById(@Param('id') refereeId: number): Promise<RefereeResponse | undefined> {
        return this.refereeService.getRefereeById(refereeId);
    }

    @Authorized(['referee'])
    @Delete('/admin/referee/:id')
    @OpenAPI({
        summary: 'delete referee by id', security: [{ CookieAuth: [] }],
    })
    @OnUndefined(RefereeNotFoundError)
    @ResponseSchema(RefereeResponse, { description: 'referee' })
    @ResponseSchema(ErrorResponse, { description: 'Unauthorized', statusCode: '401' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied', statusCode: '403' })
    public deleteReferee(@Param('id') refereeId: number): Promise<RefereeResponse> {
        return this.refereeService.deleteReferee(refereeId);
    }

    @Authorized(['referee'])
    @Put('/admin/referee/:id')
    @OpenAPI({
        summary: 'update referee by id', security: [{ CookieAuth: [] }],
    })
    @OnUndefined(RefereeNotFoundError)
    @ResponseSchema(RefereeResponse)
    @ResponseSchema(ErrorResponse, { description: 'Unauthorized', statusCode: '401' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied', statusCode: '403' })
    public updateReferee(
        @Param('id') refereeId: number, @Body({ required: true, validate: true }) body: UpdationRefereeRequest
    ): Promise<RefereeResponse | undefined> {
        return this.refereeService.updateReferee(refereeId, body);
    }

    @Post('/login')
    @OpenAPI({
        tags: ['Referee'], summary: 'login referee',
        responses: { 200: { headers: { 'Set-Cookie': { schema: {
            type: 'string', example: '_auth=abcdefghijklmnopqrstuvwxyz;Path=/;HttpOnly;SameSite=Strict;Secure' }, description: 'JWT access token in cookie' } },
        } },
    })
    @ResponseSchema(SuccessResponse, { description: 'OK. Login' })
    @ResponseSchema(ErrorResponse, { description: 'Login or password not correct.', statusCode: '400' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied.', statusCode: '403' })
    public async login(
        @Body({ validate: { whitelist: true } }) refereeData: RefereeLoginRequest, @Res() res: express.Response
    ): Promise<{ status: string }> {
        const authToken: string = await this.refereeService.loginReferee(
            refereeData.login, crypto.createHash('md5').update(refereeData.password).digest('hex')
        );
        res.cookie('_auth', authToken, {
            httpOnly: env.app.cookie.httpOnly,
            secure: env.app.cookie.secure,
            sameSite: env.app.cookie.sameSite,
        });

        return { status: 'OK' };
    }

    @Authorized(['referee'])
    @Post('/logout')
    @OpenAPI({
        tags: ['Referee'], summary: 'logout referee', security: [{ CookieAuth: [] }],
        responses: { 200: { headers: { 'Set-Cookie': { schema: {
            type: 'string', example: '_auth=;Path=/;HttpOnly;SameSite=Strict;Secure' }, description: 'Empty JWT access token in cookie' } },
        } },
    })
    @ResponseSchema(SuccessResponse, { description: 'OK. Logout' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied.', statusCode: '403' })
    public async logout(
        @AccessCookie() cookie: string, @Res() res: express.Response
    ): Promise<{ status: string }> {
        await this.refereeService.logoutReferee(cookie);
        const now = new Date();
        now.setMinutes(now.getMinutes() - 5);
        res.cookie('_auth', undefined, {
            expires: now,
            httpOnly: env.app.cookie.httpOnly,
            secure: env.app.cookie.secure,
            sameSite: env.app.cookie.sameSite,
        });
        return { status: 'OK' };
    }

    @Post('/login/check')
    @ResponseSchema(SuccessResponse, { description: 'OK. Login' })
    @ResponseSchema(ErrorResponse, { description: 'Login or password not correct.', statusCode: '400' })
    @ResponseSchema(ErrorResponse, { description: 'Access denied.', statusCode: '403' })
    public async checkCookie(
        @AccessCookie() cookie: string
    ): Promise<boolean> {
        if (!cookie) {
            return false;
        }
        return true;
    }

}
