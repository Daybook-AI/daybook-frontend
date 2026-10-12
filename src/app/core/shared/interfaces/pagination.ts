export interface IPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface IPaginationQuery {
    page?: number;
    limit?: number;
}