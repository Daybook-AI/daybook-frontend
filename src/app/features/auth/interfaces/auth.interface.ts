export interface IApiResponse<T = null> {
    status: 'success' | 'error';
    message: string;
    data: T;
}

export interface IRegisterPayload {
    username: string;
    email: string;
    password: string;
}

export interface ISendOtpPayload {
    email: string;
}

export interface IVerifyOtpPayload {
    email: string;
    otp: string;
}

export interface ILoginPayload {
    email: string;
    password: string;
}
