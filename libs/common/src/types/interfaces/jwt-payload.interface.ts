export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member' | null;
  iat?: string;
  exp?: string;
}

export interface RefreshTokenPayload {
  sub: string;
  family: string;
  iat?: string;
  exp?: string;
}
